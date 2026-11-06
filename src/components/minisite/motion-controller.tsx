"use client";

import { useEffect, useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger, isReducedMotion, EASINGS } from "@/lib/animation/gsap";

export function MiniSiteMotionController() {
  const isMounted = useRef(false);

  useGSAP(() => {
    // Se o usuário prefere redução de movimento, não aplica animações espaciais
    if (isReducedMotion()) return;

    // Garante que o ScrollTrigger recalculou posições após o carregamento inicial
    ScrollTrigger.refresh();

    // ============================================================================
    // 1. HERO ENTRANCE SEQUENCE (Timeline autoral e cinematográfica)
    // ============================================================================
    const heroTl = gsap.timeline({
      defaults: { ease: EASINGS.expressive },
    });

    // 1.1 Folhagem/Ramos orgânicos decorativos ao fundo do retrato
    if (document.querySelector("#hero-bg-leaves")) {
      heroTl.from("#hero-bg-leaves", {
        scale: 0.8,
        opacity: 0,
        duration: 1.1,
        ease: "power2.out",
      }, 0);
    }

    // 1.2 Badge CRP/CRM do profissional
    if (document.querySelector("#hero-badge")) {
      heroTl.from("#hero-badge", {
        y: -16,
        opacity: 0,
        duration: 0.6,
        ease: "power2.out",
      }, 0.1);
    }

    // 1.3 Container de mídia (Retrato / Frames ZIP / Vídeo)
    // O conteúdo de mídia interno (frames/vídeo) continua seu loop normalmente sem interferência
    if (document.querySelector("#hero-media-container")) {
      heroTl.from("#hero-media-container", {
        scale: 0.92,
        opacity: 0,
        y: 15,
        duration: 0.85,
        ease: EASINGS.expressive,
      }, 0.2);
    }

    // 1.4 Nome do profissional com tipografia de destaque
    if (document.querySelector("#hero-name")) {
      heroTl.from("#hero-name", {
        y: 20,
        opacity: 0,
        duration: 0.7,
        ease: EASINGS.smooth,
      }, 0.35);
    }

    // 1.5 Título profissional e subtítulo de acolhimento
    if (document.querySelector("#hero-title-group")) {
      heroTl.from("#hero-title-group", {
        y: 16,
        opacity: 0,
        duration: 0.6,
        ease: "power2.out",
      }, 0.45);
    }

    // 1.6 Botões de ação (Agendar Consulta e WhatsApp)
    if (document.querySelector("#hero-cta")) {
      heroTl.from("#hero-cta", {
        y: 18,
        opacity: 0,
        duration: 0.6,
        ease: "power2.out",
      }, 0.55);
    }

    // 1.7 Pílulas de benefícios (stagger suave)
    const benefitItems = document.querySelectorAll("#hero-benefits .hero-benefit-item");
    if (benefitItems.length > 0) {
      heroTl.from(benefitItems, {
        y: 14,
        opacity: 0,
        duration: 0.5,
        stagger: 0.08,
        ease: "power2.out",
      }, 0.65);
    }

    // ============================================================================
    // 2. PRINCIPAIS DEMANDAS (ScrollTrigger com Stagger nos cards)
    // ============================================================================
    if (document.querySelector("#atendimentos")) {
      gsap.from("#atendimentos-header", {
        scrollTrigger: {
          trigger: "#atendimentos",
          start: "top 82%",
          toggleActions: "play none none none",
        },
        y: 20,
        opacity: 0,
        duration: 0.6,
        ease: "power2.out",
      });

      const serviceCards = document.querySelectorAll("#services-list > a");
      if (serviceCards.length > 0) {
        gsap.from(serviceCards, {
          scrollTrigger: {
            trigger: "#services-list",
            start: "top 82%",
            toggleActions: "play none none none",
          },
          y: 28,
          opacity: 0,
          duration: 0.55,
          stagger: 0.08,
          ease: "power2.out",
        });
      }
    }

    // ============================================================================
    // 3. SOBRE MIM (ScrollTrigger com entrada harmonizada de Mídia e Biografia)
    // ============================================================================
    if (document.querySelector("#sobre")) {
      if (document.querySelector("#sobre-media")) {
        gsap.from("#sobre-media", {
          scrollTrigger: {
            trigger: "#sobre",
            start: "top 80%",
            toggleActions: "play none none none",
          },
          x: -24,
          opacity: 0,
          duration: 0.75,
          ease: EASINGS.smooth,
        });
      }

      if (document.querySelector("#sobre-content")) {
        gsap.from("#sobre-content", {
          scrollTrigger: {
            trigger: "#sobre",
            start: "top 80%",
            toggleActions: "play none none none",
          },
          x: 24,
          opacity: 0,
          duration: 0.75,
          ease: EASINGS.smooth,
        });
      }
    }

    // ============================================================================
    // 4. DIFERENCIAIS (ScrollTrigger com Stagger elegante nos 4 pilares)
    // ============================================================================
    if (document.querySelector("#diferenciais")) {
      gsap.from("#diferenciais-header", {
        scrollTrigger: {
          trigger: "#diferenciais",
          start: "top 82%",
          toggleActions: "play none none none",
        },
        y: 20,
        opacity: 0,
        duration: 0.6,
        ease: "power2.out",
      });

      const diferencialCards = document.querySelectorAll("#diferenciais-grid > div");
      if (diferencialCards.length > 0) {
        gsap.from(diferencialCards, {
          scrollTrigger: {
            trigger: "#diferenciais-grid",
            start: "top 82%",
            toggleActions: "play none none none",
          },
          y: 24,
          opacity: 0,
          duration: 0.55,
          stagger: 0.08,
          ease: "power2.out",
        });
      }
    }

    // ============================================================================
    // 5. COMO FUNCIONA (ScrollTrigger com sequência progressiva dos 3 passos)
    // ============================================================================
    if (document.querySelector("#como-funciona")) {
      gsap.from("#como-funciona-header", {
        scrollTrigger: {
          trigger: "#como-funciona",
          start: "top 82%",
          toggleActions: "play none none none",
        },
        y: 20,
        opacity: 0,
        duration: 0.6,
        ease: "power2.out",
      });

      const stepItems = document.querySelectorAll("#como-funciona-steps > div");
      if (stepItems.length > 0) {
        gsap.from(stepItems, {
          scrollTrigger: {
            trigger: "#como-funciona-steps",
            start: "top 82%",
            toggleActions: "play none none none",
          },
          y: 26,
          opacity: 0,
          duration: 0.6,
          stagger: 0.12,
          ease: EASINGS.expressive,
        });
      }
    }

    // ============================================================================
    // 6. DEPOIMENTOS (ScrollTrigger do depoimento com validação ética)
    // ============================================================================
    if (document.querySelector("#depoimentos")) {
      gsap.from("#depoimento-card", {
        scrollTrigger: {
          trigger: "#depoimentos",
          start: "top 84%",
          toggleActions: "play none none none",
        },
        y: 22,
        opacity: 0,
        duration: 0.65,
        ease: "power2.out",
      });
    }

    // ============================================================================
    // 7. LOCALIZAÇÃO (ScrollTrigger seguro com preservação de mapa)
    // ============================================================================
    if (document.querySelector("#localizacao")) {
      gsap.from("#localizacao-info", {
        scrollTrigger: {
          trigger: "#localizacao",
          start: "top 82%",
          toggleActions: "play none none none",
        },
        x: -22,
        opacity: 0,
        duration: 0.65,
        ease: "power2.out",
      });

      gsap.from("#localizacao-map", {
        scrollTrigger: {
          trigger: "#localizacao",
          start: "top 82%",
          toggleActions: "play none none none",
        },
        x: 22,
        opacity: 0,
        duration: 0.65,
        ease: "power2.out",
      });
    }

    // ============================================================================
    // 8. FINAL CTA (ScrollTrigger com zoom suave e foco de conversão)
    // ============================================================================
    if (document.querySelector("#cta-final")) {
      gsap.from("#cta-final-box", {
        scrollTrigger: {
          trigger: "#cta-final",
          start: "top 85%",
          toggleActions: "play none none none",
        },
        scale: 0.96,
        y: 22,
        opacity: 0,
        duration: 0.7,
        ease: EASINGS.smooth,
      });
    }
  }, []);

  return null;
}
