"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { formatDate, formatTime } from "@/lib/utils";
import {
  ArrowLeft,
  Mail,
  MessageCircle,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RotateCcw,
  Send,
  Calendar,
  ExternalLink,
  ShieldCheck,
  Info,
  Server,
  Layers,
} from "lucide-react";

interface MessageDetailData {
  id: string;
  recipient: string;
  maskedRecipient: string;
  channel: "EMAIL" | "WHATSAPP";
  templateType: string;
  messageType: string;
  subjectOrCategory: string;
  status: string;
  simulated: boolean;
  provider: string;
  providerMessageId?: string | null;
  attemptCount: number;
  sentAt: string;
  createdAt: string;
  attemptedAt?: string | null;
  acceptedAt?: string | null;
  deliveredAt?: string | null;
  failedAt?: string | null;
  errorCode?: string | null;
  errorDetails?: string | null;
  idempotencyKey?: string | null;
  bodyPreview?: string | null;
  titlePreview?: string | null;
  relatedAppointment?: {
    id: string;
    startAt: string;
    endAt: string;
    status: string;
    modality: string;
    serviceName?: string;
    patientName?: string;
  } | null;
}

export default function AdminMessageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [log, setLog] = useState<MessageDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchDetail = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/message-logs/${id}`);
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Registro de mensagem não encontrado.");
        return;
      }
      const data = await res.json();
      setLog(data.log);
    } catch {
      setError("Falha ao comunicar com o servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handleResend = async () => {
    if (!confirm("Deseja reenviar esta mensagem agora? Uma nova tentativa será registrada.")) {
      return;
    }

    setResending(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/admin/message-logs/${id}/resend`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        setFeedback({ type: "error", text: data.error || "Erro ao reenviar mensagem." });
      } else {
        setFeedback({ type: "success", text: data.message || "Mensagem reenviada com sucesso!" });
        fetchDetail();
      }
    } catch {
      setFeedback({ type: "error", text: "Falha de comunicação com o servidor ao reenviar." });
    } finally {
      setResending(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "ACCEPTED":
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 text-xs gap-1.5 py-1 px-3">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Aceito pelo provedor</span>
          </Badge>
        );
      case "DELIVERED":
        return (
          <Badge variant="outline" className="bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/30 text-xs gap-1.5 py-1 px-3 font-bold">
            <CheckCircle2 className="h-3.5 w-3.5 text-[var(--primary)]" />
            <span>Entregue na Caixa de Entrada</span>
          </Badge>
        );
      case "FAILED":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 border-red-200 dark:border-red-800 text-xs gap-1.5 py-1 px-3">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Falhou</span>
          </Badge>
        );
      case "PENDING":
      case "QUEUED":
      case "PROCESSING":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-200 dark:border-amber-800 text-xs gap-1.5 py-1 px-3">
            <Clock className="h-3.5 w-3.5" />
            <span>Na fila de envio</span>
          </Badge>
        );
      case "WHATSAPP_OPENED":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400 border-green-200 dark:border-green-800 text-xs gap-1.5 py-1 px-3">
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Ação iniciada no WhatsApp</span>
          </Badge>
        );
      case "SIMULATED":
        return (
          <Badge variant="outline" className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700 text-xs gap-1.5 py-1 px-3">
            <Info className="h-3.5 w-3.5" />
            <span>Simulado no Sistema</span>
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs py-1 px-3">
            <span>{status}</span>
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="h-8 w-40 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error || !log) {
    return (
      <div className="space-y-6 max-w-4xl">
        <Link href="/admin/lembretes/registros">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar aos Registros</span>
          </Button>
        </Link>
        <Alert variant="destructive">{error || "Registro não localizado."}</Alert>
      </div>
    );
  }

  const isEmail = log.channel === "EMAIL";

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Botão de Voltar e Ações Superiores */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link href="/admin/lembretes/registros">
          <Button variant="outline" size="sm" className="gap-2 text-xs">
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar aos Registros</span>
          </Button>
        </Link>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={resending}
            onClick={handleResend}
            className="gap-1.5 text-xs text-[var(--primary)] hover:bg-[var(--primary)]/10"
          >
            <Send className="h-3.5 w-3.5" />
            <span>{resending ? "Reenviando..." : "Reenviar Mensagem"}</span>
          </Button>
        </div>
      </div>

      {feedback && (
        <Alert variant={feedback.type === "success" ? "success" : "destructive"}>
          {feedback.text}
        </Alert>
      )}

      {/* Cartão Principal: Detalhes do Disparo */}
      <Card>
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                {isEmail ? (
                  <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                ) : (
                  <MessageCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                )}
                <CardTitle className="text-lg">
                  {log.subjectOrCategory || "Disparo de Mensagem"}
                </CardTitle>
              </div>
              <CardDescription className="text-xs mt-1">
                Identificador: <span className="font-mono">{log.id}</span>
              </CardDescription>
            </div>

            <div>{renderStatusBadge(log.status)}</div>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6 text-xs">
          {/* Grid de Metadados de Envio */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
            <div>
              <span className="text-slate-500 font-medium block">Canal</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm mt-0.5 block">
                {isEmail ? "E-mail (SMTP)" : "WhatsApp"}
              </span>
            </div>

            <div>
              <span className="text-slate-500 font-medium block">Destinatário (Mascarado)</span>
              <span className="font-mono text-slate-800 dark:text-slate-200 text-sm mt-0.5 block">
                {log.maskedRecipient}
              </span>
            </div>

            <div>
              <span className="text-slate-500 font-medium block">Provedor</span>
              <span className="font-mono text-slate-800 dark:text-slate-200 text-sm mt-0.5 block">
                {log.provider}
              </span>
            </div>

            <div>
              <span className="text-slate-500 font-medium block">Tipo da Mensagem</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">
                {log.messageType || log.templateType}
              </span>
            </div>

            <div>
              <span className="text-slate-500 font-medium block">Tentativas de Envio</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">
                {log.attemptCount} tentativa(s)
              </span>
            </div>

            <div>
              <span className="text-slate-500 font-medium block">Data de Registro</span>
              <span className="font-mono text-slate-800 dark:text-slate-200 mt-0.5 block">
                {formatDate(log.sentAt)} às {formatTime(log.sentAt)}
              </span>
            </div>
          </div>

          {/* Message-ID do Provedor (se disponível) */}
          {log.providerMessageId && (
            <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800/80 font-mono text-[11px] flex items-center justify-between gap-2">
              <span className="text-slate-500">ID de Rastreio do Provedor:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 break-all">
                {log.providerMessageId}
              </span>
            </div>
          )}

          {/* Linha do Tempo de Eventos de Entrega */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Clock className="h-4 w-4 text-[var(--primary)]" />
              <span>Linha do Tempo de Entrega</span>
            </h3>

            <div className="space-y-2 pl-2 border-l-2 border-slate-200 dark:border-slate-700 ml-2">
              {/* Evento 1: Criado */}
              <div className="relative pl-4 pb-2">
                <div className="absolute -left-[9px] top-1 h-3 w-3 rounded-full bg-slate-400 border-2 border-white dark:border-slate-900" />
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  Disparo registrado no sistema
                </p>
                <p className="text-[11px] text-slate-500">
                  {formatDate(log.sentAt)} às {formatTime(log.sentAt)}
                </p>
              </div>

              {/* Evento 2: Tentativa */}
              {log.attemptedAt && (
                <div className="relative pl-4 pb-2">
                  <div className="absolute -left-[9px] top-1 h-3 w-3 rounded-full bg-blue-500 border-2 border-white dark:border-slate-900" />
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    Tentativa de envio processada
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {formatDate(log.attemptedAt)} às {formatTime(log.attemptedAt)}
                  </p>
                </div>
              )}

              {/* Evento 3: Aceito pelo Provedor */}
              {log.acceptedAt && (
                <div className="relative pl-4 pb-2">
                  <div className="absolute -left-[9px] top-1 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                  <p className="font-semibold text-emerald-800 dark:text-emerald-300">
                    Aceito pelo servidor / provedor ({log.provider})
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {formatDate(log.acceptedAt)} às {formatTime(log.acceptedAt)} — Submissão concluída com sucesso.
                  </p>
                </div>
              )}

              {/* Evento 4: Entrega Confirmada (Webhook) */}
              {log.deliveredAt && (
                <div className="relative pl-4 pb-2">
                  <div className="absolute -left-[9px] top-1 h-3 w-3 rounded-full bg-[var(--primary)] border-2 border-white dark:border-slate-900" />
                  <p className="font-semibold text-[var(--primary)]">
                    Entrega confirmada no destino (Webhook verificado)
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {formatDate(log.deliveredAt)} às {formatTime(log.deliveredAt)}
                  </p>
                </div>
              )}

              {/* Evento 5: Falha */}
              {log.failedAt && (
                <div className="relative pl-4 pb-2">
                  <div className="absolute -left-[9px] top-1 h-3 w-3 rounded-full bg-red-500 border-2 border-white dark:border-slate-900" />
                  <p className="font-semibold text-red-700 dark:text-red-400">
                    Falha na entrega
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {formatDate(log.failedAt)} às {formatTime(log.failedAt)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Erro Sanitizado (se houver) */}
          {log.errorDetails && (
            <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="font-semibold text-red-700 dark:text-red-400 block">
                Detalhes Técnicos da Falha
              </span>
              <div className="p-3 rounded-lg bg-red-50/70 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 font-mono text-[11px] text-red-800 dark:text-red-300">
                {log.errorCode && <p className="font-bold mb-1">Código: {log.errorCode}</p>}
                <p>{log.errorDetails}</p>
              </div>
            </div>
          )}

          {/* Consulta Vinculada (se aplicável) */}
          {log.relatedAppointment && (
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                Consulta Relacionada
              </span>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {log.relatedAppointment.patientName} — {log.relatedAppointment.serviceName}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Data da Consulta: {formatDate(log.relatedAppointment.startAt)} às {formatTime(log.relatedAppointment.startAt)} ({log.relatedAppointment.modality})
                  </p>
                </div>

                <Link href={`/admin/agenda`}>
                  <Button variant="outline" size="sm" className="text-xs gap-1 h-8">
                    <Calendar className="h-3 w-3" />
                    <span>Ver na Agenda</span>
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
