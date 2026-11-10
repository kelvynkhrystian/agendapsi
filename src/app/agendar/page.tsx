"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatBRL, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import {
  Calendar,
  Clock,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  MessageSquare,
  CreditCard,
  ShieldCheck,
  Stethoscope,
  Video,
  MapPin,
  AlertTriangle,
} from "lucide-react";

interface Service {
  id: string;
  name: string;
  description?: string;
  priceCents: number;
  isFree: boolean;
  durationMinutes: number;
  modality: "PRESENTIAL" | "ONLINE" | "BOTH";
}

interface Slot {
  startAt: string;
  endAt: string;
  formattedTime: string;
  available: boolean;
  reason?: string;
}

export const dynamic = "force-dynamic";

export default function BookingPage() {
  const router = useRouter();

  // Etapa atual: 1 = Serviço, 2 = Data/Horário, 3 = Identificação e Pagamento
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Estados de seleção
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [selectedModality, setSelectedModality] = useState<"PRESENTIAL" | "ONLINE" | "BOTH">("ONLINE");
  const [paymentMethod, setPaymentMethod] = useState<"ONLINE_SIMULATED" | "IN_PERSON" | "WHATSAPP_ARRANGED">("ONLINE_SIMULATED");

  // Sessão do usuário
  const [currentUser, setCurrentUser] = useState<{ id: string; fullName?: string; email?: string } | null>(null);

  // Form de identificação rápido caso não esteja logado
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [holdToken, setHoldToken] = useState<string>("");

  // Carrega serviços públicos e dados de sessão
  useEffect(() => {
    fetch("/api/services?public=true")
      .then((r) => r.json())
      .then((data) => setServices(Array.isArray(data) ? data : []));

    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setCurrentUser(data.user);
        }
      })
      .catch(() => {});

    // Recupera rascunho de agendamento salvo no sessionStorage (se houver)
    const savedDraft = sessionStorage.getItem("psi_booking_draft");
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        if (parsed.service) setSelectedService(parsed.service);
        if (parsed.date) setSelectedDate(parsed.date);
        if (parsed.slot) setSelectedSlot(parsed.slot);
        if (parsed.modality) setSelectedModality(parsed.modality);
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Quando o serviço e a data são escolhidos, busca slots disponíveis
  useEffect(() => {
    if (selectedService && selectedDate) {
      setIsLoadingSlots(true);
      setSelectedSlot(null);
      fetch(`/api/availability/slots?date=${selectedDate}&serviceId=${selectedService.id}`)
        .then((r) => r.json())
        .then((data) => {
          setSlots(Array.isArray(data) ? data : []);
          setIsLoadingSlots(false);
        })
        .catch((e) => {
          console.error(e);
          setIsLoadingSlots(false);
        });
    }
  }, [selectedService, selectedDate]);

  // Avança para a etapa 2
  const handleSelectService = (s: Service) => {
    setSelectedService(s);
    setSelectedModality(s.modality === "BOTH" ? "ONLINE" : s.modality);
    setStep(2);
  };

  // Cria Hold e avança para a etapa 3
  const handleProceedToStep3 = async () => {
    if (!selectedService || !selectedSlot) return;
    setError(null);
    setIsLoading(true);

    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    setHoldToken(token);

    // Salva rascunho no sessionStorage
    sessionStorage.setItem(
      "psi_booking_draft",
      JSON.stringify({
        service: selectedService,
        date: selectedDate,
        slot: selectedSlot,
        modality: selectedModality,
        holdToken: token,
      })
    );

    try {
      const res = await fetch("/api/booking/draft-hold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: selectedService.id,
          startAt: selectedSlot.startAt,
          endAt: selectedSlot.endAt,
          holdToken: token,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Não foi possível reservar este horário.");
        setIsLoading(false);
        return;
      }

      setIsLoading(false);
      setStep(3);
    } catch {
      setError("Erro ao comunicar com o servidor.");
      setIsLoading(false);
    }
  };

  // Login ou Cadastro rápido durante a Etapa 3
  const handleInlineAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (authMode === "login") {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Credenciais inválidas.");
          setIsLoading(false);
          return;
        }
        setCurrentUser(data.user);
      } else {
        const res = await fetch("/api/auth/register-patient", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName,
            email,
            password,
            phone,
            acceptTerms: true,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Erro no cadastro.");
          setIsLoading(false);
          return;
        }
        setCurrentUser(data.user);
      }
      setIsLoading(false);
    } catch {
      setError("Erro ao autenticar.");
      setIsLoading(false);
    }
  };

  // Conclui Agendamento na Plataforma
  const handleConfirmBooking = async () => {
    if (!currentUser || !holdToken) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/booking/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          holdToken,
          modality: selectedModality,
          paymentMethod,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Não foi possível concluir o agendamento.");
        setIsLoading(false);
        return;
      }

      // Limpa rascunho
      sessionStorage.removeItem("psi_booking_draft");
      router.push("/paciente");
    } catch {
      setError("Erro ao finalizar agendamento.");
      setIsLoading(false);
    }
  };

  // Solicitação via WhatsApp (Apenas mensagem, sem reserva indevida nem dados clínicos)
  const handleWhatsAppInquiry = () => {
    if (!selectedService || !selectedDate || !selectedSlot) return;

    const professionalPhone = "5511999999999";
    const msg = `Olá! Gostaria de solicitar informações sobre a disponibilidade para a consulta de ${selectedService.name} na data ${selectedDate} às ${selectedSlot.formattedTime}. Esta é apenas uma solicitação inicial de contato.`;

    const url = `https://wa.me/${professionalPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  return (
    <div data-theme="light" className="min-h-screen flex flex-col justify-between bg-slate-50 text-slate-900 selection:bg-[var(--primary)] selection:text-white">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-[var(--primary)]">
            <Stethoscope className="h-6 w-6" />
            <span>PSI Consultório</span>
          </Link>

          <div className="flex items-center gap-4">
            <Link href="/" className="text-xs text-slate-500 hover:text-[var(--primary)]">
              Voltar ao Início
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto w-full p-4 sm:p-6 lg:p-8 flex-1">
        {/* Progress Bar 3 Passos */}
        <div className="mb-10 sm:mb-12">
          <div className="flex items-center justify-between max-w-md mx-auto text-xs font-semibold text-[#737373]">
            <div className={`flex items-center gap-2 ${step >= 1 ? "text-[var(--primary)] font-bold" : ""}`}>
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step >= 1 ? "bg-[var(--primary)] text-[var(--primary-foreground,#ffffff)] shadow-xs" : "bg-[#E5E5E5] text-slate-500"}`}>
                1
              </span>
              <span>Serviço</span>
            </div>
            <div className={`h-0.5 flex-1 mx-3 ${step >= 2 ? "bg-[var(--primary)]" : "bg-[#E5E5E5]"}`} />
            <div className={`flex items-center gap-2 ${step >= 2 ? "text-[var(--primary)] font-bold" : ""}`}>
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step >= 2 ? "bg-[var(--primary)] text-[var(--primary-foreground,#ffffff)] shadow-xs" : "bg-[#E5E5E5] text-slate-500"}`}>
                2
              </span>
              <span>Data e Horário</span>
            </div>
            <div className={`h-0.5 flex-1 mx-3 ${step >= 3 ? "bg-[var(--primary)]" : "bg-[#E5E5E5]"}`} />
            <div className={`flex items-center gap-2 ${step >= 3 ? "text-[var(--primary)] font-bold" : ""}`}>
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step >= 3 ? "bg-[var(--primary)] text-[var(--primary-foreground,#ffffff)] shadow-xs" : "bg-[#E5E5E5] text-slate-500"}`}>
                3
              </span>
              <span>Identificação</span>
            </div>
          </div>
        </div>

        {error && <Alert variant="destructive" className="mb-6">{error}</Alert>}

        {/* ETAPA 1: ESCOLHER SERVIÇO */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-bold tracking-tight">Escolha o Tipo de Atendimento</h1>
              <p className="text-sm text-slate-500">
                Selecione a modalidade e o procedimento desejado para visualizar a agenda disponível
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {services.map((service) => (
                <Card
                  key={service.id}
                  onClick={() => handleSelectService(service)}
                  className="hover:border-[var(--primary)] hover:shadow-md transition-all cursor-pointer border-slate-200 bg-white"
                >
                  <CardHeader className="flex flex-row items-start justify-between pb-2">
                    <div>
                      <CardTitle className="text-base">{service.name}</CardTitle>
                      <CardDescription className="text-xs line-clamp-2 mt-1">
                        {service.description || "Atendimento clínico especializado"}
                      </CardDescription>
                    </div>
                    <span className="text-base font-bold text-[var(--primary)] shrink-0">
                      {service.isFree ? "Gratuito" : formatBRL(service.priceCents)}
                    </span>
                  </CardHeader>
                  <CardContent className="pt-0 text-xs text-slate-500 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      {service.durationMinutes} minutos
                    </span>
                    <Button size="sm" variant="outline" className="text-xs gap-1">
                      <span>Selecionar</span>
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ETAPA 2: DATA E HORÁRIO */}
        {step === 2 && selectedService && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Escolha o Dia e o Horário</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Serviço selecionado: <strong>{selectedService.name}</strong> ({selectedService.durationMinutes} min)
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="text-xs gap-1">
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Trocar Serviço</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Seletor de Data e Modalidade */}
              <Card className="border-slate-200 bg-white">
                <CardHeader>
                  <CardTitle className="text-base">1. Selecione a Data</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    label="Data Pretendida"
                    type="date"
                    min={new Date().toISOString().split("T")[0]}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />

                  {selectedService.modality === "BOTH" && (
                    <div className="space-y-1.5 pt-2">
                      <label className="block text-xs font-medium">Formato do Atendimento</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedModality("ONLINE")}
                          className={`p-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                            selectedModality === "ONLINE"
                              ? "bg-[var(--button-bg,var(--primary))] text-[var(--button-fg,#ffffff)] border-[var(--button-bg,var(--primary))] shadow-xs"
                              : "bg-white text-[var(--button-outline-fg,var(--button-bg,var(--primary)))] border-[var(--primary)]/25 hover:border-[var(--primary)]/50 hover:bg-[var(--primary)]/[0.04]"
                          }`}
                        >
                          <Video className="h-4 w-4 text-current" />
                          <span>Online</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedModality("PRESENTIAL")}
                          className={`p-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                            selectedModality === "PRESENTIAL"
                              ? "bg-[var(--button-bg,var(--primary))] text-[var(--button-fg,#ffffff)] border-[var(--button-bg,var(--primary))] shadow-xs"
                              : "bg-white text-[var(--button-outline-fg,var(--button-bg,var(--primary)))] border-[var(--primary)]/25 hover:border-[var(--primary)]/50 hover:bg-[var(--primary)]/[0.04]"
                          }`}
                        >
                          <MapPin className="h-4 w-4 text-current" />
                          <span>Presencial</span>
                        </button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Lista de Horários Disponíveis */}
              <Card className="border-slate-200 bg-white">
                <CardHeader>
                  <CardTitle className="text-base">2. Horários Livres</CardTitle>
                  <CardDescription className="text-xs">
                    {selectedDate ? `Horários em ${formatDate(selectedDate)}` : "Escolha uma data ao lado"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingSlots ? (
                    <div className="py-8 text-center text-xs text-slate-500">
                      Verificando disponibilidade da agenda...
                    </div>
                  ) : slots.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto p-1">
                      {slots.map((slot, i) => (
                        <button
                          key={i}
                          disabled={!slot.available}
                          onClick={() => setSelectedSlot(slot)}
                          className={`py-2 px-3 rounded-lg text-xs font-mono font-semibold transition-all ${
                            !slot.available
                              ? "opacity-30 bg-slate-100 cursor-not-allowed text-slate-400"
                              : selectedSlot?.startAt === slot.startAt
                              ? "bg-[var(--button-bg,var(--primary))] text-[var(--button-fg,#ffffff)] shadow-xs"
                              : "border border-[var(--primary)]/30 hover:border-[var(--primary)] text-[var(--button-outline-fg,var(--button-bg,var(--primary)))] bg-white"
                          }`}
                        >
                          {slot.formattedTime}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-400">
                      {selectedDate
                        ? "Nenhum horário disponível para a data selecionada."
                        : "Selecione uma data para carregar os horários."}
                    </div>
                  )}

                  {selectedSlot && (
                    <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                      <Button onClick={handleProceedToStep3} isLoading={isLoading} className="gap-1.5 text-xs">
                        <span>Avançar para Identificação</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Opção Alternativa: Solicitação WhatsApp */}
            <div className="p-5 sm:p-6 rounded-2xl bg-amber-50/70 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
              <div className="space-y-1">
                <span className="font-semibold text-amber-900">
                  Prefere tirar dúvidas antes de reservar?
                </span>
                <p className="text-amber-800 leading-relaxed">
                  Envie uma mensagem direta pelo WhatsApp para esclarecimentos. Atenção: a mensagem é apenas uma solicitação inicial e não bloqueia a agenda.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleWhatsAppInquiry}
                disabled={!selectedSlot}
                className="shrink-0 gap-2 text-xs border-amber-300 text-amber-900 bg-white hover:bg-amber-100/50 h-9 min-h-[36px]"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Solicitar via WhatsApp</span>
              </Button>
            </div>
          </div>
        )}

        {/* ETAPA 3: IDENTIFICAÇÃO E PAGAMENTO */}
        {step === 3 && selectedService && selectedSlot && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Finalizar Agendamento</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedService.name} • {formatDate(selectedDate)} às {selectedSlot.formattedTime} ({selectedModality})
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setStep(2)} className="text-xs gap-1">
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Alterar Horário</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Identificação do Paciente */}
              <Card className="border-slate-200 bg-white">
                <CardHeader>
                  <CardTitle className="text-base">1. Dados do Paciente</CardTitle>
                </CardHeader>
                <CardContent>
                  {currentUser ? (
                    <div className="p-4 bg-[var(--primary)]/10 border border-[var(--primary)]/20 rounded-xl space-y-2 text-xs">
                      <div className="flex items-center gap-2 text-[var(--primary)] font-semibold">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Identificado com sucesso</span>
                      </div>
                      <p>Paciente: <strong>{currentUser.fullName}</strong></p>
                      <p>E-mail: <strong>{currentUser.email}</strong></p>
                    </div>
                  ) : (
                    <div className="space-y-4 text-xs">
                      <div className="flex gap-2 p-1 bg-[#F8F8F8] border border-[#E5E5E5] rounded-xl">
                        <button
                          type="button"
                          onClick={() => setAuthMode("login")}
                          className={`flex-1 py-2 px-3 rounded-lg font-semibold transition-all cursor-pointer ${
                            authMode === "login"
                              ? "bg-[var(--button-bg,var(--primary))] text-[var(--button-fg,#ffffff)] shadow-xs"
                              : "bg-white text-[var(--button-outline-fg,var(--button-bg,var(--primary)))] border border-[var(--primary)]/20 hover:border-[var(--primary)]/45"
                          }`}
                        >
                          Já sou paciente
                        </button>
                        <button
                          type="button"
                          onClick={() => setAuthMode("register")}
                          className={`flex-1 py-2 px-3 rounded-lg font-semibold transition-all cursor-pointer ${
                            authMode === "register"
                              ? "bg-[var(--button-bg,var(--primary))] text-[var(--button-fg,#ffffff)] shadow-xs"
                              : "bg-white text-[var(--button-outline-fg,var(--button-bg,var(--primary)))] border border-[var(--primary)]/20 hover:border-[var(--primary)]/45"
                          }`}
                        >
                          Novo paciente
                        </button>
                      </div>

                      <form onSubmit={handleInlineAuth} className="space-y-3">
                        {authMode === "register" && (
                          <>
                            <Input
                              label="Nome Completo *"
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                              required
                            />
                            <Input
                              label="Telefone / WhatsApp *"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              required
                            />
                          </>
                        )}

                        <Input
                          label="E-mail *"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />

                        <Input
                          label="Senha *"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                        />

                        <Button type="submit" size="sm" className="w-full" isLoading={isLoading}>
                          {authMode === "login" ? "Entrar e Continuar" : "Cadastrar e Continuar"}
                        </Button>
                      </form>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Pagamento e Confirmação */}
              <Card className="border-slate-200 bg-white">
                <CardHeader>
                  <CardTitle className="text-base">2. Pagamento e Conclusão</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Valor da Sessão:</span>
                      <span className="font-bold text-sm text-[var(--primary)]">
                        {selectedService.isFree ? "Gratuito" : formatBRL(selectedService.priceCents)}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Tempo de Reserva Segura:</span>
                      <span>60 minutos garantidos</span>
                    </div>
                  </div>

                  {!selectedService.isFree && (
                    <div className="space-y-2">
                      <label className="block font-semibold">Forma de Pagamento:</label>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50/80">
                          <input
                            type="radio"
                            name="paymentMethod"
                            checked={paymentMethod === "ONLINE_SIMULATED"}
                            onChange={() => setPaymentMethod("ONLINE_SIMULATED")}
                            className="accent-[var(--primary)]"
                          />
                          <div>
                            <div className="font-semibold">Pagamento Online (Cartão / Pix Simulado)</div>
                            <div className="text-[11px] text-slate-500">
                              Confirmação imediata no simulador da V1
                            </div>
                          </div>
                        </label>

                        <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50/80">
                          <input
                            type="radio"
                            name="paymentMethod"
                            checked={paymentMethod === "IN_PERSON"}
                            onChange={() => setPaymentMethod("IN_PERSON")}
                            className="accent-[var(--primary)]"
                          />
                          <div>
                            <div className="font-semibold">Pagamento Presencial no Consultório</div>
                            <div className="text-[11px] text-slate-500">
                              Acerto realizado no início da sessão (Cartão, Dinheiro ou Pix)
                            </div>
                          </div>
                        </label>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleConfirmBooking}
                    disabled={!currentUser}
                    isLoading={isLoading}
                    className="w-full mt-4 text-xs"
                    size="lg"
                  >
                    Confirmar e Agendar Consulta
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        &copy; {new Date().getFullYear()} PSI — Sistema de Gestão de Consultórios.
      </footer>
    </div>
  );
}
