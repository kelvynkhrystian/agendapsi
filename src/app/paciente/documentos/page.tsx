"use client";

import React, { useEffect, useState } from "react";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FolderLock, Download, Clock, ShieldCheck, FileCheck } from "lucide-react";

interface DocumentShare {
  id: string;
  shareId: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  sharedAt: string;
  expiresAt?: string;
  isExpired: boolean;
  canDownload: boolean;
}

export default function PatientDocumentsPage() {
  const [documents, setDocuments] = useState<DocumentShare[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/patient/documents")
      .then((r) => r.json())
      .then((data) => {
        setDocuments(Array.isArray(data) ? data : []);
        setIsLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setIsLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Meus Documentos & Declarações</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Documentos clínicos, atestados e recibos liberados pelo profissional para download.
        </p>
      </div>

      <div className="p-3 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-xl flex items-center gap-2 text-xs text-teal-900 dark:text-teal-200">
        <ShieldCheck className="h-4 w-4 shrink-0" />
        <span>
          Os documentos disponibilizados nesta área possuem validade com prazo determinado configurado pelo profissional de saúde. Faça o download para sua guarda pessoal.
        </span>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Carregando documentos disponíveis...
            </div>
          ) : documents.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {documents.map((doc) => (
                <div key={doc.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <span className="font-bold text-sm block text-slate-900 dark:text-slate-100">
                      {doc.name}
                    </span>
                    <div className="text-slate-500 flex flex-wrap gap-2 text-[11px]">
                      <span>Liberado em: {formatDate(doc.sharedAt)}</span>
                      <span>•</span>
                      <span>Tamanho: {(doc.sizeBytes / 1024).toFixed(1)} KB</span>
                      {doc.expiresAt && (
                        <>
                          <span>•</span>
                          <span className={doc.isExpired ? "text-red-500 font-semibold" : ""}>
                            {doc.isExpired ? "Expirado em" : "Válido até"}: {formatDate(doc.expiresAt)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {doc.isExpired ? (
                      <Badge variant="destructive">Expirado</Badge>
                    ) : (
                      <a href={`/api/files/${doc.id}/download`} download>
                        <Button size="sm" className="h-8 text-xs gap-1.5">
                          <Download className="h-3.5 w-3.5" />
                          <span>Baixar Arquivo</span>
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 space-y-2">
              <FolderLock className="h-8 w-8 mx-auto text-slate-400" />
              <p className="text-sm font-medium">Nenhum documento disponível no momento.</p>
              <p className="text-xs text-slate-400">
                Quando o profissional liberar um atestado ou relatório, ele aparecerá aqui para download.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
