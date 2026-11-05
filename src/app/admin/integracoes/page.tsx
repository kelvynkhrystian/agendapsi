"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import {
  Mail,
  MessageSquare,
  ShieldCheck,
  Send,
  Save,
  CheckCircle2,
  AlertTriangle,
  Server,
  Key,
  Globe,
  Radio,
  Lock,
} from "lucide-react";

export default function AdminIntegrationsPage() {
  // Email State
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [emailProvider, setEmailProvider] = useState("SMTP");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpEncryption, setSmtpEncryption] = useState("TLS");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [hasExistingPassword, setHasExistingPassword] = useState(false);
  const [smtpSenderName, setSmtpSenderName] = useState("");
  const [smtpSenderEmail, setSmtpSenderEmail] = useState("");
  const [emailTestAddress, setEmailTestAddress] = useState("");
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [emailMessage, setEmailMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // WhatsApp State
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [whatsappProvider, setWhatsappProvider] = useState("EVOLUTION_API");
  const [whatsappApiUrl, setWhatsappApiUrl] = useState("");
  const [whatsappApiToken, setWhatsappApiToken] = useState("");
  const [hasExistingToken, setHasExistingToken] = useState(false);
  const [whatsappInstanceId, setWhatsappInstanceId] = useState("");
  const [whatsappSenderNumber, setWhatsappSenderNumber] = useState("");
  const [whatsappTestPhone, setWhatsappTestPhone] = useState("");
  const [isSavingWhatsapp, setIsSavingWhatsapp] = useState(false);
  const [isTestingWhatsapp, setIsTestingWhatsapp] = useState(false);
  const [whatsappMessage, setWhatsappMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/integrations")
      .then((r) => r.json())
      .then((data) => {
        if (data.email) {
          setEmailEnabled(data.email.enabled);
          setSmtpHost(data.email.host || "");
          setSmtpPort(data.email.port || 587);
          setSmtpEncryption(data.email.encryption || "TLS");
          setSmtpUser(data.email.user || "");
          setHasExistingPassword(data.email.hasPassword);
          setSmtpSenderName(data.email.senderName || "");
          setSmtpSenderEmail(data.email.senderEmail || "");
        }
        if (data.whatsapp) {
          setWhatsappEnabled(data.whatsapp.enabled);
          setWhatsappProvider(data.whatsapp.provider || "EVOLUTION_API");
          setWhatsappApiUrl(data.whatsapp.apiUrl || "");
          setHasExistingToken(data.whatsapp.hasToken);
          setWhatsappInstanceId(data.whatsapp.instanceId || "");
          setWhatsappSenderNumber(data.whatsapp.senderNumber || "");
        }
        setIsLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setIsLoading(false);
      });
  }, []);

  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingEmail(true);
    setEmailMessage(null);

    try {
      const res = await fetch("/api/admin/integrations/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: emailEnabled,
          host: smtpHost,
          port: Number(smtpPort),
          encryption: smtpEncryption,
          user: smtpUser,
          password: smtpPassword,
          senderName: smtpSenderName,
          senderEmail: smtpSenderEmail,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setEmailMessage({ type: "error", text: data.error || "Erro ao salvar e-mail." });
      } else {
        setEmailMessage({ type: "success", text: "Configurações de e-mail salvas com sucesso!" });
        if (smtpPassword) {
          setHasExistingPassword(true);
          setSmtpPassword("");
        }
      }
    } catch {
      setEmailMessage({ type: "error", text: "Erro de conexão com o servidor." });
    } finally {
      setIsSavingEmail(false);
    }
  };

  const handleTestEmail = async () => {
    setIsTestingEmail(true);
    setEmailMessage(null);

    try {
      const res = await fetch("/api/admin/integrations/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailTestAddress }),
      });

      const data = await res.json();
      if (!res.ok) {
        setEmailMessage({ type: "error", text: data.error || "Falha ao enviar teste de e-mail." });
      } else {
        setEmailMessage({ type: "success", text: data.message });
      }
    } catch {
      setEmailMessage({ type: "error", text: "Erro ao testar envio de e-mail." });
    } finally {
      setIsTestingEmail(false);
    }
  };

  const handleSaveWhatsapp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingWhatsapp(true);
    setWhatsappMessage(null);

    try {
      const res = await fetch("/api/admin/integrations/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: whatsappEnabled,
          provider: whatsappProvider,
          apiUrl: whatsappApiUrl,
          apiToken: whatsappApiToken,
          instanceId: whatsappInstanceId,
          senderNumber: whatsappSenderNumber,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setWhatsappMessage({ type: "error", text: data.error || "Erro ao salvar WhatsApp." });
      } else {
        setWhatsappMessage({ type: "success", text: "Configurações do WhatsApp salvas com sucesso!" });
        if (whatsappApiToken) {
          setHasExistingToken(true);
          setWhatsappApiToken("");
        }
      }
    } catch {
      setWhatsappMessage({ type: "error", text: "Erro de conexão com o servidor." });
    } finally {
      setIsSavingWhatsapp(false);
    }
  };

  const handleTestWhatsapp = async () => {
    setIsTestingWhatsapp(true);
    setWhatsappMessage(null);

    try {
      const res = await fetch("/api/admin/integrations/whatsapp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: whatsappTestPhone }),
      });

      const data = await res.json();
      if (!res.ok) {
        setWhatsappMessage({ type: "error", text: data.error || "Falha no teste de WhatsApp." });
      } else {
        setWhatsappMessage({ type: "success", text: data.message });
      }
    } catch {
      setWhatsappMessage({ type: "error", text: "Erro ao testar conexão do WhatsApp." });
    } finally {
      setIsTestingWhatsapp(false);
    }
  };

  if (isLoading) {
    return <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />;
  }

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integrações Externas</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Configure independentemente os canais de transporte de E-mail (SMTP) e WhatsApp para disparo de notificações.
        </p>
      </div>

      <div className="p-4 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-xs text-slate-800 dark:text-[#F5F5F5] space-y-1">
        <p className="font-semibold flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-[var(--primary)]" />
          <span>Arquitetura Desacoplada e Segura</span>
        </p>
        <p>
          Esta tela gerencia exclusivamente a conexão e credenciais de transporte. Os textos, variáveis dinâmicas e o modo de entrega são gerenciados de forma centralizada em <strong>Lembretes</strong>.
        </p>
      </div>

      {/* Grid com 2 colunas independentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ================= SEÇÃO DE E-MAIL ================= */}
        <div className="space-y-4">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-950 text-[var(--primary)]">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Servidor de E-mail (SMTP)</CardTitle>
                    <CardDescription className="text-xs">
                      Envio de confirmações e lembretes por correio eletrônico
                    </CardDescription>
                  </div>
                </div>

                <Badge variant={emailEnabled && smtpHost ? "success" : "default"}>
                  {emailEnabled && smtpHost ? "Ativo" : "Desativado"}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="pt-5 space-y-4 text-xs">
              {emailMessage && (
                <Alert variant={emailMessage.type === "success" ? "success" : "destructive"}>
                  {emailMessage.text}
                </Alert>
              )}

              <form onSubmit={handleSaveEmail} className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                  <span className="font-medium">Habilitar envio por E-mail</span>
                  <input
                    type="checkbox"
                    checked={emailEnabled}
                    onChange={(e) => setEmailEnabled(e.target.checked)}
                    className="h-4 w-4 rounded text-[var(--primary)] focus:ring-[var(--primary)] cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-slate-700 dark:text-slate-300">Provedor de E-mail</label>
                  <select
                    value={emailProvider}
                    onChange={(e) => setEmailProvider(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs"
                  >
                    <option value="SMTP">SMTP Padrão / Hostinger / cPanel</option>
                    <option value="SENDGRID">SendGrid (SMTP Relay)</option>
                    <option value="SES">Amazon SES</option>
                    <option value="GMAIL">Google Workspace / Gmail SMTP</option>
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1">
                    <label className="font-medium text-slate-700 dark:text-slate-300">Host SMTP</label>
                    <Input
                      placeholder="smtp.meuconsultorio.com.br"
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-medium text-slate-700 dark:text-slate-300">Porta</label>
                    <Input
                      type="number"
                      placeholder="587"
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-slate-700 dark:text-slate-300">Criptografia</label>
                  <select
                    value={smtpEncryption}
                    onChange={(e) => setSmtpEncryption(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs"
                  >
                    <option value="TLS">STARTTLS (Recomendado - Porta 587)</option>
                    <option value="SSL">SSL / TLS Direto (Porta 465)</option>
                    <option value="NONE">Sem Criptografia (Porta 25)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-medium text-slate-700 dark:text-slate-300">Usuário / Login</label>
                    <Input
                      placeholder="contato@meuconsultorio.com.br"
                      value={smtpUser}
                      onChange={(e) => setSmtpUser(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-medium text-slate-700 dark:text-slate-300">
                      Senha {hasExistingPassword && <span className="text-[var(--primary)] font-normal">(Gravada)</span>}
                    </label>
                    <Input
                      type="password"
                      placeholder={hasExistingPassword ? "••••••••••" : "Sua senha SMTP"}
                      value={smtpPassword}
                      onChange={(e) => setSmtpPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-medium text-slate-700 dark:text-slate-300">Nome do Remetente</label>
                    <Input
                      placeholder="Consultório PSI"
                      value={smtpSenderName}
                      onChange={(e) => setSmtpSenderName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-medium text-slate-700 dark:text-slate-300">E-mail de Envio</label>
                    <Input
                      placeholder="noreply@meuconsultorio.com.br"
                      value={smtpSenderEmail}
                      onChange={(e) => setSmtpSenderEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={isSavingEmail} className="gap-2 text-xs">
                    <Save className="h-4 w-4" />
                    <span>{isSavingEmail ? "Salvando..." : "Salvar Configuração de E-mail"}</span>
                  </Button>
                </div>
              </form>

              {/* Bloco de Teste de E-mail */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <span className="font-semibold block text-slate-800 dark:text-slate-200">Testar Envio de E-mail</span>
                <div className="flex gap-2">
                  <Input
                    placeholder="Seu e-mail para receber o teste..."
                    value={emailTestAddress}
                    onChange={(e) => setEmailTestAddress(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTestEmail}
                    disabled={isTestingEmail || !smtpHost}
                    className="shrink-0 gap-1.5 text-xs"
                  >
                    <Send className="h-3.5 w-3.5 text-[var(--primary)]" />
                    <span>{isTestingEmail ? "Enviando..." : "Disparar Teste"}</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ================= SEÇÃO DO WHATSAPP ================= */}
        <div className="space-y-4">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Integração WhatsApp API</CardTitle>
                    <CardDescription className="text-xs">
                      Disparo de lembretes e avisos automatizados pelo aplicativo
                    </CardDescription>
                  </div>
                </div>

                <Badge variant={whatsappEnabled && whatsappApiUrl ? "success" : "default"}>
                  {whatsappEnabled && whatsappApiUrl ? "Ativo" : "Desativado"}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="pt-5 space-y-4 text-xs">
              {whatsappMessage && (
                <Alert variant={whatsappMessage.type === "success" ? "success" : "destructive"}>
                  {whatsappMessage.text}
                </Alert>
              )}

              <form onSubmit={handleSaveWhatsapp} className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                  <span className="font-medium">Habilitar envio por WhatsApp</span>
                  <input
                    type="checkbox"
                    checked={whatsappEnabled}
                    onChange={(e) => setWhatsappEnabled(e.target.checked)}
                    className="h-4 w-4 rounded text-[var(--primary)] focus:ring-[var(--primary)] cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-slate-700 dark:text-slate-300">Provedor / Tipo de API</label>
                  <select
                    value={whatsappProvider}
                    onChange={(e) => setWhatsappProvider(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs"
                  >
                    <option value="EVOLUTION_API">Evolution API (v1 / v2)</option>
                    <option value="Z_API">Z-API (Oficial / Parceira)</option>
                    <option value="WPPCONNECT">WPPConnect Server</option>
                    <option value="GENERIC_WEBHOOK">Webhook HTTP Genérico</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-slate-700 dark:text-slate-300">URL Base da API</label>
                  <Input
                    placeholder="https://api.meu-whatsapp.com.br"
                    value={whatsappApiUrl}
                    onChange={(e) => setWhatsappApiUrl(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-slate-700 dark:text-slate-300">
                    Chave de API / Token {hasExistingToken && <span className="text-[var(--primary)] font-normal">(Gravado)</span>}
                  </label>
                  <Input
                    type="password"
                    placeholder={hasExistingToken ? "••••••••••••••••••••" : "Seu token de autenticação"}
                    value={whatsappApiToken}
                    onChange={(e) => setWhatsappApiToken(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-medium text-slate-700 dark:text-slate-300">Nome da Instância</label>
                    <Input
                      placeholder="consultorio-psi"
                      value={whatsappInstanceId}
                      onChange={(e) => setWhatsappInstanceId(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-medium text-slate-700 dark:text-slate-300">Número Remetente</label>
                    <Input
                      placeholder="5511999999999"
                      value={whatsappSenderNumber}
                      onChange={(e) => setWhatsappSenderNumber(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={isSavingWhatsapp} className="gap-2 text-xs">
                    <Save className="h-4 w-4" />
                    <span>{isSavingWhatsapp ? "Salvando..." : "Salvar Configuração do WhatsApp"}</span>
                  </Button>
                </div>
              </form>

              {/* Bloco de Teste de WhatsApp */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <span className="font-semibold block text-slate-800 dark:text-slate-200">Testar Conexão do WhatsApp</span>
                <div className="flex gap-2">
                  <Input
                    placeholder="DDD + Número (ex: 11987654321)"
                    value={whatsappTestPhone}
                    onChange={(e) => setWhatsappTestPhone(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTestWhatsapp}
                    disabled={isTestingWhatsapp || !whatsappApiUrl}
                    className="shrink-0 gap-1.5 text-xs"
                  >
                    <Send className="h-3.5 w-3.5 text-emerald-600" />
                    <span>{isTestingWhatsapp ? "Testando..." : "Enviar Teste"}</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
