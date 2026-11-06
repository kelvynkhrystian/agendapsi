import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
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

        // Não reenviar lembretes para consultas que já passaram
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

    // Verifica disponibilidade do provedor no SystemSettings
    const sys = await prisma.systemSettings.findFirst();
    const isEmail = log.channel === "EMAIL";
    const isProviderConfigured = isEmail
      ? !!(sys?.smtpEnabled && sys?.smtpHost && sys?.smtpUser)
      : !!(sys?.whatsappEnabled && sys?.whatsappApiUrl);

    const now = new Date();
    const newStatus = isProviderConfigured ? "ACCEPTED" : "SIMULATED";

    const updated = await prisma.notificationDelivery.update({
      where: { id },
      data: {
        status: newStatus,
        simulated: !isProviderConfigured,
        provider: isProviderConfigured
          ? isEmail
            ? "SMTP"
            : sys?.whatsappProvider || "WHATSAPP_API"
          : "SIMULATED",
        attemptCount: (log.attemptCount || 1) + 1,
        attemptedAt: now,
        acceptedAt: isProviderConfigured ? now : undefined,
        failedAt: null,
        errorCode: null,
        errorDetails: isProviderConfigured
          ? null
          : "Servidor não configurado; reenvio registrado como simulado.",
        sanitizedErrorMessage: null,
      },
    });

    // Registra auditoria do reenvio
    await prisma.auditLog.create({
      data: {
        action: "MESSAGE_MANUALLY_RESENT",
        resource: "NotificationDelivery",
        resourceId: id,
        details: `Reenvio manual disparado pelo administrador para o canal ${log.channel}. Status: ${newStatus}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: isProviderConfigured
        ? "Mensagem aceita pelo provedor e reenviada com sucesso!"
        : "Reenvio processado com sucesso (simulado: provedor externo não configurado).",
      delivery: {
        id: updated.id,
        status: updated.status,
        attemptCount: updated.attemptCount,
        attemptedAt: updated.attemptedAt,
        acceptedAt: updated.acceptedAt,
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao reenviar mensagem:", error);
    return NextResponse.json({ error: "Erro interno do servidor ao reenviar mensagem." }, { status: 500 });
  }
}
