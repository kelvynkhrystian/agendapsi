import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { getEmailCapability, sendEmailMessage } from "@/lib/integrations-email";
import { getSmsCapability, sendSmsMessage } from "@/lib/integrations-sms";
import { getWhatsAppCapability, sendWhatsAppMessage } from "@/lib/integrations-whatsapp";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await context.params;

    const log = await prisma.notificationDelivery.findUnique({
      where: { id },
    });

    if (!log) {
      return NextResponse.json({ error: "Registro de mensagem não encontrado." }, { status: 404 });
    }

    // Regra de segurança: Não reenviar mensagens de consultas finalizadas ou canceladas
    if (log.relatedAppointmentId) {
      const appt = await prisma.appointment.findUnique({
        where: { id: log.relatedAppointmentId },
        select: { status: true, startAt: true },
      });

      if (appt) {
        if (["COMPLETED", "CANCELLED", "LATE_CANCELLED"].includes(appt.status)) {
          return NextResponse.json(
            {
              error:
                "Não é permitido reenviar lembretes ou notificações de consultas que já foram finalizadas ou canceladas.",
            },
            { status: 400 }
          );
        }

        if (appt.startAt < new Date()) {
          return NextResponse.json(
            { error: "O horário agendado para esta consulta já passou. O reenvio não é válido." },
            { status: 400 }
          );
        }
      }
    }

    // Regra de segurança: Não reenviar mensagens com tokens de recuperação de senha
    const msgType = (log.messageType || log.templateType || "").toUpperCase();
    if (msgType.includes("PASSWORD") || msgType.includes("RECOVERY") || msgType.includes("TOKEN")) {
      return NextResponse.json(
        {
          error:
            "Mensagens de redefinição de acesso contêm tokens temporários e não podem ser reenviadas diretamente pelo log por motivos de segurança.",
        },
        { status: 400 }
      );
    }

    let parsedMeta: { title?: string; subject?: string; message?: string; body?: string } | null = null;
    if (log.metadataJson) {
      try {
        parsedMeta = JSON.parse(log.metadataJson);
      } catch {}
    }

    const title = parsedMeta?.subject || parsedMeta?.title || log.subjectOrCategory || "Notificação PSI";
    const bodyText =
      parsedMeta?.message ||
      parsedMeta?.body ||
      log.subjectOrCategory ||
      "Lembrete automático do Consultório PSI.";

    const sys = await prisma.systemSettings.findFirst();
    const now = new Date();

    if (log.channel === "EMAIL") {
      const cap = getEmailCapability(sys);
      if (!cap.canSendRealEmails) {
        const updated = await prisma.notificationDelivery.update({
          where: { id },
          data: {
            status: "SIMULATED",
            simulated: true,
            provider: "SIMULATED",
            attemptCount: (log.attemptCount || 1) + 1,
            attemptedAt: now,
            errorDetails: cap.reason || "Canal de e-mail desativado ou não configurado; reenvio simulado.",
            sanitizedErrorMessage: null,
          },
        });
        await prisma.auditLog.create({
          data: {
            userId: admin.userId,
            userRole: "ADMIN",
            action: "MESSAGE_MANUALLY_RESENT",
            resource: "NotificationDelivery",
            resourceId: id,
            details: "Reenvio manual de E-mail registrado como SIMULATED (provedor inativo).",
          },
        });
        return NextResponse.json({
          success: true,
          message: "Reenvio processado como simulado (canal de e-mail desativado ou não configurado).",
          delivery: updated,
        });
      }

      const sendRes = await sendEmailMessage(sys, {
        to: log.recipient,
        subject: title,
        text: bodyText,
      });
      const doneAt = new Date();

      const updated = await prisma.notificationDelivery.update({
        where: { id },
        data: {
          status: sendRes.ok ? "ACCEPTED" : "FAILED",
          simulated: false,
          provider: sendRes.provider,
          providerMessageId: sendRes.providerMessageId || log.providerMessageId,
          attemptCount: (log.attemptCount || 1) + 1,
          attemptedAt: doneAt,
          acceptedAt: sendRes.ok ? doneAt : log.acceptedAt,
          failedAt: sendRes.ok ? null : doneAt,
          errorCode: sendRes.ok ? null : sendRes.errorCode || "EMAIL_RESEND_FAILED",
          sanitizedErrorMessage: sendRes.ok ? null : sendRes.sanitizedErrorMessage,
          errorDetails: sendRes.ok ? null : sendRes.sanitizedErrorMessage,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: admin.userId,
          userRole: "ADMIN",
          action: "MESSAGE_MANUALLY_RESENT",
          resource: "NotificationDelivery",
          resourceId: id,
          details: `Reenvio manual EMAIL pelo admin. Status: ${updated.status}`,
        },
      });

      if (!sendRes.ok) {
        return NextResponse.json(
          { error: sendRes.sanitizedErrorMessage || "Falha ao reenviar e-mail.", delivery: updated },
          { status: 502 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "E-mail aceito pelo servidor SMTP e reenviado com sucesso!",
        delivery: updated,
      });
    }

    if (log.channel === "SMS") {
      // Valida consentimento se houver paciente vinculado (exceto testes do admin)
      if (log.recipientReference && msgType !== "INTEGRATION_TEST") {
        const patient = await prisma.patient.findUnique({
          where: { id: log.recipientReference },
          select: { smsOptIn: true },
        });
        if (patient && !patient.smsOptIn) {
          return NextResponse.json(
            { error: "O paciente revogou o consentimento para recebimento de SMS." },
            { status: 400 }
          );
        }
      }

      const cap = getSmsCapability(sys);
      if (!cap.canSendRealSms) {
        return NextResponse.json(
          { error: cap.reason || "Canal SMS — TextBee desativado ou incompleto para reenvio real." },
          { status: 400 }
        );
      }

      const sendRes = await sendSmsMessage(sys, {
        to: log.recipient,
        message: bodyText,
      });
      const doneAt = new Date();

      const updated = await prisma.notificationDelivery.update({
        where: { id },
        data: {
          status: sendRes.ok ? "ACCEPTED" : "FAILED",
          simulated: false,
          provider: sendRes.provider,
          providerMessageId: sendRes.providerMessageId || log.providerMessageId,
          attemptCount: (log.attemptCount || 1) + 1,
          attemptedAt: doneAt,
          acceptedAt: sendRes.ok ? doneAt : log.acceptedAt,
          failedAt: sendRes.ok ? null : doneAt,
          errorCode: sendRes.ok ? null : sendRes.errorCode || "SMS_RESEND_FAILED",
          sanitizedErrorMessage: sendRes.ok ? null : sendRes.sanitizedErrorMessage,
          errorDetails: sendRes.ok ? null : sendRes.sanitizedErrorMessage,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: admin.userId,
          userRole: "ADMIN",
          action: "MESSAGE_MANUALLY_RESENT",
          resource: "NotificationDelivery",
          resourceId: id,
          details: `Reenvio manual SMS pelo admin. Status: ${updated.status}`,
        },
      });

      if (!sendRes.ok) {
        return NextResponse.json(
          { error: sendRes.sanitizedErrorMessage || "Falha ao reenviar SMS.", delivery: updated },
          { status: 502 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "SMS reenviado e aceito pelo TextBee com sucesso!",
        delivery: updated,
      });
    }

    // Canal WHATSAPP
    const waCap = getWhatsAppCapability(sys);
    if (!waCap.canSendRealMessages) {
      const updated = await prisma.notificationDelivery.update({
        where: { id },
        data: {
          status: "SIMULATED",
          simulated: true,
          provider: "SIMULATED",
          attemptCount: (log.attemptCount || 1) + 1,
          attemptedAt: now,
          errorDetails: waCap.reason || "Canal WhatsApp desativado ou não configurado; reenvio simulado.",
          sanitizedErrorMessage: null,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: admin.userId,
          userRole: "ADMIN",
          action: "MESSAGE_MANUALLY_RESENT",
          resource: "NotificationDelivery",
          resourceId: id,
          details: "Reenvio manual WHATSAPP registrado como SIMULATED (provedor inativo).",
        },
      });

      return NextResponse.json({
        success: true,
        message: "Reenvio processado com sucesso (simulado: provedor WhatsApp não configurado).",
        delivery: updated,
      });
    }

    const waRes = await sendWhatsAppMessage(sys, {
      to: log.recipient,
      message: bodyText,
    });
    const doneAt = new Date();

    const updated = await prisma.notificationDelivery.update({
      where: { id },
      data: {
        status: waRes.ok ? "ACCEPTED" : "FAILED",
        simulated: false,
        provider: waRes.provider,
        providerMessageId: waRes.providerMessageId || log.providerMessageId,
        attemptCount: (log.attemptCount || 1) + 1,
        attemptedAt: doneAt,
        acceptedAt: waRes.ok ? doneAt : log.acceptedAt,
        failedAt: waRes.ok ? null : doneAt,
        errorCode: waRes.ok ? null : waRes.errorCode || "WHATSAPP_RESEND_FAILED",
        sanitizedErrorMessage: waRes.ok ? null : waRes.sanitizedErrorMessage,
        errorDetails: waRes.ok ? null : waRes.sanitizedErrorMessage,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: admin.userId,
        userRole: "ADMIN",
        action: "MESSAGE_MANUALLY_RESENT",
        resource: "NotificationDelivery",
        resourceId: id,
        details: `Reenvio manual WHATSAPP pelo admin. Status: ${updated.status}`,
      },
    });

    if (!waRes.ok) {
      return NextResponse.json(
        { error: waRes.sanitizedErrorMessage || "Falha ao reenviar via WhatsApp.", delivery: updated },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Mensagem aceita pelo provedor WhatsApp e reenviada com sucesso!",
      delivery: updated,
    });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao reenviar mensagem:", error);
    return NextResponse.json({ error: "Erro interno do servidor ao reenviar mensagem." }, { status: 500 });
  }
}
