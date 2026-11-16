"use client";

import React from "react";

/**
 * BookingHeaderWaves
 * Renderiza 3 camadas sutis e fluidas de ondas decorativas no topo da página de agendamento.
 * As ondas utilizam as variáveis CSS oficiais do tema (--primary) com opacidades escalonadas,
 * adaptando-se automaticamente a qualquer paleta configurada (Laranja, Verde, Azul, etc.)
 * sem hardcode de cores, mantendo contraste absoluto com os elementos interativos.
 */
export function BookingHeaderWaves() {
  return (
    <div
      className="absolute top-0 left-0 right-0 w-full overflow-hidden pointer-events-none z-0 h-44 sm:h-52 md:h-60 select-none"
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 1440 240"
        preserveAspectRatio="none"
        className="w-full h-full"
      >
        <defs>
          {/* Gradiente da Camada 1: Fundo amplo e suave */}
          <linearGradient id="psi-booking-wave-1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.22" />
            <stop offset="50%" stopColor="var(--primary)" stopOpacity="0.14" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.06" />
          </linearGradient>

          {/* Gradiente da Camada 2: Onda intermediária orgânica */}
          <linearGradient id="psi-booking-wave-2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.16" />
            <stop offset="60%" stopColor="var(--primary)" stopOpacity="0.09" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.03" />
          </linearGradient>

          {/* Gradiente da Camada 3: Crista de destaque frontal sutil */}
          <linearGradient id="psi-booking-wave-3" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.12" />
          </linearGradient>
        </defs>

        {/* Camada 1: Onda de base ampla */}
        <path
          d="M0,0 L1440,0 L1440,120 C1220,185 980,50 720,130 C460,205 240,85 0,150 Z"
          fill="url(#psi-booking-wave-1)"
        />

        {/* Camada 2: Onda intermediária em contra-curva */}
        <path
          d="M0,0 L1440,0 L1440,90 C1160,150 920,40 680,105 C440,165 180,65 0,120 Z"
          fill="url(#psi-booking-wave-2)"
        />

        {/* Camada 3: Crista frontal suave */}
        <path
          d="M0,0 L1440,0 L1440,65 C1240,110 1040,30 820,80 C600,125 340,45 0,85 Z"
          fill="url(#psi-booking-wave-3)"
        />
      </svg>
    </div>
  );
}
