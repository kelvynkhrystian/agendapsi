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
        <h1 className="text-2xl font-bold tracking-tight text-[#171717] dark:text-[#F5F5F5]">Meus Documentos & Declarações</h1>
        <p className="text-sm text-[#737373] dark:text-[#A6A6A6]">
          Atestados, relatórios e declarações liberados pelo seu profissional de saúde para visualização e download seguro.
        </p>
      </div>

      <div className="p-3.5 bg-[var(--primary)]/10 dark:bg-[#202020] border border-[var(--primary)]/20 dark:border-[#393939] rounded-xl flex items-start sm:items-center gap-3 text-xs text-slate-800 dark:text-[#F5F5F5] shadow-xs">
        <ShieldCheck className="h-5 w-5 text-[var(--primary)] dark:text-[#C0C0C0] shrink-0 mt-0.5 sm:mt-0" />
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
      <Card className="border-[#E5E5E5] dark:border-[#393939] shadow-xs">
        <CardHeader className="pb-3 border-b border-[#E5E5E5] dark:border-[#393939]">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-[var(--primary)] dark:text-[#C0C0C0]" />
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
            <div className="p-12 text-center text-xs text-[#737373] dark:text-[#A6A6A6] space-y-2">
              <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto" />
              <p>Carregando seus documentos...</p>
            </div>
          ) : activeDocs.length > 0 ? (
            <div className="divide-y divide-[#E5E5E5] dark:divide-[#393939]">
              {activeDocs.map((doc) => (
                <div
                  key={doc.shareId}
                  className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#F2F2F2]/50 dark:hover:bg-[#292929]/50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-[#F8F8F8] dark:bg-[#141414] border border-[#E5E5E5] dark:border-[#393939] shrink-0 mt-0.5">
                      {getFileIcon(doc.mimeType)}
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-bold text-sm text-[#171717] dark:text-[#F5F5F5]">
                          {doc.name}
                        </span>
                        <Badge variant="outline" className="text-[10px] font-mono uppercase border-[#E5E5E5] dark:border-[#393939]">
                          {getFormatLabel(doc.mimeType, doc.originalName)}
                        </Badge>
                      </div>

                      {doc.description && (
                        <p className="text-xs text-[#525252] dark:text-[#A6A6A6] leading-relaxed">
                          {doc.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[#737373] dark:text-[#A6A6A6] text-[11px] pt-1">
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

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <a
                      href={`/api/files/${doc.id}/download?view=inline`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm" className="h-9 min-h-[36px] px-3.5 text-xs gap-1.5 cursor-pointer">
                        <Eye className="h-3.5 w-3.5" />
                        <span>Visualizar</span>
                      </Button>
                    </a>
                    <a href={`/api/files/${doc.id}/download`} download>
                      <Button size="sm" className="h-9 min-h-[36px] px-3.5 text-xs gap-1.5 bg-[var(--button-bg,var(--primary))] dark:bg-[#424242] hover:brightness-105 dark:hover:bg-[#4F4F4F] text-white cursor-pointer">
                        <Download className="h-3.5 w-3.5" />
                        <span>Baixar</span>
                      </Button>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-[#737373] dark:text-[#A6A6A6] space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#F2F2F2] dark:bg-[#292929] flex items-center justify-center mx-auto text-[#737373] dark:text-[#C0C0C0]">
                <FolderLock className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[#171717] dark:text-[#F5F5F5]">
                  Nenhum documento disponível no momento.
                </p>
                <p className="text-xs text-[#737373] dark:text-[#A6A6A6] max-w-sm mx-auto">
                  Assim que o profissional liberar um atestado, laudo ou recibo para você, ele aparecerá aqui com botões para visualização e download.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico de Documentos Expirados ou com Acesso Encerrado */}
      {archivedDocs.length > 0 && (
        <Card className="border-[#E5E5E5] dark:border-[#393939] bg-[#F8F8F8]/50 dark:bg-[#202020]">
          <CardHeader className="pb-3 border-b border-[#E5E5E5] dark:border-[#393939]">
            <CardTitle className="text-sm font-semibold text-[#525252] dark:text-[#D0D0D0]">
              Histórico de Documentos Expirados ou Concluídos
            </CardTitle>
            <CardDescription className="text-xs">
              Registros que já tiveram seu prazo de validade concluído
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-[#E5E5E5] dark:divide-[#393939] text-xs">
              {archivedDocs.map((doc) => (
                <div key={doc.shareId} className="p-4 flex items-center justify-between gap-3 text-[#737373] dark:text-[#A6A6A6]">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-[#525252] dark:text-[#D0D0D0] block line-through opacity-75">
                      {doc.name}
                    </span>
                    <p className="text-[11px] text-[#737373] dark:text-[#A6A6A6]">
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
