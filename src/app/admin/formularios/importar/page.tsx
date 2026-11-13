"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileUp,
  FileText,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  Sparkles,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import FormBuilder, { FormTemplateData, FormQuestionItem } from "@/components/forms/FormBuilder";

export default function ImportPdfFormPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isScannedWarning, setIsScannedWarning] = useState<string | null>(null);
  const [noQuestionsWarning, setNoQuestionsWarning] = useState<{
    message: string;
    rawText?: string;
    title?: string;
    description?: string;
  } | null>(null);
  const [extractedTemplate, setExtractedTemplate] = useState<FormTemplateData | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    setIsScannedWarning(null);
    setNoQuestionsWarning(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setErrorMessage("Por favor, selecione um arquivo válido em formato PDF.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("O tamanho do arquivo PDF não pode ultrapassar 10 MB.");
      return;
    }

    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsScannedWarning(null);
    setNoQuestionsWarning(null);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setErrorMessage("Por favor, solte um arquivo válido em formato PDF.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("O tamanho do arquivo PDF não pode ultrapassar 10 MB.");
      return;
    }

    setSelectedFile(file);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    setErrorMessage(null);
    setIsScannedWarning(null);
    setNoQuestionsWarning(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/admin/forms/import-pdf", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Falha ao processar arquivo PDF.");
      }

      const result = data.data || data;

      if (result.isScannedOrEmpty) {
        setIsScannedWarning(
          result.warning ||
            "O arquivo enviado parece ser uma imagem digitalizada ou não possui texto vetorial legível."
        );
        return;
      }

      if (result.noQuestionsFound || !result.questions || result.questions.length === 0) {
        setNoQuestionsWarning({
          message:
            result.warning ||
            "Texto extraído, mas nenhuma pergunta foi identificada automaticamente.",
          rawText: result.rawTextPreview || "",
          title: result.title || selectedFile.name.replace(/\.pdf$/i, ""),
          description: result.description || "",
        });
        return;
      }

      // Converte as perguntas extraídas no formato esperado pelo FormBuilder
      const formattedQuestions: FormQuestionItem[] = result.questions.map(
        (q: any, idx: number) => ({
          id: q.id || `q-extracted-${idx + 1}`,
          type: q.type || "SHORT_TEXT",
          label: q.label || `Pergunta ${idx + 1}`,
          description: q.description || undefined,
          placeholder: q.placeholder || undefined,
          isRequired: q.isRequired ?? true,
          orderIndex: idx + 1,
          options: q.options || (q.type === "YES_NO" ? ["Sim", "Não"] : undefined),
        })
      );

      setExtractedTemplate({
        title: result.title || selectedFile.name.replace(/\.pdf$/i, ""),
        description:
          result.description ||
          "Questionário importado de arquivo PDF para revisão e personalização.",
        instructions: result.instructions || "Responda a todas as questões com atenção.",
        status: "DRAFT",
        questions: formattedQuestions,
      });
    } catch (err: any) {
      setErrorMessage(err.message || "Ocorreu um erro ao analisar o PDF.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setExtractedTemplate(null);
    setIsScannedWarning(null);
    setNoQuestionsWarning(null);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Se já extraiu com sucesso, exibe o FormBuilder preenchido para revisão imediata!
  if (extractedTemplate) {
    return (
      <div className="space-y-6">
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm flex items-center justify-between gap-3 max-w-4xl mx-auto">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>
              <strong>PDF processado com sucesso!</strong> Extraímos{" "}
              {extractedTemplate.questions.length} questões. Revise o título, perguntas e opções abaixo
              antes de salvar.
            </span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleReset}
            className="text-xs h-7 hover:bg-emerald-500/20"
          >
            Importar Outro PDF
          </Button>
        </div>

        <FormBuilder initialData={extractedTemplate} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-16">
      {/* CABEÇALHO */}
      <div className="flex items-center gap-3 pb-4 border-b border-border/40">
        <Link href="/admin/formularios">
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>Importar Formulário via PDF</span>
            <Sparkles className="w-5 h-5 text-primary" />
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Envie questionários, escalas e fichas em PDF para conversão automática em formulários interativos.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* AVISO DE PDF DIGITALIZADO / ESCANEADO */}
      {isScannedWarning && (
        <div className="p-5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-foreground space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm text-amber-600 dark:text-amber-400">
                PDF Digitalizado ou Sem Texto Selecionável
              </h4>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {isScannedWarning}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-amber-500/20">
            <Button size="sm" variant="outline" onClick={handleReset} className="text-xs">
              Selecionar Outro Arquivo
            </Button>
            <Link href="/admin/formularios/novo">
              <Button size="sm" className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                <span>Criar Formulário Manualmente</span>
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* AVISO: TEXTO EXTRAÍDO MAS SEM PERGUNTAS NUMERADAS IDENTIFICADAS */}
      {noQuestionsWarning && (
        <div className="p-5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-foreground space-y-3">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm text-amber-600 dark:text-amber-400">
                Texto extraído, mas nenhuma pergunta foi identificada automaticamente.
              </h4>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                O arquivo PDF contém texto selecionável, mas a estrutura das perguntas não segue os padrões usuais de numeração (ex: &quot;01.&quot;, &quot;1)&quot;, &quot;Questão 1:&quot;). Você pode conferir o texto abaixo e criar o formulário manualmente com o título sugerido.
              </p>
            </div>
          </div>

          {noQuestionsWarning.rawText && (
            <div className="p-3 rounded-lg bg-background/80 border border-border/50 text-[11px] font-mono text-muted-foreground max-h-36 overflow-y-auto whitespace-pre-wrap">
              {noQuestionsWarning.rawText}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-amber-500/20">
            <Button size="sm" variant="outline" onClick={handleReset} className="text-xs">
              Tentar Outro Arquivo
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setExtractedTemplate({
                  title: noQuestionsWarning.title || "Formulário Manual",
                  description: noQuestionsWarning.description || "",
                  instructions: "Preencha as questões.",
                  status: "DRAFT",
                  questions: [],
                });
                setNoQuestionsWarning(null);
              }}
              className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Criar Perguntas no Editor</span>
            </Button>
          </div>
        </div>
      )}

      {/* ÁREA DE DROPZONE */}
      <Card className="border border-border/60 bg-card/80">
        <CardContent className="p-6 sm:p-8">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors flex flex-col items-center justify-center ${
              selectedFile
                ? "border-primary/50 bg-primary/5"
                : "border-border/80 hover:border-primary/40 bg-muted/20"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,application/pdf"
              className="hidden"
            />

            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3">
              <FileUp className="w-7 h-7" />
            </div>

            {selectedFile ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-foreground font-semibold text-sm justify-center">
                  <FileText className="w-4 h-4 text-primary" />
                  <span>{selectedFile.name}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Clique para trocar de arquivo
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <p className="font-semibold text-sm text-foreground">
                  Clique para selecionar ou arraste o arquivo PDF aqui
                </p>
                <p className="text-xs text-muted-foreground">
                  Compatível com arquivos PDF digitais com texto selecionável (até 10 MB)
                </p>
              </div>
            )}
          </div>

          {/* DICAS SOBRE A IMPORTAÇÃO */}
          <div className="mt-6 p-4 rounded-xl bg-muted/40 border border-border/40 space-y-2">
            <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-primary" />
              <span>Como funciona a importação inteligente:</span>
            </h4>
            <ul className="text-xs text-muted-foreground space-y-1 pl-4 list-disc">
              <li>
                O PSI lê a estrutura de perguntas numeradas (ex: <em>1. Como você tem se sentido?</em>)
              </li>
              <li>
                Identifica alternativas de múltipla escolha ou caixas de seleção automaticamente
              </li>
              <li>
                Detecta perguntas de Sim/Não, datas, escalas numéricas e campos discursivos
              </li>
              <li>
                Você poderá revisar, alterar o tipo de qualquer questão e adicionar novas perguntas antes de salvar
              </li>
            </ul>
          </div>

          {/* BOTÃO DE AÇÃO */}
          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-border/40">
            <Link href="/admin/formularios">
              <Button variant="outline" size="sm">
                Cancelar
              </Button>
            </Link>

            <Button
              size="sm"
              onClick={handleAnalyze}
              disabled={!selectedFile || isAnalyzing}
              className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Analisando PDF...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Analisar e Extrair Perguntas</span>
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
