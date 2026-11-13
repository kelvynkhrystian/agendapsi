"use client";

import React, { useEffect, useState, useRef, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Save,
  Download,
  Calendar,
  Send,
  HelpCircle,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface QuestionItem {
  id: string;
  type: string;
  label: string;
  description?: string;
  placeholder?: string;
  isRequired: boolean;
  orderIndex: number;
  options?: string[];
}

interface FormAssignmentDetail {
  id: string;
  title: string;
  description?: string;
  instructions?: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "EXPIRED" | "CANCELLED";
  expiresAt?: string | null;
  submittedAt?: string | null;
  questions: QuestionItem[];
  answers: Record<string, any>;
}

export default function PatientFillFormPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const { assignmentId } = use(params);
  const router = useRouter();

  const [form, setForm] = useState<FormAssignmentDetail | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  // Carrega os dados do formulário
  useEffect(() => {
    async function loadForm() {
      try {
        const res = await fetch(`/api/patient/forms/${assignmentId}`);
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Erro ao carregar o formulário.");
        }
        const data = await res.json();
        setForm(data.form);
        setAnswers(data.form.answers || {});
      } catch (err: any) {
        setErrorMessage(err.message || "Não foi possível carregar este formulário.");
      } finally {
        setIsLoading(false);
      }
    }

    loadForm();
  }, [assignmentId]);

  // Função para salvar rascunho
  const saveDraft = async (currentAnswers: Record<string, any>, silent = false) => {
    if (!form || form.status === "COMPLETED") return;
    if (!silent) setIsSavingDraft(true);
    setSaveStatus("saving");

    try {
      const res = await fetch(`/api/patient/forms/${assignmentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: currentAnswers,
          isDraft: true,
        }),
      });

      if (res.ok) {
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2500);
      }
    } catch (err) {
      console.error("Falha ao salvar rascunho:", err);
    } finally {
      if (!silent) setIsSavingDraft(false);
    }
  };

  // Manipulador de alteração de campo com auto-save debounced
  const handleAnswerChange = (questionId: string, value: any) => {
    const updated = { ...answers, [questionId]: value };
    setAnswers(updated);
    setValidationErrors([]);

    if (form?.status !== "COMPLETED") {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
      debounceTimeout.current = setTimeout(() => {
        saveDraft(updated, true);
      }, 1200);
    }
  };

  // Manipulador de checkboxes (múltipla escolha)
  const handleCheckboxChange = (questionId: string, option: string, isChecked: boolean) => {
    const current = Array.isArray(answers[questionId]) ? [...answers[questionId]] : [];
    let updatedOptions: string[];
    if (isChecked) {
      updatedOptions = [...current, option];
    } else {
      updatedOptions = current.filter((o) => o !== option);
    }
    handleAnswerChange(questionId, updatedOptions);
  };

  // Submissão final do formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;

    setValidationErrors([]);
    setErrorMessage(null);

    // Validação local de campos obrigatórios
    const missing: string[] = [];
    for (const q of form.questions) {
      if (q.type === "INFO_SECTION") continue;
      if (q.isRequired) {
        const val = answers[q.id];
        const isEmpty =
          val === undefined ||
          val === null ||
          val === "" ||
          (Array.isArray(val) && val.length === 0);

        if (isEmpty) {
          missing.push(q.label);
        }
      }
    }

    if (missing.length > 0) {
      setValidationErrors(missing);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (!confirm("Deseja realmente enviar suas respostas? Após o envio, o formulário será finalizado.")) {
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/patient/forms/${assignmentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers,
          isDraft: false,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro ao enviar respostas.");
      }

      setSuccessMessage("Formulário respondido e enviado com sucesso!");
      setForm((prev) => (prev ? { ...prev, status: "COMPLETED", submittedAt: new Date().toISOString() } : null));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setErrorMessage(err.message || "Erro ao processar envio.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Carregando formulário...</p>
      </div>
    );
  }

  if (errorMessage && !form) {
    return (
      <div className="p-6 max-w-xl mx-auto rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-sm flex items-center gap-3">
        <AlertCircle className="w-6 h-6 shrink-0" />
        <div>
          <h3 className="font-semibold">Não foi possível abrir o formulário</h3>
          <p className="text-xs mt-1">{errorMessage}</p>
          <Link href="/paciente/formularios" className="inline-block mt-3">
            <Button variant="outline" size="sm">
              Voltar aos Formulários
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!form) return null;

  const isCompleted = form.status === "COMPLETED";
  const isExpired = form.status === "EXPIRED";

  // Calcular progresso
  const totalQuestions = form.questions.filter((q) => q.type !== "INFO_SECTION").length;
  const answeredQuestions = form.questions.filter((q) => {
    if (q.type === "INFO_SECTION") return false;
    const v = answers[q.id];
    return v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0);
  }).length;
  const progressPercent = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-16">
      {/* CABEÇALHO */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/40 sticky top-0 bg-background/95 backdrop-blur-sm z-10 pt-2">
        <div className="flex items-center gap-3">
          <Link href="/paciente/formularios">
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <span>{form.title}</span>
              {isCompleted && (
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs font-normal">
                  Concluído
                </Badge>
              )}
            </h1>
            <p className="text-xs text-muted-foreground">
              {isCompleted
                ? `Enviado em ${new Date(form.submittedAt || "").toLocaleString("pt-BR")}`
                : `${answeredQuestions} de ${totalQuestions} respondidas (${progressPercent}%)`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isCompleted && !isExpired && (
            <>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {saveStatus === "saving" && "Salvando rascunho..."}
                {saveStatus === "saved" && "Rascunho salvo ✓"}
              </span>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => saveDraft(answers)}
                disabled={isSavingDraft || isSubmitting}
                className="gap-1.5 text-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Salvar</span>
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleSubmit}
                disabled={isSubmitting || isSavingDraft}
                className="gap-1.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? "Enviando..." : "Finalizar e Enviar"}</span>
              </Button>
            </>
          )}

          {isCompleted && (
            <a href={`/api/patient/forms/${form.id}/pdf`} download>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/10">
                <Download className="w-3.5 h-3.5" />
                <span>Baixar Comprovante PDF</span>
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* MENSAGEM DE SUCESSO OU ERRO */}
      {successMessage && (
        <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {validationErrors.length > 0 && (
        <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-sm space-y-2">
          <div className="flex items-center gap-2 font-semibold">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>Por favor, responda às seguintes perguntas obrigatórias antes de enviar:</span>
          </div>
          <ul className="text-xs list-disc pl-5 space-y-1">
            {validationErrors.map((label, i) => (
              <li key={i}>{label}</li>
            ))}
          </ul>
        </div>
      )}

      {/* INSTRUÇÕES DO FORMULÁRIO */}
      {form.instructions && (
        <div className="p-4 rounded-xl bg-muted/60 border border-border/50 text-xs text-muted-foreground space-y-1">
          <strong className="block text-foreground text-sm font-semibold">Instruções para o preenchimento:</strong>
          <p className="leading-relaxed">{form.instructions}</p>
        </div>
      )}

      {/* BARRA DE PROGRESSO (SE NÃO CONCLUÍDO) */}
      {!isCompleted && !isExpired && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progresso do preenchimento</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* AVISO DE SOMENTE LEITURA PARA CONCLUÍDO */}
      {isCompleted && (
        <div className="p-3.5 rounded-xl bg-card border border-border/60 text-xs text-muted-foreground flex items-center gap-2">
          <Lock className="w-4 h-4 text-primary shrink-0" />
          <span>
            Este formulário já foi finalizado e enviado. As respostas abaixo são mantidas para consulta e download.
          </span>
        </div>
      )}

      {/* LISTAGEM DE QUESTÕES */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {form.questions.map((q, idx) => {
          const answerValue = answers[q.id];

          // 1. SEÇÃO INFORMATIVA
          if (q.type === "INFO_SECTION") {
            return (
              <div
                key={q.id}
                className="p-5 rounded-2xl bg-primary/5 border border-primary/20 space-y-2"
              >
                <h3 className="font-bold text-primary text-base">{q.label}</h3>
                {q.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {q.description}
                  </p>
                )}
              </div>
            );
          }

          return (
            <Card
              key={q.id}
              className={`border transition-all ${
                isCompleted ? "border-border/40 bg-card/40" : "border-border/60 bg-card/80"
              }`}
            >
              <CardContent className="p-5 space-y-3">
                <div>
                  <label className="text-sm font-semibold text-foreground block">
                    {idx + 1}. {q.label}
                    {q.isRequired && <span className="text-destructive ml-1">*</span>}
                  </label>

                  {q.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {q.description}
                    </p>
                  )}
                </div>

                {/* RESPOSTA CURTA */}
                {q.type === "SHORT_TEXT" && (
                  <Input
                    disabled={isCompleted || isExpired}
                    placeholder={q.placeholder || "Digite sua resposta..."}
                    value={answerValue || ""}
                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    className="text-sm bg-background"
                  />
                )}

                {/* PARÁGRAFO / RESPOSTA LONGA */}
                {q.type === "LONG_TEXT" && (
                  <textarea
                    disabled={isCompleted || isExpired}
                    rows={4}
                    placeholder={q.placeholder || "Descreva detalhadamente..."}
                    value={answerValue || ""}
                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-75 disabled:cursor-not-allowed"
                  />
                )}

                {/* NÚMERO */}
                {q.type === "NUMBER" && (
                  <Input
                    type="number"
                    disabled={isCompleted || isExpired}
                    placeholder={q.placeholder || "0"}
                    value={answerValue !== undefined ? answerValue : ""}
                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    className="text-sm bg-background max-w-xs"
                  />
                )}

                {/* DATA */}
                {q.type === "DATE" && (
                  <Input
                    type="date"
                    disabled={isCompleted || isExpired}
                    value={answerValue ? String(answerValue).split("T")[0] : ""}
                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    className="text-sm bg-background max-w-xs"
                  />
                )}

                {/* SIM OU NÃO */}
                {q.type === "YES_NO" && (
                  <div className="flex items-center gap-6 pt-1">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        disabled={isCompleted || isExpired}
                        checked={answerValue === true}
                        onChange={() => handleAnswerChange(q.id, true)}
                        className="text-primary focus:ring-primary h-4 w-4"
                      />
                      <span>Sim</span>
                    </label>

                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        disabled={isCompleted || isExpired}
                        checked={answerValue === false}
                        onChange={() => handleAnswerChange(q.id, false)}
                        className="text-primary focus:ring-primary h-4 w-4"
                      />
                      <span>Não</span>
                    </label>
                  </div>
                )}

                {/* ESCOLHA ÚNICA (RÁDIO) */}
                {q.type === "SINGLE_CHOICE" && (
                  <div className="space-y-2 pt-1">
                    {(q.options || []).map((opt, optIdx) => (
                      <label
                        key={optIdx}
                        className="flex items-center gap-2.5 text-sm cursor-pointer p-2 rounded-lg hover:bg-muted/40 transition-colors"
                      >
                        <input
                          type="radio"
                          name={`q-${q.id}`}
                          disabled={isCompleted || isExpired}
                          checked={answerValue === opt}
                          onChange={() => handleAnswerChange(q.id, opt)}
                          className="text-primary focus:ring-primary h-4 w-4"
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                )}

                {/* MÚLTIPLA ESCOLHA (CHECKBOX) */}
                {q.type === "MULTIPLE_CHOICE" && (
                  <div className="space-y-2 pt-1">
                    {(q.options || []).map((opt, optIdx) => {
                      const isChecked = Array.isArray(answerValue) && answerValue.includes(opt);
                      return (
                        <label
                          key={optIdx}
                          className="flex items-center gap-2.5 text-sm cursor-pointer p-2 rounded-lg hover:bg-muted/40 transition-colors"
                        >
                          <input
                            type="checkbox"
                            disabled={isCompleted || isExpired}
                            checked={isChecked}
                            onChange={(e) => handleCheckboxChange(q.id, opt, e.target.checked)}
                            className="rounded text-primary focus:ring-primary h-4 w-4"
                          />
                          <span>{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* LISTA SUSPENSA (DROPDOWN) */}
                {q.type === "DROPDOWN" && (
                  <select
                    disabled={isCompleted || isExpired}
                    value={answerValue || ""}
                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    className="w-full max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-75"
                  >
                    <option value="">Selecione uma opção...</option>
                    {(q.options || []).map((opt, optIdx) => (
                      <option key={optIdx} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                )}
              </CardContent>
            </Card>
          );
        })}

        {/* BOTÕES DE AÇÃO INFERIORES */}
        {!isCompleted && !isExpired && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              onClick={() => saveDraft(answers)}
              disabled={isSavingDraft || isSubmitting}
              className="w-full sm:w-auto gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{isSavingDraft ? "Salvando..." : "Salvar Rascunho"}</span>
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting || isSavingDraft}
              className="w-full sm:w-auto gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? "Enviando Respostas..." : "Finalizar e Enviar Formulário"}</span>
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
