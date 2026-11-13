import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { checkActionCooldown, getHealthStatusMeta } from "@/lib/integrations-health";
import { sendSmsMessage } from "@/lib/integrations-sms";
import { maskRecipient } from "@/lib/notifications";
import { handleAdminApiError } from "@/lib/integrations-response";

const testSmsSchema = z.object({
  phone: z.string().trim().min(8, "Informe um número de celular válido com DDD para o teste."),
});

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const cooldown = checkActionCooldown(`test-sms:${admin.userId}`, 2000);
    if (!cooldown.allowed) {
      return NextResponse.json(
        { error: `Aguarde ${cooldown.retryAfterSeconds}s antes de enviar outro SMS de teste.` },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = testSmsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Telefone inválido para envio de teste." },
        { status: 400 }
      );
    }

    const sys = await prisma.systemSettings.findFirst();
    const targetPhone = parsed.data.phone;
    const masked = maskRecipient(targetPhone, "SMS");

    const res = await sendSmsMessage(sys, {
      to: targetPhone,
      message: `Consultorio PSI: SMS de teste enviado com sucesso em ${new Date().toLocaleTimeString(
        "pt-BR",
        { hour: "2-digit", minute: "2-digit" }
      )}.`,
    });

    const now = new Date();

    if (res.healthStatus !== "DISABLED" && res.healthStatus !== "NOT_CONFIGURED") {
      await prisma.notificationDelivery.create({
        data: {
          recipient: targetPhone,
          maskedRecipient: masked,
          channel: "SMS",
          templateType: "APPOINTMENT_CONFIRMED",
          messageType: "INTEGRATION_TEST",
          subjectOrCategory: "SMS de teste da integração TextBee",
          status: res.ok ? "ACCEPTED" : "FAILED",
          simulated: false,
          provider: res.provider,
          providerMessageId: res.providerMessageId || undefined,
          attemptedAt: now,
          acceptedAt: res.ok ? now : undefined,
          failedAt: res.ok ? undefined : now,
          attemptCount: 1,
          errorCode: res.ok ? null : res.errorCode || "SMS_TEST_FAILED",
          sanitizedErrorMessage: res.ok ? null : res.sanitizedErrorMessage,
          errorDetails: res.ok ? null : res.sanitizedErrorMessage,
        },
      });
    }

    if (sys) {
      await prisma.systemSettings.update({
        where: { id: sys.id },
        data: {
          smsHealthStatus: res.healthStatus,
          smsHealthMessage: res.ok
            ? `SMS de teste aceito pelo TextBee para ${masked}.`
            : res.sanitizedErrorMessage || "Falha ao enviar SMS de teste.",
          smsLastCheckedAt: now,
          ...(res.ok ? { smsLastTestedAt: now } : {}),
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: admin.userId,
        userRole: "ADMIN",
        action: "TEST_SMS_DISPATCHED",
        resource: "SystemSettings",
        resourceId: sys?.id || "default",
        details: JSON.stringify({
          maskedRecipient: masked,
          ok: res.ok,
          healthStatus: res.healthStatus,
          errorCode: res.errorCode || null,
        }),
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      },
    });

    const healthMeta = getHealthStatusMeta(res.healthStatus, sys?.smsEnabled ?? false);

    if (!res.ok) {
      const status =
        res.healthStatus === "DISABLED" || res.healthStatus === "NOT_CONFIGURED" ? 400 : 502;
      return NextResponse.json(
        {
          ok: false,
          error: res.sanitizedErrorMessage || "Falha ao enviar SMS de teste.",
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
      message: `SMS de teste enviado e aceito pelo TextBee para ${masked}.`,
      healthStatus: res.healthStatus,
      healthMeta,
      providerMessageId: res.providerMessageId || null,
      checkedAt: now.toISOString(),
      testedAt: now.toISOString(),
    });
  } catch (error: unknown) {
    return handleAdminApiError(error, "Erro ao enviar SMS de teste.");
  }
}
