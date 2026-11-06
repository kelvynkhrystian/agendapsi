"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { animateTabContent } from "@/lib/animation/gsap";
import { formatTime, formatDate, getDayOfWeekName, formatAppointmentStatus } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
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
  CalendarCheck,
  CalendarDays,
  LayoutGrid,
  ListFilter,
  Check,
  Filter,
  ArrowRight,
  MapPin,
  Sparkles,
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

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const WEEKDAY_INITIALS = ["D", "S", "T", "Q", "Q", "S", "S"];

const HOURS = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
];

export default function AdminAgendaPage() {
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [patients, setPatients] = useState<PatientOption[]>([]);

  // Segunda-feira da semana ativa
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  // Dia selecionado para a visualização diária
  const [selectedDayDate, setSelectedDayDate] = useState<Date>(() => new Date());

  // Mês exibido no Mini Calendar
  const [miniCalMonth, setMiniCalMonth] = useState<Date>(() => new Date());

  const [viewMode, setViewMode] = useState<"week" | "day" | "list">("week");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const calendarContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    animateTabContent(calendarContainerRef.current);
  }, [viewMode]);

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

  // Modal Detalhes e Ações no Agendamento
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
    const today = new Date();
    setSelectedDayDate(today);
    setMiniCalMonth(today);

    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(new Date().setDate(diff));
    monday.setHours(0, 0, 0, 0);
    setCurrentWeekStart(monday);
  };

  // Navegação no Mini Calendar lateral
  const handleSelectMiniCalDay = (dayDate: Date) => {
    setSelectedDayDate(dayDate);

    // Ajusta a semana correspondente
    const day = dayDate.getDay();
    const diff = dayDate.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(dayDate);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    setCurrentWeekStart(monday);
  };

  const handleMiniCalPrevMonth = () => {
    const prev = new Date(miniCalMonth.getFullYear(), miniCalMonth.getMonth() - 1, 1);
    setMiniCalMonth(prev);
  };

  const handleMiniCalNextMonth = () => {
    const next = new Date(miniCalMonth.getFullYear(), miniCalMonth.getMonth() + 1, 1);
    setMiniCalMonth(next);
  };

  // Criação de agendamento manual
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

  // Atualização de status
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

  // Monta os 7 dias da semana ativa
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [currentWeekStart]);

  const filteredAppointments = appointments.filter((appt) => {
    if (statusFilter === "ALL") return true;
    return appt.status === statusFilter;
  });

  // Dias da matriz do Mini Calendar
  const miniCalDays = useMemo(() => {
    const year = miniCalMonth.getFullYear();
    const month = miniCalMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days: Array<{ date: Date; isCurrentMonth: boolean }> = [];

    // Preenche dias do mês anterior
    const startDayOfWeek = firstDay.getDay(); // 0 (Dom) a 6 (Sáb)
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({ date: d, isCurrentMonth: false });
    }

    // Dias do mês atual
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }

    // Preenche até completar grade de 35 ou 42 dias
    const remaining = 35 - days.length;
    if (remaining > 0) {
      for (let i = 1; i <= remaining; i++) {
        days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
      }
    }

    return days;
  }, [miniCalMonth]);

  // Estatísticas rápidas da semana
  const stats = useMemo(() => {
    const total = filteredAppointments.length;
    const confirmed = filteredAppointments.filter((a) => a.status === "CONFIRMED").length;
    const online = filteredAppointments.filter((a) => a.modality === "ONLINE").length;
    const presential = filteredAppointments.filter((a) => a.modality === "PRESENTIAL").length;
    return { total, confirmed, online, presential };
  }, [filteredAppointments]);

  // Título do cabeçalho da agenda (ex: Março 2026)
  const headerMonthTitle = useMemo(() => {
    const monthName = MONTH_NAMES[weekDays[0].getMonth()];
    const year = weekDays[0].getFullYear();
    return `${monthName} ${year}`;
  }, [weekDays]);

  return (
    <div className="space-y-6">
      {/* ================= 1. REBRAND-STYLE WORKSPACE HEADER ================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-[#E2E4E8] dark:border-[#303034]">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-[#111827] dark:text-[#F5F5F5]">
              {headerMonthTitle}
            </h1>
            <p className="text-xs sm:text-sm text-[#4B5563] dark:text-[#A3A3AD] mt-0.5">
              Semana de {formatDate(weekDays[0])} a {formatDate(weekDays[6])}
            </p>
          </div>

          {/* Seletor de visualização (Semana / Dia / Lista) */}
          <div className="inline-flex items-center rounded-xl bg-[#F3F4F6] dark:bg-[#19191C] p-1 border border-[#E2E4E8] dark:border-[#303034] text-xs font-heading font-medium">
            <button
              type="button"
              onClick={() => setViewMode("week")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "week"
                  ? "bg-white dark:bg-[#222226] text-[#111827] dark:text-[#F5F5F5] font-semibold shadow-xs"
                  : "text-[#6B7280] dark:text-[#A3A3AD] hover:text-[#111827] dark:hover:text-[#F5F5F5]"
              }`}
            >
              Semana
            </button>
            <button
              type="button"
              onClick={() => setViewMode("day")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "day"
                  ? "bg-white dark:bg-[#222226] text-[#111827] dark:text-[#F5F5F5] font-semibold shadow-xs"
                  : "text-[#6B7280] dark:text-[#A3A3AD] hover:text-[#111827] dark:hover:text-[#F5F5F5]"
              }`}
            >
              Dia
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "list"
                  ? "bg-white dark:bg-[#222226] text-[#111827] dark:text-[#F5F5F5] font-semibold shadow-xs"
                  : "text-[#6B7280] dark:text-[#A3A3AD] hover:text-[#111827] dark:hover:text-[#F5F5F5]"
              }`}
            >
              Lista
            </button>
          </div>
        </div>

        {/* Controles de Navegação e Ação Primária */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Navegação de Data */}
          <div className="flex items-center rounded-xl border border-[#E2E4E8] dark:border-[#303034] bg-white dark:bg-[#19191C] p-1 shadow-2xs">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevWeek}
              className="h-8 w-8 text-[#6B7280] hover:text-[#111827] dark:text-[#A3A3AD] dark:hover:text-[#F5F5F5]"
              aria-label="Semana anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToday}
              className="text-xs h-8 px-3 font-heading font-semibold text-[#111827] dark:text-[#F5F5F5]"
            >
              Hoje
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextWeek}
              className="h-8 w-8 text-[#6B7280] hover:text-[#111827] dark:text-[#A3A3AD] dark:hover:text-[#F5F5F5]"
              aria-label="Próxima semana"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Filtro de Status Rápido */}
          <select
            className="h-10 rounded-xl border border-[#E2E4E8] dark:border-[#303034] bg-white dark:bg-[#19191C] px-3.5 text-xs text-[#111827] dark:text-[#F5F5F5] font-medium shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30 cursor-pointer"
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
          <Button
            size="md"
            onClick={() => {
              setAppointmentDate(new Date().toISOString().split("T")[0]);
              setIsModalOpen(true);
            }}
            className="gap-2 shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Agendamento</span>
          </Button>
        </div>
      </div>

      {/* ================= 2. WORKSPACE LAYOUT: MAIN CALENDAR + SIDEBAR ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* ================= COLUNA PRINCIPAL: AGENDA (3 COLUNAS) ================= */}
        <div ref={calendarContainerRef} className="lg:col-span-3 space-y-4">
          {/* VISUALIZAÇÃO: SEMANA (WEEK VIEW) */}
          {viewMode === "week" && (
            <div className="rounded-2xl border border-[#E2E4E8] dark:border-[#303034] bg-white dark:bg-[#19191C] shadow-xs overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-[#E2E4E8] dark:divide-[#303034]">
                {weekDays.map((day, dayIdx) => {
                  const isToday = new Date().toDateString() === day.toDateString();
                  const isSelected = selectedDayDate.toDateString() === day.toDateString();

                  const dayAppointments = filteredAppointments.filter((a) => {
                    const aDate = new Date(a.startAt);
                    return aDate.toDateString() === day.toDateString();
                  });

                  return (
                    <div
                      key={dayIdx}
                      className={`flex flex-col min-h-[460px] transition-colors ${
                        isToday
                          ? "bg-[var(--primary)]/[0.03] dark:bg-[var(--primary)]/[0.04]"
                          : "bg-white dark:bg-[#19191C]"
                      }`}
                    >
                      {/* Cabeçalho do dia */}
                      <div
                        onClick={() => {
                          setSelectedDayDate(day);
                        }}
                        className={`p-3.5 text-center border-b transition-colors cursor-pointer select-none ${
                          isToday
                            ? "border-[var(--primary)]/30 bg-[var(--primary)]/10 text-[#111827] dark:text-[#F5F5F5] font-bold"
                            : isSelected
                            ? "border-[#E2E4E8] dark:border-[#303034] bg-[#F3F4F6] dark:bg-[#222226] text-[#111827] dark:text-[#F5F5F5]"
                            : "border-slate-100 dark:border-[#303034] text-[#4B5563] dark:text-[#C7C7CC]"
                        }`}
                      >
                        <div className="text-[11px] font-heading font-semibold uppercase tracking-wider">
                          {getDayOfWeekName(day.getDay()).slice(0, 3)}
                        </div>
                        <div className="mt-1 flex items-center justify-center">
                          <span
                            className={`h-7 w-7 rounded-full flex items-center justify-center font-heading text-sm ${
                              isToday
                                ? "bg-[var(--button-bg,var(--primary))] text-[var(--button-fg,var(--primary-foreground,#ffffff))] font-bold shadow-2xs"
                                : "font-bold text-[#111827] dark:text-[#F5F5F5]"
                            }`}
                          >
                            {day.getDate()}
                          </span>
                        </div>
                      </div>

                      {/* Lista de Consultas do dia */}
                      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[540px]">
                        {dayAppointments.length > 0 ? (
                          dayAppointments.map((appt) => {
                            const isCancelled =
                              appt.status === "CANCELLED" || appt.status === "LATE_CANCELLED";

                            return (
                              <div
                                key={appt.id}
                                onClick={() => setSelectedAppt(appt)}
                                className={`group p-3 rounded-xl border text-xs cursor-pointer transition-all duration-150 hover:-translate-y-0.5 hover:shadow-xs ${
                                  appt.isAdminOverride
                                    ? "border-purple-300 bg-purple-50/80 dark:border-purple-800/60 dark:bg-purple-950/30 text-purple-900 dark:text-purple-200"
                                    : isCancelled
                                    ? "border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20 opacity-75"
                                    : appt.status === "COMPLETED"
                                    ? "border-[#E2E4E8] bg-[#F8F9FA] dark:border-[#303034] dark:bg-[#222226]/50 text-[#4B5563] dark:text-[#C7C7CC]"
                                    : "border-[var(--primary)]/30 bg-[var(--primary)]/5 hover:border-[var(--primary)] hover:bg-[var(--primary)]/10"
                                }`}
                              >
                                <div className="flex items-center justify-between font-mono font-semibold text-[11px] mb-1">
                                  <span className="text-[var(--primary)] dark:text-[#F5F5F5]">
                                    {formatTime(appt.startAt)}
                                  </span>
                                  {appt.isAdminOverride && (
                                    <span
                                      className="text-[9px] px-1 py-0.2 rounded-sm bg-purple-200 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 font-bold uppercase tracking-wider"
                                      title="Horário com encaixe manual do profissional"
                                    >
                                      Encaixe
                                    </span>
                                  )}
                                </div>

                                <div className="font-heading font-semibold text-xs text-[#111827] dark:text-[#F5F5F5] truncate">
                                  {appt.patient.fullName}
                                </div>

                                <div className="text-[11px] text-[#6B7280] dark:text-[#A3A3AD] truncate mt-0.5">
                                  {appt.service.name}
                                </div>

                                <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-black/5 dark:border-white/5">
                                  <span className="text-[10px] text-[#6B7280] dark:text-[#A3A3AD] flex items-center gap-1">
                                    {appt.modality === "ONLINE" ? (
                                      <>
                                        <Video className="h-3 w-3 text-[var(--primary)]" />
                                        <span>Online</span>
                                      </>
                                    ) : (
                                      <>
                                        <MapPin className="h-3 w-3 text-slate-400" />
                                        <span>Presencial</span>
                                      </>
                                    )}
                                  </span>
                                  <span
                                    className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${
                                      appt.status === "CONFIRMED"
                                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                                        : appt.status === "COMPLETED"
                                        ? "bg-slate-200/60 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                        : appt.status === "NO_SHOW"
                                        ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
                                        : "bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/20"
                                    }`}
                                  >
                                    {formatAppointmentStatus(appt.status)}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="h-full min-h-[120px] flex flex-col items-center justify-center text-[11px] text-[#9CA3AF] dark:text-[#71717A] py-8">
                            <Clock className="h-4 w-4 mb-1 opacity-50" />
                            <span>Livre</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VISUALIZAÇÃO: DIA (DAY VIEW) */}
          {viewMode === "day" && (
            <Card className="shadow-xs">
              <CardHeader className="p-5 border-b border-[#E2E4E8] dark:border-[#303034] flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {getDayOfWeekName(selectedDayDate.getDay())}, {formatDate(selectedDayDate)}
                  </CardTitle>
                  <CardDescription>
                    Cronograma detalhado de atendimentos do dia
                  </CardDescription>
                </div>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const prev = new Date(selectedDayDate);
                      prev.setDate(prev.getDate() - 1);
                      handleSelectMiniCalDay(prev);
                    }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const next = new Date(selectedDayDate);
                      next.setDate(next.getDate() + 1);
                      handleSelectMiniCalDay(next);
                    }}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                {(() => {
                  const dayAppts = filteredAppointments.filter((a) => {
                    const aDate = new Date(a.startAt);
                    return aDate.toDateString() === selectedDayDate.toDateString();
                  });

                  if (dayAppts.length === 0) {
                    return (
                      <EmptyState
                        icon={<CalendarCheck className="h-6 w-6 text-[var(--primary)]" />}
                        title="Nenhum atendimento para esta data"
                        description="Você está com o dia totalmente livre ou com a grade sem marcações."
                        action={{
                          label: "Agendar Neste Dia",
                          onClick: () => {
                            setAppointmentDate(selectedDayDate.toISOString().split("T")[0]);
                            setIsModalOpen(true);
                          },
                          icon: <Plus className="h-4 w-4" />,
                        }}
                      />
                    );
                  }

                  return (
                    <div className="space-y-3">
                      {dayAppts.map((appt) => (
                        <div
                          key={appt.id}
                          onClick={() => setSelectedAppt(appt)}
                          className="p-4 rounded-xl border border-[#E2E4E8] dark:border-[#303034] bg-white dark:bg-[#19191C] hover:border-[var(--primary)]/60 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
                        >
                          <div className="flex items-start gap-4">
                            <div className="px-3.5 py-2 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] font-mono font-bold text-sm shrink-0 border border-[var(--primary)]/20 shadow-2xs">
                              {formatTime(appt.startAt)} - {formatTime(appt.endAt)}
                            </div>
                            <div>
                              <h4 className="font-heading font-semibold text-base text-[#111827] dark:text-[#F5F5F5]">
                                {appt.patient.fullName}
                              </h4>
                              <p className="text-xs text-[#6B7280] dark:text-[#A3A3AD] mt-0.5">
                                {appt.service.name} • {appt.service.durationMinutes} minutos •{" "}
                                {appt.modality === "ONLINE" ? "Teleconsulta" : "Presencial"}
                              </p>
                              {appt.isAdminOverride && (
                                <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 font-bold uppercase">
                                  Encaixe Especial
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 self-end sm:self-center">
                            <Badge
                              variant={
                                appt.status === "CONFIRMED"
                                  ? "success"
                                  : appt.status === "COMPLETED"
                                  ? "default"
                                  : "warning"
                              }
                            >
                              {formatAppointmentStatus(appt.status)}
                            </Badge>

                            {appt.modality !== "PRESENTIAL" && appt.meetingUrlSnapshot && (
                              <a
                                href={appt.meetingUrlSnapshot}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
                                  <Video className="h-3.5 w-3.5 text-[var(--primary)]" />
                                  <span>Sala Virtual</span>
                                </Button>
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          {/* VISUALIZAÇÃO: LISTA (LIST VIEW) */}
          {viewMode === "list" && (
            <Card className="shadow-xs">
              <CardHeader className="p-5 border-b border-[#E2E4E8] dark:border-[#303034]">
                <CardTitle className="text-lg">Todas as Consultas da Semana</CardTitle>
                <CardDescription>
                  Visualização cronológica corrida das {filteredAppointments.length} consulta(s)
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5">
                {filteredAppointments.length > 0 ? (
                  <div className="divide-y divide-[#E2E4E8] dark:divide-[#303034]">
                    {filteredAppointments.map((appt) => (
                      <div
                        key={appt.id}
                        onClick={() => setSelectedAppt(appt)}
                        className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F3F4F6]/50 dark:hover:bg-[#222226]/40 p-2.5 rounded-xl transition-colors cursor-pointer"
                      >
                        <div className="flex items-start gap-3.5">
                          <div className="text-center font-mono text-xs shrink-0 w-24">
                            <span className="font-bold text-[#111827] dark:text-[#F5F5F5] block">
                              {formatDate(appt.startAt)}
                            </span>
                            <span className="text-[#6B7280] dark:text-[#A3A3AD]">
                              {formatTime(appt.startAt)}
                            </span>
                          </div>
                          <div>
                            <span className="font-heading font-semibold text-sm text-[#111827] dark:text-[#F5F5F5] block">
                              {appt.patient.fullName}
                            </span>
                            <span className="text-xs text-[#6B7280] dark:text-[#A3A3AD]">
                              {appt.service.name} • {appt.service.durationMinutes} min •{" "}
                              {appt.modality === "ONLINE" ? "Teleconsulta" : "Presencial"}
                            </span>
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
                            {formatAppointmentStatus(appt.status)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={<CalendarIcon className="h-6 w-6 text-[var(--primary)]" />}
                    title="Nenhuma consulta encontrada com os filtros selecionados"
                    description="Tente alterar o filtro de status ou navegar para outra semana."
                  />
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* ================= COLUNA LATERAL: REBRAND-STYLE MINI CALENDAR (1 COLUNA) ================= */}
        <div className="space-y-6">
          {/* Card do Mini Calendar */}
          <Card className="shadow-xs overflow-hidden">
            <CardHeader className="p-4 pb-2 border-b border-[#E2E4E8] dark:border-[#303034] bg-[#F8F9FA] dark:bg-[#101012]/60">
              <div className="flex items-center justify-between">
                <span className="font-heading font-bold text-xs uppercase tracking-wider text-[var(--primary)] flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4" />
                  Mini Calendar
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleMiniCalPrevMonth}
                    className="p-1 rounded-lg text-[#6B7280] hover:text-[#111827] dark:text-[#A3A3AD] dark:hover:text-[#F5F5F5] hover:bg-white dark:hover:bg-[#222226] transition-colors cursor-pointer"
                    aria-label="Mês anterior"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleMiniCalNextMonth}
                    className="p-1 rounded-lg text-[#6B7280] hover:text-[#111827] dark:text-[#A3A3AD] dark:hover:text-[#F5F5F5] hover:bg-white dark:hover:bg-[#222226] transition-colors cursor-pointer"
                    aria-label="Próximo mês"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="text-center font-heading font-semibold text-sm text-[#111827] dark:text-[#F5F5F5] pt-1">
                {MONTH_NAMES[miniCalMonth.getMonth()]} {miniCalMonth.getFullYear()}
              </div>
            </CardHeader>

            <CardContent className="p-4 pt-3">
              {/* Linha com iniciais dos dias da semana (D, S, T, Q, Q, S, S) */}
              <div className="grid grid-cols-7 gap-1 text-center font-heading text-[11px] font-semibold text-[#9CA3AF] dark:text-[#71717A] mb-1">
                {WEEKDAY_INITIALS.map((init, i) => (
                  <span key={i} className="py-1">
                    {init}
                  </span>
                ))}
              </div>

              {/* Grid numérico dos dias */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {miniCalDays.map((item, idx) => {
                  const isCurrentToday =
                    new Date().toDateString() === item.date.toDateString();
                  const isSelected =
                    selectedDayDate.toDateString() === item.date.toDateString();

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectMiniCalDay(item.date)}
                      className={`h-8 w-8 mx-auto rounded-full flex items-center justify-center font-medium transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[var(--button-bg,var(--primary))] text-[var(--button-fg,var(--primary-foreground,#ffffff))] font-bold shadow-xs"
                          : isCurrentToday
                          ? "border border-[var(--primary)] text-[var(--primary)] font-bold"
                          : item.isCurrentMonth
                          ? "text-[#111827] dark:text-[#F5F5F5] hover:bg-[#F3F4F6] dark:hover:bg-[#222226]"
                          : "text-[#D1D5DB] dark:text-[#52525B] hover:text-[#9CA3AF]"
                      }`}
                    >
                      {item.date.getDate()}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Resumo da Semana */}
          <Card className="shadow-xs">
            <CardHeader className="p-4 pb-2 border-b border-[#E2E4E8] dark:border-[#303034]">
              <CardTitle className="text-xs uppercase tracking-wider font-heading font-semibold text-[#6B7280] dark:text-[#A3A3AD]">
                Resumo da Semana
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[#6B7280] dark:text-[#A3A3AD]">Total de Sessões:</span>
                <span className="font-heading font-bold text-sm text-[#111827] dark:text-[#F5F5F5]">
                  {stats.total}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#6B7280] dark:text-[#A3A3AD]">Confirmadas:</span>
                <span className="font-heading font-semibold text-emerald-600 dark:text-emerald-400">
                  {stats.confirmed}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#6B7280] dark:text-[#A3A3AD]">Teleconsultas Online:</span>
                <span className="font-heading font-semibold text-[#111827] dark:text-[#F5F5F5]">
                  {stats.online}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#6B7280] dark:text-[#A3A3AD]">Presenciais no Consultório:</span>
                <span className="font-heading font-semibold text-[#111827] dark:text-[#F5F5F5]">
                  {stats.presential}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ================= MODAL: DETALHES E AÇÕES NO AGENDAMENTO ================= */}
      {selectedAppt && (
        <Modal
          isOpen={!!selectedAppt}
          onClose={() => setSelectedAppt(null)}
          title="Detalhes da Consulta"
          description={`Agendamento ID: ${selectedAppt.id}`}
        >
          <div className="space-y-4 text-xs sm:text-sm">
            <div className="grid grid-cols-2 gap-3 p-4 bg-[#F8F9FA] dark:bg-[#141416] border border-[#E2E4E8] dark:border-[#303034] rounded-2xl">
              <div>
                <span className="text-xs text-[#6B7280] dark:text-[#A3A3AD] block">Paciente:</span>
                <span className="font-heading font-semibold text-[#111827] dark:text-[#F5F5F5] block">
                  {selectedAppt.patient.fullName}
                </span>
                <span className="text-xs text-[#6B7280] dark:text-[#A3A3AD] block mt-0.5">
                  {selectedAppt.patient.phone}
                </span>
              </div>
              <div>
                <span className="text-xs text-[#6B7280] dark:text-[#A3A3AD] block">Serviço:</span>
                <span className="font-heading font-semibold text-[#111827] dark:text-[#F5F5F5] block">
                  {selectedAppt.service.name}
                </span>
                <span className="text-xs text-[#6B7280] dark:text-[#A3A3AD] block mt-0.5">
                  {selectedAppt.service.durationMinutes} minutos
                </span>
              </div>
              <div>
                <span className="text-xs text-[#6B7280] dark:text-[#A3A3AD] block">Data e Horário:</span>
                <span className="font-heading font-semibold text-[#111827] dark:text-[#F5F5F5] block">
                  {formatDate(selectedAppt.startAt)} às {formatTime(selectedAppt.startAt)}
                </span>
              </div>
              <div>
                <span className="text-xs text-[#6B7280] dark:text-[#A3A3AD] block">Status Atual:</span>
                <Badge variant={selectedAppt.status === "CONFIRMED" ? "success" : "default"}>
                  {formatAppointmentStatus(selectedAppt.status)}
                </Badge>
              </div>
            </div>

            {selectedAppt.meetingUrlSnapshot && (
              <div className="p-3.5 bg-[var(--primary)]/10 dark:bg-[var(--primary)]/15 border border-[var(--primary)]/20 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-[#111827] dark:text-[#F5F5F5] block text-xs">
                    Sala de Teleconsulta (Jitsi)
                  </span>
                  <span className="text-xs text-[#6B7280] dark:text-[#A3A3AD]">
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
            <div className="pt-2 border-t border-[#E2E4E8] dark:border-[#303034] space-y-2">
              <span className="text-xs font-heading font-semibold text-[#6B7280] dark:text-[#A3A3AD] block uppercase">
                Atualizar Status
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {selectedAppt.status !== "COMPLETED" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1.5"
                    onClick={() => handleUpdateStatus("COMPLETED")}
                  >
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Realizado</span>
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
                    <span>No-Show</span>
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
                    <span>Cancelar</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ================= MODAL: CRIAR AGENDAMENTO ================= */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Novo Agendamento no Consultório"
        description="Agende uma consulta diretamente com validação atômica de horários"
      >
        <form onSubmit={handleCreateAppointment} className="space-y-4 text-xs sm:text-sm">
          {modalError && <Alert variant="destructive">{modalError}</Alert>}

          <div className="space-y-3">
            <Select
              label="Paciente *"
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
            </Select>

            <Select
              label="Serviço *"
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
            </Select>

            <Input
              label="Data da Consulta *"
              type="date"
              value={appointmentDate}
              onChange={(e) => setAppointmentDate(e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Horário Inicial *"
                type="time"
                value={appointmentTime}
                onChange={(e) => setAppointmentTime(e.target.value)}
                required
              />

              <Input
                label="Duração (min) *"
                type="number"
                min={15}
                step={5}
                value={appointmentDuration}
                onChange={(e) => setAppointmentDuration(Number(e.target.value))}
                required
              />
            </div>

            <Select
              label="Modalidade *"
              value={appointmentModality}
              onChange={(e) => setAppointmentModality(e.target.value as "PRESENTIAL" | "ONLINE" | "BOTH")}
            >
              <option value="ONLINE">Online (Teleconsulta)</option>
              <option value="PRESENTIAL">Presencial no Consultório</option>
              <option value="BOTH">Híbrido</option>
            </Select>
          </div>

          {/* Opções de Encaixe e Cortesia */}
          <div className="p-3.5 bg-[#F8F9FA] dark:bg-[#141416] rounded-2xl space-y-2 border border-[#E2E4E8] dark:border-[#303034]">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isAdminOverride}
                onChange={(e) => setIsAdminOverride(e.target.checked)}
                className="rounded border-[#E2E4E8] text-[var(--primary)] focus:ring-[var(--primary)] h-4 w-4"
              />
              <span className="text-xs sm:text-sm font-medium text-[#111827] dark:text-[#F5F5F5]">
                Encaixe com override de disponibilidade (fora da grade padrão)
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isFreeOneOff}
                onChange={(e) => setIsFreeOneOff(e.target.checked)}
                className="rounded border-[#E2E4E8] text-[var(--primary)] focus:ring-[var(--primary)] h-4 w-4"
              />
              <span className="text-xs sm:text-sm font-medium text-[#111827] dark:text-[#F5F5F5]">
                Tornar esta sessão específica gratuita (cortesia pontual)
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
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
