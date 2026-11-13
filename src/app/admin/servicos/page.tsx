"use client";

import React, { useEffect, useState, useRef } from "react";
import { animateTabContent } from "@/lib/animation/gsap";
import { formatBRL, formatModality, formatConfirmationPolicy } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import {
  Briefcase,
  Settings,
  Plus,
  Edit,
  Trash2,
  Clock,
  Save,
  CheckCircle2,
  Info,
  Calendar,
  Layers,
  Sparkles,
} from "pulsoicon-react";

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

interface GeneralSettings {
  timezone: string;
  minBookingNoticeHours: number;
  maxBookingHorizonDays: number;
  defaultCancellationNoticeDays: number;
  defaultBufferMinutes: number;
  defaultModality: "PRESENTIAL" | "ONLINE" | "BOTH";
  defaultConfirmationPolicy: "AUTOMATIC" | "UPON_PAYMENT" | "MANUAL_ADMIN" | "PAYMENT_AND_ADMIN";
  allowPatientReschedule: boolean;
}

export default function AdminServicesPage() {
  const [activeTab, setActiveTab] = useState<"services" | "general">("services");
  const tabContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    animateTabContent(tabContentRef.current);
  }, [activeTab]);

  // ================= ABA 1: SERVIÇOS STATE =================
  const [services, setServices] = useState<Service[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(true);

  // Modal State (Campos Específicos do Serviço)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceBrl, setPriceBrl] = useState("180,00");
  const [isFree, setIsFree] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [isActive, setIsActive] = useState(true);

  const [serviceError, setServiceError] = useState<string | null>(null);
  const [isSubmittingService, setIsSubmittingService] = useState(false);

  // ================= ABA 2: CONFIGURAÇÕES GERAIS STATE =================
  const [timezone, setTimezone] = useState("America/Sao_Paulo");
  const [minBookingNoticeHours, setMinBookingNoticeHours] = useState(24);
  const [maxBookingHorizonDays, setMaxBookingHorizonDays] = useState(30);
  const [defaultCancellationNoticeDays, setDefaultCancellationNoticeDays] = useState(3);
  const [defaultBufferMinutes, setDefaultBufferMinutes] = useState(10);
  const [defaultModality, setDefaultModality] = useState<"PRESENTIAL" | "ONLINE" | "BOTH">("BOTH");
  const [defaultConfirmationPolicy, setDefaultConfirmationPolicy] = useState<
    "AUTOMATIC" | "UPON_PAYMENT" | "MANUAL_ADMIN" | "PAYMENT_AND_ADMIN"
  >("AUTOMATIC");
  const [allowPatientReschedule, setAllowPatientReschedule] = useState(true);
  const [syncExistingServices, setSyncExistingServices] = useState(false);

  const [isLoadingGeneral, setIsLoadingGeneral] = useState(false);
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);
  const [generalFeedback, setGeneralFeedback] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // ================= FETCHING =================
  const fetchServices = () => {
    setIsLoadingServices(true);
    fetch("/api/services")
      .then((res) => res.json())
      .then((data) => {
        setServices(Array.isArray(data) ? data : []);
        setIsLoadingServices(false);
      })
      .catch((e) => {
        console.error(e);
        setIsLoadingServices(false);
      });
  };

  const fetchGeneralSettings = () => {
    setIsLoadingGeneral(true);
    fetch("/api/admin/services/settings")
      .then((res) => res.json())
      .then((data: GeneralSettings) => {
        if (data && !("error" in data)) {
          setTimezone(data.timezone || "America/Sao_Paulo");
          setMinBookingNoticeHours(data.minBookingNoticeHours ?? 24);
          setMaxBookingHorizonDays(data.maxBookingHorizonDays ?? 30);
          setDefaultCancellationNoticeDays(data.defaultCancellationNoticeDays ?? 3);
          setDefaultBufferMinutes(data.defaultBufferMinutes ?? 10);
          setDefaultModality(data.defaultModality || "BOTH");
          setDefaultConfirmationPolicy(data.defaultConfirmationPolicy || "AUTOMATIC");
          setAllowPatientReschedule(data.allowPatientReschedule ?? true);
        }
        setIsLoadingGeneral(false);
      })
      .catch((e) => {
        console.error(e);
        setIsLoadingGeneral(false);
      });
  };

  useEffect(() => {
    fetchServices();
    fetchGeneralSettings();
  }, []);

  // ================= SERVIÇOS HANDLERS =================
  const handleOpenCreate = () => {
    setEditingService(null);
    setName("");
    setDescription("");
    setPriceBrl("180,00");
    setIsFree(false);
    setDurationMinutes(60);
    setIsActive(true);
    setServiceError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: Service) => {
    setEditingService(s);
    setName(s.name);
    setDescription(s.description || "");
    setPriceBrl((s.priceCents / 100).toFixed(2).replace(".", ","));
    setIsFree(s.isFree);
    setDurationMinutes(s.durationMinutes);
    setIsActive(s.isActive);
    setServiceError(null);
    setIsModalOpen(true);
  };

  const handleSubmitService = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingService(true);
    setServiceError(null);

    const priceCents = isFree
      ? 0
      : Math.round(parseFloat(priceBrl.replace(/\./g, "").replace(",", ".")) * 100);

    const payload = {
      name,
      description,
      priceCents,
      isFree,
      durationMinutes,
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
        setServiceError(data.error || "Erro ao salvar serviço.");
        setIsSubmittingService(false);
        return;
      }

      setIsModalOpen(false);
      setIsSubmittingService(false);
      fetchServices();
    } catch {
      setServiceError("Erro de conexão ao salvar serviço.");
      setIsSubmittingService(false);
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm("Deseja realmente desativar este serviço do catálogo público?")) return;
    try {
      await fetch(`/api/services/${id}`, { method: "DELETE" });
      fetchServices();
    } catch (e) {
      console.error(e);
    }
  };

  // ================= CONFIGURAÇÕES GERAIS HANDLER =================
  const handleSaveGeneralSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingGeneral(true);
    setGeneralFeedback(null);
    setGeneralError(null);

    try {
      const res = await fetch("/api/admin/services/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timezone,
          minBookingNoticeHours,
          maxBookingHorizonDays,
          defaultCancellationNoticeDays,
          defaultBufferMinutes,
          defaultModality,
          defaultConfirmationPolicy,
          allowPatientReschedule,
          syncExistingServices,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setGeneralError(data.error || "Erro ao salvar configurações gerais.");
      } else {
        setGeneralFeedback("Configurações gerais de agendamento e serviços salvas com sucesso!");
        if (syncExistingServices) {
          fetchServices();
        }
      }
    } catch {
      setGeneralError("Erro de conexão ao salvar configurações gerais.");
    } finally {
      setIsSavingGeneral(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* ================= CABEÇALHO PRINCIPAL ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#171717] dark:text-[#F5F5F5]">Serviços & Políticas</h1>
          <p className="text-sm text-[#737373] dark:text-[#A6A6A6]">
            Gerencie o catálogo de atendimentos clínicos e configure as políticas operacionais de agendamento.
          </p>
        </div>

        {activeTab === "services" && (
          <Button onClick={handleOpenCreate} className="gap-1.5 w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            <span>Novo Serviço</span>
          </Button>
        )}
      </div>

      {/* ================= NAVEGAÇÃO INTERNA EM ABAS ================= */}
      <div className="grid grid-cols-2 sm:flex items-center gap-2 border-b border-[#E5E5E5] dark:border-[#2C2C2C] pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("services")}
          className={`flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold border transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "services"
              ? "bg-[var(--button-bg,var(--primary))] text-[var(--button-fg,#ffffff)] border-transparent shadow-xs"
              : "bg-white text-[var(--button-outline-fg,var(--button-bg,var(--primary)))] border-[var(--primary)]/25 hover:border-[var(--primary)]/50 hover:bg-[var(--primary)]/[0.04] dark:bg-[#1B1B1B] dark:border-[#333333] dark:text-[#D0D0D0] dark:hover:bg-[#242424] dark:hover:text-[#F5F5F5]"
          }`}
        >
          <Briefcase className="h-4 w-4 shrink-0" />
          <span>Serviços</span>
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
              activeTab === "services"
                ? "bg-white/20 text-white"
                : "bg-[var(--primary)]/10 text-[var(--button-outline-fg,var(--button-bg,var(--primary)))] dark:bg-[#292929] dark:text-[#D0D0D0]"
            }`}
          >
            {services.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("general")}
          className={`flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold border transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "general"
              ? "bg-[var(--button-bg,var(--primary))] text-[var(--button-fg,#ffffff)] border-transparent shadow-xs"
              : "bg-white text-[var(--button-outline-fg,var(--button-bg,var(--primary)))] border-[var(--primary)]/25 hover:border-[var(--primary)]/50 hover:bg-[var(--primary)]/[0.04] dark:bg-[#1B1B1B] dark:border-[#333333] dark:text-[#D0D0D0] dark:hover:bg-[#242424] dark:hover:text-[#F5F5F5]"
          }`}
        >
          <Settings className="h-4 w-4 shrink-0" />
          <span className="truncate">Configurações Gerais</span>
        </button>
      </div>

      {/* ================= CONTEÚDO DAS ABAS COM TRANSIÇÃO ================= */}
      <div ref={tabContentRef}>
        {/* ================= ABA 1: CATÁLOGO DE SERVIÇOS ================= */}
        {activeTab === "services" && (
        <div className="space-y-4">
          {isLoadingServices ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-40 bg-[#E5E5E5] dark:bg-[#242424] rounded-xl animate-pulse" />
              ))}
            </div>
          ) : services.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {services.map((service) => (
                <Card
                  key={service.id}
                  className={`transition-all ${!service.isActive ? "opacity-60 bg-[#F8F8F8] dark:bg-[#141414]" : "hover:border-[var(--primary)]/50"}`}
                >
                  <CardHeader className="flex flex-row items-start justify-between gap-2 pb-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-base font-bold break-words">{service.name}</CardTitle>
                        {!service.isActive ? (
                          <Badge variant="destructive" className="text-[10px]">
                            Inativo
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                            Ativo
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-xs line-clamp-2">
                        {service.description || "Sem descrição informada."}
                      </CardDescription>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-base sm:text-lg font-bold text-[var(--primary)] whitespace-nowrap">
                        {service.isFree ? "Gratuito" : formatBRL(service.priceCents)}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 pt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 text-xs text-[#525252] dark:text-[#D0D0D0] border-t border-b border-[#E5E5E5] dark:border-[#2C2C2C] py-2.5">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Clock className="h-3.5 w-3.5 text-[#737373] dark:text-[#A6A6A6]" />
                        <span>Duração: <strong>{service.durationMinutes} minutos</strong></span>
                      </div>
                      <div>
                        <span>Modalidade: <strong>{formatModality(service.modality)}</strong></span>
                      </div>
                      <div className="sm:col-span-2 text-[11px] text-[#737373] dark:text-[#A6A6A6]">
                        <span>Confirmação: <strong>{formatConfirmationPolicy(service.confirmationPolicy)}</strong></span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <span className="text-[11px] text-[#737373] dark:text-[#A6A6A6]">
                        {service.isActive ? "Visível no agendamento público" : "Oculto na agenda pública"}
                      </span>

                      <div className="flex items-center gap-1.5 ml-auto">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(service)}
                          className="h-9 sm:h-8 px-2.5 text-xs gap-1.5"
                        >
                          <Edit className="h-3.5 w-3.5" />
                          <span>Editar</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteService(service.id)}
                          className="h-9 sm:h-8 px-2.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                          title="Desativar serviço"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center text-slate-500">
              <Briefcase className="h-10 w-10 mx-auto text-slate-400 mb-3" />
              <p className="font-semibold text-base">Nenhum serviço cadastrado.</p>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Crie o primeiro serviço clínico para que seus pacientes possam agendar atendimentos presenciais ou online.
              </p>
              <Button onClick={handleOpenCreate} className="mt-4 gap-1.5">
                <Plus className="h-4 w-4" />
                <span>Cadastrar Primeiro Serviço</span>
              </Button>
            </Card>
          )}

          {/* ================= MODAL CRIAR / EDITAR SERVIÇO ================= */}
          {/* Contém ESTRITAMENTE campos específicos do atendimento */}
          <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title={editingService ? "Editar Serviço" : "Cadastrar Novo Serviço"}
            description="Preencha as informações essenciais específicas deste atendimento clínico"
            maxWidth="md"
          >
            <form onSubmit={handleSubmitService} className="space-y-4">
              {serviceError && <Alert variant="destructive">{serviceError}</Alert>}

              <div className="space-y-4">
                <Input
                  label="Nome do Serviço *"
                  placeholder="Ex: Psicoterapia Individual (Online)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-[#171717] dark:text-[#F5F5F5]">Descrição Detalhada</label>
                  <textarea
                    rows={3}
                    className="flex w-full rounded-xl border border-[#E5E5E5] dark:border-[#333333] bg-white dark:bg-[#141414] px-3 py-2 text-sm text-[#171717] dark:text-[#F5F5F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                    placeholder="Explique o objetivo e o formato deste atendimento..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        className="rounded border-[#CCCCCC] dark:border-[#525252] text-[var(--primary)] focus:ring-[var(--primary)] h-4 w-4"
                      />
                      <span className="text-xs text-[#525252] dark:text-[#A6A6A6]">
                        Serviço gratuito por padrão
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
                </div>

                <div className="pt-2 border-t border-[#E5E5E5] dark:border-[#2C2C2C]">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="rounded border-[#CCCCCC] dark:border-[#525252] text-[var(--primary)] focus:ring-[var(--primary)] h-4 w-4"
                    />
                    <span className="text-sm font-medium text-[#171717] dark:text-[#E5E5E5]">
                      Serviço ativo e visível para agendamento público
                    </span>
                  </label>
                </div>

                <div className="p-3.5 rounded-xl bg-[#F8F8F8] dark:bg-[#141414] border border-[#E5E5E5] dark:border-[#333333] flex items-start gap-2.5 text-xs text-[#525252] dark:text-[#A6A6A6]">
                  <Info className="h-4 w-4 text-[var(--primary)] shrink-0 mt-0.5" />
                  <span>
                    Regras operacionais de <strong>intervalo entre sessões (buffer)</strong>, <strong>prazo de cancelamento</strong> e <strong>política de confirmação</strong> são gerenciadas globalmente na aba <strong>Configurações Gerais</strong>.
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:flex sm:justify-end gap-2.5 sm:gap-3 pt-4 border-t border-[#E5E5E5] dark:border-[#333333]">
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto">
                  Cancelar
                </Button>
                <Button type="submit" isLoading={isSubmittingService} className="w-full sm:w-auto">
                  {editingService ? "Salvar Alterações" : "Cadastrar Serviço"}
                </Button>
              </div>
            </form>
          </Modal>
        </div>
      )}

      {/* ================= ABA 2: CONFIGURAÇÕES GERAIS ================= */}
      {activeTab === "general" && (
        <form onSubmit={handleSaveGeneralSettings} className="space-y-6">
          {generalFeedback && (
            <Alert variant="success" title="Configurações Salvas">
              {generalFeedback}
            </Alert>
          )}

          {generalError && (
            <Alert variant="destructive" title="Erro ao Salvar">
              {generalError}
            </Alert>
          )}

          {/* CARD 1: POLÍTICAS DE AGENDAMENTO E PRAZOS */}
          <Card className="shadow-xs">
            <CardHeader className="p-5 sm:p-6 pb-4 border-b border-[#E5E5E5] dark:border-[#333333]">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[var(--primary)]" />
                <span>Políticas de Agendamento e Horários</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Defina o fuso horário, a antecedência mínima e os horizontes para abertura de agenda
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-[#171717] dark:text-[#F5F5F5]">
                    Fuso Horário Padrão do Consultório
                  </label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="flex h-10 w-full rounded-xl border border-[#E5E5E5] dark:border-[#333333] bg-white dark:bg-[#141414] px-3.5 py-2 text-sm text-[#171717] dark:text-[#F5F5F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30 focus-visible:border-[var(--primary)] transition-all shadow-2xs cursor-pointer"
                  >
                    <option value="America/Sao_Paulo">Brasília (America/Sao_Paulo - GMT-3)</option>
                    <option value="America/Manaus">Manaus (America/Manaus - GMT-4)</option>
                    <option value="America/Belem">Belém (America/Belem - GMT-3)</option>
                    <option value="America/Cuiaba">Cuiabá (America/Cuiaba - GMT-4)</option>
                    <option value="America/Fortaleza">Fortaleza (America/Fortaleza - GMT-3)</option>
                  </select>
                  <p className="text-[11px] text-[#737373] dark:text-[#A6A6A6]">
                    Base temporal utilizada para todos os cálculos de slots e lembretes aos pacientes.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-[#171717] dark:text-[#F5F5F5]">
                    Antecedência Mínima para Reserva (Horas)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={minBookingNoticeHours}
                    onChange={(e) => setMinBookingNoticeHours(Number(e.target.value))}
                  />
                  <p className="text-[11px] text-[#737373] dark:text-[#A6A6A6]">
                    Tempo mínimo prévio exigido para que um paciente possa agendar um novo horário.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-[#171717] dark:text-[#F5F5F5]">
                    Horizonte Máximo de Agendamento (Dias à frente)
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={maxBookingHorizonDays}
                    onChange={(e) => setMaxBookingHorizonDays(Number(e.target.value))}
                  />
                  <p className="text-[11px] text-[#737373] dark:text-[#A6A6A6]">
                    Limite máximo de dias futuros disponibilizados para agendamento na agenda pública.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-[#171717] dark:text-[#F5F5F5]">
                    Prazo Limite para Cancelamento sem Penalidade (Dias)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={30}
                    value={defaultCancellationNoticeDays}
                    onChange={(e) => setDefaultCancellationNoticeDays(Number(e.target.value))}
                  />
                  <p className="text-[11px] text-[#737373] dark:text-[#A6A6A6]">
                    Padrão do contrato terapêutico: 3 dias úteis de antecedência mínima.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CARD 2: OPERAÇÃO DE ATENDIMENTOS & CONFIRMAÇÕES */}
          <Card className="shadow-xs">
            <CardHeader className="p-5 sm:p-6 pb-4 border-b border-[#E5E5E5] dark:border-[#333333]">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Layers className="h-4 w-4 text-[var(--primary)]" />
                <span>Operação das Sessões & Confirmações Globais</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Defina o intervalo entre consultas, a modalidade padrão e o fluxo de confirmação dos atendimentos
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-[#171717] dark:text-[#F5F5F5]">
                    Buffer / Intervalo entre Atendimentos (Minutos)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    step={5}
                    value={defaultBufferMinutes}
                    onChange={(e) => setDefaultBufferMinutes(Number(e.target.value))}
                  />
                  <p className="text-[11px] text-[#737373] dark:text-[#A6A6A6]">
                    Tempo de resguardo reservado na agenda após cada consulta para anotações clínicas e intervalo.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-[#171717] dark:text-[#F5F5F5]">
                    Modalidade Padrão do Consultório
                  </label>
                  <select
                    value={defaultModality}
                    onChange={(e) => setDefaultModality(e.target.value as "PRESENTIAL" | "ONLINE" | "BOTH")}
                    className="flex h-10 w-full rounded-xl border border-[#E5E5E5] dark:border-[#333333] bg-white dark:bg-[#141414] px-3.5 py-2 text-sm text-[#171717] dark:text-[#F5F5F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30 focus-visible:border-[var(--primary)] transition-all shadow-2xs cursor-pointer"
                  >
                    <option value="BOTH">Ambas (Presencial e Online)</option>
                    <option value="ONLINE">Apenas Online (Teleconsulta)</option>
                    <option value="PRESENTIAL">Apenas Presencial no Consultório</option>
                  </select>
                  <p className="text-[11px] text-[#737373] dark:text-[#A6A6A6]">
                    Formato de atendimento padrão oferecido nos serviços do consultório.
                  </p>
                </div>

                <div className="sm:col-span-2 space-y-2">
                  <label className="block text-sm font-medium text-[#171717] dark:text-[#F5F5F5]">
                    Política de Confirmação Padrão
                  </label>
                  <select
                    value={defaultConfirmationPolicy}
                    onChange={(e) =>
                      setDefaultConfirmationPolicy(
                        e.target.value as "AUTOMATIC" | "UPON_PAYMENT" | "MANUAL_ADMIN" | "PAYMENT_AND_ADMIN"
                      )
                    }
                    className="flex h-10 w-full rounded-xl border border-[#E5E5E5] dark:border-[#333333] bg-white dark:bg-[#141414] px-3.5 py-2 text-sm text-[#171717] dark:text-[#F5F5F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30 focus-visible:border-[var(--primary)] transition-all shadow-2xs cursor-pointer"
                  >
                    <option value="AUTOMATIC">Automática após agendamento válido</option>
                    <option value="UPON_PAYMENT">Apenas após pagamento online confirmado</option>
                    <option value="MANUAL_ADMIN">Apenas após aprovação manual do profissional</option>
                    <option value="PAYMENT_AND_ADMIN">Após pagamento E aprovação manual</option>
                  </select>
                  <p className="text-[11px] text-[#737373] dark:text-[#A6A6A6]">
                    Define o fluxo de validação e confirmação dos horários agendados pelos pacientes.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-[#E5E5E5] dark:border-[#333333] space-y-3">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowPatientReschedule}
                    onChange={(e) => setAllowPatientReschedule(e.target.checked)}
                    className="rounded border-[#CCCCCC] dark:border-[#525252] text-[var(--primary)] focus:ring-[var(--primary)] h-4 w-4"
                  />
                  <span className="text-sm font-medium text-[#171717] dark:text-[#F5F5F5]">
                    Permitir que o próprio paciente solicite remarcação de consulta pelo portal
                  </span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-xl">
                  <input
                    type="checkbox"
                    checked={syncExistingServices}
                    onChange={(e) => setSyncExistingServices(e.target.checked)}
                    className="rounded border-[#CCCCCC] dark:border-[#525252] text-[var(--primary)] focus:ring-[var(--primary)] h-4 w-4"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-amber-900 dark:text-amber-200 block">
                      Propagar estas configurações para todos os serviços ativos já cadastrados
                    </span>
                    <span className="text-amber-800/80 dark:text-amber-300/80">
                      Atualiza o buffer, a modalidade e a confirmação dos serviços existentes para manter total consistência.
                    </span>
                  </div>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* BOTÃO SALVAR CONFIGURAÇÕES */}
          <div className="flex justify-end pt-3">
            <Button type="submit" isLoading={isSavingGeneral} className="w-full sm:w-auto gap-2">
              <Save className="h-4 w-4" />
              <span>Salvar Configurações Gerais</span>
            </Button>
          </div>
        </form>
      )}
      </div>
    </div>
  );
}
