"use client";

import React, { useEffect, useRef, useState } from "react";
import { formatDate, formatTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import {
  THEME_PRESETS,
  calculateContrastRatio,
  isContrastAccessible,
} from "@/lib/theme-presets";
import { MiniSiteMediaSlotCard } from "@/components/admin/minisite-media-slot-card";
import {
  Settings,
  Bell,
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
  ExternalLink,
  Layers,
  Monitor,
  Activity,
  Radio,
  Link2,
  Unlink,
  Calendar,
  Film,
  UserCircle,
  User,
  Building2,
  Lock,
  MessageCircle,
  Mail,
  Phone,
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

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<
    "profile" | "appearance" | "video" | "general" | "security"
  >("profile");

  // Profile State (Perfil Centralizado)
  const [clinicName, setClinicName] = useState("");
  const [tagline, setTagline] = useState("");
  const [appVersion, setAppVersion] = useState("1.0.0");
  const [fullName, setFullName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [crpCrm, setCrpCrm] = useState("");
  const [title, setTitle] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [instagram, setInstagram] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Appearance State (Task 8 & Phase 1/5)
  const [themeName, setThemeName] = useState<string>("VERDE");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoHorizontalUrl, setLogoHorizontalUrl] = useState<string | null>(null);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState("#16A34A");
  const [secondaryColor, setSecondaryColor] = useState("#DCFCE7");
  const [accentColor, setAccentColor] = useState("#86EFAC");
  const [buttonColor, setButtonColor] = useState("#16A34A");
  const [backgroundColor, setBackgroundColor] = useState("#F0FDF4");
  const [textColor, setTextColor] = useState("#14532D");
  const [isSavingAppearance, setIsSavingAppearance] = useState(false);
  const [appearanceFeedback, setAppearanceFeedback] = useState<string | null>(null);
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
  const [isSavingMedia, setIsSavingMedia] = useState<boolean>(false);

  const pendingHeroColorRef = useRef<Promise<string | null> | null>(null);
  const pendingHeroMobileColorRef = useRef<Promise<string | null> | null>(null);

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

  // General Settings State
  const [timezone, setTimezone] = useState("America/Sao_Paulo");
  const [minNoticeHours, setMinNoticeHours] = useState(24);
  const [horizonDays, setHorizonDays] = useState(30);
  const [cancellationNoticeDays, setCancellationNoticeDays] = useState(3);
  const [generalFeedback, setGeneralFeedback] = useState<string | null>(null);

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
        ["profile", "appearance", "video", "general", "security"].includes(tabParam)
      ) {
        setActiveTab(tabParam as any);
      }
    }
  }, []);

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
          setClinicName(profData.application.clinicName || "");
          setTagline(profData.application.tagline || "");
          setAppVersion(profData.application.appVersion || "1.0.0");
        }
        if (profData.professional) {
          setFullName(profData.professional.fullName || "");
          setDisplayName(profData.professional.displayName || "");
          setCrpCrm(profData.professional.crpCrm || "");
          setTitle(profData.professional.title || "");
          setAdminEmail(profData.professional.adminEmail || "");
        }
        if (profData.contact) {
          setWhatsappNumber(profData.contact.whatsappNumber || "");
          setPhone(profData.contact.phone || "");
          setEmail(profData.contact.email || "");
          setInstagram(profData.contact.instagram || "");
        }
      }

      if (appRes.ok) {
        const appData = await appRes.json();
        setThemeName(appData.themeName || "VERDE");
        setLogoUrl(appData.logoUrl || null);
        setLogoHorizontalUrl(appData.logoHorizontalUrl || null);
        setFaviconUrl(appData.faviconUrl || null);
        setPrimaryColor(appData.primaryColor || "#16A34A");
        setSecondaryColor(appData.secondaryColor || "#DCFCE7");
        setAccentColor(appData.accentColor || "#86EFAC");
        setButtonColor(appData.buttonColor || "#16A34A");
        setBackgroundColor(appData.backgroundColor || "#F0FDF4");
        setTextColor(appData.textColor || "#14532D");
      }

      if (mediaRes && mediaRes.ok) {
        const mediaData = await mediaRes.json();
        if (mediaData.hero) {
          setHeroMediaType(mediaData.hero.mediaType || "IMAGE");
          setHeroMediaUrl(mediaData.hero.mediaUrl || null);
          setHeroPosterUrl(mediaData.hero.posterUrl || null);
          setHeroFps(mediaData.hero.fps ?? 24);
          setHeroPlaybackSpeed(mediaData.hero.playbackSpeed ?? 1);
          setHeroLoop(mediaData.hero.loop ?? true);
          setHeroAutoplay(mediaData.hero.autoplay ?? true);
          setHeroPlaybackMode(mediaData.hero.playbackMode || "AUTOMATIC");
          setHeroPlaybackDirection(mediaData.hero.playbackDirection || "FORWARD");
          setHeroPositioning(mediaData.hero.positioning || "center");
          setHeroFrameCount(mediaData.hero.frameCount ?? 0);
          setHeroFrames(mediaData.hero.frames || []);
          setHeroBgMode(mediaData.hero.bgMode === "MANUAL" ? "MANUAL" : "AUTO");
          setHeroBgDetectedColor(mediaData.hero.bgDetectedColor || null);
          setHeroBgCustomColor(mediaData.hero.bgCustomColor || "#FAF7F2");
          setHeroBgStatus(mediaData.hero.bgStatus || "IDLE");
          setHeroBgMediaRef(mediaData.hero.bgMediaRef || null);
        }
        if (mediaData.heroMobile) {
          setHeroMobileMediaType(mediaData.heroMobile.mediaType || "IMAGE");
          setHeroMobileMediaUrl(mediaData.heroMobile.mediaUrl || null);
          setHeroMobilePosterUrl(mediaData.heroMobile.posterUrl || null);
          setHeroMobileFps(mediaData.heroMobile.fps ?? 24);
          setHeroMobilePlaybackSpeed(mediaData.heroMobile.playbackSpeed ?? 1);
          setHeroMobileLoop(mediaData.heroMobile.loop ?? true);
          setHeroMobileAutoplay(mediaData.heroMobile.autoplay ?? true);
          setHeroMobilePlaybackMode(mediaData.heroMobile.playbackMode || "AUTOMATIC");
          setHeroMobilePlaybackDirection(mediaData.heroMobile.playbackDirection || "FORWARD");
          setHeroMobilePositioning(mediaData.heroMobile.positioning || "center");
          setHeroMobileFrameCount(mediaData.heroMobile.frameCount ?? 0);
          setHeroMobileFrames(mediaData.heroMobile.frames || []);
          setHeroMobileBgDetectedColor(mediaData.heroMobile.bgDetectedColor || null);
          setHeroMobileBgStatus(mediaData.heroMobile.bgStatus || "IDLE");
          setHeroMobileBgMediaRef(mediaData.heroMobile.bgMediaRef || null);
        }
        if (mediaData.about) {
          setAboutMediaType(mediaData.about.mediaType || "IMAGE");
          setAboutMediaUrl(mediaData.about.mediaUrl || null);
          setAboutPosterUrl(mediaData.about.posterUrl || null);
          setAboutFps(mediaData.about.fps ?? 24);
          setAboutPlaybackSpeed(mediaData.about.playbackSpeed ?? 1);
          setAboutLoop(mediaData.about.loop ?? true);
          setAboutAutoplay(mediaData.about.autoplay ?? true);
          setAboutPlaybackMode(mediaData.about.playbackMode || "AUTOMATIC");
          setAboutPlaybackDirection(mediaData.about.playbackDirection || "FORWARD");
          setAboutPositioning(mediaData.about.positioning || "center");
          setAboutFrameCount(mediaData.about.frameCount ?? 0);
          setAboutFrames(mediaData.about.frames || []);
        }
      }

      if (vidRes.ok) {
        const vidData = await vidRes.json();
        setVideoProviders(vidData.providers || []);
        setActiveVideoKey(vidData.activeVideoProvider || "JITSI");
        const jitsi = vidData.providers?.find((p: any) => p.key === "JITSI");
        if (jitsi) setJitsiDomain(jitsi.config?.domain || "meet.jit.si");
        const peer = vidData.providers?.find((p: any) => p.key === "PEERJS");
        if (peer) {
          setPeerJsHost(peer.config?.host || "");
          setPeerJsPort(peer.config?.port || 9000);
          setPeerJsPath(peer.config?.path || "/peerjs");
          setPeerJsSecure(peer.config?.secure ?? false);
          setPeerJsStunServer(peer.config?.stunServer || "stun:stun.l.google.com:19302");
          setPeerJsTurnServer(peer.config?.turnServer || "");
          setPeerJsTurnUser(peer.config?.turnUser || "");
          setPeerJsTurnSecret(peer.config?.turnSecret || "");
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
        if (gmeet) {
          setGoogleMeetClientId(gmeet.config?.clientId || "");
          setGoogleMeetClientSecret(gmeet.config?.clientSecret || "");
          setGoogleMeetAccountEmail(gmeet.config?.accountEmail || null);
          setGoogleMeetConnectedAt(gmeet.config?.connectedAt || null);
          setGoogleMeetStatus(gmeet.status || gmeet.config?.status || null);
        }
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

  // Upload de Asset de Aparência
  const handleUploadAsset = async (assetType: "logo" | "logoHorizontal" | "favicon", file: File) => {
    setUploadingAsset(assetType);
    setAppearanceFeedback(null);

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
        setAppearanceFeedback(data.error || "Erro no upload do arquivo.");
      } else {
        if (assetType === "logo") setLogoUrl(data.url);
        if (assetType === "logoHorizontal") setLogoHorizontalUrl(data.url);
        if (assetType === "favicon") setFaviconUrl(data.url);
        setAppearanceFeedback("Asset enviado e atualizado com sucesso!");
      }
    } catch {
      setAppearanceFeedback("Erro de conexão no upload.");
    } finally {
      setUploadingAsset(null);
    }
  };

  // Seleção de Tema Pré-definido
  const handleSelectThemePreset = (presetKey: string) => {
    setThemeName(presetKey);
    if (presetKey !== "PERSONALIZADO" && THEME_PRESETS[presetKey]) {
      const p = THEME_PRESETS[presetKey];
      setPrimaryColor(p.primaryColor);
      setSecondaryColor(p.secondaryColor);
      setAccentColor(p.accentColor);
      setButtonColor(p.buttonColor);
      setBackgroundColor(p.backgroundColor);
      setTextColor(p.textColor);
    }
  };

  // Alteração de Cor Personalizada
  const handleCustomColorChange = (
    field: "primary" | "secondary" | "accent" | "button" | "background" | "text",
    value: string
  ) => {
    setThemeName("PERSONALIZADO");
    if (field === "primary") {
      setPrimaryColor(value);
      setButtonColor(value);
    }
    if (field === "secondary") setSecondaryColor(value);
    if (field === "accent") setAccentColor(value);
    if (field === "button") setButtonColor(value);
    if (field === "background") setBackgroundColor(value);
    if (field === "text") setTextColor(value);
  };

  // Salva Perfil Centralizado (Seções A, B e C)
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileFeedback(null);
    setProfileError(null);

    try {
      const res = await fetch("/api/admin/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinicName,
          tagline,
          fullName,
          displayName,
          crpCrm,
          title,
          whatsappNumber,
          phone,
          email,
          instagram,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setProfileError(data.error || "Erro ao salvar alterações do perfil.");
        return;
      }

      setProfileFeedback("Configurações de perfil e dados de contato atualizados com sucesso!");
      if (data.contact?.whatsappNumber) {
        setWhatsappNumber(data.contact.whatsappNumber);
      }
    } catch {
      setProfileError("Erro de comunicação com o servidor ao salvar perfil.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Salva Aparência (Phase 1/5)
  const handleSaveAppearance = async () => {
    setIsSavingAppearance(true);
    setAppearanceFeedback(null);

    try {
      const res = await fetch("/api/admin/appearance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          themeName,
          primaryColor,
          secondaryColor,
          accentColor,
          buttonColor,
          backgroundColor,
          textColor,
          logoUrl,
          logoHorizontalUrl,
          faviconUrl,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        // Atualiza dinamicamente as variáveis de tema no DOM sem necessidade de recarregar
        if (typeof document !== "undefined") {
          document.documentElement.style.setProperty("--primary", primaryColor);
          document.documentElement.style.setProperty("--primary-foreground", "#ffffff");
          document.documentElement.style.setProperty("--secondary", secondaryColor);
          document.documentElement.style.setProperty("--accent", accentColor);
          document.documentElement.style.setProperty("--button-bg", buttonColor);
          document.documentElement.style.setProperty("--button-fg", "#ffffff");
          document.documentElement.style.setProperty("--ring", primaryColor);
          document.documentElement.style.setProperty("--theme-bg", backgroundColor);
          document.documentElement.style.setProperty("--theme-text", textColor);
        }

        setAppearanceFeedback("Configurações de aparência e tema salvas com sucesso em todo o sistema!");
      } else {
        setAppearanceFeedback(data.error || "Erro ao salvar aparência.");
      }
    } catch {
      setAppearanceFeedback("Erro de comunicação ao salvar aparência.");
    } finally {
      setIsSavingAppearance(false);
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

  // Restaura Aparência Padrão (Verde Institucional PSI)
  const handleRestoreAppearanceDefaults = () => {
    const p = THEME_PRESETS.VERDE;
    setThemeName("VERDE");
    setPrimaryColor(p.primaryColor);
    setSecondaryColor(p.secondaryColor);
    setAccentColor(p.accentColor);
    setButtonColor(p.buttonColor);
    setBackgroundColor(p.backgroundColor);
    setTextColor(p.textColor);
    setAppearanceFeedback("Cores restauradas para a paleta padrão do PSI (Verde). Clique em Salvar para persistir.");
  };

  // Upload universal de mídia para as 3 áreas do MiniSite (reconhecimento automático no servidor)
  const handleUploadSlotMedia = async (
    slot: "hero" | "hero_mobile" | "about",
    file: File
  ) => {
    setUploadingSlot(slot);
    setMediaFeedback(null);
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
        setMediaFeedback(`Erro no upload: ${data.error}`);
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
        `Mídia enviada para "${areaLabel}" e reconhecida como ${formatLabel}. Clique em "Salvar Mídias do MiniSite" para publicar.`
      );
    } catch {
      setMediaFeedback("Erro de conexão ao enviar arquivo de mídia.");
    } finally {
      setUploadingSlot(null);
    }
  };

  // Remover mídia de uma área do MiniSite
  const handleRemoveSlotMedia = (slot: "hero" | "hero_mobile" | "about") => {
    if (slot === "hero") {
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
      setAboutMediaUrl(null);
      setAboutPosterUrl(null);
      setAboutFrames([]);
      setAboutFrameCount(0);
      setAboutMediaType("IMAGE");
      setAboutPlaybackSpeed(1);
    }
    setMediaFeedback(
      'Mídia removida da prévia. Clique em "Salvar Mídias do MiniSite" para confirmar a alteração.'
    );
  };

  // Salvar configurações de mídia do MiniSite
  const handleSaveMediaSettings = async () => {
    setIsSavingMedia(true);
    setMediaFeedback(null);
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
            bgMode: resolvedHeroBgColor ? "AUTO" : heroBgMode,
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
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMediaFeedback("Configurações de mídia do MiniSite salvas e publicadas com sucesso!");
      } else {
        setMediaFeedback(data.error || "Erro ao salvar mídias.");
      }
    } catch {
      setMediaFeedback("Erro de rede ao salvar configurações de mídia.");
    } finally {
      setIsSavingMedia(false);
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
        loadData();
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
        loadData();
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
        loadData();
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

  // Salva Provedores de Vídeo (Task 9 & Phase 1 WebRTC)
  const handleSaveVideoProviders = async () => {
    setIsSavingVideo(true);
    setVideoFeedback(null);

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
        setVideoFeedback(data.error || "Erro ao salvar provedor de vídeo.");
      } else {
        setVideoFeedback("Provedor padrão e configurações de teleconsulta atualizados!");
        loadData();
      }
    } catch {
      setVideoFeedback("Erro ao atualizar provedor de vídeo.");
    } finally {
      setIsSavingVideo(false);
    }
  };

  if (isLoading) {
    return <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações do Consultório</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Personalize a identidade visual da clínica, teleconsulta, agenda e políticas operacionais.
        </p>
      </div>

      {/* Tabs Principais */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto text-xs font-medium">
        <button
          onClick={() => setActiveTab("profile")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-colors shrink-0 ${
            activeTab === "profile"
              ? "bg-[var(--primary)]/10 text-[var(--primary)] font-semibold shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <UserCircle className="h-4 w-4" />
          <span>Perfil</span>
        </button>

        <button
          onClick={() => setActiveTab("appearance")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-colors shrink-0 ${
            activeTab === "appearance"
              ? "bg-[var(--primary)]/10 text-[var(--primary)] font-semibold shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Palette className="h-4 w-4" />
          <span>Aparência</span>
        </button>

        <button
          onClick={() => setActiveTab("video")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-colors shrink-0 ${
            activeTab === "video"
              ? "bg-[var(--primary)]/10 text-[var(--primary)] font-semibold shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Video className="h-4 w-4" />
          <span>Consultas Virtuais</span>
        </button>

        <button
          onClick={() => setActiveTab("general")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-colors shrink-0 ${
            activeTab === "general"
              ? "bg-[var(--primary)]/10 text-[var(--primary)] font-semibold shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Settings className="h-4 w-4" />
          <span>Agenda & Políticas</span>
        </button>

        <button
          onClick={() => setActiveTab("security")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-colors shrink-0 ${
            activeTab === "security"
              ? "bg-[var(--primary)]/10 text-[var(--primary)] font-semibold shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>Segurança & Monitoramento</span>
        </button>
      </div>

      {/* ================= ABA 0: PERFIL & IDENTIDADE CENTRALIZADA ================= */}
      {activeTab === "profile" && (
        <form onSubmit={handleSaveProfile} className="space-y-6">
          <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-[#171717] dark:text-[#F5F5F5]">
              <UserCircle className="h-4 w-4 text-[var(--primary)]" />
              <span>Fonte Centralizada de Perfil e Contato</span>
            </p>
            <p>
              As informações abaixo alimentam a identidade institucional, o MiniSite público e o canal de suporte aos pacientes em uma única fonte da verdade.
            </p>
          </div>

          {profileFeedback && <Alert variant="success">{profileFeedback}</Alert>}
          {profileError && <Alert variant="destructive">{profileError}</Alert>}

          {/* SEÇÃO A — DADOS DA APLICAÇÃO */}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Nome da Aplicação / Consultório *"
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                  placeholder="Ex: Consultório de Psicologia & Psiquiatria"
                  required
                />
                <Input
                  label="Descrição Curta da Aplicação"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
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
            </CardContent>
          </Card>

          {/* SEÇÃO B — DADOS DO ADMINISTRADOR / PROFISSIONAL */}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Nome Completo do Profissional *"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ex: Helena de Souza Martins"
                  required
                />
                <div>
                  <Input
                    label="Nome de Exibição Público"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Ex: Dra. Helena Martins"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Nome social ou profissional exibido no MiniSite público e crachás. Se vazio, utiliza o nome completo.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Registro Profissional (CRP / CRM) *"
                  value={crpCrm}
                  onChange={(e) => setCrpCrm(e.target.value)}
                  placeholder="Ex: CRP 06/184920"
                  required
                />
                <Input
                  label="Especialidade / Título Profissional"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
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
            </CardContent>
          </Card>

          {/* SEÇÃO C — CONTATOS E REDES SOCIAIS */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-emerald-600" />
                <span>Seção C — Contatos e Redes Sociais</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Canais de contato compartilhados para agendamento, botões do MiniSite e suporte ao paciente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Input
                    label="Telefone / WhatsApp de Contato (com DDD) *"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="Ex: (11) 99123-4567 ou 5511991234567"
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Normalizado automaticamente no formato internacional com DDI 55 para links diretos de WhatsApp.
                  </p>
                </div>
                <Input
                  label="Telefone Comercial Alternativo"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ex: (11) 3214-5678"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Input
                    label="E-mail Público de Contato"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contato@consultorio.com.br"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    E-mail público exibido no rodapé do MiniSite (separado do e-mail de acesso administrativo).
                  </p>
                </div>
                <div>
                  <Input
                    label="Instagram"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    placeholder="@dra.helenamartins"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Perfil oficial para links de redes sociais na página pública do consultório.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* BOTÃO DE SALVAR PERFIL */}
          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              size="lg"
              disabled={isSavingProfile}
              className="gap-2 bg-[var(--button-bg,var(--primary))] hover:brightness-105 text-white"
            >
              <Save className="h-4 w-4" />
              <span>{isSavingProfile ? "Salvando Perfil..." : "Salvar Configurações de Perfil"}</span>
            </Button>
          </div>
        </form>
      )}

      {/* ================= ABA 1: APARÊNCIA & CORES (PHASE 1/5) ================= */}
      {activeTab === "appearance" && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-[#171717] dark:text-[#F5F5F5]">
              <Palette className="h-4 w-4 text-[var(--primary)]" />
              <span>Sistema Global de Aparência e Temas (Fase 1 de 5)</span>
            </p>
            <p>
              Escolha uma das paletas predefinidas ou personalize as cores institucionais do consultório. O tema selecionado unifica os painéis administrativos, a área do paciente e o MiniSite público em tempo real.
            </p>
          </div>

          {appearanceFeedback && <Alert variant="info">{appearanceFeedback}</Alert>}

          {/* 1. TEMA DO SISTEMA E PRÉVIA DO TEMA (Referência: Imagem 1) */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Palette className="h-5 w-5 text-[var(--primary)]" />
                <span>Aparência</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Selecione um tema pré-definido para aplicar instantaneamente a paleta harmônica correspondente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Tema do Sistema
                </h4>
                <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-9 gap-3">
                  {/* Presets 1 a 8 */}
                  {Object.values(THEME_PRESETS).map((preset) => {
                    const isSelected = themeName === preset.key;
                    return (
                      <button
                        key={preset.key}
                        type="button"
                        onClick={() => handleSelectThemePreset(preset.key)}
                        className="flex flex-col items-center gap-1.5 group cursor-pointer focus:outline-none"
                      >
                        <div
                          className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center transition-all shadow-xs ${
                            isSelected
                              ? "ring-4 ring-offset-2 ring-[var(--primary)] dark:ring-offset-slate-900 scale-105"
                              : "hover:scale-105 border border-slate-200 dark:border-slate-700"
                          }`}
                          style={{ backgroundColor: preset.swatch }}
                        >
                          {isSelected && (
                            <Check className="h-5 w-5 text-white drop-shadow-md stroke-[3]" />
                          )}
                        </div>
                        <span
                          className={`text-xs text-center truncate max-w-full ${
                            isSelected
                              ? "font-bold text-slate-900 dark:text-slate-100"
                              : "text-slate-600 dark:text-slate-400 group-hover:text-slate-900"
                          }`}
                        >
                          {preset.label}
                        </span>
                      </button>
                    );
                  })}

                  {/* Preset 9: Personalizado */}
                  <button
                    type="button"
                    onClick={() => setThemeName("PERSONALIZADO")}
                    className="flex flex-col items-center gap-1.5 group cursor-pointer focus:outline-none"
                  >
                    <div
                      className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center transition-all shadow-xs bg-gradient-to-tr from-purple-500 via-pink-500 to-indigo-500 ${
                        themeName === "PERSONALIZADO"
                          ? "ring-4 ring-offset-2 ring-[var(--primary)] dark:ring-offset-slate-900 scale-105"
                          : "hover:scale-105 border border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      <Palette className="h-6 w-6 text-white drop-shadow-md" />
                    </div>
                    <span
                      className={`text-xs text-center truncate max-w-full ${
                        themeName === "PERSONALIZADO"
                          ? "font-bold text-slate-900 dark:text-slate-100"
                          : "text-slate-600 dark:text-slate-400 group-hover:text-slate-900"
                      }`}
                    >
                      Personalizado
                    </span>
                  </button>
                </div>
              </div>

              {/* Preview do Tema (Referência fiel da Imagem 1) */}
              <div className="pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Preview do Tema
                </h4>
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 max-w-md space-y-4 shadow-2xs">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-14 h-14 rounded-xl shadow-xs shrink-0 transition-colors"
                      style={{ backgroundColor: primaryColor }}
                    />
                    <div className="space-y-2 flex-1">
                      <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded-full w-4/5 animate-pulse" />
                      <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full w-1/2 animate-pulse" />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-xs text-white shadow-xs transition-colors text-center"
                      style={{ backgroundColor: buttonColor || primaryColor }}
                    >
                      Botão Principal
                    </button>
                    <button
                      type="button"
                      className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-xs text-center"
                    >
                      Botão Secundário
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. CORES PERSONALIZADAS */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Cores Personalizadas</CardTitle>
              <CardDescription className="text-xs">
                Ajuste os valores hexadecimais de cada token de design. Modificar qualquer cor comuta o tema para &quot;Personalizado&quot;.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Cor Primária */}
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <div>
                    <span className="font-semibold block text-slate-800 dark:text-slate-200">Cor Primária</span>
                    <span className="text-[11px] text-slate-400">Destaques, botões, ícones e links</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => handleCustomColorChange("primary", e.target.value)}
                      className="h-8 w-8 rounded-lg cursor-pointer border-0 p-0 shrink-0"
                    />
                    <Input
                      value={primaryColor}
                      onChange={(e) => handleCustomColorChange("primary", e.target.value)}
                      className="font-mono text-xs uppercase"
                    />
                  </div>
                </div>

                {/* Cor Secundária */}
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <div>
                    <span className="font-semibold block text-slate-800 dark:text-slate-200">Cor Secundária</span>
                    <span className="text-[11px] text-slate-400">Superfícies suaves e fundos de badges</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => handleCustomColorChange("secondary", e.target.value)}
                      className="h-8 w-8 rounded-lg cursor-pointer border-0 p-0 shrink-0"
                    />
                    <Input
                      value={secondaryColor}
                      onChange={(e) => handleCustomColorChange("secondary", e.target.value)}
                      className="font-mono text-xs uppercase"
                    />
                  </div>
                </div>

                {/* Cor de Destaque */}
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <div>
                    <span className="font-semibold block text-slate-800 dark:text-slate-200">Cor de Destaque</span>
                    <span className="text-[11px] text-slate-400">Realces e marcações ativas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => handleCustomColorChange("accent", e.target.value)}
                      className="h-8 w-8 rounded-lg cursor-pointer border-0 p-0 shrink-0"
                    />
                    <Input
                      value={accentColor}
                      onChange={(e) => handleCustomColorChange("accent", e.target.value)}
                      className="font-mono text-xs uppercase"
                    />
                  </div>
                </div>

                {/* Cor de Fundo */}
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <div>
                    <span className="font-semibold block text-slate-800 dark:text-slate-200">Cor de Fundo</span>
                    <span className="text-[11px] text-slate-400">Superfície base do MiniSite e tema</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={backgroundColor}
                      onChange={(e) => handleCustomColorChange("background", e.target.value)}
                      className="h-8 w-8 rounded-lg cursor-pointer border-0 p-0 shrink-0"
                    />
                    <Input
                      value={backgroundColor}
                      onChange={(e) => handleCustomColorChange("background", e.target.value)}
                      className="font-mono text-xs uppercase"
                    />
                  </div>
                </div>

                {/* Cor do Texto */}
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <div>
                    <span className="font-semibold block text-slate-800 dark:text-slate-200">Cor do Texto</span>
                    <span className="text-[11px] text-slate-400">Tipografia e títulos principais</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => handleCustomColorChange("text", e.target.value)}
                      className="h-8 w-8 rounded-lg cursor-pointer border-0 p-0 shrink-0"
                    />
                    <Input
                      value={textColor}
                      onChange={(e) => handleCustomColorChange("text", e.target.value)}
                      className="font-mono text-xs uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* Indicador de Contraste e Acessibilidade (WCAG AA) */}
              {(() => {
                const ratio = calculateContrastRatio(textColor, backgroundColor);
                const isAccessible = isContrastAccessible(textColor, backgroundColor);

                return isAccessible ? (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>
                      Contraste Texto/Fundo: <strong>{ratio}:1</strong> — Em conformidade com a norma WCAG AA (mínimo 4.5:1). Legibilidade comprovada.
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>
                      Contraste Texto/Fundo: <strong>{ratio}:1</strong> — Abaixo do mínimo recomendado pela WCAG AA (4.5:1). Aumente o contraste entre a cor do texto e a cor de fundo para garantir acessibilidade.
                    </span>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* 3. IMAGENS DO SISTEMA (Referência: Imagens 2 e 3) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Imagens do Sistema</CardTitle>
              <CardDescription className="text-xs">
                Faça o envio do favicon, do logotipo padrão e do banner/logo horizontal oficial do consultório.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 1. Favicon (32x32px) */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between space-y-3">
                  <div>
                    <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200">
                      Favicon (32x32px)
                    </h5>
                    <div className="h-16 flex items-center justify-center my-2">
                      {faviconUrl ? (
                        <img src={faviconUrl} alt="Favicon" className="h-8 w-8 object-contain" />
                      ) : (
                        <span className="text-[10px] text-slate-400">Sem favicon cadastrado</span>
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
                    className="p-3 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
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
                      <Upload className="h-5 w-5 text-slate-400 mx-auto mb-1" />
                      <p className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                        {uploadingAsset === "favicon" ? "Enviando..." : "Clique para upload ou arraste aqui"}
                      </p>
                      <p className="text-[10px] text-slate-400">ICO, PNG, JPG (32x32px)</p>
                    </label>
                  </div>

                  {faviconUrl && (
                    <button
                      type="button"
                      onClick={() => setFaviconUrl(null)}
                      className="text-[11px] text-red-500 hover:underline block text-center"
                    >
                      Remover favicon
                    </button>
                  )}
                </div>

                {/* 2. Logo (200x80px) */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between space-y-3">
                  <div>
                    <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200">
                      Logo (200x80px)
                    </h5>
                    <div className="h-16 flex items-center justify-center my-2 p-1 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                      {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="h-full max-w-[200px] object-contain" />
                      ) : (
                        <span className="text-[10px] text-slate-400">Sem logo cadastrado</span>
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
                    className="p-3 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
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
                      <Upload className="h-5 w-5 text-slate-400 mx-auto mb-1" />
                      <p className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                        {uploadingAsset === "logo" ? "Enviando..." : "Clique para upload ou arraste aqui"}
                      </p>
                      <p className="text-[10px] text-slate-400">PNG com fundo transparente (200x80px)</p>
                    </label>
                  </div>

                  {logoUrl && (
                    <button
                      type="button"
                      onClick={() => setLogoUrl(null)}
                      className="text-[11px] text-red-500 hover:underline block text-center"
                    >
                      Remover logo
                    </button>
                  )}
                </div>

                {/* 3. Banner PC / Logo Horizontal (1400x140px) */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between space-y-3">
                  <div>
                    <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200">
                      Banner PC (1400x140px)
                    </h5>
                    <div className="h-16 flex items-center justify-center my-2 p-1 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                      {logoHorizontalUrl ? (
                        <img src={logoHorizontalUrl} alt="Banner/Horizontal" className="h-full w-full object-contain" />
                      ) : (
                        <span className="text-[10px] text-slate-400">Sem banner cadastrado</span>
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
                    className="p-3 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
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
                      <Upload className="h-5 w-5 text-slate-400 mx-auto mb-1" />
                      <p className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                        {uploadingAsset === "logoHorizontal" ? "Enviando..." : "Clique para upload ou arraste aqui"}
                      </p>
                      <p className="text-[10px] text-slate-400">JPG, PNG (1400x140px)</p>
                    </label>
                  </div>

                  {logoHorizontalUrl && (
                    <button
                      type="button"
                      onClick={() => setLogoHorizontalUrl(null)}
                      className="text-[11px] text-red-500 hover:underline block text-center"
                    >
                      Remover banner
                    </button>
                  )}
                </div>
              </div>

              {/* Dicas para as imagens (Referência fiel da Imagem 3) */}
              <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/60 text-xs text-purple-900 dark:text-purple-200 space-y-2">
                <p className="font-bold flex items-center gap-1.5 text-purple-950 dark:text-purple-100">
                  <Info className="h-4 w-4" />
                  <span>Dicas para as imagens:</span>
                </p>
                <ul className="space-y-1.5 text-[11px] text-purple-900/80 dark:text-purple-200/90 pl-1">
                  <li className="flex items-start gap-1.5">
                    <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                    <span><strong>Favicon:</strong> Use imagens quadradas no tamanho exato de 32x32 pixels</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                    <span><strong>Logo:</strong> Use PNG com fundo transparente no tamanho 200x80 pixels</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                    <span><strong>Banner Mobile:</strong> Use imagens no tamanho de 420x140 pixels</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                    <span><strong>Banner PC:</strong> Use imagens no tamanho de 1400x140 pixels</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                    <span><strong>Tamanho máximo por arquivo:</strong> 5MB</span>
                  </li>
                </ul>
              </div>

              {/* Ações da Aba Aparência */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleRestoreAppearanceDefaults}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Restaurar Padrão</span>
                </Button>

                <Button
                  type="button"
                  onClick={handleSaveAppearance}
                  disabled={isSavingAppearance}
                  className="gap-2 text-xs"
                >
                  <Save className="h-4 w-4" />
                  <span>{isSavingAppearance ? "Salvando..." : "Salvar e Aplicar Tema"}</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* CARD: IMAGENS & ANIMAÇÕES DO MINISITE (HERO DESKTOP, HERO MOBILE, SOBRE MIM) */}
          <Card className="border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
            <CardHeader className="pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
                  <Film className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">
                    Imagens & Animações do MiniSite
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Envie a mídia de cada área e o sistema reconhecerá o formato automaticamente.
                  </CardDescription>
                </div>
              </div>

              {mediaFeedback && (
                <div className="mt-3 p-3 rounded-lg text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <span className="text-slate-800 dark:text-slate-200 font-medium">{mediaFeedback}</span>
                  <button
                    type="button"
                    onClick={() => setMediaFeedback(null)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs ml-2"
                  >
                    ✕
                  </button>
                </div>
              )}
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

              {/* Botão único de salvamento */}
              <div className="flex items-center justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
                <Button
                  type="button"
                  onClick={handleSaveMediaSettings}
                  disabled={isSavingMedia || uploadingSlot !== null}
                  className="gap-2 text-xs bg-[var(--button-bg,var(--primary))] hover:brightness-105 text-white"
                >
                  <Save className="h-4 w-4" />
                  <span>{isSavingMedia ? "Salvando Mídias..." : "Salvar Mídias do MiniSite"}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ================= ABA 3: CONSULTAS VIRTUAIS (TASK 9) ================= */}
      {activeTab === "video" && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-xs text-slate-800 dark:text-[#F5F5F5] space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <Video className="h-4 w-4 text-[var(--primary)]" />
              <span>Opções de Teleconsulta e Provedores de Vídeo (Task 9)</span>
            </p>
            <p>
              O PSI oferece suporte arquitetural a 3 provedores de videoconferência. Apenas <strong>um provedor padrão ativo</strong> é selecionado por instalação. Alterar o padrão afeta novos atendimentos, preservando as consultas já agendadas com seus links originais.
            </p>
          </div>

          {videoFeedback && <Alert variant="info">{videoFeedback}</Alert>}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {videoProviders.map((provider) => {
              const isSelected = activeVideoKey === provider.key;

              return (
                <Card
                  key={provider.key}
                  className={`flex flex-col justify-between transition-all ${
                    isSelected
                      ? "border-[var(--primary)] ring-2 ring-[var(--primary)]/20 bg-[var(--primary)]/10"
                      : "border-slate-200 dark:border-slate-800"
                  }`}
                >
                  <div>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
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
                            <label className="font-medium text-slate-700 dark:text-slate-300">
                              Domínio Jitsi Meet
                            </label>
                            <Input
                              placeholder="meet.jit.si"
                              value={jitsiDomain}
                              onChange={(e) => setJitsiDomain(e.target.value)}
                            />
                            <p className="text-[10px] text-slate-400">
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
                              className="w-full gap-2 text-xs border-[var(--primary)]/30 text-[var(--primary)] hover:bg-[var(--primary)]/10"
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
                              <label className="font-medium text-slate-700 dark:text-slate-300">
                                Host do Servidor PeerJS
                              </label>
                              <Input
                                placeholder="localhost ou peerjs.meuconsultorio.com"
                                value={peerJsHost}
                                onChange={(e) => setPeerJsHost(e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="font-medium text-slate-700 dark:text-slate-300">Porta</label>
                              <Input
                                type="number"
                                value={peerJsPort}
                                onChange={(e) => setPeerJsPort(Number(e.target.value))}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="font-medium text-slate-700 dark:text-slate-300">Caminho (Path)</label>
                              <Input
                                placeholder="/peerjs"
                                value={peerJsPath}
                                onChange={(e) => setPeerJsPath(e.target.value)}
                              />
                            </div>
                            <div className="space-y-1 flex flex-col justify-end">
                              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300 pb-2">
                                <input
                                  type="checkbox"
                                  checked={peerJsSecure}
                                  onChange={(e) => setPeerJsSecure(e.target.checked)}
                                  className="rounded border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]"
                                />
                                <span>Conexão Segura SSL/TLS (HTTPS/WSS)</span>
                              </label>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="font-medium text-slate-700 dark:text-slate-300">
                              Servidor STUN (Público ou Dedicado)
                            </label>
                            <Input
                              placeholder="stun:stun.l.google.com:19302"
                              value={peerJsStunServer}
                              onChange={(e) => setPeerJsStunServer(e.target.value)}
                            />
                            <p className="text-[10px] text-slate-400">
                              Utilizado para descoberta de IP reflexivo através de NAT.
                            </p>
                          </div>

                          <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                            <label className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
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
                              className="w-full gap-2 text-xs border-[var(--primary)]/30 text-[var(--primary)] hover:bg-[var(--primary)]/10"
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
                            <label className="font-medium text-slate-700 dark:text-slate-300">
                              Client ID Google Cloud (OAuth 2.0)
                            </label>
                            <Input
                              placeholder="ex: 123456789-xxxx.apps.googleusercontent.com"
                              value={googleMeetClientId}
                              onChange={(e) => setGoogleMeetClientId(e.target.value)}
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="font-medium text-slate-700 dark:text-slate-300">
                              Client Secret Google Cloud
                            </label>
                            <Input
                              type="password"
                              placeholder={provider.config?.hasClientSecret ? "••••••••" : "Cole o Client Secret aqui"}
                              value={googleMeetClientSecret}
                              onChange={(e) => setGoogleMeetClientSecret(e.target.value)}
                            />
                            <p className="text-[10px] text-slate-400">
                              Armazenado com segurança no servidor. Nunca exposto na interface do usuário.
                            </p>
                          </div>

                          {/* Caixa de Instruções Google Cloud Console */}
                          <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 text-[11px] text-slate-600 dark:text-slate-400">
                            <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                              <Info className="h-3.5 w-3.5 text-[var(--primary)]" />
                              <span>Passo a passo no Google Cloud Console:</span>
                            </div>
                            <ol className="list-decimal list-inside space-y-1 pl-1 text-[10px] leading-relaxed">
                              <li>Acesse o <strong>Google Cloud Console</strong> (<code>console.cloud.google.com</code>) e selecione seu projeto.</li>
                              <li>Ative a <strong>Google Calendar API</strong> no menu <em>APIs e Serviços &gt; Biblioteca</em>.</li>
                              <li>Em <em>Tela de consentimento OAuth</em>, configure como <em>Externo</em> e inclua o escopo <code>calendar.events</code>.</li>
                              <li>Em <em>Credenciais</em>, crie um <strong>ID do cliente OAuth</strong> do tipo <em>Aplicativo da Web</em>.</li>
                              <li>Adicione em <strong>URIs de redirecionamento autorizados</strong>:
                                <div className="mt-1 font-mono text-[10px] bg-white dark:bg-slate-800 p-1.5 rounded border border-slate-200 dark:border-slate-700 break-all select-all text-[var(--primary)]">
                                  {typeof window !== "undefined" ? `${window.location.origin}/api/admin/integrations/google/callback` : "http://localhost:3000/api/admin/integrations/google/callback"}
                                </div>
                              </li>
                              <li>Cole o Client ID e Client Secret nos campos acima, clique em <strong>Salvar Configurações</strong> e depois em <strong>Conectar Conta Google</strong>.</li>
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
                                  variant="outline"
                                  size="sm"
                                  onClick={handleTestGoogleMeet}
                                  disabled={isTestingGoogleMeet}
                                  className="gap-1.5 text-xs border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
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
                                className="w-full gap-2 text-xs bg-[var(--button-bg,var(--primary))] hover:brightness-105 text-white"
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
                      variant={isSelected ? "primary" : "outline"}
                      onClick={() => {
                        setActiveVideoKey(provider.key);
                        setVideoFeedback(`Provedor padrão alterado para "${provider.name}". Clique em "Salvar Configurações de Teleconsulta" para persistir o padrão no servidor.`);
                      }}
                      disabled={!provider.isFunctional}
                      className={`w-full text-xs gap-1.5 ${
                        isSelected ? "bg-[var(--button-bg,var(--primary))] text-white font-semibold" : ""
                      }`}
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
              disabled={isSavingVideo}
              className="gap-2 text-xs bg-[var(--button-bg,var(--primary))] hover:brightness-105 text-white"
            >
              <Save className="h-4 w-4" />
              <span>{isSavingVideo ? "Salvando..." : "Salvar Configurações de Teleconsulta"}</span>
            </Button>
          </div>
        </div>
      )}

      {/* ================= ABA 4: GERAL & POLÍTICAS ================= */}
      {activeTab === "general" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Políticas de Agenda e Horários</CardTitle>
            <CardDescription className="text-xs">
              Defina as regras gerais de antecedência mínima, limite de agendamento e cancelamentos
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 text-xs">
            {generalFeedback && <Alert variant="success">{generalFeedback}</Alert>}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-semibold block text-slate-800 dark:text-slate-200">
                  Fuso Horário Padrão do Consultório
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs"
                >
                  <option value="America/Sao_Paulo">Brasília (America/Sao_Paulo - GMT-3)</option>
                  <option value="America/Manaus">Manaus (America/Manaus - GMT-4)</option>
                  <option value="America/Belem">Belém (America/Belem - GMT-3)</option>
                  <option value="America/Cuiaba">Cuiabá (America/Cuiaba - GMT-4)</option>
                  <option value="America/Fortaleza">Fortaleza (America/Fortaleza - GMT-3)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold block text-slate-800 dark:text-slate-200">
                  Antecedência Mínima para Reserva (Horas)
                </label>
                <Input
                  type="number"
                  value={minNoticeHours}
                  onChange={(e) => setMinNoticeHours(Number(e.target.value))}
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold block text-slate-800 dark:text-slate-200">
                  Horizonte Máximo de Agendamento (Dias à frente)
                </label>
                <Input
                  type="number"
                  value={horizonDays}
                  onChange={(e) => setHorizonDays(Number(e.target.value))}
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold block text-slate-800 dark:text-slate-200">
                  Prazo Limite para Cancelamento sem Penalidade (Dias)
                </label>
                <Input
                  type="number"
                  value={cancellationNoticeDays}
                  onChange={(e) => setCancellationNoticeDays(Number(e.target.value))}
                />
                <p className="text-[10px] text-slate-400">
                  Padrão do contrato terapêutico: 3 dias úteis de antecedência.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                onClick={() => setGeneralFeedback("Políticas de agendamento salvas com sucesso!")}
                className="gap-2 text-xs bg-[var(--button-bg,var(--primary))] hover:brightness-105 text-white"
              >
                <Save className="h-4 w-4" />
                <span>Salvar Políticas</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ================= ABA 5: SEGURANÇA & MONITORAMENTO ================= */}
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
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    URL do Endpoint Operacional:
                  </span>
                  <Badge variant="success">Pull Only (GET)</Badge>
                </div>

                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={typeof window !== "undefined" ? `${window.location.origin}/api/technical/status` : ""}
                    className="font-mono text-xs bg-white dark:bg-slate-900"
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
                    {copiedUrl ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedUrl ? "Copiado!" : "Copiar URL"}</span>
                  </Button>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400">
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
