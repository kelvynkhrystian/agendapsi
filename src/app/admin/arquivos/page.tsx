"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { formatDateTime, formatBackupStatus } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  HardDrive,
  Download,
  Upload,
  RotateCcw,
  Trash2,
  FolderLock,
  Database,
  ShieldCheck,
  AlertTriangle,
  Archive,
  RefreshCw,
  CheckCircle2,
  FileArchive,
  KeyRound,
} from "lucide-react";

interface BackupJobItem {
  id: string;
  filename: string;
  sizeBytes: number;
  realSizeBytes: number;
  checksumSha256: string;
  status: string;
  createdAt: string;
  isLegacy: boolean;
  restorable: boolean;
  restorableReason: string | null;
  fileExists: boolean;
  formatLabel: string;
  metadata?: {
    format?: string;
    appVersion?: string;
    migrationVersion?: string | null;
    categories?: string[];
    fileCount?: number;
    patientCount?: number;
    appointmentCount?: number;
    recordCount?: number;
    backupType?: string;
    origin?: string;
  };
}

interface StorageStatsOverview {
  fileCount: number;
  totalBytes: number;
  storedFileRecordsCount: number;
  breakdown?: {
    privateUploads: { count: number; bytes: number };
    minisiteMedia: { count: number; bytes: number };
    publicUploads: { count: number; bytes: number };
    backups: { count: number; bytes: number };
  };
}

interface RestorePreviewData {
  backupJob: BackupJobItem;
  manifest: {
    format: string;
    formatVersion: string;
    appVersion: string;
    migrationVersion: string | null;
    createdAt: string;
    installationId: string;
    backupType: string;
    categories: string[];
    fileCount: number;
    totalUncompressedBytes: number;
  };
  compatibility: {
    compatible: boolean;
    notes: string[];
    missingOptionalTables: string[];
  };
  environmentChecks: {
    databaseConnected: boolean;
    storageWritable: boolean;
    availableDiskBytes: number | null;
    requiredDiskBytes: number;
    hasSufficientDiskSpace: boolean;
  };
  affectedCounts: {
    patients: number;
    appointments: number;
    clinicalRecords: number;
    payments: number;
    services: number;
    storedFiles: number;
    uploadedFilesOnDisk: number;
  };
  reconfigureSecretsChecklist: string[];
}

interface RestoreResultData {
  success: true;
  restoredFromBackupId: string;
  restoredFromFilename: string;
  safetySnapshot: {
    id: string;
    filename: string;
    sizeBytes: number;
  };
  verification: {
    verifiedAt: string;
    patientCount: number;
    appointmentCount: number;
    clinicalRecordCount: number;
    storedFileCount: number;
    restoredDiskFileCount: number;
    integrityChecksPassed: boolean;
  };
  reconfigureSecretsChecklist: string[];
}

function formatBytesHuman(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function getBackupStatusBadgeVariant(status: string): "success" | "warning" | "destructive" | "secondary" {
  switch (status) {
    case "COMPLETED":
    case "SUCCESS":
      return "success";
    case "FAILED":
      return "destructive";
    case "PROCESSING":
    case "RESTORING":
    case "PENDING":
      return "warning";
    default:
      return "secondary";
  }
}

export default function AdminStoragePage() {
  const [backups, setBackups] = useState<BackupJobItem[]>([]);
  const [storageStats, setStorageStats] = useState<StorageStatsOverview>({
    fileCount: 0,
    totalBytes: 0,
    storedFileRecordsCount: 0,
  });
  const [restoreInProgress, setRestoreInProgress] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingBackup, setIsGeneratingBackup] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Estado do modal de exclusão segura
  const [deleteTarget, setDeleteTarget] = useState<BackupJobItem | null>(null);
  const [isDeletingBackup, setIsDeletingBackup] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Estado do modal de importação
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedImportFile, setSelectedImportFile] = useState<File | null>(null);
  const [isImportingBackup, setIsImportingBackup] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importedSummary, setImportedSummary] = useState<{
    backup: BackupJobItem;
    preview: RestorePreviewData;
  } | null>(null);
  const importFileInputRef = useRef<HTMLInputElement | null>(null);

  // Estado do modal de restauração (Fases A - E)
  const [restoreTarget, setRestoreTarget] = useState<BackupJobItem | null>(null);
  const [restorePreview, setRestorePreview] = useState<RestorePreviewData | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [restorePreviewError, setRestorePreviewError] = useState<string | null>(null);
  const [restoreConfirmInput, setRestoreConfirmInput] = useState("");
  const [isExecutingRestore, setIsExecutingRestore] = useState(false);
  const [restoreExecuteError, setRestoreExecuteError] = useState<string | null>(null);
  const [restoreSuccessResult, setRestoreSuccessResult] = useState<RestoreResultData | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/backup", { cache: "no-store" });
      const data = await res.json();
      if (res.ok && data) {
        if (Array.isArray(data)) {
          setBackups(data);
        } else {
          setBackups(Array.isArray(data.backups) ? data.backups : []);
          if (data.storageStats) setStorageStats(data.storageStats);
          setRestoreInProgress(Boolean(data.restoreInProgress));
        }
      } else {
        setFeedback({
          type: "error",
          message: data?.error || "Não foi possível carregar o histórico de backups.",
        });
      }
    } catch {
      setFeedback({
        type: "error",
        message: "Erro de conexão ao consultar armazenamento e backups.",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleGenerateBackup = async () => {
    setIsGeneratingBackup(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/admin/backup", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setFeedback({
          type: "success",
          message: data?.message || "Backup completo (.zip) gerado com sucesso.",
        });
        await fetchData();
      } else {
        setFeedback({
          type: "error",
          message: data?.error || "Não foi possível gerar o backup completo.",
        });
      }
    } catch {
      setFeedback({
        type: "error",
        message: "Erro inesperado ao gerar o backup completo.",
      });
    } finally {
      setIsGeneratingBackup(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeletingBackup(true);
    setDeleteError(null);
    setFeedback(null);

    try {
      const res = await fetch(`/api/admin/backup/${encodeURIComponent(deleteTarget.id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({
          type: "success",
          message: data?.message || "Backup excluído com sucesso.",
        });
        setDeleteTarget(null);
        await fetchData();
      } else {
        setDeleteError(data?.error || "Falha ao excluir o arquivo de backup.");
      }
    } catch {
      setDeleteError("Erro de comunicação ao tentar excluir o backup.");
    } finally {
      setIsDeletingBackup(false);
    }
  };

  const openImportModal = () => {
    setSelectedImportFile(null);
    setImportError(null);
    setImportedSummary(null);
    setIsImportModalOpen(true);
  };

  const closeImportModal = () => {
    if (isImportingBackup) return;
    setIsImportModalOpen(false);
    setSelectedImportFile(null);
    setImportError(null);
    setImportedSummary(null);
  };

  const handleUploadImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedImportFile) {
      setImportError("Selecione um arquivo .zip de backup do PSI para enviar.");
      return;
    }

    if (selectedImportFile.size > 512 * 1024 * 1024) {
      setImportError("O arquivo selecionado excede o limite máximo permitido de 512 MB.");
      return;
    }

    setIsImportingBackup(true);
    setImportError(null);
    setFeedback(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedImportFile);

      const res = await fetch("/api/admin/backup/import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setImportError(data?.error || "Não foi possível validar o arquivo de backup enviado.");
        return;
      }

      setImportedSummary({
        backup: data.backup,
        preview: data.preview,
      });
      await fetchData();
    } catch {
      setImportError("Erro de conexão ao enviar o arquivo de backup para validação.");
    } finally {
      setIsImportingBackup(false);
    }
  };

  const openRestoreModal = useCallback(
    async (backup: BackupJobItem, preloadedPreview?: RestorePreviewData) => {
      setRestoreTarget(backup);
      setRestoreConfirmInput("");
      setRestoreExecuteError(null);
      setRestorePreviewError(null);
      setRestoreSuccessResult(null);

      if (preloadedPreview) {
        setRestorePreview(preloadedPreview);
        setIsLoadingPreview(false);
        return;
      }

      setRestorePreview(null);
      setIsLoadingPreview(true);

      try {
        const res = await fetch(`/api/admin/backup/${encodeURIComponent(backup.id)}/restore`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok) {
          setRestorePreviewError(
            data?.error || "Não foi possível validar o pacote de backup para restauração."
          );
          return;
        }
        setRestorePreview(data.preview);
      } catch {
        setRestorePreviewError("Erro de comunicação durante a inspeção pré-restauração.");
      } finally {
        setIsLoadingPreview(false);
      }
    },
    []
  );

  const closeRestoreModal = () => {
    if (isExecutingRestore) return;
    setRestoreTarget(null);
    setRestorePreview(null);
    setRestorePreviewError(null);
    setRestoreExecuteError(null);
    setRestoreConfirmInput("");
    setRestoreSuccessResult(null);
  };

  const handleProceedImportedToRestore = () => {
    if (!importedSummary) return;
    const { backup, preview } = importedSummary;
    setIsImportModalOpen(false);
    setSelectedImportFile(null);
    setImportError(null);
    setImportedSummary(null);
    void openRestoreModal(backup, preview);
  };

  const handleExecuteRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restoreTarget) return;
    if (restoreConfirmInput.trim() !== "RESTAURAR") {
      setRestoreExecuteError("Digite exatamente RESTAURAR em letras maiúsculas para confirmar.");
      return;
    }

    setIsExecutingRestore(true);
    setRestoreExecuteError(null);
    setFeedback(null);

    try {
      const res = await fetch(`/api/admin/backup/${encodeURIComponent(restoreTarget.id)}/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: restoreConfirmInput.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setRestoreExecuteError(
          data?.error || "A restauração falhou e o sistema tentou preservar o estado anterior."
        );
        await fetchData();
        return;
      }

      setRestoreSuccessResult(data.result);
      setFeedback({
        type: "success",
        message: "Sistema restaurado com sucesso a partir do backup selecionado.",
      });
      await fetchData();
    } catch {
      setRestoreExecuteError("Erro de conexão durante a restauração. Verifique o histórico de backups.");
      await fetchData();
    } finally {
      setIsExecutingRestore(false);
    }
  };

  const privateCount = storageStats.breakdown?.privateUploads.count ?? storageStats.storedFileRecordsCount;
  const mediaCount =
    (storageStats.breakdown?.minisiteMedia.count ?? 0) +
    (storageStats.breakdown?.publicUploads.count ?? 0);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#171717] dark:text-[#F5F5F5]">
            Backup & Armazenamento
          </h1>
          <p className="text-sm text-[#737373] dark:text-[#A6A6A6]">
            Geração, importação e restauração controlada de pacotes portáteis em .zip com banco de dados, documentos privados e mídias do Site.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={isLoading || isGeneratingBackup || isExecutingRestore}
            className="gap-1.5 text-xs"
            title="Atualizar listagem de backups e armazenamento"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Atualizar</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={openImportModal}
            disabled={restoreInProgress || isGeneratingBackup || isExecutingRestore}
            className="gap-1.5 text-xs"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Importar Backup</span>
          </Button>
          <Button
            onClick={handleGenerateBackup}
            isLoading={isGeneratingBackup}
            disabled={restoreInProgress || isExecutingRestore}
            className="gap-1.5 text-xs"
          >
            <Database className="h-3.5 w-3.5" />
            <span>Gerar Novo Backup</span>
          </Button>
        </div>
      </div>

      {restoreInProgress && (
        <Alert variant="warning">
          Uma restauração de sistema está em andamento. Operações de escrita permanecem bloqueadas até a conclusão.
        </Alert>
      )}

      {feedback && (
        <Alert variant={feedback.type === "success" ? "success" : "destructive"}>
          {feedback.message}
        </Alert>
      )}

      {/* Cards de Métricas de Armazenamento */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#737373] dark:text-[#A6A6A6]">
              Total de Arquivos
            </CardTitle>
            <FolderLock className="h-4 w-4 text-[var(--primary)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-[#171717] dark:text-[#F5F5F5]">
              {storageStats.fileCount}
            </div>
            <p className="text-xs text-[#737373] dark:text-[#A6A6A6] mt-1">
              {privateCount} doc(s) privados • {mediaCount} mídia(s) e ícones do Site
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#737373] dark:text-[#A6A6A6]">
              Espaço Ocupado
            </CardTitle>
            <HardDrive className="h-4 w-4 text-[var(--primary)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-[#171717] dark:text-[#F5F5F5]">
              {formatBytesHuman(storageStats.totalBytes)}
            </div>
            <p className="text-xs text-[#737373] dark:text-[#A6A6A6] mt-1">
              Dados persistentes em armazenamento privado e mídias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#737373] dark:text-[#A6A6A6]">
              Backups Registrados
            </CardTitle>
            <Archive className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-[#171717] dark:text-[#F5F5F5]">
              {backups.length}
            </div>
            <p className="text-xs text-[#737373] dark:text-[#A6A6A6] mt-1">
              Armazenados fora da pasta pública com hash SHA-256
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Histórico de Backups */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de Backups do Consultório</CardTitle>
          <CardDescription className="text-xs">
            Pacotes completos em .zip permitem recuperação integral do banco e dos arquivos enviados; arquivos legados .json servem apenas como manifesto histórico.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-[#737373] dark:text-[#A6A6A6]">
              Carregando histórico de backups...
            </div>
          ) : backups.length > 0 ? (
            <div className="divide-y divide-[#E5E5E5] dark:divide-[#2C2C2C]">
              {backups.map((b) => {
                const canRestore =
                  b.restorable &&
                  !b.isLegacy &&
                  !restoreInProgress &&
                  b.status !== "RESTORING" &&
                  !isExecutingRestore;

                return (
                  <div
                    key={b.id}
                    className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs"
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm font-mono text-[#171717] dark:text-[#F5F5F5] break-all">
                          {b.filename}
                        </span>
                        <Badge variant={getBackupStatusBadgeVariant(b.status)} size="sm">
                          {formatBackupStatus(b.status)}
                        </Badge>
                        {b.isLegacy ? (
                          <Badge variant="warning" size="sm" title={b.restorableReason || undefined}>
                            Legado • Somente Manifesto
                          </Badge>
                        ) : (
                          <Badge variant="default" size="sm">
                            {b.formatLabel}
                          </Badge>
                        )}
                        {!b.fileExists && (
                          <Badge variant="destructive" size="sm">
                            Arquivo ausente no disco
                          </Badge>
                        )}
                      </div>

                      <div className="text-[#737373] dark:text-[#A6A6A6] flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px]">
                        <span>Criado em: {formatDateTime(b.createdAt)}</span>
                        <span>•</span>
                        <span>Tamanho: {formatBytesHuman(b.realSizeBytes || b.sizeBytes)}</span>
                        <span>•</span>
                        <span className="font-mono text-[10px]">
                          SHA-256: {b.checksumSha256.slice(0, 16)}...
                        </span>
                        {typeof b.metadata?.fileCount === "number" && (
                          <>
                            <span>•</span>
                            <span>{b.metadata.fileCount} arquivo(s) enviado(s)</span>
                          </>
                        )}
                        {typeof b.metadata?.patientCount === "number" && (
                          <>
                            <span>•</span>
                            <span>{b.metadata.patientCount} paciente(s)</span>
                          </>
                        )}
                      </div>

                      {b.isLegacy && b.restorableReason && (
                        <p className="text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1.5 pt-0.5">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          <span>{b.restorableReason}</span>
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {b.fileExists ? (
                        <a
                          href={`/api/admin/backup/${encodeURIComponent(b.id)}/download`}
                          download={b.filename}
                          title="Baixar Backup"
                          aria-label={`Baixar Backup ${b.filename}`}
                          className="inline-flex items-center justify-center gap-1.5 font-heading font-semibold text-xs px-3.5 py-1.5 min-h-[36px] rounded-xl border border-[var(--primary)]/30 dark:border-[#333333] bg-[var(--button-outline-bg,#ffffff)] dark:bg-[#1E1E1E] hover:border-[var(--primary)]/60 hover:bg-[var(--primary)]/[0.04] dark:hover:bg-[#262626] text-[var(--button-outline-fg,var(--button-bg,var(--primary)))] dark:text-[#F5F5F5] transition-all shadow-2xs"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Baixar</span>
                        </a>
                      ) : (
                        <Button variant="outline" size="sm" disabled title="Arquivo ausente em disco">
                          <Download className="h-3.5 w-3.5" />
                          <span>Baixar</span>
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openRestoreModal(b)}
                        disabled={!canRestore}
                        title={
                          b.restorableReason ||
                          (restoreInProgress
                            ? "Aguarde a restauração atual finalizar"
                            : "Validar e iniciar restauração controlada deste backup")
                        }
                        aria-label={`Restaurar backup ${b.filename}`}
                        className="text-xs"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Restaurar</span>
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDeleteError(null);
                          setDeleteTarget(b);
                        }}
                        disabled={restoreInProgress || b.status === "RESTORING" || isExecutingRestore}
                        className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 dark:text-red-400 dark:border-red-500/30 dark:hover:bg-red-950/30 text-xs"
                        aria-label={`Excluir backup ${b.filename}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Excluir</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-[#737373] dark:text-[#A6A6A6]">
              Nenhum backup gerado até o momento. Clique em &quot;Gerar Novo Backup&quot; ou &quot;Importar Backup&quot;.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardContent className="p-4 flex items-start gap-3 text-xs text-[#525252] dark:text-[#A6A6A6]">
          <ShieldCheck className="h-4 w-4 text-[var(--primary)] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-[#171717] dark:text-[#F5F5F5]">
              Segurança, Integridade e Higienização de Credenciais
            </p>
            <p className="leading-relaxed">
              Os pacotes <code className="font-mono">.zip</code> ficam isolados fora do acesso público da web, validados por assinatura SHA-256 sem execução de scripts externos. Senhas SMTP, tokens do WhatsApp, segredos OAuth do Google Meet, credenciais criptografadas de gateways e variáveis de ambiente (<code className="font-mono">.env</code>) não são exportados nos arquivos portáteis.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Modal: Importar Backup */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={closeImportModal}
        title="Importar Backup"
        description="Envie um pacote .zip completo gerado anteriormente pelo PSI para validar sua integridade e compatibilidade."
        maxWidth="lg"
      >
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {!importedSummary ? (
            <form onSubmit={handleUploadImport} className="space-y-4">
              {importError && <Alert variant="destructive">{importError}</Alert>}

              <div className="rounded-xl border border-dashed border-[#D4D4D4] dark:border-[#393939] bg-[#F8F8F8] dark:bg-[#191919] p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <FileArchive className="h-5 w-5 text-[var(--primary)] shrink-0 mt-0.5" />
                  <div className="space-y-1 text-xs">
                    <p className="font-semibold text-[#171717] dark:text-[#F5F5F5]">
                      Selecione o arquivo de backup (.zip)
                    </p>
                    <p className="text-[#737373] dark:text-[#A6A6A6] leading-relaxed">
                      Apenas a estrutura oficial <code className="font-mono">psi-backup-v1</code> com manifesto e checksums SHA-256 será aceita. Nenhum dado atual será alterado durante a importação.
                    </p>
                  </div>
                </div>

                <input
                  ref={importFileInputRef}
                  type="file"
                  accept=".zip,application/zip,application/x-zip-compressed"
                  disabled={isImportingBackup}
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setSelectedImportFile(file);
                    setImportError(null);
                  }}
                  aria-label="Selecionar arquivo de backup .zip"
                  className="block w-full text-xs text-[#525252] dark:text-[#D0D0D0] file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border file:border-[#E5E5E5] dark:file:border-[#393939] file:text-xs file:font-semibold file:bg-white dark:file:bg-[#242424] file:text-[#171717] dark:file:text-[#F5F5F5] hover:file:bg-[#F2F2F2] dark:hover:file:bg-[#2C2C2C] cursor-pointer"
                />

                {selectedImportFile && (
                  <p className="text-xs text-[#525252] dark:text-[#A6A6A6]">
                    Selecionado:{" "}
                    <span className="font-mono font-semibold text-[#171717] dark:text-[#F5F5F5]">
                      {selectedImportFile.name}
                    </span>{" "}
                    ({formatBytesHuman(selectedImportFile.size)})
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeImportModal}
                  disabled={isImportingBackup}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  isLoading={isImportingBackup}
                  disabled={!selectedImportFile}
                >
                  <Upload className="h-4 w-4" />
                  <span>Validar e Importar</span>
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <Alert variant="success">
                Pacote de backup validado e importado com sucesso para o histórico. Nenhuma alteração foi aplicada ao sistema ainda.
              </Alert>

              <div className="rounded-xl border border-[#E5E5E5] dark:border-[#333333] bg-[#F8F8F8] dark:bg-[#191919] p-4 space-y-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono font-semibold text-[#171717] dark:text-[#F5F5F5] break-all">
                    {importedSummary.backup.filename}
                  </span>
                  <Badge variant="success" size="sm">
                    SHA-256 Verificado
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-[#525252] dark:text-[#A6A6A6]">
                  <div>
                    <span className="block text-[11px]">Data do Snapshot</span>
                    <strong className="text-[#171717] dark:text-[#F5F5F5]">
                      {formatDateTime(importedSummary.preview.manifest.createdAt)}
                    </strong>
                  </div>
                  <div>
                    <span className="block text-[11px]">Versão do PSI</span>
                    <strong className="text-[#171717] dark:text-[#F5F5F5]">
                      {importedSummary.preview.manifest.appVersion}
                    </strong>
                  </div>
                  <div>
                    <span className="block text-[11px]">Arquivos Enviados</span>
                    <strong className="text-[#171717] dark:text-[#F5F5F5]">
                      {importedSummary.preview.affectedCounts.uploadedFilesOnDisk}
                    </strong>
                  </div>
                  <div>
                    <span className="block text-[11px]">Pacientes</span>
                    <strong className="text-[#171717] dark:text-[#F5F5F5]">
                      {importedSummary.preview.affectedCounts.patients}
                    </strong>
                  </div>
                  <div>
                    <span className="block text-[11px]">Consultas</span>
                    <strong className="text-[#171717] dark:text-[#F5F5F5]">
                      {importedSummary.preview.affectedCounts.appointments}
                    </strong>
                  </div>
                  <div>
                    <span className="block text-[11px]">Prontuários</span>
                    <strong className="text-[#171717] dark:text-[#F5F5F5]">
                      {importedSummary.preview.affectedCounts.clinicalRecords}
                    </strong>
                  </div>
                </div>

                {importedSummary.preview.manifest.categories.length > 0 && (
                  <div className="pt-1 border-t border-[#E5E5E5] dark:border-[#2C2C2C]">
                    <span className="block text-[11px] text-[#737373] dark:text-[#A6A6A6] mb-1.5">
                      Categorias incluídas:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {importedSummary.preview.manifest.categories.map((cat) => (
                        <Badge key={cat} variant="secondary" size="sm">
                          {cat}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
                <Button type="button" variant="outline" onClick={closeImportModal}>
                  Manter apenas no histórico
                </Button>
                <Button type="button" onClick={handleProceedImportedToRestore}>
                  <RotateCcw className="h-4 w-4" />
                  <span>Restaurar Backup</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal: Restaurar Backup (Fases A - E) */}
      <Modal
        isOpen={Boolean(restoreTarget)}
        onClose={closeRestoreModal}
        title="Restaurar Backup"
        maxWidth="lg"
      >
        {restoreTarget && (
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            {isLoadingPreview ? (
              <div className="p-6 text-center space-y-2 text-xs text-[#737373] dark:text-[#A6A6A6]">
                <RefreshCw className="h-5 w-5 animate-spin mx-auto text-[var(--primary)]" />
                <p>
                  Fase A — Verificando integridade SHA-256, compatibilidade do esquema e espaço em disco...
                </p>
              </div>
            ) : restorePreviewError ? (
              <div className="space-y-4">
                <Alert variant="destructive">{restorePreviewError}</Alert>
                <div className="flex justify-end">
                  <Button variant="outline" onClick={closeRestoreModal}>
                    Fechar
                  </Button>
                </div>
              </div>
            ) : restoreSuccessResult ? (
              <div className="space-y-4">
                <Alert variant="success">
                  Restauração concluída e verificada com sucesso. Todos os vínculos relacionais e arquivos em disco foram conferidos.
                </Alert>

                <div className="rounded-xl border border-[#E5E5E5] dark:border-[#333333] bg-[#F8F8F8] dark:bg-[#191919] p-4 space-y-3 text-xs">
                  <div className="flex items-center gap-2 font-semibold text-[#171717] dark:text-[#F5F5F5]">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Verificação Final (Fase E)</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-[#525252] dark:text-[#A6A6A6]">
                    <div>
                      <span className="block text-[11px]">Pacientes restaurados</span>
                      <strong className="text-[#171717] dark:text-[#F5F5F5]">
                        {restoreSuccessResult.verification.patientCount}
                      </strong>
                    </div>
                    <div>
                      <span className="block text-[11px]">Consultas restauradas</span>
                      <strong className="text-[#171717] dark:text-[#F5F5F5]">
                        {restoreSuccessResult.verification.appointmentCount}
                      </strong>
                    </div>
                    <div>
                      <span className="block text-[11px]">Prontuários</span>
                      <strong className="text-[#171717] dark:text-[#F5F5F5]">
                        {restoreSuccessResult.verification.clinicalRecordCount}
                      </strong>
                    </div>
                    <div>
                      <span className="block text-[11px]">Documentos vinculados</span>
                      <strong className="text-[#171717] dark:text-[#F5F5F5]">
                        {restoreSuccessResult.verification.storedFileCount}
                      </strong>
                    </div>
                    <div>
                      <span className="block text-[11px]">Arquivos em disco</span>
                      <strong className="text-[#171717] dark:text-[#F5F5F5]">
                        {restoreSuccessResult.verification.restoredDiskFileCount}
                      </strong>
                    </div>
                  </div>

                  <p className="text-[11px] text-[#737373] dark:text-[#A6A6A6] pt-1 border-t border-[#E5E5E5] dark:border-[#2C2C2C]">
                    Snapshot de segurança pré-restauração salvo em:{" "}
                    <span className="font-mono text-[#171717] dark:text-[#F5F5F5]">
                      {restoreSuccessResult.safetySnapshot.filename}
                    </span>
                  </p>
                </div>

                {restoreSuccessResult.reconfigureSecretsChecklist.length > 0 && (
                  <div className="rounded-xl border border-amber-200 dark:border-[#524020] bg-amber-50/70 dark:bg-[#202020] p-3.5 space-y-2 text-xs">
                    <div className="flex items-center gap-2 font-semibold text-amber-900 dark:text-[#F5D8A0]">
                      <KeyRound className="h-4 w-4 shrink-0" />
                      <span>Segredos que exigem reconfiguração manual</span>
                    </div>
                    <ul className="list-disc pl-4 space-y-1 text-[11px] text-amber-900/90 dark:text-[#E5C98E]">
                      {restoreSuccessResult.reconfigureSecretsChecklist.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <Button onClick={closeRestoreModal}>Concluir</Button>
                </div>
              </div>
            ) : restorePreview ? (
              <form onSubmit={handleExecuteRestore} className="space-y-4">
                <Alert variant="warning">
                  Restaurar este backup substituirá os dados atuais desta instalação pelos dados presentes na cópia de segurança.
                </Alert>

                {restoreExecuteError && (
                  <Alert variant="destructive">{restoreExecuteError}</Alert>
                )}

                <div className="rounded-xl border border-[#E5E5E5] dark:border-[#333333] bg-[#F8F8F8] dark:bg-[#191919] p-4 space-y-3 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono font-semibold text-[#171717] dark:text-[#F5F5F5] break-all">
                      {restorePreview.backupJob.filename}
                    </span>
                    <Badge variant="success" size="sm">
                      Pronto para Restauração
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-[#525252] dark:text-[#A6A6A6]">
                    <div>
                      <span className="block text-[11px]">Criado em</span>
                      <strong className="text-[#171717] dark:text-[#F5F5F5]">
                        {formatDateTime(restorePreview.manifest.createdAt)}
                      </strong>
                    </div>
                    <div>
                      <span className="block text-[11px]">Pacientes no backup</span>
                      <strong className="text-[#171717] dark:text-[#F5F5F5]">
                        {restorePreview.affectedCounts.patients}
                      </strong>
                    </div>
                    <div>
                      <span className="block text-[11px]">Consultas</span>
                      <strong className="text-[#171717] dark:text-[#F5F5F5]">
                        {restorePreview.affectedCounts.appointments}
                      </strong>
                    </div>
                    <div>
                      <span className="block text-[11px]">Prontuários</span>
                      <strong className="text-[#171717] dark:text-[#F5F5F5]">
                        {restorePreview.affectedCounts.clinicalRecords}
                      </strong>
                    </div>
                    <div>
                      <span className="block text-[11px]">Serviços / Pagamentos</span>
                      <strong className="text-[#171717] dark:text-[#F5F5F5]">
                        {restorePreview.affectedCounts.services} / {restorePreview.affectedCounts.payments}
                      </strong>
                    </div>
                    <div>
                      <span className="block text-[11px]">Arquivos & Mídias</span>
                      <strong className="text-[#171717] dark:text-[#F5F5F5]">
                        {restorePreview.affectedCounts.uploadedFilesOnDisk}
                      </strong>
                    </div>
                  </div>

                  <div className="pt-1 border-t border-[#E5E5E5] dark:border-[#2C2C2C] space-y-1.5">
                    <span className="block text-[11px] text-[#737373] dark:text-[#A6A6A6]">
                      Categorias afetadas:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {restorePreview.manifest.categories.map((cat) => (
                        <Badge key={cat} variant="secondary" size="sm">
                          {cat}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {restorePreview.compatibility.notes.length > 0 && (
                    <div className="pt-1 border-t border-[#E5E5E5] dark:border-[#2C2C2C] text-[11px] text-[#525252] dark:text-[#A6A6A6] space-y-1">
                      {restorePreview.compatibility.notes.map((note) => (
                        <p key={note}>• {note}</p>
                      ))}
                    </div>
                  )}

                  <div className="pt-1 border-t border-[#E5E5E5] dark:border-[#2C2C2C] flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-emerald-700 dark:text-emerald-400">
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      <span>SHA-256 verificado</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      <span>Banco conectado</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      <span>Diretórios graváveis</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      <span>Snapshot de segurança automático (Fase C)</span>
                    </span>
                  </div>
                </div>

                {isExecutingRestore ? (
                  <Alert variant="info">
                    Executando restauração controlada em etapas: criando snapshot de segurança da base atual, restaurando banco de dados/arquivos e validando referências finais. Não feche esta janela.
                  </Alert>
                ) : (
                  <Input
                    label='Para confirmar a substituição completa dos dados atuais, digite "RESTAURAR":'
                    placeholder="RESTAURAR"
                    value={restoreConfirmInput}
                    onChange={(e) => setRestoreConfirmInput(e.target.value)}
                    autoComplete="off"
                    spellCheck={false}
                    helperText="Um snapshot automático de recuperação será criado antes da substituição para permitir rollback em caso de falha."
                  />
                )}

                <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeRestoreModal}
                    disabled={isExecutingRestore}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    variant="destructive"
                    isLoading={isExecutingRestore}
                    disabled={restoreConfirmInput.trim() !== "RESTAURAR"}
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>Restaurar Backup</span>
                  </Button>
                </div>
              </form>
            ) : null}
          </div>
        )}
      </Modal>

      {/* Modal de Confirmação de Exclusão Segura */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => {
          if (!isDeletingBackup) {
            setDeleteError(null);
            setDeleteTarget(null);
          }
        }}
        title="Excluir Backup"
        maxWidth="md"
      >
        {deleteTarget && (
          <div className="space-y-4">
            <Alert variant="warning">
              Tem certeza que deseja excluir este backup? Esta ação não poderá ser desfeita.
            </Alert>

            {deleteError && <Alert variant="destructive">{deleteError}</Alert>}

            <div className="p-3.5 rounded-xl bg-[#F8F8F8] dark:bg-[#191919] border border-[#E5E5E5] dark:border-[#333333] space-y-1 text-xs">
              <p className="font-mono font-semibold text-[#171717] dark:text-[#F5F5F5] break-all">
                {deleteTarget.filename}
              </p>
              <p className="text-[#737373] dark:text-[#A6A6A6]">
                Tamanho: {formatBytesHuman(deleteTarget.realSizeBytes || deleteTarget.sizeBytes)} •{" "}
                {deleteTarget.formatLabel}
              </p>
            </div>

            <p className="text-xs text-[#525252] dark:text-[#A6A6A6] leading-relaxed">
              Apenas este arquivo de backup e o seu registro no histórico serão removidos. Os dados atuais do sistema, prontuários e documentos enviados permanecem intactos.
            </p>

            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
              <Button
                variant="outline"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeletingBackup}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                isLoading={isDeletingBackup}
              >
                Excluir Backup
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
