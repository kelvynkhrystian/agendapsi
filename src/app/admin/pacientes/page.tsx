"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  ChevronRight,
  Trash2,
  Archive,
  RotateCcw,
  AlertTriangle,
  FileText,
  Calendar,
  DollarSign,
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

interface DeletionCheckResult {
  patient: {
    id: string;
    fullName: string;
    email: string;
  };
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
}

export default function AdminPatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ACTIVE" | "ARCHIVED" | "ALL">("ACTIVE");
  const [isLoading, setIsLoading] = useState(true);

  // Estados do Modal de Exclusão / Arquivamento
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [deletionInfo, setDeletionInfo] = useState<DeletionCheckResult | null>(null);
  const [isLoadingCheck, setIsLoadingCheck] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchPatients = () => {
    setIsLoading(true);
    fetch(`/api/patients?status=${statusFilter}&search=${encodeURIComponent(search)}`)
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
  }, [search, statusFilter]);

  // Abre modal e carrega verificação de dependências
  const handleOpenDeleteModal = async (e: React.MouseEvent, patient: Patient) => {
    e.preventDefault();
    e.stopPropagation();
    setPatientToDelete(patient);
    setDeletionInfo(null);
    setConfirmationInput("");
    setIsLoadingCheck(true);

    try {
      const res = await fetch(`/api/patients/${patient.id}/deletion-check`);
      if (res.ok) {
        const data = await res.json();
        setDeletionInfo(data);
      }
    } catch (err) {
      console.error("Erro ao verificar dependências do paciente:", err);
    } finally {
      setIsLoadingCheck(false);
    }
  };

  // Executa arquivamento ou exclusão permanente
  const handleConfirmAction = async (actionMode: "ARCHIVE" | "PERMANENT") => {
    if (!patientToDelete) return;
    setIsProcessing(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/patients/${patientToDelete.id}?action=${actionMode}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionMode }),
      });

      const data = await res.json();

      if (res.ok) {
        setFeedback({
          type: "success",
          message: data.message || "Operação realizada com sucesso.",
        });

        // Atualiza a lista na tela sem precisar recarregar
        if (actionMode === "PERMANENT") {
          setPatients((prev) => prev.filter((p) => p.id !== patientToDelete.id));
        } else if (actionMode === "ARCHIVE") {
          if (statusFilter === "ACTIVE") {
            setPatients((prev) => prev.filter((p) => p.id !== patientToDelete.id));
          } else {
            setPatients((prev) =>
              prev.map((p) => (p.id === patientToDelete.id ? { ...p, isActive: false } : p))
            );
          }
        }

        setPatientToDelete(null);
      } else {
        setFeedback({
          type: "error",
          message: data.error || "Não foi possível concluir a exclusão.",
        });
      }
    } catch {
      setFeedback({
        type: "error",
        message: "Erro de comunicação com o servidor ao excluir paciente.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Restaurar paciente arquivado
  const handleRestorePatient = async (e: React.MouseEvent, patientId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsLoading(true);
    try {
      const res = await fetch(`/api/patients/${patientId}?action=RESTORE`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({
          type: "success",
          message: data.message || "Paciente restaurado com sucesso.",
        });
        fetchPatients();
      } else {
        setFeedback({
          type: "error",
          message: data.error || "Erro ao restaurar paciente.",
        });
        setIsLoading(false);
      }
    } catch {
      setFeedback({
        type: "error",
        message: "Erro de comunicação ao restaurar paciente.",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#171717] dark:text-[#F5F5F5]">Gestão de Pacientes</h1>
          <p className="text-sm text-[#737373] dark:text-[#A6A6A6] mt-1">
            Acesse prontuários clínicos, histórico de sessões, documentos e cadastro de clientes.
          </p>
        </div>

        <Link href="/admin/pacientes/novo">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            <span>Cadastrar Paciente</span>
          </Button>
        </Link>
      </div>

      {feedback && (
        <Alert
          variant={feedback.type === "success" ? "success" : "destructive"}
        >
          {feedback.message}
        </Alert>
      )}

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="max-w-md flex-1">
          <Input
            placeholder="Buscar por nome, e-mail ou telefone..."
            leftIcon={<Search className="h-4 w-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          {[
            { id: "ACTIVE", label: "Ativos" },
            { id: "ARCHIVED", label: "Arquivados" },
            { id: "ALL", label: "Todos" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id as typeof statusFilter)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer select-none ${
                statusFilter === tab.id
                  ? "bg-[var(--primary)] text-white shadow-xs"
                  : "bg-white dark:bg-[#202020] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#393939] hover:bg-slate-50 dark:hover:bg-[#292929]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Pacientes */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-[#E5E5E5] dark:bg-[#242424] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : patients.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {patients.map((patient) => (
            <div key={patient.id} className="relative group">
              <Link href={`/admin/pacientes/${patient.id}`}>
                <Card className="hover:border-[var(--primary)] transition-all cursor-pointer h-full">
                  <CardHeader className="flex flex-row items-start justify-between pb-3">
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
                            Arquivado / Inativo
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-xs mt-1">
                        Cadastrado em {formatDate(patient.createdAt)}
                      </CardDescription>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Botão de Excluir / Arquivar */}
                      <button
                        type="button"
                        onClick={(e) => handleOpenDeleteModal(e, patient)}
                        title="Excluir ou arquivar cliente"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>

                      {/* Botão de Restaurar se inativo */}
                      {!patient.isActive && (
                        <button
                          type="button"
                          onClick={(e) => handleRestorePatient(e, patient.id)}
                          title="Restaurar paciente ativo"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors cursor-pointer"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      )}

                      <ChevronRight className="h-4 w-4 text-[#737373] dark:text-[#A6A6A6]" />
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-2.5 pt-0 text-xs">
                    <div className="flex items-center gap-2 text-[#525252] dark:text-[#A6A6A6]">
                      <Phone className="h-3.5 w-3.5 text-[var(--primary)]" />
                      <span>{patient.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#525252] dark:text-[#A6A6A6]">
                      <Mail className="h-3.5 w-3.5 text-[var(--primary)]" />
                      <span>{patient.email}</span>
                    </div>

                    {patient.isMinor && patient.guardians.length > 0 && (
                      <div className="pt-2.5 border-t border-[#E5E5E5] dark:border-[#333333] text-[11px] text-amber-700 dark:text-amber-400">
                        Responsável: <strong>{patient.guardians[0].fullName}</strong> ({patient.guardians[0].relationship})
                      </div>
                    )}

                    <div className="flex items-center gap-4 pt-2.5 border-t border-[#E5E5E5] dark:border-[#333333] text-[11px] font-medium text-[#737373] dark:text-[#A6A6A6]">
                      <span>{patient._count.appointments} consulta(s)</span>
                      <span>{patient._count.clinicalRecords} nota(s) de prontuário</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center text-[#737373] dark:text-[#A6A6A6]">
          <Users className="h-10 w-10 mx-auto text-[#737373] dark:text-[#A6A6A6] mb-3" />
          <p className="font-medium text-[#171717] dark:text-[#F5F5F5]">Nenhum paciente encontrado.</p>
          <p className="text-xs text-[#737373] dark:text-[#A6A6A6] mt-1">
            {statusFilter === "ARCHIVED"
              ? "Não existem pacientes arquivados no momento."
              : "Cadastre um novo paciente manualmente ou aguarde novos agendamentos públicos."}
          </p>
        </Card>
      )}

      {/* Modal de Exclusão / Arquivamento de Paciente */}
      <Modal
        isOpen={!!patientToDelete}
        onClose={() => !isProcessing && setPatientToDelete(null)}
        title={deletionInfo?.hasProtectedRecords ? "Arquivar Paciente (Retenção Legal)" : "Excluir Paciente"}
      >
        <div className="space-y-4 pt-1">
          {isLoadingCheck ? (
            <div className="py-8 text-center text-xs text-slate-500">
              Verificando histórico clínico e dependências do paciente...
            </div>
          ) : deletionInfo ? (
            <>
              {/* Identificação do Paciente */}
              <div className="p-3 bg-slate-50 dark:bg-[#1B1B1B] border border-slate-200 dark:border-[#393939] rounded-xl space-y-1">
                <div className="font-bold text-sm text-slate-900 dark:text-[#F5F5F5]">
                  {deletionInfo.patient.fullName}
                </div>
                <div className="text-xs text-slate-500">{deletionInfo.patient.email}</div>
              </div>

              {/* Resumo de Dependências */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
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

              {/* CENÁRIO 1: Paciente possui registros protegidos */}
              {deletionInfo.hasProtectedRecords ? (
                <div className="space-y-3">
                  <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl space-y-1.5 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      <span>Retenção Legal Obrigatória (CFP / CFM)</span>
                    </div>
                    <p>{deletionInfo.explanation}</p>
                    <p className="text-[11px] text-amber-800 dark:text-amber-300 pt-1 border-t border-amber-200/60 dark:border-amber-800/60">
                      O arquivamento desativa o acesso do paciente, revoga sessões e o remove da listagem ativa, mantendo o histórico de prontuário e fiscal legalmente seguro.
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-[#393939]">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isProcessing}
                      onClick={() => setPatientToDelete(null)}
                    >
                      Cancelar
                    </Button>

                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      isLoading={isProcessing}
                      onClick={() => handleConfirmAction("ARCHIVE")}
                      className="gap-1.5"
                    >
                      <Archive className="h-3.5 w-3.5" />
                      <span>Arquivar Paciente</span>
                    </Button>
                  </div>
                </div>
              ) : (
                /* CENÁRIO 2: Paciente sem dependências protegidas - Exclusão Permanente Permitida */
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
                      disabled={isProcessing}
                      onClick={() => setPatientToDelete(null)}
                    >
                      Cancelar
                    </Button>

                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      isLoading={isProcessing}
                      disabled={confirmationInput.trim() !== "EXCLUIR"}
                      onClick={() => handleConfirmAction("PERMANENT")}
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
