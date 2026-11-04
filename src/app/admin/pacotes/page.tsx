"use client";

import React, { useEffect, useState } from "react";
import { formatBRL, formatDate, formatTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Boxes, Plus, Calendar, Clock, User, CheckCircle2, XCircle } from "lucide-react";

interface PackageItem {
  id: string;
  title: string;
  description?: string;
  totalPriceCents: number;
  status: "PROPOSED" | "ACCEPTED" | "REJECTED" | "EXPIRED";
  expiresAt?: string;
  acceptedAt?: string;
  patient: {
    fullName: string;
    email: string;
  };
  appointments: Array<{
    id: string;
    startAt: string;
    service: { name: string };
  }>;
  holds: Array<{
    id: string;
    startAt: string;
  }>;
}

export default function AdminPackagesPage() {
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [patients, setPatients] = useState<Array<{ id: string; fullName: string }>>([]);
  const [services, setServices] = useState<Array<{ id: string; name: string; durationMinutes: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal Novo Pacote
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [totalPriceBrl, setTotalPriceBrl] = useState("600,00");
  const [serviceId, setServiceId] = useState("");
  const [expiresInDays, setExpiresInDays] = useState(3);

  // Lista de slots pré-definidos do pacote
  const [slotsList, setSlotsList] = useState<
    Array<{ date: string; time: string; modality: "ONLINE" | "PRESENTIAL" | "BOTH" }>
  >([
    { date: "", time: "10:00", modality: "ONLINE" },
    { date: "", time: "10:00", modality: "ONLINE" },
    { date: "", time: "10:00", modality: "ONLINE" },
    { date: "", time: "10:00", modality: "ONLINE" },
  ]);

  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPackages = () => {
    setIsLoading(true);
    fetch("/api/packages")
      .then((r) => r.json())
      .then((d) => {
        setPackages(Array.isArray(d) ? d : []);
        setIsLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchPackages();
    fetch("/api/patients")
      .then((r) => r.json())
      .then((d) => setPatients(Array.isArray(d) ? d : []));
    fetch("/api/services")
      .then((r) => r.json())
      .then((d) => setServices(Array.isArray(d) ? d : []));
  }, []);

  const handleAddSlot = () => {
    setSlotsList([...slotsList, { date: "", time: "10:00", modality: "ONLINE" }]);
  };

  const handleRemoveSlot = (index: number) => {
    if (slotsList.length <= 1) return;
    setSlotsList(slotsList.filter((_, i) => i !== index));
  };

  const handleSlotChange = (index: number, field: string, value: string) => {
    const updated = [...slotsList];
    updated[index] = { ...updated[index], [field]: value };
    setSlotsList(updated);
  };

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setIsSubmitting(true);

    if (!patientId || !title || !serviceId) {
      setModalError("Preencha todos os campos obrigatórios.");
      setIsSubmitting(false);
      return;
    }

    const invalidSlot = slotsList.some((s) => !s.date || !s.time);
    if (invalidSlot) {
      setModalError("Preencha data e horário para todas as sessões do pacote.");
      setIsSubmitting(false);
      return;
    }

    const selectedSvc = services.find((s) => s.id === serviceId);
    const duration = selectedSvc?.durationMinutes || 60;

    const formattedSlots = slotsList.map((s) => {
      const [year, month, day] = s.date.split("-").map(Number);
      const [hour, minute] = s.time.split(":").map(Number);
      const startAt = new Date(Date.UTC(year, month - 1, day, hour, minute));
      const endAt = new Date(startAt.getTime() + duration * 60000);

      return {
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        modality: s.modality,
      };
    });

    const priceCents = Math.round(
      parseFloat(totalPriceBrl.replace(/\./g, "").replace(",", ".")) * 100
    );

    try {
      const res = await fetch("/api/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          title,
          description,
          totalPriceCents: priceCents,
          serviceId,
          expiresInDays,
          slots: formattedSlots,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setModalError(data.error || "Não foi possível criar o pacote.");
        setIsSubmitting(false);
        return;
      }

      setIsModalOpen(false);
      setIsSubmitting(false);
      fetchPackages();
    } catch {
      setModalError("Erro ao comunicar com o servidor.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pacotes de Sessões & Recorrência</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Proponha pacotes com datas pré-fixadas e proteção atômica de agenda.
          </p>
        </div>

        <Button onClick={() => setIsModalOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          <span>Criar Proposta de Pacote</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
      ) : packages.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {packages.map((pkg) => (
            <Card key={pkg.id}>
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{pkg.title}</CardTitle>
                    <Badge
                      variant={
                        pkg.status === "ACCEPTED"
                          ? "success"
                          : pkg.status === "PROPOSED"
                          ? "warning"
                          : "destructive"
                      }
                    >
                      {pkg.status}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs mt-1">
                    Paciente: <strong>{pkg.patient.fullName}</strong>
                  </CardDescription>
                </div>
                <div className="text-right">
                  <span className="text-base font-bold text-teal-600 dark:text-teal-400">
                    {formatBRL(pkg.totalPriceCents)}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 pt-0 text-xs">
                {pkg.description && (
                  <p className="text-slate-500">{pkg.description}</p>
                )}

                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                    Horários Definidos:
                  </span>
                  {pkg.status === "ACCEPTED" ? (
                    pkg.appointments.map((a, i) => (
                      <div key={i} className="text-slate-500">
                        • {formatDate(a.startAt)} às {formatTime(a.startAt)} ({a.service.name})
                      </div>
                    ))
                  ) : (
                    pkg.holds.map((h, i) => (
                      <div key={i} className="text-slate-500">
                        • {formatDate(h.startAt)} às {formatTime(h.startAt)} (Reserva temporária ativa)
                      </div>
                    ))
                  )}
                </div>

                {pkg.expiresAt && pkg.status === "PROPOSED" && (
                  <div className="text-[11px] text-amber-600">
                    Expira em: {formatDate(pkg.expiresAt)}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center text-slate-500">
          <Boxes className="h-10 w-10 mx-auto text-slate-400 mb-2" />
          <p className="font-medium">Nenhum pacote de consultas cadastrado.</p>
          <p className="text-xs text-slate-400 mt-1">
            Crie propostas personalizadas para seus pacientes com datas fixas acordadas.
          </p>
        </Card>
      )}

      {/* Modal Criar Pacote */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Propor Novo Pacote de Sessões"
        description="Defina o valor e as datas reservadas para aprovação do paciente"
        maxWidth="lg"
      >
        <form onSubmit={handleCreatePackage} className="space-y-4 text-xs">
          {modalError && <Alert variant="destructive">{modalError}</Alert>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block font-medium">Paciente Destinatário *</label>
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

            <div className="space-y-1">
              <label className="block font-medium">Serviço Base *</label>
              <select
                className="flex h-9 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs"
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                required
              >
                <option value="">Selecione o serviço...</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.durationMinutes} min)
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Título do Pacote *"
              placeholder="Ex: Pacote de Acompanhamento Mensal (4 Sessões)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <Input
              label="Valor Total do Pacote (R$) *"
              placeholder="600,00"
              value={totalPriceBrl}
              onChange={(e) => setTotalPriceBrl(e.target.value)}
              required
            />
          </div>

          {/* Seletor de Sessões Pré-definidas */}
          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="font-semibold block uppercase text-[11px] text-slate-500">
                Datas e Horários Pré-definidos ({slotsList.length} sessões)
              </span>
              <Button type="button" variant="outline" size="sm" onClick={handleAddSlot} className="h-6 text-[10px]">
                + Adicionar Sessão
              </Button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto p-1">
              {slotsList.map((slot, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
                  <span className="font-bold text-slate-400 w-4">{i + 1}.</span>
                  <input
                    type="date"
                    className="flex h-8 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs"
                    value={slot.date}
                    onChange={(e) => handleSlotChange(i, "date", e.target.value)}
                    required
                  />
                  <input
                    type="time"
                    className="flex h-8 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs"
                    value={slot.time}
                    onChange={(e) => handleSlotChange(i, "time", e.target.value)}
                    required
                  />
                  <select
                    className="flex h-8 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs"
                    value={slot.modality}
                    onChange={(e) => handleSlotChange(i, "modality", e.target.value)}
                  >
                    <option value="ONLINE">Online</option>
                    <option value="PRESENTIAL">Presencial</option>
                  </select>
                  {slotsList.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSlot(i)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Gerar Proposta e Reservar Horários
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
