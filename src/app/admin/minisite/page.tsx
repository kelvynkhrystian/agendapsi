"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { ThemeIcon } from "@/components/minisite/theme-icon";
import { IconPickerModal } from "@/components/minisite/icon-picker-modal";
import { DEFAULT_HERO_BENEFITS, HeroBenefitItem } from "@/lib/minisite-icons";
import {
  SiteSectionsConfig,
  DEFAULT_SITE_SECTIONS_CONFIG,
  DEVELOPER_ATTRIBUTION,
  cloneDefaultSiteSectionsConfig,
  parseSiteSectionsConfig,
} from "@/lib/site-sections";
import {
  formatFullAddress,
  getGoogleMapsDestinationUrl,
  buildWhatsAppChatUrl,
} from "@/lib/minisite-helpers";
import {
  Globe,
  Save,
  ExternalLink,
  Sparkles,
  MapPin,
  MessageCircle,
  Upload,
  Trash2,
  RotateCcw,
  Info,
  CheckCircle2,
  Compass,
  ArrowRight,
  Briefcase,
  UserRound,
  Award,
  ListChecks,
  MessageSquareQuote,
  Megaphone,
  PanelBottom,
  Plus,
  Lock,
  ShieldCheck,
  Cookie,
  FileText,
  Star,
} from "lucide-react";

interface LegalPageSummary {
  id: string;
  title: string;
  isPublished: boolean;
}

interface ActiveServiceSummary {
  id: string;
  name: string;
  modality: string;
  durationMinutes: number;
}

type IconTarget =
  | { type: "benefit"; index: number }
  | { type: "diferencial"; index: number }
  | { type: "comoFunciona"; index: number }
  | null;

const SECTION_NAV_ITEMS = [
  { id: "sec-1", number: "1", label: "Início / Hero" },
  { id: "sec-2", number: "2", label: "Atendimentos" },
  { id: "sec-3", number: "3", label: "Sobre Mim" },
  { id: "sec-4", number: "4", label: "Diferenciais" },
  { id: "sec-5", number: "5", label: "Como Funciona" },
  { id: "sec-6", number: "6", label: "Depoimentos" },
  { id: "sec-7", number: "7", label: "Localização" },
  { id: "sec-8", number: "8", label: "Chamada Final" },
  { id: "sec-9", number: "9", label: "Rodapé" },
];

export default function AdminMiniSitePage() {
  // Seção 1 & Dados Gerais
  const [clinicName, setClinicName] = useState("");
  const [tagline, setTagline] = useState("");
  const [heroTitle, setHeroTitle] = useState("");
  const [heroSubtitle, setHeroSubtitle] = useState("");
  const [aboutText, setAboutText] = useState("");

  // Resumos somente leitura vindos de módulos autoritativos (Perfil, Serviços, Páginas Info)
  const [professionalName, setProfessionalName] = useState("");
  const [professionalDisplayName, setProfessionalDisplayName] = useState("");
  const [professionalTitle, setProfessionalTitle] = useState("");
  const [crpCrm, setCrpCrm] = useState("");
  const [bio, setBio] = useState("");
  const [email, setEmail] = useState("");
  const [instagram, setInstagram] = useState("");
  const [activeServices, setActiveServices] = useState<ActiveServiceSummary[]>([]);
  const [legalPages, setLegalPages] = useState<LegalPageSummary[]>([]);

  // Benefícios / Indicadores do Hero
  const [benefits, setBenefits] = useState<HeroBenefitItem[]>(DEFAULT_HERO_BENEFITS);

  // Biblioteca de Ícones Compartilhada (Hero Benefícios, Diferenciais, Como Funciona)
  const [iconPickerTarget, setIconPickerTarget] = useState<IconTarget>(null);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  // Configurações Estruturadas de Todas as Seções do Site
  const [sectionsConfig, setSectionsConfig] = useState<SiteSectionsConfig>(
    cloneDefaultSiteSectionsConfig
  );

  // Localização do Consultório Físico
  const [address, setAddress] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [addressComplement, setAddressComplement] = useState("");
  const [addressNeighborhood, setAddressNeighborhood] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressState, setAddressState] = useState("");
  const [addressPostalCode, setAddressPostalCode] = useState("");
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [googleMapsEmbedUrl, setGoogleMapsEmbedUrl] = useState("");
  const [showLocation, setShowLocation] = useState(true);

  // Integração com WhatsApp (Número centralizado no Perfil)
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [whatsappDefaultMessage, setWhatsappDefaultMessage] = useState(
    "Olá! Conheci seu trabalho pelo site e gostaria de saber mais sobre os atendimentos e como agendar uma consulta."
  );
  const [showFloatingWhatsApp, setShowFloatingWhatsApp] = useState(true);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/site/settings").then((r) => r.json()),
      fetch("/api/admin/information-pages")
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ])
      .then(([data, infoData]) => {
        if (data?.site) {
          setClinicName(data.site.clinicName || "");
          setTagline(data.site.tagline || "");
          setHeroTitle(data.site.heroTitle || "");
          setHeroSubtitle(data.site.heroSubtitle || "");
          setAboutText(data.site.aboutText || "");
          setWhatsappNumber(data.site.whatsappNumber || "");
          setEmail(data.site.email || "");
          setInstagram(data.site.instagram || "");

          setAddress(data.site.address || "");
          setAddressNumber(data.site.addressNumber || "");
          setAddressComplement(data.site.addressComplement || "");
          setAddressNeighborhood(data.site.addressNeighborhood || "");
          setAddressCity(data.site.addressCity || "");
          setAddressState(data.site.addressState || "");
          setAddressPostalCode(data.site.addressPostalCode || "");
          setGoogleMapsUrl(data.site.googleMapsUrl || "");
          setGoogleMapsEmbedUrl(data.site.googleMapsEmbedUrl || "");
          setShowLocation(data.site.showLocation !== undefined ? data.site.showLocation : true);

          if (data.site.whatsappDefaultMessage) {
            setWhatsappDefaultMessage(data.site.whatsappDefaultMessage);
          }
          setShowFloatingWhatsApp(
            data.site.showFloatingWhatsApp !== undefined ? data.site.showFloatingWhatsApp : true
          );

          if (data.site.benefitsJson) {
            try {
              const parsed = JSON.parse(data.site.benefitsJson);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setBenefits(parsed);
              }
            } catch {}
          }

          setSectionsConfig(
            data.sectionsConfig || parseSiteSectionsConfig(data.site.sectionsConfigJson)
          );
        }

        if (data?.profile) {
          setProfessionalName(data.profile.fullName || "");
          setProfessionalDisplayName(data.profile.displayName || "");
          setProfessionalTitle(data.profile.title || "");
          setCrpCrm(data.profile.crpCrm || "");
          setBio(data.profile.bio || "");
        }

        if (Array.isArray(data?.services)) {
          setActiveServices(data.services);
        }

        if (Array.isArray(infoData?.pages)) {
          setLegalPages(infoData.pages);
        }

        setIsLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setIsLoading(false);
      });
  }, []);

  const handleUploadCustomIcon = async (
    target: { type: "benefit" | "diferencial"; index: number },
    file: File
  ) => {
    const key = `${target.type}-${target.index}`;
    setUploadingKey(key);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/minisite/icons/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erro ao fazer upload do ícone.");
        return;
      }

      if (target.type === "benefit") {
        setBenefits((prev) => {
          const next = [...prev];
          next[target.index] = {
            ...next[target.index],
            customIconUrl: data.url,
          };
          return next;
        });
      } else {
        setSectionsConfig((prev) => {
          const items = [...prev.diferenciais.items];
          items[target.index] = {
            ...items[target.index],
            customIconUrl: data.url,
          };
          return {
            ...prev,
            diferenciais: {
              ...prev.diferenciais,
              items,
            },
          };
        });
      }
    } catch {
      setError("Erro de rede ao enviar ícone.");
    } finally {
      setUploadingKey(null);
    }
  };

  const handleUpdateBenefit = (index: number, patch: Partial<HeroBenefitItem>) => {
    setBenefits((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const handleRestoreDefaultBenefits = () => {
    setBenefits(DEFAULT_HERO_BENEFITS);
  };

  const handleSelectIconFromModal = (iconKey: string) => {
    if (!iconPickerTarget) return;
    if (iconPickerTarget.type === "benefit") {
      handleUpdateBenefit(iconPickerTarget.index, {
        icon: iconKey,
        customIconUrl: null,
      });
    } else if (iconPickerTarget.type === "diferencial") {
      setSectionsConfig((prev) => {
        const items = [...prev.diferenciais.items];
        items[iconPickerTarget.index] = {
          ...items[iconPickerTarget.index],
          icon: iconKey,
          customIconUrl: null,
        };
        return {
          ...prev,
          diferenciais: { ...prev.diferenciais, items },
        };
      });
    } else if (iconPickerTarget.type === "comoFunciona") {
      setSectionsConfig((prev) => {
        const steps = [...prev.comoFunciona.steps];
        steps[iconPickerTarget.index] = {
          ...steps[iconPickerTarget.index],
          icon: iconKey,
        };
        return {
          ...prev,
          comoFunciona: { ...prev.comoFunciona, steps },
        };
      });
    }
  };

  const currentModalIconKey = (() => {
    if (!iconPickerTarget) return undefined;
    if (iconPickerTarget.type === "benefit") {
      return benefits[iconPickerTarget.index]?.icon;
    }
    if (iconPickerTarget.type === "diferencial") {
      return sectionsConfig.diferenciais.items[iconPickerTarget.index]?.icon;
    }
    if (iconPickerTarget.type === "comoFunciona") {
      return sectionsConfig.comoFunciona.steps[iconPickerTarget.index]?.icon;
    }
    return undefined;
  })();

  const handleAddDepoimento = () => {
    setSectionsConfig((prev) => ({
      ...prev,
      depoimentos: {
        ...prev.depoimentos,
        items: [
          ...prev.depoimentos.items,
          {
            id: `dep-${Date.now()}`,
            author: "",
            roleLabel: "Paciente em Acompanhamento",
            quote: "",
            rating: 5,
            consentConfirmed: false,
            isVisible: true,
          },
        ],
      },
    }));
  };

  const handleRemoveDepoimento = (index: number) => {
    setSectionsConfig((prev) => ({
      ...prev,
      depoimentos: {
        ...prev.depoimentos,
        items: prev.depoimentos.items.filter((_, idx) => idx !== index),
      },
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage(null);
    setError(null);

    try {
      const res = await fetch("/api/admin/site/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinicName,
          tagline,
          heroTitle,
          heroSubtitle,
          aboutText,
          address,
          addressNumber,
          addressComplement,
          addressNeighborhood,
          addressCity,
          addressState,
          addressPostalCode,
          googleMapsUrl,
          googleMapsEmbedUrl,
          showLocation,
          whatsappDefaultMessage,
          showFloatingWhatsApp,
          benefits,
          bio,
          sectionsConfig,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erro ao salvar alterações do Site.");
        setIsSaving(false);
        return;
      }

      setSaveMessage("Configurações do Site atualizadas e publicadas com sucesso!");
      setIsSaving(false);
    } catch {
      setError("Erro de comunicação com o servidor.");
      setIsSaving(false);
    }
  };

  // Previews calculados
  const locationPreviewData = {
    address,
    addressNumber,
    addressComplement,
    addressNeighborhood,
    addressCity,
    addressState,
    addressPostalCode,
    googleMapsUrl,
    googleMapsEmbedUrl,
    showLocation,
  };
  const fullAddressPreview = formatFullAddress(locationPreviewData);
  const destinationMapsUrlPreview = getGoogleMapsDestinationUrl(locationPreviewData);
  const resolvedProfessionalDisplay = professionalDisplayName || professionalName;
  const whatsappChatUrlPreview = buildWhatsAppChatUrl(
    whatsappNumber,
    whatsappDefaultMessage,
    resolvedProfessionalDisplay
  );

  const legalPageMap = new Map(legalPages.map((p) => [p.id, p]));
  const footerLegalItems: Array<{
    id: string;
    label: string;
    field: "showPrivacyLink" | "showTermsLink" | "showLgpdLink" | "showEthicsLink";
  }> = [
    { id: "privacy", label: "Política de Privacidade", field: "showPrivacyLink" },
    { id: "terms", label: "Termos de Uso", field: "showTermsLink" },
    { id: "lgpd", label: "LGPD", field: "showLgpdLink" },
    { id: "ethics", label: "Ética Profissional", field: "showEthicsLink" },
  ];

  const defaultCopyrightPreview = `© ${new Date().getFullYear()} ${
    clinicName || "Consultório"
  }. Todos os direitos reservados.`;

  if (isLoading) {
    return <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />;
  }

  return (
    <div className="space-y-6 max-w-5xl pb-16">
      {/* Cabeçalho Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#171717] dark:text-[#F5F5F5]">
            Site & Presença Digital
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Configure o Site na mesma sequência exibida aos visitantes, da abertura ao rodapé.
          </p>
        </div>

        <Link href="/" target="_blank" title="Abrir Site público em nova aba">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Visualizar Site</span>
          </Button>
        </Link>
      </div>

      {/* Mapa rápido da ordem das 9 seções do Site */}
      <nav
        aria-label="Seções do Site"
        className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-white dark:bg-[#141414] border border-slate-200 dark:border-[#393939]"
      >
        {SECTION_NAV_ITEMS.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#202020] hover:text-[var(--primary)] dark:hover:text-[#F5F5F5] transition-colors"
          >
            <span className="w-4 h-4 rounded-full bg-[var(--primary)]/12 text-[var(--primary)] dark:bg-[#292929] dark:text-[#F5F5F5] dark:border dark:border-[#393939] font-bold text-[10px] inline-flex items-center justify-center tabular-nums">
              {item.number}
            </span>
            <span>{item.label}</span>
          </a>
        ))}
      </nav>

      {saveMessage && <Alert variant="success">{saveMessage}</Alert>}
      {error && <Alert variant="destructive">{error}</Alert>}

      <form onSubmit={handleSave} className="space-y-6">
        {/* ================= 1. INÍCIO / HERO ================= */}
        <Card id="sec-1" className="scroll-mt-24 border-slate-200 dark:border-[#393939]">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Badge variant="outline" className="text-[11px] font-bold px-2 py-0.5 tabular-nums">
                1
              </Badge>
              <Globe className="h-4 w-4 text-[var(--primary)] dark:text-[#D0D0D0]" />
              <span>Início / Hero</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Apresentação inicial, textos de boas-vindas e os 3 diferenciais rápidos do topo do Site.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-5 space-y-5">
            {/* Fonte Centralizada de Perfil & Mídias do Hero */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1 text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-[var(--primary)] dark:text-[#D0D0D0] shrink-0" />
                  <span>
                    Identificação exibida no Hero (
                    <strong>{resolvedProfessionalDisplay || "Profissional"}</strong>
                    {professionalTitle ? ` • ${professionalTitle}` : ""}
                    {crpCrm ? ` • ${crpCrm}` : ""}) centralizada em{" "}
                    <strong>Configurações Gerais → Perfil</strong>.
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-6">
                  Mídias (Hero Desktop, Hero Mobile e cor de fundo automática) são gerenciadas em{" "}
                  <Link
                    href="/admin/configuracoes?tab=appearance"
                    className="font-semibold text-[var(--primary)] dark:text-[#F5F5F5] underline underline-offset-2 hover:opacity-85"
                  >
                    Configurações Gerais → Aparência
                  </Link>
                  .
                </p>
              </div>
              <Link
                href="/admin/configuracoes?tab=profile"
                className="inline-flex items-center gap-1 font-semibold text-[var(--primary)] dark:text-[#F5F5F5] hover:underline shrink-0 text-xs"
              >
                <span>Editar Perfil</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Nome do Consultório / Espaço *"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                required
              />
              <Input
                label="Slogan / Tagline"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
              />
            </div>

            <Input
              label="Título Principal (Hero) *"
              value={heroTitle}
              onChange={(e) => setHeroTitle(e.target.value)}
              required
            />

            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Subtítulo do Hero</label>
              <textarea
                rows={2}
                className="flex w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                value={heroSubtitle}
                onChange={(e) => setHeroSubtitle(e.target.value)}
              />
            </div>

            {/* Sub-bloco: 3 Benefícios & Ícones do Hero */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-800 dark:text-slate-100">
                    <Sparkles className="h-4 w-4 text-[var(--primary)] dark:text-[#D0D0D0]" />
                    <span>Indicadores de Benefícios do Hero</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Os 3 destaques exibidos abaixo dos botões de ação no topo do Site. Os ícones herdam as cores do tema ativo.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRestoreDefaultBenefits}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 gap-1.5 self-start sm:self-auto"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Restaurar Padrão</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {benefits.map((item, index) => (
                  <div
                    key={item.id || index}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3.5 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                          Benefício #{index + 1}
                        </span>
                        <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.isVisible}
                            onChange={(e) => handleUpdateBenefit(index, { isVisible: e.target.checked })}
                            className="rounded text-[var(--primary)] focus:ring-[var(--primary)]"
                          />
                          <span>Visível</span>
                        </label>
                      </div>

                      <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-center space-y-1.5 shadow-xs">
                        <div className="w-11 h-11 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] dark:bg-[#292929] dark:text-[#F5F5F5] flex items-center justify-center">
                          <ThemeIcon
                            iconName={item.icon}
                            customIconUrl={item.customIconUrl}
                            className="h-5.5 w-5.5 text-[var(--primary)] dark:text-[#F5F5F5]"
                            alt={item.title}
                          />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          {item.customIconUrl ? "Ícone Customizado (Upload)" : `Ícone: ${item.icon}`}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setIconPickerTarget({ type: "benefit", index })}
                          className="text-[11px] gap-1 px-2"
                        >
                          <Compass className="h-3.5 w-3.5 text-[var(--primary)] dark:text-[#D0D0D0]" />
                          <span>Biblioteca</span>
                        </Button>

                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept=".png,.svg"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                handleUploadCustomIcon({ type: "benefit", index }, e.target.files[0]);
                              }
                            }}
                          />
                          <div className="h-8 px-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-[11px] font-medium flex items-center justify-center gap-1 text-slate-700 dark:text-slate-300 transition-colors">
                            <Upload className="h-3.5 w-3.5 text-[var(--primary)] dark:text-[#D0D0D0]" />
                            <span>{uploadingKey === `benefit-${index}` ? "Enviando..." : "Upload"}</span>
                          </div>
                        </label>
                      </div>

                      {item.customIconUrl && (
                        <button
                          type="button"
                          onClick={() => handleUpdateBenefit(index, { customIconUrl: null })}
                          className="text-[10px] text-red-500 hover:underline flex items-center justify-center gap-1 w-full"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Remover upload e voltar para biblioteca</span>
                        </button>
                      )}

                      <div className="space-y-2 pt-1">
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                            Título Principal *
                          </label>
                          <Input
                            value={item.title}
                            onChange={(e) => handleUpdateBenefit(index, { title: e.target.value })}
                            placeholder="Ex: Acolhimento sem julgamentos"
                            className="text-xs"
                            required
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                            Subtítulo / Descrição (Opcional)
                          </label>
                          <Input
                            value={item.subtitle || ""}
                            onChange={(e) => handleUpdateBenefit(index, { subtitle: e.target.value })}
                            placeholder="Ex: Espaço ético e seguro"
                            className="text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Ordem de exibição:</span>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={item.order || index + 1}
                        onChange={(e) => handleUpdateBenefit(index, { order: Number(e.target.value) })}
                        className="w-12 p-1 text-center border rounded bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ================= 2. ATENDIMENTOS ================= */}
        <Card id="sec-2" className="scroll-mt-24 border-slate-200 dark:border-[#393939]">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-4">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Badge variant="outline" className="text-[11px] font-bold px-2 py-0.5 tabular-nums">
                  2
                </Badge>
                <Briefcase className="h-4 w-4 text-[var(--primary)] dark:text-[#D0D0D0]" />
                <span>Atendimentos</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Apresentação das principais demandas e integração automática com os serviços cadastrados.
              </CardDescription>
            </div>

            <label className="flex items-center gap-2 cursor-pointer self-start sm:self-auto bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <input
                type="checkbox"
                checked={sectionsConfig.atendimentos.isVisible}
                onChange={(e) =>
                  setSectionsConfig((prev) => ({
                    ...prev,
                    atendimentos: { ...prev.atendimentos, isVisible: e.target.checked },
                  }))
                }
                className="rounded text-[var(--primary)] focus:ring-[var(--primary)]"
              />
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Exibir seção no Site
              </span>
            </label>
          </CardHeader>

          <CardContent className="pt-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Sobretítulo (Eyebrow)"
                value={sectionsConfig.atendimentos.eyebrow}
                onChange={(e) =>
                  setSectionsConfig((prev) => ({
                    ...prev,
                    atendimentos: { ...prev.atendimentos, eyebrow: e.target.value },
                  }))
                }
              />
              <Input
                label="Título da Seção *"
                value={sectionsConfig.atendimentos.title}
                onChange={(e) =>
                  setSectionsConfig((prev) => ({
                    ...prev,
                    atendimentos: { ...prev.atendimentos, title: e.target.value },
                  }))
                }
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Subtítulo Descritivo"
                value={sectionsConfig.atendimentos.subtitle}
                onChange={(e) =>
                  setSectionsConfig((prev) => ({
                    ...prev,
                    atendimentos: { ...prev.atendimentos, subtitle: e.target.value },
                  }))
                }
              />
              <Input
                label="Texto do Botão Inferior *"
                value={sectionsConfig.atendimentos.ctaLabel}
                onChange={(e) =>
                  setSectionsConfig((prev) => ({
                    ...prev,
                    atendimentos: { ...prev.atendimentos, ctaLabel: e.target.value },
                  }))
                }
                required
              />
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1 text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>{activeServices.length} serviço(s) ativo(s)</strong> exibidos automaticamente nesta seção
                    {activeServices.length > 0
                      ? `: ${activeServices
                          .slice(0, 3)
                          .map((s) => s.name)
                          .join(", ")}${activeServices.length > 3 ? "..." : ""}`
                      : "."}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-6">
                  Valores, durações e modalidades são gerenciados em uma fonte única no módulo Serviços.
                </p>
              </div>
              <Link
                href="/admin/servicos"
                className="inline-flex items-center gap-1 font-semibold text-[var(--primary)] dark:text-[#F5F5F5] hover:underline shrink-0 text-xs"
              >
                <span>Gerenciar em Serviços</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* ================= 3. SOBRE MIM ================= */}
        <Card id="sec-3" className="scroll-mt-24 border-slate-200 dark:border-[#393939]">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Badge variant="outline" className="text-[11px] font-bold px-2 py-0.5 tabular-nums">
                3
              </Badge>
              <UserRound className="h-4 w-4 text-[var(--primary)] dark:text-[#D0D0D0]" />
              <span>Sobre Mim</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Trajetória profissional, abordagem terapêutica e texto de apresentação exibidos ao lado da mídia Sobre Mim.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-5 space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="space-y-1 text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-[var(--primary)] dark:text-[#D0D0D0] shrink-0" />
                  <span>
                    O nome completo, especialidade e registro (CRP/CRM) são centralizados em{" "}
                    <strong>Configurações Gerais → Perfil</strong>.
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-6">
                  A imagem, vídeo ou animação do consultório desta seção é enviada em{" "}
                  <Link
                    href="/admin/configuracoes?tab=appearance"
                    className="font-semibold text-[var(--primary)] dark:text-[#F5F5F5] underline underline-offset-2 hover:opacity-85"
                  >
                    Configurações Gerais → Aparência
                  </Link>
                  .
                </p>
              </div>
              <Link
                href="/admin/configuracoes?tab=profile"
                className="inline-flex items-center gap-1 font-semibold text-[var(--primary)] dark:text-[#F5F5F5] hover:underline shrink-0 text-xs"
              >
                <span>Editar dados em Perfil</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Sobretítulo (Eyebrow)"
                value={sectionsConfig.sobre.eyebrow}
                onChange={(e) =>
                  setSectionsConfig((prev) => ({
                    ...prev,
                    sobre: { ...prev.sobre, eyebrow: e.target.value },
                  }))
                }
              />
              <Input
                label="Título da Seção *"
                value={sectionsConfig.sobre.title}
                onChange={(e) =>
                  setSectionsConfig((prev) => ({
                    ...prev,
                    sobre: { ...prev.sobre, title: e.target.value },
                  }))
                }
                required
              />
              <Input
                label="Link de Ação (/agendar) *"
                value={sectionsConfig.sobre.ctaLabel}
                onChange={(e) =>
                  setSectionsConfig((prev) => ({
                    ...prev,
                    sobre: { ...prev.sobre, ctaLabel: e.target.value },
                  }))
                }
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Biografia / Abordagem Terapêutica</label>
              <textarea
                rows={4}
                className="flex w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Descreva sua trajetória, linha terapêutica e metodologia de acolhimento clínico..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium">
                Apresentação Geral do Consultório (Fallback Institucional)
              </label>
              <textarea
                rows={2}
                className="flex w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                value={aboutText}
                onChange={(e) => setAboutText(e.target.value)}
                placeholder="Exibido automaticamente se a biografia estiver em branco."
              />
            </div>
          </CardContent>
        </Card>

        {/* ================= 4. DIFERENCIAIS ================= */}
        <Card id="sec-4" className="scroll-mt-24 border-slate-200 dark:border-[#393939]">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-4">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Badge variant="outline" className="text-[11px] font-bold px-2 py-0.5 tabular-nums">
                  4
                </Badge>
                <Award className="h-4 w-4 text-[var(--primary)] dark:text-[#D0D0D0]" />
                <span>Diferenciais</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Cartões de diferenciais clínicos com ícones personalizáveis exibidos logo após Sobre Mim.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setSectionsConfig((prev) => ({
                    ...prev,
                    diferenciais: cloneDefaultSiteSectionsConfig().diferenciais,
                  }))
                }
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 gap-1"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Restaurar Padrão</span>
              </Button>

              <label className="flex items-center gap-2 cursor-pointer bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <input
                  type="checkbox"
                  checked={sectionsConfig.diferenciais.isVisible}
                  onChange={(e) =>
                    setSectionsConfig((prev) => ({
                      ...prev,
                      diferenciais: { ...prev.diferenciais, isVisible: e.target.checked },
                    }))
                  }
                  className="rounded text-[var(--primary)] focus:ring-[var(--primary)]"
                />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Exibir seção no Site
                </span>
              </label>
            </div>
          </CardHeader>

          <CardContent className="pt-5 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Sobretítulo (Eyebrow)"
                value={sectionsConfig.diferenciais.eyebrow}
                onChange={(e) =>
                  setSectionsConfig((prev) => ({
                    ...prev,
                    diferenciais: { ...prev.diferenciais, eyebrow: e.target.value },
                  }))
                }
              />
              <Input
                label="Título da Seção *"
                value={sectionsConfig.diferenciais.title}
                onChange={(e) =>
                  setSectionsConfig((prev) => ({
                    ...prev,
                    diferenciais: { ...prev.diferenciais, title: e.target.value },
                  }))
                }
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sectionsConfig.diferenciais.items.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                      Diferencial #{idx + 1}
                    </span>
                    <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.isVisible}
                        onChange={(e) => {
                          const items = [...sectionsConfig.diferenciais.items];
                          items[idx] = { ...items[idx], isVisible: e.target.checked };
                          setSectionsConfig((prev) => ({
                            ...prev,
                            diferenciais: { ...prev.diferenciais, items },
                          }));
                        }}
                        className="rounded text-[var(--primary)] focus:ring-[var(--primary)]"
                      />
                      <span>Visível</span>
                    </label>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] dark:bg-[#292929] dark:text-[#F5F5F5] flex items-center justify-center shrink-0">
                      <ThemeIcon
                        iconName={item.icon}
                        customIconUrl={item.customIconUrl}
                        className="h-5 w-5 text-[var(--primary)] dark:text-[#F5F5F5]"
                        alt={item.title}
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIconPickerTarget({ type: "diferencial", index: idx })}
                        className="text-[11px] gap-1 h-8 px-2.5"
                      >
                        <Compass className="h-3.5 w-3.5 text-[var(--primary)] dark:text-[#D0D0D0]" />
                        <span>Escolher Ícone ({item.icon})</span>
                      </Button>

                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept=".png,.svg"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              handleUploadCustomIcon({ type: "diferencial", index: idx }, e.target.files[0]);
                            }
                          }}
                        />
                        <div className="h-8 px-2.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-[11px] font-medium flex items-center justify-center gap-1 text-slate-700 dark:text-slate-300">
                          <Upload className="h-3.5 w-3.5 text-[var(--primary)] dark:text-[#D0D0D0]" />
                          <span>{uploadingKey === `diferencial-${idx}` ? "Enviando..." : "Upload"}</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {item.customIconUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        const items = [...sectionsConfig.diferenciais.items];
                        items[idx] = { ...items[idx], customIconUrl: null };
                        setSectionsConfig((prev) => ({
                          ...prev,
                          diferenciais: { ...prev.diferenciais, items },
                        }));
                      }}
                      className="text-[10px] text-red-500 hover:underline inline-flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Remover ícone customizado</span>
                    </button>
                  )}

                  <Input
                    label="Título *"
                    value={item.title}
                    onChange={(e) => {
                      const items = [...sectionsConfig.diferenciais.items];
                      items[idx] = { ...items[idx], title: e.target.value };
                      setSectionsConfig((prev) => ({
                        ...prev,
                        diferenciais: { ...prev.diferenciais, items },
                      }));
                    }}
                    className="text-xs"
                    required
                  />

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Descrição
                    </label>
                    <textarea
                      rows={2}
                      className="flex w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs"
                      value={item.description}
                      onChange={(e) => {
                        const items = [...sectionsConfig.diferenciais.items];
                        items[idx] = { ...items[idx], description: e.target.value };
                        setSectionsConfig((prev) => ({
                          ...prev,
                          diferenciais: { ...prev.diferenciais, items },
                        }));
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ================= 5. COMO FUNCIONA ================= */}
        <Card id="sec-5" className="scroll-mt-24 border-slate-200 dark:border-[#393939]">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-4">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Badge variant="outline" className="text-[11px] font-bold px-2 py-0.5 tabular-nums">
                  5
                </Badge>
                <ListChecks className="h-4 w-4 text-[var(--primary)] dark:text-[#D0D0D0]" />
                <span>Como Funciona</span>
              </CardTitle>
              <CardDescription className="text-xs">
                As 3 etapas da jornada de atendimento em linha do tempo e botão principal para agendamento online.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setSectionsConfig((prev) => ({
                    ...prev,
                    comoFunciona: cloneDefaultSiteSectionsConfig().comoFunciona,
                  }))
                }
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 gap-1"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Restaurar Padrão</span>
              </Button>

              <label className="flex items-center gap-2 cursor-pointer bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <input
                  type="checkbox"
                  checked={sectionsConfig.comoFunciona.isVisible}
                  onChange={(e) =>
                    setSectionsConfig((prev) => ({
                      ...prev,
                      comoFunciona: { ...prev.comoFunciona, isVisible: e.target.checked },
                    }))
                  }
                  className="rounded text-[var(--primary)] focus:ring-[var(--primary)]"
                />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Exibir seção no Site
                </span>
              </label>
            </div>
          </CardHeader>

          <CardContent className="pt-5 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Sobretítulo (Eyebrow)"
                value={sectionsConfig.comoFunciona.eyebrow}
                onChange={(e) =>
                  setSectionsConfig((prev) => ({
                    ...prev,
                    comoFunciona: { ...prev.comoFunciona, eyebrow: e.target.value },
                  }))
                }
              />
              <Input
                label="Título da Seção *"
                value={sectionsConfig.comoFunciona.title}
                onChange={(e) =>
                  setSectionsConfig((prev) => ({
                    ...prev,
                    comoFunciona: { ...prev.comoFunciona, title: e.target.value },
                  }))
                }
                required
              />
              <Input
                label="Texto do Botão *"
                value={sectionsConfig.comoFunciona.ctaLabel}
                onChange={(e) =>
                  setSectionsConfig((prev) => ({
                    ...prev,
                    comoFunciona: { ...prev.comoFunciona, ctaLabel: e.target.value },
                  }))
                }
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Subtítulo Introdutório</label>
              <textarea
                rows={2}
                className="flex w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                value={sectionsConfig.comoFunciona.subtitle}
                onChange={(e) =>
                  setSectionsConfig((prev) => ({
                    ...prev,
                    comoFunciona: { ...prev.comoFunciona, subtitle: e.target.value },
                  }))
                }
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {sectionsConfig.comoFunciona.steps.map((step, idx) => (
                <div
                  key={step.id || idx}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[var(--primary)]/12 text-[var(--primary)] dark:bg-[#292929] dark:text-[#F5F5F5] dark:border dark:border-[#393939] font-bold text-xs tabular-nums">
                      Etapa {step.number}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIconPickerTarget({ type: "comoFunciona", index: idx })}
                      className="text-[11px] gap-1 h-7 px-2"
                    >
                      <ThemeIcon iconName={step.icon} className="h-3.5 w-3.5 text-[var(--primary)] dark:text-[#D0D0D0]" />
                      <span>{step.icon}</span>
                    </Button>
                  </div>

                  <Input
                    label="Título da Etapa *"
                    value={step.title}
                    onChange={(e) => {
                      const steps = [...sectionsConfig.comoFunciona.steps];
                      steps[idx] = { ...steps[idx], title: e.target.value };
                      setSectionsConfig((prev) => ({
                        ...prev,
                        comoFunciona: { ...prev.comoFunciona, steps },
                      }));
                    }}
                    className="text-xs"
                    required
                  />

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Descrição *
                    </label>
                    <textarea
                      rows={3}
                      required
                      className="flex w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs"
                      value={step.description}
                      onChange={(e) => {
                        const steps = [...sectionsConfig.comoFunciona.steps];
                        steps[idx] = { ...steps[idx], description: e.target.value };
                        setSectionsConfig((prev) => ({
                          ...prev,
                          comoFunciona: { ...prev.comoFunciona, steps },
                        }));
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ================= 6. DEPOIMENTOS ================= */}
        <Card id="sec-6" className="scroll-mt-24 border-slate-200 dark:border-[#393939]">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-4">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Badge variant="outline" className="text-[11px] font-bold px-2 py-0.5 tabular-nums">
                  6
                </Badge>
                <MessageSquareQuote className="h-4 w-4 text-[var(--primary)] dark:text-[#D0D0D0]" />
                <span>Depoimentos</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Gerencie relatos autorizados com preservação obrigatória de sigilo e consentimento CFP.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddDepoimento}
                className="text-xs gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Adicionar</span>
              </Button>

              <label className="flex items-center gap-2 cursor-pointer bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <input
                  type="checkbox"
                  checked={sectionsConfig.depoimentos.isVisible}
                  onChange={(e) =>
                    setSectionsConfig((prev) => ({
                      ...prev,
                      depoimentos: { ...prev.depoimentos, isVisible: e.target.checked },
                    }))
                  }
                  className="rounded text-[var(--primary)] focus:ring-[var(--primary)]"
                />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Exibir seção no Site
                </span>
              </label>
            </div>
          </CardHeader>

          <CardContent className="pt-5 space-y-5">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
              <ShieldCheck className="h-4 w-4 text-[var(--primary)] dark:text-[#D0D0D0] shrink-0 mt-0.5" />
              <span>
                <strong>Conformidade Ética (CFP):</strong> Apenas depoimentos com a caixa de{" "}
                <em>consentimento livre e esclarecido</em> marcada são exibidos no Site público. Utilize iniciais ou identificadores preservando o sigilo.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Sobretítulo (Eyebrow)"
                value={sectionsConfig.depoimentos.eyebrow}
                onChange={(e) =>
                  setSectionsConfig((prev) => ({
                    ...prev,
                    depoimentos: { ...prev.depoimentos, eyebrow: e.target.value },
                  }))
                }
              />
              <Input
                label="Título da Seção *"
                value={sectionsConfig.depoimentos.title}
                onChange={(e) =>
                  setSectionsConfig((prev) => ({
                    ...prev,
                    depoimentos: { ...prev.depoimentos, title: e.target.value },
                  }))
                }
                required
              />
            </div>

            {sectionsConfig.depoimentos.items.length === 0 ? (
              <div className="p-6 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-2">
                <p className="text-xs text-slate-500">
                  Nenhum depoimento cadastrado nesta lista. Clique em &quot;Adicionar&quot; para incluir um relato autorizado.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {sectionsConfig.depoimentos.items.map((dep, idx) => (
                  <div
                    key={dep.id || idx}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                          Depoimento #{idx + 1}
                        </span>
                        {!dep.consentConfirmed && (
                          <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-700 dark:text-amber-300">
                            Aguardando consentimento CFP (oculto)
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={dep.isVisible}
                            onChange={(e) => {
                              const items = [...sectionsConfig.depoimentos.items];
                              items[idx] = { ...items[idx], isVisible: e.target.checked };
                              setSectionsConfig((prev) => ({
                                ...prev,
                                depoimentos: { ...prev.depoimentos, items },
                              }));
                            }}
                            className="rounded text-[var(--primary)] focus:ring-[var(--primary)]"
                          />
                          <span>Visível</span>
                        </label>

                        {sectionsConfig.depoimentos.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveDepoimento(idx)}
                            className="text-xs text-rose-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Remover</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Input
                        label="Nome ou Iniciais *"
                        value={dep.author}
                        onChange={(e) => {
                          const items = [...sectionsConfig.depoimentos.items];
                          items[idx] = { ...items[idx], author: e.target.value };
                          setSectionsConfig((prev) => ({
                            ...prev,
                            depoimentos: { ...prev.depoimentos, items },
                          }));
                        }}
                        placeholder="Ex: Ana R."
                        className="text-xs"
                        required
                      />
                      <Input
                        label="Rótulo de Acompanhamento"
                        value={dep.roleLabel}
                        onChange={(e) => {
                          const items = [...sectionsConfig.depoimentos.items];
                          items[idx] = { ...items[idx], roleLabel: e.target.value };
                          setSectionsConfig((prev) => ({
                            ...prev,
                            depoimentos: { ...prev.depoimentos, items },
                          }));
                        }}
                        placeholder="Ex: Paciente em Acompanhamento"
                        className="text-xs"
                      />
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                          Avaliação (1 a 5 estrelas)
                        </label>
                        <div className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              aria-label={`${star} estrela(s)`}
                              onClick={() => {
                                const items = [...sectionsConfig.depoimentos.items];
                                items[idx] = { ...items[idx], rating: star };
                                setSectionsConfig((prev) => ({
                                  ...prev,
                                  depoimentos: { ...prev.depoimentos, items },
                                }));
                              }}
                              className="cursor-pointer"
                            >
                              <Star
                                className={`h-4 w-4 ${
                                  star <= dep.rating
                                    ? "text-amber-400 fill-amber-400"
                                    : "text-slate-300 dark:text-slate-600"
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                        Texto do Depoimento *
                      </label>
                      <textarea
                        rows={2}
                        required
                        className="flex w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs"
                        value={dep.quote}
                        onChange={(e) => {
                          const items = [...sectionsConfig.depoimentos.items];
                          items[idx] = { ...items[idx], quote: e.target.value };
                          setSectionsConfig((prev) => ({
                            ...prev,
                            depoimentos: { ...prev.depoimentos, items },
                          }));
                        }}
                      />
                    </div>

                    <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={dep.consentConfirmed}
                        onChange={(e) => {
                          const items = [...sectionsConfig.depoimentos.items];
                          items[idx] = { ...items[idx], consentConfirmed: e.target.checked };
                          setSectionsConfig((prev) => ({
                            ...prev,
                            depoimentos: { ...prev.depoimentos, items },
                          }));
                        }}
                        className="rounded text-[var(--primary)] focus:ring-[var(--primary)]"
                      />
                      <span>
                        Confirmo o consentimento livre e esclarecido do paciente para publicação ética (CFP).
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ================= 7. LOCALIZAÇÃO ================= */}
        <Card id="sec-7" className="scroll-mt-24 border-slate-200 dark:border-[#393939]">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-4">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Badge variant="outline" className="text-[11px] font-bold px-2 py-0.5 tabular-nums">
                  7
                </Badge>
                <MapPin className="h-4 w-4 text-[var(--primary)] dark:text-[#D0D0D0]" />
                <span>Localização</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Endereço presencial, mapa interativo do Google Maps e apresentação dos canais de contato/WhatsApp.
              </CardDescription>
            </div>

            <label className="flex items-center gap-2 cursor-pointer self-start sm:self-auto bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <input
                type="checkbox"
                checked={showLocation}
                onChange={(e) => setShowLocation(e.target.checked)}
                className="rounded text-[var(--primary)] focus:ring-[var(--primary)]"
              />
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Exibir seção no Site
              </span>
            </label>
          </CardHeader>

          <CardContent className="pt-5 space-y-5">
            {!showLocation && (
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Atenção:</strong> A seção de localização física e o link no menu estão desativados no Site público. Ideal para profissionais com atuação 100% online por teleconsulta.
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Sobretítulo (Eyebrow)"
                value={sectionsConfig.localizacao.eyebrow}
                onChange={(e) =>
                  setSectionsConfig((prev) => ({
                    ...prev,
                    localizacao: { ...prev.localizacao, eyebrow: e.target.value },
                  }))
                }
              />
              <Input
                label="Título da Seção *"
                value={sectionsConfig.localizacao.title}
                onChange={(e) =>
                  setSectionsConfig((prev) => ({
                    ...prev,
                    localizacao: { ...prev.localizacao, title: e.target.value },
                  }))
                }
                required
              />
              <Input
                label="Subtítulo Breve"
                value={sectionsConfig.localizacao.subtitle}
                onChange={(e) =>
                  setSectionsConfig((prev) => ({
                    ...prev,
                    localizacao: { ...prev.localizacao, subtitle: e.target.value },
                  }))
                }
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <Input
                  label="Logradouro / Rua / Avenida"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ex: Av. Paulista"
                />
              </div>

              <div>
                <Input
                  label="Número"
                  value={addressNumber}
                  onChange={(e) => setAddressNumber(e.target.value)}
                  placeholder="Ex: 1000"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Complemento"
                value={addressComplement}
                onChange={(e) => setAddressComplement(e.target.value)}
                placeholder="Ex: Sala 42, 4º andar"
              />
              <Input
                label="Bairro"
                value={addressNeighborhood}
                onChange={(e) => setAddressNeighborhood(e.target.value)}
                placeholder="Ex: Bela Vista"
              />
              <Input
                label="CEP"
                value={addressPostalCode}
                onChange={(e) => setAddressPostalCode(e.target.value)}
                placeholder="Ex: 01310-100"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Cidade"
                value={addressCity}
                onChange={(e) => setAddressCity(e.target.value)}
                placeholder="Ex: São Paulo"
              />
              <Input
                label="Estado (UF)"
                value={addressState}
                onChange={(e) => setAddressState(e.target.value)}
                placeholder="Ex: SP"
                maxLength={2}
              />
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Configurações de Mapa e Rota
              </h4>

              <div className="space-y-1">
                <Input
                  label="Link de Destino do Google Maps (Botão 'Como chegar')"
                  value={googleMapsUrl}
                  onChange={(e) => setGoogleMapsUrl(e.target.value)}
                  placeholder="Ex: https://maps.app.goo.gl/..."
                />
                <p className="text-[11px] text-slate-400">
                  Se deixado em branco, o sistema gera automaticamente a rota com base no endereço preenchido acima.
                </p>
              </div>

              <div className="space-y-1">
                <Input
                  label="URL do Embed do Google Maps (Opcional - iframe interativo)"
                  value={googleMapsEmbedUrl}
                  onChange={(e) => setGoogleMapsEmbedUrl(e.target.value)}
                  placeholder="Ex: https://www.google.com/maps/embed?pb=..."
                />
                <p className="text-[11px] text-slate-400">
                  Gere o código em Google Maps → Compartilhar → Incorporar um mapa. Caso não preenchido, o sistema incorpora uma prévia segura sem necessidade de chaves privadas de API.
                </p>
              </div>

              {fullAddressPreview && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Prévia do Endereço Formatado:
                    </span>
                    {destinationMapsUrlPreview && (
                      <a
                        href={destinationMapsUrlPreview}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--primary)] dark:text-[#F5F5F5] hover:underline flex items-center gap-1 font-semibold"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>Testar rota &quot;Como chegar&quot;</span>
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-mono">
                    {fullAddressPreview}
                  </p>
                </div>
              )}
            </div>

            {/* Integração com WhatsApp & Contatos exibidos em Localização / Flutuante */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Contato Direto & WhatsApp no Site</span>
                </h4>

                <label className="flex items-center gap-2 cursor-pointer self-start sm:self-auto bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <input
                    type="checkbox"
                    checked={showFloatingWhatsApp}
                    onChange={(e) => setShowFloatingWhatsApp(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Botão Flutuante Ativo
                  </span>
                </label>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <Info className="h-4 w-4 text-[var(--primary)] dark:text-[#D0D0D0] shrink-0" />
                  <span>
                    O número de WhatsApp, telefone comercial, e-mail público e Instagram são centralizados em{" "}
                    <strong>Configurações Gerais → Perfil</strong>.
                  </span>
                </div>
                <Link
                  href="/admin/configuracoes?tab=profile"
                  className="inline-flex items-center gap-1 font-semibold text-[var(--primary)] dark:text-[#F5F5F5] hover:underline shrink-0 text-xs"
                >
                  <span>Editar contatos no Perfil</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium">
                  Mensagem Padrão de Início de Conversa
                </label>
                <textarea
                  rows={2}
                  className="flex w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                  value={whatsappDefaultMessage}
                  onChange={(e) => setWhatsappDefaultMessage(e.target.value)}
                  placeholder="Olá! Conheci seu trabalho pelo site..."
                />
                <p className="text-[11px] text-slate-400">
                  Pré-preenchida no WhatsApp quando o visitante clica para falar com o consultório (Hero e botão flutuante).
                </p>
              </div>

              {whatsappChatUrlPreview && (
                <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Link do WhatsApp Operacional
                    </span>
                    <span className="text-emerald-700/80 dark:text-emerald-400 text-[11px] break-all">
                      {whatsappChatUrlPreview}
                    </span>
                  </div>

                  <a
                    href={whatsappChatUrlPreview}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shrink-0 self-start sm:self-auto flex items-center gap-1"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Testar Conversa</span>
                  </a>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ================= 8. CHAMADA FINAL ================= */}
        <Card id="sec-8" className="scroll-mt-24 border-slate-200 dark:border-[#393939]">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-4">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Badge variant="outline" className="text-[11px] font-bold px-2 py-0.5 tabular-nums">
                  8
                </Badge>
                <Megaphone className="h-4 w-4 text-[var(--primary)] dark:text-[#D0D0D0]" />
                <span>Chamada Final</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Faixa de destaque acima do rodapé com versões otimizadas para telas desktop e mobile.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setSectionsConfig((prev) => ({
                    ...prev,
                    chamadaFinal: cloneDefaultSiteSectionsConfig().chamadaFinal,
                  }))
                }
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 gap-1"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Restaurar Padrão</span>
              </Button>

              <label className="flex items-center gap-2 cursor-pointer bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <input
                  type="checkbox"
                  checked={sectionsConfig.chamadaFinal.isVisible}
                  onChange={(e) =>
                    setSectionsConfig((prev) => ({
                      ...prev,
                      chamadaFinal: { ...prev.chamadaFinal, isVisible: e.target.checked },
                    }))
                  }
                  className="rounded text-[var(--primary)] focus:ring-[var(--primary)]"
                />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Exibir seção no Site
                </span>
              </label>
            </div>
          </CardHeader>

          <CardContent className="pt-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 block">
                  Versão Desktop
                </span>
                <Input
                  label="Título Principal *"
                  value={sectionsConfig.chamadaFinal.heading}
                  onChange={(e) =>
                    setSectionsConfig((prev) => ({
                      ...prev,
                      chamadaFinal: { ...prev.chamadaFinal, heading: e.target.value },
                    }))
                  }
                  required
                />
                <Input
                  label="Subtítulo"
                  value={sectionsConfig.chamadaFinal.subtitle}
                  onChange={(e) =>
                    setSectionsConfig((prev) => ({
                      ...prev,
                      chamadaFinal: { ...prev.chamadaFinal, subtitle: e.target.value },
                    }))
                  }
                />
                <Input
                  label="Texto do Botão *"
                  value={sectionsConfig.chamadaFinal.ctaLabel}
                  onChange={(e) =>
                    setSectionsConfig((prev) => ({
                      ...prev,
                      chamadaFinal: { ...prev.chamadaFinal, ctaLabel: e.target.value },
                    }))
                  }
                  required
                />
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 block">
                  Versão Mobile (Compacta)
                </span>
                <Input
                  label="Título Mobile *"
                  value={sectionsConfig.chamadaFinal.mobileHeading}
                  onChange={(e) =>
                    setSectionsConfig((prev) => ({
                      ...prev,
                      chamadaFinal: { ...prev.chamadaFinal, mobileHeading: e.target.value },
                    }))
                  }
                  required
                />
                <Input
                  label="Subtítulo Mobile"
                  value={sectionsConfig.chamadaFinal.mobileSubtitle}
                  onChange={(e) =>
                    setSectionsConfig((prev) => ({
                      ...prev,
                      chamadaFinal: { ...prev.chamadaFinal, mobileSubtitle: e.target.value },
                    }))
                  }
                />
                <Input
                  label="Texto do Botão Mobile *"
                  value={sectionsConfig.chamadaFinal.mobileCtaLabel}
                  onChange={(e) =>
                    setSectionsConfig((prev) => ({
                      ...prev,
                      chamadaFinal: { ...prev.chamadaFinal, mobileCtaLabel: e.target.value },
                    }))
                  }
                  required
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
              <span>
                Destino fixo do botão de agendamento: <code className="font-mono font-semibold">/agendar</code>
              </span>
              <Badge variant="outline" className="text-[10px]">
                Fluxo Online Ativo
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* ================= 9. RODAPÉ / FOOTER (SEMPRE POR ÚLTIMO) ================= */}
        <Card id="sec-9" className="scroll-mt-24 border-slate-200 dark:border-[#393939]">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Badge variant="outline" className="text-[11px] font-bold px-2 py-0.5 tabular-nums">
                9
              </Badge>
              <PanelBottom className="h-4 w-4 text-[var(--primary)] dark:text-[#D0D0D0]" />
              <span>Rodapé / Footer</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Identificação institucional no rodapé, descrição ética opcional, direitos autorais, links de páginas informativas e preferências de cookies.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-5 space-y-5">
            {/* Identificação do Profissional / Consultório no Rodapé (Somente Leitura) */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1 text-slate-600 dark:text-slate-300">
                <span className="font-semibold text-slate-800 dark:text-slate-100 block">
                  Identificação exibida no Rodapé (Somente leitura)
                </span>
                <p>
                  <strong>{clinicName || "Consultório"}</strong> — {resolvedProfessionalDisplay || "Profissional"}{" "}
                  {crpCrm ? `• ${crpCrm}` : ""}
                  {email ? ` • ${email}` : ""}
                  {instagram ? ` • ${instagram}` : ""}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Nome público, registro e canais de contato são gerenciados em <strong>Configurações Gerais → Perfil</strong>.
                </p>
              </div>
              <Link
                href="/admin/configuracoes?tab=profile"
                className="inline-flex items-center gap-1 font-semibold text-[var(--primary)] dark:text-[#F5F5F5] hover:underline shrink-0 text-xs"
              >
                <span>Editar Perfil</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {/* Descrição Opcional & Copyright */}
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  Descrição Opcional do Rodapé
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sectionsConfig.rodape.showDescription}
                    onChange={(e) =>
                      setSectionsConfig((prev) => ({
                        ...prev,
                        rodape: { ...prev.rodape, showDescription: e.target.checked },
                      }))
                    }
                    className="rounded text-[var(--primary)] focus:ring-[var(--primary)]"
                  />
                  <span>Exibir descrição</span>
                </label>
              </div>

              <textarea
                rows={2}
                disabled={!sectionsConfig.rodape.showDescription}
                className="flex w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm disabled:opacity-50"
                value={sectionsConfig.rodape.description}
                onChange={(e) =>
                  setSectionsConfig((prev) => ({
                    ...prev,
                    rodape: { ...prev.rodape, description: e.target.value },
                  }))
                }
                placeholder={DEFAULT_SITE_SECTIONS_CONFIG.rodape.description}
              />

              <div className="space-y-1">
                <Input
                  label="Texto de Copyright / Direitos Autorais (Opcional)"
                  value={sectionsConfig.rodape.copyrightText}
                  onChange={(e) =>
                    setSectionsConfig((prev) => ({
                      ...prev,
                      rodape: { ...prev.rodape, copyrightText: e.target.value },
                    }))
                  }
                  placeholder={defaultCopyrightPreview}
                />
                <p className="text-[11px] text-slate-400">
                  Deixe em branco para manter o padrão automático:{" "}
                  <span className="font-medium text-slate-500 dark:text-slate-300">
                    {defaultCopyrightPreview}
                  </span>
                </p>
              </div>
            </div>

            {/* Visibilidade das Páginas Informativas & Cookies */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-[var(--primary)] dark:text-[#D0D0D0]" />
                    <span>Visibilidade de Links Legais no Rodapé</span>
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Escolha quais páginas informativas publicadas devem aparecer no rodapé. O texto completo dos documentos permanece em <strong>Páginas Info</strong>.
                  </p>
                </div>

                <Link
                  href="/admin/paginas-informativas"
                  className="inline-flex items-center gap-1 font-semibold text-[var(--primary)] dark:text-[#F5F5F5] hover:underline shrink-0 text-xs"
                >
                  <span>Gerenciar em Páginas Info</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {footerLegalItems.map((item) => {
                  const pageStatus = legalPageMap.get(item.id);
                  const isPublished = pageStatus ? pageStatus.isPublished : true;
                  const checked = sectionsConfig.rodape[item.field];
                  return (
                    <label
                      key={item.id}
                      className="flex items-center justify-between gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 cursor-pointer hover:border-[var(--primary)]/40 dark:hover:border-[#525252] transition-colors"
                    >
                      <span className="flex items-center gap-2 text-xs font-medium text-slate-800 dark:text-slate-200">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setSectionsConfig((prev) => ({
                              ...prev,
                              rodape: { ...prev.rodape, [item.field]: e.target.checked },
                            }))
                          }
                          className="rounded text-[var(--primary)] focus:ring-[var(--primary)]"
                        />
                        <span>{item.label}</span>
                      </span>

                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          isPublished
                            ? "border-emerald-300 text-emerald-700 dark:text-emerald-300"
                            : "border-amber-300 text-amber-700 dark:text-amber-300"
                        }`}
                      >
                        {isPublished ? "Publicada" : "Rascunho"}
                      </Badge>
                    </label>
                  );
                })}
              </div>

              {/* Preferências de Cookies */}
              <label className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 cursor-pointer hover:border-[var(--primary)]/40 dark:hover:border-[#525252] transition-colors">
                <span className="flex items-center gap-2.5 text-xs font-medium text-slate-800 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={sectionsConfig.rodape.showCookiePreferences}
                    onChange={(e) =>
                      setSectionsConfig((prev) => ({
                        ...prev,
                        rodape: { ...prev.rodape, showCookiePreferences: e.target.checked },
                      }))
                    }
                    className="rounded text-[var(--primary)] focus:ring-[var(--primary)]"
                  />
                  <Cookie className="h-4 w-4 text-[var(--primary)] dark:text-[#D0D0D0] shrink-0" />
                  <span>Exibir link &quot;Preferências de cookies&quot; no rodapé (LGPD)</span>
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
                  Consentimento ativo
                </span>
              </label>
            </div>

            {/* Atribuição Fixa da Plataforma (Somente Leitura / Não Editável) */}
            <div className="p-3.5 rounded-xl bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
                <Lock className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                    Crédito fixo da aplicação (não editável)
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {DEVELOPER_ATTRIBUTION.prefix}{" "}
                    <a
                      href={DEVELOPER_ATTRIBUTION.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium underline text-slate-700 dark:text-[#F5F5F5] hover:text-[var(--primary)] dark:hover:text-white"
                    >
                      {DEVELOPER_ATTRIBUTION.brandName}
                    </a>
                  </span>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] shrink-0 self-start sm:self-auto">
                Identificação PSI
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Botão de Salvar Alterações */}
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            size="lg"
            disabled={isSaving}
            className="gap-2 bg-[var(--button-bg,var(--primary))] hover:brightness-105 text-white"
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? "Salvando Alterações..." : "Salvar Alterações do Site"}</span>
          </Button>
        </div>
      </form>

      {/* Modal da Biblioteca de Ícones Compartilhada */}
      <IconPickerModal
        isOpen={iconPickerTarget !== null}
        onClose={() => setIconPickerTarget(null)}
        onSelect={handleSelectIconFromModal}
        currentIconKey={currentModalIconKey}
      />
    </div>
  );
}
