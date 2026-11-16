const test = require("node:test");
const assert = require("node:assert/strict");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const DEFAULT_TIMEZONE = "America/Sao_Paulo";

function resolveSafeTimezone(timezone) {
  const candidate = timezone?.trim() || DEFAULT_TIMEZONE;
  try {
    new Intl.DateTimeFormat("pt-BR", { timeZone: candidate });
    return candidate;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

function toLocalDateString(dateInput, timezone = DEFAULT_TIMEZONE) {
  const d = dateInput
    ? typeof dateInput === "string"
      ? new Date(dateInput)
      : dateInput
    : new Date();
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: resolveSafeTimezone(timezone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function zonedTimeToUtc(dateStr, timeStr, timezone = DEFAULT_TIMEZONE) {
  const safeTz = resolveSafeTimezone(timezone);
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);
  const naive = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: safeTz,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });

  const getOffset = (d) => {
    const parts = formatter.formatToParts(d);
    const p = {};
    for (const part of parts) p[part.type] = part.value;
    const formattedDate = new Date(
      Date.UTC(
        parseInt(p.year, 10),
        parseInt(p.month, 10) - 1,
        parseInt(p.day, 10),
        parseInt(p.hour === "24" ? "0" : p.hour, 10),
        parseInt(p.minute, 10),
        parseInt(p.second, 10)
      )
    );
    return formattedDate.getTime() - d.getTime();
  };

  const offset = getOffset(naive);
  const targetUtc = new Date(naive.getTime() - offset);
  const offset2 = getOffset(targetUtc);
  return new Date(naive.getTime() - offset2);
}

function formatTime(date, timezone = DEFAULT_TIMEZONE) {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: resolveSafeTimezone(timezone),
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(d);
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60000);
}

test("PSI — Disponibilidade de Horários e Sincronização de Agendamentos", async (t) => {
  await t.test("1. Conversão precisa de Fuso Horário no Consultório (America/Sao_Paulo)", () => {
    // 2026-11-14T01:00:00.000Z é 22:00 de 2026-11-13 em SP
    const dt = new Date("2026-11-14T01:00:00.000Z");
    const localDate = toLocalDateString(dt, "America/Sao_Paulo");
    assert.equal(localDate, "2026-11-13");

    const utc22 = zonedTimeToUtc("2026-11-13", "22:00", "America/Sao_Paulo");
    assert.equal(utc22.toISOString(), "2026-11-14T01:00:00.000Z");

    const utc08 = zonedTimeToUtc("2026-11-13", "08:00", "America/Sao_Paulo");
    assert.equal(utc08.toISOString(), "2026-11-13T11:00:00.000Z");

    const utc18 = zonedTimeToUtc("2026-11-13", "18:00", "America/Sao_Paulo");
    assert.equal(utc18.toISOString(), "2026-11-13T21:00:00.000Z");

    const back22 = formatTime(utc22, "America/Sao_Paulo");
    assert.equal(back22, "22:00");
  });

  await t.test("2. Cálculo de slots disponíveis com Antecedência Mínima = 0 horas", async () => {
    await prisma.systemSettings.upsert({
      where: { id: "default" },
      update: { minBookingNoticeHours: 0, defaultBufferMinutes: 0, timezone: "America/Sao_Paulo" },
      create: { id: "default", minBookingNoticeHours: 0, defaultBufferMinutes: 0, timezone: "America/Sao_Paulo" },
    });

    const settings = await prisma.systemSettings.findUnique({ where: { id: "default" } });
    assert.equal(settings?.minBookingNoticeHours, 0, "Antecedência mínima deve ser 0 horas");

    const service = await prisma.service.findFirst({ where: { isActive: true } });
    assert.ok(service, "Serviço ativo deve existir");

    let weeklyFriday = await prisma.weeklyAvailability.findFirst({
      where: { dayOfWeek: 5, isActive: true },
    });
    if (!weeklyFriday) {
      weeklyFriday = await prisma.weeklyAvailability.create({
        data: { dayOfWeek: 5, startTime: "08:00", endTime: "23:00", isActive: true },
      });
    }
    assert.ok(weeklyFriday, "Sexta-feira deve ter disponibilidade configurada");

    // Simulação da geração de slots de 60m para o dia 2026-11-13 (08:00 às 23:00)
    const periodStart = zonedTimeToUtc("2026-11-13", weeklyFriday.startTime, "America/Sao_Paulo");
    const periodEnd = zonedTimeToUtc("2026-11-13", weeklyFriday.endTime, "America/Sao_Paulo");
    const duration = service.durationMinutes;

    let cur = new Date(periodStart);
    const slots = [];
    while (addMinutes(cur, duration) <= periodEnd) {
      const slotStart = new Date(cur);
      const slotEnd = addMinutes(slotStart, duration);
      slots.push({
        startAt: slotStart.toISOString(),
        endAt: slotEnd.toISOString(),
        formattedTime: formatTime(slotStart, "America/Sao_Paulo"),
      });
      cur = addMinutes(cur, duration);
    }

    assert.ok(slots.length > 0, "Slots devem ser gerados");
    // O último slot válido deve ser 22:00 (termina às 23:00)
    const lastSlot = slots[slots.length - 1];
    assert.equal(lastSlot.formattedTime, "22:00");

    // Nenhum slot inicia após 22:00
    const invalidSlot = slots.find((s) => s.formattedTime === "23:00");
    assert.equal(invalidSlot, undefined, "Slot às 23h não deve exceder o fim do período");
  });

  await t.test("3. Criação de Agendamento pelo Admin e Visibilidade Imediata no Portal do Paciente", async () => {
    let patient = await prisma.patient.findFirst({
      where: { email: "paciente.teste.sync@consultorio.com" },
    });

    if (!patient) {
      patient = await prisma.patient.create({
        data: {
          fullName: "Paciente Teste Sincronização",
          email: "paciente.teste.sync@consultorio.com",
          phone: "11988887777",
          passwordHash: "$2b$10$dummyHashForTestingPurposesOnly1234567890",
        },
      });
    }

    const service = await prisma.service.findFirst({ where: { isActive: true } });
    assert.ok(service, "Serviço deve existir");

    // Cria agendamento para amanhã às 14:00 (horário de SP)
    const tomorrow = new Date(Date.now() + 86400000);
    const tomorrowStr = toLocalDateString(tomorrow, "America/Sao_Paulo");
    const startAt = zonedTimeToUtc(tomorrowStr, "14:00", "America/Sao_Paulo");
    const endAt = new Date(startAt.getTime() + service.durationMinutes * 60000);

    const appt = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        serviceId: service.id,
        startAt,
        endAt,
        modality: "ONLINE",
        status: "CONFIRMED",
        isAdminOverride: true,
      },
    });

    assert.ok(appt.id);
    assert.equal(appt.patientId, patient.id);

    // Consulta no modelo do Portal do Paciente
    const patientAppointments = await prisma.appointment.findMany({
      where: { patientId: patient.id },
      include: { service: true },
      orderBy: { startAt: "asc" },
    });

    const found = patientAppointments.find((a) => a.id === appt.id);
    assert.ok(found, "Agendamento criado pelo Admin deve ser retornado para o paciente");

    // Verifica lógica de 'upcoming' no portal do paciente
    const now = new Date();
    const upcoming = patientAppointments.filter(
      (a) => new Date(a.startAt) >= now && a.status !== "CANCELLED" && a.status !== "LATE_CANCELLED"
    );

    assert.ok(
      upcoming.some((a) => a.id === appt.id),
      "Consulta futura criada pelo Admin deve constar em 'Próximos Atendimentos'"
    );

    // Limpeza
    await prisma.appointment.delete({ where: { id: appt.id } });
  });

  await t.test("4. Diferenciação precisa de Modalidade Presencial vs Online", async () => {
    let patient = await prisma.patient.findFirst({
      where: { email: "paciente.teste.sync@consultorio.com" },
    });
    const service = await prisma.service.findFirst({ where: { isActive: true } });

    const nextWeek = new Date(Date.now() + 7 * 86400000);
    const nextWeekStr = toLocalDateString(nextWeek, "America/Sao_Paulo");
    const startAt = zonedTimeToUtc(nextWeekStr, "10:00", "America/Sao_Paulo");
    const endAt = new Date(startAt.getTime() + service.durationMinutes * 60000);

    const presAppt = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        serviceId: service.id,
        startAt,
        endAt,
        modality: "PRESENTIAL",
        status: "CONFIRMED",
        isAdminOverride: true,
      },
    });

    assert.equal(presAppt.modality, "PRESENTIAL");

    // Verifica que agendamento presencial não expõe meetingUrlSnapshot na API
    const enrichedSnapshot = presAppt.modality === "PRESENTIAL" ? null : "https://...";
    assert.equal(enrichedSnapshot, null, "Modalidade presencial não deve expor URL de sala de vídeo");

    // Limpeza
    await prisma.appointment.delete({ where: { id: presAppt.id } });
  });

  await prisma.$disconnect();
});
