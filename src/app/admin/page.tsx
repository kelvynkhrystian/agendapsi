"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { formatBRL, formatTime, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
          throw new Error("Erro de autenticacao");
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
      <div className="space-y-6">
        <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const todayCount = data?.todayAppointments?.length ?? 0;

  return (
    <div className="space-y-8">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Painel do Consultório
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Visão geral em tempo real dos agendamentos, pacientes e finanças.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/agenda">
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              <span>Novo Agendamento</span>
            </Button>
          </Link>
          <Link href="/admin/pacientes">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Users className="h-4 w-4" />
              <span>Pacientes</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Atendimentos Hoje */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Atendimentos Hoje
            </CardTitle>
            <Calendar className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayCount}</div>
            <p className="text-xs text-slate-500 mt-1">
              {todayCount === 1 ? "1 consulta agendada" : `${todayCount} consultas agendadas`}
            </p>
          </CardContent>
        </Card>

        {/* Pacientes Ativos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Pacientes Cadastrados
            </CardTitle>
            <Users className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.activePatientsCount ?? 0}</div>
            <p className="text-xs text-slate-500 mt-1">
              {data?.pendingApprovalsCount ?? 0} alteração(ões) cadastrais pendentes
            </p>
          </CardContent>
        </Card>

        {/* Pagamentos Pendentes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Recebimentos Pendentes
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatBRL(data?.pendingBalanceCents ?? 0)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {data?.pendingPaymentsCount ?? 0} pagamento(s) a confirmar
            </p>
          </CardContent>
        </Card>

        {/* Receita do Mês */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Receita deste Mês
            </CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatBRL(data?.revenueMonth?.totalCombinedCents ?? 0)}
            </div>
            <div className="flex items-center gap-2 mt-1">
              {data?.revenueMonth?.simulatedCents ? (
                <Badge variant="simulated">
                  {formatBRL(data.revenueMonth.simulatedCents)} Simulado
                </Badge>
              ) : (
                <span className="text-xs text-emerald-600">
                  {formatBRL(data?.revenueMonth?.realCents ?? 0)} registrado
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Agenda de Hoje & Próximas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agenda de Hoje */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Agenda de Hoje</CardTitle>
                <CardDescription>
                  {formatDate(new Date())} — Consultas marcadas para o dia
                </CardDescription>
              </div>
              <Link href="/admin/agenda">
                <Button variant="ghost" size="sm" className="text-xs gap-1">
                  <span>Ver Calendário Completo</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </CardHeader>

            <CardContent>
              {data?.todayAppointments && data.todayAppointments.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.todayAppointments.map((appt) => (
                    <div
                      key={appt.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="px-2.5 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-mono text-sm font-semibold text-center shrink-0">
                          {formatTime(appt.startAt)}
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm">
                            {appt.patient.fullName}
                          </h4>
                          <p className="text-xs text-slate-500">
                            {appt.service.name} • {appt.service.durationMinutes} min
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <Badge
                          variant={
                            appt.status === "CONFIRMED"
                              ? "success"
                              : appt.status === "COMPLETED"
                              ? "default"
                              : "warning"
                          }
                        >
                          {appt.status}
                        </Badge>

                        {appt.modality !== "PRESENTIAL" && appt.meetingUrlSnapshot && (
                          <Link href={appt.meetingUrlSnapshot} target="_blank">
                            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
                              <Video className="h-3.5 w-3.5 text-teal-600" />
                              <span>Entrar na Sessão</span>
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-500 space-y-2">
                  <FileCheck2 className="h-8 w-8 mx-auto text-slate-400" />
                  <p className="text-sm font-medium">Nenhum atendimento agendado para hoje.</p>
                  <p className="text-xs text-slate-400">
                    Aproveite para revisar prontuários ou planejar seus horários.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Próximas Consultas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Próximos Atendimentos</CardTitle>
              <CardDescription>Próximas sessões confirmadas na semana</CardDescription>
            </CardHeader>
            <CardContent>
              {data?.nextAppointments && data.nextAppointments.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.nextAppointments.map((appt) => (
                    <div
                      key={appt.id}
                      className="py-3 flex items-center justify-between text-sm"
                    >
                      <div>
                        <span className="font-semibold">{appt.patient.fullName}</span>
                        <span className="text-xs text-slate-500 block">
                          {appt.service.name}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-medium block">
                          {formatDate(appt.startAt)} às {formatTime(appt.startAt)}
                        </span>
                        <span className="text-xs text-slate-400">
                          {appt.modality === "ONLINE" ? "Teleconsulta" : "Presencial"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 py-4 text-center">
                  Nenhum atendimento futuro cadastrado.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Widgets: Armazenamento e Auditoria */}
        <div className="space-y-6">
          {/* Storage Widget */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Armazenamento Local</CardTitle>
                <HardDrive className="h-4 w-4 text-slate-500" />
              </div>
              <CardDescription>Documentos e prontuários protegidos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Total de Arquivos:</span>
                <span className="font-semibold">{data?.storage?.fileCount ?? 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Espaço Ocupado:</span>
                <span className="font-semibold">
                  {((data?.storage?.totalBytes ?? 0) / (1024 * 1024)).toFixed(2)} MB
                </span>
              </div>
              <p className="text-xs text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                Sem cotas artificiais limitantes. Armazenamento persistente seguro.
              </p>
            </CardContent>
          </Card>

          {/* Atividades Recentes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Últimas Atividades</CardTitle>
              <CardDescription>Registro auditado de eventos</CardDescription>
            </CardHeader>
            <CardContent>
              {data?.recentActivity && data.recentActivity.length > 0 ? (
                <div className="space-y-3 text-xs">
                  {data.recentActivity.map((act) => (
                    <div key={act.id} className="flex items-start gap-2">
                      <div className="h-2 w-2 rounded-full bg-teal-500 mt-1 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 dark:text-slate-200 truncate">
                          {act.action}
                        </p>
                        <p className="text-slate-400 text-[10px]">
                          {formatDate(act.createdAt)} às {formatTime(act.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 py-4 text-center">
                  Nenhuma atividade registrada ainda.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
