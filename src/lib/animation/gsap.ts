import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { TextPlugin } from "gsap/TextPlugin";
import { useGSAP } from "@gsap/react";

// Registra os plugins do GSAP apenas no ambiente do navegador
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText, TextPlugin, useGSAP);
}

/**
 * Normaliza texto preservando composição Unicode NFC e colapsando espaços extras.
 */
export function normalizeTypewriterText(text: string): string {
  return text.trim().replace(/\s+/g, " ").normalize("NFC");
}

/**
 * Conta grafemas reais (caracteres acentuados e combinações Unicode) via Intl.Segmenter.
 */
export function countGraphemes(text: string): number {
  const clean = normalizeTypewriterText(text);
  if (!clean) return 0;

  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter("pt-BR", { granularity: "grapheme" });
    return Array.from(segmenter.segment(clean)).length;
  }

  return Array.from(clean).length;
}

/**
 * Calcula a duração adaptada (1.3s a 1.8s) para o efeito Typewriter do nome profissional,
 * respeitando caracteres acentuados e clusters Unicode via Intl.Segmenter.
 */
export function computeTypewriterDuration(text: string): number {
  const charCount = countGraphemes(text);
  return Number(Math.min(1.8, Math.max(1.3, 1.1 + charCount * 0.022)).toFixed(2));
}

/**
 * Calcula duração proporcional (~0.75s a 1.15s) para a digitação da especialidade no Hero mobile.
 */
export function computeSpecialtyTypewriterDuration(text: string): number {
  const charCount = countGraphemes(text);
  return Number(Math.min(1.15, Math.max(0.75, 0.45 + charCount * 0.016)).toFixed(2));
}

/**
 * Calcula duração acelerada (~1.5s a 2.0s) para a digitação da descrição no Hero mobile.
 */
export function computeDescriptionTypewriterDuration(text: string): number {
  const charCount = countGraphemes(text);
  return Number(Math.min(2.0, Math.max(1.5, 1.25 + charCount * 0.0038)).toFixed(2));
}

export function escapeHtmlForTextPlugin(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export type TypewriterVariant = "name" | "specialty" | "description";

export interface TypewriterOptions {
  target: HTMLElement | null;
  variant?: TypewriterVariant;
  duration?: number;
  cursorHoldSeconds?: number;
}

export interface TypewriterHandle {
  tween: gsap.core.Tween | null;
  normalizedText: string;
  duration: number;
  cleanup: () => void;
}

/**
 * Fábrica compartilhada de efeito Typewriter usando GSAP TextPlugin:
 * - Reserva 100% da largura, altura e quebras finais antes da digitação (.hero-typewriter-primed)
 * - Exibe cursor fino piscante durante a digitação e remove suavemente ao finalizar
 * - Suporta caracteres Unicode acentuados e limpeza segura no unmount
 */
export function createTypewriterTween({
  target,
  variant = "name",
  duration,
  cursorHoldSeconds = 0.24,
}: TypewriterOptions): TypewriterHandle {
  const normalizedText = normalizeTypewriterText(target?.textContent || "");
  const resolvedDuration =
    typeof duration === "number" && duration > 0
      ? duration
      : variant === "description"
      ? computeDescriptionTypewriterDuration(normalizedText)
      : variant === "specialty"
      ? computeSpecialtyTypewriterDuration(normalizedText)
      : computeTypewriterDuration(normalizedText);

  if (!target || !normalizedText) {
    return {
      tween: null,
      normalizedText,
      duration: 0,
      cleanup: () => {},
    };
  }

  target.textContent = normalizedText;
  target.classList.add("hero-typewriter-primed");

  let cursorCleanupCall: gsap.core.Tween | null = null;
  let completed = false;

  const tween = gsap.to(target, {
    duration: resolvedDuration,
    ease: "none",
    text: {
      value: escapeHtmlForTextPlugin(normalizedText),
      newClass: "hero-typewriter-revealed",
      oldClass: "hero-typewriter-unrevealed",
    },
    onStart: () => {
      target.classList.add("hero-typewriter-typing");
      target.classList.remove("hero-typewriter-finishing");
    },
    onComplete: () => {
      if (completed) return;
      completed = true;
      target.classList.remove("hero-typewriter-typing");
      target.classList.add("hero-typewriter-finishing");
      cursorCleanupCall = gsap.delayedCall(cursorHoldSeconds, () => {
        target.classList.remove("hero-typewriter-primed", "hero-typewriter-finishing");
        target.textContent = normalizedText;
      });
    },
  });

  const cleanup = () => {
    cursorCleanupCall?.kill();
    cursorCleanupCall = null;
    target.classList.remove("hero-typewriter-primed", "hero-typewriter-typing", "hero-typewriter-finishing");
    target.textContent = normalizedText;
  };

  return {
    tween,
    normalizedText,
    duration: resolvedDuration,
    cleanup,
  };
}

/**
 * Verifica se o usuário prefere redução de movimento (acessibilidade)
 */
export function isReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Curvas de aceleração padrão (Easings)
 */
export const EASINGS = {
  smooth: "power3.out",
  expressive: "cubic-bezier(0.16, 1, 0.3, 1)",
  quick: "power2.out",
  micro: "power1.out",
} as const;

/**
 * Constantes de tempo para consistência visual
 */
export const TIMINGS = {
  // MiniSite (Persuade / Experience)
  heroElement: 0.7,
  heroStagger: 0.1,
  sectionReveal: 0.6,
  cardStagger: 0.08,

  // Painel Interno Admin e Paciente (Operate - 120ms a 240ms)
  microFast: 0.14,
  microStandard: 0.2,
  microStagger: 0.04,
} as const;

/**
 * Micro-animação para cards de KPI e métricas (Admin & Paciente)
 */
export function animateKpiEntrance(elements: Element[] | NodeListOf<Element> | HTMLCollection | null): void {
  if (!elements || isReducedMotion()) return;

  const targetElements = Array.from(elements);
  if (targetElements.length === 0) return;

  gsap.from(targetElements, {
    opacity: 0,
    y: 8,
    duration: TIMINGS.microStandard,
    stagger: TIMINGS.microStagger,
    ease: EASINGS.quick,
    clearProps: "opacity,transform",
  });
}

/**
 * Micro-animação para entrada suave de páginas internas
 */
export function animatePageEnter(container: HTMLElement | null): void {
  if (!container || isReducedMotion()) return;

  gsap.from(container, {
    opacity: 0,
    y: 6,
    duration: TIMINGS.microStandard,
    ease: EASINGS.micro,
    clearProps: "opacity,transform",
  });
}

/**
 * Micro-animação para troca de abas (Tabs)
 */
export function animateTabContent(content: HTMLElement | null): void {
  if (!content || isReducedMotion()) return;

  gsap.fromTo(
    content,
    { opacity: 0, y: 4 },
    {
      opacity: 1,
      y: 0,
      duration: TIMINGS.microFast,
      ease: EASINGS.micro,
      clearProps: "opacity,transform",
    }
  );
}

export { gsap, ScrollTrigger, SplitText, TextPlugin, useGSAP };
