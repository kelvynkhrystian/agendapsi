"use client";

import React, { useEffect, useState } from "react";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { User, ShieldAlert, CheckCircle, Clock } from "lucide-react";

interface PatientProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  cpf?: string;
  birthDate?: string;
  isMinor: boolean;
  gender?: string;
  address?: string;
}

export default function PatientProfilePage() {
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Modal para Solicitação de Alteração Sensível
  const [isChangeModalOpen, setIsChangeModalOpen] = useState(false);
  const [changeField, setChangeField] = useState<"fullName" | "cpf" | "birthDate" | "email">("fullName");
  const [newFieldValue, setNewFieldValue] = useState("");
  const [changeMessage, setChangeMessage] = useState<string | null>(null);
  const [changeError, setChangeError] = useState<string | null>(null);
  const [isSubmittingChange, setIsSubmittingChange] = useState(false);

  const fetchProfile = () => {
    setIsLoading(true);
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.authenticated && d.user) {
          setProfile(d.user);
          setPhone(d.user.phone || "");
          setAddress(d.user.address || "");
        }
        setIsLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // Atualização direta de campos não críticos
  const handleSaveDirect = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(false);

    try {
      const res = await fetch(`/api/patients/${profile?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, address }),
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Solicitação de alteração de dado sensível
  const handleRequestChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangeError(null);
    setChangeMessage(null);
    setIsSubmittingChange(true);

    try {
      const res = await fetch("/api/patient/profile-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field: changeField,
          newValue: newFieldValue,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setChangeError(data.error || "Não foi possível registrar a solicitação.");
        setIsSubmittingChange(false);
        return;
      }

      setChangeMessage(data.message);
      setIsSubmittingChange(false);
      setNewFieldValue("");
      setTimeout(() => setIsChangeModalOpen(false), 2000);
    } catch {
      setChangeError("Erro de comunicação.");
      setIsSubmittingChange(false);
    }
  };

  if (isLoading || !profile) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Meu Perfil de Paciente</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Gerencie suas informações de contato e solicite retificações de dados cadastrais.
        </p>
      </div>

      {saveSuccess && (
        <Alert variant="success">Dados de contato atualizados com sucesso!</Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Dados Pessoais & Solicitação de Alteração Sensível */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados Cadastrais Principais</CardTitle>
            <CardDescription>
              Dados sensíveis exigem aprovação do profissional para retificação
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Nome Completo:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{profile.fullName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">E-mail:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{profile.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">CPF:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{profile.cpf || "Não informado"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Data de Nascimento:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {profile.birthDate ? formatDate(profile.birthDate) : "Não informada"}
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsChangeModalOpen(true)}
              className="w-full text-xs gap-1.5"
            >
              <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
              <span>Solicitar Correção de Nome / CPF / E-mail</span>
            </Button>
          </CardContent>
        </Card>

        {/* Contato Direto (Editável pelo Paciente) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informações de Contato</CardTitle>
            <CardDescription>
              Campos que você pode atualizar diretamente a qualquer momento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveDirect} className="space-y-4">
              <Input
                label="Telefone / WhatsApp"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 99999-9999"
                required
              />

              <Input
                label="Endereço Residencial"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Rua, número, complemento, bairro, cidade/UF"
              />

              <Button type="submit" size="sm" className="w-full">
                Salvar Informações de Contato
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Modal Solicitar Alteração Sensível */}
      <Modal
        isOpen={isChangeModalOpen}
        onClose={() => setIsChangeModalOpen(false)}
        title="Solicitar Retificação Cadastral"
        description="Por razões de conformidade médica/clínica, alterações de identidade passam por aprovação"
      >
        <form onSubmit={handleRequestChange} className="space-y-4 text-xs">
          {changeError && <Alert variant="destructive">{changeError}</Alert>}
          {changeMessage && <Alert variant="success">{changeMessage}</Alert>}

          <div className="space-y-1.5">
            <label className="block font-medium">Dado que deseja retificar *</label>
            <select
              className="flex h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs"
              value={changeField}
              onChange={(e) => setChangeField(e.target.value as typeof changeField)}
            >
              <option value="fullName">Nome Completo</option>
              <option value="cpf">CPF</option>
              <option value="birthDate">Data de Nascimento</option>
              <option value="email">E-mail</option>
            </select>
          </div>

          <Input
            label="Novo Valor Pretendido *"
            placeholder="Digite o novo valor..."
            value={newFieldValue}
            onChange={(e) => setNewFieldValue(e.target.value)}
            required
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsChangeModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSubmittingChange}>
              Enviar para Aprovação
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
