"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { formatDate, formatTime, formatAppointmentStatus } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Calendar,
  Clock,
  Video,
  Plus,
  AlertTriangle,
  FileCheck2,
  MapPin,
  Building2,
  User,
  ExternalLink,
  Info,
  CalendarCheck,
  FileText,
  Boxes,
  FolderLock,
  ArrowRight,
  ShieldCheck,
  HeartHandshake,
} from "lucide-react";

interface Appointment {
  id: string;
  startAt: string;
  endAt: string;
  modality: string;
  status: string;
  meetingUrlSnapshot?: string | null;
  isLateCancellation?: boolean;
  service: {
    name: string;
    durationMinutes: number;
    cancellationNoticeDays: number;
  };
  establishment?: {
    name: string;
    address: string | null;
    professionalName: string;
  };
}

export default function PatientAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cancellingAppt, setCancellingAppt] = useState<Appointment | null>(null);
  const [selectedInPersonAppt, setSelectedInPersonAppt] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchAppointments = () => {
    setIsLoading(true);
    fetch("/api/appointments")
      .then((r) => r.json())
      .then((d) => {
        setAppointments(Array.isArray(d) ? d : []);
        setIsLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const now = new Date();
  const upcomingAppointments = appointments.filter(
    (a) => new Date(a.startAt) >= now && a.status !== "CANCELLED" && a.status !== "LATE_CANCELLED"
  );
  const pastAppointments = appointments.filter(
    (a) => new Date(a.startAt) < now || a.status === "CANCELLED" || a.status === "LATE_CANCELLED"
  );

  const nextAppointment = upcomingAppointments[0] || null;

  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingAppt) return;
    setIsSubmitting(true);
    setCancelError(null);

    try {
      const res = await fetch(`/api/appointments/${cancellingAppt.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "CANCELLED",
          reason: cancelReason || "Cancelamento solicitado pelo paciente",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setCancelError(data.error || "Não foi possível cancelar o agendamento.");
        setIsSubmitting(false);
        return;
      }

      setCancellingAppt(null);
      setIsSubmitting(false);
      if (data.isLateCancellation) {
        setStatusMessage(
          `Consulta cancelada com sucesso. Atenção: cancelamentos com menos de ${data.noticeDaysRequired} dias de antecedência são registrados como cancelamento tardio conforme o contrato terapêutico.`
        );
      } else {
        setStatusMessage("Consulta cancelada com sucesso dentro do prazo estabelecido.");
      }
      fetchAppointments();
    } catch {
      setCancelError("Erro de comunicação com o servidor.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* ================= 1. WELCOME HEADER ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E2E4E8] dark:border-[#303034]">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-[#111827] dark:text-[#F5F5F5]">
            Minhas Consultas
          </h1>
          <p className="text-xs sm:text-sm text-[#4B5563] dark:text-[#A3A3AD] leading-relaxed">
            Acompanhe suas sessões presenciais ou online, confira a localização e acesse a teleconsulta.
          </p>
        </div>

        <Link href="/agendar">
          <Button size="md" className="gap-2 shadow-xs">
            <Plus className="h-4 w-4" />
            <span>Agendar Nova Consulta</span>
          </Button>
        </Link>
      </div>

      {statusMessage && <Alert variant="info">{statusMessage}</Alert>}

      {/* ================= 2. NEXT APPOINTMENT HIGHLIGHT (SE HOUVER) ================= */}
      {nextAppointment && !isLoading && (
        <Card className="border-[var(--primary)]/30 bg-gradient-to-br from-white via-white to-[var(--primary)]/5 dark:from-[#19191C] dark:via-[#19191C] dark:to-[var(--primary)]/10 shadow-sm">
          <CardHeader className="p-5 sm:p-6 pb-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-heading font-semibold bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20">
                <CalendarCheck className="h-3.5 w-3.5" />
                Seu Próximo Atendimento
              </span>
              <Badge variant={nextAppointment.status === "CONFIRMED" ? "success" : "warning"}>
                {formatAppointmentStatus(nextAppointment.status)}
              </Badge>
            </div>
            <CardTitle className="text-lg sm:text-xl font-bold mt-2">
              {nextAppointment.service.name}
            </CardTitle>
            <CardDescription>
              {nextAppointment.modality === "PRESENTIAL" ? "Atendimento Presencial no Consultório" : "Teleconsulta Online Criptografada"} • {nextAppointment.service.durationMinutes} minutos
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5 sm:p-6 pt-2 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-[#F8F9FA] dark:bg-[#141416] border border-[#E2E4E8] dark:border-[#303034] text-xs">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[#6B7280] dark:text-[#A3A3AD] block text-[11px]">Data</span>
                  <span className="font-heading font-semibold text-sm text-[#111827] dark:text-[#F5F5F5]">
                    {formatDate(nextAppointment.startAt)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[#6B7280] dark:text-[#A3A3AD] block text-[11px]">Horário</span>
                  <span className="font-mono font-semibold text-sm text-[#111827] dark:text-[#F5F5F5]">
                    {formatTime(nextAppointment.startAt)} às {formatTime(nextAppointment.endAt)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              {nextAppointment.modality === "PRESENTIAL" ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedInPersonAppt(nextAppointment)}
                  className="gap-2 text-xs border-[var(--primary)]/30 text-[var(--primary)] hover:bg-[var(--primary)]/10"
                >
                  <Info className="h-3.5 w-3.5" />
                  <span>Informações da consulta</span>
                </Button>
              ) : nextAppointment.meetingUrlSnapshot ? (
                <Link href={nextAppointment.meetingUrlSnapshot} target="_blank">
                  <Button size="sm" className="gap-2 text-xs shadow-xs">
                    <Video className="h-3.5 w-3.5" />
                    <span>Entrar na sala virtual</span>
                  </Button>
                </Link>
              ) : (
                <span className="text-xs text-[#6B7280] dark:text-[#A3A3AD] italic">
                  Link da sala sendo preparado pelo profissional
                </span>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCancellingAppt(nextAppointment)}
                className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
              >
                Cancelar Consulta
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ================= 3. TODAS AS PRÓXIMAS CONSULTAS ================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold text-[#111827] dark:text-[#F5F5F5]">
            Próximos Atendimentos
          </h2>
          <span className="text-xs text-[#6B7280] dark:text-[#A3A3AD]">
            {upcomingAppointments.length} agendado(s)
          </span>
        </div>

        {isLoading ? (
          <div className="h-36 bg-slate-200 dark:bg-[#19191C] rounded-2xl animate-pulse" />
        ) : upcomingAppointments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingAppointments.map((appt) => {
              const isPresential = appt.modality === "PRESENTIAL";

              return (
                <Card key={appt.id} className="shadow-xs flex flex-col justify-between hover:border-[var(--primary)]/40 transition-all">
                  <div>
                    <CardHeader className="flex flex-row items-start justify-between pb-2 p-5">
                      <div>
                        <CardTitle className="text-base font-semibold">{appt.service.name}</CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                          {isPresential ? "Atendimento Presencial" : "Teleconsulta Online"} • {appt.service.durationMinutes} minutos
                        </CardDescription>
                      </div>
                      <Badge variant={appt.status === "CONFIRMED" ? "success" : "warning"}>
                        {formatAppointmentStatus(appt.status)}
                      </Badge>
                    </CardHeader>

                    <CardContent className="space-y-3 p-5 pt-0">
                      <div className="p-3 bg-[#F8F9FA] dark:bg-[#141416] border border-[#E2E4E8] dark:border-[#303034] rounded-xl space-y-1.5 text-xs">
                        <div className="flex items-center gap-2 font-heading font-semibold text-[#111827] dark:text-[#F5F5F5]">
                          <Calendar className="h-4 w-4 text-[var(--primary)]" />
                          <span>{formatDate(appt.startAt)}</span>
                        </div>
                        <div className="flex items-center gap-2 font-mono text-[#4B5563] dark:text-[#A3A3AD]">
                          <Clock className="h-4 w-4 text-[var(--primary)]" />
                          <span>
                            {formatTime(appt.startAt)} às {formatTime(appt.endAt)}
                          </span>
                        </div>
                        {isPresential && appt.establishment?.address && (
                          <div className="flex items-start gap-2 text-[#6B7280] dark:text-[#A3A3AD] pt-1.5 border-t border-[#E2E4E8] dark:border-[#303034]">
                            <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                            <span className="truncate">{appt.establishment.address}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </div>

                  {/* Actions Bar */}
                  <div className="p-5 pt-0">
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#E2E4E8] dark:border-[#303034]">
                      {isPresential ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedInPersonAppt(appt)}
                          className="gap-1.5 text-xs border-[var(--primary)]/30 text-[var(--primary)] hover:bg-[var(--primary)]/10"
                        >
                          <Info className="h-3.5 w-3.5 text-[var(--primary)]" />
                          <span>Informações da consulta</span>
                        </Button>
                      ) : appt.meetingUrlSnapshot ? (
                        <Link href={appt.meetingUrlSnapshot} target="_blank">
                          <Button size="sm" className="gap-1.5 text-xs shadow-xs">
                            <Video className="h-3.5 w-3.5" />
                            <span>Entrar na sala</span>
                          </Button>
                        </Link>
                      ) : (
                        <span className="text-xs text-[#6B7280] dark:text-[#A3A3AD] italic">Link sendo preparado</span>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCancellingAppt(appt)}
                        className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                      >
                        Cancelar Consulta
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={<Calendar className="h-6 w-6 text-[var(--primary)]" />}
            title="Você não possui consultas agendadas no momento"
            description="Escolha uma modalidade e horário com facilidade para iniciar ou continuar seu acompanhamento."
            action={{
              label: "Escolher Horário e Agendar",
              href: "/agendar",
              icon: <Plus className="h-4 w-4" />,
            }}
            className="py-10"
          />
        )}
      </div>

      {/* ================= 4. ATALHOS DO PACIENTE ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        <Link href="/paciente/anamnese" className="block">
          <Card className="p-5 hover:border-[var(--primary)]/50 hover:shadow-xs transition-all">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h4 className="font-heading font-semibold text-sm text-[#111827] dark:text-[#F5F5F5] truncate">
                  Ficha de Anamnese
                </h4>
                <p className="text-xs text-[#6B7280] dark:text-[#A3A3AD]">
                  Histórico de saúde e hábitos
                </p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/paciente/documentos" className="block">
          <Card className="p-5 hover:border-[var(--primary)]/50 hover:shadow-xs transition-all">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <FolderLock className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h4 className="font-heading font-semibold text-sm text-[#111827] dark:text-[#F5F5F5] truncate">
                  Documentos Liberados
                </h4>
                <p className="text-xs text-[#6B7280] dark:text-[#A3A3AD]">
                  Declarações e atestados
                </p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/paciente/financeiro" className="block">
          <Card className="p-5 hover:border-[var(--primary)]/50 hover:shadow-xs transition-all">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Boxes className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h4 className="font-heading font-semibold text-sm text-[#111827] dark:text-[#F5F5F5] truncate">
                  Pacotes & Faturas
                </h4>
                <p className="text-xs text-[#6B7280] dark:text-[#A3A3AD]">
                  Sessões contratadas e recibos
                </p>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* ================= 5. HISTÓRICO DE CONSULTAS PASSADAS ================= */}
      {pastAppointments.length > 0 && (
        <div className="space-y-4 pt-4">
          <h2 className="font-heading text-lg font-bold text-[#111827] dark:text-[#F5F5F5]">
            Histórico de Atendimentos
          </h2>
          <div className="divide-y divide-[#E2E4E8] dark:divide-[#303034] bg-white dark:bg-[#19191C] rounded-2xl border border-[#E2E4E8] dark:border-[#303034] p-4 sm:p-5">
            {pastAppointments.map((appt) => (
              <div
                key={appt.id}
                className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-[#F3F4F6]/50 dark:hover:bg-[#222226]/40 p-2 rounded-xl transition-colors"
              >
                <div>
                  <span className="font-heading font-semibold text-sm text-[#111827] dark:text-[#F5F5F5] block">
                    {appt.service.name}
                  </span>
                  <span className="text-[#6B7280] dark:text-[#A3A3AD] block mt-0.5">
                    {formatDate(appt.startAt)} às {formatTime(appt.startAt)} •{" "}
                    {appt.modality === "PRESENTIAL" ? "Presencial" : "Online"}
                  </span>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-center">
                  <Badge
                    variant={
                      appt.status === "COMPLETED"
                        ? "default"
                        : appt.status === "CONFIRMED"
                        ? "success"
                        : "destructive"
                    }
                  >
                    {formatAppointmentStatus(appt.status)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= MODAL: INFORMAÇÕES DA CONSULTA PRESENCIAL ================= */}
      {selectedInPersonAppt && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedInPersonAppt(null)}
          title="Informações da Consulta Presencial"
        >
          <div className="space-y-5 text-xs">
            {/* Header com serviço e profissional */}
            <div className="p-4 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-heading font-bold text-sm text-[#111827] dark:text-[#F5F5F5]">
                  {selectedInPersonAppt.service.name}
                </span>
                <Badge variant="outline" className="text-[10px]">Presencial</Badge>
              </div>

              <div className="flex items-center gap-2 text-[#4B5563] dark:text-[#C7C7CC]">
                <User className="h-4 w-4 text-[var(--primary)] shrink-0" />
                <span>Profissional: <strong>{selectedInPersonAppt.establishment?.professionalName || "Dr(a). Profissional PSI"}</strong></span>
              </div>
            </div>

            {/* Data e Horário */}
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#F8F9FA] dark:bg-[#141416] border border-[#E2E4E8] dark:border-[#303034]">
              <div className="space-y-1">
                <span className="text-[#6B7280] dark:text-[#A3A3AD] block text-[11px]">Data da Sessão</span>
                <span className="font-heading font-semibold text-sm text-[#111827] dark:text-[#F5F5F5] flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-[var(--primary)]" />
                  {formatDate(selectedInPersonAppt.startAt)}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[#6B7280] dark:text-[#A3A3AD] block text-[11px]">Horário e Duração</span>
                <span className="font-mono font-semibold text-sm text-[#111827] dark:text-[#F5F5F5] flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-[var(--primary)]" />
                  {formatTime(selectedInPersonAppt.startAt)} ({selectedInPersonAppt.service.durationMinutes} min)
                </span>
              </div>
            </div>

            {/* Estabelecimento e Endereço */}
            <div className="space-y-2 p-4 rounded-xl border border-[#E2E4E8] dark:border-[#303034] bg-white dark:bg-[#19191C]">
              <div className="flex items-center gap-2 font-heading font-semibold text-sm text-[#111827] dark:text-[#F5F5F5]">
                <Building2 className="h-4 w-4 text-[var(--primary)]" />
                <span>{selectedInPersonAppt.establishment?.name || "Consultório"}</span>
              </div>

              {selectedInPersonAppt.establishment?.address ? (
                <div className="space-y-3 pt-2">
                  <div className="flex items-start gap-2 text-[#4B5563] dark:text-[#C7C7CC]">
                    <MapPin className="h-4 w-4 text-[var(--primary)] shrink-0 mt-0.5" />
                    <p className="leading-relaxed">{selectedInPersonAppt.establishment.address}</p>
                  </div>

                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      selectedInPersonAppt.establishment.address
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block"
                  >
                    <Button size="sm" className="gap-2 text-xs">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>Ver localização no Google Maps</span>
                      <ExternalLink className="h-3 w-3 ml-0.5" />
                    </Button>
                  </a>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs leading-relaxed">
                  O profissional ainda não cadastrou o endereço físico completo nas configurações do consultório. Por gentileza, entre em contato via mensagem para confirmar o local de atendimento.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setSelectedInPersonAppt(null)}>
                Fechar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ================= MODAL: CONFIRMAÇÃO DE CANCELAMENTO ================= */}
      {cancellingAppt && (
        <Modal
          isOpen={true}
          onClose={() => setCancellingAppt(null)}
          title="Confirmar Cancelamento de Consulta"
        >
          <form onSubmit={handleConfirmCancel} className="space-y-4 text-xs">
            <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl space-y-1 text-red-700 dark:text-red-300">
              <div className="flex items-center gap-2 font-heading font-semibold text-sm">
                <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                <span>Atenção à Política de Cancelamento</span>
              </div>
              <p className="text-xs leading-relaxed">
                Cancelamentos informados com menos de{" "}
                <strong>{cancellingAppt.service.cancellationNoticeDays} dias</strong> de antecedência são
                registrados como cancelamento tardio no histórico terapêutico.
              </p>
            </div>

            {cancelError && <Alert variant="destructive">{cancelError}</Alert>}

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#374151] dark:text-[#E5E7EB]">
                Motivo do cancelamento (opcional):
              </label>
              <textarea
                rows={3}
                className="w-full rounded-xl border border-[#E2E4E8] dark:border-[#303034] bg-white dark:bg-[#141416] p-3 text-sm text-[#111827] dark:text-[#F5F5F5] placeholder:text-[#9CA3AF] dark:placeholder:text-[#71717A] outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 transition-all"
                placeholder="Informe o motivo do imprevisto se desejar..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCancellingAppt(null)}
                disabled={isSubmitting}
              >
                Voltar
              </Button>
              <Button type="submit" variant="destructive" disabled={isSubmitting}>
                {isSubmitting ? "Cancelando..." : "Confirmar Cancelamento"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
