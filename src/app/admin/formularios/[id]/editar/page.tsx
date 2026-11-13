"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import FormBuilder, { FormTemplateData } from "@/components/forms/FormBuilder";
import { AlertCircle } from "lucide-react";

export default function EditFormPage() {
  const params = useParams();
  const id = params?.id as string;

  const [form, setForm] = useState<FormTemplateData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    async function loadForm() {
      try {
        const res = await fetch(`/api/admin/forms/${id}`);
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Erro ao carregar dados do formulário.");
        }
        const data = await res.json();
        setForm(data.form);
      } catch (err: any) {
        setError(err.message || "Erro inesperado.");
      } finally {
        setIsLoading(false);
      }
    }

    loadForm();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Carregando formulário para edição...</p>
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="p-6 max-w-xl mx-auto rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-sm flex items-center gap-3">
        <AlertCircle className="w-6 h-6 shrink-0" />
        <div>
          <h3 className="font-semibold">Não foi possível abrir o formulário</h3>
          <p className="text-xs mt-1">{error || "Formulário não encontrado."}</p>
        </div>
      </div>
    );
  }

  return <FormBuilder initialData={form} isEditing={true} />;
}
