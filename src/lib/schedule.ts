import { prisma } from "./prisma";

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
 * Calcula os horários disponíveis em uma determinada data para um determinado serviço
 */
export async function getAvailableSlotsForDate({
  dateStr, // "YYYY-MM-DD"
  serviceId,
  timezone = "America/Sao_Paulo",
}: {
  dateStr: string;
  serviceId: string;
  timezone?: string;
}): Promise<TimeSlot[]> {
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

  // Verifica dia da semana (0 = Domingo ... 6 = Sábado)
  // Calcula o dia da semana no fuso local
  const dayOfWeek = new Date(year, month - 1, day).getDay();

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

  // 3. Busca agendamentos existentes no dia que não estejam cancelados
  const existingAppointments = await prisma.appointment.findMany({
    where: {
      startAt: { gte: targetDayStart },
      endAt: { lte: new Date(targetDayEnd.getTime() + 86400000) }, // margem de segurança
      status: {
        notIn: ["CANCELLED"],
      },
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
      startAt: { gte: targetDayStart },
      endAt: { lte: targetDayEnd },
    },
  });

  const slots: TimeSlot[] = [];
  const duration = service.durationMinutes;
  const buffer = service.bufferMinutes || 0;
  const totalSlotDuration = duration + buffer;

  // Itera sobre as faixas de horário de trabalho do dia
  for (const rule of weeklyRules) {
    const [startH, startM] = rule.startTime.split(":").map(Number);
    const [endH, endM] = rule.endTime.split(":").map(Number);

    // Constrói objeto Date no fuso
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

      // Valida antecedência mínima
      if (slotStart < minNoticeHoursDate(minBookingTime)) {
        isAvailable = false;
        reason = "Antecedência mínima necessária não atingida";
      }

      // Valida horizonte máximo
      if (maxBookingTime && slotStart > maxBookingTime) {
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
          const apptBuffer = appt.service.bufferMinutes || 0;
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
        status: { notIn: ["CANCELLED"] },
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
        status: { notIn: ["CANCELLED"] },
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

    // Se o agendamento for virtual, provisiona snapshot da sala Jitsi
    if (modality === "ONLINE" || modality === "BOTH") {
      const roomSuffix = Math.random().toString(36).substring(2, 10);
      const roomName = `psi-session-${appointment.id}-${roomSuffix}`;
      const psiEntryToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

      await tx.videoMeeting.create({
        data: {
          appointmentId: appointment.id,
          provider: "JITSI",
          roomName,
          psiEntryToken,
        },
      });

      const entryUrl = `${process.env.APP_URL || "http://localhost:3000"}/consulta-virtual/${psiEntryToken}`;
      await tx.appointment.update({
        where: { id: appointment.id },
        data: { meetingUrlSnapshot: entryUrl },
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
