import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession, requireAuth } from "@/lib/auth";
import { createAtomicAppointment } from "@/lib/schedule";

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

    const appointments = await prisma.appointment.findMany({
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
    });

    return NextResponse.json(appointments);
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

    // Se for paciente agendando, só pode agendar para si mesmo e não pode forçar override
    if (session.role === "PATIENT") {
      data.patientId = session.userId;
      data.isAdminOverride = false;
    }

    // Busca o serviço
    const service = await prisma.service.findUnique({
      where: { id: data.serviceId },
    });

    if (!service || !service.isActive) {
      return NextResponse.json({ error: "Serviço indisponível." }, { status: 400 });
    }

    const startAt = new Date(data.startAt);
    const endAt = new Date(data.endAt);

    // Validação atômica de agenda
    const appointment = await createAtomicAppointment({
      patientId: data.patientId,
      serviceId: data.serviceId,
      packageId: data.packageId,
      startAt,
      endAt,
      modality: data.modality,
      status: data.status,
      isAdminOverride: data.isAdminOverride && session.role === "ADMIN",
      holdToken: data.holdToken,
    });

    // Cria registro de pagamento associado se não for gratuito
    const isFree = data.isFreeOneOff || service.isFree || service.priceCents === 0;
    if (!isFree) {
      await prisma.payment.create({
        data: {
          appointmentId: appointment.id,
          patientId: data.patientId,
          amountCents: service.priceCents,
          status: "PENDING",
          method: "ONLINE_SIMULATED",
          isSimulated: true,
        },
      });
    }

    // Auditoria
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        userRole: session.role,
        action: "APPOINTMENT_CREATED",
        resource: "Appointment",
        resourceId: appointment.id,
        details: JSON.stringify({
          startAt: appointment.startAt,
          isAdminOverride: appointment.isAdminOverride,
          isFree,
        }),
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      },
    });

    return NextResponse.json(appointment, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "HORARIO_JA_OCUPADO") {
      return NextResponse.json(
        { error: "Este horário já está ocupado ou colide com outro agendamento." },
        { status: 409 }
      );
    }
    console.error("Erro ao criar agendamento:", error);
    return NextResponse.json({ error: "Erro ao processar agendamento." }, { status: 500 });
  }
}
