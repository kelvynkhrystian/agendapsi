import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

// Registra os plugins do GSAP apenas no ambiente do navegador
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
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

export { gsap, ScrollTrigger, useGSAP };
