"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, Clock, Calendar, AlertCircle } from "pulsoicon-react";
import { toLocalDateString } from "@/lib/utils";

export interface Slot {
  startAt: string;
  endAt: string;
  formattedTime: string;
  available: boolean;
  reason?: string;
}

export interface BookingDateTimePickerProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  slots: Slot[];
  selectedSlot: Slot | null;
  onSelectSlot: (slot: Slot) => void;
  isLoadingSlots: boolean;
  slotError: string | null;
  timezone?: string;
}

function parseDateYMD(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0 domingo, 1 segunda...
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(12, 0, 0, 0);
  return date;
}

export function BookingDateTimePicker({
  selectedDate,
  onSelectDate,
  slots,
  selectedSlot,
  onSelectSlot,
  isLoadingSlots,
  slotError,
  timezone = "America/Sao_Paulo",
}: BookingDateTimePickerProps) {
  const todayStr = useMemo(() => toLocalDateString(new Date(), timezone), [timezone]);
  const baseMonday = useMemo(() => getMonday(new Date()), []);

  // Controla o deslocamento da semana (0 = esta semana, 1 = próxima semana...)
  const [weekOffset, setWeekOffset] = useState<number>(0);

  // Calcula a segunda-feira da semana ativa
  const currentMonday = useMemo(() => {
    return addDays(baseMonday, weekOffset * 7);
  }, [baseMonday, weekOffset]);

  // Gera os 7 dias da semana exibida
  const weekDays = useMemo(() => {
    const dayNames = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
    const fullDayNames = [
      "Segunda-feira",
      "Terça-feira",
      "Quarta-feira",
      "Quinta-feira",
      "Sexta-feira",
      "Sábado",
      "Domingo",
    ];

    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(currentMonday, i);
      const dateStr = toLocalDateString(d, timezone);
      const isPast = dateStr < todayStr;
      const isToday = dateStr === todayStr;
      const isSelected = selectedDate === dateStr;

      return {
        date: d,
        dateStr,
        dayNumber: d.getDate(),
        dayName: dayNames[i],
        fullDayName: fullDayNames[i],
        isPast,
        isToday,
        isSelected,
      };
    });
  }, [currentMonday, timezone, todayStr, selectedDate]);

  // Título e intervalo de datas da semana atual
  const { weekTitle, dateRangeText } = useMemo(() => {
    const sunday = addDays(currentMonday, 6);
    const monthNames = [
      "janeiro", "fevereiro", "março", "abril", "maio", "junho",
      "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
    ];

    const range =
      currentMonday.getMonth() === sunday.getMonth()
        ? `${currentMonday.getDate()} a ${sunday.getDate()} de ${monthNames[currentMonday.getMonth()]}`
        : `${currentMonday.getDate()} de ${monthNames[currentMonday.getMonth()]} a ${sunday.getDate()} de ${monthNames[sunday.getMonth()]}`;

    const title =
      weekOffset === 0
        ? "Esta semana"
        : weekOffset === 1
        ? "Próxima semana"
        : `Semana de ${currentMonday.getDate()} de ${monthNames[currentMonday.getMonth()]}`;

    return { weekTitle: title, dateRangeText: range };
  }, [currentMonday, weekOffset]);

  // Se nenhuma data foi selecionada ainda, seleciona a primeira data válida da semana
  useEffect(() => {
    if (!selectedDate) {
      const firstValid = weekDays.find((d) => !d.isPast);
      if (firstValid) {
        onSelectDate(firstValid.dateStr);
      }
    }
  }, [selectedDate, weekDays, onSelectDate]);

  const handlePrevWeek = () => {
    if (weekOffset > 0) {
      setWeekOffset((prev) => prev - 1);
    }
  };

  const handleNextWeek = () => {
    // Limite razoável de horizonte de agendamento (4 semanas ~ 1 mês)
    if (weekOffset < 4) {
      setWeekOffset((prev) => prev + 1);
    }
  };

  // Formata o cabeçalho do dia selecionado
  const selectedDayFormatted = useMemo(() => {
    if (!selectedDate) return "";
    try {
      const d = parseDateYMD(selectedDate);
      return new Intl.DateTimeFormat("pt-BR", {
        weekday: "short",
        day: "numeric",
        month: "short",
      }).format(d);
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  return (
    <div className="space-y-6">
      {/* Seletor Semanal de Datas (Mobile-First) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
        {/* Cabeçalho da Semana com Navegação */}
        <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-100">
          <div>
            <span className="text-[11px] font-bold text-[var(--primary)] uppercase tracking-wider block">
              {weekTitle}
            </span>
            <span className="text-xs font-semibold text-slate-800">
              {dateRangeText}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevWeek}
              disabled={weekOffset <= 0}
              aria-label="Semana anterior"
              className="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-200 text-slate-700 hover:bg-slate-50 active:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextWeek}
              disabled={weekOffset >= 4}
              aria-label="Próxima semana"
              className="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-200 text-slate-700 hover:bg-slate-50 active:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Grade com os 7 Dias da Semana */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {weekDays.map((day) => {
            const isClickable = !day.isPast;

            return (
              <button
                key={day.dateStr}
                type="button"
                disabled={!isClickable}
                onClick={() => onSelectDate(day.dateStr)}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-150 select-none ${
                  day.isSelected
                    ? "bg-[var(--primary)] text-white shadow-sm ring-2 ring-[var(--primary)]/30 font-bold"
                    : isClickable
                    ? "bg-slate-50/70 border border-slate-200/80 hover:border-[var(--primary)]/40 hover:bg-white text-slate-800"
                    : "opacity-35 bg-slate-50 border border-transparent text-slate-400 cursor-not-allowed"
                }`}
                title={!isClickable ? "Data no passado" : day.fullDayName}
              >
                <span
                  className={`text-[10px] min-[360px]:text-[11px] leading-tight ${
                    day.isSelected ? "text-white/90 font-medium" : "text-slate-500 font-normal"
                  }`}
                >
                  {day.dayName}
                </span>

                <span
                  className={`text-xs min-[360px]:text-sm sm:text-base font-bold mt-0.5 leading-none ${
                    day.isSelected ? "text-white" : "text-slate-900"
                  }`}
                >
                  {day.dayNumber}
                </span>

                {day.isToday && !day.isSelected && (
                  <span className="w-1 h-1 rounded-full bg-[var(--primary)] mt-1" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Seção de Horários Disponíveis */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-[var(--primary)]" />
            <span>Horários disponíveis</span>
          </h2>
          {selectedDate && (
            <span className="text-xs text-slate-500 font-medium capitalize">
              {selectedDayFormatted}
            </span>
          )}
        </div>

        {/* Estado: Carregando */}
        {isLoadingSlots ? (
          <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-10 rounded-xl bg-slate-100 animate-pulse border border-slate-200/50"
              />
            ))}
          </div>
        ) : slotError ? (
          /* Estado: Erro */
          <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{slotError}</span>
          </div>
        ) : slots.length > 0 && slots.some((s) => s.available) ? (
          /* Estado: Grade de Horários (3 colunas no mobile) */
          <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
            {slots.map((slot, i) => {
              const isSelected = selectedSlot?.startAt === slot.startAt;

              if (!slot.available) {
                return (
                  <div
                    key={i}
                    title={slot.reason || "Horário indisponível"}
                    className="py-2.5 px-2 rounded-xl text-center font-mono text-xs sm:text-sm font-medium opacity-30 bg-slate-100 border border-slate-200/60 text-slate-400 cursor-not-allowed select-none"
                  >
                    {slot.formattedTime}
                  </div>
                );
              }

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onSelectSlot(slot)}
                  className={`py-2.5 px-2 rounded-xl text-center font-mono text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer select-none ${
                    isSelected
                      ? "bg-[var(--primary)] border-2 border-[var(--primary)] text-white shadow-sm ring-2 ring-[var(--primary)]/20"
                      : "bg-white border border-slate-200 text-slate-800 hover:border-[var(--primary)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/[0.03] active:scale-98"
                  }`}
                >
                  {slot.formattedTime}
                </button>
              );
            })}
          </div>
        ) : (
          /* Estado Vazio */
          <div className="py-8 px-4 bg-slate-50/70 border border-dashed border-slate-200 rounded-2xl text-center space-y-2">
            <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-semibold text-slate-700">
              Nenhum horário disponível para esta data
            </p>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
              Selecione outro dia da semana acima para consultar os horários livres na agenda.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
