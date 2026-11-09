"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

export interface MediaPlayerProps {
  slot: "hero" | "hero_mobile" | "about";
  mediaType?: "IMAGE" | "FRAME_ANIMATION" | "VIDEO" | string;
  mediaUrl?: string | null;
  posterUrl?: string | null;
  frames?: string[];
  frameCount?: number;
  fps?: number;
  playbackSpeed?: number;
  previewMode?: boolean;
  loop?: boolean;
  autoplay?: boolean;
  playbackMode?: "AUTOMATIC" | "SCROLL" | string;
  playbackDirection?: "FORWARD" | "ALTERNATE" | string;
  positioning?: "center" | "cover" | "contain" | "top" | "bottom" | string;
  intrinsicWidth?: number | null;
  intrinsicHeight?: number | null;
  className?: string;
  altText?: string;
  alt?: string;
}

function resolveSpeedMultiplier(speed?: number): number {
  const numeric = typeof speed === "number" ? speed : Number(speed);
  if (!Number.isFinite(numeric) || numeric <= 0) return 1;
  if (numeric < 0.75) return 0.5;
  if (numeric >= 1.5) return 2;
  return 1;
}

export function MiniSiteMediaPlayer({
  slot,
  mediaType = "IMAGE",
  mediaUrl,
  posterUrl,
  frames = [],
  fps = 24,
  playbackSpeed = 1,
  previewMode = false,
  loop = true,
  autoplay = true,
  playbackMode = "AUTOMATIC",
  playbackDirection = "FORWARD",
  positioning = "center",
  intrinsicWidth,
  intrinsicHeight,
  className = "",
  altText = "Mídia Institucional",
  alt,
}: MediaPlayerProps) {
  const actualAlt = alt || altText;
  const effectiveSpeed = resolveSpeedMultiplier(playbackSpeed);
  const effectivePlaybackMode = previewMode ? "AUTOMATIC" : playbackMode;
  const effectiveAutoplay = previewMode ? true : autoplay;
  const effectiveLoop = previewMode ? true : loop;

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [imagesLoaded, setImagesLoaded] = useState<boolean>(false);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [videoAspectRatio, setVideoAspectRatio] = useState<number | null>(null);
  const [frameAspectRatio, setFrameAspectRatio] = useState<number | null>(null);

  const loadedImagesRef = useRef<HTMLImageElement[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const directionRef = useRef<number>(1); // 1 = forward, -1 = backward

  // Detecta preferência de movimento reduzido
  useEffect(() => {
    if (typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      setReducedMotion(mediaQuery.matches);
      const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
      mediaQuery.addEventListener("change", listener);
      return () => mediaQuery.removeEventListener("change", listener);
    }
  }, []);

  // Aplica velocidade de reprodução (0.5x, 1x, 2x) para vídeos MP4 / WebM
  useEffect(() => {
    const v = videoRef.current;
    if (!v || mediaType !== "VIDEO") return;
    v.defaultPlaybackRate = effectiveSpeed;
    v.playbackRate = effectiveSpeed;
  }, [effectiveSpeed, mediaType, mediaUrl]);

  // IntersectionObserver + verificação de visibilidade CSS para pausar slots ocultos ou fora da tela
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const syncVisibility = (intersecting: boolean) => {
      const visibleNow = intersecting && el.getClientRects().length > 0;
      setIsVisible(visibleNow);
      const v = videoRef.current;
      if (v) {
        if (visibleNow && effectiveAutoplay) {
          v.defaultPlaybackRate = effectiveSpeed;
          v.playbackRate = effectiveSpeed;
          v.play().catch(() => {});
        } else {
          v.pause();
        }
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        syncVisibility(entry.isIntersecting);
      },
      { threshold: 0.05 }
    );

    observer.observe(el);

    const mq =
      typeof window !== "undefined" ? window.matchMedia("(min-width: 1024px)") : null;
    const handleMediaChange = () => {
      syncVisibility(el.getClientRects().length > 0);
    };
    mq?.addEventListener("change", handleMediaChange);

    return () => {
      observer.disconnect();
      mq?.removeEventListener("change", handleMediaChange);
    };
  }, [effectiveAutoplay, effectiveSpeed, mediaType, mediaUrl]);

  // Carregamento progressivo de frames para FRAME_ANIMATION
  useEffect(() => {
    if (mediaType !== "FRAME_ANIMATION" || !frames || frames.length === 0) {
      loadedImagesRef.current = [];
      setImagesLoaded(false);
      setCurrentFrameIndex(0);
      return;
    }

    let isCancelled = false;
    loadedImagesRef.current = [];
    setImagesLoaded(false);
    setCurrentFrameIndex(0);
    directionRef.current = 1;
    lastFrameTimeRef.current = 0;

    // Pré-carrega o primeiro lote (poster e primeiros 5 frames para renderização instantânea)
    const initialBatchSize = Math.min(5, frames.length);
    let loadedCount = 0;

    for (let i = 0; i < frames.length; i++) {
      const img = new Image();
      img.src = frames[i];

      const onDone = () => {
        if (isCancelled) return;
        loadedCount++;
        if (i === 0 && img.naturalWidth && img.naturalHeight) {
          setFrameAspectRatio(img.naturalWidth / img.naturalHeight);
        }
        if (loadedCount >= initialBatchSize) {
          setImagesLoaded(true);
        }
      };

      if (img.complete && img.naturalWidth > 0) {
        if (i === 0) {
          setFrameAspectRatio(img.naturalWidth / img.naturalHeight);
        }
        onDone();
      } else {
        img.onload = onDone;
        img.onerror = onDone;
      }
      loadedImagesRef.current[i] = img;
    }

    return () => {
      isCancelled = true;
    };
  }, [mediaType, frames]);

  // Reprodução de FRAME_ANIMATION (Modo AUTOMATIC) com suporte a 0.5x / 1x / 2x mantendo FPS base
  useEffect(() => {
    if (
      mediaType !== "FRAME_ANIMATION" ||
      effectivePlaybackMode !== "AUTOMATIC" ||
      !frames ||
      frames.length === 0 ||
      reducedMotion ||
      !isVisible ||
      !effectiveAutoplay
    ) {
      return;
    }

    lastFrameTimeRef.current = 0;
    const effectiveFps = Math.max(1, (fps || 24) * effectiveSpeed);
    const intervalMs = 1000 / effectiveFps;

    const renderLoop = (timestamp: number) => {
      if (lastFrameTimeRef.current === 0) {
        lastFrameTimeRef.current = timestamp;
      }
      const delta = timestamp - lastFrameTimeRef.current;

      if (delta + 0.5 >= intervalMs) {
        const steps = Math.min(3, Math.max(1, Math.floor((delta + 0.5) / intervalMs)));
        lastFrameTimeRef.current = timestamp - (delta % intervalMs);

        setCurrentFrameIndex((prevIndex) => {
          const total = frames.length;
          if (total <= 1) return 0;

          let idx = prevIndex < total ? prevIndex : 0;
          for (let s = 0; s < steps; s++) {
            if (playbackDirection === "ALTERNATE") {
              let nextIndex = idx + directionRef.current;
              if (nextIndex >= total) {
                directionRef.current = -1;
                nextIndex = Math.max(0, total - 2);
              } else if (nextIndex < 0) {
                directionRef.current = 1;
                nextIndex = Math.min(total - 1, 1);
              }
              idx = Math.max(0, Math.min(total - 1, nextIndex));
            } else {
              // FORWARD
              if (idx + 1 >= total) {
                idx = effectiveLoop ? 0 : idx;
              } else {
                idx = idx + 1;
              }
            }
          }
          return idx;
        });
      }

      animationFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animationFrameRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [
    mediaType,
    effectivePlaybackMode,
    frames,
    fps,
    effectiveSpeed,
    effectiveLoop,
    effectiveAutoplay,
    playbackDirection,
    reducedMotion,
    isVisible,
  ]);

  // Reprodução de FRAME_ANIMATION (Modo SCROLL)
  useEffect(() => {
    if (
      mediaType !== "FRAME_ANIMATION" ||
      effectivePlaybackMode !== "SCROLL" ||
      !frames ||
      frames.length === 0 ||
      reducedMotion
    ) {
      return;
    }

    const handleScroll = () => {
      const el = containerRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const windowHeight = window.innerHeight || document.documentElement.clientHeight;

      // Progresso de 0 quando entra na parte inferior da tela até 1 quando sai pelo topo
      const start = windowHeight;
      const end = -rect.height;
      const progress = Math.max(0, Math.min(1, (start - rect.top) / (start - end)));

      const frameIdx = Math.min(frames.length - 1, Math.floor(progress * frames.length));
      setCurrentFrameIndex(frameIdx);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [mediaType, effectivePlaybackMode, frames, reducedMotion]);

  // Desenho síncrono dos frames no Canvas antes da pintura para evitar flash branco na troca img -> canvas
  useLayoutEffect(() => {
    if (mediaType !== "FRAME_ANIMATION" || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = loadedImagesRef.current[currentFrameIndex] || loadedImagesRef.current[0];
    if (img && img.complete && img.naturalWidth > 0) {
      if (slot === "hero" || slot === "hero_mobile") {
        const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
        const displayWidth = img.naturalWidth;
        const displayHeight = img.naturalHeight;
        const targetWidth = Math.round(displayWidth * dpr);
        const targetHeight = Math.round(displayHeight * dpr);

        if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
          canvas.width = targetWidth;
          canvas.height = targetHeight;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.drawImage(img, 0, 0);
        ctx.restore();
      } else {
        if (canvas.width !== img.naturalWidth || canvas.height !== img.naturalHeight) {
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      }
    }
  }, [mediaType, currentFrameIndex, imagesLoaded, slot]);

  const handleVideoMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const v = e.currentTarget;
    v.defaultPlaybackRate = effectiveSpeed;
    v.playbackRate = effectiveSpeed;
    if (v.videoWidth && v.videoHeight) {
      setVideoAspectRatio(v.videoWidth / v.videoHeight);
    }
  };

  // Enquadramento de objeto
  const getObjectFitClass = () => {
    if (previewMode) return "object-contain";
    if (positioning === "contain") return "object-contain";
    if (positioning === "cover") return "object-cover";
    if (positioning === "top") return "object-cover object-top";
    if (positioning === "bottom") return "object-cover object-bottom";
    return slot === "hero" || slot === "hero_mobile" ? "object-contain" : "object-cover object-center";
  };

  const isPublicHeroDesktop = !previewMode && slot === "hero";
  const isPublicHeroMobile = !previewMode && slot === "hero_mobile";
  const isPublicHero = isPublicHeroDesktop || isPublicHeroMobile;

  const hasIntrinsicDims = Boolean(
    intrinsicWidth && intrinsicWidth > 0 && intrinsicHeight && intrinsicHeight > 0
  );
  const resolvedAspectRatio = hasIntrinsicDims
    ? `${intrinsicWidth} / ${intrinsicHeight}`
    : videoAspectRatio
    ? `${videoAspectRatio}`
    : frameAspectRatio
    ? `${frameAspectRatio}`
    : undefined;
  const heroAspectStyle: React.CSSProperties | undefined =
    isPublicHero && resolvedAspectRatio ? { aspectRatio: resolvedAspectRatio } : undefined;
  const isImagePoster =
    Boolean(posterUrl) && !/\.(mp4|webm|mov|avi)(\?|#|$)/i.test(posterUrl || "");
  const effectiveVideoPoster = isImagePoster ? posterUrl || undefined : undefined;

  const desktopHeroObjectPos =
    positioning === "top"
      ? "lg:object-top"
      : positioning === "bottom"
      ? "lg:object-bottom"
      : "lg:object-center";

  const mediaClassName = previewMode
    ? "w-full h-full object-contain"
    : isPublicHeroDesktop
    ? `w-full h-auto lg:h-full lg:w-full block max-w-full bg-[var(--hero-background-color,#FAF7F2)] object-contain lg:object-cover ${desktopHeroObjectPos}`
    : isPublicHeroMobile
    ? "w-full h-auto block max-w-full bg-[var(--hero-background-color,#FAF7F2)] object-contain"
    : `w-full h-full ${getObjectFitClass()}`;

  return (
    <div
      ref={containerRef}
      className={
        isPublicHeroDesktop
          ? `relative w-full h-auto lg:h-full lg:w-full lg:absolute lg:inset-0 flex items-center justify-center bg-[var(--hero-background-color,#FAF7F2)] ${className}`
          : isPublicHeroMobile
          ? `relative w-full h-auto flex items-center justify-center bg-[var(--hero-background-color,#FAF7F2)] ${className}`
          : `relative w-full h-full flex items-center justify-center overflow-hidden ${className}`
      }
    >
      {/* 1. MODO: VÍDEO (MP4 / WebM) */}
      {mediaType === "VIDEO" && mediaUrl ? (
        <video
          ref={videoRef}
          src={mediaUrl}
          poster={effectiveVideoPoster}
          width={intrinsicWidth || undefined}
          height={intrinsicHeight || undefined}
          autoPlay={effectiveAutoplay}
          muted
          playsInline
          loop={effectiveLoop}
          preload="auto"
          onLoadedMetadata={handleVideoMetadata}
          onPlay={(e) => {
            e.currentTarget.defaultPlaybackRate = effectiveSpeed;
            e.currentTarget.playbackRate = effectiveSpeed;
          }}
          style={heroAspectStyle}
          className={mediaClassName}
        />
      ) : null}

      {/* 2. MODO: FRAME ANIMATION (Canvas / Imagem Sequencial) */}
      {mediaType === "FRAME_ANIMATION" && frames && frames.length > 0 ? (
        <div
          className={
            isPublicHeroDesktop
              ? "w-full h-auto lg:h-full lg:w-full lg:absolute lg:inset-0 relative flex items-center justify-center bg-[var(--hero-background-color,#FAF7F2)]"
              : isPublicHeroMobile
              ? "w-full h-auto relative flex items-center justify-center bg-[var(--hero-background-color,#FAF7F2)]"
              : "w-full h-full relative flex items-center justify-center"
          }
        >
          {/* Se movimento reduzido estiver ativado, exibe o pôster / primeiro frame estático */}
          {reducedMotion || !imagesLoaded ? (
            <img
              src={posterUrl || frames[0]}
              alt={actualAlt}
              width={intrinsicWidth || undefined}
              height={intrinsicHeight || undefined}
              style={heroAspectStyle}
              className={mediaClassName}
            />
          ) : (
            <canvas
              ref={canvasRef}
              className={mediaClassName}
              style={{ display: "block", ...(heroAspectStyle || {}) }}
            />
          )}
        </div>
      ) : null}

      {/* 3. MODO: IMAGEM ESTÁTICA */}
      {mediaType === "IMAGE" && mediaUrl ? (
        <img
          src={mediaUrl}
          alt={actualAlt}
          width={intrinsicWidth || undefined}
          height={intrinsicHeight || undefined}
          style={heroAspectStyle}
          className={mediaClassName}
        />
      ) : null}

      {/* 4. PLACEHOLDER NEUTRO QUANDO SEM MÍDIA CONFIGURADA */}
      {!mediaUrl && (!frames || frames.length === 0) ? (
        previewMode ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-5 text-center space-y-2 text-slate-400">
            <div className="w-11 h-11 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] text-xl font-serif">
              Ψ
            </div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {slot === "hero_mobile"
                ? "Sem mídia exclusiva (usa o Hero Desktop)"
                : "Nenhuma mídia enviada"}
            </span>
          </div>
        ) : isPublicHero ? (
          <div className="w-full max-w-sm py-8 px-4 flex flex-col items-center justify-center text-center space-y-2 bg-[var(--hero-background-color,#FAF7F2)] lg:hidden">
            <div className="w-12 h-12 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] text-2xl font-serif shadow-2xs">
              Ψ
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Espaço Terapêutico
            </span>
          </div>
        ) : (
          <div className="w-full h-full bg-gradient-to-tr from-[#EBE3D5] to-[#F5EFEB] flex flex-col items-center justify-center p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/80 shadow-xs flex items-center justify-center text-[var(--primary)] mb-2">
              <span className="text-2xl font-serif">Ψ</span>
            </div>
            <h4 className="font-serif italic font-bold text-xs sm:text-sm text-slate-800">
              Ambiente de Acolhimento
            </h4>
            <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">
              Espaço silencioso, privativo e seguro.
            </p>
          </div>
        )
      ) : null}
    </div>
  );
}
