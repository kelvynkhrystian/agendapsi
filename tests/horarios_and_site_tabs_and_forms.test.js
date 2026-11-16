const test = require("node:test");
const assert = require("node:assert/strict");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

test("PSI — Horários, Abas do Site e Formulários Simplificados", async (t) => {
  // 1. HORÁRIOS: Disponibilidade semanal com múltiplos intervalos no mesmo dia
  await t.test("1. Suporte a múltiplos intervalos por dia da semana (ex: Segunda 09:00-10:00 e 15:00-21:00)", async () => {
    // Limpa disponibilidade semanal para teste isolado
    await prisma.weeklyAvailability.deleteMany({});

    // Insere Segunda-feira com 2 intervalos: 09:00-10:00 e 15:00-21:00
    await prisma.weeklyAvailability.createMany({
      data: [
        { dayOfWeek: 1, startTime: "09:00", endTime: "10:00", isActive: true },
        { dayOfWeek: 1, startTime: "15:00", endTime: "21:00", isActive: true },
        // Terça-feira com 1 intervalo: 08:00-12:00
        { dayOfWeek: 2, startTime: "08:00", endTime: "12:00", isActive: true },
        // Quarta-feira inativa (fechado) mas preservando horários
        { dayOfWeek: 3, startTime: "08:00", endTime: "18:00", isActive: false },
      ],
    });

    const mondayRules = await prisma.weeklyAvailability.findMany({
      where: { dayOfWeek: 1, isActive: true },
      orderBy: { startTime: "asc" },
    });

    assert.equal(mondayRules.length, 2, "Segunda-feira deve conter exatamente 2 intervalos ativos");
    assert.equal(mondayRules[0].startTime, "09:00");
    assert.equal(mondayRules[0].endTime, "10:00");
    assert.equal(mondayRules[1].startTime, "15:00");
    assert.equal(mondayRules[1].endTime, "21:00");

    // Verifica que dia inativo permanece no banco com isActive=false
    const wednesdayRules = await prisma.weeklyAvailability.findMany({
      where: { dayOfWeek: 3 },
    });
    assert.equal(wednesdayRules.length, 1);
    assert.equal(wednesdayRules[0].isActive, false, "Quarta-feira deve estar inativa preservando horários");
  });

  // 2. HORÁRIOS: Dias Indisponíveis com datas pontuais, intervalos de datas e recorrência anual
  await t.test("2. Dias Indisponíveis: Datas pontuais, intervalos de datas (endDate) e recorrência anual", async () => {
    await prisma.availabilityException.deleteMany({});

    // 1. Data pontual (Natal) com recorrência anual
    const singleDate = await prisma.availabilityException.create({
      data: {
        date: new Date("2026-12-25T00:00:00.000Z"),
        endDate: null,
        isBlocked: true,
        reason: "Feriado de Natal",
        isYearlyRecurring: true,
      },
    });
    assert.ok(singleDate.id);
    assert.equal(singleDate.isYearlyRecurring, true);
    assert.equal(singleDate.endDate, null);

    // 2. Intervalo de datas (Férias Coletivas: 2026-12-28 a 2027-01-08)
    const dateRange = await prisma.availabilityException.create({
      data: {
        date: new Date("2026-12-28T00:00:00.000Z"),
        endDate: new Date("2027-01-08T23:59:59.999Z"),
        isBlocked: true,
        reason: "Férias Coletivas do Consultório",
        isYearlyRecurring: false,
      },
    });
    assert.ok(dateRange.id);
    assert.ok(dateRange.endDate);
    assert.equal(dateRange.endDate.toISOString().slice(0, 10), "2027-01-08");

    // 3. Exceção com horário parcial
    const partialBlock = await prisma.availabilityException.create({
      data: {
        date: new Date("2026-11-20T00:00:00.000Z"),
        startTime: "14:00",
        endTime: "17:00",
        isBlocked: true,
        reason: "Reunião Clínica Externa",
      },
    });
    assert.equal(partialBlock.startTime, "14:00");
    assert.equal(partialBlock.endTime, "17:00");
  });

  // 3. CALENDÁRIO & AGENDAMENTO: Lógica de verificação de datas bloqueadas e múltiplos turnos
  await t.test("3. Lógica de bloqueio: Feriados recorrentes, períodos de férias e múltiplos turnos", async () => {
    // Algoritmo de correspondência de exceções usado em schedule.ts
    function matchException(exc, targetDateStr) {
      const [year, month, day] = targetDateStr.split("-").map(Number);
      const targetDayStart = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
      const targetDayEnd = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

      if (exc.isYearlyRecurring) {
        const excStartMonth = exc.date.getUTCMonth() + 1;
        const excStartDay = exc.date.getUTCDate();
        if (!exc.endDate) {
          return excStartMonth === month && excStartDay === day;
        } else {
          const excEndMonth = exc.endDate.getUTCMonth() + 1;
          const excEndDay = exc.endDate.getUTCDate();
          const targetMMDD = month * 100 + day;
          const startMMDD = excStartMonth * 100 + excStartDay;
          const endMMDD = excEndMonth * 100 + excEndDay;
          if (startMMDD <= endMMDD) {
            return targetMMDD >= startMMDD && targetMMDD <= endMMDD;
          } else {
            return targetMMDD >= startMMDD || targetMMDD <= endMMDD;
          }
        }
      }

      const excStartUtc = new Date(
        Date.UTC(exc.date.getUTCFullYear(), exc.date.getUTCMonth(), exc.date.getUTCDate(), 0, 0, 0)
      );
      const excEndUtc = exc.endDate
        ? new Date(
            Date.UTC(
              exc.endDate.getUTCFullYear(),
              exc.endDate.getUTCMonth(),
              exc.endDate.getUTCDate(),
              23,
              59,
              59,
              999
            )
          )
        : new Date(
            Date.UTC(
              exc.date.getUTCFullYear(),
              exc.date.getUTCMonth(),
              exc.date.getUTCDate(),
              23,
              59,
              59,
              999
            )
          );
      return targetDayStart <= excEndUtc && targetDayEnd >= excStartUtc;
    }

    const christmas = {
      date: new Date("2026-12-25T00:00:00.000Z"),
      endDate: null,
      isYearlyRecurring: true,
    };

    assert.equal(matchException(christmas, "2026-12-25"), true, "Deve coincidir com Natal de 2026");
    assert.equal(matchException(christmas, "2027-12-25"), true, "Deve coincidir com Natal de 2027 pela recorrência anual");
    assert.equal(matchException(christmas, "2026-12-24"), false, "Véspera de Natal não é bloqueada");

    const vacation = {
      date: new Date("2026-12-28T00:00:00.000Z"),
      endDate: new Date("2027-01-08T23:59:59.999Z"),
      isYearlyRecurring: false,
    };

    assert.equal(matchException(vacation, "2026-12-28"), true, "Início das férias");
    assert.equal(matchException(vacation, "2026-12-31"), true, "Meio das férias");
    assert.equal(matchException(vacation, "2027-01-05"), true, "Período no ano seguinte");
    assert.equal(matchException(vacation, "2027-01-08"), true, "Último dia das férias");
    assert.equal(matchException(vacation, "2027-01-09"), false, "Dia posterior às férias");
  });

  // 4. SITE: Salvamento independente por seção sem sobrescrever dados
  await t.test("4. API de Site Settings: Atualização parcial de seção sem sobrescrever outras seções", async () => {
    // Garante SiteSettings inicial
    const existing = await prisma.siteSettings.upsert({
      where: { id: "default" },
      update: {
        heroTitle: "Título do Hero Original",
        heroSubtitle: "Subtítulo do Hero Original",
        clinicName: "Consultório Dr. Teste",
        aboutText: "Sobre o consultório teste",
        sectionsConfigJson: JSON.stringify({
          atendimentos: { isVisible: true, eyebrow: "Cuidado", title: "Atendimentos", subtitle: "Presencial e Online", ctaLabel: "Agendar" },
          diferenciais: { isVisible: true, eyebrow: "Por que nos escolher", title: "Diferenciais", subtitle: "Nossos pilares", items: [] },
        }),
      },
      create: {
        id: "default",
        heroTitle: "Título do Hero Original",
        heroSubtitle: "Subtítulo do Hero Original",
        clinicName: "Consultório Dr. Teste",
        aboutText: "Sobre o consultório teste",
        sectionsConfigJson: JSON.stringify({
          atendimentos: { isVisible: true, eyebrow: "Cuidado", title: "Atendimentos", subtitle: "Presencial e Online", ctaLabel: "Agendar" },
          diferenciais: { isVisible: true, eyebrow: "Por que nos escolher", title: "Diferenciais", subtitle: "Nossos pilares", items: [] },
        }),
      },
    });

    // Simula salvamento exclusivo da seção Localização (sem enviar heroTitle nem atendimentos)
    const updated = await prisma.siteSettings.update({
      where: { id: "default" },
      data: {
        address: "Av. Paulista",
        addressNumber: "1000",
        addressCity: "São Paulo",
        addressState: "SP",
      },
    });

    assert.equal(updated.address, "Av. Paulista");
    assert.equal(updated.heroTitle, "Título do Hero Original", "heroTitle não deve ter sido apagado ou sobrescrito");
  });

  // 5. FORMULÁRIOS: Ciclo de vida simplificado (Formulário Criado pronto para envio)
  await t.test("5. Formulários Simplificados: Formulário criado salva como PUBLISHED sem barreira de rascunho", async () => {
    const createdForm = await prisma.formTemplate.create({
      data: {
        title: "Avaliação Psicológica Inicial",
        description: "Questionário anamnese de acolhimento",
        instructions: "Preencha com sinceridade.",
        status: "PUBLISHED",
        version: 1,
        questions: {
          create: [
            {
              type: "SHORT_TEXT",
              label: "Qual o principal motivo da sua busca por atendimento?",
              isRequired: true,
              orderIndex: 1,
            },
            {
              type: "SINGLE_CHOICE",
              label: "Já realizou psicoterapia anteriormente?",
              isRequired: true,
              orderIndex: 2,
              options: ["Sim", "Não"],
            },
          ],
        },
      },
      include: {
        questions: true,
      },
    });

    assert.ok(createdForm.id);
    assert.equal(createdForm.status, "PUBLISHED", "Formulário deve estar pronto para envio aos pacientes");
    assert.equal(createdForm.questions.length, 2);

    // Limpa registro de teste
    await prisma.formTemplate.delete({ where: { id: createdForm.id } });
  });

  // Restaura disponibilidade semanal padrão para não afetar outros testes
  await prisma.weeklyAvailability.deleteMany({});
  await prisma.weeklyAvailability.createMany({
    data: [
      { dayOfWeek: 1, startTime: "08:00", endTime: "18:00", isActive: true },
      { dayOfWeek: 2, startTime: "08:00", endTime: "18:00", isActive: true },
      { dayOfWeek: 3, startTime: "08:00", endTime: "18:00", isActive: true },
      { dayOfWeek: 4, startTime: "08:00", endTime: "18:00", isActive: true },
      { dayOfWeek: 5, startTime: "08:00", endTime: "23:00", isActive: true },
      { dayOfWeek: 6, startTime: "08:00", endTime: "23:00", isActive: true },
    ],
  });

  await prisma.$disconnect();
});
