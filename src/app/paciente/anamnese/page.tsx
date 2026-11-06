"use client";

import React, { useEffect, useState } from "react";
import { formatDate, formatTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { CheckCircle2, Clock, FileCheck2, ShieldCheck, Send } from "lucide-react";

interface QuestionField {
  id: string;
  label: string;
  type: "text" | "textarea" | "radio";
  options?: string[];
  required?: boolean;
}

interface Template {
  id: string;
  title: string;
  description?: string;
  fieldsJson: string;
  version: number;
  completed?: boolean;
  submission?: {
    id: string;
    createdAt: string;
    status: string;
  } | null;
}

export default function PatientAnamnesisPage() {
  const [template, setTemplate] = useState<Template | null>(null);
  const [fields, setFields] = useState<QuestionField[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [submissionDate, setSubmissionDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnamnesis = () => {
    setIsLoading(true);
    fetch("/api/anamnesis", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.id) {
          setTemplate(data);
          if (data.completed && data.submission) {
            setIsCompleted(true);
            setSubmissionDate(data.submission.createdAt);
          } else {
            setIsCompleted(false);
            setSubmissionDate(null);
            try {
              const parsed = JSON.parse(data.fieldsJson);
              setFields(Array.isArray(parsed) ? parsed : []);
            } catch (e) {
              console.error("Erro ao analisar campos de anamnese:", e);
            }
          }
        }
        setIsLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchAnamnesis();
  }, []);

  const handleAnswerChange = (fieldId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!template || isCompleted) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/anamnesis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: template.id,
          answers,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Não foi possível enviar a anamnese.");
        setIsSubmitting(false);
        return;
      }

      setIsCompleted(true);
      setSubmissionDate(data.submission?.createdAt || new Date().toISOString());
      setIsSubmitting(false);
    } catch {
      setError("Erro de conexão ao enviar respostas.");
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto py-8">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  // TASK 7: Se a anamnese foi concluída, o formulário desaparece e exibe exclusivamente o card de confirmação
  if (isCompleted) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto py-6">
        <Card className="border-emerald-200 dark:border-emerald-900/50 bg-gradient-to-b from-white to-emerald-50/30 dark:from-slate-900 dark:to-emerald-950/20 shadow-sm">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/80 mb-3 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Anamnese concluída
            </CardTitle>
            <CardDescription className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto mt-2">
              Sua ficha foi enviada com sucesso ao profissional responsável.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 pt-2">
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 gap-3">
              <div className="flex items-center gap-3">
                <FileCheck2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Ficha de Anamnese
                  </p>
                  <p className="text-xs text-slate-500">
                    {submissionDate ? `Enviada em ${formatDate(submissionDate)} às ${formatTime(submissionDate)}` : "Enviada com sucesso"}
                  </p>
                </div>
              </div>

              <Badge variant="success" className="px-3 py-1 gap-1.5 text-xs">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Enviada</span>
              </Badge>
            </div>

            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/40 p-4 border border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-2">
              <div className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
                <Clock className="h-4 w-4 text-[var(--primary)]" />
                <span>Sigilo Ético e Confidencialidade</span>
              </div>
              <p>
                Suas informações foram salvas com segurança e são confidenciais. O profissional utilizará as respostas durante seus atendimentos clínicos.
              </p>
              <p className="text-[11px] text-slate-400">
                Caso o profissional solicite uma nova atualização ou preenchimento de ficha, o formulário será reaberto automaticamente nesta mesma tela.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ficha de Anamnese</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Por favor, preencha as questões abaixo com sinceridade para auxiliar o profissional a compreender seu histórico e necessidades clínicas.
        </p>
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}

      {template ? (
        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-lg font-bold">{template.title}</CardTitle>
            <CardDescription className="text-xs">
              {template.description || "Responda com sinceridade. Todas as informações estão protegidas por sigilo profissional."}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6 text-xs">
              {fields.map((field) => (
                <div key={field.id} className="space-y-3 p-5 sm:p-6 rounded-2xl border border-[#E5E5E5] dark:border-[#333333] bg-[#F8F8F8]/60 dark:bg-[#141414]/60">
                  <label className="block font-semibold text-sm text-[#171717] dark:text-[#F5F5F5]">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>

                  {field.type === "textarea" ? (
                    <textarea
                      rows={4}
                      className="flex w-full rounded-xl border border-[#E5E5E5] dark:border-[#333333] bg-white dark:bg-[#191919] p-3.5 text-xs text-[#171717] dark:text-[#F5F5F5] placeholder:text-[#737373] focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] outline-none leading-relaxed transition-all shadow-2xs"
                      placeholder="Sua resposta..."
                      value={answers[field.id] || ""}
                      onChange={(e) => handleAnswerChange(field.id, e.target.value)}
                      required={field.required}
                    />
                  ) : field.type === "radio" && field.options ? (
                    <div className="space-y-2.5 pt-1">
                      {field.options.map((opt) => (
                        <label
                          key={opt}
                          className="flex items-center gap-2.5 cursor-pointer text-[#404040] dark:text-[#CCCCCC] hover:text-[#171717] dark:hover:text-[#F5F5F5] transition-colors"
                        >
                          <input
                            type="radio"
                            name={field.id}
                            value={opt}
                            checked={answers[field.id] === opt}
                            onChange={(e) => handleAnswerChange(field.id, e.target.value)}
                            required={field.required}
                            className="accent-[var(--primary)]"
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <input
                      type="text"
                      className="flex h-10 w-full rounded-xl border border-[#E5E5E5] dark:border-[#333333] bg-white dark:bg-[#191919] px-3.5 py-2 text-xs text-[#171717] dark:text-[#F5F5F5] placeholder:text-[#737373] focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] outline-none transition-all shadow-2xs"
                      placeholder="Sua resposta..."
                      value={answers[field.id] || ""}
                      onChange={(e) => handleAnswerChange(field.id, e.target.value)}
                      required={field.required}
                    />
                  )}
                </div>
              ))}

              <div className="pt-5 border-t border-[#E5E5E5] dark:border-[#333333] flex items-center justify-between">
                <span className="text-[11px] text-[#737373] dark:text-[#A6A6A6]">
                  Após o envio, as respostas não poderão ser editadas diretamente.
                </span>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[var(--button-bg,var(--primary))] hover:brightness-105 text-white gap-2 text-xs"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{isSubmitting ? "Enviando..." : "Enviar Ficha de Anamnese"}</span>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card className="p-8 text-center text-slate-500">
          <p className="text-xs">Nenhum formulário de anamnese ativo configurado no momento.</p>
        </Card>
      )}
    </div>
  );
}
