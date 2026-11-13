import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { isRestoreInProgress, RESTORE_MAINTENANCE_MESSAGE } from "@/lib/backup";
import { encryptSecret } from "@/lib/secrets";
import { isSmsRecoveryReady } from "@/lib/integrations-health";
import { getSmsCapability, resolveTextBeeBaseUrl } from "@/lib/integrations-sms";
import { buildIntegrationSnapshot, handleAdminApiError } from "@/lib/integrations-response";

const smsConfigSchema = z.object({
  enabled: z.boolean(),
  hostingMode: z.enum(["CLOUD", "SELF_HOSTED"]).default("CLOUD"),
  apiUrl: z.string().trim().max(500).optional().nullable(),
  apiKey: z.string().max(512).optional().nullable(),
  clearApiKey: z.boolean().optional(),
  deviceId: z.string().trim().max(191).optional().nullable(),
});

async function handleSaveSms(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (await isRestoreInProgress()) {
      return NextResponse.json({ error: RESTORE_MAINTENANCE_MESSAGE }, { status: 503 });
    }

    const body = await req.json().catch(() => null);
    const result = smsConfigSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Dados inválidos na configuração de SMS.", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { enabled, hostingMode, apiUrl, apiKey, clearApiKey, deviceId } = result.data;
    const currentSys = await prisma.systemSettings.findFirst();

    let nextApiUrl = currentSys?.textbeeApiUrl ?? null;
    if (hostingMode === "SELF_HOSTED") {
      if (apiUrl !== undefined) {
        const trimmed = (apiUrl || "").trim();
        if (!trimmed) {
          nextApiUrl = null;
        } else {
          const checked = resolveTextBeeBaseUrl("SELF_HOSTED", trimmed);
          if (!checked.valid) {
            return NextResponse.json({ error: checked.error }, { status: 400 });
          }
          nextApiUrl = checked.url;
        }
      }
    } else if (apiUrl !== undefined && (apiUrl || "").trim()) {
      // Se admin enviou URL self-hosted anterior junto ao form, só atualiza se válida
      const checked = resolveTextBeeBaseUrl("SELF_HOSTED", apiUrl);
      if (checked.valid) {
        nextApiUrl = checked.url;
      }
    }

    let nextApiKey = currentSys?.textbeeApiKey ?? null;
    if (clearApiKey) {
      nextApiKey = null;
    } else if (typeof apiKey === "string" && apiKey.trim() !== "") {
      nextApiKey = encryptSecret(apiKey);
    }

    const nextDeviceId =
      deviceId !== undefined ? (deviceId?.trim() || null) : (currentSys?.textbeeDeviceId ?? null);

    const candidateCap = getSmsCapability({
      smsEnabled: enabled,
      smsProvider: "TEXTBEE",
      textbeeHostingMode: hostingMode,
      textbeeApiUrl: nextApiUrl,
      textbeeApiKey: nextApiKey,
      textbeeDeviceId: nextDeviceId,
    });

    const smsHealthStatus = !enabled
      ? "DISABLED"
      : !candidateCap.configured
      ? "NOT_CONFIGURED"
      : "UNVERIFIED";

    const smsHealthMessage = !enabled
      ? "Canal SMS desativado pelo administrador."
      : !candidateCap.configured
      ? candidateCap.reason
      : "Configurações salvas. Clique em Verificar Conexão para validar o aparelho Android.";

    const nextSmsReadyForRecovery = isSmsRecoveryReady({
      smsEnabled: enabled,
      textbeeApiKey: nextApiKey,
      textbeeDeviceId: nextDeviceId,
      smsHealthStatus,
    });

    let recoveryFallbackReset = false;
    let nextEmailRecoveryStrategy = currentSys?.emailDisabledRecoveryStrategy || "ADMIN_ASSISTED";
    if (nextEmailRecoveryStrategy === "SMS" && !nextSmsReadyForRecovery) {
      nextEmailRecoveryStrategy = "ADMIN_ASSISTED";
      recoveryFallbackReset = true;
    }

    const dataToSave = {
      smsEnabled: enabled,
      smsProvider: "TEXTBEE",
      textbeeHostingMode: hostingMode,
      textbeeApiUrl: nextApiUrl,
      textbeeApiKey: nextApiKey,
      textbeeDeviceId: nextDeviceId,
      smsHealthStatus,
      smsHealthMessage,
      emailDisabledRecoveryStrategy: nextEmailRecoveryStrategy,
    };

    const updated = await prisma.systemSettings.upsert({
      where: { id: currentSys?.id || "default" },
      update: dataToSave,
      create: {
        id: "default",
        ...dataToSave,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: admin.userId,
        userRole: "ADMIN",
        action: "INTEGRATION_SMS_UPDATED",
        resource: "SystemSettings",
        resourceId: updated.id,
        details: JSON.stringify({
          enabled,
          hostingMode,
          hasApiKey: Boolean(nextApiKey),
          hasDeviceId: Boolean(nextDeviceId),
          recoveryFallbackReset,
        }),
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      },
    });

    return NextResponse.json({
      success: true,
      message: recoveryFallbackReset
        ? "Configurações de SMS salvas. O fallback de recuperação de senha voltou para atendimento assistido pelo profissional."
        : "Configurações de SMS — TextBee salvas com sucesso!",
      recoveryFallbackReset,
      integration: buildIntegrationSnapshot(updated, { req }).sms,
    });
  } catch (error: unknown) {
    return handleAdminApiError(error, "Erro ao salvar configurações de SMS.");
  }
}

export const POST = handleSaveSms;
export const PUT = handleSaveSms;
