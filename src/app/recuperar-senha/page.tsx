"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { KeyRound, Stethoscope, ArrowLeft, Phone, Mail } from "pulsoicon-react";

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

function buildWhatsAppHref(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, "");
  if (!digits) return "#";
  const withCountry = digits.length <= 11 && !digits.startsWith("55") ? `55${digits}` : digits;
  return `https://wa.me/${withCountry}`;
}

export default function RecoverPasswordPage() {
  const [email, setEmail] = useState("");
  const [availability, setAvailability] = useState<RecoveryAvailability | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/recover-password", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setAvailability(data);
      })
      .catch(() => {
        // Mantém fallback padrão em caso de oscilação de rede
      })
      .finally(() => {
        setIsLoadingConfig(false);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);
    setDevLink(null);

    try {
      const res = await fetch("/api/auth/recover-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
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
        setError(data.error || "Não foi possível processar a recuperação.");
        setIsLoading(false);
        return;
      }

      setMessage(data.message);
      if (data.devLink) {
        setDevLink(data.devLink);
      }
      setIsLoading(false);
    } catch {
      setError("Erro ao conectar com o servidor.");
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
    <div className="min-h-[100dvh] flex flex-col justify-between p-4 sm:p-6 bg-[#F8F8F8] dark:bg-[#0C0C0C]">
      <div className="flex justify-between items-center max-w-5xl w-full mx-auto gap-3">
        <Link href="/" className="flex items-center gap-2 font-bold text-base sm:text-lg text-[var(--primary)] min-w-0">
          <Stethoscope className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" />
          <span className="truncate">PSI Consultório</span>
        </Link>
        <ThemeToggle />
      </div>

      <div className="max-w-md w-full mx-auto my-6 sm:my-8">
        <Card className="border-[#E5E5E5] dark:border-[#2C2C2C] shadow-md">
          <CardHeader className="text-center space-y-2 p-4 sm:p-6">
            <div className="mx-auto w-12 h-12 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] mb-2">
              <KeyRound className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl sm:text-2xl font-bold">Recuperar Senha</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {isAdminAssistedOnly
                ? "A redefinição automática por e-mail está desativada no momento"
                : isSmsFallback
                ? "Envio de instruções alternativas via SMS para cadastros habilitados"
                : "Informe seu e-mail cadastrado para receber as instruções de redefinição"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
            {isLoadingConfig ? (
              <div className="space-y-3 py-2">
                <div className="h-10 rounded-xl bg-[#E5E5E5] dark:bg-[#242424] animate-pulse" />
                <div className="h-11 rounded-xl bg-[#E5E5E5] dark:bg-[#242424] animate-pulse" />
              </div>
            ) : isAdminAssistedOnly ? (
              <div className="space-y-4">
                <Alert variant="warning">
                  O envio automático por e-mail foi desativado pela administração do consultório. Para recuperar ou redefinir sua senha com segurança, entre em contato diretamente pelos canais abaixo:
                </Alert>

                <div className="rounded-xl border border-[#E5E5E5] dark:border-[#2C2C2C] bg-[#F8F8F8] dark:bg-[#141414] p-4 space-y-3 text-xs">
                  <p className="font-semibold text-sm text-[#171717] dark:text-[#F5F5F5]">
                    {contact?.clinicName || "Consultório PSI"}
                  </p>

                  {contact?.whatsappNumber && (
                    <a
                      href={buildWhatsAppHref(contact.whatsappNumber)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 text-[#171717] dark:text-[#F5F5F5] hover:underline"
                    >
                      <WhatsAppIcon className="h-4 w-4 shrink-0" />
                      <span className="tabular-nums">WhatsApp: {contact.whatsappNumber}</span>
                    </a>
                  )}

                  {contact?.phone && (
                    <a
                      href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}
                      className="flex items-center gap-2.5 text-[#404040] dark:text-[#D0D0D0] hover:underline"
                    >
                      <Phone className="h-4 w-4 shrink-0 text-[var(--primary)]" />
                      <span className="tabular-nums">Telefone: {contact.phone}</span>
                    </a>
                  )}

                  {contact?.email && (
                    <a
                      href={`mailto:${contact.email}`}
                      className="flex items-start gap-2.5 text-[#404040] dark:text-[#D0D0D0] hover:underline min-w-0"
                    >
                      <Mail className="h-4 w-4 shrink-0 text-[var(--primary)] mt-0.5" />
                      <span className="break-all">E-mail: {contact.email}</span>
                    </a>
                  )}

                  {!contact?.whatsappNumber && !contact?.phone && !contact?.email && (
                    <p className="text-[#737373] dark:text-[#A6A6A6]">
                      Procure diretamente o profissional responsável pelo seu atendimento para receber uma nova senha temporária.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <>
                {isSmsFallback && (
                  <Alert variant="info">
                    O canal de e-mail está desativado. Ao informar seu e-mail, enviaremos o link de recuperação via SMS caso seu cadastro possua celular e recebimento por SMS autorizados.
                  </Alert>
                )}

                {error && <Alert variant="destructive">{error}</Alert>}
                {message && <Alert variant="success">{message}</Alert>}

                {devLink && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-xs space-y-1">
                    <span className="font-semibold text-amber-800 dark:text-amber-300">
                      Ambiente de Desenvolvimento — Envio Simulado
                    </span>
                    <p className="text-amber-700 dark:text-amber-400">
                      Como o servidor de e-mail real não está ativo neste ambiente, utilize o link direto abaixo:
                    </p>
                    <Link
                      href={devLink}
                      className="block text-[var(--primary)] font-mono underline break-all"
                    >
                      {devLink}
                    </Link>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    label="E-mail"
                    type="email"
                    placeholder="seu.email@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />

                  <Button
                    type="submit"
                    className="w-full mt-2"
                    size="lg"
                    isLoading={isLoading}
                  >
                    {isSmsFallback ? "Enviar Recuperação via SMS" : "Enviar Instruções"}
                  </Button>
                </form>
              </>
            )}

            <div className="text-center pt-2">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-sm text-[var(--button-outline-fg,var(--button-bg,var(--primary)))] dark:text-[#D0D0D0] hover:underline transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Voltar para o Login</span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <footer className="text-center text-xs text-[#737373] dark:text-[#A6A6A6] py-4">
        &copy; {new Date().getFullYear()} PSI — Sistema de Gestão de Consultórios.
      </footer>
    </div>
  );
}
