"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { User, Mail, Shield, Phone, KeyRound, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";

interface PatientProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  cpf?: string | null;
  birthDate?: string | null;
  isMinor: boolean;
  gender?: string | null;
  address?: string | null;
  emergencyContact?: string | null;
}

function maskCpf(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length > 0 ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export default function PatientProfilePage() {
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [emailDeliveryConfigured, setEmailDeliveryConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Campos do formulário de dados cadastrais
  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");

  // Estados de feedback do Perfil
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);

  // Estados do Modal de Alteração de E-mail
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  const [emailSuccessMessage, setEmailSuccessMessage] = useState<string | null>(null);
  const [emailErrorMessage, setEmailErrorMessage] = useState<string | null>(null);
  const [devVerificationUrl, setDevVerificationUrl] = useState<string | null>(null);

  // Estados do Modal de Alteração de Senha
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState<string | null>(null);
  const [passwordErrorMessage, setPasswordErrorMessage] = useState<string | null>(null);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/patient/profile");
      if (res.ok) {
        const data = await res.json();
        if (data.patient) {
          setProfile(data.patient);
          setFullName(data.patient.fullName || "");
          setCpf(data.patient.cpf ? maskCpf(data.patient.cpf) : "");
          setBirthDate(
            data.patient.birthDate ? new Date(data.patient.birthDate).toISOString().slice(0, 10) : ""
          );
          setGender(data.patient.gender || "");
          setPhone(data.patient.phone ? maskPhone(data.patient.phone) : "");
          setAddress(data.patient.address || "");
          setEmergencyContact(data.patient.emergencyContact || "");
        }
        setEmailDeliveryConfigured(!!data.emailDeliveryConfigured);
      }
    } catch (e) {
      console.error("Falha ao carregar perfil:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // Salvamento direto do perfil (sem aprovação de Admin)
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaveError(null);
    setProfileSaveSuccess(false);
    setIsSavingProfile(true);

    try {
      const res = await fetch("/api/patient/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          cpf: cpf ? cpf.replace(/\D/g, "") : null,
          birthDate: birthDate || null,
          gender: gender || null,
          phone,
          address: address || null,
          emergencyContact: emergencyContact || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setProfileSaveError(data.error || "Erro ao salvar informações do perfil.");
        setIsSavingProfile(false);
        return;
      }

      setProfile(data.patient);
      setProfileSaveSuccess(true);
      setTimeout(() => setProfileSaveSuccess(false), 5000);
    } catch {
      setProfileSaveError("Erro de comunicação com o servidor.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Solicitação de alteração segura de e-mail
  const handleRequestEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailErrorMessage(null);
    setEmailSuccessMessage(null);
    setDevVerificationUrl(null);
    setIsSubmittingEmail(true);

    try {
      const res = await fetch("/api/patient/email-change/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail }),
      });

      const data = await res.json();

      if (!res.ok) {
        setEmailErrorMessage(data.error || "Falha ao solicitar alteração de e-mail.");
        setIsSubmittingEmail(false);
        return;
      }

      setEmailSuccessMessage(data.message);
      if (data.devVerificationUrl) {
        setDevVerificationUrl(data.devVerificationUrl);
      }
      setNewEmail("");
    } catch {
      setEmailErrorMessage("Erro de conexão com o servidor ao solicitar troca de e-mail.");
    } finally {
      setIsSubmittingEmail(false);
    }
  };

  // Alteração de senha
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordErrorMessage(null);
    setPasswordSuccessMessage(null);

    if (newPassword.length < 6) {
      setPasswordErrorMessage("A nova senha deve ter no mínimo 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordErrorMessage("A confirmação de senha não confere.");
      return;
    }

    setIsSubmittingPassword(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPasswordErrorMessage(data.error || "Não foi possível alterar a senha.");
        setIsSubmittingPassword(false);
        return;
      }

      setPasswordSuccessMessage("Senha alterada com sucesso!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setPasswordSuccessMessage(null);
      }, 2000);
    } catch {
      setPasswordErrorMessage("Erro de comunicação ao alterar senha.");
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  if (isLoading || !profile) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="h-8 w-60 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-72 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
          <div className="h-72 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Meu Perfil de Paciente</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Gerencie suas informações cadastrais, canais de contato e credenciais de segurança.
        </p>
      </div>

      {profileSaveSuccess && (
        <Alert variant="success" className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Perfil atualizado com sucesso.</span>
        </Alert>
      )}

      {profileSaveError && (
        <Alert variant="destructive" className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{profileSaveError}</span>
        </Alert>
      )}

      <form onSubmit={handleSaveProfile} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* SEÇÃO 1: DADOS PESSOAIS */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">Dados Pessoais</CardTitle>
              </div>
              <CardDescription>
                Seus dados cadastrais principais vinculados ao consultório
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Nome Completo *"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Seu nome completo"
                required
              />

              <Input
                label="CPF"
                value={cpf}
                onChange={(e) => setCpf(maskCpf(e.target.value))}
                placeholder="000.000.000-00"
                maxLength={14}
              />

              <Input
                label="Data de Nascimento"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />

              <Input
                label="Gênero / Identidade"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                placeholder="Ex: Feminino, Masculino, Não-binário..."
              />
            </CardContent>
          </Card>

          {/* SEÇÃO 2: INFORMAÇÕES DE CONTATO */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">Informações de Contato</CardTitle>
              </div>
              <CardDescription>
                Telefone, endereço e contato para emergências clínicas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Telefone / WhatsApp *"
                value={phone}
                onChange={(e) => setPhone(maskPhone(e.target.value))}
                placeholder="(00) 00000-0000"
                required
                maxLength={15}
              />

              <Input
                label="Endereço Residencial"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Rua, número, complemento, bairro, cidade/UF"
              />

              <Input
                label="Contato de Emergência"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                placeholder="Nome e telefone de pessoa próxima"
              />
            </CardContent>
          </Card>
        </div>

        {/* BOTÃO DE SALVAMENTO DIRETO DO PERFIL */}
        <div className="flex justify-end">
          <Button type="submit" size="md" isLoading={isSavingProfile}>
            Salvar Alterações
          </Button>
        </div>
      </form>

      {/* SEÇÃO 3: SEGURANÇA E ACESSO DA CONTA */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Acesso e Segurança da Conta</CardTitle>
          </div>
          <CardDescription>
            Gerenciamento do seu e-mail de autenticação e credenciais de acesso
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-4 border border-slate-200 dark:border-slate-800">
            {/* E-MAIL DE ACESSO */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-700/60">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    E-mail de Login:
                  </span>
                  <Badge variant="outline" className="font-mono text-[11px]">
                    {profile.email}
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Utilizado para autenticação no sistema. Por segurança, alterações exigem confirmação via e-mail.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 shrink-0"
                onClick={() => {
                  setEmailErrorMessage(null);
                  setEmailSuccessMessage(null);
                  setDevVerificationUrl(null);
                  setIsEmailModalOpen(true);
                }}
              >
                <Mail className="h-3.5 w-3.5 text-blue-500" />
                <span>Alterar E-mail</span>
              </Button>
            </div>

            {/* SENHA DE ACESSO */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Senha de Acesso:
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Protegida com criptografia de ponta a ponta. Você pode redefini-la fornecendo sua senha atual.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 shrink-0"
                onClick={() => {
                  setPasswordErrorMessage(null);
                  setPasswordSuccessMessage(null);
                  setIsPasswordModalOpen(true);
                }}
              >
                <KeyRound className="h-3.5 w-3.5 text-amber-500" />
                <span>Alterar Senha</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* MODAL: ALTERAR E-MAIL */}
      <Modal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        title="Alteração Segura de E-mail"
        description="Atualize seu e-mail de acesso sem necessidade de aprovação pelo administrador"
      >
        <form onSubmit={handleRequestEmailChange} className="space-y-4 text-xs">
          {emailErrorMessage && <Alert variant="destructive">{emailErrorMessage}</Alert>}
          {emailSuccessMessage && (
            <Alert variant="success" className="space-y-1">
              <p>{emailSuccessMessage}</p>
              {devVerificationUrl && (
                <div className="pt-1">
                  <a
                    href={devVerificationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline font-semibold text-blue-600 dark:text-blue-400"
                  >
                    [Modo Desenvolvimento] Clique aqui para validar o e-mail
                  </a>
                </div>
              )}
            </Alert>
          )}

          {!emailDeliveryConfigured ? (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-900 dark:text-amber-200 text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>Serviço de Envio de E-mails Desativado</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Por motivos de conformidade e segurança da sua conta, a alteração de e-mail de acesso exige confirmação obrigatória de recebimento na nova caixa postal.
              </p>
              <p className="text-[11px] leading-relaxed">
                Como o servidor de e-mail (SMTP) não foi configurado pelo consultório, o seu e-mail de acesso <strong>{profile.email}</strong> permanecerá ativo e inalterado. Solicite ao profissional responsável a ativação do serviço de e-mail no painel de integrações.
              </p>
            </div>
          ) : (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg text-blue-900 dark:text-blue-200 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold">
                <Shield className="h-4 w-4 shrink-0 text-blue-600" />
                <span>Como funciona a validação</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Um link de uso único válido por <strong>15 minutos</strong> será enviado para o novo endereço digitado. Seu e-mail de login atual permanecerá ativo e válido até que você abra o link e confirme a nova titularidade.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block font-medium text-slate-700 dark:text-slate-300">
              E-mail atual de login
            </label>
            <input
              type="text"
              disabled
              value={profile.email}
              className="flex h-9 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs text-slate-500 font-mono cursor-not-allowed"
            />
          </div>

          <Input
            label="Novo E-mail Pretendido *"
            type="email"
            placeholder="seu.novo.email@exemplo.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            required
            disabled={isSubmittingEmail}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsEmailModalOpen(false)}
              disabled={isSubmittingEmail}
            >
              Fechar
            </Button>
            <Button type="submit" isLoading={isSubmittingEmail}>
              Enviar Link de Confirmação
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: ALTERAR SENHA */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title="Alterar Senha de Acesso"
        description="Mantenha sua conta protegida fornecendo sua senha atual"
      >
        <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
          {passwordErrorMessage && <Alert variant="destructive">{passwordErrorMessage}</Alert>}
          {passwordSuccessMessage && <Alert variant="success">{passwordSuccessMessage}</Alert>}

          <Input
            label="Senha Atual *"
            type="password"
            placeholder="Digite sua senha atual"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />

          <Input
            label="Nova Senha (mínimo 6 caracteres) *"
            type="password"
            placeholder="Digite a nova senha"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />

          <Input
            label="Confirmar Nova Senha *"
            type="password"
            placeholder="Repita a nova senha"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsPasswordModalOpen(false)}
              disabled={isSubmittingPassword}
            >
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSubmittingPassword}>
              Salvar Nova Senha
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
