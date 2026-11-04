"use client";

import React, { useEffect, useState, useTransition } from "react";
import { formatTime, formatDate, getDayOfWeekName } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Video,
  Clock,
  User,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText,
} from "lucide-react";

interface AppointmentItem {
  id: string;
  patientId: string;
  serviceId: string;
  startAt: string;
  endAt: string;
  modality: "PRESENTIAL" | "ONLINE" | "BOTH";
  status: "PENDING_CONFIRMATION" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "LATE_CANCELLED" | "NO_SHOW";
  isAdminOverride: boolean;
  meetingUrlSnapshot?: string;
  patient: {
    fullName: string;
    phone: string;
    email: string;
  };
  service: {
    name: string;
    durationMinutes: number;
    priceCents: number;
  };
}

interface ServiceOption {
  id: string;
  name: string;
  durationMinutes: number;
  modality: "PRESENTIAL" | "ONLINE" | "BOTH";
  priceCents: number;
}

interface PatientOption {
  id: string;
  fullName: string;
}

export default function AdminAgendaPage() {
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Segunda-feira
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  const [viewMode, setViewMode] = useState<"week" | "day" | "list">("week");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState(true);

  // Modal Novo Agendamento
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("09:00");
  const [appointmentDuration, setAppointmentDuration] = useState(60);
  const [appointmentModality, setAppointmentModality] = useState<"PRESENTIAL" | "ONLINE" | "BOTH">("ONLINE");
  const [isAdminOverride, setIsAdminOverride] = useState(false);
  const [isFreeOneOff, setIsFreeOneOff] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal Ações no Agendamento
  const [selectedAppt, setSelectedAppt] = useState<AppointmentItem | null>(null);

  const fetchAppointments = () => {
    setIsLoading(true);
    const start = new Date(currentWeekStart);
    const end = new Date(currentWeekStart);
    end.setDate(end.getDate() + 7);

    fetch(`/api/appointments?startDate=${start.toISOString()}&endDate=${end.toISOString()}`)
      .then((res) => res.json())
      .then((data) => {
        setAppointments(Array.isArray(data) ? data : []);
        setIsLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchAppointments();
  }, [currentWeekStart]);

  useEffect(() => {
    // Carrega serviços e pacientes para o modal
    fetch("/api/services")
      .then((r) => r.json())
      .then((d) => setServices(Array.isArray(d) ? d : []));

    fetch("/api/patients")
      .then((r) => r.json())
      .then((d) => setPatients(Array.isArray(d) ? d : []));
  }, []);

  const handlePrevWeek = () => {
    const next = new Date(currentWeekStart);
    next.setDate(next.getDate() - 7);
    setCurrentWeekStart(next);
  };

  const handleNextWeek = () => {
    const next = new Date(currentWeekStart);
    next.setDate(next.getDate() + 7);
    setCurrentWeekStart(next);
  };

  const handleToday = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    setCurrentWeekStart(monday);
  };

  // Criação do agendamento manual
  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setIsSubmitting(true);

    if (!selectedPatientId || !selectedServiceId || !appointmentDate || !appointmentTime) {
      setModalError("Preencha todos os campos obrigatórios.");
      setIsSubmitting(false);
      return;
    }

    try {
      const [year, month, day] = appointmentDate.split("-").map(Number);
      const [hour, minute] = appointmentTime.split(":").map(Number);

      const startAt = new Date(Date.UTC(year, month - 1, day, hour, minute));
      const endAt = new Date(startAt.getTime() + appointmentDuration * 60000);

      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedPatientId,
          serviceId: selectedServiceId,
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
          modality: appointmentModality,
          status: "CONFIRMED",
          isAdminOverride,
          isFreeOneOff,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setModalError(data.error || "Não foi possível criar o agendamento.");
        setIsSubmitting(false);
        return;
      }

      setIsModalOpen(false);
      setIsSubmitting(false);
      fetchAppointments();
    } catch {
      setModalError("Erro de comunicação com o servidor.");
      setIsSubmitting(false);
    }
  };

  // Transições de status
  const handleUpdateStatus = async (
    targetStatus: string,
    reason?: string,
    refundAction?: string
  ) => {
    if (!selectedAppt) return;
    try {
      const res = await fetch(`/api/appointments/${selectedAppt.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: targetStatus,
          reason,
          refundAction,
        }),
      });

      if (res.ok) {
        setSelectedAppt(null);
        fetchAppointments();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Monta os 7 dias da semana
  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const filteredAppointments = appointments.filter((appt) => {
    if (statusFilter === "ALL") return true;
    return appt.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header com Navegação e Filtros */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agenda do Consultório</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Semana de {formatDate(weekDays[0])} a {formatDate(weekDays[6])}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Navegação de semanas */}
          <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1">
            <Button variant="ghost" size="icon" onClick={handlePrevWeek} className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleToday} className="text-xs h-8 px-2.5">
              Hoje
            </Button>
            <Button variant="ghost" size="icon" onClick={handleNextWeek} className="h-8 w-8">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Filtro de Status */}
          <select
            className="h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs text-slate-900 dark:text-slate-100"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">Todos os Status</option>
            <option value="CONFIRMED">Confirmados</option>
            <option value="COMPLETED">Realizados</option>
            <option value="CANCELLED">Cancelados</option>
            <option value="LATE_CANCELLED">Cancelamentos Tardios</option>
            <option value="NO_SHOW">Não Comparecimento (No-Show)</option>
          </select>

          {/* Botão Novo Agendamento */}
          <Button size="sm" onClick={() => setIsModalOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            <span>Novo Agendamento</span>
          </Button>
        </div>
      </div>

      {/* Grade Semanal */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {weekDays.map((day, dayIdx) => {
          const isToday =
            new Date().toDateString() === day.toDateString();

          const dayAppointments = filteredAppointments.filter((a) => {
            const aDate = new Date(a.startAt);
            return aDate.toDateString() === day.toDateString();
          });

          return (
            <div
              key={dayIdx}
              className={`flex flex-col rounded-xl border ${
                isToday
                  ? "border-teal-500 bg-teal-50/20 dark:bg-teal-950/20"
                  : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
              } min-h-[420px]`}
            >
              {/* Cabeçalho do dia */}
              <div
                className={`p-3 text-center border-b ${
                  isToday
                    ? "border-teal-500 bg-teal-100/50 dark:bg-teal-900/40 text-teal-900 dark:text-teal-200"
                    : "border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                }`}
              >
                <div className="text-xs font-semibold uppercase tracking-wider">
                  {getDayOfWeekName(day.getDay()).slice(0, 3)}
                </div>
                <div className="text-base font-bold mt-0.5">{day.getDate()}</div>
              </div>

              {/* Lista de Consultas do dia */}
              <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[500px]">
                {dayAppointments.length > 0 ? (
                  dayAppointments.map((appt) => {
                    const isCancelled =
                      appt.status === "CANCELLED" || appt.status === "LATE_CANCELLED";

                    return (
                      <div
                        key={appt.id}
                        onClick={() => setSelectedAppt(appt)}
                        className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all hover:shadow-xs ${
                          appt.isAdminOverride
                            ? "border-purple-300 bg-purple-50/70 dark:border-purple-800 dark:bg-purple-950/40"
                            : isCancelled
                            ? "border-red-200 bg-red-50/40 dark:border-red-900 dark:bg-red-950/20 opacity-70"
                            : appt.status === "COMPLETED"
                            ? "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40"
                            : "border-teal-200 bg-teal-50/50 dark:border-teal-900 dark:bg-teal-950/30"
                        }`}
                      >
                        <div className="flex items-center justify-between font-semibold mb-1">
                          <span className="font-mono">
                            {formatTime(appt.startAt)} - {formatTime(appt.endAt)}
                          </span>
                          {appt.isAdminOverride && (
                            <span
                              className="text-[10px] text-purple-700 dark:text-purple-300 font-bold"
                              title="Horário com encaixe manual do profissional"
                            >
                              ENCAIXE
                            </span>
                          )}
                        </div>

                        <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                          {appt.patient.fullName}
                        </div>

                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          {appt.service.name}
                        </div>

                        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60">
                          <span className="text-[10px] text-slate-500">
                            {appt.modality === "ONLINE" ? "Online" : "Presencial"}
                          </span>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                              appt.status === "CONFIRMED"
                                ? "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200"
                                : appt.status === "COMPLETED"
                                ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                : appt.status === "NO_SHOW"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                                : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                            }`}
                          >
                            {appt.status}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="h-full flex items-center justify-center text-[11px] text-slate-400 py-6">
                    Livre
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Detalhes e Ações no Agendamento */}
      {selectedAppt && (
        <Modal
          isOpen={!!selectedAppt}
          onClose={() => setSelectedAppt(null)}
          title="Detalhes da Consulta"
          description={`Agendamento ID: ${selectedAppt.id}`}
        >
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <div>
                <span className="text-xs text-slate-500 block">Paciente:</span>
                <span className="font-semibold">{selectedAppt.patient.fullName}</span>
                <span className="text-xs text-slate-400 block">{selectedAppt.patient.phone}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Serviço:</span>
                <span className="font-semibold">{selectedAppt.service.name}</span>
                <span className="text-xs text-slate-400 block">
                  {selectedAppt.service.durationMinutes} minutos
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Data e Horário:</span>
                <span className="font-semibold">
                  {formatDate(selectedAppt.startAt)} às {formatTime(selectedAppt.startAt)}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Status Atual:</span>
                <Badge variant={selectedAppt.status === "CONFIRMED" ? "success" : "default"}>
                  {selectedAppt.status}
                </Badge>
              </div>
            </div>

            {selectedAppt.meetingUrlSnapshot && (
              <div className="p-3 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-semibold text-teal-800 dark:text-teal-300 block text-xs">
                    Sala de Teleconsulta (Jitsi)
                  </span>
                  <span className="text-xs text-slate-500">
                    Acesso exclusivo e com sala de espera do PSI
                  </span>
                </div>
                <a href={selectedAppt.meetingUrlSnapshot} target="_blank" rel="noreferrer">
                  <Button size="sm" className="gap-1.5 text-xs">
                    <Video className="h-3.5 w-3.5" />
                    <span>Acessar Sala</span>
                  </Button>
                </a>
              </div>
            )}

            {/* Ações de Transição */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-xs font-semibold text-slate-500 block uppercase">
                Atualizar Status
              </span>

              <div className="grid grid-cols-2 gap-2">
                {selectedAppt.status !== "COMPLETED" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1.5"
                    onClick={() => handleUpdateStatus("COMPLETED")}
                  >
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Marcar como Realizado</span>
                  </Button>
                )}

                {selectedAppt.status !== "NO_SHOW" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1.5"
                    onClick={() => handleUpdateStatus("NO_SHOW", "Paciente não compareceu", "RETAIN")}
                  >
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                    <span>Registrar Não Comparecimento</span>
                  </Button>
                )}

                {selectedAppt.status !== "CANCELLED" && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="text-xs gap-1.5"
                    onClick={() => handleUpdateStatus("CANCELLED", "Cancelado pelo profissional")}
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    <span>Cancelar Consulta</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Criar Agendamento */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Novo Agendamento no Consultório"
        description="Agende uma consulta diretamente com validação atômica de horários"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateAppointment} className="space-y-4">
          {modalError && <Alert variant="destructive">{modalError}</Alert>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Paciente *</label>
              <select
                className="flex h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                required
              >
                <option value="">Selecione o paciente...</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Serviço *</label>
              <select
                className="flex h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                value={selectedServiceId}
                onChange={(e) => {
                  setSelectedServiceId(e.target.value);
                  const s = services.find((srv) => srv.id === e.target.value);
                  if (s) {
                    setAppointmentDuration(s.durationMinutes);
                    setAppointmentModality(s.modality === "BOTH" ? "ONLINE" : s.modality);
                  }
                }}
                required
              >
                <option value="">Selecione o procedimento...</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.durationMinutes} min)
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Data da Consulta *"
              type="date"
              value={appointmentDate}
              onChange={(e) => setAppointmentDate(e.target.value)}
              required
            />

            <Input
              label="Horário Inicial (HH:mm) *"
              type="time"
              value={appointmentTime}
              onChange={(e) => setAppointmentTime(e.target.value)}
              required
            />

            <Input
              label="Duração em Minutos *"
              type="number"
              min={15}
              step={5}
              value={appointmentDuration}
              onChange={(e) => setAppointmentDuration(Number(e.target.value))}
              required
            />

            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Modalidade *</label>
              <select
                className="flex h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                value={appointmentModality}
                onChange={(e) => setAppointmentModality(e.target.value as "PRESENTIAL" | "ONLINE" | "BOTH")}
              >
                <option value="ONLINE">Online (Teleconsulta)</option>
                <option value="PRESENTIAL">Presencial no Consultório</option>
                <option value="BOTH">Híbrido</option>
              </select>
            </div>
          </div>

          {/* Opções de Encaixe e Cortesia */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-2 border border-slate-200 dark:border-slate-700">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isAdminOverride}
                onChange={(e) => setIsAdminOverride(e.target.checked)}
                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-4 w-4"
              />
              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Encaixe com override de disponibilidade (fora da grade padrão)
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isFreeOneOff}
                onChange={(e) => setIsFreeOneOff(e.target.checked)}
                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-4 w-4"
              />
              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Tornar esta sessão específica gratuita (cortesia pontual)
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Confirmar Agendamento
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
