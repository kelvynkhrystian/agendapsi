"use client";

import { useEffect, useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger, isReducedMotion, EASINGS } from "@/lib/animation/gsap";

export function MiniSiteMotionController() {
  const isMounted = useRef(false);

  useGSAP(() => {
    // Se o usuário prefere redução de movimento, não aplica animações espaciais
    if (isReducedMotion()) return;

    const isDesktop = typeof window !== "undefined" && window.innerWidth >= 768;

    // Recalcula posições após carregamento de fontes e imagens
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
        clearProps: "scale,opacity",
      }, 0);
    }

    // 1.2 Badge CRP/CRM do profissional
    if (document.querySelector("#hero-badge")) {
      heroTl.from("#hero-badge", {
        y: -16,
        opacity: 0,
        duration: 0.6,
        ease: "power2.out",
        clearProps: "all",
      }, 0.1);
    }

    // 1.3 Container de mídia (Retrato / Frames ZIP / Vídeo)
    if (document.querySelector("#hero-media-container")) {
      heroTl.from("#hero-media-container", {
        scale: 0.92,
        opacity: 0,
        y: 15,
        duration: 0.85,
        ease: EASINGS.expressive,
        // Limpa apenas transform/opacity: preserva o backgroundColor inline e garante opacidade final = 1
        clearProps: "transform,opacity",
      }, 0.2);
    }

    // 1.4 Nome do profissional com tipografia de destaque
    if (document.querySelector("#hero-name")) {
      heroTl.from("#hero-name", {
        y: 20,
        opacity: 0,
        duration: 0.7,
        ease: EASINGS.smooth,
        clearProps: "all",
      }, 0.35);
    }

    // 1.5 Título profissional e subtítulo de acolhimento
    if (document.querySelector("#hero-title-group")) {
      heroTl.from("#hero-title-group", {
        y: 16,
        opacity: 0,
        duration: 0.6,
        ease: "power2.out",
        clearProps: "all",
      }, 0.45);
    }

    // 1.6 Botões de ação (Agendar Consulta e WhatsApp)
    if (document.querySelector("#hero-cta")) {
      heroTl.from("#hero-cta", {
        y: 18,
        opacity: 0,
        duration: 0.6,
        ease: "power2.out",
        clearProps: "all",
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
        clearProps: "all",
      }, 0.65);
    }

    // 1.8 Indicador de scroll animado no Hero desktop (aparição suave inicial)
    if (document.querySelector("#hero-scroll-indicator")) {
      heroTl.from("#hero-scroll-indicator", {
        opacity: 0,
        y: 12,
        duration: 0.6,
        ease: "power2.out",
        clearProps: "all",
      }, 0.75);
    }

    // ============================================================================
    // 1.8 TRANSIÇÃO PARALLAX DO HERO NO DESKTOP (GSAP ScrollTrigger)
    // ============================================================================
    // Deslocamento suave de ~12% da camada de mídia em relação à rolagem,
    // criando profundidade contínua enquanto a próxima seção sobe com a fusão do gradiente inferior.
    const isHeroDesktop = typeof window !== "undefined" && window.innerWidth >= 1024;
    if (isHeroDesktop && document.querySelector("#hero-parallax-layer") && document.querySelector("#inicio")) {
      gsap.to("#hero-parallax-layer", {
        scrollTrigger: {
          trigger: "#inicio",
          start: "top top",
          end: "bottom top",
          scrub: 0.6,
          invalidateOnRefresh: true,
        },
        yPercent: 12,
        ease: "none",
      });
    }

    // ============================================================================
    // 2. PRINCIPAIS DEMANDAS & ATENDIMENTOS (Transição Horizontal da Esquerda no Desktop)
    // ============================================================================
    if (document.querySelector("#atendimentos")) {
      gsap.from("#atendimentos-header", {
        scrollTrigger: {
          trigger: "#atendimentos",
          start: "top 88%",
          toggleActions: "play none none none",
        },
        x: isDesktop ? -40 : 0,
        y: isDesktop ? 0 : 20,
        opacity: 0,
        duration: 0.65,
        ease: EASINGS.smooth,
        clearProps: "all",
      });

      const serviceCards = document.querySelectorAll("#services-list > a");
      if (serviceCards.length > 0) {
        gsap.from(serviceCards, {
          scrollTrigger: {
            trigger: "#services-list",
            start: "top 88%",
            toggleActions: "play none none none",
          },
          x: isDesktop ? -45 : 0,
          y: isDesktop ? 0 : 24,
          opacity: 0,
          duration: 0.6,
          stagger: 0.08,
          ease: "power2.out",
          clearProps: "all",
        });
      }
    }

    // ============================================================================
    // 3. SOBRE MIM (Transição Horizontal Convergente: Mídia da Esquerda, Texto da Direita)
    // ============================================================================
    if (document.querySelector("#sobre")) {
      if (document.querySelector("#sobre-media")) {
        gsap.from("#sobre-media", {
          scrollTrigger: {
            trigger: "#sobre",
            start: "top 88%",
            toggleActions: "play none none none",
          },
          x: isDesktop ? -50 : 0,
          y: isDesktop ? 0 : 20,
          opacity: 0,
          duration: 0.75,
          ease: EASINGS.smooth,
          clearProps: "all",
        });
      }

      if (document.querySelector("#sobre-content")) {
        gsap.from("#sobre-content", {
          scrollTrigger: {
            trigger: "#sobre",
            start: "top 88%",
            toggleActions: "play none none none",
          },
          x: isDesktop ? 50 : 0,
          y: isDesktop ? 0 : 20,
          opacity: 0,
          duration: 0.75,
          ease: EASINGS.smooth,
          clearProps: "all",
        });
      }
    }

    // ============================================================================
    // 4. DIFERENCIAIS (Transição Horizontal da Direita no Desktop)
    // ============================================================================
    if (document.querySelector("#diferenciais")) {
      gsap.from("#diferenciais-header", {
        scrollTrigger: {
          trigger: "#diferenciais",
          start: "top 88%",
          toggleActions: "play none none none",
        },
        x: isDesktop ? 40 : 0,
        y: isDesktop ? 0 : 20,
        opacity: 0,
        duration: 0.65,
        ease: EASINGS.smooth,
        clearProps: "all",
      });

      const diferencialCards = document.querySelectorAll("#diferenciais-grid > div");
      if (diferencialCards.length > 0) {
        gsap.from(diferencialCards, {
          scrollTrigger: {
            trigger: "#diferenciais-grid",
            start: "top 88%",
            toggleActions: "play none none none",
          },
          x: isDesktop ? 45 : 0,
          y: isDesktop ? 0 : 24,
          opacity: 0,
          duration: 0.6,
          stagger: 0.08,
          ease: "power2.out",
          clearProps: "all",
        });
      }
    }

    // ============================================================================
    // 5. COMO FUNCIONA (Transição Horizontal Progressiva da Esquerda no Desktop)
    // ============================================================================
    if (document.querySelector("#como-funciona")) {
      gsap.from("#como-funciona-header", {
        scrollTrigger: {
          trigger: "#como-funciona",
          start: "top 88%",
          toggleActions: "play none none none",
        },
        x: isDesktop ? -35 : 0,
        y: isDesktop ? 0 : 20,
        opacity: 0,
        duration: 0.65,
        ease: EASINGS.smooth,
        clearProps: "all",
      });

      const stepItems = document.querySelectorAll("#como-funciona-steps > div");
      if (stepItems.length > 0) {
        gsap.from(stepItems, {
          scrollTrigger: {
            trigger: "#como-funciona-steps",
            start: "top 88%",
            toggleActions: "play none none none",
          },
          x: isDesktop ? -40 : 0,
          y: isDesktop ? 0 : 24,
          opacity: 0,
          duration: 0.65,
          stagger: 0.12,
          ease: EASINGS.expressive,
          clearProps: "all",
        });
      }
    }

    // ============================================================================
    // 6. DEPOIMENTOS (Transição Horizontal da Direita no Desktop)
    // ============================================================================
    if (document.querySelector("#depoimentos")) {
      gsap.from("#depoimento-card", {
        scrollTrigger: {
          trigger: "#depoimentos",
          start: "top 88%",
          toggleActions: "play none none none",
        },
        x: isDesktop ? 40 : 0,
        y: isDesktop ? 0 : 22,
        opacity: 0,
        duration: 0.7,
        ease: "power2.out",
        clearProps: "all",
      });
    }

    // ============================================================================
    // 7. LOCALIZAÇÃO (Transição Horizontal Convergente: Informações da Esquerda, Mapa da Direita)
    // ============================================================================
    if (document.querySelector("#localizacao")) {
      gsap.from("#localizacao-info", {
        scrollTrigger: {
          trigger: "#localizacao",
          start: "top 88%",
          toggleActions: "play none none none",
        },
        x: isDesktop ? -45 : 0,
        y: isDesktop ? 0 : 22,
        opacity: 0,
        duration: 0.7,
        ease: "power2.out",
        clearProps: "all",
      });

      gsap.from("#localizacao-map", {
        scrollTrigger: {
          trigger: "#localizacao",
          start: "top 88%",
          toggleActions: "play none none none",
        },
        x: isDesktop ? 45 : 0,
        y: isDesktop ? 0 : 22,
        opacity: 0,
        duration: 0.7,
        ease: "power2.out",
        clearProps: "all",
      });
    }

    // ============================================================================
    // 8. FINAL CTA (ScrollTrigger com zoom suave e foco de conversão)
    // ============================================================================
    if (document.querySelector("#cta-final")) {
      gsap.from("#cta-final-box", {
        scrollTrigger: {
          trigger: "#cta-final",
          start: "top 90%",
          toggleActions: "play none none none",
        },
        scale: 0.96,
        y: 20,
        opacity: 0,
        duration: 0.7,
        ease: EASINGS.smooth,
        clearProps: "transform,opacity,scale,y",
      });
    }

    // Failsafe de visibilidade: garante que NENHUM elemento fique invisível com espaços vazios
    const failSafeTimer = setTimeout(() => {
      ScrollTrigger.refresh();
      const selectors = [
        "#hero-media-container",
        "#services-list > a",
        "#diferenciais-grid > div",
        "#como-funciona-steps > div",
        "#sobre-media",
        "#sobre-content",
        "#depoimento-card",
        "#localizacao-info",
        "#localizacao-map",
        "#cta-final-box",
      ];
      selectors.forEach((sel) => {
        document.querySelectorAll(sel).forEach((node) => {
          const el = node as HTMLElement;
          if (el && el.style.opacity === "0") {
            gsap.to(el, { opacity: 1, x: 0, y: 0, duration: 0.3, clearProps: "transform,opacity" });
          }
        });
      });
    }, 1000);

    return () => clearTimeout(failSafeTimer);
  }, []);

  // Recálculo ao carregar fontes ou imagens tardias
  useEffect(() => {
    const handleLoad = () => {
      ScrollTrigger.refresh();
    };

    window.addEventListener("load", handleLoad);
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => {
        ScrollTrigger.refresh();
      });
    }

    return () => {
      window.removeEventListener("load", handleLoad);
    };
  }, []);

  return null;
}
