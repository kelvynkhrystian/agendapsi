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
  Send,
  AlertCircle,
  FileText,
} from "pulsoicon-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

  // Filtragem exclusivamente por título ou descrição
  const filteredForms = forms.filter((form) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      form.title.toLowerCase().includes(q) ||
      (form.description && form.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* CABEÇALHO LIMPO: TÍTULO E DESCRIÇÃO */}
      <div className="pb-2 border-b border-border/40">
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

      {actionError && (
        <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* NOVA TOOLBAR HORIZONTAL: BUSCA (ESQUERDA) + AÇÕES (DIREITA) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Campo de Busca com Ícone de Lupa Integrado */}
        <div className="relative flex-1 sm:max-w-md w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Pesquisar formulários..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 bg-card border-border/60 text-sm"
          />
        </div>

        {/* Botões de Ação Alinhados à Direita no Desktop; Lado a Lado (50% cada) no Mobile */}
        <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
          <Link href="/admin/formularios/importar" className="w-full sm:w-auto">
            <Button
              variant="outline"
              className="w-full sm:w-auto h-10 gap-2 text-xs sm:text-sm font-medium border-border/60 hover:bg-muted/50"
            >
              <FileUp className="w-4 h-4 text-primary" />
              <span>Importar PDF</span>
            </Button>
          </Link>
          <Link href="/admin/formularios/novo" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto h-10 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm font-medium shadow-xs">
              <Plus className="w-4 h-4" />
              <span>Novo Formulário</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* LISTAGEM DE FORMULÁRIOS CRIADOS */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Carregando formulários...</p>
        </div>
      ) : forms.length === 0 ? (
        /* Empty State: Nenhum formulário cadastrado no sistema */
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-2xl border border-dashed border-border/80 bg-card/40">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
            <ClipboardList className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Nenhum formulário criado</h3>
          <p className="text-sm text-muted-foreground max-w-md mt-1 mb-6">
            Crie seu primeiro formulário ou importe um PDF para começar.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/admin/formularios/novo">
              <Button className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
                <Plus className="w-4 h-4" />
                <span>Novo Formulário</span>
              </Button>
            </Link>
            <Link href="/admin/formularios/importar">
              <Button variant="outline" className="gap-2">
                <FileUp className="w-4 h-4 text-primary" />
                <span>Importar PDF</span>
              </Button>
            </Link>
          </div>
        </div>
      ) : filteredForms.length === 0 ? (
        /* Empty State: Busca sem resultados */
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-2xl border border-dashed border-border/80 bg-card/40">
          <div className="w-14 h-14 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center mb-4">
            <Search className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Nenhum formulário encontrado</h3>
          <p className="text-sm text-muted-foreground max-w-md mt-1 mb-4">
            Nenhum formulário corresponde à sua pesquisa &ldquo;{searchQuery}&rdquo;.
          </p>
          <Button variant="outline" size="sm" onClick={() => setSearchQuery("")}>
            Limpar pesquisa
          </Button>
        </div>
      ) : (
        /* Grid de Formulários Criados */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredForms.map((form) => (
            <Card
              key={form.id}
              className="border border-border/60 bg-card/70 hover:border-primary/40 transition-all shadow-xs flex flex-col justify-between"
            >
              <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <h4 className="font-semibold text-foreground text-base leading-snug line-clamp-2 mb-2">
                    {form.title}
                  </h4>

                  <p className="text-xs text-muted-foreground line-clamp-2 min-h-[32px]">
                    {form.description || "Sem descrição informada."}
                  </p>

                  <div className="flex items-center gap-2.5 mt-4 pt-3 border-t border-border/40 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 font-medium">
                      <FileText className="w-3.5 h-3.5" />
                      {form.questionsCount} {form.questionsCount === 1 ? "questão" : "questões"}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Send className="w-3.5 h-3.5" />
                      {form.assignmentsCount} {form.assignmentsCount === 1 ? "envio" : "envios"}
                    </span>
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
                      title={form.assignmentsCount > 0 ? "Arquivar formulário" : "Excluir formulário"}
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
