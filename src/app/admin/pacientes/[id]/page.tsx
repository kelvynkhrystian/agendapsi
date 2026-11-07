"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  formatDate,
  formatTime,
  formatBRL,
  formatAppointmentStatus,
  formatModality,
  formatPaymentStatus,
  formatPaymentMethod,
} from "@/lib/utils";
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
  Download,
  Eye,
  Trash2,
  RotateCcw,
  Archive,
  Clock,
  Upload,
  FileCheck2,
  HelpCircle,
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

interface AnamnesisQuestion {
  id: string;
  label: string;
  type?: string;
  options?: string[];
  required?: boolean;
}

interface AnamnesisSubmitItem {
  id: string;
  template: {
    id: string;
    title: string;
    description?: string;
    fieldsJson?: string;
  };
  status: string;
  createdAt: string;
  answersJson: string;
  reviewedAt?: string | null;
  reviewerNotes?: string | null;
}

interface FileShareItem {
  id: string;
  fileId: string;
  patientId: string;
  canDownload: boolean;
  expiresAt?: string | null;
  revokedAt?: string | null;
  sharedAt: string;
  file: {
    id: string;
    title?: string | null;
    originalName: string;
    description?: string | null;
    mimeType: string;
    sizeBytes: number;
    category: string;
  };
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
  anamnesisSubmits: AnamnesisSubmitItem[];
  clinicalRecords: ClinicalRecordItem[];
  fileShares: FileShareItem[];
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
  const router = useRouter();
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [activeTab, setActiveTab] = useState<
    "overview" | "anamnesis" | "records" | "documents" | "appointments" | "payments"
  >("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal Exclusão de Documento
  const [docToDelete, setDocToDelete] = useState<{ id: string; title?: string | null; originalName: string; sizeBytes: number } | null>(null);
  const [isDeletingDoc, setIsDeletingDoc] = useState(false);

  // Modal Exclusão / Arquivamento de Paciente
  const [isDeletePatientModalOpen, setIsDeletePatientModalOpen] = useState(false);
  const [deletionInfo, setDeletionInfo] = useState<{
    dependencies: {
      clinicalRecordsCount: number;
      appointmentsCount: number;
      paymentsCount: number;
      appointmentPackagesCount: number;
      fileSharesCount: number;
      anamnesisCount: number;
    };
    hasProtectedRecords: boolean;
    canPermanentlyDelete: boolean;
    explanation: string;
  } | null>(null);
  const [isLoadingCheck, setIsLoadingCheck] = useState(false);
  const [isProcessingPatient, setIsProcessingPatient] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState("");

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

  // Modal Histórico de Revisões de Prontuário
  const [isRevisionsModalOpen, setIsRevisionsModalOpen] = useState(false);
  const [viewingRecord, setViewingRecord] = useState<ClinicalRecordItem | null>(null);

  // Modal Enviar Documento (Task 2)
  const [isUploadDocModalOpen, setIsUploadDocModalOpen] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [docDescription, setDocDescription] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docShareDays, setDocShareDays] = useState("30");
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  // Modal Visualizar Respostas de Anamnese (Task 5)
  const [isViewAnamnesisModalOpen, setIsViewAnamnesisModalOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<AnamnesisSubmitItem | null>(null);

  // Modal Confirmação de Reset de Anamnese (Task 6)
  const [isResetAnamnesisModalOpen, setIsResetAnamnesisModalOpen] = useState(false);
  const [isResettingAnamnesis, setIsResettingAnamnesis] = useState(false);

  const fetchPatient = () => {
    setIsLoading(true);
    fetch(`/api/patients/${id}`, { cache: "no-store" })
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

  // Exclusão de Documento Compartilhado
  const confirmDeleteDocument = async () => {
    if (!docToDelete) return;
    setIsDeletingDoc(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/files/${docToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (res.ok) {
        setStatusMessage(data.message || "Documento excluído com sucesso.");
        setPatient((prev) =>
          prev
            ? {
                ...prev,
                fileShares: prev.fileShares.filter((s) => s.file.id !== docToDelete.id),
              }
            : null
        );
        setDocToDelete(null);
      } else {
        setErrorMessage(data.error || "Não foi possível excluir o documento.");
      }
    } catch {
      setErrorMessage("Erro de comunicação ao excluir documento.");
    } finally {
      setIsDeletingDoc(false);
    }
  };

  // Abre modal de exclusão/arquivamento do paciente
  const handleOpenDeletePatientModal = async () => {
    if (!patient) return;
    setDeletionInfo(null);
    setConfirmationInput("");
    setIsDeletePatientModalOpen(true);
    setIsLoadingCheck(true);

    try {
      const res = await fetch(`/api/patients/${id}/deletion-check`);
      if (res.ok) {
        const data = await res.json();
        setDeletionInfo(data);
      }
    } catch (err) {
      console.error("Erro ao verificar dependências:", err);
    } finally {
      setIsLoadingCheck(false);
    }
  };

  // Confirma exclusão ou arquivamento do paciente
  const handleConfirmDeleteOrArchivePatient = async (actionMode: "ARCHIVE" | "PERMANENT") => {
    if (!patient) return;
    setIsProcessingPatient(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/patients/${id}?action=${actionMode}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionMode }),
      });

      const data = await res.json();

      if (res.ok) {
        if (actionMode === "PERMANENT") {
          setIsDeletePatientModalOpen(false);
          router.push("/admin/pacientes");
          return;
        }

        setStatusMessage(data.message || "Paciente arquivado com sucesso.");
        setPatient((prev) => (prev ? { ...prev, isActive: false } : null));
        setIsDeletePatientModalOpen(false);
      } else {
        setErrorMessage(data.error || "Não foi possível processar a exclusão.");
      }
    } catch {
      setErrorMessage("Erro de comunicação ao processar a ação.");
    } finally {
      setIsProcessingPatient(false);
    }
  };

  // Reativar paciente arquivado
  const handleRestorePatient = async () => {
    if (!patient) return;
    setIsLoading(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/patients/${id}?action=RESTORE`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMessage(data.message || "Paciente reativado com sucesso.");
        setPatient((prev) => (prev ? { ...prev, isActive: true } : null));
      } else {
        setErrorMessage(data.error || "Erro ao reativar paciente.");
      }
    } catch {
      setErrorMessage("Erro de comunicação ao reativar paciente.");
    } finally {
      setIsLoading(false);
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

  // Atualização de Prontuário
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

  // Enviar Documento (Task 2)
  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docFile) {
      setErrorMessage("Selecione um arquivo para envio.");
      return;
    }

    setIsUploadingDoc(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", docFile);
      formData.append("patientId", id);
      if (docTitle.trim()) formData.append("title", docTitle.trim());
      if (docDescription.trim()) formData.append("description", docDescription.trim());
      formData.append("shareDays", docShareDays);
      formData.append("category", "PATIENT_DOCUMENT");

      const res = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Erro ao enviar documento.");
        setIsUploadingDoc(false);
        return;
      }

      setIsUploadDocModalOpen(false);
      setDocFile(null);
      setDocTitle("");
      setDocDescription("");
      setDocShareDays("30");
      setIsUploadingDoc(false);
      setStatusMessage("Documento enviado e liberado para o paciente com sucesso.");
      fetchPatient();
    } catch {
      setErrorMessage("Erro de rede ao enviar documento.");
      setIsUploadingDoc(false);
    }
  };

  // Revogar Acesso a Documento (Task 3)
  const handleRevokeShare = async (shareId: string) => {
    if (!confirm("Deseja realmente revogar o acesso do paciente a este documento? Ele não poderá mais visualizar ou baixar o arquivo.")) {
      return;
    }

    try {
      const res = await fetch(`/api/files/shares/${shareId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REVOKE" }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Erro ao revogar acesso ao documento.");
        return;
      }

      setStatusMessage("Acesso do paciente ao documento revogado com sucesso.");
      fetchPatient();
    } catch {
      setErrorMessage("Erro ao comunicar com o servidor.");
    }
  };

  // Reativar Acesso a Documento (Task 3)
  const handleReactivateShare = async (shareId: string) => {
    try {
      const res = await fetch(`/api/files/shares/${shareId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REACTIVATE", days: 30 }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Erro ao reativar acesso.");
        return;
      }

      setStatusMessage("Acesso do paciente reativado por mais 30 dias com sucesso.");
      fetchPatient();
    } catch {
      setErrorMessage("Erro ao reativar documento.");
    }
  };

  // Solicitar Novo Preenchimento de Anamnese (Task 6)
  const handleConfirmResetAnamnesis = async () => {
    setIsResettingAnamnesis(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/admin/patients/${id}/anamnesis-reset`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Erro ao solicitar novo preenchimento.");
        setIsResettingAnamnesis(false);
        return;
      }

      setIsResetAnamnesisModalOpen(false);
      setIsResettingAnamnesis(false);
      setStatusMessage("Novo preenchimento solicitado com sucesso. A ficha anterior foi arquivada e o formulário reaberto para o paciente.");
      fetchPatient();
    } catch {
      setErrorMessage("Erro de rede ao solicitar nova anamnese.");
      setIsResettingAnamnesis(false);
    }
  };

  // Cálculo Dinâmico de Expiração para Preview
  const getCalculatedExpirationText = (daysStr: string) => {
    const days = parseInt(daysStr, 10);
    if (days <= 0) return "Acesso permanente (sem data de expiração)";
    const d = new Date();
    d.setDate(d.getDate() + days);
    return `Válido até ${d.toLocaleDateString("pt-BR")} às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} (${days} dias)`;
  };

  const getAnamnesisStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <Badge variant="success">Aprovada</Badge>;
      case "REVISION_REQUESTED":
        return <Badge variant="outline" className="border-amber-300 text-amber-700 dark:text-amber-300">Substituída / Novo Envio Solicitado</Badge>;
      case "PENDING_REVIEW":
      default:
        return <Badge variant="warning">Enviada / Em Análise</Badge>;
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
  const hasActiveAnamnesis = patient.anamnesisSubmits.some((s) => s.status === "PENDING_REVIEW" || s.status === "APPROVED");

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/admin/pacientes"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[var(--primary)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar para Lista de Pacientes</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link href={`/admin/pacientes/${patient.id}/editar`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Pencil className="h-3.5 w-3.5" />
              <span>Editar Cadastro</span>
            </Button>
          </Link>

          {!patient.isActive && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-[var(--primary)] border-[var(--primary)]/30 hover:bg-[var(--primary)]/10"
              onClick={handleRestorePatient}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reativar Cadastro</span>
            </Button>
          )}

          <Button
            variant="destructive"
            size="sm"
            className="gap-1.5"
            onClick={handleOpenDeletePatientModal}
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Excluir / Arquivar</span>
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
              <div className="w-14 h-14 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] font-bold text-xl shrink-0">
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
                  ? "border-[var(--primary)] text-[var(--primary)] font-bold"
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

      {/* 1. VISÃO GERAL */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-base">Dados Cadastrais do Paciente</CardTitle>
              <Link href={`/admin/pacientes/${patient.id}/editar`}>
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-[var(--primary)] hover:text-[var(--primary)]">
                  <Pencil className="h-3.5 w-3.5" />
                  <span>Editar</span>
                </Button>
              </Link>
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
              <div className="p-3 bg-[var(--primary)]/10 border border-[var(--primary)]/20 rounded-xl space-y-2 text-slate-800 dark:text-[#F5F5F5]">
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

      {/* 2. PRONTUÁRIO CLÍNICO (PRIVADO DO CLIENTE) */}
      {activeTab === "records" && (
        <Card className="border-slate-200 dark:border-[#444444] shadow-xs">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold">Prontuário & Evolução Clínica</CardTitle>
                <Badge variant="outline" className="text-[10px] text-[var(--primary)] border-[var(--primary)]/30">
                  <Lock className="h-3 w-3 mr-1 inline" /> Privado do Paciente
                </Badge>
              </div>
              <CardDescription className="text-xs mt-1">
                Anotações clínicas e histórico confidencial da terapia de <strong>{patient.fullName}</strong>.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => setIsNewRecordModalOpen(true)}
                className="gap-1.5 text-xs bg-[var(--button-bg,var(--primary))] hover:brightness-105 text-white cursor-pointer"
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
                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--primary)]/10 border border-[var(--primary)]/20 rounded-full text-xs">
                              <span>{moodInfo.emoji}</span>
                              <span className="font-semibold text-[var(--primary)]">
                                {record.moodRating}/10: {moodInfo.label}
                              </span>
                            </div>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1 cursor-pointer"
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
                              className="text-[var(--primary)] hover:underline cursor-pointer"
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
                  className="gap-1.5 text-xs bg-[var(--button-bg,var(--primary))] hover:brightness-105 text-white mt-2 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Registrar Primeira Evolução</span>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 3. ANAMNESE (TASK 5 & 6) */}
      {activeTab === "anamnesis" && (
        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <CardTitle className="text-base font-bold">Fichas de Anamnese do Paciente</CardTitle>
              <CardDescription className="text-xs">
                Histórico de questionários enviados e respostas submetidas pelo paciente
              </CardDescription>
            </div>
            {hasActiveAnamnesis && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs text-amber-700 dark:text-amber-300 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/50 cursor-pointer"
                onClick={() => setIsResetAnamnesisModalOpen(true)}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Solicitar novo preenchimento</span>
              </Button>
            )}
          </CardHeader>
          <CardContent className="pt-6">
            {patient.anamnesisSubmits.length > 0 ? (
              <div className="space-y-3">
                {patient.anamnesisSubmits.map((sub) => (
                  <div
                    key={sub.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:border-[var(--primary)]/50 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                          {sub.template.title}
                        </span>
                        {getAnamnesisStatusBadge(sub.status)}
                      </div>
                      <div className="text-slate-500 mt-1 flex items-center gap-2">
                        <span>Enviada em {formatDate(sub.createdAt)} às {formatTime(sub.createdAt)}</span>
                        {sub.reviewedAt && (
                          <>
                            <span>•</span>
                            <span>Revisada em {formatDate(sub.reviewedAt)}</span>
                          </>
                        )}
                      </div>
                      {sub.reviewerNotes && (
                        <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1 italic">
                          Nota: {sub.reviewerNotes}
                        </p>
                      )}
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-1.5 cursor-pointer self-end sm:self-center"
                      onClick={() => {
                        setSelectedSubmission(sub);
                        setIsViewAnamnesisModalOpen(true);
                      }}
                    >
                      <Eye className="h-3.5 w-3.5 text-[var(--primary)]" />
                      <span>Visualizar respostas</span>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-slate-500 space-y-2">
                <ClipboardList className="h-8 w-8 mx-auto text-slate-400" />
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Nenhuma anamnese preenchida até o momento.
                </p>
                <p className="text-xs text-slate-400">
                  Quando o paciente responder à ficha de anamnese na Área do Paciente, ela aparecerá aqui para sua revisão.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 4. AGENDAMENTOS */}
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
                        {appt.service.name} • {formatModality(appt.modality)}
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
                      {formatAppointmentStatus(appt.status)}
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

      {/* 5. DOCUMENTOS COMPARTILHADOS (TASK 2 & 3) */}
      {activeTab === "documents" && (
        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FolderLock className="h-4 w-4 text-[var(--primary)]" />
                <span>Documentos e Atestados do Paciente</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Arquivos emitidos e compartilhados com <strong>{patient.fullName}</strong> com validade controlada
              </CardDescription>
            </div>
            <Button
              size="sm"
              className="gap-2 text-xs bg-[var(--button-bg,var(--primary))] hover:brightness-105 text-white cursor-pointer"
              onClick={() => setIsUploadDocModalOpen(true)}
            >
              <Upload className="h-4 w-4" />
              <span>Enviar documento</span>
            </Button>
          </CardHeader>

          <CardContent className="pt-6">
            {patient.fileShares.length > 0 ? (
              <div className="space-y-3">
                {patient.fileShares.map((share) => {
                  const now = new Date();
                  const isExpired = share.expiresAt ? new Date(share.expiresAt) < now : false;
                  const isRevoked = !share.canDownload || !!share.revokedAt;
                  const isLiberado = !isRevoked && !isExpired;

                  return (
                    <div
                      key={share.id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                            {share.file.title || share.file.originalName}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            ({share.file.originalName})
                          </span>

                          {isLiberado ? (
                            <Badge variant="success">Liberado</Badge>
                          ) : isRevoked ? (
                            <Badge variant="outline" className="border-amber-400 text-amber-700 dark:text-amber-300">
                              Acesso revogado
                            </Badge>
                          ) : (
                            <Badge variant="destructive">Expirado</Badge>
                          )}
                        </div>

                        {share.file.description && (
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            {share.file.description}
                          </p>
                        )}

                        <div className="text-slate-500 text-[11px] flex flex-wrap items-center gap-2 pt-0.5">
                          <span>Liberado em {formatDate(share.sharedAt)}</span>
                          <span>•</span>
                          <span>Tamanho: {(share.file.sizeBytes / 1024).toFixed(1)} KB</span>
                          <span>•</span>
                          <span>
                            {share.expiresAt
                              ? `Expira em: ${formatDate(share.expiresAt)}`
                              : "Sem expiração (Acesso permanente)"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <a
                          href={`/api/files/${share.file.id}/download?view=inline`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="outline" size="sm" className="h-7 text-xs gap-1 cursor-pointer">
                            <Eye className="h-3 w-3" />
                            <span>Visualizar</span>
                          </Button>
                        </a>

                        <a href={`/api/files/${share.file.id}/download`} download>
                          <Button variant="outline" size="sm" className="h-7 text-xs gap-1 cursor-pointer">
                            <Download className="h-3 w-3" />
                            <span>Baixar</span>
                          </Button>
                        </a>

                        {isLiberado ? (
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-7 text-xs cursor-pointer"
                            onClick={() => handleRevokeShare(share.id)}
                          >
                            Revogar acesso
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs text-[var(--primary)] border-[var(--primary)]/30 hover:bg-[var(--primary)]/10 cursor-pointer"
                            onClick={() => handleReactivateShare(share.id)}
                          >
                            Reativar (+30d)
                          </Button>
                        )}

                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-7 text-xs gap-1 cursor-pointer"
                          onClick={() => setDocToDelete(share.file)}
                          title="Excluir documento"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Excluir</span>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center text-slate-500 space-y-3">
                <FolderLock className="h-8 w-8 mx-auto text-slate-400" />
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Nenhum documento compartilhado com este paciente.
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Utilize o botão acima para enviar relatórios, atestados ou declarações diretamente para a Área do Paciente.
                  </p>
                </div>
                <Button
                  size="sm"
                  className="gap-2 text-xs bg-[var(--button-bg,var(--primary))] hover:brightness-105 text-white cursor-pointer mt-2"
                  onClick={() => setIsUploadDocModalOpen(true)}
                >
                  <Upload className="h-4 w-4" />
                  <span>Enviar primeiro documento</span>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 6. FINANCEIRO */}
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
                        {formatPaymentMethod(p.method)} • {formatDate(p.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {p.isSimulated && <Badge variant="simulated">Simulado</Badge>}
                      <Badge variant={p.status === "APPROVED" ? "success" : "warning"}>
                        {formatPaymentStatus(p.status)}
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
                      ? "border-[var(--primary)] bg-[var(--primary)]/10 font-bold text-[var(--primary)] ring-2 ring-[var(--primary)]/30"
                      : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <div className="text-base">{m.emoji}</div>
                  <div className="text-[11px] font-semibold mt-0.5">{m.val}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Modelos Rápidos */}
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-1.5">
              <Sparkles className="h-3.5 w-3.5 text-[var(--primary)]" />
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

          <div>
            <label className="text-xs font-semibold text-[#404040] dark:text-[#E5E5E5] block mb-2">
              Resumo Executivo da Sessão (Opcional):
            </label>
            <Input
              placeholder="Ex: Manejo de ansiedade e intervenções comportamentais."
              value={newSummary}
              onChange={(e) => setNewSummary(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#404040] dark:text-[#E5E5E5] block mb-2">
              Evolução e Anotações Clínicas da Sessão: *
            </label>
            <textarea
              className="flex min-h-[160px] w-full rounded-xl border border-[#E5E5E5] dark:border-[#333333] bg-white dark:bg-[#141414] p-3.5 text-xs text-[#171717] dark:text-[#F5F5F5] placeholder:text-[#737373] leading-relaxed outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] font-mono transition-all shadow-2xs"
              placeholder="Descreva as queixas, intervenções realizadas, tarefas e evolução do paciente..."
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E5E5] dark:border-[#333333]">
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
              className="bg-[var(--button-bg,var(--primary))] hover:brightness-105 text-white cursor-pointer"
              disabled={isSubmittingRecord}
            >
              {isSubmittingRecord ? "Salvando..." : "Gravar no Prontuário"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: EDITAR PRONTUÁRIO */}
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

          <div>
            <label className="text-xs font-semibold text-[#404040] dark:text-[#E5E5E5] block mb-2">
              Escala de Humor / Estado Geral:
            </label>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
              {moodScaleLabels.map((m) => (
                <button
                  key={m.val}
                  type="button"
                  onClick={() => setEditMood(m.val === editMood ? undefined : m.val)}
                  title={m.label}
                  className={`p-2 rounded-xl text-center border transition-all cursor-pointer ${
                    editMood === m.val
                      ? "border-[var(--primary)] bg-[var(--primary)]/10 font-bold text-[var(--primary)] ring-2 ring-[var(--primary)]/30"
                      : "border-[#E5E5E5] dark:border-[#333333] hover:bg-[#F5F5F5] dark:hover:bg-[#242424]"
                  }`}
                >
                  <div className="text-base">{m.emoji}</div>
                  <div className="text-[11px] font-semibold mt-0.5">{m.val}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#404040] dark:text-[#E5E5E5] block mb-2">
              Resumo da Sessão:
            </label>
            <Input
              value={editSummary}
              onChange={(e) => setEditSummary(e.target.value)}
              placeholder="Resumo sucinto da sessão..."
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#404040] dark:text-[#E5E5E5] block mb-2">
              Conteúdo do Prontuário Clínico: *
            </label>
            <textarea
              className="flex min-h-[180px] w-full rounded-xl border border-[#E5E5E5] dark:border-[#333333] bg-white dark:bg-[#141414] p-3.5 text-xs text-[#171717] dark:text-[#F5F5F5] leading-relaxed outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] font-mono transition-all shadow-2xs"
              value={editNoteContent}
              onChange={(e) => setEditNoteContent(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E5E5] dark:border-[#333333]">
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
              className="bg-[var(--button-bg,var(--primary))] hover:brightness-105 text-white cursor-pointer"
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

      {/* MODAL 4: ENVIAR DOCUMENTO (TASK 2) */}
      <Modal
        isOpen={isUploadDocModalOpen}
        onClose={() => setIsUploadDocModalOpen(false)}
        title="Enviar Documento ao Paciente"
        description={`Faça o upload de relatórios, atestados ou laudos para ${patient.fullName}.`}
        maxWidth="md"
      >
        <form onSubmit={handleUploadDocument} className="space-y-4 text-xs">
          <div className="space-y-2">
            <label className="font-semibold text-[#404040] dark:text-[#E5E5E5] block">
              Título do Documento (Opcional):
            </label>
            <Input
              placeholder="Ex: Atestado de Comparecimento, Relatório Clínico..."
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
            />
            <span className="text-[11px] text-[#737373] dark:text-[#A6A6A6] block">
              Se omitido, o nome original do arquivo será utilizado como título.
            </span>
          </div>

          <div className="space-y-2">
            <label className="font-semibold text-[#404040] dark:text-[#E5E5E5] block">
              Arquivo (.PDF, .JPG, .PNG, .WEBP): *
            </label>
            <input
              type="file"
              required
              accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
              onChange={(e) => setDocFile(e.target.files?.[0] || null)}
              className="flex h-10 w-full rounded-xl border border-[#E5E5E5] dark:border-[#333333] bg-white dark:bg-[#141414] px-3.5 py-2 text-xs text-[#171717] dark:text-[#F5F5F5] file:mr-3.5 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[var(--primary)]/10 file:text-[var(--primary)] hover:file:bg-[var(--primary)]/20 transition-all shadow-2xs"
            />
            <span className="text-[11px] text-[#737373] dark:text-[#A6A6A6] block">
              Tamanho máximo permitido: 25 MB.
            </span>
          </div>

          <div className="space-y-2">
            <label className="font-semibold text-[#404040] dark:text-[#E5E5E5] block">
              Descrição / Observações (Opcional):
            </label>
            <textarea
              rows={2}
              className="flex w-full rounded-xl border border-[#E5E5E5] dark:border-[#333333] bg-white dark:bg-[#141414] p-3 text-xs text-[#171717] dark:text-[#F5F5F5] placeholder:text-[#737373] focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] outline-none transition-all shadow-2xs"
              placeholder="Ex: Declaração para comprovação de presença em sessão psicológica."
              value={docDescription}
              onChange={(e) => setDocDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="font-semibold text-[#404040] dark:text-[#E5E5E5] block">
              Prazo de Expiração do Acesso:
            </label>
            <select
              className="flex h-10 w-full rounded-xl border border-[#E5E5E5] dark:border-[#333333] bg-white dark:bg-[#141414] px-3.5 py-2 text-xs text-[#171717] dark:text-[#F5F5F5] outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all shadow-2xs cursor-pointer"
              value={docShareDays}
              onChange={(e) => setDocShareDays(e.target.value)}
            >
              <option value="15">15 dias</option>
              <option value="30">30 dias (Padrão)</option>
              <option value="60">60 dias</option>
              <option value="90">90 dias</option>
              <option value="0">Sem expiração (Acesso permanente)</option>
            </select>
          </div>

          {/* Preview da data calculada de expiração (Task 2) */}
          <div className="p-3.5 bg-[var(--primary)]/10 border border-[var(--primary)]/20 rounded-xl text-[#171717] dark:text-[#F5F5F5] text-xs flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0 text-[var(--primary)]" />
            <span>
              <strong>Previsão de vigência:</strong> {getCalculatedExpirationText(docShareDays)}
            </span>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E5E5] dark:border-[#333333]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsUploadDocModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-[var(--button-bg,var(--primary))] hover:brightness-105 text-white cursor-pointer"
              disabled={isUploadingDoc || !docFile}
            >
              {isUploadingDoc ? "Enviando arquivo..." : "Enviar e Liberar ao Paciente"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 5: VISUALIZAR RESPOSTAS DA ANAMNESE (TASK 5) */}
      <Modal
        isOpen={isViewAnamnesisModalOpen}
        onClose={() => {
          setIsViewAnamnesisModalOpen(false);
          setSelectedSubmission(null);
        }}
        title="Respostas da Ficha de Anamnese"
        description={
          selectedSubmission
            ? `${selectedSubmission.template.title} — Paciente: ${patient.fullName}`
            : ""
        }
        maxWidth="lg"
      >
        <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1 text-xs">
          {selectedSubmission && (
            <>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-slate-500">Data de Envio: </span>
                  <strong className="text-slate-900 dark:text-slate-100">
                    {formatDate(selectedSubmission.createdAt)} às {formatTime(selectedSubmission.createdAt)}
                  </strong>
                </div>
                <div>
                  {getAnamnesisStatusBadge(selectedSubmission.status)}
                </div>
              </div>

              {/* Perguntas e Respostas */}
              <div className="space-y-3 pt-2">
                {(() => {
                  let questions: AnamnesisQuestion[] = [];
                  let answers: Record<string, any> = {};

                  try {
                    answers = JSON.parse(selectedSubmission.answersJson || "{}");
                  } catch (e) {
                    console.error("Erro ao analisar answersJson", e);
                  }

                  try {
                    questions = JSON.parse(selectedSubmission.template.fieldsJson || "[]");
                  } catch (e) {
                    console.error("Erro ao analisar fieldsJson", e);
                  }

                  // Se houver campos estruturados no template
                  if (questions.length > 0) {
                    return questions.map((q, idx) => {
                      const ans = answers[q.id];
                      const hasAnswer = ans !== undefined && ans !== null && String(ans).trim() !== "";

                      return (
                        <div
                          key={q.id || idx}
                          className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-1.5"
                        >
                          <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-start gap-1.5">
                            <span className="text-[var(--primary)] font-bold">{idx + 1}.</span>
                            <span>{q.label}</span>
                          </div>
                          <div className="pl-4 text-slate-700 dark:text-slate-300 leading-relaxed">
                            {hasAnswer ? (
                              <p className="whitespace-pre-wrap font-medium">{String(ans)}</p>
                            ) : (
                              <p className="italic text-slate-400">(Não respondido)</p>
                            )}
                          </div>
                        </div>
                      );
                    });
                  }

                  // Fallback para exibir chaves brutas de answersJson
                  return Object.entries(answers).map(([key, val], idx) => (
                    <div
                      key={key}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1"
                    >
                      <span className="font-semibold text-slate-700 dark:text-slate-300 capitalize">
                        {idx + 1}. {key}
                      </span>
                      <p className="pl-4 text-slate-900 dark:text-slate-100 whitespace-pre-wrap">
                        {String(val) || "(Não respondido)"}
                      </p>
                    </div>
                  ));
                })()}
              </div>
            </>
          )}

          <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setIsViewAnamnesisModalOpen(false);
                setSelectedSubmission(null);
              }}
            >
              Fechar
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 6: CONFIRMAÇÃO DE RESET DE ANAMNESE (TASK 6) */}
      <Modal
        isOpen={isResetAnamnesisModalOpen}
        onClose={() => setIsResetAnamnesisModalOpen(false)}
        title="Solicitar Novo Preenchimento de Anamnese"
        description="Reabrir formulário de anamnese para o paciente."
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-900 dark:text-amber-200 space-y-2">
            <div className="flex items-center gap-2 font-bold">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              <span>Atenção: Ação Administrativa Controlada</span>
            </div>
            <p>
              Você deseja solicitar que este paciente preencha uma nova ficha de anamnese? A ficha anterior será invalidada para uso ativo e preservada no histórico administrativo.
            </p>
            <p className="text-[11px] text-amber-800 dark:text-amber-300">
              O paciente receberá uma notificação em seu painel e o formulário em branco será liberado na aba de anamnese dele.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsResetAnamnesisModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
              disabled={isResettingAnamnesis}
              onClick={handleConfirmResetAnamnesis}
            >
              {isResettingAnamnesis ? "Solicitando..." : "Confirmar Solicitação"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de Exclusão de Documento */}
      <Modal
        isOpen={!!docToDelete}
        onClose={() => !isDeletingDoc && setDocToDelete(null)}
        title="Excluir Documento"
      >
        <div className="space-y-4 pt-1">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Tem certeza que deseja excluir este documento? Esta ação poderá ser irreversível.
          </p>

          {docToDelete && (
            <div className="p-3.5 bg-slate-100 dark:bg-[#1B1B1B] border border-slate-200 dark:border-[#393939] rounded-xl space-y-1">
              <div className="text-xs font-bold text-slate-900 dark:text-[#F5F5F5]">
                {docToDelete.title || docToDelete.originalName}
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                {docToDelete.originalName} • {(docToDelete.sizeBytes / 1024).toFixed(1)} KB
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-[#393939]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isDeletingDoc}
              onClick={() => setDocToDelete(null)}
            >
              Cancelar
            </Button>

            <Button
              type="button"
              variant="destructive"
              size="sm"
              isLoading={isDeletingDoc}
              onClick={confirmDeleteDocument}
              className="gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Excluir documento</span>
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de Exclusão / Arquivamento do Paciente */}
      <Modal
        isOpen={isDeletePatientModalOpen}
        onClose={() => !isProcessingPatient && setIsDeletePatientModalOpen(false)}
        title={deletionInfo?.hasProtectedRecords ? "Arquivar Paciente (Retenção Legal)" : "Excluir Paciente"}
      >
        <div className="space-y-4 pt-1">
          {isLoadingCheck ? (
            <div className="py-8 text-center text-xs text-slate-500">
              Verificando histórico clínico e dependências do paciente...
            </div>
          ) : deletionInfo ? (
            <>
              <div className="p-3 bg-slate-50 dark:bg-[#1B1B1B] border border-slate-200 dark:border-[#393939] rounded-xl space-y-1">
                <div className="font-bold text-sm text-slate-900 dark:text-[#F5F5F5]">
                  {patient.fullName}
                </div>
                <div className="text-xs text-slate-500">{patient.email}</div>
              </div>

              {/* Resumo de Dependências */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="p-2.5 rounded-lg border border-slate-200 dark:border-[#393939] bg-white dark:bg-[#202020]">
                  <div className="text-slate-500 text-[11px] flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    <span>Prontuários</span>
                  </div>
                  <div className="font-bold text-sm mt-0.5">{deletionInfo.dependencies.clinicalRecordsCount}</div>
                </div>

                <div className="p-2.5 rounded-lg border border-slate-200 dark:border-[#393939] bg-white dark:bg-[#202020]">
                  <div className="text-slate-500 text-[11px] flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>Consultas</span>
                  </div>
                  <div className="font-bold text-sm mt-0.5">{deletionInfo.dependencies.appointmentsCount}</div>
                </div>

                <div className="p-2.5 rounded-lg border border-slate-200 dark:border-[#393939] bg-white dark:bg-[#202020]">
                  <div className="text-slate-500 text-[11px] flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    <span>Pagamentos</span>
                  </div>
                  <div className="font-bold text-sm mt-0.5">{deletionInfo.dependencies.paymentsCount}</div>
                </div>
              </div>

              {deletionInfo.hasProtectedRecords ? (
                <div className="space-y-3">
                  <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl space-y-1.5 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      <span>Retenção Legal Obrigatória (CFP / CFM)</span>
                    </div>
                    <p>{deletionInfo.explanation}</p>
                    <p className="text-[11px] text-amber-800 dark:text-amber-300 pt-1 border-t border-amber-200/60 dark:border-amber-800/60">
                      O arquivamento desativa o acesso do paciente, revoga sessões ativas e o remove da listagem ativa, mantendo o histórico clínico e fiscal legalmente seguro.
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-[#393939]">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isProcessingPatient}
                      onClick={() => setIsDeletePatientModalOpen(false)}
                    >
                      Cancelar
                    </Button>

                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      isLoading={isProcessingPatient}
                      onClick={() => handleConfirmDeleteOrArchivePatient("ARCHIVE")}
                      className="gap-1.5"
                    >
                      <Archive className="h-3.5 w-3.5" />
                      <span>Arquivar Paciente</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {deletionInfo.explanation}
                  </p>

                  <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl space-y-2 text-xs">
                    <p className="text-red-800 dark:text-red-300 font-semibold">
                      Ação irreversível. Para confirmar a exclusão permanente deste paciente, digite <strong>EXCLUIR</strong> abaixo:
                    </p>
                    <Input
                      placeholder='Digite "EXCLUIR"'
                      value={confirmationInput}
                      onChange={(e) => setConfirmationInput(e.target.value)}
                      className="bg-white dark:bg-[#141414]"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-[#393939]">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isProcessingPatient}
                      onClick={() => setIsDeletePatientModalOpen(false)}
                    >
                      Cancelar
                    </Button>

                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      isLoading={isProcessingPatient}
                      disabled={confirmationInput.trim() !== "EXCLUIR"}
                      onClick={() => handleConfirmDeleteOrArchivePatient("PERMANENT")}
                      className="gap-1.5"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Excluir permanentemente</span>
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-4 text-center text-xs text-red-500">
              Não foi possível carregar as informações do paciente.
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
