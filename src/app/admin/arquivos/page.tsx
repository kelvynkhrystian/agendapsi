"use client";

import React, { useEffect, useState } from "react";
import { formatDate, formatBackupStatus } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import {
  HardDrive,
  Download,
  Plus,
  ShieldCheck,
  FileCheck,
  RefreshCw,
  FolderLock,
  Database,
} from "lucide-react";

interface BackupJob {
  id: string;
  filename: string;
  sizeBytes: number;
  checksumSha256: string;
  status: string;
  details?: string;
  createdAt: string;
}

export default function AdminStoragePage() {
  const [backups, setBackups] = useState<BackupJob[]>([]);
  const [storageStats, setStorageStats] = useState({ fileCount: 0, totalBytes: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingBackup, setIsGeneratingBackup] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchData = () => {
    setIsLoading(true);
    Promise.all([
      fetch("/api/admin/backup").then((r) => r.json()),
      fetch("/api/admin/dashboard-stats").then((r) => r.json()),
    ])
      .then(([backupList, stats]) => {
        setBackups(Array.isArray(backupList) ? backupList : []);
        if (stats.storage) setStorageStats(stats.storage);
        setIsLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleGenerateBackup = async () => {
    setIsGeneratingBackup(true);
    setActionMessage(null);

    try {
      const res = await fetch("/api/admin/backup", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setActionMessage("Novo backup criptografado do banco de dados gerado com sucesso!");
        fetchData();
      }
      setIsGeneratingBackup(false);
    } catch (e) {
      console.error(e);
      setIsGeneratingBackup(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Armazenamento & Backups</h1>
          <p className="text-sm text-[#737373] dark:text-[#A6A6A6]">
            Monitoramento de espaço em disco, arquivos privados e cópias de segurança do consultório.
          </p>
        </div>

        <Button
          onClick={handleGenerateBackup}
          isLoading={isGeneratingBackup}
          className="gap-1.5 text-xs"
        >
          <Database className="h-3.5 w-3.5" />
          <span>Gerar Novo Backup</span>
        </Button>
      </div>

      {actionMessage && <Alert variant="success">{actionMessage}</Alert>}

      {/* Cards de Métricas de Armazenamento */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#737373] dark:text-[#A6A6A6]">Arquivos em Disco</CardTitle>
            <FolderLock className="h-4 w-4 text-[var(--primary)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{storageStats.fileCount}</div>
            <p className="text-xs text-[#737373] dark:text-[#A6A6A6] mt-1">
              Documentos privados fora da raiz web pública
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#737373] dark:text-[#A6A6A6]">Volume Utilizado</CardTitle>
            <HardDrive className="h-4 w-4 text-[var(--primary)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(storageStats.totalBytes / (1024 * 1024)).toFixed(2)} MB
            </div>
            <p className="text-xs text-[#737373] dark:text-[#A6A6A6] mt-1">
              Sem limite artificial ou cota arbitrária restritiva
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#737373] dark:text-[#A6A6A6]">Backups Criados</CardTitle>
            <Database className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{backups.length}</div>
            <p className="text-xs text-[#737373] dark:text-[#A6A6A6] mt-1">
              Cópias completas com verificação de integridade SHA256
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Backups */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de Backups do Consultório</CardTitle>
          <CardDescription className="text-xs">
            Arquivos manifestos estruturados para recuperação segura e portabilidade
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-[#737373] dark:text-[#A6A6A6]">Carregando backups...</div>
          ) : backups.length > 0 ? (
            <div className="divide-y divide-[#E5E5E5] dark:divide-[#2C2C2C]">
              {backups.map((b) => (
                <div key={b.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <span className="font-bold text-sm block font-mono text-[#171717] dark:text-[#F5F5F5]">
                      {b.filename}
                    </span>
                    <div className="text-[#737373] dark:text-[#A6A6A6] flex flex-wrap gap-2 text-[11px]">
                      <span>Gerado em: {formatDate(b.createdAt)}</span>
                      <span>•</span>
                      <span>Tamanho: {(b.sizeBytes / 1024).toFixed(1)} KB</span>
                      <span>•</span>
                      <span className="font-mono text-[10px] text-[#737373] dark:text-[#A6A6A6]">
                        SHA256: {b.checksumSha256.slice(0, 16)}...
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="success">{formatBackupStatus(b.status)}</Badge>
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
    </div>
  );
}
