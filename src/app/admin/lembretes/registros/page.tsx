"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate, formatTime } from "@/lib/utils";
import {
  BellRing,
  History,
  Mail,
  MessageCircle,
  Smartphone,
  Search,
  Filter,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Eye,
  Send,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Info,
} from "pulsoicon-react";

interface MessageLogItem {
  id: string;
  recipient: string;
  maskedRecipient: string;
  channel: "EMAIL" | "WHATSAPP" | "SMS";
  templateType: string;
  messageType: string;
  subjectOrCategory: string;
  status: string;
  simulated: boolean;
  provider: string;
  attemptCount: number;
  sentAt: string;
  attemptedAt?: string;
  acceptedAt?: string;
  deliveredAt?: string;
  failedAt?: string;
  errorCode?: string;
  errorDetails?: string;
  relatedAppointmentId?: string;
}

interface SummaryLast7Days {
  totalAttempts: number;
  accepted: number;
  delivered: number;
  failed: number;
  pending: number;
  simulated: number;
}

export default function AdminMessageLogsPage() {
  const [logs, setLogs] = useState<MessageLogItem[]>([]);
  const [summary, setSummary] = useState<SummaryLast7Days | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Filtros
  const [channel, setChannel] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [search, setSearch] = useState("");

  // Paginação
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Estado de reenvio
  const [resendingId, setResendingId] = useState<string | null>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        channel,
        status,
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
        ...(search ? { search } : {}),
      });

      const res = await fetch(`/api/admin/message-logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotalRecords(data.pagination?.totalRecords || 0);
        setTotalPages(data.pagination?.totalPages || 1);
        setSummary(data.summaryLast7Days || null);
      }
    } catch (e) {
      console.error("Falha ao carregar registros de mensagens:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, channel, status]);

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const handleClearFilters = () => {
    setChannel("ALL");
    setStatus("ALL");
    setStartDate("");
    setEndDate("");
    setSearch("");
    setPage(1);
  };

  const handleResend = async (id: string) => {
    if (!confirm("Deseja reenviar esta mensagem agora? Uma nova tentativa será registrada.")) {
      return;
    }

    setResendingId(id);
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
        fetchLogs();
      }
    } catch {
      setFeedback({ type: "error", text: "Falha de comunicação com o servidor ao reenviar." });
    } finally {
      setResendingId(null);
    }
  };

  const renderStatusBadge = (log: MessageLogItem) => {
    switch (log.status) {
      case "ACCEPTED":
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 text-[11px] gap-1 py-0.5">
            <CheckCircle2 className="h-3 w-3" />
            <span>Aceito pelo provedor</span>
          </Badge>
        );
      case "DELIVERED":
        return (
          <Badge variant="outline" className="bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/30 text-[11px] gap-1 py-0.5 font-bold">
            <CheckCircle2 className="h-3 w-3 text-[var(--primary)]" />
            <span>Entregue</span>
          </Badge>
        );
      case "FAILED":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 border-red-200 dark:border-red-800 text-[11px] gap-1 py-0.5">
            <AlertTriangle className="h-3 w-3" />
            <span>Falhou</span>
          </Badge>
        );
      case "PENDING":
      case "QUEUED":
      case "PROCESSING":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-200 dark:border-amber-800 text-[11px] gap-1 py-0.5">
            <Clock className="h-3 w-3" />
            <span>Na fila</span>
          </Badge>
        );
      case "WHATSAPP_OPENED":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400 border-green-200 dark:border-green-800 text-[11px] gap-1 py-0.5">
            <ExternalLink className="h-3 w-3" />
            <span>Aberto no WhatsApp</span>
          </Badge>
        );
      case "SIMULATED":
        return (
          <Badge variant="outline" className="bg-[#F2F2F2] text-[#404040] dark:bg-[#242424] dark:text-[#CCCCCC] border-[#E5E5E5] dark:border-[#333333] text-[11px] gap-1 py-0.5">
            <Info className="h-3 w-3" />
            <span>Simulado no sistema</span>
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[11px] py-0.5">
            <span>{log.status}</span>
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full">
      {/* Cabeçalho da Página */}
      <div>
        <div className="flex items-center gap-2">
          <History className="h-6 w-6 text-[var(--primary)]" />
          <h1 className="text-2xl font-bold tracking-tight text-[#171717] dark:text-[#F5F5F5]">Registros de Mensagens & Entregas</h1>
        </div>
        <p className="text-sm text-[#737373] dark:text-[#A6A6A6] mt-1">
          Monitoramento em tempo real de disparos externos (E-mail, SMS e WhatsApp), aceitação pelo provedor e confirmações de entrega.
        </p>
      </div>

      {/* Subnavegação de Lembretes & Registros */}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-[#F4F4F5] dark:bg-[#141414] border border-[#E5E5E5] dark:border-[#2C2C2C] w-full sm:w-fit text-xs font-heading font-semibold">
        <Link
          href="/admin/lembretes"
          className="flex items-center justify-center sm:justify-start gap-2 px-3.5 py-2 rounded-xl bg-white text-[var(--button-outline-fg,var(--button-bg,var(--primary)))] border border-[var(--primary)]/20 hover:border-[var(--primary)]/45 hover:bg-[var(--primary)]/[0.04] dark:bg-[#1E1E1E] dark:border-[#333333] dark:text-[#D0D0D0] dark:hover:text-[#F5F5F5] dark:hover:bg-[#262626] transition-colors"
        >
          <BellRing className="h-4 w-4 shrink-0" />
          <span>Lembretes</span>
        </Link>
        <Link
          href="/admin/lembretes/registros"
          className="flex items-center justify-center sm:justify-start gap-2 px-3.5 py-2 rounded-xl bg-[var(--button-bg,var(--primary))] text-[var(--button-fg,#ffffff)] shadow-xs"
        >
          <History className="h-4 w-4 shrink-0" />
          <span>Registros</span>
        </Link>
      </div>

      {feedback && (
        <Alert variant={feedback.type === "success" ? "success" : "destructive"}>
          {feedback.text}
        </Alert>
      )}

      {/* Resumo Consolidado dos Últimos 7 Dias */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3.5 tabular-nums">
          <Card className="p-3.5 sm:p-5">
            <p className="text-[11px] text-[#737373] dark:text-[#A6A6A6] font-medium">Disparos (7 Dias)</p>
            <p className="text-lg sm:text-xl font-bold mt-1 text-[#171717] dark:text-[#F5F5F5]">{summary.totalAttempts}</p>
          </Card>
          <Card className="p-3.5 sm:p-5 border-emerald-200/60 dark:border-emerald-900/40 bg-emerald-50/20 dark:bg-emerald-950/10">
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">Aceitos pelo Provedor</p>
            <p className="text-lg sm:text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">{summary.accepted}</p>
          </Card>
          <Card className="p-3.5 sm:p-5 border-[var(--primary)]/30 bg-[var(--primary)]/10 dark:border-[#393939] dark:bg-[#202020]">
            <p className="text-[11px] text-[var(--primary)] dark:text-[#A6A6A6] font-medium">Entregas Confirmadas</p>
            <p className="text-lg sm:text-xl font-bold text-[var(--primary)] dark:text-[#F5F5F5] mt-1">{summary.delivered}</p>
          </Card>
          <Card className="p-3.5 sm:p-5 border-red-200/60 dark:border-red-900/40 bg-red-50/20 dark:bg-red-950/10">
            <p className="text-[11px] text-red-700 dark:text-red-400 font-medium">Falhas de Envio</p>
            <p className="text-lg sm:text-xl font-bold text-red-700 dark:text-red-400 mt-1">{summary.failed}</p>
          </Card>
          <Card className="p-3.5 sm:p-5 border-[#E5E5E5] dark:border-[#393939] col-span-2 sm:col-span-2 lg:col-span-1">
            <p className="text-[11px] text-[#737373] dark:text-[#A6A6A6] font-medium">Simulados / Fila</p>
            <p className="text-lg sm:text-xl font-bold text-[#404040] dark:text-[#CCCCCC] mt-1">
              {summary.simulated + summary.pending}
            </p>
          </Card>
        </div>
      )}

      {/* Barra de Filtros e Busca */}
      <Card>
        <CardContent className="p-5 sm:p-6">
          <form onSubmit={handleApplyFilters} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
              {/* Filtro Canal */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#404040] dark:text-[#E5E5E5]">
                  Canal
                </label>
                <select
                  value={channel}
                  onChange={(e) => {
                    setChannel(e.target.value);
                    setPage(1);
                  }}
                  className="w-full text-xs rounded-xl border border-[#E5E5E5] dark:border-[#393939] bg-white dark:bg-[#1B1B1B] px-3 py-2 text-[#171717] dark:text-[#F5F5F5] h-10 outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] dark:focus:ring-[#525252]/40 dark:focus:border-[#525252] transition-all shadow-2xs cursor-pointer"
                >
                  <option value="ALL">Todos os Canais</option>
                  <option value="EMAIL">E-mail</option>
                  <option value="SMS">SMS (TextBee)</option>
                  <option value="WHATSAPP">WhatsApp</option>
                </select>
              </div>

              {/* Filtro Status */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#404040] dark:text-[#E5E5E5]">
                  Status da Mensagem
                </label>
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                  className="w-full text-xs rounded-xl border border-[#E5E5E5] dark:border-[#393939] bg-white dark:bg-[#1B1B1B] px-3 py-2 text-[#171717] dark:text-[#F5F5F5] h-10 outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] dark:focus:ring-[#525252]/40 dark:focus:border-[#525252] transition-all shadow-2xs cursor-pointer"
                >
                  <option value="ALL">Todos os Status</option>
                  <option value="ACCEPTED">Aceito pelo provedor</option>
                  <option value="DELIVERED">Entregue</option>
                  <option value="FAILED">Falhou</option>
                  <option value="PENDING">Na fila / Processando</option>
                  <option value="SIMULATED">Simulado no sistema</option>
                  <option value="WHATSAPP_OPENED">Aberto no WhatsApp</option>
                </select>
              </div>

              {/* Data Inicial */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#404040] dark:text-[#E5E5E5]">
                  Data Inicial
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-xs h-10"
                />
              </div>

              {/* Data Final */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#404040] dark:text-[#E5E5E5]">
                  Data Final
                </label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-xs h-10"
                />
              </div>

              {/* Busca Textual */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#404040] dark:text-[#E5E5E5]">
                  Buscar
                </label>
                <Input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Destinatário ou assunto..."
                  rightIcon={<Search className="h-4 w-4" />}
                  className="text-xs h-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:flex sm:items-center sm:justify-end gap-2.5 sm:gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClearFilters}
                className="text-xs gap-1.5 w-full sm:w-auto"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Limpar</span>
              </Button>
              <Button type="submit" size="sm" className="text-xs gap-1.5 w-full sm:w-auto">
                <Filter className="h-3.5 w-3.5" />
                <span>Aplicar Filtros</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Tabela e Cards de Mensagens */}
      <Card>
        <CardHeader className="p-4 sm:p-6 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Histórico de Disparos</CardTitle>
            <CardDescription className="text-xs tabular-nums">
              {totalRecords} registro(s) encontrado(s) no total.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchLogs} className="w-full sm:w-auto text-xs gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Atualizar</span>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center space-y-3">
              <div className="h-6 w-40 bg-[#E5E5E5] dark:bg-[#242424] rounded mx-auto animate-pulse" />
              <div className="h-4 w-60 bg-[#E5E5E5] dark:bg-[#242424] rounded mx-auto animate-pulse" />
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={<Mail className="h-8 w-8 text-[#737373]" />}
                title="Nenhum registro de mensagem encontrado"
                description="Nenhum disparo corresponde aos filtros selecionados ou ainda não houve envios no período."
              />
            </div>
          ) : (
            <>
              {/* Visualização Mobile em Cards */}
              <div className="md:hidden divide-y divide-[#E5E5E5] dark:divide-[#393939]">
                {logs.map((log) => {
                  const isEmail = log.channel === "EMAIL";
                  const isSms = log.channel === "SMS";
                  return (
                    <div key={log.id} className="p-4 space-y-2.5 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 font-semibold text-[#171717] dark:text-[#F5F5F5]">
                          {isEmail ? (
                            <>
                              <Mail className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                              <span>E-mail</span>
                            </>
                          ) : isSms ? (
                            <>
                              <Smartphone className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                              <span>SMS</span>
                            </>
                          ) : (
                            <>
                              <MessageCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span>WhatsApp</span>
                            </>
                          )}
                        </span>
                        {renderStatusBadge(log)}
                      </div>

                      <div className="space-y-0.5">
                        <p className="font-semibold text-[#171717] dark:text-[#F5F5F5] break-words">
                          {log.subjectOrCategory}
                        </p>
                        <p className="font-mono text-[11px] text-[#525252] dark:text-[#CCCCCC] break-all">
                          {log.maskedRecipient}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#737373] dark:text-[#A6A6A6] tabular-nums">
                        <span className="font-mono">
                          {formatDate(log.sentAt)} {formatTime(log.sentAt)}
                        </span>
                        <span>
                          {log.provider} • {log.attemptCount} tent.
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <Link href={`/admin/lembretes/registros/${log.id}`} className="w-full">
                          <Button variant="outline" size="sm" className="w-full h-9 text-xs gap-1.5">
                            <Eye className="h-3.5 w-3.5" />
                            <span>Detalhes</span>
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={resendingId === log.id}
                          onClick={() => handleResend(log.id)}
                          className="w-full h-9 text-xs gap-1.5"
                          title="Reenviar esta mensagem"
                        >
                          <Send className="h-3.5 w-3.5" />
                          <span>{resendingId === log.id ? "Reenviando..." : "Reenviar"}</span>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Visualização Desktop em Tabela */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-[#F8F8F8] dark:bg-[#1B1B1B] border-y border-[#E5E5E5] dark:border-[#393939] text-[#737373] dark:text-[#A6A6A6] font-semibold">
                    <tr>
                      <th className="py-3.5 px-4 sm:px-6">Data e Hora</th>
                      <th className="py-3.5 px-3 sm:px-4">Canal</th>
                      <th className="py-3.5 px-4 sm:px-6">Destinatário</th>
                      <th className="py-3.5 px-4 sm:px-6">Categoria / Assunto</th>
                      <th className="py-3.5 px-3 sm:px-4">Provedor</th>
                      <th className="py-3.5 px-3 sm:px-4">Status</th>
                      <th className="py-3.5 px-3 text-center">Tentativas</th>
                      <th className="py-3.5 px-4 sm:px-6 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E5E5] dark:divide-[#393939]">
                    {logs.map((log) => {
                      const isEmail = log.channel === "EMAIL";
                      const isSms = log.channel === "SMS";
                      return (
                        <tr
                          key={log.id}
                          className="hover:bg-[#F2F2F2]/60 dark:hover:bg-[#292929]/50 transition-colors"
                        >
                          {/* Data e Hora */}
                          <td className="py-3.5 px-4 sm:px-6 font-mono text-[11px] whitespace-nowrap text-[#525252] dark:text-[#CCCCCC] tabular-nums">
                            {formatDate(log.sentAt)} {formatTime(log.sentAt)}
                          </td>

                          {/* Canal */}
                          <td className="py-3.5 px-3 sm:px-4 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 font-medium">
                              {isEmail ? (
                                <>
                                  <Mail className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                  <span>E-mail</span>
                                </>
                              ) : isSms ? (
                                <>
                                  <Smartphone className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                                  <span>SMS</span>
                                </>
                              ) : (
                                <>
                                  <MessageCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                  <span>WhatsApp</span>
                                </>
                              )}
                            </span>
                          </td>

                          {/* Destinatário Mascarado */}
                          <td className="py-3.5 px-4 sm:px-6 font-mono text-[11px] text-[#171717] dark:text-[#F5F5F5]">
                            {log.maskedRecipient}
                          </td>

                          {/* Assunto / Categoria */}
                          <td className="py-3.5 px-4 sm:px-6 max-w-xs truncate text-[#171717] dark:text-[#F5F5F5] font-medium">
                            {log.subjectOrCategory}
                          </td>

                          {/* Provedor */}
                          <td className="py-3.5 px-3 sm:px-4 whitespace-nowrap font-mono text-[10px] text-[#737373] dark:text-[#A6A6A6]">
                            {log.provider}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-3 sm:px-4 whitespace-nowrap">
                            {renderStatusBadge(log)}
                          </td>

                          {/* Tentativas */}
                          <td className="py-3.5 px-3 text-center font-mono font-semibold text-[#404040] dark:text-[#CCCCCC] tabular-nums">
                            {log.attemptCount}
                          </td>

                          {/* Ações */}
                          <td className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap space-x-2">
                            <Link href={`/admin/lembretes/registros/${log.id}`}>
                              <Button variant="ghost" size="sm" className="h-8 text-xs px-2.5 gap-1.5">
                                <Eye className="h-3.5 w-3.5" />
                                <span>Detalhes</span>
                              </Button>
                            </Link>

                            <Button
                              variant="outline"
                              size="sm"
                              disabled={resendingId === log.id}
                              onClick={() => handleResend(log.id)}
                              className="h-8 text-xs px-2.5 gap-1.5"
                              title="Reenviar esta mensagem"
                            >
                              <Send className="h-3.5 w-3.5" />
                              <span>{resendingId === log.id ? "Reenviando..." : "Reenviar"}</span>
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-4 sm:px-6 py-3.5 border-t border-[#E5E5E5] dark:border-[#333333] text-xs text-[#737373] dark:text-[#A6A6A6]">
              <div>
                Página <strong>{page}</strong> de <strong>{totalPages}</strong>
              </div>
              <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-9 sm:h-8 text-xs px-2.5 gap-1 w-full sm:w-auto"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Anterior</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="h-9 sm:h-8 text-xs px-2.5 gap-1 w-full sm:w-auto"
                >
                  <span>Próximo</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
