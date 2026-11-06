"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { sanitizeCustomHtml } from "@/lib/sanitize";
import {
  ArrowLeft,
  Save,
  Eye,
  EyeOff,
  ExternalLink,
  RotateCcw,
  Heading2,
  Heading3,
  Bold,
  Italic,
  List,
  ListOrdered,
  Link2,
  Quote,
  CheckCircle2,
  AlertTriangle,
  Code,
  Layout,
  Columns,
} from "lucide-react";

interface PageData {
  id: string;
  title: string;
  description?: string | null;
  contentHtml: string;
  version: string;
  isPublished: boolean;
  publishedAt?: string | null;
  updatedAt: string;
  publicSlug: string;
  alternateSlug: string;
}

export default function AdminEditarPaginaInformativaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [page, setPage] = useState<PageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contentHtml, setContentHtml] = useState("");
  const [version, setVersion] = useState("1.0");
  const [isPublished, setIsPublished] = useState(true);

  // View Mode: 'edit' | 'preview' | 'split'
  const [viewMode, setViewMode] = useState<"edit" | "preview" | "split">("edit");

  // Feedback & Submission
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Unsaved Changes Protection
  const [initialContent, setInitialContent] = useState("");
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const isDirty = contentHtml !== initialContent;

  const fetchPage = () => {
    setIsLoading(true);
    fetch(`/api/admin/information-pages/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Página não encontrada.");
        return res.json();
      })
      .then((data: PageData) => {
        setPage(data);
        setTitle(data.title || "");
        setDescription(data.description || "");
        setContentHtml(data.contentHtml || "");
        setVersion(data.version || "1.0");
        setIsPublished(data.isPublished ?? true);
        setInitialContent(data.contentHtml || "");
        setIsLoading(false);
      })
      .catch((e) => {
        setErrorMessage(e.message || "Erro ao carregar dados da página.");
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchPage();
  }, [id]);

  // Inserção de tags no editor de texto
  const insertTag = (before: string, after: string = "", placeholder: string = "texto") => {
    const textarea = document.getElementById("page-content-editor") as HTMLTextAreaElement | null;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = contentHtml.substring(start, end) || placeholder;
    const replacement = `${before}${selected}${after}`;

    const newContent = contentHtml.substring(0, start) + replacement + contentHtml.substring(end);
    setContentHtml(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    }, 50);
  };

  const handleSave = async (publishOverride?: boolean) => {
    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    const publishState = typeof publishOverride === "boolean" ? publishOverride : isPublished;

    try {
      const res = await fetch(`/api/admin/information-pages/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          contentHtml,
          version,
          isPublished: publishState,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Erro ao salvar página informativa.");
      } else {
        setSuccessMessage(data.message || "Página salva com sucesso!");
        setIsPublished(publishState);
        setInitialContent(contentHtml);
        if (data.page) {
          setPage(data.page);
        }
      }
    } catch {
      setErrorMessage("Erro de conexão ao salvar alterações.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestoreDefault = async () => {
    if (!confirm("Deseja realmente restaurar o modelo de texto padrão oficial? Suas alterações manuais no texto serão substituídas.")) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/information-pages/${id}/restore-default`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.page) {
        setTitle(data.page.title);
        setDescription(data.page.description || "");
        setContentHtml(data.page.contentHtml);
        setVersion(data.page.version);
        setInitialContent(data.page.contentHtml);
        setSuccessMessage("Modelo padrão restaurado com sucesso! Clique em 'Salvar Alterações' para consolidar.");
      }
    } catch {
      setErrorMessage("Erro ao restaurar modelo padrão.");
    }
  };

  const handleBack = () => {
    if (isDirty) {
      setShowExitConfirm(true);
    } else {
      router.push("/admin/paginas-informativas");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-5xl mx-auto py-8">
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse w-48" />
        <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
      </div>
    );
  }

  const cleanPreviewHtml = sanitizeCustomHtml(contentHtml);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* ================= BARRA DE TOPO & NAVEGAÇÃO ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="gap-1.5 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar para Páginas Informativas</span>
          </Button>

          <span className="text-slate-300 dark:text-slate-700">|</span>

          <nav className="text-xs text-slate-500 flex items-center gap-1.5">
            <Link href="/admin/paginas-informativas" className="hover:underline">
              Páginas Informativas
            </Link>
            <span>&gt;</span>
            <span className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[200px]">
              {title || "Editar Conteúdo"}
            </span>
          </nav>
        </div>

        {page?.publicSlug && (
          <Link href={page.publicSlug} target="_blank">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Ver Página Pública</span>
            </Button>
          </Link>
        )}
      </div>

      {/* ================= TÍTULO E AÇÕES DE SALVAMENTO ================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{title || "Editar Página"}</h1>
            {isPublished ? (
              <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10 text-xs">
                Publicada
              </Badge>
            ) : (
              <Badge variant="warning" className="text-xs">
                Rascunho
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1 font-mono">
            Identificador: <strong>{id}</strong> • Slug oficial: {page?.publicSlug}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRestoreDefault}
            className="gap-1.5 text-xs text-slate-600 dark:text-slate-400"
            title="Restaura o modelo oficial pré-definido"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Restaurar Padrão</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const nextState = !isPublished;
              setIsPublished(nextState);
              handleSave(nextState);
            }}
            className="gap-1.5 text-xs"
          >
            {isPublished ? (
              <>
                <EyeOff className="h-3.5 w-3.5 text-amber-500" />
                <span>Despublicar</span>
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5 text-emerald-500" />
                <span>Publicar</span>
              </>
            )}
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => handleSave()}
            isLoading={isSaving}
            className="gap-1.5 text-xs"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Salvar Alterações</span>
          </Button>
        </div>
      </div>

      {successMessage && (
        <Alert variant="success" className="cursor-pointer" onClick={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      {errorMessage && (
        <Alert variant="destructive" className="cursor-pointer" onClick={() => setErrorMessage(null)}>
          {errorMessage}
        </Alert>
      )}

      {/* ================= DADOS METADATA DA PÁGINA ================= */}
      <Card className="shadow-xs">
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Título Oficial da Página *
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Política de Privacidade"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Versão do Documento
              </label>
              <Input
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="1.0"
              />
            </div>

            <div className="sm:col-span-3 space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Resumo / Descrição para Mecanismos de Busca e Rodapé
              </label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Breve descrição da finalidade desta página informativa..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ================= SELETOR DE MODOS DE VISUALIZAÇÃO ================= */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setViewMode("edit")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              viewMode === "edit"
                ? "bg-white dark:bg-slate-900 text-[var(--primary)] shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <Code className="h-3.5 w-3.5" />
            <span>Editor</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("preview")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              viewMode === "preview"
                ? "bg-white dark:bg-slate-900 text-[var(--primary)] shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Pré-visualização</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("split")}
            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              viewMode === "split"
                ? "bg-white dark:bg-slate-900 text-[var(--primary)] shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <Columns className="h-3.5 w-3.5" />
            <span>Lado a Lado</span>
          </button>
        </div>

        {viewMode !== "preview" && (
          <div className="flex items-center gap-1 flex-wrap">
            <button
              type="button"
              onClick={() => insertTag("<h2>", "</h2>", "Título de Seção")}
              className="p-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-1"
              title="Título H2"
            >
              <Heading2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => insertTag("<h3>", "</h3>", "Subtítulo")}
              className="p-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-1"
              title="Subtítulo H3"
            >
              <Heading3 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => insertTag("<strong>", "</strong>", "negrito")}
              className="p-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-1"
              title="Negrito"
            >
              <Bold className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => insertTag("<em>", "</em>", "itálico")}
              className="p-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-1"
              title="Itálico"
            >
              <Italic className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => insertTag("<ul>\n  <li>", "</li>\n</ul>", "Item da lista")}
              className="p-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-1"
              title="Lista com Marcadores"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => insertTag("<ol>\n  <li>", "</li>\n</ol>", "Primeiro item")}
              className="p-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-1"
              title="Lista Numerada"
            >
              <ListOrdered className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => insertTag('<a href="https://" target="_blank" rel="noopener noreferrer">', "</a>", "Link do site")}
              className="p-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-1"
              title="Link Seguro"
            >
              <Link2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => insertTag("<blockquote>", "</blockquote>", "Texto em destaque")}
              className="p-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-1"
              title="Destaque / Citação"
            >
              <Quote className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* ================= CORPO DO EDITOR / PREVIEW ================= */}
      <div className={`grid gap-6 ${viewMode === "split" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
        {/* PAINEL DO EDITOR */}
        {(viewMode === "edit" || viewMode === "split") && (
          <div className="space-y-2">
            <textarea
              id="page-content-editor"
              value={contentHtml}
              onChange={(e) => setContentHtml(e.target.value)}
              rows={22}
              className="w-full font-mono text-xs sm:text-sm leading-relaxed p-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-y shadow-xs"
              placeholder="Digite o conteúdo da página formatado em HTML..."
            />
            <p className="text-[11px] text-slate-400">
              O conteúdo suporta parágrafos (&lt;p&gt;), cabeçalhos (&lt;h2&gt;, &lt;h3&gt;), listas (&lt;ul&gt;, &lt;ol&gt;), links externos seguros e ênfase (&lt;strong&gt;). Tags de script ou invasivas são automaticamente sanitizadas.
            </p>
          </div>
        )}

        {/* PAINEL DE PREVIEW */}
        {(viewMode === "preview" || viewMode === "split") && (
          <Card className="bg-white dark:bg-slate-900 shadow-sm border-slate-200 dark:border-slate-800 overflow-hidden">
            <CardHeader className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
              <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--primary)]">
                Pré-visualização Pública (Modo Claro)
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {title || "Título da Página"}
              </h1>
              {description && (
                <p className="text-xs text-slate-500 mt-1">{description}</p>
              )}
            </CardHeader>
            <CardContent className="p-6 sm:p-8">
              <div
                className="prose prose-slate max-w-none text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed space-y-4"
                dangerouslySetInnerHTML={{ __html: cleanPreviewHtml }}
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* ================= MODAL DE CONFIRMAÇÃO PARA SAIR COM DADOS NÃO SALVOS ================= */}
      <Modal
        isOpen={showExitConfirm}
        onClose={() => setShowExitConfirm(false)}
        title="Alterações Não Salvas"
        description="Você realizou modificações no conteúdo desta página informativa."
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-900 dark:text-amber-200">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <p>
              Se você sair agora sem salvar, todo o texto digitado ou alterado será perdido. Deseja realmente sair?
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowExitConfirm(false)}
            >
              Continuar Editando
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => router.push("/admin/paginas-informativas")}
            >
              Sair Sem Salvar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
