"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Globe, Save, ExternalLink, ShieldCheck, FileText } from "lucide-react";

export default function AdminMiniSitePage() {
  const [clinicName, setClinicName] = useState("");
  const [tagline, setTagline] = useState("");
  const [heroTitle, setHeroTitle] = useState("");
  const [heroSubtitle, setHeroSubtitle] = useState("");
  const [aboutText, setAboutText] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [email, setEmail] = useState("");
  const [instagram, setInstagram] = useState("");
  const [customHtml, setCustomHtml] = useState("");

  // Perfil Profissional
  const [professionalName, setProfessionalName] = useState("");
  const [professionalTitle, setProfessionalTitle] = useState("");
  const [crpCrm, setCrpCrm] = useState("");
  const [bio, setBio] = useState("");

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
          setAddress(data.site.address || "");
          setPhone(data.site.phone || "");
          setWhatsappNumber(data.site.whatsappNumber || "");
          setEmail(data.site.email || "");
          setInstagram(data.site.instagram || "");
          setCustomHtml(data.site.customHtml || "");
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
          phone,
          whatsappNumber,
          email,
          instagram,
          customHtml,
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

      setSaveMessage("Configurações do MiniSite atualizadas com sucesso!");
      setIsSaving(false);
    } catch {
      setError("Erro de comunicação com o servidor.");
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">MiniSite & Presença Pública</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Personalize a página inicial do consultório, textos do profissional e contatos.
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
        {/* Identidade do Consultório */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Identidade e Textos Principais</CardTitle>
            <CardDescription>
              Configuração visual da página inicial em / e /site
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
              <label className="block text-sm font-medium">Apresentação Geral do Consultório</label>
              <textarea
                rows={3}
                className="flex w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                value={aboutText}
                onChange={(e) => setAboutText(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Perfil Profissional */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Perfil do Profissional Responsável</CardTitle>
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

        {/* Localização e Contatos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Endereço e Contatos Públicos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Endereço do Consultório Físico"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Telefone Comercial"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <Input
                label="WhatsApp (com DDD e 55)"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="5511999999999"
              />
              <Input
                label="E-mail de Contato Público"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input
                label="Instagram"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="@seuperfil"
              />
            </div>
          </CardContent>
        </Card>

        {/* Custom HTML Sanitizado */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bloco HTML Personalizado (Opcional)</CardTitle>
            <CardDescription>
              Insira selos, avisos de convênios ou mapas em HTML estático (scripts são sanitizados automaticamente)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <textarea
              rows={3}
              className="font-mono text-xs flex w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
              placeholder="<p>Texto personalizado com formatação...</p>"
              value={customHtml}
              onChange={(e) => setCustomHtml(e.target.value)}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" size="lg" isLoading={isSaving} className="gap-2">
            <Save className="h-4 w-4" />
            <span>Salvar Alterações do MiniSite</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
