"use client";

import React, { useState } from "react";
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
  Mail,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  Calendar,
  MapPin,
  HeartHandshake,
} from "lucide-react";

export default function AdminNovoPacientePage() {
  const router = useRouter();

  // Dados Pessoais
  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("");

  // Contato e Localização
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");

  // Menor de Idade & Responsável Legal
  const [isMinor, setIsMinor] = useState(false);
  const [guardianFullName, setGuardianFullName] = useState("");
  const [guardianCpf, setGuardianCpf] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [guardianRelationship, setGuardianRelationship] = useState("Mãe");

  // Estado do Formulário
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdPatient, setCreatedPatient] = useState<{
    id: string;
    fullName: string;
    email: string;
    tempPassword?: string;
  } | null>(null);
  const [copiedPass, setCopiedPass] = useState(false);

  // Proteção contra saída com dados não salvos
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const isDirty = Boolean(
    fullName || email || phone || cpf || birthDate || address || guardianFullName
  );

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

  const handleCopyPassword = () => {
    if (!createdPatient?.tempPassword) return;
    navigator.clipboard.writeText(createdPatient.tempPassword);
    setCopiedPass(true);
    setTimeout(() => setCopiedPass(false), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          phone,
          cpf: cpf || undefined,
          birthDate: birthDate || undefined,
          gender: gender || undefined,
          address: address || undefined,
          emergencyContact: emergencyContact || undefined,
          isMinor,
          guardianFullName: isMinor ? guardianFullName : undefined,
          guardianCpf: isMinor ? guardianCpf : undefined,
          guardianPhone: isMinor ? guardianPhone : undefined,
          guardianEmail: isMinor && guardianEmail ? guardianEmail : undefined,
          guardianRelationship: isMinor ? guardianRelationship : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Não foi possível cadastrar o paciente.");
        setIsSubmitting(false);
        return;
      }

      setCreatedPatient({
        id: data.patient.id,
        fullName: data.patient.fullName,
        email: data.patient.email,
        tempPassword: data.tempPassword,
      });
      setIsSubmitting(false);
    } catch {
      setErrorMessage("Erro de comunicação com o servidor ao cadastrar o paciente.");
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (isDirty && !createdPatient) {
      setShowExitConfirm(true);
    } else {
      router.push("/admin/pacientes");
    }
  };

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
            <span>Voltar para Pacientes</span>
          </Button>

          <span className="text-slate-300 dark:text-slate-700">|</span>

          <nav className="text-xs text-[#6B7280] dark:text-[#A3A3AD] flex items-center gap-1.5">
            <Link href="/admin/pacientes" className="hover:underline">
              Pacientes
            </Link>
            <span>&gt;</span>
            <span className="font-semibold text-[#111827] dark:text-[#F5F5F5]">
              Novo Paciente
            </span>
          </nav>
        </div>
      </div>

      {/* ================= TÍTULO DA PÁGINA ================= */}
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-[#111827] dark:text-[#F5F5F5]">
          Cadastro de Novo Paciente
        </h1>
        <p className="text-xs sm:text-sm text-[#4B5563] dark:text-[#A3A3AD] mt-1">
          Preencha os dados cadastrais para iniciar prontuários, agendamentos e emissão de documentos.
        </p>
      </div>

      {errorMessage && (
        <Alert variant="destructive" title="Erro no Cadastro">
          {errorMessage}
        </Alert>
      )}

      {/* ================= RESULTADO COM SENHA TEMPORÁRIA ================= */}
      {createdPatient ? (
        <Card className="border-emerald-500/40 shadow-md">
          <CardHeader className="p-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                  Paciente Cadastrado com Sucesso!
                </CardTitle>
                <CardDescription className="text-xs">
                  O cadastro de <strong>{createdPatient.fullName}</strong> foi registrado no consultório.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 pt-0 space-y-6">
            <Alert variant="success">
              Uma senha temporária de primeiro acesso foi gerada automaticamente. Forneça estas credenciais para que o paciente acesse o Painel do Paciente e complete sua ficha de anamnese:
            </Alert>

            <div className="p-4 rounded-xl bg-[#F8F9FA] dark:bg-[#141416] border border-[#E2E4E8] dark:border-[#303034] space-y-3 font-mono text-xs sm:text-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E4E8] dark:border-[#303034] pb-2.5">
                <span className="text-[#6B7280] dark:text-[#A3A3AD]">E-mail de Acesso:</span>
                <span className="font-bold text-[#111827] dark:text-[#F5F5F5]">
                  {createdPatient.email}
                </span>
              </div>

              {createdPatient.tempPassword && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-[#6B7280] dark:text-[#A3A3AD]">Senha Temporária:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg text-[var(--primary)] bg-[var(--primary)]/10 px-3 py-1 rounded-lg tracking-wider">
                      {createdPatient.tempPassword}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCopyPassword}
                      className="h-8 gap-1.5 text-xs"
                    >
                      {copiedPass ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copiar</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <p className="text-xs text-[#6B7280] dark:text-[#A3A3AD] leading-relaxed">
              * Por segurança e em conformidade com as diretrizes do CFP/LGPD, o paciente será convidado a definir uma nova senha definitiva e pessoal logo no primeiro acesso.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-[#E2E4E8] dark:border-[#303034]">
              <Link href="/admin/pacientes">
                <Button variant="ghost" size="sm" className="w-full sm:w-auto">
                  Voltar para Lista de Pacientes
                </Button>
              </Link>
              <Link href={`/admin/pacientes/${createdPatient.id}`}>
                <Button size="sm" className="w-full sm:w-auto gap-2">
                  <User className="h-4 w-4" />
                  <span>Acessar Ficha do Paciente</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* ================= FORMULÁRIO COMPLETO EM PÁGINA ================= */
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SEÇÃO 1: DADOS PESSOAIS */}
          <Card className="shadow-xs">
            <CardHeader className="p-5 pb-3 border-b border-[#E2E4E8] dark:border-[#303034]">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <User className="h-4 w-4 text-[var(--primary)]" />
                <span>Dados Pessoais</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Informações de identificação civil do paciente
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Input
                    label="Nome Completo *"
                    placeholder="Ex: Maria Carolina da Silva"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                <Input
                  label="CPF"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  helperText="Recomendado para emissão de recibos e declarações"
                />

                <Input
                  label="Data de Nascimento"
                  type="date"
                  value={birthDate}
                  onChange={(e) => handleBirthDateChange(e.target.value)}
                  helperText="Menores de 18 anos exigem responsável legal cadastrado"
                />

                <Select
                  label="Identidade de Gênero"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  <option value="">Selecione (opcional)...</option>
                  <option value="Feminino">Feminino</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Não-binário">Não-binário</option>
                  <option value="Outro">Outro</option>
                  <option value="Prefiro não informar">Prefiro não informar</option>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* SEÇÃO 2: CONTATO & LOCALIZAÇÃO */}
          <Card className="shadow-xs">
            <CardHeader className="p-5 pb-3 border-b border-[#E2E4E8] dark:border-[#303034]">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Phone className="h-4 w-4 text-[var(--primary)]" />
                <span>Contato e Localização</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Canais de comunicação para lembretes e atendimento
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="E-mail *"
                  type="email"
                  placeholder="paciente@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  helperText="Utilizado para login no portal do paciente e envio de lembretes"
                />

                <Input
                  label="Telefone / WhatsApp *"
                  placeholder="(11) 99999-9999"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  helperText="Número para confirmações de sessão e contato direto"
                />

                <div className="sm:col-span-2">
                  <Input
                    label="Endereço Residencial"
                    placeholder="Rua, número, complemento, bairro, cidade - UF"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    helperText="Opcional. Exigido por alguns conselhos para emissão de laudos"
                  />
                </div>

                <div className="sm:col-span-2">
                  <Input
                    label="Contato de Emergência"
                    placeholder="Nome do contato e telefone (ex: João Silva - 11 98888-8888)"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SEÇÃO 3: PROTEÇÃO AO MENOR DE IDADE */}
          <Card className={`shadow-xs transition-colors ${isMinor ? "border-amber-400/60 dark:border-amber-700/60" : ""}`}>
            <CardHeader className="p-5 pb-3 border-b border-[#E2E4E8] dark:border-[#303034]">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <HeartHandshake className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span>Proteção e Atendimento de Menor de Idade</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Em conformidade com a Resolução CFP e o Estatuto da Criança e do Adolescente (ECA)
                  </CardDescription>
                </div>

                <label className="flex items-center gap-2 cursor-pointer bg-slate-50 dark:bg-[#141416] px-3 py-1.5 rounded-xl border border-[#E2E4E8] dark:border-[#303034]">
                  <input
                    type="checkbox"
                    checked={isMinor}
                    onChange={(e) => setIsMinor(e.target.checked)}
                    className="rounded border-[#E2E4E8] text-[var(--primary)] focus:ring-[var(--primary)] h-4 w-4 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-[#111827] dark:text-[#F5F5F5]">
                    Paciente menor de 18 anos
                  </span>
                </label>
              </div>
            </CardHeader>

            <CardContent className="p-5">
              {isMinor ? (
                <div className="space-y-4">
                  <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      O atendimento clínico a crianças e adolescentes exige obrigatoriamente a identificação e o consentimento de pelo menos um responsável legal cadastrado.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <Input
                        label="Nome Completo do Responsável Legal *"
                        placeholder="Nome do pai, mãe ou tutor"
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

                    <Select
                      label="Grau de Parentesco *"
                      value={guardianRelationship}
                      onChange={(e) => setGuardianRelationship(e.target.value)}
                      required={isMinor}
                    >
                      <option value="Mãe">Mãe</option>
                      <option value="Pai">Pai</option>
                      <option value="Tutor(a) Legal">Tutor(a) Legal</option>
                      <option value="Avô / Avó">Avô / Avó</option>
                      <option value="Outro Responsável Legal">Outro Responsável Legal</option>
                    </Select>

                    <Input
                      label="E-mail do Responsável (Opcional)"
                      type="email"
                      placeholder="responsavel@exemplo.com"
                      value={guardianEmail}
                      onChange={(e) => setGuardianEmail(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[#6B7280] dark:text-[#A3A3AD]">
                  Paciente maior de idade (18+ anos). O consentimento é prestado diretamente pelo titular.
                </p>
              )}
            </CardContent>
          </Card>

          {/* ================= BOTÕES DE AÇÃO ================= */}
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
              <CheckCircle2 className="h-4 w-4" />
              <span>Salvar e Cadastrar Paciente</span>
            </Button>
          </div>
        </form>
      )}

      {/* ================= DIÁLOGO DE CONFIRMAÇÃO AO SAIR COM DADOS NÃO SALVOS ================= */}
      <Modal
        isOpen={showExitConfirm}
        onClose={() => setShowExitConfirm(false)}
        title="Descartar Alterações?"
        description="Você preencheu informações que ainda não foram salvas."
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <p className="text-[#6B7280] dark:text-[#A3A3AD]">
            Se você sair agora, todos os dados preenchidos neste formulário serão perdidos. Deseja continuar editando ou sair sem salvar?
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
                router.push("/admin/pacientes");
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
