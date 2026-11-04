"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { formatDate, formatTime, formatBRL } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import {
  ArrowLeft,
  User,
  Calendar,
  FileText,
  DollarSign,
  FolderLock,
  ClipboardList,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ShieldCheck,
  Video,
} from "lucide-react";

interface PatientDetail {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  cpf?: string;
  birthDate?: string;
  isMinor: boolean;
  gender?: string;
  address?: string;
  emergencyContact?: string;
  isActive: boolean;
  createdAt: string;
  guardians: Array<{
    id: string;
    fullName: string;
    cpf: string;
    phone: string;
    relationship: string;
  }>;
  appointments: Array<{
    id: string;
    startAt: string;
    endAt: string;
    modality: string;
    status: string;
    service: { name: string; durationMinutes: number };
    meetingUrlSnapshot?: string;
  }>;
  profileChanges: Array<{
    id: string;
    field: string;
    oldValue?: string;
    newValue: string;
    status: string;
    createdAt: string;
  }>;
  anamnesisSubmits: Array<{
    id: string;
    template: { title: string };
    status: string;
    createdAt: string;
    answersJson: string;
  }>;
  clinicalRecords: Array<{
    id: string;
    sessionDate: string;
    noteRichText: string;
    moodRating?: number;
    createdAt: string;
  }>;
  fileShares: Array<{
    id: string;
    sharedAt: string;
    expiresAt?: string;
    file: {
      originalName: string;
      sizeBytes: number;
    };
  }>;
  payments: Array<{
    id: string;
    amountCents: number;
    status: string;
    method: string;
    isSimulated: boolean;
    createdAt: string;
  }>;
}

export default function AdminPatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [activeTab, setActiveTab] = useState<
    "overview" | "anamnesis" | "records" | "documents" | "appointments" | "payments"
  >("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchPatient = () => {
    setIsLoading(true);
    fetch(`/api/patients/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setPatient(data);
        setIsLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchPatient();
  }, [id]);

  const handleToggleActive = async () => {
    if (!patient) return;
    const action = patient.isActive ? "desativar" : "reativar";
    if (
      !confirm(
        `Deseja ${action} este paciente? O prontuário clínico permanecerá preservado em observância às exigências do Conselho Federal de Psicologia / Medicina.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/patients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !patient.isActive }),
      });
      if (res.ok) {
        setStatusMessage(`Paciente ${patient.isActive ? "desativado" : "reativado"} com sucesso.`);
        fetchPatient();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleReviewProfileChange = async (requestId: string, decision: "APPROVED" | "REJECTED") => {
    try {
      const res = await fetch(`/api/admin/profile-changes/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      if (res.ok) {
        setStatusMessage(`Solicitação ${decision === "APPROVED" ? "aprovada" : "rejeitada"} com sucesso.`);
        fetchPatient();
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (isLoading || !patient) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        <div className="h-40 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  const pendingChanges = patient.profileChanges.filter((c) => c.status === "PENDING");

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/admin/pacientes"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-teal-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar para Lista de Pacientes</span>
        </Link>

        <div className="flex items-center gap-2">
          <Button
            variant={patient.isActive ? "destructive" : "outline"}
            size="sm"
            onClick={handleToggleActive}
          >
            {patient.isActive ? "Desativar Paciente" : "Reativar Cadastro"}
          </Button>
        </div>
      </div>

      {statusMessage && <Alert variant="success">{statusMessage}</Alert>}

      {/* Profile Header Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-teal-100 dark:bg-teal-950/60 flex items-center justify-center text-teal-700 dark:text-teal-300 font-bold text-xl shrink-0">
                {patient.fullName.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold">{patient.fullName}</h1>
                  {patient.isMinor && <Badge variant="warning">Menor de Idade</Badge>}
                  {!patient.isActive && <Badge variant="destructive">Inativo</Badge>}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {patient.email} • {patient.phone} • Cadastrado em {formatDate(patient.createdAt)}
                </p>
              </div>
            </div>

            {patient.isMinor && patient.guardians.length > 0 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs space-y-0.5">
                <span className="font-semibold text-amber-800 dark:text-amber-300 block">
                  Responsável Legal:
                </span>
                <div>{patient.guardians[0].fullName} ({patient.guardians[0].relationship})</div>
                <div>CPF: {patient.guardians[0].cpf} • Tel: {patient.guardians[0].phone}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Alerta de Alterações Pendentes de Aprovação */}
      {pendingChanges.length > 0 && (
        <Alert variant="warning" title="Solicitações de Alteração Cadastral Pendentes">
          <div className="mt-2 space-y-2">
            {pendingChanges.map((change) => (
              <div
                key={change.id}
                className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-amber-200 text-xs"
              >
                <div>
                  <span className="font-semibold capitalize">Campo: {change.field}</span>
                  <div className="text-slate-500">
                    De: <span className="line-through">{change.oldValue || "(vazio)"}</span> ➜ Para:{" "}
                    <strong className="text-slate-900 dark:text-slate-100">{change.newValue}</strong>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => handleReviewProfileChange(change.id, "APPROVED")}
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Aprovar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-7 text-xs"
                    onClick={() => handleReviewProfileChange(change.id, "REJECTED")}
                  >
                    <XCircle className="h-3 w-3 mr-1" />
                    Rejeitar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Alert>
      )}

      {/* Navegação por Abas Internas */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex gap-1 overflow-x-auto">
        {[
          { key: "overview", label: "Visão Geral", icon: User },
          { key: "records", label: "Prontuário Clínico", icon: FileText, count: patient.clinicalRecords.length },
          { key: "anamnesis", label: "Anamnese", icon: ClipboardList, count: patient.anamnesisSubmits.length },
          { key: "appointments", label: "Agendamentos", icon: Calendar, count: patient.appointments.length },
          { key: "documents", label: "Documentos", icon: FolderLock, count: patient.fileShares.length },
          { key: "payments", label: "Financeiro", icon: DollarSign, count: patient.payments.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                isActive
                  ? "border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400 font-semibold"
                  : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {typeof tab.count === "number" && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Conteúdo das Abas */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dados Cadastrais do Paciente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Nome:</span>
                <span className="font-semibold">{patient.fullName}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">E-mail:</span>
                <span className="font-semibold">{patient.email}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Telefone:</span>
                <span className="font-semibold">{patient.phone}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">CPF:</span>
                <span className="font-semibold">{patient.cpf || "Não informado"}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Data de Nasc.:</span>
                <span className="font-semibold">
                  {patient.birthDate ? formatDate(patient.birthDate) : "Não informada"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <span className="text-slate-500">Gênero:</span>
                <span className="font-semibold">{patient.gender || "Não informado"}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sigilo e Guarda de Prontuário</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-slate-500">
              <div className="p-3 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-xl space-y-2 text-teal-900 dark:text-teal-200">
                <div className="flex items-center gap-2 font-semibold">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Conformidade CFP & CFM</span>
                </div>
                <p>
                  Os prontuários clínicos deste paciente são de acesso estritamente restrito ao profissional de saúde titular. Pacientes nunca têm acesso aos apontamentos diretos do prontuário, podendo apenas receber documentos explicitamente exportados e compartilhados.
                </p>
              </div>
              <p>
                Em caso de inativação do paciente, o histórico clínico é mantido pelo prazo regulamentar mínimo de 5 anos (Resolução CFP nº 01/2009).
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "records" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Prontuário & Evolução Clínica</CardTitle>
              <CardDescription>
                Anotações confidenciais de sessão (restritas ao profissional)
              </CardDescription>
            </div>
            <Link href={`/admin/prontuarios?patientId=${patient.id}`}>
              <Button size="sm">Registrar Nova Sessão</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {patient.clinicalRecords.length > 0 ? (
              <div className="space-y-4">
                {patient.clinicalRecords.map((record) => (
                  <div
                    key={record.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">
                        Sessão em {formatDate(record.sessionDate)}
                      </span>
                      {record.moodRating && (
                        <Badge variant="outline">
                          Humor do Paciente: {record.moodRating}/10
                        </Badge>
                      )}
                    </div>
                    <div
                      className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed prose dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: record.noteRichText }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-8 text-center">
                Nenhum registro de prontuário cadastrado para este paciente.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "anamnesis" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Anamneses Preenchidas</CardTitle>
            <CardDescription>Respostas enviadas pelo paciente</CardDescription>
          </CardHeader>
          <CardContent>
            {patient.anamnesisSubmits.length > 0 ? (
              <div className="space-y-3">
                {patient.anamnesisSubmits.map((sub) => (
                  <div
                    key={sub.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-sm">{sub.template.title}</div>
                      <div className="text-slate-500 mt-0.5">
                        Enviada em {formatDate(sub.createdAt)}
                      </div>
                    </div>
                    <Badge variant={sub.status === "APPROVED" ? "success" : "warning"}>
                      {sub.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-8 text-center">
                Nenhuma anamnese preenchida até o momento.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "appointments" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Histórico de Consultas</CardTitle>
          </CardHeader>
          <CardContent>
            {patient.appointments.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {patient.appointments.map((appt) => (
                  <div key={appt.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-sm block">
                        {formatDate(appt.startAt)} às {formatTime(appt.startAt)}
                      </span>
                      <span className="text-slate-500">
                        {appt.service.name} • {appt.modality}
                      </span>
                    </div>
                    <Badge
                      variant={
                        appt.status === "CONFIRMED"
                          ? "success"
                          : appt.status === "COMPLETED"
                          ? "default"
                          : "destructive"
                      }
                    >
                      {appt.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-8 text-center">
                Nenhum agendamento registrado.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "documents" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Documentos Compartilhados</CardTitle>
            <CardDescription>
              Atestados, relatórios e declarações liberados para o paciente
            </CardDescription>
          </CardHeader>
          <CardContent>
            {patient.fileShares.length > 0 ? (
              <div className="space-y-3">
                {patient.fileShares.map((share) => (
                  <div
                    key={share.id}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold block">{share.file.originalName}</span>
                      <span className="text-slate-500 text-[11px]">
                        Compartilhado em {formatDate(share.sharedAt)} • Válido até:{" "}
                        {share.expiresAt ? formatDate(share.expiresAt) : "Indeterminado"}
                      </span>
                    </div>
                    <Badge variant="outline">Liberado</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-8 text-center">
                Nenhum documento compartilhado com este paciente.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "payments" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Histórico Financeiro do Paciente</CardTitle>
          </CardHeader>
          <CardContent>
            {patient.payments.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {patient.payments.map((p) => (
                  <div key={p.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-sm block">
                        {formatBRL(p.amountCents)}
                      </span>
                      <span className="text-slate-500">
                        {p.method} • {formatDate(p.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {p.isSimulated && <Badge variant="simulated">Simulado</Badge>}
                      <Badge variant={p.status === "APPROVED" ? "success" : "warning"}>
                        {p.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-8 text-center">
                Nenhum pagamento registrado.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
