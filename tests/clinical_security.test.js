const test = require("node:test");
const assert = require("node:assert");

test("Segurança Clínica: Prontuário eletrônico é inacessível para pacientes", () => {
  function canAccessClinicalRecord(userRole) {
    // Regra rígida de domínio: Apenas ADMIN tem acesso a notas clínicas
    if (userRole === "ADMIN") return true;
    return false;
  }

  assert.strictEqual(canAccessClinicalRecord("PATIENT"), false, "Paciente nunca deve acessar prontuário clínico");
  assert.strictEqual(canAccessClinicalRecord("ADMIN"), true, "Profissional (ADMIN) pode acessar prontuário");
});

test("Compartilhamento de Documentos: Validação de titularidade e expiração", () => {
  const fileShare = {
    fileId: "file_atestado_123",
    patientId: "patient_alice",
    expiresAt: new Date(Date.now() + 15 * 86400000), // 15 dias no futuro
    canDownload: true,
  };

  function checkDownloadPermission(share, requestingUserId, now = new Date()) {
    // 1. Checa titularidade
    if (share.patientId !== requestingUserId) {
      return { allowed: false, error: "FORBIDDEN_RESOURCE_OWNERSHIP" };
    }

    // 2. Checa expiração
    if (share.expiresAt && share.expiresAt < now) {
      return { allowed: false, error: "SHARE_EXPIRED" };
    }

    return { allowed: true };
  }

  // Alice acessa seu próprio documento dentro do prazo
  const aliceCheck = checkDownloadPermission(fileShare, "patient_alice");
  assert.strictEqual(aliceCheck.allowed, true);

  // Bob tenta acessar documento de Alice mudando o ID
  const bobCheck = checkDownloadPermission(fileShare, "patient_bob");
  assert.strictEqual(bobCheck.allowed, false);
  assert.strictEqual(bobCheck.error, "FORBIDDEN_RESOURCE_OWNERSHIP");

  // Alice tenta acessar após a data de expiração (30 dias no futuro)
  const futureDate = new Date(Date.now() + 30 * 86400000);
  const expiredCheck = checkDownloadPermission(fileShare, "patient_alice", futureDate);
  assert.strictEqual(expiredCheck.allowed, false);
  assert.strictEqual(expiredCheck.error, "SHARE_EXPIRED");
});
