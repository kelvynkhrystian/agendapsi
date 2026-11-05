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
  formatFullAddress,
  getGoogleMapsDestinationUrl,
  getGoogleMapsEmbedSrc,
  buildWhatsAppChatUrl,
} from "@/lib/minisite-helpers";
import {
  Globe,
  Save,
  ExternalLink,
  ShieldCheck,
  FileText,
  Sparkles,
  MapPin,
  MessageCircle,
  Upload,
  Trash2,
  RotateCcw,
  Info,
  CheckCircle2,
  Compass,
} from "lucide-react";

export default function AdminMiniSitePage() {
  // Identidade Geral
  const [clinicName, setClinicName] = useState("");
  const [tagline, setTagline] = useState("");
  const [heroTitle, setHeroTitle] = useState("");
  const [heroSubtitle, setHeroSubtitle] = useState("");
  const [aboutText, setAboutText] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [instagram, setInstagram] = useState("");
  const [customHtml, setCustomHtml] = useState("");

  // Perfil Profissional
  const [professionalName, setProfessionalName] = useState("");
  const [professionalTitle, setProfessionalTitle] = useState("");
  const [crpCrm, setCrpCrm] = useState("");
  const [bio, setBio] = useState("");

  // Benefícios / Indicadores do Hero (Fase 4/5)
  const [benefits, setBenefits] = useState<HeroBenefitItem[]>(DEFAULT_HERO_BENEFITS);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [editingBenefitIndex, setEditingBenefitIndex] = useState<number | null>(null);
  const [uploadingIconIndex, setUploadingIconIndex] = useState<number | null>(null);

  // Localização do Consultório Físico (Fase 4/5)
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

  // Integração com WhatsApp (Fase 4/5)
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
    fetch("/api/site/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.site) {
          setClinicName(data.site.clinicName || "");
          setTagline(data.site.tagline || "");
          setHeroTitle(data.site.heroTitle || "");
          setHeroSubtitle(data.site.heroSubtitle || "");
          setAboutText(data.site.aboutText || "");
          setPhone(data.site.phone || "");
          setWhatsappNumber(data.site.whatsappNumber || "");
          setEmail(data.site.email || "");
          setInstagram(data.site.instagram || "");
          setCustomHtml(data.site.customHtml || "");

          // Localização
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

          // WhatsApp
          if (data.site.whatsappDefaultMessage) {
            setWhatsappDefaultMessage(data.site.whatsappDefaultMessage);
          }
          setShowFloatingWhatsApp(
            data.site.showFloatingWhatsApp !== undefined ? data.site.showFloatingWhatsApp : true
          );

          // Benefícios
          if (data.site.benefitsJson) {
            try {
              const parsed = JSON.parse(data.site.benefitsJson);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setBenefits(parsed);
              }
            } catch {}
          }
        }

        if (data.profile) {
          setProfessionalName(data.profile.fullName || "");
          setProfessionalTitle(data.profile.title || "");
          setCrpCrm(data.profile.crpCrm || "");
          setBio(data.profile.bio || "");
        }
        setIsLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setIsLoading(false);
      });
  }, []);

  // Upload de ícone customizado para um benefício
  const handleUploadCustomIcon = async (index: number, file: File) => {
    setUploadingIconIndex(index);
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

      setBenefits((prev) => {
        const next = [...prev];
        next[index] = {
          ...next[index],
          customIconUrl: data.url,
        };
        return next;
      });
    } catch {
      setError("Erro de rede ao enviar ícone.");
    } finally {
      setUploadingIconIndex(null);
    }
  };

  const handleRemoveCustomIcon = (index: number) => {
    setBenefits((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        customIconUrl: null,
      };
      return next;
    });
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
          phone,
          whatsappNumber,
          whatsappDefaultMessage,
          showFloatingWhatsApp,
          email,
          instagram,
          customHtml,
          benefits,
          professionalName,
          professionalTitle,
          crpCrm,
          bio,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erro ao salvar alterações.");
        setIsSaving(false);
        return;
      }

      setSaveMessage("Configurações do MiniSite atualizadas e publicadas com sucesso!");
      setIsSaving(false);
    } catch {
      setError("Erro de comunicação com o servidor.");
      setIsSaving(false);
    }
  };

  // Preview calculado de endereço e WhatsApp
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
  const embedSrcPreview = getGoogleMapsEmbedSrc(locationPreviewData);
  const whatsappChatUrlPreview = buildWhatsAppChatUrl(
    whatsappNumber,
    whatsappDefaultMessage,
    professionalName
  );

  if (isLoading) {
    return <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />;
  }

  return (
    <div className="space-y-6 max-w-5xl pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">MiniSite & Presença Pública</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Personalize a página inicial do consultório, diferenciais visuais, localização física e integração com WhatsApp.
          </p>
        </div>

        <Link href="/" target="_blank">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Visualizar MiniSite Público</span>
          </Button>
        </Link>
      </div>

      {saveMessage && <Alert variant="success">{saveMessage}</Alert>}
      {error && <Alert variant="destructive">{error}</Alert>}

      <form onSubmit={handleSave} className="space-y-6">
        {/* ================= 1. IDENTIDADE E TEXTOS PRINCIPAIS ================= */}
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4 text-teal-600" />
              <span>Identidade e Textos Principais</span>
            </CardTitle>
            <CardDescription>
              Configuração dos títulos, slogan e textos que aparecem no topo do MiniSite
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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

            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Apresentação Geral do Consultório (Sobre Mim)</label>
              <textarea
                rows={3}
                className="flex w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                value={aboutText}
                onChange={(e) => setAboutText(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* ================= 2. BENEFÍCIOS & ÍCONES DO HERO (FASE 4/5) ================= */}
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-teal-600" />
                <span>Ícones e Diferenciais do Hero</span>
                <Badge variant="outline" className="text-[10px] bg-teal-500/10 text-teal-600 border-teal-500/20">
                  Fase 4: Ícones Temáticos
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Configure os 3 indicadores de benefícios exibidos logo abaixo dos botões de agendamento no topo do MiniSite. Os ícones da biblioteca herdam automaticamente as cores do tema ativo em Aparência.
              </CardDescription>
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
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {benefits.map((item, index) => (
                <div
                  key={item.id || index}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                        Diferencial #{index + 1}
                      </span>
                      <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.isVisible}
                          onChange={(e) => handleUpdateBenefit(index, { isVisible: e.target.checked })}
                          className="rounded text-teal-600 focus:ring-teal-500"
                        />
                        <span>Visível</span>
                      </label>
                    </div>

                    {/* Prévia do Ícone Atual */}
                    <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-center space-y-2 shadow-xs">
                      <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                        <ThemeIcon
                          iconName={item.icon}
                          customIconUrl={item.customIconUrl}
                          className="h-6 w-6 text-teal-600 dark:text-teal-400"
                          alt={item.title}
                        />
                      </div>
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        {item.customIconUrl ? "Ícone Customizado (Upload)" : `Ícone: ${item.icon}`}
                      </span>
                    </div>

                    {/* Ações de Ícone */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingBenefitIndex(index);
                          setIconPickerOpen(true);
                        }}
                        className="text-[11px] gap-1 px-2"
                      >
                        <Compass className="h-3.5 w-3.5 text-teal-600" />
                        <span>Biblioteca</span>
                      </Button>

                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept=".png,.svg"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              handleUploadCustomIcon(index, e.target.files[0]);
                            }
                          }}
                        />
                        <div className="h-8 px-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-[11px] font-medium flex items-center justify-center gap-1 text-slate-700 dark:text-slate-300 transition-colors">
                          <Upload className="h-3.5 w-3.5 text-teal-600" />
                          <span>{uploadingIconIndex === index ? "Enviando..." : "Upload"}</span>
                        </div>
                      </label>
                    </div>

                    {item.customIconUrl && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomIcon(index)}
                        className="text-[10px] text-red-500 hover:underline flex items-center justify-center gap-1 w-full"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Remover upload e voltar para biblioteca</span>
                      </button>
                    )}

                    {/* Título & Subtítulo */}
                    <div className="space-y-2 pt-2">
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
          </CardContent>
        </Card>

        {/* ================= 3. LOCALIZAÇÃO DO CONSULTÓRIO & GOOGLE MAPS (FASE 4/5) ================= */}
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4 text-teal-600" />
                <span>Localização do Consultório & Google Maps</span>
                <Badge variant="outline" className="text-[10px] bg-teal-500/10 text-teal-600 border-teal-500/20">
                  Fase 4: Mapas & Endereço
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Configure o endereço do atendimento presencial e integre o mapa interativo com o botão &quot;Como chegar&quot;.
              </CardDescription>
            </div>

            <label className="flex items-center gap-2 cursor-pointer self-start sm:self-auto bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <input
                type="checkbox"
                checked={showLocation}
                onChange={(e) => setShowLocation(e.target.checked)}
                className="rounded text-teal-600 focus:ring-teal-500"
              />
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Exibir seção no MiniSite
              </span>
            </label>
          </CardHeader>

          <CardContent className="pt-6 space-y-5">
            {!showLocation && (
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Atenção:</strong> A seção de localização física e o link no menu estão desativados no MiniSite público. Ideal para profissionais com atuação 100% online por teleconsulta.
                </span>
              </div>
            )}

            {/* Campos Detalhados de Endereço */}
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
              <div>
                <Input
                  label="Complemento"
                  value={addressComplement}
                  onChange={(e) => setAddressComplement(e.target.value)}
                  placeholder="Ex: Sala 42, 4º andar"
                />
              </div>

              <div>
                <Input
                  label="Bairro"
                  value={addressNeighborhood}
                  onChange={(e) => setAddressNeighborhood(e.target.value)}
                  placeholder="Ex: Bela Vista"
                />
              </div>

              <div>
                <Input
                  label="CEP"
                  value={addressPostalCode}
                  onChange={(e) => setAddressPostalCode(e.target.value)}
                  placeholder="Ex: 01310-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Cidade"
                  value={addressCity}
                  onChange={(e) => setAddressCity(e.target.value)}
                  placeholder="Ex: São Paulo"
                />
              </div>

              <div>
                <Input
                  label="Estado (UF)"
                  value={addressState}
                  onChange={(e) => setAddressState(e.target.value)}
                  placeholder="Ex: SP"
                  maxLength={2}
                />
              </div>
            </div>

            {/* Integração com Google Maps */}
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

              {/* Prévia do Endereço e Ação */}
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
                        className="text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 font-semibold"
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
          </CardContent>
        </Card>

        {/* ================= 4. INTEGRAÇÃO COM WHATSAPP (FASE 4/5) ================= */}
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-emerald-600" />
                <span>Integração com WhatsApp</span>
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                  Fase 4: Ações de Contato
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Configure o canal de WhatsApp que alimenta os botões de ação do Hero, rodapé e o botão flutuante.
              </CardDescription>
            </div>

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
          </CardHeader>

          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Número de WhatsApp do Consultório (com DDD) *"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="Ex: 5511999999999"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Insira apenas números. O código DDI 55 será ajustado automaticamente.
                </p>
              </div>

              <div>
                <Input
                  label="Telefone Fixo / Comercial Adicional"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 3333-3333"
                />
              </div>
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
                Esta mensagem aparecerá pré-preenchida no WhatsApp do paciente quando ele clicar para falar com o consultório. Não inclui dados clínicos sigilosos.
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
          </CardContent>
        </Card>

        {/* ================= 5. PERFIL PROFISSIONAL RESPONSÁVEL ================= */}
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-base">Perfil do Profissional Responsável</CardTitle>
            <CardDescription>
              Dados exibidos no crachá superior do Hero e na assinatura do rodapé
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Nome Completo *"
                value={professionalName}
                onChange={(e) => setProfessionalName(e.target.value)}
                required
              />
              <Input
                label="Título / Especialidade"
                value={professionalTitle}
                onChange={(e) => setProfessionalTitle(e.target.value)}
              />
              <Input
                label="Registro (CRP / CRM)"
                value={crpCrm}
                onChange={(e) => setCrpCrm(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Biografia / Abordagem Terapêutica</label>
              <textarea
                rows={3}
                className="flex w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* ================= 6. REDES SOCIAIS E OUTROS CONTATOS ================= */}
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-base">Redes Sociais & Canais de Apoio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="E-mail de Contato Público"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contato@consultorio.com.br"
              />
              <Input
                label="Instagram (@seuperfil)"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="@dra.helenamartins"
              />
            </div>
          </CardContent>
        </Card>

        {/* ================= 7. HTML CUSTOMIZADO SANITIZADO ================= */}
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-base">Bloco HTML Personalizado (Opcional)</CardTitle>
            <CardDescription>
              Insira avisos, selos ou texto adicional (scripts são sanitizados automaticamente pelo servidor)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <textarea
              rows={3}
              className="font-mono text-xs flex w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
              placeholder="<p>Informações complementares sobre convênios...</p>"
              value={customHtml}
              onChange={(e) => setCustomHtml(e.target.value)}
            />
          </CardContent>
        </Card>

        {/* Botão de Salvar Alterações */}
        <div className="flex justify-end pt-2">
          <Button type="submit" size="lg" disabled={isSaving} className="gap-2 bg-teal-600 hover:bg-teal-700 text-white">
            <Save className="h-4 w-4" />
            <span>{isSaving ? "Salvando Alterações..." : "Salvar Alterações do MiniSite"}</span>
          </Button>
        </div>
      </form>

      {/* Modal da Biblioteca de Ícones */}
      <IconPickerModal
        isOpen={iconPickerOpen}
        onClose={() => {
          setIconPickerOpen(false);
          setEditingBenefitIndex(null);
        }}
        onSelect={(iconKey) => {
          if (editingBenefitIndex !== null) {
            handleUpdateBenefit(editingBenefitIndex, {
              icon: iconKey,
              customIconUrl: null, // volta para ícone nativo da biblioteca
            });
          }
        }}
        currentIconKey={
          editingBenefitIndex !== null ? benefits[editingBenefitIndex]?.icon : undefined
        }
      />
    </div>
  );
}
