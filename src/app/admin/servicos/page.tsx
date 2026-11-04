"use client";

import React, { useEffect, useState } from "react";
import { formatBRL } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Briefcase, Plus, Edit, Trash2, Clock, ShieldCheck } from "lucide-react";

interface Service {
  id: string;
  name: string;
  description?: string;
  priceCents: number;
  isFree: boolean;
  durationMinutes: number;
  bufferMinutes: number;
  modality: "PRESENTIAL" | "ONLINE" | "BOTH";
  confirmationPolicy: "AUTOMATIC" | "UPON_PAYMENT" | "MANUAL_ADMIN" | "PAYMENT_AND_ADMIN";
  cancellationNoticeDays: number;
  isActive: boolean;
}

export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceBrl, setPriceBrl] = useState("180,00");
  const [isFree, setIsFree] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [bufferMinutes, setBufferMinutes] = useState(10);
  const [modality, setModality] = useState<"PRESENTIAL" | "ONLINE" | "BOTH">("BOTH");
  const [confirmationPolicy, setConfirmationPolicy] = useState<
    "AUTOMATIC" | "UPON_PAYMENT" | "MANUAL_ADMIN" | "PAYMENT_AND_ADMIN"
  >("AUTOMATIC");
  const [cancellationNoticeDays, setCancellationNoticeDays] = useState(3);
  const [isActive, setIsActive] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchServices = () => {
    setIsLoading(true);
    fetch("/api/services")
      .then((res) => res.json())
      .then((data) => {
        setServices(Array.isArray(data) ? data : []);
        setIsLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleOpenCreate = () => {
    setEditingService(null);
    setName("");
    setDescription("");
    setPriceBrl("180,00");
    setIsFree(false);
    setDurationMinutes(60);
    setBufferMinutes(10);
    setModality("BOTH");
    setConfirmationPolicy("AUTOMATIC");
    setCancellationNoticeDays(3);
    setIsActive(true);
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: Service) => {
    setEditingService(s);
    setName(s.name);
    setDescription(s.description || "");
    setPriceBrl((s.priceCents / 100).toFixed(2).replace(".", ","));
    setIsFree(s.isFree);
    setDurationMinutes(s.durationMinutes);
    setBufferMinutes(s.bufferMinutes);
    setModality(s.modality);
    setConfirmationPolicy(s.confirmationPolicy);
    setCancellationNoticeDays(s.cancellationNoticeDays);
    setIsActive(s.isActive);
    setError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const priceCents = isFree
      ? 0
      : Math.round(parseFloat(priceBrl.replace(/\./g, "").replace(",", ".")) * 100);

    const payload = {
      name,
      description,
      priceCents,
      isFree,
      durationMinutes,
      bufferMinutes,
      modality,
      confirmationPolicy,
      cancellationNoticeDays,
      isActive,
    };

    try {
      const url = editingService
        ? `/api/services/${editingService.id}`
        : "/api/services";
      const method = editingService ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erro ao salvar serviço.");
        setIsSubmitting(false);
        return;
      }

      setIsModalOpen(false);
      setIsSubmitting(false);
      fetchServices();
    } catch {
      setError("Erro de conexão.");
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente desativar este serviço do catálogo público?")) return;
    try {
      await fetch(`/api/services/${id}`, { method: "DELETE" });
      fetchServices();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Catálogo de Serviços</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Configure modalidades, preços, duração, intervalo entre sessões e políticas de confirmação.
          </p>
        </div>

        <Button onClick={handleOpenCreate} className="gap-1.5">
          <Plus className="h-4 w-4" />
          <span>Novo Serviço</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services.map((service) => (
            <Card key={service.id} className={!service.isActive ? "opacity-60" : ""}>
              <CardHeader className="flex flex-row items-start justify-between pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{service.name}</CardTitle>
                    {!service.isActive && <Badge variant="destructive">Inativo</Badge>}
                  </div>
                  <CardDescription className="text-xs line-clamp-2 mt-1">
                    {service.description || "Sem descrição informada."}
                  </CardDescription>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-lg font-bold text-teal-600 dark:text-teal-400">
                    {service.isFree ? "Gratuito" : formatBRL(service.priceCents)}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 pt-0">
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400 border-t border-b border-slate-100 dark:border-slate-800 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span>Duração: <strong>{service.durationMinutes} min</strong></span>
                  </div>
                  <div>
                    <span>Intervalo (Buffer): <strong>{service.bufferMinutes} min</strong></span>
                  </div>
                  <div>
                    <span>Modalidade: <strong>{service.modality}</strong></span>
                  </div>
                  <div>
                    <span>Cancelamento: <strong>{service.cancellationNoticeDays} dias</strong></span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-500">
                    Confirmação: <strong>{service.confirmationPolicy}</strong>
                  </span>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEdit(service)}
                      className="h-8 px-2 text-xs gap-1"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      <span>Editar</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(service.id)}
                      className="h-8 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Criar / Editar Serviço */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingService ? "Editar Serviço" : "Cadastrar Novo Serviço"}
        description="Defina os parâmetros clínicos, operacionais e de cobrança"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert variant="destructive">{error}</Alert>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Input
                label="Nome do Serviço *"
                placeholder="Ex: Psicoterapia Individual (Online)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <label className="block text-sm font-medium">Descrição Detalhada</label>
              <textarea
                rows={2}
                className="flex w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                placeholder="Explique o objetivo e o formato deste atendimento..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div>
              <Input
                label="Preço em Reais (R$)"
                placeholder="180,00"
                value={priceBrl}
                disabled={isFree}
                onChange={(e) => setPriceBrl(e.target.value)}
              />
              <label className="flex items-center gap-2 mt-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFree}
                  onChange={(e) => setIsFree(e.target.checked)}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-4 w-4"
                />
                <span className="text-xs text-slate-600 dark:text-slate-400">
                  Serviço gratuito por padrão (ex: alinhamento breve)
                </span>
              </label>
            </div>

            <Input
              label="Duração em Minutos *"
              type="number"
              min={15}
              step={5}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              required
            />

            <Input
              label="Buffer / Intervalo após a sessão (Minutos)"
              type="number"
              min={0}
              step={5}
              value={bufferMinutes}
              onChange={(e) => setBufferMinutes(Number(e.target.value))}
              helperText="Tempo de resguardo entre consultas na agenda"
            />

            <Input
              label="Aviso Mínimo de Cancelamento (Dias)"
              type="number"
              min={0}
              max={30}
              value={cancellationNoticeDays}
              onChange={(e) => setCancellationNoticeDays(Number(e.target.value))}
              helperText="Padrão: 3 dias de antecedência"
            />

            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Modalidade</label>
              <select
                className="flex h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                value={modality}
                onChange={(e) => setModality(e.target.value as "PRESENTIAL" | "ONLINE" | "BOTH")}
              >
                <option value="BOTH">Ambas (Presencial ou Online)</option>
                <option value="ONLINE">Apenas Online (Teleconsulta)</option>
                <option value="PRESENTIAL">Apenas Presencial no Consultório</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Política de Confirmação</label>
              <select
                className="flex h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                value={confirmationPolicy}
                onChange={(e) =>
                  setConfirmationPolicy(
                    e.target.value as "AUTOMATIC" | "UPON_PAYMENT" | "MANUAL_ADMIN" | "PAYMENT_AND_ADMIN"
                  )
                }
              >
                <option value="AUTOMATIC">Automática após agendamento válido</option>
                <option value="UPON_PAYMENT">Apenas após pagamento online confirmado</option>
                <option value="MANUAL_ADMIN">Apenas após aprovação manual do profissional</option>
                <option value="PAYMENT_AND_ADMIN">Após pagamento E aprovação manual</option>
              </select>
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-4 w-4"
              />
              <span className="text-sm font-medium">
                Serviço ativo e visível para agendamento público
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {editingService ? "Atualizar Serviço" : "Salvar Serviço"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
