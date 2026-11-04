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
  XCircle,
  FileCheck2,
} from "lucide-react";

interface Appointment {
  id: string;
  startAt: string;
  endAt: string;
  modality: string;
  status: string;
  meetingUrlSnapshot?: string;
  isLateCancellation?: boolean;
  service: {
    name: string;
    durationMinutes: number;
    cancellationNoticeDays: number;
  };
}

export default function PatientAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cancellingAppt, setCancellingAppt] = useState<Appointment | null>(null);
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
            Acompanhe suas sessões agendadas, acesse a teleconsulta ou solicite novo horário.
          </p>
        </div>

        <Link href="/agendar">
          <Button className="gap-1.5">
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
            {upcomingAppointments.map((appt) => (
              <Card key={appt.id} className="border-teal-200 dark:border-teal-900 shadow-xs">
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div>
                    <CardTitle className="text-base">{appt.service.name}</CardTitle>
                    <CardDescription className="text-xs">
                      Duração de {appt.service.durationMinutes} minutos
                    </CardDescription>
                  </div>
                  <Badge variant="success">{appt.status}</Badge>
                </CardHeader>

                <CardContent className="space-y-4 pt-0">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1 text-xs">
                    <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
                      <Calendar className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                      <span>{formatDate(appt.startAt)}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-slate-600 dark:text-slate-400">
                      <Clock className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                      <span>
                        {formatTime(appt.startAt)} às {formatTime(appt.endAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    {appt.modality !== "PRESENTIAL" && appt.meetingUrlSnapshot ? (
                      <Link href={appt.meetingUrlSnapshot} target="_blank">
                        <Button size="sm" className="gap-1.5 text-xs">
                          <Video className="h-3.5 w-3.5" />
                          <span>Entrar na Sessão Virtual</span>
                        </Button>
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-500">
                        Atendimento presencial no consultório
                      </span>
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
                </CardContent>
              </Card>
            ))}
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

      {/* Histórico Anterior */}
      {pastAppointments.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-bold">Histórico Anterior</h2>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            {pastAppointments.map((appt) => (
              <div key={appt.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold block">{appt.service.name}</span>
                  <span className="text-slate-500">
                    {formatDate(appt.startAt)} às {formatTime(appt.startAt)} • {appt.modality}
                  </span>
                </div>
                <Badge
                  variant={
                    appt.status === "COMPLETED"
                      ? "default"
                      : appt.status.includes("CANCELLED")
                      ? "destructive"
                      : "warning"
                  }
                >
                  {appt.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Confirmar Cancelamento */}
      {cancellingAppt && (
        <Modal
          isOpen={!!cancellingAppt}
          onClose={() => setCancellingAppt(null)}
          title="Cancelar Consulta"
          description="Confirme o cancelamento do seu atendimento"
        >
          <form onSubmit={handleConfirmCancel} className="space-y-4 text-sm">
            {cancelError && <Alert variant="destructive">{cancelError}</Alert>}

            <Alert variant="warning" title="Política de Cancelamento">
              A política de cancelamento prevê aviso prévio de{" "}
              <strong>{cancellingAppt.service.cancellationNoticeDays} dias</strong>.
              Caso o cancelamento ocorra em prazo inferior, ele será registrado como cancelamento tardio.
            </Alert>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium">
                Motivo do cancelamento (opcional):
              </label>
              <textarea
                rows={2}
                className="flex w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs"
                placeholder="Informe brevemente a razão do cancelamento..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCancellingAppt(null)}
              >
                Voltar
              </Button>
              <Button type="submit" variant="destructive" isLoading={isSubmitting}>
                Confirmar Cancelamento
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
