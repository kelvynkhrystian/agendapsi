"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Sparkles, Eye, Save, RotateCcw, BellRing, History } from "lucide-react";

interface NotificationTemplate {
  id: string;
  eventType: string;
  title: string;
  body: string;
  deliveryMode: "APP_ONLY" | "APP_EMAIL" | "ALL_CHANNELS";
}

export default function AdminRemindersPage() {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [selectedEventType, setSelectedEventType] = useState<string>("");
  const [editedTitle, setEditedTitle] = useState("");
  const [editedBody, setEditedBody] = useState("");
  const [editedMode, setEditedMode] = useState<"APP_ONLY" | "APP_EMAIL" | "ALL_CHANNELS">("APP_ONLY");
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [templateFeedback, setTemplateFeedback] = useState<string | null>(null);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/notification-templates");
      if (res.ok) {
        const data: NotificationTemplate[] = await res.json();
        setTemplates(data);
        if (data.length > 0) {
          setSelectedEventType(data[0].eventType);
          setEditedTitle(data[0].title);
          setEditedBody(data[0].body);
          setEditedMode(data[0].deliveryMode);
        }
      }
    } catch (e) {
      console.error("Falha ao carregar templates de lembretes:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleSelectTemplate = (evt: string) => {
    setSelectedEventType(evt);
    const found = templates.find((t) => t.eventType === evt);
    if (found) {
      setEditedTitle(found.title);
      setEditedBody(found.body);
      setEditedMode(found.deliveryMode);
    }
    setTemplateFeedback(null);
  };

  const handleSaveTemplate = async () => {
    if (!selectedEventType) return;
    setIsSavingTemplate(true);
    setTemplateFeedback(null);

    try {
      const res = await fetch(`/api/admin/notification-templates/${selectedEventType}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editedTitle,
          body: editedBody,
          deliveryMode: editedMode,
        }),
      });

      if (res.ok) {
        setTemplates((prev) =>
          prev.map((t) =>
            t.eventType === selectedEventType
              ? { ...t, title: editedTitle, body: editedBody, deliveryMode: editedMode }
              : t
          )
        );
        setTemplateFeedback("Template de mensagem atualizado com sucesso!");
        setTimeout(() => setTemplateFeedback(null), 4000);
      }
    } catch (e) {
      console.error("Erro ao salvar template:", e);
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleRestoreTemplateDefault = async () => {
    if (!selectedEventType) return;
    setIsSavingTemplate(true);
    try {
      const res = await fetch("/api/admin/notification-templates/restore-default", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventType: selectedEventType }),
      });
      if (res.ok) {
        const data = await res.json();
        setEditedTitle(data.template.title);
        setEditedBody(data.template.body);
        setEditedMode(data.template.deliveryMode);
        setTemplates((prev) =>
          prev.map((t) => (t.eventType === selectedEventType ? data.template : t))
        );
        setTemplateFeedback("Template restaurado para o padrão do sistema.");
        setTimeout(() => setTemplateFeedback(null), 4000);
      }
    } catch (e) {
      console.error("Erro ao restaurar template padrão:", e);
    } finally {
      setIsSavingTemplate(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl">
        <div className="h-8 w-60 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
          <div className="lg:col-span-2 h-96 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  // Gera prévia do texto substituindo variáveis de exemplo
  const previewTitle = editedTitle
    .replace("{nome_paciente}", "Carlos Eduardo")
    .replace("{nome_profissional}", "Dr(a). Silva")
    .replace("{servico}", "Psicoterapia Individual")
    .replace("{data}", "10/11/2026")
    .replace("{hora}", "14:30")
    .replace("{valor}", "R$ 180,00")
    .replace("{local}", "Sala Virtual Segura")
    .replace("{link_consulta}", "https://consultorio.psi.br/consulta-virtual/demo");

  const previewBody = editedBody
    .replace("{nome_paciente}", "Carlos Eduardo")
    .replace("{nome_profissional}", "Dr(a). Silva")
    .replace("{servico}", "Psicoterapia Individual")
    .replace("{data}", "10/11/2026")
    .replace("{hora}", "14:30")
    .replace("{valor}", "R$ 180,00")
    .replace("{local}", "Sala Virtual Segura")
    .replace("{link_consulta}", "https://consultorio.psi.br/consulta-virtual/demo");

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <div className="flex items-center gap-2">
          <BellRing className="h-6 w-6 text-teal-600 dark:text-teal-400" />
          <h1 className="text-2xl font-bold tracking-tight">Lembretes & Mensagens</h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Configure os templates de mensagens, lembretes de consultas e regras de disparo (Aplicativo, E-mail e WhatsApp).
        </p>
      </div>

      {/* Subnavegação de Lembretes & Registros */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 text-xs font-medium">
        <Link
          href="/admin/lembretes"
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] font-semibold shadow-xs"
        >
          <BellRing className="h-4 w-4" />
          <span>Configurações de Lembretes</span>
        </Link>
        <Link
          href="/admin/lembretes/registros"
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <History className="h-4 w-4" />
          <span>Registros de Mensagens</span>
        </Link>
      </div>

      <div className="p-4 rounded-xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/60 dark:border-teal-900/40 text-xs text-teal-800 dark:text-teal-300 space-y-1">
        <p className="font-semibold flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-teal-600" />
          <span>Regra de Mensagem Compartilhada Unificada (Task 6)</span>
        </p>
        <p>
          Cada evento possui <strong>uma única mensagem central</strong> (título + corpo) e <strong>um dos três modos de entrega</strong>:
          Somente no aplicativo, Aplicativo + Email, ou Aplicativo + Email + WhatsApp.
        </p>
      </div>

      {templateFeedback && <Alert variant="success">{templateFeedback}</Alert>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Seletor de Eventos */}
        <div className="space-y-3">
          <h3 className="font-bold text-sm">Selecione o Evento</h3>
          <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
            {templates.map((tpl) => (
              <button
                key={tpl.eventType}
                onClick={() => handleSelectTemplate(tpl.eventType)}
                className={`w-full text-left p-3 rounded-xl border text-xs transition-colors flex flex-col gap-1 ${
                  selectedEventType === tpl.eventType
                    ? "border-teal-500 bg-teal-50 dark:bg-teal-950/60 font-semibold text-teal-900 dark:text-teal-200"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                }`}
              >
                <span>{tpl.title}</span>
                <span className="text-[10px] text-slate-400 font-normal truncate">
                  {tpl.deliveryMode === "APP_ONLY" && "Somente Aplicativo"}
                  {tpl.deliveryMode === "APP_EMAIL" && "Aplicativo + Email"}
                  {tpl.deliveryMode === "ALL_CHANNELS" && "App + Email + WhatsApp"}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Editor de Mensagem e Modo de Entrega */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Editar Mensagem do Evento</CardTitle>
              <CardDescription className="text-xs">
                Disparo: <strong>{templates.find((t) => t.eventType === selectedEventType)?.title || selectedEventType}</strong>
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 text-xs">
              {/* Modo de Entrega (Exatamente 3 Opções) */}
              <div className="space-y-2">
                <label className="font-semibold block text-slate-800 dark:text-slate-200">
                  Modo de Entrega Obrigatório:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label
                    className={`p-3 rounded-xl border cursor-pointer flex flex-col gap-1 transition-colors ${
                      editedMode === "APP_ONLY"
                        ? "border-teal-500 bg-teal-50/50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-200 font-semibold"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="deliveryMode"
                        value="APP_ONLY"
                        checked={editedMode === "APP_ONLY"}
                        onChange={() => setEditedMode("APP_ONLY")}
                        className="text-teal-600"
                      />
                      <span>Somente no aplicativo</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-normal">
                      Gera apenas alerta no sininho interno.
                    </span>
                  </label>

                  <label
                    className={`p-3 rounded-xl border cursor-pointer flex flex-col gap-1 transition-colors ${
                      editedMode === "APP_EMAIL"
                        ? "border-teal-500 bg-teal-50/50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-200 font-semibold"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="deliveryMode"
                        value="APP_EMAIL"
                        checked={editedMode === "APP_EMAIL"}
                        onChange={() => setEditedMode("APP_EMAIL")}
                        className="text-teal-600"
                      />
                      <span>Aplicativo + Email</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-normal">
                      Salva no app e envia a mesma mensagem por e-mail.
                    </span>
                  </label>

                  <label
                    className={`p-3 rounded-xl border cursor-pointer flex flex-col gap-1 transition-colors ${
                      editedMode === "ALL_CHANNELS"
                        ? "border-teal-500 bg-teal-50/50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-200 font-semibold"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="deliveryMode"
                        value="ALL_CHANNELS"
                        checked={editedMode === "ALL_CHANNELS"}
                        onChange={() => setEditedMode("ALL_CHANNELS")}
                        className="text-teal-600"
                      />
                      <span>App + Email + WhatsApp</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-normal">
                      Envia por todos os 3 canais simultaneamente.
                    </span>
                  </label>
                </div>
              </div>

              {/* Título */}
              <div className="space-y-1">
                <label className="font-semibold block text-slate-800 dark:text-slate-200">
                  Título da Notificação
                </label>
                <Input
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  placeholder="Ex: Consulta confirmada"
                />
              </div>

              {/* Corpo */}
              <div className="space-y-1">
                <label className="font-semibold block text-slate-800 dark:text-slate-200">
                  Mensagem Completa (Corpo)
                </label>
                <textarea
                  rows={4}
                  value={editedBody}
                  onChange={(e) => setEditedBody(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Escreva a mensagem..."
                />
              </div>

              {/* Tags / Variáveis Dinâmicas */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg space-y-1.5 border border-slate-100 dark:border-slate-800">
                <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                  Variáveis Dinâmicas Disponíveis:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "{nome_paciente}",
                    "{nome_profissional}",
                    "{servico}",
                    "{data}",
                    "{hora}",
                    "{valor}",
                    "{local}",
                    "{link_consulta}",
                  ].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setEditedBody((prev) => `${prev} ${v}`)}
                      className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[11px] hover:bg-teal-50 dark:hover:bg-teal-950/50"
                      title="Clique para adicionar ao texto"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prévia Dinâmica */}
              <div className="space-y-1.5 pt-2">
                <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Eye className="h-4 w-4 text-teal-600" />
                  <span>Prévia do Destinatário:</span>
                </span>
                <div className="p-3.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                  <p className="font-bold text-slate-900 dark:text-slate-100">{previewTitle}</p>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{previewBody}</p>
                </div>
              </div>

              {/* Ações */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleRestoreTemplateDefault}
                  disabled={isSavingTemplate}
                  className="text-xs gap-1.5 text-slate-500 hover:text-slate-800"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Restaurar Padrão</span>
                </Button>

                <Button
                  onClick={handleSaveTemplate}
                  disabled={isSavingTemplate}
                  className="gap-2 text-xs bg-teal-600 hover:bg-teal-700 text-white"
                >
                  <Save className="h-4 w-4" />
                  <span>{isSavingTemplate ? "Salvando..." : "Salvar Template"}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
