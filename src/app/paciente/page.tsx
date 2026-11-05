"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { formatDate, formatTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Minhas Consultas</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Acompanhe suas sessões presenciais ou online, confira a localização e acesse a teleconsulta.
          </p>
        </div>

        <Link href="/agendar">
          <Button className="gap-1.5 bg-[var(--button-bg,var(--primary))] hover:brightness-105 text-white">
            <Plus className="h-4 w-4" />
            <span>Agendar Nova Consulta</span>
          </Button>
        </Link>
      </div>

      {statusMessage && <Alert variant="info">{statusMessage}</Alert>}

      {/* Próximas Consultas */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold">Próximos Atendimentos</h2>

        {isLoading ? (
          <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
        ) : upcomingAppointments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingAppointments.map((appt) => {
              const isPresential = appt.modality === "PRESENTIAL";

              return (
                <Card key={appt.id} className="border-slate-200 dark:border-[#444444] shadow-xs flex flex-col justify-between">
                  <div>
                    <CardHeader className="flex flex-row items-start justify-between pb-2">
                      <div>
                        <CardTitle className="text-base">{appt.service.name}</CardTitle>
                        <CardDescription className="text-xs">
                          {isPresential ? "Atendimento Presencial" : "Teleconsulta Online"} • {appt.service.durationMinutes} minutos
                        </CardDescription>
                      </div>
                      <Badge variant={appt.status === "CONFIRMED" ? "success" : "warning"}>
                        {appt.status}
                      </Badge>
                    </CardHeader>

                    <CardContent className="space-y-4 pt-0">
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1.5 text-xs">
                        <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
                          <Calendar className="h-4 w-4 text-[var(--primary)]" />
                          <span>{formatDate(appt.startAt)}</span>
                        </div>
                        <div className="flex items-center gap-2 font-mono text-slate-600 dark:text-slate-400">
                          <Clock className="h-4 w-4 text-[var(--primary)]" />
                          <span>
                            {formatTime(appt.startAt)} às {formatTime(appt.endAt)}
                          </span>
                        </div>
                        {isPresential && appt.establishment?.address && (
                          <div className="flex items-start gap-2 text-slate-500 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                            <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                            <span className="truncate">{appt.establishment.address}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </div>

                  {/* Actions Bar */}
                  <div className="p-4 pt-0">
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                      {/* TASK 3: Presencial -> Informações da consulta; Virtual -> Entrar na sala */}
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
                          <Button size="sm" className="gap-1.5 text-xs bg-[var(--button-bg,var(--primary))] hover:brightness-105 text-white">
                            <Video className="h-3.5 w-3.5" />
                            <span>Entrar na sala</span>
                          </Button>
                        </Link>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Link sendo preparado</span>
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
          <Card className="p-8 text-center text-slate-500 space-y-2">
            <FileCheck2 className="h-8 w-8 mx-auto text-slate-400" />
            <p className="text-sm font-medium">Você não possui consultas agendadas no momento.</p>
            <Link href="/agendar">
              <Button variant="outline" size="sm" className="mt-2 text-xs">
                Escolher Horário e Agendar
              </Button>
            </Link>
          </Card>
        )}
      </div>

      {/* Histórico de Consultas Passadas / Canceladas */}
      {pastAppointments.length > 0 && (
        <div className="space-y-4 pt-6">
          <h2 className="text-lg font-bold">Histórico de Atendimentos</h2>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
            {pastAppointments.map((appt) => (
              <div
                key={appt.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {appt.service.name}
                  </span>
                  <span className="text-slate-400 block">
                    {formatDate(appt.startAt)} às {formatTime(appt.startAt)} •{" "}
                    {appt.modality === "PRESENTIAL" ? "Presencial" : "Online"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      appt.status === "COMPLETED"
                        ? "default"
                        : appt.status === "CONFIRMED"
                        ? "success"
                        : "destructive"
                    }
                  >
                    {appt.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TASK 3: Modal com Informações da Consulta Presencial */}
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
                <span className="font-bold text-sm text-slate-800 dark:text-[#F5F5F5]">
                  {selectedInPersonAppt.service.name}
                </span>
                <Badge variant="outline" className="text-[10px]">Presencial</Badge>
              </div>

              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <User className="h-4 w-4 text-[var(--primary)] shrink-0" />
                <span>Profissional: <strong>{selectedInPersonAppt.establishment?.professionalName || "Dr(a). Profissional PSI"}</strong></span>
              </div>
            </div>

            {/* Data e Horário */}
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <div className="space-y-1">
                <span className="text-slate-400 block text-[11px]">Data da Sessão</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-[var(--primary)]" />
                  {formatDate(selectedInPersonAppt.startAt)}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 block text-[11px]">Horário e Duração</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-[var(--primary)]" />
                  {formatTime(selectedInPersonAppt.startAt)} ({selectedInPersonAppt.service.durationMinutes} min)
                </span>
              </div>
            </div>

            {/* Estabelecimento e Endereço */}
            <div className="space-y-2 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
                <Building2 className="h-4 w-4 text-[var(--primary)]" />
                <span>{selectedInPersonAppt.establishment?.name || "Consultório"}</span>
              </div>

              {selectedInPersonAppt.establishment?.address ? (
                <div className="space-y-3 pt-2">
                  <div className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
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
                    <Button size="sm" className="gap-2 bg-[var(--button-bg,var(--primary))] hover:brightness-105 text-white text-xs">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>Ver localização no Google Maps</span>
                      <ExternalLink className="h-3 w-3 ml-0.5" />
                    </Button>
                  </a>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 text-xs">
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

      {/* Modal de Confirmação de Cancelamento */}
      {cancellingAppt && (
        <Modal
          isOpen={true}
          onClose={() => setCancellingAppt(null)}
          title="Confirmar Cancelamento de Consulta"
        >
          <form onSubmit={handleConfirmCancel} className="space-y-4 text-xs">
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl space-y-1 text-red-900 dark:text-red-200">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                <span>Atenção à Política de Cancelamento</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Cancelamentos informados com menos de{" "}
                <strong>{cancellingAppt.service.cancellationNoticeDays} dias</strong> de antecedência são
                registrados como cancelamento tardio no histórico terapêutico.
              </p>
            </div>

            {cancelError && <Alert variant="destructive">{cancelError}</Alert>}

            <div className="space-y-1">
              <label className="block font-medium">Motivo do cancelamento (opcional):</label>
              <textarea
                rows={3}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Informe o motivo do imprevisto se desejar..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
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
