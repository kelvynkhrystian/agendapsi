"use client";

import React, { useState, useEffect, useCallback } from "react";

export interface HeroScrollIndicatorProps {
  targetSectionId?: string;
  className?: string;
}

/**
 * Indicador de rolagem animado para o Hero Desktop do MiniSite.
 * Utiliza o arquivo SVG nativo animado via SMIL em /minisite/scroll-down.svg.
 * Fica posicionado no canto inferior direito do Hero desktop e desaparece suavemente na rolagem.
 */
export function HeroScrollIndicator({
  targetSectionId = "atendimentos",
  className = "",
}: HeroScrollIndicatorProps) {
  const [opacity, setOpacity] = useState(1);

  // Controla o fade-out progressivo conforme o visitante rola a página para baixo
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      if (scrollY <= 10) {
        setOpacity(1);
      } else if (scrollY >= 200) {
        setOpacity(0);
      } else {
        // Desvanecimento suave nos primeiros 200px de rolagem
        setOpacity(Math.max(0, 1 - scrollY / 200));
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
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  }, [targetSectionId]);

  return (
    <div
      id="hero-scroll-indicator"
      className={`hidden lg:block select-none transition-opacity duration-300 ease-out will-change-transform ${className}`}
      style={{
        opacity,
        pointerEvents: opacity <= 0.05 ? "none" : "auto",
      }}
      aria-hidden={opacity <= 0.05}
    >
      <button
        type="button"
        onClick={handleScrollDown}
        aria-label="Rolar para a próxima seção"
        className="group relative flex flex-col items-center justify-center p-0 m-0 bg-transparent border-0 shadow-none cursor-pointer outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 rounded-full transition-transform hover:scale-105 active:scale-95"
      >
        <img
          src="/minisite/scroll-down.svg"
          alt=""
          width={42}
          height={107}
          className="w-[36px] lg:w-[42px] xl:w-[46px] h-auto pointer-events-none select-none drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)]"
          loading="eager"
        />
      </button>
    </div>
  );
}
