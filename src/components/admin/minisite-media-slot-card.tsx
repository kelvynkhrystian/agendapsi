"use client";

import React, { useState } from "react";
import { Upload, Trash2, Loader2 } from "lucide-react";
import { MiniSiteMediaPlayer } from "@/components/minisite/media-player";
import { Button } from "@/components/ui/button";

export interface MiniSiteMediaSlotCardProps {
  title: string;
  slot: "hero" | "hero_mobile" | "about";
  mediaType: string;
  mediaUrl: string | null;
  posterUrl: string | null;
  frames: string[];
  fps: number;
  playbackSpeed: number;
  loop?: boolean;
  autoplay?: boolean;
  playbackMode?: string;
  playbackDirection?: string;
  positioning?: string;
  isUploading?: boolean;
  onUploadFile: (file: File) => void;
  onChangePlaybackSpeed: (speed: 0.5 | 1 | 2) => void;
  onRemoveMedia: () => void;
}

const SPEED_OPTIONS: ReadonlyArray<{ value: 0.5 | 1 | 2; label: string }> = [
  { value: 0.5, label: "0.5x" },
  { value: 1, label: "1x (Padrão)" },
  { value: 2, label: "2x" },
];

export function MiniSiteMediaSlotCard({
  title,
  slot,
  mediaType,
  mediaUrl,
  posterUrl,
  frames,
  fps,
  playbackSpeed,
  loop = true,
  autoplay = true,
  playbackMode = "AUTOMATIC",
  playbackDirection = "FORWARD",
  positioning = "center",
  isUploading = false,
  onUploadFile,
  onChangePlaybackSpeed,
  onRemoveMedia,
}: MiniSiteMediaSlotCardProps) {
  const [isDragging, setIsDragging] = useState(false);

  const hasMedia =
    mediaType === "FRAME_ANIMATION" ? frames && frames.length > 0 : Boolean(mediaUrl);

  const supportsPlaybackSpeed =
    hasMedia && (mediaType === "VIDEO" || mediaType === "FRAME_ANIMATION");

  const handleFileInput = (file: File | undefined | null) => {
    if (!file || isUploading) return;
    onUploadFile(file);
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#141414] flex flex-col gap-4 transition-colors">
      {/* Cabeçalho da área */}
      <div className="flex items-center justify-between gap-2 min-h-[32px]">
        <h4 className="font-semibold text-sm text-slate-900 dark:text-[#F5F5F5] tracking-tight">
          {title}
        </h4>

        {hasMedia && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemoveMedia}
            disabled={isUploading}
            aria-label={`Remover mídia de ${title}`}
            className="h-8 px-2.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 hover:text-rose-700 dark:hover:text-rose-300 gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Remover</span>
          </Button>
        )}
      </div>

      {/* Prévia ao vivo */}
      <div className="relative h-52 w-full rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 flex items-center justify-center bg-slate-100 dark:bg-[#1A1A1A]">
        <MiniSiteMediaPlayer
          slot={slot}
          mediaType={mediaType}
          mediaUrl={mediaUrl}
          posterUrl={posterUrl}
          frames={frames}
          fps={fps}
          playbackSpeed={playbackSpeed}
          previewMode={true}
          loop={loop}
          autoplay={autoplay}
          playbackMode={playbackMode}
          playbackDirection={playbackDirection}
          positioning={positioning}
          alt={`Prévia ${title}`}
          className="w-full h-full"
        />
      </div>

      {/* Controle único de upload / substituição */}
      <div className="space-y-2">
        <label
          onDragOver={(e) => {
            e.preventDefault();
            if (!isUploading) setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const droppedFile = e.dataTransfer.files?.[0];
            handleFileInput(droppedFile);
          }}
          className={`flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-xl border border-dashed text-center cursor-pointer transition-all ${
            isDragging
              ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
              : "border-slate-300 dark:border-white/15 bg-slate-50/70 dark:bg-white/[0.02] hover:border-[var(--primary)]/60 hover:bg-[var(--primary)]/[0.04]"
          } ${isUploading ? "opacity-60 pointer-events-none" : ""}`}
        >
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,.zip,application/zip,application/x-zip-compressed"
            className="sr-only"
            disabled={isUploading}
            aria-label={`Enviar arquivo para ${title}`}
            onChange={(e) => {
              const selected = e.target.files?.[0];
              handleFileInput(selected);
              e.currentTarget.value = "";
            }}
          />

          {isUploading ? (
            <Loader2 className="h-4 w-4 text-[var(--primary)] animate-spin shrink-0" />
          ) : (
            <Upload className="h-4 w-4 text-[var(--primary)] shrink-0" />
          )}

          <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
            {isUploading
              ? "Enviando e processando..."
              : hasMedia
              ? "Substituir arquivo"
              : "Enviar arquivo"}
          </span>
        </label>

        <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
          Envie uma imagem, vídeo ou animação ZIP (JPG, PNG, WebP, MP4, WebM ou ZIP).
        </p>
      </div>

      {/* Seletor de Velocidade (somente para Vídeo e Animação ZIP) */}
      {supportsPlaybackSpeed && (
        <div className="pt-3 border-t border-slate-100 dark:border-white/10 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
            Velocidade
          </span>

          <div
            role="radiogroup"
            aria-label={`Velocidade de reprodução de ${title}`}
            className="inline-flex items-center p-1 rounded-lg bg-slate-100 dark:bg-[#1E1E1E] border border-slate-200 dark:border-white/10 gap-1"
          >
            {SPEED_OPTIONS.map((option) => {
              const isSelected = playbackSpeed === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => onChangePlaybackSpeed(option.value)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[var(--primary)] text-white shadow-2xs"
                      : "text-slate-600 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-white/5"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
