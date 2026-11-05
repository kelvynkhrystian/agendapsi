"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
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
  Calendar,
  Users,
  Clock,
  DollarSign,
  AlertCircle,
  Video,
  Plus,
  ArrowRight,
  HardDrive,
  FileCheck2,
  CalendarCheck,
  TrendingUp,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  Activity,
  UserCheck,
  FolderLock,
  Globe,
} from "lucide-react";

interface DashboardData {
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
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
      <div className="space-y-8 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-slate-200 dark:bg-[#222226] rounded-xl" />
            <div className="h-4 w-96 bg-slate-200 dark:bg-[#222226] rounded-lg" />
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-36 bg-slate-200 dark:bg-[#222226] rounded-xl" />
            <div className="h-10 w-28 bg-slate-200 dark:bg-[#222226] rounded-xl" />
          </div>
        </div>

        {/* KPI Skeleton Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-32 bg-white dark:bg-[#19191C] border border-[#E2E4E8] dark:border-[#303034] rounded-2xl p-5"
            />
          ))}
        </div>

        {/* Content Skeleton Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-white dark:bg-[#19191C] border border-[#E2E4E8] dark:border-[#303034] rounded-2xl" />
          <div className="h-96 bg-white dark:bg-[#19191C] border border-[#E2E4E8] dark:border-[#303034] rounded-2xl" />
        </div>
      </div>
    );
  }

  const todayCount = data?.todayAppointments?.length ?? 0;

  return (
    <div className="space-y-8">
      {/* ================= 1. PAGE HEADER & QUICK ACTIONS ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E2E4E8] dark:border-[#303034]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-[#111827] dark:text-[#F5F5F5]">
              Painel do Consultório
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Ao Vivo
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#4B5563] dark:text-[#A3A3AD] leading-relaxed">
            Visão geral em tempo real dos agendamentos, pacientes e finanças.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/admin/agenda">
            <Button size="md" className="gap-2 shadow-xs">
              <Plus className="h-4 w-4" />
              <span>Novo Agendamento</span>
            </Button>
          </Link>
          <Link href="/admin/pacientes">
            <Button variant="outline" size="md" className="gap-2 shadow-xs">
              <Users className="h-4 w-4 text-[var(--primary)]" />
              <span>Pacientes</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* ================= 2. KPI STATS CARDS ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Atendimentos Hoje */}
        <Card className="hover:border-[var(--primary)]/50 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-5">
            <CardTitle className="text-xs sm:text-sm font-medium text-[#4B5563] dark:text-[#A3A3AD]">
              Atendimentos Hoje
            </CardTitle>
            <div className="h-9 w-9 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
              <CalendarCheck className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-[#111827] dark:text-[#F5F5F5]">
              {todayCount}
            </div>
            <p className="text-xs text-[#6B7280] dark:text-[#A3A3AD] mt-1.5 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
              {todayCount === 1 ? "1 consulta marcada para hoje" : `${todayCount} consultas marcadas para hoje`}
            </p>
          </CardContent>
        </Card>

        {/* Pacientes Cadastrados */}
        <Card className="hover:border-[var(--primary)]/50 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-5">
            <CardTitle className="text-xs sm:text-sm font-medium text-[#4B5563] dark:text-[#A3A3AD]">
              Pacientes Cadastrados
            </CardTitle>
            <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-[#111827] dark:text-[#F5F5F5]">
              {data?.activePatientsCount ?? 0}
            </div>
            <p className="text-xs text-[#6B7280] dark:text-[#A3A3AD] mt-1.5 flex items-center gap-1.5">
              {data?.pendingApprovalsCount && data.pendingApprovalsCount > 0 ? (
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  {data.pendingApprovalsCount} alteração(ões) pendente(s)
                </span>
              ) : (
                <span>Base ativa e atualizada</span>
              )}
            </p>
          </CardContent>
        </Card>

        {/* Receita deste Mês */}
        <Card className="hover:border-[var(--primary)]/50 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-5">
            <CardTitle className="text-xs sm:text-sm font-medium text-[#4B5563] dark:text-[#A3A3AD]">
              Receita deste Mês
            </CardTitle>
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-[#111827] dark:text-[#F5F5F5]">
              {formatBRL(data?.revenueMonth?.totalCombinedCents ?? 0)}
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              {data?.revenueMonth?.simulatedCents ? (
                <Badge variant="simulated">
                  {formatBRL(data.revenueMonth.simulatedCents)} Simulado
                </Badge>
              ) : (
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  {formatBRL(data?.revenueMonth?.realCents ?? 0)} registrado
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recebimentos Pendentes */}
        <Card className="hover:border-[var(--primary)]/50 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-5">
            <CardTitle className="text-xs sm:text-sm font-medium text-[#4B5563] dark:text-[#A3A3AD]">
              Recebimentos Pendentes
            </CardTitle>
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-[#111827] dark:text-[#F5F5F5]">
              {formatBRL(data?.pendingBalanceCents ?? 0)}
            </div>
            <p className="text-xs text-[#6B7280] dark:text-[#A3A3AD] mt-1.5">
              {data?.pendingPaymentsCount ?? 0} pagamento(s) a confirmar
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ================= 3. MAIN GRID: AGENDA DE HOJE & PRÓXIMAS ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agenda de Hoje (2 Colunas) */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 sm:p-6 border-b border-[#E2E4E8] dark:border-[#303034]">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">Agenda de Hoje</CardTitle>
                  <Badge variant="default" size="sm">
                    {todayCount} {todayCount === 1 ? "sessão" : "sessões"}
                  </Badge>
                </div>
                <CardDescription className="mt-1">
                  {formatDate(new Date())} — Consultas marcadas para o dia
                </CardDescription>
              </div>

              <Link href="/admin/agenda">
                <Button variant="ghost" size="sm" className="text-xs gap-1.5 text-[var(--primary)] hover:text-[var(--primary)]">
                  <span>Ver Calendário Completo</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </CardHeader>

            <CardContent className="p-5 sm:p-6">
              {data?.todayAppointments && data.todayAppointments.length > 0 ? (
                <div className="divide-y divide-[#E2E4E8] dark:divide-[#303034]">
                  {data.todayAppointments.map((appt) => {
                    const isConfirmed = appt.status === "CONFIRMED";
                    const isCompleted = appt.status === "COMPLETED";

                    return (
                      <div
                        key={appt.id}
                        className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 hover:bg-[#F3F4F6]/50 dark:hover:bg-[#222226]/40 p-2.5 rounded-xl transition-colors"
                      >
                        <div className="flex items-start gap-3.5 min-w-0">
                          <div className="px-3 py-2 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] font-mono text-sm font-bold text-center shrink-0 border border-[var(--primary)]/20 shadow-2xs">
                            {formatTime(appt.startAt)}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-heading font-semibold text-sm text-[#111827] dark:text-[#F5F5F5] truncate">
                              {appt.patient.fullName}
                            </h4>
                            <p className="text-xs text-[#4B5563] dark:text-[#A3A3AD] mt-0.5">
                              {appt.service.name} • {appt.service.durationMinutes} min •{" "}
                              <span className="font-medium text-[#111827] dark:text-[#F5F5F5]">
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
                              <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs rounded-xl shadow-2xs border-[var(--primary)]/30 text-[var(--primary)] hover:bg-[var(--primary)]/10">
                                <Video className="h-3.5 w-3.5" />
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
                  className="py-10"
                />
              )}
            </CardContent>
          </Card>

          {/* Próximas Consultas */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between p-5 sm:p-6 border-b border-[#E2E4E8] dark:border-[#303034]">
              <div>
                <CardTitle className="text-base sm:text-lg">Próximos Atendimentos</CardTitle>
                <CardDescription className="mt-0.5">
                  Próximas sessões confirmadas na semana
                </CardDescription>
              </div>
              <Link href="/admin/agenda">
                <Button variant="ghost" size="sm" className="text-xs text-[var(--primary)]">
                  <span>Ver Todos</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-5 sm:p-6">
              {data?.nextAppointments && data.nextAppointments.length > 0 ? (
                <div className="divide-y divide-[#E2E4E8] dark:divide-[#303034]">
                  {data.nextAppointments.map((appt) => (
                    <div
                      key={appt.id}
                      className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between text-sm hover:bg-[#F3F4F6]/50 dark:hover:bg-[#222226]/40 p-2 rounded-xl transition-colors"
                    >
                      <div className="min-w-0">
                        <span className="font-heading font-semibold text-[#111827] dark:text-[#F5F5F5] block truncate">
                          {appt.patient.fullName}
                        </span>
                        <span className="text-xs text-[#6B7280] dark:text-[#A3A3AD] block mt-0.5">
                          {appt.service.name} • {appt.service.durationMinutes} min
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-heading font-semibold text-[#111827] dark:text-[#F5F5F5] block">
                          {formatDate(appt.startAt)} às {formatTime(appt.startAt)}
                        </span>
                        <span className="text-[11px] text-[#6B7280] dark:text-[#A3A3AD]">
                          {appt.modality === "ONLINE" ? "Teleconsulta" : "Presencial"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#6B7280] dark:text-[#A3A3AD] py-6 text-center">
                  Nenhum atendimento futuro cadastrado para os próximos dias.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ================= 4. SIDEBAR WIDGETS ================= */}
        <div className="space-y-6">
          {/* Quick Actions Card */}
          <Card>
            <CardHeader className="pb-3 p-5 border-b border-[#E2E4E8] dark:border-[#303034]">
              <CardTitle className="text-base">Ações Rápidas</CardTitle>
              <CardDescription>Atalhos operacionais diários</CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-2.5">
              <Link href="/admin/agenda" className="block">
                <Button variant="outline" className="w-full justify-start gap-2.5 text-xs rounded-xl h-10 shadow-2xs">
                  <Calendar className="h-4 w-4 text-[var(--primary)]" />
                  <span>Gerenciar Grade & Agenda</span>
                </Button>
              </Link>
              <Link href="/admin/pacientes" className="block">
                <Button variant="outline" className="w-full justify-start gap-2.5 text-xs rounded-xl h-10 shadow-2xs">
                  <Users className="h-4 w-4 text-blue-500" />
                  <span>Cadastrar Novo Paciente</span>
                </Button>
              </Link>
              <Link href="/admin/financeiro" className="block">
                <Button variant="outline" className="w-full justify-start gap-2.5 text-xs rounded-xl h-10 shadow-2xs">
                  <DollarSign className="h-4 w-4 text-emerald-500" />
                  <span>Confirmar Recebimentos</span>
                </Button>
              </Link>
              <Link href="/" target="_blank" className="block">
                <Button variant="outline" className="w-full justify-start gap-2.5 text-xs rounded-xl h-10 shadow-2xs">
                  <Globe className="h-4 w-4 text-purple-500" />
                  <span>Visualizar MiniSite Público</span>
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Storage Widget */}
          <Card>
            <CardHeader className="pb-3 p-5 border-b border-[#E2E4E8] dark:border-[#303034]">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Armazenamento Local</CardTitle>
                <div className="h-7 w-7 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
                  <HardDrive className="h-4 w-4" />
                </div>
              </div>
              <CardDescription>Documentos e prontuários protegidos</CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-[#6B7280] dark:text-[#A3A3AD]">Total de Arquivos:</span>
                <span className="font-heading font-semibold text-[#111827] dark:text-[#F5F5F5]">
                  {data?.storage?.fileCount ?? 0}
                </span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-[#6B7280] dark:text-[#A3A3AD]">Espaço Ocupado:</span>
                <span className="font-heading font-semibold text-[#111827] dark:text-[#F5F5F5]">
                  {((data?.storage?.totalBytes ?? 0) / (1024 * 1024)).toFixed(2)} MB
                </span>
              </div>
              <p className="text-[11px] text-[#6B7280] dark:text-[#A3A3AD] pt-2.5 border-t border-[#E2E4E8] dark:border-[#303034] leading-relaxed">
                Sem cotas artificiais limitantes. Armazenamento persistente no servidor local.
              </p>
            </CardContent>
          </Card>

          {/* Atividades Recentes */}
          <Card>
            <CardHeader className="pb-3 p-5 border-b border-[#E2E4E8] dark:border-[#303034]">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Últimas Atividades</CardTitle>
                <div className="h-7 w-7 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
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
                        <p className="font-medium text-[#111827] dark:text-[#F5F5F5] truncate">
                          {formatActivityAction(act.action)}
                        </p>
                        <p className="text-[#6B7280] dark:text-[#A3A3AD] text-[10px]">
                          {formatDate(act.createdAt)} às {formatTime(act.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#6B7280] dark:text-[#A3A3AD] py-4 text-center">
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
