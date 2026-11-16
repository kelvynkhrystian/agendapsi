"use client";

import React, { Suspense, useEffect, useState, useRef, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import gsap from "gsap";
import { formatBRL, formatDate, toLocalDateString } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { BookingHeader } from "@/components/booking/booking-header";
import { BookingStepper } from "@/components/booking/booking-stepper";
import { PatientRegisterForm } from "@/components/auth/patient-register-form";
import {
  BookingDateTimePicker,
  Slot,
} from "@/components/booking/booking-date-time-picker";
import {
  Calendar,
  Clock,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Check,
  CreditCard,
  ShieldCheck,
  Stethoscope,
  Video,
  MapPin,
  Sparkles,
  Heart,
  Brain,
  MessageSquare,
  Eye,
  EyeOff,
  User,
  Mail,
  Phone,
  Lock,
  AlertTriangle,
  QrCode,
  Copy,
} from "pulsoicon-react";

export const dynamic = "force-dynamic";

interface Service {
  id: string;
  name: string;
  description?: string | null;
  priceCents: number;
  isFree: boolean;
  durationMinutes: number;
  modality: "PRESENTIAL" | "ONLINE" | "BOTH";
}

interface SiteSettingsData {
  clinicName?: string;
  logoUrl?: string | null;
  logoHorizontalUrl?: string | null;
  showLocation?: boolean;
  themeName?: string;
  primaryColor?: string;
  whatsappNumber?: string;
}

interface ProfileData {
  fullName?: string;
  displayName?: string;
  title?: string;
  crpCrm?: string | null;
}

function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function formatCPFInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function formatDateLong(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    const d = new Date(year, month - 1, day, 12, 0, 0);
    return new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(d);
  } catch {
    return dateStr;
  }
}

function getServiceIcon(service: Service) {
  const nameLower = service.name.toLowerCase();
  if (nameLower.includes("casal") || nameLower.includes("família")) {
    return Heart;
  }
  if (nameLower.includes("avaliação") || nameLower.includes("neuro")) {
    return Brain;
  }
  if (service.modality === "ONLINE") {
    return Video;
  }
  if (service.modality === "PRESENTIAL") {
    return MapPin;
  }
  return Sparkles;
}

interface PaymentOption {
  provider: "MERCADO_PAGO" | "ASAAS" | "PAGBANK" | "IN_PERSON";
  name: string;
  isDefault: boolean;
  instructions?: string | null;
  isSandbox?: boolean;
}

interface ConfirmedPaymentData {
  id: string;
  amountCents: number;
  status: string;
  method: string;
  gatewayProvider?: string;
  gatewayPaymentId?: string;
  pixQrCode?: string | null;
  pixQrCodeBase64?: string | null;
  checkoutUrl?: string | null;
  instructions?: string | null;
}

function getProviderMeta(provider: string) {
  switch (provider) {
    case "MERCADO_PAGO":
      return {
        title: "Mercado Pago (Pix e Cartão)",
        desc: "Pagamento instantâneo via Pix ou cartão com confirmação imediata.",
        badge: "Online",
        badgeColor: "bg-sky-50 text-sky-700",
        icon: CreditCard,
        iconColor: "text-sky-600",
      };
    case "ASAAS":
      return {
        title: "Asaas (Pix Automático)",
        desc: "Pagamento seguro com geração de QR Code Pix imediato.",
        badge: "Online",
        badgeColor: "bg-blue-50 text-blue-700",
        icon: QrCode,
        iconColor: "text-blue-600",
      };
    case "PAGBANK":
      return {
        title: "PagBank (Pix e Cartão)",
        desc: "Pagamento pelo PagBank com Pix instantâneo.",
        badge: "Online",
        badgeColor: "bg-emerald-50 text-emerald-700",
        icon: CreditCard,
        iconColor: "text-emerald-600",
      };
    case "IN_PERSON":
    default:
      return {
        title: "Pagamento Presencial no Consultório",
        desc: "Acerto realizado no início da consulta (Cartão, Dinheiro ou Pix).",
        badge: "Presencial",
        badgeColor: "bg-emerald-50 text-emerald-700",
        icon: MapPin,
        iconColor: "text-emerald-600",
      };
  }
}

function BookingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stepContainerRef = useRef<HTMLDivElement>(null);

  // Etapa do wizard: 1 = Serviço, 2 = Data e Horário, 3 = Identificação, 4 = Pagamento
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Dados do consultório e profissional
  const [site, setSite] = useState<SiteSettingsData | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [sectionsConfig, setSectionsConfig] = useState<any>(null);

  // Estados de seleção do agendamento
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedModality, setSelectedModality] = useState<"PRESENTIAL" | "ONLINE" | "BOTH">("ONLINE");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [holdToken, setHoldToken] = useState<string>("");

  // Configurações de Gateways e Pagamento
  const [availableGateways, setAvailableGateways] = useState<PaymentOption[]>([]);
  const [selectedGateway, setSelectedGateway] = useState<string>("IN_PERSON");
  const [confirmedPayment, setConfirmedPayment] = useState<ConfirmedPaymentData | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);

  // Sessão do paciente
  const [currentUser, setCurrentUser] = useState<{ id: string; fullName?: string; name?: string; email?: string } | null>(null);

  // Formulário de Identificação (Etapa 3)
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Estados de carregamento e feedback
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slotError, setSlotError] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);

  // Carrega configurações do site, perfil e serviços públicos
  useEffect(() => {
    fetch("/api/site/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.site) setSite(data.site);
        if (data.profile) setProfile(data.profile);
        if (data.sectionsConfig) setSectionsConfig(data.sectionsConfig);
        if (Array.isArray(data.services) && data.services.length > 0) {
          setServices(data.services);
        }
      })
      .catch((err) => console.error("Erro ao buscar dados do site:", err));

    fetch("/api/services?public=true")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setServices(data);
        }
      })
      .catch((err) => console.error("Erro ao buscar serviços:", err));

    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setCurrentUser(data.user);
        }
      })
      .catch(() => {});

    fetch("/api/payments/options")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.options) && data.options.length > 0) {
          setAvailableGateways(data.options);
          const defaultGw = data.options.find((o: any) => o.isDefault) || data.options[0];
          if (defaultGw) {
            setSelectedGateway(defaultGw.provider);
          }
        }
      })
      .catch((err) => console.error("Erro ao carregar opções de pagamento:", err));

    // Recupera rascunho de agendamento salvo no sessionStorage (se houver)
    const savedDraft = sessionStorage.getItem("psi_booking_draft");
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        if (parsed.service) setSelectedService(parsed.service);
        if (parsed.modality) setSelectedModality(parsed.modality);
        if (parsed.date) setSelectedDate(parsed.date);
        if (parsed.slot) setSelectedSlot(parsed.slot);
        if (parsed.holdToken) setHoldToken(parsed.holdToken);
      } catch (e) {
        console.error("Falha ao recuperar rascunho:", e);
      }
    }
  }, []);

  // Pré-seleciona o serviço se fornecido via query param (?serviceId=...)
  useEffect(() => {
    const serviceIdQuery = searchParams.get("serviceId");
    if (serviceIdQuery && services.length > 0) {
      const match = services.find((s) => s.id === serviceIdQuery);
      if (match) {
        setSelectedService(match);
        setSelectedModality(match.modality === "BOTH" ? "ONLINE" : match.modality);
      }
    }
  }, [searchParams, services]);

  // Animação GSAP suave de transição entre passos (respeitando prefers-reduced-motion)
  useEffect(() => {
    if (!stepContainerRef.current) return;
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      stepContainerRef.current.style.opacity = "1";
      stepContainerRef.current.style.transform = "none";
      return;
    }

    gsap.fromTo(
      stepContainerRef.current,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.28, ease: "power2.out" }
    );
  }, [step, isConfirmed]);

  // Consulta horários disponíveis quando serviço e data forem selecionados
  useEffect(() => {
    if (selectedService && selectedDate) {
      setIsLoadingSlots(true);
      setSelectedSlot(null);
      setSlotError(null);

      fetch(`/api/availability/slots?date=${selectedDate}&serviceId=${selectedService.id}`)
        .then(async (r) => {
          const data = await r.json();
          if (!r.ok) {
            setSlotError(data.error || "Não foi possível verificar a disponibilidade para esta data.");
            setSlots([]);
          } else {
            setSlots(Array.isArray(data) ? data : []);
          }
          setIsLoadingSlots(false);
        })
        .catch((e) => {
          console.error(e);
          setSlotError("Erro de comunicação com o servidor ao consultar horários.");
          setSlots([]);
          setIsLoadingSlots(false);
        });
    } else {
      setSlots([]);
      setSelectedSlot(null);
      setSlotError(null);
    }
  }, [selectedService, selectedDate]);

  // Comportamento do botão Voltar do cabeçalho
  const handleBack = () => {
    setError(null);
    if (isConfirmed) {
      router.push("/");
      return;
    }
    if (step === 1) {
      router.push("/");
    } else {
      setStep((prev) => (prev - 1) as 1 | 2 | 3 | 4);
    }
  };

  // Seleção de Serviço (Etapa 1)
  const handleSelectService = (s: Service) => {
    setSelectedService(s);
    setSelectedModality(s.modality === "BOTH" ? "ONLINE" : s.modality);
    setError(null);
  };

  // Avança para a Etapa 2
  const handleProceedToStep2 = () => {
    if (!selectedService) return;
    setError(null);
    setStep(2);
  };

  // Cria Hold seguro e avança para a Etapa 3 (Identificação)
  const handleProceedToStep3 = async () => {
    if (!selectedService || !selectedSlot || !selectedDate) return;
    setError(null);
    setIsLoading(true);

    const token =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
    setHoldToken(token);

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
        setError(data.error || "Não foi possível reservar este horário temporariamente.");
        setIsLoading(false);
        return;
      }

      setIsLoading(false);
      setStep(3);
    } catch {
      setError("Erro ao comunicar com o servidor para reserva do horário.");
      setIsLoading(false);
    }
  };

  // Login de Paciente Existente na Etapa 3
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Credenciais incorretas.");
        setIsLoading(false);
        return;
      }
      setCurrentUser(data.user);
      setIsLoading(false);
      setStep(4);
    } catch {
      setError("Erro de comunicação ao realizar login.");
      setIsLoading(false);
    }
  };

  // Logout para troca de conta
  const handleLogoutAccount = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setCurrentUser(null);
    }
  };

  // Confirmação final do agendamento (Etapa 4)
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
          paymentMethod: selectedGateway === "IN_PERSON" ? "IN_PERSON" : selectedGateway,
          gatewayProvider: selectedGateway,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Não foi possível concluir o agendamento.");
        setIsLoading(false);
        // Se a reserva expirou (410), permite voltar para a etapa 2
        if (res.status === 410) {
          setTimeout(() => {
            setStep(2);
          }, 2500);
        }
        return;
      }

      if (data.payment) {
        setConfirmedPayment(data.payment);
      }
      sessionStorage.removeItem("psi_booking_draft");
      setIsLoading(false);
      setIsConfirmed(true);
    } catch {
      setError("Erro ao finalizar o agendamento. Tente novamente.");
      setIsLoading(false);
    }
  };

  // Contato via WhatsApp em caso de dúvidas
  const handleWhatsAppInquiry = () => {
    const rawNumber = site?.whatsappNumber || "5511999999999";
    const cleanNumber = rawNumber.replace(/\D/g, "");
    const svcName = selectedService ? selectedService.name : "atendimento";
    const dateText = selectedDate && selectedSlot ? ` na data ${selectedDate} às ${selectedSlot.formattedTime}` : "";
    const msg = `Olá! Gostaria de tirar dúvidas sobre o agendamento de ${svcName}${dateText}.`;
    const url = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  return (
    <div
      data-theme="light"
      className="min-h-screen flex flex-col justify-between bg-[#FDFCFB] text-slate-900 selection:bg-[var(--primary)] selection:text-white relative overflow-x-hidden"
    >
      {/* 1. Cabeçalho Oficial Dedicado e Minimalista */}
      <BookingHeader
        logoHorizontalUrl={site?.logoHorizontalUrl}
        logoUrl={site?.logoUrl}
        clinicName={site?.clinicName}
        professionalName={profile?.displayName || profile?.fullName}
        shouldShowLocation={site?.showLocation}
        visibleSections={sectionsConfig}
        currentUser={
          currentUser
            ? {
                name: currentUser.fullName || currentUser.name || "Paciente",
                role: "PATIENT",
              }
            : null
        }
        onBack={handleBack}
      />

      {/* 2. Container Principal de Agendamento (Mobile-First) */}
      <main className="pt-20 sm:pt-22 md:pt-24 pb-12 sm:pb-16 px-3.5 sm:px-6 max-w-xl mx-auto w-full flex-1 relative z-10 flex flex-col justify-start">
        {/* Stepper Horizontal (Oculto após confirmação de sucesso) */}
        {!isConfirmed && <BookingStepper currentStep={step} />}

        {/* Mensagem de Erro Global */}
        {error && (
          <Alert variant="destructive" className="mb-5 rounded-2xl shadow-xs text-xs animate-fade-in">
            {error}
          </Alert>
        )}

        {/* Conteúdo Dinâmico do Passo com Animação GSAP */}
        <div ref={stepContainerRef} className="w-full">
          {/* ================= TELA DE SUCESSO ================= */}
          {isConfirmed ? (
            <div className="text-center py-6 px-4 bg-white border border-slate-200/90 rounded-3xl shadow-sm space-y-6">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-9 h-9 stroke-[2.2]" />
              </div>

              <div className="space-y-1.5">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Agendamento realizado com sucesso!
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
                  Sua consulta foi agendada e reservada na agenda do profissional. Enviamos a confirmação para o seu e-mail.
                </p>
              </div>

              {/* Card Resumo do Agendamento Concluído */}
              {selectedService && selectedSlot && (
                <div className="p-4 bg-slate-50/80 border border-slate-200/70 rounded-2xl text-left space-y-2.5 text-xs text-slate-700">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                    <span className="font-semibold text-slate-900">{selectedService.name}</span>
                    <span className="font-bold text-[var(--primary)]">
                      {selectedService.isFree || selectedService.priceCents === 0
                        ? "Gratuito"
                        : formatBRL(selectedService.priceCents)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-600">
                    <Calendar className="w-4 h-4 text-[var(--primary)] shrink-0" />
                    <span>{formatDateLong(selectedDate)} às {selectedSlot.formattedTime}</span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-600">
                    {selectedModality === "ONLINE" ? (
                      <>
                        <Video className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>Atendimento Online (Link disponível no Portal do Paciente)</span>
                      </>
                    ) : (
                      <>
                        <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Atendimento Presencial no Consultório</span>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Informações de Pagamento e Pix Copia e Cola */}
              {confirmedPayment && (
                <div className="space-y-3">
                  {confirmedPayment.pixQrCode && (
                    <div className="p-4 sm:p-5 bg-amber-50/70 border border-amber-200/90 rounded-2xl text-left space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                          <QrCode className="w-4 h-4 text-amber-700" />
                          <span>Pagamento Instantâneo via Pix</span>
                        </div>
                        <span className="text-[10px] font-semibold bg-amber-200/70 text-amber-900 px-2 py-0.5 rounded-full">
                          Aguardando Pagamento
                        </span>
                      </div>

                      {confirmedPayment.pixQrCodeBase64 && (
                        <div className="flex justify-center py-2">
                          <img
                            src={
                              confirmedPayment.pixQrCodeBase64.startsWith("data:")
                                ? confirmedPayment.pixQrCodeBase64
                                : `data:image/png;base64,${confirmedPayment.pixQrCodeBase64}`
                            }
                            alt="QR Code Pix"
                            className="w-44 h-44 rounded-xl border border-amber-200 bg-white p-2 shadow-xs"
                          />
                        </div>
                      )}

                      <p className="text-[11px] text-amber-800 leading-relaxed">
                        Abra o app do seu banco, escolha <strong>Pix Copia e Cola</strong> e cole o código abaixo para pagar:
                      </p>

                      <div className="relative">
                        <input
                          readOnly
                          value={confirmedPayment.pixQrCode}
                          className="w-full text-[11px] font-mono bg-white border border-amber-300 rounded-xl px-3 py-2.5 pr-28 text-slate-800 focus:outline-none"
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            if (confirmedPayment.pixQrCode) {
                              navigator.clipboard.writeText(confirmedPayment.pixQrCode);
                              setCopiedPix(true);
                              setTimeout(() => setCopiedPix(false), 3000);
                            }
                          }}
                          className="absolute right-1 top-1 h-8 text-[11px] px-3 rounded-lg shadow-xs"
                        >
                          {copiedPix ? (
                            <>
                              <Check className="w-3.5 h-3.5 mr-1 text-emerald-300" /> Copiado!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 mr-1" /> Copiar Pix
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {confirmedPayment.checkoutUrl && (
                    <div className="p-4 bg-sky-50/80 border border-sky-200 rounded-2xl text-left space-y-2">
                      <span className="text-xs font-bold text-sky-900 block">Link de Pagamento do Gateway</span>
                      <p className="text-[11px] text-sky-700">
                        Você também pode concluir o pagamento diretamente pelo ambiente seguro:
                      </p>
                      <a
                        href={confirmedPayment.checkoutUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 px-4 py-2.5 rounded-xl shadow-xs transition-colors"
                      >
                        Abrir Pagamento Seguro <ArrowRight className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}

                  {confirmedPayment.instructions && (
                    <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-2xl text-left space-y-1">
                      <span className="text-xs font-bold text-slate-800 block">Instruções de Pagamento</span>
                      <p className="text-xs text-slate-600 leading-relaxed">{confirmedPayment.instructions}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Ações Finais */}
              <div className="space-y-2.5 pt-2">
                <Link href="/paciente" className="block w-full">
                  <Button className="w-full h-12 rounded-xl text-sm font-semibold shadow-xs">
                    Ir para Minhas Consultas
                  </Button>
                </Link>

                <Link href="/" className="block w-full">
                  <Button variant="outline" className="w-full h-12 rounded-xl text-sm font-semibold border-slate-200">
                    Voltar ao Início
                  </Button>
                </Link>
              </div>
            </div>
          ) : step === 1 ? (
            /* ================= ETAPA 1: ESCOLHA O SERVIÇO ================= */
            <div className="space-y-6">
              <div className="text-center space-y-1">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  Escolha o serviço
                </h1>
                <p className="text-xs sm:text-sm text-slate-500">
                  Selecione o tipo de atendimento que deseja agendar.
                </p>
              </div>

              {/* Lista de Cards de Serviço */}
              <div className="space-y-3 sm:space-y-3.5">
                {services.map((service) => {
                  const isSelected = selectedService?.id === service.id;
                  const ServiceIcon = getServiceIcon(service);

                  return (
                    <div
                      key={service.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelectService(service)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleSelectService(service);
                        }
                      }}
                      className={`w-full text-left p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer select-none ${
                        isSelected
                          ? "border-[var(--primary)] bg-[var(--primary)]/[0.04] shadow-sm ring-1 ring-[var(--primary)]"
                          : "border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-xs"
                      }`}
                    >
                      {/* Topo do Card: Ícone, Nome e Indicador de Seleção */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                              isSelected
                                ? "bg-[var(--primary)] text-white shadow-xs"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            <ServiceIcon className="w-5 h-5" />
                          </div>

                          <div className="min-w-0">
                            <h3 className="font-semibold text-slate-900 text-sm sm:text-base leading-snug">
                              {service.name}
                            </h3>

                            {/* Badge de Modalidade */}
                            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                              {service.modality === "ONLINE" && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                                  <Video className="w-3 h-3" /> Online
                                </span>
                              )}
                              {service.modality === "PRESENTIAL" && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                                  <MapPin className="w-3 h-3" /> Presencial
                                </span>
                              )}
                              {service.modality === "BOTH" && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                                  Online ou Presencial
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Indicador de Seleção (Círculo Preenchido com Check) */}
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all ${
                            isSelected
                              ? "bg-[var(--primary)] text-white shadow-xs"
                              : "border-2 border-slate-300 bg-white"
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.8]" />}
                        </div>
                      </div>

                      {/* Descrição do Atendimento (quando houver) */}
                      {service.description && (
                        <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                          {service.description}
                        </p>
                      )}

                      {/* Linha Inferior: Duração à esquerda e Preço à DIREITA na cor do tema */}
                      <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100">
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{service.durationMinutes} minutos</span>
                        </span>

                        <span className="text-base sm:text-lg font-bold text-[var(--primary)]">
                          {service.isFree || service.priceCents === 0
                            ? "Gratuito"
                            : formatBRL(service.priceCents)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Botão de Avanço */}
              <div className="pt-2">
                <Button
                  onClick={handleProceedToStep2}
                  disabled={!selectedService}
                  className="w-full h-12 rounded-xl text-sm font-semibold shadow-xs gap-2"
                >
                  <span>Continuar</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : step === 2 && selectedService ? (
            /* ================= ETAPA 2: DATA E HORÁRIO ================= */
            <div className="space-y-6">
              <div className="text-center space-y-1">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  Escolha a data e o horário
                </h1>
                <p className="text-xs sm:text-sm text-slate-500">
                  Selecione uma data e um horário disponível.
                </p>
              </div>

              {/* Seletor de Formato (Online / Presencial) caso o serviço suporte ambos */}
              {selectedService.modality === "BOTH" && (
                <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-xs space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    Formato de atendimento:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedModality("ONLINE")}
                      className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        selectedModality === "ONLINE"
                          ? "bg-[var(--primary)] text-white shadow-xs"
                          : "bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Online (Vídeo)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedModality("PRESENTIAL")}
                      className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        selectedModality === "PRESENTIAL"
                          ? "bg-[var(--primary)] text-white shadow-xs"
                          : "bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Presencial</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Seletor Semanal e Grade de Horários */}
              <BookingDateTimePicker
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                slots={slots}
                selectedSlot={selectedSlot}
                onSelectSlot={setSelectedSlot}
                isLoadingSlots={isLoadingSlots}
                slotError={slotError}
              />

              {/* Opção Alternativa: Tirar dúvidas no WhatsApp */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <span className="font-semibold text-amber-900 block">
                    Dúvidas sobre horários ou atendimento?
                  </span>
                  <p className="text-amber-800 text-[11px] leading-relaxed">
                    Você pode tirar dúvidas diretamente pelo WhatsApp antes de prosseguir.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={handleWhatsAppInquiry}
                  className="w-full sm:w-auto shrink-0 gap-1.5 text-xs border-amber-300 text-amber-900 bg-white hover:bg-amber-100/60 h-9"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </Button>
              </div>

              {/* Botão de Avanço */}
              <div className="pt-2">
                <Button
                  onClick={handleProceedToStep3}
                  disabled={!selectedDate || !selectedSlot}
                  isLoading={isLoading}
                  className="w-full h-12 rounded-xl text-sm font-semibold shadow-xs gap-2"
                >
                  <span>Continuar</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : step === 3 && selectedService && selectedSlot ? (
            /* ================= ETAPA 3: IDENTIFICAÇÃO ================= */
            <div className="space-y-6">
              <div className="text-center space-y-1">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  Identificação
                </h1>
                <p className="text-xs sm:text-sm text-slate-500">
                  Acesse sua conta para concluir o agendamento.
                </p>
              </div>

              {/* Pill Informativa da Consulta em Andamento */}
              <div className="p-3 bg-slate-50/90 border border-slate-200/80 rounded-xl flex items-center justify-between gap-2 text-xs text-slate-700">
                <div className="flex items-center gap-2 min-w-0">
                  <Calendar className="w-4 h-4 text-[var(--primary)] shrink-0" />
                  <span className="truncate">
                    <strong>{selectedService.name}</strong> • {formatDate(selectedDate)} às {selectedSlot.formattedTime}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-[11px] text-[var(--primary)] font-semibold hover:underline shrink-0"
                >
                  Alterar
                </button>
              </div>

              {/* Caso o Paciente Já Esteja Logado */}
              {currentUser ? (
                <div className="bg-white border border-emerald-200/90 rounded-2xl p-5 shadow-xs space-y-4">
                  <div className="flex items-center gap-2.5 text-emerald-700 font-semibold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>Identificado com sucesso</span>
                  </div>

                  <div className="space-y-1 text-xs text-slate-600 bg-slate-50/70 p-3 rounded-xl border border-slate-200/60">
                    <p className="break-words">
                      Paciente: <strong className="text-slate-900 font-semibold">{currentUser.fullName || currentUser.name}</strong>
                    </p>
                    <p className="break-all">
                      E-mail: <strong className="text-slate-900 font-semibold">{currentUser.email}</strong>
                    </p>
                  </div>

                  <Button
                    onClick={() => setStep(4)}
                    className="w-full h-12 rounded-xl text-sm font-semibold shadow-xs gap-2"
                  >
                    <span>Continuar para Pagamento</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>

                  <button
                    type="button"
                    onClick={handleLogoutAccount}
                    className="text-xs text-slate-500 hover:text-slate-800 underline text-center w-full block pt-1"
                  >
                    Não é você? Trocar de conta
                  </button>
                </div>
              ) : (
                /* Formulário Alternável: Já sou paciente vs Novo paciente */
                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
                  {/* Segmented Control */}
                  <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("login");
                        setError(null);
                      }}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        authMode === "login"
                          ? "bg-white text-slate-900 shadow-xs font-bold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Já sou paciente
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("register");
                        setError(null);
                      }}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        authMode === "register"
                          ? "bg-white text-slate-900 shadow-xs font-bold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Novo paciente
                    </button>
                  </div>

                  {/* 7.1 Login: Já sou paciente */}
                  {authMode === "login" ? (
                    <form onSubmit={handleLoginSubmit} className="space-y-4">
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-700">
                          E-mail *
                        </label>
                        <div className="relative">
                          <Input
                            type="email"
                            required
                            placeholder="seu@email.com"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            className="h-11 rounded-xl text-xs pl-9"
                          />
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-700">
                          Senha *
                        </label>
                        <div className="relative">
                          <Input
                            type={showLoginPassword ? "text" : "password"}
                            required
                            placeholder="Sua senha de acesso"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            className="h-11 rounded-xl text-xs pl-9 pr-10"
                          />
                          <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
                          <button
                            type="button"
                            onClick={() => setShowLoginPassword((prev) => !prev)}
                            className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 p-1"
                            aria-label={showLoginPassword ? "Ocultar senha" : "Ver senha"}
                          >
                            {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600">
                          <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="rounded accent-[var(--primary)]"
                          />
                          <span>Lembrar de mim</span>
                        </label>

                        <Link
                          href="/recuperar-senha"
                          target="_blank"
                          className="text-[var(--primary)] font-semibold hover:underline"
                        >
                          Esqueci minha senha
                        </Link>
                      </div>

                      <Button
                        type="submit"
                        isLoading={isLoading}
                        className="w-full h-12 rounded-xl text-sm font-semibold shadow-xs mt-2"
                      >
                        Entrar e Continuar
                      </Button>
                    </form>
                  ) : (
                    /* 7.2 Cadastro: Novo paciente (compartilhado com /cadastro e /login) */
                    <PatientRegisterForm
                      onSuccess={(user) => {
                        setCurrentUser(user);
                        setStep(4);
                      }}
                      submitLabel="Criar Conta e Continuar"
                    />
                  )}
                </div>
              )}
            </div>
          ) : step === 4 && selectedService && selectedSlot ? (
            /* ================= ETAPA 4: PAGAMENTO E CONCLUSÃO ================= */
            <div className="space-y-6">
              <div className="text-center space-y-1">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  Pagamento e Conclusão
                </h1>
                <p className="text-xs sm:text-sm text-slate-500">
                  Revise os dados do agendamento, escolha a forma de pagamento e finalize.
                </p>
              </div>

              {/* Card Resumo do Agendamento */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                  Resumo do Agendamento
                </span>

                <div className="space-y-2.5 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Atendimento:</span>
                    <span className="font-semibold text-slate-900">{selectedService.name}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Data e Horário:</span>
                    <span className="font-semibold text-slate-900 capitalize">
                      {formatDateLong(selectedDate)} às {selectedSlot.formattedTime}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Duração:</span>
                    <span className="font-medium text-slate-900">{selectedService.durationMinutes} minutos</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Formato:</span>
                    <span className="font-medium text-slate-900">
                      {selectedModality === "ONLINE" ? "Online (Vídeo)" : "Presencial (Consultório)"}
                    </span>
                  </div>

                  {currentUser && (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      <span className="text-slate-500">Paciente:</span>
                      <span className="font-semibold text-slate-900 truncate max-w-[200px]">
                        {currentUser.fullName || currentUser.name}
                      </span>
                    </div>
                  )}
                </div>

                {/* Valor Total */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">Valor da Sessão:</span>
                  <span className="text-lg font-bold text-[var(--primary)]">
                    {selectedService.isFree || selectedService.priceCents === 0
                      ? "Gratuito"
                      : formatBRL(selectedService.priceCents)}
                  </span>
                </div>
              </div>

              {/* Formas de Pagamento Habilitadas */}
              {selectedService.isFree || selectedService.priceCents === 0 ? (
                <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex items-center gap-3 text-xs text-emerald-800">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>
                    Este atendimento é <strong>100% gratuito</strong>. Nenhuma cobrança financeira será realizada.
                  </span>
                </div>
              ) : (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Forma de Pagamento
                  </h3>

                  <div className="space-y-2.5">
                    {(availableGateways.length > 0
                      ? availableGateways
                      : ([
                          {
                            provider: "IN_PERSON",
                            name: "Pagamento Presencial no Consultório",
                            isDefault: true,
                            instructions:
                              "Acerto realizado no início da consulta (Cartão, Dinheiro ou Pix)",
                          },
                        ] as PaymentOption[])
                    ).map((gw) => {
                      const isSelected = selectedGateway === gw.provider;
                      const meta = getProviderMeta(gw.provider);
                      const Icon = meta.icon;

                      return (
                        <div
                          key={gw.provider}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedGateway(gw.provider)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setSelectedGateway(gw.provider);
                            }
                          }}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer select-none flex items-start gap-3 ${
                            isSelected
                              ? "border-[var(--primary)] bg-[var(--primary)]/[0.04] shadow-xs ring-1 ring-[var(--primary)]"
                              : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                              isSelected
                                ? "bg-[var(--primary)] text-white"
                                : "border-2 border-slate-300 bg-white"
                            }`}
                          >
                            {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Icon className={`w-4 h-4 ${meta.iconColor} shrink-0`} />
                              <span className="text-xs font-bold text-slate-900">
                                {gw.name || meta.title}
                              </span>
                              {gw.isSandbox && (
                                <span className="text-[9px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.2 rounded-md">
                                  Sandbox
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {gw.instructions || meta.desc}
                            </p>
                          </div>

                          {gw.isDefault && (
                            <span className="text-[10px] font-bold text-[var(--primary)] bg-[var(--primary)]/10 px-2 py-0.5 rounded-full shrink-0">
                              Padrão
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Botão de Confirmação Final */}
              <div className="space-y-3 pt-2">
                <Button
                  onClick={handleConfirmBooking}
                  disabled={!currentUser}
                  isLoading={isLoading}
                  className="w-full h-12 rounded-xl text-sm font-semibold shadow-xs"
                >
                  Confirmar Agendamento
                </Button>

                <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Ambiente seguro com criptografia de ponta a ponta</span>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </main>

      {/* 4. Rodapé Limpo e Minimalista */}
      <footer className="border-t border-slate-200/80 py-6 text-center text-xs text-slate-400 relative z-10 bg-white/60 backdrop-blur-xs">
        &copy; {new Date().getFullYear()} {site?.clinicName || "PSI"} — Todos os direitos reservados.
      </footer>
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB] text-slate-500 text-xs">
          Carregando agendamento...
        </div>
      }
    >
      <BookingPageContent />
    </Suspense>
  );
}
