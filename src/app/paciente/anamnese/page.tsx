"use client";

import React, { useEffect, useState } from "react";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { ClipboardList, CheckCircle2, Clock } from "lucide-react";

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
}

export default function PatientAnamnesisPage() {
  const [template, setTemplate] = useState<Template | null>(null);
  const [fields, setFields] = useState<QuestionField[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/anamnesis")
      .then((r) => r.json())
      .then((data) => {
        if (data.id) {
          setTemplate(data);
          try {
            const parsed = JSON.parse(data.fieldsJson);
            setFields(Array.isArray(parsed) ? parsed : []);
          } catch (e) {
            console.error(e);
          }
        }
        setIsLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setIsLoading(false);
      });
  }, []);

  const handleAnswerChange = (fieldId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!template) return;
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

      setSuccessMessage(data.message || "Anamnese enviada com sucesso!");
      setIsSubmitting(false);
    } catch {
      setError("Erro de conexão ao enviar respostas.");
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Anamnese Inicial do Paciente</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Este questionário permite ao profissional conhecer melhor seu histórico e planejar o acompanhamento terapêutico.
        </p>
      </div>

      {successMessage && <Alert variant="success">{successMessage}</Alert>}
      {error && <Alert variant="destructive">{error}</Alert>}

      {template && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{template.title}</CardTitle>
            <CardDescription className="text-xs">
              {template.description || "Responda com sinceridade. Todas as informações são confidenciais."}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5 text-xs">
              {fields.map((field) => (
                <div key={field.id} className="space-y-1.5">
                  <label className="block font-semibold text-slate-800 dark:text-slate-200">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>

                  {field.type === "textarea" ? (
                    <textarea
                      rows={3}
                      className="flex w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs"
                      value={answers[field.id] || ""}
                      onChange={(e) => handleAnswerChange(field.id, e.target.value)}
                      required={field.required}
                    />
                  ) : field.type === "radio" && field.options ? (
                    <div className="flex gap-4 pt-1">
                      {field.options.map((opt) => (
                        <label key={opt} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={field.id}
                            value={opt}
                            checked={answers[field.id] === opt}
                            onChange={(e) => handleAnswerChange(field.id, e.target.value)}
                            required={field.required}
                            className="text-teal-600"
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <Input
                      value={answers[field.id] || ""}
                      onChange={(e) => handleAnswerChange(field.id, e.target.value)}
                      required={field.required}
                    />
                  )}
                </div>
              ))}

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <Button type="submit" size="lg" isLoading={isSubmitting}>
                  Enviar Respostas da Anamnese
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
