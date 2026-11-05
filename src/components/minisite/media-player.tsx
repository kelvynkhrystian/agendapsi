"use client";

import React, { useEffect, useRef, useState } from "react";

export interface MediaPlayerProps {
  slot: "hero" | "about";
  mediaType?: "IMAGE" | "FRAME_ANIMATION" | "VIDEO" | string;
  mediaUrl?: string | null;
  posterUrl?: string | null;
  frames?: string[];
  frameCount?: number;
  fps?: number;
  loop?: boolean;
  autoplay?: boolean;
  playbackMode?: "AUTOMATIC" | "SCROLL" | string;
  playbackDirection?: "FORWARD" | "ALTERNATE" | string;
  positioning?: "center" | "cover" | "contain" | "top" | "bottom" | string;
  className?: string;
  altText?: string;
  alt?: string;
}

export function MiniSiteMediaPlayer({
  slot,
  mediaType = "IMAGE",
  mediaUrl,
  posterUrl,
  frames = [],
  frameCount,
  fps = 24,
  loop = true,
  autoplay = true,
  playbackMode = "AUTOMATIC",
  playbackDirection = "FORWARD",
  positioning = "center",
  className = "",
  altText = "Mídia Institucional",
  alt,
}: MediaPlayerProps) {
  const actualAlt = alt || altText;
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [imagesLoaded, setImagesLoaded] = useState<boolean>(false);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);
  const [isVisible, setIsVisible] = useState<boolean>(true);

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

  // IntersectionObserver para pausar quando fora da tela (otimização mobile e economia de bateria)
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
        if (videoRef.current) {
          if (entry.isIntersecting && autoplay) {
            videoRef.current.play().catch(() => {});
          } else {
            videoRef.current.pause();
          }
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [autoplay]);

  // Carregamento progressivo de frames para FRAME_ANIMATION
  useEffect(() => {
    if (mediaType !== "FRAME_ANIMATION" || !frames || frames.length === 0) {
      return;
    }

    let isCancelled = false;
    loadedImagesRef.current = [];

    // Pré-carrega o primeiro lote (poster e primeiros 5 frames para renderização instantânea)
    const initialBatchSize = Math.min(5, frames.length);
    let loadedCount = 0;

    for (let i = 0; i < frames.length; i++) {
      const img = new Image();
      img.src = frames[i];

      const onDone = () => {
        if (isCancelled) return;
        loadedCount++;
        if (loadedCount >= initialBatchSize) {
          setImagesLoaded(true);
        }
      };

      if (img.complete && img.naturalWidth > 0) {
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

  // Reprodução de FRAME_ANIMATION (Modo AUTOMATIC)
  useEffect(() => {
    if (
      mediaType !== "FRAME_ANIMATION" ||
      playbackMode !== "AUTOMATIC" ||
      !frames ||
      frames.length === 0 ||
      reducedMotion ||
      !isVisible ||
      !autoplay
    ) {
      return;
    }

    const intervalMs = 1000 / (fps || 24);

    const renderLoop = (timestamp: number) => {
      if (timestamp - lastFrameTimeRef.current >= intervalMs) {
        lastFrameTimeRef.current = timestamp;

        setCurrentFrameIndex((prevIndex) => {
          const total = frames.length;
          if (total <= 1) return 0;

          if (playbackDirection === "ALTERNATE") {
            let nextIndex = prevIndex + directionRef.current;
            if (nextIndex >= total) {
              directionRef.current = -1;
              nextIndex = total - 2;
            } else if (nextIndex < 0) {
              directionRef.current = 1;
              nextIndex = 1;
            }
            return Math.max(0, Math.min(total - 1, nextIndex));
          } else {
            // FORWARD
            if (prevIndex + 1 >= total) {
              return loop ? 0 : prevIndex;
            }
            return prevIndex + 1;
          }
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
  }, [mediaType, playbackMode, frames, fps, loop, autoplay, playbackDirection, reducedMotion, isVisible]);

  // Reprodução de FRAME_ANIMATION (Modo SCROLL)
  useEffect(() => {
    if (
      mediaType !== "FRAME_ANIMATION" ||
      playbackMode !== "SCROLL" ||
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
  }, [mediaType, playbackMode, frames, reducedMotion]);

  // Desenho dos frames no Canvas quando atualizados
  useEffect(() => {
    if (mediaType !== "FRAME_ANIMATION" || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = loadedImagesRef.current[currentFrameIndex] || loadedImagesRef.current[0];
    if (img && img.complete && img.naturalWidth > 0) {
      if (canvas.width !== img.naturalWidth || canvas.height !== img.naturalHeight) {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    }
  }, [mediaType, currentFrameIndex, imagesLoaded]);

  // Enquadramento de objeto
  const getObjectFitClass = () => {
    if (positioning === "contain") return "object-contain";
    if (positioning === "cover") return "object-cover";
    if (positioning === "top") return "object-cover object-top";
    if (positioning === "bottom") return "object-cover object-bottom";
    return "object-cover object-center";
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full flex items-center justify-center overflow-hidden ${className}`}
    >
      {/* 1. MODO: VÍDEO (MP4 / WebM) */}
      {mediaType === "VIDEO" && mediaUrl ? (
        <video
          ref={videoRef}
          src={mediaUrl}
          poster={posterUrl || undefined}
          autoPlay={autoplay}
          muted
          playsInline
          loop={loop}
          className={`w-full h-full ${getObjectFitClass()}`}
        />
      ) : null}

      {/* 2. MODO: FRAME ANIMATION (Canvas / Imagem Sequencial) */}
      {mediaType === "FRAME_ANIMATION" && frames && frames.length > 0 ? (
        <div className="w-full h-full relative flex items-center justify-center">
          {/* Se movimento reduzido estiver ativado, exibe o pôster / primeiro frame estático */}
          {reducedMotion || !imagesLoaded ? (
            <img
              src={posterUrl || frames[0]}
              alt={actualAlt}
              className={`w-full h-full ${getObjectFitClass()}`}
            />
          ) : (
            <canvas
              ref={canvasRef}
              className={`w-full h-full ${getObjectFitClass()}`}
              style={{ display: "block" }}
            />
          )}
        </div>
      ) : null}

      {/* 3. MODO: IMAGEM ESTÁTICA */}
      {mediaType === "IMAGE" && mediaUrl ? (
        <img
          src={mediaUrl}
          alt={actualAlt}
          className={`w-full h-full ${getObjectFitClass()}`}
        />
      ) : null}

      {/* 4. PLACEHOLDER NEUTRO DE ALTA QUALIDADE QUANDO SEM MÍDIA CONFIGURADA */}
      {(!mediaUrl && (!frames || frames.length === 0)) ? (
        slot === "hero" ? (
          <div className="w-full h-full rounded-full bg-gradient-to-b from-white to-[#F5EFEB] flex flex-col items-center justify-center p-6 text-center space-y-2">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] text-3xl sm:text-4xl font-serif">
              Ψ
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500">
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
