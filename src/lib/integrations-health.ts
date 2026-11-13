export const INTEGRATION_HEALTH_STATUSES = [
  "DISABLED",
  "NOT_CONFIGURED",
  "UNVERIFIED",
  "CHECKING",
  "CONNECTED",
  "PARTIAL_API_ONLY",
  "PARTIAL_SESSION_ONLY",
  "CONNECTION_FAILED",
  "INVALID_AUTH",
  "SERVICE_UNAVAILABLE",
  "DEVICE_OFFLINE",
  "AWAITING_QR",
  "RECONNECT_REQUIRED",
] as const;

export type IntegrationHealthStatus = (typeof INTEGRATION_HEALTH_STATUSES)[number];

export type IntegrationBadgeVariant =
  | "connected"
  | "partial"
  | "warning"
  | "error"
  | "disabled"
  | "neutral"
  | "checking";

export interface HealthStatusMeta {
  status: IntegrationHealthStatus;
  label: string;
  description: string;
  variant: IntegrationBadgeVariant;
  isConnected: boolean;
  isFunctional: boolean;
}

const HEALTH_META_MAP: Record<IntegrationHealthStatus, Omit<HealthStatusMeta, "status">> = {
  DISABLED: {
    label: "Desativado",
    description: "Canal desativado pelo administrador.",
    variant: "disabled",
    isConnected: false,
    isFunctional: false,
  },
  NOT_CONFIGURED: {
    label: "Não configurado",
    description: "Preencha e salve as credenciais obrigatórias antes de verificar a conexão.",
    variant: "neutral",
    isConnected: false,
    isFunctional: false,
  },
  UNVERIFIED: {
    label: "Conexão não testada",
    description: "Credenciais salvas. Clique em Verificar Conexão para testar o provedor real.",
    variant: "neutral",
    isConnected: false,
    isFunctional: false,
  },
  CHECKING: {
    label: "Verificando",
    description: "Executando teste real de conectividade com o provedor...",
    variant: "checking",
    isConnected: false,
    isFunctional: false,
  },
  CONNECTED: {
    label: "Conectado e funcional",
    description: "Conexão verificada com sucesso e pronta para envios reais.",
    variant: "connected",
    isConnected: true,
    isFunctional: true,
  },
  PARTIAL_API_ONLY: {
    label: "API acessível",
    description: "API respondeu, porém o aparelho ou número remetente não está pronto para envio.",
    variant: "partial",
    isConnected: true,
    isFunctional: false,
  },
  PARTIAL_SESSION_ONLY: {
    label: "Sessão aguardando pareamento",
    description: "Serviço acessível, porém a sessão WhatsApp ainda requer vinculação ou envio de teste.",
    variant: "partial",
    isConnected: false,
    isFunctional: false,
  },
  CONNECTION_FAILED: {
    label: "Falha na conexão",
    description: "Não foi possível completar o handshake com o servidor ou API configurada.",
    variant: "error",
    isConnected: false,
    isFunctional: false,
  },
  INVALID_AUTH: {
    label: "Credenciais inválidas",
    description: "O provedor recusou o usuário, senha, API Key ou token informado.",
    variant: "error",
    isConnected: false,
    isFunctional: false,
  },
  SERVICE_UNAVAILABLE: {
    label: "Serviço indisponível",
    description: "O servidor ou API externa não respondeu dentro do tempo limite.",
    variant: "error",
    isConnected: false,
    isFunctional: false,
  },
  DEVICE_OFFLINE: {
    label: "Dispositivo Android offline",
    description: "O celular configurado no TextBee não está online ou desconectado da internet.",
    variant: "warning",
    isConnected: true,
    isFunctional: false,
  },
  AWAITING_QR: {
    label: "Aguardando QR Code",
    description: "Leia o QR Code no aplicativo WhatsApp do aparelho para conectar a sessão OpenWA.",
    variant: "warning",
    isConnected: false,
    isFunctional: false,
  },
  RECONNECT_REQUIRED: {
    label: "Reconexão necessária",
    description: "A sessão WhatsApp expirou ou foi desconectada e precisa ser reconectada.",
    variant: "warning",
    isConnected: false,
    isFunctional: false,
  },
};

export function normalizeHealthStatus(raw: string | null | undefined): IntegrationHealthStatus {
  if (raw && (INTEGRATION_HEALTH_STATUSES as readonly string[]).includes(raw)) {
    return raw as IntegrationHealthStatus;
  }
  return "NOT_CONFIGURED";
}

export function getHealthStatusMeta(
  rawStatus: string | null | undefined,
  enabled?: boolean,
  configured?: boolean
): HealthStatusMeta {
  if (enabled === false) {
    return { status: "DISABLED", ...HEALTH_META_MAP.DISABLED };
  }
  if (enabled === true && configured === false) {
    return { status: "NOT_CONFIGURED", ...HEALTH_META_MAP.NOT_CONFIGURED };
  }
  const normalized = normalizeHealthStatus(rawStatus);
  if (enabled === true && configured === true && (normalized === "DISABLED" || normalized === "NOT_CONFIGURED")) {
    return { status: "UNVERIFIED", ...HEALTH_META_MAP.UNVERIFIED };
  }
  return {
    status: normalized,
    ...HEALTH_META_MAP[normalized],
  };
}

export const EMAIL_RECOVERY_STRATEGIES = ["ADMIN_ASSISTED", "SMS"] as const;
export type EmailRecoveryStrategy = (typeof EMAIL_RECOVERY_STRATEGIES)[number];

export function isSmsRecoveryReady(settings: {
  smsEnabled?: boolean | null;
  textbeeApiKey?: string | null;
  textbeeDeviceId?: string | null;
  smsHealthStatus?: string | null;
} | null | undefined): boolean {
  if (!settings || !settings.smsEnabled) return false;
  if (!settings.textbeeApiKey || !settings.textbeeDeviceId) return false;
  return settings.smsHealthStatus !== "INVALID_AUTH" && settings.smsHealthStatus !== "SERVICE_UNAVAILABLE";
}

// Rate limit leve em memória para evitar abuso em verificações e envios de teste
const globalForRateLimit = globalThis as unknown as {
  __psiIntegrationActionCooldown?: Map<string, number>;
};

function getActionMap(): Map<string, number> {
  if (!globalForRateLimit.__psiIntegrationActionCooldown) {
    globalForRateLimit.__psiIntegrationActionCooldown = new Map<string, number>();
  }
  return globalForRateLimit.__psiIntegrationActionCooldown;
}

export function checkActionCooldown(
  key: string,
  cooldownMs = 1500
): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
  if (process.env.PSI_DISABLE_ACTION_COOLDOWN === "true") {
    return { allowed: true };
  }
  const map = getActionMap();
  const now = Date.now();
  const until = map.get(key) || 0;
  if (until > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((until - now) / 1000)),
    };
  }
  map.set(key, now + cooldownMs);
  if (map.size > 500) {
    for (const [k, exp] of map.entries()) {
      if (exp < now) map.delete(k);
    }
  }
  return { allowed: true };
}
