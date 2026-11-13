const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const net = require("node:net");
const http = require("node:http");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");

function compileIntegrationLibsToTempDir(tempDir) {
  const ts = require("typescript");
  const files = [
    "src/lib/prisma.ts",
    "src/lib/translations.ts",
    "src/lib/utils.ts",
    "src/lib/phone-utils.ts",
    "src/lib/secrets.ts",
    "src/lib/integrations-health.ts",
    "src/lib/integrations-email.ts",
    "src/lib/integrations-sms.ts",
    "src/lib/integrations-whatsapp.ts",
    "src/lib/integrations-response.ts",
    "src/lib/site-media-cleanup.ts",
    "src/lib/backup.ts",
    "src/lib/notifications.ts",
  ];

  const nmTarget = path.join(process.cwd(), "node_modules");
  const nmLink = path.join(tempDir, "node_modules");
  if (!fs.existsSync(nmLink)) {
    fs.symlinkSync(nmTarget, nmLink, process.platform === "win32" ? "junction" : "dir");
  }

  for (const relPath of files) {
    const absIn = path.join(process.cwd(), relPath);
    const source = fs.readFileSync(absIn, "utf8");
    const transpiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
        resolveJsonModule: true,
      },
      fileName: absIn,
    });
    const outText = transpiled.outputText.replace(/@\/lib\//g, "./");
    const outPath = path.join(tempDir, path.basename(relPath, ".ts") + ".js");
    fs.writeFileSync(outPath, outText, "utf8");
  }
}

function startMockSmtpServer({ expectedUser, expectedPass }) {
  const receivedMessages = [];
  const server = net.createServer((socket) => {
    let buffer = "";
    let inDataMode = false;
    let authStep = 0;
    let authUser = "";
    let currentMail = { from: "", to: [], body: "" };

    socket.write("220 mock-smtp.psi.local ESMTP MockMail\r\n");

    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");

      while (true) {
        if (inDataMode) {
          const endIdx = buffer.indexOf("\r\n.\r\n");
          if (endIdx === -1) break;
          currentMail.body = buffer.slice(0, endIdx);
          buffer = buffer.slice(endIdx + 5);
          inDataMode = false;
          receivedMessages.push({ ...currentMail });
          currentMail = { from: "", to: [], body: "" };
          socket.write("250 2.0.0 Ok: queued as msg-smtp-test-001\r\n");
          continue;
        }

        const lineEnd = buffer.indexOf("\r\n");
        if (lineEnd === -1) break;
        const line = buffer.slice(0, lineEnd);
        buffer = buffer.slice(lineEnd + 2);
        const upper = line.toUpperCase();

        if (authStep === 1) {
          authUser = Buffer.from(line.trim(), "base64").toString("utf8");
          authStep = 2;
          socket.write("334 UGFzc3dvcmQ6\r\n");
          continue;
        }
        if (authStep === 2) {
          const authPass = Buffer.from(line.trim(), "base64").toString("utf8");
          authStep = 0;
          if (authUser === expectedUser && authPass === expectedPass) {
            socket.write("235 2.7.0 Authentication successful\r\n");
          } else {
            socket.write("535 5.7.8 Authentication credentials invalid\r\n");
          }
          continue;
        }

        if (upper.startsWith("EHLO") || upper.startsWith("HELO")) {
          socket.write("250-mock-smtp.psi.local\r\n250 AUTH LOGIN PLAIN\r\n");
        } else if (upper.startsWith("AUTH PLAIN")) {
          const b64 = line.slice(10).trim();
          const decoded = Buffer.from(b64, "base64").toString("utf8");
          const parts = decoded.split("\0");
          const user = parts[1] || "";
          const pass = parts[2] || "";
          if (user === expectedUser && pass === expectedPass) {
            socket.write("235 2.7.0 Authentication successful\r\n");
          } else {
            socket.write("535 5.7.8 Authentication credentials invalid\r\n");
          }
        } else if (upper === "AUTH LOGIN") {
          authStep = 1;
          socket.write("334 VXNlcm5hbWU6\r\n");
        } else if (upper.startsWith("MAIL FROM:")) {
          currentMail.from = line.slice(10).trim();
          socket.write("250 2.1.0 Ok\r\n");
        } else if (upper.startsWith("RCPT TO:")) {
          currentMail.to.push(line.slice(8).trim());
          socket.write("250 2.1.5 Ok\r\n");
        } else if (upper === "DATA") {
          inDataMode = true;
          socket.write("354 End data with <CR><LF>.<CR><LF>\r\n");
        } else if (upper === "QUIT") {
          socket.write("221 2.0.0 Bye\r\n");
          socket.end();
        } else {
          socket.write("250 Ok\r\n");
        }
      }
    });
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      resolve({
        port: addr.port,
        receivedMessages,
        close: () => new Promise((r) => server.close(() => r())),
      });
    });
  });
}

function startMockHttpServer(handler) {
  const requests = [];
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const rawBody = Buffer.concat(chunks).toString("utf8");
      let jsonBody = null;
      try {
        jsonBody = rawBody ? JSON.parse(rawBody) : null;
      } catch {}
      requests.push({
        method: req.method,
        url: req.url,
        headers: req.headers,
        rawBody,
        jsonBody,
      });
      handler({ req, res, rawBody, jsonBody });
    });
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      resolve({
        baseUrl: `http://127.0.0.1:${addr.port}`,
        port: addr.port,
        requests,
        close: () => new Promise((r) => server.close(() => r())),
      });
    });
  });
}

test("Integrações 1 — Contratos de Segurança (RBAC, Zod, Criptografia, LGPD SMS Opt-in e PT-BR)", () => {
  const adminRoutes = [
    "src/app/api/admin/integrations/route.ts",
    "src/app/api/admin/integrations/email/route.ts",
    "src/app/api/admin/integrations/email/verify/route.ts",
    "src/app/api/admin/integrations/email/test/route.ts",
    "src/app/api/admin/integrations/sms/route.ts",
    "src/app/api/admin/integrations/sms/verify/route.ts",
    "src/app/api/admin/integrations/sms/test/route.ts",
    "src/app/api/admin/integrations/sms/devices/route.ts",
    "src/app/api/admin/integrations/whatsapp/route.ts",
    "src/app/api/admin/integrations/whatsapp/verify/route.ts",
    "src/app/api/admin/integrations/whatsapp/test/route.ts",
    "src/app/api/admin/integrations/whatsapp/openwa/qr/route.ts",
    "src/app/api/admin/integrations/whatsapp/openwa/reconnect/route.ts",
    "src/app/api/admin/integrations/whatsapp/openwa/disconnect/route.ts",
  ];

  for (const relPath of adminRoutes) {
    const absPath = path.join(process.cwd(), relPath);
    assert.ok(fs.existsSync(absPath), `Rota ${relPath} deve existir`);
    const content = fs.readFileSync(absPath, "utf8");
    assert.ok(content.includes("requireAdmin"), `${relPath} deve exigir requireAdmin()`);
  }

  for (const writeRoute of [
    "src/app/api/admin/integrations/email/route.ts",
    "src/app/api/admin/integrations/sms/route.ts",
    "src/app/api/admin/integrations/whatsapp/route.ts",
  ]) {
    const content = fs.readFileSync(path.join(process.cwd(), writeRoute), "utf8");
    assert.ok(content.includes("safeParse"), `${writeRoute} deve validar entrada com Zod safeParse`);
    assert.ok(content.includes("encryptSecret"), `${writeRoute} deve criptografar segredos em repouso`);
    assert.ok(content.includes("isRestoreInProgress"), `${writeRoute} deve respeitar bloqueio de restauração`);
  }

  // UI Admin -> Integrações (3 Abas: E-mail, SMS, WhatsApp)
  const pageContent = fs.readFileSync(
    path.join(process.cwd(), "src/app/admin/integracoes/page.tsx"),
    "utf8"
  );
  for (const required of [
    "@/components/ui/tabs",
    "<TabsList",
    '<TabsTrigger value="email">',
    '<TabsTrigger value="sms">',
    '<TabsTrigger value="whatsapp">',
    '<TabsContent value="email">',
    '<TabsContent value="sms">',
    '<TabsContent value="whatsapp">',
    "E-mail",
    "SMS",
    "SMS — TextBee",
    "WhatsApp",
    "Ativar E-mail",
    "Ativar SMS",
    "Ativar WhatsApp",
    "E-mail Padrão",
    "E-mail Personalizado",
    "Desbloquear SMTP Personalizado",
    "Voltar para E-mail Padrão",
    "Apenas um provedor pode estar ativo por vez",
    "Meta Official API",
    "OpenWA",
    "Verificar Conexão",
    "Enviar E-mail de Teste",
    "Enviar SMS de Teste",
    "Enviar Mensagem de Teste",
    "Salvar Alterações",
    "Buscar Dispositivos",
    "Exibir QR Code",
    "Reconectar Sessão",
    "Desconectar",
    'role="switch"',
    "sessão não oficial conectada ao WhatsApp Web",
    "Pacientes iniciam desmarcados (opt-in obrigatório)",
    "Nenhum provedor de e-mail padrão foi configurado no ambiente do servidor (.env)",
  ]) {
    assert.ok(pageContent.includes(required), `UI /admin/integracoes deve conter '${required}'`);
  }

  // Tabs UI reutilizado deve espelhar estilo pill de Admin -> Lembretes e exibir 1 painel por vez
  const tabsUiContent = fs.readFileSync(
    path.join(process.cwd(), "src/components/ui/tabs.tsx"),
    "utf8"
  );
  for (const requiredTabStyle of [
    "rounded-2xl",
    "rounded-xl",
    "bg-[var(--button-bg,var(--primary))]",
    "text-[var(--button-fg,#ffffff)]",
    "if (context.value !== value) return null;",
  ]) {
    assert.ok(
      tabsUiContent.includes(requiredTabStyle),
      `src/components/ui/tabs.tsx deve conter '${requiredTabStyle}'`
    );
  }

  // Consentimento opcional de SMS desmarcado por padrão
  for (const formPath of [
    "src/app/cadastro/page.tsx",
    "src/app/paciente/perfil/page.tsx",
    "src/app/admin/pacientes/novo/page.tsx",
    "src/app/admin/pacientes/[id]/editar/page.tsx",
  ]) {
    const content = fs.readFileSync(path.join(process.cwd(), formPath), "utf8");
    assert.ok(content.includes("smsOptIn"), `${formPath} deve expor campo smsOptIn`);
  }

  const cadastroContent = fs.readFileSync(path.join(process.cwd(), "src/app/cadastro/page.tsx"), "utf8");
  assert.ok(
    cadastroContent.includes("useState(false)") && cadastroContent.includes("smsOptIn"),
    "Auto-cadastro deve iniciar smsOptIn explicitamente desmarcado (false)"
  );

  const registerApi = fs.readFileSync(
    path.join(process.cwd(), "src/app/api/auth/register-patient/route.ts"),
    "utf8"
  );
  assert.ok(registerApi.includes("smsOptIn: z.boolean().optional().default(false)"));

  const recoverApi = fs.readFileSync(
    path.join(process.cwd(), "src/app/api/auth/recover-password/route.ts"),
    "utf8"
  );
  assert.ok(recoverApi.includes("crypto.randomBytes"), "Recuperação de senha deve gerar token com crypto.randomBytes");
  assert.ok(recoverApi.includes('messageType: "PASSWORD_RECOVERY"'));
  assert.ok(recoverApi.includes("ADMIN_ASSISTED"));
  assert.ok(recoverApi.includes('process.env.NODE_ENV !== "production"'));
});

test("Integrações 2 — Criptografia AES-256-GCM, Proteção SSRF e Sanitização de Segredos", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "psi-int-sec-"));
  const prevEncKey = process.env.PSI_ENCRYPTION_KEY;
  try {
    compileIntegrationLibsToTempDir(tmpDir);
    process.env.PSI_ENCRYPTION_KEY = "chave-mestra-super-secreta-para-teste-unitario";
    const secrets = require(path.join(tmpDir, "secrets.js"));

    const plain = "tb_live_token_987654321_segredo_extremo";
    const encrypted = secrets.encryptSecret(plain);
    assert.ok(encrypted.startsWith("enc:v1:"), "Segredo criptografado deve usar prefixo enc:v1:");
    assert.notEqual(encrypted, plain);
    assert.equal(secrets.encryptSecret(encrypted), encrypted, "encryptSecret deve ser idempotente");
    assert.equal(secrets.decryptSecret(encrypted), plain, "decryptSecret deve recuperar valor exato");
    assert.equal(secrets.decryptSecret("valor-legado-texto"), "valor-legado-texto");

    const masked = secrets.maskSecret(encrypted);
    assert.ok(masked.startsWith("••••••••"));
    assert.ok(!masked.includes("tb_live_token"), "maskSecret nunca deve vazar o token completo");

    // Proteção SSRF
    assert.equal(secrets.validateProviderBaseUrl("file:///etc/passwd").valid, false);
    assert.equal(secrets.validateProviderBaseUrl("ftp://example.com").valid, false);
    assert.equal(secrets.validateProviderBaseUrl("https://user:secret@example.com").valid, false);
    assert.equal(secrets.validateProviderBaseUrl("http://169.254.169.254/latest/meta-data").valid, false);
    assert.equal(secrets.validateProviderBaseUrl("http://10.0.0.5:8080").valid, false);
    assert.equal(secrets.validateProviderBaseUrl("http://externo.sem.tls.com/api").valid, false);
    assert.equal(
      secrets.validateProviderBaseUrl("http://127.0.0.1:8080", { allowHttpLocalhost: false }).valid,
      false
    );
    const validHttps = secrets.validateProviderBaseUrl("https://openwa.clinica.com.br/");
    assert.equal(validHttps.valid, true);
    assert.equal(validHttps.normalized, "https://openwa.clinica.com.br");

    // Sanitização de logs/erros
    const rawErr = `Falha Bearer EAAABCDEFGHIJKLMNOPQRST12345 e https://admin:minhaSenha@smtp.host com segredo=${plain} e enc=${encrypted}`;
    const cleaned = secrets.sanitizeErrorMessage(rawErr, [plain]);
    assert.equal(cleaned.includes(plain), false);
    assert.equal(cleaned.includes("minhaSenha"), false);
    assert.equal(cleaned.includes("EAAABCDEFGHIJKLMNOPQRST12345"), false);
    assert.equal(cleaned.includes("enc:v1:"), false);
  } finally {
    if (prevEncKey === undefined) delete process.env.PSI_ENCRYPTION_KEY;
    else process.env.PSI_ENCRYPTION_KEY = prevEncKey;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("Integrações 3 — E-mail Real (Mock SMTP TCP), Erros de Autenticação e Modo Desativado", async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "psi-int-smtp-"));
  const smtp = await startMockSmtpServer({
    expectedUser: "consultorio@psi.local",
    expectedPass: "SmtpSenhaSuperSegreta123!",
  });

  try {
    compileIntegrationLibsToTempDir(tmpDir);
    const secrets = require(path.join(tmpDir, "secrets.js"));
    const emailLib = require(path.join(tmpDir, "integrations-email.js"));

    // 1. Canal desativado
    const disabledCheck = await emailLib.verifyEmailConnection({
      smtpEnabled: false,
      emailMode: "CUSTOM",
      smtpHost: "127.0.0.1",
      smtpPort: smtp.port,
      smtpEncryption: "NONE",
      smtpUser: "consultorio@psi.local",
      smtpPass: secrets.encryptSecret("SmtpSenhaSuperSegreta123!"),
      smtpFrom: "consultorio@psi.local",
    });
    assert.equal(disabledCheck.ok, false);
    assert.equal(disabledCheck.healthStatus, "DISABLED");

    // 2. Autenticação válida via servidor SMTP local real
    const validSettings = {
      smtpEnabled: true,
      emailMode: "CUSTOM",
      smtpHost: "127.0.0.1",
      smtpPort: smtp.port,
      smtpEncryption: "NONE",
      smtpUser: "consultorio@psi.local",
      smtpPass: secrets.encryptSecret("SmtpSenhaSuperSegreta123!"),
      smtpFrom: "consultorio@psi.local",
      smtpSenderName: "Consultório Dra. Ana",
    };

    const okCheck = await emailLib.verifyEmailConnection(validSettings);
    assert.equal(okCheck.ok, true);
    assert.equal(okCheck.healthStatus, "CONNECTED");

    const sendRes = await emailLib.sendEmailMessage(validSettings, {
      to: "paciente@exemplo.com",
      subject: "Confirmação de Sessão",
      text: "Sua sessão foi confirmada.",
    });
    assert.equal(sendRes.ok, true);
    assert.equal(sendRes.healthStatus, "CONNECTED");
    assert.equal(sendRes.provider, "SMTP_CUSTOM");
    assert.ok(sendRes.providerMessageId);
    assert.equal(smtp.receivedMessages.length, 1);

    // 3. Credenciais inválidas (535) não vazam senha
    const rawBadPass = "SenhaErradaComToken123";
    const badCheck = await emailLib.verifyEmailConnection({
      ...validSettings,
      smtpPass: rawBadPass,
    });
    assert.equal(badCheck.ok, false);
    assert.equal(badCheck.healthStatus, "INVALID_AUTH");
    assert.equal(badCheck.message.includes(rawBadPass), false);
  } finally {
    await smtp.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("Integrações 4 — SMS TextBee (Mock HTTP): Listagem de Dispositivos, Offline, Auth e Envio E.164", async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "psi-int-sms-"));
  let deviceOnline = true;
  const mockServer = await startMockHttpServer(({ req, res }) => {
    const key = req.headers["x-api-key"];
    if (key !== "tb-key-valida-123") {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    if (req.method === "GET" && req.url === "/api/v1/gateway/devices") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          data: [
            {
              _id: "android-dev-01",
              name: "Moto G54 Consultório",
              brand: "Motorola",
              model: "G54",
              enabled: true,
              online: deviceOnline,
            },
          ],
        })
      );
      return;
    }

    if (req.method === "POST" && req.url === "/api/v1/gateway/devices/android-dev-01/send-sms") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ data: { smsBatchId: "tb-batch-9988" } }));
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  });

  try {
    compileIntegrationLibsToTempDir(tmpDir);
    const secrets = require(path.join(tmpDir, "secrets.js"));
    const smsLib = require(path.join(tmpDir, "integrations-sms.js"));

    const encValidKey = secrets.encryptSecret("tb-key-valida-123");

    // 1. Dispositivo online -> CONNECTED
    const okVerify = await smsLib.verifySmsConnection({
      smsEnabled: true,
      textbeeHostingMode: "SELF_HOSTED",
      textbeeApiUrl: mockServer.baseUrl,
      textbeeApiKey: encValidKey,
      textbeeDeviceId: "android-dev-01",
    });
    assert.equal(okVerify.ok, true);
    assert.equal(okVerify.healthStatus, "CONNECTED");
    assert.equal(okVerify.selectedDevice.isOnline, true);

    // 2. API acessível sem deviceId selecionado -> PARTIAL_API_ONLY
    const partialVerify = await smsLib.verifySmsConnection({
      smsEnabled: true,
      textbeeHostingMode: "SELF_HOSTED",
      textbeeApiUrl: mockServer.baseUrl,
      textbeeApiKey: encValidKey,
      textbeeDeviceId: "",
    });
    assert.equal(partialVerify.ok, false);
    assert.equal(partialVerify.healthStatus, "PARTIAL_API_ONLY");

    // 3. Dispositivo Android offline -> DEVICE_OFFLINE
    deviceOnline = false;
    const offlineVerify = await smsLib.verifySmsConnection({
      smsEnabled: true,
      textbeeHostingMode: "SELF_HOSTED",
      textbeeApiUrl: mockServer.baseUrl,
      textbeeApiKey: encValidKey,
      textbeeDeviceId: "android-dev-01",
    });
    assert.equal(offlineVerify.ok, false);
    assert.equal(offlineVerify.healthStatus, "DEVICE_OFFLINE");

    // 4. API Key inválida -> INVALID_AUTH
    const badAuthVerify = await smsLib.verifySmsConnection({
      smsEnabled: true,
      textbeeHostingMode: "SELF_HOSTED",
      textbeeApiUrl: mockServer.baseUrl,
      textbeeApiKey: "chave-errada",
      textbeeDeviceId: "android-dev-01",
    });
    assert.equal(badAuthVerify.ok, false);
    assert.equal(badAuthVerify.healthStatus, "INVALID_AUTH");

    // 5. Envio com normalização E.164 brasileira (+5511987654321)
    const sendRes = await smsLib.sendSmsMessage(
      {
        smsEnabled: true,
        textbeeHostingMode: "SELF_HOSTED",
        textbeeApiUrl: mockServer.baseUrl,
        textbeeApiKey: encValidKey,
        textbeeDeviceId: "android-dev-01",
      },
      { to: "(11) 98765-4321", message: "Lembrete PSI" }
    );
    assert.equal(sendRes.ok, true);
    assert.equal(sendRes.provider, "TEXTBEE_SELF_HOSTED");
    assert.equal(sendRes.providerMessageId, "tb-batch-9988");

    const postReq = mockServer.requests.find((r) => r.method === "POST");
    assert.deepEqual(postReq.jsonBody.recipients, ["+5511987654321"]);
  } finally {
    await mockServer.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("Integrações 5 — WhatsApp Meta Cloud API e OpenWA (Mock HTTP + QR Code + HMAC Webhook)", async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "psi-int-wa-"));
  let openWaState = "AWAITING_QR";
  const sampleQrBase64 =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

  const mockWaServer = await startMockHttpServer(({ req, res }) => {
    // Meta Cloud API endpoints
    if (req.url.startsWith("/v21.0/phone-123/messages") && req.method === "POST") {
      if (req.headers.authorization !== "Bearer meta-token-valido") {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: { message: "Invalid OAuth", code: 190 } }));
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ messages: [{ id: "wamid.HBgMNTUxMTk5OTk5" }] }));
      return;
    }

    if (req.url.startsWith("/v21.0/phone-123") && req.method === "GET") {
      if (req.headers.authorization !== "Bearer meta-token-valido") {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: { message: "Invalid OAuth", code: 190 } }));
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          id: "phone-123",
          display_phone_number: "+55 11 99999-0000",
          verified_name: "Consultório PSI Oficial",
        })
      );
      return;
    }

    // OpenWA endpoints
    if (req.url === "/health" && req.method === "GET") {
      if (req.headers["x-api-key"] !== "openwa-secret-key") {
        res.writeHead(403, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Forbidden" }));
        return;
      }
      if (openWaState === "AWAITING_QR") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "AWAITING_QR", qrCode: sampleQrBase64 }));
        return;
      }
      if (openWaState === "CONFLICT") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "CONFLICT" }));
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ connected: true, status: "CONNECTED", wid: "5511977776666@c.us" }));
      return;
    }

    if (req.url === "/api/sessions/default/qr") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ qrCode: sampleQrBase64 }));
      return;
    }

    if (req.url === "/api/sessions/default/reconnect" && req.method === "POST") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ qrCode: sampleQrBase64 }));
      return;
    }

    if (req.url === "/api/sessions/default/logout" && req.method === "POST") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (req.url === "/api/messages/sendText" && req.method === "POST") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ id: "openwa-msg-001" }));
      return;
    }

    res.writeHead(404);
    res.end();
  });

  const prevGraphBase = process.env.PSI_META_GRAPH_BASE_URL;
  try {
    process.env.PSI_META_GRAPH_BASE_URL = `${mockWaServer.baseUrl}/v21.0`;
    compileIntegrationLibsToTempDir(tmpDir);

    const secrets = require(path.join(tmpDir, "secrets.js"));
    const waLib = require(path.join(tmpDir, "integrations-whatsapp.js"));

    // 1. Meta Official Connected & Invalid Auth
    const metaSettings = {
      whatsappEnabled: true,
      whatsappProvider: "META_OFFICIAL",
      whatsappMetaPhoneNumberId: "phone-123",
      whatsappMetaAccessToken: secrets.encryptSecret("meta-token-valido"),
    };

    const metaOk = await waLib.verifyWhatsAppConnection(metaSettings);
    assert.equal(metaOk.ok, true);
    assert.equal(metaOk.healthStatus, "CONNECTED");
    assert.equal(metaOk.verifiedName, "Consultório PSI Oficial");

    const metaSend = await waLib.sendWhatsAppMessage(metaSettings, {
      to: "(11) 91234-5678",
      message: "Olá via Meta",
    });
    assert.equal(metaSend.ok, true);
    assert.equal(metaSend.provider, "META_CLOUD_API");
    assert.equal(metaSend.providerMessageId, "wamid.HBgMNTUxMTk5OTk5");

    const metaBad = await waLib.verifyWhatsAppConnection({
      ...metaSettings,
      whatsappMetaAccessToken: "token-expirado",
    });
    assert.equal(metaBad.ok, false);
    assert.equal(metaBad.healthStatus, "INVALID_AUTH");

    // 2. Assinatura HMAC-SHA256 de Webhook Meta
    const rawWebhookBody = JSON.stringify({ object: "whatsapp_business_account", entry: [] });
    const appSecret = "meta-app-secret-hmac";
    const sigHex = crypto.createHmac("sha256", appSecret).update(rawWebhookBody, "utf8").digest("hex");
    assert.equal(waLib.verifyMetaWebhookSignature(rawWebhookBody, `sha256=${sigHex}`, appSecret), true);
    assert.equal(waLib.verifyMetaWebhookSignature(rawWebhookBody + " ", `sha256=${sigHex}`, appSecret), false);
    assert.equal(waLib.verifyMetaWebhookSignature(rawWebhookBody, "sha256=deadbeef", appSecret), false);

    // 3. OpenWA Ciclo Completo: AWAITING_QR -> QR -> CONNECTED -> CONFLICT -> Disconnect -> Send
    const openWaSettings = {
      whatsappEnabled: true,
      whatsappProvider: "OPENWA",
      openWaApiUrl: mockWaServer.baseUrl,
      openWaApiKey: secrets.encryptSecret("openwa-secret-key"),
      openWaSessionId: "default",
    };

    const qrInspection = await waLib.verifyWhatsAppConnection(openWaSettings);
    assert.equal(qrInspection.ok, false);
    assert.equal(qrInspection.healthStatus, "AWAITING_QR");
    assert.equal(qrInspection.qrCodeDataUri, sampleQrBase64);

    const qrFetch = await waLib.fetchOpenWaQrCode(waLib.getWhatsAppCapability(openWaSettings));
    assert.equal(qrFetch.ok, true);
    assert.equal(qrFetch.qrCodeDataUri, sampleQrBase64);

    openWaState = "CONNECTED";
    const connectedInspection = await waLib.verifyWhatsAppConnection(openWaSettings);
    assert.equal(connectedInspection.ok, true);
    assert.equal(connectedInspection.healthStatus, "CONNECTED");
    assert.ok(connectedInspection.displayPhone.includes("97777-6666"));

    const openWaSend = await waLib.sendWhatsAppMessage(openWaSettings, {
      to: "(11) 98888-1111",
      message: "Mensagem OpenWA",
    });
    assert.equal(openWaSend.ok, true);
    assert.equal(openWaSend.provider, "OPENWA");
    assert.equal(openWaSend.providerMessageId, "openwa-msg-001");

    const openWaPost = mockWaServer.requests.find((r) => r.url === "/api/messages/sendText");
    assert.equal(openWaPost.jsonBody.to, "5511988881111@c.us");

    openWaState = "CONFLICT";
    const conflictInspection = await waLib.verifyWhatsAppConnection(openWaSettings);
    assert.equal(conflictInspection.ok, false);
    assert.equal(conflictInspection.healthStatus, "RECONNECT_REQUIRED");

    const disconnected = await waLib.controlOpenWaSession(
      waLib.getWhatsAppCapability(openWaSettings),
      "disconnect"
    );
    assert.equal(disconnected.ok, true);
    assert.equal(disconnected.healthStatus, "RECONNECT_REQUIRED");
  } finally {
    if (prevGraphBase === undefined) delete process.env.PSI_META_GRAPH_BASE_URL;
    else process.env.PSI_META_GRAPH_BASE_URL = prevGraphBase;
    await mockWaServer.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("Integrações 6 — Fluxo Completo em BD Isolado: Snapshot Sem Segredos, SMS Opt-in LGPD e Redação em Backup", async (t) => {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    t.skip(".env ausente para criar banco temporário isolado");
    return;
  }

  const envText = fs.readFileSync(envPath, "utf8");
  const dbMatch = envText.match(/^DATABASE_URL=["']?([^\r\n"']+)/m);
  if (!dbMatch) {
    t.skip("DATABASE_URL não configurada");
    return;
  }

  const baseUrl = new URL(dbMatch[1]);
  const adminConnUrl = new URL(baseUrl.toString());
  adminConnUrl.pathname = "/information_schema";

  const { PrismaClient } = require("@prisma/client");
  const bootstrapPrisma = new PrismaClient({
    datasources: { db: { url: adminConnUrl.toString() } },
  });

  try {
    await bootstrapPrisma.$queryRawUnsafe("SELECT 1");
  } catch (err) {
    await bootstrapPrisma.$disconnect().catch(() => {});
    t.skip(`MySQL/MariaDB indisponível no ambiente de teste: ${err.message}`);
    return;
  }

  const mockSmsServer = await startMockHttpServer(({ req, res }) => {
    if (req.method === "POST" && req.url === "/api/v1/gateway/devices/dev-db-01/send-sms") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ data: { smsBatchId: "sms-db-batch-001" } }));
      return;
    }
    res.writeHead(404);
    res.end();
  });

  const testDbName = `psi_comm_int_test_${Date.now()}`;
  const testDbUrlObj = new URL(baseUrl.toString());
  testDbUrlObj.pathname = `/${testDbName}`;
  const testDbUrl = testDbUrlObj.toString();

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "psi-comm-db-"));
  const backupRoots = {
    privateUploadsDir: path.join(tmpDir, "private_uploads"),
    minisiteDir: path.join(tmpDir, "minisite"),
    publicUploadsDir: path.join(tmpDir, "public_uploads"),
    backupDir: path.join(tmpDir, "backups"),
    lockFilePath: path.join(tmpDir, ".restore.lock"),
  };
  fs.mkdirSync(backupRoots.privateUploadsDir, { recursive: true });
  fs.mkdirSync(backupRoots.minisiteDir, { recursive: true });
  fs.mkdirSync(backupRoots.publicUploadsDir, { recursive: true });

  const prevDatabaseUrl = process.env.DATABASE_URL;
  let isolatedPrisma = null;

  try {
    await bootstrapPrisma.$executeRawUnsafe(
      `CREATE DATABASE \`${testDbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );

    execFileSync(
      process.platform === "win32" ? "npx.cmd" : "npx",
      ["prisma", "db", "push", "--skip-generate"],
      {
        cwd: process.cwd(),
        env: { ...process.env, DATABASE_URL: testDbUrl },
        stdio: "pipe",
        shell: process.platform === "win32",
      }
    );

    compileIntegrationLibsToTempDir(tmpDir);
    process.env.DATABASE_URL = testDbUrl;
    delete global.prisma;

    const { prisma } = require(path.join(tmpDir, "prisma.js"));
    isolatedPrisma = prisma;
    const secrets = require(path.join(tmpDir, "secrets.js"));
    const healthLib = require(path.join(tmpDir, "integrations-health.js"));
    const responseLib = require(path.join(tmpDir, "integrations-response.js"));
    const notificationsLib = require(path.join(tmpDir, "notifications.js"));
    const backupLib = require(path.join(tmpDir, "backup.js"));

    const smtpRawSecret = "smtp_segredo_jamais_vazar_01";
    const textbeeRawKey = "tb_segredo_jamais_vazar_02";
    const metaRawToken = "meta_segredo_jamais_vazar_03";
    const metaRawSecret = "meta_app_secret_jamais_vazar_04";
    const openWaRawKey = "openwa_segredo_jamais_vazar_05";

    await prisma.adminAccount.create({
      data: {
        name: "Dra. Juliana",
        email: "admin-int@psi.local",
        passwordHash: "hash",
        phone: "11999998888",
      },
    });

    const sys = await prisma.systemSettings.create({
      data: {
        id: "default",
        smtpEnabled: false,
        emailMode: "CUSTOM",
        smtpHost: "smtp.clinica.local",
        smtpPort: 587,
        smtpEncryption: "TLS",
        smtpUser: "contato@clinica.local",
        smtpPass: secrets.encryptSecret(smtpRawSecret),
        smtpFrom: "contato@clinica.local",
        emailHealthStatus: "DISABLED",
        emailDisabledRecoveryStrategy: "SMS",
        smsEnabled: true,
        smsProvider: "TEXTBEE",
        textbeeHostingMode: "SELF_HOSTED",
        textbeeApiUrl: mockSmsServer.baseUrl,
        textbeeApiKey: secrets.encryptSecret(textbeeRawKey),
        textbeeDeviceId: "dev-db-01",
        smsHealthStatus: "CONNECTED",
        whatsappEnabled: true,
        whatsappProvider: "META_OFFICIAL",
        whatsappMetaPhoneNumberId: "100200300",
        whatsappMetaAccessToken: secrets.encryptSecret(metaRawToken),
        whatsappMetaAppSecret: secrets.encryptSecret(metaRawSecret),
        openWaApiUrl: "https://openwa.clinica.local",
        openWaApiKey: secrets.encryptSecret(openWaRawKey),
        whatsappHealthStatus: "UNVERIFIED",
      },
    });

    // 1. Snapshot nunca vaza nenhum segredo em texto claro ou ciphertext
    const snapshot = responseLib.buildIntegrationSnapshot(sys, {
      totalActivePatients: 2,
      smsOptInPatientsCount: 1,
    });
    const serializedSnapshot = JSON.stringify(snapshot);
    for (const leakedCandidate of [
      smtpRawSecret,
      textbeeRawKey,
      metaRawToken,
      metaRawSecret,
      openWaRawKey,
      "enc:v1:",
    ]) {
      assert.equal(
        serializedSnapshot.includes(leakedCandidate),
        false,
        `Snapshot nunca deve conter '${leakedCandidate}'`
      );
    }
    assert.equal(snapshot.email.hasPassword, true);
    assert.equal(snapshot.email.status, "DISABLED");
    assert.equal(snapshot.email.recoveryStrategy, "SMS");
    assert.equal(snapshot.sms.hasApiKey, true);
    assert.equal(snapshot.whatsapp.meta.hasAccessToken, true);
    assert.equal(snapshot.whatsapp.meta.hasAppSecret, true);
    assert.equal(snapshot.whatsapp.openwa.hasApiKey, true);
    assert.equal(healthLib.isSmsRecoveryReady(sys), true);

    // 2. Pacientes: padrão smsOptIn = false bloqueia SMS; optIn = true permite envio real
    const patientNoSms = await prisma.patient.create({
      data: {
        fullName: "Paciente Sem OptIn",
        email: "sem-sms@psi.local",
        phone: "11977770001",
      },
    });
    assert.equal(patientNoSms.smsOptIn, false, "Patient.smsOptIn deve ser false por padrão");

    const skippedSms = await notificationsLib.sendNotification({
      recipient: patientNoSms.phone,
      channel: "SMS",
      templateType: "REMINDER_24H",
      patientId: patientNoSms.id,
      variables: { patientName: patientNoSms.fullName },
      customMessage: "Lembrete bloqueado por LGPD",
    });
    assert.equal(skippedSms.skipped, true);
    assert.equal(skippedSms.reason, "PATIENT_SMS_OPT_OUT");

    const patientWithSms = await prisma.patient.create({
      data: {
        fullName: "Paciente Com OptIn",
        email: "com-sms@psi.local",
        phone: "11977770002",
        smsOptIn: true,
        smsOptInAt: new Date(),
      },
    });

    const sentSms = await notificationsLib.sendNotification({
      recipient: patientWithSms.phone,
      channel: "SMS",
      templateType: "REMINDER_24H",
      patientId: patientWithSms.id,
      variables: { patientName: patientWithSms.fullName },
      customMessage: "Lembrete autorizado via TextBee",
    });
    assert.equal(sentSms.success, true);
    assert.equal(sentSms.status, "ACCEPTED");
    assert.equal(sentSms.providerMessageId, "sms-db-batch-001");

    // 3. E-mail desativado registra entrega SIMULATED honestamente
    const simulatedEmail = await notificationsLib.sendNotification({
      recipient: patientNoSms.email,
      channel: "EMAIL",
      templateType: "APPOINTMENT_CONFIRMED",
      patientId: patientNoSms.id,
      variables: { patientName: patientNoSms.fullName },
      customMessage: "Confirmação com canal desativado",
    });
    assert.equal(simulatedEmail.simulated, true);
    assert.equal(simulatedEmail.status, "SIMULATED");

    // 4. Backup omite integralmente todos os novos segredos de integração
    const backup = await backupLib.createFullBackupArchive({
      db: prisma,
      roots: backupRoots,
    });
    const AdmZip = require("adm-zip");
    const zip = new AdmZip(backup.archivePath);
    const sysJsonText = zip.readAsText("psi-backup/database/systemSettings.json");
    const sysRows = JSON.parse(sysJsonText);
    assert.equal(sysRows.length, 1);
    assert.equal(sysRows[0].smtpPass, null);
    assert.equal(sysRows[0].textbeeApiKey, null);
    assert.equal(sysRows[0].whatsappMetaAccessToken, null);
    assert.equal(sysRows[0].whatsappMetaAppSecret, null);
    assert.equal(sysRows[0].openWaApiKey, null);
    for (const secretField of [
      "SystemSettings.textbeeApiKey",
      "SystemSettings.whatsappMetaAccessToken",
      "SystemSettings.whatsappMetaAppSecret",
      "SystemSettings.openWaApiKey",
    ]) {
      assert.ok(backupLib.REDACTED_SECRET_FIELDS.includes(secretField));
    }
  } finally {
    await mockSmsServer.close();
    if (isolatedPrisma) {
      await isolatedPrisma.$disconnect().catch(() => {});
    }
    if (prevDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = prevDatabaseUrl;
    delete global.prisma;

    await bootstrapPrisma.$executeRawUnsafe(`DROP DATABASE IF EXISTS \`${testDbName}\``).catch(() => {});
    await bootstrapPrisma.$disconnect().catch(() => {});
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
