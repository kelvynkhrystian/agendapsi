"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import {
  Calendar,
  Plus,
  Trash2,
  Copy,
  Clock,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertTriangle,
  CalendarPlus,
  Edit2,
  Info,
  CalendarCheck,
  CalendarOff,
} from "pulsoicon-react";

interface Interval {
  id?: string;
  startTime: string;
  endTime: string;
}

interface DaySchedule {
  dayOfWeek: number;
  dayName: string;
  shortName: string;
  isAvailable: boolean;
  intervals: Interval[];
  savedIntervals?: Interval[]; // para restaurar ao reativar dia
}

interface BlockedDate {
  id: string;
  date: string;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  isBlocked: boolean;
  reason?: string | null;
  isYearlyRecurring: boolean;
}

const WEEKDAYS: { dayOfWeek: number; dayName: string; shortName: string }[] = [
  { dayOfWeek: 1, dayName: "Segunda-feira", shortName: "Seg" },
  { dayOfWeek: 2, dayName: "Terça-feira", shortName: "Ter" },
  { dayOfWeek: 3, dayName: "Quarta-feira", shortName: "Qua" },
  { dayOfWeek: 4, dayName: "Quinta-feira", shortName: "Qui" },
  { dayOfWeek: 5, dayName: "Sexta-feira", shortName: "Sex" },
  { dayOfWeek: 6, dayName: "Sábado", shortName: "Sáb" },
  { dayOfWeek: 0, dayName: "Domingo", shortName: "Dom" },
];

export function HorariosSettingsSection() {
  // Estado da grade semanal
  const [schedule, setSchedule] = useState<DaySchedule[]>(() =>
    WEEKDAYS.map((w) => ({
      ...w,
      isAvailable: w.dayOfWeek >= 1 && w.dayOfWeek <= 5,
      intervals:
        w.dayOfWeek >= 1 && w.dayOfWeek <= 5
          ? [{ startTime: "08:00", endTime: "18:00" }]
          : [{ startTime: "08:00", endTime: "12:00" }],
    }))
  );

  const [isLoadingWeekly, setIsLoadingWeekly] = useState(true);
  const [isSavingWeekly, setIsSavingWeekly] = useState(false);
  const [weeklySuccess, setWeeklySuccess] = useState<string | null>(null);
  const [weeklyError, setWeeklyError] = useState<string | null>(null);

  // Modal / Copiar Horários
  const [copyModalSourceDay, setCopyModalSourceDay] = useState<number | null>(null);
  const [copyTargetDays, setCopyTargetDays] = useState<number[]>([]);

  // Modal / Confirmação Aplicar Segunda a Sexta
  const [confirmWeekdaysSourceDay, setConfirmWeekdaysSourceDay] = useState<number | null>(null);

  // Estado dos Dias Indisponíveis (Bloqueados)
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [isLoadingBlocked, setIsLoadingBlocked] = useState(true);
  const [blockedFeedback, setBlockedFeedback] = useState<string | null>(null);
  const [blockedWarning, setBlockedWarning] = useState<string | null>(null);
  const [blockedError, setBlockedError] = useState<string | null>(null);

  // Modal de Adicionar / Editar Data Indisponível
  const [isBlockedModalOpen, setIsBlockedModalOpen] = useState(false);
  const [editingBlockedId, setEditingBlockedId] = useState<string | null>(null);
  const [formDateType, setFormDateType] = useState<"single" | "range">("single");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formAllDay, setFormAllDay] = useState(true);
  const [formStartTime, setFormStartTime] = useState("08:00");
  const [formEndTime, setFormEndTime] = useState("18:00");
  const [formReason, setFormReason] = useState("");
  const [formIsYearly, setFormIsYearly] = useState(false);
  const [isSubmittingBlocked, setIsSubmittingBlocked] = useState(false);

  // Carregar dados iniciais
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoadingWeekly(true);
        const resWeekly = await fetch("/api/availability/weekly");
        if (resWeekly.ok) {
          const rules: Array<{
            id: string;
            dayOfWeek: number;
            startTime: string;
            endTime: string;
            isActive: boolean;
          }> = await resWeekly.json();

          if (Array.isArray(rules) && rules.length > 0) {
            setSchedule((prev) =>
              prev.map((day) => {
                const dayRules = rules.filter((r) => r.dayOfWeek === day.dayOfWeek);
                if (dayRules.length === 0) {
                  return { ...day, isAvailable: false };
                }
                const hasActive = dayRules.some((r) => r.isActive);
                const intervals = dayRules.map((r) => ({
                  id: r.id,
                  startTime: r.startTime,
                  endTime: r.endTime,
                }));
                return {
                  ...day,
                  isAvailable: hasActive,
                  intervals: intervals.length > 0 ? intervals : [{ startTime: "08:00", endTime: "18:00" }],
                  savedIntervals: intervals,
                };
              })
            );
          }
        }
      } catch (err) {
        console.error("Erro ao carregar disponibilidade semanal:", err);
      } finally {
        setIsLoadingWeekly(false);
      }

      try {
        setIsLoadingBlocked(true);
        const resBlocked = await fetch("/api/availability/exceptions");
        if (resBlocked.ok) {
          const data = await resBlocked.json();
          if (Array.isArray(data)) {
            setBlockedDates(data);
          }
        }
      } catch (err) {
        console.error("Erro ao carregar dias bloqueados:", err);
      } finally {
        setIsLoadingBlocked(false);
      }
    }

    loadData();
  }, []);

  // Handlers da Grade Semanal
  const handleToggleDay = (dayOfWeek: number) => {
    setSchedule((prev) =>
      prev.map((d) => {
        if (d.dayOfWeek !== dayOfWeek) return d;
        const nextAvailable = !d.isAvailable;
        return {
          ...d,
          isAvailable: nextAvailable,
          // Preserva intervalos anteriores caso reative
          intervals:
            nextAvailable && d.intervals.length === 0
              ? d.savedIntervals && d.savedIntervals.length > 0
                ? d.savedIntervals
                : [{ startTime: "08:00", endTime: "18:00" }]
              : d.intervals,
        };
      })
    );
  };

  const handleAddInterval = (dayOfWeek: number) => {
    setSchedule((prev) =>
      prev.map((d) => {
        if (d.dayOfWeek !== dayOfWeek) return d;
        // Sugere horário logo após o último intervalo
        let newStart = "14:00";
        let newEnd = "18:00";
        if (d.intervals.length > 0) {
          const last = d.intervals[d.intervals.length - 1];
          const [h, m] = last.endTime.split(":").map(Number);
          const nextH = Math.min(23, h + 1);
          newStart = `${String(nextH).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
          const nextEndH = Math.min(23, nextH + 3);
          newEnd = `${String(nextEndH).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        }
        return {
          ...d,
          intervals: [...d.intervals, { startTime: newStart, endTime: newEnd }],
        };
      })
    );
  };

  const handleRemoveInterval = (dayOfWeek: number, index: number) => {
    setSchedule((prev) =>
      prev.map((d) => {
        if (d.dayOfWeek !== dayOfWeek) return d;
        const nextIntervals = d.intervals.filter((_, i) => i !== index);
        return {
          ...d,
          intervals: nextIntervals,
          // Se removeu todos os intervalos, marca o dia como indisponível
          isAvailable: nextIntervals.length > 0 ? d.isAvailable : false,
        };
      })
    );
  };

  const handleUpdateInterval = (
    dayOfWeek: number,
    index: number,
    field: "startTime" | "endTime",
    value: string
  ) => {
    setSchedule((prev) =>
      prev.map((d) => {
        if (d.dayOfWeek !== dayOfWeek) return d;
        const nextIntervals = [...d.intervals];
        nextIntervals[index] = { ...nextIntervals[index], [field]: value };
        return { ...d, intervals: nextIntervals };
      })
    );
  };

  const handleClearDay = (dayOfWeek: number) => {
    setSchedule((prev) =>
      prev.map((d) => {
        if (d.dayOfWeek !== dayOfWeek) return d;
        return {
          ...d,
          isAvailable: false,
          intervals: [],
        };
      })
    );
  };

  // Copiar Horários
  const handleOpenCopyModal = (dayOfWeek: number) => {
    setCopyModalSourceDay(dayOfWeek);
    setCopyTargetDays([]);
  };

  const handleExecuteCopy = () => {
    if (copyModalSourceDay === null || copyTargetDays.length === 0) return;
    const source = schedule.find((d) => d.dayOfWeek === copyModalSourceDay);
    if (!source) return;

    setSchedule((prev) =>
      prev.map((d) => {
        if (!copyTargetDays.includes(d.dayOfWeek)) return d;
        return {
          ...d,
          isAvailable: source.isAvailable,
          intervals: source.intervals.map((inv) => ({ ...inv })),
        };
      })
    );

    setCopyModalSourceDay(null);
    setCopyTargetDays([]);
  };

  // Aplicar de Segunda a Sexta
  const handleApplyToWeekdays = (sourceDayOfWeek: number) => {
    const source = schedule.find((d) => d.dayOfWeek === sourceDayOfWeek);
    if (!source) return;

    setSchedule((prev) =>
      prev.map((d) => {
        if (d.dayOfWeek >= 1 && d.dayOfWeek <= 5) {
          return {
            ...d,
            isAvailable: source.isAvailable,
            intervals: source.intervals.map((inv) => ({ ...inv })),
          };
        }
        return d;
      })
    );
    setConfirmWeekdaysSourceDay(null);
  };

  // Validação e Salvamento da Grade Semanal
  const handleSaveWeekly = async () => {
    setWeeklySuccess(null);
    setWeeklyError(null);

    // Validação de horários
    for (const day of schedule) {
      if (!day.isAvailable) continue;
      if (day.intervals.length === 0) {
        setWeeklyError(`O dia ${day.dayName} está marcado como disponível mas não possui nenhum intervalo cadastrado.`);
        return;
      }
      for (const inv of day.intervals) {
        if (!inv.startTime || !inv.endTime) {
          setWeeklyError(`Preencha o horário de início e término em todos os intervalos de ${day.dayName}.`);
          return;
        }
        if (inv.startTime >= inv.endTime) {
          setWeeklyError(`Em ${day.dayName}, o início (${inv.startTime}) deve ser anterior ao término (${inv.endTime}).`);
          return;
        }
      }

      // Conflito de sobreposição
      const sorted = [...day.intervals].sort((a, b) => a.startTime.localeCompare(b.startTime));
      for (let i = 0; i < sorted.length - 1; i++) {
        if (sorted[i].endTime > sorted[i + 1].startTime) {
          setWeeklyError(
            `Em ${day.dayName}, os intervalos ${sorted[i].startTime}–${sorted[i].endTime} e ${sorted[i + 1].startTime}–${sorted[i + 1].endTime} se sobrepõem.`
          );
          return;
        }
      }
    }

    setIsSavingWeekly(true);
    try {
      const payloadRules: Array<{
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        isActive: boolean;
      }> = [];

      for (const day of schedule) {
        if (!day.isAvailable) {
          // Mantém intervalos salvos com isActive=false para poder reativar
          for (const inv of day.intervals) {
            payloadRules.push({
              dayOfWeek: day.dayOfWeek,
              startTime: inv.startTime,
              endTime: inv.endTime,
              isActive: false,
            });
          }
        } else {
          for (const inv of day.intervals) {
            payloadRules.push({
              dayOfWeek: day.dayOfWeek,
              startTime: inv.startTime,
              endTime: inv.endTime,
              isActive: true,
            });
          }
        }
      }

      const res = await fetch("/api/availability/weekly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules: payloadRules }),
      });

      const data = await res.json();
      if (!res.ok) {
        setWeeklyError(data.error || "Erro ao salvar horários de atendimento.");
        return;
      }

      setWeeklySuccess("Horários de atendimento salvos e atualizados com sucesso!");
    } catch {
      setWeeklyError("Erro de comunicação com o servidor.");
    } finally {
      setIsSavingWeekly(false);
    }
  };

  // Handlers dos Dias Indisponíveis (Bloqueados)
  const handleOpenAddBlocked = () => {
    setEditingBlockedId(null);
    setFormDateType("single");
    const today = new Date().toISOString().slice(0, 10);
    setFormStartDate(today);
    setFormEndDate("");
    setFormAllDay(true);
    setFormStartTime("08:00");
    setFormEndTime("18:00");
    setFormReason("");
    setFormIsYearly(false);
    setBlockedWarning(null);
    setIsBlockedModalOpen(true);
  };

  const handleOpenEditBlocked = (item: BlockedDate) => {
    setEditingBlockedId(item.id);
    const startStr = item.date ? item.date.slice(0, 10) : "";
    const endStr = item.endDate ? item.endDate.slice(0, 10) : "";
    setFormDateType(endStr && endStr !== startStr ? "range" : "single");
    setFormStartDate(startStr);
    setFormEndDate(endStr);
    const isFullDay = !item.startTime && !item.endTime;
    setFormAllDay(isFullDay);
    setFormStartTime(item.startTime || "08:00");
    setFormEndTime(item.endTime || "18:00");
    setFormReason(item.reason || "");
    setFormIsYearly(item.isYearlyRecurring || false);
    setBlockedWarning(null);
    setIsBlockedModalOpen(true);
  };

  const handleSubmitBlocked = async (e: React.FormEvent) => {
    e.preventDefault();
    setBlockedError(null);
    setBlockedFeedback(null);
    setBlockedWarning(null);

    if (!formStartDate) {
      setBlockedError("A data inicial é obrigatória.");
      return;
    }

    if (formDateType === "range") {
      if (!formEndDate) {
        setBlockedError("A data final é obrigatória para intervalos de datas.");
        return;
      }
      if (formEndDate < formStartDate) {
        setBlockedError("A data final deve ser posterior ou igual à data inicial.");
        return;
      }
    }

    if (!formAllDay) {
      if (!formStartTime || !formEndTime) {
        setBlockedError("Informe o horário inicial e final do bloqueio parcial.");
        return;
      }
      if (formStartTime >= formEndTime) {
        setBlockedError("O horário inicial deve ser anterior ao horário final.");
        return;
      }
    }

    setIsSubmittingBlocked(true);
    try {
      const payload = {
        date: formStartDate,
        endDate: formDateType === "range" ? formEndDate : null,
        startTime: formAllDay ? null : formStartTime,
        endTime: formAllDay ? null : formEndTime,
        isBlocked: true,
        reason: formReason.trim() || null,
        isYearlyRecurring: formIsYearly,
      };

      const url = editingBlockedId
        ? `/api/availability/exceptions/${editingBlockedId}`
        : "/api/availability/exceptions";
      const method = editingBlockedId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setBlockedError(data.error || "Erro ao salvar período indisponível.");
        return;
      }

      if (data.warning) {
        setBlockedWarning(data.warning);
      }

      setBlockedFeedback(
        editingBlockedId
          ? "Período indisponível atualizado com sucesso!"
          : "Novo período indisponível cadastrado com sucesso!"
      );

      // Recarrega lista
      const resRefresh = await fetch("/api/availability/exceptions");
      if (resRefresh.ok) {
        const refreshed = await resRefresh.json();
        setBlockedDates(refreshed);
      }

      setIsBlockedModalOpen(false);
    } catch {
      setBlockedError("Erro ao comunicar com o servidor.");
    } finally {
      setIsSubmittingBlocked(false);
    }
  };

  const handleDeleteBlocked = async (id: string) => {
    if (!window.confirm("Deseja realmente remover este período indisponível?")) return;

    try {
      const res = await fetch(`/api/availability/exceptions/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setBlockedError(data.error || "Erro ao remover período indisponível.");
        return;
      }

      setBlockedFeedback("Período indisponível removido com sucesso!");
      setBlockedDates((prev) => prev.filter((d) => d.id !== id));
    } catch {
      setBlockedError("Erro de comunicação ao remover bloqueio.");
    }
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return "";
    const parts = dateStr.slice(0, 10).split("-");
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  return (
    <div className="space-y-8">
      {/* ================= 1. HORÁRIOS DE ATENDIMENTO (GRADE SEMANAL) ================= */}
      <Card className="border-[#E5E5E5] dark:border-[#2C2C2C]">
        <CardHeader className="border-b border-[#E5E5E5] dark:border-[#2C2C2C] pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-[var(--primary)]" />
                <span>Horários de Atendimento</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Defina os dias e intervalos de trabalho semanais do consultório. Suporta múltiplos turnos no mesmo dia (ex: manhã e noite).
              </CardDescription>
            </div>
            <Badge variant="outline" className="w-fit text-[11px]">
              Grade Regular
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-4">
          {weeklySuccess && <Alert variant="success">{weeklySuccess}</Alert>}
          {weeklyError && <Alert variant="destructive">{weeklyError}</Alert>}

          {isLoadingWeekly ? (
            <div className="h-40 rounded-xl bg-[#F4F4F5] dark:bg-[#1C1C1C] animate-pulse" />
          ) : (
            <div className="space-y-4">
              {schedule.map((day) => (
                <div
                  key={day.dayOfWeek}
                  className={`p-4 rounded-xl border transition-all ${
                    day.isAvailable
                      ? "bg-white dark:bg-[#141414] border-[#E5E5E5] dark:border-[#2C2C2C]"
                      : "bg-[#FAFAFA] dark:bg-[#101010] border-dashed border-[#D4D4D4] dark:border-[#262626] opacity-75"
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#F0F0F0] dark:border-[#242424]">
                    <div className="flex items-center gap-3">
                      {/* Toggle Disponível */}
                      <button
                        type="button"
                        onClick={() => handleToggleDay(day.dayOfWeek)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          day.isAvailable
                            ? "bg-[var(--primary,#16a34a)]"
                            : "bg-[#D4D4D4] dark:bg-[#333333]"
                        }`}
                        role="switch"
                        aria-checked={day.isAvailable}
                        aria-label={`Alternar disponibilidade de ${day.dayName}`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            day.isAvailable ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>

                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-[#171717] dark:text-[#F5F5F5]">
                          {day.dayName}
                        </span>
                        <Badge
                          variant={day.isAvailable ? "default" : "secondary"}
                          className={`text-[10px] ${
                            day.isAvailable
                              ? "bg-[var(--primary,#16a34a)]/15 text-[var(--primary,#16a34a)] border border-[var(--primary,#16a34a)]/30"
                              : "bg-[#E5E5E5] text-[#737373] dark:bg-[#262626] dark:text-[#A6A6A6]"
                          }`}
                        >
                          {day.isAvailable ? "Disponível" : "Indisponível"}
                        </Badge>
                      </div>
                    </div>

                    {/* Ações Rápidas por Dia */}
                    {day.isAvailable && (
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenCopyModal(day.dayOfWeek)}
                          className="h-7 px-2 text-xs gap-1 text-[#525252] dark:text-[#A6A6A6] hover:text-[var(--primary)]"
                          title="Copiar horários deste dia para outros dias"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copiar Horários</span>
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmWeekdaysSourceDay(day.dayOfWeek)}
                          className="h-7 px-2 text-xs gap-1 text-[#525252] dark:text-[#A6A6A6] hover:text-[var(--primary)]"
                          title="Copiar horários para todos os dias de Segunda a Sexta"
                        >
                          <CalendarCheck className="h-3.5 w-3.5" />
                          <span>Segunda a Sexta</span>
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleClearDay(day.dayOfWeek)}
                          className="h-7 px-2 text-xs gap-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20"
                          title="Limpar todos os intervalos deste dia"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>Limpar Dia</span>
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Lista de Intervalos */}
                  {day.isAvailable ? (
                    <div className="pt-3 space-y-2.5">
                      {day.intervals.map((inv, idx) => (
                        <div
                          key={idx}
                          className="flex flex-wrap sm:flex-nowrap items-center gap-2 text-xs"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-medium text-[#737373] dark:text-[#A6A6A6] w-14 shrink-0">
                              Turno {idx + 1}:
                            </span>
                            <div className="flex items-center gap-1">
                              <Input
                                type="time"
                                value={inv.startTime}
                                onChange={(e) =>
                                  handleUpdateInterval(day.dayOfWeek, idx, "startTime", e.target.value)
                                }
                                className="h-8 w-24 text-xs font-mono text-center"
                              />
                              <span className="text-[#A3A3A3] text-xs">às</span>
                              <Input
                                type="time"
                                value={inv.endTime}
                                onChange={(e) =>
                                  handleUpdateInterval(day.dayOfWeek, idx, "endTime", e.target.value)
                                }
                                className="h-8 w-24 text-xs font-mono text-center"
                              />
                            </div>
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveInterval(day.dayOfWeek, idx)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                            title="Remover este intervalo"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}

                      <div className="pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddInterval(day.dayOfWeek)}
                          className="h-7 text-xs gap-1 border-dashed text-[var(--primary)] hover:bg-[var(--primary)]/[0.04]"
                        >
                          <Plus className="h-3 w-3" />
                          <span>Adicionar Intervalo</span>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="pt-2 text-xs text-[#737373] dark:text-[#A6A6A6] italic">
                      Consultório fechado neste dia. Horários anteriores permanecem salvos se reativado.
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Botão Independente de Salvar Horários */}
          <div className="flex justify-end pt-4 border-t border-[#E5E5E5] dark:border-[#2C2C2C]">
            <Button
              type="button"
              onClick={handleSaveWeekly}
              disabled={isSavingWeekly || isLoadingWeekly}
              size="lg"
              className="w-full sm:w-auto gap-2 bg-[var(--button-bg,var(--primary))] hover:brightness-105 text-[var(--button-fg,#ffffff)]"
            >
              <Save className="h-4 w-4" />
              <span>{isSavingWeekly ? "Salvando Horários..." : "Salvar Horários"}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ================= 2. DIAS INDISPONÍVEIS (BLOQUEIOS ESPECÍFICOS) ================= */}
      <Card className="border-[#E5E5E5] dark:border-[#2C2C2C]">
        <CardHeader className="border-b border-[#E5E5E5] dark:border-[#2C2C2C] pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarOff className="h-4 w-4 text-[var(--primary)]" />
                <span>Dias Indisponíveis</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Bloqueie datas específicas, feriados, férias ou períodos sem atendimento. Estes bloqueios sobrepõem a grade semanal.
              </CardDescription>
            </div>
            <Button
              type="button"
              onClick={handleOpenAddBlocked}
              size="sm"
              className="gap-1.5 text-xs bg-[var(--button-bg,var(--primary))] text-[var(--button-fg,#ffffff)]"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Adicionar Data</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-4">
          {blockedFeedback && <Alert variant="success">{blockedFeedback}</Alert>}
          {blockedWarning && <Alert variant="warning">{blockedWarning}</Alert>}
          {blockedError && <Alert variant="destructive">{blockedError}</Alert>}

          {isLoadingBlocked ? (
            <div className="h-32 rounded-xl bg-[#F4F4F5] dark:bg-[#1C1C1C] animate-pulse" />
          ) : blockedDates.length === 0 ? (
            <div className="text-center py-8 px-4 rounded-xl border border-dashed border-[#D4D4D4] dark:border-[#2C2C2C] bg-[#FAFAFA] dark:bg-[#141414]">
              <Calendar className="h-8 w-8 mx-auto text-[#A3A3A3] mb-2" />
              <p className="text-xs font-semibold text-[#404040] dark:text-[#E5E5E5]">
                Nenhum bloqueio ou feriado cadastrado
              </p>
              <p className="text-[11px] text-[#737373] dark:text-[#A6A6A6] mt-0.5">
                Clique em &quot;Adicionar Data&quot; para bloquear datas específicas, férias ou recessos.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#F0F0F0] dark:divide-[#242424] border border-[#E5E5E5] dark:border-[#2C2C2C] rounded-xl overflow-hidden">
              {blockedDates.map((item) => {
                const isRange = item.endDate && item.endDate.slice(0, 10) !== item.date.slice(0, 10);
                const isFullDay = !item.startTime && !item.endTime;

                return (
                  <div
                    key={item.id}
                    className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#141414] hover:bg-[#FAFAFA] dark:hover:bg-[#181818] transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-xs sm:text-sm text-[#171717] dark:text-[#F5F5F5] font-mono">
                          {isRange
                            ? `${formatDateDisplay(item.date)} até ${formatDateDisplay(item.endDate!)}`
                            : formatDateDisplay(item.date)}
                        </span>

                        {item.isYearlyRecurring && (
                          <Badge variant="outline" className="text-[10px] bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800">
                            Recorrente todo ano
                          </Badge>
                        )}

                        <Badge
                          variant="secondary"
                          className="text-[10px] bg-[#F4F4F5] dark:bg-[#242424] text-[#525252] dark:text-[#D4D4D4]"
                        >
                          {isFullDay ? "Dia Inteiro" : `${item.startTime} às ${item.endTime}`}
                        </Badge>
                      </div>

                      {item.reason && (
                        <p className="text-xs text-[#525252] dark:text-[#A6A6A6]">
                          {item.reason}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEditBlocked(item)}
                        className="h-8 px-2 text-xs gap-1 text-[#525252] dark:text-[#A6A6A6] hover:text-[var(--primary)]"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Editar</span>
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteBlocked(item.id)}
                        className="h-8 px-2 text-xs gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Excluir</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ================= MODAL: ADICIONAR / EDITAR BLOQUEIO ================= */}
      {isBlockedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2C2C2C] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E5] dark:border-[#2C2C2C]">
              <h3 className="font-semibold text-sm sm:text-base text-[#171717] dark:text-[#F5F5F5] flex items-center gap-2">
                <CalendarPlus className="h-4 w-4 text-[var(--primary)]" />
                <span>{editingBlockedId ? "Editar Período Indisponível" : "Novo Período Indisponível"}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsBlockedModalOpen(false)}
                className="text-[#737373] hover:text-[#171717] dark:hover:text-[#F5F5F5] text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitBlocked} className="space-y-4 text-xs">
              {/* Tipo: Data Única ou Intervalo */}
              <div className="space-y-1.5">
                <label className="font-medium text-[#404040] dark:text-[#D4D4D4]">
                  Tipo de Bloqueio
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormDateType("single")}
                    className={`py-2 px-3 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                      formDateType === "single"
                        ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                        : "bg-white dark:bg-[#202020] border-[#E5E5E5] dark:border-[#333] text-[#525252] dark:text-[#D4D4D4]"
                    }`}
                  >
                    Data Específica
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormDateType("range")}
                    className={`py-2 px-3 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                      formDateType === "range"
                        ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                        : "bg-white dark:bg-[#202020] border-[#E5E5E5] dark:border-[#333] text-[#525252] dark:text-[#D4D4D4]"
                    }`}
                  >
                    Período / Intervalo
                  </button>
                </div>
              </div>

              {/* Datas */}
              {formDateType === "single" ? (
                <div className="space-y-1">
                  <label className="font-medium text-[#404040] dark:text-[#D4D4D4]">
                    Data Bloqueada
                  </label>
                  <Input
                    type="date"
                    required
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="font-medium text-[#404040] dark:text-[#D4D4D4]">
                      Data Inicial
                    </label>
                    <Input
                      type="date"
                      required
                      value={formStartDate}
                      onChange={(e) => setFormStartDate(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-medium text-[#404040] dark:text-[#D4D4D4]">
                      Data Final
                    </label>
                    <Input
                      type="date"
                      required
                      value={formEndDate}
                      onChange={(e) => setFormEndDate(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Duração: Dia Inteiro vs Horário Parcial */}
              <div className="space-y-2 pt-1 border-t border-[#F0F0F0] dark:border-[#262626]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formAllDay}
                    onChange={(e) => setFormAllDay(e.target.checked)}
                    className="rounded border-[#D4D4D4] text-[var(--primary)] focus:ring-[var(--primary)]"
                  />
                  <span className="font-medium text-[#404040] dark:text-[#D4D4D4]">
                    Bloquear o dia inteiro
                  </span>
                </label>

                {!formAllDay && (
                  <div className="grid grid-cols-2 gap-2 pl-5">
                    <div className="space-y-1">
                      <label className="text-[11px] text-[#737373]">Início do bloqueio</label>
                      <Input
                        type="time"
                        value={formStartTime}
                        onChange={(e) => setFormStartTime(e.target.value)}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-[#737373]">Término do bloqueio</label>
                      <Input
                        type="time"
                        value={formEndTime}
                        onChange={(e) => setFormEndTime(e.target.value)}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Motivo Opcional */}
              <div className="space-y-1">
                <label className="font-medium text-[#404040] dark:text-[#D4D4D4]">
                  Motivo ou Observação (Opcional)
                </label>
                <Input
                  type="text"
                  placeholder="Ex: Feriado de Carnaval, Férias Coletivas, Congresso"
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              {/* Recorrência Anual */}
              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsYearly}
                    onChange={(e) => setFormIsYearly(e.target.checked)}
                    className="rounded border-[#D4D4D4] text-[var(--primary)] focus:ring-[var(--primary)]"
                  />
                  <span className="font-medium text-[#404040] dark:text-[#D4D4D4]">
                    Repetir todos os anos (anual)
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E5E5] dark:border-[#2C2C2C]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBlockedModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmittingBlocked}
                  className="bg-[var(--button-bg,var(--primary))] text-[var(--button-fg,#ffffff)]"
                >
                  {isSubmittingBlocked ? "Salvando..." : "Salvar Bloqueio"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: COPIAR HORÁRIOS ================= */}
      {copyModalSourceDay !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2C2C2C] rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4 text-xs">
            <h3 className="font-semibold text-sm text-[#171717] dark:text-[#F5F5F5] flex items-center gap-2">
              <Copy className="h-4 w-4 text-[var(--primary)]" />
              <span>Copiar Horários de {WEEKDAYS.find((w) => w.dayOfWeek === copyModalSourceDay)?.dayName}</span>
            </h3>

            <p className="text-[#737373] dark:text-[#A6A6A6]">
              Selecione para quais dias da semana deseja copiar os intervalos configurados:
            </p>

            <div className="space-y-2 py-1">
              {WEEKDAYS.filter((w) => w.dayOfWeek !== copyModalSourceDay).map((target) => (
                <label
                  key={target.dayOfWeek}
                  className="flex items-center gap-2.5 p-2 rounded-lg border border-[#E5E5E5] dark:border-[#2C2C2C] hover:bg-[#FAFAFA] dark:hover:bg-[#202020] cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={copyTargetDays.includes(target.dayOfWeek)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setCopyTargetDays((prev) => [...prev, target.dayOfWeek]);
                      } else {
                        setCopyTargetDays((prev) => prev.filter((d) => d !== target.dayOfWeek));
                      }
                    }}
                    className="rounded border-[#D4D4D4] text-[var(--primary)] focus:ring-[var(--primary)]"
                  />
                  <span className="font-medium text-[#262626] dark:text-[#E5E5E5]">
                    {target.dayName}
                  </span>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E5E5] dark:border-[#2C2C2C]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCopyModalSourceDay(null)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={copyTargetDays.length === 0}
                onClick={handleExecuteCopy}
                className="bg-[var(--button-bg,var(--primary))] text-[var(--button-fg,#ffffff)]"
              >
                Copiar para {copyTargetDays.length} dia(s)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: CONFIRMAR APLICAR SEGUNDA A SEXTA ================= */}
      {confirmWeekdaysSourceDay !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2C2C2C] rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4 text-xs">
            <h3 className="font-semibold text-sm text-[#171717] dark:text-[#F5F5F5] flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-[var(--primary)]" />
              <span>Aplicar de Segunda a Sexta</span>
            </h3>

            <p className="text-[#525252] dark:text-[#D4D4D4]">
              Deseja realmente aplicar os horários de{" "}
              <strong>
                {WEEKDAYS.find((w) => w.dayOfWeek === confirmWeekdaysSourceDay)?.dayName}
              </strong>{" "}
              para todos os dias úteis (Segunda a Sexta-feira)?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E5E5] dark:border-[#2C2C2C]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setConfirmWeekdaysSourceDay(null)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => handleApplyToWeekdays(confirmWeekdaysSourceDay)}
                className="bg-[var(--button-bg,var(--primary))] text-[var(--button-fg,#ffffff)]"
              >
                Confirmar e Aplicar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
