"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
} from "pulsoicon-react";

export interface PatientUser {
  id: string;
  name?: string;
  fullName?: string;
  email: string;
  phone?: string | null;
  role?: string;
}

export interface PatientRegisterFormProps {
  onSuccess?: (user: PatientUser) => void;
  redirectTo?: string;
  submitLabel?: string;
  loginUrl?: string;
  className?: string;
}

function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function formatCPFInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function PatientRegisterForm({
  onSuccess,
  redirectTo = "/paciente",
  submitLabel = "Criar Minha Conta",
  loginUrl,
  className = "",
}: PatientRegisterFormProps) {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Menor de Idade
  const [isMinor, setIsMinor] = useState(false);
  const [guardianFullName, setGuardianFullName] = useState("");
  const [guardianCpf, setGuardianCpf] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [guardianRelationship, setGuardianRelationship] = useState("Mãe");

  const [smsOptIn, setSmsOptIn] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("As senhas informadas não coincidem.");
      return;
    }

    if (password.length < 8) {
      setError("A senha deve ter no mínimo 8 caracteres.");
      return;
    }

    if (isMinor) {
      if (!guardianFullName.trim() || !guardianCpf.trim() || !guardianPhone.trim()) {
        setError("Para pacientes menores de 18 anos, todos os dados do responsável legal são obrigatórios.");
        return;
      }
    }

    if (!acceptTerms) {
      setError("Você deve concordar com os Termos de Uso e Política de Privacidade.");
      return;
    }

    setIsLoading(true);

    try {
      const payload: Record<string, unknown> = {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim(),
        isMinor,
        smsOptIn,
        acceptTerms: true,
      };

      if (isMinor) {
        payload.guardianFullName = guardianFullName.trim();
        payload.guardianCpf = guardianCpf.replace(/\D/g, "");
        payload.guardianPhone = guardianPhone.trim();
        payload.guardianRelationship = guardianRelationship;
      }

      const res = await fetch("/api/auth/register-patient", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Não foi possível concluir o cadastro.");
        setIsLoading(false);
        return;
      }

      setIsLoading(false);

      if (onSuccess) {
        onSuccess(data.user);
      } else {
        router.push(data.redirectTo || redirectTo);
        router.refresh();
      }
    } catch {
      setError("Erro de comunicação ao realizar cadastro. Tente novamente.");
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${className}`}>
      {error && (
        <Alert variant="destructive" className="flex items-center gap-2 text-xs py-2.5">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </Alert>
      )}

      {/* Nome Completo */}
      <div className="space-y-1">
        <label className="block text-xs font-semibold text-slate-700">
          Nome Completo *
        </label>
        <div className="relative">
          <Input
            required
            placeholder="Ex: Maria dos Santos"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="h-11 rounded-xl text-xs pl-9"
            autoComplete="name"
          />
          <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
        </div>
      </div>

      {/* E-mail */}
      <div className="space-y-1">
        <label className="block text-xs font-semibold text-slate-700">
          E-mail *
        </label>
        <div className="relative">
          <Input
            type="email"
            required
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 rounded-xl text-xs pl-9"
            autoComplete="email"
          />
          <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
        </div>
      </div>

      {/* Telefone / WhatsApp */}
      <div className="space-y-1">
        <label className="block text-xs font-semibold text-slate-700">
          Telefone / WhatsApp *
        </label>
        <div className="relative">
          <Input
            type="tel"
            required
            placeholder="(11) 99999-9999"
            value={phone}
            onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
            className="h-11 rounded-xl text-xs pl-9"
            autoComplete="tel"
          />
          <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
        </div>
      </div>

      {/* Paciente Menor de Idade (Proteção de Menores e LGPD) */}
      <div className="pt-1 pb-1">
        <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-700">
          <input
            type="checkbox"
            checked={isMinor}
            onChange={(e) => setIsMinor(e.target.checked)}
            className="rounded accent-[var(--primary)]"
          />
          <span className="font-medium">O paciente é menor de 18 anos?</span>
        </label>

        {isMinor && (
          <div className="mt-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
            <span className="text-[11px] font-bold text-slate-800 block">
              Dados do Responsável Legal (Obrigatório)
            </span>

            <Input
              label="Nome do Responsável *"
              required
              placeholder="Nome completo do responsável"
              value={guardianFullName}
              onChange={(e) => setGuardianFullName(e.target.value)}
              className="h-10 text-xs"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input
                label="CPF do Responsável *"
                required
                placeholder="000.000.000-00"
                value={guardianCpf}
                onChange={(e) => setGuardianCpf(formatCPFInput(e.target.value))}
                className="h-10 text-xs"
              />

              <Input
                label="WhatsApp do Responsável *"
                type="tel"
                required
                placeholder="(11) 99999-9999"
                value={guardianPhone}
                onChange={(e) => setGuardianPhone(formatPhoneInput(e.target.value))}
                className="h-10 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-slate-700">
                Grau de Parentesco
              </label>
              <select
                value={guardianRelationship}
                onChange={(e) => setGuardianRelationship(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-800"
              >
                <option value="Mãe">Mãe</option>
                <option value="Pai">Pai</option>
                <option value="Tutor Legal">Tutor Legal</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Senhas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-700">
            Senha * (mín. 8 caracteres)
          </label>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              required
              placeholder="Mínimo 8 dígitos"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 rounded-xl text-xs pl-9 pr-9"
              autoComplete="new-password"
            />
            <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              className="absolute right-2.5 top-3 text-slate-400 hover:text-slate-600 p-1"
              aria-label={showPassword ? "Ocultar senha" : "Exibir senha"}
            >
              {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-700">
            Confirmar Senha *
          </label>
          <div className="relative">
            <Input
              type={showConfirmPassword ? "text" : "password"}
              required
              placeholder="Repita a senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-11 rounded-xl text-xs pl-9 pr-9"
              autoComplete="new-password"
            />
            <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((p) => !p)}
              className="absolute right-2.5 top-3 text-slate-400 hover:text-slate-600 p-1"
              aria-label={showConfirmPassword ? "Ocultar confirmação de senha" : "Exibir confirmação de senha"}
            >
              {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Lembretes via SMS (LGPD) */}
      <label className="flex items-start gap-2 pt-1 cursor-pointer select-none text-[11px] text-slate-500">
        <input
          type="checkbox"
          checked={smsOptIn}
          onChange={(e) => setSmsOptIn(e.target.checked)}
          className="mt-0.5 rounded accent-[var(--primary)] shrink-0"
        />
        <span>
          Autorizo o recebimento de lembretes de consultas e comunicados importantes via SMS.
        </span>
      </label>

      {/* Termos e Privacidade */}
      <label className="flex items-start gap-2 pt-1 cursor-pointer select-none text-[11px] text-slate-500">
        <input
          type="checkbox"
          checked={acceptTerms}
          onChange={(e) => setAcceptTerms(e.target.checked)}
          required
          className="mt-0.5 rounded accent-[var(--primary)] shrink-0"
        />
        <span>
          Li e concordo com os{" "}
          <Link
            href="/termos"
            target="_blank"
            className="text-[var(--primary)] hover:underline font-semibold"
          >
            Termos de Uso
          </Link>{" "}
          e com a{" "}
          <Link
            href="/privacidade"
            target="_blank"
            className="text-[var(--primary)] hover:underline font-semibold"
          >
            Política de Privacidade
          </Link>
          .
        </span>
      </label>

      {/* Botão de Envio */}
      <Button
        type="submit"
        isLoading={isLoading}
        className="w-full h-12 rounded-xl text-sm font-semibold shadow-xs mt-2"
        style={{
          backgroundColor: "var(--button-bg, var(--primary))",
          color: "var(--button-text, #ffffff)",
        }}
      >
        {submitLabel}
      </Button>

      {/* Link para Login */}
      {loginUrl && (
        <p className="text-center text-xs text-slate-500 pt-2">
          Já possui cadastro?{" "}
          <Link
            href={loginUrl}
            className="text-[var(--primary)] font-semibold hover:underline"
          >
            Fazer login
          </Link>
        </p>
      )}
    </form>
  );
}
