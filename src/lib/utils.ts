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

const DEFAULT_TIMEZONE = "America/Sao_Paulo";

function resolveSafeTimezone(timezone?: string | null): string {
  const candidate = timezone?.trim() || DEFAULT_TIMEZONE;
  try {
    new Intl.DateTimeFormat("pt-BR", { timeZone: candidate });
    return candidate;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

/**
 * Formata data e hora para exibição em pt-BR com base no timezone do consultório
 */
export function formatDateTime(
  date: Date | string,
  timezone?: string | null,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: resolveSafeTimezone(timezone),
    dateStyle: options?.dateStyle ?? "short",
    timeStyle: options?.timeStyle ?? "short",
    ...options,
  }).format(d);
}

/**
 * Formata apenas a hora (HH:mm) no timezone do consultório
 */
export function formatTime(date: Date | string, timezone?: string | null): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: resolveSafeTimezone(timezone),
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(d);
}

/**
 * Formata apenas a data (DD/MM/AAAA) no timezone do consultório
 */
export function formatDate(date: Date | string, timezone?: string | null): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: resolveSafeTimezone(timezone),
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

/**
 * Retorna a data no formato YYYY-MM-DD no fuso horário do consultório (padrão America/Sao_Paulo).
 */
export function toLocalDateString(
  dateInput?: Date | string | null,
  timezone?: string | null
): string {
  const d = dateInput
    ? typeof dateInput === "string"
      ? new Date(dateInput)
      : dateInput
    : new Date();
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: resolveSafeTimezone(timezone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * Converte data (YYYY-MM-DD) e hora (HH:mm) do fuso horário informado para um objeto Date UTC exato.
 */
export function zonedTimeToUtc(
  dateStr: string,
  timeStr: string,
  timezone?: string | null
): Date {
  const safeTz = resolveSafeTimezone(timezone);
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);
  const naive = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: safeTz,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });

  const getOffset = (d: Date): number => {
    const parts = formatter.formatToParts(d);
    const p: Record<string, string> = {};
    for (const part of parts) p[part.type] = part.value;
    const formattedDate = new Date(
      Date.UTC(
        parseInt(p.year, 10),
        parseInt(p.month, 10) - 1,
        parseInt(p.day, 10),
        parseInt(p.hour === "24" ? "0" : p.hour, 10),
        parseInt(p.minute, 10),
        parseInt(p.second, 10)
      )
    );
    return formattedDate.getTime() - d.getTime();
  };

  const offset = getOffset(naive);
  const targetUtc = new Date(naive.getTime() - offset);
  const offset2 = getOffset(targetUtc);
  return new Date(naive.getTime() - offset2);
}

/**
 * Converte um timestamp UTC para componentes de data e hora no fuso horário do consultório.
 */
export function utcToZonedTime(
  date: Date | string,
  timezone?: string | null
): { dateStr: string; timeStr: string } {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return { dateStr: "", timeStr: "" };
  return {
    dateStr: toLocalDateString(d, timezone),
    timeStr: formatTime(d, timezone),
  };
}

// Re-exporta helpers centralizados de tradução e localização pt-BR
export * from "./translations";

