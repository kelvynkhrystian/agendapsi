const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando seed do banco de dados PSI...");

  // 1. Administrador de Desenvolvimento
  const adminPasswordHash = await bcrypt.hash("adminpsi", 10);
  const admin = await prisma.adminAccount.upsert({
    where: { email: "adminpsi@localhost.test" },
    update: {},
    create: {
      name: "Dra. Helena Martins",
      email: "adminpsi@localhost.test",
      passwordHash: adminPasswordHash,
      phone: "99999999999",
      crpCrm: "CRP 06/184920",
      mustChangePassword: true,
    },
  });
  console.log("Admin provisionado:", admin.email);

  // 2. Perfil Profissional
  await prisma.professionalProfile.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      fullName: "Dra. Helena Martins",
      title: "Psicóloga Clínica & Psicoterapeuta Cognitivo-Comportamental",
      crpCrm: "CRP 06/184920",
      bio: "Mais de 10 anos de experiência no acolhimento e tratamento de ansiedade, depressão, transições de vida e autoconhecimento. Atendimento humanizado, ético e baseado em evidências científicas.",
    },
  });

  // 3. Configurações do MiniSite
  await prisma.siteSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      clinicName: "Espaço Integrado de Psicologia & Saúde Mental",
      tagline: "Cuidado humanizado e escuta qualificada para o seu bem-estar.",
      heroTitle: "Sua jornada de acolhimento e transformação começa aqui",
      heroSubtitle: "Agende sua sessão presencial ou online com total sigilo, comodidade e acolhimento ético.",
      aboutText: "Nosso consultório foi planejado para oferecer um espaço acolhedor, seguro e confidencial. Aliamos a prática clínica rigorosa a uma postura humanizada e empática, auxiliando pacientes em todas as fases da vida a desenvolverem recursos para lidar com desafios emocionais e existenciais.",
      primaryColor: "#0d9488",
      address: "Av. Paulista, 1000, Conjunto 82 - Bela Vista, São Paulo - SP",
      phone: "(11) 99999-9999",
      whatsappNumber: "5511999999999",
      email: "contato@consultoriohelena.com.br",
      instagram: "@drahelenapsi",
    },
  });

  // 4. Configurações do Sistema
  await prisma.systemSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      timezone: "America/Sao_Paulo",
      minBookingNoticeHours: 24,
      maxBookingHorizonDays: 30,
      holdExpiryMinutes: 60,
      defaultCancellationNoticeDays: 3,
      allowPatientReschedule: true,
      activeVideoProvider: "JITSI",
      jitsiDomain: "meet.jit.si",
      enableOnlinePayment: true,
      enableInPersonPayment: true,
      enableWhatsAppPayment: true,
    },
  });

  // 5. Serviços Iniciais
  const servicesData = [
    {
      name: "Psicoterapia Individual (Presencial)",
      description: "Sessão individual no consultório em ambiente acolhedor, sigiloso e confortável.",
      priceCents: 18000,
      isFree: false,
      durationMinutes: 60,
      bufferMinutes: 10,
      modality: "PRESENTIAL",
      confirmationPolicy: "AUTOMATIC",
      cancellationNoticeDays: 3,
      isActive: true,
    },
    {
      name: "Psicoterapia Individual (Online)",
      description: "Atendimento por videochamada criptografada com link privativo e sala de espera segura.",
      priceCents: 18000,
      isFree: false,
      durationMinutes: 60,
      bufferMinutes: 10,
      modality: "ONLINE",
      confirmationPolicy: "AUTOMATIC",
      cancellationNoticeDays: 3,
      isActive: true,
    },
    {
      name: "Primeira Sessão de Acolhimento e Avaliação",
      description: "Encontro inicial detalhado para compreensão das demandas, histórico e alinhamento do plano terapêutico.",
      priceCents: 22000,
      isFree: false,
      durationMinutes: 75,
      bufferMinutes: 15,
      modality: "BOTH",
      confirmationPolicy: "AUTOMATIC",
      cancellationNoticeDays: 3,
      isActive: true,
    },
    {
      name: "Conversa de Alinhamento Inicial (Gratuita)",
      description: "Contato breve de 20 minutos para tirar dúvidas sobre o método terapêutico e verificar compatibilidade.",
      priceCents: 0,
      isFree: true,
      durationMinutes: 30,
      bufferMinutes: 10,
      modality: "ONLINE",
      confirmationPolicy: "AUTOMATIC",
      cancellationNoticeDays: 1,
      isActive: true,
    },
  ];

  for (const s of servicesData) {
    const existing = await prisma.service.findFirst({ where: { name: s.name } });
    if (!existing) {
      await prisma.service.create({ data: s });
    }
  }

  // 6. Disponibilidade Semanal (Segunda a Sexta, 08:00 às 18:00)
  for (let day = 1; day <= 5; day++) {
    const existing = await prisma.weeklyAvailability.findFirst({
      where: { dayOfWeek: day },
    });
    if (!existing) {
      await prisma.weeklyAvailability.create({
        data: {
          dayOfWeek: day,
          startTime: "08:00",
          endTime: "18:00",
          isActive: true,
        },
      });
    }
  }

  // 7. Template de Anamnese Padrão
  const defaultAnamnesis = await prisma.anamnesisTemplate.findFirst();
  if (!defaultAnamnesis) {
    await prisma.anamnesisTemplate.create({
      data: {
        title: "Anamnese Clínica Inicial do Paciente",
        description: "Formulário inicial para levantamento de histórico médico, queixas atuais e contexto de vida.",
        version: 1,
        isActive: true,
        fieldsJson: JSON.stringify([
          {
            id: "main_complaint",
            label: "Qual o motivo principal que o(a) levou a buscar apoio psicológico neste momento?",
            type: "textarea",
            required: true,
          },
          {
            id: "symptoms_duration",
            label: "Há quanto tempo você percebe esses sintomas ou dificuldades?",
            type: "text",
            required: true,
          },
          {
            id: "previous_therapy",
            label: "Já realizou psicoterapia ou acompanhamento psiquiátrico anteriormente?",
            type: "radio",
            options: ["Sim", "Não"],
            required: true,
          },
          {
            id: "current_medication",
            label: "Faz uso de alguma medicação contínua? Se sim, quais?",
            type: "textarea",
            required: false,
          },
          {
            id: "sleep_and_routine",
            label: "Como tem sido a qualidade do seu sono, alimentação e rotina diária?",
            type: "textarea",
            required: false,
          },
        ]),
      },
    });
  }

  // 8. Páginas Legais
  const legalPages = [
    {
      id: "privacy",
      title: "Política de Privacidade",
      contentHtml: "<h2>1. Compromisso com a Privacidade</h2><p>Este consultório respeita a sua privacidade e garante o sigilo ético e legal sobre todas as informações coletadas, em conformidade com o Código de Ética Profissional do Psicólogo e a Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018).</p><p>As informações clínicas e registros de prontuário possuem guarda estritamente confidencial e nunca são compartilhadas com terceiros sem consentimento formal ou determinação judicial expressa.</p>",
    },
    {
      id: "terms",
      title: "Termos de Uso e Contrato Terapêutico",
      contentHtml: "<h2>1. Pontualidade e Agendamentos</h2><p>As sessões possuem duração acordada no ato do agendamento. Solicita-se pontualidade para o aproveitamento integral do tempo reservado.</p><h2>2. Política de Cancelamento</h2><p>Cancelamentos ou reagendamentos devem ser informados com antecedência mínima de 3 dias úteis. Cancelamentos fora deste prazo são considerados tardios e poderão ensejar a cobrança da sessão reservada.</p>",
    },
    {
      id: "cookies",
      title: "Política de Cookies",
      contentHtml: "<h2>Uso de Cookies Essenciais</h2><p>Utilizamos apenas cookies essenciais para manter sua sessão autenticada com segurança e salvar preferências de tema visual. Não utilizamos cookies de rastreamento invasivo para fins publicitários de terceiros.</p>",
    },
    {
      id: "lgpd",
      title: "Tratamento de Dados Pessoais (LGPD)",
      contentHtml: "<h2>Direitos do Titular</h2><p>Em conformidade com a LGPD, o paciente tem direito de solicitar a confirmação da existência de tratamento, acesso aos seus dados cadastrais, correção de dados incompletos e portabilidade, observadas as normas de guarda obrigatória de prontuários médicos/psicológicos pelo prazo legal de 5 anos (Resolução CFP nº 01/2009).</p>",
    },
  ];

  for (const page of legalPages) {
    await prisma.legalPage.upsert({
      where: { id: page.id },
      update: {},
      create: page,
    });
  }

  // 9. Paciente de Demonstração
  const patientPasswordHash = await bcrypt.hash("paciente123", 10);
  const patient = await prisma.patient.upsert({
    where: { email: "paciente.teste@localhost.test" },
    update: {},
    create: {
      fullName: "Carlos Eduardo Silva",
      email: "paciente.teste@localhost.test",
      passwordHash: patientPasswordHash,
      phone: "(11) 98765-4321",
      cpf: "12345678900",
      birthDate: new Date("1990-05-15"),
      gender: "Masculino",
      address: "Rua das Flores, 120, Apto 42 - São Paulo/SP",
      isActive: true,
    },
  });
  console.log("Paciente demo provisionado:", patient.email);

  // 10. Paciente Menor de Idade com Responsável Legal
  const minorPatient = await prisma.patient.upsert({
    where: { email: "menor.teste@localhost.test" },
    update: {},
    create: {
      fullName: "Lucas Souza (Menor)",
      email: "menor.teste@localhost.test",
      passwordHash: patientPasswordHash,
      phone: "(11) 97654-3210",
      cpf: "98765432100",
      birthDate: new Date("2012-08-20"),
      isMinor: true,
      gender: "Masculino",
      address: "Alameda dos Anjos, 45 - São Paulo/SP",
      isActive: true,
      guardians: {
        create: {
          fullName: "Mariana Souza",
          cpf: "11122233344",
          phone: "(11) 99123-4567",
          email: "mariana.souza@localhost.test",
          relationship: "Mãe",
        },
      },
    },
  });
  console.log("Paciente menor provisionado:", minorPatient.email);

  console.log("Seed concluído com sucesso!");
}

main()
  .catch((e) => {
    console.error("Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
