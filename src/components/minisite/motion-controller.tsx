"use client";

import { useEffect } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger, isReducedMotion, EASINGS } from "@/lib/animation/gsap";

declare global {
  interface Window {
    __psiHeroPendingTimer?: ReturnType<typeof setTimeout>;
  }
}

export function MiniSiteMotionController() {
  useGSAP(() => {
    if (typeof window !== "undefined" && window.__psiHeroPendingTimer) {
      clearTimeout(window.__psiHeroPendingTimer);
      window.__psiHeroPendingTimer = undefined;
    }

    const rootEl = typeof document !== "undefined" ? document.documentElement : null;

    // Se o usuário prefere redução de movimento, garante visibilidade imediata e cancela movimentos espaciais
    if (isReducedMotion()) rootEl?.classList.remove("hero-anim-pending");
    if (isReducedMotion()) return;

    const isDesktop = typeof window !== "undefined" && window.innerWidth >= 768;
    const isHeroDesktop = typeof window !== "undefined" && window.innerWidth >= 1024;
    const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 900;

    // No mobile, elementos do Hero estritamente abaixo da dobra inicial entram via ScrollTrigger único
    const isHeroElementBelowMobileFold = (el: Element | null) => {
      if (isHeroDesktop || !el || typeof window === "undefined") return false;
      if (window.scrollY > 40) return false;
      const rect = el.getBoundingClientRect();
      return rect.top >= viewportHeight * 0.94;
    };

    // ============================================================================
    // 1. HERO CONTENT ENTRANCE SEQUENCE (Timeline única coordenada — BAIXO -> CIMA)
    // ============================================================================
    // REGRA ESTRITA: A mídia do Hero (#hero-media-container, video, canvas, img) NUNCA é animada
    // ou escalada na entrada. Ela é renderizada em 100% do tamanho e opacidade desde o 1º frame.
    const heroTl = gsap.timeline({
      defaults: { ease: EASINGS.smooth },
    });

    // 1 — HEADER (primeiro elemento a entrar, de baixo para cima, sem deslocar o <header> fixo)
    const desktopHeaderTargets = isDesktop
      ? [
          document.querySelector("#hero-header-logo"),
          document.querySelector("#hero-header-pill"),
          document.querySelector("#hero-header-auth"),
        ].filter((el): el is Element => Boolean(el))
      : [];
    const mobileHeaderTargets = !isDesktop
      ? [
          document.querySelector("#hero-header-mobile-logo"),
          document.querySelector("#hero-header-mobile-toggle"),
        ].filter((el): el is Element => Boolean(el))
      : [];

    if (desktopHeaderTargets.length > 0) {
      heroTl.fromTo(
        desktopHeaderTargets,
        { y: 22, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.55,
          stagger: 0.05,
          ease: "power3.out",
          clearProps: "transform,opacity",
        },
        0
      );
    } else if (mobileHeaderTargets.length > 0) {
      heroTl.fromTo(
        mobileHeaderTargets,
        { y: 18, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          stagger: 0.06,
          ease: "power3.out",
          clearProps: "transform,opacity",
        },
        0
      );
    }

    // 2 — BADGE CRP/CRM DO PROFISSIONAL
    if (document.querySelector("#hero-badge")) {
      heroTl.fromTo(
        "#hero-badge",
        { y: 24, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.52,
          ease: "power3.out",
          clearProps: "transform,opacity",
        },
        desktopHeaderTargets.length > 0 || mobileHeaderTargets.length > 0 ? "-=0.36" : 0
      );
    }

    // 3 — NOME DO PROFISSIONAL
    if (document.querySelector("#hero-name")) {
      heroTl.fromTo(
        "#hero-name",
        { y: 28, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          ease: "power3.out",
          clearProps: "transform,opacity",
        },
        "-=0.38"
      );
    }

    // 4 — ESPECIALIDADE (ex: PSICÓLOGO CLÍNICO E ESCOLAR)
    if (document.querySelector("#hero-title")) {
      heroTl.fromTo(
        "#hero-title",
        { y: 24, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.55,
          ease: "power3.out",
          clearProps: "transform,opacity",
        },
        "-=0.42"
      );
    }

    // 5 — DESCRIÇÃO / SUBTÍTULO DE ACOLHIMENTO (bloco coerente, logo após especialidade)
    if (document.querySelector("#hero-subtitle")) {
      heroTl.fromTo(
        "#hero-subtitle",
        { y: 24, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.55,
          ease: "power3.out",
          clearProps: "transform,opacity",
        },
        "-=0.38"
      );
    }

    // 6 — BOTÕES DE AÇÃO HERO ("Agende sua consulta" e "Chamar no WhatsApp")
    const ctaContainer = document.querySelector("#hero-cta");
    const ctaItems = document.querySelectorAll("#hero-cta .hero-cta-item");
    if (ctaItems.length > 0) {
      if (isHeroElementBelowMobileFold(ctaContainer)) {
        gsap.fromTo(
          ctaItems,
          { y: 24, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.55,
            stagger: 0.08,
            ease: "power3.out",
            immediateRender: true,
            clearProps: "transform,opacity",
            scrollTrigger: {
              trigger: "#hero-cta",
              start: "top 95%",
              once: true,
            },
          }
        );
      } else {
        heroTl.fromTo(
          ctaItems,
          { y: 24, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.55,
            stagger: 0.08,
            ease: "power3.out",
            clearProps: "transform,opacity",
          },
          "-=0.36"
        );
      }
    }

    // 7 — ITENS DE BENEFÍCIO (Acolhimento, Saúde, Bem-estar) - últimos da sequência com stagger esquerda -> direita
    const benefitsContainer = document.querySelector("#hero-benefits");
    const benefitItems = document.querySelectorAll("#hero-benefits .hero-benefit-item");
    if (benefitItems.length > 0) {
      if (isHeroElementBelowMobileFold(benefitsContainer)) {
        gsap.fromTo(
          benefitItems,
          { y: 22, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.5,
            stagger: 0.09,
            ease: "power3.out",
            immediateRender: true,
            clearProps: "transform,opacity",
            scrollTrigger: {
              trigger: "#hero-benefits",
              start: "top 95%",
              once: true,
            },
          }
        );
      } else {
        heroTl.fromTo(
          benefitItems,
          { y: 22, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.5,
            stagger: 0.09,
            ease: "power3.out",
            clearProps: "transform,opacity",
          },
          "-=0.32"
        );
      }
    }

    // Indicador de scroll animado no Hero desktop (revelação suave ao final da sequência)
    if (isHeroDesktop && document.querySelector("#hero-scroll-indicator")) {
      heroTl.fromTo(
        "#hero-scroll-indicator",
        { y: 20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.55,
          ease: "power3.out",
          clearProps: "transform,opacity",
        },
        "-=0.3"
      );
    }

    // Todos os tweens iniciais do Hero já aplicaram inline opacity:0/y — libera classe anti-flash do HTML
    rootEl?.classList.remove("hero-anim-pending");

    // ============================================================================
    // 1.8 TRANSIÇÃO PARALLAX DO HERO NO DESKTOP (GSAP ScrollTrigger independente)
    // ============================================================================
    // Deslocamento suave de ~12% da camada de mídia em relação à rolagem,
    // separado da timeline de entrada e ativo exclusivamente no desktop (>= 1024px).
    const mm = gsap.matchMedia();
    mm.add("(min-width: 1024px)", () => {
      if (document.querySelector("#hero-parallax-layer") && document.querySelector("#inicio")) {
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
    });

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

    // Recalcula ScrollTriggers após registro completo de todas as seções
    ScrollTrigger.refresh();

    // Failsafe de visibilidade: garante que NENHUM elemento visível na viewport fique preso invisível
    const failSafeTimer = setTimeout(() => {
      rootEl?.classList.remove("hero-anim-pending");
      ScrollTrigger.refresh();
      const vhNow = typeof window !== "undefined" ? window.innerHeight : 900;
      const heroAndSectionSelectors = [
        "#hero-header-logo",
        "#hero-header-pill",
        "#hero-header-auth",
        "#hero-header-mobile-logo",
        "#hero-header-mobile-toggle",
        "#hero-badge",
        "#hero-name",
        "#hero-title",
        "#hero-subtitle",
        "#hero-cta .hero-cta-item",
        "#hero-benefits .hero-benefit-item",
        "#hero-scroll-indicator",
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
      heroAndSectionSelectors.forEach((sel) => {
        document.querySelectorAll(sel).forEach((node) => {
          const el = node as HTMLElement;
          if (!el) return;
          const rect = el.getBoundingClientRect();
          if (rect.top < vhNow && el.style.opacity === "0") {
            gsap.to(el, { opacity: 1, x: 0, y: 0, duration: 0.3, clearProps: "transform,opacity" });
          }
        });
      });
    }, 1500);

    return () => {
      clearTimeout(failSafeTimer);
      mm.revert();
      rootEl?.classList.remove("hero-anim-pending");
    };
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
