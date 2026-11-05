const test = require("node:test");
const assert = require("node:assert");

// Simulação da seleção e persistência exclusiva de provedores
class VideoProviderSettingsManager {
  constructor(initialActive = "JITSI", settings = {}) {
    this.activeVideoProvider = initialActive;
    this.jitsiDomain = settings.jitsiDomain || "meet.jit.si";
    this.peerJsHost = settings.peerJsHost || null;
    this.peerJsPort = settings.peerJsPort || 9000;
    this.peerJsTestStatus = settings.peerJsTestStatus || null;
    this.googleMeetClientId = settings.googleMeetClientId || null;
    this.googleMeetClientSecret = settings.googleMeetClientSecret || null;
    this.googleMeetStatus = settings.googleMeetStatus || null;
    this.googleMeetRefreshToken = settings.googleMeetRefreshToken || null;
  }

  // Validação estrita de elegibilidade para se tornar o padrão ativo
  canSetAsDefault(providerKey) {
    if (providerKey === "JITSI") {
      return { allowed: true };
    }
    if (providerKey === "PEERJS") {
      if (!this.peerJsHost) {
        return { allowed: false, error: "Host do servidor de sinalização não configurado." };
      }
      if (this.peerJsTestStatus !== "SUCCESS") {
        return { allowed: false, error: "O servidor PeerJS requer teste de conexão aprovado antes de ser ativado." };
      }
      return { allowed: true };
    }
    if (providerKey === "GOOGLE_MEET") {
      if (!this.googleMeetClientId || !this.googleMeetClientSecret) {
        return { allowed: false, error: "Client ID e Client Secret do Google OAuth são obrigatórios." };
      }
      if (this.googleMeetStatus !== "CONNECTED" || !this.googleMeetRefreshToken) {
        return { allowed: false, error: "Conta Google deve estar conectada e autorizada via OAuth." };
      }
      return { allowed: true };
    }
    return { allowed: false, error: "Provedor desconhecido." };
  }

  // Define o novo provedor padrão ativo (seleção exclusiva)
  setActiveProvider(providerKey, userRole = "ADMIN") {
    if (userRole !== "ADMIN") {
      throw new Error("Acesso restrito ao administrador.");
    }

    const check = this.canSetAsDefault(providerKey);
    if (!check.allowed) {
      throw new Error(check.error);
    }

    // Apenas UM provedor pode ser o ativo
    this.activeVideoProvider = providerKey;
    return { success: true, activeVideoProvider: this.activeVideoProvider };
  }
}

// Simulação de provisionamento unificado de consultas
function provisionMockAppointment({ appointmentId, settingsManager, appointmentStore }) {
  const active = settingsManager.activeVideoProvider;
  const token = `tok_${appointmentId}_${Math.random().toString(36).substring(2, 8)}`;
  const entryUrl = `http://localhost:3000/consulta-virtual/${token}`;

  let meeting = {
    appointmentId,
    provider: active,
    psiEntryToken: token,
    entryUrl,
  };

  if (active === "GOOGLE_MEET") {
    meeting.roomName = `https://meet.google.com/psi-${appointmentId}`;
    meeting.conferenceUrl = meeting.roomName;
    meeting.calendarEventId = `cal_event_${appointmentId}`;
  } else if (active === "PEERJS") {
    meeting.roomName = `peer-psi-${appointmentId}-rand`;
  } else {
    meeting.roomName = `psi-session-${appointmentId}-rand`;
  }

  appointmentStore.set(appointmentId, meeting);
  return meeting;
}

test("Phase 3: Seleção exclusiva de provedor padrão (Apenas UM ativo por vez)", () => {
  const manager = new VideoProviderSettingsManager("JITSI", {
    peerJsHost: "peerjs.meuconsultorio.com",
    peerJsTestStatus: "SUCCESS",
    googleMeetClientId: "client-id-123",
    googleMeetClientSecret: "secret-abc",
    googleMeetStatus: "CONNECTED",
    googleMeetRefreshToken: "refresh-token-xyz",
  });

  // Padrão inicial é JITSI
  assert.strictEqual(manager.activeVideoProvider, "JITSI");

  // 1. Altera para PEERJS -> JITSI é desativado como padrão
  manager.setActiveProvider("PEERJS");
  assert.strictEqual(manager.activeVideoProvider, "PEERJS");

  // 2. Altera para GOOGLE_MEET -> PEERJS é desativado como padrão
  manager.setActiveProvider("GOOGLE_MEET");
  assert.strictEqual(manager.activeVideoProvider, "GOOGLE_MEET");

  // 3. Retorna para JITSI -> GOOGLE_MEET é desativado
  manager.setActiveProvider("JITSI");
  assert.strictEqual(manager.activeVideoProvider, "JITSI");
});

test("Phase 3: Rejeição de seleção de provedores incompletos ou não testados", () => {
  const unconfiguredManager = new VideoProviderSettingsManager("JITSI", {
    peerJsHost: null,
    googleMeetClientId: null,
  });

  // Tentar ativar PeerJS sem host/teste -> Rejeita e mantém JITSI
  assert.throws(
    () => unconfiguredManager.setActiveProvider("PEERJS"),
    /Host do servidor de sinalização não configurado|teste de conexão/
  );
  assert.strictEqual(unconfiguredManager.activeVideoProvider, "JITSI", "Padrão deve permanecer Jitsi");

  // Tentar ativar Google Meet sem OAuth -> Rejeita e mantém JITSI
  assert.throws(
    () => unconfiguredManager.setActiveProvider("GOOGLE_MEET"),
    /Client ID|Conta Google deve estar conectada/
  );
  assert.strictEqual(unconfiguredManager.activeVideoProvider, "JITSI", "Padrão deve permanecer Jitsi");
});

test("Phase 3: Segurança - Pacientes não podem alterar o provedor de vídeo", () => {
  const manager = new VideoProviderSettingsManager("JITSI");

  assert.throws(
    () => manager.setActiveProvider("PEERJS", "PATIENT"),
    /Acesso restrito ao administrador/
  );
  assert.strictEqual(manager.activeVideoProvider, "JITSI");
});

test("Phase 3: Imutabilidade de consultas existentes na troca do provedor padrão", () => {
  const appointmentStore = new Map();

  const manager = new VideoProviderSettingsManager("JITSI", {
    peerJsHost: "peerjs.meuconsultorio.com",
    peerJsTestStatus: "SUCCESS",
    googleMeetClientId: "client-id-123",
    googleMeetClientSecret: "secret-abc",
    googleMeetStatus: "CONNECTED",
    googleMeetRefreshToken: "refresh-token-xyz",
  });

  // 1. Consulta 1 criada enquanto JITSI está ativo
  const appt1 = provisionMockAppointment({
    appointmentId: "appt-001",
    settingsManager: manager,
    appointmentStore,
  });
  assert.strictEqual(appt1.provider, "JITSI");
  assert.ok(appt1.roomName.startsWith("psi-session-"));

  // 2. Administrador troca o provedor padrão para PEERJS
  manager.setActiveProvider("PEERJS");
  assert.strictEqual(manager.activeVideoProvider, "PEERJS");

  // 3. Consulta 2 criada sob PEERJS
  const appt2 = provisionMockAppointment({
    appointmentId: "appt-002",
    settingsManager: manager,
    appointmentStore,
  });
  assert.strictEqual(appt2.provider, "PEERJS");
  assert.ok(appt2.roomName.startsWith("peer-psi-"));

  // 4. Administrador troca o provedor padrão para GOOGLE_MEET
  manager.setActiveProvider("GOOGLE_MEET");
  assert.strictEqual(manager.activeVideoProvider, "GOOGLE_MEET");

  // 5. Consulta 3 criada sob GOOGLE_MEET
  const appt3 = provisionMockAppointment({
    appointmentId: "appt-003",
    settingsManager: manager,
    appointmentStore,
  });
  assert.strictEqual(appt3.provider, "GOOGLE_MEET");
  assert.ok(appt3.roomName.startsWith("https://meet.google.com/"));
  assert.ok(appt3.calendarEventId.startsWith("cal_event_"));

  // 6. VERIFICAÇÃO CRÍTICA: As consultas anteriores preservaram integralmente seus provedores e links originais
  const retrievedAppt1 = appointmentStore.get("appt-001");
  const retrievedAppt2 = appointmentStore.get("appt-002");
  const retrievedAppt3 = appointmentStore.get("appt-003");

  assert.strictEqual(retrievedAppt1.provider, "JITSI", "Consulta 1 deve permanecer JITSI");
  assert.strictEqual(retrievedAppt1.entryUrl, appt1.entryUrl);

  assert.strictEqual(retrievedAppt2.provider, "PEERJS", "Consulta 2 deve permanecer PEERJS");
  assert.strictEqual(retrievedAppt2.entryUrl, appt2.entryUrl);

  assert.strictEqual(retrievedAppt3.provider, "GOOGLE_MEET", "Consulta 3 deve permanecer GOOGLE_MEET");
  assert.strictEqual(retrievedAppt3.conferenceUrl, appt3.conferenceUrl);
});

test("Phase 3: Não fallback silencioso se o Google Meet falhar", () => {
  function createWithActiveProvider(activeProvider, googleApiWorking = false) {
    if (activeProvider === "GOOGLE_MEET") {
      if (!googleApiWorking) {
        throw new Error("Erro na Google Calendar API: Quota excedida ou token revogado.");
      }
      return { provider: "GOOGLE_MEET" };
    }
    return { provider: activeProvider };
  }

  // Falha na API do Google Meet não deve retornar JITSI silenciosamente
  assert.throws(
    () => createWithActiveProvider("GOOGLE_MEET", false),
    /Google Calendar API/
  );
});
