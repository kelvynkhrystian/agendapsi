"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { IntegrationStatusBadge } from "./integration-status-badge";
import {
  PROVIDERS_META,
  PROVIDER_KEY_TO_SLUG,
} from "./payment-provider-form";
import {
  CreditCard,
  Check,
  ChevronRight,
  Loader2,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  Store,
  Sparkles,
} from "pulsoicon-react";
import { cn } from "@/lib/utils";
import type { GatewayConfigDTO, PaymentProviderKey } from "@/lib/payments/types";

const GATEWAY_ORDER: PaymentProviderKey[] = ["MERCADO_PAGO", "ASAAS", "PAGBANK", "IN_PERSON"];

export function PaymentsTab() {
  const router = useRouter();
  const [gateways, setGateways] = useState<GatewayConfigDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Carrega gateways
  const fetchGateways = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch("/api/admin/integrations/payments");
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Não foi possível carregar os gateways de pagamento.");
      }

      setGateways(data.gateways || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao carregar configurações.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGateways();
  }, [fetchGateways]);

  // Alterna ativação de um gateway diretamente pelo toggle
  const handleToggleGateway = async (providerKey: PaymentProviderKey, nextEnabled: boolean) => {
    setIsUpdating(providerKey);
    setError(null);
    setFeedback(null);

    // Atualização otimista local
    setGateways((prev) =>
      prev.map((g) => (g.providerKey === providerKey ? { ...g, isEnabled: nextEnabled } : g))
    );

    try {
      const res = await fetch("/api/admin/integrations/payments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerKey,
          isEnabled: nextEnabled,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Falha ao atualizar status do gateway.");
      }

      const meta = PROVIDERS_META[providerKey];
      setFeedback(
        nextEnabled
          ? `${meta.name} foi ativado com sucesso.`
          : `${meta.name} foi desativado.`
      );
      await fetchGateways();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar alteração.");
      await fetchGateways(); // reverte estado
    } finally {
      setIsUpdating(null);
    }
  };

  // Define um gateway como padrão (Single-Choice Control)
  const handleSetDefaultGateway = async (providerKey: PaymentProviderKey) => {
    setIsUpdating(`default_${providerKey}`);
    setError(null);
    setFeedback(null);

    try {
      const currentGw = gateways.find((g) => g.providerKey === providerKey);
      const res = await fetch("/api/admin/integrations/payments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerKey,
          isEnabled: currentGw?.isEnabled ?? true,
          isDefault: true,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Falha ao definir gateway padrão.");
      }

      const meta = PROVIDERS_META[providerKey];
      setFeedback(`${meta.name} definido como provedor padrão.`);
      await fetchGateways();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao alterar gateway padrão.");
    } finally {
      setIsUpdating(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-500 text-xs">
        <Loader2 className="h-5 w-5 animate-spin mr-2 text-[var(--primary)]" />
        Carregando integrações de pagamento...
      </div>
    );
  }

  // Lista ordenada dos gateways
  const orderedGateways = GATEWAY_ORDER.map((key) => {
    const found = gateways.find((g) => g.providerKey === key);
    return {
      key,
      meta: PROVIDERS_META[key],
      data: found,
    };
  });

  const onlineOperationalGateways = orderedGateways.filter(
    (g) => g.key !== "IN_PERSON" && g.data?.isEnabled
  );

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Aba */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-[#2C2C2C]">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-[var(--primary)]" />
            <span>Gateways e Métodos de Pagamento</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Gerencie os provedores disponíveis para os seus pacientes. Múltiplos gateways podem permanecer ativos simultaneamente.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={fetchGateways}
          disabled={isLoading || isUpdating !== null}
          className="h-9 text-xs gap-1.5 shrink-0 self-start sm:self-auto rounded-xl"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
          <span>Atualizar Status</span>
        </Button>
      </div>

      {/* Alertas */}
      {error && (
        <Alert variant="destructive" className="text-xs">
          {error}
        </Alert>
      )}

      {feedback && (
        <Alert variant="success" className="text-xs">
          {feedback}
        </Alert>
      )}

      {/* Controle de Gateway Online Padrão (Single-Choice) */}
      <div className="p-4 bg-slate-50/80 dark:bg-[#181818] border border-slate-200/80 dark:border-[#2C2C2C] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="space-y-0.5">
          <span className="font-bold text-slate-900 dark:text-slate-100 block">
            Gateway Online Padrão (Pré-selecionado para o Paciente)
          </span>
          <p className="text-slate-500 text-[11px] leading-relaxed">
            O paciente poderá escolher livremente entre qualquer um dos gateways ativos, mas o padrão será sugerido inicialmente.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {orderedGateways.map(({ key, meta, data }) => {
            const isDef = data?.isDefault || false;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleSetDefaultGateway(key)}
                disabled={isUpdating !== null}
                className={cn(
                  "px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5",
                  isDef
                    ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-xs"
                    : "bg-white dark:bg-[#222222] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#333333] hover:border-slate-300"
                )}
              >
                {isDef && <Check className="h-3.5 w-3.5 stroke-[2.5]" />}
                <span>{meta.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid de 4 Cards Compactos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {orderedGateways.map(({ key, meta, data }) => {
          const isEnabled = data?.isEnabled ?? false;
          const isDefault = data?.isDefault ?? false;
          const isSandbox = data?.isSandbox ?? true;
          const healthStatus = data?.healthStatus || (key === "IN_PERSON" ? "CONNECTED" : "NOT_CONFIGURED");
          const configSlug = PROVIDER_KEY_TO_SLUG[key];

          return (
            <div
              key={key}
              role="button"
              tabIndex={0}
              onClick={() => router.push(`/admin/integracoes/pagamentos/${configSlug}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  router.push(`/admin/integracoes/pagamentos/${configSlug}`);
                }
              }}
              className={cn(
                "group p-5 rounded-2xl border transition-all duration-200 cursor-pointer select-none flex flex-col justify-between space-y-4 bg-white dark:bg-[#1E1E1E]",
                isEnabled
                  ? "border-slate-200 dark:border-[#2C2C2C] hover:border-[var(--primary)]/70 hover:shadow-xs"
                  : "border-slate-200/60 dark:border-[#242424] opacity-80 hover:opacity-100 hover:border-slate-300"
              )}
            >
              {/* Topo do Card: Ícone, Nome, Badges e Toggle Switch */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0",
                      meta.iconBg,
                      meta.iconColor
                    )}
                  >
                    {key === "IN_PERSON" ? <Store className="h-5 w-5" /> : meta.badgeCode}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-[var(--primary)] transition-colors">
                        {meta.name}
                      </h3>

                      {isDefault && (
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200/80 px-2 py-0.2 rounded-md shrink-0">
                          Padrão
                        </span>
                      )}

                      {key !== "IN_PERSON" && (
                        <span
                          className={cn(
                            "text-[10px] font-semibold px-2 py-0.2 rounded-md border shrink-0",
                            isSandbox
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          )}
                        >
                          {isSandbox ? "Sandbox" : "Produção"}
                        </span>
                      )}
                    </div>

                    <span className="text-[11px] text-slate-400 dark:text-slate-500">
                      {isEnabled ? "Ativado para atendimentos" : "Desativado"}
                    </span>
                  </div>
                </div>

                {/* Toggle Switch (Mesmo componente e animação de Horários) */}
                <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                  <ToggleSwitch
                    checked={isEnabled}
                    disabled={isUpdating === key}
                    onChange={(val) => handleToggleGateway(key, val)}
                    label={`Alternar ativação de ${meta.name}`}
                  />
                </div>
              </div>

              {/* Centro: Descrição Curta */}
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                {meta.shortDesc}
              </p>

              {/* Rodapé: Status Real de Conexão e Link de Configuração */}
              <div className="pt-3 border-t border-slate-100 dark:border-[#2C2C2C] flex items-center justify-between gap-2">
                <IntegrationStatusBadge
                  enabled={isEnabled}
                  status={healthStatus as any}
                  healthMessage={data?.healthMessage}
                  lastCheckedAt={data?.lastCheckedAt}
                  lastTestedAt={data?.lastTestedAt}
                />

                <div className="flex items-center gap-1 text-xs font-semibold text-slate-500 group-hover:text-[var(--primary)] transition-colors shrink-0">
                  <span>Configurar</span>
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
