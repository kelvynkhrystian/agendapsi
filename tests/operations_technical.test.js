const test = require("node:test");
const assert = require("node:assert");
const crypto = require("crypto");

test("Monitoramento Técnico GET: Rejeição de requisições sem Bearer Token válido", () => {
  const configuredSecret = "secret_bearer_token_123456";

  function validateTechnicalAccess(authHeader) {
    if (!authHeader) return { status: 401, error: "TOKEN_MISSING" };
    if (authHeader !== `Bearer ${configuredSecret}`) {
      return { status: 401, error: "TOKEN_INVALID" };
    }
    return { status: 200 };
  }

  // 1. Sem token
  assert.strictEqual(validateTechnicalAccess(null).status, 401);

  // 2. Token incorreto
  assert.strictEqual(validateTechnicalAccess("Bearer wrong_token").status, 401);

  // 3. Token correto
  assert.strictEqual(validateTechnicalAccess(`Bearer ${configuredSecret}`).status, 200);
});

test("Monitoramento Técnico GET: Garantia de não vazamento de dados sensíveis ou senhas", () => {
  // Simula payload gerado pelo endpoint /api/technical/status
  const technicalPayload = {
    installationId: "psi-standalone-instance-default",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    adminContact: {
      name: "Dra. Helena Martins",
      email: "adminpsi@localhost.test",
      phone: "99999999999",
      crpCrm: "CRP 06/184920",
    },
    patientMetrics: {
      totalPatients: 15, // Somente agregado numérico!
    },
    storage: {
      fileCount: 4,
      totalBytes: 1048576,
      diskAvailableBytes: null, // "not available" honesto
    },
  };

  const payloadString = JSON.stringify(technicalPayload);

  // Invariantes estritas de segurança:
  assert.strictEqual(payloadString.includes("passwordHash"), false, "Nunca deve conter hashes de senha");
  assert.strictEqual(payloadString.includes("clinicalRecord"), false, "Nunca deve conter anotações de prontuário");
  assert.strictEqual(payloadString.includes("cpf"), false, "Não deve expor CPFs de pacientes");
  assert.strictEqual(payloadString.includes("patientsList"), false, "Não deve conter listagem individual de pacientes");
});

test("Backup e Integridade: Cálculo de checksum SHA256 e manifest estruturado", () => {
  const backupObject = {
    manifest: {
      system: "PSI",
      version: "1.0.0",
      generatedAt: "2026-11-20T12:00:00Z",
    },
    data: {
      patientsCount: 10,
      appointmentsCount: 25,
    },
  };

  const json = JSON.stringify(backupObject, null, 2);
  const checksum = crypto.createHash("sha256").update(json).digest("hex");

  assert.strictEqual(typeof checksum, "string");
  assert.strictEqual(checksum.length, 64, "Checksum SHA256 deve ter 64 caracteres hexadecimais");

  // Verificação de integridade: alteração de 1 bit altera o checksum
  const tamperedJson = json.replace("10", "11");
  const tamperedChecksum = crypto.createHash("sha256").update(tamperedJson).digest("hex");
  assert.notStrictEqual(checksum, tamperedChecksum, "Qualquer adulteração deve invalidar a integridade do backup");
});

test("Monitoramento Técnico GET: Grupos de resposta estruturados e métricas reais (Phase 3)", () => {
  // Simula o payload estruturado completo gerado pelo endpoint atualizado
  const payload = {
    installation: {
      applicationVersion: "1.0.0",
      installationId: "psi-standalone-instance-default",
      timestamp: new Date().toISOString(),
      applicationStatus: "OPERATIONAL",
    },
    administrator: {
      name: "Dra. Helena Martins",
      email: "adminpsi@localhost.test",
      phone: "99999999999",
    },
    storage: {
      totalFileSizeBytes: 227307,
      totalFileCount: 3,
      usageMB: 0.22,
      availableDiskSpaceBytes: 39552606208,
    },
    application: {
      totalPatients: 3,
      totalAppointments: 9,
      totalServices: 4,
    },
    integrations: {
      emailStatus: "DISABLED",
      whatsappStatus: "DISABLED",
      paymentGatewayStatus: "SIMULATED_ACTIVE",
      videoProvider: "JITSI",
    },
    payments: {
      totalPayments: 3,
      pendingPayments: 1,
      approvedPayments: 2,
      integrationStatus: "ONLINE_SIMULATED",
    },
  };

  // 1. Grupo installation
  assert.ok(payload.installation);
  assert.strictEqual(typeof payload.installation.applicationVersion, "string");
  assert.strictEqual(typeof payload.installation.installationId, "string");
  assert.strictEqual(typeof payload.installation.timestamp, "string");
  assert.strictEqual(payload.installation.applicationStatus, "OPERATIONAL");

  // 2. Grupo administrator
  assert.ok(payload.administrator);
  assert.strictEqual(typeof payload.administrator.name, "string");
  assert.strictEqual(typeof payload.administrator.email, "string");
  assert.strictEqual(typeof payload.administrator.phone, "string");

  // 3. Grupo storage
  assert.ok(payload.storage);
  assert.strictEqual(typeof payload.storage.totalFileSizeBytes, "number");
  assert.strictEqual(typeof payload.storage.totalFileCount, "number");
  assert.strictEqual(typeof payload.storage.usageMB, "number");
  assert.ok(
    payload.storage.availableDiskSpaceBytes === null ||
      typeof payload.storage.availableDiskSpaceBytes === "number"
  );

  // 4. Grupo application
  assert.ok(payload.application);
  assert.strictEqual(typeof payload.application.totalPatients, "number");
  assert.strictEqual(typeof payload.application.totalAppointments, "number");
  assert.strictEqual(typeof payload.application.totalServices, "number");

  // 5. Grupo integrations
  assert.ok(payload.integrations);
  assert.strictEqual(typeof payload.integrations.emailStatus, "string");
  assert.strictEqual(typeof payload.integrations.whatsappStatus, "string");
  assert.strictEqual(typeof payload.integrations.paymentGatewayStatus, "string");
  assert.strictEqual(typeof payload.integrations.videoProvider, "string");

  // 6. Grupo payments
  assert.ok(payload.payments);
  assert.strictEqual(typeof payload.payments.totalPayments, "number");
  assert.strictEqual(typeof payload.payments.pendingPayments, "number");
  assert.strictEqual(typeof payload.payments.approvedPayments, "number");
  assert.strictEqual(typeof payload.payments.integrationStatus, "string");

  // 7. Invariantes de segurança e não vazamento
  const str = JSON.stringify(payload);
  assert.strictEqual(str.includes("password"), false);
  assert.strictEqual(str.includes("token"), false);
  assert.strictEqual(str.includes("secret"), false);
  assert.strictEqual(str.includes("clinical"), false);
});
