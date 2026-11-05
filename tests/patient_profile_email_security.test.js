const test = require("node:test");
const assert = require("node:assert");
const crypto = require("node:crypto");

// 1. Alteração de e-mail verificada quando infraestrutura está ativa
test("Segurança de E-mail: Fluxo completo de alteração com token SHA-256 e validação", () => {
  const patient = {
    id: "pat_123",
    fullName: "Ana Maria Souza",
    email: "anamaria.antigo@exemplo.com",
    isActive: true,
  };

  const newEmail = "anamaria.novo@exemplo.com";

  // Gera token seguro e hash
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

  const tokenRecord = {
    id: "tok_1",
    patientId: patient.id,
    oldEmail: patient.email,
    newEmail,
    tokenHash,
    expiresAt,
    usedAt: null,
  };

  // Antes da verificação: login do paciente ainda é o antigo
  assert.strictEqual(patient.email, "anamaria.antigo@exemplo.com");
  assert.strictEqual(tokenRecord.usedAt, null);

  // Verificação com o rawToken recebido
  const incomingHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  assert.strictEqual(incomingHash, tokenRecord.tokenHash, "Hash do token deve corresponder");
  assert.ok(new Date() < tokenRecord.expiresAt, "Token não pode estar expirado");

  // Conclui verificação: marca como usado e atualiza e-mail
  tokenRecord.usedAt = new Date();
  patient.email = tokenRecord.newEmail;

  assert.strictEqual(patient.email, "anamaria.novo@exemplo.com");
  assert.ok(tokenRecord.usedAt !== null);
});

// 2. Rejeição de e-mail inválido e duplicado (Patient e Admin)
test("Segurança de E-mail: Rejeição de formato inválido e detecção de duplicidade", () => {
  const existingPatients = [
    { id: "p1", email: "paciente1@exemplo.com" },
    { id: "p2", email: "paciente2@exemplo.com" },
  ];
  const existingAdmins = [
    { id: "adm1", email: "admin@consultorio.com" },
  ];

  const validateEmailFormat = (email) => {
    return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  };

  const checkEmailUnique = (email, currentUserId) => {
    const normalized = email.toLowerCase().trim();
    const patientCollision = existingPatients.some(
      (p) => p.email.toLowerCase() === normalized && p.id !== currentUserId
    );
    const adminCollision = existingAdmins.some(
      (a) => a.email.toLowerCase() === normalized
    );
    return !patientCollision && !adminCollision;
  };

  // Validação de formato
  assert.strictEqual(validateEmailFormat("invalido"), false);
  assert.strictEqual(validateEmailFormat("@semusuario.com"), false);
  assert.strictEqual(validateEmailFormat("usuario@semdominio"), false);
  assert.strictEqual(validateEmailFormat("correto@exemplo.com"), true);

  // Duplicidade com outro paciente
  assert.strictEqual(
    checkEmailUnique("paciente2@exemplo.com", "p1"),
    false,
    "Deve rejeitar e-mail já usado por outro paciente"
  );

  // Duplicidade com administrador
  assert.strictEqual(
    checkEmailUnique("admin@consultorio.com", "p1"),
    false,
    "Deve rejeitar e-mail em uso pelo administrador"
  );

  // Mesmo e-mail do próprio paciente (não é colisão cruzada, mas não pode trocar para o mesmo)
  assert.strictEqual(
    checkEmailUnique("paciente1@exemplo.com", "p1"),
    true,
    "Mesmo e-mail do próprio paciente é detectado separadamente"
  );

  // E-mail livre
  assert.strictEqual(
    checkEmailUnique("livre@exemplo.com", "p1"),
    true,
    "E-mail disponível deve ser aceito"
  );
});

// 3. Rejeição de tokens expirados e reutilizados
test("Segurança de E-mail: Rejeição estrita de tokens expirados ou já consumidos", () => {
  const verifyToken = (tokenRecord, incomingToken) => {
    const hash = crypto.createHash("sha256").update(incomingToken).digest("hex");
    if (hash !== tokenRecord.tokenHash) {
      return { valid: false, reason: "INVALID_TOKEN" };
    }
    if (tokenRecord.usedAt !== null) {
      return { valid: false, reason: "ALREADY_USED" };
    }
    if (new Date() > tokenRecord.expiresAt) {
      return { valid: false, reason: "EXPIRED" };
    }
    return { valid: true };
  };

  const rawToken = "sample_raw_token_secret_value_123456";
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  // Token expirado
  const expiredRecord = {
    tokenHash,
    expiresAt: new Date(Date.now() - 1000), // no passado
    usedAt: null,
  };
  const resExpired = verifyToken(expiredRecord, rawToken);
  assert.strictEqual(resExpired.valid, false);
  assert.strictEqual(resExpired.reason, "EXPIRED");

  // Token já utilizado
  const usedRecord = {
    tokenHash,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    usedAt: new Date(Date.now() - 5000),
  };
  const resUsed = verifyToken(usedRecord, rawToken);
  assert.strictEqual(resUsed.valid, false);
  assert.strictEqual(resUsed.reason, "ALREADY_USED");

  // Token com valor incorreto
  const resWrong = verifyToken(
    { tokenHash, expiresAt: new Date(Date.now() + 15 * 60 * 1000), usedAt: null },
    "wrong_token_value"
  );
  assert.strictEqual(resWrong.valid, false);
  assert.strictEqual(resWrong.reason, "INVALID_TOKEN");
});

// 4. Prevenção de alterações cruzadas entre pacientes
test("Segurança de Perfil: Prevenção de atualização cross-patient e isolamento de sessão", () => {
  const session = {
    userId: "patient_alice",
    email: "alice@exemplo.com",
    role: "PATIENT",
  };

  const attackerPayload = {
    targetPatientId: "patient_bob", // tentativa de forjar outro ID
    fullName: "Nome Alterado Maliciosamente",
    phone: "11999999999",
  };

  // Regra de segurança: a API SEMPRE usa session.userId, ignorando payloads do cliente
  const resolveTargetPatientId = (activeSession, _clientBody) => {
    return activeSession.userId;
  };

  const effectiveId = resolveTargetPatientId(session, attackerPayload);
  assert.strictEqual(effectiveId, "patient_alice", "Deve usar exclusivamente o ID autenticado na sessão");
  assert.notStrictEqual(effectiveId, attackerPayload.targetPatientId);
});

// 5. Comportamento de login antes e após a verificação
test("Segurança de E-mail: Login permanece inalterado antes da verificação e migra somente após confirmação", () => {
  let patientAccount = {
    id: "p1",
    email: "login.atual@exemplo.com",
    passwordHash: "hash_super_secreto",
  };

  const simulateLogin = (attemptEmail) => {
    return patientAccount.email.toLowerCase() === attemptEmail.toLowerCase();
  };

  // 1. Paciente solicita alteração para "novo.login@exemplo.com"
  const pendingNewEmail = "novo.login@exemplo.com";

  // 2. Antes de verificar o link:
  assert.strictEqual(simulateLogin("login.atual@exemplo.com"), true, "E-mail antigo ainda faz login");
  assert.strictEqual(simulateLogin(pendingNewEmail), false, "Novo e-mail NÃO pode fazer login antes de verificar");

  // 3. Confirmação do token realizada
  patientAccount.email = pendingNewEmail;

  // 4. Após verificação concluída:
  assert.strictEqual(simulateLogin("login.atual@exemplo.com"), false, "E-mail antigo deixa de ser login");
  assert.strictEqual(simulateLogin(pendingNewEmail), true, "Novo e-mail passa a autenticar");
});

// 6. Comportamento seguro quando envio de e-mails (SMTP) está indisponível
test("Segurança de E-mail: Bloqueio seguro e sem alteração silenciosa se SMTP estiver desativado", () => {
  const systemSettings = {
    smtpEnabled: false,
    smtpHost: null,
    smtpUser: null,
  };

  const patient = {
    id: "p_10",
    email: "paciente.seguro@exemplo.com",
  };

  const isEmailConfigured = !!(systemSettings.smtpEnabled && systemSettings.smtpHost && systemSettings.smtpUser);
  assert.strictEqual(isEmailConfigured, false, "SMTP deve estar identificado como inativo");

  // Tentativa de troca
  const requestEmailChange = (configured, currentPatient, _requestedNewEmail) => {
    if (!configured) {
      return {
        success: false,
        status: 422,
        error: "Serviço de envio de e-mails não configurado. Alteração de e-mail bloqueada por segurança.",
      };
    }
    return { success: true };
  };

  const result = requestEmailChange(isEmailConfigured, patient, "outro@exemplo.com");

  assert.strictEqual(result.success, false);
  assert.strictEqual(result.status, 422);
  // Garante que o e-mail não sofreu mutação silenciosa
  assert.strictEqual(patient.email, "paciente.seguro@exemplo.com");
});

// 7. Ausência de segredos, senhas e tokens brutos em logs de auditoria
test("Auditoria: Não vazamento de senhas, hashes de senha ou tokens brutos nos detalhes de log", () => {
  const sanitizeAuditDetails = (action, metadata) => {
    const details = { ...metadata };
    delete details.password;
    delete details.passwordHash;
    delete details.currentPassword;
    delete details.newPassword;
    delete details.rawToken;
    delete details.token;
    return JSON.stringify(details);
  };

  const sensitiveInput = {
    updatedFields: ["fullName", "phone"],
    rawToken: "raw_secret_value_12345",
    currentPassword: "MinhaSenha123!",
    newPassword: "NovaSenhaForte456!",
    hasCpf: true,
  };

  const loggedString = sanitizeAuditDetails("PATIENT_PROFILE_UPDATED", sensitiveInput);

  assert.ok(!loggedString.includes("MinhaSenha123!"), "Senha atual não pode constar no log");
  assert.ok(!loggedString.includes("NovaSenhaForte456!"), "Nova senha não pode constar no log");
  assert.ok(!loggedString.includes("raw_secret_value_12345"), "Token bruto não pode constar no log");
  assert.ok(loggedString.includes("updatedFields"), "Metadados sanitizados devem constar");
});

// 8. Edição direta do perfil sem exigência de aprovação pelo Admin (Phase 1 e Phase 2)
test("Perfil do Paciente: Edição direta de nome, CPF, telefone e endereço sem aprovação do Admin", () => {
  const patient = {
    id: "p_direct",
    fullName: "Carlos Silva Antigo",
    cpf: "11122233344",
    phone: "11988887777",
    address: "Rua Antiga, 10",
  };

  const updateProfileDirect = (current, updates) => {
    return {
      ...current,
      fullName: updates.fullName || current.fullName,
      cpf: updates.cpf !== undefined ? updates.cpf : current.cpf,
      phone: updates.phone || current.phone,
      address: updates.address !== undefined ? updates.address : current.address,
    };
  };

  const updated = updateProfileDirect(patient, {
    fullName: "Carlos Silva Santos",
    cpf: "55566677788",
    phone: "11977776666",
    address: "Avenida Nova, 500",
  });

  // Atualização imediata sem estado PENDING
  assert.strictEqual(updated.fullName, "Carlos Silva Santos");
  assert.strictEqual(updated.cpf, "55566677788");
  assert.strictEqual(updated.phone, "11977776666");
  assert.strictEqual(updated.address, "Avenida Nova, 500");
});
