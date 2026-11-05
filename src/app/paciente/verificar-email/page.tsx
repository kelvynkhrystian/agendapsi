"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

function EmailVerificationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [isLoading, setIsLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      setErrorMessage("Link de verificação inválido ou incompleto. O parâmetro do token está ausente.");
      return;
    }

    let isMounted = true;

    async function verify() {
      try {
        const res = await fetch("/api/patient/email-change/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();

        if (!isMounted) return;

        if (res.ok && data.success) {
          setSuccess(true);
          setNewEmail(data.newEmail);
        } else {
          setSuccess(false);
          setErrorMessage(data.error || "Não foi possível validar o link de verificação.");
        }
      } catch {
        if (isMounted) {
          setSuccess(false);
          setErrorMessage("Erro de comunicação ao validar a confirmação do e-mail.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    verify();

    return () => {
      isMounted = false;
    };
  }, [token]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-lg border-slate-200 dark:border-slate-800">
        <CardHeader className="text-center pb-2">
          {isLoading && (
            <div className="mx-auto w-12 h-12 flex items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)] mb-3">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          )}

          {!isLoading && success && (
            <div className="mx-auto w-12 h-12 flex items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          )}

          {!isLoading && !success && (
            <div className="mx-auto w-12 h-12 flex items-center justify-center rounded-full bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
          )}

          <CardTitle className="text-xl font-bold">
            {isLoading
              ? "Confirmando Alteração de E-mail"
              : success
              ? "E-mail Atualizado com Sucesso!"
              : "Falha na Confirmação"}
          </CardTitle>
          <CardDescription>
            {isLoading
              ? "Aguarde enquanto validamos seu link seguro de confirmação..."
              : success
              ? "Seu endereço de e-mail de acesso foi alterado."
              : "Não foi possível concluir a alteração do e-mail."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 text-center pt-2">
          {!isLoading && success && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                O novo endereço de acesso da sua conta é:
              </p>
              <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
                {newEmail}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sua senha permanece a mesma. Utilize o novo e-mail para seus próximos acessos ao sistema.
              </p>
              <div className="pt-2">
                <Button className="w-full" onClick={() => router.push("/paciente/perfil")}>
                  Acessar Meu Perfil
                </Button>
              </div>
            </div>
          )}

          {!isLoading && !success && (
            <div className="space-y-4">
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 rounded-lg text-xs text-left">
                {errorMessage}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Por motivos de segurança, links de verificação são de uso único e expiram em 15 minutos. Caso necessário, solicite um novo link a partir do seu perfil.
              </p>
              <div className="pt-2">
                <Link href="/paciente/perfil">
                  <Button variant="outline" className="w-full gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    Voltar ao Perfil
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function EmailVerificationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center p-4">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      }
    >
      <EmailVerificationContent />
    </Suspense>
  );
}
