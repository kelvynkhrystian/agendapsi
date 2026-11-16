import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encryptSecret, decryptSecret } from "@/lib/secrets";
import {
  getGatewayConfigs,
  DEFAULT_GATEWAYS_METADATA,
  initializeDefaultGateways,
} from "@/lib/payments/registry";
import { PaymentProviderKey } from "@/lib/payments/types";
import { isRestoreInProgress, RESTORE_MAINTENANCE_MESSAGE } from "@/lib/backup";

const updateGatewaySchema = z.object({
  providerKey: z.enum(["MERCADO_PAGO", "ASAAS", "PAGBANK", "IN_PERSON"]),
  isEnabled: z.boolean(),
  isSandbox: z.boolean().optional(),
  environment: z.enum(["SANDBOX", "PRODUCTION"]).optional(),
  isDefault: z.boolean().optional(),
  accessToken: z.string().optional(),
  apiKey: z.string().optional(),
  token: z.string().optional(),
  publicKey: z.string().optional(),
  webhookSecret: z.string().optional(),
  instructions: z.string().max(1000).optional().nullable(),
  clearCredentials: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    if (await isRestoreInProgress()) {
      return NextResponse.json({ error: RESTORE_MAINTENANCE_MESSAGE }, { status: 503 });
    }

    const origin = req.nextUrl.origin;
    const configs = await getGatewayConfigs(origin);

    return NextResponse.json({
      success: true,
      gateways: configs,
    });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao listar gateways de pagamento:", error);
    return NextResponse.json({ error: "Erro interno ao carregar configurações." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (await isRestoreInProgress()) {
      return NextResponse.json({ error: RESTORE_MAINTENANCE_MESSAGE }, { status: 503 });
    }

    const body = await req.json().catch(() => null);
    const result = updateGatewaySchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Dados inválidos.", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = result.data;
    await initializeDefaultGateways();

    const existing = await prisma.gatewayConfiguration.findUnique({
      where: { providerKey: data.providerKey },
    });

    if (!existing) {
      return NextResponse.json({ error: "Gateway não encontrado." }, { status: 404 });
    }

    // Se marcado como padrão, desmarca os outros
    if (data.isDefault) {
      await prisma.gatewayConfiguration.updateMany({
        where: { providerKey: { not: data.providerKey } },
        data: { isDefault: false },
      });
    }

    // Carrega credenciais anteriores para preservá-las caso não tenham sido reenviadas
    let existingCreds: any = {};
    if (existing.configDataEncrypted) {
      try {
        const dec = decryptSecret(existing.configDataEncrypted);
        if (dec) existingCreds = JSON.parse(dec);
      } catch {
        existingCreds = {};
      }
    }

    let updatedCreds: any = { ...existingCreds };

    if (data.clearCredentials) {
      updatedCreds = {};
    } else {
      if (data.accessToken !== undefined) {
        if (data.accessToken.trim()) {
          updatedCreds.accessToken = data.accessToken.trim();
        }
      }
      if (data.apiKey !== undefined) {
        if (data.apiKey.trim()) {
          updatedCreds.apiKey = data.apiKey.trim();
        }
      }
      if (data.token !== undefined) {
        if (data.token.trim()) {
          updatedCreds.token = data.token.trim();
        }
      }
      if (data.publicKey !== undefined) {
        if (data.publicKey.trim()) {
          updatedCreds.publicKey = data.publicKey.trim();
        }
      }
      if (data.webhookSecret !== undefined) {
        if (data.webhookSecret.trim()) {
          updatedCreds.webhookSecret = data.webhookSecret.trim();
        }
      }
    }

    const hasAnyCred = Object.keys(updatedCreds).length > 0;
    const configDataEncrypted = hasAnyCred
      ? encryptSecret(JSON.stringify(updatedCreds))
      : null;

    let webhookSecretEncrypted = existing.webhookSecretEncrypted;
    if (data.clearCredentials) {
      webhookSecretEncrypted = null;
    } else if (data.webhookSecret && data.webhookSecret.trim()) {
      webhookSecretEncrypted = encryptSecret(data.webhookSecret.trim());
    }

    const isSandbox =
      data.isSandbox !== undefined
        ? data.isSandbox
        : data.environment
        ? data.environment === "SANDBOX"
        : existing.isSandbox;

    const environment = data.environment || (isSandbox ? "SANDBOX" : "PRODUCTION");

    // Atualiza o gateway
    const updated = await prisma.gatewayConfiguration.update({
      where: { providerKey: data.providerKey },
      data: {
        isEnabled: data.isEnabled,
        isSandbox,
        environment,
        isDefault: data.isDefault !== undefined ? data.isDefault : existing.isDefault,
        configDataEncrypted,
        webhookSecretEncrypted,
        instructions: data.instructions !== undefined ? data.instructions : existing.instructions,
        healthStatus: data.isEnabled
          ? data.providerKey === "IN_PERSON" || hasAnyCred
            ? existing.healthStatus === "NOT_CONFIGURED"
              ? "CONNECTED"
              : existing.healthStatus
            : "NOT_CONFIGURED"
          : "DISCONNECTED",
      },
    });

    // Registra auditoria
    await prisma.auditLog.create({
      data: {
        userId: admin.userId,
        userRole: admin.role,
        action: "UPDATE_PAYMENT_GATEWAY",
        resource: "GatewayConfiguration",
        resourceId: updated.id,
        details: `Gateway ${data.providerKey} atualizado. Ativo: ${data.isEnabled}, Ambiente: ${environment}`,
      },
    });

    const configs = await getGatewayConfigs(req.nextUrl.origin);
    const updatedDTO = configs.find((c) => c.providerKey === data.providerKey);

    return NextResponse.json({
      success: true,
      message: `Configurações de ${updated.name} salvas com sucesso.`,
      gateway: updatedDTO,
    });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao salvar gateway de pagamento:", error);
    return NextResponse.json({ error: "Erro ao salvar alterações do gateway." }, { status: 500 });
  }
}
