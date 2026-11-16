"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { BookingHeader } from "@/components/booking/booking-header";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import {
  KeyRound,
  ArrowLeft,
  Phone,
  Mail,
  CheckCircle2,
  AlertTriangle,
} from "pulsoicon-react";

export const dynamic = "force-dynamic";

interface RecoveryAvailability {
  emailEnabled: boolean;
  emailCanSend: boolean;
  recoveryStrategy: "ADMIN_ASSISTED" | "SMS" | null;
  smsRecoveryReady: boolean;
  clinicContact: {
    clinicName: string;
    phone: string | null;
    whatsappNumber: string | null;
    email: string | null;
  };
}

interface SiteSettingsData {
  clinicName?: string;
  logoUrl?: string | null;
  logoHorizontalUrl?: string | null;
  showLocation?: boolean;
  themeName?: string;
  primaryColor?: string;
  whatsappNumber?: string;
}

interface ProfileData {
  fullName?: string;
  displayName?: string;
  title?: string;
  crpCrm?: string | null;
}

function buildWhatsAppHref(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, "");
  if (!digits) return "#";
  const withCountry = digits.length <= 11 && !digits.startsWith("55") ? `55${digits}` : digits;
  return `https://wa.me/${withCountry}`;
}

function RecoverPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Dados do consultório e do profissional
  const [site, setSite] = useState<SiteSettingsData | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [sectionsConfig, setSectionsConfig] = useState<any>(null);

  // Estados do formulário de recuperação
  const [email, setEmail] = useState("");
  const [availability, setAvailability] = useState<RecoveryAvailability | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Carrega configurações do site, perfil e disponibilidade de recuperação
  useEffect(() => {
    let active = true;

    // 1. Configurações de branding e tema do site
    fetch("/api/site/settings", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        const siteData = data.site || data;
        setSite(siteData);
        if (data.profile) setProfile(data.profile);
        if (data.sectionsConfig) {
          try {
            setSectionsConfig(
              typeof data.sectionsConfig === "string"
                ? JSON.parse(data.sectionsConfig)
                : data.sectionsConfig
            );
          } catch {
            setSectionsConfig(null);
          }
        }
      })
      .catch(() => {});

    // 2. Perfil profissional
    fetch("/api/profile", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        setProfile(data);
      })
      .catch(() => {});

    // 3. Disponibilidade de canais de recuperação de senha
    fetch("/api/auth/recover-password", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        setAvailability(data);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setIsLoadingConfig(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Navegação segura de retorno (evita redirecionamento a páginas administrativas)
  const handleBack = () => {
    const from = searchParams.get("from");
    if (from === "agendar") {
      router.push("/agendar");
      return;
    }
    if (
      typeof window !== "undefined" &&
      window.history.length > 1 &&
      document.referrer &&
      !document.referrer.includes("/admin")
    ) {
      router.back();
      return;
    }
    router.push("/login");
  };

  const fromParam = searchParams.get("from");
  const loginUrl = fromParam === "agendar" ? "/login?from=agendar" : "/login";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setError(null);
    setMessage(null);
    setDevLink(null);

    try {
      const res = await fetch("/api/auth/recover-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.clinicContact && !availability) {
          setAvailability({
            emailEnabled: false,
            emailCanSend: false,
            recoveryStrategy: data.strategy || "ADMIN_ASSISTED",
            smsRecoveryReady: false,
            clinicContact: data.clinicContact,
          });
        }
        setError(data.error || "Não foi possível processar a recuperação de senha.");
        setIsLoading(false);
        return;
      }

      setMessage(data.message || "Se o e-mail estiver cadastrado, as instruções foram enviadas.");
      if (data.devLink) {
        setDevLink(data.devLink);
      }
      setIsLoading(false);
    } catch {
      setError("Erro ao conectar com o servidor. Tente novamente.");
      setIsLoading(false);
    }
  };

  const isAdminAssistedOnly =
    Boolean(availability) &&
    !availability!.emailEnabled &&
    availability!.recoveryStrategy !== "SMS";

  const isSmsFallback =
    Boolean(availability) &&
    !availability!.emailEnabled &&
    availability!.recoveryStrategy === "SMS";

  const contact = availability?.clinicContact;

  return (
    <div
      data-theme="light"
      className="min-h-screen flex flex-col justify-between bg-[#FDFCFB] text-slate-900 selection:bg-[var(--primary)] selection:text-white relative overflow-x-hidden"
    >
      {/* 1. Cabeçalho Oficial Dedicado e Minimalista */}
      <BookingHeader
        logoHorizontalUrl={site?.logoHorizontalUrl}
        logoUrl={site?.logoUrl}
        clinicName={site?.clinicName}
        professionalName={profile?.displayName || profile?.fullName}
        shouldShowLocation={site?.showLocation}
        visibleSections={sectionsConfig}
        onBack={handleBack}
      />

      {/* 2. Container Principal de Recuperação de Senha (Mobile-First) */}
      <main className="pt-20 sm:pt-22 md:pt-24 pb-12 sm:pb-16 px-3.5 sm:px-6 max-w-md mx-auto w-full flex-1 relative z-10 flex flex-col justify-center">
        <div className="bg-white border border-slate-200/90 rounded-3xl shadow-sm p-6 sm:p-8 space-y-6">
          {/* Ícone de Destaque com Cor do Tema */}
          <div className="w-14 h-14 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center mx-auto shadow-xs">
            <KeyRound className="h-7 w-7" />
          </div>

          {/* Título e Descrição */}
          <div className="text-center space-y-1.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-heading">
              Recuperar Senha
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">
              {isAdminAssistedOnly
                ? "A redefinição automática por e-mail está desativada no momento."
                : isSmsFallback
                ? "Envio de instruções alternativas via SMS para cadastros habilitados."
                : "Informe seu e-mail cadastrado para receber as instruções de redefinição."}
            </p>
          </div>

          {/* Conteúdo Dinâmico conforme Disponibilidade de Canais */}
          {isLoadingConfig ? (
            <div className="space-y-4 py-2">
              <div className="h-4 w-24 bg-slate-100 rounded-md animate-pulse" />
              <div className="h-12 rounded-2xl bg-slate-100 animate-pulse" />
              <div className="h-12 rounded-2xl bg-slate-100 animate-pulse" />
            </div>
          ) : isAdminAssistedOnly ? (
            /* ================= ATENDIMENTO ASSISTIDO ================= */
            <div className="space-y-4">
              <Alert variant="warning" className="rounded-2xl text-xs">
                O envio automático por e-mail foi desativado pela administração do consultório. Para recuperar ou redefinir sua senha com segurança, entre em contato diretamente pelos canais abaixo:
              </Alert>

              <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-4 space-y-3 text-xs">
                <p className="font-bold text-sm text-slate-900">
                  {contact?.clinicName || site?.clinicName || "Consultório"}
                </p>

                {contact?.whatsappNumber && (
                  <a
                    href={buildWhatsAppHref(contact.whatsappNumber)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 text-slate-800 hover:text-[var(--primary)] hover:underline"
                  >
                    <WhatsAppIcon className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span className="tabular-nums font-medium">WhatsApp: {contact.whatsappNumber}</span>
                  </a>
                )}

                {contact?.phone && (
                  <a
                    href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}
                    className="flex items-center gap-2.5 text-slate-800 hover:text-[var(--primary)] hover:underline"
                  >
                    <Phone className="h-4 w-4 shrink-0 text-[var(--primary)]" />
                    <span className="tabular-nums font-medium">Telefone: {contact.phone}</span>
                  </a>
                )}

                {contact?.email && (
                  <a
                    href={`mailto:${contact.email}`}
                    className="flex items-start gap-2.5 text-slate-800 hover:text-[var(--primary)] hover:underline min-w-0"
                  >
                    <Mail className="h-4 w-4 shrink-0 text-[var(--primary)] mt-0.5" />
                    <span className="break-all font-medium">E-mail: {contact.email}</span>
                  </a>
                )}

                {!contact?.whatsappNumber && !contact?.phone && !contact?.email && (
                  <p className="text-slate-500">
                    Procure diretamente o profissional responsável pelo seu atendimento para receber uma nova senha temporária.
                  </p>
                )}
              </div>
            </div>
          ) : (
            /* ================= FORMULÁRIO DE RECUPERAÇÃO ================= */
            <div className="space-y-4">
              {isSmsFallback && (
                <Alert variant="info" className="rounded-2xl text-xs">
                  O canal de e-mail está desativado. Ao informar seu e-mail, enviaremos o link de recuperação via SMS caso seu cadastro possua celular e recebimento por SMS autorizados.
                </Alert>
              )}

              {error && (
                <Alert variant="destructive" className="rounded-2xl shadow-xs text-xs animate-fade-in">
                  {error}
                </Alert>
              )}

              {message && (
                <Alert variant="success" className="rounded-2xl shadow-xs text-xs animate-fade-in flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{message}</span>
                </Alert>
              )}

              {devLink && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs space-y-1.5 text-amber-900 animate-fade-in">
                  <span className="font-semibold block text-amber-900">
                    Ambiente de Desenvolvimento — Envio Simulado
                  </span>
                  <p className="text-amber-800 text-[11px] leading-relaxed">
                    Como o servidor de e-mail real não está ativo neste ambiente, utilize o link direto abaixo para redefinir sua senha:
                  </p>
                  <Link
                    href={devLink}
                    className="block text-[var(--primary)] font-mono font-medium underline break-all pt-1"
                  >
                    {devLink}
                  </Link>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5 text-left">
                  <label
                    htmlFor="recover-email"
                    className="text-xs font-semibold text-slate-700 ml-1 flex items-center gap-1.5"
                  >
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    <span>E-mail</span>
                  </label>
                  <Input
                    id="recover-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com"
                    required
                    autoComplete="email"
                    autoFocus
                    className="h-11 sm:h-12 rounded-xl sm:rounded-2xl border-slate-200 bg-slate-50/60 focus:bg-white focus:border-[var(--primary)] focus:ring-[var(--primary)] text-sm px-3.5 shadow-none"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || !email.trim()}
                  isLoading={isLoading}
                  className="w-full h-11 sm:h-12 rounded-xl sm:rounded-2xl bg-[var(--button-bg,var(--primary))] text-[var(--button-fg,#ffffff)] font-heading font-semibold shadow-xs hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-sm sm:text-base cursor-pointer"
                >
                  {isSmsFallback ? "Enviar Recuperação via SMS" : "Enviar Instruções"}
                </Button>
              </form>
            </div>
          )}

          {/* Ação Secundária: Voltar ao Login */}
          <div className="text-center pt-2 border-t border-slate-100">
            <Link
              href={loginUrl}
              className="inline-flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-[var(--primary)] transition-colors py-1.5 px-3 rounded-xl hover:bg-black/5"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar ao Login</span>
            </Link>
          </div>
        </div>
      </main>

      {/* 3. Rodapé Oficial */}
      <footer className="text-center text-xs text-slate-400 py-6">
        &copy; {new Date().getFullYear()} {site?.clinicName || "Consultório"} &bull; Gestão Profissional de Consultórios
      </footer>
    </div>
  );
}

export default function RecoverPasswordPage() {
  return (
    <Suspense
      fallback={
        <div
          data-theme="light"
          className="min-h-screen flex items-center justify-center bg-[#FDFCFB]"
        >
          <div className="w-8 h-8 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
        </div>
      }
    >
      <RecoverPasswordContent />
    </Suspense>
  );
}
