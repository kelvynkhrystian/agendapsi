"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import {
  THEME_PRESETS,
  calculateContrastRatio,
  isContrastAccessible,
  normalizeHexColor,
  resolveAccessibleButtonBg,
} from "@/lib/theme-presets";
import { MiniSiteMediaSlotCard } from "@/components/admin/minisite-media-slot-card";
import {
  Palette,
  Video,
  ShieldCheck,
  Save,
  RotateCcw,
  Upload,
  Check,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Info,
  Activity,
  Link2,
  Unlink,
  Calendar,
  Film,
  UserCircle,
  User,
  Building2,
  Lock,
  MessageCircle,
  Sparkles,
} from "lucide-react";

interface VideoProviderItem {
  key: "JITSI" | "PEERJS" | "GOOGLE_MEET";
  name: string;
  description: string;
  status: string;
  isFunctional: boolean;
  isActive: boolean;
  config: Record<string, any>;
}

interface ThemeDraftColors {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  buttonColor: string;
  backgroundColor: string;
  textColor: string;
}

interface ThemeSnapshot extends ThemeDraftColors {
  themeName: string;
}

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

function isValidHex6(value: string): boolean {
  return HEX_COLOR_PATTERN.test((value || "").trim());
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    "profile" | "appearance" | "video" | "security"
  >("profile");

  // Profile State — Seção A (Dados da Aplicação)
  const [clinicName, setClinicName] = useState("");
  const [tagline, setTagline] = useState("");
  const [appVersion, setAppVersion] = useState("1.0.0");
  const [savedAppSection, setSavedAppSection] = useState({ clinicName: "", tagline: "" });
  const [isSavingApp, setIsSavingApp] = useState(false);
  const [appFeedback, setAppFeedback] = useState<string | null>(null);
  const [appError, setAppError] = useState<string | null>(null);

  // Profile State — Seção B (Dados do Administrador / Profissional)
  const [fullName, setFullName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [crpCrm, setCrpCrm] = useState("");
  const [title, setTitle] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [savedProfSection, setSavedProfSection] = useState({
    fullName: "",
    displayName: "",
    crpCrm: "",
    title: "",
  });
  const [isSavingProf, setIsSavingProf] = useState(false);
  const [profFeedback, setProfFeedback] = useState<string | null>(null);
  const [profError, setProfError] = useState<string | null>(null);

  // Profile State — Seção C (Contatos e Redes Sociais)
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [instagram, setInstagram] = useState("");
  const [savedContactSection, setSavedContactSection] = useState({
    whatsappNumber: "",
    phone: "",
    email: "",
    instagram: "",
  });
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [contactFeedback, setContactFeedback] = useState<string | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);

  // Appearance Theme State (Rascunho isolado do salvo)
  const [themeName, setThemeName] = useState<string>("VERDE");
  const [primaryColor, setPrimaryColor] = useState("#16A34A");
  const [secondaryColor, setSecondaryColor] = useState("#DCFCE7");
  const [accentColor, setAccentColor] = useState("#86EFAC");
  const [buttonColor, setButtonColor] = useState("#16A34A");
  const [backgroundColor, setBackgroundColor] = useState("#F0FDF4");
  const [textColor, setTextColor] = useState("#14532D");
  const [savedTheme, setSavedTheme] = useState<ThemeSnapshot>({
    themeName: "VERDE",
    primaryColor: "#16A34A",
    secondaryColor: "#DCFCE7",
    accentColor: "#86EFAC",
    buttonColor: "#16A34A",
    backgroundColor: "#F0FDF4",
    textColor: "#14532D",
  });
  const [lastBasePreset, setLastBasePreset] = useState<string>("VERDE");
  const [customDraftState, setCustomDraftState] = useState<{
    baseKey: string;
    colors: ThemeDraftColors;
  } | null>(null);
  const [isSavingTheme, setIsSavingTheme] = useState(false);
  const [themeFeedback, setThemeFeedback] = useState<string | null>(null);
  const [themeError, setThemeError] = useState<string | null>(null);

  // System Images State (Card independente)
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoHorizontalUrl, setLogoHorizontalUrl] = useState<string | null>(null);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const [savedImagesSection, setSavedImagesSection] = useState<{
    logoUrl: string | null;
    logoHorizontalUrl: string | null;
    faviconUrl: string | null;
  }>({ logoUrl: null, logoHorizontalUrl: null, faviconUrl: null });
  const [isSavingImages, setIsSavingImages] = useState(false);
  const [imagesFeedback, setImagesFeedback] = useState<string | null>(null);
  const [imagesError, setImagesError] = useState<string | null>(null);
  const [uploadingAsset, setUploadingAsset] = useState<string | null>(null);

  // MiniSite Media Slots State (Hero Desktop, Hero Mobile, Sobre Mim)
  const [heroMediaType, setHeroMediaType] = useState<string>("IMAGE");
  const [heroMediaUrl, setHeroMediaUrl] = useState<string | null>(null);
  const [heroPosterUrl, setHeroPosterUrl] = useState<string | null>(null);
  const [heroFps, setHeroFps] = useState<number>(24);
  const [heroPlaybackSpeed, setHeroPlaybackSpeed] = useState<number>(1);
  const [heroLoop, setHeroLoop] = useState<boolean>(true);
  const [heroAutoplay, setHeroAutoplay] = useState<boolean>(true);
  const [heroPlaybackMode, setHeroPlaybackMode] = useState<string>("AUTOMATIC");
  const [heroPlaybackDirection, setHeroPlaybackDirection] = useState<string>("FORWARD");
  const [heroPositioning, setHeroPositioning] = useState<string>("center");
  const [heroFrameCount, setHeroFrameCount] = useState<number>(0);
  const [heroFrames, setHeroFrames] = useState<string[]>([]);
  const [heroBgMode, setHeroBgMode] = useState<"AUTO" | "MANUAL">("AUTO");
  const [heroBgDetectedColor, setHeroBgDetectedColor] = useState<string | null>(null);
  const [heroBgCustomColor, setHeroBgCustomColor] = useState<string>("#FAF7F2");
  const [heroBgStatus, setHeroBgStatus] = useState<string>("IDLE");
  const [heroBgMediaRef, setHeroBgMediaRef] = useState<string | null>(null);

  const [heroMobileMediaType, setHeroMobileMediaType] = useState<string>("IMAGE");
  const [heroMobileMediaUrl, setHeroMobileMediaUrl] = useState<string | null>(null);
  const [heroMobilePosterUrl, setHeroMobilePosterUrl] = useState<string | null>(null);
  const [heroMobileFps, setHeroMobileFps] = useState<number>(24);
  const [heroMobilePlaybackSpeed, setHeroMobilePlaybackSpeed] = useState<number>(1);
  const [heroMobileLoop, setHeroMobileLoop] = useState<boolean>(true);
  const [heroMobileAutoplay, setHeroMobileAutoplay] = useState<boolean>(true);
  const [heroMobilePlaybackMode, setHeroMobilePlaybackMode] = useState<string>("AUTOMATIC");
  const [heroMobilePlaybackDirection, setHeroMobilePlaybackDirection] = useState<string>("FORWARD");
  const [heroMobilePositioning, setHeroMobilePositioning] = useState<string>("center");
  const [heroMobileFrameCount, setHeroMobileFrameCount] = useState<number>(0);
  const [heroMobileFrames, setHeroMobileFrames] = useState<string[]>([]);
  const [heroMobileBgDetectedColor, setHeroMobileBgDetectedColor] = useState<string | null>(null);
  const [heroMobileBgStatus, setHeroMobileBgStatus] = useState<string>("IDLE");
  const [heroMobileBgMediaRef, setHeroMobileBgMediaRef] = useState<string | null>(null);

  const [aboutMediaType, setAboutMediaType] = useState<string>("IMAGE");
  const [aboutMediaUrl, setAboutMediaUrl] = useState<string | null>(null);
  const [aboutPosterUrl, setAboutPosterUrl] = useState<string | null>(null);
  const [aboutFps, setAboutFps] = useState<number>(24);
  const [aboutPlaybackSpeed, setAboutPlaybackSpeed] = useState<number>(1);
  const [aboutLoop, setAboutLoop] = useState<boolean>(true);
  const [aboutAutoplay, setAboutAutoplay] = useState<boolean>(true);
  const [aboutPlaybackMode, setAboutPlaybackMode] = useState<string>("AUTOMATIC");
  const [aboutPlaybackDirection, setAboutPlaybackDirection] = useState<string>("FORWARD");
  const [aboutPositioning, setAboutPositioning] = useState<string>("center");
  const [aboutFrameCount, setAboutFrameCount] = useState<number>(0);
  const [aboutFrames, setAboutFrames] = useState<string[]>([]);

  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [mediaFeedback, setMediaFeedback] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [isSavingMedia, setIsSavingMedia] = useState<boolean>(false);
  const [savedMediaSnapshot, setSavedMediaSnapshot] = useState<string>("");

  const pendingHeroColorRef = useRef<Promise<string | null> | null>(null);
  const pendingHeroMobileColorRef = useRef<Promise<string | null> | null>(null);
  const abandonedMediaUrlsRef = useRef<Set<string>>(new Set());
  const abandonedImageUrlsRef = useRef<Set<string>>(new Set());

  const trackAbandonedUrls = (targetRef: React.MutableRefObject<Set<string>>, ...urls: Array<string | null | undefined>) => {
    for (const url of urls) {
      if (typeof url === "string" && url.trim().length > 0) {
        targetRef.current.add(url.trim());
      }
    }
  };

  // Video Providers State (Task 9)
  const [videoProviders, setVideoProviders] = useState<VideoProviderItem[]>([]);
  const [activeVideoKey, setActiveVideoKey] = useState<string>("JITSI");
  const [jitsiDomain, setJitsiDomain] = useState("meet.jit.si");
  const [isTestingJitsi, setIsTestingJitsi] = useState(false);
  const [jitsiTestFeedback, setJitsiTestFeedback] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [peerJsHost, setPeerJsHost] = useState("");
  const [peerJsPort, setPeerJsPort] = useState(9000);
  const [peerJsPath, setPeerJsPath] = useState("/peerjs");
  const [peerJsSecure, setPeerJsSecure] = useState(false);
  const [peerJsStunServer, setPeerJsStunServer] = useState("stun:stun.l.google.com:19302");
  const [peerJsTurnServer, setPeerJsTurnServer] = useState("");
  const [peerJsTurnUser, setPeerJsTurnUser] = useState("");
  const [peerJsTurnSecret, setPeerJsTurnSecret] = useState("");
  const [isTestingPeerJs, setIsTestingPeerJs] = useState(false);
  const [peerJsTestFeedback, setPeerJsTestFeedback] = useState<{
    success: boolean;
    message: string;
    date?: string;
  } | null>(null);
  const [googleMeetClientId, setGoogleMeetClientId] = useState("");
  const [googleMeetClientSecret, setGoogleMeetClientSecret] = useState("");
  const [googleMeetAccountEmail, setGoogleMeetAccountEmail] = useState<string | null>(null);
  const [googleMeetConnectedAt, setGoogleMeetConnectedAt] = useState<string | null>(null);
  const [googleMeetStatus, setGoogleMeetStatus] = useState<string | null>(null);
  const [isTestingGoogleMeet, setIsTestingGoogleMeet] = useState(false);
  const [isDisconnectingGoogle, setIsDisconnectingGoogle] = useState(false);
  const [googleMeetFeedback, setGoogleMeetFeedback] = useState<{
    success: boolean;
    message: string;
    meetUrl?: string;
  } | null>(null);
  const [isSavingVideo, setIsSavingVideo] = useState(false);
  const [videoFeedback, setVideoFeedback] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [savedVideoSnapshot, setSavedVideoSnapshot] = useState<string>("");

  // Security / Technical State
  const [copiedUrl, setCopiedUrl] = useState(false);

  const [isLoading, setIsLoading] = useState(true);

  // Monitora parâmetro ?tab= na URL para navegação direta entre abas
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (
        tabParam &&
        ["profile", "appearance", "video", "security"].includes(tabParam)
      ) {
        setActiveTab(tabParam as any);
      }
    }
  }, []);

  const buildSiteMediaSnapshot = (params: {
    heroMediaType: string;
    heroMediaUrl: string | null;
    heroPosterUrl: string | null;
    heroPlaybackSpeed: number;
    heroBgMode: string;
    heroBgDetectedColor: string | null;
    heroBgCustomColor: string;
    heroBgMediaRef: string | null;
    heroMobileMediaType: string;
    heroMobileMediaUrl: string | null;
    heroMobilePosterUrl: string | null;
    heroMobilePlaybackSpeed: number;
    heroMobileBgDetectedColor: string | null;
    heroMobileBgMediaRef: string | null;
    aboutMediaType: string;
    aboutMediaUrl: string | null;
    aboutPosterUrl: string | null;
    aboutPlaybackSpeed: number;
  }) => JSON.stringify(params);

  const buildVideoSnapshot = (params: {
    activeVideoKey: string;
    jitsiDomain: string;
    peerJsHost: string;
    peerJsPort: number;
    peerJsPath: string;
    peerJsSecure: boolean;
    peerJsStunServer: string;
    peerJsTurnServer: string;
    peerJsTurnUser: string;
    peerJsTurnSecret: string;
    googleMeetClientId: string;
    googleMeetClientSecret: string;
  }) => JSON.stringify(params);

  const syncLiveLightThemeCss = (snapshot: ThemeSnapshot) => {
    if (typeof document === "undefined") return;
    const primary = normalizeHexColor(snapshot.primaryColor, "#16A34A");
    const secondary = normalizeHexColor(snapshot.secondaryColor, "#DCFCE7");
    const accent = normalizeHexColor(snapshot.accentColor, "#86EFAC");
    const rawButton = normalizeHexColor(snapshot.buttonColor || primary, primary);
    const accessibleBtn = resolveAccessibleButtonBg(rawButton, 4.6);
    const bg = normalizeHexColor(snapshot.backgroundColor, "#F0FDF4");
    const txt = normalizeHexColor(snapshot.textColor, "#14532D");
    const primaryFg = calculateContrastRatio("#ffffff", primary) >= 4.5 ? "#ffffff" : "#111111";

    let styleEl = document.getElementById("psi-live-theme-vars") as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "psi-live-theme-vars";
      document.head.appendChild(styleEl);
    }
    const darkAccentVivid = primary.toUpperCase() === "#525252" ? "#EA580C" : primary;
    const darkAccentSafe = resolveAccessibleButtonBg(darkAccentVivid, 4.6);

    // Propaga acentos ativos no Modo Claro e no Modo Escuro preservando superfícies matte do Dark Mode
    styleEl.textContent = `
      :root:not(.dark):not([data-theme="dark"]) {
        --primary: ${primary};
        --primary-foreground: ${primaryFg};
        --secondary: ${secondary};
        --accent: ${accent};
        --button-bg: ${accessibleBtn};
        --button-fg: #ffffff;
        --button-secondary-bg: #ffffff;
        --button-secondary-fg: ${accessibleBtn};
        --button-outline-bg: #ffffff;
        --button-outline-fg: ${accessibleBtn};
        --button-ghost-bg: transparent;
        --button-ghost-fg: ${accessibleBtn};
        --ring: ${primary};
        --theme-bg: ${bg};
        --theme-text: ${txt};
        --color-primary: ${primary};
        --color-primary-hover: ${accessibleBtn};
        --color-secondary: ${secondary};
        --color-accent: ${accent};
        --color-background: ${bg};
        --color-text: ${txt};
      }
      .dark,
      [data-theme="dark"] {
        --primary: ${darkAccentVivid};
        --button-bg: ${darkAccentSafe};
        --button-hover: ${darkAccentVivid};
        --dark-accent: ${darkAccentSafe};
        --dark-accent-vivid: ${darkAccentVivid};
        --ring: ${darkAccentVivid};
        --color-primary: ${darkAccentVivid};
        --color-primary-hover: ${darkAccentSafe};
      }
    `;
  };

  // Carrega dados das APIs
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [appRes, vidRes, mediaRes, profRes] = await Promise.all([
        fetch("/api/admin/appearance"),
        fetch("/api/admin/video-providers"),
        fetch("/api/admin/minisite/media/settings"),
        fetch("/api/admin/profile"),
      ]);

      if (profRes && profRes.ok) {
        const profData = await profRes.json();
        if (profData.application) {
          const nextClinicName = profData.application.clinicName || "";
          const nextTagline = profData.application.tagline || "";
          setClinicName(nextClinicName);
          setTagline(nextTagline);
          setAppVersion(profData.application.appVersion || "1.0.0");
          setSavedAppSection({ clinicName: nextClinicName, tagline: nextTagline });
        }
        if (profData.professional) {
          const nextFullName = profData.professional.fullName || "";
          const nextDisplayName = profData.professional.displayName || "";
          const nextCrpCrm = profData.professional.crpCrm || "";
          const nextTitle = profData.professional.title || "";
          setFullName(nextFullName);
          setDisplayName(nextDisplayName);
          setCrpCrm(nextCrpCrm);
          setTitle(nextTitle);
          setAdminEmail(profData.professional.adminEmail || "");
          setSavedProfSection({
            fullName: nextFullName,
            displayName: nextDisplayName,
            crpCrm: nextCrpCrm,
            title: nextTitle,
          });
        }
        if (profData.contact) {
          const nextWhatsapp = profData.contact.whatsappNumber || "";
          const nextPhone = profData.contact.phone || "";
          const nextEmail = profData.contact.email || "";
          const nextInstagram = profData.contact.instagram || "";
          setWhatsappNumber(nextWhatsapp);
          setPhone(nextPhone);
          setEmail(nextEmail);
          setInstagram(nextInstagram);
          setSavedContactSection({
            whatsappNumber: nextWhatsapp,
            phone: nextPhone,
            email: nextEmail,
            instagram: nextInstagram,
          });
        }
      }

      if (appRes.ok) {
        const appData = await appRes.json();
        const loadedThemeName = appData.themeName || "VERDE";
        const loadedPrimary = appData.primaryColor || "#16A34A";
        const loadedSecondary = appData.secondaryColor || "#DCFCE7";
        const loadedAccent = appData.accentColor || "#86EFAC";
        const loadedButton = appData.buttonColor || loadedPrimary;
        const loadedBg = appData.backgroundColor || "#F0FDF4";
        const loadedText = appData.textColor || "#14532D";

        const loadedTheme: ThemeSnapshot = {
          themeName: loadedThemeName,
          primaryColor: loadedPrimary,
          secondaryColor: loadedSecondary,
          accentColor: loadedAccent,
          buttonColor: loadedButton,
          backgroundColor: loadedBg,
          textColor: loadedText,
        };

        setThemeName(loadedThemeName);
        setPrimaryColor(loadedPrimary);
        setSecondaryColor(loadedSecondary);
        setAccentColor(loadedAccent);
        setButtonColor(loadedButton);
        setBackgroundColor(loadedBg);
        setTextColor(loadedText);
        setSavedTheme(loadedTheme);

        if (loadedThemeName !== "PERSONALIZADO" && THEME_PRESETS[loadedThemeName]) {
          setLastBasePreset(loadedThemeName);
          setCustomDraftState(null);
        } else {
          setLastBasePreset("VERDE");
          setCustomDraftState({
            baseKey: "__SAVED_CUSTOM__",
            colors: {
              primaryColor: loadedPrimary,
              secondaryColor: loadedSecondary,
              accentColor: loadedAccent,
              buttonColor: loadedButton,
              backgroundColor: loadedBg,
              textColor: loadedText,
            },
          });
        }

        const nextLogo = appData.logoUrl || null;
        const nextLogoH = appData.logoHorizontalUrl || null;
        const nextFav = appData.faviconUrl || null;
        setLogoUrl(nextLogo);
        setLogoHorizontalUrl(nextLogoH);
        setFaviconUrl(nextFav);
        setSavedImagesSection({
          logoUrl: nextLogo,
          logoHorizontalUrl: nextLogoH,
          faviconUrl: nextFav,
        });
      }

      if (mediaRes && mediaRes.ok) {
        const mediaData = await mediaRes.json();
        const nextHeroType = mediaData.hero?.mediaType || "IMAGE";
        const nextHeroUrl = mediaData.hero?.mediaUrl || null;
        const nextHeroPoster = mediaData.hero?.posterUrl || null;
        const nextHeroSpeed = mediaData.hero?.playbackSpeed ?? 1;
        const nextHeroBgMode = mediaData.hero?.bgMode === "MANUAL" ? "MANUAL" : "AUTO";
        const nextHeroBgDetected = mediaData.hero?.bgDetectedColor || null;
        const nextHeroBgCustom = mediaData.hero?.bgCustomColor || "#FAF7F2";
        const nextHeroBgRef = mediaData.hero?.bgMediaRef || null;

        if (mediaData.hero) {
          setHeroMediaType(nextHeroType);
          setHeroMediaUrl(nextHeroUrl);
          setHeroPosterUrl(nextHeroPoster);
          setHeroFps(mediaData.hero.fps ?? 24);
          setHeroPlaybackSpeed(nextHeroSpeed);
          setHeroLoop(mediaData.hero.loop ?? true);
          setHeroAutoplay(mediaData.hero.autoplay ?? true);
          setHeroPlaybackMode(mediaData.hero.playbackMode || "AUTOMATIC");
          setHeroPlaybackDirection(mediaData.hero.playbackDirection || "FORWARD");
          setHeroPositioning(mediaData.hero.positioning || "center");
          setHeroFrameCount(mediaData.hero.frameCount ?? 0);
          setHeroFrames(mediaData.hero.frames || []);
          setHeroBgMode(nextHeroBgMode);
          setHeroBgDetectedColor(nextHeroBgDetected);
          setHeroBgCustomColor(nextHeroBgCustom);
          setHeroBgStatus(mediaData.hero.bgStatus || "IDLE");
          setHeroBgMediaRef(nextHeroBgRef);
        }

        const nextMobType = mediaData.heroMobile?.mediaType || "IMAGE";
        const nextMobUrl = mediaData.heroMobile?.mediaUrl || null;
        const nextMobPoster = mediaData.heroMobile?.posterUrl || null;
        const nextMobSpeed = mediaData.heroMobile?.playbackSpeed ?? 1;
        const nextMobBgDetected = mediaData.heroMobile?.bgDetectedColor || null;
        const nextMobBgRef = mediaData.heroMobile?.bgMediaRef || null;

        if (mediaData.heroMobile) {
          setHeroMobileMediaType(nextMobType);
          setHeroMobileMediaUrl(nextMobUrl);
          setHeroMobilePosterUrl(nextMobPoster);
          setHeroMobileFps(mediaData.heroMobile.fps ?? 24);
          setHeroMobilePlaybackSpeed(nextMobSpeed);
          setHeroMobileLoop(mediaData.heroMobile.loop ?? true);
          setHeroMobileAutoplay(mediaData.heroMobile.autoplay ?? true);
          setHeroMobilePlaybackMode(mediaData.heroMobile.playbackMode || "AUTOMATIC");
          setHeroMobilePlaybackDirection(mediaData.heroMobile.playbackDirection || "FORWARD");
          setHeroMobilePositioning(mediaData.heroMobile.positioning || "center");
          setHeroMobileFrameCount(mediaData.heroMobile.frameCount ?? 0);
          setHeroMobileFrames(mediaData.heroMobile.frames || []);
          setHeroMobileBgDetectedColor(nextMobBgDetected);
          setHeroMobileBgStatus(mediaData.heroMobile.bgStatus || "IDLE");
          setHeroMobileBgMediaRef(nextMobBgRef);
        }

        const nextAboutType = mediaData.about?.mediaType || "IMAGE";
        const nextAboutUrl = mediaData.about?.mediaUrl || null;
        const nextAboutPoster = mediaData.about?.posterUrl || null;
        const nextAboutSpeed = mediaData.about?.playbackSpeed ?? 1;

        if (mediaData.about) {
          setAboutMediaType(nextAboutType);
          setAboutMediaUrl(nextAboutUrl);
          setAboutPosterUrl(nextAboutPoster);
          setAboutFps(mediaData.about.fps ?? 24);
          setAboutPlaybackSpeed(nextAboutSpeed);
          setAboutLoop(mediaData.about.loop ?? true);
          setAboutAutoplay(mediaData.about.autoplay ?? true);
          setAboutPlaybackMode(mediaData.about.playbackMode || "AUTOMATIC");
          setAboutPlaybackDirection(mediaData.about.playbackDirection || "FORWARD");
          setAboutPositioning(mediaData.about.positioning || "center");
          setAboutFrameCount(mediaData.about.frameCount ?? 0);
          setAboutFrames(mediaData.about.frames || []);
        }

        setSavedMediaSnapshot(
          buildSiteMediaSnapshot({
            heroMediaType: nextHeroType,
            heroMediaUrl: nextHeroUrl,
            heroPosterUrl: nextHeroPoster,
            heroPlaybackSpeed: nextHeroSpeed,
            heroBgMode: nextHeroBgMode,
            heroBgDetectedColor: nextHeroBgDetected,
            heroBgCustomColor: nextHeroBgCustom,
            heroBgMediaRef: nextHeroBgRef,
            heroMobileMediaType: nextMobType,
            heroMobileMediaUrl: nextMobUrl,
            heroMobilePosterUrl: nextMobPoster,
            heroMobilePlaybackSpeed: nextMobSpeed,
            heroMobileBgDetectedColor: nextMobBgDetected,
            heroMobileBgMediaRef: nextMobBgRef,
            aboutMediaType: nextAboutType,
            aboutMediaUrl: nextAboutUrl,
            aboutPosterUrl: nextAboutPoster,
            aboutPlaybackSpeed: nextAboutSpeed,
          })
        );
      }

      if (vidRes.ok) {
        const vidData = await vidRes.json();
        setVideoProviders(vidData.providers || []);
        const nextActiveVideo = vidData.activeVideoProvider || "JITSI";
        setActiveVideoKey(nextActiveVideo);
        const jitsi = vidData.providers?.find((p: any) => p.key === "JITSI");
        const nextJitsiDomain = jitsi?.config?.domain || "meet.jit.si";
        if (jitsi) setJitsiDomain(nextJitsiDomain);
        const peer = vidData.providers?.find((p: any) => p.key === "PEERJS");
        const nextPeerHost = peer?.config?.host || "";
        const nextPeerPort = peer?.config?.port || 9000;
        const nextPeerPath = peer?.config?.path || "/peerjs";
        const nextPeerSecure = peer?.config?.secure ?? false;
        const nextPeerStun = peer?.config?.stunServer || "stun:stun.l.google.com:19302";
        const nextPeerTurn = peer?.config?.turnServer || "";
        const nextPeerUser = peer?.config?.turnUser || "";
        const nextPeerSecret = peer?.config?.turnSecret || "";
        if (peer) {
          setPeerJsHost(nextPeerHost);
          setPeerJsPort(nextPeerPort);
          setPeerJsPath(nextPeerPath);
          setPeerJsSecure(nextPeerSecure);
          setPeerJsStunServer(nextPeerStun);
          setPeerJsTurnServer(nextPeerTurn);
          setPeerJsTurnUser(nextPeerUser);
          setPeerJsTurnSecret(nextPeerSecret);
          if (peer.config?.lastTestedAt) {
            setPeerJsTestFeedback({
              success: peer.config?.testStatus === "SUCCESS",
              message:
                peer.config?.testStatus === "SUCCESS"
                  ? "Servidor de sinalização operacional e verificado."
                  : "Último teste de sinalização falhou.",
              date: peer.config?.lastTestedAt,
            });
          }
        }
        const gmeet = vidData.providers?.find((p: any) => p.key === "GOOGLE_MEET");
        const nextGmeetId = gmeet?.config?.clientId || "";
        const nextGmeetSecret = gmeet?.config?.clientSecret || "";
        if (gmeet) {
          setGoogleMeetClientId(nextGmeetId);
          setGoogleMeetClientSecret(nextGmeetSecret);
          setGoogleMeetAccountEmail(gmeet.config?.accountEmail || null);
          setGoogleMeetConnectedAt(gmeet.config?.connectedAt || null);
          setGoogleMeetStatus(gmeet.status || gmeet.config?.status || null);
        }

        setSavedVideoSnapshot(
          buildVideoSnapshot({
            activeVideoKey: nextActiveVideo,
            jitsiDomain: nextJitsiDomain,
            peerJsHost: nextPeerHost,
            peerJsPort: nextPeerPort,
            peerJsPath: nextPeerPath,
            peerJsSecure: nextPeerSecure,
            peerJsStunServer: nextPeerStun,
            peerJsTurnServer: nextPeerTurn,
            peerJsTurnUser: nextPeerUser,
            peerJsTurnSecret: nextPeerSecret,
            googleMeetClientId: nextGmeetId,
            googleMeetClientSecret: nextGmeetSecret,
          })
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Estados de alteração (dirty-check) independentes por seção
  const isAppDirty =
    clinicName !== savedAppSection.clinicName || tagline !== savedAppSection.tagline;

  const isProfDirty =
    fullName !== savedProfSection.fullName ||
    displayName !== savedProfSection.displayName ||
    crpCrm !== savedProfSection.crpCrm ||
    title !== savedProfSection.title;

  const isContactDirty =
    whatsappNumber !== savedContactSection.whatsappNumber ||
    phone !== savedContactSection.phone ||
    email !== savedContactSection.email ||
    instagram !== savedContactSection.instagram;

  const isThemeDirty =
    themeName !== savedTheme.themeName ||
    normalizeHexColor(primaryColor, primaryColor) !== normalizeHexColor(savedTheme.primaryColor, savedTheme.primaryColor) ||
    normalizeHexColor(secondaryColor, secondaryColor) !== normalizeHexColor(savedTheme.secondaryColor, savedTheme.secondaryColor) ||
    normalizeHexColor(accentColor, accentColor) !== normalizeHexColor(savedTheme.accentColor, savedTheme.accentColor) ||
    normalizeHexColor(buttonColor, buttonColor) !== normalizeHexColor(savedTheme.buttonColor, savedTheme.buttonColor) ||
    normalizeHexColor(backgroundColor, backgroundColor) !== normalizeHexColor(savedTheme.backgroundColor, savedTheme.backgroundColor) ||
    normalizeHexColor(textColor, textColor) !== normalizeHexColor(savedTheme.textColor, savedTheme.textColor);

  const isImagesDirty =
    logoUrl !== savedImagesSection.logoUrl ||
    logoHorizontalUrl !== savedImagesSection.logoHorizontalUrl ||
    faviconUrl !== savedImagesSection.faviconUrl;

  const currentMediaSnapshot = buildSiteMediaSnapshot({
    heroMediaType,
    heroMediaUrl,
    heroPosterUrl,
    heroPlaybackSpeed,
    heroBgMode,
    heroBgDetectedColor,
    heroBgCustomColor,
    heroBgMediaRef,
    heroMobileMediaType,
    heroMobileMediaUrl,
    heroMobilePosterUrl,
    heroMobilePlaybackSpeed,
    heroMobileBgDetectedColor,
    heroMobileBgMediaRef,
    aboutMediaType,
    aboutMediaUrl,
    aboutPosterUrl,
    aboutPlaybackSpeed,
  });
  const isMediaDirty = savedMediaSnapshot !== "" && currentMediaSnapshot !== savedMediaSnapshot;

  const currentVideoSnapshot = buildVideoSnapshot({
    activeVideoKey,
    jitsiDomain,
    peerJsHost,
    peerJsPort,
    peerJsPath,
    peerJsSecure,
    peerJsStunServer,
    peerJsTurnServer,
    peerJsTurnUser,
    peerJsTurnSecret,
    googleMeetClientId,
    googleMeetClientSecret,
  });
  const isVideoDirty = savedVideoSnapshot !== "" && currentVideoSnapshot !== savedVideoSnapshot;

  // Upload de Asset de Imagens do Sistema
  const handleUploadAsset = async (assetType: "logo" | "logoHorizontal" | "favicon", file: File) => {
    setUploadingAsset(assetType);
    setImagesFeedback(null);
    setImagesError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("assetType", assetType);

    try {
      const res = await fetch("/api/admin/appearance/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setImagesError(data.error || "Erro no upload do arquivo.");
      } else {
        if (assetType === "logo") {
          trackAbandonedUrls(abandonedImageUrlsRef, logoUrl);
          setLogoUrl(data.url);
        }
        if (assetType === "logoHorizontal") {
          trackAbandonedUrls(abandonedImageUrlsRef, logoHorizontalUrl);
          setLogoHorizontalUrl(data.url);
        }
        if (assetType === "favicon") {
          trackAbandonedUrls(abandonedImageUrlsRef, faviconUrl);
          setFaviconUrl(data.url);
        }
        setImagesFeedback('Arquivo enviado na prévia. Clique em "Salvar Alterações" abaixo para publicar.');
      }
    } catch {
      setImagesError("Erro de conexão no upload.");
    } finally {
      setUploadingAsset(null);
    }
  };

  // Seleção de Tema Pré-definido (apenas rascunho em memória até clicar em "Salvar Tema")
  const handleSelectThemePreset = (presetKey: string) => {
    setThemeFeedback(null);
    setThemeError(null);

    if (presetKey !== "PERSONALIZADO" && THEME_PRESETS[presetKey]) {
      const p = THEME_PRESETS[presetKey];
      setLastBasePreset(presetKey);
      setThemeName(presetKey);
      setPrimaryColor(p.primaryColor);
      setSecondaryColor(p.secondaryColor);
      setAccentColor(p.accentColor);
      setButtonColor(p.buttonColor);
      setBackgroundColor(p.backgroundColor);
      setTextColor(p.textColor);
      setCustomDraftState(null);
    }
  };

  // Seleção de "Personalizado" — inicializa a partir do último tema selecionado ou preserva edições em andamento
  const handleSelectCustomTheme = () => {
    setThemeFeedback(null);
    setThemeError(null);

    if (themeName === "PERSONALIZADO") {
      return;
    }

    if (
      customDraftState &&
      (customDraftState.baseKey === lastBasePreset || customDraftState.baseKey === "__SAVED_CUSTOM__")
    ) {
      setThemeName("PERSONALIZADO");
      setPrimaryColor(customDraftState.colors.primaryColor);
      setSecondaryColor(customDraftState.colors.secondaryColor);
      setAccentColor(customDraftState.colors.accentColor);
      setButtonColor(customDraftState.colors.buttonColor);
      setBackgroundColor(customDraftState.colors.backgroundColor);
      setTextColor(customDraftState.colors.textColor);
      return;
    }

    const basePalette = THEME_PRESETS[lastBasePreset] || THEME_PRESETS.VERDE;
    const initialized: ThemeDraftColors = {
      primaryColor: basePalette.primaryColor,
      secondaryColor: basePalette.secondaryColor,
      accentColor: basePalette.accentColor,
      buttonColor: basePalette.buttonColor,
      backgroundColor: basePalette.backgroundColor,
      textColor: basePalette.textColor,
    };

    setThemeName("PERSONALIZADO");
    setPrimaryColor(initialized.primaryColor);
    setSecondaryColor(initialized.secondaryColor);
    setAccentColor(initialized.accentColor);
    setButtonColor(initialized.buttonColor);
    setBackgroundColor(initialized.backgroundColor);
    setTextColor(initialized.textColor);
    setCustomDraftState({
      baseKey: lastBasePreset,
      colors: initialized,
    });
  };

  // Alteração individual de token dentro de "Cores Personalizadas" (apenas rascunho)
  const handleCustomColorChange = (
    field: "primaryColor" | "secondaryColor" | "accentColor" | "buttonColor" | "backgroundColor" | "textColor",
    value: string
  ) => {
    setThemeFeedback(null);
    setThemeError(null);
    setThemeName("PERSONALIZADO");

    if (field === "primaryColor") setPrimaryColor(value);
    if (field === "secondaryColor") setSecondaryColor(value);
    if (field === "accentColor") setAccentColor(value);
    if (field === "buttonColor") setButtonColor(value);
    if (field === "backgroundColor") setBackgroundColor(value);
    if (field === "textColor") setTextColor(value);

    const updatedColors: ThemeDraftColors = {
      primaryColor: field === "primaryColor" ? value : primaryColor,
      secondaryColor: field === "secondaryColor" ? value : secondaryColor,
      accentColor: field === "accentColor" ? value : accentColor,
      buttonColor: field === "buttonColor" ? value : buttonColor,
      backgroundColor: field === "backgroundColor" ? value : backgroundColor,
      textColor: field === "textColor" ? value : textColor,
    };
    setCustomDraftState({
      baseKey: customDraftState?.baseKey === "__SAVED_CUSTOM__" ? "__SAVED_CUSTOM__" : lastBasePreset,
      colors: updatedColors,
    });
  };

  // Salvamento independente — Perfil Seção A (Dados da Aplicação)
  const handleSaveAppSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingApp || !isAppDirty) return;
    setIsSavingApp(true);
    setAppFeedback(null);
    setAppError(null);

    try {
      const res = await fetch("/api/admin/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "application",
          clinicName,
          tagline,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAppError(data.error || "Erro ao salvar dados da aplicação.");
        return;
      }
      const nextClinic = data.application?.clinicName ?? clinicName;
      const nextTag = data.application?.tagline ?? tagline;
      setClinicName(nextClinic);
      setTagline(nextTag);
      setSavedAppSection({ clinicName: nextClinic, tagline: nextTag });
      setAppFeedback(data.message || "Dados da aplicação atualizados com sucesso.");
      router.refresh();
    } catch {
      setAppError("Erro de comunicação ao salvar dados da aplicação.");
    } finally {
      setIsSavingApp(false);
    }
  };

  // Salvamento independente — Perfil Seção B (Dados do Administrador / Profissional)
  const handleSaveProfSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingProf || !isProfDirty) return;
    setIsSavingProf(true);
    setProfFeedback(null);
    setProfError(null);

    try {
      const res = await fetch("/api/admin/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "professional",
          fullName,
          displayName,
          crpCrm,
          title,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setProfError(data.error || "Erro ao salvar dados do profissional.");
        return;
      }
      const nextFull = data.professional?.fullName ?? fullName;
      const nextDisp = data.professional?.displayName ?? displayName;
      const nextCrp = data.professional?.crpCrm ?? crpCrm;
      const nextTitle = data.professional?.title ?? title;
      setFullName(nextFull);
      setDisplayName(nextDisp);
      setCrpCrm(nextCrp);
      setTitle(nextTitle);
      setSavedProfSection({
        fullName: nextFull,
        displayName: nextDisp,
        crpCrm: nextCrp,
        title: nextTitle,
      });
      setProfFeedback(data.message || "Dados do profissional atualizados com sucesso.");
      router.refresh();
    } catch {
      setProfError("Erro de comunicação ao salvar dados do profissional.");
    } finally {
      setIsSavingProf(false);
    }
  };

  // Salvamento independente — Perfil Seção C (Contatos e Redes Sociais)
  const handleSaveContactSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingContact || !isContactDirty) return;
    setIsSavingContact(true);
    setContactFeedback(null);
    setContactError(null);

    try {
      const res = await fetch("/api/admin/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "contact",
          whatsappNumber,
          phone,
          email,
          instagram,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setContactError(data.error || "Erro ao salvar contatos e redes sociais.");
        return;
      }
      const nextWpp = data.contact?.whatsappNumber ?? whatsappNumber;
      const nextPhone = data.contact?.phone ?? phone;
      const nextEmail = data.contact?.email ?? email;
      const nextInsta = data.contact?.instagram ?? instagram;
      setWhatsappNumber(nextWpp);
      setPhone(nextPhone);
      setEmail(nextEmail);
      setInstagram(nextInsta);
      setSavedContactSection({
        whatsappNumber: nextWpp,
        phone: nextPhone,
        email: nextEmail,
        instagram: nextInsta,
      });
      setContactFeedback(data.message || "Contatos e redes sociais atualizados com sucesso.");
      router.refresh();
    } catch {
      setContactError("Erro de comunicação ao salvar contatos.");
    } finally {
      setIsSavingContact(false);
    }
  };

  // Salvamento explícito apenas do Tema ao clicar em "Salvar Tema"
  const handleSaveTheme = async () => {
    if (isSavingTheme || !isThemeDirty) return;
    setThemeFeedback(null);
    setThemeError(null);

    let payload: ThemeSnapshot;

    if (themeName !== "PERSONALIZADO" && THEME_PRESETS[themeName]) {
      const p = THEME_PRESETS[themeName];
      payload = {
        themeName,
        primaryColor: p.primaryColor,
        secondaryColor: p.secondaryColor,
        accentColor: p.accentColor,
        buttonColor: p.buttonColor,
        backgroundColor: p.backgroundColor,
        textColor: p.textColor,
      };
    } else {
      const normPrimary = normalizeHexColor(primaryColor, "");
      const normSecondary = normalizeHexColor(secondaryColor, "");
      const normAccent = normalizeHexColor(accentColor, "");
      const normButton = normalizeHexColor(buttonColor, "");
      const normBg = normalizeHexColor(backgroundColor, "");
      const normText = normalizeHexColor(textColor, "");

      if (
        !isValidHex6(normPrimary) ||
        !isValidHex6(normSecondary) ||
        !isValidHex6(normAccent) ||
        !isValidHex6(normButton) ||
        !isValidHex6(normBg) ||
        !isValidHex6(normText)
      ) {
        setThemeError(
          "Informe códigos hexadecimais válidos (#RRGGBB) em todas as cores personalizadas antes de salvar."
        );
        return;
      }

      payload = {
        themeName: "PERSONALIZADO",
        primaryColor: normPrimary,
        secondaryColor: normSecondary,
        accentColor: normAccent,
        buttonColor: normButton,
        backgroundColor: normBg,
        textColor: normText,
      };
    }

    setIsSavingTheme(true);
    try {
      const res = await fetch("/api/admin/appearance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "theme",
          ...payload,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setThemeError(data.error || "Erro ao salvar tema.");
        return;
      }

      setPrimaryColor(payload.primaryColor);
      setSecondaryColor(payload.secondaryColor);
      setAccentColor(payload.accentColor);
      setButtonColor(payload.buttonColor);
      setBackgroundColor(payload.backgroundColor);
      setTextColor(payload.textColor);
      setSavedTheme(payload);
      if (payload.themeName === "PERSONALIZADO") {
        setCustomDraftState({
          baseKey: "__SAVED_CUSTOM__",
          colors: {
            primaryColor: payload.primaryColor,
            secondaryColor: payload.secondaryColor,
            accentColor: payload.accentColor,
            buttonColor: payload.buttonColor,
            backgroundColor: payload.backgroundColor,
            textColor: payload.textColor,
          },
        });
      }

      syncLiveLightThemeCss(payload);
      setThemeFeedback("Tema atualizado com sucesso.");
      router.refresh();
    } catch {
      setThemeError("Erro de comunicação ao salvar tema.");
    } finally {
      setIsSavingTheme(false);
    }
  };

  // Salvamento independente — Imagens do Sistema (Favicon, Logo, Banner PC)
  const handleSaveSystemImages = async () => {
    if (isSavingImages || !isImagesDirty || uploadingAsset !== null) return;
    setIsSavingImages(true);
    setImagesFeedback(null);
    setImagesError(null);

    try {
      const res = await fetch("/api/admin/appearance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "images",
          logoUrl,
          logoHorizontalUrl,
          faviconUrl,
          abandonedUrls: Array.from(abandonedImageUrlsRef.current),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setImagesError(data.error || "Erro ao salvar imagens do sistema.");
        return;
      }
      abandonedImageUrlsRef.current.clear();
      setSavedImagesSection({ logoUrl, logoHorizontalUrl, faviconUrl });
      setImagesFeedback("Imagens do sistema atualizadas com sucesso.");
      router.refresh();
    } catch {
      setImagesError("Erro de comunicação ao salvar imagens do sistema.");
    } finally {
      setIsSavingImages(false);
    }
  };

  // Extrai múltiplos quadros representativos de um vídeo no navegador para estimativa automática de cor de fundo
  const extractAndAnalyzeVideoFrames = (
    videoUrl: string,
    targetSlot: "hero" | "hero_mobile"
  ): Promise<string | null> => {
    const ref = targetSlot === "hero" ? pendingHeroColorRef : pendingHeroMobileColorRef;
    const previousValidColor =
      targetSlot === "hero" ? heroBgDetectedColor : heroMobileBgDetectedColor;

    const run = async (): Promise<string | null> => {
      if (typeof window === "undefined") return previousValidColor || "#FAF7F2";

      const video = document.createElement("video");
      video.crossOrigin = "anonymous";
      video.src = videoUrl;
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";

      try {
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            video.onloadeddata = null;
            video.onerror = null;
            resolve();
          }, 6000);

          video.onloadeddata = () => {
            clearTimeout(timeout);
            resolve();
          };
          video.onerror = () => {
            clearTimeout(timeout);
            resolve();
          };
        });

        const canvas = document.createElement("canvas");
        canvas.width = 120;
        canvas.height = 120;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return previousValidColor || "#FAF7F2";
        }

        const framesBase64: string[] = [];
        const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;

        if (duration > 0.3) {
          const fractions = [0.08, 0.28, 0.5, 0.72, 0.9];
          for (const frac of fractions) {
            const targetTime = Math.min(duration - 0.05, Math.max(0, duration * frac));
            await new Promise<void>((resolve) => {
              const seekTimeout = setTimeout(() => {
                video.onseeked = null;
                resolve();
              }, 1500);
              video.onseeked = () => {
                clearTimeout(seekTimeout);
                resolve();
              };
              try {
                video.currentTime = targetTime;
              } catch {
                clearTimeout(seekTimeout);
                resolve();
              }
            });
            try {
              ctx.clearRect(0, 0, 120, 120);
              ctx.drawImage(video, 0, 0, 120, 120);
              framesBase64.push(canvas.toDataURL("image/png"));
            } catch {
              // Ignora falha pontual de leitura em quadro isolado
            }
          }
        } else {
          try {
            ctx.drawImage(video, 0, 0, 120, 120);
            framesBase64.push(canvas.toDataURL("image/png"));
          } catch {}
        }

        if (framesBase64.length === 0) {
          const fallback = previousValidColor || "#FAF7F2";
          if (targetSlot === "hero") {
            setHeroBgDetectedColor(fallback);
            setHeroBgStatus("FALLBACK");
            setHeroBgMediaRef(videoUrl);
          } else {
            setHeroMobileBgDetectedColor(fallback);
            setHeroMobileBgStatus("FALLBACK");
            setHeroMobileBgMediaRef(videoUrl);
          }
          return fallback;
        }

        const res = await fetch("/api/admin/minisite/hero-color", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "analyze-frames",
            slot: targetSlot,
            framesBase64,
          }),
        });

        const resData = await res.json();
        const detected = resData.hex || resData.detectedColor || null;

        if (res.ok && detected) {
          if (targetSlot === "hero") {
            setHeroBgMode("AUTO");
            setHeroBgDetectedColor(detected);
            setHeroBgStatus(resData.status || "SUCCESS");
            setHeroBgMediaRef(videoUrl);
          } else {
            setHeroMobileBgDetectedColor(detected);
            setHeroMobileBgStatus(resData.status || "SUCCESS");
            setHeroMobileBgMediaRef(videoUrl);
          }
          return detected;
        }

        const fallback = previousValidColor || "#FAF7F2";
        if (targetSlot === "hero") {
          setHeroBgDetectedColor(fallback);
          setHeroBgStatus("FALLBACK");
          setHeroBgMediaRef(videoUrl);
        } else {
          setHeroMobileBgDetectedColor(fallback);
          setHeroMobileBgStatus("FALLBACK");
          setHeroMobileBgMediaRef(videoUrl);
        }
        return fallback;
      } catch (err) {
        console.warn("Não foi possível analisar quadros do vídeo:", err);
        const fallback = previousValidColor || "#FAF7F2";
        if (targetSlot === "hero") {
          setHeroBgDetectedColor(fallback);
          setHeroBgStatus("FALLBACK");
          setHeroBgMediaRef(videoUrl);
        } else {
          setHeroMobileBgDetectedColor(fallback);
          setHeroMobileBgStatus("FALLBACK");
          setHeroMobileBgMediaRef(videoUrl);
        }
        return fallback;
      } finally {
        video.removeAttribute("src");
        video.load();
      }
    };

    const promise = run().finally(() => {
      if (ref.current === promise) {
        ref.current = null;
      }
    });
    ref.current = promise;
    return promise;
  };

  // Restaura Aparência Padrão no rascunho (Verde Institucional PSI)
  const handleRestoreAppearanceDefaults = () => {
    const p = THEME_PRESETS.VERDE;
    setLastBasePreset("VERDE");
    setCustomDraftState(null);
    setThemeName("VERDE");
    setPrimaryColor(p.primaryColor);
    setSecondaryColor(p.secondaryColor);
    setAccentColor(p.accentColor);
    setButtonColor(p.buttonColor);
    setBackgroundColor(p.backgroundColor);
    setTextColor(p.textColor);
    setThemeError(null);
    setThemeFeedback('Paleta restaurada para o padrão do PSI (Verde) na prévia. Clique em "Salvar Tema" para aplicar.');
  };

  // Upload universal de mídia para as 3 áreas do Site (reconhecimento automático no servidor)
  const handleUploadSlotMedia = async (
    slot: "hero" | "hero_mobile" | "about",
    file: File
  ) => {
    setUploadingSlot(slot);
    setMediaFeedback(null);
    setMediaError(null);
    try {
      const formData = new FormData();
      formData.append("slot", slot);
      formData.append("file", file);

      const res = await fetch("/api/admin/minisite/media/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setMediaError(`Erro no upload: ${data.error}`);
        return;
      }

      const detectedType = data.mediaType as string;
      const areaLabel =
        slot === "hero"
          ? "Hero — Desktop"
          : slot === "hero_mobile"
          ? "Hero — Mobile"
          : "Sobre Mim";

      if (slot === "hero") {
        trackAbandonedUrls(
          abandonedMediaUrlsRef,
          heroMediaUrl,
          heroPosterUrl,
          heroBgMediaRef,
          ...heroFrames
        );
        setHeroMediaType(detectedType);
        setHeroPlaybackSpeed(1);
        setHeroLoop(true);
        setHeroAutoplay(true);
        setHeroBgMode("AUTO");

        if (detectedType === "FRAME_ANIMATION") {
          setHeroFrameCount(data.frameCount || 0);
          setHeroFrames(data.frames || []);
          setHeroPosterUrl(data.posterUrl || null);
          setHeroMediaUrl(data.frames?.[0] || null);
          const color = data.detectedBgColor || heroBgDetectedColor || "#FAF7F2";
          setHeroBgDetectedColor(color);
          setHeroBgStatus(data.detectedBgColor ? data.detectionStatus || "SUCCESS" : "FALLBACK");
          setHeroBgMediaRef(data.frames?.[0] || null);
        } else if (detectedType === "VIDEO") {
          setHeroFrames([]);
          setHeroFrameCount(0);
          setHeroMediaUrl(data.url);
          setHeroPosterUrl(data.url);
          if (data.url) {
            extractAndAnalyzeVideoFrames(data.url, "hero");
          }
        } else {
          setHeroFrames([]);
          setHeroFrameCount(0);
          setHeroMediaUrl(data.url);
          setHeroPosterUrl(data.url);
          const color = data.detectedBgColor || heroBgDetectedColor || "#FAF7F2";
          setHeroBgDetectedColor(color);
          setHeroBgStatus(data.detectedBgColor ? data.detectionStatus || "SUCCESS" : "FALLBACK");
          setHeroBgMediaRef(data.url || null);
        }
      } else if (slot === "hero_mobile") {
        trackAbandonedUrls(
          abandonedMediaUrlsRef,
          heroMobileMediaUrl,
          heroMobilePosterUrl,
          heroMobileBgMediaRef,
          ...heroMobileFrames
        );
        setHeroMobileMediaType(detectedType);
        setHeroMobilePlaybackSpeed(1);
        setHeroMobileLoop(true);
        setHeroMobileAutoplay(true);

        if (detectedType === "FRAME_ANIMATION") {
          setHeroMobileFrameCount(data.frameCount || 0);
          setHeroMobileFrames(data.frames || []);
          setHeroMobilePosterUrl(data.posterUrl || null);
          setHeroMobileMediaUrl(data.frames?.[0] || null);
          const color = data.detectedBgColor || heroMobileBgDetectedColor || "#FAF7F2";
          setHeroMobileBgDetectedColor(color);
          setHeroMobileBgStatus(data.detectedBgColor ? data.detectionStatus || "SUCCESS" : "FALLBACK");
          setHeroMobileBgMediaRef(data.frames?.[0] || null);
        } else if (detectedType === "VIDEO") {
          setHeroMobileFrames([]);
          setHeroMobileFrameCount(0);
          setHeroMobileMediaUrl(data.url);
          setHeroMobilePosterUrl(data.url);
          if (data.url) {
            extractAndAnalyzeVideoFrames(data.url, "hero_mobile");
          }
        } else {
          setHeroMobileFrames([]);
          setHeroMobileFrameCount(0);
          setHeroMobileMediaUrl(data.url);
          setHeroMobilePosterUrl(data.url);
          const color = data.detectedBgColor || heroMobileBgDetectedColor || "#FAF7F2";
          setHeroMobileBgDetectedColor(color);
          setHeroMobileBgStatus(data.detectedBgColor ? data.detectionStatus || "SUCCESS" : "FALLBACK");
          setHeroMobileBgMediaRef(data.url || null);
        }
      } else {
        trackAbandonedUrls(
          abandonedMediaUrlsRef,
          aboutMediaUrl,
          aboutPosterUrl,
          ...aboutFrames
        );
        setAboutMediaType(detectedType);
        setAboutPlaybackSpeed(1);
        setAboutLoop(true);
        setAboutAutoplay(true);

        if (detectedType === "FRAME_ANIMATION") {
          setAboutFrameCount(data.frameCount || 0);
          setAboutFrames(data.frames || []);
          setAboutPosterUrl(data.posterUrl || null);
          setAboutMediaUrl(data.frames?.[0] || null);
        } else {
          setAboutFrames([]);
          setAboutFrameCount(0);
          setAboutMediaUrl(data.url);
          setAboutPosterUrl(data.url);
        }
      }

      const formatLabel =
        detectedType === "FRAME_ANIMATION"
          ? `animação ZIP (${data.frameCount} quadros)`
          : detectedType === "VIDEO"
          ? "vídeo"
          : "imagem";

      setMediaFeedback(
        `Mídia enviada para "${areaLabel}" e reconhecida como ${formatLabel}. Clique em "Salvar Mídias do Site" para publicar.`
      );
    } catch {
      setMediaError("Erro de conexão ao enviar arquivo de mídia.");
    } finally {
      setUploadingSlot(null);
    }
  };

  // Remover mídia de uma área do Site
  const handleRemoveSlotMedia = (slot: "hero" | "hero_mobile" | "about") => {
    setMediaError(null);
    if (slot === "hero") {
      trackAbandonedUrls(abandonedMediaUrlsRef, heroMediaUrl, heroPosterUrl, heroBgMediaRef, ...heroFrames);
      setHeroMediaUrl(null);
      setHeroPosterUrl(null);
      setHeroFrames([]);
      setHeroFrameCount(0);
      setHeroMediaType("IMAGE");
      setHeroPlaybackSpeed(1);
      setHeroBgDetectedColor(null);
      setHeroBgStatus("IDLE");
      setHeroBgMediaRef(null);
    } else if (slot === "hero_mobile") {
      trackAbandonedUrls(
        abandonedMediaUrlsRef,
        heroMobileMediaUrl,
        heroMobilePosterUrl,
        heroMobileBgMediaRef,
        ...heroMobileFrames
      );
      setHeroMobileMediaUrl(null);
      setHeroMobilePosterUrl(null);
      setHeroMobileFrames([]);
      setHeroMobileFrameCount(0);
      setHeroMobileMediaType("IMAGE");
      setHeroMobilePlaybackSpeed(1);
      setHeroMobileBgDetectedColor(null);
      setHeroMobileBgStatus("IDLE");
      setHeroMobileBgMediaRef(null);
    } else {
      trackAbandonedUrls(abandonedMediaUrlsRef, aboutMediaUrl, aboutPosterUrl, ...aboutFrames);
      setAboutMediaUrl(null);
      setAboutPosterUrl(null);
      setAboutFrames([]);
      setAboutFrameCount(0);
      setAboutMediaType("IMAGE");
      setAboutPlaybackSpeed(1);
    }
    setMediaFeedback(
      'Mídia removida da prévia. Clique em "Salvar Mídias do Site" para confirmar a alteração.'
    );
  };

  // Salvar configurações de mídia do Site
  const handleSaveMediaSettings = async () => {
    if (isSavingMedia || uploadingSlot !== null) return;
    setIsSavingMedia(true);
    setMediaFeedback(null);
    setMediaError(null);
    try {
      let resolvedHeroBgColor = heroBgDetectedColor;
      let resolvedHeroBgStatus = heroBgStatus;
      if (pendingHeroColorRef.current) {
        const computed = await pendingHeroColorRef.current;
        if (computed) {
          resolvedHeroBgColor = computed;
          resolvedHeroBgStatus = "SUCCESS";
        }
      }

      let resolvedHeroMobileBgColor = heroMobileBgDetectedColor;
      let resolvedHeroMobileBgStatus = heroMobileBgStatus;
      if (pendingHeroMobileColorRef.current) {
        const computed = await pendingHeroMobileColorRef.current;
        if (computed) {
          resolvedHeroMobileBgColor = computed;
          resolvedHeroMobileBgStatus = "SUCCESS";
        }
      }

      const resolvedHeroBgMode = resolvedHeroBgColor ? "AUTO" : heroBgMode;
      const res = await fetch("/api/admin/minisite/media/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hero: {
            mediaType: heroMediaType,
            mediaUrl: heroMediaUrl,
            posterUrl: heroPosterUrl,
            fps: heroFps,
            playbackSpeed: heroPlaybackSpeed,
            loop: heroLoop,
            autoplay: heroAutoplay,
            playbackMode: heroPlaybackMode,
            playbackDirection: heroPlaybackDirection,
            positioning: heroPositioning,
            frameCount: heroFrameCount,
            frames: heroFrames,
            bgMode: resolvedHeroBgMode,
            bgDetectedColor: resolvedHeroBgColor,
            bgCustomColor: heroBgCustomColor,
            bgStatus: resolvedHeroBgStatus,
            bgMediaRef: heroBgMediaRef,
          },
          heroMobile: {
            mediaType: heroMobileMediaType,
            mediaUrl: heroMobileMediaUrl,
            posterUrl: heroMobilePosterUrl,
            fps: heroMobileFps,
            playbackSpeed: heroMobilePlaybackSpeed,
            loop: heroMobileLoop,
            autoplay: heroMobileAutoplay,
            playbackMode: heroMobilePlaybackMode,
            playbackDirection: heroMobilePlaybackDirection,
            positioning: heroMobilePositioning,
            frameCount: heroMobileFrameCount,
            frames: heroMobileFrames,
            bgDetectedColor: resolvedHeroMobileBgColor,
            bgStatus: resolvedHeroMobileBgStatus,
            bgMediaRef: heroMobileBgMediaRef,
          },
          about: {
            mediaType: aboutMediaType,
            mediaUrl: aboutMediaUrl,
            posterUrl: aboutPosterUrl,
            fps: aboutFps,
            playbackSpeed: aboutPlaybackSpeed,
            loop: aboutLoop,
            autoplay: aboutAutoplay,
            playbackMode: aboutPlaybackMode,
            playbackDirection: aboutPlaybackDirection,
            positioning: aboutPositioning,
            frameCount: aboutFrameCount,
            frames: aboutFrames,
          },
          abandonedUrls: Array.from(abandonedMediaUrlsRef.current),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        abandonedMediaUrlsRef.current.clear();
        setHeroBgMode(resolvedHeroBgMode);
        setHeroBgDetectedColor(resolvedHeroBgColor);
        setHeroBgStatus(resolvedHeroBgStatus);
        setHeroMobileBgDetectedColor(resolvedHeroMobileBgColor);
        setHeroMobileBgStatus(resolvedHeroMobileBgStatus);
        setSavedMediaSnapshot(
          buildSiteMediaSnapshot({
            heroMediaType,
            heroMediaUrl,
            heroPosterUrl,
            heroPlaybackSpeed,
            heroBgMode: resolvedHeroBgMode,
            heroBgDetectedColor: resolvedHeroBgColor,
            heroBgCustomColor,
            heroBgMediaRef,
            heroMobileMediaType,
            heroMobileMediaUrl,
            heroMobilePosterUrl,
            heroMobilePlaybackSpeed,
            heroMobileBgDetectedColor: resolvedHeroMobileBgColor,
            heroMobileBgMediaRef,
            aboutMediaType,
            aboutMediaUrl,
            aboutPosterUrl,
            aboutPlaybackSpeed,
          })
        );
        setMediaFeedback("Configurações de mídia do Site salvas e publicadas com sucesso!");
        router.refresh();
      } else {
        setMediaError(data.error || "Erro ao salvar mídias.");
      }
    } catch {
      setMediaError("Erro de rede ao salvar configurações de mídia.");
    } finally {
      setIsSavingMedia(false);
    }
  };

  // Atualiza apenas os dados dos provedores de vídeo sem descartar rascunhos de outras seções
  const refreshVideoProviders = async () => {
    try {
      const vidRes = await fetch("/api/admin/video-providers");
      if (!vidRes.ok) return;
      const vidData = await vidRes.json();
      setVideoProviders(vidData.providers || []);
      const nextActiveVideo = vidData.activeVideoProvider || "JITSI";
      setActiveVideoKey(nextActiveVideo);
      const jitsi = vidData.providers?.find((p: any) => p.key === "JITSI");
      const nextJitsiDomain = jitsi?.config?.domain || "meet.jit.si";
      if (jitsi) setJitsiDomain(nextJitsiDomain);
      const peer = vidData.providers?.find((p: any) => p.key === "PEERJS");
      const nextPeerHost = peer?.config?.host || "";
      const nextPeerPort = peer?.config?.port || 9000;
      const nextPeerPath = peer?.config?.path || "/peerjs";
      const nextPeerSecure = peer?.config?.secure ?? false;
      const nextPeerStun = peer?.config?.stunServer || "stun:stun.l.google.com:19302";
      const nextPeerTurn = peer?.config?.turnServer || "";
      const nextPeerUser = peer?.config?.turnUser || "";
      const nextPeerSecret = peer?.config?.turnSecret || "";
      if (peer) {
        setPeerJsHost(nextPeerHost);
        setPeerJsPort(nextPeerPort);
        setPeerJsPath(nextPeerPath);
        setPeerJsSecure(nextPeerSecure);
        setPeerJsStunServer(nextPeerStun);
        setPeerJsTurnServer(nextPeerTurn);
        setPeerJsTurnUser(nextPeerUser);
        setPeerJsTurnSecret(nextPeerSecret);
      }
      const gmeet = vidData.providers?.find((p: any) => p.key === "GOOGLE_MEET");
      const nextGmeetId = gmeet?.config?.clientId || "";
      const nextGmeetSecret = gmeet?.config?.clientSecret || "";
      if (gmeet) {
        setGoogleMeetClientId(nextGmeetId);
        setGoogleMeetClientSecret(nextGmeetSecret);
        setGoogleMeetAccountEmail(gmeet.config?.accountEmail || null);
        setGoogleMeetConnectedAt(gmeet.config?.connectedAt || null);
        setGoogleMeetStatus(gmeet.status || gmeet.config?.status || null);
      }
      setSavedVideoSnapshot(
        buildVideoSnapshot({
          activeVideoKey: nextActiveVideo,
          jitsiDomain: nextJitsiDomain,
          peerJsHost: nextPeerHost,
          peerJsPort: nextPeerPort,
          peerJsPath: nextPeerPath,
          peerJsSecure: nextPeerSecure,
          peerJsStunServer: nextPeerStun,
          peerJsTurnServer: nextPeerTurn,
          peerJsTurnUser: nextPeerUser,
          peerJsTurnSecret: nextPeerSecret,
          googleMeetClientId: nextGmeetId,
          googleMeetClientSecret: nextGmeetSecret,
        })
      );
    } catch {
      // Silencioso em atualização secundária
    }
  };

  // Conectar Conta Google OAuth
  const handleConnectGoogle = () => {
    window.location.href = "/api/admin/integrations/google/auth";
  };

  // Desconectar Conta Google
  const handleDisconnectGoogle = async () => {
    if (!confirm("Tem certeza que deseja desconectar a conta Google? O Google Meet deixará de gerar links para novas consultas.")) {
      return;
    }
    setIsDisconnectingGoogle(true);
    setGoogleMeetFeedback(null);
    try {
      const res = await fetch("/api/admin/integrations/google/disconnect", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setGoogleMeetFeedback({
          success: true,
          message: data.message || "Conta Google desconectada com sucesso.",
        });
        await refreshVideoProviders();
      } else {
        setGoogleMeetFeedback({
          success: false,
          message: data.error || "Erro ao desconectar conta Google.",
        });
      }
    } catch {
      setGoogleMeetFeedback({
        success: false,
        message: "Erro de rede ao desconectar conta Google.",
      });
    } finally {
      setIsDisconnectingGoogle(false);
    }
  };

  // Testar Integração Google Meet
  const handleTestGoogleMeet = async () => {
    setIsTestingGoogleMeet(true);
    setGoogleMeetFeedback(null);
    try {
      const res = await fetch("/api/admin/video-providers/google/test", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setGoogleMeetFeedback({
          success: true,
          message: data.message || "Integração Google Meet validada com sucesso!",
          meetUrl: data.meetUrl,
        });
        await refreshVideoProviders();
      } else {
        setGoogleMeetFeedback({
          success: false,
          message: data.error || "Falha ao validar integração com Google Meet.",
        });
      }
    } catch {
      setGoogleMeetFeedback({
        success: false,
        message: "Erro de rede ao testar Google Meet.",
      });
    } finally {
      setIsTestingGoogleMeet(false);
    }
  };

  // Testar Conexão Jitsi Meet
  const handleTestJitsi = async () => {
    setIsTestingJitsi(true);
    setJitsiTestFeedback(null);
    try {
      const res = await fetch("/api/admin/video-providers/jitsi/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: jitsiDomain }),
      });
      const data = await res.json();
      if (res.ok) {
        setJitsiTestFeedback({
          success: true,
          message: data.message || "Servidor Jitsi acessível e operacional!",
        });
      } else {
        setJitsiTestFeedback({
          success: false,
          message: data.error || "Falha ao alcançar o servidor Jitsi.",
        });
      }
    } catch {
      setJitsiTestFeedback({
        success: false,
        message: "Erro de rede ao testar servidor Jitsi.",
      });
    } finally {
      setIsTestingJitsi(false);
    }
  };

  // Testar Conexão de Sinalização PeerJS
  const handleTestPeerJs = async () => {
    setIsTestingPeerJs(true);
    setPeerJsTestFeedback(null);
    try {
      const res = await fetch("/api/admin/video-providers/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: peerJsHost,
          port: Number(peerJsPort) || 9000,
          path: peerJsPath || "/peerjs",
          secure: peerJsSecure,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPeerJsTestFeedback({
          success: true,
          message: data.message || "Conexão de sinalização validada com sucesso!",
          date: data.lastTestedAt,
        });
        await refreshVideoProviders();
      } else {
        setPeerJsTestFeedback({
          success: false,
          message: data.error || "Falha ao conectar no servidor de sinalização.",
          date: data.lastTestedAt,
        });
      }
    } catch {
      setPeerJsTestFeedback({
        success: false,
        message: "Erro de rede ao conectar no servidor de sinalização.",
      });
    } finally {
      setIsTestingPeerJs(false);
    }
  };

  // Salva Provedores de Vídeo (independente)
  const handleSaveVideoProviders = async () => {
    if (isSavingVideo) return;
    setIsSavingVideo(true);
    setVideoFeedback(null);
    setVideoError(null);

    try {
      const res = await fetch("/api/admin/video-providers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activeVideoProvider: activeVideoKey,
          jitsiDomain,
          peerJsServerHost: peerJsHost || null,
          peerJsServerPort: Number(peerJsPort) || 9000,
          peerJsPath: peerJsPath || "/peerjs",
          peerJsSecure: peerJsSecure,
          peerJsStunServer: peerJsStunServer || null,
          peerJsTurnServer: peerJsTurnServer || null,
          peerJsTurnUser: peerJsTurnUser || null,
          peerJsTurnSecret: peerJsTurnSecret || null,
          googleMeetClientId: googleMeetClientId || null,
          googleMeetClientSecret: googleMeetClientSecret || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setVideoError(data.error || "Erro ao salvar provedor de vídeo.");
      } else {
        await refreshVideoProviders();
        setVideoFeedback("Configurações de teleconsulta atualizadas com sucesso.");
        router.refresh();
      }
    } catch {
      setVideoError("Erro ao atualizar provedor de vídeo.");
    } finally {
      setIsSavingVideo(false);
    }
  };

  const normalizedPreviewBg = normalizeHexColor(backgroundColor, "#F0FDF4");
  const normalizedPreviewText = normalizeHexColor(textColor, "#14532D");
  const normalizedPreviewPrimary = normalizeHexColor(primaryColor, "#16A34A");
  const normalizedPreviewSecondary = normalizeHexColor(secondaryColor, "#DCFCE7");
  const normalizedPreviewAccent = normalizeHexColor(accentColor, "#86EFAC");
  const normalizedPreviewButton = normalizeHexColor(buttonColor || primaryColor, normalizedPreviewPrimary);
  const accessiblePreviewButtonBg = resolveAccessibleButtonBg(normalizedPreviewButton, 4.6);

  if (isLoading) {
    return <div className="h-64 bg-[#E5E5E5] dark:bg-[#202020] rounded-xl animate-pulse" />;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#171717] dark:text-[#F5F5F5]">Configurações do Consultório</h1>
        <p className="text-sm text-[#737373] dark:text-[#A6A6A6]">
          Personalize o perfil do consultório, a identidade visual, a teleconsulta e o monitoramento técnico.
        </p>
      </div>

      {/* Tabs Principais — Brancas com letra tema quando inativas; preenchidas com letra branca quando ativas */}
      <div className="inline-flex flex-wrap items-center gap-1.5 rounded-2xl bg-[#F4F4F5] dark:bg-[#141414] border border-[#E5E5E5] dark:border-[#2C2C2C] p-1.5 text-xs font-medium">
        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all shrink-0 cursor-pointer ${
            activeTab === "profile"
              ? "bg-[var(--button-bg,var(--primary))] text-[var(--button-fg,#ffffff)] font-semibold shadow-xs"
              : "bg-white text-[var(--button-outline-fg,var(--button-bg,var(--primary)))] border border-[var(--primary)]/20 hover:border-[var(--primary)]/50 hover:bg-[var(--primary)]/[0.04] dark:bg-[#1C1C1C] dark:border-transparent dark:text-[#D0D0D0] dark:hover:bg-[#242424] dark:hover:text-[#F5F5F5]"
          }`}
        >
          <UserCircle className="h-4 w-4 text-current" />
          <span>Perfil</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("appearance")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all shrink-0 cursor-pointer ${
            activeTab === "appearance"
              ? "bg-[var(--button-bg,var(--primary))] text-[var(--button-fg,#ffffff)] font-semibold shadow-xs"
              : "bg-white text-[var(--button-outline-fg,var(--button-bg,var(--primary)))] border border-[var(--primary)]/20 hover:border-[var(--primary)]/50 hover:bg-[var(--primary)]/[0.04] dark:bg-[#1C1C1C] dark:border-transparent dark:text-[#D0D0D0] dark:hover:bg-[#242424] dark:hover:text-[#F5F5F5]"
          }`}
        >
          <Palette className="h-4 w-4 text-current" />
          <span>Aparência</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("video")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all shrink-0 cursor-pointer ${
            activeTab === "video"
              ? "bg-[var(--button-bg,var(--primary))] text-[var(--button-fg,#ffffff)] font-semibold shadow-xs"
              : "bg-white text-[var(--button-outline-fg,var(--button-bg,var(--primary)))] border border-[var(--primary)]/20 hover:border-[var(--primary)]/50 hover:bg-[var(--primary)]/[0.04] dark:bg-[#1C1C1C] dark:border-transparent dark:text-[#D0D0D0] dark:hover:bg-[#242424] dark:hover:text-[#F5F5F5]"
          }`}
        >
          <Video className="h-4 w-4 text-current" />
          <span>Consultas Virtuais</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("security")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all shrink-0 cursor-pointer ${
            activeTab === "security"
              ? "bg-[var(--button-bg,var(--primary))] text-[var(--button-fg,#ffffff)] font-semibold shadow-xs"
              : "bg-white text-[var(--button-outline-fg,var(--button-bg,var(--primary)))] border border-[var(--primary)]/20 hover:border-[var(--primary)]/50 hover:bg-[var(--primary)]/[0.04] dark:bg-[#1C1C1C] dark:border-transparent dark:text-[#D0D0D0] dark:hover:bg-[#242424] dark:hover:text-[#F5F5F5]"
          }`}
        >
          <ShieldCheck className="h-4 w-4 text-current" />
          <span>Segurança & Monitoramento</span>
        </button>
      </div>

      {/* ================= ABA 0: PERFIL & IDENTIDADE CENTRALIZADA (3 SEÇÕES INDEPENDENTES) ================= */}
      {activeTab === "profile" && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-[#F4F4F5] dark:bg-[#141414] border border-[#E5E5E5] dark:border-[#2C2C2C] text-xs text-[#404040] dark:text-[#D4D4D4] space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-[#171717] dark:text-[#F5F5F5]">
              <UserCircle className="h-4 w-4 text-[var(--primary)]" />
              <span>Fonte Centralizada de Perfil e Contato</span>
            </p>
            <p>
              As informações abaixo alimentam a identidade institucional, o Site público e o canal de suporte aos pacientes em uma única fonte da verdade. Cada seção possui salvamento independente.
            </p>
          </div>

          {/* SEÇÃO A — DADOS DA APLICAÇÃO */}
          <form onSubmit={handleSaveAppSection}>
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-[var(--primary)]" />
                  <span>Seção A — Dados da Aplicação</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Identificação do consultório/aplicação e metadados de versão da plataforma.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                {appFeedback && <Alert variant="success">{appFeedback}</Alert>}
                {appError && <Alert variant="destructive">{appError}</Alert>}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Nome da Aplicação / Consultório *"
                    value={clinicName}
                    onChange={(e) => {
                      setClinicName(e.target.value);
                      setAppFeedback(null);
                      setAppError(null);
                    }}
                    placeholder="Ex: Consultório de Psicologia & Psiquiatria"
                    required
                  />
                  <Input
                    label="Descrição Curta da Aplicação"
                    value={tagline}
                    onChange={(e) => {
                      setTagline(e.target.value);
                      setAppFeedback(null);
                      setAppError(null);
                    }}
                    placeholder="Ex: Atendimento ético, acolhedor e humanizado."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="font-semibold block text-[#404040] dark:text-[#E5E5E5] mb-2 text-xs sm:text-sm">
                      Versão da Aplicação
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={`v${appVersion}`}
                        disabled
                        className="bg-[#F8F8F8] dark:bg-[#141414] font-mono text-xs cursor-not-allowed"
                      />
                      <Badge variant="outline" className="shrink-0 text-[11px] py-1 border-[#E5E5E5] dark:border-[#333333]">
                        <Lock className="h-3 w-3 mr-1 text-[#737373]" />
                        Metadado do Projeto
                      </Badge>
                    </div>
                    <p className="text-[11px] text-[#737373] dark:text-[#A6A6A6] mt-1.5">
                      Versão oficial recuperada diretamente dos metadados da instalação standalone.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-[#E5E5E5] dark:border-[#262626]">
                  <Button
                    type="submit"
                    disabled={!isAppDirty || isSavingApp}
                    isLoading={isSavingApp}
                    className="gap-2 text-xs"
                  >
                    {!isSavingApp && <Save className="h-4 w-4" />}
                    <span>{isSavingApp ? "Salvando..." : "Salvar Alterações"}</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>

          {/* SEÇÃO B — DADOS DO ADMINISTRADOR / PROFISSIONAL */}
          <form onSubmit={handleSaveProfSection}>
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-5 w-5 text-[var(--primary)]" />
                  <span>Seção B — Dados do Administrador / Profissional</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Titularidade e habilitação profissional perante os conselhos de classe.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                {profFeedback && <Alert variant="success">{profFeedback}</Alert>}
                {profError && <Alert variant="destructive">{profError}</Alert>}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Nome Completo do Profissional *"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      setProfFeedback(null);
                      setProfError(null);
                    }}
                    placeholder="Ex: Helena de Souza Martins"
                    required
                  />
                  <div>
                    <Input
                      label="Nome de Exibição Público"
                      value={displayName}
                      onChange={(e) => {
                        setDisplayName(e.target.value);
                        setProfFeedback(null);
                        setProfError(null);
                      }}
                      placeholder="Ex: Dra. Helena Martins"
                    />
                    <p className="text-[11px] text-[#737373] dark:text-[#A6A6A6] mt-1">
                      Nome social ou profissional exibido no Site público e crachás. Se vazio, utiliza o nome completo.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Registro Profissional (CRP / CRM) *"
                    value={crpCrm}
                    onChange={(e) => {
                      setCrpCrm(e.target.value);
                      setProfFeedback(null);
                      setProfError(null);
                    }}
                    placeholder="Ex: CRP 06/184920"
                    required
                  />
                  <Input
                    label="Especialidade / Título Profissional"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      setProfFeedback(null);
                      setProfError(null);
                    }}
                    placeholder="Ex: Psicóloga Clínica - Especialista em TCC"
                  />
                </div>

                <div className="pt-2 border-t border-[#E5E5E5] dark:border-[#333333]">
                  <div className="max-w-md">
                    <label className="font-semibold block text-[#404040] dark:text-[#E5E5E5] mb-2 text-xs sm:text-sm">
                      E-mail Administrativo de Acesso
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={adminEmail}
                        disabled
                        className="bg-[#F8F8F8] dark:bg-[#141414] font-mono text-xs cursor-not-allowed"
                      />
                      <Badge variant="outline" className="shrink-0 text-[11px] py-1 border-[#E5E5E5] dark:border-[#333333]">
                        <Lock className="h-3 w-3 mr-1 text-[#737373]" />
                        Autenticação Segura
                      </Badge>
                    </div>
                    <p className="text-[11px] text-[#737373] dark:text-[#A6A6A6] mt-1.5">
                      Utilizado exclusivamente para login do profissional titular. A alteração de credenciais deve seguir o fluxo seguro de autenticação.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-[#E5E5E5] dark:border-[#262626]">
                  <Button
                    type="submit"
                    disabled={!isProfDirty || isSavingProf}
                    isLoading={isSavingProf}
                    className="gap-2 text-xs"
                  >
                    {!isSavingProf && <Save className="h-4 w-4" />}
                    <span>{isSavingProf ? "Salvando..." : "Salvar Alterações"}</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>

          {/* SEÇÃO C — CONTATOS E REDES SOCIAIS */}
          <form onSubmit={handleSaveContactSection}>
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-emerald-600" />
                  <span>Seção C — Contatos e Redes Sociais</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Canais de contato compartilhados para agendamento, botões do Site e suporte ao paciente.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                {contactFeedback && <Alert variant="success">{contactFeedback}</Alert>}
                {contactError && <Alert variant="destructive">{contactError}</Alert>}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Input
                      label="Telefone / WhatsApp de Contato (com DDD) *"
                      value={whatsappNumber}
                      onChange={(e) => {
                        setWhatsappNumber(e.target.value);
                        setContactFeedback(null);
                        setContactError(null);
                      }}
                      placeholder="Ex: (11) 99123-4567 ou 5511991234567"
                      required
                    />
                    <p className="text-[11px] text-[#737373] dark:text-[#A6A6A6] mt-1">
                      Normalizado automaticamente no formato internacional com DDI 55 para links diretos de WhatsApp.
                    </p>
                  </div>
                  <Input
                    label="Telefone Comercial Alternativo"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setContactFeedback(null);
                      setContactError(null);
                    }}
                    placeholder="Ex: (11) 3214-5678"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Input
                      label="E-mail Público de Contato"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setContactFeedback(null);
                        setContactError(null);
                      }}
                      placeholder="contato@consultorio.com.br"
                    />
                    <p className="text-[11px] text-[#737373] dark:text-[#A6A6A6] mt-1">
                      E-mail público exibido no rodapé do Site (separado do e-mail de acesso administrativo).
                    </p>
                  </div>
                  <div>
                    <Input
                      label="Instagram"
                      value={instagram}
                      onChange={(e) => {
                        setInstagram(e.target.value);
                        setContactFeedback(null);
                        setContactError(null);
                      }}
                      placeholder="@dra.helenamartins"
                    />
                    <p className="text-[11px] text-[#737373] dark:text-[#A6A6A6] mt-1">
                      Perfil oficial para links de redes sociais na página pública do consultório.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-[#E5E5E5] dark:border-[#262626]">
                  <Button
                    type="submit"
                    disabled={!isContactDirty || isSavingContact}
                    isLoading={isSavingContact}
                    className="gap-2 text-xs"
                  >
                    {!isSavingContact && <Save className="h-4 w-4" />}
                    <span>{isSavingContact ? "Salvando..." : "Salvar Alterações"}</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>
      )}

      {/* ================= ABA 1: APARÊNCIA & CORES ================= */}
      {activeTab === "appearance" && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-[#F4F4F5] dark:bg-[#141414] border border-[#E5E5E5] dark:border-[#2C2C2C] text-xs text-[#404040] dark:text-[#D4D4D4] space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-[#171717] dark:text-[#F5F5F5]">
              <Palette className="h-4 w-4 text-[var(--primary)]" />
              <span>Sistema Global de Aparência e Temas</span>
            </p>
            <p>
              Visualize paletas predefinidas ou crie uma identidade personalizada na prévia em tempo real. As alterações só passam a valer permanentemente após clicar em <strong>&quot;Salvar Tema&quot;</strong>.
            </p>
          </div>

          {/* CARD 1: APARÊNCIA — PRESETS + PREVIEW COM BOTÃO "SALVAR TEMA" AO LADO + CORES PERSONALIZADAS CONDICIONAL */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Palette className="h-5 w-5 text-[var(--primary)]" />
                <span>Aparência</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Selecione um tema predefinido ou ative &quot;Personalizado&quot; para ajustar cada token de cor da clínica.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#737373] dark:text-[#A6A6A6] mb-3">
                  Tema do Sistema
                </h4>
                <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2.5">
                  {/* Presets 1 a 8 */}
                  {Object.values(THEME_PRESETS).map((preset) => {
                    const isSelected = themeName === preset.key;
                    return (
                      <button
                        key={preset.key}
                        type="button"
                        onClick={() => handleSelectThemePreset(preset.key)}
                        aria-pressed={isSelected}
                        className={`flex flex-col items-center gap-2 p-2.5 rounded-2xl transition-all group cursor-pointer focus:outline-none border ${
                          isSelected
                            ? "bg-white text-[#171717] border-[var(--primary)] ring-2 ring-[var(--primary)]/25 shadow-sm dark:bg-[#262626] dark:text-white dark:border-[var(--primary)]"
                            : "bg-white hover:bg-[#F8F8F8] text-[#404040] border-[#E5E5E5] hover:border-[#D0D0D0] dark:bg-[#1B1B1B] dark:hover:bg-[#242424] dark:text-[#D0D0D0] dark:border-[#2C2C2C]"
                        }`}
                      >
                        <div
                          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center transition-transform shadow-xs ${
                            isSelected ? "scale-105" : "group-hover:scale-105"
                          }`}
                          style={{ backgroundColor: preset.swatch }}
                        >
                          {isSelected && (
                            <span className="p-1.5 rounded-full bg-white/95 text-[#171717] shadow-xs">
                              <Check className="h-4 w-4 stroke-[3]" />
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-semibold text-center truncate max-w-full">
                          {preset.label}
                        </span>
                      </button>
                    );
                  })}

                  {/* Preset 9: Personalizado */}
                  <button
                    type="button"
                    onClick={handleSelectCustomTheme}
                    aria-pressed={themeName === "PERSONALIZADO"}
                    className={`flex flex-col items-center gap-2 p-2.5 rounded-2xl transition-all group cursor-pointer focus:outline-none border ${
                      themeName === "PERSONALIZADO"
                        ? "bg-white text-[#171717] border-[var(--primary)] ring-2 ring-[var(--primary)]/25 shadow-sm dark:bg-[#262626] dark:text-white dark:border-[var(--primary)]"
                        : "bg-white hover:bg-[#F8F8F8] text-[#404040] border-[#E5E5E5] hover:border-[#D0D0D0] dark:bg-[#1B1B1B] dark:hover:bg-[#242424] dark:text-[#D0D0D0] dark:border-[#2C2C2C]"
                    }`}
                  >
                    <div
                      className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center transition-transform shadow-xs relative overflow-hidden bg-[#F4F4F5] dark:bg-[#1B1B1B] border border-[#E5E5E5] dark:border-[#333333] ${
                        themeName === "PERSONALIZADO" ? "scale-105" : "group-hover:scale-105"
                      }`}
                    >
                      <div className="grid grid-cols-2 grid-rows-2 w-full h-full opacity-95">
                        <span style={{ backgroundColor: normalizedPreviewPrimary }} />
                        <span style={{ backgroundColor: normalizedPreviewAccent }} />
                        <span style={{ backgroundColor: normalizedPreviewButton }} />
                        <span style={{ backgroundColor: normalizedPreviewSecondary }} />
                      </div>
                      <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Palette className="h-5 w-5 text-white drop-shadow-md" />
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-center truncate max-w-full">
                      Personalizado
                    </span>
                  </button>
                </div>
              </div>

              {/* PREVIEW DO TEMA + BLOCO DE AÇÃO "SALVAR TEMA" DIRETAMENTE AO LADO */}
              <div className="pt-2 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#737373] dark:text-[#A6A6A6]">
                  Preview do Tema
                </h4>

                <div className="flex flex-col md:flex-row md:items-stretch gap-5">
                  {/* Caixa de Preview em Tempo Real refletindo todos os 6 tokens do rascunho */}
                  <div
                    data-testid="theme-preview-box"
                    className="flex-1 min-w-0 p-5 rounded-2xl border border-[#E5E5E5] dark:border-[#333333] space-y-4 shadow-2xs transition-colors"
                    style={{ backgroundColor: normalizedPreviewBg }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className="w-12 h-12 rounded-xl shadow-xs shrink-0 transition-colors border border-black/10"
                          style={{ backgroundColor: normalizedPreviewPrimary }}
                        />
                        <div className="space-y-1 min-w-0">
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                            style={{
                              backgroundColor: normalizedPreviewSecondary,
                              color: normalizedPreviewText,
                            }}
                          >
                            <span
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{ backgroundColor: normalizedPreviewAccent }}
                            />
                            {themeName === "PERSONALIZADO"
                              ? "Personalizado"
                              : THEME_PRESETS[themeName]?.label || themeName}
                          </span>
                          <p
                            className="text-sm font-bold truncate"
                            style={{ color: normalizedPreviewText }}
                          >
                            Identidade Visual da Clínica
                          </p>
                          <p
                            className="text-[11px] opacity-80 truncate"
                            style={{ color: normalizedPreviewText }}
                          >
                            Prévia fiel de fundo, destaque, tipografia e botões ativos.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Botões de Preview — Principal com contraste branco acessível e Secundário claro e harmônico */}
                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <button
                        type="button"
                        data-testid="theme-preview-primary-btn"
                        className="flex-1 min-w-[140px] px-4 py-2.5 rounded-xl font-semibold text-xs text-white shadow-xs transition-colors text-center cursor-default"
                        style={{
                          backgroundColor: accessiblePreviewButtonBg,
                          color: "#ffffff",
                        }}
                      >
                        Botão Principal
                      </button>
                      <button
                        type="button"
                        data-testid="theme-preview-secondary-btn"
                        className="flex-1 min-w-[140px] px-4 py-2.5 rounded-xl font-semibold text-xs bg-white border shadow-xs transition-colors text-center cursor-default"
                        style={{
                          color: accessiblePreviewButtonBg,
                          borderColor: `${accessiblePreviewButtonBg}4D`,
                        }}
                      >
                        Botão Secundário
                      </button>
                    </div>

                    {/* Mini-legenda dos 6 tokens ativos */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px] font-mono">
                      {[
                        { label: "Primária", color: normalizedPreviewPrimary },
                        { label: "Secundária", color: normalizedPreviewSecondary },
                        { label: "Destaque", color: normalizedPreviewAccent },
                        { label: "Botões", color: normalizedPreviewButton },
                        { label: "Fundo", color: normalizedPreviewBg },
                        { label: "Texto", color: normalizedPreviewText },
                      ].map((token) => (
                        <span
                          key={token.label}
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/90 text-[#171717] border border-black/10"
                        >
                          <span
                            className="h-2.5 w-2.5 rounded-full border border-black/15 shrink-0"
                            style={{ backgroundColor: token.color }}
                          />
                          <span>{token.label}: {token.color}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* AÇÃO DE SALVAMENTO DO TEMA DIRETAMENTE AO LADO DO PREVIEW */}
                  <div className="w-full md:w-72 shrink-0 p-5 rounded-2xl bg-[#F8F8F8] dark:bg-[#141414] border border-[#E5E5E5] dark:border-[#2C2C2C] flex flex-col justify-between gap-4">
                    <div className="space-y-2.5 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-[#171717] dark:text-[#F5F5F5]">
                          Publicação do Tema
                        </span>
                        <Badge variant={isThemeDirty ? "warning" : "success"} className="text-[10px]">
                          {isThemeDirty ? "Rascunho não salvo" : "Aplicado"}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-[#737373] dark:text-[#A6A6A6] leading-relaxed">
                        {isThemeDirty
                          ? "Você alterou a prévia. Clique em \"Salvar Tema\" para aplicar a nova paleta em todo o sistema."
                          : "O tema exibido acima corresponde exatamente ao que está publicado atualmente no PSI."}
                      </p>

                      {themeFeedback && <Alert variant="success">{themeFeedback}</Alert>}
                      {themeError && <Alert variant="destructive">{themeError}</Alert>}
                    </div>

                    <div className="space-y-2 pt-2">
                      <Button
                        type="button"
                        onClick={handleSaveTheme}
                        disabled={!isThemeDirty || isSavingTheme}
                        isLoading={isSavingTheme}
                        className="w-full gap-2 text-xs"
                      >
                        {!isSavingTheme && <Save className="h-4 w-4" />}
                        <span>{isSavingTheme ? "Salvando Tema..." : "Salvar Tema"}</span>
                      </Button>

                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleRestoreAppearanceDefaults}
                        className="w-full gap-1.5 text-xs"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Restaurar Padrão</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* CORES PERSONALIZADAS — EXIBIDO SOMENTE QUANDO "Personalizado" ESTÁ SELECIONADO */}
              {themeName === "PERSONALIZADO" && (
                <div
                  data-testid="custom-colors-section"
                  className="animate-custom-colors-enter pt-5 border-t border-[#E5E5E5] dark:border-[#2C2C2C] space-y-5 text-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-semibold text-[#171717] dark:text-[#F5F5F5] flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-[var(--primary)]" />
                        <span>Cores Personalizadas</span>
                      </h4>
                      <p className="text-[11px] text-[#737373] dark:text-[#A6A6A6] mt-0.5">
                        Ajuste os 6 tokens hexadecimais da paleta. As mudanças refletem na prévia acima até você clicar em &quot;Salvar Tema&quot;.
                      </p>
                    </div>
                    <Badge variant="outline" className="w-fit text-[10px] shrink-0">
                      Base: {THEME_PRESETS[lastBasePreset]?.label || "Verde (Padrão)"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Cor Primária */}
                    <div className="p-3 rounded-xl border border-[#E5E5E5] dark:border-[#2C2C2C] bg-[#FAFAFA] dark:bg-[#141414] space-y-2">
                      <div>
                        <span className="font-semibold block text-[#171717] dark:text-[#F5F5F5]">Cor Primária</span>
                        <span className="text-[11px] text-[#737373] dark:text-[#A6A6A6]">Destaques, títulos e vínculos</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          aria-label="Seletor de Cor Primária"
                          value={normalizedPreviewPrimary}
                          onChange={(e) => handleCustomColorChange("primaryColor", e.target.value)}
                          className="h-8 w-8 rounded-lg cursor-pointer border-0 p-0 shrink-0"
                        />
                        <Input
                          aria-label="HEX da Cor Primária"
                          value={primaryColor}
                          onChange={(e) => handleCustomColorChange("primaryColor", e.target.value)}
                          className="font-mono text-xs uppercase"
                        />
                      </div>
                    </div>

                    {/* Cor Secundária */}
                    <div className="p-3 rounded-xl border border-[#E5E5E5] dark:border-[#2C2C2C] bg-[#FAFAFA] dark:bg-[#141414] space-y-2">
                      <div>
                        <span className="font-semibold block text-[#171717] dark:text-[#F5F5F5]">Cor Secundária</span>
                        <span className="text-[11px] text-[#737373] dark:text-[#A6A6A6]">Superfícies suaves e badges</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          aria-label="Seletor de Cor Secundária"
                          value={normalizedPreviewSecondary}
                          onChange={(e) => handleCustomColorChange("secondaryColor", e.target.value)}
                          className="h-8 w-8 rounded-lg cursor-pointer border-0 p-0 shrink-0"
                        />
                        <Input
                          aria-label="HEX da Cor Secundária"
                          value={secondaryColor}
                          onChange={(e) => handleCustomColorChange("secondaryColor", e.target.value)}
                          className="font-mono text-xs uppercase"
                        />
                      </div>
                    </div>

                    {/* Cor de Destaque */}
                    <div className="p-3 rounded-xl border border-[#E5E5E5] dark:border-[#2C2C2C] bg-[#FAFAFA] dark:bg-[#141414] space-y-2">
                      <div>
                        <span className="font-semibold block text-[#171717] dark:text-[#F5F5F5]">Cor de Destaque</span>
                        <span className="text-[11px] text-[#737373] dark:text-[#A6A6A6]">Realces e marcações ativas</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          aria-label="Seletor de Cor de Destaque"
                          value={normalizedPreviewAccent}
                          onChange={(e) => handleCustomColorChange("accentColor", e.target.value)}
                          className="h-8 w-8 rounded-lg cursor-pointer border-0 p-0 shrink-0"
                        />
                        <Input
                          aria-label="HEX da Cor de Destaque"
                          value={accentColor}
                          onChange={(e) => handleCustomColorChange("accentColor", e.target.value)}
                          className="font-mono text-xs uppercase"
                        />
                      </div>
                    </div>

                    {/* Cor dos Botões */}
                    <div className="p-3 rounded-xl border border-[#E5E5E5] dark:border-[#2C2C2C] bg-[#FAFAFA] dark:bg-[#141414] space-y-2">
                      <div>
                        <span className="font-semibold block text-[#171717] dark:text-[#F5F5F5]">Cor dos Botões</span>
                        <span className="text-[11px] text-[#737373] dark:text-[#A6A6A6]">Botões principais com texto branco</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          aria-label="Seletor de Cor dos Botões"
                          value={normalizedPreviewButton}
                          onChange={(e) => handleCustomColorChange("buttonColor", e.target.value)}
                          className="h-8 w-8 rounded-lg cursor-pointer border-0 p-0 shrink-0"
                        />
                        <Input
                          aria-label="HEX da Cor dos Botões"
                          value={buttonColor}
                          onChange={(e) => handleCustomColorChange("buttonColor", e.target.value)}
                          className="font-mono text-xs uppercase"
                        />
                      </div>
                    </div>

                    {/* Cor de Fundo */}
                    <div className="p-3 rounded-xl border border-[#E5E5E5] dark:border-[#2C2C2C] bg-[#FAFAFA] dark:bg-[#141414] space-y-2">
                      <div>
                        <span className="font-semibold block text-[#171717] dark:text-[#F5F5F5]">Cor de Fundo</span>
                        <span className="text-[11px] text-[#737373] dark:text-[#A6A6A6]">Superfície base do Site e tema</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          aria-label="Seletor de Cor de Fundo"
                          value={normalizedPreviewBg}
                          onChange={(e) => handleCustomColorChange("backgroundColor", e.target.value)}
                          className="h-8 w-8 rounded-lg cursor-pointer border-0 p-0 shrink-0"
                        />
                        <Input
                          aria-label="HEX da Cor de Fundo"
                          value={backgroundColor}
                          onChange={(e) => handleCustomColorChange("backgroundColor", e.target.value)}
                          className="font-mono text-xs uppercase"
                        />
                      </div>
                    </div>

                    {/* Cor do Texto */}
                    <div className="p-3 rounded-xl border border-[#E5E5E5] dark:border-[#2C2C2C] bg-[#FAFAFA] dark:bg-[#141414] space-y-2">
                      <div>
                        <span className="font-semibold block text-[#171717] dark:text-[#F5F5F5]">Cor do Texto</span>
                        <span className="text-[11px] text-[#737373] dark:text-[#A6A6A6]">Tipografia e títulos principais</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          aria-label="Seletor de Cor do Texto"
                          value={normalizedPreviewText}
                          onChange={(e) => handleCustomColorChange("textColor", e.target.value)}
                          className="h-8 w-8 rounded-lg cursor-pointer border-0 p-0 shrink-0"
                        />
                        <Input
                          aria-label="HEX da Cor do Texto"
                          value={textColor}
                          onChange={(e) => handleCustomColorChange("textColor", e.target.value)}
                          className="font-mono text-xs uppercase"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Indicador de Contraste e Acessibilidade (WCAG AA) */}
                  {(() => {
                    const ratio = calculateContrastRatio(normalizedPreviewText, normalizedPreviewBg);
                    const isAccessible = isContrastAccessible(normalizedPreviewText, normalizedPreviewBg);
                    const rawBtnRatio = calculateContrastRatio("#ffffff", normalizedPreviewButton);
                    const btnAutoAdjusted = rawBtnRatio < 4.5;

                    return (
                      <div className="space-y-2">
                        {isAccessible ? (
                          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                            <span>
                              Contraste Texto/Fundo: <strong>{ratio}:1</strong> — Em conformidade com a norma WCAG AA (mínimo 4.5:1).
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            <span>
                              Contraste Texto/Fundo: <strong>{ratio}:1</strong> — Abaixo do mínimo recomendado pela WCAG AA (4.5:1). Aumente o contraste entre a cor do texto e a cor de fundo.
                            </span>
                          </div>
                        )}

                        {btnAutoAdjusted && (
                          <div className="flex items-center gap-2 p-3 rounded-xl bg-[#F4F4F5] dark:bg-[#1E1E1E] border border-[#E5E5E5] dark:border-[#333333] text-[#404040] dark:text-[#D4D4D4]">
                            <Info className="h-4 w-4 shrink-0 text-[var(--primary)]" />
                            <span>
                              A cor de botões selecionada ({normalizedPreviewButton}) é clara demais para texto branco ({rawBtnRatio}:1). Nos botões do sistema, será automaticamente adaptada para <strong>{accessiblePreviewButtonBg}</strong> garantindo contraste acessível.
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </CardContent>
          </Card>

          {/* CARD 2: IMAGENS DO SISTEMA (SEÇÃO INDEPENDENTE) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Imagens do Sistema</CardTitle>
              <CardDescription className="text-xs">
                Faça o envio do favicon, do logotipo padrão e do banner/logo horizontal oficial do consultório.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 text-xs">
              {imagesFeedback && <Alert variant="success">{imagesFeedback}</Alert>}
              {imagesError && <Alert variant="destructive">{imagesError}</Alert>}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 1. Favicon (32x32px) */}
                <div className="p-4 rounded-xl border border-[#E5E5E5] dark:border-[#2C2C2C] bg-white dark:bg-[#141414] flex flex-col justify-between space-y-3">
                  <div>
                    <h5 className="font-bold text-xs text-[#171717] dark:text-[#F5F5F5]">
                      Favicon (32x32px)
                    </h5>
                    <div className="h-16 flex items-center justify-center my-2">
                      {faviconUrl ? (
                        <img src={faviconUrl} alt="Favicon" className="h-8 w-8 object-contain" />
                      ) : (
                        <span className="text-[10px] text-[#737373] dark:text-[#A6A6A6]">Sem favicon cadastrado</span>
                      )}
                    </div>
                  </div>

                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleUploadAsset("favicon", file);
                    }}
                    className="p-3 border-2 border-dashed border-[#D4D4D4] dark:border-[#333333] rounded-xl text-center hover:border-[var(--primary)]/50 hover:bg-[var(--primary)]/[0.03] dark:hover:bg-[#1E1E1E] cursor-pointer transition-colors"
                  >
                    <label className="cursor-pointer block">
                      <input
                        type="file"
                        accept="image/x-icon,image/png,image/svg+xml,image/jpeg"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) handleUploadAsset("favicon", e.target.files[0]);
                        }}
                      />
                      <Upload className="h-5 w-5 text-[var(--button-outline-fg,var(--primary))] dark:text-[#A6A6A6] mx-auto mb-1" />
                      <p className="font-semibold text-[var(--button-outline-fg,var(--primary))] dark:text-[#E5E5E5] text-xs">
                        {uploadingAsset === "favicon" ? "Enviando..." : "Clique para upload ou arraste aqui"}
                      </p>
                      <p className="text-[10px] text-[#737373] dark:text-[#A6A6A6]">ICO, PNG, JPG (32x32px)</p>
                    </label>
                  </div>

                  {faviconUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        trackAbandonedUrls(abandonedImageUrlsRef, faviconUrl);
                        setFaviconUrl(null);
                        setImagesFeedback('Favicon removido da prévia. Clique em "Salvar Alterações" para confirmar.');
                      }}
                      className="w-full py-1.5 px-3 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 dark:bg-red-500/15 dark:hover:bg-red-500/25 dark:text-red-400 dark:border-red-500/25 text-[11px] font-medium transition-colors cursor-pointer"
                    >
                      Remover favicon
                    </button>
                  )}
                </div>

                {/* 2. Logo (200x80px) */}
                <div className="p-4 rounded-xl border border-[#E5E5E5] dark:border-[#2C2C2C] bg-white dark:bg-[#141414] flex flex-col justify-between space-y-3">
                  <div>
                    <h5 className="font-bold text-xs text-[#171717] dark:text-[#F5F5F5]">
                      Logo (200x80px)
                    </h5>
                    <div className="h-16 flex items-center justify-center my-2 p-1 bg-[#F8F8F8] dark:bg-[#1E1E1E] rounded-lg">
                      {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="h-full max-w-[200px] object-contain" />
                      ) : (
                        <span className="text-[10px] text-[#737373] dark:text-[#A6A6A6]">Sem logo cadastrado</span>
                      )}
                    </div>
                  </div>

                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleUploadAsset("logo", file);
                    }}
                    className="p-3 border-2 border-dashed border-[#D4D4D4] dark:border-[#333333] rounded-xl text-center hover:border-[var(--primary)]/50 hover:bg-[var(--primary)]/[0.03] dark:hover:bg-[#1E1E1E] cursor-pointer transition-colors"
                  >
                    <label className="cursor-pointer block">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) handleUploadAsset("logo", e.target.files[0]);
                        }}
                      />
                      <Upload className="h-5 w-5 text-[var(--button-outline-fg,var(--primary))] dark:text-[#A6A6A6] mx-auto mb-1" />
                      <p className="font-semibold text-[var(--button-outline-fg,var(--primary))] dark:text-[#E5E5E5] text-xs">
                        {uploadingAsset === "logo" ? "Enviando..." : "Clique para upload ou arraste aqui"}
                      </p>
                      <p className="text-[10px] text-[#737373] dark:text-[#A6A6A6]">PNG com fundo transparente (200x80px)</p>
                    </label>
                  </div>

                  {logoUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        trackAbandonedUrls(abandonedImageUrlsRef, logoUrl);
                        setLogoUrl(null);
                        setImagesFeedback('Logo removido da prévia. Clique em "Salvar Alterações" para confirmar.');
                      }}
                      className="w-full py-1.5 px-3 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 dark:bg-red-500/15 dark:hover:bg-red-500/25 dark:text-red-400 dark:border-red-500/25 text-[11px] font-medium transition-colors cursor-pointer"
                    >
                      Remover logo
                    </button>
                  )}
                </div>

                {/* 3. Banner PC / Logo Horizontal (1400x140px) */}
                <div className="p-4 rounded-xl border border-[#E5E5E5] dark:border-[#2C2C2C] bg-white dark:bg-[#141414] flex flex-col justify-between space-y-3">
                  <div>
                    <h5 className="font-bold text-xs text-[#171717] dark:text-[#F5F5F5]">
                      Banner PC (1400x140px)
                    </h5>
                    <div className="h-16 flex items-center justify-center my-2 p-1 bg-[#F8F8F8] dark:bg-[#1E1E1E] rounded-lg">
                      {logoHorizontalUrl ? (
                        <img src={logoHorizontalUrl} alt="Banner/Horizontal" className="h-full w-full object-contain" />
                      ) : (
                        <span className="text-[10px] text-[#737373] dark:text-[#A6A6A6]">Sem banner cadastrado</span>
                      )}
                    </div>
                  </div>

                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleUploadAsset("logoHorizontal", file);
                    }}
                    className="p-3 border-2 border-dashed border-[#D4D4D4] dark:border-[#333333] rounded-xl text-center hover:border-[var(--primary)]/50 hover:bg-[var(--primary)]/[0.03] dark:hover:bg-[#1E1E1E] cursor-pointer transition-colors"
                  >
                    <label className="cursor-pointer block">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) handleUploadAsset("logoHorizontal", e.target.files[0]);
                        }}
                      />
                      <Upload className="h-5 w-5 text-[var(--button-outline-fg,var(--primary))] dark:text-[#A6A6A6] mx-auto mb-1" />
                      <p className="font-semibold text-[var(--button-outline-fg,var(--primary))] dark:text-[#E5E5E5] text-xs">
                        {uploadingAsset === "logoHorizontal" ? "Enviando..." : "Clique para upload ou arraste aqui"}
                      </p>
                      <p className="text-[10px] text-[#737373] dark:text-[#A6A6A6]">JPG, PNG (1400x140px)</p>
                    </label>
                  </div>

                  {logoHorizontalUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        trackAbandonedUrls(abandonedImageUrlsRef, logoHorizontalUrl);
                        setLogoHorizontalUrl(null);
                        setImagesFeedback('Banner removido da prévia. Clique em "Salvar Alterações" para confirmar.');
                      }}
                      className="w-full py-1.5 px-3 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 dark:bg-red-500/15 dark:hover:bg-red-500/25 dark:text-red-400 dark:border-red-500/25 text-[11px] font-medium transition-colors cursor-pointer"
                    >
                      Remover banner
                    </button>
                  )}
                </div>
              </div>

              {/* Dicas para as imagens */}
              <div className="p-4 rounded-xl bg-[#F8F8F8] dark:bg-[#181818] border border-[#E5E5E5] dark:border-[#2C2C2C] text-xs text-[#404040] dark:text-[#D0D0D0] space-y-2">
                <p className="font-bold flex items-center gap-1.5 text-[#171717] dark:text-[#F5F5F5]">
                  <Info className="h-4 w-4 text-[var(--primary)]" />
                  <span>Dicas para as imagens:</span>
                </p>
                <ul className="space-y-1.5 text-[11px] text-[#525252] dark:text-[#A6A6A6] pl-1">
                  <li className="flex items-start gap-1.5">
                    <span className="text-[var(--primary)] font-bold">•</span>
                    <span><strong>Favicon:</strong> Use imagens quadradas no tamanho exato de 32x32 pixels</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-[var(--primary)] font-bold">•</span>
                    <span><strong>Logo:</strong> Use PNG com fundo transparente no tamanho 200x80 pixels</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-[var(--primary)] font-bold">•</span>
                    <span><strong>Banner Mobile:</strong> Use imagens no tamanho de 420x140 pixels</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-[var(--primary)] font-bold">•</span>
                    <span><strong>Banner PC:</strong> Use imagens no tamanho de 1400x140 pixels</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-[var(--primary)] font-bold">•</span>
                    <span><strong>Tamanho máximo por arquivo:</strong> 5MB</span>
                  </li>
                </ul>
              </div>

              {/* Botão independente de salvamento das Imagens do Sistema */}
              <div className="flex items-center justify-end pt-4 border-t border-[#E5E5E5] dark:border-[#262626]">
                <Button
                  type="button"
                  onClick={handleSaveSystemImages}
                  disabled={!isImagesDirty || isSavingImages || uploadingAsset !== null}
                  isLoading={isSavingImages}
                  className="gap-2 text-xs"
                >
                  {!isSavingImages && <Save className="h-4 w-4" />}
                  <span>{isSavingImages ? "Salvando..." : "Salvar Alterações"}</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* CARD 3: IMAGENS & ANIMAÇÕES DO SITE (HERO DESKTOP, HERO MOBILE, SOBRE MIM) */}
          <Card className="border-[#E5E5E5] dark:border-[#2C2C2C] bg-white/80 dark:bg-[#141414] backdrop-blur-sm">
            <CardHeader className="pb-4 border-b border-[#E5E5E5] dark:border-[#2C2C2C]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
                  <Film className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">
                    Imagens & Animações do Site
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Envie a mídia de cada área e o sistema reconhecerá o formato automaticamente.
                  </CardDescription>
                </div>
              </div>

              {mediaFeedback && (
                <div className="mt-3 p-3 rounded-lg text-xs bg-[#F4F4F5] dark:bg-[#1E1E1E] border border-[#E5E5E5] dark:border-[#333333] flex items-center justify-between gap-2">
                  <span className="text-[#171717] dark:text-[#F5F5F5] font-medium">{mediaFeedback}</span>
                  <button
                    type="button"
                    aria-label="Fechar aviso de mídia"
                    onClick={() => setMediaFeedback(null)}
                    className="h-6 w-6 rounded-md bg-transparent hover:bg-black/10 dark:hover:bg-white/10 text-[#525252] dark:text-[#A6A6A6] flex items-center justify-center text-xs shrink-0 cursor-pointer transition-colors"
                  >
                    ✕
                  </button>
                </div>
              )}
              {mediaError && <div className="mt-3"><Alert variant="destructive">{mediaError}</Alert></div>}
            </CardHeader>

            <CardContent className="pt-6 space-y-5">
              {/* Desktop: Hero Desktop e Hero Mobile lado a lado | Mobile: empilhados */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <MiniSiteMediaSlotCard
                  title="Hero — Desktop"
                  slot="hero"
                  mediaType={heroMediaType}
                  mediaUrl={heroMediaUrl}
                  posterUrl={heroPosterUrl}
                  frames={heroFrames}
                  fps={heroFps}
                  playbackSpeed={heroPlaybackSpeed}
                  loop={heroLoop}
                  autoplay={heroAutoplay}
                  playbackMode={heroPlaybackMode}
                  playbackDirection={heroPlaybackDirection}
                  positioning={heroPositioning}
                  isUploading={uploadingSlot === "hero"}
                  onUploadFile={(file) => handleUploadSlotMedia("hero", file)}
                  onChangePlaybackSpeed={(speed) => setHeroPlaybackSpeed(speed)}
                  onRemoveMedia={() => handleRemoveSlotMedia("hero")}
                />

                <MiniSiteMediaSlotCard
                  title="Hero — Mobile"
                  slot="hero_mobile"
                  mediaType={heroMobileMediaType}
                  mediaUrl={heroMobileMediaUrl}
                  posterUrl={heroMobilePosterUrl}
                  frames={heroMobileFrames}
                  fps={heroMobileFps}
                  playbackSpeed={heroMobilePlaybackSpeed}
                  loop={heroMobileLoop}
                  autoplay={heroMobileAutoplay}
                  playbackMode={heroMobilePlaybackMode}
                  playbackDirection={heroMobilePlaybackDirection}
                  positioning={heroMobilePositioning}
                  isUploading={uploadingSlot === "hero_mobile"}
                  onUploadFile={(file) => handleUploadSlotMedia("hero_mobile", file)}
                  onChangePlaybackSpeed={(speed) => setHeroMobilePlaybackSpeed(speed)}
                  onRemoveMedia={() => handleRemoveSlotMedia("hero_mobile")}
                />
              </div>

              {/* Abaixo: Sobre Mim (mídia única usada em desktop e mobile) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <MiniSiteMediaSlotCard
                  title="Sobre Mim"
                  slot="about"
                  mediaType={aboutMediaType}
                  mediaUrl={aboutMediaUrl}
                  posterUrl={aboutPosterUrl}
                  frames={aboutFrames}
                  fps={aboutFps}
                  playbackSpeed={aboutPlaybackSpeed}
                  loop={aboutLoop}
                  autoplay={aboutAutoplay}
                  playbackMode={aboutPlaybackMode}
                  playbackDirection={aboutPlaybackDirection}
                  positioning={aboutPositioning}
                  isUploading={uploadingSlot === "about"}
                  onUploadFile={(file) => handleUploadSlotMedia("about", file)}
                  onChangePlaybackSpeed={(speed) => setAboutPlaybackSpeed(speed)}
                  onRemoveMedia={() => handleRemoveSlotMedia("about")}
                />
              </div>

              {/* Botão único de salvamento das Mídias do Site */}
              <div className="flex items-center justify-end pt-4 border-t border-[#E5E5E5] dark:border-[#262626]">
                <Button
                  type="button"
                  onClick={handleSaveMediaSettings}
                  disabled={!isMediaDirty || isSavingMedia || uploadingSlot !== null}
                  isLoading={isSavingMedia}
                  className="gap-2 text-xs"
                >
                  {!isSavingMedia && <Save className="h-4 w-4" />}
                  <span>{isSavingMedia ? "Salvando Mídias..." : "Salvar Mídias do Site"}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ================= ABA 3: CONSULTAS VIRTUAIS ================= */}
      {activeTab === "video" && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-xs text-[#171717] dark:text-[#F5F5F5] space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <Video className="h-4 w-4 text-[var(--primary)]" />
              <span>Opções de Teleconsulta e Provedores de Vídeo</span>
            </p>
            <p>
              O PSI oferece suporte arquitetural a 3 provedores de videoconferência. Apenas <strong>um provedor padrão ativo</strong> é selecionado por instalação. Alterar o padrão afeta novos atendimentos, preservando as consultas já agendadas com seus links originais.
            </p>
          </div>

          {videoFeedback && <Alert variant="success">{videoFeedback}</Alert>}
          {videoError && <Alert variant="destructive">{videoError}</Alert>}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {videoProviders.map((provider) => {
              const isSelected = activeVideoKey === provider.key;

              return (
                <Card
                  key={provider.key}
                  className={`flex flex-col justify-between transition-all ${
                    isSelected
                      ? "border-[var(--primary)] ring-2 ring-[var(--primary)]/20 bg-[var(--primary)]/10"
                      : "border-[#E5E5E5] dark:border-[#2C2C2C]"
                  }`}
                >
                  <div>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-base">{provider.name}</CardTitle>
                        <Badge
                          variant={
                            provider.key === "JITSI"
                              ? "success"
                              : provider.key === "PEERJS"
                              ? provider.status === "OPERATIONAL"
                                ? "success"
                                : provider.status === "FAILED"
                                ? "destructive"
                                : provider.status === "CONFIGURED"
                                ? "outline"
                                : "default"
                              : provider.key === "GOOGLE_MEET"
                              ? provider.status === "CONNECTED"
                                ? "success"
                                : provider.status === "REVOKED"
                                ? "destructive"
                                : provider.status === "CONFIGURED"
                                ? "outline"
                                : "default"
                              : provider.status === "CONFIGURED"
                              ? "outline"
                              : "default"
                          }
                        >
                          {provider.key === "JITSI"
                            ? "Funcional (Ativo)"
                            : provider.key === "PEERJS"
                            ? provider.status === "OPERATIONAL"
                              ? "Sinalização Operacional"
                              : provider.status === "FAILED"
                              ? "Falha na Conexão"
                              : provider.status === "CONFIGURED"
                              ? "Configurado (Não Testado)"
                              : "Configuração Necessária"
                            : provider.key === "GOOGLE_MEET"
                            ? provider.status === "CONNECTED"
                              ? "Conectado via Google OAuth"
                              : provider.status === "REVOKED"
                              ? "Autorização Revogada"
                              : provider.status === "CONFIGURED"
                              ? "Credenciais Salvas (Pendente Autorização)"
                              : "Configuração Necessária"
                            : provider.status === "CONFIGURED"
                            ? "Configurado"
                            : "Configuração Necessária"}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs pt-1 leading-relaxed">
                        {provider.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-3 text-xs pt-0">
                      {provider.key === "JITSI" && (
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <label className="font-medium text-[#404040] dark:text-[#D0D0D0]">
                              Domínio Jitsi Meet
                            </label>
                            <Input
                              placeholder="meet.jit.si"
                              value={jitsiDomain}
                              onChange={(e) => {
                                setJitsiDomain(e.target.value);
                                setVideoFeedback(null);
                                setVideoError(null);
                              }}
                            />
                            <p className="text-[10px] text-[#737373] dark:text-[#A6A6A6]">
                              Padrão público <code>meet.jit.si</code> ou seu servidor Jitsi dedicado.
                            </p>
                          </div>

                          <div className="pt-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleTestJitsi}
                              disabled={isTestingJitsi || !jitsiDomain}
                              className="w-full gap-2 text-xs"
                            >
                              <Activity className="h-3.5 w-3.5" />
                              <span>{isTestingJitsi ? "Testando Jitsi..." : "Testar Servidor Jitsi"}</span>
                            </Button>
                          </div>

                          {jitsiTestFeedback && (
                            <Alert
                              variant={jitsiTestFeedback.success ? "success" : "destructive"}
                              title={jitsiTestFeedback.success ? "Jitsi Operacional" : "Falha na Conexão Jitsi"}
                            >
                              <p className="text-[11px]">{jitsiTestFeedback.message}</p>
                            </Alert>
                          )}
                        </div>
                      )}

                      {provider.key === "PEERJS" && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="font-medium text-[#404040] dark:text-[#D0D0D0]">
                                Host do Servidor PeerJS
                              </label>
                              <Input
                                placeholder="localhost ou peerjs.meuconsultorio.com"
                                value={peerJsHost}
                                onChange={(e) => setPeerJsHost(e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="font-medium text-[#404040] dark:text-[#D0D0D0]">Porta</label>
                              <Input
                                type="number"
                                value={peerJsPort}
                                onChange={(e) => setPeerJsPort(Number(e.target.value))}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="font-medium text-[#404040] dark:text-[#D0D0D0]">Caminho (Path)</label>
                              <Input
                                placeholder="/peerjs"
                                value={peerJsPath}
                                onChange={(e) => setPeerJsPath(e.target.value)}
                              />
                            </div>
                            <div className="space-y-1 flex flex-col justify-end">
                              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[#404040] dark:text-[#D0D0D0] pb-2">
                                <input
                                  type="checkbox"
                                  checked={peerJsSecure}
                                  onChange={(e) => setPeerJsSecure(e.target.checked)}
                                  className="rounded border-[#D4D4D4] dark:border-[#404040] text-[var(--primary)] focus:ring-[var(--primary)]"
                                />
                                <span>Conexão Segura SSL/TLS (HTTPS/WSS)</span>
                              </label>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="font-medium text-[#404040] dark:text-[#D0D0D0]">
                              Servidor STUN (Público ou Dedicado)
                            </label>
                            <Input
                              placeholder="stun:stun.l.google.com:19302"
                              value={peerJsStunServer}
                              onChange={(e) => setPeerJsStunServer(e.target.value)}
                            />
                            <p className="text-[10px] text-[#737373] dark:text-[#A6A6A6]">
                              Utilizado para descoberta de IP reflexivo através de NAT.
                            </p>
                          </div>

                          <div className="space-y-2 pt-1 border-t border-[#E5E5E5] dark:border-[#262626]">
                            <label className="font-semibold text-[#404040] dark:text-[#D0D0D0] text-[11px]">
                              Servidor TURN Opcional (Para NATs Restritivos e Firewalls)
                            </label>
                            <div className="space-y-1">
                              <Input
                                placeholder="turn:turn.meuconsultorio.com:3478"
                                value={peerJsTurnServer}
                                onChange={(e) => setPeerJsTurnServer(e.target.value)}
                              />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <Input
                                placeholder="Usuário TURN"
                                value={peerJsTurnUser}
                                onChange={(e) => setPeerJsTurnUser(e.target.value)}
                              />
                              <Input
                                type="password"
                                placeholder="Senha / Secret TURN"
                                value={peerJsTurnSecret}
                                onChange={(e) => setPeerJsTurnSecret(e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="pt-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleTestPeerJs}
                              disabled={isTestingPeerJs || !peerJsHost}
                              className="w-full gap-2 text-xs"
                            >
                              <Activity className="h-3.5 w-3.5" />
                              <span>{isTestingPeerJs ? "Testando Sinalização..." : "Testar Servidor de Sinalização"}</span>
                            </Button>
                          </div>

                          {peerJsTestFeedback && (
                            <Alert
                              variant={peerJsTestFeedback.success ? "success" : "destructive"}
                              title={peerJsTestFeedback.success ? "Sinalização Validada" : "Falha na Sinalização"}
                            >
                              <div className="text-[11px] space-y-0.5">
                                <p>{peerJsTestFeedback.message}</p>
                                {peerJsTestFeedback.date && (
                                  <p className="text-[10px] opacity-75">
                                    Testado em: {new Date(peerJsTestFeedback.date).toLocaleString("pt-BR")}
                                  </p>
                                )}
                              </div>
                            </Alert>
                          )}
                        </div>
                      )}

                      {provider.key === "GOOGLE_MEET" && (
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <label className="font-medium text-[#404040] dark:text-[#D0D0D0]">
                              Client ID Google Cloud (OAuth 2.0)
                            </label>
                            <Input
                              placeholder="ex: 123456789-xxxx.apps.googleusercontent.com"
                              value={googleMeetClientId}
                              onChange={(e) => setGoogleMeetClientId(e.target.value)}
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="font-medium text-[#404040] dark:text-[#D0D0D0]">
                              Client Secret Google Cloud
                            </label>
                            <Input
                              type="password"
                              placeholder={provider.config?.hasClientSecret ? "••••••••" : "Cole o Client Secret aqui"}
                              value={googleMeetClientSecret}
                              onChange={(e) => setGoogleMeetClientSecret(e.target.value)}
                            />
                            <p className="text-[10px] text-[#737373] dark:text-[#A6A6A6]">
                              Armazenado com segurança no servidor. Nunca exposto na interface do usuário.
                            </p>
                          </div>

                          {/* Caixa de Instruções Google Cloud Console */}
                          <div className="p-3 bg-[#F8F8F8] dark:bg-[#141414] border border-[#E5E5E5] dark:border-[#2C2C2C] rounded-xl space-y-2 text-[11px] text-[#525252] dark:text-[#A6A6A6]">
                            <div className="font-semibold text-[#171717] dark:text-[#F5F5F5] flex items-center gap-1.5">
                              <Info className="h-3.5 w-3.5 text-[var(--primary)]" />
                              <span>Passo a passo no Google Cloud Console:</span>
                            </div>
                            <ol className="list-decimal list-inside space-y-1 pl-1 text-[10px] leading-relaxed">
                              <li>Acesse o <strong>Google Cloud Console</strong> (<code>console.cloud.google.com</code>) e selecione seu projeto.</li>
                              <li>Ative a <strong>Google Calendar API</strong> no menu <em>APIs e Serviços &gt; Biblioteca</em>.</li>
                              <li>Em <em>Tela de consentimento OAuth</em>, configure como <em>Externo</em> e inclua o escopo <code>calendar.events</code>.</li>
                              <li>Em <em>Credenciais</em>, crie um <strong>ID do cliente OAuth</strong> do tipo <em>Aplicativo da Web</em>.</li>
                              <li>Adicione em <strong>URIs de redirecionamento autorizados</strong>:
                                <div className="mt-1 font-mono text-[10px] bg-white dark:bg-[#1E1E1E] p-1.5 rounded border border-[#E5E5E5] dark:border-[#333333] break-all select-all text-[var(--primary)]">
                                  {typeof window !== "undefined" ? `${window.location.origin}/api/admin/integrations/google/callback` : "http://localhost:3000/api/admin/integrations/google/callback"}
                                </div>
                              </li>
                              <li>Cole o Client ID e Client Secret nos campos acima, clique em <strong>Salvar Alterações</strong> e depois em <strong>Conectar Conta Google</strong>.</li>
                            </ol>
                          </div>

                          {/* Se conectado, exibe conta e ações */}
                          {googleMeetStatus === "CONNECTED" && googleMeetAccountEmail ? (
                            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl space-y-2 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                                  <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                  Conta Google Conectada
                                </span>
                                <Badge variant="success" className="text-[10px]">Ativo</Badge>
                              </div>
                              <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                                Conectado como: <strong>{googleMeetAccountEmail}</strong>
                                {googleMeetConnectedAt && (
                                  <span className="block text-[10px] opacity-75 mt-0.5">
                                    Conectado em: {new Date(googleMeetConnectedAt).toLocaleString("pt-BR")}
                                  </span>
                                )}
                              </p>

                              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  onClick={handleTestGoogleMeet}
                                  disabled={isTestingGoogleMeet}
                                  className="gap-1.5 text-xs"
                                >
                                  <Calendar className="h-3.5 w-3.5" />
                                  <span>{isTestingGoogleMeet ? "Testando Google Meet..." : "Testar Emissão Google Meet"}</span>
                                </Button>

                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  onClick={handleDisconnectGoogle}
                                  disabled={isDisconnectingGoogle}
                                  className="gap-1.5 text-xs"
                                >
                                  <Unlink className="h-3.5 w-3.5" />
                                  <span>{isDisconnectingGoogle ? "Desconectando..." : "Desconectar Conta"}</span>
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="pt-1">
                              <Button
                                type="button"
                                onClick={handleConnectGoogle}
                                disabled={!googleMeetClientId || (!googleMeetClientSecret && !provider.config?.hasClientSecret)}
                                className="w-full gap-2 text-xs"
                              >
                                <Link2 className="h-3.5 w-3.5" />
                                <span>Conectar Conta Google via OAuth</span>
                              </Button>
                              {(!googleMeetClientId || (!googleMeetClientSecret && !provider.config?.hasClientSecret)) && (
                                <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1.5 text-center">
                                  * Preencha e salve o Client ID e Client Secret antes de autorizar a conta.
                                </p>
                              )}
                            </div>
                          )}

                          {googleMeetFeedback && (
                            <Alert
                              variant={googleMeetFeedback.success ? "success" : "destructive"}
                              title={googleMeetFeedback.success ? "Integração Validada" : "Falha na Validação"}
                            >
                              <div className="text-[11px] space-y-1">
                                <p>{googleMeetFeedback.message}</p>
                                {googleMeetFeedback.meetUrl && (
                                  <p className="text-[10px] font-mono break-all text-[var(--primary)]">
                                    Sala gerada com sucesso: {googleMeetFeedback.meetUrl}
                                  </p>
                                )}
                              </div>
                            </Alert>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </div>

                  <div className="p-4 pt-0">
                    <Button
                      type="button"
                      variant={isSelected ? "primary" : "secondary"}
                      onClick={() => {
                        setActiveVideoKey(provider.key);
                        setVideoError(null);
                        setVideoFeedback(`Provedor padrão alterado para "${provider.name}". Clique em "Salvar Alterações" para persistir no servidor.`);
                      }}
                      disabled={!provider.isFunctional}
                      className="w-full text-xs gap-1.5"
                    >
                      {isSelected ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span>Provedor Ativo</span>
                        </>
                      ) : (
                        <span>Definir como Padrão</span>
                      )}
                    </Button>

                    {!provider.isFunctional && (
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 text-center pt-1.5 leading-tight">
                        {provider.key === "PEERJS"
                          ? "* Requer host configurado e teste de sinalização aprovado."
                          : provider.key === "GOOGLE_MEET"
                          ? "* Requer Client ID, Client Secret e conta Google conectada."
                          : "* Configuração incompleta."}
                      </p>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="button"
              onClick={handleSaveVideoProviders}
              disabled={!isVideoDirty || isSavingVideo}
              isLoading={isSavingVideo}
              className="gap-2 text-xs"
            >
              {!isSavingVideo && <Save className="h-4 w-4" />}
              <span>{isSavingVideo ? "Salvando..." : "Salvar Alterações"}</span>
            </Button>
          </div>
        </div>
      )}

      {/* ================= ABA 4: SEGURANÇA & MONITORAMENTO ================= */}
      {activeTab === "security" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Monitoramento Técnico (GET)</CardTitle>
              <CardDescription className="text-xs">
                Endpoint seguro para verificação operacional independente via Bearer Token
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-[#F8F8F8] dark:bg-[#141414] border border-[#E5E5E5] dark:border-[#2C2C2C] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#171717] dark:text-[#F5F5F5]">
                    URL do Endpoint Operacional:
                  </span>
                  <Badge variant="success">Pull Only (GET)</Badge>
                </div>

                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={typeof window !== "undefined" ? `${window.location.origin}/api/technical/status` : ""}
                    className="font-mono text-xs bg-white dark:bg-[#1E1E1E]"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        navigator.clipboard.writeText(`${window.location.origin}/api/technical/status`);
                        setCopiedUrl(true);
                        setTimeout(() => setCopiedUrl(false), 2000);
                      }
                    }}
                    className="shrink-0 gap-1.5 text-xs"
                  >
                    {copiedUrl ? <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedUrl ? "Copiado!" : "Copiar URL"}</span>
                  </Button>
                </div>

                <p className="text-[11px] text-[#737373] dark:text-[#A6A6A6]">
                  O painel externo independente deve enviar o cabeçalho <code>Authorization: Bearer &lt;TOKEN&gt;</code> configurado na variável <code>TECHNICAL_STATUS_BEARER_TOKEN</code>. Nenhum token é exposto nesta URL.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
