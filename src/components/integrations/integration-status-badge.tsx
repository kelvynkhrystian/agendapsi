"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Info,
  Loader2,
  Power,
  QrCode,
  ShieldAlert,
  WifiOff,
} from "pulsoicon-react";
import type {
  HealthStatusMeta,
  IntegrationHealthStatus,
} from "@/lib/integrations-health";
import { cn } from "@/lib/utils";

interface IntegrationStatusBadgeProps {
  enabled: boolean;
  status: IntegrationHealthStatus;
  healthMeta?: HealthStatusMeta | null;
  healthMessage?: string | null;
  lastCheckedAt?: string | null;
  lastTestedAt?: string | null;
  className?: string;
}

function formatPtBrTimestamp(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getBadgeVariant(
  variant: HealthStatusMeta["variant"] | undefined,
  enabled: boolean
) {
  if (!enabled) return "secondary" as const;
  switch (variant) {
    case "connected":
      return "success" as const;
    case "partial":
    case "warning":
      return "warning" as const;
    case "error":
      return "destructive" as const;
    case "checking":
      return "default" as const;
    case "disabled":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
}

function renderStatusIcon(status: IntegrationHealthStatus, enabled: boolean) {
  if (!enabled || status === "DISABLED") {
    return <Power className="h-3.5 w-3.5 shrink-0" />;
  }
  switch (status) {
    case "CHECKING":
      return <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />;
    case "CONNECTED":
      return <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />;
    case "AWAITING_QR":
      return <QrCode className="h-3.5 w-3.5 shrink-0" />;
    case "DEVICE_OFFLINE":
      return <WifiOff className="h-3.5 w-3.5 shrink-0" />;
    case "PARTIAL_API_ONLY":
    case "PARTIAL_SESSION_ONLY":
    case "RECONNECT_REQUIRED":
      return <AlertTriangle className="h-3.5 w-3.5 shrink-0" />;
    case "INVALID_AUTH":
      return <ShieldAlert className="h-3.5 w-3.5 shrink-0" />;
    case "CONNECTION_FAILED":
    case "SERVICE_UNAVAILABLE":
      return <AlertCircle className="h-3.5 w-3.5 shrink-0" />;
    case "UNVERIFIED":
      return <Clock className="h-3.5 w-3.5 shrink-0" />;
    default:
      return <Info className="h-3.5 w-3.5 shrink-0" />;
  }
}

export function IntegrationStatusBadge({
  enabled,
  status,
  healthMeta,
  healthMessage,
  lastCheckedAt,
  lastTestedAt,
  className,
}: IntegrationStatusBadgeProps) {
  const effectiveStatus: IntegrationHealthStatus = !enabled ? "DISABLED" : status;
  const label = !enabled
    ? "Desativado"
    : healthMeta?.label || "Não configurado";
  const isConnected = enabled && Boolean(healthMeta?.isConnected);
  const isFunctional = enabled && Boolean(healthMeta?.isFunctional);
  const isErrorState =
    enabled &&
    (effectiveStatus === "CONNECTION_FAILED" ||
      effectiveStatus === "INVALID_AUTH" ||
      effectiveStatus === "SERVICE_UNAVAILABLE");
  const isWarningState =
    enabled &&
    (effectiveStatus === "DEVICE_OFFLINE" ||
      effectiveStatus === "RECONNECT_REQUIRED" ||
      effectiveStatus === "AWAITING_QR" ||
      effectiveStatus === "PARTIAL_API_ONLY" ||
      effectiveStatus === "PARTIAL_SESSION_ONLY");

  const checkedFormatted = formatPtBrTimestamp(lastCheckedAt);
  const testedFormatted = formatPtBrTimestamp(lastTestedAt);
  const messageText = !enabled
    ? "Canal desativado. Ative o seletor acima e salve para habilitar verificações e envios reais."
    : healthMessage || healthMeta?.description || null;

  return (
    <div
      className={cn(
        "rounded-xl border border-[#E5E5E5] dark:border-[#333333] bg-[#F8F8F8] dark:bg-[#141414] p-3.5 sm:p-4 space-y-3",
        className
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={getBadgeVariant(healthMeta?.variant, enabled)}
            className="gap-1.5 py-1 px-3 text-xs font-semibold"
          >
            {renderStatusIcon(effectiveStatus, enabled)}
            <span>{label}</span>
          </Badge>
        </div>

        {/* Matriz honesta de 3 dimensões: Ativação, Conexão e Funcionalidade */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 border font-medium",
              enabled
                ? "bg-white dark:bg-[#202020] border-[#E5E5E5] dark:border-[#393939] text-[#171717] dark:text-[#F5F5F5]"
                : "bg-transparent border-[#E5E5E5] dark:border-[#2C2C2C] text-[#737373] dark:text-[#A6A6A6]"
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                enabled ? "bg-emerald-500" : "bg-[#A3A3A3] dark:bg-[#525252]"
              )}
            />
            {enabled ? "Canal ativo" : "Canal desativado"}
          </span>

          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 border font-medium",
              isConnected
                ? "bg-white dark:bg-[#202020] border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400"
                : "bg-transparent border-[#E5E5E5] dark:border-[#2C2C2C] text-[#737373] dark:text-[#A6A6A6]"
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                isConnected ? "bg-emerald-500" : "bg-[#A3A3A3] dark:bg-[#525252]"
              )}
            />
            {isConnected ? "Conectado" : "Desconectado"}
          </span>

          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 border font-medium",
              isFunctional
                ? "bg-white dark:bg-[#202020] border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400"
                : "bg-transparent border-[#E5E5E5] dark:border-[#2C2C2C] text-[#737373] dark:text-[#A6A6A6]"
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                isFunctional ? "bg-emerald-500" : "bg-amber-500 dark:bg-[#737373]"
              )}
            />
            {isFunctional ? "Funcional" : "Indisponível"}
          </span>
        </div>
      </div>

      {messageText && (
        <div
          className={cn(
            "rounded-lg border px-3 py-2 text-xs leading-relaxed",
            isErrorState
              ? "border-red-200 dark:border-red-900/50 bg-red-50/70 dark:bg-red-950/30 text-red-800 dark:text-red-300"
              : isWarningState
              ? "border-amber-200 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/25 text-amber-900 dark:text-amber-300"
              : "border-[#E5E5E5] dark:border-[#2C2C2C] bg-white dark:bg-[#1B1B1B] text-[#525252] dark:text-[#D0D0D0]"
          )}
        >
          {messageText}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-[#737373] dark:text-[#A6A6A6] tabular-nums">
        <span>
          Última verificação:{" "}
          <strong className="font-semibold text-[#404040] dark:text-[#E5E5E5]">
            {checkedFormatted || "Ainda não verificada"}
          </strong>
        </span>
        {testedFormatted && (
          <span>
            Último envio de teste bem-sucedido:{" "}
            <strong className="font-semibold text-[#404040] dark:text-[#E5E5E5]">
              {testedFormatted}
            </strong>
          </span>
        )}
      </div>
    </div>
  );
}
