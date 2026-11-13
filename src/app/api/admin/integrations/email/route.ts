import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { isRestoreInProgress, RESTORE_MAINTENANCE_MESSAGE } from "@/lib/backup";
import { encryptSecret } from "@/lib/secrets";
import { isSmsRecoveryReady } from "@/lib/integrations-health";
import { getEmailCapability } from "@/lib/integrations-email";
import { buildIntegrationSnapshot, handleAdminApiError } from "@/lib/integrations-response";

const emailConfigSchema = z.object({
  enabled: z.boolean(),
  mode: z.enum(["DEFAULT", "CUSTOM"]).optional().default("CUSTOM"),
  host: z.string().trim().max(255).optional().nullable(),
  port: z.union([z.number().int().min(1).max(65535), z.string().trim()]).optional().nullable(),
  encryption: z.enum(["TLS", "SSL", "NONE"]).optional().default("TLS"),
  user: z.string().trim().max(255).optional().nullable(),
  password: z.string().max(512).optional().nullable(),
  clearPassword: z.boolean().optional(),
  senderName: z.string().trim().max(120).optional().nullable(),
  senderEmail: z
    .string()
    .trim()
    .email("E-mail de remetente inválido.")
    .optional()
    .or(z.literal(""))
    .nullable(),
  replyTo: z
    .string()
    .trim()
    .email("E-mail de resposta inválido.")
    .optional()
    .or(z.literal(""))
    .nullable(),
  recoveryStrategy: z.enum(["ADMIN_ASSISTED", "SMS"]).optional(),
});

async function handleSaveEmail(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (await isRestoreInProgress()) {
      return NextResponse.json({ error: RESTORE_MAINTENANCE_MESSAGE }, { status: 503 });
    }

    const body = await req.json().catch(() => null);
    const result = emailConfigSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Dados inválidos na configuração de e-mail.", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const {
      enabled,
      mode,
      host,
      port,
      encryption,
      user,
      password,
      clearPassword,
      senderName,
      senderEmail,
      replyTo,
      recoveryStrategy,
    } = result.data;

    const currentSys = await prisma.systemSettings.findFirst();

    let nextRecoveryStrategy = recoveryStrategy || currentSys?.emailDisabledRecoveryStrategy || "ADMIN_ASSISTED";
    if (nextRecoveryStrategy === "SMS" && !isSmsRecoveryReady(currentSys)) {
      return NextResponse.json(
        {
          error:
            "A recuperação alternativa via SMS exige que o canal SMS — TextBee esteja ativado e com API Key e dispositivo configurados.",
        },
        { status: 400 }
      );
    }

    let parsedPort = currentSys?.smtpPort || (encryption === "SSL" ? 465 : 587);
    if (typeof port === "number" && Number.isInteger(port) && port > 0 && port <= 65535) {
      parsedPort = port;
    } else if (typeof port === "string" && port.trim() !== "") {
      const numeric = Number(port);
      if (!Number.isInteger(numeric) || numeric < 1 || numeric > 65535) {
        return NextResponse.json({ error: "Porta SMTP inválida (1 a 65535)." }, { status: 400 });
      }
      parsedPort = numeric;
    }

    // Preserva os campos SMTP personalizados mesmo quando o modo selecionado for E-mail Padrão (DEFAULT)
    const nextHost = host !== undefined ? (host?.trim() || null) : (currentSys?.smtpHost ?? null);
    const nextUser = user !== undefined ? (user?.trim() || null) : (currentSys?.smtpUser ?? null);
    const nextSenderName =
      senderName !== undefined ? (senderName?.trim() || null) : (currentSys?.smtpSenderName ?? null);
    const nextSenderEmail =
      senderEmail !== undefined ? (senderEmail?.trim() || null) : (currentSys?.smtpFrom ?? null);
    const nextReplyTo =
      replyTo !== undefined ? (replyTo?.trim() || null) : (currentSys?.smtpReplyTo ?? null);

    let nextPass = currentSys?.smtpPass ?? null;
    if (clearPassword) {
      nextPass = null;
    } else if (typeof password === "string" && password.trim() !== "") {
      nextPass = encryptSecret(password);
    }

    const candidateCap = getEmailCapability({
      smtpEnabled: enabled,
      emailMode: mode,
      smtpHost: nextHost,
      smtpPort: parsedPort,
      smtpEncryption: encryption,
      smtpUser: nextUser,
      smtpPass: nextPass,
      smtpFrom: nextSenderEmail,
      smtpSenderName: nextSenderName,
      smtpReplyTo: nextReplyTo,
    });

    const emailHealthStatus = !enabled
      ? "DISABLED"
      : !candidateCap.configured
      ? "NOT_CONFIGURED"
      : "UNVERIFIED";

    const emailHealthMessage = !enabled
      ? "Canal de e-mail desativado pelo administrador."
      : !candidateCap.configured
      ? candidateCap.reason
      : "Configurações salvas. Clique em Verificar Conexão para testar o servidor SMTP.";

    const dataToSave = {
      smtpEnabled: enabled,
      emailMode: mode,
      smtpHost: nextHost,
      smtpPort: parsedPort,
      smtpEncryption: encryption,
      smtpUser: nextUser,
      smtpPass: nextPass,
      smtpSenderName: nextSenderName,
      smtpFrom: nextSenderEmail,
      smtpReplyTo: nextReplyTo,
      emailDisabledRecoveryStrategy: nextRecoveryStrategy,
      emailHealthStatus,
      emailHealthMessage,
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
        action: "INTEGRATION_EMAIL_UPDATED",
        resource: "SystemSettings",
        resourceId: updated.id,
        details: JSON.stringify({
          enabled,
          mode,
          encryption,
          port: parsedPort,
          hasCustomHost: Boolean(nextHost),
          hasPassword: Boolean(nextPass),
          recoveryStrategy: nextRecoveryStrategy,
        }),
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Configurações de e-mail salvas com sucesso!",
      integration: buildIntegrationSnapshot(updated, { req }).email,
    });
  } catch (error: unknown) {
    return handleAdminApiError(error, "Erro ao salvar configuração de e-mail.");
  }
}

export const POST = handleSaveEmail;
export const PUT = handleSaveEmail;
