import { z } from "zod";

export const DEVELOPER_ATTRIBUTION = {
  prefix: "Software Atendimento PSI — Desenvolvido por",
  brandName: "KelvynK",
  url: "https://kelvynk.com.br",
} as const;

export interface DiferencialItemConfig {
  id: string;
  icon: string;
  customIconUrl?: string | null;
  title: string;
  description: string;
  isVisible: boolean;
}

export interface ComoFuncionaStepConfig {
  id: string;
  number: string;
  icon: string;
  title: string;
  description: string;
}

export interface DepoimentoItemConfig {
  id: string;
  author: string;
  roleLabel: string;
  quote: string;
  rating: number;
  consentConfirmed: boolean;
  isVisible: boolean;
}

export interface SiteSectionsConfig {
  atendimentos: {
    isVisible: boolean;
    eyebrow: string;
    title: string;
    subtitle: string;
    ctaLabel: string;
  };
  sobre: {
    eyebrow: string;
    title: string;
    ctaLabel: string;
  };
  diferenciais: {
    isVisible: boolean;
    eyebrow: string;
    title: string;
    items: DiferencialItemConfig[];
  };
  comoFunciona: {
    isVisible: boolean;
    eyebrow: string;
    title: string;
    subtitle: string;
    ctaLabel: string;
    steps: ComoFuncionaStepConfig[];
  };
  depoimentos: {
    isVisible: boolean;
    eyebrow: string;
    title: string;
    items: DepoimentoItemConfig[];
  };
  localizacao: {
    eyebrow: string;
    title: string;
    subtitle: string;
  };
  chamadaFinal: {
    isVisible: boolean;
    heading: string;
    mobileHeading: string;
    subtitle: string;
    mobileSubtitle: string;
    ctaLabel: string;
    mobileCtaLabel: string;
  };
  rodape: {
    showDescription: boolean;
    description: string;
    copyrightText: string;
    showPrivacyLink: boolean;
    showTermsLink: boolean;
    showLgpdLink: boolean;
    showEthicsLink: boolean;
    showCookiePreferences: boolean;
  };
}

export const DEFAULT_SITE_SECTIONS_CONFIG: SiteSectionsConfig = {
  atendimentos: {
    isVisible: true,
    eyebrow: "Atendimentos",
    title: "Principais Demandas",
    subtitle: "Acompanhamento psicológico para diferentes momentos e desafios da vida.",
    ctaLabel: "Ver todas as demandas & agendar",
  },
  sobre: {
    eyebrow: "Trajetória Profissional",
    title: "Sobre Mim",
    ctaLabel: "Conheça minha história & agende uma sessão",
  },
  diferenciais: {
    isVisible: true,
    eyebrow: "Diferenciais",
    title: "Por que escolher meu atendimento?",
    items: [
      {
        id: "dif-1",
        icon: "Heart",
        customIconUrl: null,
        title: "Escuta Ativa e Acolhedora",
        description:
          "Espaço ético, seguro e livre de julgamentos, centrado na sua singularidade e no seu tempo.",
        isVisible: true,
      },
      {
        id: "dif-2",
        icon: "Target",
        customIconUrl: null,
        title: "Plano Terapêutico Personalizado",
        description:
          "Intervenções e metodologias baseadas em evidências científicas, alinhadas aos seus objetivos.",
        isVisible: true,
      },
      {
        id: "dif-3",
        icon: "Clock",
        customIconUrl: null,
        title: "Horários Flexíveis",
        description:
          "Grade de atendimento com ampla disponibilidade para harmonizar a terapia à sua rotina diária.",
        isVisible: true,
      },
      {
        id: "dif-4",
        icon: "Video",
        customIconUrl: null,
        title: "Atendimento Presencial e Online",
        description:
          "Flexibilidade para consultar no consultório físico ou por teleconsulta criptografada de onde estiver.",
        isVisible: true,
      },
    ],
  },
  comoFunciona: {
    isVisible: true,
    eyebrow: "PASSO A PASSO",
    title: "Como Funciona?",
    subtitle:
      "Um processo simples, acolhedor e seguro, pensado para ajudar você a cuidar da sua saúde emocional com clareza e consistência.",
    ctaLabel: "Iniciar Agendamento Online",
    steps: [
      {
        id: "step-1",
        number: "01",
        icon: "CalendarDays",
        title: "Agende sua consulta",
        description:
          "Escolha o horário e a modalidade ideal diretamente pelo nosso sistema online com praticidade e segurança.",
      },
      {
        id: "step-2",
        number: "02",
        icon: "MessagesSquare",
        title: "Realize sua avaliação inicial",
        description:
          "Primeira conversa para compreender suas necessidades, histórico e objetivos terapêuticos, em um espaço de escuta acolhedora.",
      },
      {
        id: "step-3",
        number: "03",
        icon: "HandHeart",
        title: "Inicie seu acompanhamento",
        description:
          "Sua jornada de cuidado, com sessões contínuas e um plano terapêutico personalizado, no seu ritmo e de forma consistente.",
      },
    ],
  },
  depoimentos: {
    isVisible: true,
    eyebrow: "Depoimentos",
    title: "O que meus pacientes dizem",
    items: [
      {
        id: "dep-1",
        author: "Ana R.",
        roleLabel: "Paciente em Acompanhamento",
        quote:
          "O processo terapêutico tem sido transformador. A escuta atenciosa e as orientações práticas me ajudaram a lidar com a ansiedade e a retomar a clareza nas decisões da minha vida.",
        rating: 5,
        consentConfirmed: true,
        isVisible: true,
      },
    ],
  },
  localizacao: {
    eyebrow: "Atendimento Presencial",
    title: "Localização do Consultório",
    subtitle: "Ambiente preparado com isolamento acústico, total privacidade e acessibilidade.",
  },
  chamadaFinal: {
    isVisible: true,
    heading: "Agende sua consulta agora",
    mobileHeading: "Agende sua consulta!",
    subtitle: "Dê o primeiro passo para o seu bem-estar emocional.",
    mobileSubtitle: "Bem-estar e independência emocional.",
    ctaLabel: "Agendar agora sua consulta pelo app",
    mobileCtaLabel: "Agenda agora pelo app!",
  },
  rodape: {
    showDescription: true,
    description:
      "Atendimento clínico respaldado pelos preceitos éticos do Conselho Federal de Psicologia.",
    copyrightText: "",
    showPrivacyLink: true,
    showTermsLink: true,
    showLgpdLink: true,
    showEthicsLink: true,
    showCookiePreferences: true,
  },
};

export const diferencialItemSchema = z.object({
  id: z.string().min(1).max(64),
  icon: z.string().min(1).max(64).default("Sparkles"),
  customIconUrl: z.string().nullable().optional(),
  title: z.string().trim().min(1, "Título do diferencial é obrigatório").max(120),
  description: z.string().trim().max(400).default(""),
  isVisible: z.boolean().default(true),
});

export const comoFuncionaStepSchema = z.object({
  id: z.string().min(1).max(64),
  number: z.string().trim().min(1).max(8),
  icon: z.string().min(1).max(64).default("CalendarDays"),
  title: z.string().trim().min(1, "Título da etapa é obrigatório").max(120),
  description: z.string().trim().min(1, "Descrição da etapa é obrigatória").max(400),
});

export const depoimentoItemSchema = z.object({
  id: z.string().min(1).max(64),
  author: z.string().trim().min(1, "Nome ou iniciais são obrigatórios").max(80),
  roleLabel: z.string().trim().max(80).default("Paciente em Acompanhamento"),
  quote: z.string().trim().min(5, "Texto do depoimento é obrigatório").max(800),
  rating: z.coerce.number().int().min(1).max(5).default(5),
  consentConfirmed: z.boolean().default(false),
  isVisible: z.boolean().default(true),
});

export const siteSectionsConfigSchema = z.object({
  atendimentos: z.object({
    isVisible: z.boolean().default(true),
    eyebrow: z.string().trim().max(60).default(DEFAULT_SITE_SECTIONS_CONFIG.atendimentos.eyebrow),
    title: z.string().trim().min(1).max(120).default(DEFAULT_SITE_SECTIONS_CONFIG.atendimentos.title),
    subtitle: z.string().trim().max(300).default(DEFAULT_SITE_SECTIONS_CONFIG.atendimentos.subtitle),
    ctaLabel: z.string().trim().min(1).max(80).default(DEFAULT_SITE_SECTIONS_CONFIG.atendimentos.ctaLabel),
  }),
  sobre: z.object({
    eyebrow: z.string().trim().max(60).default(DEFAULT_SITE_SECTIONS_CONFIG.sobre.eyebrow),
    title: z.string().trim().min(1).max(120).default(DEFAULT_SITE_SECTIONS_CONFIG.sobre.title),
    ctaLabel: z.string().trim().min(1).max(100).default(DEFAULT_SITE_SECTIONS_CONFIG.sobre.ctaLabel),
  }),
  diferenciais: z.object({
    isVisible: z.boolean().default(true),
    eyebrow: z.string().trim().max(60).default(DEFAULT_SITE_SECTIONS_CONFIG.diferenciais.eyebrow),
    title: z.string().trim().min(1).max(120).default(DEFAULT_SITE_SECTIONS_CONFIG.diferenciais.title),
    items: z.array(diferencialItemSchema).min(1).max(8),
  }),
  comoFunciona: z.object({
    isVisible: z.boolean().default(true),
    eyebrow: z.string().trim().max(60).default(DEFAULT_SITE_SECTIONS_CONFIG.comoFunciona.eyebrow),
    title: z.string().trim().min(1).max(120).default(DEFAULT_SITE_SECTIONS_CONFIG.comoFunciona.title),
    subtitle: z.string().trim().max(400).default(DEFAULT_SITE_SECTIONS_CONFIG.comoFunciona.subtitle),
    ctaLabel: z.string().trim().min(1).max(80).default(DEFAULT_SITE_SECTIONS_CONFIG.comoFunciona.ctaLabel),
    steps: z.array(comoFuncionaStepSchema).length(3),
  }),
  depoimentos: z.object({
    isVisible: z.boolean().default(true),
    eyebrow: z.string().trim().max(60).default(DEFAULT_SITE_SECTIONS_CONFIG.depoimentos.eyebrow),
    title: z.string().trim().min(1).max(120).default(DEFAULT_SITE_SECTIONS_CONFIG.depoimentos.title),
    items: z.array(depoimentoItemSchema).max(12),
  }),
  localizacao: z.object({
    eyebrow: z.string().trim().max(60).default(DEFAULT_SITE_SECTIONS_CONFIG.localizacao.eyebrow),
    title: z.string().trim().min(1).max(120).default(DEFAULT_SITE_SECTIONS_CONFIG.localizacao.title),
    subtitle: z.string().trim().max(300).default(DEFAULT_SITE_SECTIONS_CONFIG.localizacao.subtitle),
  }),
  chamadaFinal: z.object({
    isVisible: z.boolean().default(true),
    heading: z.string().trim().min(1).max(120).default(DEFAULT_SITE_SECTIONS_CONFIG.chamadaFinal.heading),
    mobileHeading: z.string().trim().min(1).max(80).default(DEFAULT_SITE_SECTIONS_CONFIG.chamadaFinal.mobileHeading),
    subtitle: z.string().trim().max(240).default(DEFAULT_SITE_SECTIONS_CONFIG.chamadaFinal.subtitle),
    mobileSubtitle: z.string().trim().max(140).default(DEFAULT_SITE_SECTIONS_CONFIG.chamadaFinal.mobileSubtitle),
    ctaLabel: z.string().trim().min(1).max(80).default(DEFAULT_SITE_SECTIONS_CONFIG.chamadaFinal.ctaLabel),
    mobileCtaLabel: z.string().trim().min(1).max(60).default(DEFAULT_SITE_SECTIONS_CONFIG.chamadaFinal.mobileCtaLabel),
  }),
  rodape: z.object({
    showDescription: z.boolean().default(true),
    description: z.string().trim().max(400).default(DEFAULT_SITE_SECTIONS_CONFIG.rodape.description),
    copyrightText: z.string().trim().max(240).default(""),
    showPrivacyLink: z.boolean().default(true),
    showTermsLink: z.boolean().default(true),
    showLgpdLink: z.boolean().default(true),
    showEthicsLink: z.boolean().default(true),
    showCookiePreferences: z.boolean().default(true),
  }),
});

export function cloneDefaultSiteSectionsConfig(): SiteSectionsConfig {
  return JSON.parse(JSON.stringify(DEFAULT_SITE_SECTIONS_CONFIG)) as SiteSectionsConfig;
}

export function parseSiteSectionsConfig(rawJson: string | null | undefined): SiteSectionsConfig {
  const defaults = cloneDefaultSiteSectionsConfig();
  if (!rawJson || typeof rawJson !== "string") {
    return defaults;
  }

  try {
    const parsed = JSON.parse(rawJson);
    if (!parsed || typeof parsed !== "object") {
      return defaults;
    }

    return {
      atendimentos: {
        isVisible: parsed.atendimentos?.isVisible ?? defaults.atendimentos.isVisible,
        eyebrow:
          typeof parsed.atendimentos?.eyebrow === "string" && parsed.atendimentos.eyebrow.trim()
            ? parsed.atendimentos.eyebrow.trim()
            : defaults.atendimentos.eyebrow,
        title:
          typeof parsed.atendimentos?.title === "string" && parsed.atendimentos.title.trim()
            ? parsed.atendimentos.title.trim()
            : defaults.atendimentos.title,
        subtitle:
          typeof parsed.atendimentos?.subtitle === "string"
            ? parsed.atendimentos.subtitle
            : defaults.atendimentos.subtitle,
        ctaLabel:
          typeof parsed.atendimentos?.ctaLabel === "string" && parsed.atendimentos.ctaLabel.trim()
            ? parsed.atendimentos.ctaLabel.trim()
            : defaults.atendimentos.ctaLabel,
      },
      sobre: {
        eyebrow:
          typeof parsed.sobre?.eyebrow === "string" && parsed.sobre.eyebrow.trim()
            ? parsed.sobre.eyebrow.trim()
            : defaults.sobre.eyebrow,
        title:
          typeof parsed.sobre?.title === "string" && parsed.sobre.title.trim()
            ? parsed.sobre.title.trim()
            : defaults.sobre.title,
        ctaLabel:
          typeof parsed.sobre?.ctaLabel === "string" && parsed.sobre.ctaLabel.trim()
            ? parsed.sobre.ctaLabel.trim()
            : defaults.sobre.ctaLabel,
      },
      diferenciais: {
        isVisible: parsed.diferenciais?.isVisible ?? defaults.diferenciais.isVisible,
        eyebrow:
          typeof parsed.diferenciais?.eyebrow === "string" && parsed.diferenciais.eyebrow.trim()
            ? parsed.diferenciais.eyebrow.trim()
            : defaults.diferenciais.eyebrow,
        title:
          typeof parsed.diferenciais?.title === "string" && parsed.diferenciais.title.trim()
            ? parsed.diferenciais.title.trim()
            : defaults.diferenciais.title,
        items:
          Array.isArray(parsed.diferenciais?.items) && parsed.diferenciais.items.length > 0
            ? parsed.diferenciais.items.map((item: Partial<DiferencialItemConfig>, idx: number) => ({
                id: item.id || `dif-${idx + 1}`,
                icon: item.icon || defaults.diferenciais.items[idx]?.icon || "Sparkles",
                customIconUrl: item.customIconUrl || null,
                title: item.title || defaults.diferenciais.items[idx]?.title || "Diferencial",
                description:
                  typeof item.description === "string"
                    ? item.description
                    : defaults.diferenciais.items[idx]?.description || "",
                isVisible: item.isVisible !== false,
              }))
            : defaults.diferenciais.items,
      },
      comoFunciona: {
        isVisible: parsed.comoFunciona?.isVisible ?? defaults.comoFunciona.isVisible,
        eyebrow:
          typeof parsed.comoFunciona?.eyebrow === "string" && parsed.comoFunciona.eyebrow.trim()
            ? parsed.comoFunciona.eyebrow.trim()
            : defaults.comoFunciona.eyebrow,
        title:
          typeof parsed.comoFunciona?.title === "string" && parsed.comoFunciona.title.trim()
            ? parsed.comoFunciona.title.trim()
            : defaults.comoFunciona.title,
        subtitle:
          typeof parsed.comoFunciona?.subtitle === "string"
            ? parsed.comoFunciona.subtitle
            : defaults.comoFunciona.subtitle,
        ctaLabel:
          typeof parsed.comoFunciona?.ctaLabel === "string" && parsed.comoFunciona.ctaLabel.trim()
            ? parsed.comoFunciona.ctaLabel.trim()
            : defaults.comoFunciona.ctaLabel,
        steps:
          Array.isArray(parsed.comoFunciona?.steps) && parsed.comoFunciona.steps.length === 3
            ? parsed.comoFunciona.steps.map((step: Partial<ComoFuncionaStepConfig>, idx: number) => ({
                id: step.id || defaults.comoFunciona.steps[idx].id,
                number: step.number || defaults.comoFunciona.steps[idx].number,
                icon: step.icon || defaults.comoFunciona.steps[idx].icon,
                title: step.title || defaults.comoFunciona.steps[idx].title,
                description: step.description || defaults.comoFunciona.steps[idx].description,
              }))
            : defaults.comoFunciona.steps,
      },
      depoimentos: {
        isVisible: parsed.depoimentos?.isVisible ?? defaults.depoimentos.isVisible,
        eyebrow:
          typeof parsed.depoimentos?.eyebrow === "string" && parsed.depoimentos.eyebrow.trim()
            ? parsed.depoimentos.eyebrow.trim()
            : defaults.depoimentos.eyebrow,
        title:
          typeof parsed.depoimentos?.title === "string" && parsed.depoimentos.title.trim()
            ? parsed.depoimentos.title.trim()
            : defaults.depoimentos.title,
        items: Array.isArray(parsed.depoimentos?.items)
          ? parsed.depoimentos.items.map((item: Partial<DepoimentoItemConfig>, idx: number) => ({
              id: item.id || `dep-${idx + 1}`,
              author: item.author || "Paciente",
              roleLabel: item.roleLabel || "Paciente em Acompanhamento",
              quote: item.quote || "",
              rating: Math.min(5, Math.max(1, Number(item.rating) || 5)),
              consentConfirmed: item.consentConfirmed === true,
              isVisible: item.isVisible !== false,
            }))
          : defaults.depoimentos.items,
      },
      localizacao: {
        eyebrow:
          typeof parsed.localizacao?.eyebrow === "string" && parsed.localizacao.eyebrow.trim()
            ? parsed.localizacao.eyebrow.trim()
            : defaults.localizacao.eyebrow,
        title:
          typeof parsed.localizacao?.title === "string" && parsed.localizacao.title.trim()
            ? parsed.localizacao.title.trim()
            : defaults.localizacao.title,
        subtitle:
          typeof parsed.localizacao?.subtitle === "string"
            ? parsed.localizacao.subtitle
            : defaults.localizacao.subtitle,
      },
      chamadaFinal: {
        isVisible: parsed.chamadaFinal?.isVisible ?? defaults.chamadaFinal.isVisible,
        heading:
          typeof parsed.chamadaFinal?.heading === "string" && parsed.chamadaFinal.heading.trim()
            ? parsed.chamadaFinal.heading.trim()
            : defaults.chamadaFinal.heading,
        mobileHeading:
          typeof parsed.chamadaFinal?.mobileHeading === "string" &&
          parsed.chamadaFinal.mobileHeading.trim()
            ? parsed.chamadaFinal.mobileHeading.trim()
            : defaults.chamadaFinal.mobileHeading,
        subtitle:
          typeof parsed.chamadaFinal?.subtitle === "string"
            ? parsed.chamadaFinal.subtitle
            : defaults.chamadaFinal.subtitle,
        mobileSubtitle:
          typeof parsed.chamadaFinal?.mobileSubtitle === "string"
            ? parsed.chamadaFinal.mobileSubtitle
            : defaults.chamadaFinal.mobileSubtitle,
        ctaLabel:
          typeof parsed.chamadaFinal?.ctaLabel === "string" && parsed.chamadaFinal.ctaLabel.trim()
            ? parsed.chamadaFinal.ctaLabel.trim()
            : defaults.chamadaFinal.ctaLabel,
        mobileCtaLabel:
          typeof parsed.chamadaFinal?.mobileCtaLabel === "string" &&
          parsed.chamadaFinal.mobileCtaLabel.trim()
            ? parsed.chamadaFinal.mobileCtaLabel.trim()
            : defaults.chamadaFinal.mobileCtaLabel,
      },
      rodape: {
        showDescription: parsed.rodape?.showDescription ?? defaults.rodape.showDescription,
        description:
          typeof parsed.rodape?.description === "string"
            ? parsed.rodape.description
            : defaults.rodape.description,
        copyrightText:
          typeof parsed.rodape?.copyrightText === "string" ? parsed.rodape.copyrightText : "",
        showPrivacyLink: parsed.rodape?.showPrivacyLink ?? defaults.rodape.showPrivacyLink,
        showTermsLink: parsed.rodape?.showTermsLink ?? defaults.rodape.showTermsLink,
        showLgpdLink: parsed.rodape?.showLgpdLink ?? defaults.rodape.showLgpdLink,
        showEthicsLink: parsed.rodape?.showEthicsLink ?? defaults.rodape.showEthicsLink,
        showCookiePreferences:
          parsed.rodape?.showCookiePreferences ?? defaults.rodape.showCookiePreferences,
      },
    };
  } catch {
    return defaults;
  }
}
