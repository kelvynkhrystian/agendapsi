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
 * Calcula a duração adaptada (1.3s a 1.8s) para o efeito Typewriter do nome profissional,
 * respeitando caracteres acentuados e clusters Unicode via Intl.Segmenter.
 */
export function computeTypewriterDuration(text: string): number {
  const clean = text.trim().replace(/\s+/g, " ").normalize("NFC");
  let charCount = clean.length;

  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter("pt-BR", { granularity: "grapheme" });
    charCount = Array.from(segmenter.segment(clean)).length;
  } else {
    charCount = Array.from(clean).length;
  }

  return Number(Math.min(1.8, Math.max(1.3, 1.1 + charCount * 0.022)).toFixed(2));
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
    clearProps: "all",
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
    clearProps: "all",
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
      clearProps: "all",
    }
  );
}

export { gsap, ScrollTrigger, SplitText, TextPlugin, useGSAP };
