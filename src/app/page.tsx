export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { formatBRL } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { MiniSiteMediaPlayer } from "@/components/minisite/media-player";
import { MiniSiteHeader } from "@/components/minisite/header";
import { MiniSiteFloatingControls } from "@/components/minisite/floating-controls";
import { MiniSiteMotionController } from "@/components/minisite/motion-controller";
import { ThemeIcon } from "@/components/minisite/theme-icon";
import { HeroScrollIndicator } from "@/components/minisite/hero-scroll-indicator";
import { CookieBanner } from "@/components/cookie-consent/cookie-banner";
import { CookiePreferencesTrigger } from "@/components/cookie-consent/cookie-preferences-trigger";
import { DEFAULT_HERO_BENEFITS, HeroBenefitItem } from "@/lib/minisite-icons";
import { detectExistingFrames, getLocalMediaDimensions } from "@/lib/minisite-media";
import {
  formatFullAddress,
  getGoogleMapsDestinationUrl,
  getGoogleMapsEmbedSrc,
  buildWhatsAppChatUrl,
} from "@/lib/minisite-helpers";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
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
  CalendarDays,
  MessagesSquare,
  HandHeart,
  CheckCircle2,
  Compass,
  MessageCircle,
  ExternalLink,
  Lock,
  User,
  Star,
  Quote,
} from "lucide-react";

function hexToRgbTriplet(hex: string): string {
  const match = /^#([0-9A-Fa-f]{6})$/.exec(hex.trim());
  if (!match) return "250, 247, 242";
  const value = parseInt(match[1], 16);
  return `${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}`;
}

export default async function HomePage() {
  let site, profile, services, session, publishedLegalPages;
  try {
    [site, profile, services, session, publishedLegalPages] = await Promise.all([
      prisma.siteSettings.findUnique({ where: { id: "default" } }),
      prisma.professionalProfile.findUnique({ where: { id: "default" } }),
      prisma.service.findMany({
        where: { isActive: true },
        orderBy: { priceCents: "asc" },
      }),
      getSession(),
      prisma.legalPage.findMany({
        where: { isPublished: true },
        select: { id: true, title: true },
      }),
    ]);
  } catch (error: any) {
    console.error("[PSI Server Diagnostic] Falha ao consultar banco de dados:", error?.message || error);
    if (
      error?.name === "PrismaClientInitializationError" ||
      error?.code === "P1001" ||
      error?.message?.includes("Can't reach database server")
    ) {
      return (
        <main className="min-h-screen flex items-center justify-center p-6 bg-slate-50 text-slate-800">
          <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-rose-200 shadow-sm text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-xl">
              !
            </div>
            <h1 className="text-xl font-bold text-slate-900">Banco de Dados Indisponível</h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Não foi possível estabelecer conexão com o servidor de banco de dados MySQL local. Certifique-se de que o serviço MySQL (XAMPP) está iniciado na porta 3306.
            </p>
          </div>
        </main>
      );
    }
    throw error;
  }

  const publishedPageIds = new Set(publishedLegalPages.map((p) => p.id));

  const currentUser = session
    ? {
        name: session.name,
        role: session.role,
      }
    : null;

  const clinicName = site?.clinicName || "Consultório de Psicologia & Psiquiatria";
  const professionalName = profile?.displayName || profile?.fullName || "Dra. Helena Martins";
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

  const heroDimensionsSource =
    heroMediaType === "FRAME_ANIMATION" && heroFrames.length > 0
      ? heroPosterUrl && !/\.(mp4|webm|mov|avi)(\?|#|$)/i.test(heroPosterUrl)
        ? heroPosterUrl
        : heroFrames[0]
      : heroMediaUrl;
  const heroDimensions = await getLocalMediaDimensions(heroDimensionsSource);

  const hasAboutMedia =
    aboutMediaType === "FRAME_ANIMATION"
      ? aboutFrames.length > 0
      : Boolean(aboutMediaUrl);
  const aboutDimensionsSource = hasAboutMedia
    ? aboutMediaType === "FRAME_ANIMATION" && aboutFrames.length > 0
      ? aboutPosterUrl && !/\.(mp4|webm|mov|avi)(\?|#|$)/i.test(aboutPosterUrl)
        ? aboutPosterUrl
        : aboutFrames[0]
      : aboutMediaUrl
    : null;
  const aboutDimensions = hasAboutMedia
    ? await getLocalMediaDimensions(aboutDimensionsSource)
    : null;

  // Mídia independente do Hero Mobile (com fallback para o Hero Desktop quando vazia)
  let heroMobileFrames: string[] = [];
  if (site?.heroMobileFramesJson) {
    try {
      heroMobileFrames = JSON.parse(site.heroMobileFramesJson);
    } catch {}
  }
  const heroMobileMediaType = site?.heroMobileMediaType || "IMAGE";
  const heroMobileMediaUrl = site?.heroMobileMediaUrl || null;
  const heroMobilePosterUrl = site?.heroMobilePosterUrl || null;
  const hasMobileHeroMedia =
    heroMobileMediaType === "FRAME_ANIMATION"
      ? heroMobileFrames.length > 0
      : Boolean(heroMobileMediaUrl);

  const heroMobileDimensionsSource = hasMobileHeroMedia
    ? heroMobileMediaType === "FRAME_ANIMATION" && heroMobileFrames.length > 0
      ? heroMobilePosterUrl && !/\.(mp4|webm|mov|avi)(\?|#|$)/i.test(heroMobilePosterUrl)
        ? heroMobilePosterUrl
        : heroMobileFrames[0]
      : heroMobileMediaUrl
    : null;
  const heroMobileDimensions = hasMobileHeroMedia
    ? await getLocalMediaDimensions(heroMobileDimensionsSource)
    : null;

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

  // Detecção e Resolução da Cor de Fundo do Hero (Desktop e Mobile independentes com fallback)
  const heroBgMode = site?.heroBgMode || "AUTO";
  const heroBgDetected = site?.heroBgDetectedColor;
  const heroBgCustom = site?.heroBgCustomColor;

  const effectiveHeroBgColor =
    heroBgMode === "MANUAL" && heroBgCustom && /^#[0-9A-Fa-f]{6}$/i.test(heroBgCustom)
      ? heroBgCustom
      : heroBgDetected && /^#[0-9A-Fa-f]{6}$/i.test(heroBgDetected)
      ? heroBgDetected
      : "#FAF7F2";

  const heroMobileBgDetected = site?.heroMobileBgDetectedColor;
  const effectiveMobileHeroBgColor = hasMobileHeroMedia
    ? heroMobileBgDetected && /^#[0-9A-Fa-f]{6}$/i.test(heroMobileBgDetected)
      ? heroMobileBgDetected
      : "#FAF7F2"
    : effectiveHeroBgColor;
  const mobileHeroBgRgb = hexToRgbTriplet(effectiveMobileHeroBgColor);

  return (
    <div
      data-theme="light"
      className="minisite-root light min-h-screen flex flex-col bg-[#FDFCFB] text-slate-900 selection:bg-[var(--primary)] selection:text-white font-sans overflow-x-hidden"
    >
      {/* ================= TOP NAVIGATION (DESKTOP & MOBILE STICKY HEADER) ================= */}
      <MiniSiteHeader
        logoHorizontalUrl={site?.logoHorizontalUrl}
        logoUrl={site?.logoUrl}
        clinicName={clinicName}
        professionalName={professionalName}
        crpCrm={crpCrm}
        shouldShowLocation={shouldShowLocation}
        currentUser={currentUser}
      />

      {/* ================= 1. HERO SECTION (Referência Visual) ================= */}
      <section
        id="inicio"
        style={
          {
            "--hero-bg-mobile": effectiveMobileHeroBgColor,
            "--hero-bg-desktop": effectiveHeroBgColor,
            "--hero-background-color": effectiveHeroBgColor,
          } as React.CSSProperties
        }
        className="relative min-h-[auto] lg:min-h-screen flex flex-col justify-center px-0 overflow-hidden bg-[var(--hero-bg-mobile)] lg:bg-[var(--hero-bg-desktop)] pt-[calc(3.25rem+4px+env(safe-area-inset-top,0px))] md:pt-24 lg:pt-28 pb-12 lg:pb-16 scroll-mt-24 transition-colors duration-300"
      >
        {/* Padrão orgânico ondulado de fundo (Curvas suaves) */}
        <div className="absolute inset-0 pointer-events-none opacity-30 overflow-hidden lg:hidden" aria-hidden="true">
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

        {/* Camada de fundo sólido no desktop (abaixo da mídia) para garantir que o lado direito nunca fique transparente.
            Nenhuma sobreposição, gradiente ou filtro é aplicado SOBRE a mídia: ela é exibida com cores, brilho e opacidade originais. */}
        <div
          className="hidden lg:block absolute inset-0 z-0 pointer-events-none transition-colors duration-300"
          style={{ backgroundColor: effectiveHeroBgColor }}
          aria-hidden="true"
        />

        {/* Topo do Hero: No mobile (< md) o CRP aparece no header entre logo e menu;
            no tablet (md..lg) acima da mídia; no desktop (lg+) alinhado à esquerda acima do nome */}
        <div
          id="hero-badge-wrapper"
          className="hidden md:flex w-full max-w-3xl mx-auto px-4 sm:px-6 lg:max-w-none lg:mx-0 lg:pl-[7vw] xl:pl-[8vw] lg:pr-8 relative z-20 lg:z-10 order-1 flex-col items-center lg:items-start text-center lg:text-left pointer-events-none mb-2 md:mb-3 lg:mb-4"
        >
          <div
            id="hero-badge"
            className="inline-block pointer-events-auto px-5 py-1.5 rounded-full bg-[var(--primary)] text-[var(--primary-foreground,#ffffff)] text-white font-heading font-semibold text-xs uppercase tracking-wider shadow-xs"
          >
            {crpCrm}
          </div>
        </div>

        {/* MEDIA SLOT 1: Imagem/Vídeo/Frames Principal (Mobile: 100% largura em fluxo com degradê inferior suave; Desktop: background absoluto cobrindo a seção com fundo sólido) */}
        <div
          id="hero-media-container"
          className="order-2 relative w-full z-10 overflow-hidden lg:absolute lg:inset-0 lg:w-full lg:h-full lg:z-0 lg:overflow-hidden bg-[var(--hero-bg-mobile)] lg:bg-[var(--hero-bg-desktop)] flex items-center justify-center p-0 m-0 border-0 shadow-none rounded-none pointer-events-none transition-colors duration-300"
        >
          <div id="hero-bg-leaves" className="hidden" aria-hidden="true" />

          {/* Camada Parallax Responsiva: Altura expandida (115%) no Desktop para absorver deslocamento sem frestas */}
          <div
            id="hero-parallax-layer"
            className="w-full h-auto lg:h-[115%] lg:w-full lg:absolute lg:-top-[5%] lg:left-0 flex items-center justify-center p-0 m-0 pointer-events-none will-change-transform"
          >
            {/* Container Responsivo de Mídia (Hero Desktop com fallback automático no Mobile se Hero Mobile estiver vazio) */}
            {!hasMobileHeroMedia ? (
              <MiniSiteMediaPlayer
                slot="hero"
                mediaType={heroMediaType}
                mediaUrl={heroMediaUrl}
                posterUrl={heroPosterUrl}
                frames={heroFrames}
                fps={site?.heroFps ?? 24}
                playbackSpeed={site?.heroPlaybackSpeed ?? 1}
                loop={site?.heroLoop ?? true}
                autoplay={site?.heroAutoplay ?? true}
                playbackMode={site?.heroPlaybackMode || "AUTOMATIC"}
                playbackDirection={site?.heroPlaybackDirection || "FORWARD"}
                positioning={site?.heroPositioning || "center"}
                intrinsicWidth={heroDimensions?.width}
                intrinsicHeight={heroDimensions?.height}
                altText={professionalName}
                className="w-full h-auto lg:h-full lg:w-full p-0 m-0 border-0 shadow-none rounded-none"
              />
            ) : (
              <>
                <div className="hidden lg:block w-full h-full p-0 m-0">
                  <MiniSiteMediaPlayer
                    slot="hero"
                    mediaType={heroMediaType}
                    mediaUrl={heroMediaUrl}
                    posterUrl={heroPosterUrl}
                    frames={heroFrames}
                    fps={site?.heroFps ?? 24}
                    playbackSpeed={site?.heroPlaybackSpeed ?? 1}
                    loop={site?.heroLoop ?? true}
                    autoplay={site?.heroAutoplay ?? true}
                    playbackMode={site?.heroPlaybackMode || "AUTOMATIC"}
                    playbackDirection={site?.heroPlaybackDirection || "FORWARD"}
                    positioning={site?.heroPositioning || "center"}
                    intrinsicWidth={heroDimensions?.width}
                    intrinsicHeight={heroDimensions?.height}
                    altText={professionalName}
                    className="w-full h-auto lg:h-full lg:w-full p-0 m-0 border-0 shadow-none rounded-none"
                  />
                </div>
                <div
                  style={
                    {
                      "--hero-background-color": effectiveMobileHeroBgColor,
                    } as React.CSSProperties
                  }
                  className="w-full block lg:hidden p-0 m-0 border-0 shadow-none rounded-none"
                >
                  <MiniSiteMediaPlayer
                    slot="hero_mobile"
                    mediaType={heroMobileMediaType}
                    mediaUrl={heroMobileMediaUrl}
                    posterUrl={heroMobilePosterUrl}
                    frames={heroMobileFrames}
                    fps={site?.heroMobileFps ?? 24}
                    playbackSpeed={site?.heroMobilePlaybackSpeed ?? 1}
                    loop={site?.heroMobileLoop ?? true}
                    autoplay={site?.heroMobileAutoplay ?? true}
                    playbackMode={site?.heroMobilePlaybackMode || "AUTOMATIC"}
                    playbackDirection={site?.heroMobilePlaybackDirection || "FORWARD"}
                    positioning={site?.heroMobilePositioning || "center"}
                    intrinsicWidth={heroMobileDimensions?.width}
                    intrinsicHeight={heroMobileDimensions?.height}
                    altText={professionalName}
                    className="w-full h-auto p-0 m-0 border-0 shadow-none rounded-none"
                  />
                </div>
              </>
            )}
          </div>

          {/* Degradê vertical inferior exclusivamente no Mobile (funde suavemente os 15–25% inferiores da mídia à cor de fundo do Hero) */}
          <div
            id="hero-mobile-bottom-fade"
            className="block lg:hidden absolute inset-x-0 -bottom-px h-[22%] z-10 pointer-events-none"
            style={{
              background: `linear-gradient(to bottom, rgba(${mobileHeroBgRgb}, 0) 0%, rgba(${mobileHeroBgRgb}, 0.14) 32%, rgba(${mobileHeroBgRgb}, 0.45) 62%, rgba(${mobileHeroBgRgb}, 0.84) 84%, rgba(${mobileHeroBgRgb}, 1) 100%)`,
            }}
            aria-hidden="true"
          />
        </div>

        {/* Conteúdo Textual e Ações do Hero: Mobile centralizado e próximo à base suavizada da mídia; Desktop alinhado à esquerda sobre a mídia */}
        <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:max-w-none lg:mx-0 lg:pl-[7vw] xl:pl-[8vw] lg:pr-8 relative z-20 lg:z-10 order-3 lg:order-2 flex flex-col items-center lg:items-start text-center lg:text-left -mt-3 sm:-mt-4 lg:mt-0">
          <div className="w-full lg:max-w-xl xl:max-w-2xl flex flex-col items-center lg:items-start text-center lg:text-left lg:[text-shadow:0_1px_3px_rgba(255,255,255,0.6)]">
            {/* Nome, Especialidade e Linha Decorativa com Tipografia Elegante */}
            <div id="hero-title-group" className="space-y-1.5 pt-0 lg:pt-1 mb-4 sm:mb-5 flex flex-col items-center lg:items-start text-center lg:text-left">
              <h1
                id="hero-name"
                className="text-[40px] min-[375px]:text-[41px] sm:text-[54px] lg:text-5xl xl:text-6xl font-display italic text-[var(--primary)] font-semibold lg:font-bold tracking-tight lg:drop-shadow-2xs leading-[1.15] lg:leading-tight hero-name-font"
              >
                <span className="sr-only">{professionalName}</span>
                <span id="hero-name-text" aria-hidden="true" className="hero-typewriter-text">
                  {professionalName}
                </span>
              </h1>
              <p
                id="hero-title"
                className="text-[13.5px] sm:text-[16px] lg:text-sm font-heading font-bold tracking-[0.18em] sm:tracking-[0.2em] lg:tracking-[0.2em] text-slate-800 uppercase hero-specialty-font"
              >
                <span className="sr-only">{professionalTitle}</span>
                <span id="hero-title-text" aria-hidden="true" className="block hero-typewriter-text">
                  {professionalTitle}
                </span>
              </p>
              {/* Linha decorativa horizontal abaixo da especialidade com a cor primária oficial (Mobile) */}
              <div
                id="hero-accent-line"
                className="block lg:hidden w-14 h-[3px] rounded-full bg-[var(--primary)] mx-auto mt-1.5 mb-0.5"
                aria-hidden="true"
              />
            </div>

            {/* Subtítulo / Frase de Acolhimento */}
            <p id="hero-subtitle" className="text-sm sm:text-base text-slate-600 max-w-lg mx-auto lg:mx-0 lg:text-left leading-relaxed mb-5 sm:mb-6">
              <span className="sr-only">{heroSubtitle}</span>
              <span id="hero-subtitle-text" aria-hidden="true" className="block hero-typewriter-text">
                {heroSubtitle}
              </span>
            </p>

            {/* Botões de Ação Hero */}
            <div
              id="hero-cta"
              className="flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-3 sm:gap-3.5 w-full max-w-md lg:max-w-none pt-1 mb-3.5 sm:mb-4"
            >
              <div className="hero-cta-item w-full lg:w-auto shrink-0">
                <Link href="/agendar" className="block w-full lg:w-auto">
                  <button
                    type="button"
                    className="w-full lg:w-auto inline-flex items-center justify-center gap-2 lg:gap-2 h-[54px] lg:h-12 py-3.5 px-3 min-[360px]:px-6 sm:px-7 rounded-2xl font-heading font-semibold text-[17px] sm:text-[18px] lg:text-sm uppercase tracking-wide min-[360px]:tracking-wider shadow-md hover:shadow-lg hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer bg-[var(--primary)] text-white whitespace-nowrap"
                  >
                    <Calendar className="h-5 w-5 lg:h-4 lg:w-4 text-white shrink-0" />
                    <span className="text-white whitespace-nowrap">Agende sua consulta</span>
                  </button>
                </Link>
              </div>

              {whatsappUrl && (
                <div className="hero-cta-item w-full lg:w-auto shrink-0">
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full lg:w-auto inline-flex items-center justify-center gap-2 lg:gap-2 h-[54px] lg:h-12 py-3.5 px-3 min-[360px]:px-6 sm:px-7 rounded-2xl font-heading font-semibold text-[17px] sm:text-[18px] lg:text-sm text-white bg-[#221B16] hover:bg-[#181310] shadow-sm hover:shadow-md hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <WhatsAppIcon className="h-[22px] w-[22px] lg:h-4.5 lg:w-4.5 text-white shrink-0" variant="white" />
                    <span className="text-white whitespace-nowrap">Chamar no WhatsApp</span>
                  </a>
                </div>
              )}
            </div>

            {/* Indicadores de Benefício Configuráveis (Fase 4/5) - Abaixo dos botões no mobile e desktop */}
            {activeBenefits.length > 0 && (
              <div
                id="hero-benefits"
                className={`w-full max-w-xl lg:max-w-[565px] xl:max-w-none border-t border-slate-200/70 pt-3.5 mt-0 sm:pt-4 ${
                  activeBenefits.length === 1
                    ? "grid grid-cols-1 max-w-xs lg:flex lg:flex-row lg:items-start lg:justify-start"
                    : activeBenefits.length === 2
                    ? "grid grid-cols-2 max-w-sm lg:flex lg:flex-row lg:items-start lg:justify-start lg:gap-8 xl:gap-10"
                    : "grid grid-cols-3 lg:flex lg:flex-row lg:items-start lg:justify-start lg:gap-5 xl:gap-8"
                } gap-3 sm:gap-5`}
              >
                {activeBenefits.map((item) => (
                  <div
                    key={item.id}
                    className="hero-benefit-item group flex flex-col items-center text-center space-y-2 p-2 lg:p-0 lg:flex-row lg:items-center lg:text-left lg:space-y-0 lg:gap-3.5 xl:gap-4 rounded-2xl transition-colors min-w-0"
                  >
                    <div className="w-13 h-13 sm:w-14 sm:h-14 lg:w-[58px] lg:h-[58px] xl:w-[62px] xl:h-[62px] rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center transition-transform group-hover:scale-105 shadow-2xs shrink-0">
                      <ThemeIcon
                        iconName={item.icon}
                        customIconUrl={item.customIconUrl}
                        className="h-6.5 w-6.5 sm:h-7 sm:w-7 lg:h-[29px] lg:w-[29px] xl:h-[31px] xl:w-[31px] text-[var(--primary)]"
                        alt={item.title}
                      />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs sm:text-sm lg:text-[15px] xl:text-[17px] font-heading font-bold uppercase tracking-tight text-slate-800 leading-tight">
                        {item.title}
                      </span>
                      {item.subtitle && (
                        <span className="text-[11px] sm:text-xs lg:text-[13px] xl:text-[14px] text-slate-500 font-normal leading-snug line-clamp-1 lg:line-clamp-2">
                          {item.subtitle}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ================= INDICADOR DE SCROLL ANIMADO NO DESKTOP ================= */}
        {/* Posicionado no extremo direito (~50% da altura visível do Hero desktop), fora do elemento animado pelo GSAP */}
        <div
          id="hero-scroll-indicator-position"
          className="hidden lg:flex absolute top-1/2 -translate-y-1/2 right-6 xl:right-8 z-20 w-[52px] items-center justify-center pointer-events-none"
        >
          <HeroScrollIndicator
            targetSectionId="atendimentos"
            className="pointer-events-auto"
          />
        </div>

        {/* ================= TRANSIÇÃO GRADIENTE INFERIOR NO DESKTOP ================= */}
        {/* Suave fusão vertical na base (inferior 15-25%) conectando o Hero à seção seguinte (#atendimentos, bg-white).
            Preserva o lado direito e topo da mídia 100% visíveis, sem véu ou gradientes horizontais. */}
        <div
          id="hero-bottom-gradient"
          className="hidden lg:block absolute inset-x-0 bottom-0 h-32 sm:h-40 xl:h-48 z-[2] pointer-events-none bg-gradient-to-t from-white via-white/50 to-transparent transition-opacity duration-300"
          aria-hidden="true"
        />
      </section>

      {/* Divisor Ondulado Orgânico 1 (Oculto no Mobile e preservado no código-fonte; no Desktop a fusão ocorre via gradiente vertical suave para white) */}
      <div
        id="hero-mobile-divider"
        className="hidden w-full overflow-hidden leading-none -mt-1"
        style={{ color: effectiveMobileHeroBgColor }}
        aria-hidden="true"
      >
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-8 fill-current">
          <path d="M0,0 C300,90 900,-30 1200,60 L1200,120 L0,120 Z" />
        </svg>
      </div>

      {/* ================= 2. PRINCIPAIS DEMANDAS & ATENDIMENTOS ================= */}
      <section id="atendimentos" className="py-16 px-4 bg-white scroll-mt-20">
        <div className="max-w-4xl mx-auto space-y-10">
          <div id="atendimentos-header" className="text-center space-y-2.5">
            <span className="text-xs font-heading font-bold uppercase tracking-[0.25em] text-[var(--primary)]">
              — Atendimentos —
            </span>
            <h2 className="font-heading text-2xl sm:text-4xl font-bold tracking-tight text-slate-900">
              Principais Demandas
            </h2>
            <p className="text-xs sm:text-base text-slate-600 max-w-lg mx-auto leading-relaxed">
              Acompanhamento psicológico para diferentes momentos e desafios da vida.
            </p>
          </div>

          {/* Cards de Demandas e Serviços Reais do PSI */}
          <div id="services-list" className="space-y-3.5">
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
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#FCFAF6] border border-[#EFE9DF] hover:border-[var(--primary)] hover:bg-white hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-heading font-bold text-sm sm:text-base text-slate-900 group-hover:text-[var(--primary)] transition-colors truncate">
                          {service.name}
                        </h3>
                        <p className="text-xs text-slate-500 line-clamp-1 mt-0.5 leading-relaxed">
                          {service.description || "Atendimento psicológico clínico personalizado e humanizado."}
                        </p>
                        <div className="flex flex-wrap items-center gap-2.5 mt-2 text-[11px] text-slate-400 font-medium">
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

                    <div className="w-8 h-8 rounded-full bg-white border border-[#EFE9DF] flex items-center justify-center text-slate-400 group-hover:text-white group-hover:bg-[var(--primary)] group-hover:border-[var(--primary)] shrink-0 transition-colors shadow-2xs">
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="text-center pt-2">
            <Link href="/agendar">
              <span className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20 text-[var(--primary)] font-heading font-semibold text-xs transition-all hover:gap-2.5 cursor-pointer shadow-2xs">
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
          <div className="p-6 sm:p-10 rounded-3xl bg-white border border-[#EFE9DF] shadow-xs flex flex-col md:flex-row items-center gap-8 lg:gap-10">
            {/* MEDIA SLOT 2: Ambiente do Consultório / Segundo Retrato Independente */}
            <div id="sobre-media" className="w-full md:w-5/12 shrink-0">
              <div
                className={`w-full ${
                  hasAboutMedia ? "max-h-[500px]" : "aspect-4/3"
                } rounded-2xl border border-[#EFE9DF] overflow-hidden relative shadow-inner bg-gradient-to-tr from-[#EBE3D5] to-[#F5EFEB] flex items-center justify-center`}
              >
                <MiniSiteMediaPlayer
                  slot="about"
                  mediaType={aboutMediaType}
                  mediaUrl={aboutMediaUrl}
                  posterUrl={aboutPosterUrl}
                  frames={aboutFrames}
                  fps={site?.aboutFps ?? 24}
                  playbackSpeed={site?.aboutPlaybackSpeed ?? 1}
                  loop={site?.aboutLoop ?? true}
                  autoplay={site?.aboutAutoplay ?? true}
                  playbackMode={site?.aboutPlaybackMode || "AUTOMATIC"}
                  playbackDirection={site?.aboutPlaybackDirection || "FORWARD"}
                  positioning={site?.aboutPositioning || "center"}
                  intrinsicWidth={aboutDimensions?.width}
                  intrinsicHeight={aboutDimensions?.height}
                  altText="Consultório e Espaço Terapêutico"
                  className="rounded-2xl"
                />
              </div>
            </div>

            {/* Conteúdo Biográfico */}
            <div id="sobre-content" className="w-full md:w-7/12 space-y-4">
              <div className="space-y-1">
                <span className="text-xs font-heading font-bold uppercase tracking-[0.2em] text-[var(--primary)]">
                  Trajetória Profissional
                </span>
                <h2 className="font-heading text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  Sobre Mim
                </h2>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {aboutText}
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <Link href="/agendar">
                  <span className="inline-flex items-center gap-1.5 text-xs font-heading font-bold text-[var(--primary)] hover:underline">
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
        <div className="max-w-4xl mx-auto space-y-10">
          <div id="diferenciais-header" className="text-center space-y-2.5">
            <span className="text-xs font-heading font-bold uppercase tracking-[0.25em] text-[var(--primary)]">
              — Diferenciais —
            </span>
            <h2 className="font-heading text-2xl sm:text-4xl font-bold tracking-tight text-slate-900">
              Por que escolher meu atendimento?
            </h2>
          </div>

          <div id="diferenciais-grid" className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Card 1 */}
            <div className="p-5 sm:p-6 rounded-2xl bg-[#FCFAF6] border border-[#EFE9DF] hover:border-[var(--primary)]/50 hover:bg-white hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-start gap-4">
              <div className="w-11 h-11 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0 shadow-2xs">
                <Heart className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-heading font-bold text-sm text-slate-900">
                  Escuta Ativa e Acolhedora
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Espaço ético, seguro e livre de julgamentos, centrado na sua singularidade e no seu tempo.
                </p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="p-5 sm:p-6 rounded-2xl bg-[#FCFAF6] border border-[#EFE9DF] hover:border-[var(--primary)]/50 hover:bg-white hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-start gap-4">
              <div className="w-11 h-11 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0 shadow-2xs">
                <Target className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-heading font-bold text-sm text-slate-900">
                  Plano Terapêutico Personalizado
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Intervenções e metodologias baseadas em evidências científicas, alinhadas aos seus objetivos.
                </p>
              </div>
            </div>

            {/* Card 3 */}
            <div className="p-5 sm:p-6 rounded-2xl bg-[#FCFAF6] border border-[#EFE9DF] hover:border-[var(--primary)]/50 hover:bg-white hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-start gap-4">
              <div className="w-11 h-11 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0 shadow-2xs">
                <Clock className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-heading font-bold text-sm text-slate-900">
                  Horários Flexíveis
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Grade de atendimento com ampla disponibilidade para harmonizar a terapia à sua rotina diária.
                </p>
              </div>
            </div>

            {/* Card 4 */}
            <div className="p-5 sm:p-6 rounded-2xl bg-[#FCFAF6] border border-[#EFE9DF] hover:border-[var(--primary)]/50 hover:bg-white hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-start gap-4">
              <div className="w-11 h-11 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0 shadow-2xs">
                <Video className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-heading font-bold text-sm text-slate-900">
                  Atendimento Presencial e Online
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Flexibilidade para consultar no consultório físico ou por teleconsulta criptografada de onde estiver.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 5. COMO FUNCIONA (Referência Visual) ================= */}
      <section id="como-funciona" className="py-16 px-4 bg-[#F8F5EE] scroll-mt-20">
        <div className="max-w-5xl mx-auto">
          <div
            id="como-funciona-card"
            className="relative overflow-hidden rounded-[32px] sm:rounded-[40px] bg-[#FFFDF9] border border-[#EFE6DA] shadow-[0_12px_36px_-18px_rgba(62,32,20,0.08)] px-5 py-10 sm:px-10 sm:py-14 md:px-14 md:py-16"
          >
            {/* Elemento decorativo discreto: ramo de folhas bege/dourado no canto superior esquerdo */}
            <svg
              id="como-funciona-decor-leaves"
              aria-hidden="true"
              viewBox="0 0 180 140"
              fill="none"
              className="pointer-events-none select-none absolute -top-1 -left-1 w-24 sm:w-40 md:w-48 h-auto opacity-85 z-0"
            >
              <defs>
                <linearGradient id="como-funciona-leaf-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#B9905B" stopOpacity="0.62" />
                  <stop offset="55%" stopColor="#CFB082" stopOpacity="0.46" />
                  <stop offset="100%" stopColor="#E6CFAF" stopOpacity="0.28" />
                </linearGradient>
              </defs>
              {/* Caule orgânico principal */}
              <path
                d="M-6 110 C 28 96, 72 64, 122 18"
                stroke="#C39E6B"
                strokeOpacity="0.45"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              {/* Ramo secundário inferior esquerdo */}
              <path
                d="M36 86 C 50 96, 62 100, 74 102"
                stroke="#C39E6B"
                strokeOpacity="0.35"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
              {/* Folha 1 inferior esquerda */}
              <path
                d="M20 96 C 14 112, 22 126, 40 120 C 38 106, 30 98, 20 96 Z"
                fill="url(#como-funciona-leaf-grad)"
              />
              {/* Folha 2 superior esquerda */}
              <path
                d="M42 82 C 30 62, 36 36, 56 32 C 62 50, 56 70, 42 82 Z"
                fill="url(#como-funciona-leaf-grad)"
              />
              {/* Folha 3 inferior direita do caule */}
              <path
                d="M52 80 C 66 74, 86 78, 96 90 C 80 96, 62 92, 52 80 Z"
                fill="url(#como-funciona-leaf-grad)"
              />
              {/* Folha 4 superior central */}
              <path
                d="M74 58 C 68 38, 76 14, 96 6 C 98 28, 90 46, 74 58 Z"
                fill="url(#como-funciona-leaf-grad)"
              />
              {/* Folha 5 direita */}
              <path
                d="M84 54 C 102 48, 124 48, 138 56 C 122 66, 100 66, 84 54 Z"
                fill="url(#como-funciona-leaf-grad)"
              />
              {/* Folha 6 apical (ponta) */}
              <path
                d="M104 34 C 114 16, 134 6, 152 8 C 142 26, 122 36, 104 34 Z"
                fill="url(#como-funciona-leaf-grad)"
              />
            </svg>

            {/* Elemento decorativo discreto: forma orgânica suave no canto inferior direito */}
            <svg
              id="como-funciona-decor-wave"
              aria-hidden="true"
              viewBox="0 0 400 160"
              preserveAspectRatio="none"
              fill="none"
              className="pointer-events-none select-none absolute bottom-0 right-0 w-44 sm:w-72 md:w-[380px] h-24 sm:h-36 md:h-40 z-0"
            >
              <path
                d="M16 160 C 92 158, 146 126, 214 88 C 276 54, 338 36, 400 18 L 400 160 Z"
                fill="#F7EAE0"
                fillOpacity="0.82"
              />
            </svg>

            <div className="relative z-10">
              {/* Cabeçalho centralizado */}
              <div id="como-funciona-header" className="text-center max-w-2xl mx-auto space-y-3 sm:space-y-4">
                <div
                  id="como-funciona-eyebrow"
                  className="inline-flex items-center justify-center gap-3 text-[11px] sm:text-xs font-heading font-semibold uppercase tracking-[0.24em] text-[#C24A0E]"
                >
                  <span className="w-3.5 h-[1.5px] bg-[#D96528]/70 rounded-full" aria-hidden="true" />
                  <span>PASSO A PASSO</span>
                  <span className="w-3.5 h-[1.5px] bg-[#D96528]/70 rounded-full" aria-hidden="true" />
                </div>

                <h2
                  id="como-funciona-title"
                  style={{ fontFamily: "var(--font-playfair), var(--font-display), Georgia, serif" }}
                  className="text-[32px] min-[375px]:text-[36px] sm:text-[42px] md:text-[46px] font-medium text-[#2E1A10] tracking-[-0.012em] leading-[1.14]"
                >
                  Como Funciona?
                </h2>

                <p
                  id="como-funciona-subtitle"
                  className="text-[13.5px] sm:text-[15.5px] text-[#66574E] max-w-[540px] mx-auto leading-[1.65] font-normal"
                >
                  Um processo simples, acolhedor e seguro, pensado para ajudar você a cuidar da sua saúde emocional com clareza e consistência.
                </p>
              </div>

              {/* Timeline Horizontal (Desktop) / Vertical à esquerda (Mobile) */}
              <div
                id="como-funciona-steps"
                className="mt-10 sm:mt-12 md:mt-14 [--cf-gap:2rem] lg:[--cf-gap:2.5rem] flex flex-col gap-7 md:grid md:grid-cols-3 md:gap-8 lg:gap-10 relative"
              >
                {[
                  {
                    number: "01",
                    title: "Agende sua consulta",
                    description:
                      "Escolha o horário e a modalidade ideal diretamente pelo nosso sistema online com praticidade e segurança.",
                    Icon: CalendarDays,
                  },
                  {
                    number: "02",
                    title: "Realize sua avaliação inicial",
                    description:
                      "Primeira conversa para compreender suas necessidades, histórico e objetivos terapêuticos, em um espaço de escuta acolhedora.",
                    Icon: MessagesSquare,
                  },
                  {
                    number: "03",
                    title: "Inicie seu acompanhamento",
                    description:
                      "Sua jornada de cuidado, com sessões contínuas e um plano terapêutico personalizado, no seu ritmo e de forma consistente.",
                    Icon: HandHeart,
                  },
                ].map((step, index) => {
                  const StepIcon = step.Icon;
                  const hasNext = index < 2;
                  return (
                    <div
                      key={step.number}
                      data-step={step.number}
                      className="como-funciona-step group relative flex flex-row items-start text-left gap-4 md:flex-col md:items-center md:text-center md:gap-0 min-w-0"
                    >
                      {/* Linha conectora horizontal (Desktop >= md) */}
                      {hasNext && (
                        <div
                          aria-hidden="true"
                          style={{
                            left: "calc(50% + 58px)",
                            width: "calc(100% + var(--cf-gap) - 116px)",
                          }}
                          className="hidden md:flex items-center absolute top-[44px] -translate-y-1/2 pointer-events-none z-0"
                        >
                          <span className="como-funciona-line flex-1 h-[1.5px] bg-[#E8AD84]/80 rounded-full origin-left" />
                          <span className="como-funciona-dot w-2.5 h-2.5 rounded-full border-[1.75px] border-[#DF6B2B] bg-[#FFFDF9] mx-1.5 shrink-0" />
                          <span className="como-funciona-line flex-1 h-[1.5px] bg-[#E8AD84]/80 rounded-full origin-left" />
                        </div>
                      )}

                      {/* Linha conectora vertical à esquerda (Mobile < md) */}
                      {hasNext && (
                        <div
                          aria-hidden="true"
                          className="md:hidden absolute top-[62px] min-[375px]:top-[70px] bottom-[-22px] left-[28px] min-[375px]:left-[32px] -translate-x-1/2 flex flex-col items-center pointer-events-none z-0"
                        >
                          <span className="como-funciona-mobile-line w-[1.5px] flex-1 bg-[#E8AD84]/80 rounded-full origin-top" />
                          <span className="como-funciona-mobile-dot w-2 h-2 rounded-full border-[1.5px] border-[#DF6B2B] bg-[#FFFDF9] my-1 shrink-0" />
                          <span className="como-funciona-mobile-line w-[1.5px] flex-1 bg-[#E8AD84]/80 rounded-full origin-top" />
                        </div>
                      )}

                      {/* Círculo bege-claro (~88px desktop, proporcional mobile) com ícone outline marrom escuro */}
                      <div className="como-funciona-icon-wrap relative z-10 w-14 h-14 min-[375px]:w-16 min-[375px]:h-16 md:w-[88px] md:h-[88px] rounded-full bg-[#FCEFE4] border border-[#F7DFCC]/70 flex items-center justify-center shrink-0">
                        <StepIcon
                          className="w-6 h-6 min-[375px]:w-7 min-[375px]:h-7 md:w-[34px] md:h-[34px] text-[#462516]"
                          strokeWidth={1.65}
                        />
                      </div>

                      {/* Conteúdo da etapa (cápsula numérica + título + descrição) */}
                      <div className="flex-1 min-w-0 md:mt-4 flex flex-col items-start md:items-center">
                        <span className="inline-flex items-center justify-center px-3 py-0.5 rounded-full bg-[#FDE4CF] text-[#B8470A] font-heading font-bold text-[11px] tracking-wider tabular-nums mb-2">
                          {step.number}
                        </span>
                        <h3 className="font-heading font-bold text-[15px] sm:text-base text-[#2E1A10] leading-snug mb-1.5">
                          {step.title}
                        </h3>
                        <p className="text-[13px] sm:text-[13.5px] text-[#6A5A50] leading-[1.6] md:max-w-[250px] md:mx-auto">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Botão de Agendamento Online centralizado abaixo da timeline */}
              <div id="como-funciona-cta" className="mt-10 sm:mt-12 text-center">
                <Link
                  href="/agendar"
                  className="group inline-flex w-full sm:w-auto max-w-full items-center justify-center gap-2.5 rounded-full bg-[#F45108] hover:bg-[#DC4606] active:scale-[0.98] text-white font-heading font-semibold text-sm sm:text-[15px] px-7 sm:px-9 py-3.5 sm:py-4 shadow-[0_8px_20px_-6px_rgba(244,81,8,0.38)] hover:shadow-[0_12px_24px_-6px_rgba(244,81,8,0.46)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F45108] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFFDF9] transition-all duration-200"
                >
                  <span>Iniciar Agendamento Online</span>
                  <ArrowRight className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 6. DEPOIMENTOS (Referência Visual & Ética) ================= */}
      <section id="depoimentos" className="py-16 sm:py-20 px-4 bg-white">
        <div className="max-w-2xl mx-auto space-y-8 text-center">
          <div className="space-y-2">
            <span className="text-xs font-heading font-bold uppercase tracking-[0.25em] text-[var(--primary)]">
              — Depoimentos —
            </span>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              O que meus pacientes dizem
            </h2>
          </div>

          {/* Card de Depoimento Autorizado & Conformidade Ética CFP */}
          <div id="depoimento-card" className="p-6 sm:p-8 rounded-3xl bg-[#FCFAF6] border border-[#EFE9DF] shadow-xs space-y-4 text-left relative overflow-hidden">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[var(--primary)]/15 text-[var(--primary)] font-heading font-bold flex items-center justify-center text-base shrink-0 shadow-2xs">
                A
              </div>
              <div className="space-y-1.5 flex-1">
                <p className="text-xs sm:text-sm text-slate-700 italic leading-relaxed">
                  &quot;O processo terapêutico tem sido transformador. A escuta atenciosa e as orientações práticas me ajudaram a lidar com a ansiedade e a retomar a clareza nas decisões da minha vida.&quot;
                </p>
                <div className="flex items-center justify-between pt-2">
                  <span className="font-heading font-bold text-xs text-[var(--primary)]">
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

            <div className="border-t border-[#EFE9DF] pt-3 text-[10px] text-slate-400 flex items-center gap-1.5">
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
        <section id="localizacao" className="py-16 sm:py-20 px-4 bg-[#F8F5EE] border-t border-slate-200/60 scroll-mt-20">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-2">
              <span className="text-xs font-heading font-bold uppercase tracking-[0.25em] text-[var(--primary)]">
                — Atendimento Presencial —
              </span>
              <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Localização do Consultório
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                Ambiente preparado com isolamento acústico, total privacidade e acessibilidade.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
              {/* Informações de Endereço e Contato */}
              <div id="localizacao-info" className="p-6 rounded-3xl bg-white border border-[#EFE9DF] shadow-xs flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-heading font-bold text-xs sm:text-sm text-slate-900">
                        Endereço Oficial
                      </h4>
                      <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                        {formattedAddress || site?.address || "Endereço sob consulta prévia para agendamentos presenciais."}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
                      <WhatsAppIcon className="h-5 w-5 text-[var(--primary)]" variant="monochrome" />
                    </div>
                    <div>
                      <h4 className="font-heading font-bold text-xs sm:text-sm text-slate-900">
                        Telefone & WhatsApp
                      </h4>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {site?.phone || site?.whatsappNumber || "(11) 99999-9999"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-heading font-bold text-xs sm:text-sm text-slate-900">
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
                    className="inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-heading font-semibold shadow-xs transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Como Chegar via Google Maps</span>
                  </a>
                )}
              </div>

              {/* Container de Mapa Interativo (Embed Seguro ou Card Informativo) */}
              <div id="localizacao-map" className="p-2 sm:p-3 rounded-3xl bg-white border border-[#EFE9DF] shadow-xs flex flex-col items-center justify-center text-center overflow-hidden min-h-[280px]">
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
                      <h4 className="font-heading font-bold text-xs sm:text-sm text-slate-800">
                        Mapa Interativo do Consultório
                      </h4>
                      <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed">
                        Próximo a transporte público, pontos de referência e fácil acesso.
                      </p>
                    </div>
                    {mapsDestinationUrl && (
                      <a
                        href={mapsDestinationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-heading font-bold text-[var(--primary)] hover:underline inline-flex items-center gap-1"
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
      <section id="cta-final" className="py-14 sm:py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div
            id="cta-final-box"
            className="p-6 min-[375px]:p-7 sm:p-10 rounded-3xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-5 md:gap-6 relative overflow-hidden bg-[var(--primary)] text-[var(--primary-foreground,#ffffff)]"
          >
            {/* Brilho decorativo sutil */}
            <div className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-white/10 blur-xl pointer-events-none" aria-hidden="true" />

            <div className="flex flex-col md:flex-row items-center gap-3.5 md:gap-4 text-center md:text-left relative z-10 w-full md:w-auto">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 shadow-xs">
                <Calendar className="h-6 w-6 md:h-7 md:w-7 text-white" />
              </div>
              <div className="space-y-1.5 md:space-y-1 max-w-full">
                <h3 className="font-heading text-lg min-[360px]:text-xl md:text-2xl font-extrabold text-white tracking-tight leading-snug">
                  <span className="md:hidden">Agende sua consulta!</span>
                  <span className="hidden md:inline">Agende sua consulta agora</span>
                </h3>
                <p className="text-[13px] min-[360px]:text-sm text-white/95 md:text-white/90 leading-relaxed">
                  <span className="md:hidden">Bem-estar e independência emocional.</span>
                  <span className="hidden md:inline">Dê o primeiro passo para o seu bem-estar emocional.</span>
                </p>
              </div>
            </div>

            <div className="w-full md:w-auto flex justify-center md:justify-end shrink-0 relative z-10">
              <Link href="/agendar" className="block w-full sm:w-auto shrink-0">
                <button
                  type="button"
                  className="w-full sm:w-auto px-4 min-[360px]:px-6 sm:px-7 py-3.5 rounded-2xl bg-white text-slate-900 font-heading font-bold text-[13px] min-[360px]:text-sm tracking-tight sm:tracking-normal sm:whitespace-nowrap shadow-md hover:bg-slate-50 hover:shadow-lg active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 text-center"
                >
                  <span className="md:hidden">Agenda agora pelo app!</span>
                  <span className="hidden md:inline">Agendar agora sua consulta pelo app</span>
                  <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 9. FOOTER ================= */}
      <footer id="contato" className="border-t border-[#EFE9DF] bg-[#F8F5EE] py-14 px-4 text-xs text-slate-600">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Dados do Consultório e Ética */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-5 text-center sm:text-left text-slate-500">
            <div className="space-y-1">
              <p className="font-heading font-bold text-slate-800 text-sm">{clinicName}</p>
              <p className="text-[11px]">
                {professionalName} • {crpCrm}
              </p>
              <p className="text-[10px] text-slate-400 max-w-md leading-relaxed">
                Atendimento clínico respaldado pelos preceitos éticos do Conselho Federal de Psicologia.
              </p>
            </div>

            <div className="flex flex-col items-center sm:items-end gap-2 text-xs font-medium">
              <div className="flex flex-wrap justify-center sm:justify-end items-center gap-4">
                {publishedPageIds.has("privacy") && (
                  <Link href="/politica-de-privacidade" className="hover:text-[var(--primary)] hover:underline">
                    Política de Privacidade
                  </Link>
                )}
                {publishedPageIds.has("terms") && (
                  <Link href="/termos-de-uso" className="hover:text-[var(--primary)] hover:underline">
                    Termos de Uso
                  </Link>
                )}
                {publishedPageIds.has("lgpd") && (
                  <Link href="/protecao-de-dados" className="hover:text-[var(--primary)] hover:underline">
                    LGPD
                  </Link>
                )}
              </div>
              <div className="flex flex-wrap justify-center sm:justify-end items-center gap-4">
                {publishedPageIds.has("ethics") && (
                  <Link href="/etica-profissional" className="hover:text-[var(--primary)] hover:underline">
                    Ética Profissional
                  </Link>
                )}
                <CookiePreferencesTrigger />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#EFE9DF] text-center text-[10px] text-slate-400">
            &copy; {new Date().getFullYear()} {clinicName}. Todos os direitos reservados. Software de Gestão Clínica PSI — Instalação Standalone Dedicada.
          </div>
        </div>
      </footer>

      {/* ================= CONTROLES FLUTUANTES (WHATSAPP + VOLTAR AO TOPO) ================= */}
      <MiniSiteFloatingControls
        whatsappUrl={whatsappUrl}
        showFloatingWhatsApp={Boolean(site?.showFloatingWhatsApp !== false && whatsappUrl)}
      />

      {/* ================= BANNER DE CONSENTIMENTO DE COOKIES ================= */}
      <CookieBanner />

      {/* ================= CONTROLADOR DE ANIMAÇÃO GSAP (MINISITE) ================= */}
      <MiniSiteMotionController />
    </div>
  );
}
