import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession, requireAuth } from "@/lib/auth";
import { createAtomicAppointment } from "@/lib/schedule";
import { dispatchNotification } from "@/lib/notifications";

const createAppointmentSchema = z.object({
  patientId: z.string().min(1, "Paciente é obrigatório"),
  serviceId: z.string().min(1, "Serviço é obrigatório"),
  packageId: z.string().optional(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  modality: z.enum(["PRESENTIAL", "ONLINE", "BOTH"]),
  status: z.enum(["PENDING_CONFIRMATION", "CONFIRMED"]).default("CONFIRMED"),
  isAdminOverride: z.boolean().default(false),
  holdToken: z.string().optional(),
  isFreeOneOff: z.boolean().default(false),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(req.url);

    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");
    const status = searchParams.get("status");
    const patientId = searchParams.get("patientId");

    const whereClause: Record<string, unknown> = {};

    // Se for paciente, restringe aos próprios agendamentos
    if (session.role === "PATIENT") {
      whereClause.patientId = session.userId;
    } else if (patientId) {
      whereClause.patientId = patientId;
    }

    if (startDateStr || endDateStr) {
      whereClause.startAt = {};
      if (startDateStr) {
        (whereClause.startAt as Record<string, Date>).gte = new Date(startDateStr);
      }
      if (endDateStr) {
        (whereClause.startAt as Record<string, Date>).lte = new Date(endDateStr);
      }
    }

    if (status) {
      whereClause.status = status;
    }

    const [appointments, site, profile] = await Promise.all([
      prisma.appointment.findMany({
        where: whereClause,
        include: {
          patient: {
            select: {
              id: true,
              fullName: true,
              phone: true,
              email: true,
              isMinor: true,
            },
          },
          service: true,
          payment: true,
          videoMeeting: true,
        },
        orderBy: { startAt: "asc" },
      }),
      prisma.siteSettings.findUnique({ where: { id: "default" } }),
      prisma.professionalProfile.findUnique({ where: { id: "default" } }),
    ]);

    const enriched = appointments.map((appt) => ({
      ...appt,
      // TASK 3: Para agendamentos presenciais, NUNCA expõe link de sala virtual
      meetingUrlSnapshot: appt.modality === "PRESENTIAL" ? null : appt.meetingUrlSnapshot,
      establishment: {
        name: site?.clinicName || "Consultório de Psicologia & Psiquiatria",
        address: site?.address || null,
        professionalName: profile?.fullName || "Dr(a). Profissional PSI",
      },
    }));

    return NextResponse.json(enriched);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }
    console.error("Erro ao listar agendamentos:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Autenticação necessária." }, { status: 401 });
    }

    const body = await req.json();
    const result = createAppointmentSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = result.data;

    // Se for paciente agendando diretamente, só pode agendar para si mesmo
    if (session.role === "PATIENT" && data.patientId !== session.userId) {
      return NextResponse.json({ error: "Operação não permitida." }, { status: 403 });
    }

    const startAt = new Date(data.startAt);
    const endAt = new Date(data.endAt);

    const appointment = await createAtomicAppointment({
      patientId: data.patientId,
      serviceId: data.serviceId,
      packageId: data.packageId,
      startAt,
      endAt,
      modality: data.modality,
      status: data.status,
      isAdminOverride: session.role === "ADMIN" ? data.isAdminOverride : false,
      holdToken: data.holdToken,
    });

    const [service, patient, site, profile] = await Promise.all([
      prisma.service.findUnique({ where: { id: data.serviceId } }),
      prisma.patient.findUnique({ where: { id: data.patientId } }),
      prisma.siteSettings.findUnique({ where: { id: "default" } }),
      prisma.professionalProfile.findUnique({ where: { id: "default" } }),
    ]);

    // Dispara notificações automáticas
    const patientName = patient?.fullName || "Paciente";
    const professionalName = profile?.fullName || "Profissional";
    const location =
      data.modality === "PRESENTIAL"
        ? site?.address || "Consultório Presencial"
        : "Sala de Teleconsulta Virtual";

    if (patient) {
      await dispatchNotification({
        recipientId: patient.id,
        recipientRole: "PATIENT",
        eventType: data.status === "CONFIRMED" ? "APPOINTMENT_CONFIRMED" : "APPOINTMENT_REGISTERED",
        targetUrl: "/paciente",
        relatedEntityType: "Appointment",
        relatedEntityId: appointment.id,
        vars: {
          patientName,
          professionalName,
          serviceName: service?.name || "Consulta",
          date: startAt,
          time: startAt,
          valueCents: service?.priceCents || 0,
          location,
          meetingLink: data.modality === "PRESENTIAL" ? "" : appointment.meetingUrlSnapshot || "",
        },
        idempotencyKey: `appt-patient-${appointment.id}-${data.status}`,
      });
    }

    // Notificação ao Admin se agendado por paciente
    if (session.role === "PATIENT") {
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
            serviceName: service?.name || "Consulta",
            date: startAt,
            time: startAt,
            valueCents: service?.priceCents || 0,
          },
          idempotencyKey: `appt-admin-${appointment.id}`,
        });
      }
    }

    return NextResponse.json(appointment, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("CONFLITO_AGENDA")) {
      return NextResponse.json(
        { error: "Conflito de agenda: o horário selecionado já está ocupado ou reservado." },
        { status: 409 }
      );
    }
    console.error("Erro ao criar agendamento:", error);
    return NextResponse.json({ error: "Erro interno ao criar agendamento." }, { status: 500 });
  }
}
