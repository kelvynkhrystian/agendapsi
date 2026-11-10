/**
 * PSI — Sistema de Gestão de Consultórios
 * Biblioteca de Ícones do MiniSite e Sanitização Segura de SVGs (Fase 4/5)
 */

export interface BuiltinIconDefinition {
  key: string;
  name: string;
  category: "clinica" | "geral" | "tempo" | "comunicacao" | "apoio";
  keywords: string[];
}

export const BUILTIN_ICONS: BuiltinIconDefinition[] = [
  // Acolhimento & Emoções
  { key: "HandHeart", name: "Acolhimento nas Mãos", category: "apoio", keywords: ["coracao", "maos", "cuidado", "acolhimento", "amor", "empatia"] },
  { key: "HeartHandshake", name: "Parceria Terapêutica", category: "apoio", keywords: ["parceria", "aperto de maos", "alianca", "vinculo"] },
  { key: "Heart", name: "Coração", category: "apoio", keywords: ["coracao", "amor", "sentimento", "afeto"] },
  { key: "Brain", name: "Saúde Mental / Cérebro", category: "clinica", keywords: ["cerebro", "mente", "cognicao", "pensamento", "neuro"] },
  { key: "Smile", name: "Sorriso / Bem-Estar", category: "clinica", keywords: ["sorriso", "alegria", "bem estar", "leveza", "positivo"] },
  { key: "Sparkles", name: "Transformação / Brilho", category: "clinica", keywords: ["brilho", "estrelas", "transformacao", "novo", "clareza"] },
  { key: "Flower2", name: "Flor de Lótus / Florescer", category: "clinica", keywords: ["flor", "lotus", "qualidade de vida", "renovacao", "harmonia"] },
  { key: "Flower", name: "Flor da Vida", category: "clinica", keywords: ["flor", "desenvolvimento", "crescimento"] },
  { key: "Leaf", name: "Folha / Orgânico", category: "clinica", keywords: ["folha", "natureza", "organico", "vitalidade"] },

  // Tempo & Atendimento
  { key: "Calendar", name: "Calendário / Agendamento", category: "tempo", keywords: ["calendario", "agenda", "data", "dia", "marcar"] },
  { key: "CalendarDays", name: "Agenda com Dias", category: "tempo", keywords: ["calendario", "dias", "agenda", "agendar", "consulta"] },
  { key: "Clock", name: "Relógio / Pontualidade", category: "tempo", keywords: ["relogio", "hora", "tempo", "duracao", "pontual"] },

  // Pessoas & Relações
  { key: "Users", name: "Relações / Usuários", category: "geral", keywords: ["usuarios", "pessoas", "grupo", "casal", "familia", "vinculo"] },
  { key: "UserCheck", name: "Paciente Verificado", category: "geral", keywords: ["pessoa", "usuario", "check", "confirmado"] },

  // Segurança & Ética
  { key: "Shield", name: "Escudo / Proteção", category: "geral", keywords: ["escudo", "seguranca", "sigilo", "protecao", "lgpd"] },
  { key: "ShieldCheck", name: "Sigilo Garantido", category: "geral", keywords: ["escudo", "sigilo", "etico", "protegido", "confidencial"] },

  // Comunicação
  { key: "MessageCircle", name: "Mensagem / Conversa", category: "comunicacao", keywords: ["mensagem", "chat", "conversa", "whatsapp", "falar"] },
  { key: "MessageSquare", name: "Balão de Fala", category: "comunicacao", keywords: ["fala", "dialogo", "escuta", "texto"] },
  { key: "MessagesSquare", name: "Avaliação / Diálogo", category: "comunicacao", keywords: ["conversa", "avaliacao", "duas falas", "escuta", "dialogo"] },

  // Objetivos & Trajetória
  { key: "Target", name: "Alvo / Foco Terapêutico", category: "geral", keywords: ["alvo", "objetivo", "meta", "foco", "direcao"] },
  { key: "Star", name: "Estrela / Reconhecimento", category: "geral", keywords: ["estrela", "avaliacao", "qualidade", "destaque"] },
  { key: "Award", name: "Certificado / Excelência", category: "geral", keywords: ["premio", "trofeu", "especialista", "conquista"] },
  { key: "Activity", name: "Atividade / Vitalidade", category: "clinica", keywords: ["atividade", "pulso", "energia", "saude"] },

  // Espaço Físico & Virtual
  { key: "Home", name: "Espaço Acolhedor", category: "geral", keywords: ["casa", "lar", "ambiente", "consultorio"] },
  { key: "MapPin", name: "Localização / Consultório", category: "geral", keywords: ["localizacao", "mapa", "endereco", "presencial", "lugar"] },
  { key: "Video", name: "Consulta Online / Vídeo", category: "geral", keywords: ["video", "camera", "teleconsulta", "online", "virtual"] },
];

export interface HeroBenefitItem {
  id: string;
  icon: string;
  customIconUrl?: string | null;
  title: string;
  subtitle?: string | null;
  isVisible: boolean;
  order: number;
}

export const DEFAULT_HERO_BENEFITS: HeroBenefitItem[] = [
  {
    id: "benefit-1",
    icon: "HandHeart",
    customIconUrl: null,
    title: "ACOLHIMENTO SEM JULGAMENTOS",
    subtitle: "Espaço ético, empático e seguro para você se expressar livremente.",
    isVisible: true,
    order: 1,
  },
  {
    id: "benefit-2",
    icon: "Brain",
    customIconUrl: null,
    title: "SAÚDE EMOCIONAL",
    subtitle: "Cuidado integral baseado em evidências científicas e escuta ativa.",
    isVisible: true,
    order: 2,
  },
  {
    id: "benefit-3",
    icon: "Flower2",
    customIconUrl: null,
    title: "QUALIDADE DE VIDA",
    subtitle: "Autonomia, clareza e bem-estar para suas escolhas diárias.",
    isVisible: true,
    order: 3,
  },
];

/**
 * Sanitiza rigorosamente código SVG para impedir injeção de script,
 * handlers inline (onload, onerror, onclick) e elementos invasivos.
 */
export function sanitizeSvgMarkup(svgContent: string): string {
  if (!svgContent || typeof svgContent !== "string") {
    throw new Error("Conteúdo SVG inválido ou vazio.");
  }

  let clean = svgContent.trim();

  // Verifica se é um documento SVG básico
  if (!clean.toLowerCase().includes("<svg") || !clean.toLowerCase().includes("</svg>")) {
    throw new Error("Arquivo não contém a marcação raiz <svg> válida.");
  }

  // Remove scripts
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

  // Remove tags proibidas: foreignObject, iframe, object, embed, applet, audio, video
  clean = clean.replace(/<\/?(foreignObject|iframe|object|embed|applet|meta|link|base|form|input|button|audio|video)\b[^>]*>/gi, "");

  // Remove atributos de eventos on*
  clean = clean.replace(/\son\w+\s*=\s*(['"]).*?\1/gi, "");
  clean = clean.replace(/\son\w+\s*=[^\s>]+/gi, "");

  // Remove URLs javascript: e data:
  clean = clean.replace(/href\s*=\s*(['"])\s*javascript:[^'"]*\1/gi, 'href="#"');
  clean = clean.replace(/xlink:href\s*=\s*(['"])\s*javascript:[^'"]*\1/gi, 'xlink:href="#"');

  return clean;
}
