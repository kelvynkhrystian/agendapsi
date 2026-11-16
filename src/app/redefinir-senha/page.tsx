"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { KeyRound, Stethoscope, ArrowLeft, CheckCircle2 } from "pulsoicon-react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get("token") || "";
  const emailParam = searchParams.get("email") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    !token || !emailParam
      ? "Link de redefinição incompleto ou inválido. Solicite uma nova recuperação."
      : null
  );
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !emailParam) {
      setError("Parâmetros de redefinição ausentes.");
      return;
    }

    if (password.length < 8) {
      setError("A nova senha deve ter no mínimo 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não coincidem. Digite novamente.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailParam,
          token,
          newPassword: password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Não foi possível redefinir a senha.");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Falha de comunicação com o servidor. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-[#F8F8F8] dark:bg-[#121212] transition-colors relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] mb-2 shadow-sm">
            <Stethoscope className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#171717] dark:text-[#EDEDED]">
            PSI Consultório
          </h1>
          <p className="text-sm text-[#737373] dark:text-[#A6A6A6]">
            Criação de nova senha segura de acesso
          </p>
        </div>

        <Card className="border border-[#E5E5E5] dark:border-[#262626] bg-white dark:bg-[#1E1E1E] shadow-sm rounded-2xl">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-[var(--primary)]" />
              <CardTitle className="text-lg">Redefinir Senha</CardTitle>
            </div>
            <CardDescription>
              {emailParam
                ? `Defina a nova senha para ${emailParam}`
                : "Informe os dados para criar uma nova senha"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {success ? (
              <div className="space-y-4 py-2 text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-base text-[#171717] dark:text-[#EDEDED]">
                    Senha alterada com sucesso!
                  </h3>
                  <p className="text-xs text-[#737373] dark:text-[#A6A6A6]">
                    Sua nova credencial já está ativa e pronta para uso.
                  </p>
                </div>
                <Button
                  onClick={() => router.push("/login")}
                  className="w-full mt-4 h-11 bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white rounded-xl"
                >
                  Entrar no Sistema
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive" className="text-xs py-2.5">
                    {error}
                  </Alert>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#404040] dark:text-[#D4D4D4]">
                    Nova Senha
                  </label>
                  <Input
                    type="password"
                    placeholder="Mínimo de 8 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading || !token || !emailParam}
                    minLength={8}
                    className="h-10 text-sm rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#404040] dark:text-[#D4D4D4]">
                    Confirmar Nova Senha
                  </label>
                  <Input
                    type="password"
                    placeholder="Repita a nova senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isLoading || !token || !emailParam}
                    minLength={8}
                    className="h-10 text-sm rounded-xl"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || !token || !emailParam}
                  className="w-full h-11 bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white font-medium rounded-xl shadow-sm transition-all mt-2"
                >
                  {isLoading ? "Salvando..." : "Salvar Nova Senha"}
                </Button>
              </form>
            )}

            <div className="mt-6 pt-4 border-t border-[#E5E5E5] dark:border-[#262626] text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#737373] dark:text-[#A6A6A6] hover:text-[var(--primary)] transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Voltar para o login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F8F8F8] dark:bg-[#121212]">
          <div className="text-sm text-[#737373] dark:text-[#A6A6A6]">Carregando...</div>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
