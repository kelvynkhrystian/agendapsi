"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Alert } from "@/components/ui/alert";
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  Calendar,
  FileText,
  UserCheck,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";

interface Patient {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  cpf?: string;
  isMinor: boolean;
  isActive: boolean;
  createdAt: string;
  guardians: Array<{
    fullName: string;
    relationship: string;
    phone: string;
  }>;
  _count: {
    appointments: number;
    clinicalRecords: number;
  };
}

export default function AdminPatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Modal Novo Paciente
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [isMinor, setIsMinor] = useState(false);
  const [guardianFullName, setGuardianFullName] = useState("");
  const [guardianCpf, setGuardianCpf] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [guardianRelationship, setGuardianRelationship] = useState("Mãe");

  const [modalError, setModalError] = useState<string | null>(null);
  const [createdTempPass, setCreatedTempPass] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPatients = () => {
    setIsLoading(true);
    fetch(`/api/patients?search=${encodeURIComponent(search)}`)
      .then((res) => res.json())
      .then((data) => {
        setPatients(Array.isArray(data) ? data : []);
        setIsLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchPatients();
  }, [search]);

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          phone,
          cpf,
          birthDate: birthDate || undefined,
          isMinor,
          guardianFullName: isMinor ? guardianFullName : undefined,
          guardianCpf: isMinor ? guardianCpf : undefined,
          guardianPhone: isMinor ? guardianPhone : undefined,
          guardianRelationship: isMinor ? guardianRelationship : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setModalError(data.error || "Não foi possível cadastrar o paciente.");
        setIsSubmitting(false);
        return;
      }

      setCreatedTempPass(data.tempPassword);
      setIsSubmitting(false);
      fetchPatients();
    } catch {
      setModalError("Erro ao conectar com o servidor.");
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCreatedTempPass(null);
    setFullName("");
    setEmail("");
    setPhone("");
    setCpf("");
    setBirthDate("");
    setIsMinor(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestão de Pacientes</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Acesse prontuários clínicos, histórico de sessões, documentos e cadastro.
          </p>
        </div>

        <Button onClick={() => setIsModalOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          <span>Cadastrar Paciente</span>
        </Button>
      </div>

      {/* Busca */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Buscar por nome, e-mail ou telefone..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Lista de Pacientes */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : patients.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {patients.map((patient) => (
            <Link key={patient.id} href={`/admin/pacientes/${patient.id}`}>
              <Card className="hover:border-[var(--primary)] transition-all cursor-pointer h-full">
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base font-bold">{patient.fullName}</CardTitle>
                      {patient.isMinor && (
                        <Badge variant="warning" className="text-[10px]">
                          Menor de Idade
                        </Badge>
                      )}
                      {!patient.isActive && (
                        <Badge variant="destructive" className="text-[10px]">
                          Inativo
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-xs mt-1">
                      Cadastrado em {formatDate(patient.createdAt)}
                    </CardDescription>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </CardHeader>

                <CardContent className="space-y-2 pt-0 text-xs">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <Phone className="h-3.5 w-3.5" />
                    <span>{patient.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <Mail className="h-3.5 w-3.5" />
                    <span>{patient.email}</span>
                  </div>

                  {patient.isMinor && patient.guardians.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-amber-700 dark:text-amber-400">
                      Responsável: <strong>{patient.guardians[0].fullName}</strong> ({patient.guardians[0].relationship})
                    </div>
                  )}

                  <div className="flex items-center gap-4 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] font-medium text-slate-500">
                    <span>{patient._count.appointments} consulta(s)</span>
                    <span>{patient._count.clinicalRecords} nota(s) de prontuário</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center text-slate-500">
          <Users className="h-10 w-10 mx-auto text-slate-400 mb-3" />
          <p className="font-medium">Nenhum paciente encontrado.</p>
          <p className="text-xs text-slate-400 mt-1">
            Cadastre um novo paciente manualmente ou aguarde novos agendamentos públicos.
          </p>
        </Card>
      )}

      {/* Modal Criar Paciente */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Cadastrar Novo Paciente"
        description="O paciente receberá uma senha temporária para primeiro acesso"
        maxWidth="lg"
      >
        {createdTempPass ? (
          <div className="space-y-4">
            <Alert variant="success" title="Paciente Cadastrado com Sucesso!">
              Uma senha temporária foi gerada automaticamente. Forneça os dados de acesso ao paciente:
            </Alert>

            <div className="p-4 bg-slate-100 dark:bg-[#19191C] border border-[#E2E4E8] dark:border-[#303034] rounded-xl space-y-2 font-mono text-sm text-[#111827] dark:text-[#F5F5F5]">
              <div><strong>E-mail:</strong> {email}</div>
              <div><strong>Senha Temporária:</strong> <span className="font-bold text-[#111827] dark:text-[#F5F5F5] bg-[var(--primary)]/15 px-2 py-0.5 rounded">{createdTempPass}</span></div>
            </div>

            <p className="text-xs text-slate-500">
              O paciente será obrigado a criar uma nova senha pessoal no primeiro login.
            </p>

            <div className="flex justify-end pt-2">
              <Button onClick={handleCloseModal}>Concluir</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreatePatient} className="space-y-4">
            {modalError && <Alert variant="destructive">{modalError}</Alert>}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Input
                  label="Nome Completo *"
                  placeholder="Nome do paciente"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <Input
                label="E-mail *"
                type="email"
                placeholder="paciente@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                onChange={(e) => {
                  setBirthDate(e.target.value);
                  if (e.target.value) {
                    const birth = new Date(e.target.value);
                    const ageDiff = Date.now() - birth.getTime();
                    const age = Math.abs(new Date(ageDiff).getUTCFullYear() - 1970);
                    if (age < 18) setIsMinor(true);
                  }
                }}
              />
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isMinor}
                  onChange={(e) => setIsMinor(e.target.checked)}
                  className="rounded border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)] h-4 w-4"
                />
                <span className="text-sm font-medium">Paciente menor de 18 anos</span>
              </label>
            </div>

            {isMinor && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-3">
                <span className="text-xs font-bold text-amber-800 dark:text-amber-300 block uppercase">
                  Dados do Responsável Legal (Obrigatórios)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <Input
                      label="Nome do Responsável *"
                      placeholder="Nome completo"
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
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium">Parentesco *</label>
                    <select
                      className="flex h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                      value={guardianRelationship}
                      onChange={(e) => setGuardianRelationship(e.target.value)}
                    >
                      <option value="Mãe">Mãe</option>
                      <option value="Pai">Pai</option>
                      <option value="Tutor(a) Legal">Tutor(a) Legal</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={handleCloseModal}>
                Cancelar
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                Salvar e Gerar Acesso
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
