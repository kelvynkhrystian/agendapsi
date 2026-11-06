import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(
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

    // Busca dados não clínicos da consulta vinculada, se houver
    let relatedAppointment = null;
    if (log.relatedAppointmentId) {
      const appt = await prisma.appointment.findUnique({
        where: { id: log.relatedAppointmentId },
        select: {
          id: true,
          startAt: true,
          endAt: true,
          status: true,
          modality: true,
          service: { select: { name: true } },
          patient: { select: { fullName: true } },
        },
      });
      if (appt) {
        relatedAppointment = {
          id: appt.id,
          startAt: appt.startAt,
          endAt: appt.endAt,
          status: appt.status,
          modality: appt.modality,
          serviceName: appt.service?.name,
          patientName: appt.patient?.fullName,
        };
      }
    }

    // Parse seguro de metadados se houver
    let parsedMetadata = null;
    if (log.metadataJson) {
      try {
        parsedMetadata = JSON.parse(log.metadataJson);
      } catch {}
    }

    return NextResponse.json({
      success: true,
      log: {
        id: log.id,
        recipient: log.recipient,
        maskedRecipient: log.maskedRecipient || log.recipient,
        channel: log.channel,
        templateType: log.templateType,
        messageType: log.messageType || log.templateType,
        subjectOrCategory: log.subjectOrCategory || `Notificação ${log.templateType}`,
        status: log.status,
        simulated: log.simulated,
        provider: log.provider || (log.simulated ? "SIMULATED" : "SYSTEM"),
        providerMessageId: log.providerMessageId,
        attemptCount: log.attemptCount || 1,
        sentAt: log.sentAt,
        createdAt: log.createdAt,
        attemptedAt: log.attemptedAt || log.sentAt,
        acceptedAt: log.acceptedAt,
        deliveredAt: log.deliveredAt,
        failedAt: log.failedAt,
        errorCode: log.errorCode,
        errorDetails: log.sanitizedErrorMessage || log.errorDetails,
        idempotencyKey: log.idempotencyKey,
        relatedAppointment,
        bodyPreview: parsedMetadata?.message || parsedMetadata?.body || null,
        titlePreview: parsedMetadata?.title || parsedMetadata?.subject || null,
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao obter detalhes da mensagem:", error);
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}
