"use client";

import React, { useState, useId, useRef, useLayoutEffect } from "react";
import { formatBRL } from "@/lib/utils";

export function MiniSparkline({
  values,
  color = "var(--primary, #EA580C)",
  height = 38,
  className = "",
}: {
  values: number[];
  color?: string;
  height?: number;
  className?: string;
}) {
  const gradId = useId().replace(/:/g, "");
  const safeValues = values.length >= 2 ? values : [0, ...(values.length === 1 ? values : [0])];
  const minVal = Math.min(...safeValues);
  const maxVal = Math.max(...safeValues);
  const range = maxVal - minVal;

  const width = 140;
  const padY = 5;
  const usableH = height - padY * 2;

  const points = safeValues.map((val, idx) => {
    const x = (idx / Math.max(1, safeValues.length - 1)) * width;
    const norm = range > 0 ? (val - minVal) / range : 0.2;
    const y = padY + (1 - norm) * usableH;
    return { x, y };
  });

  const lineD = points.reduce((acc, pt, idx) => {
    if (idx === 0) return `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
    const prev = points[idx - 1];
    const cpX = ((prev.x + pt.x) / 2).toFixed(1);
    return `${acc} C ${cpX} ${prev.y.toFixed(1)}, ${cpX} ${pt.y.toFixed(1)}, ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
  }, "");

  const areaD = `${lineD} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={`w-full overflow-visible ${className}`}
      style={{ height }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradId})`} />
      <path
        d={lineD}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.length > 0 && (
        <circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r="2.8"
          fill={color}
        />
      )}
    </svg>
  );
}

export interface LollipopDatum {
  key: string;
  label: string;
  valueCents: number;
  secondaryValueCents?: number;
  count?: number;
  countLabel?: string;
}

const DEFAULT_Y_AXIS_MAX_CENTS = 50000; // R$ 500,00
const FIXED_Y_TICKS_CENTS = [0, 10000, 25000]; // R$ 0, R$ 100, R$ 250

export function LollipopPerformanceChart({
  data,
  height = 240,
  targetLabel = "Média",
  emptyMessage = "Sem movimentações neste período",
  secondarySeriesLabel,
}: {
  data: LollipopDatum[];
  height?: number;
  targetLabel?: string;
  emptyMessage?: string;
  secondarySeriesLabel?: string;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const stemGradId = useId().replace(/:/g, "");
  const secStemGradId = useId().replace(/:/g, "");

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateWidth = () => {
      const nextWidth = Math.round(el.clientWidth);
      if (nextWidth > 0) {
        setContainerWidth((prev) => (prev === nextWidth ? prev : nextWidth));
      }
    };

    updateWidth();

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(updateWidth);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const safeData =
    data.length > 0
      ? data
      : [{ key: "empty", label: "—", valueCents: 0, secondaryValueCents: 0, count: 0 }];

  const maxPrimary = Math.max(...safeData.map((d) => d.valueCents), 0);
  const maxSecondary = secondarySeriesLabel
    ? Math.max(...safeData.map((d) => d.secondaryValueCents || 0), 0)
    : 0;
  const displayedMaxCents = Math.max(maxPrimary, maxSecondary);
  const axisMaxCents =
    displayedMaxCents > DEFAULT_Y_AXIS_MAX_CENTS
      ? displayedMaxCents
      : DEFAULT_Y_AXIS_MAX_CENTS;
  const yTicksCents = [...FIXED_Y_TICKS_CENTS, axisMaxCents];

  const nonZeroVals = safeData.filter((d) => d.valueCents > 0).map((d) => d.valueCents);
  const meanCents =
    nonZeroVals.length > 0
      ? Math.round(nonZeroVals.reduce((a, b) => a + b, 0) / nonZeroVals.length)
      : 0;

  const formatAxisBRL = (cents: number) => {
    const hasCents = cents % 100 !== 0;
    const brl = cents / 100;
    return `R$ ${brl.toLocaleString("pt-BR", {
      minimumFractionDigits: hasCents ? 2 : 0,
      maximumFractionDigits: hasCents ? 2 : 0,
    })}`;
  };

  const renderedHeight =
    containerWidth > 0 && containerWidth < 640 ? Math.min(height, 212) : height;
  const vw =
    containerWidth > 0
      ? Math.max(420, Math.round(containerWidth * (height / renderedHeight)))
      : 740;
  const topLabelLen = formatAxisBRL(axisMaxCents).length;
  const padLeft = Math.max(66, Math.ceil(18 + topLabelLen * 6.5));
  const padRight = 18;
  const padTop = 20;
  const padBottom = 26;
  const plotW = vw - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const valueToY = (cents: number) => {
    const ratio =
      axisMaxCents > 0 ? Math.max(0, Math.min(1, cents / axisMaxCents)) : 0;
    return padTop + (1 - ratio) * plotH;
  };

  const yBottom = valueToY(0);
  const yTop = valueToY(axisMaxCents);
  const shownLabelYs: number[] = [yBottom, yTop];
  const tickDescriptors = yTicksCents.map((tickVal, idx) => {
    const y = valueToY(tickVal);
    const isBoundary = idx === 0 || idx === yTicksCents.length - 1;
    let showLabel = isBoundary;
    if (!isBoundary) {
      showLabel = shownLabelYs.every((usedY) => Math.abs(usedY - y) >= 11);
      if (showLabel) {
        shownLabelYs.push(y);
      }
    }
    return { tickVal, y, isZero: tickVal === 0, showLabel };
  });

  const stepLabelInterval = safeData.length > 18 ? 4 : safeData.length > 12 ? 2 : 1;
  const activeItem = hoveredIdx !== null && safeData[hoveredIdx] ? safeData[hoveredIdx] : null;
  const hasAnyValue = safeData.some((d) => d.valueCents > 0 || (d.secondaryValueCents || 0) > 0);

  return (
    <div ref={containerRef} className="relative w-full select-none" data-testid="lollipop-chart">
      <svg
        viewBox={`0 0 ${vw} ${height}`}
        className="w-full overflow-visible"
        style={{ height: renderedHeight }}
        role="img"
        aria-label="Gráfico de evolução financeira e sessões"
      >
        <defs>
          <linearGradient
            id={stemGradId}
            x1="0"
            y1={padTop}
            x2="0"
            y2={padTop + plotH}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="var(--dark-accent-vivid, var(--primary, #EA580C))" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--dark-accent-vivid, var(--primary, #EA580C))" stopOpacity="0.24" />
          </linearGradient>
          <linearGradient
            id={secStemGradId}
            x1="0"
            y1={padTop}
            x2="0"
            y2={padTop + plotH}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#A6A6A6" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#A6A6A6" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* Grid horizontais proporcionais: R$ 0, R$ 100, R$ 250 e R$ 500 (ou máximo dinâmico) */}
        {tickDescriptors.map(({ tickVal, y, isZero, showLabel }, i) => (
          <g key={`${tickVal}-${i}`}>
            <line
              x1={padLeft}
              y1={y}
              x2={vw - padRight}
              y2={y}
              className="stroke-[#E5E5E5] dark:stroke-[#2A2A2A]"
              strokeWidth="1"
              strokeDasharray={isZero ? undefined : "3 4"}
            />
            {showLabel && (
              <text
                x={padLeft - 8}
                y={y + 3.5}
                textAnchor="end"
                className="fill-[#737373] dark:fill-[#8C8C8C] text-[10px] font-mono tabular-nums"
              >
                {formatAxisBRL(tickVal)}
              </text>
            )}
          </g>
        ))}

        {/* Linha de média / meta */}
        {meanCents > 0 && (
          <g>
            <line
              x1={padLeft}
              y1={valueToY(meanCents)}
              x2={vw - padRight}
              y2={valueToY(meanCents)}
              stroke="var(--primary, #EA580C)"
              strokeOpacity="0.55"
              strokeWidth="1.2"
              strokeDasharray="5 4"
            />
            <rect
              x={Math.max(4, padLeft - 56)}
              y={valueToY(meanCents) - 9}
              width={48}
              height={18}
              rx={6}
              fill="var(--button-bg, #CA4C0A)"
            />
            <text
              x={Math.max(4, padLeft - 56) + 24}
              y={valueToY(meanCents) + 3.5}
              textAnchor="middle"
              className="fill-white text-[9px] font-bold"
            >
              {targetLabel}
            </text>
          </g>
        )}

        {/* Colunas Lollipop (Haste vertical + círculo luminoso no topo) */}
        {safeData.map((d, idx) => {
          const colW = plotW / safeData.length;
          const cx = padLeft + colW * idx + colW / 2;
          const baseY = padTop + plotH;
          const y = valueToY(d.valueCents);
          const secVal = d.secondaryValueCents || 0;
          const secY = valueToY(secVal);
          const isAboveMean = meanCents > 0 && d.valueCents >= meanCents;
          const isHovered = hoveredIdx === idx;
          const showLabel = idx % stepLabelInterval === 0 || idx === safeData.length - 1;

          return (
            <g
              key={d.key}
              className="cursor-pointer outline-none"
              tabIndex={0}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx((prev) => (prev === idx ? null : prev))}
              onFocus={() => setHoveredIdx(idx)}
              onBlur={() => setHoveredIdx((prev) => (prev === idx ? null : prev))}
            >
              {/* Alvo amplo invisível para interação confortável */}
              <rect
                x={cx - colW / 2}
                y={padTop - 6}
                width={Math.max(16, colW)}
                height={plotH + 14}
                fill="transparent"
              />

              {/* Guia vertical no hover */}
              {isHovered && (
                <rect
                  x={cx - Math.min(18, colW * 0.42)}
                  y={padTop}
                  width={Math.min(36, colW * 0.84)}
                  height={plotH}
                  rx={8}
                  className="fill-[var(--primary)]/[0.06] dark:fill-white/[0.04]"
                />
              )}

              {/* Série secundária opcional (Simulado) */}
              {secondarySeriesLabel && secVal > 0 && (
                <g>
                  <rect
                    x={cx + 4 - (isHovered ? 1.5 : 1)}
                    y={secY}
                    width={isHovered ? 3 : 2}
                    height={Math.max(2, baseY - secY)}
                    rx={1.5}
                    fill={`url(#${secStemGradId})`}
                  />
                  <circle
                    cx={cx + 4}
                    cy={secY}
                    r={isHovered ? 4 : 3}
                    className="fill-[#A6A6A6]"
                  />
                </g>
              )}

              {/* Haste principal */}
              {d.valueCents > 0 ? (
                <>
                  <rect
                    x={
                      (secondarySeriesLabel && secVal > 0 ? cx - 3 : cx) -
                      (safeData.length > 20 ? (isHovered ? 1.75 : 1.15) : isHovered ? 2.25 : 1.6)
                    }
                    y={y}
                    width={safeData.length > 20 ? (isHovered ? 3.5 : 2.3) : isHovered ? 4.5 : 3.2}
                    height={Math.max(2, baseY - y)}
                    rx={2.25}
                    fill={`url(#${stemGradId})`}
                    fillOpacity={isAboveMean || isHovered ? 1 : 0.78}
                  />
                  {/* Halo sutil nos pontos em destaque */}
                  {(isAboveMean || isHovered) && (
                    <circle
                      cx={secondarySeriesLabel && secVal > 0 ? cx - 3 : cx}
                      cy={y}
                      r={isHovered ? 8.5 : 7}
                      fill="var(--primary, #EA580C)"
                      fillOpacity={isHovered ? 0.28 : 0.16}
                    />
                  )}
                  <circle
                    cx={secondarySeriesLabel && secVal > 0 ? cx - 3 : cx}
                    cy={y}
                    r={safeData.length > 20 ? (isHovered ? 4.5 : 3.4) : isHovered ? 5.5 : 4.2}
                    fill={isAboveMean || isHovered ? "var(--dark-accent-vivid, var(--primary, #EA580C))" : "#FFFFFF"}
                    stroke="var(--dark-accent-vivid, var(--primary, #EA580C))"
                    strokeWidth="2"
                  />
                </>
              ) : (
                <circle
                  cx={cx}
                  cy={baseY}
                  r={isHovered ? 3.4 : 2.2}
                  className={
                    isHovered
                      ? "fill-[var(--primary)]"
                      : "fill-[#D0D0D0] dark:fill-[#393939]"
                  }
                />
              )}

              {/* Rótulo X */}
              {showLabel && (
                <text
                  x={cx}
                  y={height - 6}
                  textAnchor="middle"
                  className={`text-[10px] font-medium transition-colors ${
                    isHovered
                      ? "fill-[#171717] dark:fill-[#F5F5F5] font-bold"
                      : "fill-[#737373] dark:fill-[#8C8C8C]"
                  }`}
                >
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {!hasAnyValue && (
        <div className="mt-1 text-center text-[11px] text-[#737373] dark:text-[#8C8C8C]">
          {emptyMessage}
        </div>
      )}

      {/* Barra / Tooltip contextual ao passar o mouse ou focar ponto */}
      {activeItem && hoveredIdx !== null && (
        <div
          className="pointer-events-none absolute top-1 z-20 max-w-[calc(100%-0.5rem)] rounded-xl border border-[#E5E5E5] dark:border-[#333333] bg-white/95 dark:bg-[#141414]/95 px-2.5 sm:px-3 py-1.5 sm:py-2 shadow-lg backdrop-blur-xs text-xs transition-all"
          style={{
            left: `${Math.min(
              containerWidth > 0 && containerWidth < 460 ? 52 : 72,
              Math.max(4, (hoveredIdx / Math.max(1, safeData.length - 1)) * 78 + 8)
            )}%`,
          }}
        >
          <p className="font-heading font-bold text-[#171717] dark:text-[#F5F5F5]">{activeItem.label}</p>
          <p className="text-[var(--button-outline-fg,var(--primary))] dark:text-[var(--dark-accent-vivid,var(--primary))] font-mono font-bold tabular-nums">
            {formatBRL(activeItem.valueCents)}
          </p>
          {secondarySeriesLabel && (activeItem.secondaryValueCents || 0) > 0 && (
            <p className="text-[11px] text-[#737373] dark:text-[#A6A6A6] font-mono tabular-nums">
              {secondarySeriesLabel}: {formatBRL(activeItem.secondaryValueCents || 0)}
            </p>
          )}
          {typeof activeItem.count === "number" && (
            <p className="text-[11px] text-[#737373] dark:text-[#A6A6A6]">
              {activeItem.count} {activeItem.countLabel || (activeItem.count === 1 ? "registro" : "registros")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function RadialArcProgress({
  percentage,
  size = 128,
  strokeWidth = 11,
  label = "Taxa",
  subLabel,
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  subLabel?: string;
}) {
  const gradId = useId().replace(/:/g, "");
  const clamped = Math.max(0, Math.min(100, Math.round(percentage)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--button-bg, #CA4C0A)" />
            <stop offset="100%" stopColor="var(--primary, #EA580C)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-[#EFEFEF] dark:stroke-[#292929]"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
        <span className="font-heading text-2xl font-bold tracking-tight tabular-nums text-[#171717] dark:text-[#F5F5F5]">
          {clamped}%
        </span>
        <span className="text-[10px] font-medium text-[#737373] dark:text-[#A6A6A6] leading-tight">
          {subLabel || label}
        </span>
      </div>
    </div>
  );
}

export interface DonutSlice {
  id: string;
  label: string;
  valueCents: number;
  count: number;
  color: string;
}

export function FinancialDonutChart({
  slices,
  centerLabel = "Total",
  size = 160,
}: {
  slices: DonutSlice[];
  centerLabel?: string;
  size?: number;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const strokeWidth = 22;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const totalCents = slices.reduce((sum, s) => sum + Math.max(0, s.valueCents), 0);
  const activeSlice = slices.find((s) => s.id === activeId);

  let cumulativeFraction = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            className="stroke-[#F2F2F2] dark:stroke-[#262626]"
          />
          {totalCents > 0 &&
            slices
              .filter((s) => s.valueCents > 0)
              .map((slice) => {
                const fraction = slice.valueCents / totalCents;
                const dashLen = Math.max(2, fraction * circumference);
                const dashOffset = -cumulativeFraction * circumference;
                cumulativeFraction += fraction;
                const isActive = activeId === slice.id;

                return (
                  <circle
                    key={slice.id}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={slice.color}
                    strokeWidth={isActive ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={`${dashLen} ${circumference}`}
                    strokeDashoffset={dashOffset}
                    className="cursor-pointer transition-all duration-200"
                    onMouseEnter={() => setActiveId(slice.id)}
                    onMouseLeave={() => setActiveId(null)}
                  />
                );
              })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-[#737373] dark:text-[#A6A6A6] truncate max-w-full">
            {activeSlice ? activeSlice.label : centerLabel}
          </span>
          <span className="font-heading text-sm font-bold tabular-nums text-[#171717] dark:text-[#F5F5F5] mt-0.5">
            {formatBRL(activeSlice ? activeSlice.valueCents : totalCents)}
          </span>
        </div>
      </div>

      {/* Legenda com barras proporcionais */}
      <div className="flex-1 w-full space-y-3 min-w-0">
        {slices.map((slice) => {
          const pct = totalCents > 0 ? Math.round((slice.valueCents / totalCents) * 100) : 0;
          const isActive = activeId === slice.id;

          return (
            <div
              key={slice.id}
              onMouseEnter={() => setActiveId(slice.id)}
              onMouseLeave={() => setActiveId(null)}
              className={`space-y-1 p-2 -mx-2 rounded-xl transition-colors cursor-default ${
                isActive ? "bg-[#F8F8F8] dark:bg-[#242424]" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className="font-medium text-[#171717] dark:text-[#F5F5F5] truncate">
                    {slice.label}
                  </span>
                  <span className="text-[11px] text-[#737373] dark:text-[#8C8C8C]">
                    ({slice.count})
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 font-mono tabular-nums">
                  <span className="font-semibold text-[#171717] dark:text-[#F5F5F5]">
                    {formatBRL(slice.valueCents)}
                  </span>
                  <span className="text-[11px] text-[#737373] dark:text-[#A6A6A6] w-8 text-right">
                    {pct}%
                  </span>
                </div>
              </div>
              <div className="h-1.5 w-full rounded-full bg-[#EFEFEF] dark:bg-[#262626] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: slice.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
