"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { animatePageEnter, animateKpiEntrance } from "@/lib/animation/gsap";
import {
  formatBRL,
  formatTime,
  formatDate,
  formatActivityAction,
  formatAppointmentStatus,
} from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  MiniSparkline,
  LollipopPerformanceChart,
  RadialArcProgress,
} from "@/components/admin/analytics-charts";
import {
  Calendar,
  Users,
  Clock,
  DollarSign,
  Video,
  Plus,
  ArrowRight,
  HardDrive,
  CalendarCheck,
  TrendingUp,
  TrendingDown,
  Activity,
  Globe,
  Mail,
  AlertTriangle,
  Wallet,
  Target,
  BarChart3,
} from "lucide-react";

interface PerformanceBucket {
  dateKey?: string;
  monthKey?: string;
  label: string;
  totalCents: number;
  presentialCents: number;
  onlineCents: number;
  packageCents: number;
  simulatedCents: number;
  sessionsCount: number;
}

interface DashboardData {
  timezone?: string;
  adminDisplayName?: string;
  todayAppointments: Array<{
    id: string;
    startAt: string;
    endAt: string;
    modality: string;
    status: string;
    patient: { fullName: string; phone: string };
    service: { name: string; durationMinutes: number };
    meetingUrlSnapshot?: string;
  }>;
  nextAppointments: Array<{
    id: string;
    startAt: string;
    endAt: string;
    modality: string;
    status: string;
    patient: { fullName: string; phone: string };
    service: { name: string; durationMinutes: number };
  }>;
  activePatientsCount: number;
  pendingApprovalsCount: number;
  pendingPaymentsCount: number;
  pendingBalanceCents: number;
  revenueMonth: {
    realCents: number;
    simulatedCents: number;
    totalCombinedCents: number;
  };
  storage: {
    fileCount: number;
    totalBytes: number;
  };
  recentActivity: Array<{
    id: string;
    action: string;
    resource: string;
    createdAt: string;
  }>;
  messageDeliveryStats?: {
    totalAttempts: number;
    accepted: number;
    delivered: number;
    failed: number;
    pending: number;
    simulated: number;
    hasFailures: boolean;
  };
  analytics?: {
    todaySummary: {
      total: number;
      completed: number;
      online: number;
      presential: number;
      completionRatePct: number;
    };
    monthSummary: {
      realCents: number;
      prevMonthRealCents: number;
      simulatedCents: number;
      revenueDeltaPct: number;
      patientsDeltaPct: number;
      patientsLast30: number;
      monthAppointmentsTotal: number;
      monthCompletedCount: number;
      monthConfirmedCount: number;
      monthCancelledCount: number;
      monthCompletionPct: number;
      collectionRatePct: number;
    };
    sparklines: {
      revenue7d: number[];
      appointments7d: number[];
      patients7d: number[];
      pending7d: number[];
    };
    performanceSeries: {
      days30: PerformanceBucket[];
      months6: PerformanceBucket[];
    };
  };
}

function getTimeGreeting(tz?: string): string {
  try {
    const hourStr = new Intl.DateTimeFormat("pt-BR", {
      timeZone: tz || "America/Sao_Paulo",
      hour: "2-digit",
      hour12: false,
    }).format(new Date());
    const hour = parseInt(hourStr, 10);
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  } catch {
    return "Olá";
  }
}

function getCurrentMonthLabel(tz?: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: tz || "America/Sao_Paulo",
      month: "long",
    }).format(new Date());
  } catch {
    return "mês atual";
  }
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [chartWindow, setChartWindow] = useState<"14d" | "30d" | "6m">("14d");
  const [seriesFilter, setSeriesFilter] = useState<"all" | "presential" | "online" | "package">("all");
  const pageRef = useRef<HTMLDivElement>(null);
  const kpiGridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoading && data) {
      animatePageEnter(pageRef.current);
      if (kpiGridRef.current) {
        animateKpiEntrance(kpiGridRef.current.children);
      }
    }
  }, [isLoading, data]);

  useEffect(() => {
    fetch("/api/admin/dashboard-stats")
      .then((res) => {
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            window.location.href = "/login";
            return null;
          }
          throw new Error("Erro de autenticação");
        }
        return res.json();
      })
      .then((d) => {
        if (d && !d.error) {
          setData(d);
          setIsLoading(false);
        }
      })
      .catch((e) => {
        console.error(e);
        setIsLoading(false);
      });
  }, []);

  if (isLoading || !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-4 w-32 bg-slate-200 dark:bg-[#202020] rounded-lg" />
            <div className="h-8 w-64 bg-slate-200 dark:bg-[#242424] rounded-xl" />
            <div className="h-4 w-80 bg-slate-200 dark:bg-[#202020] rounded-lg" />
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-36 bg-slate-200 dark:bg-[#242424] rounded-xl" />
            <div className="h-10 w-36 bg-slate-200 dark:bg-[#242424] rounded-xl" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-36 bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2C2C2C] rounded-2xl p-5"
            />
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <div className="xl:col-span-8 h-96 bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2C2C2C] rounded-2xl" />
          <div className="xl:col-span-4 h-96 bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2C2C2C] rounded-2xl" />
        </div>
      </div>
    );
  }

  const todayCount = data?.todayAppointments?.length ?? 0;
  const firstName = (data.adminDisplayName || "Profissional").split(" ")[0];
  const monthSummary = data.analytics?.monthSummary;
  const todaySummary = data.analytics?.todaySummary;
  const sparklines = data.analytics?.sparklines;

  const rawBuckets: PerformanceBucket[] =
    chartWindow === "6m"
      ? data.analytics?.performanceSeries.months6 || []
      : chartWindow === "30d"
      ? data.analytics?.performanceSeries.days30 || []
      : (data.analytics?.performanceSeries.days30 || []).slice(-14);

  const pickBucketValue = (b: PerformanceBucket): number => {
    if (seriesFilter === "presential") return b.presentialCents;
    if (seriesFilter === "online") return b.onlineCents;
    if (seriesFilter === "package") return b.packageCents;
    return b.totalCents;
  };

  const chartData = rawBuckets.map((b, idx) => ({
    key: b.dateKey || b.monthKey || String(idx),
    label: b.label,
    valueCents: pickBucketValue(b),
    count: b.sessionsCount,
    countLabel: b.sessionsCount === 1 ? "sessão" : "sessões",
  }));

  const windowTotalCents = chartData.reduce((sum, item) => sum + item.valueCents, 0);
  const windowSessionsTotal = chartData.reduce((sum, item) => sum + (item.count || 0), 0);
  const activeBuckets = chartData.filter((d) => d.valueCents > 0);
  const avgBucketCents =
    activeBuckets.length > 0 ? Math.round(windowTotalCents / activeBuckets.length) : 0;
  const bestBucket = chartData.reduce<{ label: string; valueCents: number }>(
    (best, cur) => (cur.valueCents > best.valueCents ? { label: cur.label, valueCents: cur.valueCents } : best),
    { label: "—", valueCents: 0 }
  );

  const monthLabel = getCurrentMonthLabel(data.timezone);
  const revenueDeltaPct = monthSummary?.revenueDeltaPct ?? 0;
  const hasPrevRevenue = (monthSummary?.prevMonthRealCents ?? 0) > 0;
  const collectionRatePct = monthSummary?.collectionRatePct ?? 0;

  return (
    <div ref={pageRef} className="space-y-6">
      {/* ================= 1. GREETING & PAGE HEADER ================= */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-medium text-[#737373] dark:text-[#8C8C8C]">
            {getTimeGreeting(data.timezone)}, {firstName}
          </p>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-[#171717] dark:text-[#F5F5F5]">
            Painel do Consultório
          </h1>
          <p className="text-xs sm:text-sm text-[#525252] dark:text-[#A6A6A6] leading-relaxed">
            {todayCount} {todayCount === 1 ? "atendimento hoje" : "atendimentos hoje"} ·{" "}
            {data.pendingPaymentsCount} recebimento(s) pendente(s) · {data.activePatientsCount}{" "}
            paciente(s) ativo(s)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/admin/financeiro">
            <Button variant="outline" size="md" className="gap-2 shadow-2xs">
              <BarChart3 className="h-4 w-4 text-current" />
              <span>Relatório Financeiro</span>
            </Button>
          </Link>
          <Link href="/admin/agenda">
            <Button size="md" className="gap-2 shadow-sm">
              <Plus className="h-4 w-4 text-current" />
              <span>Novo Agendamento</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* ================= 2. BENTO KPI ROW (4 CARDS) ================= */}
      <div ref={kpiGridRef} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1 — Receita deste Mês (Card Hero em Laranja/Tema) */}
        <div
          className="relative overflow-hidden rounded-2xl p-5 bg-[var(--button-bg,#CA4C0A)] text-white shadow-[0_14px_34px_-12px_rgba(234,88,12,0.45)] flex flex-col justify-between min-h-[146px]"
          style={{
            background:
              "linear-gradient(135deg, var(--button-bg, #CA4C0A) 0%, var(--primary, #EA580C) 100%)",
          }}
        >
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/15 blur-xl"
            aria-hidden="true"
          />
          <div className="relative z-10 flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-white/95">Receita deste Mês</span>
            <div className="h-8 w-8 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
              <DollarSign className="h-4 w-4 text-white" />
            </div>
          </div>

          <div className="relative z-10 mt-2">
            <div className="font-heading text-2xl sm:text-3xl font-bold tracking-tight tabular-nums text-white">
              {formatBRL(data.revenueMonth.realCents)}
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold text-white">
                {revenueDeltaPct >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {hasPrevRevenue
                  ? `${revenueDeltaPct >= 0 ? "+" : ""}${revenueDeltaPct}% vs mês ant.`
                  : "Receita confirmada"}
              </span>
              {data.revenueMonth.simulatedCents > 0 && (
                <span className="text-[11px] text-white/90 font-medium">
                  +{formatBRL(data.revenueMonth.simulatedCents)} simulado
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card 2 — Atendimentos Hoje */}
        <Card className="bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2C2C2C] flex flex-col justify-between min-h-[146px] p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-[#525252] dark:text-[#A6A6A6]">
              Atendimentos Hoje
            </span>
            <div className="h-8 w-8 rounded-xl bg-[var(--primary)]/10 text-[var(--button-outline-fg,var(--primary))] dark:bg-[#242424] dark:text-[#D0D0D0] dark:border dark:border-[#333333] flex items-center justify-center shrink-0">
              <CalendarCheck className="h-4 w-4" />
            </div>
          </div>

          <div className="mt-2 flex items-end justify-between gap-3">
            <div className="font-heading text-2xl sm:text-3xl font-bold tracking-tight tabular-nums text-[#171717] dark:text-[#F5F5F5]">
              {todayCount}
            </div>
            <div className="w-24 shrink-0">
              <MiniSparkline values={sparklines?.appointments7d || [0, todayCount]} height={34} />
            </div>
          </div>

          <p className="mt-2 text-xs text-[#737373] dark:text-[#8C8C8C] flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {todayCount === 0
              ? "Agenda livre para hoje"
              : `${todaySummary?.online ?? 0} online · ${todaySummary?.presential ?? 0} presencial`}
          </p>
        </Card>

        {/* Card 3 — Pacientes Cadastrados */}
        <Card className="bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2C2C2C] flex flex-col justify-between min-h-[146px] p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-[#525252] dark:text-[#A6A6A6]">
              Pacientes Cadastrados
            </span>
            <div className="h-8 w-8 rounded-xl bg-[var(--primary)]/10 text-[var(--button-outline-fg,var(--primary))] dark:bg-[#242424] dark:text-[#D0D0D0] dark:border dark:border-[#333333] flex items-center justify-center shrink-0">
              <Users className="h-4 w-4" />
            </div>
          </div>

          <div className="mt-2 flex items-end justify-between gap-3">
            <div className="font-heading text-2xl sm:text-3xl font-bold tracking-tight tabular-nums text-[#171717] dark:text-[#F5F5F5]">
              {data?.activePatientsCount ?? 0}
            </div>
            <div className="w-24 shrink-0">
              <MiniSparkline
                values={sparklines?.patients7d || [0, 0]}
                color="#10B981"
                height={34}
              />
            </div>
          </div>

          <p className="mt-2 text-xs text-[#737373] dark:text-[#8C8C8C]">
            {data?.pendingApprovalsCount && data.pendingApprovalsCount > 0 ? (
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                {data.pendingApprovalsCount} alteração(ões) pendente(s)
              </span>
            ) : (
              <span>
                {monthSummary?.patientsLast30
                  ? `+${monthSummary.patientsLast30} nos últimos 30 dias`
                  : "Base ativa e atualizada"}
              </span>
            )}
          </p>
        </Card>

        {/* Card 4 — Recebimentos Pendentes */}
        <Card className="bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2C2C2C] flex flex-col justify-between min-h-[146px] p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-[#525252] dark:text-[#A6A6A6]">
              Recebimentos Pendentes
            </span>
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-600 dark:bg-[#242424] dark:text-amber-400 dark:border dark:border-[#333333] flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4" />
            </div>
          </div>

          <div className="mt-2 flex items-end justify-between gap-3">
            <div className="font-heading text-2xl sm:text-3xl font-bold tracking-tight tabular-nums text-[#171717] dark:text-[#F5F5F5]">
              {formatBRL(data?.pendingBalanceCents ?? 0)}
            </div>
            <div className="w-24 shrink-0">
              <MiniSparkline
                values={sparklines?.pending7d || [0, 0]}
                color="#F59E0B"
                height={34}
              />
            </div>
          </div>

          <p className="mt-2 text-xs text-[#737373] dark:text-[#8C8C8C]">
            {data?.pendingPaymentsCount ?? 0} pagamento(s) a confirmar
          </p>
        </Card>
      </div>

      {/* ================= 3. ASYMMETRIC BENTO CHARTS (LOLLIPOP + WALLET + RADIAL TARGET) ================= */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Esquerda (8 cols): Gráfico Lollipop Interativo "Desempenho & Receita" */}
        <Card className="xl:col-span-8 bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2C2C2C] p-5 sm:p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <h2 className="font-heading text-base sm:text-lg font-bold text-[#171717] dark:text-[#F5F5F5]">
                  Desempenho &amp; Receita
                </h2>
                <p className="text-xs text-[#737373] dark:text-[#8C8C8C] mt-0.5">
                  Evolução dos recebimentos confirmados reais frente à média do período
                </p>
              </div>

              {/* Seletor de Período */}
              <div className="inline-flex items-center rounded-xl bg-[#F4F4F5] dark:bg-[#141414] border border-[#E5E5E5] dark:border-[#2C2C2C] p-1 gap-1 self-start">
                {[
                  { id: "14d" as const, label: "14 dias" },
                  { id: "30d" as const, label: "30 dias" },
                  { id: "6m" as const, label: "6 meses" },
                ].map((opt) => {
                  const active = chartWindow === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setChartWindow(opt.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-heading font-semibold transition-all cursor-pointer ${
                        active
                          ? "bg-[var(--button-bg,var(--primary))] text-[var(--button-fg,#ffffff)] shadow-2xs"
                          : "bg-white text-[var(--button-outline-fg,var(--button-bg,var(--primary)))] hover:bg-[var(--primary)]/[0.04] dark:bg-transparent dark:text-[#A6A6A6] dark:hover:text-[#F5F5F5] dark:hover:bg-[#242424]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Resumo Numérico do Recorte */}
            <div className="flex flex-wrap items-baseline gap-x-8 gap-y-3 pt-1">
              <div>
                <span className="block text-[11px] text-[#737373] dark:text-[#8C8C8C]">
                  Total no período
                </span>
                <span className="font-heading text-2xl sm:text-3xl font-bold tracking-tight tabular-nums text-[#171717] dark:text-[#F5F5F5]">
                  {formatBRL(windowTotalCents)}
                </span>
              </div>
              <div>
                <span className="block text-[11px] text-[#737373] dark:text-[#8C8C8C]">
                  Média por ponto ativo
                </span>
                <span className="font-heading text-sm font-bold tabular-nums text-[#171717] dark:text-[#F5F5F5]">
                  {formatBRL(avgBucketCents)}
                </span>
              </div>
              <div>
                <span className="block text-[11px] text-[#737373] dark:text-[#8C8C8C]">
                  Melhor {chartWindow === "6m" ? "mês" : "dia"}
                </span>
                <span className="font-heading text-sm font-bold tabular-nums text-[#171717] dark:text-[#F5F5F5]">
                  {bestBucket.valueCents > 0
                    ? `${formatBRL(bestBucket.valueCents)} · ${bestBucket.label}`
                    : "—"}
                </span>
              </div>
              <div>
                <span className="block text-[11px] text-[#737373] dark:text-[#8C8C8C]">
                  Sessões no período
                </span>
                <span className="font-heading text-sm font-bold tabular-nums text-[#171717] dark:text-[#F5F5F5]">
                  {windowSessionsTotal}
                </span>
              </div>
            </div>

            {/* Filtros de Série */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {[
                { id: "all" as const, label: "Todos", dot: "var(--primary, #EA580C)" },
                { id: "presential" as const, label: "Presencial", dot: "#10B981" },
                { id: "online" as const, label: "Teleconsulta", dot: "#3B82F6" },
                { id: "package" as const, label: "Pacotes", dot: "#F59E0B" },
              ].map((s) => {
                const active = seriesFilter === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSeriesFilter(s.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                      active
                        ? "bg-[var(--button-bg,var(--primary))] text-[var(--button-fg,#ffffff)] border-transparent font-semibold shadow-2xs"
                        : "bg-white text-[var(--button-outline-fg,var(--button-bg,var(--primary)))] border-[var(--primary)]/25 hover:border-[var(--primary)]/50 hover:bg-[var(--primary)]/[0.04] dark:bg-[#141414] dark:text-[#CCCCCC] dark:border-[#2C2C2C] dark:hover:bg-[#242424]"
                    }`}
                  >
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: active ? "#FFFFFF" : s.dot }}
                    />
                    <span>{s.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-5">
            <LollipopPerformanceChart
              data={chartData}
              height={235}
              targetLabel="Média"
              emptyMessage="Nenhuma receita real confirmada neste recorte temporal."
            />
          </div>
        </Card>

        {/* Direita (4 cols): Resumo Financeiro + Acompanhamento do Mês */}
        <div className="xl:col-span-4 space-y-5 flex flex-col justify-between">
          {/* Wallet / Resumo Financeiro */}
          <Card className="relative overflow-hidden bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2C2C2C] p-5 sm:p-6">
            <div
              className="pointer-events-none hidden dark:block absolute -right-12 -top-12 h-36 w-36 rounded-full opacity-25 blur-2xl"
              style={{ backgroundColor: "var(--primary, #EA580C)" }}
              aria-hidden="true"
            />
            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-[var(--primary)]/10 text-[var(--button-outline-fg,var(--primary))] dark:bg-[#242424] dark:text-[var(--primary)] dark:border dark:border-[#333333] flex items-center justify-center">
                    <Wallet className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="font-heading text-sm font-bold text-[#171717] dark:text-[#F5F5F5]">
                      Resumo Financeiro
                    </h2>
                    <p className="text-[11px] text-[#737373] dark:text-[#8C8C8C]">
                      Saldo real confirmado no mês
                    </p>
                  </div>
                </div>
              </div>

              <div className="font-heading text-2xl sm:text-3xl font-bold tracking-tight tabular-nums text-[#171717] dark:text-[#F5F5F5]">
                {formatBRL(data.revenueMonth.realCents)}
              </div>

              <MiniSparkline values={sparklines?.revenue7d || [0, 0]} height={42} />

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 rounded-xl bg-[#F8F8F8] dark:bg-[#141414] border border-[#E5E5E5] dark:border-[#2C2C2C]">
                  <span className="block text-[11px] text-[#737373] dark:text-[#8C8C8C]">
                    A confirmar
                  </span>
                  <span className="font-heading font-bold text-sm tabular-nums text-[#171717] dark:text-[#F5F5F5] mt-0.5 block">
                    {formatBRL(data.pendingBalanceCents)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#F8F8F8] dark:bg-[#141414] border border-[#E5E5E5] dark:border-[#2C2C2C]">
                  <span className="block text-[11px] text-[#737373] dark:text-[#8C8C8C]">
                    Simulado (Testes)
                  </span>
                  <span className="font-heading font-bold text-sm tabular-nums text-[#171717] dark:text-[#F5F5F5] mt-0.5 block">
                    {formatBRL(data.revenueMonth.simulatedCents)}
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <Link href="/admin/financeiro" className="block">
                  <Button variant="primary" size="md" className="w-full text-xs">
                    <span>Gerenciar Financeiro</span>
                    <ArrowRight className="h-3.5 w-3.5 text-current" />
                  </Button>
                </Link>
                <Link href="/admin/pacotes" className="block">
                  <Button variant="secondary" size="sm" className="w-full text-xs">
                    <span>Ver Pacotes &amp; Propostas</span>
                  </Button>
                </Link>
              </div>
            </div>
          </Card>

          {/* Acompanhamento do Mês (Circular Target Donut) */}
          <Card className="bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2C2C2C] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div>
                <h2 className="font-heading text-sm font-bold text-[#171717] dark:text-[#F5F5F5]">
                  Acompanhamento do Mês
                </h2>
                <p className="text-[11px] text-[#737373] dark:text-[#8C8C8C] capitalize">
                  {monthLabel} · Efetivação financeira
                </p>
              </div>
              <Target className="h-4 w-4 text-[var(--primary)] shrink-0" />
            </div>

            <div className="flex items-center gap-4">
              <RadialArcProgress
                percentage={collectionRatePct}
                size={112}
                strokeWidth={10}
                label="Efetivado"
                subLabel="Recebido"
              />

              <div className="flex-1 min-w-0 space-y-2.5 text-xs">
                <div className="p-2.5 rounded-xl bg-[#F8F8F8] dark:bg-[#141414] border border-[#E5E5E5] dark:border-[#2C2C2C]">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-[#737373] dark:text-[#8C8C8C] block">
                    Sessões realizadas
                  </span>
                  <span className="font-heading font-bold text-sm tabular-nums text-[#171717] dark:text-[#F5F5F5]">
                    {monthSummary?.monthCompletedCount ?? 0}/{monthSummary?.monthAppointmentsTotal ?? 0}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#F8F8F8] dark:bg-[#141414] border border-[#E5E5E5] dark:border-[#2C2C2C]">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-[#737373] dark:text-[#8C8C8C] block">
                    Total combinado
                  </span>
                  <span className="font-heading font-bold text-sm tabular-nums text-[#171717] dark:text-[#F5F5F5]">
                    {formatBRL(data.revenueMonth.totalCombinedCents)}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ================= 4. OPERATIONAL BENTO: AGENDA DE HOJE & WIDGETS ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Coluna Principal (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          {/* Agenda de Hoje */}
          <Card className="bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2C2C2C]">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 sm:p-6 border-b border-[#E5E5E5] dark:border-[#2C2C2C]">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">Agenda de Hoje</CardTitle>
                  <Badge variant="default" size="sm">
                    {todayCount} {todayCount === 1 ? "sessão" : "sessões"}
                  </Badge>
                </div>
                <CardDescription className="mt-1">
                  {formatDate(new Date(), data.timezone)} — Consultas marcadas para o dia
                </CardDescription>
              </div>

              <Link href="/admin/agenda">
                <Button variant="outline" size="sm" className="text-xs gap-1.5">
                  <span>Ver Calendário Completo</span>
                  <ArrowRight className="h-3.5 w-3.5 text-current" />
                </Button>
              </Link>
            </CardHeader>

            <CardContent className="p-5 sm:p-6">
              {data?.todayAppointments && data.todayAppointments.length > 0 ? (
                <div className="divide-y divide-[#E5E5E5] dark:divide-[#2C2C2C]">
                  {data.todayAppointments.map((appt) => {
                    const isConfirmed = appt.status === "CONFIRMED";
                    const isCompleted = appt.status === "COMPLETED";

                    return (
                      <div
                        key={appt.id}
                        className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 hover:bg-[#F8F8F8] dark:hover:bg-[#242424]/50 p-2.5 rounded-xl transition-colors"
                      >
                        <div className="flex items-start gap-3.5 min-w-0">
                          <div className="px-3 py-2 rounded-xl bg-[var(--primary)]/10 text-[var(--button-outline-fg,var(--primary))] dark:bg-[#242424] dark:text-[#FFFFFF] font-mono text-sm font-bold text-center shrink-0 border border-[var(--primary)]/20 dark:border-[#333333] tabular-nums">
                            {formatTime(appt.startAt, data.timezone)}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-heading font-semibold text-sm text-[#171717] dark:text-[#F5F5F5] truncate">
                              {appt.patient.fullName}
                            </h4>
                            <p className="text-xs text-[#525252] dark:text-[#A6A6A6] mt-0.5">
                              {appt.service.name} • {appt.service.durationMinutes} min •{" "}
                              <span className="font-medium text-[#171717] dark:text-[#F5F5F5]">
                                {appt.modality === "ONLINE" ? "Teleconsulta" : "Presencial"}
                              </span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
                          <Badge
                            variant={
                              isConfirmed
                                ? "success"
                                : isCompleted
                                ? "default"
                                : "warning"
                            }
                          >
                            {formatAppointmentStatus(appt.status)}
                          </Badge>

                          {appt.modality !== "PRESENTIAL" && appt.meetingUrlSnapshot && (
                            <Link href={appt.meetingUrlSnapshot} target="_blank">
                              <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
                                <Video className="h-3.5 w-3.5 text-current" />
                                <span>Entrar na Sessão</span>
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={<CalendarCheck className="h-6 w-6 text-[var(--primary)]" />}
                  title="Nenhum atendimento agendado para hoje"
                  description="Aproveite para revisar prontuários, cadastros ou planejar seus horários na agenda."
                  action={{
                    label: "Abrir Calendário",
                    href: "/admin/agenda",
                    icon: <Calendar className="h-4 w-4" />,
                  }}
                  className="py-8"
                />
              )}
            </CardContent>
          </Card>

          {/* Próximas Consultas */}
          <Card className="bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2C2C2C]">
            <CardHeader className="flex flex-row items-center justify-between p-5 sm:p-6 border-b border-[#E5E5E5] dark:border-[#2C2C2C]">
              <div>
                <CardTitle className="text-base sm:text-lg">Próximos Atendimentos</CardTitle>
                <CardDescription className="mt-0.5">
                  Próximas sessões confirmadas na semana
                </CardDescription>
              </div>
              <Link href="/admin/agenda">
                <Button variant="ghost" size="sm" className="text-xs gap-1">
                  <span>Ver Todos</span>
                  <ArrowRight className="h-3.5 w-3.5 text-current" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-5 sm:p-6">
              {data?.nextAppointments && data.nextAppointments.length > 0 ? (
                <div className="divide-y divide-[#E5E5E5] dark:divide-[#2C2C2C]">
                  {data.nextAppointments.map((appt) => (
                    <div
                      key={appt.id}
                      className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between text-sm hover:bg-[#F8F8F8] dark:hover:bg-[#242424]/50 p-2 rounded-xl transition-colors"
                    >
                      <div className="min-w-0">
                        <span className="font-heading font-semibold text-[#171717] dark:text-[#F5F5F5] block truncate">
                          {appt.patient.fullName}
                        </span>
                        <span className="text-xs text-[#737373] dark:text-[#A6A6A6] block mt-0.5">
                          {appt.service.name} • {appt.service.durationMinutes} min
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-heading font-semibold tabular-nums text-[#171717] dark:text-[#F5F5F5] block">
                          {formatDate(appt.startAt, data.timezone)} às{" "}
                          {formatTime(appt.startAt, data.timezone)}
                        </span>
                        <span className="text-[11px] text-[#737373] dark:text-[#8C8C8C]">
                          {appt.modality === "ONLINE" ? "Teleconsulta" : "Presencial"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#737373] dark:text-[#8C8C8C] py-6 text-center">
                  Nenhum atendimento futuro cadastrado para os próximos dias.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Coluna Lateral Operacional (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Ações Rápidas */}
          <Card className="bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2C2C2C]">
            <CardHeader className="pb-3 p-5 border-b border-[#E5E5E5] dark:border-[#2C2C2C]">
              <CardTitle className="text-base">Ações Rápidas</CardTitle>
              <CardDescription>Atalhos operacionais diários</CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-2.5">
              <Link href="/admin/agenda" className="block">
                <Button variant="outline" className="w-full justify-start gap-2.5 text-xs rounded-xl h-10">
                  <Calendar className="h-4 w-4 text-current" />
                  <span>Gerenciar Grade &amp; Agenda</span>
                </Button>
              </Link>
              <Link href="/admin/pacientes" className="block">
                <Button variant="outline" className="w-full justify-start gap-2.5 text-xs rounded-xl h-10">
                  <Users className="h-4 w-4 text-current" />
                  <span>Cadastrar Novo Paciente</span>
                </Button>
              </Link>
              <Link href="/admin/financeiro" className="block">
                <Button variant="outline" className="w-full justify-start gap-2.5 text-xs rounded-xl h-10">
                  <DollarSign className="h-4 w-4 text-current" />
                  <span>Confirmar Recebimentos</span>
                </Button>
              </Link>
              <Link href="/" target="_blank" className="block" title="Visualizar Site público em nova aba">
                <Button variant="outline" className="w-full justify-start gap-2.5 text-xs rounded-xl h-10">
                  <Globe className="h-4 w-4 text-current" />
                  <span>Visualizar Site</span>
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Envios de Mensagens */}
          <Card
            className={`bg-white dark:bg-[#1A1A1A] ${
              data?.messageDeliveryStats?.hasFailures
                ? "border-amber-500/40 dark:border-amber-500/30"
                : "border-[#E5E5E5] dark:border-[#2C2C2C]"
            }`}
          >
            <CardHeader className="pb-3 p-5 border-b border-[#E5E5E5] dark:border-[#2C2C2C]">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <span>Envios de Mensagens</span>
                    {data?.messageDeliveryStats?.hasFailures && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                        <AlertTriangle className="h-3 w-3" />
                        {data.messageDeliveryStats.failed} falha(s)
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">Últimos 7 dias</CardDescription>
                </div>
                <div className="h-8 w-8 rounded-xl bg-[var(--primary)]/10 text-[var(--button-outline-fg,var(--primary))] dark:bg-[#242424] dark:text-[#D0D0D0] dark:border dark:border-[#333333] flex items-center justify-center shrink-0">
                  <Mail className="h-4 w-4" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-[#F8F8F8] dark:bg-[#141414] border border-[#E5E5E5] dark:border-[#2C2C2C]">
                  <span className="text-[#737373] dark:text-[#8C8C8C] block text-[11px]">
                    Tentativas
                  </span>
                  <span className="font-heading font-bold text-base tabular-nums text-[#171717] dark:text-[#F5F5F5]">
                    {data?.messageDeliveryStats?.totalAttempts ?? 0}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#F8F8F8] dark:bg-[#141414] border border-[#E5E5E5] dark:border-[#2C2C2C]">
                  <span className="text-[#737373] dark:text-[#8C8C8C] block text-[11px]">
                    Aceitos (SMTP)
                  </span>
                  <span className="font-heading font-bold text-base tabular-nums text-blue-600 dark:text-[#D0D0D0]">
                    {data?.messageDeliveryStats?.accepted ?? 0}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#F8F8F8] dark:bg-[#141414] border border-[#E5E5E5] dark:border-[#2C2C2C]">
                  <span className="text-[#737373] dark:text-[#8C8C8C] block text-[11px]">
                    Entregues
                  </span>
                  <span className="font-heading font-bold text-base tabular-nums text-emerald-600 dark:text-emerald-400">
                    {data?.messageDeliveryStats?.delivered ?? 0}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#F8F8F8] dark:bg-[#141414] border border-[#E5E5E5] dark:border-[#2C2C2C]">
                  <span className="text-[#737373] dark:text-[#8C8C8C] block text-[11px]">
                    Falhas
                  </span>
                  <span
                    className={`font-heading font-bold text-base tabular-nums ${
                      (data?.messageDeliveryStats?.failed ?? 0) > 0
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-[#171717] dark:text-[#F5F5F5]"
                    }`}
                  >
                    {data?.messageDeliveryStats?.failed ?? 0}
                  </span>
                </div>
              </div>

              {(data?.messageDeliveryStats?.pending ?? 0) > 0 && (
                <div className="flex justify-between text-xs pt-1">
                  <span className="text-[#737373] dark:text-[#A6A6A6]">
                    Em fila / processamento:
                  </span>
                  <span className="font-medium text-amber-600 dark:text-amber-400">
                    {data?.messageDeliveryStats?.pending}
                  </span>
                </div>
              )}

              <div className="pt-2 border-t border-[#E5E5E5] dark:border-[#2C2C2C]">
                <Link
                  href="/admin/lembretes/registros"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--button-outline-fg,var(--primary))] dark:text-[var(--primary)] hover:underline"
                >
                  <span>Ver registros detalhados</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Armazenamento Local */}
          <Card className="bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2C2C2C]">
            <CardHeader className="pb-3 p-5 border-b border-[#E5E5E5] dark:border-[#2C2C2C]">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Armazenamento Local</CardTitle>
                <div className="h-8 w-8 rounded-xl bg-[var(--primary)]/10 text-[var(--button-outline-fg,var(--primary))] dark:bg-[#242424] dark:text-[#D0D0D0] dark:border dark:border-[#333333] flex items-center justify-center">
                  <HardDrive className="h-4 w-4" />
                </div>
              </div>
              <CardDescription>Documentos e prontuários protegidos</CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-[#737373] dark:text-[#A6A6A6]">Total de Arquivos:</span>
                <span className="font-heading font-semibold tabular-nums text-[#171717] dark:text-[#F5F5F5]">
                  {data?.storage?.fileCount ?? 0}
                </span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-[#737373] dark:text-[#A6A6A6]">Espaço Ocupado:</span>
                <span className="font-heading font-semibold tabular-nums text-[#171717] dark:text-[#F5F5F5]">
                  {((data?.storage?.totalBytes ?? 0) / (1024 * 1024)).toFixed(2)} MB
                </span>
              </div>
              <p className="text-[11px] text-[#737373] dark:text-[#8C8C8C] pt-2.5 border-t border-[#E5E5E5] dark:border-[#2C2C2C] leading-relaxed">
                Sem cotas artificiais limitantes. Armazenamento persistente no servidor local.
              </p>
            </CardContent>
          </Card>

          {/* Últimas Atividades */}
          <Card className="bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2C2C2C]">
            <CardHeader className="pb-3 p-5 border-b border-[#E5E5E5] dark:border-[#2C2C2C]">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Últimas Atividades</CardTitle>
                <div className="h-8 w-8 rounded-xl bg-[var(--primary)]/10 text-[var(--button-outline-fg,var(--primary))] dark:bg-[#242424] dark:text-[#D0D0D0] dark:border dark:border-[#333333] flex items-center justify-center">
                  <Activity className="h-4 w-4" />
                </div>
              </div>
              <CardDescription>Registro auditado de eventos</CardDescription>
            </CardHeader>
            <CardContent className="p-5">
              {data?.recentActivity && data.recentActivity.length > 0 ? (
                <div className="space-y-3 text-xs">
                  {data.recentActivity.map((act) => (
                    <div key={act.id} className="flex items-start gap-2.5">
                      <div className="h-2 w-2 rounded-full bg-[var(--primary)] mt-1.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[#171717] dark:text-[#F5F5F5] truncate">
                          {formatActivityAction(act.action)}
                        </p>
                        <p className="text-[#737373] dark:text-[#8C8C8C] text-[10px]">
                          {formatDate(act.createdAt, data.timezone)} às{" "}
                          {formatTime(act.createdAt, data.timezone)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#737373] dark:text-[#8C8C8C] py-4 text-center">
                  Nenhuma atividade registrada recentemente.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
