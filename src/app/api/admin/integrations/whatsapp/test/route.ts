import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { checkActionCooldown, getHealthStatusMeta } from "@/lib/integrations-health";
import { sendWhatsAppMessage } from "@/lib/integrations-whatsapp";
import { maskRecipient } from "@/lib/notifications";
import { handleAdminApiError } from "@/lib/integrations-response";

const testWhatsappSchema = z.object({
  phone: z.string().trim().min(8, "Informe um número de WhatsApp válido com DDD."),
});

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const cooldown = checkActionCooldown(`test-wa:${admin.userId}`, 2000);
    if (!cooldown.allowed) {
      return NextResponse.json(
        { error: `Aguarde ${cooldown.retryAfterSeconds}s antes de enviar outra mensagem de teste.` },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = testWhatsappSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Número de WhatsApp inválido para teste." },
        { status: 400 }
      );
    }

    const sys = await prisma.systemSettings.findFirst();
    const targetPhone = parsed.data.phone;
    const masked = maskRecipient(targetPhone, "WHATSAPP");

    const res = await sendWhatsAppMessage(sys, {
      to: targetPhone,
      message: `Consultório PSI: Mensagem de teste enviada com sucesso em ${new Date().toLocaleTimeString(
        "pt-BR",
        { hour: "2-digit", minute: "2-digit" }
      )}.`,
      useTemplateIfConfigured: true,
    });

    const now = new Date();

    if (res.healthStatus !== "DISABLED" && res.healthStatus !== "NOT_CONFIGURED") {
      await prisma.notificationDelivery.create({
        data: {
          recipient: targetPhone,
          maskedRecipient: masked,
          channel: "WHATSAPP",
          templateType: "APPOINTMENT_CONFIRMED",
          messageType: "INTEGRATION_TEST",
          subjectOrCategory: "Mensagem de teste do WhatsApp",
          status: res.ok ? "ACCEPTED" : "FAILED",
          simulated: false,
          provider: res.provider,
          providerMessageId: res.providerMessageId || undefined,
          attemptedAt: now,
          acceptedAt: res.ok ? now : undefined,
          failedAt: res.ok ? undefined : now,
          attemptCount: 1,
          errorCode: res.ok ? null : res.errorCode || "WHATSAPP_TEST_FAILED",
          sanitizedErrorMessage: res.ok ? null : res.sanitizedErrorMessage,
          errorDetails: res.ok ? null : res.sanitizedErrorMessage,
        },
      });
    }

    if (sys) {
      await prisma.systemSettings.update({
        where: { id: sys.id },
        data: {
          whatsappHealthStatus: res.healthStatus,
          whatsappHealthMessage: res.ok
            ? `Mensagem de teste aceita via ${res.provider} para ${masked}.`
            : res.sanitizedErrorMessage || "Falha ao enviar mensagem de teste no WhatsApp.",
          whatsappLastCheckedAt: now,
          ...(res.ok ? { whatsappLastTestedAt: now } : {}),
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: admin.userId,
        userRole: "ADMIN",
        action: "TEST_WHATSAPP_DISPATCHED",
        resource: "SystemSettings",
        resourceId: sys?.id || "default",
        details: JSON.stringify({
          maskedRecipient: masked,
          provider: res.provider,
          ok: res.ok,
          healthStatus: res.healthStatus,
          errorCode: res.errorCode || null,
        }),
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      },
    });

    const healthMeta = getHealthStatusMeta(res.healthStatus, sys?.whatsappEnabled ?? false);

    if (!res.ok) {
      const status =
        res.healthStatus === "DISABLED" || res.healthStatus === "NOT_CONFIGURED" ? 400 : 502;
      return NextResponse.json(
        {
          ok: false,
          error: res.sanitizedErrorMessage || "Falha no envio de teste pelo WhatsApp.",
          healthStatus: res.healthStatus,
          healthMeta,
          errorCode: res.errorCode || null,
          checkedAt: now.toISOString(),
        },
        { status }
      );
    }

    return NextResponse.json({
      ok: true,
      success: true,
      message: `Mensagem de teste enviada com sucesso via ${
        res.provider === "OPENWA" ? "OpenWA" : "Meta Cloud API"
      } para ${masked}.`,
      healthStatus: res.healthStatus,
      healthMeta,
      providerMessageId: res.providerMessageId || null,
      checkedAt: now.toISOString(),
      testedAt: now.toISOString(),
    });
  } catch (error: unknown) {
    return handleAdminApiError(error, "Erro ao testar envio pelo WhatsApp.");
  }
}
