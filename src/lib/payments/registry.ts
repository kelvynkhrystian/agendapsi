import { prisma } from "../prisma";
import { encryptSecret, decryptSecret, maskSecret } from "../secrets";
import {
  PaymentProviderKey,
  IPaymentProvider,
  GatewayConfigDTO,
  PaymentEnvironment,
  ProviderHealthStatus,
} from "./types";
import { MercadoPagoProvider } from "./providers/mercado-pago";
import { AsaasProvider } from "./providers/asaas";
import { PagBankProvider } from "./providers/pagbank";
import { InPersonProvider } from "./providers/in-person";

const providerRegistry = new Map<PaymentProviderKey, IPaymentProvider>([
  ["MERCADO_PAGO", new MercadoPagoProvider()],
  ["ASAAS", new AsaasProvider()],
  ["PAGBANK", new PagBankProvider()],
  ["IN_PERSON", new InPersonProvider()],
]);

export function getPaymentProvider(key: PaymentProviderKey): IPaymentProvider {
  const provider = providerRegistry.get(key);
  if (!provider) {
    throw new Error(`Provedor de pagamento não suportado: ${key}`);
  }
  return provider;
}

export const DEFAULT_GATEWAYS_METADATA: Array<{
  slotNumber: number;
  providerKey: PaymentProviderKey;
  name: string;
  defaultInstructions?: string;
}> = [
  {
    slotNumber: 1,
    providerKey: "MERCADO_PAGO",
    name: "Mercado Pago",
  },
  {
    slotNumber: 2,
    providerKey: "ASAAS",
    name: "Asaas",
  },
  {
    slotNumber: 3,
    providerKey: "PAGBANK",
    name: "PagBank",
  },
  {
    slotNumber: 4,
    providerKey: "IN_PERSON",
    name: "Pagamento Presencial",
    defaultInstructions: "O pagamento poderá ser realizado diretamente na recepção em dinheiro, cartão ou Pix no dia do atendimento.",
  },
];

/**
 * Garante a inicialização dos slots padrão no banco de dados
 */
export async function initializeDefaultGateways() {
  for (const meta of DEFAULT_GATEWAYS_METADATA) {
    const existing = await prisma.gatewayConfiguration.findUnique({
      where: { providerKey: meta.providerKey },
    });

    if (!existing) {
      const isInPerson = meta.providerKey === "IN_PERSON";
      await prisma.gatewayConfiguration.create({
        data: {
          slotNumber: meta.slotNumber,
          providerKey: meta.providerKey,
          name: meta.name,
          isEnabled: isInPerson,
          isDefault: isInPerson,
          isSandbox: !isInPerson,
          environment: isInPerson ? "PRODUCTION" : "SANDBOX",
          healthStatus: isInPerson ? "CONNECTED" : "NOT_CONFIGURED",
          instructions: meta.defaultInstructions || null,
        },
      });
    }
  }
}

/**
 * Retorna lista de configurações de todos os gateways com credenciais mascaradas para o painel admin
 */
export async function getGatewayConfigs(originUrl?: string): Promise<GatewayConfigDTO[]> {
  await initializeDefaultGateways();

  const gateways = await prisma.gatewayConfiguration.findMany({
    orderBy: { slotNumber: "asc" },
  });

  const baseOrigin = originUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return gateways.map((g) => {
    let creds: any = {};
    if (g.configDataEncrypted) {
      try {
        const decryptedJson = decryptSecret(g.configDataEncrypted);
        if (decryptedJson) {
          creds = JSON.parse(decryptedJson);
        }
      } catch {
        creds = {};
      }
    }

    const providerKey = g.providerKey as PaymentProviderKey;
    const webhookPath = `/api/webhooks/payments/${providerKey.toLowerCase().replace(/_/g, "")}`;
    const fullWebhookUrl = `${baseOrigin}${webhookPath}`;

    let maskedAccessToken: string | undefined = undefined;
    let maskedPublicKey: string | undefined = undefined;
    let maskedWebhookSecret: string | undefined = undefined;

    const rawToken = creds.accessToken || creds.apiKey || creds.token;
    if (rawToken) {
      maskedAccessToken = maskSecret(rawToken);
    }
    if (creds.publicKey) {
      maskedPublicKey = maskSecret(creds.publicKey);
    }
    if (g.webhookSecretEncrypted) {
      try {
        const decryptedSec = decryptSecret(g.webhookSecretEncrypted);
        if (decryptedSec) maskedWebhookSecret = maskSecret(decryptedSec);
      } catch {
        maskedWebhookSecret = "••••••••";
      }
    }

    return {
      id: g.id,
      slotNumber: g.slotNumber,
      providerKey,
      name: g.name,
      isEnabled: g.isEnabled,
      isSandbox: g.isSandbox,
      isDefault: g.isDefault,
      environment: (g.environment as PaymentEnvironment) || (g.isSandbox ? "SANDBOX" : "PRODUCTION"),
      hasCredentials: Boolean(rawToken),
      maskedAccessToken,
      maskedPublicKey,
      maskedWebhookSecret,
      webhookUrl: g.webhookUrl || fullWebhookUrl,
      healthStatus: (g.healthStatus as ProviderHealthStatus) || "NOT_CONFIGURED",
      healthMessage: g.healthMessage,
      lastCheckedAt: g.lastCheckedAt ? g.lastCheckedAt.toISOString() : null,
      lastTestedAt: g.lastTestedAt ? g.lastTestedAt.toISOString() : null,
      lastWebhookReceivedAt: g.lastWebhookReceivedAt ? g.lastWebhookReceivedAt.toISOString() : null,
      instructions: g.instructions,
    };
  });
}

/**
 * Retorna as credenciais decriptografadas completas para uso no backend
 */
export async function getDecryptedGatewayCredentials(providerKey: PaymentProviderKey) {
  const gateway = await prisma.gatewayConfiguration.findUnique({
    where: { providerKey },
  });

  if (!gateway) return null;

  let credentials: any = {};
  if (gateway.configDataEncrypted) {
    try {
      const decrypted = decryptSecret(gateway.configDataEncrypted);
      if (decrypted) {
        credentials = JSON.parse(decrypted);
      }
    } catch {
      credentials = {};
    }
  }

  let webhookSecret: string | undefined = undefined;
  if (gateway.webhookSecretEncrypted) {
    try {
      webhookSecret = decryptSecret(gateway.webhookSecretEncrypted) || undefined;
    } catch {
      webhookSecret = undefined;
    }
  }

  if (webhookSecret && !credentials.webhookSecret) {
    credentials.webhookSecret = webhookSecret;
  }

  return {
    gateway,
    credentials,
    environment: (gateway.environment as PaymentEnvironment) || (gateway.isSandbox ? "SANDBOX" : "PRODUCTION"),
    isEnabled: gateway.isEnabled,
    isDefault: gateway.isDefault,
    instructions: gateway.instructions,
  };
}

/**
 * Retorna todos os gateways ativos e configurados para seleção no checkout de agendamento
 */
export async function getActivePaymentOptions() {
  await initializeDefaultGateways();

  const activeGateways = await prisma.gatewayConfiguration.findMany({
    where: { isEnabled: true },
    orderBy: [{ isDefault: "desc" }, { slotNumber: "asc" }],
  });

  if (activeGateways.length === 0) {
    return [
      {
        provider: "IN_PERSON" as PaymentProviderKey,
        name: "Pagamento Presencial",
        isDefault: true,
        instructions: "O pagamento poderá ser realizado diretamente na recepção em dinheiro, cartão ou Pix no dia do atendimento.",
        isSandbox: false,
      },
    ];
  }

  return activeGateways.map((g) => ({
    provider: g.providerKey as PaymentProviderKey,
    name: g.name,
    isDefault: g.isDefault,
    instructions: g.instructions,
    isSandbox: g.isSandbox,
  }));
}
