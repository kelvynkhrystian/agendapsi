"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Download,
  Calendar,
  FileText,
  Hourglass,
  Eye,
} from "pulsoicon-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PatientFormItem {
  id: string;
  title: string;
  description?: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "EXPIRED" | "CANCELLED";
  totalQuestions: number;
  answeredQuestions: number;
  expiresAt?: string | null;
  submittedAt?: string | null;
  createdAt: string;
}

export default function PatientFormsPage() {
  const [forms, setForms] = useState<PatientFormItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadForms = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/patient/forms");
      if (!res.ok) {
        throw new Error("Erro ao buscar seus formulários.");
      }
      const data = await res.json();
      setForms(data.forms || []);
    } catch (err: any) {
      setErrorMessage(err.message || "Não foi possível carregar os formulários.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadForms();
  }, []);

  const [activeTab, setActiveTab] = useState<"ALL" | "PENDING" | "COMPLETED">("ALL");

  const pendingForms = forms.filter(
    (f) => f.status === "PENDING" || f.status === "IN_PROGRESS"
  );
  const completedForms = forms.filter((f) => f.status === "COMPLETED");
  const expiredForms = forms.filter((f) => f.status === "EXPIRED");

  const displayedForms =
    activeTab === "PENDING"
      ? pendingForms
      : activeTab === "COMPLETED"
      ? completedForms
      : forms;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* CABEÇALHO */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <ClipboardList className="w-6 h-6" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-heading">
              Formulários e Questionários
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Responda às escalas, fichas de acompanhamento e avaliações solicitadas pelo seu profissional.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ABAS DE NAVEGAÇÃO COMPACTAS: PENDENTES / RESPONDIDOS / TODOS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setActiveTab("ALL")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "ALL"
              ? "bg-[var(--button-bg,var(--primary))] text-[var(--button-fg,#ffffff)] font-semibold shadow-xs"
              : "bg-white text-[var(--button-outline-fg,var(--button-bg,var(--primary)))] border border-[var(--primary)]/20 hover:border-[var(--primary)]/50 hover:bg-[var(--primary)]/[0.04] dark:bg-[#1C1C1C] dark:border-transparent dark:text-[#D0D0D0] dark:hover:bg-[#242424]"
          }`}
        >
          <span>Todos</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/10">
            {forms.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("PENDING")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "PENDING"
              ? "bg-[var(--button-bg,var(--primary))] text-[var(--button-fg,#ffffff)] font-semibold shadow-xs"
              : "bg-white text-[var(--button-outline-fg,var(--button-bg,var(--primary)))] border border-[var(--primary)]/20 hover:border-[var(--primary)]/50 hover:bg-[var(--primary)]/[0.04] dark:bg-[#1C1C1C] dark:border-transparent dark:text-[#D0D0D0] dark:hover:bg-[#242424]"
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Pendentes</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/10 font-bold">
            {pendingForms.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("COMPLETED")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "COMPLETED"
              ? "bg-[var(--button-bg,var(--primary))] text-[var(--button-fg,#ffffff)] font-semibold shadow-xs"
              : "bg-white text-[var(--button-outline-fg,var(--button-bg,var(--primary)))] border border-[var(--primary)]/20 hover:border-[var(--primary)]/50 hover:bg-[var(--primary)]/[0.04] dark:bg-[#1C1C1C] dark:border-transparent dark:text-[#D0D0D0] dark:hover:bg-[#242424]"
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Respondidos</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/10">
            {completedForms.length}
          </span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Carregando seus formulários...</p>
        </div>
      ) : forms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-2xl border border-dashed border-border/80 bg-card/40">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
            <ClipboardList className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Você não possui formulários pendentes</h3>
          <p className="text-sm text-muted-foreground max-w-md mt-1">
            Quando seu profissional de saúde disponibilizar um formulário ou escala para você responder, ele aparecerá aqui.
          </p>
        </div>
      ) : displayedForms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-2xl border border-dashed border-border/80 bg-card/40">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
            <ClipboardList className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            {activeTab === "PENDING"
              ? "Nenhum formulário pendente"
              : activeTab === "COMPLETED"
              ? "Nenhum formulário respondido até o momento"
              : "Você não possui formulários disponíveis"}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mt-1">
            {activeTab === "PENDING"
              ? "Parabéns! Você respondeu a todos os questionários atribuídos."
              : "Quando houver formulários atribuídos pelo seu profissional, eles aparecerão aqui."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedForms.map((item) => {
            const isCompleted = item.status === "COMPLETED";
            const isInProgress = item.status === "IN_PROGRESS";
            const isExpired = item.status === "EXPIRED";

            return (
              <Card
                key={item.id}
                className="border border-border/60 bg-card/80 hover:border-primary/40 transition-all rounded-2xl shadow-xs flex flex-col justify-between"
              >
                <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h4 className="font-heading font-semibold text-foreground text-base leading-snug">
                        {item.title}
                      </h4>
                      <Badge
                        className={
                          isCompleted
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs shrink-0"
                            : isInProgress
                            ? "bg-blue-500/10 text-blue-500 border-blue-500/20 text-xs shrink-0"
                            : isExpired
                            ? "bg-zinc-500/10 text-zinc-500 border-zinc-500/20 text-xs shrink-0"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs shrink-0"
                        }
                      >
                        {isCompleted
                          ? "Concluído"
                          : isInProgress
                          ? "Em andamento"
                          : isExpired
                          ? "Expirado"
                          : "Pendente"}
                      </Badge>
                    </div>

                    {item.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {item.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-border/40 text-xs text-muted-foreground">
                      <span>
                        {item.answeredQuestions} de {item.totalQuestions} questões
                      </span>
                      {item.submittedAt && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                            <Calendar className="w-3.5 h-3.5" />
                            Respondido em {new Date(item.submittedAt).toLocaleDateString("pt-BR")}
                          </span>
                        </>
                      )}
                      {item.expiresAt && !isCompleted && (
                        <>
                          <span>•</span>
                          <span className={`flex items-center gap-1 ${isExpired ? "text-red-500 font-medium" : "text-amber-600 dark:text-amber-400"}`}>
                            <Clock className="w-3.5 h-3.5" />
                            {isExpired ? "Expirou em: " : "Expira em: "}
                            {new Date(item.expiresAt).toLocaleDateString("pt-BR")}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border/40 flex flex-wrap items-center justify-end gap-2">
                    {isCompleted ? (
                      <>
                        <Link href={`/paciente/formularios/${item.id}`} className="w-full sm:w-auto">
                          <Button variant="outline" size="sm" className="w-full sm:w-auto gap-1.5 text-xs">
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver Respostas</span>
                          </Button>
                        </Link>
                        <a href={`/api/patient/forms/${item.id}/pdf`} download className="w-full sm:w-auto">
                          <Button variant="outline" size="sm" className="w-full sm:w-auto gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/10">
                            <Download className="w-3.5 h-3.5" />
                            <span>Baixar PDF</span>
                          </Button>
                        </a>
                      </>
                    ) : isExpired ? (
                      <span className="text-xs text-muted-foreground italic">Prazo encerrado</span>
                    ) : (
                      <Link href={`/paciente/formularios/${item.id}`} className="w-full sm:w-auto">
                        <Button className="w-full sm:w-auto gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs shadow-xs">
                          <span>
                            {isInProgress ? "Continuar Preenchendo" : "Responder Formulário"}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
