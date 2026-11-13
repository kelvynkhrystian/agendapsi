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
  Loader2,
  Circle,
  XCircle,
} from "pulsoicon-react";

const ACTIVE_BACKUP_JOB_STORAGE_KEY = "psi_active_backup_job_id";

const BACKUP_STAGE_STEPS = [
  { step: 1, key: "PREPARING", label: "Preparando backup" },
  { step: 2, key: "EXPORTING_DATABASE", label: "Exportando banco de dados" },
  { step: 3, key: "COPYING_MEDIA", label: "Copiando documentos e mídias" },
  { step: 4, key: "COMPRESSING", label: "Compactando arquivos" },
  { step: 5, key: "VERIFYING", label: "Verificando integridade" },
  { step: 6, key: "FINALIZING", label: "Finalizando backup" },
] as const;

type BackupStageKey = (typeof BACKUP_STAGE_STEPS)[number]["key"];

interface BackupProgressJob {
  jobId: string;
  status: "RUNNING" | "CANCELLING" | "COMPLETED" | "CANCELLED" | "FAILED";
  stageKey: BackupStageKey;
  stageIndex: number;
  totalStages: number;
  stageLabel: string;
  detailText: string | null;
  percent: number | null;
  cancellable: boolean;
  startedAt: string;
  updatedAt: string;
  finishedAt: string | null;
  error: string | null;
  resultBackup: {
    id: string;
    filename: string;
    sizeBytes: number;
    status: string;
    checksumSha256: string;
    fileCount: number;
  } | null;
}

interface OrphanedMediaFileItem {
  relativeKey: string;
  area: "minisite" | "public-uploads";
  categoryLabel: string;
  sizeBytes: number;
  mtimeMs: number;
}

interface OrphanedMediaCategoryItem {
  categoryLabel: string;
  count: number;
  bytes: number;
}

interface OrphanedMediaPreview {
  files: OrphanedMediaFileItem[];
  categorySummary: OrphanedMediaCategoryItem[];
  totalCount: number;
  totalBytes: number;
  graceProtectedCount: number;
  gracePeriodMs: number;
  blockedByLock: boolean;
  blockReason: string | null;
}

interface OrphanedMediaExecuteResult {
  deletedCount: number;
  deletedBytes: number;
  deletedFiles: string[];
  skippedSharedCount: number;
  deferredByLock: boolean;
  blockReason: string | null;
  categorySummary: OrphanedMediaCategoryItem[];
}

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
    case "RUNNING":
    case "CANCELLING":
      return "warning";
    case "CANCELLED":
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
  const [mediaCleanupInProgress, setMediaCleanupInProgress] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Estado do modal de progresso e cancelamento seguro do backup
  const [backupProgressJob, setBackupProgressJob] = useState<BackupProgressJob | null>(null);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isStartingBackup, setIsStartingBackup] = useState(false);
  const [isCancellingBackup, setIsCancellingBackup] = useState(false);
  const [backupCancelWarning, setBackupCancelWarning] = useState<string | null>(null);
  const terminalJobSyncedRef = useRef<string | null>(null);
  const pollingInFlightRef = useRef(false);

  // Estado do modal de limpeza manual de mídias não utilizadas do Site
  const [isCleanupModalOpen, setIsCleanupModalOpen] = useState(false);
  const [isScanningOrphanMedia, setIsScanningOrphanMedia] = useState(false);
  const [cleanupPreview, setCleanupPreview] = useState<OrphanedMediaPreview | null>(null);
  const [cleanupPreviewError, setCleanupPreviewError] = useState<string | null>(null);
  const [isExecutingCleanup, setIsExecutingCleanup] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<OrphanedMediaExecuteResult | null>(null);

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

  const persistActiveBackupJobId = useCallback((jobId: string | null) => {
    if (typeof window === "undefined") return;
    try {
      if (jobId) {
        window.sessionStorage.setItem(ACTIVE_BACKUP_JOB_STORAGE_KEY, jobId);
      } else {
        window.sessionStorage.removeItem(ACTIVE_BACKUP_JOB_STORAGE_KEY);
      }
    } catch {
      // ignora restrições pontuais de storage do navegador
    }
  }, []);

  const readStoredActiveBackupJobId = useCallback((): string | null => {
    if (typeof window === "undefined") return null;
    try {
      return window.sessionStorage.getItem(ACTIVE_BACKUP_JOB_STORAGE_KEY);
    } catch {
      return null;
    }
  }, []);

  const fetchData = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (!silent) setIsLoading(true);
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
          setMediaCleanupInProgress(Boolean(data.mediaCleanupInProgress));

          const serverJob = data.activeBackupJob as BackupProgressJob | null | undefined;
          if (serverJob && (serverJob.status === "RUNNING" || serverJob.status === "CANCELLING")) {
            persistActiveBackupJobId(serverJob.jobId);
            setBackupProgressJob(serverJob);
            setIsBackupModalOpen(true);
          } else if (!silent) {
            const storedJobId = readStoredActiveBackupJobId();
            if (storedJobId) {
              const progRes = await fetch(
                `/api/admin/backup/progress?jobId=${encodeURIComponent(storedJobId)}`,
                { cache: "no-store" }
              ).catch(() => null);
              if (progRes && progRes.ok) {
                const progData = await progRes.json().catch(() => null);
                if (progData?.job) {
                  setBackupProgressJob(progData.job);
                  setIsBackupModalOpen(true);
                } else {
                  persistActiveBackupJobId(null);
                }
              }
            }
          }
        }
      } else if (!silent) {
        setFeedback({
          type: "error",
          message: data?.error || "Não foi possível carregar o histórico de backups.",
        });
      }
    } catch {
      if (!silent) {
        setFeedback({
          type: "error",
          message: "Erro de conexão ao consultar armazenamento e backups.",
        });
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [persistActiveBackupJobId, readStoredActiveBackupJobId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Polling real do progresso enquanto o job estiver em execução/cancelamento
  useEffect(() => {
    if (!isBackupModalOpen || !backupProgressJob) return;

    const { status, jobId } = backupProgressJob;
    if (status === "COMPLETED" || status === "CANCELLED" || status === "FAILED") {
      if (terminalJobSyncedRef.current !== jobId) {
        terminalJobSyncedRef.current = jobId;
        setIsCancellingBackup(false);
        if (status === "COMPLETED") {
          setBackupCancelWarning(null);
        }
        void fetchData({ silent: true });
      }
      return;
    }

    let cancelledEffect = false;
    const pollOnce = async () => {
      if (cancelledEffect || pollingInFlightRef.current) return;
      pollingInFlightRef.current = true;
      try {
        const res = await fetch(
          `/api/admin/backup/progress?jobId=${encodeURIComponent(jobId)}`,
          { cache: "no-store" }
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelledEffect && data?.job) {
          setBackupProgressJob(data.job);
        }
      } catch {
        // mantém última leitura até próxima resposta do servidor
      } finally {
        pollingInFlightRef.current = false;
      }
    };

    const intervalId = window.setInterval(pollOnce, 450);
    return () => {
      cancelledEffect = true;
      window.clearInterval(intervalId);
    };
  }, [isBackupModalOpen, backupProgressJob, fetchData]);

  const handleGenerateBackup = async () => {
    if (
      isStartingBackup ||
      (backupProgressJob &&
        (backupProgressJob.status === "RUNNING" || backupProgressJob.status === "CANCELLING"))
    ) {
      return;
    }

    const nowIso = new Date().toISOString();
    setIsStartingBackup(true);
    setFeedback(null);
    setBackupCancelWarning(null);
    setIsCancellingBackup(false);
    terminalJobSyncedRef.current = null;
    setBackupProgressJob({
      jobId: "pending",
      status: "RUNNING",
      stageKey: "PREPARING",
      stageIndex: 1,
      totalStages: 6,
      stageLabel: "Preparando backup",
      detailText: "Inicializando ambiente seguro de exportação...",
      percent: null,
      cancellable: true,
      startedAt: nowIso,
      updatedAt: nowIso,
      finishedAt: null,
      error: null,
      resultBackup: null,
    });
    setIsBackupModalOpen(true);

    try {
      const res = await fetch("/api/admin/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "async" }),
      });
      const data = await res.json();

      if (res.ok && data?.job) {
        persistActiveBackupJobId(data.job.jobId);
        setBackupProgressJob(data.job);
      } else if (res.status === 409) {
        const progRes = await fetch("/api/admin/backup/progress", { cache: "no-store" }).catch(
          () => null
        );
        const progData = progRes && progRes.ok ? await progRes.json().catch(() => null) : null;
        if (
          progData?.job &&
          (progData.job.status === "RUNNING" || progData.job.status === "CANCELLING")
        ) {
          persistActiveBackupJobId(progData.job.jobId);
          setBackupProgressJob(progData.job);
          setBackupCancelWarning(
            "Já existia um backup em andamento. Reconectado ao acompanhamento ao vivo."
          );
        } else {
          setIsBackupModalOpen(false);
          setBackupProgressJob(null);
          setFeedback({
            type: "error",
            message: data?.error || "Não foi possível iniciar o backup neste momento.",
          });
        }
      } else {
        setIsBackupModalOpen(false);
        setBackupProgressJob(null);
        setFeedback({
          type: "error",
          message: data?.error || "Não foi possível iniciar a geração do backup.",
        });
      }
    } catch {
      setIsBackupModalOpen(false);
      setBackupProgressJob(null);
      setFeedback({
        type: "error",
        message: "Erro inesperado ao iniciar o backup completo.",
      });
    } finally {
      setIsStartingBackup(false);
    }
  };

  const handleCancelActiveBackup = async () => {
    if (
      !backupProgressJob ||
      backupProgressJob.jobId === "pending" ||
      isCancellingBackup ||
      !backupProgressJob.cancellable
    ) {
      return;
    }

    setIsCancellingBackup(true);
    setBackupCancelWarning(null);
    setBackupProgressJob((prev) =>
      prev
        ? {
            ...prev,
            status: "CANCELLING",
            detailText: "Cancelando em etapa segura e limpando arquivos temporários...",
          }
        : prev
    );

    try {
      const res = await fetch("/api/admin/backup/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: backupProgressJob.jobId }),
      });
      const data = await res.json();

      if (res.status === 409 && data?.nonCancellableStage) {
        if (data.job) setBackupProgressJob(data.job);
        setBackupCancelWarning(
          data.error ||
            "O backup entrou na etapa final de gravação atômica e não pode mais ser interrompido."
        );
        setIsCancellingBackup(false);
        return;
      }

      if (res.ok && data?.job) {
        setBackupProgressJob(data.job);
        setFeedback({
          type: "success",
          message:
            data.message ||
            "Backup cancelado com segurança. Os dados atuais e backups anteriores foram preservados.",
        });
        await fetchData({ silent: true });
      } else {
        setBackupCancelWarning(data?.error || "Não foi possível confirmar o cancelamento.");
      }
    } catch {
      setBackupCancelWarning("Erro de comunicação ao solicitar cancelamento do backup.");
    } finally {
      setIsCancellingBackup(false);
    }
  };

  const isBackupProcessActive = Boolean(
    isStartingBackup ||
      (backupProgressJob &&
        (backupProgressJob.status === "RUNNING" || backupProgressJob.status === "CANCELLING"))
  );

  const closeBackupProgressModal = () => {
    if (isBackupProcessActive) return;
    persistActiveBackupJobId(null);
    setIsBackupModalOpen(false);
    setBackupCancelWarning(null);
    setBackupProgressJob(null);
  };

  const openCleanupMediaModal = async () => {
    if (restoreInProgress || isBackupProcessActive || isExecutingRestore) return;
    setIsCleanupModalOpen(true);
    setIsScanningOrphanMedia(true);
    setCleanupPreview(null);
    setCleanupPreviewError(null);
    setCleanupResult(null);

    try {
      const res = await fetch("/api/admin/storage/cleanup-media", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setCleanupPreviewError(
          data?.error || "Não foi possível analisar as mídias não utilizadas do Site."
        );
        return;
      }
      setCleanupPreview(data.preview);
      if (data.storageStats) {
        setStorageStats(data.storageStats);
      }
    } catch {
      setCleanupPreviewError("Erro de comunicação ao verificar mídias não utilizadas.");
    } finally {
      setIsScanningOrphanMedia(false);
    }
  };

  const closeCleanupMediaModal = () => {
    if (isExecutingCleanup) return;
    setIsCleanupModalOpen(false);
    setCleanupPreview(null);
    setCleanupPreviewError(null);
    setCleanupResult(null);
  };

  const handleConfirmCleanupMedia = async () => {
    if (!cleanupPreview || cleanupPreview.totalCount === 0 || isExecutingCleanup) return;
    setIsExecutingCleanup(true);
    setCleanupPreviewError(null);

    try {
      const res = await fetch("/api/admin/storage/cleanup-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirm: true,
          targetRelativeKeys: cleanupPreview.files.map((f) => f.relativeKey),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCleanupPreviewError(data?.error || "Não foi possível concluir a limpeza de mídias.");
        return;
      }

      setCleanupResult(data.result);
      if (data.storageStats) {
        setStorageStats(data.storageStats);
      }
      setFeedback({
        type: "success",
        message:
          data.message ||
          `Limpeza concluída: ${data.result?.deletedCount ?? 0} arquivo(s) não utilizado(s) removido(s).`,
      });
      await fetchData({ silent: true });
    } catch {
      setCleanupPreviewError("Erro de comunicação durante a exclusão das mídias não utilizadas.");
    } finally {
      setIsExecutingCleanup(false);
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
    <div className="space-y-6 max-w-5xl mx-auto w-full">
      <div className="space-y-4">
        <div className="space-y-1">
          <h1 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-[#171717] dark:text-[#F5F5F5]">
            Backup & Armazenamento
          </h1>
          <p className="text-xs sm:text-sm text-[#737373] dark:text-[#A6A6A6]">
            Geração, importação e restauração controlada de pacotes portáteis em .zip com banco de dados, documentos privados e mídias do Site.
          </p>
        </div>

        <div
          className="flex flex-wrap lg:flex-nowrap items-center gap-2 sm:gap-2.5"
          role="toolbar"
          aria-label="Ações de backup e armazenamento"
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData()}
            disabled={isLoading || isBackupProcessActive || isExecutingRestore || isExecutingCleanup}
            className="gap-1.5 text-xs flex-1 sm:flex-none whitespace-nowrap shrink-0"
            title="Atualizar listagem de backups e armazenamento"
          >
            <RefreshCw className="h-3.5 w-3.5 shrink-0" />
            <span>Atualizar</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={openCleanupMediaModal}
            disabled={
              restoreInProgress ||
              isBackupProcessActive ||
              isExecutingRestore ||
              mediaCleanupInProgress ||
              isExecutingCleanup
            }
            className="gap-1.5 text-xs flex-1 sm:flex-none whitespace-nowrap shrink-0"
            title="Analisar e remover mídias antigas do Site que não estão mais em uso"
          >
            <Trash2 className="h-3.5 w-3.5 shrink-0" />
            <span>Limpar Mídias Não Utilizadas</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={openImportModal}
            disabled={restoreInProgress || isBackupProcessActive || isExecutingRestore || isExecutingCleanup}
            className="gap-1.5 text-xs flex-1 sm:flex-none whitespace-nowrap shrink-0"
          >
            <Upload className="h-3.5 w-3.5 shrink-0" />
            <span>Importar Backup</span>
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleGenerateBackup}
            isLoading={isBackupProcessActive}
            disabled={
              restoreInProgress ||
              isBackupProcessActive ||
              isExecutingRestore ||
              mediaCleanupInProgress ||
              isExecutingCleanup
            }
            className="gap-1.5 text-xs flex-1 sm:flex-none whitespace-nowrap shrink-0"
          >
            {!isBackupProcessActive && <Database className="h-3.5 w-3.5 shrink-0" />}
            <span>Gerar Novo Backup</span>
          </Button>
        </div>
      </div>

      {restoreInProgress && (
        <Alert variant="warning">
          Uma restauração de sistema está em andamento. Operações de escrita permanecem bloqueadas até a conclusão.
        </Alert>
      )}

      {mediaCleanupInProgress && (
        <Alert variant="warning">
          Uma limpeza de mídias não utilizadas está em andamento. Operações de backup aguardam a finalização segura.
        </Alert>
      )}

      {feedback && (
        <Alert variant={feedback.type === "success" ? "success" : "destructive"}>
          {feedback.message}
        </Alert>
      )}

      {/* Cards de Métricas de Armazenamento */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1.5 p-3.5 sm:p-6 pb-1.5 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-[#737373] dark:text-[#A6A6A6]">
              Total de Arquivos
            </CardTitle>
            <FolderLock className="h-4 w-4 text-[var(--primary)] shrink-0" />
          </CardHeader>
          <CardContent className="p-3.5 sm:p-6 pt-0 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold tabular-nums text-[#171717] dark:text-[#F5F5F5]">
              {storageStats.fileCount}
            </div>
            <p className="text-[11px] sm:text-xs text-[#737373] dark:text-[#A6A6A6] mt-1">
              {privateCount} doc(s) privados • {mediaCount} mídia(s) e ícones do Site
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1.5 p-3.5 sm:p-6 pb-1.5 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-[#737373] dark:text-[#A6A6A6]">
              Espaço Ocupado
            </CardTitle>
            <HardDrive className="h-4 w-4 text-[var(--primary)] shrink-0" />
          </CardHeader>
          <CardContent className="p-3.5 sm:p-6 pt-0 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold tabular-nums text-[#171717] dark:text-[#F5F5F5]">
              {formatBytesHuman(storageStats.totalBytes)}
            </div>
            <p className="text-[11px] sm:text-xs text-[#737373] dark:text-[#A6A6A6] mt-1">
              Dados persistentes em armazenamento privado e mídias
            </p>
          </CardContent>
        </Card>

        <Card className="col-span-2 sm:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between gap-1.5 p-3.5 sm:p-6 pb-1.5 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-[#737373] dark:text-[#A6A6A6]">
              Backups Registrados
            </CardTitle>
            <Archive className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          </CardHeader>
          <CardContent className="p-3.5 sm:p-6 pt-0 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold tabular-nums text-[#171717] dark:text-[#F5F5F5]">
              {backups.length}
            </div>
            <p className="text-[11px] sm:text-xs text-[#737373] dark:text-[#A6A6A6] mt-1">
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
                  !isBackupProcessActive &&
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

                    <div className="grid grid-cols-3 sm:flex sm:flex-wrap items-stretch sm:items-center gap-2 w-full lg:w-auto shrink-0">
                      {b.fileExists ? (
                        <a
                          href={`/api/admin/backup/${encodeURIComponent(b.id)}/download`}
                          download={b.filename}
                          title="Baixar Backup"
                          aria-label={`Baixar Backup ${b.filename}`}
                          className="inline-flex items-center justify-center gap-1.5 font-heading font-semibold text-xs px-2 sm:px-3.5 py-1.5 min-h-[36px] rounded-xl border border-[var(--primary)]/30 dark:border-[#333333] bg-[var(--button-outline-bg,#ffffff)] dark:bg-[#1E1E1E] hover:border-[var(--primary)]/60 hover:bg-[var(--primary)]/[0.04] dark:hover:bg-[#262626] text-[var(--button-outline-fg,var(--button-bg,var(--primary)))] dark:text-[#F5F5F5] transition-all shadow-2xs"
                        >
                          <Download className="h-3.5 w-3.5 shrink-0" />
                          <span>Baixar</span>
                        </a>
                      ) : (
                        <Button variant="outline" size="sm" disabled title="Arquivo ausente em disco" className="px-2 sm:px-3.5">
                          <Download className="h-3.5 w-3.5 shrink-0" />
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
                        className="text-xs px-2 sm:px-3.5"
                      >
                        <RotateCcw className="h-3.5 w-3.5 shrink-0" />
                        <span>Restaurar</span>
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDeleteError(null);
                          setDeleteTarget(b);
                        }}
                        disabled={
                          restoreInProgress ||
                          isBackupProcessActive ||
                          b.status === "RESTORING" ||
                          isExecutingRestore
                        }
                        className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 dark:text-red-400 dark:border-red-500/30 dark:hover:bg-red-950/30 text-xs px-2 sm:px-3.5"
                        aria-label={`Excluir backup ${b.filename}`}
                      >
                        <Trash2 className="h-3.5 w-3.5 shrink-0" />
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
        preventClose={isImportingBackup}
        title="Importar Backup"
        description="Envie um pacote .zip completo gerado anteriormente pelo PSI para validar sua integridade e compatibilidade."
        maxWidth="lg"
      >
        <div className="space-y-4">
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

              <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center sm:justify-end gap-2.5 pt-2 w-full">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeImportModal}
                  disabled={isImportingBackup}
                  className="w-full sm:w-auto"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  isLoading={isImportingBackup}
                  disabled={!selectedImportFile}
                  className="w-full sm:w-auto"
                >
                  <Upload className="h-4 w-4 shrink-0" />
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

              <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center sm:justify-end gap-2.5 pt-2 w-full">
                <Button type="button" variant="outline" onClick={closeImportModal} className="w-full sm:w-auto">
                  Manter apenas no histórico
                </Button>
                <Button type="button" onClick={handleProceedImportedToRestore} className="w-full sm:w-auto">
                  <RotateCcw className="h-4 w-4 shrink-0" />
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
        preventClose={isExecutingRestore}
        title="Restaurar Backup"
        maxWidth="lg"
      >
        {restoreTarget && (
          <div className="space-y-4">
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

                <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center sm:justify-end gap-2.5 pt-2 w-full">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeRestoreModal}
                    disabled={isExecutingRestore}
                    className="w-full sm:w-auto"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    variant="destructive"
                    isLoading={isExecutingRestore}
                    disabled={restoreConfirmInput.trim() !== "RESTAURAR"}
                    className="w-full sm:w-auto"
                  >
                    <RotateCcw className="h-4 w-4 shrink-0" />
                    <span>Restaurar Backup</span>
                  </Button>
                </div>
              </form>
            ) : null}
          </div>
        )}
      </Modal>

      {/* Modal: Progresso Real da Geração de Backup */}
      <Modal
        isOpen={isBackupModalOpen && Boolean(backupProgressJob)}
        onClose={closeBackupProgressModal}
        preventClose={isBackupProcessActive}
        title="Criando cópia de segurança"
        description={
          isBackupProcessActive
            ? "Backup em andamento. Não feche esta tela até a conclusão."
            : backupProgressJob?.status === "COMPLETED"
            ? "Backup completo criado e verificado com sucesso."
            : backupProgressJob?.status === "CANCELLED"
            ? "Operação interrompida com segurança."
            : "Não foi possível concluir a geração da cópia de segurança."
        }
        maxWidth="lg"
      >
        {backupProgressJob && (
          <div className="space-y-4 text-xs">
            {/* Barra de Progresso Real ou Indeterminada */}
            {backupProgressJob.status === "RUNNING" || backupProgressJob.status === "CANCELLING" ? (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-sm text-[#171717] dark:text-[#F5F5F5]">
                    {backupProgressJob.stageLabel}
                  </span>
                  <span className="font-mono font-semibold tabular-nums text-xs text-[#525252] dark:text-[#D0D0D0]">
                    {typeof backupProgressJob.percent === "number"
                      ? `${backupProgressJob.percent}%`
                      : "Calculando..."}
                  </span>
                </div>

                <div
                  className="h-3 w-full overflow-hidden rounded-full bg-[#E5E5E5] dark:bg-[#2C2C2C] border border-[#D4D4D4] dark:border-[#393939]"
                  role="progressbar"
                  aria-label="Progresso do backup"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={
                    typeof backupProgressJob.percent === "number"
                      ? backupProgressJob.percent
                      : undefined
                  }
                >
                  {typeof backupProgressJob.percent === "number" ? (
                    <div
                      className="h-full rounded-full bg-[var(--button-bg,var(--primary))] dark:bg-[#E5E5E5] transition-[width] duration-300 ease-out"
                      style={{
                        width: `${Math.min(100, Math.max(0, backupProgressJob.percent))}%`,
                      }}
                    />
                  ) : (
                    <div className="h-full w-2/5 rounded-full bg-[var(--button-bg,var(--primary))] dark:bg-[#E5E5E5] animate-backup-indeterminate" />
                  )}
                </div>

                <p className="text-[11px] text-[#737373] dark:text-[#A6A6A6] min-h-[16px]">
                  {backupProgressJob.detailText || "Processando etapas internas com verificação SHA-256..."}
                </p>
              </div>
            ) : null}

            {/* Lista Real das 6 Etapas */}
            {(backupProgressJob.status === "RUNNING" ||
              backupProgressJob.status === "CANCELLING" ||
              backupProgressJob.status === "COMPLETED") && (
              <div className="rounded-xl border border-[#E5E5E5] dark:border-[#393939] bg-[#F8F8F8] dark:bg-[#191919] p-3.5 space-y-2">
                {BACKUP_STAGE_STEPS.map((st) => {
                  const isDone =
                    backupProgressJob.status === "COMPLETED" ||
                    backupProgressJob.stageIndex > st.step;
                  const isCurrent =
                    backupProgressJob.status !== "COMPLETED" &&
                    backupProgressJob.stageIndex === st.step;

                  return (
                    <div
                      key={st.key}
                      className={`flex items-center justify-between gap-3 px-2.5 py-1.5 rounded-lg transition-colors ${
                        isCurrent
                          ? "bg-white dark:bg-[#202020] border border-[var(--primary)]/25 dark:border-[#393939]"
                          : ""
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isDone ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        ) : isCurrent ? (
                          <Loader2 className="h-4 w-4 text-[var(--primary)] dark:text-[#F5F5F5] animate-spin shrink-0" />
                        ) : (
                          <Circle className="h-4 w-4 text-[#A3A3A3] dark:text-[#525252] shrink-0" />
                        )}
                        <span
                          className={`truncate ${
                            isCurrent
                              ? "font-semibold text-[#171717] dark:text-[#F5F5F5]"
                              : isDone
                              ? "text-[#404040] dark:text-[#D0D0D0]"
                              : "text-[#737373] dark:text-[#737373]"
                          }`}
                        >
                          {st.step}. {st.label}
                        </span>
                      </div>
                      <span className="text-[11px] font-medium shrink-0 text-[#737373] dark:text-[#A6A6A6]">
                        {isDone ? "Concluída" : isCurrent ? "Em andamento" : "Aguardando"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {backupCancelWarning && (
              <Alert variant="warning">{backupCancelWarning}</Alert>
            )}

            {/* Estado Concluído */}
            {backupProgressJob.status === "COMPLETED" && backupProgressJob.resultBackup && (
              <div className="space-y-3">
                <Alert variant="success">Backup concluído com sucesso!</Alert>

                <div className="rounded-xl border border-[#E5E5E5] dark:border-[#393939] bg-white dark:bg-[#191919] p-4 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono font-semibold text-[#171717] dark:text-[#F5F5F5] break-all">
                      {backupProgressJob.resultBackup.filename}
                    </span>
                    <Badge variant="success" size="sm">
                      Concluído
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-[11px] text-[#525252] dark:text-[#A6A6A6]">
                    <div>
                      <span className="block">Tamanho do arquivo</span>
                      <strong className="text-[#171717] dark:text-[#F5F5F5] tabular-nums">
                        {formatBytesHuman(backupProgressJob.resultBackup.sizeBytes)}
                      </strong>
                    </div>
                    <div>
                      <span className="block">Arquivos incluídos</span>
                      <strong className="text-[#171717] dark:text-[#F5F5F5] tabular-nums">
                        {backupProgressJob.resultBackup.fileCount}
                      </strong>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <span className="block">Integridade SHA-256</span>
                      <strong className="font-mono text-[#171717] dark:text-[#F5F5F5]">
                        {backupProgressJob.resultBackup.checksumSha256.slice(0, 12)}...
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Estado Cancelado */}
            {backupProgressJob.status === "CANCELLED" && (
              <Alert variant="info">
                <span className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    Backup cancelado com segurança. Os arquivos temporários incompletos foram removidos, e o banco de dados ativo, documentos privados e backups anteriores permanecem intactos.
                  </span>
                </span>
              </Alert>
            )}

            {/* Estado de Falha */}
            {backupProgressJob.status === "FAILED" && (
              <Alert variant="destructive">
                {backupProgressJob.error ||
                  "Não foi possível concluir a geração do backup completo."}
              </Alert>
            )}

            {/* Rodapé / Ações */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-2.5 pt-2">
              {isBackupProcessActive ? (
                <>
                  <span className="text-[11px] text-[#737373] dark:text-[#A6A6A6]">
                    {!backupProgressJob.cancellable
                      ? "Etapa final de gravação atômica não pode ser interrompida."
                      : "O banco de dados e seus arquivos originais nunca são alterados durante a geração."}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelActiveBackup}
                    disabled={
                      !backupProgressJob.cancellable ||
                      isCancellingBackup ||
                      backupProgressJob.status === "CANCELLING" ||
                      backupProgressJob.jobId === "pending"
                    }
                    isLoading={
                      isCancellingBackup || backupProgressJob.status === "CANCELLING"
                    }
                    className="w-full sm:w-auto sm:ml-auto text-xs shrink-0"
                  >
                    <span>
                      {isCancellingBackup || backupProgressJob.status === "CANCELLING"
                        ? "Cancelando..."
                        : "Cancelar"}
                    </span>
                  </Button>
                </>
              ) : backupProgressJob.status === "COMPLETED" && backupProgressJob.resultBackup ? (
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center sm:justify-end gap-2.5 w-full">
                  <Button variant="outline" onClick={closeBackupProgressModal} className="text-xs w-full sm:w-auto">
                    Fechar
                  </Button>
                  <a
                    href={`/api/admin/backup/${encodeURIComponent(backupProgressJob.resultBackup.id)}/download`}
                    download={backupProgressJob.resultBackup.filename}
                    className="inline-flex items-center justify-center gap-1.5 font-heading font-semibold text-xs px-4 py-2 min-h-[38px] rounded-xl bg-[var(--button-bg,var(--primary))] hover:opacity-95 text-[var(--button-fg,#ffffff)] shadow-xs transition-all w-full sm:w-auto text-center"
                  >
                    <Download className="h-4 w-4 shrink-0" />
                    <span>Baixar Backup</span>
                  </a>
                </div>
              ) : (
                <div className="flex justify-end w-full">
                  <Button onClick={closeBackupProgressModal} className="text-xs w-full sm:w-auto">
                    Fechar
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Limpar Mídias Não Utilizadas (Preview em 2 etapas -> Confirmação) */}
      <Modal
        isOpen={isCleanupModalOpen}
        onClose={closeCleanupMediaModal}
        preventClose={isExecutingCleanup}
        title="Limpar Mídias Não Utilizadas"
        description="Remove apenas imagens, vídeos, ZIPs e ícones antigos do Site que não possuem nenhuma referência ativa."
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          {isScanningOrphanMedia ? (
            <div className="p-6 text-center space-y-2.5 text-[#737373] dark:text-[#A6A6A6]">
              <Loader2 className="h-5 w-5 animate-spin mx-auto text-[var(--primary)] dark:text-[#F5F5F5]" />
              <p>Analisando mídias do Site e conferindo referências ativas no banco de dados...</p>
            </div>
          ) : cleanupPreviewError ? (
            <div className="space-y-4">
              <Alert variant="destructive">{cleanupPreviewError}</Alert>
              <div className="flex justify-end">
                <Button variant="outline" onClick={closeCleanupMediaModal}>
                  Fechar
                </Button>
              </div>
            </div>
          ) : cleanupResult ? (
            <div className="space-y-4">
              <Alert variant="success">
                {cleanupResult.deletedCount > 0
                  ? `Limpeza concluída! ${cleanupResult.deletedCount} arquivo(s) obsoleto(s) do Site foram removidos com segurança.`
                  : "Nenhuma mídia não utilizada elegível para remoção foi encontrada."}
              </Alert>

              <div className="rounded-xl border border-[#E5E5E5] dark:border-[#393939] bg-[#F8F8F8] dark:bg-[#191919] p-4 grid grid-cols-2 gap-3">
                <div>
                  <span className="block text-[11px] text-[#737373] dark:text-[#A6A6A6]">
                    Arquivos removidos
                  </span>
                  <strong className="text-base tabular-nums text-[#171717] dark:text-[#F5F5F5]">
                    {cleanupResult.deletedCount}
                  </strong>
                </div>
                <div>
                  <span className="block text-[11px] text-[#737373] dark:text-[#A6A6A6]">
                    Espaço recuperado
                  </span>
                  <strong className="text-base tabular-nums text-[#171717] dark:text-[#F5F5F5]">
                    {formatBytesHuman(cleanupResult.deletedBytes)}
                  </strong>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <Button onClick={closeCleanupMediaModal}>Fechar</Button>
              </div>
            </div>
          ) : cleanupPreview ? (
            <div className="space-y-4">
              {cleanupPreview.blockedByLock && (
                <Alert variant="warning">
                  {cleanupPreview.blockReason ||
                    "Existe um backup ou restauração em andamento. Aguarde a conclusão para confirmar a limpeza."}
                </Alert>
              )}

              <div className="rounded-xl border border-[#E5E5E5] dark:border-[#393939] bg-[#F8F8F8] dark:bg-[#191919] p-4 grid grid-cols-2 gap-3">
                <div>
                  <span className="block text-[11px] text-[#737373] dark:text-[#A6A6A6]">
                    Arquivos não utilizados encontrados
                  </span>
                  <strong className="text-lg tabular-nums text-[#171717] dark:text-[#F5F5F5]">
                    {cleanupPreview.totalCount}
                  </strong>
                </div>
                <div>
                  <span className="block text-[11px] text-[#737373] dark:text-[#A6A6A6]">
                    Espaço estimado a recuperar
                  </span>
                  <strong className="text-lg tabular-nums text-[#171717] dark:text-[#F5F5F5]">
                    {formatBytesHuman(cleanupPreview.totalBytes)}
                  </strong>
                </div>
              </div>

              {cleanupPreview.totalCount === 0 ? (
                <Alert variant="info">
                  Todas as mídias do Site armazenadas em disco estão em uso ativo ou protegidas pela janela de segurança. Nenhum arquivo precisa ser removido agora.
                </Alert>
              ) : (
                <>
                  {cleanupPreview.categorySummary.length > 0 && (
                    <div className="space-y-2">
                      <span className="block font-semibold text-[#171717] dark:text-[#F5F5F5]">
                        Distribuição por área
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {cleanupPreview.categorySummary.map((cat) => (
                          <div
                            key={cat.categoryLabel}
                            className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-[#E5E5E5] dark:border-[#393939] bg-white dark:bg-[#141414]"
                          >
                            <span className="text-[#404040] dark:text-[#D0D0D0] truncate">
                              {cat.categoryLabel}
                            </span>
                            <span className="font-mono text-[11px] tabular-nums text-[#737373] dark:text-[#A6A6A6] shrink-0">
                              {cat.count} ({formatBytesHuman(cat.bytes)})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <span className="block font-semibold text-[#171717] dark:text-[#F5F5F5]">
                      Arquivos elegíveis para remoção ({cleanupPreview.files.length})
                    </span>
                    <div className="max-h-40 overflow-y-auto rounded-xl border border-[#E5E5E5] dark:border-[#393939] bg-white dark:bg-[#141414] divide-y divide-[#E5E5E5] dark:divide-[#2C2C2C]">
                      {cleanupPreview.files.slice(0, 25).map((file) => (
                        <div
                          key={file.relativeKey}
                          className="px-3 py-1.5 flex items-center justify-between gap-3 text-[11px]"
                        >
                          <span className="font-mono text-[#404040] dark:text-[#D0D0D0] truncate">
                            {file.relativeKey}
                          </span>
                          <span className="font-mono tabular-nums text-[#737373] dark:text-[#A6A6A6] shrink-0">
                            {formatBytesHuman(file.sizeBytes)}
                          </span>
                        </div>
                      ))}
                      {cleanupPreview.files.length > 25 && (
                        <div className="px-3 py-1.5 text-[11px] text-[#737373] dark:text-[#A6A6A6]">
                          E mais {cleanupPreview.files.length - 25} arquivo(s) listado(s) na verificação.
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {cleanupPreview.graceProtectedCount > 0 && (
                <p className="text-[11px] text-[#737373] dark:text-[#A6A6A6]">
                  {cleanupPreview.graceProtectedCount} arquivo(s) recém-enviado(s) (menos de 2 minutos) permaneceram preservados temporariamente para proteger rascunhos não salvos.
                </p>
              )}

              <div className="rounded-xl border border-[#E5E5E5] dark:border-[#393939] bg-[#F8F8F8] dark:bg-[#191919] p-3 flex items-start gap-2 text-[11px] text-[#525252] dark:text-[#A6A6A6]">
                <ShieldCheck className="h-4 w-4 text-[var(--primary)] dark:text-[#F5F5F5] shrink-0 mt-0.5" />
                <span>
                  Documentos privados de pacientes, prontuários clínicos, mídias atualmente publicadas no Site e pacotes de backup concluídos nunca são alterados por esta ação.
                </span>
              </div>

              <div
                className={
                  cleanupPreview.totalCount > 0
                    ? "grid grid-cols-2 sm:flex sm:flex-wrap items-center sm:justify-end gap-2.5 pt-2 w-full"
                    : "flex justify-end pt-2 w-full"
                }
              >
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeCleanupMediaModal}
                  disabled={isExecutingCleanup}
                  className="w-full sm:w-auto"
                >
                  {cleanupPreview.totalCount === 0 ? "Fechar" : "Cancelar"}
                </Button>
                {cleanupPreview.totalCount > 0 && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleConfirmCleanupMedia}
                    disabled={cleanupPreview.blockedByLock || isExecutingCleanup}
                    isLoading={isExecutingCleanup}
                    className="gap-1.5 w-full sm:w-auto"
                  >
                    <Trash2 className="h-4 w-4 shrink-0" />
                    <span>Confirmar Limpeza</span>
                  </Button>
                )}
              </div>
            </div>
          ) : null}
        </div>
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
        preventClose={isDeletingBackup}
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

            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center sm:justify-end gap-2.5 pt-2 w-full">
              <Button
                variant="outline"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeletingBackup}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                isLoading={isDeletingBackup}
                className="w-full sm:w-auto"
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
