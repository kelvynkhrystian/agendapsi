const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

function loadTsModule(relativePath, mocks = {}) {
  const fullPath = path.join(process.cwd(), relativePath);
  const source = fs.readFileSync(fullPath, "utf-8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: fullPath,
  });

  const mod = { exports: {} };
  const localRequire = (reqPath) => {
    if (mocks[reqPath]) return mocks[reqPath];
    if (reqPath.startsWith("./") || reqPath.startsWith("../")) {
      const resolvedBase = path.resolve(path.dirname(fullPath), reqPath);
      const tsCandidate = `${resolvedBase}.ts`;
      if (fs.existsSync(tsCandidate)) {
        const rel = path.relative(process.cwd(), tsCandidate);
        return loadTsModule(rel, mocks);
      }
    }
    return require(reqPath);
  };

  const fn = new Function("exports", "require", "module", "__filename", "__dirname", transpiled.outputText);
  fn(mod.exports, localRequire, mod, fullPath, path.dirname(fullPath));
  return mod.exports;
}

test("Admin Dashboard — 1. Badge 'Ao Vivo' removida mantendo título e indicadores", () => {
  const adminPagePath = path.join(process.cwd(), "src", "app", "admin", "page.tsx");
  const content = fs.readFileSync(adminPagePath, "utf-8");

  assert.ok(content.includes("Painel do Consultório"), "Título principal do dashboard deve permanecer");
  assert.ok(
    !content.includes("Ao Vivo"),
    "A badge 'Ao Vivo' não deve existir na interface do Admin Dashboard"
  );
  assert.ok(
    !content.includes("bg-emerald-500 animate-pulse"),
    "O indicador visual verde pulsante da badge 'Ao Vivo' deve ser removido"
  );
  assert.ok(content.includes("Últimas Atividades"), "Seção Últimas Atividades deve permanecer intacta");
  assert.ok(
    content.includes("formatActivityAction(act.action)"),
    "Últimas Atividades deve usar formatActivityAction"
  );
  assert.ok(
    content.includes("formatDate(act.createdAt, data.timezone)") &&
      content.includes("formatTime(act.createdAt, data.timezone)"),
    "Últimas Atividades deve formatar data e hora usando o timezone configurado"
  );
});

test("Admin Dashboard API — 2. Retorna timezone configurado sem alterar estatísticas", () => {
  const routePath = path.join(
    process.cwd(),
    "src",
    "app",
    "api",
    "admin",
    "dashboard-stats",
    "route.ts"
  );
  const content = fs.readFileSync(routePath, "utf-8");

  assert.ok(content.includes("prisma.systemSettings.findFirst"), "Deve consultar systemSettings");
  assert.ok(
    content.includes('timezone: systemSettings?.timezone || "America/Sao_Paulo"'),
    "Deve retornar o timezone configurado com fallback para America/Sao_Paulo"
  );
});

test("Localização Atividades — 3. Tradução centralizada em pt-BR (códigos atuais, legados e fallback seguro)", () => {
  const translations = loadTsModule("src/lib/translations.ts");
  const { formatActivityAction } = translations;

  const expectedTranslations = [
    ["PATIENT_ARCHIVED", "Paciente arquivado"],
    ["Patient archived", "Paciente arquivado"],
    ["patient archived", "Paciente arquivado"],
    ["PATIENT_PERMANENTLY_DELETED", "Paciente excluído permanentemente"],
    ["Patient permanently deleted", "Paciente excluído permanentemente"],
    ["DOCUMENT_DELETED", "Documento excluído"],
    ["Document deleted", "Documento excluído"],
    ["Patient created", "Paciente cadastrado"],
    ["PATIENT_REGISTERED", "Paciente cadastrado"],
    ["Patient registered", "Paciente cadastrado"],
    ["Patient updated", "Dados do paciente atualizados"],
    ["PATIENT_UPDATED_BY_ADMIN", "Dados do paciente atualizados"],
    ["PATIENT_RESTORED", "Paciente restaurado"],
    ["Patient restored", "Paciente restaurado"],
    ["APPOINTMENT_CREATED", "Agendamento criado"],
    ["Appointment created", "Agendamento criado"],
    ["Appointment canceled", "Agendamento cancelado"],
    ["Appointment cancelled", "Agendamento cancelado"],
    ["APPOINTMENT_RESCHEDULED", "Agendamento remarcado"],
    ["Appointment rescheduled", "Agendamento remarcado"],
    ["Payment received", "Pagamento recebido"],
    ["PAYMENT_RECEIVED", "Pagamento recebido"],
    ["Document uploaded", "Documento enviado"],
    ["FILE_UPLOADED", "Arquivo enviado com sucesso"],
    ["LOGIN_SUCCESS", "Login realizado com sucesso"],
    ["Login successful", "Login realizado com sucesso"],
    ["PUBLISH_INFORMATION_PAGE", "Página informativa publicada"],
    ["UNPUBLISH_INFORMATION_PAGE", "Página informativa despublicada"],
    ["RESTORE_DEFAULT_INFORMATION_PAGE", "Página informativa restaurada ao padrão"],
    ["UPDATE_INFORMATION_PAGE", "Página informativa atualizada"],
    ["MESSAGE_MANUALLY_RESENT", "Mensagem reenviada manualmente"],
    ["UPDATE_GENERAL_SERVICE_SETTINGS", "Configurações gerais de atendimento atualizadas"],
    ["APPOINTMENT_STATUS_CHANGED_TO_CONFIRMED", "Consulta confirmada"],
    ["APPOINTMENT_STATUS_CHANGED_TO_COMPLETED", "Consulta realizada"],
    ["APPOINTMENT_STATUS_CHANGED_TO_LATE_CANCELLED", "Cancelamento tardio registrado"],
    ["APPOINTMENT_STATUS_CHANGED_TO_NO_SHOW", "Não comparecimento registrado"],
  ];

  for (const [input, expected] of expectedTranslations) {
    assert.equal(
      formatActivityAction(input),
      expected,
      `Evento "${input}" deveria traduzir para "${expected}"`
    );
  }

  // Fallback seguro: nunca expor códigos crus em inglês para eventos desconhecidos
  const unknownInputs = [
    null,
    undefined,
    "",
    "   ",
    "UNKNOWN_INTERNAL_EVENT_CODE",
    "Unexpected background job finished",
    "constructor",
  ];
  for (const rawUnknown of unknownInputs) {
    const label = formatActivityAction(rawUnknown);
    assert.equal(
      label,
      "Atividade registrada no sistema",
      `Evento desconhecido (${String(rawUnknown)}) deve retornar fallback localizado em pt-BR`
    );
  }
});

test("Formatação de Data e Hora — 4. Padrão pt-BR DD/MM/YYYY e HH:mm respeitando timezone", () => {
  const utils = loadTsModule("src/lib/utils.ts");
  const { formatDate, formatTime } = utils;

  const isoUtc = "2026-11-10T03:05:00.000Z";
  assert.equal(formatDate(isoUtc, "America/Sao_Paulo"), "10/11/2026");
  assert.equal(formatTime(isoUtc, "America/Sao_Paulo"), "00:05");

  // Timezone alternativo (-04:00) deve refletir data/hora no fuso configurado sem alterar o timestamp UTC
  assert.equal(formatDate(isoUtc, "America/Manaus"), "09/11/2026");
  assert.equal(formatTime(isoUtc, "America/Manaus"), "23:05");

  // Fallback seguro caso timezone configurado seja inválido
  assert.equal(formatDate(isoUtc, "Invalid/Timezone"), "10/11/2026");
  assert.equal(formatTime(isoUtc, "Invalid/Timezone"), "00:05");
});
