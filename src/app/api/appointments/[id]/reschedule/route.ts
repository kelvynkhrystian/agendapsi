import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { rescheduleAppointmentAtomic } from "@/lib/schedule";
import { dispatchNotification } from "@/lib/notifications";
import { updateGoogleMeetConference } from "@/lib/google-calendar";

const rescheduleSchema = z.object({
  startAt: z.string().datetime("Data e horário inválidos."),
  reason: z.string().trim().max(500).optional(),
});

async function handleReschedule(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;

    const body = await req.json();
    const parsed = rescheduleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos para remarcação.", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const newStartAt = new Date(parsed.data.startAt);
    const ipAddress = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const appUrl =
      process.env.APP_URL ||
      req.nextUrl.origin ||
      "http://localhost:3000";

    const result = await rescheduleAppointmentAtomic({
      appointmentId: id,
      newStartAt,
      adminUserId: session.userId,
      adminRole: session.role,
      ipAddress,
      reason: parsed.data.reason,
      appUrl,
    });

    const updated = result.appointment;

    // Atualiza evento no Google Calendar caso seja teleconsulta via Google Meet
    if (
      updated.modality === "ONLINE" &&
      updated.videoMeeting?.provider === "GOOGLE_MEET" &&
      updated.videoMeeting.calendarEventId
    ) {
      try {
        await updateGoogleMeetConference({
          calendarEventId: updated.videoMeeting.calendarEventId,
          startAt: updated.startAt,
          endAt: updated.endAt,
          summary: `Consulta PSI: ${updated.service.name} - ${updated.patient.fullName}`,
          description: `Teleconsulta remarcada via PSI Consultório.\nServiço: ${updated.service.name}`,
        });
      } catch (calErr) {
        console.warn("[Google Calendar] Aviso ao atualizar evento remarcado:", calErr);
      }
    }

    const [site, profile, settings, historyLogs] = await Promise.all([
      prisma.siteSettings.findUnique({ where: { id: "default" } }),
      prisma.professionalProfile.findUnique({ where: { id: "default" } }),
      prisma.systemSettings.findUnique({ where: { id: "default" }, select: { timezone: true } }),
      prisma.auditLog.findMany({
        where: {
          resource: "Appointment",
          action: "APPOINTMENT_RESCHEDULED",
          resourceId: id,
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          details: true,
          createdAt: true,
        },
      }),
    ]);

    const timezone = settings?.timezone || "America/Sao_Paulo";
    const location =
      updated.modality === "PRESENTIAL"
        ? site?.address || "Consultório Presencial"
        : "Sala de Teleconsulta Virtual";

    // Notifica o paciente usando os canais configurados sem expor informações clínicas
    await dispatchNotification({
      recipientId: updated.patientId,
      recipientRole: "PATIENT",
      eventType: "APPOINTMENT_RESCHEDULED",
      targetUrl: "/paciente",
      relatedEntityType: "Appointment",
      relatedEntityId: updated.id,
      vars: {
        patientName: updated.patient.fullName,
        professionalName: profile?.fullName || "Profissional",
        serviceName: updated.service.name,
        date: updated.startAt,
        time: updated.startAt,
        timezone,
        valueCents: updated.service.priceCents,
        location,
        meetingLink: updated.modality === "PRESENTIAL" ? "" : updated.meetingUrlSnapshot || "",
      },
      idempotencyKey: `reschedule-${updated.id}-${result.auditLogId}`,
    });

    const rescheduleHistory = historyLogs.map((log) => {
      let details: Record<string, unknown> = {};
      try {
        details = log.details ? JSON.parse(log.details) : {};
      } catch {
        details = {};
      }
      return {
        id: log.id,
        createdAt: log.createdAt.toISOString(),
        previousStartAt: typeof details.previousStartAt === "string" ? details.previousStartAt : null,
        previousEndAt: typeof details.previousEndAt === "string" ? details.previousEndAt : null,
        newStartAt: typeof details.newStartAt === "string" ? details.newStartAt : null,
        newEndAt: typeof details.newEndAt === "string" ? details.newEndAt : null,
        reason: typeof details.reason === "string" ? details.reason : null,
      };
    });

    return NextResponse.json({
      success: true,
      message: "Consulta remarcada com sucesso.",
      appointment: {
        ...updated,
        meetingUrlSnapshot: updated.modality === "PRESENTIAL" ? null : updated.meetingUrlSnapshot,
        rescheduleHistory,
        establishment: {
          name: site?.clinicName || "Consultório de Psicologia & Psiquiatria",
          address: site?.address || null,
          professionalName: profile?.fullName || "Dr(a). Profissional PSI",
        },
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ error: "Autenticação necessária." }, { status: 401 });
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json({ error: "Apenas o profissional administrador pode remarcar consultas por esta rota." }, { status: 403 });
      }
      if (error.message === "AGENDAMENTO_NAO_ENCONTRADO") {
        return NextResponse.json({ error: "Agendamento não encontrado." }, { status: 404 });
      }
      if (error.message === "DATA_INVALIDA") {
        return NextResponse.json({ error: "Data ou horário inválido." }, { status: 400 });
      }
      if (error.message === "HORARIO_NO_PASSADO") {
        return NextResponse.json(
          { error: "Não é possível remarcar uma consulta para um horário no passado." },
          { status: 400 }
        );
      }
      if (error.message === "STATUS_NAO_PERMITE_REMARCACAO") {
        return NextResponse.json(
          { error: "Consultas concluídas ou canceladas não podem ser remarcadas." },
          { status: 400 }
        );
      }
      if (error.message === "SERVICO_INATIVO_OU_INEXISTENTE") {
        return NextResponse.json(
          { error: "O serviço associado a esta consulta está inativo ou indisponível." },
          { status: 400 }
        );
      }
      if (error.message === "MODALIDADE_INCOMPATIVEL") {
        return NextResponse.json(
          { error: "A modalidade desta consulta é incompatível com as regras atuais do serviço." },
          { status: 400 }
        );
      }
      if (error.message === "HORARIO_IDENTICO_ATUAL") {
        return NextResponse.json(
          { error: "Selecione uma data ou horário diferente do agendamento atual." },
          { status: 400 }
        );
      }
      if (
        error.message === "HORARIO_JA_OCUPADO" ||
        error.message.startsWith("HORARIO_INDISPONIVEL")
      ) {
        return NextResponse.json(
          {
            error: "Este horário não está mais disponível. Selecione outro horário.",
            details: error.message.includes(":")
              ? error.message.split(":").slice(1).join(":")
              : undefined,
          },
          { status: 409 }
        );
      }
    }

    console.error("Erro ao remarcar agendamento:", error);
    return NextResponse.json({ error: "Erro interno ao remarcar consulta." }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleReschedule(req, context);
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleReschedule(req, context);
}
