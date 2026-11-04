import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { createAtomicAppointment } from "@/lib/schedule";
import { dispatchNotification } from "@/lib/notifications";

const confirmBookingSchema = z.object({
  holdToken: z.string().min(8),
  modality: z.enum(["PRESENTIAL", "ONLINE", "BOTH"]),
  paymentMethod: z.enum(["ONLINE_SIMULATED", "IN_PERSON", "WHATSAPP_ARRANGED"]).default("ONLINE_SIMULATED"),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const result = confirmBookingSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { holdToken, modality, paymentMethod } = result.data;

    // Busca o hold ativo
    const hold = await prisma.appointmentHold.findUnique({
      where: { holdToken },
      include: { service: true },
    });

    if (!hold || hold.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "O tempo de reserva deste horário expirou. Por favor, selecione o horário novamente." },
        { status: 410 }
      );
    }

    // Define status inicial baseado na política de confirmação do serviço
    const policy = hold.service.confirmationPolicy;
    let initialStatus: "PENDING_CONFIRMATION" | "CONFIRMED" = "CONFIRMED";

    if (policy === "MANUAL_ADMIN" || policy === "PAYMENT_AND_ADMIN") {
      initialStatus = "PENDING_CONFIRMATION";
    }

    // Criação atômica do agendamento
    const appointment = await createAtomicAppointment({
      patientId: session.userId,
      serviceId: hold.serviceId,
      startAt: hold.startAt,
      endAt: hold.endAt,
      modality,
      status: initialStatus,
      holdToken,
    });

    // Se o serviço não for gratuito, cria o pagamento
    const isFree = hold.service.isFree || hold.service.priceCents === 0;
    let payment = null;

    if (!isFree) {
      payment = await prisma.payment.create({
        data: {
          appointmentId: appointment.id,
          patientId: session.userId,
          amountCents: hold.service.priceCents,
          status: paymentMethod === "ONLINE_SIMULATED" ? "APPROVED" : "PENDING",
          method: paymentMethod,
          isSimulated: paymentMethod === "ONLINE_SIMULATED",
          confirmedAt: paymentMethod === "ONLINE_SIMULATED" ? new Date() : null,
          confirmedBy: paymentMethod === "ONLINE_SIMULATED" ? "SIMULATOR" : null,
        },
      });
    }

    // Busca detalhes do paciente e da clínica
    const [patient, site, profile] = await Promise.all([
      prisma.patient.findUnique({ where: { id: session.userId } }),
      prisma.siteSettings.findUnique({ where: { id: "default" } }),
      prisma.professionalProfile.findUnique({ where: { id: "default" } }),
    ]);

    const patientName = patient?.fullName || "Paciente";
    const professionalName = profile?.fullName || "Profissional";
    const location =
      modality === "PRESENTIAL"
        ? site?.address || "Consultório Presencial"
        : "Sala de Teleconsulta Virtual";

    // 1. Notificação para o Paciente
    if (patient) {
      await dispatchNotification({
        recipientId: patient.id,
        recipientRole: "PATIENT",
        eventType: initialStatus === "CONFIRMED" ? "APPOINTMENT_CONFIRMED" : "APPOINTMENT_REGISTERED",
        targetUrl: "/paciente",
        relatedEntityType: "Appointment",
        relatedEntityId: appointment.id,
        vars: {
          patientName,
          professionalName,
          serviceName: hold.service.name,
          date: appointment.startAt,
          time: appointment.startAt,
          valueCents: hold.service.priceCents,
          location,
          meetingLink: modality === "PRESENTIAL" ? "" : appointment.meetingUrlSnapshot || "",
        },
        idempotencyKey: `booking-patient-${appointment.id}`,
      });
    }

    // 2. Notificação para o Administrador
    const admin = await prisma.adminAccount.findFirst();
    if (admin) {
      await dispatchNotification({
        recipientId: admin.id,
        recipientRole: "ADMIN",
        eventType: "ADMIN_NEW_APPOINTMENT",
        targetUrl: "/admin/agenda",
        relatedEntityType: "Appointment",
        relatedEntityId: appointment.id,
        vars: {
          patientName,
          serviceName: hold.service.name,
          date: appointment.startAt,
          time: appointment.startAt,
          valueCents: hold.service.priceCents,
        },
        idempotencyKey: `booking-admin-${appointment.id}`,
      });
    }

    return NextResponse.json(
      {
        success: true,
        appointment,
        payment,
        message:
          initialStatus === "CONFIRMED"
            ? "Consulta agendada e confirmada com sucesso!"
            : "Consulta solicitada! Aguardando confirmação do profissional.",
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Faça login para concluir o agendamento." }, { status: 401 });
    }
    console.error("Erro ao confirmar agendamento:", error);
    return NextResponse.json({ error: "Erro interno ao confirmar agendamento." }, { status: 500 });
  }
}
