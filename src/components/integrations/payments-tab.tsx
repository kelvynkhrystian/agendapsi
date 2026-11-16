"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { IntegrationStatusBadge } from "./integration-status-badge";
import {
  CreditCard,
  DollarSign,
  ShieldCheck,
  Check,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  Save,
  AlertTriangle,
  Receipt,
  ExternalLink,
  Lock,
} from "pulsoicon-react";
import { cn } from "@/lib/utils";
import type { GatewayConfigDTO, PaymentProviderKey, PaymentEnvironment } from "@/lib/payments/types";

interface ProviderFormData {
  isEnabled: boolean;
  isSandbox: boolean;
  environment: PaymentEnvironment;
  isDefault: boolean;
  accessToken: string;
  apiKey: string;
  token: string;
  publicKey: string;
  webhookSecret: string;
  instructions: string;
}

export function PaymentsTab() {
  const [gateways, setGateways] = useState<GatewayConfigDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Formulários locais para cada provedor
  const [forms, setForms] = useState<Record<PaymentProviderKey, ProviderFormData>>({
    MERCADO_PAGO: {
      isEnabled: false,
      isSandbox: true,
      environment: "SANDBOX",
      isDefault: false,
      accessToken: "",
      apiKey: "",
      token: "",
      publicKey: "",
      webhookSecret: "",
      instructions: "",
    },
    ASAAS: {
      isEnabled: false,
      isSandbox: true,
      environment: "SANDBOX",
      isDefault: false,
      accessToken: "",
      apiKey: "",
      token: "",
      publicKey: "",
      webhookSecret: "",
      instructions: "",
    },
    PAGBANK: {
      isEnabled: false,
      isSandbox: true,
      environment: "SANDBOX",
      isDefault: false,
      accessToken: "",
      apiKey: "",
      token: "",
      publicKey: "",
      webhookSecret: "",
      instructions: "",
    },
    IN_PERSON: {
      isEnabled: false,
      isSandbox: false,
      environment: "PRODUCTION",
      isDefault: false,
      accessToken: "",
      apiKey: "",
      token: "",
      publicKey: "",
      webhookSecret: "",
      instructions: "",
    },
  });

  // Visibilidade de senhas
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [testingProvider, setTestingProvider] = useState<PaymentProviderKey | null>(null);
  const [savingProvider, setSavingProvider] = useState<PaymentProviderKey | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchGateways = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch("/api/admin/integrations/payments", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Não foi possível carregar as configurações de pagamentos.");
        return;
      }

      if (Array.isArray(data.gateways)) {
        setGateways(data.gateways);

        // Inicializa forms com os dados retornados
        const newForms = { ...forms };
        data.gateways.forEach((g: GatewayConfigDTO) => {
          if (newForms[g.providerKey]) {
            newForms[g.providerKey] = {
              isEnabled: g.isEnabled,
              isSandbox: g.isSandbox,
              environment: g.environment || (g.isSandbox ? "SANDBOX" : "PRODUCTION"),
              isDefault: g.isDefault,
              accessToken: "",
              apiKey: "",
              token: "",
              publicKey: "",
              webhookSecret: "",
              instructions: g.instructions || "",
            };
          }
        });
        setForms(newForms);
      }
    } catch {
      setError("Erro ao carregar dados dos gateways de pagamento.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGateways();
  }, []);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleTestConnection = async (providerKey: PaymentProviderKey) => {
    setTestingProvider(providerKey);
    setTestResults((prev) => ({ ...prev, [providerKey]: undefined as any }));

    try {
      const formData = forms[providerKey];
      const res = await fetch(`/api/admin/integrations/payments/${providerKey.toLowerCase()}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          environment: formData.environment,
          accessToken: formData.accessToken || undefined,
          apiKey: formData.apiKey || undefined,
          token: formData.token || undefined,
          publicKey: formData.publicKey || undefined,
        }),
      });

      const data = await res.json();
      setTestResults((prev) => ({
        ...prev,
        [providerKey]: {
          success: data.success,
          message: data.message || (data.success ? "Conexão validada!" : "Falha na conexão."),
        },
      }));

      // Atualiza lista em segundo plano para refletir novo status
      fetchGateways();
    } catch {
      setTestResults((prev) => ({
        ...prev,
        [providerKey]: {
          success: false,
          message: "Erro de comunicação ao testar conexão com o provedor.",
        },
      }));
    } finally {
      setTestingProvider(null);
    }
  };

  const handleSave = async (providerKey: PaymentProviderKey) => {
    setSavingProvider(providerKey);
    setError(null);
    setSuccessMessage(null);

    try {
      const form = forms[providerKey];
      const payload: any = {
        providerKey,
        isEnabled: form.isEnabled,
        isSandbox: form.isSandbox,
        environment: form.environment,
        isDefault: form.isDefault,
        instructions: form.instructions,
      };

      if (form.accessToken) payload.accessToken = form.accessToken;
      if (form.apiKey) payload.apiKey = form.apiKey;
      if (form.token) payload.token = form.token;
      if (form.publicKey) payload.publicKey = form.publicKey;
      if (form.webhookSecret) payload.webhookSecret = form.webhookSecret;

      const res = await fetch("/api/admin/integrations/payments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Não foi possível salvar as configurações.");
        return;
      }

      setSuccessMessage(data.message || "Configurações salvas com sucesso!");
      fetchGateways();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch {
      setError("Erro ao salvar alterações no gateway.");
    } finally {
      setSavingProvider(null);
    }
  };

  if (isLoading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="h-8 w-8 text-[var(--primary)] animate-spin" />
        <span className="text-xs text-slate-500">Carregando integrações de pagamentos...</span>
      </div>
    );
  }

  const mpGateway = gateways.find((g) => g.providerKey === "MERCADO_PAGO");
  const asaasGateway = gateways.find((g) => g.providerKey === "ASAAS");
  const pbGateway = gateways.find((g) => g.providerKey === "PAGBANK");
  const inPersonGateway = gateways.find((g) => g.providerKey === "IN_PERSON");

  return (
    <div className="space-y-6">
      {/* Alertas Globais */}
      {error && (
        <Alert variant="destructive" className="flex items-center gap-2 text-xs py-2.5">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </Alert>
      )}

      {successMessage && (
        <Alert variant="success" className="flex items-center gap-2 text-xs py-2.5">
          <Check className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </Alert>
      )}

      {/* Visão Geral e Informações de Múltiplos Provedores */}
      <div className="rounded-2xl border border-slate-200 dark:border-[#2C2C2C] bg-white dark:bg-[#202020] p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0 mt-0.5">
            <CreditCard className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Múltiplos Gateways Ativos Simultaneamente
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
              O PSI permite ativar mais de um gateway ao mesmo tempo (Mercado Pago, Asaas, PagBank e Pagamento Presencial). O paciente poderá escolher a forma e o provedor de preferência durante o agendamento público e na área do paciente.
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={fetchGateways}
          className="shrink-0 text-xs gap-1.5 border-slate-200"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Atualizar Status</span>
        </Button>
      </div>

      {/* ========================================================================= */}
      {/* 1. MERCADO PAGO                                                           */}
      {/* ========================================================================= */}
      <Card className="border border-slate-200 dark:border-[#2C2C2C] rounded-2xl shadow-xs overflow-hidden">
        <CardHeader className="border-b border-slate-100 dark:border-[#2C2C2C] bg-slate-50/50 dark:bg-[#1A1A1A] py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#009EE3]/10 text-[#009EE3] flex items-center justify-center font-bold text-sm shrink-0">
                MP
              </div>
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <span>Mercado Pago</span>
                  {forms.MERCADO_PAGO.isEnabled && (
                    <Badge variant="success" className="text-[10px] py-0 px-2">
                      Ativo
                    </Badge>
                  )}
                  {forms.MERCADO_PAGO.isDefault && (
                    <Badge variant="secondary" className="text-[10px] py-0 px-2 bg-blue-50 text-blue-700 border-blue-200">
                      Padrão
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs">
                  Pagamentos instantâneos via Pix dinâmico com QR Code e checkout seguro
                </CardDescription>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {forms.MERCADO_PAGO.isEnabled ? "Ativado" : "Desativado"}
              </span>
              <input
                type="checkbox"
                checked={forms.MERCADO_PAGO.isEnabled}
                onChange={(e) =>
                  setForms((prev) => ({
                    ...prev,
                    MERCADO_PAGO: { ...prev.MERCADO_PAGO, isEnabled: e.target.checked },
                  }))
                }
                className="w-5 h-5 rounded accent-[var(--primary)] cursor-pointer"
              />
            </label>
          </div>
        </CardHeader>

        <CardContent className="p-5 sm:p-6 space-y-5">
          {/* Status Badge */}
          {mpGateway && (
            <IntegrationStatusBadge
              enabled={forms.MERCADO_PAGO.isEnabled}
              status={mpGateway.healthStatus as any}
              healthMessage={mpGateway.healthMessage}
              lastCheckedAt={mpGateway.lastCheckedAt}
              lastTestedAt={mpGateway.lastTestedAt}
            />
          )}

          {/* Resultado do Teste */}
          {testResults.MERCADO_PAGO && (
            <Alert
              variant={testResults.MERCADO_PAGO.success ? "success" : "destructive"}
              className="text-xs py-2.5"
            >
              {testResults.MERCADO_PAGO.message}
            </Alert>
          )}

          {/* Opções de Ambiente e Padrão */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Ambiente de Execução
              </label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="mp_env"
                    value="SANDBOX"
                    checked={forms.MERCADO_PAGO.environment === "SANDBOX"}
                    onChange={() =>
                      setForms((prev) => ({
                        ...prev,
                        MERCADO_PAGO: {
                          ...prev.MERCADO_PAGO,
                          environment: "SANDBOX",
                          isSandbox: true,
                        },
                      }))
                    }
                    className="accent-[var(--primary)]"
                  />
                  <span>Sandbox (Testes)</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="mp_env"
                    value="PRODUCTION"
                    checked={forms.MERCADO_PAGO.environment === "PRODUCTION"}
                    onChange={() =>
                      setForms((prev) => ({
                        ...prev,
                        MERCADO_PAGO: {
                          ...prev.MERCADO_PAGO,
                          environment: "PRODUCTION",
                          isSandbox: false,
                        },
                      }))
                    }
                    className="accent-[var(--primary)]"
                  />
                  <span>Produção (Real)</span>
                </label>
              </div>
            </div>

            <div className="flex items-center pt-4 sm:pt-0">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={forms.MERCADO_PAGO.isDefault}
                  onChange={(e) =>
                    setForms((prev) => ({
                      ...prev,
                      MERCADO_PAGO: { ...prev.MERCADO_PAGO, isDefault: e.target.checked },
                    }))
                  }
                  className="accent-[var(--primary)]"
                />
                <span>Definir como gateway padrão de pagamento online</span>
              </label>
            </div>
          </div>

          {/* Credenciais */}
          <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-[#2C2C2C]">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Access Token (Produção ou Teste)
                </label>
                {mpGateway?.hasCredentials && (
                  <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                    <Check className="h-3 w-3" /> Credencial configurada: {mpGateway.maskedAccessToken}
                  </span>
                )}
              </div>
              <div className="relative">
                <Input
                  type={showSecrets.mp_access ? "text" : "password"}
                  placeholder={mpGateway?.hasCredentials ? "•••••••••••••••• (deixe em branco para manter)" : "APP_USR-... ou TEST-..."}
                  value={forms.MERCADO_PAGO.accessToken}
                  onChange={(e) =>
                    setForms((prev) => ({
                      ...prev,
                      MERCADO_PAGO: { ...prev.MERCADO_PAGO, accessToken: e.target.value },
                    }))
                  }
                  className="h-10 text-xs pr-10 rounded-xl"
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowSecrets((prev) => ({ ...prev, mp_access: !prev.mp_access }))
                  }
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showSecrets.mp_access ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Chave Secreta do Webhook (Assinatura de Segurança x-signature)
              </label>
              <div className="relative">
                <Input
                  type={showSecrets.mp_secret ? "text" : "password"}
                  placeholder={mpGateway?.maskedWebhookSecret ? "•••••••• (deixe em branco para manter)" : "Chave secreta obtida no painel do Mercado Pago"}
                  value={forms.MERCADO_PAGO.webhookSecret}
                  onChange={(e) =>
                    setForms((prev) => ({
                      ...prev,
                      MERCADO_PAGO: { ...prev.MERCADO_PAGO, webhookSecret: e.target.value },
                    }))
                  }
                  className="h-10 text-xs pr-10 rounded-xl"
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowSecrets((prev) => ({ ...prev, mp_secret: !prev.mp_secret }))
                  }
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showSecrets.mp_secret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Seção de Webhook */}
          <div className="rounded-xl border border-slate-200 dark:border-[#2C2C2C] bg-slate-50/70 dark:bg-[#1C1C1C] p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                URL de Notificação Webhook
              </span>
              {mpGateway?.lastWebhookReceivedAt && (
                <span className="text-[11px] text-emerald-600 font-medium">
                  Último evento recebido em: {new Date(mpGateway.lastWebhookReceivedAt).toLocaleString("pt-BR")}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <code className="flex-1 bg-white dark:bg-[#252525] border border-slate-200 dark:border-[#333] px-3 py-2 rounded-lg font-mono text-[11px] text-slate-800 dark:text-slate-200 select-all truncate">
                {mpGateway?.webhookUrl}
              </code>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => mpGateway && handleCopy(mpGateway.webhookUrl, "mp_wh")}
                className="shrink-0 gap-1 text-xs h-9 px-3"
              >
                {copiedKey === "mp_wh" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedKey === "mp_wh" ? "Copiado" : "Copiar"}</span>
              </Button>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              No Painel do Mercado Pago &gt; Suas Aplicações &gt; Notificações Webhook, cadastre a URL acima marcando o evento <strong>Pagamentos (payment)</strong>.
            </p>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={testingProvider === "MERCADO_PAGO"}
              onClick={() => handleTestConnection("MERCADO_PAGO")}
              className="text-xs h-9"
            >
              {testingProvider === "MERCADO_PAGO" ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  <span>Testando...</span>
                </>
              ) : (
                <span>Testar Conexão</span>
              )}
            </Button>

            <Button
              type="button"
              size="sm"
              disabled={savingProvider === "MERCADO_PAGO"}
              onClick={() => handleSave("MERCADO_PAGO")}
              className="text-xs h-9 gap-1.5"
            >
              {savingProvider === "MERCADO_PAGO" ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span>Salvar Alterações</span>
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* 2. ASAAS                                                                  */}
      {/* ========================================================================= */}
      <Card className="border border-slate-200 dark:border-[#2C2C2C] rounded-2xl shadow-xs overflow-hidden">
        <CardHeader className="border-b border-slate-100 dark:border-[#2C2C2C] bg-slate-50/50 dark:bg-[#1A1A1A] py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#0030B9]/10 text-[#0030B9] flex items-center justify-center font-bold text-sm shrink-0">
                AS
              </div>
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <span>Asaas</span>
                  {forms.ASAAS.isEnabled && (
                    <Badge variant="success" className="text-[10px] py-0 px-2">
                      Ativo
                    </Badge>
                  )}
                  {forms.ASAAS.isDefault && (
                    <Badge variant="secondary" className="text-[10px] py-0 px-2 bg-blue-50 text-blue-700 border-blue-200">
                      Padrão
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs">
                  Cobranças Pix dinâmico, faturamento direto e automação de pagamentos
                </CardDescription>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {forms.ASAAS.isEnabled ? "Ativado" : "Desativado"}
              </span>
              <input
                type="checkbox"
                checked={forms.ASAAS.isEnabled}
                onChange={(e) =>
                  setForms((prev) => ({
                    ...prev,
                    ASAAS: { ...prev.ASAAS, isEnabled: e.target.checked },
                  }))
                }
                className="w-5 h-5 rounded accent-[var(--primary)] cursor-pointer"
              />
            </label>
          </div>
        </CardHeader>

        <CardContent className="p-5 sm:p-6 space-y-5">
          {asaasGateway && (
            <IntegrationStatusBadge
              enabled={forms.ASAAS.isEnabled}
              status={asaasGateway.healthStatus as any}
              healthMessage={asaasGateway.healthMessage}
              lastCheckedAt={asaasGateway.lastCheckedAt}
              lastTestedAt={asaasGateway.lastTestedAt}
            />
          )}

          {testResults.ASAAS && (
            <Alert
              variant={testResults.ASAAS.success ? "success" : "destructive"}
              className="text-xs py-2.5"
            >
              {testResults.ASAAS.message}
            </Alert>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Ambiente Asaas
              </label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="asaas_env"
                    value="SANDBOX"
                    checked={forms.ASAAS.environment === "SANDBOX"}
                    onChange={() =>
                      setForms((prev) => ({
                        ...prev,
                        ASAAS: { ...prev.ASAAS, environment: "SANDBOX", isSandbox: true },
                      }))
                    }
                    className="accent-[var(--primary)]"
                  />
                  <span>Sandbox (sandbox.asaas.com)</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="asaas_env"
                    value="PRODUCTION"
                    checked={forms.ASAAS.environment === "PRODUCTION"}
                    onChange={() =>
                      setForms((prev) => ({
                        ...prev,
                        ASAAS: { ...prev.ASAAS, environment: "PRODUCTION", isSandbox: false },
                      }))
                    }
                    className="accent-[var(--primary)]"
                  />
                  <span>Produção (api.asaas.com)</span>
                </label>
              </div>
            </div>

            <div className="flex items-center pt-4 sm:pt-0">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={forms.ASAAS.isDefault}
                  onChange={(e) =>
                    setForms((prev) => ({
                      ...prev,
                      ASAAS: { ...prev.ASAAS, isDefault: e.target.checked },
                    }))
                  }
                  className="accent-[var(--primary)]"
                />
                <span>Definir como gateway padrão de pagamento online</span>
              </label>
            </div>
          </div>

          <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-[#2C2C2C]">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Chave de API / Access Token Asaas ($aact_...)
                </label>
                {asaasGateway?.hasCredentials && (
                  <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                    <Check className="h-3 w-3" /> Configurada: {asaasGateway.maskedAccessToken}
                  </span>
                )}
              </div>
              <div className="relative">
                <Input
                  type={showSecrets.asaas_key ? "text" : "password"}
                  placeholder={asaasGateway?.hasCredentials ? "•••••••••••••••• (deixe em branco para manter)" : "$aact_YTU5YTE0M2M6N2Z..."}
                  value={forms.ASAAS.apiKey}
                  onChange={(e) =>
                    setForms((prev) => ({
                      ...prev,
                      ASAAS: { ...prev.ASAAS, apiKey: e.target.value },
                    }))
                  }
                  className="h-10 text-xs pr-10 rounded-xl"
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowSecrets((prev) => ({ ...prev, asaas_key: !prev.asaas_key }))
                  }
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showSecrets.asaas_key ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Token de Autenticação do Webhook (asaas-access-token)
              </label>
              <div className="relative">
                <Input
                  type={showSecrets.asaas_wh ? "text" : "password"}
                  placeholder={asaasGateway?.maskedWebhookSecret ? "•••••••• (deixe em branco para manter)" : "Token de segurança para autenticar requisições de webhook"}
                  value={forms.ASAAS.webhookSecret}
                  onChange={(e) =>
                    setForms((prev) => ({
                      ...prev,
                      ASAAS: { ...prev.ASAAS, webhookSecret: e.target.value },
                    }))
                  }
                  className="h-10 text-xs pr-10 rounded-xl"
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowSecrets((prev) => ({ ...prev, asaas_wh: !prev.asaas_wh }))
                  }
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showSecrets.asaas_wh ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-[#2C2C2C] bg-slate-50/70 dark:bg-[#1C1C1C] p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                URL de Webhook do Asaas
              </span>
              {asaasGateway?.lastWebhookReceivedAt && (
                <span className="text-[11px] text-emerald-600 font-medium">
                  Último evento recebido em: {new Date(asaasGateway.lastWebhookReceivedAt).toLocaleString("pt-BR")}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <code className="flex-1 bg-white dark:bg-[#252525] border border-slate-200 dark:border-[#333] px-3 py-2 rounded-lg font-mono text-[11px] text-slate-800 dark:text-slate-200 select-all truncate">
                {asaasGateway?.webhookUrl}
              </code>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => asaasGateway && handleCopy(asaasGateway.webhookUrl, "asaas_wh")}
                className="shrink-0 gap-1 text-xs h-9 px-3"
              >
                {copiedKey === "asaas_wh" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedKey === "asaas_wh" ? "Copiado" : "Copiar"}</span>
              </Button>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              No painel do Asaas &gt; Menu Integrações &gt; Webhooks para Cobranças, cadastre a URL acima selecionando versão da API v3 e os eventos de criação, recebimento e estorno de cobrança.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={testingProvider === "ASAAS"}
              onClick={() => handleTestConnection("ASAAS")}
              className="text-xs h-9"
            >
              {testingProvider === "ASAAS" ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  <span>Testando...</span>
                </>
              ) : (
                <span>Testar Conexão</span>
              )}
            </Button>

            <Button
              type="button"
              size="sm"
              disabled={savingProvider === "ASAAS"}
              onClick={() => handleSave("ASAAS")}
              className="text-xs h-9 gap-1.5"
            >
              {savingProvider === "ASAAS" ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span>Salvar Alterações</span>
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* 3. PAGBANK                                                                */}
      {/* ========================================================================= */}
      <Card className="border border-slate-200 dark:border-[#2C2C2C] rounded-2xl shadow-xs overflow-hidden">
        <CardHeader className="border-b border-slate-100 dark:border-[#2C2C2C] bg-slate-50/50 dark:bg-[#1A1A1A] py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#00A859]/10 text-[#00A859] flex items-center justify-center font-bold text-sm shrink-0">
                PB
              </div>
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <span>PagBank</span>
                  {forms.PAGBANK.isEnabled && (
                    <Badge variant="success" className="text-[10px] py-0 px-2">
                      Ativo
                    </Badge>
                  )}
                  {forms.PAGBANK.isDefault && (
                    <Badge variant="secondary" className="text-[10px] py-0 px-2 bg-blue-50 text-blue-700 border-blue-200">
                      Padrão
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs">
                  Integração oficial PagBank / PagSeguro com pedidos e Pix dinâmico
                </CardDescription>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {forms.PAGBANK.isEnabled ? "Ativado" : "Desativado"}
              </span>
              <input
                type="checkbox"
                checked={forms.PAGBANK.isEnabled}
                onChange={(e) =>
                  setForms((prev) => ({
                    ...prev,
                    PAGBANK: { ...prev.PAGBANK, isEnabled: e.target.checked },
                  }))
                }
                className="w-5 h-5 rounded accent-[var(--primary)] cursor-pointer"
              />
            </label>
          </div>
        </CardHeader>

        <CardContent className="p-5 sm:p-6 space-y-5">
          {pbGateway && (
            <IntegrationStatusBadge
              enabled={forms.PAGBANK.isEnabled}
              status={pbGateway.healthStatus as any}
              healthMessage={pbGateway.healthMessage}
              lastCheckedAt={pbGateway.lastCheckedAt}
              lastTestedAt={pbGateway.lastTestedAt}
            />
          )}

          {testResults.PAGBANK && (
            <Alert
              variant={testResults.PAGBANK.success ? "success" : "destructive"}
              className="text-xs py-2.5"
            >
              {testResults.PAGBANK.message}
            </Alert>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Ambiente PagBank
              </label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="pb_env"
                    value="SANDBOX"
                    checked={forms.PAGBANK.environment === "SANDBOX"}
                    onChange={() =>
                      setForms((prev) => ({
                        ...prev,
                        PAGBANK: { ...prev.PAGBANK, environment: "SANDBOX", isSandbox: true },
                      }))
                    }
                    className="accent-[var(--primary)]"
                  />
                  <span>Sandbox (sandbox.api.pagseguro.com)</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="pb_env"
                    value="PRODUCTION"
                    checked={forms.PAGBANK.environment === "PRODUCTION"}
                    onChange={() =>
                      setForms((prev) => ({
                        ...prev,
                        PAGBANK: { ...prev.PAGBANK, environment: "PRODUCTION", isSandbox: false },
                      }))
                    }
                    className="accent-[var(--primary)]"
                  />
                  <span>Produção (api.pagseguro.com)</span>
                </label>
              </div>
            </div>

            <div className="flex items-center pt-4 sm:pt-0">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={forms.PAGBANK.isDefault}
                  onChange={(e) =>
                    setForms((prev) => ({
                      ...prev,
                      PAGBANK: { ...prev.PAGBANK, isDefault: e.target.checked },
                    }))
                  }
                  className="accent-[var(--primary)]"
                />
                <span>Definir como gateway padrão de pagamento online</span>
              </label>
            </div>
          </div>

          <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-[#2C2C2C]">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Token de API PagBank (Bearer Token)
                </label>
                {pbGateway?.hasCredentials && (
                  <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                    <Check className="h-3 w-3" /> Configurado: {pbGateway.maskedAccessToken}
                  </span>
                )}
              </div>
              <div className="relative">
                <Input
                  type={showSecrets.pb_token ? "text" : "password"}
                  placeholder={pbGateway?.hasCredentials ? "•••••••••••••••• (deixe em branco para manter)" : "Insira o token obtido no painel de desenvolvedores"}
                  value={forms.PAGBANK.token}
                  onChange={(e) =>
                    setForms((prev) => ({
                      ...prev,
                      PAGBANK: { ...prev.PAGBANK, token: e.target.value },
                    }))
                  }
                  className="h-10 text-xs pr-10 rounded-xl"
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowSecrets((prev) => ({ ...prev, pb_token: !prev.pb_token }))
                  }
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showSecrets.pb_token ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-[#2C2C2C] bg-slate-50/70 dark:bg-[#1C1C1C] p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                URL de Notificação Webhook
              </span>
              {pbGateway?.lastWebhookReceivedAt && (
                <span className="text-[11px] text-emerald-600 font-medium">
                  Último evento recebido em: {new Date(pbGateway.lastWebhookReceivedAt).toLocaleString("pt-BR")}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <code className="flex-1 bg-white dark:bg-[#252525] border border-slate-200 dark:border-[#333] px-3 py-2 rounded-lg font-mono text-[11px] text-slate-800 dark:text-slate-200 select-all truncate">
                {pbGateway?.webhookUrl}
              </code>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => pbGateway && handleCopy(pbGateway.webhookUrl, "pb_wh")}
                className="shrink-0 gap-1 text-xs h-9 px-3"
              >
                {copiedKey === "pb_wh" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedKey === "pb_wh" ? "Copiado" : "Copiar"}</span>
              </Button>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              O PSI registra automaticamente esta URL de notificação a cada pedido criado na API do PagBank, garantindo que o status seja atualizado mesmo sem configuração prévia global.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={testingProvider === "PAGBANK"}
              onClick={() => handleTestConnection("PAGBANK")}
              className="text-xs h-9"
            >
              {testingProvider === "PAGBANK" ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  <span>Testando...</span>
                </>
              ) : (
                <span>Testar Conexão</span>
              )}
            </Button>

            <Button
              type="button"
              size="sm"
              disabled={savingProvider === "PAGBANK"}
              onClick={() => handleSave("PAGBANK")}
              className="text-xs h-9 gap-1.5"
            >
              {savingProvider === "PAGBANK" ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span>Salvar Alterações</span>
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* 4. PAGAMENTO PRESENCIAL                                                   */}
      {/* ========================================================================= */}
      <Card className="border border-slate-200 dark:border-[#2C2C2C] rounded-2xl shadow-xs overflow-hidden">
        <CardHeader className="border-b border-slate-100 dark:border-[#2C2C2C] bg-slate-50/50 dark:bg-[#1A1A1A] py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-sm shrink-0">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <span>Pagamento Presencial</span>
                  {forms.IN_PERSON.isEnabled && (
                    <Badge variant="success" className="text-[10px] py-0 px-2">
                      Ativo
                    </Badge>
                  )}
                  {forms.IN_PERSON.isDefault && (
                    <Badge variant="secondary" className="text-[10px] py-0 px-2 bg-blue-50 text-blue-700 border-blue-200">
                      Padrão
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs">
                  Recebimento diretamente no consultório com confirmação manual no financeiro
                </CardDescription>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {forms.IN_PERSON.isEnabled ? "Ativado" : "Desativado"}
              </span>
              <input
                type="checkbox"
                checked={forms.IN_PERSON.isEnabled}
                onChange={(e) =>
                  setForms((prev) => ({
                    ...prev,
                    IN_PERSON: { ...prev.IN_PERSON, isEnabled: e.target.checked },
                  }))
                }
                className="w-5 h-5 rounded accent-[var(--primary)] cursor-pointer"
              />
            </label>
          </div>
        </CardHeader>

        <CardContent className="p-5 sm:p-6 space-y-5">
          <div className="rounded-xl border border-slate-200 dark:border-[#2C2C2C] bg-slate-50/70 dark:bg-[#1C1C1C] p-4 text-xs space-y-2">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold">
              <ShieldCheck className="h-4 w-4 text-[var(--primary)] shrink-0" />
              <span>Sem necessidade de credenciais de API ou Webhooks</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
              Quando o paciente seleciona Pagamento Presencial, o agendamento é registrado com a cobrança em status <strong>Pendente</strong>. Após o recebimento no consultório (dinheiro, maquininha ou Pix presencial), o profissional confirma o recebimento com um clique em <strong>Admin &gt; Financeiro</strong>.
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Instruções de Pagamento para o Paciente
            </label>
            <textarea
              rows={3}
              placeholder="Ex: O pagamento poderá ser realizado diretamente na recepção em dinheiro, cartão ou Pix no momento da sessão."
              value={forms.IN_PERSON.instructions}
              onChange={(e) =>
                setForms((prev) => ({
                  ...prev,
                  IN_PERSON: { ...prev.IN_PERSON, instructions: e.target.value },
                }))
              }
              className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-[#333] bg-white dark:bg-[#202020] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
            />
            <span className="text-[11px] text-slate-400 block">
              Esta mensagem será apresentada na tela de confirmação do agendamento quando o paciente escolher pagar presencialmente.
            </span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-[#2C2C2C]">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={forms.IN_PERSON.isDefault}
                onChange={(e) =>
                  setForms((prev) => ({
                    ...prev,
                    IN_PERSON: { ...prev.IN_PERSON, isDefault: e.target.checked },
                  }))
                }
                className="accent-[var(--primary)]"
              />
              <span>Definir como opção padrão no agendamento</span>
            </label>

            <Button
              type="button"
              size="sm"
              disabled={savingProvider === "IN_PERSON"}
              onClick={() => handleSave("IN_PERSON")}
              className="text-xs h-9 gap-1.5"
            >
              {savingProvider === "IN_PERSON" ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span>Salvar Alterações</span>
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
