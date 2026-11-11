import { prisma } from "./prisma";
import { provisionVideoMeeting } from "./video-provider";

export interface TimeSlot {
  startAt: string; // ISO string
  endAt: string;   // ISO string
  formattedTime: string; // "14:00"
  available: boolean;
  reason?: string;
}

/**
 * Verifica se dois intervalos no tempo colidem (incluindo buffer)
 * [startA, endA) colide com [startB, endB) se startA < endB e endA > startB
 */
export function intervalsOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date
): boolean {
  return startA.getTime() < endB.getTime() && endA.getTime() > startB.getTime();
}

/**
 * Adiciona minutos a uma data
 */
export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60000);
}

/**
 * Resolve o buffer efetivo do serviço considerando o padrão global
 */
export function resolveBufferMinutes(
  serviceBufferMinutes?: number | null,
  defaultBufferMinutes: number = 10
): number {
  return typeof serviceBufferMinutes === "number" && serviceBufferMinutes > 0
    ? serviceBufferMinutes
    : defaultBufferMinutes;
}

/**
 * Calcula os horários disponíveis em uma determinada data para um determinado serviço
 */
export async function getAvailableSlotsForDate({
  dateStr, // "YYYY-MM-DD"
  serviceId,
  timezone = "America/Sao_Paulo",
  excludeAppointmentId,
  respectMinNotice = true,
}: {
  dateStr: string;
  serviceId: string;
  timezone?: string;
  excludeAppointmentId?: string;
  respectMinNotice?: boolean;
}): Promise<TimeSlot[]> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new Error("DATA_INVALIDA");
  }

  const service = await prisma.service.findUnique({
    where: { id: serviceId },
  });

  if (!service || !service.isActive) {
    throw new Error("SERVICO_INATIVO_OU_INEXISTENTE");
  }

  const settings = await prisma.systemSettings.findUnique({
    where: { id: "default" },
  });

  const now = new Date();
  const minNoticeHours = settings?.minBookingNoticeHours ?? 24;
  const maxHorizonDays = settings?.maxBookingHorizonDays ?? 30;

  const minBookingTime = new Date(now.getTime() + minNoticeHours * 3600000);
  const maxBookingTime =
    maxHorizonDays > 0
      ? new Date(now.getTime() + maxHorizonDays * 86400000)
      : null;

  // Monta início e fim do dia no timezone informado
  // dateStr é "YYYY-MM-DD"
  const [year, month, day] = dateStr.split("-").map(Number);
  const targetDayStart = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const targetDayEnd = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

  // Verifica dia da semana (0 = Domingo ... 6 = Sábado) de forma independente do fuso do servidor
  const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay();

  // 1. Busca disponibilidade semanal configurada
  const weeklyRules = await prisma.weeklyAvailability.findMany({
    where: {
      dayOfWeek,
      isActive: true,
    },
  });

  if (weeklyRules.length === 0) {
    return [];
  }

  // 2. Busca exceções ou bloqueios no dia
  const exceptions = await prisma.availabilityException.findMany({
    where: {
      date: {
        gte: targetDayStart,
        lte: targetDayEnd,
      },
      isBlocked: true,
    },
  });

  // Se houver bloqueio total do dia sem horário especificado
  const hasFullDayBlock = exceptions.some((e) => !e.startTime && !e.endTime);
  if (hasFullDayBlock) {
    return [];
  }

  // 3. Busca agendamentos existentes no entorno do dia que não estejam cancelados
  const existingAppointments = await prisma.appointment.findMany({
    where: {
      startAt: { lt: new Date(targetDayEnd.getTime() + 86400000) },
      endAt: { gt: new Date(targetDayStart.getTime() - 86400000) },
      status: {
        notIn: ["CANCELLED", "LATE_CANCELLED"],
      },
      ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
    },
    include: {
      service: {
        select: { bufferMinutes: true },
      },
    },
  });

  // 4. Busca holds (reservas temporárias não expiradas)
  const activeHolds = await prisma.appointmentHold.findMany({
    where: {
      expiresAt: { gt: now },
      startAt: { lt: targetDayEnd },
      endAt: { gt: targetDayStart },
    },
  });

  const slots: TimeSlot[] = [];
  const duration = service.durationMinutes;
  const defaultBuffer = settings?.defaultBufferMinutes ?? 10;
  const buffer = resolveBufferMinutes(service.bufferMinutes, defaultBuffer);
  const totalSlotDuration = duration + buffer;

  // Itera sobre as faixas de horário de trabalho do dia
  for (const rule of weeklyRules) {
    const [startH, startM] = rule.startTime.split(":").map(Number);
    const [endH, endM] = rule.endTime.split(":").map(Number);

    // Constrói objeto Date em UTC seguindo a grade configurada
    const periodStart = new Date(Date.UTC(year, month - 1, day, startH, startM));
    const periodEnd = new Date(Date.UTC(year, month - 1, day, endH, endM));

    let currentCursor = new Date(periodStart);

    while (addMinutes(currentCursor, duration) <= periodEnd) {
      const slotStart = new Date(currentCursor);
      const slotEnd = addMinutes(slotStart, duration);
      // Para fins de colisão com o próximo, considera o buffer do serviço
      const slotEndWithBuffer = addMinutes(slotStart, totalSlotDuration);

      let isAvailable = true;
      let reason: string | undefined;

      // Impede seleção de horários no passado
      if (slotStart <= now) {
        isAvailable = false;
        reason = "Horário já encerrado ou no passado";
      }

      // Valida antecedência mínima quando aplicável
      if (isAvailable && respectMinNotice && slotStart < minNoticeHoursDate(minBookingTime)) {
        isAvailable = false;
        reason = "Antecedência mínima necessária não atingida";
      }

      // Valida horizonte máximo
      if (isAvailable && maxBookingTime && slotStart > maxBookingTime) {
        isAvailable = false;
        reason = "Data além do horizonte máximo de agendamento";
      }

      // Valida colisão com exceções parciais
      if (isAvailable) {
        for (const exc of exceptions) {
          if (exc.startTime && exc.endTime) {
            const [eStartH, eStartM] = exc.startTime.split(":").map(Number);
            const [eEndH, eEndM] = exc.endTime.split(":").map(Number);
            const excStart = new Date(Date.UTC(year, month - 1, day, eStartH, eStartM));
            const excEnd = new Date(Date.UTC(year, month - 1, day, eEndH, eEndM));

            if (intervalsOverlap(slotStart, slotEndWithBuffer, excStart, excEnd)) {
              isAvailable = false;
              reason = exc.reason || "Horário bloqueado";
              break;
            }
          }
        }
      }

      // Valida colisão com consultas existentes (levando em conta buffers)
      if (isAvailable) {
        for (const appt of existingAppointments) {
          const apptBuffer = resolveBufferMinutes(appt.service?.bufferMinutes, defaultBuffer);
          const apptEndWithBuffer = addMinutes(appt.endAt, apptBuffer);

          if (intervalsOverlap(slotStart, slotEndWithBuffer, appt.startAt, apptEndWithBuffer)) {
            isAvailable = false;
            reason = "Horário já ocupado";
            break;
          }
        }
      }

      // Valida colisão com reservas temporárias ativas (Holds)
      if (isAvailable) {
        for (const hold of activeHolds) {
          if (intervalsOverlap(slotStart, slotEndWithBuffer, hold.startAt, hold.endAt)) {
            isAvailable = false;
            reason = "Horário em processo de reserva por outro paciente";
            break;
          }
        }
      }

      const hours = String(slotStart.getUTCHours()).padStart(2, "0");
      const minutes = String(slotStart.getUTCMinutes()).padStart(2, "0");

      slots.push({
        startAt: slotStart.toISOString(),
        endAt: slotEnd.toISOString(),
        formattedTime: `${hours}:${minutes}`,
        available: isAvailable,
        reason,
      });

      // Avança o cursor para o próximo slot
      currentCursor = addMinutes(currentCursor, totalSlotDuration);
    }
  }

  return slots;
}

function minNoticeHoursDate(d: Date): Date {
  return d;
}

/**
 * Criação atômica de reserva temporária (AppointmentHold)
 * Garante em transação que nenhum outro hold ou consulta ocupe o mesmo intervalo.
 */
export async function createAtomicHold({
  serviceId,
  startAt,
  endAt,
  patientId,
  packageId,
  holdToken,
  holdExpiryMinutes = 60,
  reason = "BOOKING_DRAFT",
}: {
  serviceId: string;
  startAt: Date;
  endAt: Date;
  patientId?: string;
  packageId?: string;
  holdToken: string;
  holdExpiryMinutes?: number;
  reason?: string;
}) {
  const expiresAt = new Date(Date.now() + holdExpiryMinutes * 60000);

  return prisma.$transaction(async (tx) => {
    // 1. Limpa holds expirados para desocupar a agenda
    await tx.appointmentHold.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    // 2. Verifica se existe conflito com consultas confirmadas/pendentes
    const conflictingAppointment = await tx.appointment.findFirst({
      where: {
        status: { notIn: ["CANCELLED", "LATE_CANCELLED"] },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
    });

    if (conflictingAppointment) {
      throw new Error("HORARIO_JA_OCUPADO");
    }

    // 3. Verifica se existe outro hold ativo no mesmo intervalo
    const conflictingHold = await tx.appointmentHold.findFirst({
      where: {
        expiresAt: { gt: new Date() },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
        holdToken: { not: holdToken },
      },
    });

    if (conflictingHold) {
      throw new Error("HORARIO_EM_RESERVA");
    }

    // 4. Cria ou atualiza o hold de forma atômica
    const hold = await tx.appointmentHold.upsert({
      where: { holdToken },
      update: {
        startAt,
        endAt,
        serviceId,
        patientId,
        packageId,
        expiresAt,
        reason,
      },
      create: {
        holdToken,
        startAt,
        endAt,
        serviceId,
        patientId,
        packageId,
        expiresAt,
        reason,
      },
    });

    return hold;
  });
}

/**
 * Confirmação atômica de agendamento a partir de um hold ou criação direta
 */
export async function createAtomicAppointment({
  patientId,
  serviceId,
  packageId,
  startAt,
  endAt,
  modality,
  status = "CONFIRMED",
  isAdminOverride = false,
  holdToken,
}: {
  patientId: string;
  serviceId: string;
  packageId?: string;
  startAt: Date;
  endAt: Date;
  modality: "PRESENTIAL" | "ONLINE" | "BOTH";
  status?: "PENDING_CONFIRMATION" | "CONFIRMED";
  isAdminOverride?: boolean;
  holdToken?: string;
}) {
  return prisma.$transaction(async (tx) => {
    // Se não for override explícito do admin, verifica conflito de agendamento
    const conflicting = await tx.appointment.findFirst({
      where: {
        status: { notIn: ["CANCELLED", "LATE_CANCELLED"] },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
    });

    if (conflicting && !isAdminOverride) {
      throw new Error("HORARIO_JA_OCUPADO");
    }

    // Cria o agendamento
    const appointment = await tx.appointment.create({
      data: {
        patientId,
        serviceId,
        packageId,
        startAt,
        endAt,
        modality,
        status,
        isAdminOverride,
      },
      include: {
        patient: true,
        service: true,
      },
    });

    // Se o agendamento for virtual, provisiona sala com o provedor de vídeo ativo exclusivo
    if (modality === "ONLINE") {
      await provisionVideoMeeting({
        tx,
        appointmentId: appointment.id,
        patientName: appointment.patient?.fullName || "Paciente",
        serviceName: appointment.service?.name || "Consulta",
        startAt: appointment.startAt,
        endAt: appointment.endAt,
      });
    }

    // Se havia hold associado, remove-o
    if (holdToken) {
      await tx.appointmentHold.deleteMany({
        where: { holdToken },
      });
    }

    return appointment;
  });
}

/**
 * Remarcação atômica de agendamento administrativo com validação completa de grade,
 * bloqueios, buffers, conflitos, preservação de entidade/pagamento e invalidação de lembretes antigos.
 */
export async function rescheduleAppointmentAtomic({
  appointmentId,
  newStartAt,
  adminUserId,
  adminRole = "ADMIN",
  ipAddress = "127.0.0.1",
  reason,
  appUrl = process.env.APP_URL || "http://localhost:3000",
}: {
  appointmentId: string;
  newStartAt: Date;
  adminUserId: string;
  adminRole?: string;
  ipAddress?: string;
  reason?: string;
  appUrl?: string;
}) {
  if (Number.isNaN(newStartAt.getTime())) {
    throw new Error("DATA_INVALIDA");
  }

  if (newStartAt.getTime() <= Date.now()) {
    throw new Error("HORARIO_NO_PASSADO");
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      service: true,
      patient: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          email: true,
          isMinor: true,
        },
      },
      payment: true,
      videoMeeting: true,
    },
  });

  if (!appointment) {
    throw new Error("AGENDAMENTO_NAO_ENCONTRADO");
  }

  const reschedulableStatuses = new Set(["CONFIRMED", "PENDING_CONFIRMATION", "NO_SHOW"]);
  if (!reschedulableStatuses.has(appointment.status)) {
    throw new Error("STATUS_NAO_PERMITE_REMARCACAO");
  }

  if (!appointment.service || !appointment.service.isActive) {
    throw new Error("SERVICO_INATIVO_OU_INEXISTENTE");
  }

  if (
    appointment.service.modality !== "BOTH" &&
    appointment.service.modality !== appointment.modality
  ) {
    throw new Error("MODALIDADE_INCOMPATIVEL");
  }

  const computedEndAt = addMinutes(newStartAt, appointment.service.durationMinutes);
  if (
    newStartAt.getTime() === appointment.startAt.getTime() &&
    computedEndAt.getTime() === appointment.endAt.getTime()
  ) {
    throw new Error("HORARIO_IDENTICO_ATUAL");
  }

  const settings = await prisma.systemSettings.findUnique({
    where: { id: "default" },
  });

  // Validação da grade oficial de disponibilidade antes da transação
  const dateStr = newStartAt.toISOString().slice(0, 10);
  const availableSlots = await getAvailableSlotsForDate({
    dateStr,
    serviceId: appointment.serviceId,
    timezone: settings?.timezone || "America/Sao_Paulo",
    excludeAppointmentId: appointmentId,
    respectMinNotice: false,
  });

  const matchedSlot = availableSlots.find(
    (s) => new Date(s.startAt).getTime() === newStartAt.getTime()
  );

  if (!matchedSlot || !matchedSlot.available) {
    throw new Error(
      `HORARIO_INDISPONIVEL:${matchedSlot?.reason || "Horário fora da grade de atendimento ou indisponível"}`
    );
  }

  const defaultBuffer = settings?.defaultBufferMinutes ?? 10;

  return prisma.$transaction(async (tx) => {
    const current = await tx.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        service: true,
        patient: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            email: true,
            isMinor: true,
          },
        },
        payment: true,
        videoMeeting: true,
      },
    });

    if (!current) {
      throw new Error("AGENDAMENTO_NAO_ENCONTRADO");
    }

    if (!reschedulableStatuses.has(current.status)) {
      throw new Error("STATUS_NAO_PERMITE_REMARCACAO");
    }

    const txEndAt = addMinutes(newStartAt, current.service.durationMinutes);
    const requestedBuffer = resolveBufferMinutes(current.service.bufferMinutes, defaultBuffer);
    const newEndWithBuffer = addMinutes(txEndAt, requestedBuffer);

    // Garantia atômica anti-dupla reserva considerando buffers dos atendimentos vizinhos
    const candidateAppts = await tx.appointment.findMany({
      where: {
        id: { not: appointmentId },
        status: { notIn: ["CANCELLED", "LATE_CANCELLED"] },
        startAt: { lt: newEndWithBuffer },
        endAt: { gt: addMinutes(newStartAt, -1440) },
      },
      include: {
        service: {
          select: { bufferMinutes: true },
        },
      },
    });

    const hasApptConflict = candidateAppts.some((other) => {
      const otherBuffer = resolveBufferMinutes(other.service?.bufferMinutes, defaultBuffer);
      const otherEndWithBuffer = addMinutes(other.endAt, otherBuffer);
      return intervalsOverlap(newStartAt, newEndWithBuffer, other.startAt, otherEndWithBuffer);
    });

    if (hasApptConflict) {
      throw new Error("HORARIO_JA_OCUPADO");
    }

    const activeHoldConflict = await tx.appointmentHold.findFirst({
      where: {
        expiresAt: { gt: new Date() },
        startAt: { lt: newEndWithBuffer },
        endAt: { gt: newStartAt },
      },
    });

    if (activeHoldConflict) {
      throw new Error("HORARIO_JA_OCUPADO");
    }

    const nextStatus = current.status === "NO_SHOW" ? "CONFIRMED" : current.status;
    const restoredSnapshot =
      current.modality === "PRESENTIAL"
        ? null
        : current.meetingUrlSnapshot ||
          (current.videoMeeting?.psiEntryToken
            ? `${appUrl}/consulta-virtual/${current.videoMeeting.psiEntryToken}`
            : undefined);

    await tx.appointment.update({
      where: { id: appointmentId },
      data: {
        startAt: newStartAt,
        endAt: txEndAt,
        status: nextStatus,
        isAdminOverride: false,
        ...(current.status === "NO_SHOW"
          ? { noShowRecordedAt: null, noShowHandled: false }
          : {}),
        ...(restoredSnapshot !== undefined
          ? { meetingUrlSnapshot: restoredSnapshot }
          : {}),
      },
    });

    // Se for consulta online sem sala provisionada ainda, cria respeitando o provedor configurado
    if (current.modality === "ONLINE" && !current.videoMeeting) {
      await provisionVideoMeeting({
        tx,
        appointmentId,
        patientName: current.patient?.fullName || "Paciente",
        serviceName: current.service?.name || "Consulta",
        startAt: newStartAt,
        endAt: txEndAt,
        appUrl,
      });
    }

    // Invalida lembretes pendentes obsoletos e libera chaves de idempotência para os novos lembretes
    await tx.notificationDelivery.updateMany({
      where: {
        relatedAppointmentId: appointmentId,
        templateType: { in: ["REMINDER_24H", "REMINDER_2H"] },
        status: { in: ["PENDING", "QUEUED", "PROCESSING"] },
      },
      data: {
        status: "CANCELLED",
        errorDetails: "Lembrete invalidado devido à remarcação da consulta.",
      },
    });

    const prevReminders = await tx.notificationDelivery.findMany({
      where: {
        idempotencyKey: {
          in: [`reminder_24h_${appointmentId}`, `reminder_2h_${appointmentId}`],
        },
      },
      select: { id: true, idempotencyKey: true },
    });

    for (const rem of prevReminders) {
      await tx.notificationDelivery.update({
        where: { id: rem.id },
        data: {
          idempotencyKey: `superseded_${Date.now()}_${rem.idempotencyKey}`,
        },
      });
    }

    // Registro de auditoria preservando datas anterior e nova (sem expor dados clínicos)
    const auditLog = await tx.auditLog.create({
      data: {
        userId: adminUserId,
        userRole: adminRole,
        action: "APPOINTMENT_RESCHEDULED",
        resource: "Appointment",
        resourceId: appointmentId,
        details: JSON.stringify({
          previousStartAt: current.startAt.toISOString(),
          previousEndAt: current.endAt.toISOString(),
          newStartAt: newStartAt.toISOString(),
          newEndAt: txEndAt.toISOString(),
          previousStatus: current.status,
          newStatus: nextStatus,
          modality: current.modality,
          reason: reason || null,
        }),
        ipAddress,
      },
    });

    const finalAppointment = await tx.appointment.findUniqueOrThrow({
      where: { id: appointmentId },
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
    });

    return {
      appointment: finalAppointment,
      previousStartAt: current.startAt,
      previousEndAt: current.endAt,
      auditLogId: auditLog.id,
    };
  });
}
