import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formata centavos de Real (BRL cents) para string em formato moeda pt-BR (ex: R$ 150,00)
 */
export function formatBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

/**
 * Formata data e hora para exibição em pt-BR com base no timezone do consultório
 */
export function formatDateTime(
  date: Date | string,
  timezone: string = "America/Sao_Paulo",
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: timezone,
    dateStyle: options?.dateStyle ?? "short",
    timeStyle: options?.timeStyle ?? "short",
    ...options,
  }).format(d);
}

/**
 * Formata apenas a hora (HH:mm) no timezone do consultório
 */
export function formatTime(date: Date | string, timezone: string = "America/Sao_Paulo"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

/**
 * Formata apenas a data (DD/MM/AAAA) no timezone do consultório
 */
export function formatDate(date: Date | string, timezone: string = "America/Sao_Paulo"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: timezone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

/**
 * Retorna o nome do dia da semana em pt-BR (ex: "Segunda-feira")
 */
export function getDayOfWeekName(dayIndex: number): string {
  const days = [
    "Domingo",
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado",
  ];
  return days[dayIndex] ?? "";
}

/**
 * Mascara segura de CPF: 123.***.***-00
 */
export function maskCPF(cpf?: string | null): string {
  if (!cpf) return "";
  const cleaned = cpf.replace(/\D/g, "");
  if (cleaned.length !== 11) return cpf;
  return `${cleaned.slice(0, 3)}.***.***-${cleaned.slice(9)}`;
}
