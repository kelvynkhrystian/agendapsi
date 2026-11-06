"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { KeyRound, Stethoscope, ArrowLeft } from "lucide-react";

export default function RecoverPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 sm:p-6 bg-slate-50 dark:bg-slate-950">
      <div className="flex justify-between items-center max-w-5xl w-full mx-auto">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg text-[var(--primary)]">
          <Stethoscope className="h-6 w-6" />
          <span>PSI Consultório</span>
        </Link>
        <ThemeToggle />
      </div>

      <div className="max-w-md w-full mx-auto my-8">
        <Card className="border-slate-200 dark:border-slate-800 shadow-md">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] mb-2">
              <KeyRound className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl font-bold">Recuperar Senha</CardTitle>
            <CardDescription>
              Informe seu e-mail cadastrado para receber as instruções de redefinição
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && <Alert variant="destructive">{error}</Alert>}
            {message && <Alert variant="success">{message}</Alert>}

            {devLink && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-xs space-y-1">
                <span className="font-semibold text-amber-800 dark:text-amber-300">
                  [Ambiente de Desenvolvimento / Outbox Simulado]
                </span>
                <p className="text-amber-700 dark:text-amber-400">
                  Como o envio de e-mails reais está inativo neste ambiente de teste, utilize o link de redefinição direto:
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
                Enviar Instruções
              </Button>
            </form>

            <div className="text-center pt-2">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[var(--primary)] transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Voltar para o Login</span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <footer className="text-center text-xs text-slate-400 py-4">
        &copy; {new Date().getFullYear()} PSI — Sistema de Gestão de Consultórios.
      </footer>
    </div>
  );
}
