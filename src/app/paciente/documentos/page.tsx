"use client";

import React, { useEffect, useState } from "react";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FolderLock,
  Download,
  Eye,
  Clock,
  ShieldCheck,
  FileText,
  FileCheck2,
  AlertCircle,
  FileSpreadsheet,
  FileImage,
} from "lucide-react";

interface PatientDocument {
  id: string;
  shareId: string;
  name: string;
  originalName: string;
  description?: string | null;
  mimeType: string;
  sizeBytes: number;
  sharedAt: string;
  expiresAt?: string | null;
  isExpired: boolean;
  isRevoked: boolean;
  canDownload: boolean;
  remainingDays?: number | null;
}

export default function PatientDocumentsPage() {
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchDocuments = () => {
    setIsLoading(true);
    setErrorMessage(null);

    fetch("/api/patient/documents", {
      cache: "no-store",
    })
      .then(async (r) => {
        if (!r.ok) {
          const errData = await r.json().catch(() => ({}));
          throw new Error(errData.error || `Erro ${r.status}`);
        }
        return r.json();
      })
      .then((data) => {
        setDocuments(Array.isArray(data) ? data : []);
        setIsLoading(false);
      })
      .catch((e: Error) => {
        console.error("Erro ao carregar documentos:", e);
        setErrorMessage(e.message || "Erro de conexão ao carregar documentos.");
        setDocuments([]);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) {
      return <FileImage className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />;
    }
    if (mimeType.includes("pdf")) {
      return <FileText className="h-6 w-6 text-rose-600 dark:text-rose-400" />;
    }
    return <FileText className="h-6 w-6 text-[var(--primary)]" />;
  };

  const getFormatLabel = (mimeType: string, originalName: string) => {
    if (mimeType.includes("pdf") || originalName.endsWith(".pdf")) return "PDF";
    if (mimeType.includes("jpeg") || originalName.endsWith(".jpg")) return "JPG";
    if (mimeType.includes("png") || originalName.endsWith(".png")) return "PNG";
    if (mimeType.includes("webp") || originalName.endsWith(".webp")) return "WEBP";
    if (mimeType.includes("word") || originalName.endsWith(".docx")) return "DOCX";
    return "Documento";
  };

  const activeDocs = documents.filter((d) => d.canDownload && !d.isExpired && !d.isRevoked);
  const archivedDocs = documents.filter((d) => !d.canDownload || d.isExpired || d.isRevoked);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Meus Documentos & Declarações</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Atestados, relatórios e declarações liberados pelo seu profissional de saúde para visualização e download seguro.
        </p>
      </div>

      <div className="p-3.5 bg-teal-50 dark:bg-teal-950/40 border border-[var(--primary)]/20 rounded-xl flex items-start sm:items-center gap-3 text-xs text-slate-800 dark:text-[#F5F5F5] shadow-xs">
        <ShieldCheck className="h-5 w-5 text-[var(--primary)] shrink-0 mt-0.5 sm:mt-0" />
        <span>
          <strong>Ambiente Protegido e Confidencial:</strong> Os arquivos disponibilizados nesta área foram emitidos exclusivamente para você. Documentos com prazo de expiração devem ser baixados para sua guarda pessoal antes do término da vigência.
        </span>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-center justify-between text-xs text-red-900 dark:text-red-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={fetchDocuments}>
            Tentar Novamente
          </Button>
        </div>
      )}

      {/* Lista de Documentos Ativos */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-[var(--primary)]" />
                <span>Documentos Disponíveis para Download</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Arquivos ativos e válidos para visualização e salvamento
              </CardDescription>
            </div>
            {activeDocs.length > 0 && (
              <Badge variant="success" className="text-xs px-2.5 py-0.5">
                {activeDocs.length} {activeDocs.length === 1 ? "documento ativo" : "documentos ativos"}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-500 space-y-2">
              <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto" />
              <p>Carregando seus documentos...</p>
            </div>
          ) : activeDocs.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {activeDocs.map((doc) => (
                <div
                  key={doc.shareId}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0 mt-0.5">
                      {getFileIcon(doc.mimeType)}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                          {doc.name}
                        </span>
                        <Badge variant="outline" className="text-[10px] font-mono uppercase">
                          {getFormatLabel(doc.mimeType, doc.originalName)}
                        </Badge>
                      </div>

                      {doc.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                          {doc.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-500 text-[11px] pt-0.5">
                        <span>Liberado em {formatDate(doc.sharedAt)}</span>
                        <span>•</span>
                        <span>{(doc.sizeBytes / 1024).toFixed(1)} KB</span>
                        <span>•</span>
                        {doc.expiresAt ? (
                          <span className="inline-flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                            <Clock className="h-3 w-3" />
                            {doc.remainingDays !== null && doc.remainingDays !== undefined
                              ? `Expira em ${doc.remainingDays} ${doc.remainingDays === 1 ? "dia" : "dias"} (${formatDate(doc.expiresAt)})`
                              : `Válido até ${formatDate(doc.expiresAt)}`}
                          </span>
                        ) : (
                          <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                            Acesso permanente (Sem expiração)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <a
                      href={`/api/files/${doc.id}/download?view=inline`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 cursor-pointer">
                        <Eye className="h-3.5 w-3.5" />
                        <span>Visualizar</span>
                      </Button>
                    </a>
                    <a href={`/api/files/${doc.id}/download`} download>
                      <Button size="sm" className="h-8 text-xs gap-1.5 bg-[var(--button-bg,var(--primary))] hover:brightness-105 text-white cursor-pointer">
                        <Download className="h-3.5 w-3.5" />
                        <span>Baixar</span>
                      </Button>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <FolderLock className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Nenhum documento disponível no momento.
                </p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Assim que o profissional liberar um atestado, laudo ou recibo para você, ele aparecerá aqui com botões para visualização e download.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico de Documentos Expirados ou com Acesso Encerrado */}
      {archivedDocs.length > 0 && (
        <Card className="border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Histórico de Documentos Expirados ou Concluídos
            </CardTitle>
            <CardDescription className="text-xs">
              Registros que já tiveram seu prazo de validade concluído
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {archivedDocs.map((doc) => (
                <div key={doc.shareId} className="p-4 flex items-center justify-between gap-3 text-slate-500">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 block line-through opacity-75">
                      {doc.name}
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Liberado em {formatDate(doc.sharedAt)} •{" "}
                      {doc.isRevoked
                        ? "Acesso encerrado pelo consultório"
                        : doc.expiresAt
                        ? `Expirou em ${formatDate(doc.expiresAt)}`
                        : "Indisponível"}
                    </p>
                  </div>
                  <Badge variant={doc.isRevoked ? "outline" : "destructive"} className="text-[10px]">
                    {doc.isRevoked ? "Acesso Revogado" : "Expirado"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
