"use client";

import React, { useState, useEffect, useCallback } from "react";
import { isReducedMotion } from "@/lib/animation/gsap";

export interface HeroScrollIndicatorProps {
  targetSectionId?: string;
  className?: string;
}

/**
 * Indicador de rolagem animado para o Hero Desktop do MiniSite.
 * Renderiza exclusivamente o asset SVG oficial (/minisite/scroll-down.svg) com sua animação SMIL nativa
 * colorida dinamicamente via cor primária da Aparência (var(--primary)), sem rótulos de texto visíveis.
 */
export function HeroScrollIndicator({
  targetSectionId = "atendimentos",
  className = "",
}: HeroScrollIndicatorProps) {
  const [scrollOpacity, setScrollOpacity] = useState(1);

  // Controla o fade-out progressivo conforme o visitante rola a página para baixo
  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      if (y <= 12) {
        setScrollOpacity(1);
      } else if (y >= 180) {
        setScrollOpacity(0);
      } else {
        setScrollOpacity(Math.max(0, 1 - (y - 12) / 168));
      }
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleScrollDown = useCallback(() => {
    const targetElement = document.getElementById(targetSectionId);
    if (targetElement) {
      // Offset de 84px para compensar a barra de navegação fixa do topo
      const headerOffset = 84;
      const elementPosition = targetElement.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - headerOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: isReducedMotion() ? "auto" : "smooth",
      });
    }
  }, [targetSectionId]);

  const isFadedOut = scrollOpacity <= 0.05;

  return (
    <div
      id="hero-scroll-indicator"
      className={`hidden lg:flex select-none will-change-transform ${className}`}
      aria-hidden={isFadedOut}
    >
      <div
        className="transition-opacity duration-300 ease-out motion-reduce:transition-none"
        style={{
          opacity: scrollOpacity,
          pointerEvents: isFadedOut ? "none" : "auto",
        }}
      >
        <button
          type="button"
          onClick={handleScrollDown}
          tabIndex={isFadedOut ? -1 : 0}
          aria-label="Rolar para a próxima seção"
          className="group relative flex items-center justify-center p-1 m-0 bg-transparent border-0 shadow-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/70 focus-visible:ring-offset-2 rounded-full transition-transform duration-200 hover:scale-105 active:scale-95 motion-reduce:transition-none motion-reduce:hover:scale-100 drop-shadow-[0_1px_2px_rgba(255,255,255,0.85)]"
        >
          <span
            aria-hidden="true"
            className="block w-[36px] xl:w-[40px] aspect-[51/130] pointer-events-none select-none"
            style={{
              backgroundColor: "var(--primary)",
              WebkitMaskImage: 'url("/minisite/scroll-down.svg")',
              maskImage: 'url("/minisite/scroll-down.svg")',
              WebkitMaskRepeat: "no-repeat",
              maskRepeat: "no-repeat",
              WebkitMaskPosition: "center",
              maskPosition: "center",
              WebkitMaskSize: "contain",
              maskSize: "contain",
            }}
          />
        </button>
      </div>
    </div>
  );
}
