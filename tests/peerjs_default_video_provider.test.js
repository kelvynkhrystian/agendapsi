const test = require("node:test");
const assert = require("node:assert");

// Simulação da arquitetura de Provedores de Vídeo com PeerJS como Padrão Oficial
class SystemSettingsVideoManager {
  constructor(initialActive = "PEERJS", settings = {}) {
    this.activeVideoProvider = initialActive;
    this.jitsiDomain = settings.jitsiDomain || "meet.jit.si";
    this.peerJsHost = settings.peerJsHost || null;
    this.peerJsPort = settings.peerJsPort || null;
    this.peerJsPath = settings.peerJsPath || null;
    this.peerJsSecure = settings.peerJsSecure ?? null;
    this.peerJsTestStatus = settings.peerJsTestStatus || null;
    this.googleMeetClientId = settings.googleMeetClientId || null;
    this.googleMeetClientSecret = settings.googleMeetClientSecret || null;
    this.googleMeetStatus = settings.googleMeetStatus || null;
    this.googleMeetRefreshToken = settings.googleMeetRefreshToken || null;
  }

  // Lista os provedores na ordem estrita solicitada: PEERJS, JITSI, GOOGLE_MEET
  listProviders() {
    return [
      {
        key: "PEERJS",
        name: "PSI Teleconsulta",
        description: "Videochamadas integradas diretamente ao PSI.",
        isDefaultPSI: true,
        isActive: this.activeVideoProvider === "PEERJS",
        isFunctional: this.peerJsTestStatus !== "FAILED",
        config: {
          host: this.peerJsHost || "0.peerjs.com",
          port: this.peerJsPort || 443,
          path: this.peerJsPath || "/",
          secure: this.peerJsSecure ?? true,
        },
      },
      {
        key: "JITSI",
        name: "Jitsi Meet",
        description: "Salas de teleconsulta abertas ou em servidor dedicado Jitsi Meet.",
        isDefaultPSI: false,
        isActive: this.activeVideoProvider === "JITSI",
        isFunctional: true,
        config: {
          domain: this.jitsiDomain,
        },
      },
      {
        key: "GOOGLE_MEET",
        name: "Google Meet",
        description: "Geração automática de reuniões corporativas via Google Calendar.",
        isDefaultPSI: false,
        isActive: this.activeVideoProvider === "GOOGLE_MEET",
        isFunctional: this.googleMeetStatus === "CONNECTED" && Boolean(this.googleMeetRefreshToken),
        config: {
          clientId: this.googleMeetClientId,
          hasClientSecret: Boolean(this.googleMeetClientSecret),
        },
      },
    ];
  }

  // Validação de elegibilidade para se tornar o padrão ativo
  canSetAsDefault(providerKey) {
    if (providerKey === "PEERJS") {
      // PeerJS tem provisionamento automático de sinalização e é funcional imediatamente sem setup manual
      if (this.peerJsTestStatus === "FAILED") {
        return { allowed: false, error: "Servidor de sinalização PeerJS indisponível no teste recente." };
      }
      return { allowed: true };
    }
    if (providerKey === "JITSI") {
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

  setActiveProvider(providerKey, userRole = "ADMIN") {
    if (userRole !== "ADMIN") {
      throw new Error("Acesso restrito ao administrador.");
    }

    const check = this.canSetAsDefault(providerKey);
    if (!check.allowed) {
      throw new Error(check.error);
    }

    this.activeVideoProvider = providerKey;
    return { success: true, activeVideoProvider: this.activeVideoProvider };
  }
}

// Lógica de resolução de consulta para sala virtual ou atendimento presencial
function resolveVirtualMeetingDetails(appointment, clinicAddress = "Av. Paulista, 1000 - Sala 42") {
  const isPresential =
    appointment.modality === "PRESENTIAL" ||
    (typeof appointment.serviceName === "string" && appointment.serviceName.toLowerCase().includes("presencial"));

  if (isPresential) {
    return {
      status: "PRESENTIAL_SESSION",
      isPresential: true,
      clinicAddress: clinicAddress,
      roomUrl: null,
      peerRoomToken: null,
      instructions: "Esta é uma sessão presencial no consultório. Apresente-se na recepção com 10 minutos de antecedência.",
    };
  }

  return {
    status: "VIRTUAL_SESSION_READY",
    isPresential: false,
    clinicAddress: null,
    provider: appointment.provider || "PEERJS",
    peerRoomToken: appointment.peerRoomToken || "room-psi-test-token",
    instructions: "Sua teleconsulta está pronta. Entre no horário agendado.",
  };
}

test("Ordem dos provedores: PEERJS (1º), JITSI (2º), GOOGLE_MEET (3º)", () => {
  const manager = new SystemSettingsVideoManager();
  const providers = manager.listProviders();

  assert.strictEqual(providers.length, 3);
  assert.strictEqual(providers[0].key, "PEERJS");
  assert.strictEqual(providers[0].name, "PSI Teleconsulta");
  assert.strictEqual(providers[0].isDefaultPSI, true);

  assert.strictEqual(providers[1].key, "JITSI");
  assert.strictEqual(providers[1].name, "Jitsi Meet");

  assert.strictEqual(providers[2].key, "GOOGLE_MEET");
  assert.strictEqual(providers[2].name, "Google Meet");
});

test("PeerJS é o provedor ativo por padrão sem necessidade de configuração técnica manual", () => {
  const manager = new SystemSettingsVideoManager("PEERJS");
  const providers = manager.listProviders();

  assert.strictEqual(manager.activeVideoProvider, "PEERJS");
  assert.strictEqual(providers[0].isActive, true);
  assert.strictEqual(providers[0].isFunctional, true);
  // Garante fallback de sinalização transparente
  assert.strictEqual(providers[0].config.host, "0.peerjs.com");
  assert.strictEqual(providers[0].config.port, 443);
  assert.strictEqual(providers[0].config.secure, true);
});

test("Apenas UM provedor pode ser o padrão ativo por vez", () => {
  const manager = new SystemSettingsVideoManager("PEERJS");

  // Alterna para Jitsi
  manager.setActiveProvider("JITSI", "ADMIN");
  assert.strictEqual(manager.activeVideoProvider, "JITSI");
  const provsJitsi = manager.listProviders();
  assert.strictEqual(provsJitsi[0].isActive, false);
  assert.strictEqual(provsJitsi[1].isActive, true);
  assert.strictEqual(provsJitsi[2].isActive, false);

  // Retorna para PEERJS
  manager.setActiveProvider("PEERJS", "ADMIN");
  assert.strictEqual(manager.activeVideoProvider, "PEERJS");
  const provsPeer = manager.listProviders();
  assert.strictEqual(provsPeer[0].isActive, true);
  assert.strictEqual(provsPeer[1].isActive, false);
});

test("Atendimento Presencial não expõe botão de vídeo nem sala WebRTC", () => {
  const presentialAppt = {
    id: "appt-1",
    modality: "PRESENTIAL",
    serviceName: "Psicoterapia Individual (Presencial)",
    provider: "PEERJS",
  };

  const result = resolveVirtualMeetingDetails(presentialAppt, "Rua das Flores, 123");
  assert.strictEqual(result.isPresential, true);
  assert.strictEqual(result.roomUrl, null);
  assert.strictEqual(result.peerRoomToken, null);
  assert.strictEqual(result.clinicAddress, "Rua das Flores, 123");
  assert.ok(result.instructions.includes("sessão presencial"));
});

test("Atendimento Online provisiona teleconsulta normalmente", () => {
  const onlineAppt = {
    id: "appt-2",
    modality: "ONLINE",
    serviceName: "Psicoterapia Individual (Online)",
    provider: "PEERJS",
    peerRoomToken: "psi-secure-token-123",
  };

  const result = resolveVirtualMeetingDetails(onlineAppt);
  assert.strictEqual(result.isPresential, false);
  assert.strictEqual(result.peerRoomToken, "psi-secure-token-123");
  assert.strictEqual(result.clinicAddress, null);
});
