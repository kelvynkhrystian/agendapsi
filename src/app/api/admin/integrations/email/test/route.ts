import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { checkActionCooldown, getHealthStatusMeta } from "@/lib/integrations-health";
import { sendEmailMessage } from "@/lib/integrations-email";
import { maskRecipient } from "@/lib/notifications";
import { handleAdminApiError } from "@/lib/integrations-response";

const testEmailSchema = z.object({
  email: z.string().trim().email("Informe um endereço de e-mail válido para receber o teste."),
});

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const cooldown = checkActionCooldown(`test-email:${admin.userId}`, 2000);
    if (!cooldown.allowed) {
      return NextResponse.json(
        { error: `Aguarde ${cooldown.retryAfterSeconds}s antes de enviar outro e-mail de teste.` },
        { status: 429 }
      );
    }

    const sys = await prisma.systemSettings.findFirst();
    const body = await req.json().catch(() => ({}));
    const fallbackEmail =
      (typeof body?.email === "string" && body.email.trim()) ||
      sys?.smtpFrom ||
      sys?.smtpUser ||
      admin.email;

    const parsed = testEmailSchema.safeParse({ email: fallbackEmail });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Informe um e-mail de destino válido para o teste." },
        { status: 400 }
      );
    }

    const targetEmail = parsed.data.email;
    const res = await sendEmailMessage(sys, {
      to: targetEmail,
      subject: "Teste de E-mail — Consultório PSI",
      text: `Olá!\n\nEste é um e-mail de teste real enviado pelo painel administrativo do PSI em ${new Date().toLocaleString(
        "pt-BR"
      )}.\n\nSe você recebeu esta mensagem, sua integração SMTP está operacional.`,
    });

    const now = new Date();
    const masked = maskRecipient(targetEmail, "EMAIL");

    // Registra histórico honesto na tabela de entregas quando a tentativa é executada
    if (res.healthStatus !== "DISABLED" && res.healthStatus !== "NOT_CONFIGURED") {
      await prisma.notificationDelivery.create({
        data: {
          recipient: targetEmail,
          maskedRecipient: masked,
          channel: "EMAIL",
          templateType: "APPOINTMENT_CONFIRMED",
          messageType: "INTEGRATION_TEST",
          subjectOrCategory: "E-mail de teste da integração",
          status: res.ok ? "ACCEPTED" : "FAILED",
          simulated: false,
          provider: res.provider,
          providerMessageId: res.providerMessageId || undefined,
          attemptedAt: now,
          acceptedAt: res.ok ? now : undefined,
          failedAt: res.ok ? undefined : now,
          attemptCount: 1,
          errorCode: res.ok ? null : res.errorCode || "EMAIL_TEST_FAILED",
          sanitizedErrorMessage: res.ok ? null : res.sanitizedErrorMessage,
          errorDetails: res.ok ? null : res.sanitizedErrorMessage,
        },
      });
    }

    if (sys) {
      await prisma.systemSettings.update({
        where: { id: sys.id },
        data: {
          emailHealthStatus: res.healthStatus,
          emailHealthMessage: res.ok
            ? `E-mail de teste aceito pelo servidor SMTP (${masked}).`
            : res.sanitizedErrorMessage || "Falha ao enviar e-mail de teste.",
          emailLastCheckedAt: now,
          ...(res.ok ? { emailLastTestedAt: now } : {}),
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: admin.userId,
        userRole: "ADMIN",
        action: "TEST_EMAIL_DISPATCHED",
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

    const healthMeta = getHealthStatusMeta(res.healthStatus, sys?.smtpEnabled ?? false);

    if (!res.ok) {
      const status =
        res.healthStatus === "DISABLED" || res.healthStatus === "NOT_CONFIGURED" ? 400 : 502;
      return NextResponse.json(
        {
          ok: false,
          error: res.sanitizedErrorMessage || "Falha ao enviar e-mail de teste.",
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
      message: `E-mail de teste enviado e aceito pelo servidor para ${masked}.`,
      healthStatus: res.healthStatus,
      healthMeta,
      providerMessageId: res.providerMessageId || null,
      checkedAt: now.toISOString(),
      testedAt: now.toISOString(),
    });
  } catch (error: unknown) {
    return handleAdminApiError(error, "Erro ao testar envio de e-mail.");
  }
}
