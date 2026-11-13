import { normalizeWhatsAppNumber } from "@/lib/phone-utils";
import { decryptSecret, sanitizeErrorMessage, validateProviderBaseUrl } from "@/lib/secrets";
import type { IntegrationHealthStatus } from "@/lib/integrations-health";

export const TEXTBEE_CLOUD_BASE_URL = "https://api.textbee.dev/api/v1";

export type TextBeeHostingMode = "CLOUD" | "SELF_HOSTED";

export interface SmsSettingsInput {
  smsEnabled?: boolean | null;
  smsProvider?: string | null;
  textbeeHostingMode?: string | null;
  textbeeApiUrl?: string | null;
  textbeeApiKey?: string | null;
  textbeeDeviceId?: string | null;
  smsHealthStatus?: string | null;
}

export interface TextBeeDeviceInfo {
  id: string;
  name: string;
  model: string | null;
  enabled: boolean;
  isOnline: boolean;
  statusLabel: string;
  lastSeenAt: string | null;
}

export interface SmsCapability {
  enabled: boolean;
  configured: boolean;
  canSendRealSms: boolean;
  hostingMode: TextBeeHostingMode;
  baseUrl: string | null;
  apiKey: string | null;
  deviceId: string | null;
  missingFields: string[];
  urlError: string | null;
  reason: string | null;
}

export function resolveTextBeeHostingMode(raw?: string | null): TextBeeHostingMode {
  return (raw || "").trim().toUpperCase() === "SELF_HOSTED" ? "SELF_HOSTED" : "CLOUD";
}

export function resolveTextBeeBaseUrl(
  hostingModeRaw?: string | null,
  customUrlRaw?: string | null
): { valid: true; url: string } | { valid: false; error: string } {
  const mode = resolveTextBeeHostingMode(hostingModeRaw);
  if (mode === "CLOUD") {
    return { valid: true, url: TEXTBEE_CLOUD_BASE_URL };
  }

  const check = validateProviderBaseUrl(customUrlRaw || "", {
    allowHttpLocalhost: true,
    allowPrivateNetwork: process.env.PSI_ALLOW_PRIVATE_PROVIDER_URLS === "true",
  });
  if (!check.valid) {
    return { valid: false, error: check.error };
  }
  // Normaliza removendo barra final; aceita base já contendo /api/v1 ou raiz do servidor TextBee
  return { valid: true, url: check.normalized };
}

export function formatE164Phone(raw?: string | null): string | null {
  const normalized = normalizeWhatsAppNumber(raw);
  if (!normalized || normalized.length < 10) return null;
  return `+${normalized}`;
}

export function getSmsCapability(sys?: SmsSettingsInput | null): SmsCapability {
  const enabled = Boolean(sys?.smsEnabled);
  const hostingMode = resolveTextBeeHostingMode(sys?.textbeeHostingMode);
  const apiKey = decryptSecret(sys?.textbeeApiKey);
  const deviceId = (sys?.textbeeDeviceId || "").trim() || null;

  let baseUrl: string | null = null;
  let urlError: string | null = null;

  if (hostingMode === "CLOUD") {
    baseUrl = TEXTBEE_CLOUD_BASE_URL;
  } else if (sys?.textbeeApiUrl?.trim()) {
    const resolved = resolveTextBeeBaseUrl("SELF_HOSTED", sys.textbeeApiUrl);
    if (resolved.valid) {
      baseUrl = resolved.url;
    } else {
      urlError = resolved.error;
    }
  }

  const missingFields: string[] = [];
  if (hostingMode === "SELF_HOSTED" && !baseUrl) {
    missingFields.push("URL do servidor TextBee Self-Hosted");
  }
  if (!apiKey) missingFields.push("API Key TextBee");
  if (!deviceId) missingFields.push("Dispositivo Android (Device ID)");

  const configured = Boolean(baseUrl && apiKey && deviceId && !urlError);
  const canSendRealSms = enabled && configured;

  let reason: string | null = null;
  if (!enabled) {
    reason = "Canal SMS desativado pelo administrador.";
  } else if (urlError) {
    reason = urlError;
  } else if (!configured) {
    reason = `Configuração TextBee incompleta: ${missingFields.join(", ")}.`;
  }

  return {
    enabled,
    configured,
    canSendRealSms,
    hostingMode,
    baseUrl,
    apiKey,
    deviceId,
    missingFields,
    urlError,
    reason,
  };
}

function buildGatewayEndpointCandidates(baseUrl: string, suffixPath: string): string[] {
  const clean = baseUrl.replace(/\/+$/, "");
  const cleanSuffix = suffixPath.startsWith("/") ? suffixPath : `/${suffixPath}`;
  if (clean.endsWith("/api/v1")) {
    return [`${clean}${cleanSuffix}`];
  }
  // Para Self-Hosted onde administrador informou apenas https://sms.dominio.com sem /api/v1
  return [`${clean}/api/v1${cleanSuffix}`, `${clean}${cleanSuffix}`];
}

function parseDeviceList(payload: unknown): TextBeeDeviceInfo[] {
  const root = payload as
    | Array<Record<string, unknown>>
    | { data?: Array<Record<string, unknown>>; devices?: Array<Record<string, unknown>> }
    | null;

  const rawList = Array.isArray(root)
    ? root
    : Array.isArray(root?.data)
    ? root.data
    : Array.isArray(root?.devices)
    ? root.devices
    : [];

  return rawList
    .map((item): TextBeeDeviceInfo | null => {
      const id = String(item._id || item.id || item.deviceId || "").trim();
      if (!id) return null;

      const enabled = item.enabled !== false && item.isActive !== false;
      const statusStr = String(item.status || item.connectionStatus || "").trim().toUpperCase();

      const explicitOffline =
        item.online === false ||
        item.isOnline === false ||
        item.connected === false ||
        statusStr === "OFFLINE" ||
        statusStr === "DISCONNECTED";

      const explicitOnline =
        item.online === true ||
        item.isOnline === true ||
        item.connected === true ||
        statusStr === "ONLINE" ||
        statusStr === "CONNECTED" ||
        statusStr === "ACTIVE";

      const isOnline = enabled && !explicitOffline && (explicitOnline || statusStr === "");

      const brand = typeof item.brand === "string" ? item.brand.trim() : "";
      const model = typeof item.model === "string" ? item.model.trim() : "";
      const composedModel = [brand, model].filter(Boolean).join(" ") || null;
      const name =
        (typeof item.name === "string" && item.name.trim()) ||
        composedModel ||
        `Dispositivo Android (${id.slice(0, 8)})`;

      const statusLabel = !enabled
        ? "Desabilitado no app"
        : isOnline
        ? "Online no Android"
        : "Offline";

      const lastSeenRaw = item.lastSeenAt || item.updatedAt || item.lastHeartbeatAt;
      const lastSeenAt = typeof lastSeenRaw === "string" ? lastSeenRaw : null;

      return {
        id,
        name,
        model: composedModel,
        enabled,
        isOnline,
        statusLabel,
        lastSeenAt,
      };
    })
    .filter((d): d is TextBeeDeviceInfo => d !== null);
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

export async function listTextBeeDevices(params: {
  hostingMode?: string | null;
  customApiUrl?: string | null;
  apiKey: string;
}): Promise<{
  ok: boolean;
  devices: TextBeeDeviceInfo[];
  healthStatus: IntegrationHealthStatus;
  message: string;
  errorCode?: string;
}> {
  const resolvedUrl = resolveTextBeeBaseUrl(params.hostingMode, params.customApiUrl);
  if (!resolvedUrl.valid) {
    return {
      ok: false,
      devices: [],
      healthStatus: "CONNECTION_FAILED",
      message: resolvedUrl.error,
      errorCode: "INVALID_URL",
    };
  }

  const key = params.apiKey.trim();
  if (!key) {
    return {
      ok: false,
      devices: [],
      healthStatus: "NOT_CONFIGURED",
      message: "Informe a API Key do TextBee para consultar os dispositivos.",
      errorCode: "MISSING_API_KEY",
    };
  }

  const urls = buildGatewayEndpointCandidates(resolvedUrl.url, "/gateway/devices");
  let lastError: unknown = null;

  for (const endpoint of urls) {
    try {
      const res = await fetchWithTimeout(endpoint, {
        method: "GET",
        headers: {
          "x-api-key": key,
          Accept: "application/json",
        },
      });

      if (res.status === 401 || res.status === 403) {
        return {
          ok: false,
          devices: [],
          healthStatus: "INVALID_AUTH",
          message: "API Key TextBee inválida ou sem autorização para listar dispositivos.",
          errorCode: `HTTP_${res.status}`,
        };
      }

      if (res.status === 404 && endpoint !== urls[urls.length - 1]) {
        continue;
      }

      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        return {
          ok: false,
          devices: [],
          healthStatus: res.status >= 500 ? "SERVICE_UNAVAILABLE" : "CONNECTION_FAILED",
          message: `Erro TextBee HTTP ${res.status}: ${sanitizeErrorMessage(errBody, [key])}`,
          errorCode: `HTTP_${res.status}`,
        };
      }

      const json = await res.json().catch(() => []);
      const devices = parseDeviceList(json);
      return {
        ok: true,
        devices,
        healthStatus: devices.some((d) => d.isOnline) ? "CONNECTED" : "PARTIAL_API_ONLY",
        message:
          devices.length > 0
            ? `${devices.length} dispositivo(s) encontrado(s) na conta TextBee.`
            : "API TextBee conectada, mas nenhum dispositivo Android foi vinculado ainda.",
      };
    } catch (err: unknown) {
      lastError = err;
    }
  }

  return {
    ok: false,
    devices: [],
    healthStatus: "SERVICE_UNAVAILABLE",
    message: `Não foi possível conectar ao servidor TextBee: ${sanitizeErrorMessage(lastError, [key])}`,
    errorCode: "TEXTBEE_NETWORK_ERROR",
  };
}

export async function verifySmsConnection(sys?: SmsSettingsInput | null): Promise<{
  ok: boolean;
  healthStatus: IntegrationHealthStatus;
  message: string;
  devices: TextBeeDeviceInfo[];
  selectedDevice: TextBeeDeviceInfo | null;
  errorCode?: string;
  latencyMs: number;
}> {
  const startedAt = Date.now();
  const cap = getSmsCapability(sys);

  if (!cap.enabled) {
    return {
      ok: false,
      healthStatus: "DISABLED",
      message: "Canal SMS desativado pelo administrador.",
      devices: [],
      selectedDevice: null,
      latencyMs: Date.now() - startedAt,
    };
  }

  if (cap.urlError) {
    return {
      ok: false,
      healthStatus: "CONNECTION_FAILED",
      message: cap.urlError,
      devices: [],
      selectedDevice: null,
      errorCode: "INVALID_URL",
      latencyMs: Date.now() - startedAt,
    };
  }

  if (!cap.apiKey) {
    return {
      ok: false,
      healthStatus: "NOT_CONFIGURED",
      message: "Configure e salve a API Key do TextBee antes de verificar a conexão.",
      devices: [],
      selectedDevice: null,
      latencyMs: Date.now() - startedAt,
    };
  }

  const listed = await listTextBeeDevices({
    hostingMode: cap.hostingMode,
    customApiUrl: sys?.textbeeApiUrl,
    apiKey: cap.apiKey,
  });

  if (!listed.ok) {
    return {
      ok: false,
      healthStatus: listed.healthStatus,
      message: listed.message,
      devices: [],
      selectedDevice: null,
      errorCode: listed.errorCode,
      latencyMs: Date.now() - startedAt,
    };
  }

  if (!cap.deviceId) {
    return {
      ok: false,
      healthStatus: "PARTIAL_API_ONLY",
      message:
        listed.devices.length > 0
          ? "API TextBee acessível, mas nenhum Device ID foi selecionado para envio."
          : "API TextBee acessível, porém nenhum dispositivo Android está registrado na sua conta.",
      devices: listed.devices,
      selectedDevice: null,
      errorCode: "DEVICE_NOT_SELECTED",
      latencyMs: Date.now() - startedAt,
    };
  }

  const matched = listed.devices.find((d) => d.id === cap.deviceId) || null;
  if (!matched) {
    return {
      ok: false,
      healthStatus: "CONNECTION_FAILED",
      message: `O dispositivo selecionado (${cap.deviceId}) não foi encontrado na conta TextBee.`,
      devices: listed.devices,
      selectedDevice: null,
      errorCode: "DEVICE_NOT_FOUND",
      latencyMs: Date.now() - startedAt,
    };
  }

  if (!matched.isOnline || !matched.enabled) {
    return {
      ok: false,
      healthStatus: "DEVICE_OFFLINE",
      message:
        `API acessível, mas o aparelho Android "${matched.name}" está offline ou desconectado no aplicativo TextBee.`,
      devices: listed.devices,
      selectedDevice: matched,
      errorCode: "DEVICE_OFFLINE",
      latencyMs: Date.now() - startedAt,
    };
  }

  return {
    ok: true,
    healthStatus: "CONNECTED",
    message: `TextBee conectado ao aparelho Android "${matched.name}" (${matched.statusLabel}).`,
    devices: listed.devices,
    selectedDevice: matched,
    latencyMs: Date.now() - startedAt,
  };
}

export async function sendSmsMessage(
  sys: SmsSettingsInput | null | undefined,
  payload: { to: string; message: string }
): Promise<{
  ok: boolean;
  provider: string;
  providerMessageId?: string | null;
  healthStatus: IntegrationHealthStatus;
  errorCode?: string;
  sanitizedErrorMessage?: string;
}> {
  const cap = getSmsCapability(sys);
  const providerTag = cap.hostingMode === "SELF_HOSTED" ? "TEXTBEE_SELF_HOSTED" : "TEXTBEE_CLOUD";

  if (!cap.enabled) {
    return {
      ok: false,
      provider: providerTag,
      healthStatus: "DISABLED",
      errorCode: "SMS_DISABLED",
      sanitizedErrorMessage: "Canal SMS está desativado pelo administrador.",
    };
  }

  if (!cap.configured || !cap.baseUrl || !cap.apiKey || !cap.deviceId) {
    return {
      ok: false,
      provider: providerTag,
      healthStatus: cap.urlError ? "CONNECTION_FAILED" : "NOT_CONFIGURED",
      errorCode: "SMS_NOT_CONFIGURED",
      sanitizedErrorMessage: cap.reason || "Configuração TextBee incompleta.",
    };
  }

  const recipientE164 = formatE164Phone(payload.to);
  if (!recipientE164) {
    return {
      ok: false,
      provider: providerTag,
      healthStatus: "CONNECTION_FAILED",
      errorCode: "INVALID_RECIPIENT_PHONE",
      sanitizedErrorMessage: "Número de celular inválido para envio de SMS.",
    };
  }

  const deviceUrls = buildGatewayEndpointCandidates(
    cap.baseUrl,
    `/gateway/devices/${encodeURIComponent(cap.deviceId)}/send-sms`
  );
  const globalUrls = buildGatewayEndpointCandidates(cap.baseUrl, "/gateway/send-sms");
  const candidates = [...deviceUrls, ...globalUrls];

  let lastError: unknown = null;

  for (const endpoint of candidates) {
    try {
      const bodyPayload: Record<string, unknown> = {
        recipients: [recipientE164],
        message: payload.message,
      };
      if (endpoint.endsWith("/gateway/send-sms")) {
        bodyPayload.deviceId = cap.deviceId;
      }

      const res = await fetchWithTimeout(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": cap.apiKey,
          Accept: "application/json",
        },
        body: JSON.stringify(bodyPayload),
      });

      if (res.status === 401 || res.status === 403) {
        return {
          ok: false,
          provider: providerTag,
          healthStatus: "INVALID_AUTH",
          errorCode: `HTTP_${res.status}`,
          sanitizedErrorMessage: "API Key TextBee inválida ou revogada.",
        };
      }

      if (res.status === 404 && endpoint !== candidates[candidates.length - 1]) {
        continue;
      }

      const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
      if (!res.ok) {
        const rawErr =
          (json && typeof json.error === "string" && json.error) ||
          (json && typeof json.message === "string" && json.message) ||
          `HTTP ${res.status}`;
        const lowerErr = rawErr.toLowerCase();
        const isDeviceOffline = lowerErr.includes("offline") || lowerErr.includes("device");

        return {
          ok: false,
          provider: providerTag,
          healthStatus: isDeviceOffline ? "DEVICE_OFFLINE" : "CONNECTION_FAILED",
          errorCode: isDeviceOffline ? "DEVICE_OFFLINE" : `TEXTBEE_HTTP_${res.status}`,
          sanitizedErrorMessage: sanitizeErrorMessage(rawErr, [cap.apiKey]),
        };
      }

      const nestedData =
        json && typeof json.data === "object" && json.data !== null
          ? (json.data as Record<string, unknown>)
          : null;
      const msgId = String(
        nestedData?.smsBatchId ||
          nestedData?._id ||
          nestedData?.id ||
          json?.smsBatchId ||
          json?._id ||
          json?.id ||
          ""
      ).trim();

      return {
        ok: true,
        provider: providerTag,
        providerMessageId: msgId || null,
        healthStatus: "CONNECTED",
      };
    } catch (err: unknown) {
      lastError = err;
    }
  }

  return {
    ok: false,
    provider: providerTag,
    healthStatus: "SERVICE_UNAVAILABLE",
    errorCode: "TEXTBEE_NETWORK_ERROR",
    sanitizedErrorMessage: sanitizeErrorMessage(lastError, [cap.apiKey]),
  };
}
