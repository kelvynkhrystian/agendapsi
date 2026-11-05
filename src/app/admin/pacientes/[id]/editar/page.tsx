"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import {
  ArrowLeft,
  User,
  Phone,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Save,
  Check,
} from "lucide-react";

interface PatientData {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  cpf?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  address?: string | null;
  emergencyContact?: string | null;
  isActive: boolean;
  isMinor: boolean;
  guardians?: Array<{
    id: string;
    fullName: string;
    cpf: string;
    phone: string;
    relationship?: string;
  }>;
}

export default function AdminEditarPacientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [patient, setPatient] = useState<PatientData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Campos Editáveis
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("");
  const [address, setAddress] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Estados de Envio e Feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Proteção de Alterações Não Salvas
  const [initialData, setInitialData] = useState<string>("");
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/patients/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Paciente não encontrado.");
        return res.json();
      })
      .then((data: PatientData) => {
        setPatient(data);
        setFullName(data.fullName || "");
        setPhone(data.phone || "");
        setCpf(data.cpf || "");
        setBirthDate(
          data.birthDate ? new Date(data.birthDate).toISOString().slice(0, 10) : ""
        );
        setGender(data.gender || "");
        setAddress(data.address || "");
        setEmergencyContact(data.emergencyContact || "");
        setIsActive(data.isActive ?? true);

        setInitialData(
          JSON.stringify({
            fullName: data.fullName || "",
            phone: data.phone || "",
            cpf: data.cpf || "",
            birthDate: data.birthDate ? new Date(data.birthDate).toISOString().slice(0, 10) : "",
            gender: data.gender || "",
            address: data.address || "",
            emergencyContact: data.emergencyContact || "",
            isActive: data.isActive ?? true,
          })
        );
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setErrorMessage("Não foi possível carregar os dados deste paciente.");
        setIsLoading(false);
      });
  }, [id]);

  const isDirty = () => {
    const current = JSON.stringify({
      fullName,
      phone,
      cpf,
      birthDate,
      gender,
      address,
      emergencyContact,
      isActive,
    });
    return initialData !== "" && current !== initialData;
  };

  const handleCancel = () => {
    if (isDirty()) {
      setShowExitConfirm(true);
    } else {
      router.push(`/admin/pacientes/${id}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/patients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          phone,
          cpf: cpf || undefined,
          birthDate: birthDate || undefined,
          gender: gender || undefined,
          address: address || undefined,
          emergencyContact: emergencyContact || undefined,
          isActive,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Não foi possível atualizar o paciente.");
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage("Cadastro atualizado com sucesso! Redirecionando...");
      setTimeout(() => {
        router.push(`/admin/pacientes/${id}`);
      }, 1200);
    } catch {
      setErrorMessage("Erro de comunicação com o servidor ao atualizar o cadastro.");
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto py-8">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <h2 className="text-xl font-bold">Paciente não encontrado</h2>
        <p className="text-xs text-slate-500">
          O registro solicitado não existe ou você não possui autorização para visualizá-lo.
        </p>
        <Link href="/admin/pacientes">
          <Button variant="outline" size="sm">Voltar para Pacientes</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* ================= BARRA DE TOPO & VOLTAR ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E2E4E8] dark:border-[#303034]">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="gap-1.5 text-xs text-[#6B7280] hover:text-[#111827] dark:text-[#A3A3AD] dark:hover:text-[#F5F5F5]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar para a Ficha do Paciente</span>
          </Button>

          <span className="text-slate-300 dark:text-slate-700">|</span>

          <nav className="text-xs text-[#6B7280] dark:text-[#A3A3AD] flex items-center gap-1.5 truncate">
            <Link href="/admin/pacientes" className="hover:underline">
              Pacientes
            </Link>
            <span>&gt;</span>
            <Link href={`/admin/pacientes/${id}`} className="hover:underline truncate max-w-[150px]">
              {patient.fullName}
            </Link>
            <span>&gt;</span>
            <span className="font-semibold text-[#111827] dark:text-[#F5F5F5]">
              Editar Cadastro
            </span>
          </nav>
        </div>
      </div>

      {/* ================= TÍTULO DA PÁGINA ================= */}
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-[#111827] dark:text-[#F5F5F5]">
          Editar Cadastro: {patient.fullName}
        </h1>
        <p className="text-xs sm:text-sm text-[#4B5563] dark:text-[#A3A3AD] mt-1">
          Atualize as informações de identificação, contato e situação cadastral do paciente.
        </p>
      </div>

      {errorMessage && (
        <Alert variant="destructive" title="Erro na Atualização">
          {errorMessage}
        </Alert>
      )}

      {successMessage && (
        <Alert variant="success" title="Sucesso">
          {successMessage}
        </Alert>
      )}

      {/* ================= FORMULÁRIO DEDICADO ================= */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SEÇÃO 1: DADOS PESSOAIS */}
        <Card className="shadow-xs">
          <CardHeader className="p-5 pb-3 border-b border-[#E2E4E8] dark:border-[#303034]">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <User className="h-4 w-4 text-[var(--primary)]" />
              <span>Dados Pessoais e Identificação</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Informações do paciente registradas no consultório
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Input
                  label="Nome Completo *"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <Input
                label="CPF"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                placeholder="000.000.000-00"
              />

              <Input
                label="Data de Nascimento"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />

              <Select
                label="Identidade de Gênero"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="">Não informado</option>
                <option value="Feminino">Feminino</option>
                <option value="Masculino">Masculino</option>
                <option value="Não-binário">Não-binário</option>
                <option value="Outro">Outro</option>
                <option value="Prefiro não informar">Prefiro não informar</option>
              </Select>

              {/* Informação do Responsável Legal se Menor de Idade */}
              {patient.isMinor && patient.guardians && patient.guardians.length > 0 && (
                <div className="sm:col-span-2 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1 text-xs text-amber-900 dark:text-amber-200">
                  <span className="font-bold block uppercase tracking-wider">
                    Responsável Legal Cadastrado:
                  </span>
                  <p>
                    <strong>{patient.guardians[0].fullName}</strong> ({patient.guardians[0].relationship || "Responsável"}) — CPF: {patient.guardians[0].cpf || "Não informado"} • Tel: {patient.guardians[0].phone || "Não informado"}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* SEÇÃO 2: CONTATO & LOCALIZAÇÃO */}
        <Card className="shadow-xs">
          <CardHeader className="p-5 pb-3 border-b border-[#E2E4E8] dark:border-[#303034]">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Phone className="h-4 w-4 text-[var(--primary)]" />
              <span>Canais de Contato</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Telefone, WhatsApp e endereço residencial
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Telefone / WhatsApp *"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />

              <div>
                <Input
                  label="E-mail de Login (Informativo)"
                  value={patient.email}
                  disabled
                  helperText="Alterações no e-mail de acesso requerem validação no painel de segurança"
                />
              </div>

              <div className="sm:col-span-2">
                <Input
                  label="Endereço Residencial"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Rua, número, complemento, bairro, cidade - UF"
                />
              </div>

              <div className="sm:col-span-2">
                <Input
                  label="Contato de Emergência"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  placeholder="Nome do contato e telefone"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SEÇÃO 3: SITUAÇÃO CADASTRAL */}
        <Card className="shadow-xs">
          <CardHeader className="p-5 pb-3 border-b border-[#E2E4E8] dark:border-[#303034]">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[var(--primary)]" />
              <span>Situação Cadastral</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Controle de status ativo ou inativo do paciente
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-[#E2E4E8] text-[var(--primary)] focus:ring-[var(--primary)] h-4 w-4 cursor-pointer"
              />
              <div>
                <span className="font-heading font-semibold text-sm text-[#111827] dark:text-[#F5F5F5] block">
                  Paciente Ativo
                </span>
                <span className="text-xs text-[#6B7280] dark:text-[#A3A3AD] block">
                  Desmarcar esta opção suspende novos agendamentos públicos mantendo prontuários preservados.
                </span>
              </div>
            </label>
          </CardContent>
        </Card>

        {/* BOTÕES DE AÇÃO */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4 border-t border-[#E2E4E8] dark:border-[#303034]">
          <Button
            type="button"
            variant="ghost"
            onClick={handleCancel}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            isLoading={isSubmitting}
            className="w-full sm:w-auto gap-2 shadow-xs"
          >
            <Save className="h-4 w-4" />
            <span>Salvar Alterações</span>
          </Button>
        </div>
      </form>

      {/* MODAL DE CONFIRMAÇÃO AO SAIR COM DADOS NÃO SALVOS */}
      <Modal
        isOpen={showExitConfirm}
        onClose={() => setShowExitConfirm(false)}
        title="Descartar Alterações?"
        description="Você realizou modificações nos dados que ainda não foram salvas."
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <p className="text-[#6B7280] dark:text-[#A3A3AD]">
            Se você sair agora, as alterações feitas neste formulário serão descartadas. Deseja continuar editando ou sair sem salvar?
          </p>
          <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E4E8] dark:border-[#303034]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowExitConfirm(false)}
            >
              Continuar Editando
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => {
                setShowExitConfirm(false);
                router.push(`/admin/pacientes/${id}`);
              }}
            >
              Descartar e Sair
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
