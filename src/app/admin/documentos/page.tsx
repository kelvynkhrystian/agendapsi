"use client";

import React, { useEffect, useState } from "react";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import {
  FileText,
  Search,
  Download,
  Eye,
  Trash2,
  FolderLock,
  User,
  ShieldCheck,
  AlertTriangle,
  FileCheck2,
  RefreshCw,
} from "lucide-react";

interface DocumentItem {
  id: string;
  title?: string | null;
  originalName: string;
  description?: string | null;
  mimeType: string;
  sizeBytes: number;
  category: string;
  clinicalRecordId?: string | null;
  createdAt: string;
  shares: Array<{
    id: string;
    patientId: string;
    canDownload: boolean;
    expiresAt?: string | null;
    revokedAt?: string | null;
    patient: {
      id: string;
      fullName: string;
      email: string;
    };
  }>;
}

export default function AdminDocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState(true);

  // Estados de Exclusão
  const [documentToDelete, setDocumentToDelete] = useState<DocumentItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (selectedCategory !== "ALL") params.set("category", selectedCategory);

      const res = await fetch(`/api/admin/documents?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Erro ao buscar documentos:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [search, selectedCategory]);

  const confirmDeleteDocument = async () => {
    if (!documentToDelete) return;
    setIsDeleting(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/files/${documentToDelete.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (res.ok) {
        setFeedback({
          type: "success",
          message: data.message || "Documento excluído com sucesso.",
        });
        // Atualiza a interface instantaneamente sem refresh manual
        setDocuments((prev) => prev.filter((d) => d.id !== documentToDelete.id));
        setDocumentToDelete(null);
      } else {
        setFeedback({
          type: "error",
          message: data.error || "Não foi possível excluir o documento.",
        });
      }
    } catch {
      setFeedback({
        type: "error",
        message: "Erro de comunicação ao excluir o documento.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#171717] dark:text-[#F5F5F5]">
            Documentos & Arquivos
          </h1>
          <p className="text-sm text-[#737373] dark:text-[#A6A6A6] mt-1">
            Gestão segura de documentos, relatórios em PDF e declarações compartilhadas com pacientes.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchDocuments}
          disabled={isLoading}
          className="gap-2 self-start sm:self-auto text-xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Atualizar Lista</span>
        </Button>
      </div>

      {feedback && (
        <Alert
          variant={feedback.type === "success" ? "success" : "destructive"}
        >
          {feedback.message}
        </Alert>
      )}

      {/* Filtros e Busca */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="max-w-md flex-1">
          <Input
            placeholder="Buscar por nome do arquivo ou descrição..."
            leftIcon={<Search className="h-4 w-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 text-xs">
          {[
            { id: "ALL", label: "Todos" },
            { id: "PATIENT_DOCUMENT", label: "Pacientes" },
            { id: "CLINICAL_NOTE_EXPORT", label: "Prontuários" },
            { id: "SYSTEM_BACKUP", label: "Backups" },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer select-none whitespace-nowrap ${
                selectedCategory === cat.id
                  ? "bg-[var(--button-bg,var(--primary))] text-[var(--button-fg,#ffffff)] shadow-xs"
                  : "bg-white text-[var(--button-outline-fg,var(--button-bg,var(--primary)))] border border-[var(--primary)]/25 hover:border-[var(--primary)]/50 hover:bg-[var(--primary)]/[0.04] dark:bg-[#202020] dark:text-slate-300 dark:border-[#393939] dark:hover:bg-[#292929]"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Documentos */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-slate-100 dark:bg-[#202020] rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : documents.length > 0 ? (
        <div className="divide-y divide-slate-100 dark:divide-[#393939] bg-white dark:bg-[#202020] rounded-2xl border border-slate-200 dark:border-[#393939] overflow-hidden shadow-xs">
          {documents.map((doc) => {
            const isProtected = !!doc.clinicalRecordId || doc.category === "CLINICAL_NOTE_EXPORT";
            const patient = doc.shares[0]?.patient;

            return (
              <div
                key={doc.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-[#262626] transition-colors text-xs"
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-slate-900 dark:text-[#F5F5F5] truncate max-w-md">
                      {doc.title || doc.originalName}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      ({doc.originalName})
                    </span>

                    {isProtected && (
                      <Badge variant="outline" className="border-amber-400 text-amber-700 dark:text-amber-300 text-[10px]">
                        Retenção Prontuário
                      </Badge>
                    )}
                  </div>

                  {doc.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                      {doc.description}
                    </p>
                  )}

                  <div className="text-slate-500 dark:text-[#A6A6A6] text-[11px] flex flex-wrap items-center gap-2.5 pt-0.5">
                    <span>Enviado em {formatDate(doc.createdAt)}</span>
                    <span>•</span>
                    <span>Tamanho: {(doc.sizeBytes / 1024).toFixed(1)} KB</span>
                    <span>•</span>
                    <span>Formato: {doc.mimeType}</span>
                    {patient && (
                      <>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1 text-[var(--primary)] font-medium">
                          <User className="h-3 w-3" />
                          <span>{patient.fullName}</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Ações */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <a
                    href={`/api/files/${doc.id}/download?view=inline`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1 cursor-pointer">
                      <Eye className="h-3.5 w-3.5" />
                      <span>Visualizar</span>
                    </Button>
                  </a>

                  <a href={`/api/files/${doc.id}/download`} download>
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1 cursor-pointer">
                      <Download className="h-3.5 w-3.5" />
                      <span>Baixar</span>
                    </Button>
                  </a>

                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-8 text-xs gap-1 cursor-pointer"
                    onClick={() => setDocumentToDelete(doc)}
                    title="Excluir documento"
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
        <Card className="p-12 text-center text-slate-500 dark:text-[#A6A6A6]">
          <FolderLock className="h-10 w-10 mx-auto text-slate-400 dark:text-[#737373] mb-3" />
          <p className="font-semibold text-slate-800 dark:text-[#F5F5F5]">Nenhum documento encontrado.</p>
          <p className="text-xs text-slate-400 mt-1">
            Os documentos em PDF compartilhados com pacientes aparecerão centralizados aqui.
          </p>
        </Card>
      )}

      {/* Modal de Confirmação de Exclusão de Documento */}
      <Modal
        isOpen={!!documentToDelete}
        onClose={() => !isDeleting && setDocumentToDelete(null)}
        title="Excluir Documento"
      >
        <div className="space-y-4 pt-1">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Tem certeza que deseja excluir este documento? Esta ação poderá ser irreversível.
          </p>

          {documentToDelete && (
            <div className="p-3.5 bg-slate-100 dark:bg-[#1B1B1B] border border-slate-200 dark:border-[#393939] rounded-xl space-y-1">
              <div className="text-xs font-bold text-slate-900 dark:text-[#F5F5F5]">
                {documentToDelete.title || documentToDelete.originalName}
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                {documentToDelete.originalName} • {(documentToDelete.sizeBytes / 1024).toFixed(1)} KB
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-[#393939]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isDeleting}
              onClick={() => setDocumentToDelete(null)}
            >
              Cancelar
            </Button>

            <Button
              type="button"
              variant="destructive"
              size="sm"
              isLoading={isDeleting}
              onClick={confirmDeleteDocument}
              className="gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Excluir documento</span>
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
