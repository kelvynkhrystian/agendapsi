import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

const statusTransitionSchema = z.object({
  status: z.enum([
    "PENDING_CONFIRMATION",
    "CONFIRMED",
    "COMPLETED",
    "CANCELLED",
    "LATE_CANCELLED",
    "NO_SHOW",
  ]),
  reason: z.string().optional(),
  refundAction: z.enum(["RETAIN", "REFUND_FULL", "NONE"]).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const result = statusTransitionSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { status: targetStatus, reason, refundAction } = result.data;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        service: true,
        payment: true,
        patient: true,
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Agendamento não encontrado." }, { status: 404 });
    }

    // Validação de permissões
    if (session.role === "PATIENT") {
      // Paciente só pode solicitar cancelamento da sua própria consulta
      if (appointment.patientId !== session.userId) {
        return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
      }
      if (targetStatus !== "CANCELLED" && targetStatus !== "LATE_CANCELLED") {
        return NextResponse.json(
          { error: "Pacientes só possuem permissão para cancelar consultas." },
          { status: 403 }
        );
      }
    }

    const now = new Date();
    const cancellationNoticeDays = appointment.service.cancellationNoticeDays ?? 3;
    const noticeLimitMs = cancellationNoticeDays * 24 * 60 * 60 * 1000;
    const msUntilAppointment = appointment.startAt.getTime() - now.getTime();

    let finalStatus = targetStatus;
    let isLate = false;

    // Se o pedido for de cancelamento, calcula se é tardio
    if (targetStatus === "CANCELLED" || targetStatus === "LATE_CANCELLED") {
      if (msUntilAppointment < noticeLimitMs) {
        finalStatus = "LATE_CANCELLED";
        isLate = true;
      } else {
        finalStatus = "CANCELLED";
        isLate = false;
      }
    }

    // Atualiza o agendamento
    const updated = await prisma.$transaction(async (tx) => {
      const appt = await tx.appointment.update({
        where: { id },
        data: {
          status: finalStatus,
          isLateCancellation: isLate,
          cancellationReason: reason || null,
          cancelledAt: finalStatus.includes("CANCELLED") ? now : null,
          cancelledBy: finalStatus.includes("CANCELLED") ? session.role : null,
          noShowRecordedAt: finalStatus === "NO_SHOW" ? now : null,
          noShowHandled: finalStatus === "NO_SHOW" ? true : false,
        },
      });

      // Se for cancelamento e houver ação de estorno
      if (appointment.payment && refundAction === "REFUND_FULL") {
        await tx.refund.create({
          data: {
            paymentId: appointment.payment.id,
            amountCents: appointment.payment.amountCents,
            reason: reason || "Estorno por cancelamento da consulta",
            refundedBy: session.role,
          },
        });

        await tx.payment.update({
          where: { id: appointment.payment.id },
          data: { status: "REFUNDED" },
        });
      }

      // Registro de Auditoria
      await tx.auditLog.create({
        data: {
          userId: session.userId,
          userRole: session.role,
          action: `APPOINTMENT_STATUS_CHANGED_TO_${finalStatus}`,
          resource: "Appointment",
          resourceId: id,
          details: JSON.stringify({
            previousStatus: appointment.status,
            newStatus: finalStatus,
            isLate,
            reason,
            refundAction,
          }),
          ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
        },
      });

      return appt;
    });

    return NextResponse.json({
      success: true,
      appointment: updated,
      isLateCancellation: isLate,
      noticeDaysRequired: cancellationNoticeDays,
    });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
    }
    console.error("Erro na transição de status:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
