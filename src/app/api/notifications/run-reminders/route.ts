import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatDate, formatTime } from "@/lib/utils";
import { getOrCreateTemplate, sendNotification } from "@/lib/notifications";
import { getEmailCapability } from "@/lib/integrations-email";
import { getSmsCapability } from "@/lib/integrations-sms";
import { getWhatsAppCapability } from "@/lib/integrations-whatsapp";

export async function POST(req: NextRequest) {
  try {
    // Pode ser autenticado por Bearer token ou por cron local
    const authHeader = req.headers.get("authorization");
    const secret = process.env.TECHNICAL_STATUS_BEARER_TOKEN;

    if (secret && authHeader !== `Bearer ${secret}`) {
      const isLocalhost = req.headers.get("host")?.includes("localhost");
      if (!isLocalhost) {
        return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
      }
    }

    const now = new Date();
    const in24hStart = new Date(Math.max(now.getTime() + 23 * 3600000, now.getTime() + 60000));
    const in24hEnd = new Date(now.getTime() + 25 * 3600000);

    const in2hStart = new Date(Math.max(now.getTime() + 1.5 * 3600000, now.getTime() + 60000));
    const in2hEnd = new Date(now.getTime() + 2.5 * 3600000);

    const [sys, reminderTemplate] = await Promise.all([
      prisma.systemSettings.findFirst(),
      getOrCreateTemplate("APPOINTMENT_REMINDER"),
    ]);

    const timezone = sys?.timezone || "America/Sao_Paulo";
    const deliveryMode = reminderTemplate.deliveryMode || "ALL_CHANNELS";
    const emailCap = getEmailCapability(sys);
    const smsCap = getSmsCapability(sys);
    const waCap = getWhatsAppCapability(sys);

    const whatsappBrokenOrWaiting =
      !waCap.canSendRealMessages ||
      sys?.whatsappHealthStatus === "INVALID_AUTH" ||
      sys?.whatsappHealthStatus === "AWAITING_QR" ||
      sys?.whatsappHealthStatus === "RECONNECT_REQUIRED";

    const emailBroken =
      !emailCap.canSendRealEmails || sys?.emailHealthStatus === "INVALID_AUTH";

    const smsBroken =
      !smsCap.canSendRealSms ||
      sys?.smsHealthStatus === "INVALID_AUTH" ||
      sys?.smsHealthStatus === "DEVICE_OFFLINE";

    let remindersSent = 0;
    let remindersSkipped = 0;

    const processWindow = async (
      windowTag: "24h" | "2h",
      templateType: "REMINDER_24H" | "REMINDER_2H",
      appts: Array<{
        id: string;
        startAt: Date;
        modality: string;
        meetingUrlSnapshot: string | null;
        service: { name: string };
        patient: {
          id: string;
          fullName: string;
          email: string;
          phone: string;
          smsOptIn: boolean;
        };
      }>
    ) => {
      for (const appt of appts) {
        // Garantia estrita: nunca disparar lembretes automáticos para horários passados
        if (appt.startAt <= now) {
          remindersSkipped++;
          continue;
        }

        const dateLabel = `${formatDate(appt.startAt, timezone)} às ${formatTime(appt.startAt, timezone)}`;
        const entryUrl = appt.modality === "PRESENTIAL" ? "" : appt.meetingUrlSnapshot || "";
        const baseVars = {
          patientName: appt.patient.fullName,
          professionalName: "Consultório PSI",
          serviceName: appt.service.name,
          appointmentDateTime: dateLabel,
          modality: appt.modality,
          entryUrl,
        };

        // 1. WhatsApp (quando ALL_CHANNELS e canal ativo/saudável)
        if (deliveryMode === "ALL_CHANNELS") {
          if (!whatsappBrokenOrWaiting && appt.patient.phone) {
            const res = await sendNotification({
              recipient: appt.patient.phone,
              channel: "WHATSAPP",
              templateType,
              idempotencyKey: `reminder_${windowTag}_${appt.id}`,
              relatedAppointmentId: appt.id,
              patientId: appt.patient.id,
              variables: baseVars,
            });
            if (!res.alreadySent && !res.skipped) remindersSent++;
          } else {
            remindersSkipped++;
          }
        }

        // 2. E-mail (quando APP_EMAIL ou ALL_CHANNELS e SMTP funcional)
        if (deliveryMode === "APP_EMAIL" || deliveryMode === "ALL_CHANNELS") {
          if (!emailBroken && appt.patient.email) {
            const res = await sendNotification({
              recipient: appt.patient.email,
              channel: "EMAIL",
              templateType,
              subject:
                windowTag === "24h"
                  ? "Lembrete de Consulta (amanhã) — Consultório PSI"
                  : "Lembrete de Consulta em Breve — Consultório PSI",
              idempotencyKey: `reminder_${windowTag}_${appt.id}_email`,
              relatedAppointmentId: appt.id,
              patientId: appt.patient.id,
              variables: baseVars,
            });
            if (!res.alreadySent && !res.skipped) remindersSent++;
          } else {
            remindersSkipped++;
          }
        }

        // 3. SMS (somente ALL_CHANNELS + paciente com opt-in explícito + TextBee ativo/saudável)
        if (deliveryMode === "ALL_CHANNELS") {
          if (!smsBroken && appt.patient.smsOptIn === true && appt.patient.phone) {
            const res = await sendNotification({
              recipient: appt.patient.phone,
              channel: "SMS",
              templateType,
              idempotencyKey: `reminder_${windowTag}_${appt.id}_sms`,
              relatedAppointmentId: appt.id,
              patientId: appt.patient.id,
              patientSmsOptIn: appt.patient.smsOptIn,
              variables: baseVars,
            });
            if (!res.alreadySent && !res.skipped) remindersSent++;
          } else if (appt.patient.smsOptIn === true) {
            remindersSkipped++;
          }
        }
      }
    };

    const [appts24h, appts2h] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          startAt: { gt: now, gte: in24hStart, lte: in24hEnd },
          status: "CONFIRMED",
        },
        include: {
          patient: true,
          service: true,
        },
      }),
      prisma.appointment.findMany({
        where: {
          startAt: { gt: now, gte: in2hStart, lte: in2hEnd },
          status: "CONFIRMED",
        },
        include: {
          patient: true,
          service: true,
        },
      }),
    ]);

    await processWindow("24h", "REMINDER_24H", appts24h);
    await processWindow("2h", "REMINDER_2H", appts2h);

    return NextResponse.json({
      success: true,
      remindersSent,
      remindersSkipped,
      message: `Rotina de lembretes processada. ${remindersSent} disparo(s) realizado(s) e ${remindersSkipped} ignorado(s)/adiado(s) com segurança.`,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("Erro na rotina de lembretes:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
