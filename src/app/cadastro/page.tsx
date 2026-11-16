"use client";

import React, { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BookingHeader } from "@/components/booking/booking-header";
import { PatientRegisterForm } from "@/components/auth/patient-register-form";
import { UserCheck } from "pulsoicon-react";

export const dynamic = "force-dynamic";

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

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromParam = searchParams.get("from");

  // Dados dinâmicos do consultório e do profissional
  const [site, setSite] = useState<SiteSettingsData | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [sectionsConfig, setSectionsConfig] = useState<any>(null);

  // LGPD: Opt-in explícito para lembretes de agendamentos e notificações por SMS (inicia false)
  const [smsOptIn, setSmsOptIn] = useState(false);

  // Carrega configurações de branding e dados do profissional
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

    return () => {
      active = false;
    };
  }, []);

  // Navegação segura do botão Voltar
  const handleBack = () => {
    if (fromParam === "agendar") {
      router.push("/agendar");
    } else {
      router.push("/login");
    }
  };

  const loginHref = fromParam ? `/login?from=${fromParam}` : "/login";

  const brandName =
    site?.clinicName && site.clinicName !== "PSI"
      ? site.clinicName
      : profile?.displayName || profile?.fullName || "Consultório de Psicologia";

  return (
    <div
      data-theme="light"
      className="min-h-screen flex flex-col justify-between bg-[#FDFCFB] text-slate-900 selection:bg-[var(--primary)] selection:text-white relative overflow-x-hidden"
    >
      {/* 1. Header Oficial Dedicado e Minimalista */}
      <BookingHeader
        logoHorizontalUrl={site?.logoHorizontalUrl}
        logoUrl={site?.logoUrl}
        clinicName={site?.clinicName}
        professionalName={profile?.displayName || profile?.fullName}
        shouldShowLocation={site?.showLocation}
        visibleSections={sectionsConfig}
        onBack={handleBack}
      />

      {/* 2. Conteúdo Principal Centralizado */}
      <main className="flex-1 flex items-center justify-center px-4 pt-24 sm:pt-28 pb-12">
        <div className="w-full max-w-lg mx-auto">
          <div className="bg-white border border-slate-200/90 rounded-3xl shadow-sm p-6 sm:p-8 space-y-6">
            {/* Cabeçalho do Card */}
            <div className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] mb-2 shadow-xs">
                <UserCheck className="h-6 w-6" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Cadastro de Paciente
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
                Preencha seus dados para agendamentos e acesso à sua área exclusiva
              </p>
            </div>

            {/* Formulário Compartilhado de Cadastro com a mesma lógica e validação do /agendar */}
            <PatientRegisterForm
              redirectTo="/paciente"
              submitLabel="Criar Cadastro de Paciente"
              loginUrl={loginHref}
            />
          </div>

          <p className="text-center text-xs text-slate-500 mt-6">
            Ambiente em conformidade com as diretrizes do CFP e LGPD.
          </p>
        </div>
      </main>

      {/* 3. Rodapé Oficial */}
      <footer className="py-6 px-4 text-center border-t border-slate-200/60 bg-white/40">
        <p className="text-xs text-slate-400">
          &copy; {new Date().getFullYear()} {brandName}. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB]">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}
