"use client";

import React, { useMemo, useState, useId } from "react";
import { cn, formatBRL } from "@/lib/utils";

export interface RevenueSeriesPoint {
  key: string;
  label: string;
  realCents: number;
  simulatedCents: number;
  pendingCents: number;
  totalCents: number;
  appointmentsCount?: number;
}

export interface PaymentMethodMetric {
  method: string;
  label: string;
  totalCents: number;
  realApprovedCents: number;
  simulatedApprovedCents: number;
  pendingCents: number;
  count: number;
}

export interface PaymentStatusMetric {
  status: string;
  label: string;
  totalCents: number;
  count: number;
}

export type SeriesFilterMode = "ALL" | "REAL" | "SIMULATED" | "PENDING";

export function MiniSparkline({
  values,
  variant = "primary",
  className,
}: {
  values: number[];
  variant?: "primary" | "on-accent" | "emerald" | "amber";
  className?: string;
}) {
  const safeValues = useMemo(() => {
    const clean = values.filter((v) => Number.isFinite(v));
    if (clean.length === 0) return [0, 0, 0, 0, 0, 0];
    if (clean.length === 1) return [clean[0], clean[0], clean[0]];
    return clean;
  }, [values]);

  const width = 96;
  const height = 28;
  const padX = 3;
  const padY = 4;

  const minVal = Math.min(...safeValues);
  const maxVal = Math.max(...safeValues);
  const span = maxVal - minVal;

  const coords = safeValues.map((val, idx) => {
    const x =
      safeValues.length === 1
        ? width / 2
        : padX + (idx / (safeValues.length - 1)) * (width - padX * 2);
    const norm = span === 0 ? 0.25 : (val - minVal) / span;
    const y = height - padY - norm * (height - padY * 2);
    return { x, y };
  });

  const linePath = coords
    .map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
    .join(" ");

  const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${height} L ${coords[0].x.toFixed(1)} ${height} Z`;

  const strokeColor =
    variant === "on-accent"
      ? "#FFFFFF"
      : variant === "emerald"
      ? "#10B981"
      : variant === "amber"
      ? "#F59E0B"
      : "var(--primary, #EA580C)";

  const gradId = useId().replace(/:/g, "");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("h-7 w-24 shrink-0 overflow-visible", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity={variant === "on-accent" ? 0.35 : 0.25} />
          <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path
        d={linePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={variant === "on-accent" ? 0.92 : 0.9}
      />
      <circle
        cx={coords[coords.length - 1].x}
        cy={coords[coords.length - 1].y}
        r="2.5"
        fill={strokeColor}
      />
    </svg>
  );
}

export function WalletAreaSparkline({
  values,
  className,
}: {
  values: number[];
  className?: string;
}) {
  const safeValues = useMemo(() => {
    const clean = values.filter((v) => Number.isFinite(v));
    if (clean.length === 0) return [0, 0, 0, 0, 0, 0, 0];
    if (clean.length === 1) return [clean[0], clean[0], clean[0]];
    return clean;
  }, [values]);

  const width = 260;
  const height = 56;
  const padX = 4;
  const padY = 6;

  const minVal = Math.min(...safeValues);
  const maxVal = Math.max(...safeValues);
  const span = maxVal - minVal;

  const coords = safeValues.map((val, idx) => {
    const x = padX + (idx / (safeValues.length - 1)) * (width - padX * 2);
    const norm = span === 0 ? 0.15 : (val - minVal) / span;
    const y = height - padY - norm * (height - padY * 2);
    return { x, y };
  });

  const linePath = coords
    .map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${height} L ${coords[0].x.toFixed(1)} ${height} Z`;
  const gradId = useId().replace(/:/g, "");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("w-full h-14 overflow-visible", className)}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.28} />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path
        d={linePath}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function RadialGoalGauge({
  percent,
  sublabel = "da meta",
  size = 112,
}: {
  percent: number;
  sublabel?: string;
  size?: number;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-[#EAEAEA] dark:text-[#2A2A2A]"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-heading text-xl font-bold tracking-tight tabular-nums text-[#171717] dark:text-[#F5F5F5]">
          {percent}%
        </span>
        <span className="text-[10px] font-medium text-[#737373] dark:text-[#A6A6A6]">
          {sublabel}
        </span>
      </div>
    </div>
  );
}

export function StemPerformanceChart({
  title,
  subtitle,
  series,
  showAppointmentsCount = true,
  className,
}: {
  title: string;
  subtitle: string;
  series: {
    d14: RevenueSeriesPoint[];
    d30: RevenueSeriesPoint[];
    m6: RevenueSeriesPoint[];
  };
  showAppointmentsCount?: boolean;
  className?: string;
}) {
  const [range, setRange] = useState<"d14" | "d30" | "m6">("d14");
  const [filterMode, setFilterMode] = useState<SeriesFilterMode>("ALL");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const stemGradId = useId().replace(/:/g, "");

  const activePoints = useMemo(() => series[range] || [], [series, range]);

  const getValueForMode = (pt: RevenueSeriesPoint, mode: SeriesFilterMode) => {
    if (mode === "REAL") return pt.realCents;
    if (mode === "SIMULATED") return pt.simulatedCents;
    if (mode === "PENDING") return pt.pendingCents;
    return pt.realCents + pt.simulatedCents + pt.pendingCents;
  };

  const stats = useMemo(() => {
    const vals = activePoints.map((pt) => getValueForMode(pt, filterMode));
    const totalCents = vals.reduce((acc, v) => acc + v, 0);
    const activeNonZero = vals.filter((v) => v > 0);
    const avgCents =
      activeNonZero.length > 0
        ? Math.round(totalCents / activeNonZero.length)
        : 0;
    let bestVal = 0;
    let bestLabel = "—";
    activePoints.forEach((pt) => {
      const v = getValueForMode(pt, filterMode);
      if (v > bestVal) {
        bestVal = v;
        bestLabel = pt.label;
      }
    });
    const maxChartVal = Math.max(...vals, 10000); // piso visual R$ 100,00 para grade equilibrada
    return {
      totalCents,
      avgCents,
      bestVal,
      bestLabel,
      maxChartVal,
      hasData: vals.some((v) => v > 0),
    };
  }, [activePoints, filterMode]);

  const svgWidth = 760;
  const svgHeight = 236;
  const padLeft = 58;
  const padRight = 18;
  const padTop = 22;
  const padBottom = 32;
  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;

  const yTicks = useMemo(() => {
    const steps = 4;
    return Array.from({ length: steps + 1 }, (_, i) => {
      const ratio = i / steps;
      const cents = Math.round(stats.maxChartVal * (1 - ratio));
      const y = padTop + ratio * plotHeight;
      return { cents, y };
    });
  }, [stats.maxChartVal, padTop, plotHeight]);

  const avgY =
    stats.avgCents > 0
      ? padTop + plotHeight - Math.min(1, stats.avgCents / stats.maxChartVal) * plotHeight
      : null;

  const hoveredPoint =
    hoveredIndex !== null && hoveredIndex >= 0 && hoveredIndex < activePoints.length
      ? activePoints[hoveredIndex]
      : null;

  const activeColor =
    filterMode === "SIMULATED"
      ? "#F59E0B"
      : filterMode === "PENDING"
      ? "#A6A6A6"
      : filterMode === "REAL"
      ? "#10B981"
      : "var(--dark-accent-vivid, var(--primary, #EA580C))";

  const compactBRL = (cents: number) => {
    if (cents === 0) return "R$ 0";
    if (cents >= 100000) return `R$ ${(cents / 100000).toFixed(1).replace(".0", "")}k`;
    return `R$ ${Math.round(cents / 100)}`;
  };

  return (
    <div
      data-testid="finance-stem-chart"
      className={cn(
        "rounded-2xl border border-[#E5E5E5] dark:border-[#2C2C2C] bg-white dark:bg-[#1A1A1A] shadow-xs dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] p-5 sm:p-6",
        className
      )}
    >
      {/* Header row: Title + Timeframe switcher */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h3 className="font-heading text-base sm:text-lg font-semibold text-[#171717] dark:text-[#F5F5F5] tracking-tight">
            {title}
          </h3>
          <p className="text-xs text-[#737373] dark:text-[#8C8C8C] mt-0.5">{subtitle}</p>
        </div>

        <div
          className="inline-flex items-center p-1 rounded-xl bg-[#F4F4F5] dark:bg-[#141414] border border-[#E5E5E5] dark:border-[#2C2C2C] gap-1 self-start"
          role="group"
          aria-label="Período do gráfico"
        >
          {(
            [
              { key: "d14", label: "14 dias" },
              { key: "d30", label: "30 dias" },
              { key: "m6", label: "6 meses" },
            ] as const
          ).map((item) => {
            const active = range === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setRange(item.key);
                  setHoveredIndex(null);
                }}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-heading font-semibold transition-all cursor-pointer",
                  active
                    ? "bg-[var(--button-bg,var(--primary))] text-[var(--button-fg,#ffffff)] shadow-2xs"
                    : "bg-white text-[var(--button-outline-fg,var(--button-bg,var(--primary)))] hover:bg-[var(--primary)]/[0.04] dark:bg-transparent dark:text-[#A6A6A6] dark:hover:text-[#F5F5F5] dark:hover:bg-[#242424]"
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* KPI Metrics Row */}
      <div className="mt-5 flex flex-wrap items-baseline gap-x-7 gap-y-3">
        <div>
          <span className="text-[11px] font-medium text-[#737373] dark:text-[#8C8C8C] block">
            Total no período
          </span>
          <span className="font-heading text-2xl sm:text-[26px] font-bold tracking-tight tabular-nums text-[#171717] dark:text-[#F5F5F5]">
            {formatBRL(stats.totalCents)}
          </span>
        </div>

        <div className="border-l border-[#E5E5E5] dark:border-[#2C2C2C] pl-5">
          <span className="text-[11px] font-medium text-[#737373] dark:text-[#8C8C8C] block">
            {range === "m6" ? "Média por mês ativo" : "Média por dia ativo"}
          </span>
          <span className="font-heading text-sm sm:text-base font-bold tabular-nums text-[#171717] dark:text-[#F5F5F5]">
            {formatBRL(stats.avgCents)}
          </span>
        </div>

        <div className="border-l border-[#E5E5E5] dark:border-[#2C2C2C] pl-5">
          <span className="text-[11px] font-medium text-[#737373] dark:text-[#8C8C8C] block">
            {range === "m6" ? "Melhor mês" : "Melhor dia"}
          </span>
          <span className="font-heading text-sm sm:text-base font-bold tabular-nums text-[#171717] dark:text-[#F5F5F5]">
            {stats.bestVal > 0 ? `${formatBRL(stats.bestVal)} (${stats.bestLabel})` : "—"}
          </span>
        </div>
      </div>

      {/* Series filter pills — Branco com letra laranja quando inativo; Preenchido laranja com letra branca quando ativo */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar série">
          {(
            [
              { key: "ALL", label: "Todos", dot: "bg-[var(--primary)]" },
              { key: "REAL", label: "Confirmado Real", dot: "bg-emerald-500" },
              { key: "SIMULATED", label: "Simulado", dot: "bg-amber-500" },
              { key: "PENDING", label: "Pendente", dot: "bg-[#A6A6A6]" },
            ] as const
          ).map((pill) => {
            const active = filterMode === pill.key;
            return (
              <button
                key={pill.key}
                type="button"
                onClick={() => setFilterMode(pill.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer",
                  active
                    ? "bg-[var(--button-bg,var(--primary))] text-[var(--button-fg,#ffffff)] border-transparent font-semibold shadow-2xs"
                    : "bg-white text-[var(--button-outline-fg,var(--button-bg,var(--primary)))] border-[var(--primary)]/25 hover:border-[var(--primary)]/50 hover:bg-[var(--primary)]/[0.04] dark:bg-[#141414] dark:text-[#CCCCCC] dark:border-[#2C2C2C] dark:hover:bg-[#242424] dark:hover:text-[#F5F5F5]"
                )}
              >
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    active ? "bg-white" : pill.dot
                  )}
                />
                <span>{pill.label}</span>
              </button>
            );
          })}
        </div>

        {hoveredPoint && (
          <div className="text-xs font-medium text-[#525252] dark:text-[#D0D0D0] tabular-nums flex items-center gap-2 bg-white dark:bg-[#141414] border border-[#E5E5E5] dark:border-[#2C2C2C] rounded-xl px-3 py-1 shadow-2xs">
            <span className="font-heading font-bold text-[#171717] dark:text-[#F5F5F5]">
              {hoveredPoint.label}:
            </span>
            <span className="font-mono font-bold text-[var(--button-outline-fg,var(--primary))] dark:text-[var(--dark-accent-vivid,var(--primary))]">
              {formatBRL(getValueForMode(hoveredPoint, filterMode))}
            </span>
            {showAppointmentsCount && typeof hoveredPoint.appointmentsCount === "number" && (
              <span className="text-[#737373] dark:text-[#A6A6A6]">
                • {hoveredPoint.appointmentsCount} cons.
              </span>
            )}
          </div>
        )}
      </div>

      {/* Stem & Dot SVG Canvas */}
      <div className="relative mt-5">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-56 sm:h-60 overflow-visible select-none"
          role="img"
          aria-label={`Gráfico de desempenho financeiro por ${range === "m6" ? "mês" : "dia"}`}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <defs>
            <linearGradient
              id={stemGradId}
              x1="0"
              y1={padTop}
              x2="0"
              y2={padTop + plotHeight}
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor={activeColor} stopOpacity="1" />
              <stop offset="100%" stopColor={activeColor} stopOpacity="0.24" />
            </linearGradient>
          </defs>

          {/* Horizontal gridlines + Y labels */}
          {yTicks.map((tick, idx) => (
            <g key={idx}>
              <line
                x1={padLeft}
                x2={svgWidth - padRight}
                y1={tick.y}
                y2={tick.y}
                stroke="currentColor"
                strokeWidth="1"
                strokeDasharray={idx === yTicks.length - 1 ? undefined : "3 4"}
                className="text-[#E5E5E5] dark:text-[#2A2A2A]"
              />
              <text
                x={padLeft - 8}
                y={tick.y + 3.5}
                textAnchor="end"
                className="fill-[#737373] dark:fill-[#8C8C8C] text-[10px] font-mono tabular-nums"
              >
                {compactBRL(tick.cents)}
              </text>
            </g>
          ))}

          {/* Average dashed line */}
          {avgY !== null && stats.hasData && (
            <g>
              <line
                x1={padLeft}
                x2={svgWidth - padRight}
                y1={avgY}
                y2={avgY}
                stroke={activeColor}
                strokeOpacity={0.55}
                strokeWidth="1.25"
                strokeDasharray="5 4"
              />
              <rect
                x={4}
                y={avgY - 9}
                width={46}
                height={18}
                rx={6}
                fill="var(--button-bg, #CA4C0A)"
              />
              <text
                x={27}
                y={avgY + 3.5}
                textAnchor="middle"
                className="fill-white text-[9px] font-bold"
              >
                Média
              </text>
            </g>
          )}

          {/* Stems + Dots */}
          {activePoints.map((pt, idx) => {
            const count = activePoints.length || 1;
            const slotW = plotWidth / count;
            const cx = padLeft + slotW * idx + slotW / 2;
            const val = getValueForMode(pt, filterMode);
            const norm = Math.min(1, Math.max(0, val / stats.maxChartVal));
            const topY = padTop + plotHeight - norm * plotHeight;
            const baseY = padTop + plotHeight;
            const isAboveMean = stats.avgCents > 0 && val >= stats.avgCents;
            const isHovered = hoveredIndex === idx;
            const dotRadius = count > 20 ? 3.5 : 4.5;

            const showXLabel =
              count <= 14 ||
              idx === 0 ||
              idx === count - 1 ||
              idx % 5 === 0;

            return (
              <g
                key={pt.key}
                className="cursor-pointer outline-none"
                tabIndex={0}
                onMouseEnter={() => setHoveredIndex(idx)}
                onFocus={() => setHoveredIndex(idx)}
                onBlur={() => setHoveredIndex((prev) => (prev === idx ? null : prev))}
                onClick={() => setHoveredIndex(isHovered ? null : idx)}
              >
                {/* Invisible wider hit band */}
                <rect
                  x={cx - slotW / 2}
                  y={padTop - 4}
                  width={Math.max(slotW, 14)}
                  height={plotHeight + 24}
                  fill="transparent"
                />

                {/* Active hover guide highlight */}
                {isHovered && (
                  <rect
                    x={cx - Math.min(slotW * 0.42, 16)}
                    y={padTop}
                    width={Math.min(slotW * 0.84, 32)}
                    height={plotHeight}
                    rx={8}
                    className="fill-[var(--primary)]/[0.06] dark:fill-white/[0.04]"
                  />
                )}

                {/* Vertical stem */}
                {val > 0 ? (
                  <>
                    <rect
                      x={cx - (isHovered ? 2 : count > 20 ? 1.15 : 1.6)}
                      y={topY}
                      width={isHovered ? 4 : count > 20 ? 2.3 : 3.2}
                      height={Math.max(2, baseY - topY)}
                      rx={2}
                      fill={`url(#${stemGradId})`}
                      fillOpacity={isAboveMean || isHovered ? 1 : 0.78}
                    />
                    {/* Halo dot */}
                    {(isAboveMean || isHovered) && (
                      <circle
                        cx={cx}
                        cy={topY}
                        r={dotRadius + (isHovered ? 4.5 : 3.2)}
                        fill={activeColor}
                        fillOpacity={isHovered ? 0.28 : 0.16}
                      />
                    )}
                    {/* Top dot */}
                    <circle
                      cx={cx}
                      cy={topY}
                      r={isHovered ? dotRadius + 1 : dotRadius}
                      fill={isAboveMean || isHovered ? activeColor : "#FFFFFF"}
                      stroke={activeColor}
                      strokeWidth="2"
                    />
                    {/* Secondary Real marker when viewing ALL and simulated/pending coexist */}
                    {filterMode === "ALL" && pt.realCents > 0 && pt.realCents < val && (
                      <circle
                        cx={cx}
                        cy={
                          padTop +
                          plotHeight -
                          Math.min(1, pt.realCents / stats.maxChartVal) * plotHeight
                        }
                        r={dotRadius - 0.8}
                        className="fill-white dark:fill-[#1A1A1A] stroke-emerald-500"
                        strokeWidth="1.8"
                      />
                    )}
                  </>
                ) : (
                  <circle
                    cx={cx}
                    cy={baseY}
                    r={isHovered ? 3.2 : 2.2}
                    className={
                      isHovered
                        ? "fill-[var(--primary)]"
                        : "fill-[#D0D0D0] dark:fill-[#3A3A3A]"
                    }
                  />
                )}

                {/* X-Axis Tick Label */}
                {showXLabel && (
                  <text
                    x={cx}
                    y={svgHeight - 8}
                    textAnchor="middle"
                    className={cn(
                      "text-[10px] font-medium tabular-nums transition-colors",
                      isHovered
                        ? "fill-[#171717] dark:fill-[#F5F5F5] font-bold"
                        : "fill-[#737373] dark:fill-[#8C8C8C]"
                    )}
                  >
                    {pt.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {!stats.hasData && (
          <div className="mt-2 rounded-xl border border-dashed border-[#E5E5E5] dark:border-[#2C2C2C] bg-[#F8F8F8]/70 dark:bg-[#141414] px-4 py-2.5 text-center text-xs text-[#737373] dark:text-[#A6A6A6]">
            Nenhuma movimentação financeira registrada para este filtro no período selecionado.
          </div>
        )}
      </div>
    </div>
  );
}

export function PaymentMethodsDonutChart({
  byMethod,
  byStatus = [],
  approvalRate,
  totalCount,
  className,
}: {
  byMethod: PaymentMethodMetric[];
  byStatus?: PaymentStatusMetric[];
  approvalRate: number;
  totalCount: number;
  className?: string;
}) {
  const [viewMode, setViewMode] = useState<"method" | "status">("method");
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const methodPalette: Record<string, string> = {
    IN_PERSON: "#10B981",
    WHATSAPP_ARRANGED: "var(--primary, #EA580C)",
    ONLINE_SIMULATED: "#F59E0B",
  };

  const statusPalette: Record<string, string> = {
    APPROVED: "#10B981",
    PENDING: "#F59E0B",
    REFUNDED: "var(--primary, #EA580C)",
    OTHER: "#737373",
  };

  const activeItems = useMemo(() => {
    if (viewMode === "status" && byStatus.length > 0) {
      return byStatus.map((s) => ({
        key: s.status,
        label: s.label,
        totalCents: s.totalCents,
        count: s.count,
        color: statusPalette[s.status] || "var(--primary, #EA580C)",
      }));
    }
    return byMethod.map((m) => ({
      key: m.method,
      label: m.label,
      totalCents: m.totalCents,
      count: m.count,
      color: methodPalette[m.method] || "var(--primary, #EA580C)",
    }));
  }, [viewMode, byMethod, byStatus]);

  const totalValueCents = useMemo(
    () => activeItems.reduce((acc, item) => acc + item.totalCents, 0),
    [activeItems]
  );

  const size = 152;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const segments = useMemo(() => {
    let offsetAcc = 0;
    return activeItems.map((item) => {
      const share = totalValueCents > 0 ? item.totalCents / totalValueCents : 0;
      const dashLength = share * circumference;
      const dashOffset = -offsetAcc;
      offsetAcc += dashLength;
      return {
        ...item,
        sharePercent: totalValueCents > 0 ? Math.round(share * 100) : 0,
        dashLength,
        dashOffset,
      };
    });
  }, [activeItems, totalValueCents, circumference]);

  const activeSegment =
    hoveredKey ? segments.find((s) => s.key === hoveredKey) : null;

  return (
    <div
      data-testid="finance-donut-chart"
      className={cn(
        "rounded-2xl border border-[#E5E5E5] dark:border-[#2C2C2C] bg-white dark:bg-[#1A1A1A] shadow-xs dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] p-5 sm:p-6 flex flex-col justify-between",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-heading text-base sm:text-lg font-semibold text-[#171717] dark:text-[#F5F5F5] tracking-tight">
            {viewMode === "status" ? "Distribuição por Status" : "Meios de Pagamento"}
          </h3>
          <p className="text-xs text-[#737373] dark:text-[#8C8C8C] mt-0.5">
            Proporção financeira e eficiência
          </p>
        </div>

        {byStatus.length > 0 && (
          <div className="inline-flex items-center rounded-xl bg-[#F4F4F5] dark:bg-[#141414] border border-[#E5E5E5] dark:border-[#2C2C2C] p-0.5 gap-0.5 text-[11px] font-heading font-semibold shrink-0">
            <button
              type="button"
              onClick={() => {
                setViewMode("method");
                setHoveredKey(null);
              }}
              className={cn(
                "px-2.5 py-1 rounded-lg transition-all cursor-pointer",
                viewMode === "method"
                  ? "bg-[var(--button-bg,var(--primary))] text-[var(--button-fg,#ffffff)] shadow-2xs"
                  : "bg-white text-[var(--button-outline-fg,var(--button-bg,var(--primary)))] dark:bg-transparent dark:text-[#A6A6A6] dark:hover:text-[#F5F5F5]"
              )}
            >
              Meios
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode("status");
                setHoveredKey(null);
              }}
              className={cn(
                "px-2.5 py-1 rounded-lg transition-all cursor-pointer",
                viewMode === "status"
                  ? "bg-[var(--button-bg,var(--primary))] text-[var(--button-fg,#ffffff)] shadow-2xs"
                  : "bg-white text-[var(--button-outline-fg,var(--button-bg,var(--primary)))] dark:bg-transparent dark:text-[#A6A6A6] dark:hover:text-[#F5F5F5]"
              )}
            >
              Status
            </button>
          </div>
        )}
      </div>

      <div className="my-5 flex items-center justify-center">
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-[#F0F0F0] dark:text-[#2A2A2A]"
            />
            {totalValueCents > 0 &&
              segments.map((seg) =>
                seg.dashLength > 0 ? (
                  <circle
                    key={seg.key}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={hoveredKey === seg.key ? strokeWidth + 3.5 : strokeWidth}
                    strokeDasharray={`${seg.dashLength} ${circumference}`}
                    strokeDashoffset={seg.dashOffset}
                    className="transition-all duration-200 cursor-pointer"
                    onMouseEnter={() => setHoveredKey(seg.key)}
                    onMouseLeave={() => setHoveredKey(null)}
                  />
                ) : null
              )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-3">
            {activeSegment ? (
              <>
                <span className="font-heading text-lg font-bold tabular-nums text-[#171717] dark:text-[#F5F5F5]">
                  {activeSegment.sharePercent}%
                </span>
                <span className="text-[10px] font-medium text-[#737373] dark:text-[#A6A6A6] leading-tight truncate max-w-full">
                  {activeSegment.label}
                </span>
              </>
            ) : (
              <>
                <span className="font-heading text-xl font-bold tabular-nums text-[#171717] dark:text-[#F5F5F5]">
                  {approvalRate}%
                </span>
                <span className="text-[10px] font-medium text-[#737373] dark:text-[#A6A6A6] leading-tight">
                  Aprovação ({totalCount})
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {segments.map((seg) => (
          <div
            key={seg.key}
            onMouseEnter={() => setHoveredKey(seg.key)}
            onMouseLeave={() => setHoveredKey(null)}
            className={cn(
              "space-y-1.5 rounded-xl px-2.5 py-2 transition-colors cursor-default",
              hoveredKey === seg.key ? "bg-[#F8F8F8] dark:bg-[#242424]" : ""
            )}
          >
            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: seg.color }}
                />
                <span className="font-medium text-[#171717] dark:text-[#F5F5F5] truncate">
                  {seg.label}
                </span>
                <span className="text-[11px] text-[#737373] dark:text-[#8C8C8C]">
                  ({seg.count})
                </span>
              </div>
              <div className="text-right shrink-0 tabular-nums">
                <span className="font-heading font-semibold text-[#171717] dark:text-[#F5F5F5]">
                  {formatBRL(seg.totalCents)}
                </span>
                <span className="ml-1.5 text-[11px] text-[#737373] dark:text-[#A6A6A6]">
                  {seg.sharePercent}%
                </span>
              </div>
            </div>
            <div className="h-1.5 w-full rounded-full bg-[#EFEFEF] dark:bg-[#262626] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${seg.sharePercent}%`,
                  backgroundColor: seg.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
