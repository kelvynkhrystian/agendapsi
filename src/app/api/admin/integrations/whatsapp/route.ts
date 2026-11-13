import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { isRestoreInProgress, RESTORE_MAINTENANCE_MESSAGE } from "@/lib/backup";
import { encryptSecret } from "@/lib/secrets";
import { getWhatsAppCapability, resolveOpenWaBaseUrl } from "@/lib/integrations-whatsapp";
import { buildIntegrationSnapshot, handleAdminApiError } from "@/lib/integrations-response";

const whatsappConfigSchema = z.object({
  enabled: z.boolean(),
  provider: z.enum(["META_OFFICIAL", "OPENWA"]),
  // Meta Official Cloud API
  metaPhoneNumberId: z.string().trim().max(191).optional().nullable(),
  metaWabaId: z.string().trim().max(191).optional().nullable(),
  metaAccessToken: z.string().max(1024).optional().nullable(),
  clearMetaAccessToken: z.boolean().optional(),
  metaVerifyToken: z.string().trim().max(255).optional().nullable(),
  metaAppSecret: z.string().max(512).optional().nullable(),
  clearMetaAppSecret: z.boolean().optional(),
  metaTemplateName: z.string().trim().max(120).optional().nullable(),
  metaTemplateLanguage: z.string().trim().max(20).optional().nullable(),
  // OpenWA
  openWaApiUrl: z.string().trim().max(500).optional().nullable(),
  openWaApiKey: z.string().max(512).optional().nullable(),
  clearOpenWaApiKey: z.boolean().optional(),
  openWaSessionId: z.string().trim().max(100).optional().nullable(),
});

async function handleSaveWhatsapp(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (await isRestoreInProgress()) {
      return NextResponse.json({ error: RESTORE_MAINTENANCE_MESSAGE }, { status: 503 });
    }

    const body = await req.json().catch(() => null);
    const result = whatsappConfigSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Dados inválidos na configuração do WhatsApp.", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = result.data;
    const currentSys = await prisma.systemSettings.findFirst();

    // Preserva credenciais da Meta de forma independente
    const nextMetaPhoneNumberId =
      data.metaPhoneNumberId !== undefined
        ? data.metaPhoneNumberId?.trim() || null
        : (currentSys?.whatsappMetaPhoneNumberId ?? null);

    const nextMetaWabaId =
      data.metaWabaId !== undefined
        ? data.metaWabaId?.trim() || null
        : (currentSys?.whatsappMetaWabaId ?? null);

    let nextMetaAccessToken = currentSys?.whatsappMetaAccessToken ?? null;
    if (data.clearMetaAccessToken) {
      nextMetaAccessToken = null;
    } else if (typeof data.metaAccessToken === "string" && data.metaAccessToken.trim() !== "") {
      nextMetaAccessToken = encryptSecret(data.metaAccessToken);
    }

    const nextMetaVerifyToken =
      data.metaVerifyToken !== undefined
        ? data.metaVerifyToken?.trim() || null
        : (currentSys?.whatsappMetaVerifyToken ?? null);

    let nextMetaAppSecret = currentSys?.whatsappMetaAppSecret ?? null;
    if (data.clearMetaAppSecret) {
      nextMetaAppSecret = null;
    } else if (typeof data.metaAppSecret === "string" && data.metaAppSecret.trim() !== "") {
      nextMetaAppSecret = encryptSecret(data.metaAppSecret);
    }

    const nextMetaTemplateName =
      data.metaTemplateName !== undefined
        ? data.metaTemplateName?.trim() || null
        : (currentSys?.whatsappMetaTemplateName ?? null);

    const nextMetaTemplateLanguage =
      data.metaTemplateLanguage !== undefined
        ? data.metaTemplateLanguage?.trim() || "pt_BR"
        : (currentSys?.whatsappMetaTemplateLanguage ?? "pt_BR");

    // Preserva credenciais do OpenWA de forma independente
    let nextOpenWaUrl = currentSys?.openWaApiUrl ?? null;
    if (data.openWaApiUrl !== undefined) {
      const trimmedUrl = (data.openWaApiUrl || "").trim();
      if (!trimmedUrl) {
        nextOpenWaUrl = null;
      } else {
        const checked = resolveOpenWaBaseUrl(trimmedUrl);
        if (!checked.valid) {
          if (data.provider === "OPENWA") {
            return NextResponse.json({ error: checked.error }, { status: 400 });
          }
        } else {
          nextOpenWaUrl = checked.url;
        }
      }
    }

    let nextOpenWaApiKey = currentSys?.openWaApiKey ?? null;
    if (data.clearOpenWaApiKey) {
      nextOpenWaApiKey = null;
    } else if (typeof data.openWaApiKey === "string" && data.openWaApiKey.trim() !== "") {
      nextOpenWaApiKey = encryptSecret(data.openWaApiKey);
    }

    const nextOpenWaSessionId =
      data.openWaSessionId !== undefined
        ? data.openWaSessionId?.trim() || "default"
        : (currentSys?.openWaSessionId ?? "default");

    const openWaEndpointChanged =
      nextOpenWaUrl !== (currentSys?.openWaApiUrl ?? null) ||
      nextOpenWaSessionId !== (currentSys?.openWaSessionId ?? "default");

    const candidateCap = getWhatsAppCapability({
      whatsappEnabled: data.enabled,
      whatsappProvider: data.provider,
      whatsappMetaPhoneNumberId: nextMetaPhoneNumberId,
      whatsappMetaWabaId: nextMetaWabaId,
      whatsappMetaAccessToken: nextMetaAccessToken,
      whatsappMetaVerifyToken: nextMetaVerifyToken,
      whatsappMetaAppSecret: nextMetaAppSecret,
      whatsappMetaTemplateName: nextMetaTemplateName,
      whatsappMetaTemplateLanguage: nextMetaTemplateLanguage,
      openWaApiUrl: nextOpenWaUrl,
      openWaApiKey: nextOpenWaApiKey,
      openWaSessionId: nextOpenWaSessionId,
      openWaConnectedNumber: openWaEndpointChanged ? null : currentSys?.openWaConnectedNumber,
    });

    const whatsappHealthStatus = !data.enabled
      ? "DISABLED"
      : !candidateCap.configured
      ? "NOT_CONFIGURED"
      : "UNVERIFIED";

    const whatsappHealthMessage = !data.enabled
      ? "Canal WhatsApp desativado pelo administrador."
      : !candidateCap.configured
      ? candidateCap.reason
      : "Configurações salvas. Clique em Verificar Conexão para validar o provedor selecionado.";

    const dataToSave = {
      whatsappEnabled: data.enabled,
      whatsappProvider: data.provider,
      whatsappMetaPhoneNumberId: nextMetaPhoneNumberId,
      whatsappMetaWabaId: nextMetaWabaId,
      whatsappMetaAccessToken: nextMetaAccessToken,
      whatsappMetaVerifyToken: nextMetaVerifyToken,
      whatsappMetaAppSecret: nextMetaAppSecret,
      whatsappMetaTemplateName: nextMetaTemplateName,
      whatsappMetaTemplateLanguage: nextMetaTemplateLanguage,
      openWaApiUrl: nextOpenWaUrl,
      openWaApiKey: nextOpenWaApiKey,
      openWaSessionId: nextOpenWaSessionId,
      ...(openWaEndpointChanged ? { openWaConnectedNumber: null } : {}),
      whatsappHealthStatus,
      whatsappHealthMessage,
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
        action: "INTEGRATION_WHATSAPP_UPDATED",
        resource: "SystemSettings",
        resourceId: updated.id,
        details: JSON.stringify({
          enabled: data.enabled,
          provider: data.provider,
          hasMetaPhoneId: Boolean(nextMetaPhoneNumberId),
          hasMetaAccessToken: Boolean(nextMetaAccessToken),
          hasOpenWaUrl: Boolean(nextOpenWaUrl),
          hasOpenWaApiKey: Boolean(nextOpenWaApiKey),
        }),
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Configurações do WhatsApp salvas com sucesso!",
      integration: buildIntegrationSnapshot(updated, { req }).whatsapp,
    });
  } catch (error: unknown) {
    return handleAdminApiError(error, "Erro ao salvar configuração do WhatsApp.");
  }
}

export const POST = handleSaveWhatsapp;
export const PUT = handleSaveWhatsapp;
