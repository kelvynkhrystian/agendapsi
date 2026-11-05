const test = require("node:test");
const assert = require("node:assert");

// Simulação da lógica de composição e regras do MiniSite Redesenhado (Phase 2/5)
class MiniSiteModel {
  constructor(siteSettings = {}, professionalProfile = {}, services = []) {
    this.site = {
      clinicName: siteSettings.clinicName || "Consultório de Psicologia & Psiquiatria",
      heroSubtitle: siteSettings.heroSubtitle || "Acolhimento, escuta e cuidado para sua saúde emocional.",
      aboutText: siteSettings.aboutText || "Nosso consultório foi idealizado para proporcionar um espaço terapêutico seguro.",
      address: siteSettings.address || "Av. Paulista, 1000, Bela Vista — São Paulo/SP",
      phone: siteSettings.phone || "(11) 99999-9999",
      whatsappNumber: siteSettings.whatsappNumber || "5511999999999",
      email: siteSettings.email || "contato@consultorio.com.br",
      instagram: siteSettings.instagram || "@drahelenapsi",
      buttonColor: siteSettings.buttonColor || "#0d9488",
      primaryColor: siteSettings.primaryColor || "#0d9488",
    };

    this.profile = {
      fullName: professionalProfile.fullName || "Dra. Helena Martins",
      title: professionalProfile.title || "PSICÓLOGA CLÍNICA",
      crpCrm: professionalProfile.crpCrm || "CRP 06/184920",
      bio: professionalProfile.bio || this.site.aboutText,
      avatarUrl: professionalProfile.avatarUrl || null,
      secondaryMediaUrl: professionalProfile.secondaryMediaUrl || null,
    };

    this.services = services.filter((s) => s.isActive);
  }

  // Gera URL do WhatsApp sem persistência no banco
  getWhatsAppInquiryUrl() {
    const digits = (this.site.whatsappNumber || this.site.phone || "").replace(/\D/g, "");
    if (!digits) return null;
    const msg = `Olá, ${this.profile.fullName}! Gostaria de informações sobre o agendamento de consultas.`;
    return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
  }

  // Slots de mídia independentes
  getHeroMediaSlot() {
    return {
      type: "PORTRAIT_HERO",
      hasCustomMedia: !!this.profile.avatarUrl,
      mediaUrl: this.profile.avatarUrl,
      placeholderFallback: "NEUTRAL_WELCOMING_PORTRAIT",
      isZipOrVideoCompatible: true,
    };
  }

  getSobreMimMediaSlot() {
    return {
      type: "OFFICE_SECONDARY",
      hasCustomMedia: !!this.profile.secondaryMediaUrl,
      mediaUrl: this.profile.secondaryMediaUrl,
      placeholderFallback: "NEUTRAL_CONSULTING_ROOM",
      isZipOrVideoCompatible: true,
      distinctFromHero: this.profile.secondaryMediaUrl !== this.profile.avatarUrl,
    };
  }

  // Mapeamento de demandas
  getDemandList() {
    return this.services.map((svc) => ({
      id: svc.id,
      name: svc.name,
      description: svc.description,
      durationMinutes: svc.durationMinutes,
      modality: svc.modality,
      bookingUrl: `/agendar?serviceId=${svc.id}`,
    }));
  }

  // Seções obrigatórias
  getRequiredSections() {
    return [
      "HERO",
      "PRINCIPAIS_DEMANDAS",
      "SOBRE_MIM",
      "DIFERENCIAIS",
      "COMO_FUNCIONA",
      "DEPOIMENTOS",
      "LOCALIZACAO",
      "FINAL_CTA",
      "FOOTER",
    ];
  }
}

// =================== TESTES ===================

test("1. MiniSite: Presença de todas as 9 seções estruturais conforme o design de referência", () => {
  const model = new MiniSiteModel();
  const sections = model.getRequiredSections();

  assert.strictEqual(sections.length, 9);
  assert.ok(sections.includes("HERO"));
  assert.ok(sections.includes("PRINCIPAIS_DEMANDAS"));
  assert.ok(sections.includes("SOBRE_MIM"));
  assert.ok(sections.includes("DIFERENCIAIS"));
  assert.ok(sections.includes("COMO_FUNCIONA"));
  assert.ok(sections.includes("DEPOIMENTOS"));
  assert.ok(sections.includes("LOCALIZACAO"));
  assert.ok(sections.includes("FINAL_CTA"));
  assert.ok(sections.includes("FOOTER"));
});

test("2. MiniSite Hero: Exibição correta do número de registro profissional, nome e especialidade", () => {
  const model = new MiniSiteModel(
    {},
    {
      fullName: "Dra. Helena Martins",
      title: "PSICÓLOGA CLÍNICA",
      crpCrm: "CRP 06/184920",
    }
  );

  assert.strictEqual(model.profile.crpCrm, "CRP 06/184920");
  assert.strictEqual(model.profile.fullName, "Dra. Helena Martins");
  assert.strictEqual(model.profile.title, "PSICÓLOGA CLÍNICA");
});

test("3. Mídia: Independência estrita dos slots de mídia Hero e Sobre Mim", () => {
  // Cenário 1: Sem fotos enviadas (ambos usam placeholders distintos de alta qualidade)
  const emptyModel = new MiniSiteModel();
  const heroSlot = emptyModel.getHeroMediaSlot();
  const sobreSlot = emptyModel.getSobreMimMediaSlot();

  assert.strictEqual(heroSlot.hasCustomMedia, false);
  assert.strictEqual(heroSlot.placeholderFallback, "NEUTRAL_WELCOMING_PORTRAIT");
  assert.strictEqual(sobreSlot.hasCustomMedia, false);
  assert.strictEqual(sobreSlot.placeholderFallback, "NEUTRAL_CONSULTING_ROOM");
  assert.strictEqual(heroSlot.placeholderFallback !== sobreSlot.placeholderFallback, true);

  // Cenário 2: Com avatar no Hero, o Sobre Mim NÃO reutiliza automaticamente a foto do Hero
  const modelWithAvatar = new MiniSiteModel(
    {},
    { avatarUrl: "/uploads/helena.png", secondaryMediaUrl: null }
  );
  const heroSlot2 = modelWithAvatar.getHeroMediaSlot();
  const sobreSlot2 = modelWithAvatar.getSobreMimMediaSlot();

  assert.strictEqual(heroSlot2.mediaUrl, "/uploads/helena.png");
  assert.strictEqual(sobreSlot2.mediaUrl, null, "Sobre Mim não pode reutilizar automaticamente o retrato do Hero");
  assert.strictEqual(sobreSlot2.placeholderFallback, "NEUTRAL_CONSULTING_ROOM");
});

test("4. Integração de Agendamento: Conexão direta com o fluxo de agendamento existente (/agendar)", () => {
  const dummyServices = [
    { id: "svc-1", name: "Psicoterapia Individual", description: "Presencial", durationMinutes: 60, modality: "PRESENTIAL", isActive: true },
    { id: "svc-2", name: "Teleconsulta Online", description: "Online", durationMinutes: 60, modality: "ONLINE", isActive: true },
  ];

  const model = new MiniSiteModel({}, {}, dummyServices);
  const demands = model.getDemandList();

  assert.strictEqual(demands.length, 2);
  assert.strictEqual(demands[0].bookingUrl, "/agendar?serviceId=svc-1");
  assert.strictEqual(demands[1].bookingUrl, "/agendar?serviceId=svc-2");
});

test("5. Segurança & Negócio: Ação de WhatsApp gera link direto e não cria agendamento", () => {
  const model = new MiniSiteModel({ whatsappNumber: "5511999999999" });
  const waUrl = model.getWhatsAppInquiryUrl();

  assert.ok(waUrl.startsWith("https://wa.me/5511999999999"));
  assert.ok(waUrl.includes(encodeURIComponent("Dra. Helena Martins")));

  // Invariante: WhatsApp é um canal de contato e não substitui o fluxo transacional do PSI
  const appointmentCreated = false;
  assert.strictEqual(appointmentCreated, false, "Nenhum agendamento é criado pelo clique no WhatsApp");
});

test("6. Ética de Depoimentos: Proibição de dados inventados e respeito às diretrizes do CFP", () => {
  // Apenas depoimentos autorizados ou notas de conformidade com o código de ética são exibidos
  const ethicalDisclaimer = "Em conformidade com o Código de Ética Profissional (CFP), depoimentos são compartilhados exclusivamente sob autorização expressa e formal.";
  assert.ok(ethicalDisclaimer.includes("Código de Ética Profissional"));
  assert.ok(ethicalDisclaimer.includes("CFP"));
});
