"use client";

import React, { useEffect, useState } from "react";
import { formatBRL, formatDate, formatPaymentStatus, formatPaymentMethod } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import {
  MiniSparkline,
  PaymentMethodMetric,
  PaymentMethodsDonutChart,
  PaymentStatusMetric,
  RevenueSeriesPoint,
  StemPerformanceChart,
} from "@/components/analytics/financial-charts";
import {
  DollarSign,
  Clock,
  CheckCircle2,
  RefreshCw,
  Filter,
  RotateCcw,
  Receipt,
  TrendingUp,
} from "pulsoicon-react";

interface PaymentItem {
  id: string;
  amountCents: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "REFUNDED";
  method: "ONLINE_SIMULATED" | "IN_PERSON" | "WHATSAPP_ARRANGED";
  isSimulated: boolean;
  confirmedAt?: string;
  createdAt: string;
  patient: {
    fullName: string;
    email: string;
    phone: string;
  };
  appointment?: {
    startAt: string;
    service: { name: string };
  };
  package?: {
    title: string;
  };
  refunds: Array<{
    amountCents: number;
    reason?: string;
    refundedAt: string;
  }>;
}

interface FinanceAnalytics {
  refundedCents: number;
  rejectedCancelledCents: number;
  totalCount: number;
  approvedCount: number;
  pendingCount: number;
  refundedCount: number;
  approvalRate: number;
  byMethod: PaymentMethodMetric[];
  byStatus?: PaymentStatusMetric[];
  series: {
    d14: RevenueSeriesPoint[];
    d30: RevenueSeriesPoint[];
    m6: RevenueSeriesPoint[];
  };
}

export default function AdminFinancePage() {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [timezone, setTimezone] = useState<string>("America/Sao_Paulo");
  const [totals, setTotals] = useState({
    realApprovedCents: 0,
    simulatedApprovedCents: 0,
    pendingCents: 0,
  });
  const [analytics, setAnalytics] = useState<FinanceAnalytics>({
    refundedCents: 0,
    rejectedCancelledCents: 0,
    totalCount: 0,
    approvedCount: 0,
    pendingCount: 0,
    refundedCount: 0,
    approvalRate: 0,
    byMethod: [],
    byStatus: [],
    series: { d14: [], d30: [], m6: [] },
  });
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);

  // Modal Estorno
  const [refundPayment, setRefundPayment] = useState<PaymentItem | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [isRefunding, setIsRefunding] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchPayments = () => {
    setIsLoading(true);
    let url = "/api/payments?";
    if (statusFilter !== "ALL") url += `status=${statusFilter}&`;
    if (methodFilter !== "ALL") url += `method=${methodFilter}&`;

    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (d.timezone) setTimezone(d.timezone);
        setPayments(Array.isArray(d.payments) ? d.payments : []);
        if (d.totals) setTotals(d.totals);
        if (d.analytics) setAnalytics(d.analytics);
        setIsLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchPayments();
  }, [statusFilter, methodFilter]);

  // Confirmação manual de pagamento (Presencial ou WhatsApp)
  const handleConfirmManual = async (id: string) => {
    try {
      const res = await fetch(`/api/payments/${id}/confirm-manual`, {
        method: "POST",
      });
      if (res.ok) {
        setActionMessage("Pagamento confirmado manualmente com sucesso!");
        fetchPayments();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Processamento de Estorno
  const handleProcessRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundPayment) return;
    setIsRefunding(true);

    try {
      const res = await fetch(`/api/payments/${refundPayment.id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: refundReason }),
      });

      if (res.ok) {
        setRefundPayment(null);
        setRefundReason("");
        setIsRefunding(false);
        setActionMessage("Estorno processado com sucesso!");
        fetchPayments();
      } else {
        setIsRefunding(false);
      }
    } catch (e) {
      console.error(e);
      setIsRefunding(false);
    }
  };

  const sparkReal = (analytics.series.d14 || []).slice(-7).map((p) => p.realCents);
  const sparkSim = (analytics.series.d14 || []).slice(-7).map((p) => p.simulatedCents);
  const sparkPend = (analytics.series.d14 || []).slice(-7).map((p) => p.pendingCents);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-4 border-b border-[#E5E5E5] dark:border-[#2C2C2C]">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-[#171717] dark:text-[#F5F5F5]">
            Gestão Financeira
          </h1>
          <p className="text-xs sm:text-sm text-[#525252] dark:text-[#A6A6A6] mt-1">
            Controle de cobranças, evolução de recebimentos, estornos e separação clara de lançamentos simulados.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchPayments}
          className="w-full sm:w-auto gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-current ${isLoading ? "animate-spin" : ""}`} />
          <span>Atualizar Dados</span>
        </Button>
      </div>

      {actionMessage && <Alert variant="success">{actionMessage}</Alert>}

      {/* 4 Cards Bento Harmonizados — Destaque Hero Laranja + 3 Cards Neutros com Sparklines */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Receita Real Confirmada (Card Hero Laranja/Tema) */}
        <div
          className="relative overflow-hidden rounded-2xl p-3.5 sm:p-5 bg-[var(--button-bg,#CA4C0A)] text-white shadow-[0_14px_34px_-12px_rgba(234,88,12,0.45)] flex flex-col justify-between min-h-[120px] sm:min-h-[146px]"
          style={{
            background:
              "linear-gradient(135deg, var(--button-bg, #CA4C0A) 0%, var(--primary, #EA580C) 100%)",
          }}
        >
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/15 blur-xl"
            aria-hidden="true"
          />
          <div className="relative z-10 flex items-center justify-between gap-1.5 sm:gap-2">
            <span className="text-[11px] sm:text-xs font-medium text-white/95 leading-tight">
              Receita Real Confirmada
            </span>
            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
              <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
            </div>
          </div>

          <div className="relative z-10 mt-2 flex items-end justify-between gap-2 sm:gap-3">
            <div className="min-w-0">
              <div className="font-heading text-lg sm:text-2xl lg:text-3xl font-bold tracking-tight tabular-nums text-white whitespace-nowrap">
                {formatBRL(totals.realApprovedCents)}
              </div>
              <p className="text-[10px] sm:text-[11px] text-white/90 mt-1 sm:mt-1.5 font-medium leading-snug">
                Pagamentos presenciais e WhatsApp
              </p>
            </div>
            <MiniSparkline values={sparkReal} variant="on-accent" className="hidden sm:block w-16" />
          </div>
        </div>

        {/* Recebimentos a Confirmar */}
        <Card className="bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2C2C2C] flex flex-col justify-between min-h-[120px] sm:min-h-[146px] p-3.5 sm:p-5">
          <div className="flex items-center justify-between gap-1.5 sm:gap-2">
            <span className="text-[11px] sm:text-xs font-medium text-[#525252] dark:text-[#A6A6A6] leading-tight">
              Recebimentos a Confirmar
            </span>
            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-xl bg-amber-500/10 text-amber-600 dark:bg-[#242424] dark:text-amber-400 dark:border dark:border-[#333333] flex items-center justify-center shrink-0">
              <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
          </div>

          <div className="mt-2 flex items-end justify-between gap-2 sm:gap-3">
            <div className="font-heading text-lg sm:text-2xl font-bold tracking-tight tabular-nums text-[#171717] dark:text-[#F5F5F5] whitespace-nowrap">
              {formatBRL(totals.pendingCents)}
            </div>
            <MiniSparkline values={sparkPend} variant="amber" className="hidden sm:block" />
          </div>

          <p className="text-[10px] sm:text-xs text-[#737373] dark:text-[#8C8C8C] mt-1.5 sm:mt-2 leading-snug">
            {analytics.pendingCount} lançamento(s) aguardando confirmação
          </p>
        </Card>

        {/* Receita Simulada */}
        <Card className="bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2C2C2C] flex flex-col justify-between min-h-[120px] sm:min-h-[146px] p-3.5 sm:p-5">
          <div className="flex items-start justify-between gap-1.5 sm:gap-2">
            <div className="flex flex-wrap items-center gap-1 min-w-0">
              <span className="text-[11px] sm:text-xs font-medium text-[#525252] dark:text-[#A6A6A6] leading-tight">
                Receita Simulada
              </span>
              <Badge variant="simulated" size="sm" className="text-[9px] px-1.5 py-0">
                SIMULADO
              </Badge>
            </div>
            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-xl bg-[var(--primary)]/10 text-[var(--button-outline-fg,var(--primary))] dark:bg-[#242424] dark:text-[#D0D0D0] dark:border dark:border-[#333333] flex items-center justify-center shrink-0">
              <Receipt className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
          </div>

          <div className="mt-2 flex items-end justify-between gap-2 sm:gap-3">
            <div className="font-heading text-lg sm:text-2xl font-bold tracking-tight tabular-nums text-[#171717] dark:text-[#F5F5F5] whitespace-nowrap">
              {formatBRL(totals.simulatedApprovedCents)}
            </div>
            <MiniSparkline values={sparkSim} variant="primary" className="hidden sm:block" />
          </div>

          <p className="text-[10px] sm:text-xs text-[#737373] dark:text-[#8C8C8C] mt-1.5 sm:mt-2 leading-snug">
            Ambiente de testes isolado
          </p>
        </Card>

        {/* Taxa de Aprovação & Estornos */}
        <Card className="bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2C2C2C] flex flex-col justify-between min-h-[120px] sm:min-h-[146px] p-3.5 sm:p-5">
          <div className="flex items-center justify-between gap-1.5 sm:gap-2">
            <span className="text-[11px] sm:text-xs font-medium text-[#525252] dark:text-[#A6A6A6] leading-tight">
              Efetivação &amp; Estornos
            </span>
            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-[#242424] dark:text-emerald-400 dark:border dark:border-[#333333] flex items-center justify-center shrink-0">
              <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="font-heading text-xl sm:text-3xl font-bold tracking-tight tabular-nums text-[#171717] dark:text-[#F5F5F5]">
              {analytics.approvalRate}%
            </span>
            <span className="text-[11px] sm:text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              {analytics.approvedCount} aprov.
            </span>
          </div>

          <p className="text-[10px] sm:text-xs text-[#737373] dark:text-[#8C8C8C] mt-1.5 sm:mt-2 tabular-nums leading-snug">
            {analytics.refundedCount} estorno(s) · {formatBRL(analytics.refundedCents)}
          </p>
        </Card>
      </div>

      {/* Gráficos Financeiros (Evolução Temporal + Distribuição por Meio/Status) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        <div className="lg:col-span-7 xl:col-span-8">
          <StemPerformanceChart
            title="Evolução Financeira"
            subtitle="Receitas confirmadas, simuladas e pendentes nos últimos períodos"
            series={analytics.series}
            showAppointmentsCount={false}
          />
        </div>

        <div className="lg:col-span-5 xl:col-span-4">
          <PaymentMethodsDonutChart
            byMethod={analytics.byMethod}
            byStatus={analytics.byStatus}
            approvalRate={analytics.approvalRate}
            totalCount={analytics.totalCount}
            className="h-full"
          />
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 p-3.5 bg-white dark:bg-[#141414] rounded-xl border border-[#E5E5E5] dark:border-[#2C2C2C]">
        <div className="hidden sm:flex items-center">
          <Filter className="h-4 w-4 text-[#737373] dark:text-[#A6A6A6]" />
        </div>
        <div className="grid grid-cols-1 sm:flex sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          <div className="flex items-center justify-between sm:justify-start gap-2">
            <span className="text-xs font-medium text-[#737373] dark:text-[#A6A6A6] shrink-0">Status:</span>
            <select
              className="h-9 sm:h-10 flex-1 sm:flex-initial rounded-xl border border-[#E5E5E5] dark:border-[#2C2C2C] bg-white dark:bg-[#202020] px-3 text-xs text-[#171717] dark:text-[#F5F5F5] outline-none focus:ring-2 focus:ring-[var(--primary)]/30 cursor-pointer shadow-2xs"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">Todos os Status</option>
              <option value="APPROVED">Aprovados</option>
              <option value="PENDING">Pendentes</option>
              <option value="REFUNDED">Estornados</option>
              <option value="CANCELLED">Cancelados</option>
              <option value="REJECTED">Rejeitados</option>
            </select>
          </div>

          <div className="flex items-center justify-between sm:justify-start gap-2">
            <span className="text-xs font-medium text-[#737373] dark:text-[#A6A6A6] shrink-0">Método:</span>
            <select
              className="h-9 sm:h-10 flex-1 sm:flex-initial rounded-xl border border-[#E5E5E5] dark:border-[#2C2C2C] bg-white dark:bg-[#202020] px-3 text-xs text-[#171717] dark:text-[#F5F5F5] outline-none focus:ring-2 focus:ring-[var(--primary)]/30 cursor-pointer shadow-2xs"
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
            >
              <option value="ALL">Todos os Meios</option>
              <option value="ONLINE_SIMULATED">Online Simulado</option>
              <option value="IN_PERSON">Presencial</option>
              <option value="WHATSAPP_ARRANGED">Combinado WhatsApp</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela e Cards de Lançamentos */}
      <Card className="bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2C2C2C]">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-[#737373] animate-pulse">
              Carregando lançamentos financeiros...
            </div>
          ) : payments.length > 0 ? (
            <>
              {/* Visualização Mobile em Cards */}
              <div className="md:hidden divide-y divide-[#E5E5E5] dark:divide-[#2C2C2C]">
                {payments.map((p) => (
                  <div key={p.id} className="p-4 space-y-2.5 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-semibold text-sm block text-[#171717] dark:text-[#F5F5F5] truncate">
                          {p.patient.fullName}
                        </span>
                        <span className="text-[11px] text-[#737373] dark:text-[#A6A6A6]">
                          {p.patient.phone}
                        </span>
                      </div>
                      <span className="font-bold font-mono tabular-nums text-sm text-[#171717] dark:text-[#F5F5F5] shrink-0">
                        {formatBRL(p.amountCents)}
                      </span>
                    </div>

                    <div className="text-[#404040] dark:text-[#D0D0D0]">
                      {p.appointment ? (
                        <span>Consulta: {p.appointment.service.name}</span>
                      ) : p.package ? (
                        <span>Pacote: {p.package.title}</span>
                      ) : (
                        <span>Lançamento Geral</span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge
                          variant={
                            p.status === "APPROVED"
                              ? "success"
                              : p.status === "PENDING"
                              ? "warning"
                              : p.status === "REFUNDED"
                              ? "outline"
                              : "destructive"
                          }
                        >
                          {formatPaymentStatus(p.status)}
                        </Badge>
                        <span className="text-[11px] text-[#737373] dark:text-[#A6A6A6]">
                          {formatPaymentMethod(p.method)}
                        </span>
                        {p.isSimulated && (
                          <Badge variant="simulated" size="sm">
                            Simulado
                          </Badge>
                        )}
                      </div>
                      <span className="text-[11px] text-[#737373] dark:text-[#A6A6A6] tabular-nums">
                        {formatDate(p.createdAt, timezone)}
                      </span>
                    </div>

                    {(p.status === "PENDING" || p.status === "APPROVED") && (
                      <div className="pt-1.5">
                        {p.status === "PENDING" && (
                          <Button
                            variant="primary"
                            size="sm"
                            className="w-full h-9 text-xs gap-1.5"
                            onClick={() => handleConfirmManual(p.id)}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 text-current" />
                            <span>Confirmar Pagamento</span>
                          </Button>
                        )}

                        {p.status === "APPROVED" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full h-9 text-xs gap-1.5 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:border-red-900/50 dark:hover:bg-red-950/40"
                            onClick={() => setRefundPayment(p)}
                          >
                            <RotateCcw className="h-3.5 w-3.5 text-current" />
                            <span>Estornar</span>
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Visualização Desktop em Tabela */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8F8F8] dark:bg-[#141414] border-b border-[#E5E5E5] dark:border-[#2C2C2C] text-[#737373] dark:text-[#A6A6A6]">
                    <tr>
                      <th className="py-3.5 px-4 sm:px-6 font-semibold">Paciente</th>
                      <th className="py-3.5 px-4 sm:px-6 font-semibold">Referência</th>
                      <th className="py-3.5 px-4 sm:px-6 font-semibold">Valor</th>
                      <th className="py-3.5 px-4 sm:px-6 font-semibold">Método</th>
                      <th className="py-3.5 px-4 sm:px-6 font-semibold">Status</th>
                      <th className="py-3.5 px-4 sm:px-6 font-semibold">Data</th>
                      <th className="py-3.5 px-4 sm:px-6 font-semibold text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E5E5] dark:divide-[#2C2C2C]">
                    {payments.map((p) => (
                      <tr key={p.id} className="hover:bg-[#F8F8F8] dark:hover:bg-[#242424]/50 transition-colors">
                        <td className="py-3.5 px-4 sm:px-6">
                          <span className="font-semibold block text-[#171717] dark:text-[#F5F5F5]">{p.patient.fullName}</span>
                          <span className="text-[11px] text-[#737373] dark:text-[#A6A6A6]">{p.patient.phone}</span>
                        </td>

                        <td className="py-3.5 px-4 sm:px-6 text-[#171717] dark:text-[#F5F5F5]">
                          {p.appointment ? (
                            <span>Consulta: {p.appointment.service.name}</span>
                          ) : p.package ? (
                            <span>Pacote: {p.package.title}</span>
                          ) : (
                            <span>Lançamento Geral</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 sm:px-6 font-bold font-mono tabular-nums text-sm text-[#171717] dark:text-[#F5F5F5]">
                          {formatBRL(p.amountCents)}
                        </td>

                        <td className="py-3.5 px-4 sm:px-6">
                          <span>{formatPaymentMethod(p.method)}</span>
                          {p.isSimulated && (
                            <Badge variant="simulated" size="sm" className="ml-1.5">
                              Simulado
                            </Badge>
                          )}
                        </td>

                        <td className="py-3.5 px-4 sm:px-6">
                          <Badge
                            variant={
                              p.status === "APPROVED"
                                ? "success"
                                : p.status === "PENDING"
                                ? "warning"
                                : p.status === "REFUNDED"
                                ? "outline"
                                : "destructive"
                            }
                          >
                            {formatPaymentStatus(p.status)}
                          </Badge>
                        </td>

                        <td className="py-3.5 px-4 sm:px-6 text-[#737373] dark:text-[#A6A6A6] tabular-nums">
                          {formatDate(p.createdAt, timezone)}
                        </td>

                        <td className="py-3.5 px-4 sm:px-6 text-right space-x-2">
                          {p.status === "PENDING" && (
                            <Button
                              variant="primary"
                              size="sm"
                              className="h-8 text-xs gap-1"
                              onClick={() => handleConfirmManual(p.id)}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 text-current" />
                              <span>Confirmar Pagamento</span>
                            </Button>
                          )}

                          {p.status === "APPROVED" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:border-red-900/50 dark:hover:bg-red-950/40"
                              onClick={() => setRefundPayment(p)}
                            >
                              <RotateCcw className="h-3.5 w-3.5 text-current" />
                              <span>Estornar</span>
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-xs text-[#737373] dark:text-[#A6A6A6]">
              Nenhum registro financeiro encontrado com os filtros selecionados.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Estorno */}
      {refundPayment && (
        <Modal
          isOpen={!!refundPayment}
          onClose={() => setRefundPayment(null)}
          title="Processar Estorno de Pagamento"
          description={`Valor original: ${formatBRL(refundPayment.amountCents)} — Paciente: ${refundPayment.patient.fullName}`}
        >
          <form onSubmit={handleProcessRefund} className="space-y-4 text-xs">
            <Alert variant="warning" title="Atenção ao Estorno">
              Esta ação registrará o cancelamento financeiro e atualizará o status do pagamento para Estornado.
            </Alert>

            <Input
              label="Motivo do Estorno"
              placeholder="Ex: Cancelamento de sessão solicitado pelo paciente"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              required
            />

            <div className="grid grid-cols-2 sm:flex sm:justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setRefundPayment(null)} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button type="submit" variant="destructive" isLoading={isRefunding} className="w-full sm:w-auto">
                Confirmar Estorno
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
