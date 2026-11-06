"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ShieldCheck, Cookie, Check, X, SlidersHorizontal, Info } from "lucide-react";

const CONSENT_STORAGE_KEY = "psi_cookie_consent";
const CURRENT_POLICY_VERSION = "1.0";
const CONSENT_VALIDITY_DAYS = 180;

export interface CookieConsentData {
  necessary: boolean;
  analytics: boolean;
  externalMedia: boolean;
  choice: "accepted_all" | "rejected_optional" | "custom";
  version: string;
  timestamp: string;
  expiresAt: string;
}

export function CookieBanner() {
  const pathname = usePathname();
  const isInternalArea = pathname.startsWith("/admin") || pathname.startsWith("/paciente");

  const [mounted, setMounted] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);

  // Estados das categorias opcionais
  const [analytics, setAnalytics] = useState(false);
  const [externalMedia, setExternalMedia] = useState(false);

  // Verifica preferências salvas ao carregar
  useEffect(() => {
    setMounted(true);

    if (isInternalArea) {
      setShowBanner(false);
      return;
    }

    try {
      const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
      if (!raw) {
        setShowBanner(true);
        return;
      }

      const parsed: CookieConsentData = JSON.parse(raw);
      const isExpired = new Date(parsed.expiresAt).getTime() < Date.now();
      const isVersionMismatch = parsed.version !== CURRENT_POLICY_VERSION;

      if (isExpired || isVersionMismatch) {
        setShowBanner(true);
      } else {
        setShowBanner(false);
        setAnalytics(parsed.analytics ?? false);
        setExternalMedia(parsed.externalMedia ?? false);
      }
    } catch {
      setShowBanner(true);
    }
  }, [pathname, isInternalArea]);

  // Listener para reabertura de preferências a partir do rodapé
  useEffect(() => {
    const handleOpenPreferences = () => {
      try {
        const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
        if (raw) {
          const parsed: CookieConsentData = JSON.parse(raw);
          setAnalytics(parsed.analytics ?? false);
          setExternalMedia(parsed.externalMedia ?? false);
        }
      } catch {}
      setShowPreferencesModal(true);
    };

    window.addEventListener("open-psi-cookie-preferences", handleOpenPreferences);
    return () => {
      window.removeEventListener("open-psi-cookie-preferences", handleOpenPreferences);
    };
  }, []);

  const saveConsent = (
    choice: "accepted_all" | "rejected_optional" | "custom",
    customAnalytics: boolean,
    customMedia: boolean
  ) => {
    const now = new Date();
    const expiry = new Date(now.getTime() + CONSENT_VALIDITY_DAYS * 24 * 60 * 60 * 1000);

    const consentData: CookieConsentData = {
      necessary: true,
      analytics: customAnalytics,
      externalMedia: customMedia,
      choice,
      version: CURRENT_POLICY_VERSION,
      timestamp: now.toISOString(),
      expiresAt: expiry.toISOString(),
    };

    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consentData));
      window.dispatchEvent(
        new CustomEvent("psi_cookie_consent_updated", { detail: consentData })
      );
    } catch (e) {
      console.error("Erro ao salvar consentimento de cookies:", e);
    }

    setAnalytics(customAnalytics);
    setExternalMedia(customMedia);
    setShowBanner(false);
    setShowPreferencesModal(false);
  };

  const handleAcceptAll = () => {
    saveConsent("accepted_all", true, true);
  };

  const handleRejectOptional = () => {
    saveConsent("rejected_optional", false, false);
  };

  const handleSaveCustom = () => {
    saveConsent("custom", analytics, externalMedia);
  };

  if (!mounted || isInternalArea) return null;

  return (
    <>
      {/* ================= BANNER FLUTUANTE DE CONSENTIMENTO ================= */}
      {showBanner && (
        <div
          role="region"
          aria-label="Consentimento de Cookies"
          className="fixed bottom-0 inset-x-0 z-50 p-4 sm:p-5 bg-white border-t border-[#E2E4E8] shadow-2xl text-[#111827] transition-all animate-in fade-in slide-in-from-bottom duration-300"
        >
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1 max-w-3xl">
              <div className="flex items-center gap-2">
                <Cookie className="h-5 w-5 text-[var(--primary)] shrink-0" />
                <h3 className="font-heading font-bold text-sm text-[#111827]">
                  Privacidade e Cookies do Consultório
                </h3>
              </div>
              <p className="text-xs text-[#4B5563] leading-relaxed">
                Valorizamos sua privacidade. Utilizamos recursos necessários para o funcionamento do site e, com sua autorização, tecnologias opcionais para melhorar sua experiência. Você pode aceitar, rejeitar ou personalizar suas preferências. Saiba mais em nossa{" "}
                <Link
                  href="/politica-de-privacidade"
                  className="font-semibold text-[var(--primary)] hover:underline inline-flex items-center gap-0.5"
                >
                  Política de Privacidade
                </Link>.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0 pt-2 md:pt-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRejectOptional}
                className="text-xs flex-1 sm:flex-initial"
              >
                Rejeitar Opcionais
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowPreferencesModal(true)}
                className="text-xs gap-1.5 flex-1 sm:flex-initial text-slate-700 hover:text-slate-900"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>Personalizar</span>
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleAcceptAll}
                className="text-xs flex-1 sm:flex-initial font-semibold"
              >
                Aceitar Opcionais
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL DE PERSONALIZAÇÃO DE PREFERÊNCIAS ================= */}
      <Modal
        isOpen={showPreferencesModal}
        onClose={() => setShowPreferencesModal(false)}
        title="Preferências de Privacidade e Cookies"
        description="Controle com transparência quais tecnologias de armazenamento você autoriza em sua navegação."
        maxWidth="lg"
      >
        <div className="space-y-5 text-xs text-[#111827]">
          {/* CATEGORIA 1: ESTRITAMENTE NECESSÁRIOS */}
          <div className="p-4 rounded-xl bg-slate-50 border border-[#E2E4E8] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[var(--primary)] shrink-0" />
                <span className="font-bold text-sm text-[#111827]">
                  Cookies Estritamente Necessários (Essenciais)
                </span>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                Sempre Ativos (Obrigatórios)
              </span>
            </div>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              Imprescindíveis para a operação técnica da plataforma: manutenção da sessão autenticada segura (<code>psi_auth_token</code>), proteção contra CSRF, integridade das reservas de consulta e memorização da sua decisão de privacidade. Não podem ser desativados.
            </p>
          </div>

          {/* CATEGORIA 2: ESTATÍSTICAS E DESEMPENHO */}
          <div className="p-4 rounded-xl bg-white border border-[#E2E4E8] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cookie className="h-4 w-4 text-blue-600 shrink-0" />
                <span className="font-bold text-sm text-[#111827]">
                  Estatísticas e Desempenho (Opcionais)
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={analytics}
                  onChange={(e) => setAnalytics(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--primary)]"></div>
              </label>
            </div>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              Permitem analisar métricas anônimas de visualizações e tempos de carregamento para aprimorar a estabilidade do site. Nenhuma informação clínica ou de saúde é tratada nesta categoria.
            </p>
          </div>

          {/* CATEGORIA 3: MÍDIAS EXTERNAS E RECURSOS INTERATIVOS */}
          <div className="p-4 rounded-xl bg-white border border-[#E2E4E8] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-purple-600 shrink-0" />
                <span className="font-bold text-sm text-[#111827]">
                  Mídias Externas e Recursos Interativos (Opcionais)
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={externalMedia}
                  onChange={(e) => setExternalMedia(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--primary)]"></div>
              </label>
            </div>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              Habilitam o carregamento de componentes interativos externos de terceiros, como mapas integrados e reprodutores externos.
            </p>
          </div>

          <div className="flex items-center gap-2 p-3 bg-slate-50 border border-[#E2E4E8] rounded-xl text-[11px] text-slate-500">
            <Info className="h-4 w-4 text-[var(--primary)] shrink-0" />
            <span>
              Suas preferências têm validade de 180 dias e podem ser alteradas ou revogadas a qualquer momento pelo link <strong>Preferências de cookies</strong> no rodapé da página.
            </span>
          </div>

          {/* BOTÕES DE AÇÃO */}
          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-3 border-t border-[#E2E4E8]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRejectOptional}
            >
              Rejeitar Opcionais
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleSaveCustom}
            >
              Salvar Preferências
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleAcceptAll}
            >
              Aceitar Todos
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
