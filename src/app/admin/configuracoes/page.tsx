"use client";

import React, { useEffect, useState } from "react";
import { formatDate, formatTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
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
} from "lucide-react";

interface NotificationTemplate {
  id: string;
  eventType: string;
  title: string;
  body: string;
  deliveryMode: "APP_ONLY" | "APP_EMAIL" | "ALL_CHANNELS";
}

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
    "general" | "notifications" | "appearance" | "video" | "security"
  >("notifications");

  // Notifications State (Task 6)
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [selectedEventType, setSelectedEventType] = useState<string>("");
  const [editedTitle, setEditedTitle] = useState("");
  const [editedBody, setEditedBody] = useState("");
  const [editedMode, setEditedMode] = useState<"APP_ONLY" | "APP_EMAIL" | "ALL_CHANNELS">("APP_ONLY");
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [templateFeedback, setTemplateFeedback] = useState<string | null>(null);

  // Appearance State (Task 8)
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoHorizontalUrl, setLogoHorizontalUrl] = useState<string | null>(null);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState("#0d9488");
  const [secondaryColor, setSecondaryColor] = useState("#0f766e");
  const [accentColor, setAccentColor] = useState("#f59e0b");
  const [buttonColor, setButtonColor] = useState("#0d9488");
  const [isSavingAppearance, setIsSavingAppearance] = useState(false);
  const [appearanceFeedback, setAppearanceFeedback] = useState<string | null>(null);
  const [uploadingAsset, setUploadingAsset] = useState<string | null>(null);

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
      const [tplRes, appRes, vidRes] = await Promise.all([
        fetch("/api/admin/notification-templates"),
        fetch("/api/admin/appearance"),
        fetch("/api/admin/video-providers"),
      ]);

      if (tplRes.ok) {
        const tplData: NotificationTemplate[] = await tplRes.json();
        setTemplates(tplData);
        if (tplData.length > 0 && !selectedEventType) {
          const first = tplData[0];
          setSelectedEventType(first.eventType);
          setEditedTitle(first.title);
          setEditedBody(first.body);
          setEditedMode(first.deliveryMode);
        }
      }

      if (appRes.ok) {
        const appData = await appRes.json();
        setLogoUrl(appData.logoUrl || null);
        setLogoHorizontalUrl(appData.logoHorizontalUrl || null);
        setFaviconUrl(appData.faviconUrl || null);
        setPrimaryColor(appData.primaryColor || "#0d9488");
        setSecondaryColor(appData.secondaryColor || "#0f766e");
        setAccentColor(appData.accentColor || "#f59e0b");
        setButtonColor(appData.buttonColor || "#0d9488");
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

  // Seleciona template diferente
  const handleSelectTemplate = (evt: string) => {
    setSelectedEventType(evt);
    const found = templates.find((t) => t.eventType === evt);
    if (found) {
      setEditedTitle(found.title);
      setEditedBody(found.body);
      setEditedMode(found.deliveryMode);
    }
    setTemplateFeedback(null);
  };

  // Salva template
  const handleSaveTemplate = async () => {
    if (!selectedEventType) return;
    setIsSavingTemplate(true);
    setTemplateFeedback(null);

    try {
      const res = await fetch(`/api/admin/notification-templates/${selectedEventType}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editedTitle,
          body: editedBody,
          deliveryMode: editedMode,
        }),
      });

      if (res.ok) {
        setTemplates((prev) =>
          prev.map((t) =>
            t.eventType === selectedEventType
              ? { ...t, title: editedTitle, body: editedBody, deliveryMode: editedMode }
              : t
          )
        );
        setTemplateFeedback("Template de mensagem atualizado com sucesso!");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingTemplate(false);
    }
  };

  // Restaura template padrão
  const handleRestoreTemplateDefault = async () => {
    if (!selectedEventType) return;
    setIsSavingTemplate(true);
    try {
      const res = await fetch("/api/admin/notification-templates/restore-default", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventType: selectedEventType }),
      });
      if (res.ok) {
        const data = await res.json();
        setEditedTitle(data.template.title);
        setEditedBody(data.template.body);
        setEditedMode(data.template.deliveryMode);
        setTemplateFeedback("Template restaurado para o padrão do sistema.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingTemplate(false);
    }
  };

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

  // Salva Aparência
  const handleSaveAppearance = async () => {
    setIsSavingAppearance(true);
    setAppearanceFeedback(null);

    try {
      const res = await fetch("/api/admin/appearance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logoUrl,
          logoHorizontalUrl,
          faviconUrl,
          primaryColor,
          secondaryColor,
          accentColor,
          buttonColor,
        }),
      });

      if (res.ok) {
        setAppearanceFeedback("Identidade visual e paleta de cores salvas com sucesso!");
      }
    } catch {
      setAppearanceFeedback("Erro de comunicação ao salvar aparência.");
    } finally {
      setIsSavingAppearance(false);
    }
  };

  // Restaura Aparência Padrão
  const handleRestoreAppearanceDefaults = () => {
    setPrimaryColor("#0d9488");
    setSecondaryColor("#0f766e");
    setAccentColor("#f59e0b");
    setButtonColor("#0d9488");
    setAppearanceFeedback("Cores restauradas para a paleta padrão do PSI. Clique em Salvar para persistir.");
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

  // Gera prévia do texto substituindo variáveis de exemplo
  const previewTitle = editedTitle
    .replace("{nome_paciente}", "Carlos Eduardo")
    .replace("{nome_profissional}", "Dr(a). Silva")
    .replace("{servico}", "Psicoterapia Individual")
    .replace("{data}", "10/11/2026")
    .replace("{hora}", "14:30")
    .replace("{valor}", "R$ 180,00")
    .replace("{local}", "Sala Virtual Segura")
    .replace("{link_consulta}", "https://consultorio.psi.br/consulta-virtual/demo");

  const previewBody = editedBody
    .replace("{nome_paciente}", "Carlos Eduardo")
    .replace("{nome_profissional}", "Dr(a). Silva")
    .replace("{servico}", "Psicoterapia Individual")
    .replace("{data}", "10/11/2026")
    .replace("{hora}", "14:30")
    .replace("{valor}", "R$ 180,00")
    .replace("{local}", "Sala Virtual Segura")
    .replace("{link_consulta}", "https://consultorio.psi.br/consulta-virtual/demo");

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações do Consultório</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Personalize mensagens de notificação, identidade visual da clínica, teleconsulta e políticas operacionais.
        </p>
      </div>

      {/* Tabs Principais */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto text-xs font-medium">
        <button
          onClick={() => setActiveTab("notifications")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-colors shrink-0 ${
            activeTab === "notifications"
              ? "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 font-semibold"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Bell className="h-4 w-4" />
          <span>Notificações & Mensagens</span>
        </button>

        <button
          onClick={() => setActiveTab("appearance")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-colors shrink-0 ${
            activeTab === "appearance"
              ? "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 font-semibold"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Palette className="h-4 w-4" />
          <span>Identidade Visual & Cores</span>
        </button>

        <button
          onClick={() => setActiveTab("video")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-colors shrink-0 ${
            activeTab === "video"
              ? "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 font-semibold"
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
              ? "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 font-semibold"
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
              ? "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 font-semibold"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>Segurança & Monitoramento</span>
        </button>
      </div>

      {/* ================= ABA 1: NOTIFICAÇÕES (TASK 6) ================= */}
      {activeTab === "notifications" && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/60 dark:border-teal-900/40 text-xs text-teal-800 dark:text-teal-300 space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-teal-600" />
              <span>Regra de Mensagem Compartilhada Unificada (Task 6)</span>
            </p>
            <p>
              Cada evento possui <strong>uma única mensagem central</strong> (título + corpo) e <strong>um dos três modos de entrega</strong>:
              Somente no aplicativo, Aplicativo + Email, ou Aplicativo + Email + WhatsApp.
            </p>
          </div>

          {templateFeedback && <Alert variant="success">{templateFeedback}</Alert>}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Seletor de Eventos */}
            <div className="space-y-3">
              <h3 className="font-bold text-sm">Selecione o Evento</h3>
              <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
                {templates.map((tpl) => (
                  <button
                    key={tpl.eventType}
                    onClick={() => handleSelectTemplate(tpl.eventType)}
                    className={`w-full text-left p-3 rounded-xl border text-xs transition-colors flex flex-col gap-1 ${
                      selectedEventType === tpl.eventType
                        ? "border-teal-500 bg-teal-50 dark:bg-teal-950/60 font-semibold text-teal-900 dark:text-teal-200"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <span>{tpl.title}</span>
                    <span className="text-[10px] text-slate-400 font-normal truncate">
                      {tpl.deliveryMode === "APP_ONLY" && "Somente Aplicativo"}
                      {tpl.deliveryMode === "APP_EMAIL" && "Aplicativo + Email"}
                      {tpl.deliveryMode === "ALL_CHANNELS" && "App + Email + WhatsApp"}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Editor de Mensagem e Modo de Entrega */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Editar Mensagem do Evento</CardTitle>
                  <CardDescription className="text-xs">
                    Evento: <code>{selectedEventType}</code>
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4 text-xs">
                  {/* Modo de Entrega (Exatamente 3 Opções) */}
                  <div className="space-y-2">
                    <label className="font-semibold block text-slate-800 dark:text-slate-200">
                      Modo de Entrega Obrigatório:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <label
                        className={`p-3 rounded-xl border cursor-pointer flex flex-col gap-1 transition-colors ${
                          editedMode === "APP_ONLY"
                            ? "border-teal-500 bg-teal-50/50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-200 font-semibold"
                            : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="deliveryMode"
                            value="APP_ONLY"
                            checked={editedMode === "APP_ONLY"}
                            onChange={() => setEditedMode("APP_ONLY")}
                            className="text-teal-600"
                          />
                          <span>Somente no aplicativo</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-normal">
                          Gera apenas alerta no sininho interno.
                        </span>
                      </label>

                      <label
                        className={`p-3 rounded-xl border cursor-pointer flex flex-col gap-1 transition-colors ${
                          editedMode === "APP_EMAIL"
                            ? "border-teal-500 bg-teal-50/50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-200 font-semibold"
                            : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="deliveryMode"
                            value="APP_EMAIL"
                            checked={editedMode === "APP_EMAIL"}
                            onChange={() => setEditedMode("APP_EMAIL")}
                            className="text-teal-600"
                          />
                          <span>Aplicativo + Email</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-normal">
                          Salva no app e envia a mesma mensagem por e-mail.
                        </span>
                      </label>

                      <label
                        className={`p-3 rounded-xl border cursor-pointer flex flex-col gap-1 transition-colors ${
                          editedMode === "ALL_CHANNELS"
                            ? "border-teal-500 bg-teal-50/50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-200 font-semibold"
                            : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="deliveryMode"
                            value="ALL_CHANNELS"
                            checked={editedMode === "ALL_CHANNELS"}
                            onChange={() => setEditedMode("ALL_CHANNELS")}
                            className="text-teal-600"
                          />
                          <span>App + Email + WhatsApp</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-normal">
                          Envia por todos os 3 canais simultaneamente.
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Título */}
                  <div className="space-y-1">
                    <label className="font-semibold block text-slate-800 dark:text-slate-200">
                      Título da Notificação
                    </label>
                    <Input
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      placeholder="Ex: Consulta confirmada"
                    />
                  </div>

                  {/* Corpo */}
                  <div className="space-y-1">
                    <label className="font-semibold block text-slate-800 dark:text-slate-200">
                      Mensagem Completa (Corpo)
                    </label>
                    <textarea
                      rows={4}
                      value={editedBody}
                      onChange={(e) => setEditedBody(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="Escreva a mensagem..."
                    />
                  </div>

                  {/* Tags / Variáveis Dinâmicas */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg space-y-1.5 border border-slate-100 dark:border-slate-800">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                      Variáveis Dinâmicas Disponíveis:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        "{nome_paciente}",
                        "{nome_profissional}",
                        "{servico}",
                        "{data}",
                        "{hora}",
                        "{valor}",
                        "{local}",
                        "{link_consulta}",
                      ].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setEditedBody((prev) => `${prev} ${v}`)}
                          className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[11px] hover:bg-teal-50 dark:hover:bg-teal-950/50"
                          title="Clique para adicionar ao texto"
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Prévia Dinâmica */}
                  <div className="space-y-1.5 pt-2">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Eye className="h-4 w-4 text-teal-600" />
                      <span>Prévia do Destinatário:</span>
                    </span>
                    <div className="p-3.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                      <p className="font-bold text-slate-900 dark:text-slate-100">{previewTitle}</p>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{previewBody}</p>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleRestoreTemplateDefault}
                      disabled={isSavingTemplate}
                      className="text-xs gap-1.5 text-slate-500 hover:text-slate-800"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Restaurar Padrão</span>
                    </Button>

                    <Button
                      onClick={handleSaveTemplate}
                      disabled={isSavingTemplate}
                      className="gap-2 text-xs bg-teal-600 hover:bg-teal-700 text-white"
                    >
                      <Save className="h-4 w-4" />
                      <span>{isSavingTemplate ? "Salvando..." : "Salvar Template"}</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ================= ABA 2: APARÊNCIA & CORES (TASK 8) ================= */}
      {activeTab === "appearance" && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/60 dark:border-teal-900/40 text-xs text-teal-800 dark:text-teal-300 space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <Palette className="h-4 w-4 text-teal-600" />
              <span>Gerenciamento de Identidade Visual e Branding (Task 8)</span>
            </p>
            <p>
              Faça upload dos 3 formatos essenciais da clínica (Logo Padrão, Logo Horizontal e Favicon) e ajuste a paleta de cores institucional com visualização em tempo real.
            </p>
          </div>

          {appearanceFeedback && <Alert variant="info">{appearanceFeedback}</Alert>}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Coluna 1: Upload dos 3 Assets */}
            <div className="space-y-6">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                1. Arquivos de Identidade Visual
              </h3>

              {/* Asset 1: Logo Padrão */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Logo Padrão (Quadrado / Proporcional)</CardTitle>
                  <CardDescription className="text-xs">
                    Utilizado na tela de login, rodapés e fichas de pacientes.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                      {logoUrl ? (
                        <img src={logoUrl} alt="Logo Padrão" className="h-full w-full object-contain" />
                      ) : (
                        <span className="text-[10px] text-slate-400">Sem logo</span>
                      )}
                    </div>

                    <div className="flex-1 space-y-1.5">
                      <label className="inline-block cursor-pointer">
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/svg+xml"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) handleUploadAsset("logo", e.target.files[0]);
                          }}
                        />
                        <span className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium inline-flex items-center gap-1.5 text-xs">
                          <Upload className="h-3.5 w-3.5 text-teal-600" />
                          <span>{uploadingAsset === "logo" ? "Enviando..." : "Substituir Logo"}</span>
                        </span>
                      </label>
                      {logoUrl && (
                        <button
                          type="button"
                          onClick={() => setLogoUrl(null)}
                          className="text-[11px] text-red-500 hover:underline block"
                        >
                          Remover logo
                        </button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Asset 2: Logo Horizontal */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Logo Horizontal (Amplo)</CardTitle>
                  <CardDescription className="text-xs">
                    Exibido nos cabeçalhos da área do paciente, topo do MiniSite e navbar.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-32 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0 p-1">
                      {logoHorizontalUrl ? (
                        <img src={logoHorizontalUrl} alt="Logo Horizontal" className="h-full w-full object-contain" />
                      ) : (
                        <span className="text-[10px] text-slate-400">Sem horizontal</span>
                      )}
                    </div>

                    <div className="flex-1 space-y-1.5">
                      <label className="inline-block cursor-pointer">
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/svg+xml"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) handleUploadAsset("logoHorizontal", e.target.files[0]);
                          }}
                        />
                        <span className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium inline-flex items-center gap-1.5 text-xs">
                          <Upload className="h-3.5 w-3.5 text-teal-600" />
                          <span>{uploadingAsset === "logoHorizontal" ? "Enviando..." : "Substituir Horizontal"}</span>
                        </span>
                      </label>
                      {logoHorizontalUrl && (
                        <button
                          type="button"
                          onClick={() => setLogoHorizontalUrl(null)}
                          className="text-[11px] text-red-500 hover:underline block"
                        >
                          Remover
                        </button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Asset 3: Favicon / Ícone */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Ícone / Favicon da Aba</CardTitle>
                  <CardDescription className="text-xs">
                    Exibido na aba do navegador e atalhos compactos (ICO, PNG ou SVG).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                      {faviconUrl ? (
                        <img src={faviconUrl} alt="Favicon" className="h-6 w-6 object-contain" />
                      ) : (
                        <span className="text-[9px] text-slate-400">ICO</span>
                      )}
                    </div>

                    <div className="flex-1 space-y-1.5">
                      <label className="inline-block cursor-pointer">
                        <input
                          type="file"
                          accept="image/x-icon,image/png,image/svg+xml"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) handleUploadAsset("favicon", e.target.files[0]);
                          }}
                        />
                        <span className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium inline-flex items-center gap-1.5 text-xs">
                          <Upload className="h-3.5 w-3.5 text-teal-600" />
                          <span>{uploadingAsset === "favicon" ? "Enviando..." : "Substituir Favicon"}</span>
                        </span>
                      </label>
                      {faviconUrl && (
                        <button
                          type="button"
                          onClick={() => setFaviconUrl(null)}
                          className="text-[11px] text-red-500 hover:underline block"
                        >
                          Remover
                        </button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Coluna 2: Paleta de Cores e Prévia Ao Vivo */}
            <div className="space-y-6">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                2. Paleta de Cores Institucional
              </h3>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Design Tokens de Cor</CardTitle>
                  <CardDescription className="text-xs">
                    Defina os códigos HEX ou selecione no seletor de cores
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4 text-xs">
                  {/* Cor Primária */}
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <span className="font-semibold block text-slate-800 dark:text-slate-200">Cor Primária</span>
                      <span className="text-[11px] text-slate-400">Destaques principais, badges e links</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="h-8 w-8 rounded-lg cursor-pointer border-0 p-0"
                      />
                      <Input
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-24 font-mono text-xs uppercase"
                      />
                    </div>
                  </div>

                  {/* Cor Secundária */}
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <span className="font-semibold block text-slate-800 dark:text-slate-200">Cor Secundária</span>
                      <span className="text-[11px] text-slate-400">Fundos sutis, gradientes e cabeçalhos</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="h-8 w-8 rounded-lg cursor-pointer border-0 p-0"
                      />
                      <Input
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="w-24 font-mono text-xs uppercase"
                      />
                    </div>
                  </div>

                  {/* Cor de Destaque / Accent */}
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <span className="font-semibold block text-slate-800 dark:text-slate-200">Cor de Destaque</span>
                      <span className="text-[11px] text-slate-400">Avisos, alertas e elementos chamativos</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="h-8 w-8 rounded-lg cursor-pointer border-0 p-0"
                      />
                      <Input
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="w-24 font-mono text-xs uppercase"
                      />
                    </div>
                  </div>

                  {/* Cor dos Botões */}
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <span className="font-semibold block text-slate-800 dark:text-slate-200">Cor dos Botões Principais</span>
                      <span className="text-[11px] text-slate-400">Botões de ação e confirmação</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={buttonColor}
                        onChange={(e) => setButtonColor(e.target.value)}
                        className="h-8 w-8 rounded-lg cursor-pointer border-0 p-0"
                      />
                      <Input
                        value={buttonColor}
                        onChange={(e) => setButtonColor(e.target.value)}
                        className="w-24 font-mono text-xs uppercase"
                      />
                    </div>
                  </div>

                  {/* Live Preview Widget */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <span className="font-semibold block text-slate-700 dark:text-slate-300">
                      Prévia dos Componentes com as Cores Escolhidas:
                    </span>
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs" style={{ color: primaryColor }}>
                          {logoHorizontalUrl ? (
                            <img src={logoHorizontalUrl} alt="Logo" className="h-6 object-contain" />
                          ) : (
                            "Consultório PSI"
                          )}
                        </span>
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                          style={{ backgroundColor: accentColor }}
                        >
                          Destaque
                        </span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <p className="text-[11px] text-slate-600 dark:text-slate-300">
                          Exemplo de card com botão customizado:
                        </p>
                        <button
                          type="button"
                          className="mt-2 px-3 py-1.5 rounded-lg text-white font-semibold text-xs shadow-xs"
                          style={{ backgroundColor: buttonColor }}
                        >
                          Botão de Exemplo
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center justify-between pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleRestoreAppearanceDefaults}
                      className="text-xs text-slate-500 hover:text-slate-800 gap-1.5"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Restaurar Padrão</span>
                    </Button>

                    <Button
                      type="button"
                      onClick={handleSaveAppearance}
                      disabled={isSavingAppearance}
                      className="gap-2 text-xs bg-teal-600 hover:bg-teal-700 text-white"
                    >
                      <Save className="h-4 w-4" />
                      <span>{isSavingAppearance ? "Salvando..." : "Salvar Alterações"}</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
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
