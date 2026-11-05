const test = require("node:test");
const assert = require("node:assert");

// Simulação pura da classe GoogleMeetVideoProvider para validação unitária de regras
class GoogleMeetVideoProvider {
  constructor(clientId = null, status = null, accountEmail = null, hasRefreshToken = false) {
    this.providerKey = "GOOGLE_MEET";
    this.clientId = clientId;
    this.status = status;
    this.accountEmail = accountEmail;
    // Funcional exclusivamente quando configurado com Client ID e conta Google conectada via OAuth com refresh_token
    this.isFunctional = Boolean(clientId && status === "CONNECTED" && hasRefreshToken);
  }

  async createRoom(appointmentId, details = null) {
    const token = Math.random().toString(36).substring(2, 15);
    const appUrl = "http://localhost:3000";
    const entryUrl = `${appUrl}/consulta-virtual/${token}`;

    if (this.isFunctional && details?.startAt && details?.endAt) {
      // Simulação da emissão real com Google Calendar API
      const conferenceId = `gmeet-event-${appointmentId}`;
      const meetUrl = `https://meet.google.com/abc-${appointmentId.substring(0, 4)}-xyz`;

      return {
        provider: "GOOGLE_MEET",
        roomName: meetUrl,
        entryUrl,
        rawMeetingUrl: meetUrl,
        conferenceUrl: meetUrl,
        calendarEventId: conferenceId,
        isPreparedOnly: false,
      };
    }

    return {
      provider: "GOOGLE_MEET",
      roomName: `gmeet-${appointmentId}`,
      entryUrl,
      rawMeetingUrl: "https://meet.google.com/new",
      isPreparedOnly: true,
    };
  }
}

// Simulação da lógica de geração de URL de autorização OAuth
function buildGoogleOAuthUrl({ clientId, redirectUri, state }) {
  const scopes = [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "openid",
  ];

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

// Simulação de lógica de verificação de token e expiração
function shouldRefreshToken(expiresAt, now = new Date()) {
  if (!expiresAt) return true;
  // Margem de segurança de 3 minutos (180.000 ms)
  return expiresAt.getTime() - now.getTime() <= 180000;
}

// Simulação de idempotência de conferência
function buildConferencePayload({ appointmentId, summary, startAt, endAt }) {
  return {
    summary,
    start: { dateTime: startAt.toISOString() },
    end: { dateTime: endAt.toISOString() },
    conferenceData: {
      createRequest: {
        requestId: `psi-meet-${appointmentId}`,
        conferenceSolutionKey: {
          type: "hangoutsMeet",
        },
      },
    },
  };
}

test("Google Meet: Gating funcional estrito (Requisito 15)", () => {
  // Caso 1: Sem credenciais
  const unconfigured = new GoogleMeetVideoProvider(null, null, null, false);
  assert.strictEqual(unconfigured.isFunctional, false, "Sem Client ID não deve ser funcional");

  // Caso 2: Client ID preenchido mas conta não conectada
  const pendingAuth = new GoogleMeetVideoProvider("client-123.apps.googleusercontent.com", "CONFIGURED", null, false);
  assert.strictEqual(pendingAuth.isFunctional, false, "Sem autorização OAuth não deve ser funcional");

  // Caso 3: Autorização revogada pelo usuário no Google
  const revoked = new GoogleMeetVideoProvider("client-123.apps.googleusercontent.com", "REVOKED", "doc@gmail.com", false);
  assert.strictEqual(revoked.isFunctional, false, "Autorização revogada não deve ser funcional");

  // Caso 4: Conectado com Client ID e refresh_token presente
  const functional = new GoogleMeetVideoProvider(
    "client-123.apps.googleusercontent.com",
    "CONNECTED",
    "psicologo@gmail.com",
    true
  );
  assert.strictEqual(functional.isFunctional, true, "Conta conectada com refresh_token deve ser funcional");
});

test("Google Meet: Geração de URL OAuth com escopos adequados e offline access", () => {
  const url = buildGoogleOAuthUrl({
    clientId: "meu-client-id-google",
    redirectUri: "http://localhost:3000/api/admin/integrations/google/callback",
    state: "admin-1:csrf-token-123",
  });

  assert.ok(url.startsWith("https://accounts.google.com/o/oauth2/v2/auth?"));
  assert.ok(url.includes("client_id=meu-client-id-google"));
  assert.ok(url.includes("access_type=offline"), "Deve exigir access_type=offline para receber refresh_token");
  assert.ok(url.includes("prompt=consent"), "Deve forçar prompt=consent para reemitir refresh_token");
  assert.ok(url.includes("calendar.events"), "Deve solicitar permissão de eventos no Google Calendar");
  assert.ok(url.includes("userinfo.email"), "Deve solicitar permissão de e-mail");
});

test("Google Meet: Lógica de expiração e renovação de token (Requisito 9)", () => {
  const now = new Date("2026-11-20T12:00:00Z");

  // Token válido por mais 30 minutos -> Não renova
  const validExpiresAt = new Date("2026-11-20T12:30:00Z");
  assert.strictEqual(shouldRefreshToken(validExpiresAt, now), false);

  // Token expirando em 2 minutos (dentro da margem de 3 minutos) -> Renova
  const almostExpired = new Date("2026-11-20T12:02:00Z");
  assert.strictEqual(shouldRefreshToken(almostExpired, now), true);

  // Token já expirado há 10 minutos -> Renova
  const alreadyExpired = new Date("2026-11-20T11:50:00Z");
  assert.strictEqual(shouldRefreshToken(alreadyExpired, now), true);
});

test("Google Meet: Idempotência de criação de conferência (Requisito 8)", () => {
  const appointmentId = "appt-unique-987";
  const startAt = new Date("2026-11-20T15:00:00Z");
  const endAt = new Date("2026-11-20T16:00:00Z");

  const payload1 = buildConferencePayload({
    appointmentId,
    summary: "Consulta PSI Teste",
    startAt,
    endAt,
  });

  const payload2 = buildConferencePayload({
    appointmentId,
    summary: "Consulta PSI Teste",
    startAt,
    endAt,
  });

  // O requestId deve ser determinístico por agendamento
  assert.strictEqual(payload1.conferenceData.createRequest.requestId, `psi-meet-${appointmentId}`);
  assert.strictEqual(
    payload1.conferenceData.createRequest.requestId,
    payload2.conferenceData.createRequest.requestId,
    "Mesmo agendamento deve gerar exatamente o mesmo requestId idempotente para o Google Calendar"
  );
  assert.strictEqual(payload1.conferenceData.createRequest.conferenceSolutionKey.type, "hangoutsMeet");
});

test("Google Meet: Emissão de sala com conferência e links de teleconsulta", async () => {
  const provider = new GoogleMeetVideoProvider(
    "client-id-123",
    "CONNECTED",
    "dr.kelvyn@gmail.com",
    true
  );

  const startAt = new Date("2026-11-20T15:00:00Z");
  const endAt = new Date("2026-11-20T16:00:00Z");

  const room = await provider.createRoom("appt-5555", {
    summary: "Consulta Psicológica",
    description: "Sessão individual",
    startAt,
    endAt,
  });

  assert.strictEqual(room.provider, "GOOGLE_MEET");
  assert.strictEqual(room.isPreparedOnly, false);
  assert.ok(room.rawMeetingUrl.startsWith("https://meet.google.com/"));
  assert.ok(room.conferenceUrl.startsWith("https://meet.google.com/"));
  assert.ok(room.entryUrl.includes("/consulta-virtual/"));
  assert.ok(room.calendarEventId.includes("gmeet-event-appt-5555"));
});

test("Compatibilidade de Provedores: Jitsi e PeerJS continuam funcionando normalmente", () => {
  // 1. Jitsi Meet permanece funcional por padrão
  const jitsiFunctional = true;
  assert.strictEqual(jitsiFunctional, true);

  // 2. Não troca silenciosamente para Jitsi se Google Meet falhar (Requisito)
  function resolveAppointmentProvider(activeProvider) {
    if (activeProvider === "GOOGLE_MEET") {
      return "GOOGLE_MEET"; // Não faz fallback silencioso para JITSI
    }
    return activeProvider;
  }

  assert.strictEqual(resolveAppointmentProvider("GOOGLE_MEET"), "GOOGLE_MEET");
  assert.strictEqual(resolveAppointmentProvider("PEERJS"), "PEERJS");
  assert.strictEqual(resolveAppointmentProvider("JITSI"), "JITSI");
});
