"use client";

import React, { useCallback, useEffect, useState } from "react";
import { formatDateTime, formatBackupStatus } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import {
  HardDrive,
  Download,
  Trash2,
  FolderLock,
  Database,
  ShieldCheck,
  AlertTriangle,
  Archive,
  RefreshCw,
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
        setFeedback({
          type: "error",
          message: data?.error || "Falha ao excluir o arquivo de backup.",
        });
      }
    } catch {
      setFeedback({
        type: "error",
        message: "Erro de comunicação ao tentar excluir o backup.",
      });
    } finally {
      setIsDeletingBackup(false);
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
            Geração de pacotes portáteis em .zip com banco de dados, documentos privados e mídias do Site.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={isLoading || isGeneratingBackup}
            className="gap-1.5 text-xs"
            title="Atualizar listagem de backups e armazenamento"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Atualizar</span>
          </Button>
          <Button
            onClick={handleGenerateBackup}
            isLoading={isGeneratingBackup}
            disabled={restoreInProgress}
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
              {backups.map((b) => (
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
                      onClick={() => setDeleteTarget(b)}
                      disabled={restoreInProgress || b.status === "RESTORING"}
                      className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 dark:text-red-400 dark:border-red-500/30 dark:hover:bg-red-950/30 text-xs"
                      aria-label={`Excluir backup ${b.filename}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Excluir</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-[#737373] dark:text-[#A6A6A6]">
              Nenhum backup gerado até o momento. Clique em &quot;Gerar Novo Backup&quot;.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardContent className="p-4 flex items-start gap-3 text-xs text-[#525252] dark:text-[#A6A6A6]">
          <ShieldCheck className="h-4 w-4 text-[var(--primary)] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-[#171717] dark:text-[#F5F5F5]">
              Segurança e Higienização de Credenciais nos Backups Portáteis
            </p>
            <p className="leading-relaxed">
              Os pacotes <code className="font-mono">.zip</code> ficam isolados em diretório privado fora do acesso público da web. Senhas SMTP, tokens do WhatsApp, segredos OAuth do Google Meet, credenciais criptografadas de gateways e chaves de ambiente (<code className="font-mono">.env</code>) não são gravados nos arquivos portáteis de backup.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Confirmação de Exclusão Segura */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => {
          if (!isDeletingBackup) setDeleteTarget(null);
        }}
        title="Excluir Backup"
        maxWidth="md"
      >
        {deleteTarget && (
          <div className="space-y-4">
            <Alert variant="warning">
              Tem certeza que deseja excluir este backup? Esta ação não poderá ser desfeita.
            </Alert>

            <div className="p-3.5 rounded-xl bg-[#F8F8F8] dark:bg-[#191919] border border-[#E5E5E5] dark:border-[#333333] space-y-1 text-xs">
              <p className="font-mono font-semibold text-[#171717] dark:text-[#F5F5F5] break-all">
                {deleteTarget.filename}
              </p>
              <p className="text-[#737373] dark:text-[#A6A6A6]">
                Tamanho: {formatBytesHuman(deleteTarget.realSizeBytes || deleteTarget.sizeBytes)} • {deleteTarget.formatLabel}
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
