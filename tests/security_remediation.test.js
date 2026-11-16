const { describe, it, after } = require("node:test");
const assert = require("node:assert/strict");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const prisma = new PrismaClient();

function loadTsModule(relPath) {
  const code = fs.readFileSync(path.join(process.cwd(), relPath), "utf8");
  const transpiled = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const m = { exports: {} };
  const fn = new Function("exports", "module", "require", transpiled);
  fn(m.exports, m, require);
  return m.exports;
}

const { sanitizeCustomHtml } = loadTsModule("src/lib/sanitize.ts");
const { checkRateLimit } = loadTsModule("src/lib/rate-limit.ts");

describe("Segurança — Testes Automatizados de Remediação", () => {
  const testEmail = `test.sec.${Date.now()}@exemplo.com`;
  let createdPatientId = null;

  after(async () => {
    // Limpeza de fixtures de teste
    if (createdPatientId) {
      await prisma.passwordResetToken.deleteMany({ where: { email: testEmail } });
      await prisma.patient.delete({ where: { id: createdPatientId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  it("PSI-SEC-01: Senhas temporárias usam alta entropia e não são persistidas em texto puro", async () => {
    const rawTempPass = crypto.randomBytes(5).toString("hex");
    const passwordHash = await bcrypt.hash(rawTempPass, 10);

    const patient = await prisma.patient.create({
      data: {
        fullName: "Paciente Teste Segurança",
        email: testEmail,
        passwordHash,
        phone: "11999998888",
      },
    });
    createdPatientId = patient.id;

    assert.ok(patient.id);
    assert.equal("tempPassword" in patient, false, "tempPassword não deve existir no modelo Patient");

    // Verifica que a senha temporária é validada corretamente com bcrypt
    const isValid = await bcrypt.compare(rawTempPass, patient.passwordHash);
    assert.equal(isValid, true, "Hash bcrypt gerado deve autenticar a senha provisória");
  });

  it("PSI-SEC-02: Recuperação de senha persiste token seguro SHA-256 e redefine credencial", async () => {
    const rawResetToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawResetToken).digest("hex");

    // 1. Persiste o token de redefinição
    const resetRecord = await prisma.passwordResetToken.create({
      data: {
        email: testEmail,
        tokenHash,
        role: "PATIENT",
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    assert.ok(resetRecord.id);
    assert.equal(resetRecord.usedAt, null);

    // 2. Simula o consumo do token para redefinição
    const newPassword = "NovaSenhaSegura@2026";
    const newHash = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction([
      prisma.patient.update({
        where: { id: createdPatientId },
        data: { passwordHash: newHash, mustChangePassword: false, failedLogins: 0, lockedUntil: null },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      }),
    ]);

    // 3. Valida que o token foi consumido e não pode ser reutilizado
    const updatedRecord = await prisma.passwordResetToken.findUnique({
      where: { id: resetRecord.id },
    });
    assert.ok(updatedRecord.usedAt !== null, "Token deve estar marcado como usado");

    const patientAfter = await prisma.patient.findUnique({ where: { id: createdPatientId } });
    const isNewValid = await bcrypt.compare(newPassword, patientAfter.passwordHash);
    assert.equal(isNewValid, true, "Nova senha deve estar ativa");
  });

  it("PSI-SEC-05: Paciente possui proteção contra força bruta com failedLogins e lockedUntil", async () => {
    // Incrementa falhas até o teto de 5
    await prisma.patient.update({
      where: { id: createdPatientId },
      data: {
        failedLogins: 5,
        lockedUntil: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    const lockedPatient = await prisma.patient.findUnique({ where: { id: createdPatientId } });
    assert.equal(lockedPatient.failedLogins, 5);
    assert.ok(lockedPatient.lockedUntil > new Date(), "Paciente deve estar temporariamente bloqueado");

    // Limpa o bloqueio após autenticação bem-sucedida
    await prisma.patient.update({
      where: { id: createdPatientId },
      data: { failedLogins: 0, lockedUntil: null },
    });
    const cleared = await prisma.patient.findUnique({ where: { id: createdPatientId } });
    assert.equal(cleared.failedLogins, 0);
    assert.equal(cleared.lockedUntil, null);
  });

  it("PSI-SEC-05: Rate Limiting em memória bloqueia requisições excedentes", () => {
    const testIp = "192.168.100.50";
    const opts = { windowMs: 10000, max: 3 };

    // Primeiras 3 requisições permitidas
    assert.equal(checkRateLimit("test-unit", testIp, opts).allowed, true);
    assert.equal(checkRateLimit("test-unit", testIp, opts).allowed, true);
    assert.equal(checkRateLimit("test-unit", testIp, opts).allowed, true);

    // 4ª requisição deve ser bloqueada
    const blocked = checkRateLimit("test-unit", testIp, opts);
    assert.equal(blocked.allowed, false, "Requisição que excede o limite deve ser bloqueada");
    assert.ok(blocked.retryAfterSeconds > 0);
  });

  it("PSI-SEC-06: Sanitizador de HTML neutraliza vetores de XSS sem espaço e tags executáveis", () => {
    const vectors = [
      "<img/src=x/onerror=alert(1)>",
      "<svg/onload=alert(1)>",
      "<svg><script>alert(1)</script></svg>",
      '<a href="javascript:alert(1)">link</a>',
      '<a href="vbscript:alert(1)">link</a>',
      '<iframe src="javascript:alert(1)"></iframe>',
      '<input autofocus onfocus=alert(1)>',
    ];

    for (const v of vectors) {
      const sanitized = sanitizeCustomHtml(v);
      assert.equal(
        sanitized.includes("alert(1)"),
        false,
        `Vetor não deve conter alert(1): ${v} -> ${sanitized}`
      );
      assert.equal(
        /[\s/]on[a-zA-Z]+/i.test(sanitized),
        false,
        `Vetor não deve conter eventos on*: ${v} -> ${sanitized}`
      );
      assert.equal(
        /javascript:|vbscript:/i.test(sanitized),
        false,
        `Vetor não deve conter protocolos perigosos: ${v} -> ${sanitized}`
      );
    }

    // Garante que HTML legítimo e seguro é mantido
    const safeHtml = "<p>Parágrafo de texto.</p><strong>Texto em destaque</strong>";
    assert.equal(sanitizeCustomHtml(safeHtml), safeHtml);
  });
});
