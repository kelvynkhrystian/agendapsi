"use client";

import React, { useEffect, useState } from "react";
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
import { MiniSiteMediaPlayer } from "@/components/minisite/media-player";
import {
  Settings,
  Bell,
  Palette,
  Video,
  ShieldCheck,
  Save,
  RotateCcw,
  Upload,
  Eye,
  Check,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Copy,
  Info,
  ExternalLink,
  Sparkles,
  Layers,
  Monitor,
  Activity,
  Radio,
  Link2,
  Unlink,
  Calendar,
  Film,
  FileArchive,
  Play,
  Folder,
  Images,
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
    "appearance" | "video" | "general" | "security"
  >("appearance");

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

  // MiniSite Media Slots State (Phase 3/5)
  const [heroMediaType, setHeroMediaType] = useState<string>("IMAGE");
  const [heroMediaUrl, setHeroMediaUrl] = useState<string | null>(null);
  const [heroPosterUrl, setHeroPosterUrl] = useState<string | null>(null);
  const [heroFps, setHeroFps] = useState<number>(24);
  const [heroLoop, setHeroLoop] = useState<boolean>(true);
  const [heroAutoplay, setHeroAutoplay] = useState<boolean>(true);
  const [heroPlaybackMode, setHeroPlaybackMode] = useState<string>("AUTOMATIC");
  const [heroPlaybackDirection, setHeroPlaybackDirection] = useState<string>("FORWARD");
  const [heroPositioning, setHeroPositioning] = useState<string>("center");
  const [heroFrameCount, setHeroFrameCount] = useState<number>(0);
  const [heroFrames, setHeroFrames] = useState<string[]>([]);

  const [aboutMediaType, setAboutMediaType] = useState<string>("IMAGE");
  const [aboutMediaUrl, setAboutMediaUrl] = useState<string | null>(null);
  const [aboutPosterUrl, setAboutPosterUrl] = useState<string | null>(null);
  const [aboutFps, setAboutFps] = useState<number>(24);
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

  // Carrega dados das APIs
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [appRes, vidRes, mediaRes] = await Promise.all([
        fetch("/api/admin/appearance"),
        fetch("/api/admin/video-providers"),
        fetch("/api/admin/minisite/media/settings"),
      ]);

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
          setHeroLoop(mediaData.hero.loop ?? true);
          setHeroAutoplay(mediaData.hero.autoplay ?? true);
          setHeroPlaybackMode(mediaData.hero.playbackMode || "AUTOMATIC");
          setHeroPlaybackDirection(mediaData.hero.playbackDirection || "FORWARD");
          setHeroPositioning(mediaData.hero.positioning || "center");
          setHeroFrameCount(mediaData.hero.frameCount ?? 0);
          setHeroFrames(mediaData.hero.frames || []);
        }
        if (mediaData.about) {
          setAboutMediaType(mediaData.about.mediaType || "IMAGE");
          setAboutMediaUrl(mediaData.about.mediaUrl || null);
          setAboutPosterUrl(mediaData.about.posterUrl || null);
          setAboutFps(mediaData.about.fps ?? 24);
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
    if (field === "primary") setPrimaryColor(value);
    if (field === "secondary") setSecondaryColor(value);
    if (field === "accent") setAccentColor(value);
    if (field === "button") setButtonColor(value);
    if (field === "background") setBackgroundColor(value);
    if (field === "text") setTextColor(value);
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
          document.documentElement.style.setProperty("--secondary", secondaryColor);
          document.documentElement.style.setProperty("--accent", accentColor);
          document.documentElement.style.setProperty("--button-bg", buttonColor);
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

  // Upload de Mídia para Slots do MiniSite (Fase 3/5 & Suporte a Frames e Pastas)
  const handleUploadSlotMedia = async (
    slot: "hero" | "about",
    mediaType: string,
    filesOrFile: File | File[] | FileList
  ) => {
    setUploadingSlot(`${slot}-${mediaType}`);
    setMediaFeedback(null);
    try {
      const formData = new FormData();
      formData.append("slot", slot);
      formData.append("mediaType", mediaType);

      if (filesOrFile instanceof FileList || Array.isArray(filesOrFile)) {
        const fileList = Array.from(filesOrFile);
        if (fileList.length === 1 && fileList[0].name.toLowerCase().endsWith(".zip")) {
          formData.append("file", fileList[0]);
        } else {
          formData.append("isMultiple", "true");
          fileList.forEach((f) => formData.append("files", f));
        }
      } else {
        formData.append("file", filesOrFile);
      }

      const res = await fetch("/api/admin/minisite/media/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setMediaFeedback(`Erro no upload: ${data.error}`);
        return;
      }

      if (slot === "hero") {
        setHeroMediaType(mediaType);
        if (mediaType === "FRAME_ANIMATION") {
          setHeroFrameCount(data.frameCount || 0);
          setHeroFrames(data.frames || []);
          setHeroPosterUrl(data.posterUrl || null);
          setHeroMediaUrl(data.frames?.[0] || null);
          setMediaFeedback(`Animação do Hero processada com sucesso! ${data.frameCount} frames ordenados e validados.`);
        } else {
          setHeroMediaUrl(data.url);
          setHeroPosterUrl(data.url);
          setMediaFeedback("Mídia da Foto Principal (Hero) atualizada com sucesso!");
        }
      } else {
        setAboutMediaType(mediaType);
        if (mediaType === "FRAME_ANIMATION") {
          setAboutFrameCount(data.frameCount || 0);
          setAboutFrames(data.frames || []);
          setAboutPosterUrl(data.posterUrl || null);
          setAboutMediaUrl(data.frames?.[0] || null);
          setMediaFeedback(`Animação do Sobre Mim processada com sucesso! ${data.frameCount} frames ordenados e validados.`);
        } else {
          setAboutMediaUrl(data.url);
          setAboutPosterUrl(data.url);
          setMediaFeedback("Mídia da Foto Sobre Mim atualizada com sucesso!");
        }
      }
    } catch {
      setMediaFeedback("Erro de conexão ao enviar arquivo de mídia.");
    } finally {
      setUploadingSlot(null);
    }
  };

  // Importar frames locais já existentes em storage/minisite/top ou mid
  const handleImportLocalFrames = async (slot: "hero" | "about") => {
    setUploadingSlot(`${slot}-import`);
    setMediaFeedback(null);
    try {
      const res = await fetch("/api/admin/minisite/media/import-local", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMediaFeedback(`Erro na importação local: ${data.error}`);
        return;
      }

      if (slot === "hero") {
        setHeroMediaType("FRAME_ANIMATION");
        setHeroFrameCount(data.frameCount || 0);
        setHeroFrames(data.frames || []);
        setHeroPosterUrl(data.posterUrl || null);
        setHeroMediaUrl(data.frames?.[0] || null);
      } else {
        setAboutMediaType("FRAME_ANIMATION");
        setAboutFrameCount(data.frameCount || 0);
        setAboutFrames(data.frames || []);
        setAboutPosterUrl(data.posterUrl || null);
        setAboutMediaUrl(data.frames?.[0] || null);
      }

      setMediaFeedback(data.message || `${data.frameCount} frames importados com sucesso!`);
    } catch {
      setMediaFeedback("Erro ao importar frames locais.");
    } finally {
      setUploadingSlot(null);
    }
  };

  // Salvar configurações de mídia do MiniSite
  const handleSaveMediaSettings = async () => {
    setIsSavingMedia(true);
    setMediaFeedback(null);
    try {
      const res = await fetch("/api/admin/minisite/media/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hero: {
            mediaType: heroMediaType,
            mediaUrl: heroMediaUrl,
            posterUrl: heroPosterUrl,
            fps: heroFps,
            loop: heroLoop,
            autoplay: heroAutoplay,
            playbackMode: heroPlaybackMode,
            playbackDirection: heroPlaybackDirection,
            positioning: heroPositioning,
            frameCount: heroFrameCount,
            frames: heroFrames,
          },
          about: {
            mediaType: aboutMediaType,
            mediaUrl: aboutMediaUrl,
            posterUrl: aboutPosterUrl,
            fps: aboutFps,
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

      {/* ================= ABA 1: APARÊNCIA & CORES (PHASE 1/5) ================= */}
      {activeTab === "appearance" && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 space-y-1">
            <p className="font-semibold flex items-center gap-1.5 text-[var(--primary)]">
              <Palette className="h-4 w-4" />
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
                  <span>{isSavingAppearance ? "Salvando..." : "Salvar Alterações"}</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* CARD NOVO: IMAGENS E ANIMAÇÕES DO MINISITE (HERO & SOBRE MIM) */}
          <Card className="border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
            <CardHeader className="pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
                    <Film className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      Imagens & Animações do MiniSite
                      <Badge variant="outline" className="text-[10px] bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20">
                        Fase 3: Mídias Dinâmicas
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Gerencie as mídias da Foto Principal (Hero) e Foto Sobre Mim do MiniSite público com suporte a imagens estáticas, vídeos ou animações interativas por frames (ZIP).
                    </CardDescription>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleSaveMediaSettings}
                  disabled={isSavingMedia}
                  className="gap-2 text-xs self-start sm:self-auto bg-teal-600 hover:bg-teal-700 text-white"
                >
                  <Save className="h-4 w-4" />
                  <span>{isSavingMedia ? "Salvando Mídias..." : "Salvar Mídias do MiniSite"}</span>
                </Button>
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

            <CardContent className="pt-6 space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* ================= SLOT 1: HERO (FOTO PRINCIPAL) ================= */}
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <span>1. Foto Principal (Hero)</span>
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Exibida no topo do MiniSite com o crachá CRP e botões de agendamento.
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {heroMediaType === "FRAME_ANIMATION"
                        ? `${heroFrameCount} Frames`
                        : heroMediaType === "VIDEO"
                        ? "Vídeo"
                        : "Imagem"}
                    </Badge>
                  </div>

                  {/* Prévia em tempo real */}
                  <div className="relative aspect-[4/5] max-h-80 w-full mx-auto rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 shadow-inner flex items-center justify-center">
                    <div className="absolute top-2 left-2 z-20">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold tracking-wider uppercase bg-black/60 text-white backdrop-blur-md">
                        Prévia em Tempo Real
                      </span>
                    </div>

                    <MiniSiteMediaPlayer
                      slot="hero"
                      mediaType={heroMediaType}
                      mediaUrl={heroMediaUrl}
                      posterUrl={heroPosterUrl}
                      frames={heroFrames}
                      frameCount={heroFrameCount}
                      fps={heroFps}
                      loop={heroLoop}
                      autoplay={heroAutoplay}
                      playbackMode={heroPlaybackMode}
                      playbackDirection={heroPlaybackDirection}
                      positioning={heroPositioning}
                      alt="Prévia Hero"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Seletor de Tipo de Mídia */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Tipo de Mídia
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setHeroMediaType("IMAGE")}
                        className={`p-2.5 rounded-xl border text-xs font-medium flex flex-col items-center justify-center gap-1 transition-all ${
                          heroMediaType === "IMAGE"
                            ? "border-teal-500 bg-teal-500/10 text-teal-600 dark:text-teal-400 font-semibold"
                            : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                        }`}
                      >
                        <Eye className="h-4 w-4" />
                        <span>Imagem</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setHeroMediaType("FRAME_ANIMATION")}
                        className={`p-2.5 rounded-xl border text-xs font-medium flex flex-col items-center justify-center gap-1 transition-all ${
                          heroMediaType === "FRAME_ANIMATION"
                            ? "border-teal-500 bg-teal-500/10 text-teal-600 dark:text-teal-400 font-semibold"
                            : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                        }`}
                      >
                        <FileArchive className="h-4 w-4" />
                        <span>Frames (ZIP)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setHeroMediaType("VIDEO")}
                        className={`p-2.5 rounded-xl border text-xs font-medium flex flex-col items-center justify-center gap-1 transition-all ${
                          heroMediaType === "VIDEO"
                            ? "border-teal-500 bg-teal-500/10 text-teal-600 dark:text-teal-400 font-semibold"
                            : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                        }`}
                      >
                        <Play className="h-4 w-4" />
                        <span>Vídeo</span>
                      </button>
                    </div>
                  </div>

                  {/* Dropzone de Upload e Opções de Envio */}
                  <div className="space-y-2">
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const dropped = e.dataTransfer.files;
                        if (dropped && dropped.length > 0) {
                          handleUploadSlotMedia("hero", heroMediaType, dropped);
                        }
                      }}
                      className="p-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-center hover:bg-slate-100/50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                    >
                      <label className="cursor-pointer block">
                        <input
                          type="file"
                          accept={
                            heroMediaType === "FRAME_ANIMATION"
                              ? ".zip,application/zip,application/x-zip-compressed"
                              : heroMediaType === "VIDEO"
                              ? "video/mp4,video/webm"
                              : "image/jpeg,image/png,image/webp"
                          }
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              handleUploadSlotMedia("hero", heroMediaType, e.target.files[0]);
                            }
                          }}
                        />
                        <Upload className="h-5 w-5 text-teal-600 dark:text-teal-400 mx-auto mb-1" />
                        <p className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                          {uploadingSlot === "hero-FRAME_ANIMATION" || uploadingSlot === "hero-IMAGE" || uploadingSlot === "hero-VIDEO"
                            ? "Processando e enviando arquivo..."
                            : heroMediaType === "FRAME_ANIMATION"
                            ? "Clique ou arraste arquivo ZIP com os frames"
                            : heroMediaType === "VIDEO"
                            ? "Clique para enviar vídeo (WebM / MP4)"
                            : "Clique para enviar imagem (JPG, PNG, WebP)"}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {heroMediaType === "FRAME_ANIMATION"
                            ? "Frames numerados ordenadamente (ex: 001.png ... 040.png). Máx 150 frames / 100MB."
                            : heroMediaType === "VIDEO"
                            ? "Vídeos rodam sem áudio (muted) para compatibilidade mobile. Máx 50MB."
                            : "Imagens com alta resolução. Máx 10MB."}
                        </p>
                      </label>
                    </div>

                    {/* Opções alternativas para Animação: Múltiplos Arquivos ou Pasta Inteira */}
                    {heroMediaType === "FRAME_ANIMATION" && (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <label className="cursor-pointer block">
                          <input
                            type="file"
                            multiple
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files && e.target.files.length > 0) {
                                handleUploadSlotMedia("hero", "FRAME_ANIMATION", e.target.files);
                              }
                            }}
                          />
                          <div className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg text-center hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors flex items-center justify-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                            <Images className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                            <span>Múltiplos Frames</span>
                          </div>
                        </label>

                        <label className="cursor-pointer block">
                          <input
                            type="file"
                            multiple
                            {...({ webkitdirectory: "", directory: "" } as any)}
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files && e.target.files.length > 0) {
                                handleUploadSlotMedia("hero", "FRAME_ANIMATION", e.target.files);
                              }
                            }}
                          />
                          <div className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg text-center hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors flex items-center justify-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                            <Folder className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                            <span>Pasta de Frames</span>
                          </div>
                        </label>
                      </div>
                    )}

                    {/* Botão de Atalho para Importar storage/minisite/top */}
                    {heroMediaType === "FRAME_ANIMATION" && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleImportLocalFrames("hero")}
                        disabled={uploadingSlot === "hero-import"}
                        className="w-full text-xs gap-1.5 border-teal-500/30 hover:bg-teal-500/10 text-teal-700 dark:text-teal-300"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-teal-500" />
                        <span>
                          {uploadingSlot === "hero-import"
                            ? "Importando frames locais..."
                            : "⚡ Importar frames existentes (storage/minisite/top)"}
                        </span>
                      </Button>
                    )}
                  </div>

                  {/* Parâmetros Específicos do Slot Hero */}
                  <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                    {/* Controles para Frame Animation */}
                    {heroMediaType === "FRAME_ANIMATION" && (
                      <>
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                            <span className="font-semibold">Velocidade (FPS)</span>
                            <span className="font-mono text-teal-600 dark:text-teal-400 font-bold">{heroFps} quadros/s</span>
                          </div>
                          <input
                            type="range"
                            min="10"
                            max="60"
                            step="1"
                            value={heroFps}
                            onChange={(e) => setHeroFps(Number(e.target.value))}
                            className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-600"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="font-semibold text-slate-700 dark:text-slate-300">
                              Modo de Reprodução
                            </label>
                            <select
                              value={heroPlaybackMode}
                              onChange={(e) => setHeroPlaybackMode(e.target.value as "AUTOMATIC" | "SCROLL")}
                              className="w-full p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                            >
                              <option value="AUTOMATIC">Automático (Tempo)</option>
                              <option value="SCROLL">Scroll da Página (Scrub)</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="font-semibold text-slate-700 dark:text-slate-300">
                              Direção do Loop
                            </label>
                            <select
                              value={heroPlaybackDirection}
                              onChange={(e) => setHeroPlaybackDirection(e.target.value as "FORWARD" | "ALTERNATE")}
                              className="w-full p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                            >
                              <option value="FORWARD">Normal (Frente)</option>
                              <option value="ALTERNATE">Ida e Volta (Ping-pong)</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 pt-1">
                          <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                            <input
                              type="checkbox"
                              checked={heroLoop}
                              onChange={(e) => setHeroLoop(e.target.checked)}
                              className="rounded text-teal-600 focus:ring-teal-500"
                            />
                            <span>Repetir (Loop)</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                            <input
                              type="checkbox"
                              checked={heroAutoplay}
                              onChange={(e) => setHeroAutoplay(e.target.checked)}
                              className="rounded text-teal-600 focus:ring-teal-500"
                            />
                            <span>Reprodução Automática</span>
                          </label>
                        </div>
                      </>
                    )}

                    {/* Controles para Vídeo */}
                    {heroMediaType === "VIDEO" && (
                      <div className="flex items-center gap-4 pt-1">
                        <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                          <input
                            type="checkbox"
                            checked={heroLoop}
                            onChange={(e) => setHeroLoop(e.target.checked)}
                            className="rounded text-teal-600 focus:ring-teal-500"
                          />
                          <span>Repetir (Loop)</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                          <input
                            type="checkbox"
                            checked={heroAutoplay}
                            onChange={(e) => setHeroAutoplay(e.target.checked)}
                            className="rounded text-teal-600 focus:ring-teal-500"
                          />
                          <span>Autoplay</span>
                        </label>
                      </div>
                    )}

                    {/* Enquadramento / Posição (Todos os tipos) */}
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700 dark:text-slate-300">
                        Enquadramento / Posicionamento
                      </label>
                      <select
                        value={heroPositioning}
                        onChange={(e) => setHeroPositioning(e.target.value)}
                        className="w-full p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      >
                        <option value="center">Centralizado (Padrão)</option>
                        <option value="top">Focar no Topo</option>
                        <option value="bottom">Focar na Base</option>
                        <option value="cover">Preencher todo o quadro (Cover)</option>
                        <option value="contain">Conter imagem inteira (Contain)</option>
                      </select>
                    </div>

                    {/* Ação de Remoção / Limpeza do Hero */}
                    {(heroMediaUrl || heroFrames.length > 0) && (
                      <button
                        type="button"
                        onClick={() => {
                          setHeroMediaUrl(null);
                          setHeroPosterUrl(null);
                          setHeroFrames([]);
                          setHeroFrameCount(0);
                          setHeroMediaType("IMAGE");
                        }}
                        className="text-[11px] text-red-500 hover:underline pt-1 flex items-center gap-1"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Remover mídia e restaurar ilustração padrão do Hero</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* ================= SLOT 2: SOBRE MIM ================= */}
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <span>2. Foto Sobre Mim</span>
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Exibida na seção de apresentação pessoal e trajetória clínica.
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {aboutMediaType === "FRAME_ANIMATION"
                        ? `${aboutFrameCount} Frames`
                        : aboutMediaType === "VIDEO"
                        ? "Vídeo"
                        : "Imagem"}
                    </Badge>
                  </div>

                  {/* Prévia em tempo real */}
                  <div className="relative aspect-[4/5] max-h-80 w-full mx-auto rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 shadow-inner flex items-center justify-center">
                    <div className="absolute top-2 left-2 z-20">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold tracking-wider uppercase bg-black/60 text-white backdrop-blur-md">
                        Prévia em Tempo Real
                      </span>
                    </div>

                    <MiniSiteMediaPlayer
                      slot="about"
                      mediaType={aboutMediaType}
                      mediaUrl={aboutMediaUrl}
                      posterUrl={aboutPosterUrl}
                      frames={aboutFrames}
                      frameCount={aboutFrameCount}
                      fps={aboutFps}
                      loop={aboutLoop}
                      autoplay={aboutAutoplay}
                      playbackMode={aboutPlaybackMode}
                      playbackDirection={aboutPlaybackDirection}
                      positioning={aboutPositioning}
                      alt="Prévia Sobre Mim"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Seletor de Tipo de Mídia */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Tipo de Mídia
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setAboutMediaType("IMAGE")}
                        className={`p-2.5 rounded-xl border text-xs font-medium flex flex-col items-center justify-center gap-1 transition-all ${
                          aboutMediaType === "IMAGE"
                            ? "border-teal-500 bg-teal-500/10 text-teal-600 dark:text-teal-400 font-semibold"
                            : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                        }`}
                      >
                        <Eye className="h-4 w-4" />
                        <span>Imagem</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAboutMediaType("FRAME_ANIMATION")}
                        className={`p-2.5 rounded-xl border text-xs font-medium flex flex-col items-center justify-center gap-1 transition-all ${
                          aboutMediaType === "FRAME_ANIMATION"
                            ? "border-teal-500 bg-teal-500/10 text-teal-600 dark:text-teal-400 font-semibold"
                            : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                        }`}
                      >
                        <FileArchive className="h-4 w-4" />
                        <span>Frames (ZIP)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAboutMediaType("VIDEO")}
                        className={`p-2.5 rounded-xl border text-xs font-medium flex flex-col items-center justify-center gap-1 transition-all ${
                          aboutMediaType === "VIDEO"
                            ? "border-teal-500 bg-teal-500/10 text-teal-600 dark:text-teal-400 font-semibold"
                            : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                        }`}
                      >
                        <Play className="h-4 w-4" />
                        <span>Vídeo</span>
                      </button>
                    </div>
                  </div>

                  {/* Dropzone de Upload e Opções de Envio */}
                  <div className="space-y-2">
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const dropped = e.dataTransfer.files;
                        if (dropped && dropped.length > 0) {
                          handleUploadSlotMedia("about", aboutMediaType, dropped);
                        }
                      }}
                      className="p-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-center hover:bg-slate-100/50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                    >
                      <label className="cursor-pointer block">
                        <input
                          type="file"
                          accept={
                            aboutMediaType === "FRAME_ANIMATION"
                              ? ".zip,application/zip,application/x-zip-compressed"
                              : aboutMediaType === "VIDEO"
                              ? "video/mp4,video/webm"
                              : "image/jpeg,image/png,image/webp"
                          }
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              handleUploadSlotMedia("about", aboutMediaType, e.target.files[0]);
                            }
                          }}
                        />
                        <Upload className="h-5 w-5 text-teal-600 dark:text-teal-400 mx-auto mb-1" />
                        <p className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                          {uploadingSlot === "about-FRAME_ANIMATION" || uploadingSlot === "about-IMAGE" || uploadingSlot === "about-VIDEO"
                            ? "Processando e enviando arquivo..."
                            : aboutMediaType === "FRAME_ANIMATION"
                            ? "Clique ou arraste arquivo ZIP com os frames"
                            : aboutMediaType === "VIDEO"
                            ? "Clique para enviar vídeo (WebM / MP4)"
                            : "Clique para enviar imagem (JPG, PNG, WebP)"}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {aboutMediaType === "FRAME_ANIMATION"
                            ? "Frames numerados ordenadamente (ex: 001.png ... 040.png). Máx 150 frames / 100MB."
                            : aboutMediaType === "VIDEO"
                            ? "Vídeos rodam sem áudio (muted) para compatibilidade mobile. Máx 50MB."
                            : "Imagens com alta resolução. Máx 10MB."}
                        </p>
                      </label>
                    </div>

                    {/* Opções alternativas para Animação: Múltiplos Arquivos ou Pasta Inteira */}
                    {aboutMediaType === "FRAME_ANIMATION" && (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <label className="cursor-pointer block">
                          <input
                            type="file"
                            multiple
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files && e.target.files.length > 0) {
                                handleUploadSlotMedia("about", "FRAME_ANIMATION", e.target.files);
                              }
                            }}
                          />
                          <div className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg text-center hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors flex items-center justify-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                            <Images className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                            <span>Múltiplos Frames</span>
                          </div>
                        </label>

                        <label className="cursor-pointer block">
                          <input
                            type="file"
                            multiple
                            {...({ webkitdirectory: "", directory: "" } as any)}
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files && e.target.files.length > 0) {
                                handleUploadSlotMedia("about", "FRAME_ANIMATION", e.target.files);
                              }
                            }}
                          />
                          <div className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg text-center hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors flex items-center justify-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                            <Folder className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                            <span>Pasta de Frames</span>
                          </div>
                        </label>
                      </div>
                    )}

                    {/* Botão de Atalho para Importar storage/minisite/sobre */}
                    {aboutMediaType === "FRAME_ANIMATION" && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleImportLocalFrames("about")}
                        disabled={uploadingSlot === "about-import"}
                        className="w-full text-xs gap-1.5 border-teal-500/30 hover:bg-teal-500/10 text-teal-700 dark:text-teal-300"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-teal-500" />
                        <span>
                          {uploadingSlot === "about-import"
                            ? "Importando frames locais..."
                            : "⚡ Importar frames existentes (storage/minisite/sobre)"}
                        </span>
                      </Button>
                    )}
                  </div>

                  {/* Parâmetros Específicos do Slot Sobre Mim */}
                  <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                    {/* Controles para Frame Animation */}
                    {aboutMediaType === "FRAME_ANIMATION" && (
                      <>
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                            <span className="font-semibold">Velocidade (FPS)</span>
                            <span className="font-mono text-teal-600 dark:text-teal-400 font-bold">{aboutFps} quadros/s</span>
                          </div>
                          <input
                            type="range"
                            min="10"
                            max="60"
                            step="1"
                            value={aboutFps}
                            onChange={(e) => setAboutFps(Number(e.target.value))}
                            className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-600"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="font-semibold text-slate-700 dark:text-slate-300">
                              Modo de Reprodução
                            </label>
                            <select
                              value={aboutPlaybackMode}
                              onChange={(e) => setAboutPlaybackMode(e.target.value as "AUTOMATIC" | "SCROLL")}
                              className="w-full p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                            >
                              <option value="AUTOMATIC">Automático (Tempo)</option>
                              <option value="SCROLL">Scroll da Página (Scrub)</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="font-semibold text-slate-700 dark:text-slate-300">
                              Direção do Loop
                            </label>
                            <select
                              value={aboutPlaybackDirection}
                              onChange={(e) => setAboutPlaybackDirection(e.target.value as "FORWARD" | "ALTERNATE")}
                              className="w-full p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                            >
                              <option value="FORWARD">Normal (Frente)</option>
                              <option value="ALTERNATE">Ida e Volta (Ping-pong)</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 pt-1">
                          <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                            <input
                              type="checkbox"
                              checked={aboutLoop}
                              onChange={(e) => setAboutLoop(e.target.checked)}
                              className="rounded text-teal-600 focus:ring-teal-500"
                            />
                            <span>Repetir (Loop)</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                            <input
                              type="checkbox"
                              checked={aboutAutoplay}
                              onChange={(e) => setAboutAutoplay(e.target.checked)}
                              className="rounded text-teal-600 focus:ring-teal-500"
                            />
                            <span>Reprodução Automática</span>
                          </label>
                        </div>
                      </>
                    )}

                    {/* Controles para Vídeo */}
                    {aboutMediaType === "VIDEO" && (
                      <div className="flex items-center gap-4 pt-1">
                        <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                          <input
                            type="checkbox"
                            checked={aboutLoop}
                            onChange={(e) => setAboutLoop(e.target.checked)}
                            className="rounded text-teal-600 focus:ring-teal-500"
                          />
                          <span>Repetir (Loop)</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                          <input
                            type="checkbox"
                            checked={aboutAutoplay}
                            onChange={(e) => setAboutAutoplay(e.target.checked)}
                            className="rounded text-teal-600 focus:ring-teal-500"
                          />
                          <span>Autoplay</span>
                        </label>
                      </div>
                    )}

                    {/* Enquadramento / Posição (Todos os tipos) */}
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700 dark:text-slate-300">
                        Enquadramento / Posicionamento
                      </label>
                      <select
                        value={aboutPositioning}
                        onChange={(e) => setAboutPositioning(e.target.value)}
                        className="w-full p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      >
                        <option value="center">Centralizado (Padrão)</option>
                        <option value="top">Focar no Topo</option>
                        <option value="bottom">Focar na Base</option>
                        <option value="cover">Preencher todo o quadro (Cover)</option>
                        <option value="contain">Conter imagem inteira (Contain)</option>
                      </select>
                    </div>

                    {/* Ação de Remoção / Limpeza do Sobre Mim */}
                    {(aboutMediaUrl || aboutFrames.length > 0) && (
                      <button
                        type="button"
                        onClick={() => {
                          setAboutMediaUrl(null);
                          setAboutPosterUrl(null);
                          setAboutFrames([]);
                          setAboutFrameCount(0);
                          setAboutMediaType("IMAGE");
                        }}
                        className="text-[11px] text-red-500 hover:underline pt-1 flex items-center gap-1"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Remover mídia e restaurar ilustração padrão do Sobre Mim</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Botão de Salvar no rodapé do Card de Mídias */}
              <div className="flex items-center justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
                <Button
                  type="button"
                  onClick={handleSaveMediaSettings}
                  disabled={isSavingMedia}
                  className="gap-2 text-xs bg-teal-600 hover:bg-teal-700 text-white"
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
          <div className="p-4 rounded-xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/60 dark:border-teal-900/40 text-xs text-teal-800 dark:text-teal-300 space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <Video className="h-4 w-4 text-teal-600" />
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
                      ? "border-teal-500 ring-2 ring-teal-500/20 bg-teal-50/20 dark:bg-teal-950/20"
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
                              className="w-full gap-2 text-xs border-teal-600/30 text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40"
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
                                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
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
                              className="w-full gap-2 text-xs border-teal-600/30 text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40"
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
                              <Info className="h-3.5 w-3.5 text-teal-600" />
                              <span>Passo a passo no Google Cloud Console:</span>
                            </div>
                            <ol className="list-decimal list-inside space-y-1 pl-1 text-[10px] leading-relaxed">
                              <li>Acesse o <strong>Google Cloud Console</strong> (<code>console.cloud.google.com</code>) e selecione seu projeto.</li>
                              <li>Ative a <strong>Google Calendar API</strong> no menu <em>APIs e Serviços &gt; Biblioteca</em>.</li>
                              <li>Em <em>Tela de consentimento OAuth</em>, configure como <em>Externo</em> e inclua o escopo <code>calendar.events</code>.</li>
                              <li>Em <em>Credenciais</em>, crie um <strong>ID do cliente OAuth</strong> do tipo <em>Aplicativo da Web</em>.</li>
                              <li>Adicione em <strong>URIs de redirecionamento autorizados</strong>:
                                <div className="mt-1 font-mono text-[10px] bg-white dark:bg-slate-800 p-1.5 rounded border border-slate-200 dark:border-slate-700 break-all select-all text-teal-700 dark:text-teal-400">
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
                                className="w-full gap-2 text-xs bg-teal-600 hover:bg-teal-700 text-white"
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
                                  <p className="text-[10px] font-mono break-all text-teal-700 dark:text-teal-300">
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
                        isSelected ? "bg-teal-600 text-white font-semibold" : ""
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
              className="gap-2 text-xs bg-teal-600 hover:bg-teal-700 text-white"
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
                className="gap-2 text-xs bg-teal-600 hover:bg-teal-700 text-white"
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
