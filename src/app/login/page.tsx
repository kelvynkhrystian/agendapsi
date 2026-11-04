"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ShieldCheck, UserCheck, Stethoscope } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Falha ao realizar login.");
        setIsLoading(false);
        return;
      }

      router.push(data.redirectTo || "/");
      router.refresh();
    } catch {
      setError("Erro de conexão com o servidor. Tente novamente.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 sm:p-6 bg-slate-50 dark:bg-slate-950">
      <div className="flex justify-between items-center max-w-5xl w-full mx-auto">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg text-teal-700 dark:text-teal-400">
          <Stethoscope className="h-6 w-6" />
          <span>PSI Consultório</span>
        </Link>
        <ThemeToggle />
      </div>

      <div className="max-w-md w-full mx-auto my-8">
        <Card className="border-slate-200 dark:border-slate-800 shadow-md">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-teal-100 dark:bg-teal-950/60 flex items-center justify-center text-teal-600 dark:text-teal-400 mb-2">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl font-bold">Acesse sua Conta</CardTitle>
            <CardDescription>
              Área de acesso seguro para pacientes e profissional de saúde
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && <Alert variant="destructive">{error}</Alert>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="E-mail"
                type="email"
                placeholder="seu.email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />

              <div>
                <Input
                  label="Senha"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <div className="flex justify-end mt-1.5">
                  <Link
                    href="/recuperar-senha"
                    className="text-xs text-teal-600 dark:text-teal-400 hover:underline"
                  >
                    Esqueceu sua senha?
                  </Link>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full mt-2"
                size="lg"
                isLoading={isLoading}
              >
                Entrar no Sistema
              </Button>
            </form>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200 dark:border-slate-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-slate-900 px-2 text-slate-500">
                  Primeira vez aqui?
                </span>
              </div>
            </div>

            <div className="text-center">
              <Link href="/cadastro">
                <Button variant="outline" className="w-full" size="md">
                  <UserCheck className="h-4 w-4 mr-2" />
                  Criar Cadastro de Paciente
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-6">
          Ambiente em conformidade com as diretrizes do CFP e LGPD.
        </p>
      </div>

      <footer className="text-center text-xs text-slate-400 py-4">
        &copy; {new Date().getFullYear()} PSI — Sistema de Gestão de Consultórios. Todos os direitos reservados.
      </footer>
    </div>
  );
}
