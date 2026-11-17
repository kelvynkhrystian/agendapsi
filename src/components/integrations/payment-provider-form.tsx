"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { IntegrationStatusBadge } from "./integration-status-badge";
import {
  ArrowLeft,
  Check,
  Copy,
  CreditCard,
  DollarSign,
  Eye,
  EyeOff,
  ExternalLink,
  Loader2,
  Lock,
  MapPin,
  RefreshCw,
  Save,
  ShieldCheck,
  AlertTriangle,
  Receipt,
  Store,
} from "pulsoicon-react";
import { cn } from "@/lib/utils";
import {
  type GatewayConfigDTO,
  type PaymentProviderKey,
  type PaymentEnvironment,
  PROVIDER_SLUG_MAP,
  PROVIDER_KEY_TO_SLUG,
} from "@/lib/payments/types";

export { PROVIDER_SLUG_MAP, PROVIDER_KEY_TO_SLUG };

interface ProviderMeta {
  key: PaymentProviderKey;
  slug: string;
  name: string;
  shortDesc: string;
  fullDesc: string;
  iconBg: string;
  iconColor: string;
  badgeCode: string;
  docUrl: string;
}

export const PROVIDERS_META: Record<PaymentProviderKey, ProviderMeta> = {
  MERCADO_PAGO: {
    key: "MERCADO_PAGO",
    slug: "mercadopago",
    name: "Mercado Pago",
    shortDesc: "Pagamentos instantâneos via Pix dinâmico com QR Code e checkout seguro.",
    fullDesc: "Integração oficial com Mercado Pago para recebimento instantâneo via Pix com geração dinâmica de QR Code copia e cola, aprovação em segundos e conciliação automática.",
    iconBg: "bg-[#009EE3]/10",
    iconColor: "text-[#009EE3]",
    badgeCode: "MP",
    docUrl: "https://www.mercadopago.com.br/developers/panel/app",
  },
  ASAAS: {
    key: "ASAAS",
    slug: "asaas",
    name: "Asaas",
    shortDesc: "Cobranças inteligentes com emissão de Pix automático e conciliação em tempo real.",
    fullDesc: "Integração direta com o Asaas para geração de Pix dinâmico com notificações de pagamento em tempo real, suporte a ambiente de testes (Sandbox) e produção.",
    iconBg: "bg-[#0030B8]/10",
    iconColor: "text-[#0030B8]",
    badgeCode: "AS",
    docUrl: "https://www.asaas.com",
  },
  PAGBANK: {
    key: "PAGBANK",
    slug: "pagbank",
    name: "PagBank",
    shortDesc: "Ecossistema PagBank / PagSeguro com suporte a Pix e ordens de pagamento.",
    fullDesc: "Integração com PagBank para recebimento de consultas via Pix e ordens de pagamento, com webhooks de confirmação e conciliação instantânea.",
    iconBg: "bg-[#00A868]/10",
    iconColor: "text-[#00A868]",
    badgeCode: "PB",
    docUrl: "https://dev.pagbank.uol.com.br",
  },
  IN_PERSON: {
    key: "IN_PERSON",
    slug: "presencial",
    name: "Pagamento Presencial",
    shortDesc: "Recebimento diretamente no consultório físico (dinheiro, cartão na maquininha ou Pix presencial).",
    fullDesc: "Permite ao paciente agendar a consulta e efetuar o acerto financeiro diretamente na recepção no dia do atendimento. Não requer chaves de API nem webhooks externos.",
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-600",
    badgeCode: "PS",
    docUrl: "",
  },
};

interface PaymentProviderConfigPageProps {
  providerKey: PaymentProviderKey;
}

export function PaymentProviderConfigPage({ providerKey }: PaymentProviderConfigPageProps) {
  const router = useRouter();
  const meta = PROVIDERS_META[providerKey];

  const [gateway, setGateway] = useState<GatewayConfigDTO | null>(null);
  const [allGateways, setAllGateways] = useState<GatewayConfigDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Campos do formulário
  const [isEnabled, setIsEnabled] = useState(false);
  const [environment, setEnvironment] = useState<PaymentEnvironment>("SANDBOX");
  const [isDefault, setIsDefault] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [token, setToken] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [instructions, setInstructions] = useState("");

  // Visibilidade de senhas
  const [showSecret1, setShowSecret1] = useState(false);
  const [showSecret2, setShowSecret2] = useState(false);

  // Carrega configurações
  const loadGateways = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch("/api/admin/integrations/payments");
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Não foi possível carregar as configurações.");
      }

      setAllGateways(data.gateways || []);
      const current = (data.gateways || []).find((g: GatewayConfigDTO) => g.providerKey === providerKey);

      if (current) {
        setGateway(current);
        setIsEnabled(current.isEnabled);
        setEnvironment(current.environment || (current.isSandbox ? "SANDBOX" : "PRODUCTION"));
        setIsDefault(current.isDefault);
        setInstructions(current.instructions || "");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao carregar gateway.");
    } finally {
      setIsLoading(false);
    }
  }, [providerKey]);

  useEffect(() => {
    loadGateways();
  }, [loadGateways]);

  // Salvar alterações
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const payload: any = {
        providerKey,
        isEnabled,
        isDefault,
        instructions: instructions.trim() || null,
      };

      if (providerKey !== "IN_PERSON") {
        payload.environment = environment;
        payload.isSandbox = environment === "SANDBOX";

        if (providerKey === "MERCADO_PAGO") {
          if (accessToken.trim()) payload.accessToken = accessToken.trim();
          if (webhookSecret.trim()) payload.webhookSecret = webhookSecret.trim();
        } else if (providerKey === "ASAAS") {
          if (apiKey.trim()) payload.apiKey = apiKey.trim();
          if (webhookSecret.trim()) payload.webhookSecret = webhookSecret.trim();
        } else if (providerKey === "PAGBANK") {
          if (token.trim()) payload.token = token.trim();
          if (publicKey.trim()) payload.publicKey = publicKey.trim();
          if (webhookSecret.trim()) payload.webhookSecret = webhookSecret.trim();
        }
      }

      const res = await fetch("/api/admin/integrations/payments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Falha ao salvar configurações do gateway.");
      }

      setSuccessMessage(`Configurações de ${meta.name} salvas com sucesso!`);
      setAccessToken("");
      setApiKey("");
      setToken("");
      setPublicKey("");
      setWebhookSecret("");
      await loadGateways();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setIsSaving(false);
    }
  };

  // Testar conexão
  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch(`/api/admin/integrations/payments/${providerKey}/test`, {
        method: "POST",
      });
      const data = await res.json();
      setTestResult({
        success: data.success,
        message: data.message || (data.success ? "Conexão estabelecida com sucesso!" : "Falha na conexão."),
      });
      await loadGateways();
    } catch {
      setTestResult({
        success: false,
        message: "Erro de comunicação ao testar conexão.",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const copyWebhookUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2500);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-500 text-xs">
        <Loader2 className="h-5 w-5 animate-spin mr-2 text-[var(--primary)]" />
        Carregando configurações de {meta.name}...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Botão Voltar para a Visão Geral de Pagamentos */}
      <div>
        <Link
          href="/admin/integracoes?tab=pagamentos"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-[var(--primary)] transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          <span>Voltar para Integrações de Pagamentos</span>
        </Link>
      </div>

      {/* Alertas Globais */}
      {error && (
        <Alert variant="destructive" className="text-xs">
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert variant="success" className="text-xs">
          {successMessage}
        </Alert>
      )}

      {/* Cartão Principal do Provedor */}
      <Card className="border border-slate-200 dark:border-[#2C2C2C] rounded-2xl shadow-xs overflow-hidden">
        <CardHeader className="border-b border-slate-100 dark:border-[#2C2C2C] bg-slate-50/50 dark:bg-[#1A1A1A] py-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-11 h-11 rounded-xl flex items-center justify-center font-bold text-base shrink-0",
                  meta.iconBg,
                  meta.iconColor
                )}
              >
                {providerKey === "IN_PERSON" ? <Store className="h-6 w-6" /> : meta.badgeCode}
              </div>
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <span>{meta.name}</span>
                  {isEnabled && (
                    <Badge variant="success" className="text-[10px] py-0 px-2">
                      Ativo
                    </Badge>
                  )}
                  {isDefault && (
                    <Badge variant="secondary" className="text-[10px] py-0 px-2 bg-blue-50 text-blue-700 border-blue-200">
                      Padrão
                    </Badge>
                  )}
                  {providerKey !== "IN_PERSON" && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] py-0 px-2 font-semibold",
                        environment === "SANDBOX"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      )}
                    >
                      {environment === "SANDBOX" ? "Sandbox" : "Produção"}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  {meta.shortDesc}
                </CardDescription>
              </div>
            </div>

            {/* Toggle de Ativação (Reaproveitado de Configurações → Horários) */}
            <div className="flex items-center gap-3 bg-white dark:bg-[#202020] border border-slate-200 dark:border-[#333333] px-3.5 py-2 rounded-xl shrink-0 self-start sm:self-auto">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {isEnabled ? "Gateway Ativado" : "Gateway Desativado"}
              </span>
              <ToggleSwitch
                checked={isEnabled}
                onChange={(val) => setIsEnabled(val)}
                label={`Alternar ativação do ${meta.name}`}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 sm:p-6 space-y-6">
          {/* Status de Conexão */}
          {gateway && (
            <IntegrationStatusBadge
              enabled={isEnabled}
              status={gateway.healthStatus as any}
              healthMessage={gateway.healthMessage}
              lastCheckedAt={gateway.lastCheckedAt}
              lastTestedAt={gateway.lastTestedAt}
            />
          )}

          {/* Resultado do Teste de Conexão */}
          {testResult && (
            <Alert
              variant={testResult.success ? "success" : "destructive"}
              className="text-xs py-2.5"
            >
              {testResult.message}
            </Alert>
          )}

          {/* Descrição Detalhada */}
          <div className="p-4 bg-slate-50/70 dark:bg-[#1E1E1E] border border-slate-200/80 dark:border-[#2C2C2C] rounded-xl text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {meta.fullDesc}
          </div>

          {/* Opções para Provedores Online */}
          {providerKey !== "IN_PERSON" ? (
            <div className="space-y-6">
              {/* Ambiente & Padrão */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-white dark:bg-[#181818] border border-slate-200 dark:border-[#2C2C2C] rounded-xl">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                    Ambiente de Execução
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name="prov_env"
                        value="SANDBOX"
                        checked={environment === "SANDBOX"}
                        onChange={() => setEnvironment("SANDBOX")}
                        className="accent-[var(--primary)]"
                      />
                      <span>Sandbox (Ambiente de Testes)</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name="prov_env"
                        value="PRODUCTION"
                        checked={environment === "PRODUCTION"}
                        onChange={() => setEnvironment("PRODUCTION")}
                        className="accent-[var(--primary)]"
                      />
                      <span>Produção (Real)</span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isDefault}
                      onChange={(e) => setIsDefault(e.target.checked)}
                      className="accent-[var(--primary)]"
                    />
                    <span>Definir como gateway padrão para pagamentos online</span>
                  </label>
                </div>
              </div>

              {/* Formulário de Credenciais Específicas */}
              <div className="space-y-4 pt-2">
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Credenciais de Conexão com a API
                </h3>

                {/* MERCADO PAGO */}
                {providerKey === "MERCADO_PAGO" && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Access Token ({environment === "SANDBOX" ? "Token de Teste: TEST-..." : "Token de Produção: APP_USR-..."})
                        </label>
                        {gateway?.hasCredentials && (
                          <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                            <Check className="h-3 w-3" /> Configurado: {gateway.maskedAccessToken}
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <Input
                          type={showSecret1 ? "text" : "password"}
                          placeholder={gateway?.hasCredentials ? "•••••••••••••••• (deixe em branco para manter)" : "Cole seu Access Token do Mercado Pago"}
                          value={accessToken}
                          onChange={(e) => setAccessToken(e.target.value)}
                          className="h-10 text-xs pr-10 rounded-xl"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSecret1((p) => !p)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showSecret1 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Chave Secreta do Webhook (Assinatura x-signature)
                        </label>
                        {gateway?.maskedWebhookSecret && (
                          <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                            <Check className="h-3 w-3" /> Configurado: {gateway.maskedWebhookSecret}
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <Input
                          type={showSecret2 ? "text" : "password"}
                          placeholder={gateway?.maskedWebhookSecret ? "•••••••• (deixe em branco para manter)" : "Chave secreta obtida no painel de Webhooks do Mercado Pago"}
                          value={webhookSecret}
                          onChange={(e) => setWebhookSecret(e.target.value)}
                          className="h-10 text-xs pr-10 rounded-xl"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSecret2((p) => !p)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showSecret2 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ASAAS */}
                {providerKey === "ASAAS" && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Chave de API do Asaas ($aact_...)
                        </label>
                        {gateway?.hasCredentials && (
                          <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                            <Check className="h-3 w-3" /> Configurado: {gateway.maskedAccessToken}
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <Input
                          type={showSecret1 ? "text" : "password"}
                          placeholder={gateway?.hasCredentials ? "•••••••••••••••• (deixe em branco para manter)" : "Cole sua chave de API gerada no Asaas"}
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          className="h-10 text-xs pr-10 rounded-xl"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSecret1((p) => !p)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showSecret1 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Token de Autenticação do Webhook (asaas-access-token)
                        </label>
                        {gateway?.maskedWebhookSecret && (
                          <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                            <Check className="h-3 w-3" /> Configurado: {gateway.maskedWebhookSecret}
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <Input
                          type={showSecret2 ? "text" : "password"}
                          placeholder={gateway?.maskedWebhookSecret ? "•••••••• (deixe em branco para manter)" : "Token definido no cadastro do Webhook no Asaas"}
                          value={webhookSecret}
                          onChange={(e) => setWebhookSecret(e.target.value)}
                          className="h-10 text-xs pr-10 rounded-xl"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSecret2((p) => !p)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showSecret2 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* PAGBANK */}
                {providerKey === "PAGBANK" && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Token de Acesso do PagBank
                        </label>
                        {gateway?.hasCredentials && (
                          <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                            <Check className="h-3 w-3" /> Configurado: {gateway.maskedAccessToken}
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <Input
                          type={showSecret1 ? "text" : "password"}
                          placeholder={gateway?.hasCredentials ? "•••••••••••••••• (deixe em branco para manter)" : "Token de desenvolvedor PagBank"}
                          value={token}
                          onChange={(e) => setToken(e.target.value)}
                          className="h-10 text-xs pr-10 rounded-xl"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSecret1((p) => !p)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showSecret1 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Chave Pública do PagBank (Opcional para checkout transparente)
                      </label>
                      <Input
                        type="text"
                        placeholder={gateway?.maskedPublicKey ? "•••••••• (deixe em branco para manter)" : "Chave pública PagBank"}
                        value={publicKey}
                        onChange={(e) => setPublicKey(e.target.value)}
                        className="h-10 text-xs rounded-xl"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Caixa de Configuração do Webhook */}
              <div className="p-4 bg-slate-50 dark:bg-[#161616] border border-slate-200 dark:border-[#2C2C2C] rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-[var(--primary)]" />
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      URL do Webhook para Notificações Automáticas
                    </span>
                  </div>
                  {gateway?.lastWebhookReceivedAt && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                      Último webhook: {new Date(gateway.lastWebhookReceivedAt).toLocaleString("pt-BR")}
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={gateway?.webhookUrl || ""}
                    className="h-9 text-xs font-mono bg-white dark:bg-[#202020] rounded-xl"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => gateway?.webhookUrl && copyWebhookUrl(gateway.webhookUrl)}
                    className="h-9 px-3 gap-1.5 shrink-0 rounded-xl"
                  >
                    {copiedWebhook ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copiar URL</span>
                      </>
                    )}
                  </Button>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Cadastre esta URL no painel de desenvolvedores do provedor para que o PSI receba as confirmações de Pix em tempo real e confirme as consultas de forma 100% automática.
                </p>
              </div>
            </div>
          ) : (
            /* PAGAMENTO PRESENCIAL */
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 dark:text-emerald-200">
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span>Sem necessidade de API externa</span>
                </div>
                <p className="text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed">
                  O Pagamento Presencial funciona de forma nativa e não exige chaves de API, tokens nem webhooks. Quando selecionado no agendamento, o pagamento é registrado como <strong>Pendente</strong> e o profissional faz a confirmação do recebimento diretamente em <strong>Admin → Financeiro</strong>.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                  Instruções exibidas ao Paciente
                </label>
                <textarea
                  rows={3}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Ex: O pagamento poderá ser realizado diretamente na recepção em dinheiro, cartão ou Pix no dia do atendimento."
                  className="w-full text-xs p-3 border border-slate-200 dark:border-[#2C2C2C] bg-white dark:bg-[#1A1A1A] rounded-xl focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                />
              </div>
            </div>
          )}

          {/* Botões de Ação */}
          <div className="pt-4 border-t border-slate-100 dark:border-[#2C2C2C] flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              {providerKey !== "IN_PERSON" ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTestConnection}
                  disabled={isTesting || isSaving}
                  className="h-10 px-4 text-xs gap-2 rounded-xl"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", isTesting && "animate-spin")} />
                  <span>{isTesting ? "Testando Conexão..." : "Testar Conexão com a API"}</span>
                </Button>
              ) : (
                <span className="text-[11px] text-slate-400">
                  Conexão sempre ativa e operacional
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <Link href="/admin/integracoes?tab=pagamentos" className="w-full sm:w-auto">
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full sm:w-auto h-10 px-4 text-xs rounded-xl"
                >
                  Cancelar
                </Button>
              </Link>

              <Button
                type="button"
                onClick={handleSave}
                disabled={isSaving || isTesting}
                className="w-full sm:w-auto h-10 px-5 text-xs font-semibold gap-2 rounded-xl shadow-xs"
              >
                {isSaving ? (
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
