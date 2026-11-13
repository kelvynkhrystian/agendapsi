"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Eye,
  Save,
  CheckCircle2,
  Copy,
  Info,
  AlertCircle,
  Type,
  AlignLeft,
  CircleDot,
  CheckSquare,
  ListFilter,
  Hash,
  Calendar,
  ToggleLeft,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";

export type QuestionType =
  | "SHORT_TEXT"
  | "LONG_TEXT"
  | "SINGLE_CHOICE"
  | "MULTIPLE_CHOICE"
  | "DROPDOWN"
  | "NUMBER"
  | "DATE"
  | "YES_NO"
  | "INFO_SECTION";

export interface FormQuestionItem {
  id: string;
  type: QuestionType;
  label: string;
  description?: string;
  placeholder?: string;
  isRequired: boolean;
  orderIndex: number;
  options?: string[];
}

export interface FormTemplateData {
  id?: string;
  title: string;
  description?: string;
  instructions?: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  version?: number;
  questions: FormQuestionItem[];
}

interface FormBuilderProps {
  initialData?: FormTemplateData;
  isEditing?: boolean;
}

const QUESTION_TYPES_CONFIG: {
  type: QuestionType;
  label: string;
  description: string;
  icon: any;
}[] = [
  {
    type: "SHORT_TEXT",
    label: "Resposta curta",
    description: "Linha de texto para respostas breves",
    icon: Type,
  },
  {
    type: "LONG_TEXT",
    label: "Parágrafo",
    description: "Área de texto para relatos e descrições detalhadas",
    icon: AlignLeft,
  },
  {
    type: "SINGLE_CHOICE",
    label: "Escolha única",
    description: "Botões de seleção onde apenas uma opção pode ser marcada",
    icon: CircleDot,
  },
  {
    type: "MULTIPLE_CHOICE",
    label: "Múltipla escolha",
    description: "Caixas de seleção para marcar uma ou mais opções",
    icon: CheckSquare,
  },
  {
    type: "DROPDOWN",
    label: "Lista suspensa",
    description: "Menu suspenso com opções compactas",
    icon: ListFilter,
  },
  {
    type: "NUMBER",
    label: "Número",
    description: "Valores numéricos, idades ou escalas",
    icon: Hash,
  },
  {
    type: "DATE",
    label: "Data",
    description: "Seletor de dia, mês e ano",
    icon: Calendar,
  },
  {
    type: "YES_NO",
    label: "Sim ou Não",
    description: "Escolha binária direta entre Sim e Não",
    icon: ToggleLeft,
  },
  {
    type: "INFO_SECTION",
    label: "Título / Informativo",
    description: "Texto orientativo ou divisor de temas sem campo de resposta",
    icon: Info,
  },
];

export default function FormBuilder({ initialData, isEditing = false }: FormBuilderProps) {
  const router = useRouter();

  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [instructions, setInstructions] = useState(initialData?.instructions || "");
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED">(
    initialData?.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT"
  );
  const [questions, setQuestions] = useState<FormQuestionItem[]>(
    initialData?.questions && initialData.questions.length > 0
      ? initialData.questions
      : []
  );

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isTypePickerOpen, setIsTypePickerOpen] = useState(false);

  // Adicionar nova pergunta
  const handleAddQuestion = (type: QuestionType) => {
    const newId = `q-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const newQuestion: FormQuestionItem = {
      id: newId,
      type,
      label: type === "INFO_SECTION" ? "Nova Seção Informativa" : "Nova Pergunta",
      description: "",
      placeholder: "",
      isRequired: type !== "INFO_SECTION",
      orderIndex: questions.length + 1,
      options:
        type === "SINGLE_CHOICE" || type === "MULTIPLE_CHOICE" || type === "DROPDOWN"
          ? ["Opção 1", "Opção 2", "Opção 3"]
          : type === "YES_NO"
          ? ["Sim", "Não"]
          : undefined,
    };

    setQuestions([...questions, newQuestion]);
    setIsTypePickerOpen(false);
  };

  // Atualizar campo de uma pergunta
  const handleUpdateQuestion = (id: string, updates: Partial<FormQuestionItem>) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, ...updates } : q))
    );
  };

  // Remover pergunta
  const handleRemoveQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  // Duplicar pergunta
  const handleDuplicateQuestion = (index: number) => {
    const target = questions[index];
    const duplicated: FormQuestionItem = {
      ...target,
      id: `q-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      label: `${target.label} (Cópia)`,
      orderIndex: index + 2,
    };

    const next = [...questions];
    next.splice(index + 1, 0, duplicated);
    setQuestions(next);
  };

  // Mover para cima
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const next = [...questions];
    const [moved] = next.splice(index, 1);
    next.splice(index - 1, 0, moved);
    setQuestions(next);
  };

  // Mover para baixo
  const handleMoveDown = (index: number) => {
    if (index === questions.length - 1) return;
    const next = [...questions];
    const [moved] = next.splice(index, 1);
    next.splice(index + 1, 0, moved);
    setQuestions(next);
  };

  // Adicionar alternativa
  const handleAddOption = (questionId: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== questionId) return q;
        const currentOptions = q.options || [];
        return {
          ...q,
          options: [...currentOptions, `Nova Opção ${currentOptions.length + 1}`],
        };
      })
    );
  };

  // Editar alternativa
  const handleUpdateOption = (questionId: string, optIndex: number, newValue: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== questionId) return q;
        const newOptions = [...(q.options || [])];
        newOptions[optIndex] = newValue;
        return { ...q, options: newOptions };
      })
    );
  };

  // Remover alternativa
  const handleRemoveOption = (questionId: string, optIndex: number) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== questionId) return q;
        const newOptions = [...(q.options || [])];
        newOptions.splice(optIndex, 1);
        return { ...q, options: newOptions };
      })
    );
  };

  // Salvar formulário (Rascunho ou Publicado)
  const handleSave = async (targetStatus?: "DRAFT" | "PUBLISHED") => {
    const finalStatus = targetStatus || status;
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage("O título do formulário é obrigatório.");
      return;
    }

    if (questions.length === 0) {
      setErrorMessage("Adicione pelo menos uma pergunta ou seção ao formulário.");
      return;
    }

    // Validar labels vazios
    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].label.trim()) {
        setErrorMessage(`A questão nº ${i + 1} precisa ter um enunciado.`);
        return;
      }
    }

    setIsSaving(true);

    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        instructions: instructions.trim() || null,
        status: finalStatus,
        questions: questions.map((q, idx) => ({
          type: q.type,
          label: q.label.trim(),
          description: q.description?.trim() || null,
          placeholder: q.placeholder?.trim() || null,
          isRequired: q.isRequired,
          orderIndex: idx + 1,
          options: q.options || null,
        })),
      };

      const url = isEditing && initialData?.id
        ? `/api/admin/forms/${initialData.id}`
        : "/api/admin/forms";

      const method = isEditing && initialData?.id ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro ao salvar formulário.");
      }

      router.push("/admin/formularios");
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || "Erro inesperado ao salvar formulário.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* CABEÇALHO SUPERIOR COM BOTÕES DE AÇÃO */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/40 sticky top-0 bg-background/95 backdrop-blur-sm z-10 pt-2">
        <div className="flex items-center gap-3">
          <Link href="/admin/formularios">
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {isEditing ? "Editar Formulário" : "Novo Formulário"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {isEditing
                ? `Versão v${initialData?.version || 1} • Configuração e perguntas`
                : "Construa o questionário que será respondido pelos seus pacientes"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPreviewOpen(true)}
            className="gap-1.5 text-xs"
            disabled={questions.length === 0}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Pré-visualizar</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSave("DRAFT")}
            disabled={isSaving}
            className="gap-1.5 text-xs text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Salvar Rascunho</span>
          </Button>

          <Button
            size="sm"
            onClick={() => handleSave("PUBLISHED")}
            disabled={isSaving}
            className="gap-1.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{isSaving ? "Salvando..." : "Publicar Formulário"}</span>
          </Button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* DADOS BÁSICOS DO FORMULÁRIO */}
      <Card className="border border-border/60 bg-card/80 shadow-xs">
        <CardContent className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Título do Formulário <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="Ex: Escala de Ansiedade (GAD-7), Histórico Clínico Inicial..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-base font-medium bg-background"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Descrição do Formulário (Opcional)
            </label>
            <textarea
              placeholder="Breve resumo ou finalidade deste questionário para organização interna..."
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Instruções para o Paciente (Opcional)
            </label>
            <textarea
              placeholder="Orientações que serão exibidas no topo do formulário quando o paciente for responder (ex: 'Responda com base nas últimas 2 semanas')..."
              rows={2}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </CardContent>
      </Card>

      {/* LISTA DE QUESTÕES */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <span>Perguntas e Estrutura</span>
            <Badge variant="outline" className="text-xs font-normal">
              {questions.length} {questions.length === 1 ? "item" : "itens"}
            </Badge>
          </h2>

          <Button
            size="sm"
            onClick={() => setIsTypePickerOpen(true)}
            className="gap-1.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Questão</span>
          </Button>
        </div>

        {questions.length === 0 ? (
          <div className="py-12 px-4 text-center rounded-2xl border border-dashed border-border/80 bg-card/40 flex flex-col items-center">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
              <Plus className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-foreground text-sm">Nenhuma pergunta adicionada</h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
              Comece adicionando a primeira pergunta ou seção explicativa do formulário.
            </p>
            <Button
              size="sm"
              onClick={() => setIsTypePickerOpen(true)}
              className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Escolher Tipo de Pergunta</span>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((q, idx) => {
              const typeCfg = QUESTION_TYPES_CONFIG.find((t) => t.type === q.type);
              const TypeIcon = typeCfg?.icon || HelpCircle;

              return (
                <Card
                  key={q.id}
                  className={`border transition-all ${
                    q.type === "INFO_SECTION"
                      ? "border-primary/30 bg-primary/5"
                      : "border-border/60 bg-card/80"
                  }`}
                >
                  <CardContent className="p-4 sm:p-5 space-y-4">
                    {/* CABEÇALHO DO CARD DA QUESTÃO */}
                    <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-muted flex items-center justify-center text-xs font-bold text-foreground">
                          {idx + 1}
                        </span>
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted/60 text-xs font-medium text-foreground">
                          <TypeIcon className="w-3.5 h-3.5 text-primary" />
                          <span>{typeCfg?.label || q.type}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={idx === 0}
                          onClick={() => handleMoveUp(idx)}
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title="Mover para cima"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={idx === questions.length - 1}
                          onClick={() => handleMoveDown(idx)}
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title="Mover para baixo"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDuplicateQuestion(idx)}
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title="Duplicar questão"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveQuestion(q.id)}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          title="Excluir questão"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* CORPO DA QUESTÃO */}
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-foreground">
                          {q.type === "INFO_SECTION" ? "Título do Informativo / Seção" : "Enunciado da Pergunta"}{" "}
                          <span className="text-destructive">*</span>
                        </label>
                        <Input
                          placeholder={
                            q.type === "INFO_SECTION"
                              ? "Ex: Orientações Gerais..."
                              : "Digite o enunciado da pergunta..."
                          }
                          value={q.label}
                          onChange={(e) => handleUpdateQuestion(q.id, { label: e.target.value })}
                          className="bg-background text-sm font-medium"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">
                          {q.type === "INFO_SECTION" ? "Texto Explicativo Detalhado" : "Descrição ou Dica de Apoio (Opcional)"}
                        </label>
                        <textarea
                          placeholder={
                            q.type === "INFO_SECTION"
                              ? "Texto orientativo completo..."
                              : "Explicação ou instrução complementar para o paciente..."
                          }
                          rows={2}
                          value={q.description || ""}
                          onChange={(e) =>
                            handleUpdateQuestion(q.id, { description: e.target.value })
                          }
                          className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                      </div>

                      {/* PLACEHOLDER PARA CAMPOS DE TEXTO E NÚMERO */}
                      {(q.type === "SHORT_TEXT" || q.type === "LONG_TEXT" || q.type === "NUMBER") && (
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">
                            Placeholder / Texto Guia (Opcional)
                          </label>
                          <Input
                            placeholder="Texto cinza de exemplo exibido antes do paciente digitar..."
                            value={q.placeholder || ""}
                            onChange={(e) =>
                              handleUpdateQuestion(q.id, { placeholder: e.target.value })
                            }
                            className="bg-background text-xs"
                          />
                        </div>
                      )}

                      {/* GESTÃO DE ALTERNATIVAS PARA ESCOLHA ÚNICA, MÚLTIPLA ESCOLHA E DROPDOWN */}
                      {(q.type === "SINGLE_CHOICE" ||
                        q.type === "MULTIPLE_CHOICE" ||
                        q.type === "DROPDOWN") && (
                        <div className="space-y-2 pt-2 border-t border-border/40">
                          <label className="text-xs font-semibold text-foreground uppercase tracking-wider block">
                            Alternativas de Resposta
                          </label>
                          <div className="space-y-2">
                            {(q.options || []).map((opt, optIdx) => (
                              <div key={optIdx} className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground w-4 text-center">
                                  {optIdx + 1}.
                                </span>
                                <Input
                                  value={opt}
                                  onChange={(e) =>
                                    handleUpdateOption(q.id, optIdx, e.target.value)
                                  }
                                  className="h-8 text-xs bg-background flex-1"
                                />
                                {(q.options?.length || 0) > 1 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveOption(q.id, optIdx)}
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddOption(q.id)}
                            className="text-xs gap-1.5 mt-2 h-7"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Adicionar Alternativa</span>
                          </Button>
                        </div>
                      )}

                      {/* TOGGLE DE OBRIGATÓRIA (EXCETO SEÇÃO INFORMATIVA) */}
                      {q.type !== "INFO_SECTION" && (
                        <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                          <label className="text-xs font-medium text-foreground cursor-pointer flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={q.isRequired}
                              onChange={(e) =>
                                handleUpdateQuestion(q.id, { isRequired: e.target.checked })
                              }
                              className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                            />
                            <span>Resposta obrigatória</span>
                          </label>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* BOTÃO ADICIONAR NO FIM */}
        {questions.length > 0 && (
          <div className="flex justify-center pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsTypePickerOpen(true)}
              className="gap-2 border-dashed border-border/80 hover:border-primary/50 text-xs py-5 px-6"
            >
              <Plus className="w-4 h-4 text-primary" />
              <span>Adicionar Mais uma Pergunta</span>
            </Button>
          </div>
        )}
      </div>

      {/* MODAL SELETOR DE TIPO DE PERGUNTA */}
      <Modal
        isOpen={isTypePickerOpen}
        onClose={() => setIsTypePickerOpen(false)}
        title="Escolha o Tipo de Pergunta"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto pr-1">
          {QUESTION_TYPES_CONFIG.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.type}
                type="button"
                onClick={() => handleAddQuestion(item.type)}
                className="flex items-start gap-3 p-3.5 rounded-xl border border-border/60 bg-card/60 hover:bg-muted/60 hover:border-primary/40 transition-all text-left group"
              >
                <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                    {item.label}
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    {item.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </Modal>

      {/* MODAL DE PRÉ-VISUALIZAÇÃO */}
      <Modal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title={title || "Pré-visualização do Formulário"}
      >
        <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}

          {instructions && (
            <div className="p-3.5 rounded-xl bg-muted/60 border border-border/50 text-xs text-muted-foreground">
              <strong className="block text-foreground mb-1">Instruções para o Paciente:</strong>
              {instructions}
            </div>
          )}

          <div className="space-y-4">
            {questions.map((q, idx) => (
              <div
                key={q.id}
                className="p-4 rounded-xl border border-border/60 bg-card/50 space-y-2"
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
                    <label className="text-xs font-semibold text-foreground block">
                      {idx + 1}. {q.label}
                      {q.isRequired && <span className="text-destructive ml-1">*</span>}
                    </label>

                    {q.description && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 mb-2">
                        {q.description}
                      </p>
                    )}

                    <div className="mt-2">
                      {q.type === "SHORT_TEXT" && (
                        <Input
                          placeholder={q.placeholder || "Sua resposta..."}
                          className="text-xs bg-background"
                          disabled
                        />
                      )}

                      {q.type === "LONG_TEXT" && (
                        <textarea
                          rows={3}
                          placeholder={q.placeholder || "Escreva detalhadamente..."}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                          disabled
                        />
                      )}

                      {q.type === "NUMBER" && (
                        <Input
                          type="number"
                          placeholder={q.placeholder || "0"}
                          className="text-xs bg-background max-w-xs"
                          disabled
                        />
                      )}

                      {q.type === "DATE" && (
                        <Input
                          type="date"
                          className="text-xs bg-background max-w-xs"
                          disabled
                        />
                      )}

                      {q.type === "YES_NO" && (
                        <div className="flex items-center gap-4 text-xs pt-1">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input type="radio" disabled />
                            <span>Sim</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input type="radio" disabled />
                            <span>Não</span>
                          </label>
                        </div>
                      )}

                      {(q.type === "SINGLE_CHOICE" || q.type === "MULTIPLE_CHOICE") && (
                        <div className="space-y-1.5 pt-1">
                          {(q.options || []).map((opt, optIdx) => (
                            <label
                              key={optIdx}
                              className="flex items-center gap-2 text-xs text-foreground cursor-pointer"
                            >
                              <input
                                type={q.type === "SINGLE_CHOICE" ? "radio" : "checkbox"}
                                disabled
                              />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {q.type === "DROPDOWN" && (
                        <select
                          disabled
                          className="w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-xs text-muted-foreground"
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

          <div className="flex justify-end pt-4 border-t border-border/40">
            <Button variant="outline" size="sm" onClick={() => setIsPreviewOpen(false)}>
              Fechar Pré-visualização
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
