"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import {
  FileText,
  ShieldCheck,
  Lock,
  Award,
  Edit,
  ExternalLink,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Info,
} from "lucide-react";

interface InformationPageItem {
  id: "terms" | "privacy" | "lgpd" | "ethics";
  title: string;
  description: string;
  publicSlug: string;
  alternateSlug: string;
  version: string;
  isPublished: boolean;
  publishedAt?: string | null;
  updatedAt: string;
}

export default function AdminInformationPagesPage() {
  const [pages, setPages] = useState<InformationPageItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchPages = () => {
    setIsLoading(true);
    fetch("/api/admin/information-pages")
      .then((res) => res.json())
      .then((data) => {
        setPages(Array.isArray(data) ? data : []);
        setIsLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchPages();
  }, []);

  const handleTogglePublish = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/information-pages/${id}/publish`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback(data.message);
        fetchPages();
      }
    } catch {
      console.error("Erro ao alterar publicação");
    }
  };

  const getPageIcon = (id: string) => {
    switch (id) {
      case "terms":
        return <FileText className="h-5 w-5 text-[var(--primary)]" />;
      case "privacy":
        return <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />;
      case "lgpd":
        return <Lock className="h-5 w-5 text-amber-600 dark:text-amber-400" />;
      case "ethics":
        return <Award className="h-5 w-5 text-purple-600 dark:text-purple-400" />;
      default:
        return <FileText className="h-5 w-5 text-[var(--primary)]" />;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* ================= CABEÇALHO PRINCIPAL ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Páginas Informativas</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Gerencie os termos de uso, políticas de privacidade, proteção de dados (LGPD) e o compromisso de ética profissional do consultório.
          </p>
        </div>
      </div>

      {feedback && (
        <Alert variant="success" className="cursor-pointer" onClick={() => setFeedback(null)}>
          {feedback}
        </Alert>
      )}

      {/* ================= CARDS DAS 4 PÁGINAS INFORMATIVAS ================= */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-44 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pages.map((page) => (
            <Card key={page.id} className="hover:border-[var(--primary)]/50 transition-all flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0">
                      {getPageIcon(page.id)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base font-bold">{page.title}</CardTitle>
                        {page.isPublished ? (
                          <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                            Publicada
                          </Badge>
                        ) : (
                          <Badge variant="warning" className="text-[10px]">
                            Rascunho
                          </Badge>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Versão {page.version} • URL: {page.publicSlug}
                      </span>
                    </div>
                  </div>
                </div>

                <CardDescription className="text-xs line-clamp-2 mt-2">
                  {page.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 pt-0">
                <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-2.5">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span>Última revisão: {formatDate(page.updatedAt)}</span>
                  </div>

                  <Link
                    href={page.publicSlug}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-[11px] text-[var(--primary)] hover:underline"
                  >
                    <span>Visualizar</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleTogglePublish(page.id)}
                    className="h-8 px-2 text-xs gap-1.5 text-slate-600 dark:text-slate-400"
                  >
                    {page.isPublished ? (
                      <>
                        <EyeOff className="h-3.5 w-3.5" />
                        <span>Despublicar</span>
                      </>
                    ) : (
                      <>
                        <Eye className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Publicar</span>
                      </>
                    )}
                  </Button>

                  <Link href={`/admin/paginas-informativas/${page.id}`}>
                    <Button size="sm" className="h-8 px-3 text-xs gap-1.5">
                      <Edit className="h-3.5 w-3.5" />
                      <span>Editar Página</span>
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ================= NOTA EXPLICATIVA SOBRE COOKIES E GOVERNANÇA ================= */}
      <Card className="bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800">
        <CardContent className="p-5 flex items-start gap-3 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          <Info className="h-5 w-5 text-[var(--primary)] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-slate-900 dark:text-slate-100">
              Governança de Cookies e Privacidade Integrada
            </p>
            <p>
              As informações técnicas sobre os cookies utilizados pelo sistema (essenciais de sessão e preferências) estão consolidadas na <strong>Política de Privacidade</strong>. O banner de consentimento de cookies é executado automaticamente no MiniSite público para os visitantes, permitindo a personalização ou revisão de preferências a qualquer momento no rodapé.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
