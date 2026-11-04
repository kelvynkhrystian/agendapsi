"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { formatDate, formatTime, formatBRL } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
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
  Plus,
  Pencil,
  History,
  Share2,
  Sparkles,
  Lock,
} from "lucide-react";

interface ClinicalRecordItem {
  id: string;
  patientId: string;
  sessionDate: string;
  noteRichText: string;
  summary?: string;
  moodRating?: number;
  createdAt: string;
  appointment?: {
    id: string;
    startAt: string;
    service: { name: string };
  };
  revisions?: Array<{
    id: string;
    contentSnapshot: string;
    moodRatingSnapshot?: number;
    revisedAt: string;
    revisedBy: string;
  }>;
}

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
  clinicalRecords: ClinicalRecordItem[];
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

const moodScaleLabels = [
  { val: 1, emoji: "😫", label: "Angustiado / Crise" },
  { val: 2, emoji: "😞", label: "Muito Triste" },
  { val: 3, emoji: "🙁", label: "Triste" },
  { val: 4, emoji: "😐", label: "Desanimado" },
  { val: 5, emoji: "😌", label: "Neutro / Estável" },
  { val: 6, emoji: "🙂", label: "Levemente Animado" },
  { val: 7, emoji: "😊", label: "Bem / Animado" },
  { val: 8, emoji: "😃", label: "Muito Bem" },
  { val: 9, emoji: "🤩", label: "Produtivo / Otimista" },
  { val: 10, emoji: "✨", label: "Eufórico / Radiante" },
];

const clinicalTemplates = [
  {
    name: "Evolução Padrão",
    content:
      "<h3>1. Estado Geral e Apresentação</h3><p>Paciente comparece pontualmente, com higiene adequada e comunicativo.</p><h3>2. Queixa e Conteúdo Abordado</h3><p>Relata avanços no manejo da ansiedade ao longo da semana.</p><h3>3. Intervenções Realizadas</h3><p>Reestruturação cognitiva e treino de habilidades.</p><h3>4. Encaminhamentos e Tarefas</h3><p>Registro de pensamentos automáticos mantido para a próxima sessão.</p>",
  },
  {
    name: "Primeira Sessão de Acolhimento",
    content:
      "<h3>1. Apresentação e Enquadre</h3><p>Alinhamento de sigilo, faltas e contrato terapêutico.</p><h3>2. Queixa Principal e Histórico</h3><p>Demanda inicial focada em transição de carreira e sintomas ansiosos.</p><h3>3. Hipótese Diagnóstica / Compreensão Inicial</h3><p>Quadro adaptativo com humor reativo preservado.</p>",
  },
  {
    name: "Encerramento / Alta",
    content:
      "<h3>1. Avaliação do Processo Terapêutico</h3><p>Paciente alcançou os objetivos terapêuticos estabelecidos.</p><h3>2. Estratégias de Prevenção de Recaída</h3><p>Revisadas as principais ferramentas desenvolvidas no processo.</p>",
  },
];

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal Novo Prontuário
  const [isNewRecordModalOpen, setIsNewRecordModalOpen] = useState(false);
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [selectedAppointmentId, setSelectedAppointmentId] = useState("");
  const [newMood, setNewMood] = useState<number | undefined>(undefined);
  const [newSummary, setNewSummary] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");
  const [isSubmittingRecord, setIsSubmittingRecord] = useState(false);

  // Modal Edição de Prontuário
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ClinicalRecordItem | null>(null);
  const [editMood, setEditMood] = useState<number | undefined>(undefined);
  const [editSummary, setEditSummary] = useState("");
  const [editNoteContent, setEditNoteContent] = useState("");
  const [isUpdatingRecord, setIsUpdatingRecord] = useState(false);

  // Modal Histórico de Revisões
  const [isRevisionsModalOpen, setIsRevisionsModalOpen] = useState(false);
  const [viewingRecord, setViewingRecord] = useState<ClinicalRecordItem | null>(null);

  // Modal Compartilhar Documento com Paciente
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareFile, setShareFile] = useState<File | null>(null);
  const [shareDays, setShareDays] = useState("30");
  const [isSharing, setIsSharing] = useState(false);

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
    // Ativa aba via parâmetro ?tab=records na URL se presente
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const tab = urlParams.get("tab");
      if (tab && ["overview", "anamnesis", "records", "documents", "appointments", "payments"].includes(tab)) {
        setActiveTab(tab as typeof activeTab);
      }
    }
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

  // Criação de Prontuário
  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim()) {
      setErrorMessage("O conteúdo da anotação do prontuário é obrigatório.");
      return;
    }

    setIsSubmittingRecord(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/clinical-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: id,
          appointmentId: selectedAppointmentId || undefined,
          sessionDate: new Date(sessionDate).toISOString(),
          noteRichText: newNoteContent,
          summary: newSummary.trim() || undefined,
          moodRating: newMood,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Erro ao registrar evolução no prontuário.");
        setIsSubmittingRecord(false);
        return;
      }

      setIsNewRecordModalOpen(false);
      setIsSubmittingRecord(false);
      setNewNoteContent("");
      setNewSummary("");
      setNewMood(undefined);
      setSelectedAppointmentId("");
      setStatusMessage("Evolução registrada no prontuário clínico confidencial com sucesso.");
      fetchPatient();
    } catch {
      setErrorMessage("Erro de conexão ao salvar prontuário.");
      setIsSubmittingRecord(false);
    }
  };

  // Abertura do Modal de Edição
  const openEditRecordModal = (record: ClinicalRecordItem) => {
    setEditingRecord(record);
    setEditMood(record.moodRating);
    setEditSummary(record.summary || "");
    setEditNoteContent(record.noteRichText);
    setIsEditModalOpen(true);
  };

  // Atualização de Prontuário (com salvamento de revisão)
  const handleUpdateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    if (!editNoteContent.trim()) {
      setErrorMessage("O conteúdo do prontuário não pode ficar vazio.");
      return;
    }

    setIsUpdatingRecord(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/clinical-records/${editingRecord.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noteRichText: editNoteContent,
          summary: editSummary.trim() || undefined,
          moodRating: editMood,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Erro ao atualizar prontuário.");
        setIsUpdatingRecord(false);
        return;
      }

      setIsEditModalOpen(false);
      setIsUpdatingRecord(false);
      setEditingRecord(null);
      setStatusMessage("Prontuário atualizado e revisão histórica auditada com sucesso.");
      fetchPatient();
    } catch {
      setErrorMessage("Erro de conexão ao atualizar prontuário.");
      setIsUpdatingRecord(false);
    }
  };

  // Compartilhamento de Documento
  const handleUploadAndShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareFile) return;
    setIsSharing(true);

    try {
      const formData = new FormData();
      formData.append("file", shareFile);
      formData.append("patientId", id);
      formData.append("shareDays", shareDays);
      formData.append("category", "CLINICAL_NOTE_EXPORT");

      const res = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setIsShareModalOpen(false);
        setShareFile(null);
        setIsSharing(false);
        setStatusMessage("Documento compartilhado com o paciente com sucesso.");
        fetchPatient();
      } else {
        const d = await res.json();
        setErrorMessage(d.error || "Erro ao enviar arquivo.");
        setIsSharing(false);
      }
    } catch (e) {
      console.error(e);
      setErrorMessage("Erro de rede ao enviar documento.");
      setIsSharing(false);
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

      {statusMessage && (
        <Alert variant="success">
          {statusMessage}
        </Alert>
      )}
      {errorMessage && (
        <Alert variant="destructive">
          {errorMessage}
        </Alert>
      )}

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
                <div>
                  {patient.guardians[0].fullName} ({patient.guardians[0].relationship})
                </div>
                <div>
                  CPF: {patient.guardians[0].cpf} • Tel: {patient.guardians[0].phone}
                </div>
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
                  <span>Área Privativa e Sigilosa (CFP & CFM)</span>
                </div>
                <p>
                  Os prontuários clínicos deste paciente são restritos estritamente ao profissional titular. Eles nunca aparecem na área do paciente nem no menu geral, sendo acessados, criados e editados exclusivamente nesta aba individual do paciente.
                </p>
              </div>
              <p>
                Em caso de inativação do paciente, o histórico clínico é mantido pelo prazo regulamentar mínimo de 5 anos (Resolução CFP nº 01/2009).
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ABA PRONTUÁRIO CLÍNICO (PRIVADO DO CLIENTE) */}
      {activeTab === "records" && (
        <Card className="border-teal-100 dark:border-teal-950/50 shadow-xs">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold">Prontuário & Evolução Clínica</CardTitle>
                <Badge variant="outline" className="text-[10px] text-teal-700 dark:text-teal-400 border-teal-300">
                  <Lock className="h-3 w-3 mr-1 inline" /> Privado do Paciente
                </Badge>
              </div>
              <CardDescription className="text-xs mt-1">
                Anotações clínicas e histórico confidencial da terapia de <strong>{patient.fullName}</strong>.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsShareModalOpen(true)}
                className="gap-1.5 text-xs"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>Emitir Atestado/Doc</span>
              </Button>
              <Button
                size="sm"
                onClick={() => setIsNewRecordModalOpen(true)}
                className="gap-1.5 text-xs bg-teal-600 hover:bg-teal-700 text-white"
              >
                <Plus className="h-4 w-4" />
                <span>Nova Evolução de Sessão</span>
              </Button>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            {patient.clinicalRecords.length > 0 ? (
              <div className="space-y-4">
                {patient.clinicalRecords.map((record) => {
                  const moodInfo = moodScaleLabels.find((m) => m.val === record.moodRating);

                  return (
                    <Card
                      key={record.id}
                      className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs"
                    >
                      <CardHeader className="flex flex-row items-start justify-between pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                              Sessão em {formatDate(record.sessionDate)} às {formatTime(record.sessionDate)}
                            </span>
                            {record.appointment && (
                              <Badge variant="outline" className="text-[10px]">
                                {record.appointment.service?.name || "Consulta Vinculada"}
                              </Badge>
                            )}
                          </div>
                          {record.summary && (
                            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-1">
                              Resumo: {record.summary}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {moodInfo && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-full text-xs">
                              <span>{moodInfo.emoji}</span>
                              <span className="font-semibold text-teal-800 dark:text-teal-300">
                                {record.moodRating}/10: {moodInfo.label}
                              </span>
                            </div>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => openEditRecordModal(record)}
                          >
                            <Pencil className="h-3 w-3" />
                            <span>Editar</span>
                          </Button>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-3 pt-0 text-xs">
                        <div
                          className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: record.noteRichText }}
                        />

                        {record.revisions && record.revisions.length > 0 && (
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
                            <div className="flex items-center gap-1.5">
                              <History className="h-3.5 w-3.5" />
                              <span>{record.revisions.length} revisão(ões) anterior(es) registrada(s)</span>
                            </div>
                            <button
                              onClick={() => {
                                setViewingRecord(record);
                                setIsRevisionsModalOpen(true);
                              }}
                              className="text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                            >
                              Ver histórico completo
                            </button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center text-slate-500 space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    Nenhum prontuário registrado para este paciente.
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Os apontamentos clínicos são confidenciais e cadastrados privadamente por aqui.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setIsNewRecordModalOpen(true)}
                  className="gap-1.5 text-xs bg-teal-600 hover:bg-teal-700 text-white mt-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Registrar Primeira Evolução</span>
                </Button>
              </div>
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
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Documentos Compartilhados</CardTitle>
              <CardDescription>
                Atestados, relatórios e declarações liberados para o paciente
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="text-xs gap-1.5"
              onClick={() => setIsShareModalOpen(true)}
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>Liberar Novo Documento</span>
            </Button>
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

      {/* MODAL 1: REGISTRAR NOVO PRONTUÁRIO */}
      <Modal
        isOpen={isNewRecordModalOpen}
        onClose={() => setIsNewRecordModalOpen(false)}
        title="Registrar Nova Evolução Clínica"
        description={`Adicionar anotação confidencial ao prontuário de ${patient.fullName}.`}
        maxWidth="xl"
      >
        <form onSubmit={handleCreateRecord} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Data e Horário da Sessão:
              </label>
              <Input
                type="datetime-local"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Vincular a Consulta (Opcional):
              </label>
              <select
                className="flex h-10 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs"
                value={selectedAppointmentId}
                onChange={(e) => setSelectedAppointmentId(e.target.value)}
              >
                <option value="">Sem vínculo direto</option>
                {patient.appointments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {formatDate(a.startAt)} às {formatTime(a.startAt)} — {a.service.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Escala de Humor */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
              Escala de Humor / Estado Geral do Paciente (1 a 10):
            </label>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
              {moodScaleLabels.map((m) => (
                <button
                  key={m.val}
                  type="button"
                  onClick={() => setNewMood(m.val === newMood ? undefined : m.val)}
                  title={m.label}
                  className={`p-2 rounded-xl text-center border transition-all cursor-pointer ${
                    newMood === m.val
                      ? "border-teal-600 bg-teal-50 dark:bg-teal-950/60 font-bold text-teal-800 dark:text-teal-300 ring-2 ring-teal-500/30"
                      : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <div className="text-base">{m.emoji}</div>
                  <div className="text-[11px] font-semibold mt-0.5">{m.val}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Modelos Rápidos de Anotação */}
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-1.5">
              <Sparkles className="h-3.5 w-3.5 text-teal-600" />
              <span>Inserir Modelo Clínico Rápido:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {clinicalTemplates.map((tpl) => (
                <Button
                  key={tpl.name}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setNewNoteContent(tpl.content)}
                >
                  {tpl.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Resumo */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Resumo Executivo da Sessão (Opcional):
            </label>
            <Input
              placeholder="Ex: Trabalho de manejo de ansiedade; paciente relatou melhora no sono."
              value={newSummary}
              onChange={(e) => setNewSummary(e.target.value)}
            />
          </div>

          {/* Anotação Rica */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Evolução e Anotações Clínicas da Sessão: *
            </label>
            <textarea
              className="flex min-h-[160px] w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs leading-relaxed focus:ring-2 focus:ring-teal-500 font-mono"
              placeholder="Descreva as queixas, intervenções realizadas, tarefas e evolução do paciente..."
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              required
            />
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Suporta formatação com tags HTML simples (&lt;h3&gt;, &lt;p&gt;, &lt;strong&gt;).
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsNewRecordModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-teal-600 hover:bg-teal-700 text-white"
              disabled={isSubmittingRecord}
            >
              {isSubmittingRecord ? "Salvando..." : "Gravar no Prontuário"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: EDITAR PRONTUÁRIO EXISTENTE */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingRecord(null);
        }}
        title="Editar Evolução de Prontuário"
        description="Alterações em prontuário salvam uma cópia da versão anterior na auditoria."
        maxWidth="xl"
      >
        <form onSubmit={handleUpdateRecord} className="space-y-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs space-y-1 text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-1.5 font-bold">
              <ShieldCheck className="h-4 w-4" />
              <span>Conformidade Ética e Trilha de Auditoria</span>
            </div>
            <p>
              Em conformidade com a Resolução CFP nº 01/2009 e LGPD, o texto atual será copiado para o histórico de revisões antes de aplicar a nova versão. O registro original nunca é perdido.
            </p>
          </div>

          {editingRecord && (
            <div className="text-xs text-slate-500">
              Sessão realizada em: <strong>{formatDate(editingRecord.sessionDate)}</strong>
            </div>
          )}

          {/* Escala de Humor */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
              Escala de Humor / Estado Geral:
            </label>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
              {moodScaleLabels.map((m) => (
                <button
                  key={m.val}
                  type="button"
                  onClick={() => setEditMood(m.val === editMood ? undefined : m.val)}
                  title={m.label}
                  className={`p-2 rounded-xl text-center border transition-all cursor-pointer ${
                    editMood === m.val
                      ? "border-teal-600 bg-teal-50 dark:bg-teal-950/60 font-bold text-teal-800 dark:text-teal-300 ring-2 ring-teal-500/30"
                      : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <div className="text-base">{m.emoji}</div>
                  <div className="text-[11px] font-semibold mt-0.5">{m.val}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Resumo */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Resumo da Sessão:
            </label>
            <Input
              value={editSummary}
              onChange={(e) => setEditSummary(e.target.value)}
              placeholder="Resumo sucinto da sessão..."
            />
          </div>

          {/* Anotação Rica */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Conteúdo do Prontuário Clínico: *
            </label>
            <textarea
              className="flex min-h-[180px] w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs leading-relaxed focus:ring-2 focus:ring-teal-500 font-mono"
              value={editNoteContent}
              onChange={(e) => setEditNoteContent(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingRecord(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-teal-600 hover:bg-teal-700 text-white"
              disabled={isUpdatingRecord}
            >
              {isUpdatingRecord ? "Salvando Revisão..." : "Salvar Revisão do Prontuário"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: HISTÓRICO DE REVISÕES */}
      <Modal
        isOpen={isRevisionsModalOpen}
        onClose={() => {
          setIsRevisionsModalOpen(false);
          setViewingRecord(null);
        }}
        title="Histórico de Revisões Auditadas"
        description="Cópias de versões anteriores preservadas para integridade do prontuário."
        maxWidth="lg"
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {viewingRecord && viewingRecord.revisions && viewingRecord.revisions.length > 0 ? (
            viewingRecord.revisions.map((rev, idx) => (
              <div
                key={rev.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between font-semibold text-slate-700 dark:text-slate-300">
                  <span>
                    Versão #{viewingRecord.revisions!.length - idx} arquivada em {formatDate(rev.revisedAt)} às {formatTime(rev.revisedAt)}
                  </span>
                  {rev.moodRatingSnapshot && (
                    <Badge variant="outline">Humor: {rev.moodRatingSnapshot}/10</Badge>
                  )}
                </div>
                <div
                  className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300"
                  dangerouslySetInnerHTML={{ __html: rev.contentSnapshot }}
                />
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-500 py-4 text-center">
              Nenhuma revisão anterior encontrada.
            </p>
          )}

          <div className="flex justify-end pt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setIsRevisionsModalOpen(false);
                setViewingRecord(null);
              }}
            >
              Fechar
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 4: LIBERAR DOCUMENTO / ATESTADO */}
      <Modal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title="Liberar Documento / Atestado"
        description={`Compartilhar documento com ${patient.fullName} na Área do Paciente.`}
        maxWidth="md"
      >
        <form onSubmit={handleUploadAndShare} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Selecionar Arquivo (.PDF, .PNG, .JPG): *
            </label>
            <input
              type="file"
              required
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
              onChange={(e) => setShareFile(e.target.files?.[0] || null)}
              className="flex h-10 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs file:mr-3 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Prazo de Validade para Download do Paciente:
            </label>
            <select
              className="flex h-10 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs"
              value={shareDays}
              onChange={(e) => setShareDays(e.target.value)}
            >
              <option value="7">7 dias</option>
              <option value="15">15 dias</option>
              <option value="30">30 dias (Padrão)</option>
              <option value="90">90 dias</option>
              <option value="365">1 ano</option>
              <option value="0">Indeterminado (Sem expiração)</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsShareModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-teal-600 hover:bg-teal-700 text-white"
              disabled={isSharing || !shareFile}
            >
              {isSharing ? "Enviando..." : "Liberar Documento"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
