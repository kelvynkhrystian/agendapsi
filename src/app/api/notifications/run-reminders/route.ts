import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendNotification } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  try {
    // Pode ser autenticado por Bearer token ou por cron do servidor
    const authHeader = req.headers.get("authorization");
    const secret = process.env.TECHNICAL_STATUS_BEARER_TOKEN;

    if (secret && authHeader !== `Bearer ${secret}`) {
      // Permite requisições locais ou com token válido
      const isLocalhost = req.headers.get("host")?.includes("localhost");
      if (!isLocalhost) {
        return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
      }
    }

    const now = new Date();
    const in24hStart = new Date(now.getTime() + 23 * 3600000);
    const in24hEnd = new Date(now.getTime() + 25 * 3600000);

    const in2hStart = new Date(now.getTime() + 1.5 * 3600000);
    const in2hEnd = new Date(now.getTime() + 2.5 * 3600000);

    let remindersSent = 0;

    // 1. Busca consultas entre 23h e 25h para lembrete de 24h
    const appts24h = await prisma.appointment.findMany({
      where: {
        startAt: { gte: in24hStart, lte: in24hEnd },
        status: "CONFIRMED",
      },
      include: {
        patient: true,
        service: true,
      },
    });

    for (const appt of appts24h) {
      const idempotencyKey = `reminder_24h_${appt.id}`;
      const res = await sendNotification({
        recipient: appt.patient.phone || appt.patient.email,
        channel: "WHATSAPP",
        templateType: "REMINDER_24H",
        idempotencyKey,
        variables: {
          patientName: appt.patient.fullName,
          professionalName: "Consultório PSI",
          appointmentDateTime: appt.startAt.toISOString(),
          modality: appt.modality,
        },
      });

      if (!res.alreadySent) remindersSent++;
    }

    // 2. Busca consultas entre 1.5h e 2.5h para lembrete de 2h
    const appts2h = await prisma.appointment.findMany({
      where: {
        startAt: { gte: in2hStart, lte: in2hEnd },
        status: "CONFIRMED",
      },
      include: {
        patient: true,
        service: true,
      },
    });

    for (const appt of appts2h) {
      const idempotencyKey = `reminder_2h_${appt.id}`;
      const res = await sendNotification({
        recipient: appt.patient.phone || appt.patient.email,
        channel: "WHATSAPP",
        templateType: "REMINDER_2H",
        idempotencyKey,
        variables: {
          patientName: appt.patient.fullName,
          professionalName: "Consultório PSI",
          appointmentDateTime: appt.startAt.toISOString(),
          modality: appt.modality,
          entryUrl: appt.meetingUrlSnapshot || "",
        },
      });

      if (!res.alreadySent) remindersSent++;
    }

    return NextResponse.json({
      success: true,
      message: `Rotina de lembretes processada. ${remindersSent} novo(s) lembrete(s) disparado(s)/simulado(s).`,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("Erro na rotina de lembretes:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
