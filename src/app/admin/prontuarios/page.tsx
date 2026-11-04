"use client";

import React, { useEffect, useState } from "react";
import { formatDate, formatTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import {
  FileText,
  Plus,
  History,
  ShieldCheck,
  Send,
  Sparkles,
  Paperclip,
  Share2,
} from "lucide-react";

interface ClinicalRecord {
  id: string;
  patientId: string;
  sessionDate: string;
  noteRichText: string;
  summary?: string;
  moodRating?: number;
  patient: {
    fullName: string;
    phone: string;
  };
  appointment?: {
    startAt: string;
    service: { name: string };
  };
  revisions: Array<{
    id: string;
    contentSnapshot: string;
    moodRatingSnapshot?: number;
    revisedAt: string;
  }>;
}

const moodScaleLabels = [
  { val: 1, emoji: "😫", label: "Angustiado / Crise" },
  { val: 2, emoji: "😞", label: "Muito Triste" },
  { val: 3, emoji: "🙁", label: "Triste" },
  { val: 4, emoji: "😐", label: "Desanimado" },
  { val: 5, emoji: "😌", label: "Neutro / Estável" },
  { val: 6, emoji: "🙂", label: "Levemente Animado" },
  { val: 7, emoji: "😊", label: "Bem / Animado" },
  { val: 8, emoji: "😃", label: "Muito Bem" },
  { val: 9, emoji: "🤩", label: "Produtivo / Otimista" },
  { val: 10, emoji: "✨", label: "Eufórico / Radiante" },
];

const clinicalTemplates = [
  {
    name: "Evolução Padrão",
    content:
      "<h3>1. Estado Geral e Apresentação</h3><p>Paciente comparece pontualmente, com higiene adequada e comunicativo.</p><h3>2. Queixa e Conteúdo Abordado</h3><p>Relata avanços no manejo da ansiedade ao longo da semana.</p><h3>3. Intervenções Realizadas</h3><p>Reestruturação cognitiva e treino de habilidades.</p><h3>4. Encaminhamentos e Tarefas</h3><p>Registro de pensamentos automáticos mantido para a próxima sessão.</p>",
  },
  {
    name: "Primeira Sessão de Acolhimento",
    content:
      "<h3>1. Apresentação e Enquadre</h3><p>Alinhamento de sigilo, faltas e contrato terapêutico.</p><h3>2. Queixa Principal e Histórico</h3><p>Demanda inicial focada em transição de carreira e sintomas ansiosos.</p><h3>3. Hipótese Diagnóstica / Compreensão Inicial</h3><p>Quadro adaptativo com humor reativo preservado.</p>",
  },
  {
    name: "Encerramento / Alta",
    content:
      "<h3>1. Avaliação do Processo Terapêutico</h3><p>Paciente alcançou os objetivos terapêuticos estabelecidos.</p><h3>2. Estratégias de Prevenção de Recaída</h3><p>Revisadas as principais ferramentas desenvolvidas no processo.</p>",
  },
];

export default function AdminClinicalRecordsPage() {
  const [records, setRecords] = useState<ClinicalRecord[]>([]);
  const [patients, setPatients] = useState<Array<{ id: string; fullName: string }>>([]);
  const [selectedPatientFilter, setSelectedPatientFilter] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);

  // Modal Novo Prontuário
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [noteContent, setNoteContent] = useState("");
  const [selectedMood, setSelectedMood] = useState<number | undefined>(undefined);
  const [summary, setSummary] = useState("");

  // Modal Compartilhar Documento com Paciente
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [sharePatientId, setSharePatientId] = useState("");
  const [shareFile, setShareFile] = useState<File | null>(null);
  const [shareDays, setShareDays] = useState("30");
  const [isSharing, setIsSharing] = useState(false);

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchRecords = () => {
    setIsLoading(true);
    const url =
      selectedPatientFilter !== "ALL"
        ? `/api/clinical-records?patientId=${selectedPatientFilter}`
        : "/api/clinical-records";

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setRecords(Array.isArray(data) ? data : []);
        setIsLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchRecords();
    fetch("/api/patients")
      .then((r) => r.json())
      .then((d) => setPatients(Array.isArray(d) ? d : []));
  }, [selectedPatientFilter]);

  const handleApplyTemplate = (templateContent: string) => {
    setNoteContent(templateContent);
  };

  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (!patientId || !noteContent) {
      setError("Selecione o paciente e preencha as anotações do prontuário.");
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/clinical-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          sessionDate: new Date(sessionDate).toISOString(),
          noteRichText: noteContent,
          summary,
          moodRating: selectedMood,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erro ao salvar prontuário.");
        setIsSubmitting(false);
        return;
      }

      setIsModalOpen(false);
      setIsSubmitting(false);
      setMessage("Anotação de sessão registrada no prontuário confidencial.");
      setNoteContent("");
      setSelectedMood(undefined);
      fetchRecords();
    } catch {
      setError("Erro de comunicação com o servidor.");
      setIsSubmitting(false);
    }
  };

  const handleUploadAndShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareFile || !sharePatientId) return;
    setIsSharing(true);

    try {
      const formData = new FormData();
      formData.append("file", shareFile);
      formData.append("patientId", sharePatientId);
      formData.append("shareDays", shareDays);
      formData.append("category", "CLINICAL_NOTE_EXPORT");

      const res = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setIsShareModalOpen(false);
        setShareFile(null);
        setIsSharing(false);
        setMessage("Documento compartilhado com o paciente com sucesso.");
      }
    } catch (e) {
      console.error(e);
      setIsSharing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Prontuário Eletrônico & Evoluções</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Acesso estritamente restrito ao profissional. Escala de humor, histórico de revisões e modelos de anotação.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsShareModalOpen(true)} className="gap-1.5 text-xs">
            <Share2 className="h-3.5 w-3.5" />
            <span>Liberar Documento / Atestado</span>
          </Button>
          <Button size="sm" onClick={() => setIsModalOpen(true)} className="gap-1.5 text-xs">
            <Plus className="h-4 w-4" />
            <span>Nova Evolução de Sessão</span>
          </Button>
        </div>
      </div>

      {message && <Alert variant="success">{message}</Alert>}

      {/* Filtro por Paciente */}
      <div className="flex items-center gap-2 max-w-xs">
        <label className="text-xs text-slate-500 font-medium">Paciente:</label>
        <select
          className="flex h-9 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs"
          value={selectedPatientFilter}
          onChange={(e) => setSelectedPatientFilter(e.target.value)}
        >
          <option value="ALL">Todos os Pacientes</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.fullName}
            </option>
          ))}
        </select>
      </div>

      {/* Lista de Registros Clínicos */}
      {isLoading ? (
        <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
      ) : records.length > 0 ? (
        <div className="space-y-4">
          {records.map((rec) => {
            const moodInfo = moodScaleLabels.find((m) => m.val === rec.moodRating);

            return (
              <Card key={rec.id} className="border-slate-200 dark:border-slate-800 shadow-xs">
                <CardHeader className="flex flex-row items-start justify-between pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base font-bold">{rec.patient.fullName}</CardTitle>
                      {rec.appointment && (
                        <Badge variant="outline" className="text-[10px]">
                          Consulta Vinculada
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-xs mt-0.5">
                      Sessão realizada em <strong>{formatDate(rec.sessionDate)}</strong> às <strong>{formatTime(rec.sessionDate)}</strong>
                    </CardDescription>
                  </div>

                  {moodInfo && (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-full text-xs">
                      <span>{moodInfo.emoji}</span>
                      <span className="font-semibold text-teal-800 dark:text-teal-300">
                        {rec.moodRating}/10: {moodInfo.label}
                      </span>
                    </div>
                  )}
                </CardHeader>

                <CardContent className="space-y-3 pt-0 text-xs">
                  <div
                    className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: rec.noteRichText }}
                  />

                  {rec.revisions && rec.revisions.length > 0 && (
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
                      <History className="h-3.5 w-3.5" />
                      <span>{rec.revisions.length} revisão(ões) anterior(es) registrada(s) na auditoria</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-12 text-center text-slate-500">
          <FileText className="h-10 w-10 mx-auto text-slate-400 mb-2" />
          <p className="font-medium">Nenhum prontuário registrado para este filtro.</p>
          <p className="text-xs text-slate-400 mt-1">
            Clique em &quot;Nova Evolução de Sessão&quot; para registrar o atendimento clínico.
          </p>
        </Card>
      )}

      {/* Modal Nova Evolução */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nova Evolução de Sessão no Prontuário"
        description="Anotação confidencial do profissional (totalmente inacessível ao paciente)"
        maxWidth="xl"
      >
        <form onSubmit={handleCreateRecord} className="space-y-4 text-xs">
          {error && <Alert variant="destructive">{error}</Alert>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block font-medium">Paciente *</label>
              <select
                className="flex h-9 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                required
              >
                <option value="">Selecione o paciente...</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Data e Hora da Sessão *"
              type="datetime-local"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              required
            />
          </div>

          {/* Escala de Humor 10 Faces */}
          <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <span className="font-semibold block text-[11px] uppercase text-slate-600 dark:text-slate-300">
                Escala de Humor do Paciente na Sessão (1 a 10)
              </span>
              {selectedMood && (
                <span className="font-bold text-teal-600 dark:text-teal-400">
                  {moodScaleLabels.find((m) => m.val === selectedMood)?.label}
                </span>
              )}
            </div>

            <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
              {moodScaleLabels.map((m) => (
                <button
                  key={m.val}
                  type="button"
                  onClick={() => setSelectedMood(m.val)}
                  title={m.label}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${
                    selectedMood === m.val
                      ? "border-teal-600 bg-teal-100/60 dark:bg-teal-900/60 shadow-xs scale-105"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-teal-400"
                  }`}
                >
                  <span className="text-xl">{m.emoji}</span>
                  <span className="text-[10px] font-bold mt-1">{m.val}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Modelos Prontos de Evolução */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium text-[11px]">Modelos Rápidos:</span>
            {clinicalTemplates.map((tpl, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleApplyTemplate(tpl.content)}
                className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-[10px] font-medium"
              >
                {tpl.name}
              </button>
            ))}
          </div>

          {/* Anotação Rich Text */}
          <div className="space-y-1">
            <label className="block font-medium">Conteúdo do Prontuário Clínico *</label>
            <textarea
              rows={8}
              className="font-mono text-xs flex w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 leading-relaxed"
              placeholder="Digite as notas, intervenções, relatos do paciente e encaminhamentos..."
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Salvar Registro no Prontuário
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Compartilhar Documento */}
      <Modal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title="Liberar Documento / Atestado para o Paciente"
        description="Envie um atestado ou declaração em PDF com prazo configurável de acesso"
      >
        <form onSubmit={handleUploadAndShare} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="block font-medium">Paciente Destinatário *</label>
            <select
              className="flex h-9 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs"
              value={sharePatientId}
              onChange={(e) => setSharePatientId(e.target.value)}
              required
            >
              <option value="">Selecione o paciente...</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block font-medium">Arquivo PDF ou Imagem *</label>
            <input
              type="file"
              accept=".pdf,image/*"
              onChange={(e) => setShareFile(e.target.files?.[0] || null)}
              className="flex w-full text-xs file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="block font-medium">Prazo de Expiração do Compartilhamento</label>
            <select
              className="flex h-9 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs"
              value={shareDays}
              onChange={(e) => setShareDays(e.target.value)}
            >
              <option value="15">15 dias</option>
              <option value="30">30 dias (recomendado)</option>
              <option value="60">60 dias</option>
              <option value="90">90 dias</option>
              <option value="0">Indeterminado</option>
            </select>
            <p className="text-[10px] text-slate-400">
              Após o prazo, o paciente não poderá mais baixar o arquivo, mas a cópia do consultório permanece segura.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsShareModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSharing}>
              Enviar e Liberar Acesso
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
