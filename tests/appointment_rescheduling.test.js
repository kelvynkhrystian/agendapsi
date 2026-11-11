const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { execFileSync } = require("node:child_process");

test("Remarcação de Consultas — 1. Contratos de Segurança, Autorização e Interface PT-BR", () => {
  const rescheduleRoute = fs.readFileSync(
    path.join(process.cwd(), "src", "app", "api", "appointments", "[id]", "reschedule", "route.ts"),
    "utf8"
  );
  assert.ok(rescheduleRoute.includes("requireAdmin"), "Rota de remarcação deve exigir requireAdmin()");
  assert.ok(rescheduleRoute.includes("rescheduleAppointmentAtomic"), "Deve usar função transacional atômica");
  assert.ok(rescheduleRoute.includes("APPOINTMENT_RESCHEDULED"), "Deve disparar notificação APPOINTMENT_RESCHEDULED");
  assert.ok(rescheduleRoute.includes("updateGoogleMeetConference"), "Deve atualizar evento do Google Meet quando aplicável");
  assert.ok(rescheduleRoute.includes("Este horário não está mais disponível. Selecione outro horário."));
  assert.ok(rescheduleRoute.includes("Consulta remarcada com sucesso."));

  const slotsRoute = fs.readFileSync(
    path.join(process.cwd(), "src", "app", "api", "availability", "slots", "route.ts"),
    "utf8"
  );
  assert.ok(slotsRoute.includes("excludeAppointmentId"), "Slots deve suportar excludeAppointmentId");
  assert.ok(slotsRoute.includes('session?.role === "ADMIN"'), "Ignorar antecedência e excluir ID só é permitido para ADMIN autenticado");

  const agendaPage = fs.readFileSync(
    path.join(process.cwd(), "src", "app", "admin", "agenda", "page.tsx"),
    "utf8"
  );
  for (const requiredLabel of [
    "Remarcar",
    "Remarcar Consulta",
    "Data Atual",
    "Novo Dia",
    "Horários Disponíveis",
    "Novo Horário",
    "Cancelar",
    "Confirmar Remarcação",
    "Consulta remarcada com sucesso.",
    "Este horário não está mais disponível. Selecione outro horário.",
    "Histórico de Remarcações",
    "CalendarClock",
  ]) {
    assert.ok(agendaPage.includes(requiredLabel), `Agenda deve conter rótulo/símbolo '${requiredLabel}'`);
  }
});

function compileTsLibsToTempDir(tempDir) {
  const ts = require("typescript");
  const files = [
    "src/lib/prisma.ts",
    "src/lib/translations.ts",
    "src/lib/utils.ts",
    "src/lib/video-provider.ts",
    "src/lib/schedule.ts",
    "src/lib/notifications.ts",
  ];

  const nmTarget = path.join(process.cwd(), "node_modules");
  const nmLink = path.join(tempDir, "node_modules");
  if (!fs.existsSync(nmLink)) {
    fs.symlinkSync(nmTarget, nmLink, process.platform === "win32" ? "junction" : "dir");
  }

  for (const relPath of files) {
    const absIn = path.join(process.cwd(), relPath);
    const source = fs.readFileSync(absIn, "utf8");
    const transpiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
        resolveJsonModule: true,
      },
      fileName: absIn,
    });
    const outText = transpiled.outputText.replace(/@\/lib\//g, "./");
    const outPath = path.join(tempDir, path.basename(relPath, ".ts") + ".js");
    fs.writeFileSync(outPath, outText, "utf8");
  }
}

function getNextWeekdays(startFromDaysAhead, count) {
  const results = [];
  const cursor = new Date();
  cursor.setUTCHours(0, 0, 0, 0);
  cursor.setUTCDate(cursor.getUTCDate() + startFromDaysAhead);
  while (results.length < count) {
    const dow = cursor.getUTCDay();
    if (dow >= 1 && dow <= 5) {
      results.push(new Date(cursor));
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return results;
}

test("Remarcação de Consultas — 2. Fluxo Completo, Concorrência, Buffers, Lembretes e Notificações em BD Isolado", async (t) => {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    t.skip(".env ausente para criar banco temporário isolado");
    return;
  }

  const envText = fs.readFileSync(envPath, "utf8");
  const dbMatch = envText.match(/^DATABASE_URL=["']?([^\r\n"']+)/m);
  if (!dbMatch) {
    t.skip("DATABASE_URL não configurada");
    return;
  }

  const baseUrl = new URL(dbMatch[1]);
  const adminConnUrl = new URL(baseUrl.toString());
  adminConnUrl.pathname = "/information_schema";

  const { PrismaClient } = require("@prisma/client");
  const bootstrapPrisma = new PrismaClient({
    datasources: { db: { url: adminConnUrl.toString() } },
  });

  try {
    await bootstrapPrisma.$queryRawUnsafe("SELECT 1");
  } catch (err) {
    await bootstrapPrisma.$disconnect().catch(() => {});
    t.skip(`MySQL/MariaDB indisponível no ambiente de teste: ${err.message}`);
    return;
  }

  const testDbName = `psi_reschedule_test_${Date.now()}`;
  const testDbUrlObj = new URL(baseUrl.toString());
  testDbUrlObj.pathname = `/${testDbName}`;
  const testDbUrl = testDbUrlObj.toString();

  const tmpLibDir = fs.mkdtempSync(path.join(os.tmpdir(), "psi-resched-test-"));
  const prevDatabaseUrl = process.env.DATABASE_URL;

  try {
    await bootstrapPrisma.$executeRawUnsafe(
      `CREATE DATABASE \`${testDbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );

    execFileSync(
      process.platform === "win32" ? "npx.cmd" : "npx",
      ["prisma", "db", "push", "--skip-generate"],
      {
        cwd: process.cwd(),
        env: { ...process.env, DATABASE_URL: testDbUrl },
        stdio: "pipe",
        shell: process.platform === "win32",
      }
    );

    compileTsLibsToTempDir(tmpLibDir);
    process.env.DATABASE_URL = testDbUrl;
    delete global.prisma;

    const { prisma } = require(path.join(tmpLibDir, "prisma.js"));
    const {
      getAvailableSlotsForDate,
      rescheduleAppointmentAtomic,
    } = require(path.join(tmpLibDir, "schedule.js"));
    const { dispatchNotification } = require(path.join(tmpLibDir, "notifications.js"));

    // Seed mínimo isolado
    const admin = await prisma.adminAccount.create({
      data: {
        name: "Dra. Teste",
        email: "admin-teste@psi.local",
        passwordHash: "hash",
        phone: "11999990000",
      },
    });

    await prisma.systemSettings.create({
      data: {
        id: "default",
        timezone: "America/Sao_Paulo",
        minBookingNoticeHours: 24,
        maxBookingHorizonDays: 30,
        defaultBufferMinutes: 10,
        activeVideoProvider: "JITSI",
      },
    });

    await prisma.siteSettings.create({
      data: {
        id: "default",
        aboutText: "Texto sobre teste",
        address: "Rua da Clínica, 123 - Sala 4",
      },
    });

    await prisma.sharedNotificationTemplate.create({
      data: {
        eventType: "APPOINTMENT_RESCHEDULED",
        title: "Consulta reagendada",
        body: "Olá, {nome_paciente}! Sua consulta foi reagendada para {data} às {hora}.",
        deliveryMode: "ALL_CHANNELS",
      },
    });

    for (const dow of [1, 2, 3, 4, 5]) {
      await prisma.weeklyAvailability.create({
        data: { dayOfWeek: dow, startTime: "08:00", endTime: "18:00", isActive: true },
      });
    }

    const svcOnline = await prisma.service.create({
      data: {
        name: "Psicoterapia Online",
        priceCents: 18000,
        durationMinutes: 60,
        bufferMinutes: 10,
        modality: "ONLINE",
        isActive: true,
      },
    });

    const svcPresential = await prisma.service.create({
      data: {
        name: "Psicoterapia Presencial",
        priceCents: 20000,
        durationMinutes: 60,
        bufferMinutes: 10,
        modality: "PRESENTIAL",
        isActive: true,
      },
    });

    const patient = await prisma.patient.create({
      data: {
        fullName: "Maria Oliveira",
        email: "maria.teste@psi.local",
        phone: "11988887777",
      },
    });

    const [day1, day2, day3, blockedDay, day4] = getNextWeekdays(3, 5);
    const day1Str = day1.toISOString().slice(0, 10);
    const day2Str = day2.toISOString().slice(0, 10);
    const day3Str = day3.toISOString().slice(0, 10);
    const blockedDayStr = blockedDay.toISOString().slice(0, 10);
    const day4Str = day4.toISOString().slice(0, 10);

    // Exceção de dia bloqueado integral
    await prisma.availabilityException.create({
      data: {
        date: new Date(`${blockedDayStr}T00:00:00.000Z`),
        isBlocked: true,
        reason: "Feriado Clínico",
      },
    });

    // Agendamento ONLINE A1 (alvo principal) com sala Jitsi, pagamento e prontuário vinculado
    const a1Start = new Date(`${day1Str}T08:00:00.000Z`);
    const a1End = new Date(`${day1Str}T09:00:00.000Z`);
    const apptOnline = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        serviceId: svcOnline.id,
        startAt: a1Start,
        endAt: a1End,
        modality: "ONLINE",
        status: "CONFIRMED",
        meetingUrlSnapshot: "http://localhost:3000/consulta-virtual/token-a1",
        videoMeeting: {
          create: {
            provider: "JITSI",
            roomName: "psi-session-a1-room",
            psiEntryToken: "token-a1",
          },
        },
        payment: {
          create: {
            patientId: patient.id,
            amountCents: 18000,
            status: "APPROVED",
            method: "ONLINE_SIMULATED",
          },
        },
        clinicalRecord: {
          create: {
            patientId: patient.id,
            sessionDate: a1Start,
            noteRichText: "<p>Evolução sigilosa teste - nunca vazar em log</p>",
          },
        },
      },
    });

    // Lembretes prévios obsoletos de A1
    await prisma.notificationDelivery.createMany({
      data: [
        {
          recipient: patient.phone,
          channel: "WHATSAPP",
          templateType: "REMINDER_24H",
          status: "SIMULATED",
          simulated: true,
          idempotencyKey: `reminder_24h_${apptOnline.id}`,
          relatedAppointmentId: apptOnline.id,
        },
        {
          recipient: patient.phone,
          channel: "WHATSAPP",
          templateType: "REMINDER_2H",
          status: "QUEUED",
          simulated: true,
          idempotencyKey: `reminder_2h_${apptOnline.id}`,
          relatedAppointmentId: apptOnline.id,
        },
      ],
    });

    // Agendamento PRESENCIAL A2
    const apptPresential = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        serviceId: svcPresential.id,
        startAt: new Date(`${day1Str}T10:20:00.000Z`),
        endAt: new Date(`${day1Str}T11:20:00.000Z`),
        modality: "PRESENTIAL",
        status: "CONFIRMED",
        meetingUrlSnapshot: null,
      },
    });

    // Conflito no day2:
    // - LATE_CANCELLED em 08:00 (NÃO deve bloquear 08:00!)
    // - CONFIRMED em 09:30..10:30 com buffer 10m (DEVE bloquear slots 09:10 e 10:20!)
    // - Hold ativo em 12:40..13:40 (DEVE bloquear 12:40!)
    await prisma.appointment.createMany({
      data: [
        {
          patientId: patient.id,
          serviceId: svcOnline.id,
          startAt: new Date(`${day2Str}T08:00:00.000Z`),
          endAt: new Date(`${day2Str}T09:00:00.000Z`),
          modality: "ONLINE",
          status: "LATE_CANCELLED",
        },
        {
          patientId: patient.id,
          serviceId: svcOnline.id,
          startAt: new Date(`${day2Str}T09:30:00.000Z`),
          endAt: new Date(`${day2Str}T10:30:00.000Z`),
          modality: "ONLINE",
          status: "CONFIRMED",
        },
      ],
    });

    await prisma.appointmentHold.create({
      data: {
        holdToken: "hold-bloqueio-day2",
        serviceId: svcOnline.id,
        patientId: patient.id,
        startAt: new Date(`${day2Str}T12:40:00.000Z`),
        endAt: new Date(`${day2Str}T13:40:00.000Z`),
        expiresAt: new Date(Date.now() + 30 * 60000),
      },
    });

    // Agendamento concluído (não pode remarcar)
    const apptCompleted = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        serviceId: svcOnline.id,
        startAt: new Date(`${day1Str}T12:40:00.000Z`),
        endAt: new Date(`${day1Str}T13:40:00.000Z`),
        modality: "ONLINE",
        status: "COMPLETED",
      },
    });

    // Verificação 1: Dia bloqueado não retorna slots
    const blockedSlots = await getAvailableSlotsForDate({
      dateStr: blockedDayStr,
      serviceId: svcOnline.id,
      respectMinNotice: false,
    });
    assert.equal(blockedSlots.length, 0, "Dia com bloqueio integral deve retornar lista vazia");

    // Verificação 2: LATE_CANCELLED livre, conflito + buffer e Hold ativo indisponíveis
    const day2Slots = await getAvailableSlotsForDate({
      dateStr: day2Str,
      serviceId: svcOnline.id,
      excludeAppointmentId: apptOnline.id,
      respectMinNotice: false,
    });
    const slot0800 = day2Slots.find((s) => s.formattedTime === "08:00");
    const slot0910 = day2Slots.find((s) => s.formattedTime === "09:10");
    const slot1020 = day2Slots.find((s) => s.formattedTime === "10:20");
    const slot1130 = day2Slots.find((s) => s.formattedTime === "11:30");
    const slot1240 = day2Slots.find((s) => s.formattedTime === "12:40");

    assert.equal(slot0800?.available, true, "Slot com apenas LATE_CANCELLED deve estar disponível");
    assert.equal(slot0910?.available, false, "Slot que invade outro agendamento + buffer deve ser bloqueado");
    assert.equal(slot1020?.available, false, "Slot que invade buffer de 10min (término 10:30+10=10:40) deve ser bloqueado");
    assert.equal(slot1130?.available, true, "Slot livre após fim + buffer deve estar disponível");
    assert.equal(slot1240?.available, false, "Slot com AppointmentHold ativo deve ser bloqueado");

    // Verificação 3: Impede remarcar consulta COMPLETED ou para o passado ou para horário ocupado/fora da grade
    await assert.rejects(
      rescheduleAppointmentAtomic({
        appointmentId: apptCompleted.id,
        newStartAt: new Date(`${day3Str}T09:10:00.000Z`),
        adminUserId: admin.id,
      }),
      /STATUS_NAO_PERMITE_REMARCACAO/
    );

    await assert.rejects(
      rescheduleAppointmentAtomic({
        appointmentId: apptOnline.id,
        newStartAt: new Date("2025-01-10T10:00:00.000Z"),
        adminUserId: admin.id,
      }),
      /HORARIO_NO_PASSADO/
    );

    await assert.rejects(
      rescheduleAppointmentAtomic({
        appointmentId: apptOnline.id,
        newStartAt: new Date(`${day2Str}T10:20:00.000Z`),
        adminUserId: admin.id,
      }),
      /HORARIO_INDISPONIVEL/
    );

    await assert.rejects(
      rescheduleAppointmentAtomic({
        appointmentId: apptOnline.id,
        newStartAt: new Date(`${blockedDayStr}T09:10:00.000Z`),
        adminUserId: admin.id,
      }),
      /HORARIO_INDISPONIVEL/
    );

    // Verificação 4: Primeira remarcação válida de consulta ONLINE
    const firstNewStart = new Date(`${day3Str}T09:10:00.000Z`);
    const res1 = await rescheduleAppointmentAtomic({
      appointmentId: apptOnline.id,
      newStartAt: firstNewStart,
      adminUserId: admin.id,
    });

    assert.equal(res1.appointment.id, apptOnline.id, "Deve preservar identidade do agendamento");
    assert.equal(res1.appointment.startAt.toISOString(), firstNewStart.toISOString());
    assert.equal(
      res1.appointment.endAt.toISOString(),
      new Date(`${day3Str}T10:10:00.000Z`).toISOString(),
      "Duração do serviço deve ser recalculada com exatidão"
    );
    assert.equal(res1.appointment.videoMeeting?.provider, "JITSI", "Provedor de vídeo deve ser preservado");
    assert.equal(
      res1.appointment.meetingUrlSnapshot,
      "http://localhost:3000/consulta-virtual/token-a1",
      "Link de teleconsulta deve permanecer válido"
    );

    // Verifica preservação financeira e clínica (sem duplicação)
    const paymentCount = await prisma.payment.count({ where: { appointmentId: apptOnline.id } });
    const recordCount = await prisma.clinicalRecord.count({ where: { appointmentId: apptOnline.id } });
    const totalApptsAfter1 = await prisma.appointment.count({ where: { patientId: patient.id } });
    assert.equal(paymentCount, 1, "Pagamento existente deve ser preservado sem nova cobrança");
    assert.equal(recordCount, 1, "Prontuário clínico deve ser preservado");
    assert.equal(totalApptsAfter1, 5, "Não deve duplicar agendamentos ao remarcar");

    // Verifica invalidação e liberação de lembretes
    const active24h = await prisma.notificationDelivery.findUnique({
      where: { idempotencyKey: `reminder_24h_${apptOnline.id}` },
    });
    assert.equal(active24h, null, "Chave anterior reminder_24h deve ser superada para permitir novo lembrete");
    const cancelled2h = await prisma.notificationDelivery.findMany({
      where: { relatedAppointmentId: apptOnline.id, templateType: "REMINDER_2H", status: "CANCELLED" },
    });
    assert.equal(cancelled2h.length, 1, "Lembrete pendente antigo deve ser invalidado como CANCELLED");

    // Disparo de notificação da 1ª remarcação (e teste de deduplicação por mesma chave)
    const notif1 = await dispatchNotification({
      recipientId: patient.id,
      recipientRole: "PATIENT",
      eventType: "APPOINTMENT_RESCHEDULED",
      relatedEntityType: "Appointment",
      relatedEntityId: apptOnline.id,
      vars: {
        patientName: patient.fullName,
        serviceName: svcOnline.name,
        date: res1.appointment.startAt,
        time: res1.appointment.startAt,
        timezone: "America/Sao_Paulo",
      },
      idempotencyKey: `reschedule-${apptOnline.id}-${res1.auditLogId}`,
    });
    const notif1Retry = await dispatchNotification({
      recipientId: patient.id,
      recipientRole: "PATIENT",
      eventType: "APPOINTMENT_RESCHEDULED",
      relatedEntityType: "Appointment",
      relatedEntityId: apptOnline.id,
      vars: {
        patientName: patient.fullName,
        serviceName: svcOnline.name,
        date: res1.appointment.startAt,
        time: res1.appointment.startAt,
        timezone: "America/Sao_Paulo",
      },
      idempotencyKey: `reschedule-${apptOnline.id}-${res1.auditLogId}`,
    });
    assert.ok(notif1 && notif1Retry, "Notificações devem ser processadas");

    // Verificação 5: Segunda remarcação consecutiva para day4 NÃO deve ter notificação suprimida
    const secondNewStart = new Date(`${day4Str}T08:00:00.000Z`);
    const res2 = await rescheduleAppointmentAtomic({
      appointmentId: apptOnline.id,
      newStartAt: secondNewStart,
      adminUserId: admin.id,
    });
    await dispatchNotification({
      recipientId: patient.id,
      recipientRole: "PATIENT",
      eventType: "APPOINTMENT_RESCHEDULED",
      relatedEntityType: "Appointment",
      relatedEntityId: apptOnline.id,
      vars: {
        patientName: patient.fullName,
        serviceName: svcOnline.name,
        date: res2.appointment.startAt,
        time: res2.appointment.startAt,
        timezone: "America/Sao_Paulo",
      },
      idempotencyKey: `reschedule-${apptOnline.id}-${res2.auditLogId}`,
    });

    const patientReschedNotifs = await prisma.notification.findMany({
      where: {
        recipientId: patient.id,
        eventType: "APPOINTMENT_RESCHEDULED",
        relatedEntityId: apptOnline.id,
      },
    });
    assert.equal(
      patientReschedNotifs.length,
      2,
      "Duas remarcações distintas devem gerar exatamente 2 notificações (e retry da 1ª não deve duplicar)"
    );
    assert.ok(
      patientReschedNotifs.every((n) => !n.message.includes("Evolução sigilosa")),
      "Notificações nunca podem expor conteúdo clínico"
    );

    const auditLogs = await prisma.auditLog.findMany({
      where: { resourceId: apptOnline.id, action: "APPOINTMENT_RESCHEDULED" },
      orderBy: { createdAt: "asc" },
    });
    assert.equal(auditLogs.length, 2, "Ambas as remarcações devem estar registradas no histórico AuditLog");

    // Verificação 6: Consulta PRESENCIAL remarcada não cria VideoMeeting nem link
    const presRes = await rescheduleAppointmentAtomic({
      appointmentId: apptPresential.id,
      newStartAt: new Date(`${day3Str}T11:30:00.000Z`),
      adminUserId: admin.id,
    });
    assert.equal(presRes.appointment.modality, "PRESENTIAL");
    assert.equal(presRes.appointment.meetingUrlSnapshot, null, "Presencial nunca pode ter sala virtual");
    assert.equal(presRes.appointment.videoMeeting, null, "Presencial nunca pode gerar VideoMeeting");

    await prisma.$disconnect();
  } finally {
    if (prevDatabaseUrl !== undefined) {
      process.env.DATABASE_URL = prevDatabaseUrl;
    } else {
      delete process.env.DATABASE_URL;
    }
    await bootstrapPrisma.$executeRawUnsafe(`DROP DATABASE IF EXISTS \`${testDbName}\``).catch(() => {});
    await bootstrapPrisma.$disconnect().catch(() => {});
    try {
      const nmLink = path.join(tmpLibDir, "node_modules");
      if (fs.existsSync(nmLink)) fs.unlinkSync(nmLink);
    } catch {}
    fs.rmSync(tmpLibDir, { recursive: true, force: true });
  }
});
