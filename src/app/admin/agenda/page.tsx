"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { animateTabContent } from "@/lib/animation/gsap";
import { formatTime, formatDate, getDayOfWeekName, formatAppointmentStatus, formatModality } from "@/lib/utils";
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
  CalendarClock,
  CalendarDays,
  History,
  LayoutGrid,
  ListFilter,
  Check,
  Filter,
  ArrowRight,
  MapPin,
  Sparkles,
} from "lucide-react";

interface RescheduleHistoryItem {
  id: string;
  createdAt: string;
  previousStartAt: string | null;
  previousEndAt: string | null;
  newStartAt: string | null;
  newEndAt: string | null;
  reason: string | null;
}

interface AvailableSlotOption {
  startAt: string;
  endAt: string;
  formattedTime: string;
  available: boolean;
  reason?: string;
}

interface AppointmentItem {
  id: string;
  patientId: string;
  serviceId: string;
  startAt: string;
  endAt: string;
  modality: "PRESENTIAL" | "ONLINE" | "BOTH";
  status: "PENDING_CONFIRMATION" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "LATE_CANCELLED" | "NO_SHOW";
  isAdminOverride: boolean;
  meetingUrlSnapshot?: string | null;
  rescheduleHistory?: RescheduleHistoryItem[];
  establishment?: {
    name: string;
    address: string | null;
    professionalName: string;
  };
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
const WEEKDAY_FULL_NAMES = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

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
  const [clinicTimezone, setClinicTimezone] = useState<string>("America/Sao_Paulo");

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

  // Mês exibido no Mini Calendário
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
  const [statusActionError, setStatusActionError] = useState<string | null>(null);
  const [agendaFeedback, setAgendaFeedback] = useState<string | null>(null);

  // Fluxo de Remarcação dentro de Detalhes da Consulta
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleSlots, setRescheduleSlots] = useState<AvailableSlotOption[]>([]);
  const [selectedRescheduleSlot, setSelectedRescheduleSlot] = useState<AvailableSlotOption | null>(null);
  const [isLoadingRescheduleSlots, setIsLoadingRescheduleSlots] = useState(false);
  const [isSubmittingReschedule, setIsSubmittingReschedule] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);
  const [rescheduleSuccessBanner, setRescheduleSuccessBanner] = useState<string | null>(null);

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

    fetch("/api/admin/services/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.timezone) {
          setClinicTimezone(d.timezone);
        }
      })
      .catch(() => {});
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

  // Navegação no Mini Calendário lateral
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
    setStatusActionError(null);
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

      const data = await res.json().catch(() => null);
      if (res.ok) {
        setSelectedAppt(null);
        setIsRescheduling(false);
        fetchAppointments();
      } else {
        setStatusActionError(data?.error || "Não foi possível atualizar o status da consulta.");
      }
    } catch (e) {
      console.error(e);
      setStatusActionError("Erro de comunicação ao atualizar o status da consulta.");
    }
  };

  const openAppointmentDetails = (appt: AppointmentItem) => {
    setSelectedAppt(appt);
    setIsRescheduling(false);
    setStatusActionError(null);
    setRescheduleError(null);
    setRescheduleSuccessBanner(null);
    setSelectedRescheduleSlot(null);
    setRescheduleSlots([]);
  };

  const loadRescheduleSlots = async (
    dateStr: string,
    serviceId: string,
    appointmentId: string
  ) => {
    if (!dateStr) {
      setRescheduleSlots([]);
      return;
    }
    setIsLoadingRescheduleSlots(true);
    setRescheduleError(null);
    setSelectedRescheduleSlot(null);

    try {
      const res = await fetch(
        `/api/availability/slots?date=${encodeURIComponent(dateStr)}&serviceId=${encodeURIComponent(
          serviceId
        )}&excludeAppointmentId=${encodeURIComponent(appointmentId)}&forAdmin=true`
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setRescheduleSlots([]);
        setRescheduleError(
          data?.error || "Não foi possível carregar os horários disponíveis para esta data."
        );
      } else {
        setRescheduleSlots(Array.isArray(data) ? data : []);
      }
    } catch {
      setRescheduleSlots([]);
      setRescheduleError("Erro de comunicação ao buscar horários disponíveis.");
    } finally {
      setIsLoadingRescheduleSlots(false);
    }
  };

  const handleStartReschedule = () => {
    if (!selectedAppt) return;
    const todayStr = new Date().toISOString().split("T")[0];
    const currentApptDateStr = new Date(selectedAppt.startAt).toISOString().split("T")[0];
    const initialDate = currentApptDateStr >= todayStr ? currentApptDateStr : todayStr;

    setIsRescheduling(true);
    setStatusActionError(null);
    setRescheduleSuccessBanner(null);
    setRescheduleError(null);
    setRescheduleDate(initialDate);
    loadRescheduleSlots(initialDate, selectedAppt.serviceId, selectedAppt.id);
  };

  const handleRescheduleDateChange = (nextDate: string) => {
    setRescheduleDate(nextDate);
    if (selectedAppt) {
      loadRescheduleSlots(nextDate, selectedAppt.serviceId, selectedAppt.id);
    }
  };

  const handleConfirmReschedule = async () => {
    if (!selectedAppt || !selectedRescheduleSlot) return;
    setIsSubmittingReschedule(true);
    setRescheduleError(null);

    try {
      const res = await fetch(`/api/appointments/${selectedAppt.id}/reschedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startAt: selectedRescheduleSlot.startAt,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.appointment) {
        const errMsg =
          res.status === 409
            ? "Este horário não está mais disponível. Selecione outro horário."
            : data?.error || "Não foi possível confirmar a remarcação.";
        setRescheduleError(errMsg);
        if (res.status === 409) {
          setSelectedRescheduleSlot(null);
          if (rescheduleDate) {
            loadRescheduleSlots(rescheduleDate, selectedAppt.serviceId, selectedAppt.id);
          }
        }
        return;
      }

      const updatedAppt: AppointmentItem = data.appointment;
      setSelectedAppt(updatedAppt);
      setAppointments((prev) =>
        prev.map((item) => (item.id === updatedAppt.id ? updatedAppt : item))
      );
      setIsRescheduling(false);
      setSelectedRescheduleSlot(null);
      setRescheduleSuccessBanner("Consulta remarcada com sucesso.");
      setAgendaFeedback("Consulta remarcada com sucesso.");

      const movedDate = new Date(updatedAppt.startAt);
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      if (movedDate < currentWeekStart || movedDate >= weekEnd) {
        handleSelectMiniCalDay(movedDate);
        setMiniCalMonth(movedDate);
      } else {
        fetchAppointments();
      }
    } catch {
      setRescheduleError("Erro de comunicação ao tentar remarcar a consulta.");
    } finally {
      setIsSubmittingReschedule(false);
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

  // Dias da matriz do Mini Calendário
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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-[#E5E5E5] dark:border-[#393939]">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-[#171717] dark:text-[#F5F5F5]">
              {headerMonthTitle}
            </h1>
            <p className="text-xs sm:text-sm text-[#525252] dark:text-[#A6A6A6] mt-0.5">
              Semana de {formatDate(weekDays[0])} a {formatDate(weekDays[6])}
            </p>
          </div>

          {/* Seletor de visualização (Semana / Dia / Lista) */}
          <div className="inline-flex items-center rounded-xl bg-[#F3F4F6] dark:bg-[#141414] p-1 border border-[#E5E5E5] dark:border-[#2C2C2C] text-xs font-heading font-medium gap-1">
            <button
              type="button"
              onClick={() => setViewMode("week")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "week"
                  ? "bg-[var(--button-bg,var(--primary))] text-[var(--button-fg,#ffffff)] font-semibold shadow-xs"
                  : "bg-white text-[var(--button-outline-fg,var(--button-bg,var(--primary)))] border border-[var(--primary)]/20 hover:bg-[var(--primary)]/[0.04] dark:bg-transparent dark:border-transparent dark:text-[#A6A6A6] dark:hover:text-[#FFFFFF]"
              }`}
            >
              Semana
            </button>
            <button
              type="button"
              onClick={() => setViewMode("day")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "day"
                  ? "bg-[var(--button-bg,var(--primary))] text-[var(--button-fg,#ffffff)] font-semibold shadow-xs"
                  : "bg-white text-[var(--button-outline-fg,var(--button-bg,var(--primary)))] border border-[var(--primary)]/20 hover:bg-[var(--primary)]/[0.04] dark:bg-transparent dark:border-transparent dark:text-[#A6A6A6] dark:hover:text-[#FFFFFF]"
              }`}
            >
              Dia
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "list"
                  ? "bg-[var(--button-bg,var(--primary))] text-[var(--button-fg,#ffffff)] font-semibold shadow-xs"
                  : "bg-white text-[var(--button-outline-fg,var(--button-bg,var(--primary)))] border border-[var(--primary)]/20 hover:bg-[var(--primary)]/[0.04] dark:bg-transparent dark:border-transparent dark:text-[#A6A6A6] dark:hover:text-[#FFFFFF]"
              }`}
            >
              Lista
            </button>
          </div>
        </div>

        {/* Controles de Navegação e Ação Primária */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Navegação de Data */}
          <div className="flex items-center rounded-xl border border-[#E5E5E5] dark:border-[#393939] bg-white dark:bg-[#202020] p-1 shadow-2xs">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevWeek}
              className="h-8 w-8 dark:text-[#C0C0C0] dark:hover:text-[#FFFFFF]"
              aria-label="Semana anterior"
              title="Semana anterior"
            >
              <ChevronLeft className="h-4 w-4 text-current" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToday}
              className="text-xs h-8 px-3 font-heading font-semibold dark:text-[#F5F5F5]"
              title="Ir para a semana atual"
            >
              Hoje
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextWeek}
              className="h-8 w-8 dark:text-[#C0C0C0] dark:hover:text-[#FFFFFF]"
              aria-label="Próxima semana"
              title="Próxima semana"
            >
              <ChevronRight className="h-4 w-4 text-current" />
            </Button>
          </div>

          {/* Filtro de Status Rápido */}
          <select
            aria-label="Filtrar agendamentos por status"
            className="h-10 rounded-xl border border-[#E5E5E5] dark:border-[#393939] bg-white dark:bg-[#1B1B1B] px-3.5 text-xs text-[#171717] dark:text-[#F5F5F5] font-medium shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30 dark:focus-visible:ring-[#525252]/40 dark:focus-visible:border-[#525252] cursor-pointer"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">Todos os Status</option>
            <option value="CONFIRMED">Confirmados</option>
            <option value="COMPLETED">Realizados</option>
            <option value="CANCELLED">Cancelados</option>
            <option value="LATE_CANCELLED">Cancelamentos Tardios</option>
            <option value="NO_SHOW">Não Compareceu</option>
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

      {agendaFeedback && (
        <Alert variant="success" className="items-center justify-between">
          <div className="flex items-center justify-between gap-4 w-full">
            <span>{agendaFeedback}</span>
            <button
              type="button"
              onClick={() => setAgendaFeedback(null)}
              className="text-xs font-semibold underline underline-offset-4 cursor-pointer shrink-0"
            >
              Fechar
            </button>
          </div>
        </Alert>
      )}

      {/* ================= 2. WORKSPACE LAYOUT: MAIN CALENDAR + SIDEBAR ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* ================= COLUNA PRINCIPAL: AGENDA (3 COLUNAS) ================= */}
        <div ref={calendarContainerRef} className="lg:col-span-3 space-y-4">
          {/* VISUALIZAÇÃO: SEMANA (WEEK VIEW) */}
          {viewMode === "week" && (
            <div className="rounded-2xl border border-[#E5E5E5] dark:border-[#333333] bg-white dark:bg-[#191919] shadow-xs overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-[#E5E5E5] dark:divide-[#333333]">
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
                          ? "bg-[var(--primary)]/[0.03] dark:bg-[#292929]/30"
                          : "bg-white dark:bg-[#202020]"
                      }`}
                    >
                      {/* Cabeçalho do dia */}
                      <div
                        onClick={() => {
                          setSelectedDayDate(day);
                        }}
                        className={`p-3.5 text-center border-b transition-colors cursor-pointer select-none ${
                          isToday
                            ? "border-[var(--primary)]/30 bg-[var(--primary)]/10 text-[#171717] dark:text-[#F5F5F5] font-bold dark:border-[#393939] dark:bg-[#292929]"
                            : isSelected
                            ? "border-[#E5E5E5] dark:border-[#393939] bg-[#F3F4F6] dark:bg-[#292929] text-[#171717] dark:text-[#F5F5F5]"
                            : "border-slate-100 dark:border-[#393939] text-[#525252] dark:text-[#D0D0D0]"
                        }`}
                      >
                        <div className="text-[11px] font-heading font-semibold uppercase tracking-wider">
                          {getDayOfWeekName(day.getDay()).slice(0, 3)}
                        </div>
                        <div className="mt-1 flex items-center justify-center">
                          <span
                            className={`h-7 w-7 rounded-full flex items-center justify-center font-heading text-sm ${
                              isToday
                                ? "bg-[var(--button-bg,var(--primary))] dark:bg-[var(--dark-accent,var(--primary))] text-[var(--button-fg,var(--primary-foreground,#ffffff))] font-bold shadow-2xs"
                                : "font-bold text-[#171717] dark:text-[#F5F5F5]"
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
                                onClick={() => openAppointmentDetails(appt)}
                                className={`group p-3 rounded-xl border text-xs cursor-pointer transition-all duration-150 hover:-translate-y-0.5 hover:shadow-xs ${
                                  appt.isAdminOverride
                                    ? "border-purple-300 bg-purple-50/80 dark:border-purple-800/60 dark:bg-purple-950/30 text-purple-900 dark:text-purple-200"
                                    : isCancelled
                                    ? "border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20 opacity-75"
                                    : appt.status === "COMPLETED"
                                    ? "border-[#E5E5E5] bg-[#F8F8F8] dark:border-[#393939] dark:bg-[#292929]/50 text-[#525252] dark:text-[#D0D0D0]"
                                    : "border-[var(--primary)]/30 bg-[var(--primary)]/5 dark:border-[#393939] dark:bg-[#202020] hover:border-[var(--primary)] hover:bg-[var(--primary)]/10 dark:hover:bg-[#292929] dark:hover:border-[#525252]"
                                }`}
                              >
                                <div className="flex items-center justify-between font-mono font-semibold text-[11px] mb-1">
                                  <span className="text-[var(--primary)] dark:text-[#F5F5F5]">
                                    {formatTime(appt.startAt, clinicTimezone)}
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

                                <div className="font-heading font-semibold text-xs text-[#171717] dark:text-[#F5F5F5] truncate">
                                  {appt.patient.fullName}
                                </div>

                                <div className="text-[11px] text-[#737373] dark:text-[#A6A6A6] truncate mt-0.5">
                                  {appt.service.name}
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-1 mt-2 pt-1.5 border-t border-black/5 dark:border-white/5">
                                  <span className="text-[10px] text-[#737373] dark:text-[#A6A6A6] flex items-center gap-1 whitespace-nowrap">
                                    {appt.modality === "ONLINE" ? (
                                      <>
                                        <Video className="h-3 w-3 text-[var(--primary)] shrink-0" />
                                        <span>Online</span>
                                      </>
                                    ) : (
                                      <>
                                        <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                                        <span>Presencial</span>
                                      </>
                                    )}
                                  </span>
                                  <span
                                    className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold whitespace-nowrap ${
                                      appt.status === "CONFIRMED"
                                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                                        : appt.status === "COMPLETED"
                                        ? "bg-[#F2F2F2] text-[#525252] border border-[#E5E5E5] dark:bg-[#242424] dark:text-[#D0D0D0] dark:border-[#393939]"
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
              <CardHeader className="p-5 border-b border-[#E5E5E5] dark:border-[#333333] flex flex-row items-center justify-between">
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
                    aria-label="Dia anterior"
                    title="Dia anterior"
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
                    aria-label="Próximo dia"
                    title="Próximo dia"
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
                          onClick={() => openAppointmentDetails(appt)}
                          className="p-4 rounded-xl border border-[#E5E5E5] dark:border-[#333333] bg-white dark:bg-[#191919] hover:border-[var(--primary)]/60 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
                        >
                          <div className="flex items-start gap-4">
                            <div className="px-3.5 py-2 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] font-mono font-bold text-sm shrink-0 border border-[var(--primary)]/20 shadow-2xs">
                              {formatTime(appt.startAt, clinicTimezone)} - {formatTime(appt.endAt, clinicTimezone)}
                            </div>
                            <div>
                              <h4 className="font-heading font-semibold text-base text-[#171717] dark:text-[#F5F5F5]">
                                {appt.patient.fullName}
                              </h4>
                              <p className="text-xs text-[#737373] dark:text-[#A6A6A6] mt-0.5">
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
              <CardHeader className="p-5 border-b border-[#E5E5E5] dark:border-[#393939]">
                <CardTitle className="text-lg">Todas as Consultas da Semana</CardTitle>
                <CardDescription>
                  Visualização cronológica corrida das {filteredAppointments.length} consulta(s)
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5">
                {filteredAppointments.length > 0 ? (
                  <div className="divide-y divide-[#E5E5E5] dark:divide-[#393939]">
                    {filteredAppointments.map((appt) => (
                      <div
                        key={appt.id}
                        onClick={() => openAppointmentDetails(appt)}
                        className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F3F4F6]/50 dark:hover:bg-[#292929]/50 p-2.5 rounded-xl transition-colors cursor-pointer"
                      >
                        <div className="flex items-start gap-3.5">
                          <div className="text-center font-mono text-xs shrink-0 w-24">
                            <span className="font-bold text-[#171717] dark:text-[#F5F5F5] block">
                              {formatDate(appt.startAt, clinicTimezone)}
                            </span>
                            <span className="text-[#737373] dark:text-[#A6A6A6]">
                              {formatTime(appt.startAt, clinicTimezone)}
                            </span>
                          </div>
                          <div>
                            <span className="font-heading font-semibold text-sm text-[#171717] dark:text-[#F5F5F5] block">
                              {appt.patient.fullName}
                            </span>
                            <span className="text-xs text-[#737373] dark:text-[#A6A6A6]">
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

        {/* ================= COLUNA LATERAL: MINI CALENDÁRIO (1 COLUNA) ================= */}
        <div className="space-y-6">
          {/* Card do Mini Calendário */}
          <Card className="shadow-xs overflow-hidden">
            <CardHeader className="p-4 pb-2 border-b border-[#E5E5E5] dark:border-[#393939] bg-[#F8F8F8] dark:bg-[#141414]">
              <div className="flex items-center justify-between">
                <span className="font-heading font-bold text-xs uppercase tracking-wider text-[var(--primary)] dark:text-[#F5F5F5] flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4 text-[var(--primary)] dark:text-[#C0C0C0]" />
                  MINI CALENDÁRIO
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleMiniCalPrevMonth}
                    className="p-1.5 rounded-lg bg-white text-[var(--button-outline-fg,var(--primary))] border border-[var(--primary)]/20 hover:bg-[var(--primary)]/[0.06] dark:bg-[#1E1E1E] dark:border-[#333333] dark:text-[#D0D0D0] dark:hover:text-[#F5F5F5] dark:hover:bg-[#292929] transition-colors cursor-pointer"
                    aria-label="Mês anterior"
                    title="Mês anterior"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleMiniCalNextMonth}
                    className="p-1.5 rounded-lg bg-white text-[var(--button-outline-fg,var(--primary))] border border-[var(--primary)]/20 hover:bg-[var(--primary)]/[0.06] dark:bg-[#1E1E1E] dark:border-[#333333] dark:text-[#D0D0D0] dark:hover:text-[#F5F5F5] dark:hover:bg-[#292929] transition-colors cursor-pointer"
                    aria-label="Próximo mês"
                    title="Próximo mês"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="text-center font-heading font-semibold text-sm text-[#171717] dark:text-[#F5F5F5] pt-1">
                {MONTH_NAMES[miniCalMonth.getMonth()]} {miniCalMonth.getFullYear()}
              </div>
            </CardHeader>

            <CardContent className="p-4 pt-3">
              {/* Linha com iniciais dos dias da semana (D, S, T, Q, Q, S, S) */}
              <div className="grid grid-cols-7 gap-1 text-center font-heading text-[11px] font-semibold text-[#9CA3AF] dark:text-[#A6A6A6] mb-1">
                {WEEKDAY_INITIALS.map((init, i) => (
                  <span
                    key={i}
                    className="py-1"
                    title={WEEKDAY_FULL_NAMES[i]}
                    aria-label={WEEKDAY_FULL_NAMES[i]}
                  >
                    {init}
                  </span>
                ))}
              </div>

              {/* Grid numérico dos dias */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs" role="grid" aria-label="Calendário mensal para seleção rápida de data">
                {miniCalDays.map((item, idx) => {
                  const isCurrentToday =
                    new Date().toDateString() === item.date.toDateString();
                  const isSelected =
                    selectedDayDate.toDateString() === item.date.toDateString();
                  const dayLabel = `${WEEKDAY_FULL_NAMES[item.date.getDay()]}, ${item.date.getDate()} de ${MONTH_NAMES[item.date.getMonth()]} de ${item.date.getFullYear()}`;
                  const hasAppointments = appointments.some((appt) => {
                    const aDate = new Date(appt.startAt);
                    return (
                      aDate.toDateString() === item.date.toDateString() &&
                      appt.status !== "CANCELLED"
                    );
                  });

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectMiniCalDay(item.date)}
                      aria-label={`Selecionar ${dayLabel}${isCurrentToday ? " (Hoje)" : ""}${hasAppointments ? " — possui consultas" : ""}`}
                      aria-pressed={isSelected}
                      title={`${dayLabel}${isCurrentToday ? " (Hoje)" : ""}`}
                      className={`relative h-8 w-8 mx-auto rounded-full flex items-center justify-center font-medium transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[var(--button-bg,var(--primary))] dark:bg-[var(--dark-accent,var(--primary))] text-[var(--button-fg,#ffffff)] font-bold shadow-xs"
                          : isCurrentToday
                          ? "border border-[var(--primary)] dark:border-[var(--primary)] text-[var(--button-outline-fg,var(--primary))] dark:text-[#F5F5F5] font-bold bg-white dark:bg-[#202020]"
                          : item.isCurrentMonth
                          ? "text-[#171717] dark:text-[#F5F5F5] hover:bg-[#F3F4F6] dark:hover:bg-[#292929]"
                          : "text-[#D1D5DB] dark:text-[#737373] hover:text-[#9CA3AF]"
                      }`}
                    >
                      {item.date.getDate()}
                      {hasAppointments && !isSelected && (
                        <span
                          aria-hidden="true"
                          className="absolute bottom-0.5 h-1 w-1 rounded-full bg-[var(--primary)]"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Resumo da Semana */}
          <Card className="shadow-xs">
            <CardHeader className="p-4 pb-2 border-b border-[#E5E5E5] dark:border-[#333333]">
              <CardTitle className="text-xs uppercase tracking-wider font-heading font-semibold text-[#737373] dark:text-[#A6A6A6]">
                Resumo da Semana
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[#737373] dark:text-[#A6A6A6]">Total de Sessões:</span>
                <span className="font-heading font-bold text-sm text-[#171717] dark:text-[#F5F5F5]">
                  {stats.total}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#737373] dark:text-[#A6A6A6]">Confirmadas:</span>
                <span className="font-heading font-semibold text-emerald-600 dark:text-emerald-400">
                  {stats.confirmed}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#737373] dark:text-[#A6A6A6]">Teleconsultas Online:</span>
                <span className="font-heading font-semibold text-[#171717] dark:text-[#F5F5F5]">
                  {stats.online}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#737373] dark:text-[#A6A6A6]">Presenciais no Consultório:</span>
                <span className="font-heading font-semibold text-[#171717] dark:text-[#F5F5F5]">
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
          onClose={() => {
            setSelectedAppt(null);
            setIsRescheduling(false);
            setStatusActionError(null);
            setRescheduleError(null);
            setRescheduleSuccessBanner(null);
          }}
          title={isRescheduling ? "Remarcar Consulta" : "Detalhes da Consulta"}
          description={
            isRescheduling
              ? `${selectedAppt.patient.fullName} • ${selectedAppt.service.name} (${selectedAppt.service.durationMinutes} min)`
              : `Código do Agendamento: ${selectedAppt.id}`
          }
          maxWidth={isRescheduling ? "lg" : "md"}
        >
          {isRescheduling ? (
            <div className="space-y-4 text-xs sm:text-sm">
              {rescheduleError && <Alert variant="destructive">{rescheduleError}</Alert>}

              {/* Data e Horário Atuais */}
              <div className="p-3.5 rounded-2xl border border-[#E5E5E5] dark:border-[#333333] bg-[#F8F8F8] dark:bg-[#141414] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-heading font-semibold text-[#737373] dark:text-[#A6A6A6] block">
                    Data Atual
                  </span>
                  <span className="font-heading font-bold text-sm text-[#171717] dark:text-[#F5F5F5]">
                    {formatDate(selectedAppt.startAt, clinicTimezone)} às{" "}
                    {formatTime(selectedAppt.startAt, clinicTimezone)}
                  </span>
                </div>
                <span className="text-xs text-[#525252] dark:text-[#A6A6A6]">
                  {formatModality(selectedAppt.modality)}
                </span>
              </div>

              {/* Seleção de Novo Dia */}
              <div>
                <Input
                  label="Novo Dia"
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  value={rescheduleDate}
                  onChange={(e) => handleRescheduleDateChange(e.target.value)}
                />
              </div>

              {/* Grade de Horários Disponíveis */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-heading font-semibold uppercase tracking-wide text-[#525252] dark:text-[#D0D0D0]">
                    Horários Disponíveis
                  </span>
                  {rescheduleDate && !isLoadingRescheduleSlots && rescheduleSlots.length > 0 && (
                    <span className="text-[11px] text-[#737373] dark:text-[#A6A6A6]">
                      {rescheduleSlots.filter((s) => s.available).length} livre(s)
                    </span>
                  )}
                </div>

                {isLoadingRescheduleSlots ? (
                  <div className="py-6 text-center text-xs text-[#737373] dark:text-[#A6A6A6] rounded-xl border border-dashed border-[#E5E5E5] dark:border-[#333333]">
                    Verificando disponibilidade da agenda...
                  </div>
                ) : rescheduleSlots.length === 0 ? (
                  <div className="py-5 px-4 text-center text-xs text-[#737373] dark:text-[#A6A6A6] rounded-xl border border-[#E5E5E5] dark:border-[#333333] bg-[#F8F8F8] dark:bg-[#141414]">
                    Nenhum horário disponível para o dia selecionado (dia sem expediente ou data bloqueada).
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-52 overflow-y-auto pr-1">
                      {rescheduleSlots.map((slot) => {
                        const isSelected =
                          selectedRescheduleSlot?.startAt === slot.startAt;
                        const labelTime = formatTime(slot.startAt, clinicTimezone);

                        return (
                          <button
                            key={slot.startAt}
                            type="button"
                            disabled={!slot.available || isSubmittingReschedule}
                            onClick={() => {
                              setSelectedRescheduleSlot(slot);
                              setRescheduleError(null);
                            }}
                            title={
                              slot.available
                                ? `Selecionar ${labelTime}`
                                : slot.reason || "Horário indisponível"
                            }
                            className={`py-2 px-2.5 rounded-xl border font-mono text-xs font-semibold transition-all ${
                              !slot.available
                                ? "bg-[#F3F4F6] text-[#9CA3AF] border-[#E5E5E5] dark:bg-[#141414] dark:text-[#666666] dark:border-[#2C2C2C] opacity-60 cursor-not-allowed line-through"
                                : isSelected
                                ? "bg-[var(--button-bg,var(--primary))] text-[var(--button-fg,#ffffff)] border-[var(--button-bg,var(--primary))] dark:bg-[var(--dark-accent,var(--primary))] dark:text-white shadow-xs cursor-pointer"
                                : "bg-white text-[#171717] border-[#E5E5E5] hover:border-[var(--primary)] hover:bg-[var(--primary)]/[0.05] dark:bg-[#191919] dark:text-[#F5F5F5] dark:border-[#333333] dark:hover:border-[#525252] dark:hover:bg-[#292929] cursor-pointer"
                            }`}
                          >
                            {labelTime}
                          </button>
                        );
                      })}
                    </div>

                    {rescheduleSlots.every((s) => !s.available) && (
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        Todos os horários desta data estão ocupados ou indisponíveis. Selecione outro dia.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Resumo de Confirmação */}
              {selectedRescheduleSlot && (
                <div className="p-3.5 rounded-2xl border border-[var(--primary)]/30 bg-[var(--primary)]/[0.06] dark:bg-[#191919] dark:border-[#393939] space-y-1">
                  <span className="text-xs font-heading font-semibold uppercase tracking-wide text-[var(--primary)] dark:text-[#F5F5F5] block">
                    Novo Horário
                  </span>
                  <p className="font-heading font-bold text-sm text-[#171717] dark:text-[#F5F5F5]">
                    {formatDate(selectedRescheduleSlot.startAt, clinicTimezone)} às{" "}
                    {formatTime(selectedRescheduleSlot.startAt, clinicTimezone)} —{" "}
                    {selectedAppt.service.durationMinutes} min ({formatModality(selectedAppt.modality)})
                  </p>
                  {selectedAppt.modality === "PRESENTIAL" && selectedAppt.establishment?.address ? (
                    <p className="text-xs text-[#525252] dark:text-[#A6A6A6]">
                      Endereço presencial mantido: {selectedAppt.establishment.address}
                    </p>
                  ) : selectedAppt.modality === "ONLINE" ? (
                    <p className="text-xs text-[#525252] dark:text-[#A6A6A6]">
                      Provedor e acesso de teleconsulta serão preservados e atualizados.
                    </p>
                  ) : null}
                </div>
              )}

              {/* Ações do Formulário */}
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-2 border-t border-[#E5E5E5] dark:border-[#333333]">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isSubmittingReschedule}
                  onClick={() => {
                    setIsRescheduling(false);
                    setRescheduleError(null);
                    setSelectedRescheduleSlot(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  isLoading={isSubmittingReschedule}
                  disabled={!selectedRescheduleSlot || isSubmittingReschedule}
                  onClick={handleConfirmReschedule}
                  className="gap-1.5"
                >
                  <CalendarClock className="h-4 w-4 text-current" />
                  <span>Confirmar Remarcação</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-xs sm:text-sm">
              {rescheduleSuccessBanner && (
                <Alert variant="success">{rescheduleSuccessBanner}</Alert>
              )}
              {statusActionError && <Alert variant="destructive">{statusActionError}</Alert>}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-[#F8F8F8] dark:bg-[#141414] border border-[#E5E5E5] dark:border-[#333333] rounded-2xl">
                <div>
                  <span className="text-xs text-[#737373] dark:text-[#A6A6A6] block">Paciente:</span>
                  <span className="font-heading font-semibold text-[#171717] dark:text-[#F5F5F5] block">
                    {selectedAppt.patient.fullName}
                  </span>
                  <span className="text-xs text-[#737373] dark:text-[#A6A6A6] block mt-0.5">
                    {selectedAppt.patient.phone}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-[#737373] dark:text-[#A6A6A6] block">Serviço:</span>
                  <span className="font-heading font-semibold text-[#171717] dark:text-[#F5F5F5] block">
                    {selectedAppt.service.name}
                  </span>
                  <span className="text-xs text-[#737373] dark:text-[#A6A6A6] block mt-0.5">
                    {selectedAppt.service.durationMinutes} minutos • {formatModality(selectedAppt.modality)}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-[#737373] dark:text-[#A6A6A6] block">Data e Horário:</span>
                  <span className="font-heading font-semibold text-[#171717] dark:text-[#F5F5F5] block">
                    {formatDate(selectedAppt.startAt, clinicTimezone)} às {formatTime(selectedAppt.startAt, clinicTimezone)}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-[#737373] dark:text-[#A6A6A6] block">Status Atual:</span>
                  <Badge variant={selectedAppt.status === "CONFIRMED" ? "success" : "default"}>
                    {formatAppointmentStatus(selectedAppt.status)}
                  </Badge>
                </div>
                {selectedAppt.modality === "PRESENTIAL" && selectedAppt.establishment?.address && (
                  <div className="sm:col-span-2 pt-1 border-t border-[#E5E5E5] dark:border-[#2C2C2C]">
                    <span className="text-xs text-[#737373] dark:text-[#A6A6A6] block">Local do Atendimento:</span>
                    <span className="text-xs font-medium text-[#171717] dark:text-[#F5F5F5]">
                      {selectedAppt.establishment.address}
                    </span>
                  </div>
                )}
              </div>

              {selectedAppt.modality !== "PRESENTIAL" && selectedAppt.meetingUrlSnapshot && (
                <div className="p-3.5 bg-[var(--primary)]/10 dark:bg-[var(--primary)]/15 border border-[var(--primary)]/20 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[#171717] dark:text-[#F5F5F5] block text-xs">
                      Sala de Teleconsulta
                    </span>
                    <span className="text-xs text-[#737373] dark:text-[#A6A6A6]">
                      Acesso exclusivo e com sala de espera do PSI
                    </span>
                  </div>
                  <a href={selectedAppt.meetingUrlSnapshot} target="_blank" rel="noreferrer">
                    <Button size="sm" className="gap-1.5 text-xs" title="Abrir sala virtual da consulta">
                      <Video className="h-3.5 w-3.5" />
                      <span>Acessar Sala</span>
                    </Button>
                  </a>
                </div>
              )}

              {selectedAppt.rescheduleHistory && selectedAppt.rescheduleHistory.length > 0 && (
                <div className="p-3.5 rounded-2xl border border-[#E5E5E5] dark:border-[#333333] bg-[#F8F8F8] dark:bg-[#141414] space-y-1.5">
                  <span className="text-xs font-heading font-semibold text-[#525252] dark:text-[#D0D0D0] flex items-center gap-1.5">
                    <History className="h-3.5 w-3.5 text-[var(--primary)] dark:text-[#C0C0C0]" />
                    Histórico de Remarcações
                  </span>
                  <ul className="space-y-1 text-xs text-[#737373] dark:text-[#A6A6A6]">
                    {selectedAppt.rescheduleHistory.slice(0, 3).map((item) => (
                      <li key={item.id}>
                        {item.previousStartAt && item.newStartAt
                          ? `De ${formatDate(item.previousStartAt, clinicTimezone)} às ${formatTime(
                              item.previousStartAt,
                              clinicTimezone
                            )} para ${formatDate(item.newStartAt, clinicTimezone)} às ${formatTime(
                              item.newStartAt,
                              clinicTimezone
                            )}`
                          : "Horário atualizado pela administração"}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Ações no Agendamento */}
              <div className="pt-2 border-t border-[#E5E5E5] dark:border-[#333333] space-y-2.5">
                <span className="text-xs font-heading font-semibold text-[#737373] dark:text-[#A6A6A6] block uppercase">
                  Ações da Consulta
                </span>

                <div className="flex flex-wrap gap-2">
                  {(selectedAppt.status === "CONFIRMED" ||
                    selectedAppt.status === "PENDING_CONFIRMATION" ||
                    selectedAppt.status === "NO_SHOW") && (
                    <Button
                      variant="primary"
                      size="sm"
                      className="text-xs gap-1.5"
                      title="Alterar data e horário desta consulta"
                      onClick={handleStartReschedule}
                    >
                      <CalendarClock className="h-3.5 w-3.5 text-current" />
                      <span>Remarcar</span>
                    </Button>
                  )}

                  {selectedAppt.status !== "COMPLETED" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1.5"
                      title="Marcar consulta como realizada"
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
                      title="Registrar falta do paciente na consulta"
                      onClick={() => handleUpdateStatus("NO_SHOW", "Paciente não compareceu", "RETAIN")}
                    >
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                      <span>Marcar Falta</span>
                    </Button>
                  )}

                  {selectedAppt.status !== "CANCELLED" &&
                    selectedAppt.status !== "LATE_CANCELLED" && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="text-xs gap-1.5"
                        title="Cancelar este agendamento"
                        onClick={() => handleUpdateStatus("CANCELLED", "Cancelado pelo profissional")}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        <span>Cancelar</span>
                      </Button>
                    )}
                </div>
              </div>
            </div>
          )}
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
          <div className="p-3.5 bg-[#F8F8F8] dark:bg-[#141414] rounded-2xl space-y-2 border border-[#E5E5E5] dark:border-[#333333]">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isAdminOverride}
                onChange={(e) => setIsAdminOverride(e.target.checked)}
                className="rounded border-[#E5E5E5] text-[var(--primary)] focus:ring-[var(--primary)] h-4 w-4"
              />
              <span className="text-xs sm:text-sm font-medium text-[#171717] dark:text-[#F5F5F5]">
                Encaixe com liberação especial de disponibilidade (fora da grade padrão)
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isFreeOneOff}
                onChange={(e) => setIsFreeOneOff(e.target.checked)}
                className="rounded border-[#E5E5E5] text-[var(--primary)] focus:ring-[var(--primary)] h-4 w-4"
              />
              <span className="text-xs sm:text-sm font-medium text-[#171717] dark:text-[#F5F5F5]">
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
