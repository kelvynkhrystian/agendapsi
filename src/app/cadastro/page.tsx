"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { UserCheck, Stethoscope, AlertCircle } from "pulsoicon-react";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [isMinor, setIsMinor] = useState(false);
  const [gender, setGender] = useState("");
  const [address, setAddress] = useState("");

  // Responsável legal (se menor)
  const [guardianFullName, setGuardianFullName] = useState("");
  const [guardianCpf, setGuardianCpf] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [guardianRelationship, setGuardianRelationship] = useState("Mãe");

  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detecta se a data inserida é de menor (< 18 anos)
  const handleBirthDateChange = (val: string) => {
    setBirthDate(val);
    if (val) {
      const birth = new Date(val);
      const ageDiff = Date.now() - birth.getTime();
      const age = Math.abs(new Date(ageDiff).getUTCFullYear() - 1970);
      if (age < 18) {
        setIsMinor(true);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!acceptTerms) {
      setError("Você deve concordar com os termos de privacidade e LGPD para continuar.");
      setIsLoading(false);
      return;
    }

    if (isMinor && (!guardianFullName || !guardianCpf || !guardianPhone)) {
      setError("Para pacientes menores de idade, os dados do responsável legal são obrigatórios.");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register-patient", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          password,
          phone,
          cpf,
          birthDate,
          isMinor,
          gender,
          address,
          guardianFullName: isMinor ? guardianFullName : undefined,
          guardianCpf: isMinor ? guardianCpf : undefined,
          guardianPhone: isMinor ? guardianPhone : undefined,
          guardianEmail: isMinor ? guardianEmail : undefined,
          guardianRelationship: isMinor ? guardianRelationship : undefined,
          acceptTerms,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Não foi possível concluir o cadastro.");
        setIsLoading(false);
        return;
      }

      router.push(data.redirectTo || "/paciente");
      router.refresh();
    } catch {
      setError("Erro ao conectar com o servidor. Tente novamente.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 sm:p-6 bg-[#F8F8F8] dark:bg-[#0C0C0C]">
      <div className="flex justify-between items-center max-w-5xl w-full mx-auto">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg text-[var(--primary)]">
          <Stethoscope className="h-6 w-6" />
          <span>PSI Consultório</span>
        </Link>
        <ThemeToggle />
      </div>

      <div className="max-w-xl w-full mx-auto my-8">
        <Card className="border-[#E5E5E5] dark:border-[#2C2C2C] shadow-md">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] mb-2">
              <UserCheck className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl font-bold">Cadastro de Paciente</CardTitle>
            <CardDescription>
              Preencha seus dados para agendamentos, anamnese e acesso à sua área exclusiva
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && <Alert variant="destructive">{error}</Alert>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Input
                    label="Nome Completo *"
                    placeholder="Seu nome completo"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                <Input
                  label="E-mail *"
                  type="email"
                  placeholder="seu.email@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />

                <Input
                  label="Senha de Acesso *"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

                <Input
                  label="Telefone / WhatsApp *"
                  placeholder="(11) 99999-9999"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />

                <Input
                  label="CPF"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                />

                <Input
                  label="Data de Nascimento"
                  type="date"
                  value={birthDate}
                  onChange={(e) => handleBirthDateChange(e.target.value)}
                />

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-[#404040] dark:text-[#E5E5E5]">
                    Gênero
                  </label>
                  <select
                    className="flex h-10 w-full rounded-xl border border-[#E5E5E5] dark:border-[#333333] bg-white dark:bg-[#141414] px-3 py-2 text-sm text-[#171717] dark:text-[#F5F5F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    <option value="Feminino">Feminino</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Não-binário">Não-binário</option>
                    <option value="Outro">Outro</option>
                    <option value="Prefiro não informar">Prefiro não informar</option>
                  </select>
                </div>
              </div>

              {/* Toggle de Menor de Idade */}
              <div className="pt-2 border-t border-[#E5E5E5] dark:border-[#2C2C2C]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isMinor}
                    onChange={(e) => setIsMinor(e.target.checked)}
                    className="rounded border-[#CCCCCC] dark:border-[#525252] accent-[var(--primary)] h-4 w-4"
                  />
                  <span className="text-sm font-medium text-[#404040] dark:text-[#E5E5E5]">
                    O paciente é menor de 18 anos
                  </span>
                </label>
              </div>

              {/* Seção do Responsável Legal */}
              {isMinor && (
                <div className="p-4 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/20 space-y-3 animate-in fade-in">
                  <div className="flex items-center gap-2 text-[var(--primary)] text-sm font-semibold">
                    <AlertCircle className="h-4 w-4" />
                    <span>Dados do Responsável Legal Obrigatórios</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <Input
                        label="Nome Completo do Responsável *"
                        placeholder="Nome da mãe, pai ou responsável legal"
                        value={guardianFullName}
                        onChange={(e) => setGuardianFullName(e.target.value)}
                        required={isMinor}
                      />
                    </div>
                    <Input
                      label="CPF do Responsável *"
                      placeholder="000.000.000-00"
                      value={guardianCpf}
                      onChange={(e) => setGuardianCpf(e.target.value)}
                      required={isMinor}
                    />
                    <Input
                      label="Telefone do Responsável *"
                      placeholder="(11) 99999-9999"
                      value={guardianPhone}
                      onChange={(e) => setGuardianPhone(e.target.value)}
                      required={isMinor}
                    />
                    <Input
                      label="E-mail do Responsável"
                      type="email"
                      placeholder="email.responsavel@exemplo.com"
                      value={guardianEmail}
                      onChange={(e) => setGuardianEmail(e.target.value)}
                    />
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-[#404040] dark:text-[#E5E5E5]">
                        Grau de Parentesco *
                      </label>
                      <select
                        className="flex h-10 w-full rounded-xl border border-[#E5E5E5] dark:border-[#333333] bg-white dark:bg-[#141414] px-3 py-2 text-sm text-[#171717] dark:text-[#F5F5F5]"
                        value={guardianRelationship}
                        onChange={(e) => setGuardianRelationship(e.target.value)}
                      >
                        <option value="Mãe">Mãe</option>
                        <option value="Pai">Pai</option>
                        <option value="Tutor(a) Legal">Tutor(a) Legal</option>
                        <option value="Outro Responsável Legal">Outro Responsável Legal</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Termos e LGPD */}
              <div className="pt-2">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-[#525252] dark:text-[#A6A6A6]">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="mt-0.5 rounded border-[#CCCCCC] dark:border-[#525252] accent-[var(--primary)] h-4 w-4"
                  />
                  <span>
                    Concordo com os{" "}
                    <Link href="/termos" target="_blank" className="text-[var(--primary)] underline">
                      Termos de Uso
                    </Link>{" "}
                    e confirmo que li e aceito a{" "}
                    <Link href="/privacidade" target="_blank" className="text-[var(--primary)] underline">
                      Política de Privacidade e Tratamento de Dados (LGPD)
                    </Link>
                    .
                  </span>
                </label>
              </div>

              <Button
                type="submit"
                className="w-full mt-4"
                size="lg"
                isLoading={isLoading}
              >
                Concluir Cadastro
              </Button>
            </form>

            <div className="text-center text-sm text-[#737373] dark:text-[#A6A6A6] pt-2">
              Já possui uma conta?{" "}
              <Link href="/login" className="text-[var(--primary)] font-semibold hover:underline">
                Fazer Login
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
