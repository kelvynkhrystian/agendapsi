"use client";

import React, { useState, useEffect } from "react";
import { MessageCircle, ArrowUp } from "lucide-react";

export interface MiniSiteFloatingControlsProps {
  whatsappUrl?: string | null;
  showFloatingWhatsApp?: boolean;
}

export function MiniSiteFloatingControls({
  whatsappUrl,
  showFloatingWhatsApp = true,
}: MiniSiteFloatingControlsProps) {
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Monitora o scroll da página para exibir o botão de voltar ao topo
  // após rolar aproximadamente uma altura de viewport (> 350px)
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 350);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const hasWhatsApp = Boolean(showFloatingWhatsApp && whatsappUrl);

  // Se nenhum dos botões precisa ser renderizado, não polui o DOM
  if (!hasWhatsApp && !showBackToTop) {
    return null;
  }

  return (
    <div
      aria-label="Ações rápidas e navegação flutuante"
      className="fixed bottom-5 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end gap-3 pointer-events-none select-none"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {/* 1. BOTÃO FLUTUANTE DO WHATSAPP (SUPERIOR) */}
      {hasWhatsApp && (
        <aside aria-label="Atendimento via WhatsApp" className="pointer-events-auto">
          <a
            href={whatsappUrl!}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Fale conosco no WhatsApp"
            className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-lg hover:shadow-2xl hover:scale-108 active:scale-95 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-4 focus:ring-[#25D366]/40 group"
          >
            <MessageCircle className="h-7 w-7 transition-transform group-hover:scale-105" />
          </a>
        </aside>
      )}

      {/* 2. BOTÃO VOLTAR AO TOPO (INFERIOR, ABAIXO DO WHATSAPP) */}
      <button
        type="button"
        onClick={scrollToTop}
        aria-label="Voltar ao início da página"
        className={`pointer-events-auto w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white text-slate-700 border border-slate-200/90 shadow-md hover:shadow-lg hover:text-[var(--primary)] hover:border-[var(--primary)]/50 hover:bg-slate-50 active:scale-95 transition-all duration-300 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40 cursor-pointer ${
          showBackToTop
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        <ArrowUp className="h-5 w-5" />
      </button>
    </div>
  );
}
