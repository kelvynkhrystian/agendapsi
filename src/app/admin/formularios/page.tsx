"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ClipboardList,
  Plus,
  FileUp,
  Search,
  Eye,
  Edit,
  Copy,
  Trash2,
  Archive,
  CheckCircle2,
  Clock,
  Send,
  AlertCircle,
  FileText,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";

interface FormQuestion {
  id: string;
  type: string;
  label: string;
  description?: string | null;
  placeholder?: string | null;
  isRequired: boolean;
  orderIndex: number;
  options?: string[] | null;
}

interface FormTemplate {
  id: string;
  title: string;
  description?: string | null;
  instructions?: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  version: number;
  questionsCount: number;
  assignmentsCount: number;
  createdAt: string;
  updatedAt: string;
  questions?: FormQuestion[];
}

export default function AdminFormsPage() {
  const router = useRouter();
  const [forms, setForms] = useState<FormTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PUBLISHED" | "DRAFT" | "ARCHIVED">("ALL");

  // Modal de Pré-visualização
  const [previewForm, setPreviewForm] = useState<FormTemplate | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Modal de Exclusão / Confirmação
  const [deleteTarget, setDeleteTarget] = useState<FormTemplate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Carregar lista de formulários
  const loadForms = async () => {
    setIsLoading(true);
    setActionError(null);
    try {
      const res = await fetch("/api/admin/forms");
      if (!res.ok) throw new Error("Erro ao buscar formulários.");
      const data = await res.json();
      setForms(data.forms || []);
    } catch (err: any) {
      setActionError(err.message || "Não foi possível carregar a lista de formulários.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadForms();
  }, []);

  // Duplicar formulário
  const handleDuplicate = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/forms/${id}/duplicate`, { method: "POST" });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Erro ao duplicar formulário.");
      }
      await loadForms();
    } catch (err: any) {
      alert(err.message || "Erro ao duplicar formulário.");
    }
  };

  // Excluir ou arquivar formulário
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/forms/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao excluir formulário.");
      }
      setDeleteTarget(null);
      await loadForms();
    } catch (err: any) {
      alert(err.message || "Erro ao excluir formulário.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Abrir pré-visualização completa
  const handleOpenPreview = async (form: FormTemplate) => {
    setIsLoadingPreview(true);
    setPreviewForm(form);
    try {
      const res = await fetch(`/api/admin/forms/${form.id}`);
      if (res.ok) {
        const data = await res.json();
        setPreviewForm(data.form);
      }
    } catch (err) {
      console.error("Erro ao carregar pré-visualização:", err);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Filtros
  const filteredForms = forms.filter((form) => {
    const matchesSearch =
      form.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (form.description && form.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === "ALL" ? true : form.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Estatísticas de resumo
  const totalCount = forms.length;
  const publishedCount = forms.filter((f) => f.status === "PUBLISHED").length;
  const draftCount = forms.filter((f) => f.status === "DRAFT").length;
  const totalAssignments = forms.reduce((acc, f) => acc + (f.assignmentsCount || 0), 0);

  return (
    <div className="space-y-6">
      {/* CABEÇALHO */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <ClipboardList className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Formulários
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Crie questionários clínicos personalizados, importe avaliações via PDF e envie para os pacientes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/formularios/importar">
            <Button variant="outline" className="gap-2">
              <FileUp className="w-4 h-4 text-primary" />
              <span>Importar PDF</span>
            </Button>
          </Link>
          <Link href="/admin/formularios/novo">
            <Button className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm">
              <Plus className="w-4 h-4" />
              <span>Novo Formulário</span>
            </Button>
          </Link>
        </div>
      </div>

      {actionError && (
        <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* CARDS DE RESUMO (2x2 no mobile, 4 no desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border border-border/60 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Modelos Totais</p>
              <h3 className="text-2xl font-bold text-foreground mt-1">{totalCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center text-muted-foreground">
              <ClipboardList className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Publicados</p>
              <h3 className="text-2xl font-bold text-emerald-500 mt-1">{publishedCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Rascunhos</p>
              <h3 className="text-2xl font-bold text-amber-500 mt-1">{draftCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total de Envios</p>
              <h3 className="text-2xl font-bold text-primary mt-1">{totalAssignments}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Send className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* BARRA DE PESQUISA E ABAS DE FILTRO */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por título ou descrição..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-card border-border/60"
          />
        </div>

        {/* Abas Pílula */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/60 border border-border/50 self-start sm:self-auto overflow-x-auto max-w-full">
          {(
            [
              { id: "ALL", label: "Todos" },
              { id: "PUBLISHED", label: "Publicados" },
              { id: "DRAFT", label: "Rascunhos" },
              { id: "ARCHIVED", label: "Arquivados" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                statusFilter === tab.id
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* LISTAGEM DE FORMULÁRIOS */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Carregando formulários...</p>
        </div>
      ) : filteredForms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-2xl border border-dashed border-border/80 bg-card/40">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
            <ClipboardList className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Nenhum formulário encontrado</h3>
          <p className="text-sm text-muted-foreground max-w-md mt-1 mb-6">
            {searchQuery || statusFilter !== "ALL"
              ? "Nenhum formulário corresponde aos filtros de busca aplicados."
              : "Você ainda não possui formulários cadastrados. Comece criando um formulário manual ou importando um questionário via PDF."}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/admin/formularios/novo">
              <Button className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
                <Plus className="w-4 h-4" />
                <span>Criar Primeiro Formulário</span>
              </Button>
            </Link>
            <Link href="/admin/formularios/importar">
              <Button variant="outline" className="gap-2">
                <FileUp className="w-4 h-4" />
                <span>Importar via PDF</span>
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredForms.map((form) => (
            <Card
              key={form.id}
              className="border border-border/60 bg-card/70 hover:border-primary/40 transition-all shadow-xs flex flex-col justify-between"
            >
              <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h4 className="font-semibold text-foreground text-base leading-snug line-clamp-2">
                      {form.title}
                    </h4>
                    <Badge
                      variant={
                        form.status === "PUBLISHED"
                          ? "default"
                          : form.status === "DRAFT"
                          ? "secondary"
                          : "outline"
                      }
                      className={
                        form.status === "PUBLISHED"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : form.status === "DRAFT"
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {form.status === "PUBLISHED"
                        ? "Publicado"
                        : form.status === "DRAFT"
                        ? "Rascunho"
                        : "Arquivado"}
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2 min-h-[32px]">
                    {form.description || "Sem descrição informada."}
                  </p>

                  <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border/40 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" />
                      {form.questionsCount} {form.questionsCount === 1 ? "questão" : "questões"}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Send className="w-3.5 h-3.5" />
                      {form.assignmentsCount} {form.assignmentsCount === 1 ? "envio" : "envios"}
                    </span>
                    <span>•</span>
                    <span>v{form.version}</span>
                  </div>
                </div>

                {/* AÇÕES DO CARD */}
                <div className="flex items-center justify-between gap-1 pt-3 border-t border-border/40">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleOpenPreview(form)}
                    className="h-8 px-2 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                    title="Pré-visualizar formulário"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Visualizar</span>
                  </Button>

                  <div className="flex items-center gap-1">
                    <Link href={`/admin/formularios/${form.id}/editar`}>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                        title="Editar formulário"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                    </Link>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDuplicate(form.id)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                      title="Duplicar formulário"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteTarget(form)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      title="Excluir ou arquivar"
                    >
                      {form.assignmentsCount > 0 ? (
                        <Archive className="w-3.5 h-3.5" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* MODAL DE PRÉ-VISUALIZAÇÃO */}
      <Modal
        isOpen={!!previewForm}
        onClose={() => setPreviewForm(null)}
        title={previewForm?.title || "Visualização do Formulário"}
      >
        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
          {previewForm?.description && (
            <p className="text-sm text-muted-foreground">
              {previewForm.description}
            </p>
          )}

          {previewForm?.instructions && (
            <div className="p-3.5 rounded-xl bg-muted/50 border border-border/50 text-xs text-muted-foreground">
              <strong className="block text-foreground mb-1">Instruções aos pacientes:</strong>
              {previewForm.instructions}
            </div>
          )}

          {isLoadingPreview ? (
            <div className="py-12 flex justify-center">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !previewForm?.questions || previewForm.questions.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Este formulário ainda não possui perguntas adicionadas.
            </div>
          ) : (
            <div className="space-y-4">
              {previewForm.questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="p-4 rounded-xl border border-border/60 bg-card/60 space-y-2"
                >
                  {q.type === "INFO_SECTION" ? (
                    <div>
                      <h4 className="font-semibold text-primary text-sm">{q.label}</h4>
                      {q.description && (
                        <p className="text-xs text-muted-foreground mt-1">{q.description}</p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <label className="text-sm font-medium text-foreground">
                          {idx + 1}. {q.label}
                          {q.isRequired && <span className="text-destructive ml-1">*</span>}
                        </label>
                      </div>

                      {q.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{q.description}</p>
                      )}

                      {/* Mock de Renderização do Campo */}
                      <div className="mt-3">
                        {q.type === "SHORT_TEXT" && (
                          <Input
                            disabled
                            placeholder={q.placeholder || "Resposta curta do paciente..."}
                            className="bg-muted/40 cursor-not-allowed text-xs"
                          />
                        )}

                        {q.type === "LONG_TEXT" && (
                          <textarea
                            disabled
                            rows={3}
                            placeholder={q.placeholder || "Resposta em parágrafo..."}
                            className="w-full rounded-md border border-input bg-muted/40 px-3 py-2 text-xs cursor-not-allowed"
                          />
                        )}

                        {q.type === "NUMBER" && (
                          <Input
                            type="number"
                            disabled
                            placeholder={q.placeholder || "0"}
                            className="bg-muted/40 cursor-not-allowed text-xs max-w-xs"
                          />
                        )}

                        {q.type === "DATE" && (
                          <Input
                            type="date"
                            disabled
                            className="bg-muted/40 cursor-not-allowed text-xs max-w-xs"
                          />
                        )}

                        {q.type === "YES_NO" && (
                          <div className="flex items-center gap-4 text-xs">
                            <label className="flex items-center gap-2 text-muted-foreground">
                              <input type="radio" disabled /> Sim
                            </label>
                            <label className="flex items-center gap-2 text-muted-foreground">
                              <input type="radio" disabled /> Não
                            </label>
                          </div>
                        )}

                        {(q.type === "SINGLE_CHOICE" || q.type === "MULTIPLE_CHOICE") && (
                          <div className="space-y-1.5 pt-1">
                            {(q.options || ["Opção 1", "Opção 2"]).map((opt, optIdx) => (
                              <label
                                key={optIdx}
                                className="flex items-center gap-2 text-xs text-muted-foreground"
                              >
                                <input
                                  type={q.type === "SINGLE_CHOICE" ? "radio" : "checkbox"}
                                  disabled
                                />
                                {opt}
                              </label>
                            ))}
                          </div>
                        )}

                        {q.type === "DROPDOWN" && (
                          <select
                            disabled
                            className="w-full max-w-xs rounded-md border border-input bg-muted/40 px-3 py-2 text-xs text-muted-foreground cursor-not-allowed"
                          >
                            <option>Selecione uma opção...</option>
                            {(q.options || []).map((opt, optIdx) => (
                              <option key={optIdx}>{opt}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-border/40">
            <Button variant="outline" onClick={() => setPreviewForm(null)}>
              Fechar
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO / ARQUIVAMENTO */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={
          deleteTarget && deleteTarget.assignmentsCount > 0
            ? "Arquivar Formulário"
            : "Excluir Formulário"
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-foreground">
            {deleteTarget && deleteTarget.assignmentsCount > 0 ? (
              <>
                O formulário <strong>&quot;{deleteTarget.title}&quot;</strong> já possui{" "}
                <strong>{deleteTarget.assignmentsCount} envio(s)</strong> registrados para pacientes.
                Para garantir a integridade dos históricos clínicos, ele será <strong>arquivado</strong> e
                não poderá mais ser enviado para novos pacientes, mas os preenchimentos anteriores continuarão salvos.
              </>
            ) : (
              <>
                Tem certeza de que deseja excluir permanentemente o formulário{" "}
                <strong>&quot;{deleteTarget?.title}&quot;</strong>? Esta ação não pode ser desfeita.
              </>
            )}
          </p>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border/40">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Processando..." : deleteTarget && deleteTarget.assignmentsCount > 0 ? "Arquivar" : "Excluir Permanentemente"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
