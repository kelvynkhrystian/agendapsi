"use client";

import { useEffect } from "react";
import { useGSAP } from "@gsap/react";
import {
  gsap,
  ScrollTrigger,
  SplitText,
  TextPlugin,
  isReducedMotion,
  EASINGS,
  createTypewriterTween,
  type TypewriterHandle,
} from "@/lib/animation/gsap";

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

    if (typeof window !== "undefined") {
      gsap.registerPlugin(ScrollTrigger, SplitText, TextPlugin);
    }

    const rootEl = typeof document !== "undefined" ? document.documentElement : null;

    // Se o usuário prefere redução de movimento, garante visibilidade imediata e cancela movimentos espaciais
    if (isReducedMotion()) rootEl?.classList.remove("hero-anim-pending");
    if (isReducedMotion()) return;

    const isDesktop = typeof window !== "undefined" && window.innerWidth >= 768;
    const isHeroDesktop = typeof window !== "undefined" && window.innerWidth >= 1024;
    const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 900;

    // ============================================================================
    // REFERÊNCIAS E RESERVA DE LAYOUT DO HERO
    // ============================================================================
    const heroNameEl = document.querySelector("#hero-name") as HTMLElement | null;
    const heroTextEl = document.querySelector("#hero-name-text") as HTMLElement | null;
    const heroTitleEl = document.querySelector("#hero-title") as HTMLElement | null;
    const heroTitleTextEl = document.querySelector("#hero-title-text") as HTMLElement | null;
    const heroAccentLineEl = document.querySelector("#hero-accent-line") as HTMLElement | null;
    const heroSubtitleEl = document.querySelector("#hero-subtitle") as HTMLElement | null;
    const heroSubtitleTextEl = document.querySelector("#hero-subtitle-text") as HTMLElement | null;
    const ctaContainer = document.querySelector("#hero-cta") as HTMLElement | null;
    const ctaItems = document.querySelectorAll("#hero-cta .hero-cta-item");
    const benefitsContainer = document.querySelector("#hero-benefits") as HTMLElement | null;
    const benefitItems = document.querySelectorAll("#hero-benefits .hero-benefit-item");

    const typewriterEntries: Array<{ handle: TypewriterHandle; target: HTMLElement }> = [];
    let specialtySplit: SplitText | null = null;
    let subtitleSplit: SplitText | null = null;
    let subtitleDone = false;
    let subtitleTargetTl: gsap.core.Timeline | null = null;
    let subtitleInsertPos = 0;

    // Prepara SplitText de Especialidade e Descrição APENAS no Desktop (>= 1024px) preservando animações existentes
    const desktopTitleTarget = heroTitleTextEl || heroTitleEl;
    const desktopSubtitleTarget = heroSubtitleTextEl || heroSubtitleEl;

    if (isHeroDesktop && desktopTitleTarget) {
      specialtySplit = SplitText.create(desktopTitleTarget, {
        type: "words",
        wordsClass: "hero-title-word",
        aria: "auto",
      });
      if (specialtySplit.words.length > 0) {
        gsap.set(specialtySplit.words, { y: 18, opacity: 0 });
      }
    }

    const createDesktopSpecialtyWordsTween = () => {
      if (specialtySplit && specialtySplit.words.length > 0) {
        return gsap.fromTo(
          specialtySplit.words,
          { y: 18, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.5,
            stagger: 0.065,
            ease: "power3.out",
            clearProps: "transform,opacity",
            onComplete: () => {
              specialtySplit?.revert();
            },
          }
        );
      }
      if (desktopTitleTarget) {
        return gsap.fromTo(
          desktopTitleTarget,
          { y: 18, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.5,
            ease: "power3.out",
            clearProps: "transform,opacity",
          }
        );
      }
      return null;
    };

    const mountDesktopSubtitleMaskSplit = (targetTl: gsap.core.Timeline, insertAt: number) => {
      if (!desktopSubtitleTarget) return;
      subtitleTargetTl = targetTl;
      subtitleInsertPos = insertAt;

      subtitleSplit = SplitText.create(desktopSubtitleTarget, {
        type: "lines",
        mask: "lines",
        linesClass: "hero-subtitle-line",
        aria: "auto",
        autoSplit: true,
        onSplit: (self) => {
          if (subtitleDone || self.lines.length === 0) return;

          const tween = gsap.fromTo(
            self.lines,
            { yPercent: 105, opacity: 0 },
            {
              yPercent: 0,
              opacity: 1,
              duration: 0.6,
              stagger: 0.1,
              ease: "power3.out",
              clearProps: "transform,opacity",
              onComplete: () => {
                subtitleDone = true;
                self.revert();
              },
            }
          );

          if (subtitleTargetTl) {
            subtitleTargetTl.add(tween, subtitleInsertPos);
          }
          return tween;
        },
      });
    };

    // Verifica se elementos do Hero no Mobile estão inicialmente fora/abaixo da dobra visível
    const isBelowMobileFold = (el: Element | null, thresholdRatio = 0.88) => {
      if (isHeroDesktop || !el || typeof window === "undefined") return false;
      if (window.scrollY > 40) return true;
      const rect = el.getBoundingClientRect();
      return rect.top >= viewportHeight * thresholdRatio;
    };

    const isHeroElementBelowMobileFold = (el: Element | null) => {
      if (isHeroDesktop || !el || typeof window === "undefined") return false;
      if (window.scrollY > 40) return false;
      const rect = el.getBoundingClientRect();
      return rect.top >= viewportHeight * 0.9;
    };

    // ============================================================================
    // 1. HERO CONTENT ENTRANCE SEQUENCE
    // Desktop: Header -> CRP -> Nome (Typewriter) -> Especialidade (SplitText words) -> Descrição (SplitText lines) -> CTAs -> Benefícios
    // Mobile:  Header -> CRP -> Nome (Typewriter) -> Especialidade (Typewriter) -> Linha decorativa -> Descrição (Typewriter) -> CTAs -> Benefícios
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
          document.querySelector("#hero-header-mobile-crp"),
          document.querySelector("#hero-header-mobile-toggle"),
        ].filter((el): el is Element => Boolean(el))
      : [];

    if (desktopHeaderTargets.length > 0) {
      heroTl.fromTo(
        desktopHeaderTargets,
        { y: 20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.45,
          stagger: 0.04,
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
          duration: 0.42,
          stagger: 0.05,
          ease: "power3.out",
          clearProps: "transform,opacity",
        },
        0
      );
    }

    // 2 — BADGE CRP/CRM DO PROFISSIONAL (no mobile já integra o cabeçalho; no tablet/desktop entra após o header)
    if (isDesktop && document.querySelector("#hero-badge")) {
      heroTl.fromTo(
        "#hero-badge",
        { y: 22, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.45,
          ease: "power3.out",
          clearProps: "transform,opacity",
        },
        desktopHeaderTargets.length > 0 || mobileHeaderTargets.length > 0 ? 0.12 : 0
      );
    }

    let mobileHeroTextTl: gsap.core.Timeline | null = null;
    const deferHeroTextToMobileScroll = !isHeroDesktop && isBelowMobileFold(heroNameEl, 0.85);

    if (!isHeroDesktop) {
      // ==========================================================================
      // FLUXO COORDENADO DO HERO MOBILE (3x Typewriter compartilhado + Linha Decorativa)
      // ==========================================================================
      const nameTargetEl = heroTextEl;
      const specialtyTargetEl = heroTitleTextEl || heroTitleEl;
      const subtitleTargetEl = heroSubtitleTextEl || heroSubtitleEl;

      const mobileNameHandle = createTypewriterTween({
        target: nameTargetEl,
        variant: "name",
      });
      const mobileSpecialtyHandle = createTypewriterTween({
        target: specialtyTargetEl,
        variant: "specialty",
      });
      const mobileSubtitleHandle = createTypewriterTween({
        target: subtitleTargetEl,
        variant: "description",
      });

      if (mobileNameHandle.tween && nameTargetEl) {
        typewriterEntries.push({ handle: mobileNameHandle, target: nameTargetEl });
      }
      if (mobileSpecialtyHandle.tween && specialtyTargetEl) {
        typewriterEntries.push({ handle: mobileSpecialtyHandle, target: specialtyTargetEl });
      }
      if (mobileSubtitleHandle.tween && subtitleTargetEl) {
        typewriterEntries.push({ handle: mobileSubtitleHandle, target: subtitleTargetEl });
      }

      if (heroAccentLineEl) {
        gsap.set(heroAccentLineEl, {
          scaleX: 0,
          opacity: 0,
          transformOrigin: "center center",
        });
      }

      const populateMobileHeroSequence = (
        targetTl: gsap.core.Timeline,
        initialOffset: number,
        allowBelowFoldTriggers: boolean
      ) => {
        // 3 — NOME PROFISSIONAL (Typewriter via utilitário compartilhado)
        const nameStart = initialOffset;
        if (mobileNameHandle.tween) {
          targetTl.add(mobileNameHandle.tween, nameStart);
        }
        const nameEnd = nameStart + mobileNameHandle.duration;

        // 4 — ESPECIALIDADE (mesmo efeito Typewriter, inicia somente após concluir o nome)
        const specialtyStart = nameEnd;
        if (mobileSpecialtyHandle.tween) {
          targetTl.add(mobileSpecialtyHandle.tween, specialtyStart);
        }
        const specialtyEnd = specialtyStart + mobileSpecialtyHandle.duration;

        // 5 — LINHA DECORATIVA HORIZONTAL (cor primária oficial, aparece suavemente após especialidade)
        const accentStart = specialtyEnd;
        let accentDuration = 0;
        if (heroAccentLineEl) {
          accentDuration = 0.26;
          targetTl.fromTo(
            heroAccentLineEl,
            { scaleX: 0, opacity: 0, transformOrigin: "center center" },
            {
              scaleX: 1,
              opacity: 1,
              duration: accentDuration,
              ease: "power2.out",
              immediateRender: false,
              clearProps: "transform,opacity",
            },
            accentStart
          );
        }

        // 6 — DESCRIÇÃO (mesmo efeito Typewriter com intervalo mais rápido após especialidade e linha)
        const subtitleStart = accentStart + accentDuration;
        if (mobileSubtitleHandle.tween) {
          targetTl.add(mobileSubtitleHandle.tween, subtitleStart);
        }
        const subtitleEnd = subtitleStart + mobileSubtitleHandle.duration;

        // 7 — BOTÕES DE AÇÃO HERO (Appointment e WhatsApp de baixo para cima)
        const ctaStart = subtitleEnd;
        let ctaDeferred = false;
        let ctaUnlocked = false;
        let mobileCtaTween: gsap.core.Tween | null = null;

        if (ctaItems.length > 0) {
          if (allowBelowFoldTriggers && isHeroElementBelowMobileFold(ctaContainer)) {
            ctaDeferred = true;
            gsap.fromTo(
              ctaItems,
              { y: 22, opacity: 0 },
              {
                y: 0,
                opacity: 1,
                duration: 0.45,
                stagger: 0.08,
                ease: "power3.out",
                immediateRender: true,
                clearProps: "transform,opacity",
                scrollTrigger: {
                  trigger: "#hero-cta",
                  start: "top 92%",
                  once: true,
                },
              }
            );
          } else {
            gsap.set(ctaItems, { y: 22, opacity: 0 });
            mobileCtaTween = gsap.fromTo(
              ctaItems,
              { y: 22, opacity: 0 },
              {
                y: 0,
                opacity: 1,
                duration: 0.45,
                stagger: 0.08,
                ease: "power3.out",
                immediateRender: false,
                clearProps: "transform,opacity",
                onStart: () => {
                  ctaUnlocked = true;
                },
              }
            );
            targetTl.add(mobileCtaTween, ctaStart);

            if (!allowBelowFoldTriggers) {
              ScrollTrigger.create({
                trigger: ctaContainer || "#hero-cta",
                start: "top 42%",
                once: true,
                onEnter: () => {
                  if (!ctaUnlocked) {
                    ctaUnlocked = true;
                    mobileCtaTween?.kill();
                    gsap.to(ctaItems, {
                      y: 0,
                      opacity: 1,
                      duration: 0.36,
                      stagger: 0.06,
                      ease: "power3.out",
                      clearProps: "transform,opacity",
                    });
                  }
                },
              });
            }
          }
        }

        // 8 — ITENS DE BENEFÍCIO (Acolhimento, Saúde, Bem-estar com stagger sutil)
        const benefitsStart = ctaStart + (ctaItems.length > 0 ? 0.14 : 0);
        let benefitsUnlocked = false;
        let mobileBenefitsTween: gsap.core.Tween | null = null;

        if (benefitItems.length > 0) {
          if (allowBelowFoldTriggers && (ctaDeferred || isHeroElementBelowMobileFold(benefitsContainer))) {
            gsap.fromTo(
              benefitItems,
              { y: 20, opacity: 0 },
              {
                y: 0,
                opacity: 1,
                duration: 0.45,
                stagger: 0.09,
                ease: "power3.out",
                immediateRender: true,
                clearProps: "transform,opacity",
                scrollTrigger: {
                  trigger: "#hero-benefits",
                  start: "top 93%",
                  once: true,
                },
              }
            );
          } else {
            gsap.set(benefitItems, { y: 20, opacity: 0 });
            mobileBenefitsTween = gsap.fromTo(
              benefitItems,
              { y: 20, opacity: 0 },
              {
                y: 0,
                opacity: 1,
                duration: 0.45,
                stagger: 0.09,
                ease: "power3.out",
                immediateRender: false,
                clearProps: "transform,opacity",
                onStart: () => {
                  benefitsUnlocked = true;
                },
              }
            );
            targetTl.add(mobileBenefitsTween, benefitsStart);

            if (!allowBelowFoldTriggers) {
              ScrollTrigger.create({
                trigger: benefitsContainer || "#hero-benefits",
                start: "top 45%",
                once: true,
                onEnter: () => {
                  if (!benefitsUnlocked) {
                    benefitsUnlocked = true;
                    mobileBenefitsTween?.kill();
                    gsap.to(benefitItems, {
                      y: 0,
                      opacity: 1,
                      duration: 0.36,
                      stagger: 0.07,
                      ease: "power3.out",
                      clearProps: "transform,opacity",
                    });
                  }
                },
              });
            }
          }
        }
      };

      if (deferHeroTextToMobileScroll) {
        mobileHeroTextTl = gsap.timeline({
          defaults: { ease: EASINGS.smooth },
          scrollTrigger: {
            trigger: heroNameEl || "#hero-title-group",
            start: "top 88%",
            once: true,
          },
        });
        populateMobileHeroSequence(mobileHeroTextTl, 0, false);
      } else {
        populateMobileHeroSequence(heroTl, 0.2, true);
      }
    } else {
      // ==========================================================================
      // FLUXO PRESERVADO DO HERO DESKTOP (>= 1024px)
      // ==========================================================================
      // 3 — NOME PROFISSIONAL (Typewriter via TextPlugin com cursor piscante e duração adaptada)
      const nameStartTime = 0.24;
      const desktopNameHandle = createTypewriterTween({
        target: heroTextEl,
        variant: "name",
      });
      if (desktopNameHandle.tween && heroTextEl) {
        typewriterEntries.push({ handle: desktopNameHandle, target: heroTextEl });
        heroTl.add(desktopNameHandle.tween, nameStartTime);
      }

      // 4 — ESPECIALIDADE (SplitText palavra por palavra — inicia apenas quando o Typewriter termina)
      const specialtyStartTime = desktopNameHandle.tween
        ? nameStartTime + desktopNameHandle.duration
        : nameStartTime;
      const specialtyTween = createDesktopSpecialtyWordsTween();
      if (specialtyTween) {
        heroTl.add(specialtyTween, specialtyStartTime);
      }

      // 5 — DESCRIÇÃO / SUBTÍTULO DE ACOLHIMENTO (SplitText máscara linha a linha)
      const subtitleStartTime = specialtyStartTime + (specialtyTween ? 0.24 : 0);
      if (desktopSubtitleTarget) {
        mountDesktopSubtitleMaskSplit(heroTl, subtitleStartTime);
      }

      // 6 — BOTÕES DE AÇÃO HERO ("Agende sua consulta" e "Chamar no WhatsApp")
      const ctaStartTime = (desktopSubtitleTarget ? subtitleStartTime : specialtyStartTime) + 0.22;
      if (ctaItems.length > 0) {
        heroTl.fromTo(
          ctaItems,
          { y: 22, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.5,
            stagger: 0.08,
            ease: "power3.out",
            clearProps: "transform,opacity",
          },
          ctaStartTime
        );
      }

      // 7 — ITENS DE BENEFÍCIO (Acolhimento, Saúde, Bem-estar)
      const benefitsStartTime = ctaStartTime + (ctaItems.length > 0 ? 0.14 : 0);
      if (benefitItems.length > 0) {
        heroTl.fromTo(
          benefitItems,
          { y: 20, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.5,
            stagger: 0.09,
            ease: "power3.out",
            clearProps: "transform,opacity",
          },
          benefitsStartTime
        );
      }

      // Indicador de scroll animado no Hero desktop (revelação suave ao final da sequência)
      if (document.querySelector("#hero-scroll-indicator")) {
        heroTl.fromTo(
          "#hero-scroll-indicator",
          { y: 18, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.48,
            ease: "power3.out",
            clearProps: "transform,opacity",
          },
          benefitsStartTime + 0.1
        );
      }
    }

    // Todos os estados iniciais do Hero já foram preparados — remove bloqueio anti-flash do HTML
    rootEl?.classList.remove("hero-anim-pending");

    // ============================================================================
    // 1.8 TRANSIÇÃO PARALLAX DO HERO NO DESKTOP (GSAP ScrollTrigger independente)
    // ============================================================================
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

    ScrollTrigger.refresh();

    // Failsafe após o término previsto da sequência principal: garante visibilidade caso alguma trigger falhe
    const failSafeDelayMs = Math.max(
      4500,
      Math.ceil(Math.max(heroTl.duration(), mobileHeroTextTl?.duration() ?? 0) * 1000) + 1200
    );
    const failSafeTimer = setTimeout(() => {
      rootEl?.classList.remove("hero-anim-pending");
      ScrollTrigger.refresh();

      if (heroTl.isActive() || mobileHeroTextTl?.isActive()) return;

      const vhNow = typeof window !== "undefined" ? window.innerHeight : 900;
      typewriterEntries.forEach(({ handle, target }) => {
        const rect = target.getBoundingClientRect();
        if (
          rect.top < vhNow * 0.92 &&
          target.classList.contains("hero-typewriter-primed") &&
          !target.classList.contains("hero-typewriter-typing")
        ) {
          handle.cleanup();
        }
      });

      const heroAndSectionSelectors = [
        "#hero-header-logo",
        "#hero-header-pill",
        "#hero-header-auth",
        "#hero-header-mobile-logo",
        "#hero-header-mobile-crp",
        "#hero-header-mobile-toggle",
        "#hero-badge",
        "#hero-name",
        "#hero-title",
        "#hero-title .hero-title-word",
        "#hero-accent-line",
        "#hero-subtitle",
        "#hero-subtitle .hero-subtitle-line",
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
            gsap.to(el, { opacity: 1, x: 0, y: 0, scaleX: 1, yPercent: 0, duration: 0.3, clearProps: "transform,opacity" });
          }
        });
      });
    }, failSafeDelayMs);

    return () => {
      clearTimeout(failSafeTimer);
      typewriterEntries.forEach(({ handle }) => handle.cleanup());
      specialtySplit?.revert();
      subtitleSplit?.revert();
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
