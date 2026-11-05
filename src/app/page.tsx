import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { formatBRL } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MiniSiteMediaPlayer } from "@/components/minisite/media-player";
import { MiniSiteHeader } from "@/components/minisite/header";
import { MiniSiteFloatingControls } from "@/components/minisite/floating-controls";
import { ThemeIcon } from "@/components/minisite/theme-icon";
import { DEFAULT_HERO_BENEFITS, HeroBenefitItem } from "@/lib/minisite-icons";
import { detectExistingFrames } from "@/lib/minisite-media";
import {
  formatFullAddress,
  getGoogleMapsDestinationUrl,
  getGoogleMapsEmbedSrc,
  buildWhatsAppChatUrl,
} from "@/lib/minisite-helpers";
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  Mail,
  ShieldCheck,
  ArrowRight,
  Heart,
  Video,
  Sparkles,
  Brain,
  Flower2,
  ChevronRight,
  Target,
  HeartHandshake,
  ClipboardCheck,
  CheckCircle2,
  Compass,
  MessageCircle,
  ExternalLink,
  Lock,
  User,
  Star,
} from "lucide-react";

export default async function HomePage() {
  const [site, profile, services, session] = await Promise.all([
    prisma.siteSettings.findUnique({ where: { id: "default" } }),
    prisma.professionalProfile.findUnique({ where: { id: "default" } }),
    prisma.service.findMany({
      where: { isActive: true },
      orderBy: { priceCents: "asc" },
    }),
    getSession(),
  ]);

  const currentUser = session
    ? {
        name: session.name,
        role: session.role,
      }
    : null;

  const clinicName = site?.clinicName || "Consultório de Psicologia & Psiquiatria";
  const professionalName = profile?.fullName || "Dra. Helena Martins";
  const professionalTitle = profile?.title || "PSICÓLOGA CLÍNICA";
  const crpCrm = profile?.crpCrm || "CRP 06/184920";
  const heroSubtitle =
    site?.heroSubtitle ||
    "Acolhimento, escuta e cuidado para sua saúde emocional.";
  const aboutText =
    profile?.bio ||
    site?.aboutText ||
    "Sou psicóloga clínica, com mais de 10 anos de experiência, dedicada ao cuidado da saúde mental, ao autoconhecimento e à promoção de uma vida com mais equilíbrio.";

  // Frames da Animação do MiniSite (Fase 3/5 & Suporte a Mídias Reais)
  let heroFrames: string[] = [];
  if (site?.heroFramesJson) {
    try {
      heroFrames = JSON.parse(site.heroFramesJson);
    } catch {}
  }
  let heroMediaType = site?.heroMediaType || (profile?.avatarUrl ? "IMAGE" : "IMAGE");
  let heroMediaUrl = site?.heroMediaUrl || profile?.avatarUrl;
  let heroPosterUrl = site?.heroPosterUrl;

  // Fallback inteligente: se não configurado explicitamente ou sem frames, busca mídias em storage/minisite/top
  if (heroFrames.length === 0 && (!site?.heroMediaUrl || site?.heroMediaType === "FRAME_ANIMATION")) {
    const detectedHero = await detectExistingFrames("hero");
    if (detectedHero && detectedHero.frames.length > 0) {
      heroFrames = detectedHero.frames;
      heroMediaType = "FRAME_ANIMATION";
      heroMediaUrl = heroMediaUrl || detectedHero.frames[0];
      heroPosterUrl = heroPosterUrl || detectedHero.posterUrl;
    }
  }

  let aboutFrames: string[] = [];
  if (site?.aboutFramesJson) {
    try {
      aboutFrames = JSON.parse(site.aboutFramesJson);
    } catch {}
  }
  let aboutMediaType = site?.aboutMediaType || "IMAGE";
  let aboutMediaUrl = site?.aboutMediaUrl;
  let aboutPosterUrl = site?.aboutPosterUrl;

  // Fallback inteligente: se não configurado explicitamente ou sem frames, busca mídias em storage/minisite/sobre
  if (aboutFrames.length === 0 && (!site?.aboutMediaUrl || site?.aboutMediaType === "FRAME_ANIMATION")) {
    const detectedAbout = await detectExistingFrames("about");
    if (detectedAbout && detectedAbout.frames.length > 0) {
      aboutFrames = detectedAbout.frames;
      aboutMediaType = "FRAME_ANIMATION";
      aboutMediaUrl = aboutMediaUrl || detectedAbout.frames[0];
      aboutPosterUrl = aboutPosterUrl || detectedAbout.posterUrl;
    }
  }

  // Indicadores de Benefício do Hero (Fase 4/5)
  let benefits: HeroBenefitItem[] = DEFAULT_HERO_BENEFITS;
  if (site?.benefitsJson) {
    try {
      const parsed = JSON.parse(site.benefitsJson);
      if (Array.isArray(parsed) && parsed.length > 0) {
        benefits = parsed;
      }
    } catch {}
  }
  const activeBenefits = benefits
    .filter((b) => b.isVisible !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  // WhatsApp Inteligente com Mensagem Customizável (Fase 4/5 & Floating Controls)
  const defaultWhatsAppMsg =
    "Olá! Conheci seu trabalho pelo site e gostaria de saber mais sobre os atendimentos e como agendar uma consulta.";
  const whatsappUrl = buildWhatsAppChatUrl(
    site?.whatsappNumber || site?.phone,
    site?.whatsappDefaultMessage || defaultWhatsAppMsg,
    professionalName
  );

  const instagramHandle = site?.instagram ? site.instagram.replace(/^@/, "") : null;
  const instagramUrl = instagramHandle ? `https://instagram.com/${instagramHandle}` : null;

  // Localização do Consultório & Google Maps Seguro (Fase 4/5)
  const formattedAddress = formatFullAddress(site);
  const mapsDestinationUrl = getGoogleMapsDestinationUrl(site);
  const mapsEmbedSrc = getGoogleMapsEmbedSrc(site);
  const shouldShowLocation = site?.showLocation !== false && !!(formattedAddress || mapsDestinationUrl);

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFCFB] text-slate-900 selection:bg-[var(--primary)] selection:text-white font-sans overflow-x-hidden">
      {/* ================= TOP NAVIGATION (DESKTOP & MOBILE STICKY HEADER) ================= */}
      <MiniSiteHeader
        logoHorizontalUrl={site?.logoHorizontalUrl}
        logoUrl={site?.logoUrl}
        clinicName={clinicName}
        professionalName={professionalName}
        shouldShowLocation={shouldShowLocation}
        currentUser={currentUser}
      />

      {/* ================= 1. HERO SECTION (Referência Visual) ================= */}
      <section
        id="inicio"
        className="relative pt-8 pb-16 px-4 overflow-hidden bg-gradient-to-b from-[#F9F6F0] via-[#FAF7F2] to-[#FDFCFB] scroll-mt-20"
      >
        {/* Padrão orgânico ondulado de fundo (Curvas suaves) */}
        <div className="absolute inset-0 pointer-events-none opacity-30 overflow-hidden">
          <svg
            className="w-full h-full text-[var(--primary)]"
            viewBox="0 0 1000 1000"
            preserveAspectRatio="none"
            fill="none"
          >
            <path
              d="M0,100 C150,200 350,0 500,100 C650,200 850,50 1000,150 L1000,0 L0,0 Z"
              fill="currentColor"
              fillOpacity="0.04"
            />
            <path
              d="M0,400 C200,300 400,500 600,400 C800,300 900,450 1000,400 L1000,0 L0,0 Z"
              fill="currentColor"
              fillOpacity="0.03"
            />
            <path
              d="M0,800 C300,750 500,900 700,800 C900,700 950,850 1000,800 L1000,0 L0,0 Z"
              fill="currentColor"
              fillOpacity="0.02"
            />
          </svg>
        </div>

        <div className="max-w-3xl mx-auto relative z-10 flex flex-col items-center text-center space-y-6">
          {/* Badge CRP / CRM Superior */}
          <div className="inline-block px-5 py-1.5 rounded-full bg-[var(--button-bg,var(--primary))] text-white font-bold text-xs uppercase tracking-widest shadow-xs">
            {crpCrm}
          </div>

          {/* MEDIA SLOT 1: Retrato Profissional / Foto Principal */}
          <div className="relative my-2">
            {/* Decoração Orgânica de Ramos / Folhagem ao Fundo */}
            <div className="absolute -inset-6 -z-10 flex items-center justify-center opacity-25 text-[var(--primary)] pointer-events-none">
              <svg width="340" height="340" viewBox="0 0 200 200" fill="none">
                <path
                  d="M100 20 C110 50, 150 60, 160 100 C170 140, 130 170, 100 180 C70 170, 30 140, 40 100 C50 60, 90 50, 100 20 Z"
                  fill="currentColor"
                  fillOpacity="0.15"
                />
                <circle cx="100" cy="100" r="75" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
                {/* Ramos e Folhas Estilizadas */}
                <path
                  d="M50 100 C40 80, 50 50, 70 40 C60 60, 65 80, 50 100 Z"
                  fill="currentColor"
                  fillOpacity="0.4"
                />
                <path
                  d="M150 100 C160 80, 150 50, 130 40 C140 60, 135 80, 150 100 Z"
                  fill="currentColor"
                  fillOpacity="0.4"
                />
              </svg>
            </div>

            {/* Container Responsivo de Mídia (Slot 1: Herói - Compatível com Imagens, ZIP Frames e Vídeos) */}
            <div className="w-56 h-64 sm:w-64 sm:h-72 rounded-full p-2 bg-gradient-to-b from-white to-[var(--primary)]/15 border-2 border-[var(--primary)]/25 shadow-md flex items-center justify-center overflow-hidden">
              <MiniSiteMediaPlayer
                slot="hero"
                mediaType={heroMediaType}
                mediaUrl={heroMediaUrl}
                posterUrl={heroPosterUrl}
                frames={heroFrames}
                fps={site?.heroFps ?? 24}
                loop={site?.heroLoop ?? true}
                autoplay={site?.heroAutoplay ?? true}
                playbackMode={site?.heroPlaybackMode || "AUTOMATIC"}
                playbackDirection={site?.heroPlaybackDirection || "FORWARD"}
                positioning={site?.heroPositioning || "center"}
                altText={professionalName}
                className="rounded-full"
              />
            </div>
          </div>

          {/* Nome e Especialidade com Tipografia Elegante */}
          <div className="space-y-1.5 pt-2">
            <h1
              className="text-3xl sm:text-5xl font-serif italic text-[var(--primary)] font-medium tracking-tight drop-shadow-2xs"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              {professionalName}
            </h1>
            <p className="text-xs sm:text-sm font-extrabold tracking-[0.25em] text-slate-800 uppercase">
              {professionalTitle}
            </p>
          </div>

          {/* Subtítulo / Frase de Acolhimento */}
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            {heroSubtitle}
          </p>

          {/* Botões de Ação Hero */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-sm pt-2">
            <Link href="/agendar" className="w-full">
              <button
                type="button"
                className="w-full py-3.5 px-6 rounded-2xl font-bold text-xs uppercase tracking-wider text-white shadow-md hover:opacity-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                style={{ backgroundColor: site?.buttonColor || "var(--primary)" }}
              >
                <Calendar className="h-4 w-4" />
                <span>Agende sua consulta</span>
              </button>
            </Link>

            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-6 rounded-2xl font-semibold text-xs text-white bg-[#261E19] hover:bg-[#1A1410] shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageCircle className="h-4 w-4 text-emerald-400" />
                <span>Chamar no WhatsApp</span>
              </a>
            )}
          </div>

          {/* Indicadores de Benefício Configuráveis (Fase 4/5) */}
          {activeBenefits.length > 0 && (
            <div
              className={`grid gap-2 sm:gap-6 pt-6 w-full max-w-lg border-t border-slate-200/60 mt-4 ${
                activeBenefits.length === 1
                  ? "grid-cols-1 max-w-xs"
                  : activeBenefits.length === 2
                  ? "grid-cols-2 max-w-sm"
                  : "grid-cols-3"
              }`}
            >
              {activeBenefits.map((item) => (
                <div key={item.id} className="flex flex-col items-center text-center space-y-1.5 p-2">
                  <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center transition-colors shadow-2xs">
                    <ThemeIcon
                      iconName={item.icon}
                      customIconUrl={item.customIconUrl}
                      className="h-5 w-5 text-[var(--primary)]"
                      alt={item.title}
                    />
                  </div>
                  <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-tight text-slate-800 leading-tight">
                    {item.title}
                  </span>
                  {item.subtitle && (
                    <span className="text-[9px] sm:text-[10px] text-slate-500 font-normal leading-tight line-clamp-2">
                      {item.subtitle}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Divisor Ondulado Orgânico 1 */}
      <div className="w-full overflow-hidden leading-none text-[#FAF7F2] -mt-1">
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-8 text-[#FAF7F2] fill-current">
          <path d="M0,0 C300,90 900,-30 1200,60 L1200,120 L0,120 Z" />
        </svg>
      </div>

      {/* ================= 2. PRINCIPAIS DEMANDAS & ATENDIMENTOS ================= */}
      <section id="atendimentos" className="py-16 px-4 bg-white scroll-mt-20">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--primary)]">
              — Atendimentos —
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Principais Demandas
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
              Acompanhamento psicológico para diferentes momentos e desafios da vida.
            </p>
          </div>

          {/* Cards de Demandas e Serviços Reais do PSI */}
          <div className="space-y-3">
            {services.map((service, index) => {
              // Ícones temáticos para cada serviço com base na modalidade ou posição
              const icons = [Brain, Heart, Compass, Sparkles, User];
              const IconComponent = icons[index % icons.length];

              return (
                <Link
                  key={service.id}
                  href={`/agendar?serviceId=${service.id}`}
                  className="block group"
                >
                  <div className="p-4 rounded-2xl bg-[#FCFAF6] border border-slate-200/80 hover:border-[var(--primary)] hover:shadow-md transition-all flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-[var(--primary)] transition-colors truncate">
                            {service.name}
                          </h3>
                        </div>
                        <p className="text-[11px] sm:text-xs text-slate-500 line-clamp-1 mt-0.5">
                          {service.description || "Atendimento psicológico clínico personalizado e humanizado."}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400 font-medium">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {service.durationMinutes} min
                          </span>
                          <span>•</span>
                          <span>
                            {service.modality === "ONLINE"
                              ? "Teleconsulta"
                              : service.modality === "PRESENTIAL"
                              ? "Presencial"
                              : "Presencial & Online"}
                          </span>
                          <span>•</span>
                          <span className="font-bold text-[var(--primary)]">
                            {service.isFree ? "Gratuito" : formatBRL(service.priceCents)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-[var(--primary)] group-hover:border-[var(--primary)] shrink-0 transition-colors">
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="text-center pt-2">
            <Link href="/agendar">
              <span className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20 text-[var(--primary)] font-bold text-xs transition-colors cursor-pointer">
                <span>Ver todas as demandas & agendar</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ================= 3. SOBRE MIM (Referência Visual) ================= */}
      <section id="sobre" className="py-16 px-4 bg-[#F8F5EE] border-y border-slate-200/60 scroll-mt-20">
        <div className="max-w-4xl mx-auto">
          <div className="p-6 sm:p-10 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center gap-8">
            {/* MEDIA SLOT 2: Ambiente do Consultório / Segundo Retrato Independente */}
            <div className="w-full md:w-5/12 shrink-0">
              <div className="w-full aspect-4/3 rounded-2xl border border-slate-200 overflow-hidden relative shadow-inner bg-gradient-to-tr from-[#EBE3D5] to-[#F5EFEB]">
                <MiniSiteMediaPlayer
                  slot="about"
                  mediaType={aboutMediaType}
                  mediaUrl={aboutMediaUrl}
                  posterUrl={aboutPosterUrl}
                  frames={aboutFrames}
                  fps={site?.aboutFps ?? 24}
                  loop={site?.aboutLoop ?? true}
                  autoplay={site?.aboutAutoplay ?? true}
                  playbackMode={site?.aboutPlaybackMode || "AUTOMATIC"}
                  playbackDirection={site?.aboutPlaybackDirection || "FORWARD"}
                  positioning={site?.aboutPositioning || "center"}
                  altText="Consultório e Espaço Terapêutico"
                  className="rounded-2xl"
                />
              </div>
            </div>

            {/* Conteúdo Biográfico */}
            <div className="w-full md:w-7/12 space-y-4">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--primary)]">
                  Trajetória Profissional
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Sobre Mim
                </h2>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {aboutText}
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <Link href="/agendar">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--primary)] hover:underline">
                    <span>Conheça minha história & agende uma sessão</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 4. DIFERENCIAIS (Referência Visual) ================= */}
      <section id="diferenciais" className="py-16 px-4 bg-white scroll-mt-20">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--primary)]">
              — Diferenciais —
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Por que escolher meu atendimento?
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Card 1 */}
            <div className="p-5 rounded-2xl bg-[#FCFAF6] border border-slate-200/80 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
                <Heart className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                  Escuta Ativa e Acolhedora
                </h4>
                <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed">
                  Espaço ético, seguro e livre de julgamentos, centrado na sua singularidade e no seu tempo.
                </p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="p-5 rounded-2xl bg-[#FCFAF6] border border-slate-200/80 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
                <Target className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                  Plano Terapêutico Personalizado
                </h4>
                <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed">
                  Intervenções e metodologias baseadas em evidências científicas, alinhadas aos seus objetivos.
                </p>
              </div>
            </div>

            {/* Card 3 */}
            <div className="p-5 rounded-2xl bg-[#FCFAF6] border border-slate-200/80 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                  Horários Flexíveis
                </h4>
                <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed">
                  Grade de atendimento com ampla disponibilidade para harmonizar a terapia à sua rotina diária.
                </p>
              </div>
            </div>

            {/* Card 4 */}
            <div className="p-5 rounded-2xl bg-[#FCFAF6] border border-slate-200/80 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
                <Video className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                  Atendimento Presencial e Online
                </h4>
                <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed">
                  Flexibilidade para consultar no consultório físico ou por teleconsulta criptografada de onde estiver.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 5. COMO FUNCIONA (Referência Visual) ================= */}
      <section id="como-funciona" className="py-16 px-4 bg-[#F8F5EE] scroll-mt-20">
        <div className="max-w-3xl mx-auto">
          <div className="p-6 sm:p-10 rounded-3xl bg-white border border-slate-200/80 space-y-8 shadow-xs">
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
                Como Funciona?
              </h2>
              <p className="text-xs text-slate-500">
                Três etapas simples para dar início ao seu acompanhamento
              </p>
            </div>

            {/* 3 Passos Conectados */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
              {/* Passo 1 */}
              <div className="flex flex-col items-center text-center space-y-2.5 p-3">
                <div className="w-12 h-12 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center font-bold">
                  <Calendar className="h-6 w-6" />
                </div>
                <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                  1. Agende sua consulta
                </h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Escolha o horário e modalidade ideal diretamente pelo nosso sistema online.
                </p>
              </div>

              {/* Passo 2 */}
              <div className="flex flex-col items-center text-center space-y-2.5 p-3">
                <div className="w-12 h-12 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center font-bold">
                  <ClipboardCheck className="h-6 w-6" />
                </div>
                <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                  2. Realize sua avaliação inicial
                </h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Primeiro encontro para compreender suas necessidades e alinhar o plano terapêutico.
                </p>
              </div>

              {/* Passo 3 */}
              <div className="flex flex-col items-center text-center space-y-2.5 p-3">
                <div className="w-12 h-12 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center font-bold">
                  <HeartHandshake className="h-6 w-6" />
                </div>
                <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                  3. Inicie seu acompanhamento
                </h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Sessões contínuas dedicadas ao autoconhecimento, regulação emocional e bem-estar.
                </p>
              </div>
            </div>

            <div className="text-center pt-2">
              <Link href="/agendar">
                <Button size="lg" className="text-xs px-8 py-3 rounded-2xl font-bold shadow-xs">
                  <span>Iniciar Agendamento Online</span>
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 6. DEPOIMENTOS (Referência Visual & Ética) ================= */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-2xl mx-auto space-y-6 text-center">
          <div className="space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--primary)]">
              — Depoimentos —
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              O que meus pacientes dizem
            </h2>
          </div>

          {/* Card de Depoimento Autorizado & Conformidade Ética CFP */}
          <div className="p-6 sm:p-8 rounded-3xl bg-[#FCFAF6] border border-slate-200/80 shadow-xs space-y-4 text-left">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[var(--primary)]/15 text-[var(--primary)] font-bold flex items-center justify-center text-base shrink-0">
                A
              </div>
              <div className="space-y-1 flex-1">
                <p className="text-xs sm:text-sm text-slate-700 italic leading-relaxed">
                  &quot;O processo terapêutico tem sido transformador. A escuta atenciosa e as orientações práticas me ajudaram a lidar com a ansiedade e a retomar a clareza nas decisões da minha vida.&quot;
                </p>
                <div className="flex items-center justify-between pt-2">
                  <span className="font-bold text-xs text-[var(--primary)]">
                    Ana R. (Paciente em Acompanhamento)
                  </span>
                  <div className="flex items-center text-amber-400 gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-current" />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200/60 pt-3 text-[10px] text-slate-400 flex items-center gap-1.5">
              <Lock className="h-3 w-3 shrink-0" />
              <span>
                Depoimento publicado sob consentimento livre e esclarecido, em conformidade com o Código de Ética Profissional (CFP).
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 7. LOCALIZAÇÃO DO CONSULTÓRIO (Fase 4/5: Opcional e Configurável) ================= */}
      {shouldShowLocation && (
        <section id="localizacao" className="py-16 px-4 bg-[#F8F5EE] border-t border-slate-200/60 scroll-mt-20">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--primary)]">
                — Atendimento Presencial —
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                Localização do Consultório
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                Ambiente preparado com isolamento acústico, total privacidade e acessibilidade.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
              {/* Informações de Endereço e Contato */}
              <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                        Endereço Oficial
                      </h4>
                      <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                        {formattedAddress || site?.address || "Endereço sob consulta prévia para agendamentos presenciais."}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
                      <Phone className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                        Telefone & WhatsApp
                      </h4>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {site?.phone || site?.whatsappNumber || "(11) 99999-9999"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                        E-mail Institucional
                      </h4>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {site?.email || "contato@consultorio.com.br"}
                      </p>
                    </div>
                  </div>
                </div>

                {mapsDestinationUrl && (
                  <a
                    href={mapsDestinationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Como Chegar via Google Maps</span>
                  </a>
                )}
              </div>

              {/* Container de Mapa Interativo (Embed Seguro ou Card Informativo) */}
              <div className="p-2 sm:p-3 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col items-center justify-center text-center overflow-hidden min-h-[280px]">
                {mapsEmbedSrc ? (
                  <iframe
                    src={mapsEmbedSrc}
                    width="100%"
                    height="100%"
                    className="w-full h-full min-h-[260px] rounded-2xl border-0"
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                    title={`Mapa de localização - ${clinicName}`}
                  />
                ) : (
                  <div className="p-6 flex flex-col items-center justify-center text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
                      <MapPin className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-xs sm:text-sm text-slate-800">
                        Mapa Interativo do Consultório
                      </h4>
                      <p className="text-[11px] text-slate-500 max-w-xs">
                        Próximo a transporte público, pontos de referência e fácil acesso.
                      </p>
                    </div>
                    {mapsDestinationUrl && (
                      <a
                        href={mapsDestinationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-[var(--primary)] hover:underline inline-flex items-center gap-1"
                      >
                        <span>Abrir visualização no Google Maps</span>
                        <ArrowRight className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ================= 8. FINAL CTA (Referência Visual: Banner Destaque) ================= */}
      <section className="py-12 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <div
            className="p-6 sm:p-8 rounded-3xl text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-6"
            style={{ backgroundColor: site?.buttonColor || "var(--primary)" }}
          >
            <div className="flex items-center gap-4 text-center sm:text-left">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight">
                  Agende sua consulta agora
                </h3>
                <p className="text-xs sm:text-sm text-white/90">
                  Dê o primeiro passo para o seu bem-estar emocional.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
              <Link href="/agendar" className="shrink-0 w-full sm:w-auto">
                <button
                  type="button"
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-white text-slate-900 font-bold text-xs uppercase tracking-wider shadow-md hover:bg-slate-50 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Agendar Consulta</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </Link>

              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-[#261E19]/80 hover:bg-[#261E19] text-white font-semibold text-xs tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <MessageCircle className="h-4 w-4 text-emerald-400" />
                  <span>WhatsApp</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ================= 9. FOOTER & NAVEGAÇÃO INFERIOR ================= */}
      <footer id="contato" className="border-t border-slate-200 bg-[#F8F5EE] py-12 px-4 text-xs text-slate-600">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Barra de Navegação Inferior (Referência Visual do Rodapé) */}
          <div className="flex flex-wrap justify-center items-center gap-3 py-4 border-b border-slate-200/80 text-center font-semibold text-xs text-slate-700">
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 p-2 rounded-xl hover:bg-white transition-colors"
              >
                <MessageCircle className="h-4 w-4 text-[var(--primary)]" />
                <span>WhatsApp</span>
              </a>
            )}
            {shouldShowLocation && (
              <a
                href="#localizacao"
                className="flex items-center justify-center gap-1.5 p-2 rounded-xl hover:bg-white transition-colors"
              >
                <MapPin className="h-4 w-4 text-[var(--primary)]" />
                <span>Localização</span>
              </a>
            )}
            <a
              href="#contato"
              className="flex items-center justify-center gap-1.5 p-2 rounded-xl hover:bg-white transition-colors"
            >
              <Mail className="h-4 w-4 text-[var(--primary)]" />
              <span>Contato</span>
            </a>
            {instagramUrl && (
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 p-2 rounded-xl hover:bg-white transition-colors"
              >
                <svg
                  className="h-4 w-4 text-[var(--primary)]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                </svg>
                <span>Instagram</span>
              </a>
            )}
          </div>

          {/* Dados do Consultório e Ética */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left text-slate-500">
            <div className="space-y-1">
              <p className="font-bold text-slate-800 text-sm">{clinicName}</p>
              <p className="text-[11px]">
                {professionalName} • {crpCrm}
              </p>
              <p className="text-[10px] text-slate-400">
                Atendimento clínico respaldado pelos preceitos éticos do Conselho Federal de Psicologia.
              </p>
            </div>

            <div className="flex flex-wrap justify-center sm:justify-end gap-4 text-xs">
              <Link href="/privacidade" className="hover:text-[var(--primary)] hover:underline">
                Privacidade
              </Link>
              <Link href="/termos" className="hover:text-[var(--primary)] hover:underline">
                Termos
              </Link>
              <Link href="/cookies" className="hover:text-[var(--primary)] hover:underline">
                Cookies
              </Link>
              <Link href="/lgpd" className="hover:text-[var(--primary)] hover:underline">
                LGPD
              </Link>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200/60 text-center text-[10px] text-slate-400">
            &copy; {new Date().getFullYear()} {clinicName}. Todos os direitos reservados. Software de Gestão Clínica PSI — Instalação Standalone Dedicada.
          </div>
        </div>
      </footer>

      {/* ================= CONTROLES FLUTUANTES (WHATSAPP + VOLTAR AO TOPO) ================= */}
      <MiniSiteFloatingControls
        whatsappUrl={whatsappUrl}
        showFloatingWhatsApp={Boolean(site?.showFloatingWhatsApp !== false && whatsappUrl)}
      />
    </div>
  );
}
