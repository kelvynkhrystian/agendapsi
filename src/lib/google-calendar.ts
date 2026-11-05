import { prisma } from "@/lib/prisma";

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface GoogleMeetConferenceResult {
  calendarEventId: string;
  meetUrl: string;
  rawEvent?: any;
}

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";
const GOOGLE_CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

/**
 * Monta a URL de autorização OAuth 2.0 do Google
 */
export function getGoogleOAuthUrl({
  clientId,
  redirectUri,
  state,
}: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
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
    prompt: "consent", // Garante emissão do refresh_token em novas conexões
    state,
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

/**
 * Troca o código de autorização temporário pelos tokens de acesso e refresh
 */
export async function exchangeGoogleCode({
  code,
  clientId,
  clientSecret,
  redirectUri,
}: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  email: string;
  name?: string;
}> {
  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    const errorBody = await tokenRes.text();
    let errorDesc = "Falha ao autenticar com o Google.";
    try {
      const errJson = JSON.parse(errorBody);
      errorDesc = errJson.error_description || errJson.error || errorDesc;
    } catch {
      // Ignora erro de parse
    }
    throw new Error(`Erro na troca de código OAuth do Google: ${errorDesc}`);
  }

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;
  const refreshToken = tokenData.refresh_token;
  const expiresIn = tokenData.expires_in || 3600;

  // Busca dados de perfil da conta Google conectada
  const userRes = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  let email = "conta-google@desconhecida";
  let name = "";
  if (userRes.ok) {
    const userData = await userRes.json();
    email = userData.email || email;
    name = userData.name || "";
  }

  return {
    accessToken,
    refreshToken,
    expiresIn,
    email,
    name,
  };
}

/**
 * Obtém um Access Token válido, efetuando o refresh automático se expirado
 */
export async function getValidGoogleAccessToken(): Promise<string> {
  const settings = await prisma.systemSettings.findFirst();

  if (!settings) {
    throw new Error("Configurações do sistema não encontradas.");
  }

  const clientId = settings.googleMeetClientId;
  const clientSecret = settings.googleMeetClientSecret;
  const refreshToken = settings.googleMeetRefreshToken;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "A integração do Google Meet não está configurada ou conectada. Acesse Configurações > Consultas Virtuais para conectar sua conta Google."
    );
  }

  const now = new Date();
  const expiresAt = settings.googleMeetTokenExpiresAt;
  const accessToken = settings.googleMeetAccessToken;

  // Se o access token existir e ainda tiver pelo menos 3 minutos de validade, reutiliza-o
  if (accessToken && expiresAt && expiresAt.getTime() - now.getTime() > 180000) {
    return accessToken;
  }

  // Renova o token via refresh_token
  const refreshRes = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!refreshRes.ok) {
    const errText = await refreshRes.text();
    // Se a permissão foi revogada ou refresh_token inválido
    await prisma.systemSettings.update({
      where: { id: "default" },
      data: {
        googleMeetStatus: "REVOKED",
      },
    });

    throw new Error(
      `A permissão da sua conta Google foi revogada ou expirou (${errText}). Por favor, reconecte sua conta em Configurações > Consultas Virtuais.`
    );
  }

  const refreshData = await refreshRes.json();
  const newAccessToken = refreshData.access_token;
  const expiresIn = refreshData.expires_in || 3600;
  const newExpiresAt = new Date(Date.now() + expiresIn * 1000);

  // Persiste o novo token em SystemSettings
  await prisma.systemSettings.update({
    where: { id: "default" },
    data: {
      googleMeetAccessToken: newAccessToken,
      googleMeetTokenExpiresAt: newExpiresAt,
      googleMeetStatus: "CONNECTED",
    },
  });

  return newAccessToken;
}

/**
 * Cria um evento no Google Calendar contendo um link oficial do Google Meet
 * Utiliza requestId idempotente para prevenir duplicidade de reuniões em retentativas.
 */
export async function createGoogleMeetConference({
  appointmentId,
  summary,
  description,
  startAt,
  endAt,
  timeZone = "UTC",
}: {
  appointmentId: string;
  summary: string;
  description?: string;
  startAt: Date;
  endAt: Date;
  timeZone?: string;
}): Promise<GoogleMeetConferenceResult> {
  const accessToken = await getValidGoogleAccessToken();

  // Idempotência estrita: o mesmo appointmentId sempre gera o mesmo requestId
  const requestId = `psi-meet-${appointmentId}`;

  const payload = {
    summary,
    description: description || "Consulta virtual via PSI Consultórios",
    start: {
      dateTime: startAt.toISOString(),
      timeZone,
    },
    end: {
      dateTime: endAt.toISOString(),
      timeZone,
    },
    conferenceData: {
      createRequest: {
        requestId,
        conferenceSolutionKey: {
          type: "hangoutsMeet",
        },
      },
    },
  };

  const url = `${GOOGLE_CALENDAR_API_BASE}?conferenceDataVersion=1`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("[Google Meet API Error]", res.status, errorText);
    throw new Error(
      `Falha ao criar sala do Google Meet no Google Agenda (Status ${res.status}): ${errorText}`
    );
  }

  const event = await res.json();
  const calendarEventId = event.id;

  // Extrai o link do Google Meet
  let meetUrl = event.hangoutLink;
  if (!meetUrl && event.conferenceData?.entryPoints) {
    const videoEp = event.conferenceData.entryPoints.find(
      (ep: any) => ep.entryPointType === "video"
    );
    if (videoEp?.uri) {
      meetUrl = videoEp.uri;
    }
  }

  if (!meetUrl) {
    throw new Error(
      "O Google Calendar criou o evento, mas não retornou um link de videoconferência do Google Meet válido."
    );
  }

  return {
    calendarEventId,
    meetUrl,
    rawEvent: event,
  };
}

/**
 * Atualiza horário e detalhes de evento no Google Calendar (Reagendamento)
 */
export async function updateGoogleMeetConference({
  calendarEventId,
  startAt,
  endAt,
  summary,
  description,
  timeZone = "UTC",
}: {
  calendarEventId: string;
  startAt: Date;
  endAt: Date;
  summary?: string;
  description?: string;
  timeZone?: string;
}): Promise<void> {
  const accessToken = await getValidGoogleAccessToken();

  const payload: Record<string, any> = {
    start: {
      dateTime: startAt.toISOString(),
      timeZone,
    },
    end: {
      dateTime: endAt.toISOString(),
      timeZone,
    },
  };

  if (summary) payload.summary = summary;
  if (description) payload.description = description;

  const url = `${GOOGLE_CALENDAR_API_BASE}/${calendarEventId}?conferenceDataVersion=1`;

  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.warn(`[Google Calendar] Falha ao atualizar evento ${calendarEventId}:`, errText);
  }
}

/**
 * Remove evento da agenda ao cancelar consulta
 */
export async function deleteGoogleMeetConference(calendarEventId: string): Promise<void> {
  try {
    const accessToken = await getValidGoogleAccessToken();
    const url = `${GOOGLE_CALENDAR_API_BASE}/${calendarEventId}`;

    const res = await fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    // 204 No Content ou 404/410 Not Found são considerados remoção com sucesso
    if (res.ok || res.status === 404 || res.status === 410) {
      return;
    }

    const err = await res.text();
    console.warn(`[Google Calendar] Resposta ao deletar evento ${calendarEventId}:`, err);
  } catch (e) {
    console.warn(`[Google Calendar] Erro ao deletar evento ${calendarEventId}:`, e);
  }
}

/**
 * Testa a integração criando e em seguida deletando um evento com Google Meet
 */
export async function testGoogleMeetIntegration(): Promise<{
  success: boolean;
  meetUrl: string;
  accountEmail: string;
}> {
  const settings = await prisma.systemSettings.findFirst();
  if (!settings?.googleMeetRefreshToken) {
    throw new Error("Nenhuma conta Google conectada para realizar o teste.");
  }

  const testId = `test-${Date.now()}`;
  const now = new Date();
  const testEnd = new Date(now.getTime() + 30 * 60000);

  // 1. Cria evento de teste
  const result = await createGoogleMeetConference({
    appointmentId: testId,
    summary: "[PSI Teste] Verificação de Conexão Google Meet",
    description: "Evento temporário gerado para validar a emissão de links do Google Meet.",
    startAt: now,
    endAt: testEnd,
  });

  // 2. Remove o evento de teste imediatamente
  if (result.calendarEventId) {
    await deleteGoogleMeetConference(result.calendarEventId);
  }

  return {
    success: true,
    meetUrl: result.meetUrl,
    accountEmail: settings.googleMeetAccountEmail || "Conta Google Conectada",
  };
}
