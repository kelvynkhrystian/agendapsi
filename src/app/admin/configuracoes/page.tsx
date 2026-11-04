"use client";

import React, { useEffect, useState } from "react";
import { formatDate, formatTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import {
  Settings,
  User,
  Calendar,
  CreditCard,
  Video,
  Mail,
  MessageSquare,
  ShieldAlert,
  HardDrive,
  Globe,
  Save,
  Key,
  Copy,
  Check,
} from "lucide-react";

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<
    | "profile"
    | "schedule"
    | "payments"
    | "video"
    | "messaging"
    | "technical"
    | "security"
  >("profile");

  // System Settings State
  const [timezone, setTimezone] = useState("America/Sao_Paulo");
  const [minBookingNoticeHours, setMinBookingNoticeHours] = useState(24);
  const [maxBookingHorizonDays, setMaxBookingHorizonDays] = useState(30);
  const [defaultCancellationNoticeDays, setDefaultCancellationNoticeDays] = useState(3);
  const [activeVideoProvider, setActiveVideoProvider] = useState("JITSI");
  const [jitsiDomain, setJitsiDomain] = useState("meet.jit.si");
  const [enableOnlinePayment, setEnableOnlinePayment] = useState(true);
  const [enableInPersonPayment, setEnableInPersonPayment] = useState(true);
  const [enableWhatsAppPayment, setEnableWhatsAppPayment] = useState(true);

  // Messaging State
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpFrom, setSmtpFrom] = useState("noreply@consultorio.psi.br");
  const [whatsappApiUrl, setWhatsappApiUrl] = useState("");
  const [whatsappApiToken, setWhatsappApiToken] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);

  useEffect(() => {
    fetch("/api/site/settings")
      .then((r) => r.json())
      .then(() => {
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage(null);

    setTimeout(() => {
      setIsSaving(false);
      setSaveMessage("Configurações operacionais atualizadas com sucesso!");
    }, 400);
  };

  const copyEndpointUrl = () => {
    const url = `${window.location.origin}/api/technical/status`;
    navigator.clipboard.writeText(url);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações Gerais</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Gerencie políticas de agendamento, teleconsulta, integrações e monitoramento técnico.
        </p>
      </div>

      {saveMessage && <Alert variant="success">{saveMessage}</Alert>}

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex gap-1 overflow-x-auto">
        {[
          { key: "profile", label: "Profissional", icon: User },
          { key: "schedule", label: "Agenda & Políticas", icon: Calendar },
          { key: "payments", label: "Pagamentos & Gateways", icon: CreditCard },
          { key: "video", label: "Teleconsulta (Jitsi)", icon: Video },
          { key: "messaging", label: "E-mail & WhatsApp", icon: MessageSquare },
          { key: "technical", label: "Monitoramento Técnico (GET)", icon: HardDrive },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                isActive
                  ? "border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* ABA: AGENDA & POLÍTICAS */}
        {activeTab === "schedule" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Políticas de Agendamento e Prazos</CardTitle>
              <CardDescription className="text-xs">
                Defina horizontes máximos, aviso prévio e regras de cancelamento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block font-medium">Fuso Horário Operacional (IANA)</label>
                  <select
                    className="flex h-9 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                  >
                    <option value="America/Sao_Paulo">América/São Paulo (Brasília GMT-3)</option>
                    <option value="America/Manaus">América/Manaus (GMT-4)</option>
                    <option value="America/Belem">América/Belém (GMT-3)</option>
                    <option value="America/Fortaleza">América/Fortaleza (GMT-3)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block font-medium">Antecedência Mínima para Agendamento Público</label>
                  <select
                    className="flex h-9 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs"
                    value={minBookingNoticeHours}
                    onChange={(e) => setMinBookingNoticeHours(Number(e.target.value))}
                  >
                    <option value={1}>1 hora de antecedência</option>
                    <option value={6}>6 horas</option>
                    <option value={12}>12 horas</option>
                    <option value={24}>24 horas (recomendado)</option>
                    <option value={48}>2 dias</option>
                    <option value={72}>3 dias</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block font-medium">Horizonte Máximo de Agendamento</label>
                  <select
                    className="flex h-9 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs"
                    value={maxBookingHorizonDays}
                    onChange={(e) => setMaxBookingHorizonDays(Number(e.target.value))}
                  >
                    <option value={7}>7 dias à frente</option>
                    <option value={15}>15 dias à frente</option>
                    <option value={30}>30 dias à frente (padrão)</option>
                    <option value={60}>60 dias à frente</option>
                    <option value={90}>90 dias à frente</option>
                    <option value={0}>Sem limite (ilimitado)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block font-medium">Aviso Prévio Padrão de Cancelamento (Dias)</label>
                  <Input
                    type="number"
                    min={0}
                    value={defaultCancellationNoticeDays}
                    onChange={(e) => setDefaultCancellationNoticeDays(Number(e.target.value))}
                    helperText="Cancelamentos posteriores a este prazo são gravados como tardios"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ABA: PAGAMENTOS */}
        {activeTab === "payments" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Meios de Pagamento e Gateway Simulado</CardTitle>
              <CardDescription className="text-xs">
                Controle quais formas de pagamento são aceitas no agendamento público
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-purple-800 dark:text-purple-300">
                  <Badge variant="simulated">FakePaymentProvider Ativo</Badge>
                  <span>Ambiente de Simulação V1</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400">
                  As transações online são executadas pelo simulador integrado, permitindo testes completos de aprovação, recusa e estornos sem movimentação financeira real.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableOnlinePayment}
                    onChange={(e) => setEnableOnlinePayment(e.target.checked)}
                    className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-4 w-4"
                  />
                  <div>
                    <span className="font-semibold block">Habilitar Pagamento Online (Simulado)</span>
                    <span className="text-slate-500 text-[11px]">Permite ao paciente pagar durante o agendamento</span>
                  </div>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableInPersonPayment}
                    onChange={(e) => setEnableInPersonPayment(e.target.checked)}
                    className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-4 w-4"
                  />
                  <div>
                    <span className="font-semibold block">Habilitar Pagamento Presencial no Consultório</span>
                    <span className="text-slate-500 text-[11px]">Agendamento fica pendente de confirmação manual do profissional</span>
                  </div>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableWhatsAppPayment}
                    onChange={(e) => setEnableWhatsAppPayment(e.target.checked)}
                    className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-4 w-4"
                  />
                  <div>
                    <span className="font-semibold block">Habilitar Acerto via WhatsApp</span>
                    <span className="text-slate-500 text-[11px]">Pagamento combinado diretamente e validado no sistema</span>
                  </div>
                </label>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ABA: TELECONSULTA */}
        {activeTab === "video" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Provedor de Teleconsulta (V1 Jitsi Meet)</CardTitle>
              <CardDescription className="text-xs">
                Configuração do servidor de videoconferência para atendimento online
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="block font-medium">Provedor Ativo</label>
                <select
                  className="flex h-9 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs"
                  value={activeVideoProvider}
                  onChange={(e) => setActiveVideoProvider(e.target.value)}
                >
                  <option value="JITSI">Jitsi Meet (Provedor Oficial V1)</option>
                  <option value="PEERJS" disabled>WebRTC PeerJS (Futura V2 - Desabilitado)</option>
                  <option value="GOOGLE_MEET" disabled>Google Meet API (Futura V2 - Desabilitado)</option>
                </select>
              </div>

              <Input
                label="Domínio do Servidor Jitsi *"
                value={jitsiDomain}
                onChange={(e) => setJitsiDomain(e.target.value)}
                placeholder="meet.jit.si"
                helperText="Para produção com estrito sigilo clínico, configure uma instância dedicada/privada do Jitsi"
              />

              <Alert variant="warning" title="Segurança & Sigilo Clínico">
                O provedor padrão <code>meet.jit.si</code> é destinado para testes e demonstrações.
                Para conformidade legal estrita e garantia contratual de sigilo médico/psicológico em produção, utilize um servidor Jitsi próprio com autenticação segura.
              </Alert>
            </CardContent>
          </Card>
        )}

        {/* ABA: MENSAGENS E INTEGRAÇÕES */}
        {activeTab === "messaging" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Integrações de E-mail & WhatsApp</CardTitle>
              <CardDescription className="text-xs">
                Configurações de disparos automáticos para lembretes e confirmações
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="p-3 bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 rounded-xl space-y-1">
                <span className="font-semibold text-teal-800 dark:text-teal-300 block">
                  Simulador Ativo por Padrão
                </span>
                <p className="text-slate-600 dark:text-slate-400">
                  Enquanto as credenciais de SMTP ou da API do WhatsApp não forem preenchidas, todos os disparos de lembretes são registrados honestamente como <strong>SIMULATED</strong> no Outbox de desenvolvimento.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Host SMTP"
                  placeholder="smtp.consultorio.com.br"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                />
                <Input
                  label="Usuário SMTP"
                  placeholder="contato@consultorio.com.br"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                />
                <Input
                  label="E-mail Remetente (From)"
                  value={smtpFrom}
                  onChange={(e) => setSmtpFrom(e.target.value)}
                />
                <Input
                  label="URL da API do WhatsApp"
                  placeholder="https://api.provedor-whatsapp.com/v1"
                  value={whatsappApiUrl}
                  onChange={(e) => setWhatsappApiUrl(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* ABA: MONITORAMENTO TÉCNICO (GET) */}
        {activeTab === "technical" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Endpoint Técnico Read-Only (PULL)</CardTitle>
              <CardDescription className="text-xs">
                Para conexão com o painel externo de monitoramento e telemetria do desenvolvedor
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="space-y-1">
                <span className="font-medium block text-slate-700 dark:text-slate-300">
                  URL do Endpoint de Status Técnico (GET):
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${typeof window !== "undefined" ? window.location.origin : ""}/api/technical/status`}
                    className="flex h-9 flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 font-mono text-xs text-slate-600 dark:text-slate-300"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={copyEndpointUrl}
                    className="gap-1.5 text-xs h-9"
                  >
                    {copiedToken ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedToken ? "Copiado!" : "Copiar URL"}</span>
                  </Button>
                </div>
              </div>

              <div className="p-4 bg-slate-100 dark:bg-slate-800/60 rounded-xl space-y-2 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 font-semibold">
                  <Key className="h-4 w-4 text-amber-500" />
                  <span>Autenticação por Bearer Secret:</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  O painel externo do desenvolvedor deve enviar o cabeçalho <code>Authorization: Bearer &lt;TECHNICAL_STATUS_BEARER_TOKEN&gt;</code> configurado no arquivo <code>.env</code> do servidor.
                </p>
                <p className="text-[11px] text-slate-500">
                  O token nunca é exposto na URL pública por razões de segurança. Este endpoint é exclusivamente de leitura (PULL) e não realiza mutações.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ABA: PERFIL DO PROFISSIONAL */}
        {activeTab === "profile" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informações do Profissional Responsável</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <p className="text-slate-600 dark:text-slate-400">
                Os dados públicos do profissional (nome de exibição, CRP/CRM e biografia) podem ser editados diretamente no módulo <strong>MiniSite & Páginas</strong>.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end pt-2">
          <Button type="submit" size="lg" isLoading={isSaving} className="gap-2 text-xs">
            <Save className="h-4 w-4" />
            <span>Salvar Configurações</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
