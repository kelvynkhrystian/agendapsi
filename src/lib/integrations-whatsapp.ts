import crypto from "crypto";
import { formatPhoneDisplay, normalizeWhatsAppNumber } from "@/lib/phone-utils";
import { decryptSecret, sanitizeErrorMessage, validateProviderBaseUrl } from "@/lib/secrets";
import type { IntegrationHealthStatus } from "@/lib/integrations-health";

export type WhatsAppProviderType = "META_OFFICIAL" | "OPENWA";

export interface WhatsAppSettingsInput {
  whatsappEnabled?: boolean | null;
  whatsappProvider?: string | null;
  // Meta Official API
  whatsappMetaPhoneNumberId?: string | null;
  whatsappMetaWabaId?: string | null;
  whatsappMetaAccessToken?: string | null;
  whatsappMetaVerifyToken?: string | null;
  whatsappMetaAppSecret?: string | null;
  whatsappMetaTemplateName?: string | null;
  whatsappMetaTemplateLanguage?: string | null;
  // OpenWA
  openWaApiUrl?: string | null;
  openWaApiKey?: string | null;
  openWaSessionId?: string | null;
  openWaConnectedNumber?: string | null;
  // Saúde
  whatsappHealthStatus?: string | null;
}

export interface WhatsAppCapability {
  enabled: boolean;
  provider: WhatsAppProviderType;
  configured: boolean;
  canSendRealMessages: boolean;
  missingFields: string[];
  urlError: string | null;
  reason: string | null;
  // Meta
  metaPhoneNumberId: string | null;
  metaWabaId: string | null;
  metaAccessToken: string | null;
  metaVerifyToken: string | null;
  metaAppSecret: string | null;
  metaTemplateName: string | null;
  metaTemplateLanguage: string;
  // OpenWA
  openWaBaseUrl: string | null;
  openWaApiKey: string | null;
  openWaSessionId: string;
  openWaConnectedNumber: string | null;
}

const META_GRAPH_BASE_URL = (process.env.PSI_META_GRAPH_BASE_URL || "https://graph.facebook.com/v21.0").replace(
  /\/+$/,
  ""
);

export function resolveWhatsAppProvider(raw?: string | null): WhatsAppProviderType {
  const upper = (raw || "").trim().toUpperCase();
  if (upper === "OPENWA") return "OPENWA";
  return "META_OFFICIAL";
}

export function resolveOpenWaBaseUrl(
  customUrlRaw?: string | null
): { valid: true; url: string } | { valid: false; error: string } {
  const check = validateProviderBaseUrl(customUrlRaw || "", {
    allowHttpLocalhost: true,
    allowPrivateNetwork: process.env.PSI_ALLOW_PRIVATE_PROVIDER_URLS === "true",
  });
  if (!check.valid) {
    return { valid: false, error: check.error };
  }
  return { valid: true, url: check.normalized };
}

export function getWhatsAppCapability(sys?: WhatsAppSettingsInput | null): WhatsAppCapability {
  const enabled = Boolean(sys?.whatsappEnabled);
  const provider = resolveWhatsAppProvider(sys?.whatsappProvider);

  const metaPhoneNumberId = (sys?.whatsappMetaPhoneNumberId || "").trim() || null;
  const metaWabaId = (sys?.whatsappMetaWabaId || "").trim() || null;
  const metaAccessToken = decryptSecret(sys?.whatsappMetaAccessToken);
  const metaVerifyToken = (sys?.whatsappMetaVerifyToken || "").trim() || null;
  const metaAppSecret = decryptSecret(sys?.whatsappMetaAppSecret);
  const metaTemplateName = (sys?.whatsappMetaTemplateName || "").trim() || null;
  const metaTemplateLanguage = (sys?.whatsappMetaTemplateLanguage || "pt_BR").trim() || "pt_BR";

  const openWaSessionId = (sys?.openWaSessionId || "default").trim() || "default";
  const openWaApiKey = decryptSecret(sys?.openWaApiKey);
  const openWaConnectedNumber = (sys?.openWaConnectedNumber || "").trim() || null;

  let openWaBaseUrl: string | null = null;
  let urlError: string | null = null;
  if (sys?.openWaApiUrl?.trim()) {
    const checked = resolveOpenWaBaseUrl(sys.openWaApiUrl);
    if (checked.valid) {
      openWaBaseUrl = checked.url;
    } else {
      urlError = checked.error;
    }
  }

  const missingFields: string[] = [];
  if (provider === "META_OFFICIAL") {
    if (!metaPhoneNumberId) missingFields.push("Phone Number ID (Meta)");
    if (!metaAccessToken) missingFields.push("Access Token permanente (Meta)");
  } else {
    if (!openWaBaseUrl && !urlError) missingFields.push("URL do servidor OpenWA");
  }

  const configured =
    provider === "META_OFFICIAL"
      ? Boolean(metaPhoneNumberId && metaAccessToken)
      : Boolean(openWaBaseUrl && !urlError);

  const canSendRealMessages = enabled && configured;

  let reason: string | null = null;
  if (!enabled) {
    reason = "Canal WhatsApp desativado pelo administrador.";
  } else if (urlError && provider === "OPENWA") {
    reason = urlError;
  } else if (!configured) {
    reason =
      provider === "META_OFFICIAL"
        ? `Credenciais da Meta Cloud API incompletas: ${missingFields.join(", ")}.`
        : `Configuração do OpenWA incompleta: ${missingFields.join(", ")}.`;
  }

  return {
    enabled,
    provider,
    configured,
    canSendRealMessages,
    missingFields,
    urlError,
    reason,
    metaPhoneNumberId,
    metaWabaId,
    metaAccessToken,
    metaVerifyToken,
    metaAppSecret,
    metaTemplateName,
    metaTemplateLanguage,
    openWaBaseUrl,
    openWaApiKey,
    openWaSessionId,
    openWaConnectedNumber,
  };
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(timer);
  }
}

export function verifyMetaWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string | null | undefined
): boolean {
  if (!appSecret || !signatureHeader) return false;
  const expectedPrefix = "sha256=";
  if (!signatureHeader.startsWith(expectedPrefix)) return false;
  const providedHex = signatureHeader.slice(expectedPrefix.length).trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(providedHex)) return false;

  const computedHex = crypto.createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(providedHex, "hex");
  const b = Buffer.from(computedHex, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// ============================================================================
// META OFFICIAL CLOUD API
// ============================================================================

export async function verifyMetaWhatsAppConnection(cap: WhatsAppCapability): Promise<{
  ok: boolean;
  healthStatus: IntegrationHealthStatus;
  message: string;
  displayPhone?: string | null;
  verifiedName?: string | null;
  errorCode?: string;
  latencyMs: number;
}> {
  const startedAt = Date.now();
  if (!cap.metaPhoneNumberId || !cap.metaAccessToken) {
    return {
      ok: false,
      healthStatus: "NOT_CONFIGURED",
      message: "Informe e salve o Phone Number ID e o Access Token da Meta Cloud API.",
      latencyMs: Date.now() - startedAt,
    };
  }

  const endpoint = `${META_GRAPH_BASE_URL}/${encodeURIComponent(
    cap.metaPhoneNumberId
  )}?fields=id,display_phone_number,verified_name,quality_rating`;

  try {
    const res = await fetchWithTimeout(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${cap.metaAccessToken}`,
        Accept: "application/json",
      },
    });

    const json = (await res.json().catch(() => null)) as {
      id?: string;
      display_phone_number?: string;
      verified_name?: string;
      error?: { message?: string; code?: number; type?: string };
    } | null;

    if (res.status === 401 || res.status === 403 || json?.error?.code === 190) {
      return {
        ok: false,
        healthStatus: "INVALID_AUTH",
        message: "Access Token da Meta inválido, expirado ou sem permissão whatsapp_business_messaging.",
        errorCode: json?.error?.code ? `META_${json.error.code}` : `HTTP_${res.status}`,
        latencyMs: Date.now() - startedAt,
      };
    }

    if (!res.ok) {
      return {
        ok: false,
        healthStatus: res.status >= 500 ? "SERVICE_UNAVAILABLE" : "CONNECTION_FAILED",
        message: sanitizeErrorMessage(json?.error?.message || `Erro HTTP ${res.status}`, [
          cap.metaAccessToken,
          cap.metaAppSecret,
        ]),
        errorCode: json?.error?.code ? `META_${json.error.code}` : `HTTP_${res.status}`,
        latencyMs: Date.now() - startedAt,
      };
    }

    const displayPhone = json?.display_phone_number || null;
    const verifiedName = json?.verified_name || null;

    if (!json?.id) {
      return {
        ok: false,
        healthStatus: "PARTIAL_API_ONLY",
        message: "Graph API respondeu, mas os dados do número emissor não foram retornados.",
        latencyMs: Date.now() - startedAt,
      };
    }

    return {
      ok: true,
      healthStatus: "CONNECTED",
      displayPhone,
      verifiedName,
      message: `Meta Cloud API conectada${displayPhone ? ` (${displayPhone})` : ""}${
        verifiedName ? ` — ${verifiedName}` : ""
      }.`,
      latencyMs: Date.now() - startedAt,
    };
  } catch (err: unknown) {
    return {
      ok: false,
      healthStatus: "SERVICE_UNAVAILABLE",
      message: `Falha ao contatar Graph API da Meta: ${sanitizeErrorMessage(err, [cap.metaAccessToken])}`,
      errorCode: "META_NETWORK_ERROR",
      latencyMs: Date.now() - startedAt,
    };
  }
}

export async function sendMetaWhatsAppMessage(
  cap: WhatsAppCapability,
  payload: { to: string; message: string; useTemplateIfConfigured?: boolean }
): Promise<{
  ok: boolean;
  provider: "META_CLOUD_API";
  providerMessageId?: string | null;
  healthStatus: IntegrationHealthStatus;
  errorCode?: string;
  sanitizedErrorMessage?: string;
}> {
  if (!cap.metaPhoneNumberId || !cap.metaAccessToken) {
    return {
      ok: false,
      provider: "META_CLOUD_API",
      healthStatus: "NOT_CONFIGURED",
      errorCode: "META_NOT_CONFIGURED",
      sanitizedErrorMessage: "Credenciais da Meta Cloud API não configuradas.",
    };
  }

  const recipientDigits = normalizeWhatsAppNumber(payload.to);
  if (!recipientDigits || recipientDigits.length < 10) {
    return {
      ok: false,
      provider: "META_CLOUD_API",
      healthStatus: "CONNECTION_FAILED",
      errorCode: "INVALID_WHATSAPP_NUMBER",
      sanitizedErrorMessage: "Número de telefone WhatsApp inválido.",
    };
  }

  const endpoint = `${META_GRAPH_BASE_URL}/${encodeURIComponent(cap.metaPhoneNumberId)}/messages`;
  const useTemplate = Boolean(payload.useTemplateIfConfigured && cap.metaTemplateName);

  const requestBody: Record<string, unknown> = useTemplate
    ? {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipientDigits,
        type: "template",
        template: {
          name: cap.metaTemplateName,
          language: {
            code: cap.metaTemplateLanguage || "pt_BR",
          },
        },
      }
    : {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipientDigits,
        type: "text",
        text: {
          preview_url: false,
          body: payload.message,
        },
      };

  try {
    const res = await fetchWithTimeout(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cap.metaAccessToken}`,
        Accept: "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const json = (await res.json().catch(() => null)) as {
      messages?: Array<{ id?: string }>;
      error?: { message?: string; code?: number; error_subcode?: number };
    } | null;

    if (res.status === 401 || res.status === 403 || json?.error?.code === 190) {
      return {
        ok: false,
        provider: "META_CLOUD_API",
        healthStatus: "INVALID_AUTH",
        errorCode: json?.error?.code ? `META_${json.error.code}` : `HTTP_${res.status}`,
        sanitizedErrorMessage: "Access Token da Meta inválido ou expirado.",
      };
    }

    if (!res.ok) {
      return {
        ok: false,
        provider: "META_CLOUD_API",
        healthStatus: res.status >= 500 ? "SERVICE_UNAVAILABLE" : "CONNECTION_FAILED",
        errorCode: json?.error?.code ? `META_${json.error.code}` : `HTTP_${res.status}`,
        sanitizedErrorMessage: sanitizeErrorMessage(json?.error?.message || `HTTP ${res.status}`, [
          cap.metaAccessToken,
          cap.metaAppSecret,
        ]),
      };
    }

    const messageId = json?.messages?.[0]?.id || null;
    return {
      ok: true,
      provider: "META_CLOUD_API",
      providerMessageId: messageId,
      healthStatus: "CONNECTED",
    };
  } catch (err: unknown) {
    return {
      ok: false,
      provider: "META_CLOUD_API",
      healthStatus: "SERVICE_UNAVAILABLE",
      errorCode: "META_NETWORK_ERROR",
      sanitizedErrorMessage: sanitizeErrorMessage(err, [cap.metaAccessToken]),
    };
  }
}

// ============================================================================
// OPENWA (@open-wa/wa-automate)
// ============================================================================

function buildOpenWaHeaders(apiKey?: string | null, includeJson = false): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (includeJson) {
    headers["Content-Type"] = "application/json";
  }
  if (apiKey && apiKey.trim()) {
    const clean = apiKey.trim();
    headers["api_key"] = clean;
    headers["X-API-Key"] = clean;
    headers["Authorization"] = `Bearer ${clean}`;
  }
  return headers;
}

function normalizeQrDataUri(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/i.test(trimmed)) {
    return trimmed;
  }
  // Base64 PNG cru (começa geralmente com iVBORw0KGgo)
  if (/^[A-Za-z0-9+/]{80,}={0,2}$/.test(trimmed)) {
    return `data:image/png;base64,${trimmed}`;
  }
  return null;
}

function extractConnectedPhoneFromOpenWa(obj: Record<string, unknown> | null): string | null {
  if (!obj) return null;
  const me = typeof obj.me === "object" && obj.me !== null ? (obj.me as Record<string, unknown>) : null;
  const session =
    typeof obj.session === "object" && obj.session !== null ? (obj.session as Record<string, unknown>) : null;
  const raw =
    obj.connectedNumber ||
    obj.phoneNumber ||
    obj.phone ||
    obj.wid ||
    me?.user ||
    me?.id ||
    session?.phone ||
    session?.wid;

  if (typeof raw !== "string" || !raw.trim()) return null;
  const cleaned = raw.replace(/@c\.us$/i, "").replace(/@s\.whatsapp\.net$/i, "");
  return formatPhoneDisplay(cleaned) || cleaned;
}

export interface OpenWaInspectionResult {
  ok: boolean;
  healthStatus: IntegrationHealthStatus;
  sessionState: string;
  connectedNumber: string | null;
  qrCodeDataUri: string | null;
  message: string;
  errorCode?: string;
  latencyMs: number;
}

export async function inspectOpenWaConnection(cap: WhatsAppCapability): Promise<OpenWaInspectionResult> {
  const startedAt = Date.now();
  if (cap.urlError) {
    return {
      ok: false,
      healthStatus: "CONNECTION_FAILED",
      sessionState: "URL_INVALIDA",
      connectedNumber: null,
      qrCodeDataUri: null,
      message: cap.urlError,
      errorCode: "INVALID_URL",
      latencyMs: Date.now() - startedAt,
    };
  }

  if (!cap.openWaBaseUrl) {
    return {
      ok: false,
      healthStatus: "NOT_CONFIGURED",
      sessionState: "NAO_CONFIGURADO",
      connectedNumber: null,
      qrCodeDataUri: null,
      message: "Informe e salve a URL do servidor OpenWA antes de verificar a sessão.",
      latencyMs: Date.now() - startedAt,
    };
  }

  const base = cap.openWaBaseUrl.replace(/\/+$/, "");
  const encodedSession = encodeURIComponent(cap.openWaSessionId || "default");
  const candidates = [
    { url: `${base}/health`, method: "GET" as const },
    { url: `${base}/api/sessions/${encodedSession}/status`, method: "GET" as const },
    { url: `${base}/getConnectionState`, method: "POST" as const, body: JSON.stringify({ args: {} }) },
  ];

  let lastErr: unknown = null;

  for (const cand of candidates) {
    try {
      const res = await fetchWithTimeout(cand.url, {
        method: cand.method,
        headers: buildOpenWaHeaders(cap.openWaApiKey, cand.method === "POST"),
        body: "body" in cand ? cand.body : undefined,
      });

      if (res.status === 401 || res.status === 403) {
        return {
          ok: false,
          healthStatus: "INVALID_AUTH",
          sessionState: "AUTENTICACAO_INVALIDA",
          connectedNumber: null,
          qrCodeDataUri: null,
          message: "API Key do OpenWA recusada pelo servidor.",
          errorCode: `HTTP_${res.status}`,
          latencyMs: Date.now() - startedAt,
        };
      }

      if (res.status === 404 && cand !== candidates[candidates.length - 1]) {
        continue;
      }

      const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
      if (!res.ok) {
        return {
          ok: false,
          healthStatus: res.status >= 500 ? "SERVICE_UNAVAILABLE" : "CONNECTION_FAILED",
          sessionState: "INDISPONIVEL",
          connectedNumber: null,
          qrCodeDataUri: null,
          message: `Servidor OpenWA respondeu HTTP ${res.status}: ${sanitizeErrorMessage(
            json?.error || json?.message || `HTTP ${res.status}`,
            [cap.openWaApiKey]
          )}`,
          errorCode: `HTTP_${res.status}`,
          latencyMs: Date.now() - startedAt,
        };
      }

      const dataObj =
        json && typeof json.response === "object" && json.response !== null
          ? (json.response as Record<string, unknown>)
          : json && typeof json.data === "object" && json.data !== null
          ? (json.data as Record<string, unknown>)
          : json;

      const sessionObj =
        dataObj && typeof dataObj.session === "object" && dataObj.session !== null
          ? (dataObj.session as Record<string, unknown>)
          : null;

      const rawState = String(
        dataObj?.state ||
          dataObj?.status ||
          sessionObj?.state ||
          sessionObj?.status ||
          (typeof json?.response === "string" ? json.response : "") ||
          ""
      )
        .trim()
        .toUpperCase();

      const connectedBool =
        dataObj?.connected === true ||
        sessionObj?.ready === true ||
        sessionObj?.connected === true ||
        rawState === "CONNECTED" ||
        rawState === "OPEN" ||
        rawState === "AUTHENTICATED";

      const qrCandidate = normalizeQrDataUri(
        dataObj?.qrCode || dataObj?.qr || dataObj?.qrcode || dataObj?.base64Qr || sessionObj?.qr
      );

      const connectedNumber = extractConnectedPhoneFromOpenWa(dataObj) || cap.openWaConnectedNumber;

      if (connectedBool && rawState !== "QRCODE" && rawState !== "AWAITING_QR") {
        return {
          ok: true,
          healthStatus: "CONNECTED",
          sessionState: "CONNECTED",
          connectedNumber,
          qrCodeDataUri: null,
          message: `Sessão OpenWA conectada${connectedNumber ? ` (${connectedNumber})` : ""}.`,
          latencyMs: Date.now() - startedAt,
        };
      }

      if (
        qrCandidate ||
        rawState === "QRCODE" ||
        rawState === "AWAITING_QR" ||
        rawState === "UNPAIRED" ||
        rawState === "UNPAIRED_IDLE"
      ) {
        return {
          ok: false,
          healthStatus: "AWAITING_QR",
          sessionState: "AWAITING_QR",
          connectedNumber: null,
          qrCodeDataUri: qrCandidate,
          message: "Sessão OpenWA ativa aguardando leitura do QR Code no WhatsApp do celular.",
          errorCode: "OPENWA_AWAITING_QR",
          latencyMs: Date.now() - startedAt,
        };
      }

      if (
        rawState === "CONFLICT" ||
        rawState === "UNLAUNCHED" ||
        rawState === "PROXYBLOCK" ||
        rawState === "TOS_BLOCK" ||
        rawState === "SMB_TOS_BLOCK" ||
        rawState === "RECONNECT_REQUIRED"
      ) {
        return {
          ok: false,
          healthStatus: "RECONNECT_REQUIRED",
          sessionState: rawState,
          connectedNumber: null,
          qrCodeDataUri: null,
          message: `Sessão OpenWA precisa de reconexão (${rawState}). Clique em "Reconectar Sessão".`,
          errorCode: `OPENWA_${rawState}`,
          latencyMs: Date.now() - startedAt,
        };
      }

      if (dataObj?.connected === false || rawState === "DISCONNECTED" || rawState === "TIMEOUT") {
        return {
          ok: false,
          healthStatus: "CONNECTION_FAILED",
          sessionState: "DISCONNECTED",
          connectedNumber: null,
          qrCodeDataUri: null,
          message: "Servidor OpenWA acessível, mas a sessão do WhatsApp está desconectada.",
          errorCode: "OPENWA_DISCONNECTED",
          latencyMs: Date.now() - startedAt,
        };
      }

      return {
        ok: false,
        healthStatus: "PARTIAL_SESSION_ONLY",
        sessionState: rawState || "DESCONHECIDO",
        connectedNumber,
        qrCodeDataUri: qrCandidate,
        message: "Servidor OpenWA respondeu, mas a sessão não confirmou estado pronto para envios.",
        errorCode: "OPENWA_NOT_READY",
        latencyMs: Date.now() - startedAt,
      };
    } catch (err: unknown) {
      lastErr = err;
    }
  }

  return {
    ok: false,
    healthStatus: "SERVICE_UNAVAILABLE",
    sessionState: "INDISPONIVEL",
    connectedNumber: null,
    qrCodeDataUri: null,
    message: `Não foi possível alcançar o servidor OpenWA: ${sanitizeErrorMessage(lastErr, [cap.openWaApiKey])}`,
    errorCode: "OPENWA_NETWORK_ERROR",
    latencyMs: Date.now() - startedAt,
  };
}

export async function fetchOpenWaQrCode(cap: WhatsAppCapability): Promise<{
  ok: boolean;
  healthStatus: IntegrationHealthStatus;
  qrCodeDataUri: string | null;
  connected: boolean;
  connectedNumber: string | null;
  message: string;
  errorCode?: string;
}> {
  if (cap.urlError || !cap.openWaBaseUrl) {
    return {
      ok: false,
      healthStatus: "NOT_CONFIGURED",
      qrCodeDataUri: null,
      connected: false,
      connectedNumber: null,
      message: cap.urlError || "Configure e salve a URL do servidor OpenWA primeiro.",
      errorCode: "OPENWA_NOT_CONFIGURED",
    };
  }

  const base = cap.openWaBaseUrl.replace(/\/+$/, "");
  const encodedSession = encodeURIComponent(cap.openWaSessionId || "default");
  const endpoints = [
    { url: `${base}/api/sessions/${encodedSession}/qr`, method: "GET" as const },
    { url: `${base}/qr`, method: "GET" as const },
    { url: `${base}/getQrCode`, method: "POST" as const, body: JSON.stringify({ args: {} }) },
    { url: `${base}/health`, method: "GET" as const },
  ];

  let lastErr: unknown = null;
  for (const ep of endpoints) {
    try {
      const res = await fetchWithTimeout(ep.url, {
        method: ep.method,
        headers: buildOpenWaHeaders(cap.openWaApiKey, ep.method === "POST"),
        body: "body" in ep ? ep.body : undefined,
      });

      if (res.status === 401 || res.status === 403) {
        return {
          ok: false,
          healthStatus: "INVALID_AUTH",
          qrCodeDataUri: null,
          connected: false,
          connectedNumber: null,
          message: "API Key OpenWA inválida.",
          errorCode: `HTTP_${res.status}`,
        };
      }

      if (res.status === 404 && ep !== endpoints[endpoints.length - 1]) {
        continue;
      }

      const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
      if (!res.ok) continue;

      const qrData = normalizeQrDataUri(
        json?.qrCode || json?.qr || json?.qrcode || json?.base64Qr || json?.response
      );
      if (qrData) {
        return {
          ok: true,
          healthStatus: "AWAITING_QR",
          qrCodeDataUri: qrData,
          connected: false,
          connectedNumber: null,
          message: "Escaneie o QR Code no aplicativo WhatsApp (Aparelhos Conectados).",
        };
      }

      const connected = json?.connected === true || json?.state === "CONNECTED";
      if (connected) {
        return {
          ok: true,
          healthStatus: "CONNECTED",
          qrCodeDataUri: null,
          connected: true,
          connectedNumber: extractConnectedPhoneFromOpenWa(json),
          message: "A sessão OpenWA já está conectada.",
        };
      }
    } catch (err: unknown) {
      lastErr = err;
    }
  }

  return {
    ok: false,
    healthStatus: lastErr ? "SERVICE_UNAVAILABLE" : "PARTIAL_SESSION_ONLY",
    qrCodeDataUri: null,
    connected: false,
    connectedNumber: null,
    message: lastErr
      ? `Servidor OpenWA inacessível: ${sanitizeErrorMessage(lastErr, [cap.openWaApiKey])}`
      : "O servidor OpenWA não disponibilizou um QR Code no momento. Tente reconectar a sessão.",
    errorCode: lastErr ? "OPENWA_NETWORK_ERROR" : "QR_UNAVAILABLE",
  };
}

export async function controlOpenWaSession(
  cap: WhatsAppCapability,
  action: "reconnect" | "disconnect"
): Promise<{
  ok: boolean;
  healthStatus: IntegrationHealthStatus;
  message: string;
  qrCodeDataUri?: string | null;
  errorCode?: string;
}> {
  if (cap.urlError || !cap.openWaBaseUrl) {
    return {
      ok: false,
      healthStatus: "NOT_CONFIGURED",
      message: cap.urlError || "Configure e salve a URL do OpenWA primeiro.",
      errorCode: "OPENWA_NOT_CONFIGURED",
    };
  }

  const base = cap.openWaBaseUrl.replace(/\/+$/, "");
  const encodedSession = encodeURIComponent(cap.openWaSessionId || "default");
  const urls =
    action === "reconnect"
      ? [
          `${base}/api/sessions/${encodedSession}/reconnect`,
          `${base}/api/sessions/${encodedSession}/restart`,
          `${base}/reconnect`,
        ]
      : [
          `${base}/api/sessions/${encodedSession}/logout`,
          `${base}/logout`,
          `${base}/disconnect`,
        ];

  let lastErr: unknown = null;
  for (const url of urls) {
    try {
      const res = await fetchWithTimeout(url, {
        method: "POST",
        headers: buildOpenWaHeaders(cap.openWaApiKey, true),
        body: JSON.stringify({ sessionId: cap.openWaSessionId }),
      });

      if (res.status === 401 || res.status === 403) {
        return {
          ok: false,
          healthStatus: "INVALID_AUTH",
          message: "API Key OpenWA inválida.",
          errorCode: `HTTP_${res.status}`,
        };
      }

      if (res.status === 404 && url !== urls[urls.length - 1]) {
        continue;
      }

      const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
      if (!res.ok) {
        return {
          ok: false,
          healthStatus: "CONNECTION_FAILED",
          message: `OpenWA retornou HTTP ${res.status} ao tentar ${action === "reconnect" ? "reconectar" : "desconectar"}.`,
          errorCode: `HTTP_${res.status}`,
        };
      }

      const qrData = normalizeQrDataUri(json?.qrCode || json?.qr);
      if (action === "disconnect") {
        return {
          ok: true,
          healthStatus: "RECONNECT_REQUIRED",
          message: "Sessão OpenWA desconectada com sucesso.",
        };
      }

      const nextStatus: IntegrationHealthStatus = qrData
        ? "AWAITING_QR"
        : json?.connected === true
        ? "CONNECTED"
        : "PARTIAL_SESSION_ONLY";

      return {
        ok: true,
        healthStatus: nextStatus,
        qrCodeDataUri: qrData,
        message: qrData
          ? "Sessão reiniciada. Escaneie o novo QR Code gerado."
          : "Solicitação de reconexão enviada ao OpenWA.",
      };
    } catch (err: unknown) {
      lastErr = err;
    }
  }

  return {
    ok: false,
    healthStatus: "SERVICE_UNAVAILABLE",
    message: `Falha de comunicação com OpenWA: ${sanitizeErrorMessage(lastErr, [cap.openWaApiKey])}`,
    errorCode: "OPENWA_NETWORK_ERROR",
  };
}

export async function sendOpenWaMessage(
  cap: WhatsAppCapability,
  payload: { to: string; message: string }
): Promise<{
  ok: boolean;
  provider: "OPENWA";
  providerMessageId?: string | null;
  healthStatus: IntegrationHealthStatus;
  errorCode?: string;
  sanitizedErrorMessage?: string;
}> {
  if (cap.urlError || !cap.openWaBaseUrl) {
    return {
      ok: false,
      provider: "OPENWA",
      healthStatus: cap.urlError ? "CONNECTION_FAILED" : "NOT_CONFIGURED",
      errorCode: "OPENWA_NOT_CONFIGURED",
      sanitizedErrorMessage: cap.urlError || "URL do servidor OpenWA não configurada.",
    };
  }

  const digits = normalizeWhatsAppNumber(payload.to);
  if (!digits || digits.length < 10) {
    return {
      ok: false,
      provider: "OPENWA",
      healthStatus: "CONNECTION_FAILED",
      errorCode: "INVALID_WHATSAPP_NUMBER",
      sanitizedErrorMessage: "Número de telefone WhatsApp inválido.",
    };
  }

  const chatId = `${digits}@c.us`;
  const base = cap.openWaBaseUrl.replace(/\/+$/, "");
  const encodedSession = encodeURIComponent(cap.openWaSessionId || "default");

  const attempts = [
    {
      url: `${base}/api/messages/sendText`,
      body: { to: chatId, content: payload.message, options: {} },
    },
    {
      url: `${base}/sendText`,
      body: { args: { to: chatId, content: payload.message } },
    },
    {
      url: `${base}/api/sessions/${encodedSession}/send-text`,
      body: { to: digits, chatId, message: payload.message, content: payload.message },
    },
  ];

  let lastErr: unknown = null;

  for (const item of attempts) {
    try {
      const res = await fetchWithTimeout(item.url, {
        method: "POST",
        headers: buildOpenWaHeaders(cap.openWaApiKey, true),
        body: JSON.stringify(item.body),
      });

      if (res.status === 401 || res.status === 403) {
        return {
          ok: false,
          provider: "OPENWA",
          healthStatus: "INVALID_AUTH",
          errorCode: `HTTP_${res.status}`,
          sanitizedErrorMessage: "API Key OpenWA inválida.",
        };
      }

      if (res.status === 404 && item !== attempts[attempts.length - 1]) {
        continue;
      }

      const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
      if (!res.ok) {
        const rawErr =
          (json && typeof json.error === "string" && json.error) ||
          (json && typeof json.message === "string" && json.message) ||
          `HTTP ${res.status}`;
        const lower = rawErr.toLowerCase();
        const needsReconnect =
          lower.includes("qr") || lower.includes("disconnected") || lower.includes("not ready");

        return {
          ok: false,
          provider: "OPENWA",
          healthStatus: needsReconnect ? "RECONNECT_REQUIRED" : "CONNECTION_FAILED",
          errorCode: `OPENWA_HTTP_${res.status}`,
          sanitizedErrorMessage: sanitizeErrorMessage(rawErr, [cap.openWaApiKey]),
        };
      }

      const nested =
        json && typeof json.response === "object" && json.response !== null
          ? (json.response as Record<string, unknown>)
          : null;
      const msgId = String(
        json?.id ||
          json?.messageId ||
          nested?.id ||
          (typeof json?.response === "string" ? json.response : "") ||
          ""
      ).trim();

      return {
        ok: true,
        provider: "OPENWA",
        providerMessageId: msgId || null,
        healthStatus: "CONNECTED",
      };
    } catch (err: unknown) {
      lastErr = err;
    }
  }

  return {
    ok: false,
    provider: "OPENWA",
    healthStatus: "SERVICE_UNAVAILABLE",
    errorCode: "OPENWA_NETWORK_ERROR",
    sanitizedErrorMessage: sanitizeErrorMessage(lastErr, [cap.openWaApiKey]),
  };
}

// ============================================================================
// ORQUESTRADOR WHATSAPP
// ============================================================================

export async function verifyWhatsAppConnection(sys?: WhatsAppSettingsInput | null): Promise<{
  ok: boolean;
  provider: WhatsAppProviderType;
  healthStatus: IntegrationHealthStatus;
  message: string;
  displayPhone?: string | null;
  verifiedName?: string | null;
  qrCodeDataUri?: string | null;
  sessionState?: string;
  errorCode?: string;
  latencyMs: number;
}> {
  const cap = getWhatsAppCapability(sys);

  if (!cap.enabled) {
    return {
      ok: false,
      provider: cap.provider,
      healthStatus: "DISABLED",
      message: "Canal WhatsApp desativado pelo administrador.",
      latencyMs: 0,
    };
  }

  if (cap.provider === "META_OFFICIAL") {
    const res = await verifyMetaWhatsAppConnection(cap);
    return { ...res, provider: "META_OFFICIAL" };
  }

  const res = await inspectOpenWaConnection(cap);
  return {
    ok: res.ok,
    provider: "OPENWA",
    healthStatus: res.healthStatus,
    message: res.message,
    displayPhone: res.connectedNumber,
    qrCodeDataUri: res.qrCodeDataUri,
    sessionState: res.sessionState,
    errorCode: res.errorCode,
    latencyMs: res.latencyMs,
  };
}

export async function sendWhatsAppMessage(
  sys: WhatsAppSettingsInput | null | undefined,
  payload: { to: string; message: string; useTemplateIfConfigured?: boolean }
): Promise<{
  ok: boolean;
  provider: "META_CLOUD_API" | "OPENWA";
  providerMessageId?: string | null;
  healthStatus: IntegrationHealthStatus;
  errorCode?: string;
  sanitizedErrorMessage?: string;
}> {
  const cap = getWhatsAppCapability(sys);
  const targetProvider = cap.provider === "OPENWA" ? "OPENWA" : "META_CLOUD_API";

  if (!cap.enabled) {
    return {
      ok: false,
      provider: targetProvider,
      healthStatus: "DISABLED",
      errorCode: "WHATSAPP_DISABLED",
      sanitizedErrorMessage: "Canal WhatsApp está desativado pelo administrador.",
    };
  }

  if (!cap.configured) {
    return {
      ok: false,
      provider: targetProvider,
      healthStatus: cap.urlError ? "CONNECTION_FAILED" : "NOT_CONFIGURED",
      errorCode: "WHATSAPP_NOT_CONFIGURED",
      sanitizedErrorMessage: cap.reason || "Configuração WhatsApp incompleta.",
    };
  }

  if (cap.provider === "OPENWA") {
    return sendOpenWaMessage(cap, payload);
  }
  return sendMetaWhatsAppMessage(cap, payload);
}
