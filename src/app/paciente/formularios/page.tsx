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
} from "lucide-react";
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

  const pendingForms = forms.filter(
    (f) => f.status === "PENDING" || f.status === "IN_PROGRESS"
  );
  const completedForms = forms.filter((f) => f.status === "COMPLETED");
  const expiredForms = forms.filter((f) => f.status === "EXPIRED");

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* CABEÇALHO */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <ClipboardList className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Formulários e Questionários
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
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

      {/* CARDS DE RESUMO (2x2 no mobile) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card className="border border-border/60 bg-card/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pendentes</p>
              <h3 className="text-2xl font-bold text-amber-500 mt-1">{pendingForms.length}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Hourglass className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Concluídos</p>
              <h3 className="text-2xl font-bold text-emerald-500 mt-1">{completedForms.length}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card/60 col-span-2 sm:col-span-1">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Atribuídos</p>
              <h3 className="text-2xl font-bold text-primary mt-1">{forms.length}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
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
      ) : (
        <div className="space-y-8">
          {/* SEÇÃO 1: FORMULÁRIOS PENDENTES */}
          {pendingForms.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>Formulários Aguardando Resposta ({pendingForms.length})</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingForms.map((item) => (
                  <Card
                    key={item.id}
                    className="border border-border/60 bg-card/80 hover:border-primary/40 transition-all flex flex-col justify-between"
                  >
                    <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h4 className="font-semibold text-foreground text-base leading-snug">
                            {item.title}
                          </h4>
                          <Badge
                            className={
                              item.status === "IN_PROGRESS"
                                ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                            }
                          >
                            {item.status === "IN_PROGRESS" ? "Em andamento" : "Pendente"}
                          </Badge>
                        </div>

                        {item.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {item.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-border/40 text-xs text-muted-foreground">
                          <span>
                            {item.answeredQuestions} de {item.totalQuestions} respondidas
                          </span>
                          {item.expiresAt && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                <Clock className="w-3.5 h-3.5" />
                                Expira em: {new Date(item.expiresAt).toLocaleDateString("pt-BR")}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-border/40 flex justify-end">
                        <Link href={`/paciente/formularios/${item.id}`} className="w-full sm:w-auto">
                          <Button className="w-full sm:w-auto gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs">
                            <span>
                              {item.status === "IN_PROGRESS" ? "Continuar Preenchendo" : "Preencher Agora"}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* SEÇÃO 2: FORMULÁRIOS CONCLUÍDOS */}
          {completedForms.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Formulários Concluídos ({completedForms.length})</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {completedForms.map((item) => (
                  <Card key={item.id} className="border border-border/60 bg-card/60">
                    <CardContent className="p-5 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h4 className="font-semibold text-foreground text-base leading-snug">
                            {item.title}
                          </h4>
                          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                            Concluído
                          </Badge>
                        </div>

                        {item.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {item.description}
                          </p>
                        )}

                        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border/40 text-xs text-muted-foreground">
                          {item.submittedAt && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              Respondido em {new Date(item.submittedAt).toLocaleDateString("pt-BR")}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-border/40 flex flex-wrap items-center justify-end gap-2">
                        <Link href={`/paciente/formularios/${item.id}`}>
                          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver Respostas</span>
                          </Button>
                        </Link>

                        <a href={`/api/patient/forms/${item.id}/pdf`} download>
                          <Button variant="outline" size="sm" className="gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/10">
                            <Download className="w-3.5 h-3.5" />
                            <span>Baixar PDF</span>
                          </Button>
                        </a>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* SEÇÃO 3: FORMULÁRIOS EXPIRADOS (SE HOUVER) */}
          {expiredForms.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-base font-semibold text-muted-foreground flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-muted-foreground" />
                <span>Formulários Expirados ({expiredForms.length})</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {expiredForms.map((item) => (
                  <Card key={item.id} className="border border-border/40 bg-muted/20 opacity-75">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-foreground text-sm">{item.title}</h4>
                        <Badge variant="outline" className="text-xs">
                          Expirado
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        O prazo de resposta deste questionário expirou. Caso precise preenchê-lo, entre em contato com seu profissional para que ele reenvie o acesso.
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
