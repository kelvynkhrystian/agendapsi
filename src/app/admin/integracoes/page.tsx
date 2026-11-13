"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { IntegrationStatusBadge } from "@/components/integrations/integration-status-badge";
import { animateTabContent } from "@/lib/animation/gsap";
import type { HealthStatusMeta, IntegrationHealthStatus } from "@/lib/integrations-health";
import {
  AlertTriangle,
  Check,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  MessageCircle,
  QrCode,
  RefreshCw,
  RotateCcw,
  Save,
  Send,
  ShieldCheck,
  Smartphone,
  Unlink,
  Unlock,
  Wifi,
  WifiOff,
} from "pulsoicon-react";
import { cn } from "@/lib/utils";

interface EmailIntegrationSnapshot {
  enabled: boolean;
  mode: "DEFAULT" | "CUSTOM";
  configured: boolean;
  canSend: boolean;
  host: string;
  port: number;
  encryption: "TLS" | "SSL" | "NONE";
  user: string;
  hasPassword: boolean;
  maskedPassword: string;
  senderName: string;
  senderEmail: string;
  replyTo: string;
  hasSavedCustomCredentials: boolean;
  defaultEnvConfigured: boolean;
  defaultEnvSummary: string;
  missingFields: string[];
  status: IntegrationHealthStatus;
  healthMeta: HealthStatusMeta;
  healthMessage: string;
  lastCheckedAt: string | null;
  lastTestedAt: string | null;
  recoveryStrategy: "ADMIN_ASSISTED" | "SMS";
  rawRecoveryStrategy: "ADMIN_ASSISTED" | "SMS";
  smsRecoveryReady: boolean;
}

interface TextBeeDeviceItem {
  id: string;
  name: string;
  model?: string | null;
  isOnline: boolean;
  statusText: string;
  lastSeenAt?: string | null;
}

interface SmsIntegrationSnapshot {
  enabled: boolean;
  provider: "TEXTBEE";
  configured: boolean;
  canSend: boolean;
  hostingMode: "CLOUD" | "SELF_HOSTED";
  cloudBaseUrl: string;
  apiUrl: string;
  hasApiKey: boolean;
  maskedApiKey: string;
  deviceId: string;
  hasSavedCredentials: boolean;
  missingFields: string[];
  urlError?: string | null;
  status: IntegrationHealthStatus;
  healthMeta: HealthStatusMeta;
  healthMessage: string;
  lastCheckedAt: string | null;
  lastTestedAt: string | null;
  patientOptInStats: {
    totalActivePatients: number;
    optedInCount: number;
  };
}

interface WhatsAppIntegrationSnapshot {
  enabled: boolean;
  provider: "META_OFFICIAL" | "OPENWA";
  configured: boolean;
  canSend: boolean;
  missingFields: string[];
  urlError?: string | null;
  status: IntegrationHealthStatus;
  healthMeta: HealthStatusMeta;
  healthMessage: string;
  lastCheckedAt: string | null;
  lastTestedAt: string | null;
  meta: {
    phoneNumberId: string;
    wabaId: string;
    hasAccessToken: boolean;
    maskedAccessToken: string;
    verifyToken: string;
    hasAppSecret: boolean;
    maskedAppSecret: string;
    templateName: string;
    templateLanguage: string;
    hasSavedCredentials: boolean;
    webhookUrl: string;
  };
  openwa: {
    apiUrl: string;
    hasApiKey: boolean;
    maskedApiKey: string;
    sessionId: string;
    connectedNumber: string | null;
    hasSavedCredentials: boolean;
  };
  rawPersistedStatus: IntegrationHealthStatus;
}

interface IntegrationsSnapshot {
  email: EmailIntegrationSnapshot;
  sms: SmsIntegrationSnapshot;
  whatsapp: WhatsAppIntegrationSnapshot;
}

interface FeedbackState {
  type: "success" | "error" | "info";
  text: string;
}

function IntegrationToggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 shrink-0">
      <span className="text-xs font-medium text-[#525252] dark:text-[#D0D0D0]">
        {checked ? "Ativado" : "Desativado"}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#202020] disabled:opacity-50 disabled:cursor-not-allowed",
          checked
            ? "bg-[var(--button-bg,var(--primary))] border-[var(--button-bg,var(--primary))] dark:bg-[var(--dark-accent,var(--button-bg,var(--primary)))] dark:border-[var(--dark-accent,var(--button-bg,var(--primary)))]"
            : "bg-[#D4D4D8] border-[#C4C4CC] dark:bg-[#2C2C2C] dark:border-[#393939]"
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-xs transition-transform",
            checked ? "translate-x-5" : "translate-x-1"
          )}
        />
      </button>
    </div>
  );
}

type IntegrationTab = "email" | "sms" | "whatsapp";

export default function AdminIntegrationsPage() {
  const [activeTab, setActiveTab] = useState<IntegrationTab>("email");
  const tabContentRef = useRef<HTMLDivElement>(null);
  const hasMountedTabRef = useRef(false);

  const [snapshot, setSnapshot] = useState<IntegrationsSnapshot | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // ==================== ESTADO: E-MAIL ====================
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [emailMode, setEmailMode] = useState<"DEFAULT" | "CUSTOM">("DEFAULT");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpEncryption, setSmtpEncryption] = useState<"TLS" | "SSL" | "NONE">("TLS");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [clearSmtpPass, setClearSmtpPass] = useState(false);
  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [recoveryStrategy, setRecoveryStrategy] = useState<"ADMIN_ASSISTED" | "SMS">("ADMIN_ASSISTED");
  const [emailTestAddress, setEmailTestAddress] = useState("");
  const [emailDirty, setEmailDirty] = useState(false);
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState<FeedbackState | null>(null);

  // ==================== ESTADO: SMS — TEXTBEE ====================
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [smsHostingMode, setSmsHostingMode] = useState<"CLOUD" | "SELF_HOSTED">("CLOUD");
  const [smsApiUrl, setSmsApiUrl] = useState("");
  const [smsApiKey, setSmsApiKey] = useState("");
  const [showSmsApiKey, setShowSmsApiKey] = useState(false);
  const [clearSmsApiKey, setClearSmsApiKey] = useState(false);
  const [smsDeviceId, setSmsDeviceId] = useState("");
  const [smsDevices, setSmsDevices] = useState<TextBeeDeviceItem[]>([]);
  const [smsDevicesLoaded, setSmsDevicesLoaded] = useState(false);
  const [smsTestPhone, setSmsTestPhone] = useState("");
  const [smsDirty, setSmsDirty] = useState(false);
  const [isSavingSms, setIsSavingSms] = useState(false);
  const [isFetchingSmsDevices, setIsFetchingSmsDevices] = useState(false);
  const [isVerifyingSms, setIsVerifyingSms] = useState(false);
  const [isTestingSms, setIsTestingSms] = useState(false);
  const [smsFeedback, setSmsFeedback] = useState<FeedbackState | null>(null);

  // ==================== ESTADO: WHATSAPP ====================
  const [waEnabled, setWaEnabled] = useState(false);
  const [waProvider, setWaProvider] = useState<"META_OFFICIAL" | "OPENWA">("META_OFFICIAL");
  // Meta
  const [metaPhoneNumberId, setMetaPhoneNumberId] = useState("");
  const [metaWabaId, setMetaWabaId] = useState("");
  const [metaAccessToken, setMetaAccessToken] = useState("");
  const [showMetaToken, setShowMetaToken] = useState(false);
  const [clearMetaToken, setClearMetaToken] = useState(false);
  const [metaVerifyToken, setMetaVerifyToken] = useState("");
  const [metaAppSecret, setMetaAppSecret] = useState("");
  const [showMetaAppSecret, setShowMetaAppSecret] = useState(false);
  const [clearMetaAppSecret, setClearMetaAppSecret] = useState(false);
  const [metaTemplateName, setMetaTemplateName] = useState("");
  const [metaTemplateLanguage, setMetaTemplateLanguage] = useState("pt_BR");
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  // OpenWA
  const [openwaApiUrl, setOpenwaApiUrl] = useState("");
  const [openwaApiKey, setOpenwaApiKey] = useState("");
  const [showOpenwaKey, setShowOpenwaKey] = useState(false);
  const [clearOpenwaKey, setClearOpenwaKey] = useState(false);
  const [openwaSessionId, setOpenwaSessionId] = useState("default");
  const [openwaQrDataUri, setOpenwaQrDataUri] = useState<string | null>(null);
  const [confirmOpenwaDisconnect, setConfirmOpenwaDisconnect] = useState(false);
  // Ações
  const [waTestPhone, setWaTestPhone] = useState("");
  const [waDirty, setWaDirty] = useState(false);
  const [isSavingWa, setIsSavingWa] = useState(false);
  const [isVerifyingWa, setIsVerifyingWa] = useState(false);
  const [isTestingWa, setIsTestingWa] = useState(false);
  const [isLoadingQr, setIsLoadingQr] = useState(false);
  const [isReconnectingWa, setIsReconnectingWa] = useState(false);
  const [isDisconnectingWa, setIsDisconnectingWa] = useState(false);
  const [waFeedback, setWaFeedback] = useState<FeedbackState | null>(null);

  const isBusyRef = useRef(false);
  isBusyRef.current =
    isSavingEmail ||
    isVerifyingEmail ||
    isTestingEmail ||
    isSavingSms ||
    isVerifyingSms ||
    isTestingSms ||
    isSavingWa ||
    isVerifyingWa ||
    isTestingWa ||
    isLoadingQr ||
    isReconnectingWa ||
    isDisconnectingWa;

  const syncEmailForm = useCallback((email: EmailIntegrationSnapshot) => {
    setEmailEnabled(email.enabled);
    setEmailMode(email.mode === "DEFAULT" ? "DEFAULT" : "CUSTOM");
    setSmtpHost(email.host || "");
    setSmtpPort(String(email.port || (email.encryption === "SSL" ? 465 : 587)));
    setSmtpEncryption(email.encryption || "TLS");
    setSmtpUser(email.user || "");
    setSmtpPass("");
    setClearSmtpPass(false);
    setSenderName(email.senderName || "");
    setSenderEmail(email.senderEmail || "");
    setReplyTo(email.replyTo || "");
    setRecoveryStrategy(email.recoveryStrategy || "ADMIN_ASSISTED");
    setEmailDirty(false);
  }, []);

  const syncSmsForm = useCallback((sms: SmsIntegrationSnapshot) => {
    setSmsEnabled(sms.enabled);
    setSmsHostingMode(sms.hostingMode === "SELF_HOSTED" ? "SELF_HOSTED" : "CLOUD");
    setSmsApiUrl(sms.apiUrl || "");
    setSmsApiKey("");
    setClearSmsApiKey(false);
    setSmsDeviceId(sms.deviceId || "");
    setSmsDirty(false);
  }, []);

  const syncWhatsAppForm = useCallback((wa: WhatsAppIntegrationSnapshot) => {
    setWaEnabled(wa.enabled);
    setWaProvider(wa.provider === "OPENWA" ? "OPENWA" : "META_OFFICIAL");
    setMetaPhoneNumberId(wa.meta.phoneNumberId || "");
    setMetaWabaId(wa.meta.wabaId || "");
    setMetaAccessToken("");
    setClearMetaToken(false);
    setMetaVerifyToken(wa.meta.verifyToken || "");
    setMetaAppSecret("");
    setClearMetaAppSecret(false);
    setMetaTemplateName(wa.meta.templateName || "");
    setMetaTemplateLanguage(wa.meta.templateLanguage || "pt_BR");
    setOpenwaApiUrl(wa.openwa.apiUrl || "");
    setOpenwaApiKey("");
    setClearOpenwaKey(false);
    setOpenwaSessionId(wa.openwa.sessionId || "default");
    if (wa.status !== "AWAITING_QR") {
      setOpenwaQrDataUri(null);
    }
    setWaDirty(false);
  }, []);

  const fetchSnapshot = useCallback(
    async (options?: { refreshProbes?: boolean; hydrateForms?: boolean }) => {
      try {
        const url = options?.refreshProbes
          ? "/api/admin/integrations?refresh=1"
          : "/api/admin/integrations";
        const res = await fetch(url, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) {
          setGlobalError(data.error || "Não foi possível carregar as integrações.");
          return;
        }
        const snap = data as IntegrationsSnapshot;
        setSnapshot(snap);
        setGlobalError(null);

        if (options?.hydrateForms) {
          syncEmailForm(snap.email);
          syncSmsForm(snap.sms);
          syncWhatsAppForm(snap.whatsapp);
        } else {
          // Mantém sincronizada a disponibilidade de fallback SMS -> Email mesmo em refresh passivo
          setRecoveryStrategy((prev) =>
            prev === "SMS" && !snap.email.smsRecoveryReady ? "ADMIN_ASSISTED" : prev
          );
          if (snap.whatsapp?.status === "CONNECTED") {
            setOpenwaQrDataUri(null);
          }
        }
      } catch {
        setGlobalError("Falha de comunicação ao consultar o status das integrações.");
      } finally {
        setIsInitialLoading(false);
        setIsRefreshingAll(false);
      }
    },
    [syncEmailForm, syncSmsForm, syncWhatsAppForm]
  );

  // Carregamento inicial
  useEffect(() => {
    void fetchSnapshot({ refreshProbes: false, hydrateForms: true });
  }, [fetchSnapshot]);

  // Sincroniza aba inicial pela query string (?tab=email|sms|whatsapp)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const param = new URLSearchParams(window.location.search).get("tab");
    if (param === "email" || param === "sms" || param === "whatsapp") {
      setActiveTab(param);
    }
  }, []);

  // Animação suave ao alternar entre as abas sem recarregar a página
  useEffect(() => {
    if (!hasMountedTabRef.current) {
      hasMountedTabRef.current = true;
      return;
    }
    animateTabContent(tabContentRef.current);
  }, [activeTab]);

  const handleTabChange = (nextTab: string) => {
    if (nextTab !== "email" && nextTab !== "sms" && nextTab !== "whatsapp") return;
    setActiveTab(nextTab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", nextTab);
      window.history.replaceState(null, "", url.toString());
    }
  };

  // Atualização inteligente ao voltar para a aba do navegador
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && !isBusyRef.current) {
        void fetchSnapshot({ refreshProbes: true, hydrateForms: false });
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchSnapshot]);

  // Polling exclusivo de 6s somente enquanto OpenWA aguarda leitura de QR Code
  const isWaitingOpenWaQr =
    Boolean(snapshot?.whatsapp.enabled) &&
    snapshot?.whatsapp.provider === "OPENWA" &&
    snapshot?.whatsapp.status === "AWAITING_QR";

  useEffect(() => {
    if (!isWaitingOpenWaQr) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible" && !isBusyRef.current) {
        void fetchSnapshot({ refreshProbes: true, hydrateForms: false });
      }
    }, 6000);
    return () => window.clearInterval(timer);
  }, [isWaitingOpenWaQr, fetchSnapshot]);

  const handleManualRefreshAll = async () => {
    setIsRefreshingAll(true);
    await fetchSnapshot({ refreshProbes: true, hydrateForms: false });
  };

  // ==================== AÇÕES: E-MAIL ====================
  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingEmail(true);
    setEmailFeedback(null);

    try {
      const res = await fetch("/api/admin/integrations/email", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: emailEnabled,
          mode: emailMode,
          host: smtpHost,
          port: smtpPort ? Number(smtpPort) : undefined,
          encryption: smtpEncryption,
          user: smtpUser,
          password: smtpPass || undefined,
          clearPassword: clearSmtpPass,
          senderName,
          senderEmail,
          replyTo,
          recoveryStrategy,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEmailFeedback({
          type: "error",
          text: data.error || "Não foi possível salvar as configurações de e-mail.",
        });
        return;
      }

      if (data.integration) {
        const nextEmail = data.integration as EmailIntegrationSnapshot;
        setSnapshot((prev) => (prev ? { ...prev, email: nextEmail } : prev));
        syncEmailForm(nextEmail);
      }
      setEmailFeedback({
        type: "success",
        text: data.message || "Configurações de e-mail salvas com sucesso!",
      });
    } catch {
      setEmailFeedback({
        type: "error",
        text: "Erro de comunicação ao salvar as configurações de e-mail.",
      });
    } finally {
      setIsSavingEmail(false);
    }
  };

  const handleVerifyEmail = async () => {
    setIsVerifyingEmail(true);
    setEmailFeedback(null);
    try {
      const res = await fetch("/api/admin/integrations/email/verify", {
        method: "POST",
      });
      const data = await res.json();
      setSnapshot((prev) =>
        prev
          ? {
              ...prev,
              email: {
                ...prev.email,
                status: data.healthStatus || prev.email.status,
                healthMeta: data.healthMeta || prev.email.healthMeta,
                healthMessage: data.message || prev.email.healthMessage,
                lastCheckedAt: data.checkedAt || new Date().toISOString(),
                canSend: Boolean(data.ok),
              },
            }
          : prev
      );
      if (!res.ok) {
        setEmailFeedback({
          type: "error",
          text: data.message || data.error || "Falha ao verificar a conexão SMTP.",
        });
      } else {
        setEmailFeedback({
          type: "success",
          text: data.message || "Conexão SMTP validada com sucesso.",
        });
      }
    } catch {
      setEmailFeedback({
        type: "error",
        text: "Erro ao comunicar com o servidor durante a verificação SMTP.",
      });
    } finally {
      setIsVerifyingEmail(false);
    }
  };

  const handleSendTestEmail = async () => {
    setIsTestingEmail(true);
    setEmailFeedback(null);
    try {
      const res = await fetch("/api/admin/integrations/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailTestAddress }),
      });
      const data = await res.json();
      setSnapshot((prev) =>
        prev
          ? {
              ...prev,
              email: {
                ...prev.email,
                status: data.healthStatus || prev.email.status,
                healthMeta: data.healthMeta || prev.email.healthMeta,
                healthMessage: res.ok
                  ? data.message
                  : data.error || prev.email.healthMessage,
                lastCheckedAt: data.checkedAt || prev.email.lastCheckedAt,
                lastTestedAt: res.ok
                  ? data.testedAt || new Date().toISOString()
                  : prev.email.lastTestedAt,
                canSend: res.ok ? true : prev.email.canSend,
              },
            }
          : prev
      );
      if (!res.ok) {
        setEmailFeedback({
          type: "error",
          text: data.error || "Falha ao enviar o e-mail de teste.",
        });
      } else {
        setEmailFeedback({
          type: "success",
          text: data.message || "E-mail de teste enviado com sucesso!",
        });
      }
    } catch {
      setEmailFeedback({
        type: "error",
        text: "Erro de comunicação ao disparar o e-mail de teste.",
      });
    } finally {
      setIsTestingEmail(false);
    }
  };

  // ==================== AÇÕES: SMS — TEXTBEE ====================
  const handleSaveSms = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSms(true);
    setSmsFeedback(null);
    try {
      const res = await fetch("/api/admin/integrations/sms", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: smsEnabled,
          hostingMode: smsHostingMode,
          apiUrl: smsHostingMode === "SELF_HOSTED" ? smsApiUrl : smsApiUrl || undefined,
          apiKey: smsApiKey || undefined,
          clearApiKey: clearSmsApiKey,
          deviceId: smsDeviceId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSmsFeedback({
          type: "error",
          text: data.error || "Não foi possível salvar as configurações de SMS.",
        });
        return;
      }

      if (data.integration) {
        const nextSms = data.integration as SmsIntegrationSnapshot;
        syncSmsForm(nextSms);
      }
      // Recarrega snapshot silenciosamente para manter smsRecoveryReady & estatísticas em sincronia com Card 1
      await fetchSnapshot({ refreshProbes: false, hydrateForms: false });

      setSmsFeedback({
        type: data.recoveryFallbackReset ? "info" : "success",
        text: data.message || "Configurações de SMS salvas com sucesso!",
      });
    } catch {
      setSmsFeedback({
        type: "error",
        text: "Erro de comunicação ao salvar as configurações de SMS.",
      });
    } finally {
      setIsSavingSms(false);
    }
  };

  const handleFetchSmsDevices = async () => {
    setIsFetchingSmsDevices(true);
    setSmsFeedback(null);
    try {
      const res = await fetch("/api/admin/integrations/sms/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostingMode: smsHostingMode,
          apiUrl: smsHostingMode === "SELF_HOSTED" ? smsApiUrl : undefined,
          apiKey: smsApiKey || undefined,
        }),
      });
      const data = await res.json();
      setSmsDevices(Array.isArray(data.devices) ? data.devices : []);
      setSmsDevicesLoaded(true);

      if (!res.ok) {
        setSmsFeedback({
          type: "error",
          text: data.message || data.error || "Não foi possível listar dispositivos no TextBee.",
        });
      } else {
        setSmsFeedback({
          type: "success",
          text: data.message || `${data.devices?.length || 0} dispositivo(s) encontrado(s).`,
        });
      }
    } catch {
      setSmsFeedback({
        type: "error",
        text: "Erro de comunicação ao consultar dispositivos Android no TextBee.",
      });
    } finally {
      setIsFetchingSmsDevices(false);
    }
  };

  const handleVerifySms = async () => {
    setIsVerifyingSms(true);
    setSmsFeedback(null);
    try {
      const res = await fetch("/api/admin/integrations/sms/verify", {
        method: "POST",
      });
      const data = await res.json();
      if (Array.isArray(data.devices)) {
        setSmsDevices(data.devices);
        setSmsDevicesLoaded(true);
      }
      setSnapshot((prev) =>
        prev
          ? {
              ...prev,
              sms: {
                ...prev.sms,
                status: data.healthStatus || prev.sms.status,
                healthMeta: data.healthMeta || prev.sms.healthMeta,
                healthMessage: data.message || prev.sms.healthMessage,
                lastCheckedAt: data.checkedAt || new Date().toISOString(),
                canSend: Boolean(data.ok),
              },
            }
          : prev
      );
      if (!res.ok) {
        setSmsFeedback({
          type: "error",
          text: data.message || data.error || "Falha ao verificar a conexão com o TextBee.",
        });
      } else {
        setSmsFeedback({
          type: "success",
          text: data.message || "Aparelho Android online e pronto para envios SMS.",
        });
      }
    } catch {
      setSmsFeedback({
        type: "error",
        text: "Erro ao comunicar com o servidor na verificação do TextBee.",
      });
    } finally {
      setIsVerifyingSms(false);
    }
  };

  const handleSendTestSms = async () => {
    setIsTestingSms(true);
    setSmsFeedback(null);
    try {
      const res = await fetch("/api/admin/integrations/sms/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: smsTestPhone }),
      });
      const data = await res.json();
      setSnapshot((prev) =>
        prev
          ? {
              ...prev,
              sms: {
                ...prev.sms,
                status: data.healthStatus || prev.sms.status,
                healthMeta: data.healthMeta || prev.sms.healthMeta,
                healthMessage: res.ok
                  ? data.message
                  : data.error || prev.sms.healthMessage,
                lastCheckedAt: data.checkedAt || prev.sms.lastCheckedAt,
                lastTestedAt: res.ok
                  ? data.testedAt || new Date().toISOString()
                  : prev.sms.lastTestedAt,
                canSend: res.ok ? true : prev.sms.canSend,
              },
            }
          : prev
      );
      if (!res.ok) {
        setSmsFeedback({
          type: "error",
          text: data.error || "Falha ao enviar SMS de teste.",
        });
      } else {
        setSmsFeedback({
          type: "success",
          text: data.message || "SMS de teste enviado com sucesso!",
        });
      }
    } catch {
      setSmsFeedback({
        type: "error",
        text: "Erro ao comunicar com o servidor no envio de teste SMS.",
      });
    } finally {
      setIsTestingSms(false);
    }
  };

  // ==================== AÇÕES: WHATSAPP ====================
  const handleSaveWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingWa(true);
    setWaFeedback(null);
    setConfirmOpenwaDisconnect(false);
    try {
      const res = await fetch("/api/admin/integrations/whatsapp", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: waEnabled,
          provider: waProvider,
          // Meta Official
          metaPhoneNumberId,
          metaWabaId,
          metaAccessToken: metaAccessToken || undefined,
          clearMetaAccessToken: clearMetaToken,
          metaVerifyToken,
          metaAppSecret: metaAppSecret || undefined,
          clearMetaAppSecret: clearMetaAppSecret,
          metaTemplateName,
          metaTemplateLanguage,
          // OpenWA
          openWaApiUrl: openwaApiUrl,
          openWaApiKey: openwaApiKey || undefined,
          clearOpenWaApiKey: clearOpenwaKey,
          openWaSessionId: openwaSessionId || "default",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setWaFeedback({
          type: "error",
          text: data.error || "Não foi possível salvar as configurações do WhatsApp.",
        });
        return;
      }

      if (data.integration) {
        const nextWa = data.integration as WhatsAppIntegrationSnapshot;
        setSnapshot((prev) => (prev ? { ...prev, whatsapp: nextWa } : prev));
        syncWhatsAppForm(nextWa);
      }
      setWaFeedback({
        type: "success",
        text: data.message || "Configurações do WhatsApp salvas com sucesso!",
      });
    } catch {
      setWaFeedback({
        type: "error",
        text: "Erro de comunicação ao salvar as configurações do WhatsApp.",
      });
    } finally {
      setIsSavingWa(false);
    }
  };

  const handleVerifyWhatsApp = async () => {
    setIsVerifyingWa(true);
    setWaFeedback(null);
    try {
      const res = await fetch("/api/admin/integrations/whatsapp/verify", {
        method: "POST",
      });
      const data = await res.json();
      if (data.qrCodeDataUri) {
        setOpenwaQrDataUri(data.qrCodeDataUri);
      } else if (data.healthStatus === "CONNECTED") {
        setOpenwaQrDataUri(null);
      }
      setSnapshot((prev) =>
        prev
          ? {
              ...prev,
              whatsapp: {
                ...prev.whatsapp,
                status: data.healthStatus || prev.whatsapp.status,
                healthMeta: data.healthMeta || prev.whatsapp.healthMeta,
                healthMessage: data.message || prev.whatsapp.healthMessage,
                lastCheckedAt: data.checkedAt || new Date().toISOString(),
                canSend: Boolean(data.ok),
                openwa: {
                  ...prev.whatsapp.openwa,
                  connectedNumber:
                    data.provider === "OPENWA"
                      ? data.displayPhone ||
                        (data.healthStatus === "CONNECTED"
                          ? prev.whatsapp.openwa.connectedNumber
                          : null)
                      : prev.whatsapp.openwa.connectedNumber,
                },
              },
            }
          : prev
      );
      if (!res.ok) {
        setWaFeedback({
          type: data.healthStatus === "AWAITING_QR" ? "info" : "error",
          text: data.message || data.error || "Falha ao verificar a conexão do WhatsApp.",
        });
      } else {
        setWaFeedback({
          type: "success",
          text: data.message || "Conexão WhatsApp verificada com sucesso!",
        });
      }
    } catch {
      setWaFeedback({
        type: "error",
        text: "Erro de comunicação ao verificar o provedor WhatsApp.",
      });
    } finally {
      setIsVerifyingWa(false);
    }
  };

  const handleSendTestWhatsApp = async () => {
    setIsTestingWa(true);
    setWaFeedback(null);
    try {
      const res = await fetch("/api/admin/integrations/whatsapp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: waTestPhone }),
      });
      const data = await res.json();
      setSnapshot((prev) =>
        prev
          ? {
              ...prev,
              whatsapp: {
                ...prev.whatsapp,
                status: data.healthStatus || prev.whatsapp.status,
                healthMeta: data.healthMeta || prev.whatsapp.healthMeta,
                healthMessage: res.ok
                  ? data.message
                  : data.error || prev.whatsapp.healthMessage,
                lastCheckedAt: data.checkedAt || prev.whatsapp.lastCheckedAt,
                lastTestedAt: res.ok
                  ? data.testedAt || new Date().toISOString()
                  : prev.whatsapp.lastTestedAt,
                canSend: res.ok ? true : prev.whatsapp.canSend,
              },
            }
          : prev
      );
      if (!res.ok) {
        setWaFeedback({
          type: "error",
          text: data.error || "Falha ao enviar mensagem de teste via WhatsApp.",
        });
      } else {
        setWaFeedback({
          type: "success",
          text: data.message || "Mensagem de teste enviada pelo WhatsApp!",
        });
      }
    } catch {
      setWaFeedback({
        type: "error",
        text: "Erro ao comunicar com o servidor durante o teste de WhatsApp.",
      });
    } finally {
      setIsTestingWa(false);
    }
  };

  const handleFetchOpenWaQr = async () => {
    setIsLoadingQr(true);
    setWaFeedback(null);
    try {
      const res = await fetch("/api/admin/integrations/whatsapp/openwa/qr", {
        method: "POST",
      });
      const data = await res.json();
      if (data.qrCodeDataUri) {
        setOpenwaQrDataUri(data.qrCodeDataUri);
      } else if (data.connected) {
        setOpenwaQrDataUri(null);
      }
      setSnapshot((prev) =>
        prev
          ? {
              ...prev,
              whatsapp: {
                ...prev.whatsapp,
                status: data.healthStatus || prev.whatsapp.status,
                healthMeta: data.healthMeta || prev.whatsapp.healthMeta,
                healthMessage: data.message || prev.whatsapp.healthMessage,
                lastCheckedAt: data.checkedAt || new Date().toISOString(),
                openwa: {
                  ...prev.whatsapp.openwa,
                  connectedNumber: data.connectedNumber || prev.whatsapp.openwa.connectedNumber,
                },
              },
            }
          : prev
      );
      setWaFeedback({
        type: res.ok ? "info" : "error",
        text:
          data.message ||
          data.error ||
          "Não foi possível obter o QR Code da sessão OpenWA.",
      });
    } catch {
      setWaFeedback({
        type: "error",
        text: "Erro de comunicação ao solicitar QR Code do OpenWA.",
      });
    } finally {
      setIsLoadingQr(false);
    }
  };

  const handleReconnectOpenWa = async () => {
    setIsReconnectingWa(true);
    setWaFeedback(null);
    try {
      const res = await fetch("/api/admin/integrations/whatsapp/openwa/reconnect", {
        method: "POST",
      });
      const data = await res.json();
      if (data.qrCodeDataUri) {
        setOpenwaQrDataUri(data.qrCodeDataUri);
      }
      setSnapshot((prev) =>
        prev
          ? {
              ...prev,
              whatsapp: {
                ...prev.whatsapp,
                status: data.healthStatus || prev.whatsapp.status,
                healthMeta: data.healthMeta || prev.whatsapp.healthMeta,
                healthMessage: data.message || prev.whatsapp.healthMessage,
                lastCheckedAt: data.checkedAt || new Date().toISOString(),
                openwa: {
                  ...prev.whatsapp.openwa,
                  connectedNumber:
                    data.healthStatus === "CONNECTED"
                      ? prev.whatsapp.openwa.connectedNumber
                      : null,
                },
              },
            }
          : prev
      );
      setWaFeedback({
        type: res.ok ? "info" : "error",
        text: data.message || data.error || "Solicitação de reconexão processada.",
      });
    } catch {
      setWaFeedback({
        type: "error",
        text: "Erro de comunicação ao tentar reconectar a sessão OpenWA.",
      });
    } finally {
      setIsReconnectingWa(false);
    }
  };

  const handleDisconnectOpenWa = async () => {
    setIsDisconnectingWa(true);
    setWaFeedback(null);
    setConfirmOpenwaDisconnect(false);
    try {
      const res = await fetch("/api/admin/integrations/whatsapp/openwa/disconnect", {
        method: "POST",
      });
      const data = await res.json();
      setOpenwaQrDataUri(null);
      setSnapshot((prev) =>
        prev
          ? {
              ...prev,
              whatsapp: {
                ...prev.whatsapp,
                status: data.healthStatus || prev.whatsapp.status,
                healthMeta: data.healthMeta || prev.whatsapp.healthMeta,
                healthMessage: data.message || prev.whatsapp.healthMessage,
                lastCheckedAt: data.checkedAt || new Date().toISOString(),
                canSend: false,
                openwa: {
                  ...prev.whatsapp.openwa,
                  connectedNumber: null,
                },
              },
            }
          : prev
      );
      setWaFeedback({
        type: res.ok ? "success" : "error",
        text: data.message || data.error || "Sessão desconectada.",
      });
    } catch {
      setWaFeedback({
        type: "error",
        text: "Erro de comunicação ao desconectar a sessão OpenWA.",
      });
    } finally {
      setIsDisconnectingWa(false);
    }
  };

  const handleCopyWebhook = async () => {
    const url = snapshot?.whatsapp.meta.webhookUrl;
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2000);
    } catch {
      // Clipboard indisponível em contexto sem foco
    }
  };

  if (isInitialLoading || !snapshot) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-7 w-64 rounded-xl bg-[#E5E5E5] dark:bg-[#242424] animate-pulse" />
            <div className="h-4 w-96 max-w-full rounded-xl bg-[#E5E5E5] dark:bg-[#242424] animate-pulse" />
          </div>
          <div className="h-9 w-36 rounded-xl bg-[#E5E5E5] dark:bg-[#242424] animate-pulse" />
        </div>
        <div className="h-12 w-72 rounded-2xl bg-[#E5E5E5] dark:bg-[#242424] animate-pulse" />
        <div className="h-96 rounded-2xl bg-[#E5E5E5] dark:bg-[#202020] animate-pulse" />
      </div>
    );
  }

  const smsRecoveryAllowed = snapshot.email.smsRecoveryReady;
  const selectedSmsDevice = smsDevices.find((d) => d.id === smsDeviceId);

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full pb-12">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="font-heading text-xl sm:text-3xl font-bold tracking-tight text-[#171717] dark:text-[#F5F5F5]">
            Integrações de Comunicação
          </h1>
          <p className="text-xs sm:text-sm text-[#737373] dark:text-[#A6A6A6] mt-1">
            Configure E-mail, SMS (TextBee) e WhatsApp com validação real de conexão e envios de teste.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleManualRefreshAll}
          disabled={isRefreshingAll}
          className="gap-2 w-full sm:w-auto shrink-0"
        >
          <RefreshCw className={cn("h-4 w-4", isRefreshingAll && "animate-spin")} />
          <span>{isRefreshingAll ? "Verificando..." : "Atualizar Status"}</span>
        </Button>
      </div>

      {globalError && <Alert variant="destructive">{globalError}</Alert>}

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-5 sm:space-y-6">
        {/* Navegação em Abas no padrão exato de Admin -> Lembretes */}
        <TabsList aria-label="Canais de comunicação" className="grid grid-cols-3 sm:inline-flex w-full sm:w-fit">
          <TabsTrigger value="email" className="justify-center px-2.5 sm:px-4">
            <Mail className="h-4 w-4 shrink-0" />
            <span>E-mail</span>
          </TabsTrigger>
          <TabsTrigger value="sms" className="justify-center px-2.5 sm:px-4">
            <Smartphone className="h-4 w-4 shrink-0" />
            <span>SMS</span>
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="justify-center px-2.5 sm:px-4">
            <MessageCircle className="h-4 w-4 shrink-0" />
            <span>WhatsApp</span>
          </TabsTrigger>
        </TabsList>

        <div className="rounded-xl border border-[#E5E5E5] dark:border-[#2C2C2C] bg-white dark:bg-[#202020] p-4 flex items-start gap-3 text-xs text-[#525252] dark:text-[#D0D0D0]">
          <ShieldCheck className="h-4 w-4 text-[var(--primary)] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            As credenciais sensíveis (senhas, API Keys e tokens) são armazenadas criptografadas e nunca retornam em texto aberto. O status exibido abaixo reflete o último teste real executado no provedor salvo.
          </p>
        </div>

        <div ref={tabContentRef}>
          {/* ==================== ABA 1 — E-MAIL ==================== */}
          <TabsContent value="email">
            <Card>
              <CardHeader className="border-b border-[#E5E5E5] dark:border-[#2C2C2C]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle>E-mail</CardTitle>
                      <CardDescription>
                        Envio transacional, confirmações de consulta e recuperação de senha
                      </CardDescription>
                    </div>
                  </div>

                  <IntegrationToggle
                    label="Ativar E-mail"
                    checked={emailEnabled}
                    onChange={(next) => {
                      setEmailEnabled(next);
                      setEmailDirty(true);
                    }}
                  />
                </div>
              </CardHeader>

              <CardContent className="pt-5 space-y-5">
                <IntegrationStatusBadge
                  enabled={emailEnabled}
                  status={snapshot.email.status}
                  healthMeta={snapshot.email.healthMeta}
                  healthMessage={snapshot.email.healthMessage}
                  lastCheckedAt={snapshot.email.lastCheckedAt}
                  lastTestedAt={snapshot.email.lastTestedAt}
                />

                <form onSubmit={handleSaveEmail} className="space-y-5">
                  {/* Aviso e estratégia de recuperação quando E-mail está desativado */}
                  {!emailEnabled && (
                    <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/70 dark:bg-[#1B1B1B] p-4 space-y-4">
                      <div className="flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-300">
                        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="font-semibold">
                            Atenção: o canal de e-mail está desativado
                          </p>
                          <p className="leading-relaxed opacity-90">
                            Com o envio de e-mail desabilitado, mensagens automáticas de recuperação de senha por e-mail não serão enviadas. Escolha como o sistema deve orientar a recuperação de acesso:
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <label
                          className={cn(
                            "rounded-xl border p-3.5 cursor-pointer flex items-start gap-2.5 transition-colors",
                            recoveryStrategy === "ADMIN_ASSISTED"
                              ? "border-[var(--primary)] bg-white dark:bg-[#292929] dark:border-[#525252]"
                              : "border-[#E5E5E5] dark:border-[#333333] bg-white/80 dark:bg-[#141414]"
                          )}
                        >
                          <input
                            type="radio"
                            name="recoveryStrategy"
                            value="ADMIN_ASSISTED"
                            checked={recoveryStrategy === "ADMIN_ASSISTED"}
                            onChange={() => {
                              setRecoveryStrategy("ADMIN_ASSISTED");
                              setEmailDirty(true);
                            }}
                            className="mt-0.5 accent-[var(--primary)]"
                          />
                          <div className="space-y-0.5">
                            <span className="font-semibold block text-[#171717] dark:text-[#F5F5F5]">
                              Atendimento assistido pelo consultório
                            </span>
                            <span className="text-[11px] text-[#737373] dark:text-[#A6A6A6] block leading-relaxed">
                              Exibe os canais de contato do consultório na tela de recuperação de senha.
                            </span>
                          </div>
                        </label>

                        <label
                          className={cn(
                            "rounded-xl border p-3.5 flex items-start gap-2.5 transition-colors",
                            !smsRecoveryAllowed
                              ? "opacity-60 cursor-not-allowed border-[#E5E5E5] dark:border-[#2C2C2C] bg-[#F8F8F8] dark:bg-[#141414]"
                              : recoveryStrategy === "SMS"
                              ? "cursor-pointer border-[var(--primary)] bg-white dark:bg-[#292929] dark:border-[#525252]"
                              : "cursor-pointer border-[#E5E5E5] dark:border-[#333333] bg-white/80 dark:bg-[#141414]"
                          )}
                        >
                          <input
                            type="radio"
                            name="recoveryStrategy"
                            value="SMS"
                            disabled={!smsRecoveryAllowed}
                            checked={recoveryStrategy === "SMS"}
                            onChange={() => {
                              setRecoveryStrategy("SMS");
                              setEmailDirty(true);
                            }}
                            className="mt-0.5 accent-[var(--primary)]"
                          />
                          <div className="space-y-0.5">
                            <span className="font-semibold block text-[#171717] dark:text-[#F5F5F5]">
                              Recuperação alternativa por SMS (TextBee)
                            </span>
                            <span className="text-[11px] text-[#737373] dark:text-[#A6A6A6] block leading-relaxed">
                              {smsRecoveryAllowed
                                ? "Envia o link de recuperação por SMS para usuários com celular e opt-in habilitado."
                                : "Disponível após ativar e salvar o canal SMS — TextBee com API Key e Device ID."}
                            </span>
                          </div>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Seletor de Modo: E-mail Padrão vs E-mail Personalizado */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-[#404040] dark:text-[#E5E5E5]">
                      Modo de Envio
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setEmailMode("DEFAULT");
                          setEmailDirty(true);
                        }}
                        className={cn(
                          "text-left rounded-xl border p-3.5 transition-colors cursor-pointer",
                          emailMode === "DEFAULT"
                            ? "border-[var(--primary)] bg-[var(--primary)]/10 dark:border-[#525252] dark:bg-[#292929]"
                            : "border-[#E5E5E5] dark:border-[#393939] bg-white dark:bg-[#1B1B1B] hover:bg-[#F8F8F8] dark:hover:bg-[#242424]"
                        )}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-[#171717] dark:text-[#F5F5F5]">
                            E-mail Padrão
                          </span>
                          <Badge
                            variant={snapshot.email.defaultEnvConfigured ? "success" : "secondary"}
                            size="sm"
                          >
                            {snapshot.email.defaultEnvConfigured ? "Servidor pronto" : "Não configurado no .env"}
                          </Badge>
                        </div>
                        <p className="text-xs text-[#737373] dark:text-[#A6A6A6] mt-1">
                          Usa o provedor configurado pelo desenvolvedor nas variáveis de ambiente do servidor PSI.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEmailMode("CUSTOM");
                          setEmailDirty(true);
                        }}
                        className={cn(
                          "text-left rounded-xl border p-3.5 transition-colors cursor-pointer",
                          emailMode === "CUSTOM"
                            ? "border-[var(--primary)] bg-[var(--primary)]/10 dark:border-[#525252] dark:bg-[#292929]"
                            : "border-[#E5E5E5] dark:border-[#393939] bg-white dark:bg-[#1B1B1B] hover:bg-[#F8F8F8] dark:hover:bg-[#242424]"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-[#171717] dark:text-[#F5F5F5]">
                            E-mail Personalizado
                          </span>
                          {snapshot.email.hasSavedCustomCredentials && (
                            <Badge variant="outline" size="sm">
                              Dados salvos
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-[#737373] dark:text-[#A6A6A6] mt-1">
                          Configure seu próprio servidor SMTP (Hostinger, cPanel, Google Workspace, SES ou SendGrid).
                        </p>
                      </button>
                    </div>
                  </div>

                  {emailMode === "DEFAULT" ? (
                    <div className="rounded-xl border border-[#E5E5E5] dark:border-[#333333] bg-[#F8F8F8] dark:bg-[#141414] p-4 space-y-4 text-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <p className="font-semibold text-[#171717] dark:text-[#F5F5F5]">
                            Modo E-mail Padrão (Gerenciado pelo Servidor PSI)
                          </p>
                          <p className="text-[#525252] dark:text-[#D0D0D0]">
                            {snapshot.email.defaultEnvSummary}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEmailMode("CUSTOM");
                            setEmailDirty(true);
                          }}
                          className="gap-2 w-full sm:w-auto shrink-0"
                        >
                          <Unlock className="h-3.5 w-3.5" />
                          <span>Desbloquear SMTP Personalizado</span>
                        </Button>
                      </div>

                      {!snapshot.email.defaultEnvConfigured && (
                        <Alert variant="warning">
                          Nenhum provedor de e-mail padrão foi configurado no ambiente do servidor (.env). Enquanto não houver um servidor SMTP padrão definido pelo desenvolvedor, o modo padrão não realizará envios reais. Desbloqueie a configuração SMTP personalizada caso deseje usar seu próprio servidor agora.
                        </Alert>
                      )}

                      <p className="text-[11px] text-[#737373] dark:text-[#A6A6A6]">
                        Suas credenciais de E-mail Personalizado continuam preservadas com segurança caso você alterne entre os modos. Defina abaixo o nome e o e-mail de resposta exibidos aos pacientes:
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                        <Input
                          label="Nome do Remetente (Opcional)"
                          placeholder="Consultório PSI"
                          value={senderName}
                          onChange={(e) => {
                            setSenderName(e.target.value);
                            setEmailDirty(true);
                          }}
                        />
                        <Input
                          label="E-mail de Resposta / Reply-To (Opcional)"
                          type="email"
                          placeholder="contato@consultorio.com.br"
                          value={replyTo}
                          onChange={(e) => {
                            setReplyTo(e.target.value);
                            setEmailDirty(true);
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="rounded-xl border border-[#E5E5E5] dark:border-[#333333] bg-[#F8F8F8] dark:bg-[#141414] px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 text-[#171717] dark:text-[#F5F5F5] font-medium">
                          <Unlock className="h-3.5 w-3.5 text-[var(--primary)] shrink-0" />
                          <span>Configuração SMTP personalizada desbloqueada</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEmailMode("DEFAULT");
                            setEmailDirty(true);
                          }}
                          className="gap-1.5 text-xs w-full sm:w-auto justify-start sm:justify-center"
                        >
                          <Lock className="h-3.5 w-3.5" />
                          <span>Voltar para E-mail Padrão</span>
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          label="Host SMTP *"
                          placeholder="smtp.seuconsultorio.com.br"
                          value={smtpHost}
                          onChange={(e) => {
                            setSmtpHost(e.target.value);
                            setEmailDirty(true);
                          }}
                        />

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Porta *"
                    type="number"
                    min={1}
                    max={65535}
                    className="tabular-nums"
                    placeholder="587"
                    value={smtpPort}
                    onChange={(e) => {
                      setSmtpPort(e.target.value);
                      setEmailDirty(true);
                    }}
                  />

                  <Select
                    label="Criptografia"
                    value={smtpEncryption}
                    onChange={(e) => {
                      const nextEnc = e.target.value as "TLS" | "SSL" | "NONE";
                      setSmtpEncryption(nextEnc);
                      if (smtpPort === "587" || smtpPort === "465" || smtpPort === "25" || !smtpPort) {
                        setSmtpPort(nextEnc === "SSL" ? "465" : nextEnc === "NONE" ? "25" : "587");
                      }
                      setEmailDirty(true);
                    }}
                  >
                    <option value="TLS">STARTTLS (587)</option>
                    <option value="SSL">SSL / TLS (465)</option>
                    <option value="NONE">Sem TLS (25)</option>
                  </Select>
                </div>

                <Input
                  label="Usuário / Login SMTP *"
                  placeholder="contato@seuconsultorio.com.br"
                  value={smtpUser}
                  onChange={(e) => {
                    setSmtpUser(e.target.value);
                    setEmailDirty(true);
                  }}
                />

                <div className="space-y-1.5">
                  <Input
                    label={
                      snapshot.email.hasPassword && !clearSmtpPass
                        ? "Senha SMTP (Salva — preencha apenas para substituir)"
                        : "Senha SMTP *"
                    }
                    type={showSmtpPass ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder={
                      snapshot.email.hasPassword && !clearSmtpPass
                        ? snapshot.email.maskedPassword || "••••••••"
                        : "Digite a senha ou App Password"
                    }
                    value={smtpPass}
                    onChange={(e) => {
                      setSmtpPass(e.target.value);
                      setClearSmtpPass(false);
                      setEmailDirty(true);
                    }}
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowSmtpPass((v) => !v)}
                        className="pointer-events-auto cursor-pointer text-[#737373] hover:text-[#171717] dark:text-[#A6A6A6] dark:hover:text-[#F5F5F5]"
                        aria-label={showSmtpPass ? "Ocultar senha SMTP" : "Exibir senha SMTP"}
                      >
                        {showSmtpPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    }
                  />
                  {snapshot.email.hasPassword && !smtpPass && (
                    <button
                      type="button"
                      onClick={() => {
                        setClearSmtpPass((prev) => !prev);
                        setEmailDirty(true);
                      }}
                      className="text-[11px] font-medium text-[#737373] dark:text-[#A6A6A6] hover:text-red-600 dark:hover:text-red-400 underline cursor-pointer"
                    >
                      {clearSmtpPass
                        ? "Remoção pendente ao salvar (clique para cancelar)"
                        : "Limpar senha salva"}
                    </button>
                  )}
                </div>

                <Input
                  label="Nome do Remetente"
                  placeholder="Consultório PSI"
                  value={senderName}
                  onChange={(e) => {
                    setSenderName(e.target.value);
                    setEmailDirty(true);
                  }}
                />

                <Input
                  label="E-mail de Envio (From)"
                  type="email"
                  placeholder="noreply@seuconsultorio.com.br"
                  value={senderEmail}
                  onChange={(e) => {
                    setSenderEmail(e.target.value);
                    setEmailDirty(true);
                  }}
                />

                <div className="md:col-span-2">
                  <Input
                    label="E-mail de Resposta (Reply-To)"
                    type="email"
                    placeholder="atendimento@seuconsultorio.com.br"
                    value={replyTo}
                    onChange={(e) => {
                      setReplyTo(e.target.value);
                      setEmailDirty(true);
                    }}
                  />
                </div>
                      </div>
                    </div>
            )}

            {emailFeedback && (
              <Alert
                variant={
                  emailFeedback.type === "error"
                    ? "destructive"
                    : emailFeedback.type === "info"
                    ? "info"
                    : "success"
                }
              >
                {emailFeedback.text}
              </Alert>
            )}

            {emailDirty && (
              <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                Há alterações não salvas na seção de E-mail. Salve antes de verificar a conexão ou disparar um teste.
              </p>
            )}

            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pt-4 border-t border-[#E5E5E5] dark:border-[#2C2C2C]">
              <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:flex sm:flex-wrap items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSavingEmail}
                  className="gap-2 w-full sm:w-auto"
                >
                  <Save className="h-4 w-4 shrink-0" />
                  <span>Salvar Alterações</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleVerifyEmail}
                  disabled={isVerifyingEmail || isSavingEmail || !emailEnabled || emailDirty}
                  className="gap-2 w-full sm:w-auto"
                >
                  {isVerifyingEmail ? (
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  ) : (
                    <Wifi className="h-4 w-4 shrink-0" />
                  )}
                  <span>{isVerifyingEmail ? "Verificando..." : "Verificar Conexão"}</span>
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-end gap-2.5 w-full lg:w-auto lg:min-w-[380px]">
                <div className="flex-1 min-w-0">
                  <Input
                    label="E-mail de Teste"
                    type="email"
                    placeholder="destinatario@exemplo.com"
                    value={emailTestAddress}
                    onChange={(e) => setEmailTestAddress(e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSendTestEmail}
                  disabled={isTestingEmail || isSavingEmail || !emailEnabled || emailDirty}
                  className="gap-2 w-full sm:w-auto shrink-0"
                >
                  {isTestingEmail ? (
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  ) : (
                    <Send className="h-4 w-4 shrink-0" />
                  )}
                  <span>{isTestingEmail ? "Enviando..." : "Enviar E-mail de Teste"}</span>
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
          </TabsContent>

          {/* ==================== ABA 2 — SMS (TEXTBEE) ==================== */}
          <TabsContent value="sms">
            <Card>
        <CardHeader className="border-b border-[#E5E5E5] dark:border-[#2C2C2C]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>SMS — TextBee</CardTitle>
                <CardDescription>
                  Envio via dispositivo Android pareado no gateway TextBee para pacientes opt-in
                </CardDescription>
              </div>
            </div>

            <IntegrationToggle
              label="Ativar SMS"
              checked={smsEnabled}
              onChange={(next) => {
                setSmsEnabled(next);
                setSmsDirty(true);
              }}
            />
          </div>
        </CardHeader>

        <CardContent className="pt-5 space-y-5">
          <IntegrationStatusBadge
            enabled={smsEnabled}
            status={snapshot.sms.status}
            healthMeta={snapshot.sms.healthMeta}
            healthMessage={snapshot.sms.healthMessage}
            lastCheckedAt={snapshot.sms.lastCheckedAt}
            lastTestedAt={snapshot.sms.lastTestedAt}
          />

          {/* Telemetria de opt-in de pacientes e status do aparelho selecionado */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl border border-[#E5E5E5] dark:border-[#333333] bg-[#F8F8F8] dark:bg-[#141414] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-[#171717] dark:text-[#F5F5F5]">
                  Consentimento LGPD para SMS
                </p>
                <p className="text-[11px] text-[#737373] dark:text-[#A6A6A6] mt-0.5">
                  Pacientes iniciam desmarcados (opt-in obrigatório).
                </p>
              </div>
              <Badge variant="outline" className="tabular-nums shrink-0 font-semibold self-start sm:self-center">
                {snapshot.sms.patientOptInStats.optedInCount} de{" "}
                {snapshot.sms.patientOptInStats.totalActivePatients} ativos
              </Badge>
            </div>

            <div className="rounded-xl border border-[#E5E5E5] dark:border-[#333333] bg-[#F8F8F8] dark:bg-[#141414] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-[#171717] dark:text-[#F5F5F5]">
                  Dispositivo Android TextBee
                </p>
                <p className="text-[11px] text-[#737373] dark:text-[#A6A6A6] mt-0.5 font-mono break-all sm:truncate sm:max-w-[220px]">
                  {smsDeviceId ? smsDeviceId : "Nenhum Device ID definido"}
                </p>
              </div>
              <Badge
                variant={
                  !smsEnabled
                    ? "secondary"
                    : snapshot.sms.status === "CONNECTED" || selectedSmsDevice?.isOnline
                    ? "success"
                    : snapshot.sms.status === "DEVICE_OFFLINE" ||
                      (selectedSmsDevice && !selectedSmsDevice.isOnline)
                    ? "warning"
                    : "outline"
                }
                className="gap-1 shrink-0 self-start sm:self-center"
              >
                {snapshot.sms.status === "CONNECTED" || selectedSmsDevice?.isOnline ? (
                  <>
                    <Wifi className="h-3 w-3" />
                    <span>Android Online</span>
                  </>
                ) : snapshot.sms.status === "DEVICE_OFFLINE" ||
                  (selectedSmsDevice && !selectedSmsDevice.isOnline) ? (
                  <>
                    <WifiOff className="h-3 w-3" />
                    <span>Android Offline</span>
                  </>
                ) : (
                  <span>Aguardando leitura</span>
                )}
              </Badge>
            </div>
          </div>

          <form onSubmit={handleSaveSms} className="space-y-5">
            {/* Modo de hospedagem TextBee */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#404040] dark:text-[#E5E5E5]">
                Servidor TextBee
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSmsHostingMode("CLOUD");
                    setSmsDirty(true);
                  }}
                  className={cn(
                    "text-left rounded-xl border p-3.5 transition-colors cursor-pointer",
                    smsHostingMode === "CLOUD"
                      ? "border-[var(--primary)] bg-[var(--primary)]/10 dark:border-[#525252] dark:bg-[#292929]"
                      : "border-[#E5E5E5] dark:border-[#393939] bg-white dark:bg-[#1B1B1B] hover:bg-[#F8F8F8] dark:hover:bg-[#242424]"
                  )}
                >
                  <span className="text-sm font-semibold block text-[#171717] dark:text-[#F5F5F5]">
                    TextBee Cloud
                  </span>
                  <span className="text-xs text-[#737373] dark:text-[#A6A6A6] mt-0.5 block">
                    Endpoint oficial ({snapshot.sms.cloudBaseUrl})
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSmsHostingMode("SELF_HOSTED");
                    setSmsDirty(true);
                  }}
                  className={cn(
                    "text-left rounded-xl border p-3.5 transition-colors cursor-pointer",
                    smsHostingMode === "SELF_HOSTED"
                      ? "border-[var(--primary)] bg-[var(--primary)]/10 dark:border-[#525252] dark:bg-[#292929]"
                      : "border-[#E5E5E5] dark:border-[#393939] bg-white dark:bg-[#1B1B1B] hover:bg-[#F8F8F8] dark:hover:bg-[#242424]"
                  )}
                >
                  <span className="text-sm font-semibold block text-[#171717] dark:text-[#F5F5F5]">
                    Self-Hosted
                  </span>
                  <span className="text-xs text-[#737373] dark:text-[#A6A6A6] mt-0.5 block">
                    Instância própria da API TextBee do consultório
                  </span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {smsHostingMode === "CLOUD" ? (
                <Input
                  label="URL da API TextBee (Cloud)"
                  value={snapshot.sms.cloudBaseUrl}
                  disabled
                  readOnly
                />
              ) : (
                <Input
                  label="URL Base Self-Hosted *"
                  placeholder="https://textbee.seuconsultorio.com.br/api/v1"
                  value={smsApiUrl}
                  onChange={(e) => {
                    setSmsApiUrl(e.target.value);
                    setSmsDirty(true);
                  }}
                />
              )}

              <div className="space-y-1.5">
                <Input
                  label={
                    snapshot.sms.hasApiKey && !clearSmsApiKey
                      ? "API Key TextBee (Salva — preencha apenas para substituir)"
                      : "API Key TextBee *"
                  }
                  type={showSmsApiKey ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder={
                    snapshot.sms.hasApiKey && !clearSmsApiKey
                      ? snapshot.sms.maskedApiKey || "••••••••"
                      : "Cole a API Key gerada no TextBee"
                  }
                  value={smsApiKey}
                  onChange={(e) => {
                    setSmsApiKey(e.target.value);
                    setClearSmsApiKey(false);
                    setSmsDirty(true);
                  }}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowSmsApiKey((v) => !v)}
                      className="pointer-events-auto cursor-pointer text-[#737373] hover:text-[#171717] dark:text-[#A6A6A6] dark:hover:text-[#F5F5F5]"
                      aria-label={showSmsApiKey ? "Ocultar API Key" : "Exibir API Key"}
                    >
                      {showSmsApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                />
                {snapshot.sms.hasApiKey && !smsApiKey && (
                  <button
                    type="button"
                    onClick={() => {
                      setClearSmsApiKey((prev) => !prev);
                      setSmsDirty(true);
                    }}
                    className="text-[11px] font-medium text-[#737373] dark:text-[#A6A6A6] hover:text-red-600 dark:hover:text-red-400 underline cursor-pointer"
                  >
                    {clearSmsApiKey
                      ? "Remoção pendente ao salvar (clique para cancelar)"
                      : "Limpar API Key salva"}
                  </button>
                )}
              </div>

              <div className="md:col-span-2 flex flex-col sm:flex-row sm:items-end gap-3">
                <div className="flex-1 min-w-0">
                  <Input
                    label="Device ID (Dispositivo Android) *"
                    placeholder="Ex: 65f8d9c12ab34c0012345678"
                    value={smsDeviceId}
                    onChange={(e) => {
                      setSmsDeviceId(e.target.value);
                      setSmsDirty(true);
                    }}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleFetchSmsDevices}
                  disabled={
                    isFetchingSmsDevices || (!smsApiKey.trim() && !snapshot.sms.hasApiKey)
                  }
                  className="gap-2 w-full sm:w-auto shrink-0"
                >
                  {isFetchingSmsDevices ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Smartphone className="h-4 w-4" />
                  )}
                  <span>
                    {isFetchingSmsDevices ? "Buscando..." : "Buscar Dispositivos"}
                  </span>
                </Button>
              </div>
            </div>

            {smsDevicesLoaded && (
              <div className="rounded-xl border border-[#E5E5E5] dark:border-[#333333] bg-[#F8F8F8] dark:bg-[#141414] p-4 space-y-3">
                <p className="text-xs font-semibold text-[#171717] dark:text-[#F5F5F5]">
                  Dispositivos Retornados pelo TextBee
                </p>
                {smsDevices.length === 0 ? (
                  <p className="text-xs text-[#737373] dark:text-[#A6A6A6]">
                    Nenhum dispositivo Android pareado encontrado nesta conta TextBee.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {smsDevices.map((dev) => {
                      const isSelected = dev.id === smsDeviceId;
                      return (
                        <button
                          key={dev.id}
                          type="button"
                          onClick={() => {
                            setSmsDeviceId(dev.id);
                            setSmsDirty(true);
                          }}
                          className={cn(
                            "text-left rounded-xl border p-3 transition-colors cursor-pointer flex items-center justify-between gap-2",
                            isSelected
                              ? "border-[var(--primary)] bg-white dark:bg-[#292929] dark:border-[#525252]"
                              : "border-[#E5E5E5] dark:border-[#2C2C2C] bg-white dark:bg-[#1B1B1B] hover:border-[#CCCCCC] dark:hover:border-[#525252]"
                          )}
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-[#171717] dark:text-[#F5F5F5] truncate">
                              {dev.name}
                            </p>
                            <p className="text-[11px] font-mono text-[#737373] dark:text-[#A6A6A6] truncate">
                              {dev.id}
                            </p>
                          </div>
                          <Badge
                            variant={dev.isOnline ? "success" : "warning"}
                            size="sm"
                            className="shrink-0"
                          >
                            {dev.isOnline ? "Online" : "Offline"}
                          </Badge>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {smsFeedback && (
              <Alert
                variant={
                  smsFeedback.type === "error"
                    ? "destructive"
                    : smsFeedback.type === "info"
                    ? "info"
                    : "success"
                }
              >
                {smsFeedback.text}
              </Alert>
            )}

            {smsDirty && (
              <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                Há alterações não salvas na seção de SMS. Salve antes de verificar a conexão ou enviar teste.
              </p>
            )}

            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pt-4 border-t border-[#E5E5E5] dark:border-[#2C2C2C]">
              <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:flex sm:flex-wrap items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSavingSms}
                  className="gap-2 w-full sm:w-auto"
                >
                  <Save className="h-4 w-4 shrink-0" />
                  <span>Salvar Alterações</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleVerifySms}
                  disabled={isVerifyingSms || isSavingSms || !smsEnabled || smsDirty}
                  className="gap-2 w-full sm:w-auto"
                >
                  {isVerifyingSms ? (
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  ) : (
                    <Wifi className="h-4 w-4 shrink-0" />
                  )}
                  <span>{isVerifyingSms ? "Verificando..." : "Verificar Conexão"}</span>
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-end gap-2.5 w-full lg:w-auto lg:min-w-[380px]">
                <div className="flex-1 min-w-0">
                  <Input
                    label="Celular para SMS de Teste"
                    placeholder="(11) 99999-9999 ou +5511999999999"
                    value={smsTestPhone}
                    onChange={(e) => setSmsTestPhone(e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSendTestSms}
                  disabled={isTestingSms || isSavingSms || !smsEnabled || smsDirty}
                  className="gap-2 w-full sm:w-auto shrink-0"
                >
                  {isTestingSms ? (
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  ) : (
                    <Send className="h-4 w-4 shrink-0" />
                  )}
                  <span>{isTestingSms ? "Enviando..." : "Enviar SMS de Teste"}</span>
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
          </TabsContent>

          {/* ==================== ABA 3 — WHATSAPP ==================== */}
          <TabsContent value="whatsapp">
            <Card>
        <CardHeader className="border-b border-[#E5E5E5] dark:border-[#2C2C2C]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                <WhatsAppIcon className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>WhatsApp</CardTitle>
                <CardDescription>
                  Selecione um único provedor ativo: API Oficial da Meta ou sessão via gateway OpenWA
                </CardDescription>
              </div>
            </div>

            <IntegrationToggle
              label="Ativar WhatsApp"
              checked={waEnabled}
              onChange={(next) => {
                setWaEnabled(next);
                setWaDirty(true);
              }}
            />
          </div>
        </CardHeader>

        <CardContent className="pt-5 space-y-5">
          <IntegrationStatusBadge
            enabled={waEnabled}
            status={snapshot.whatsapp.status}
            healthMeta={snapshot.whatsapp.healthMeta}
            healthMessage={snapshot.whatsapp.healthMessage}
            lastCheckedAt={snapshot.whatsapp.lastCheckedAt}
            lastTestedAt={snapshot.whatsapp.lastTestedAt}
          />

          <form onSubmit={handleSaveWhatsApp} className="space-y-5">
            {/* Seletor exclusivo de provedor: Meta Official API vs OpenWA */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="block text-xs font-semibold text-[#404040] dark:text-[#E5E5E5]">
                  Provedor de WhatsApp
                </label>
                <span className="text-[11px] text-[#737373] dark:text-[#A6A6A6]">
                  Apenas um provedor pode estar ativo por vez
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setWaProvider("META_OFFICIAL");
                    setConfirmOpenwaDisconnect(false);
                    setWaDirty(true);
                  }}
                  className={cn(
                    "text-left rounded-xl border p-3.5 transition-colors cursor-pointer",
                    waProvider === "META_OFFICIAL"
                      ? "border-[var(--primary)] bg-[var(--primary)]/10 dark:border-[#525252] dark:bg-[#292929]"
                      : "border-[#E5E5E5] dark:border-[#393939] bg-white dark:bg-[#1B1B1B] hover:bg-[#F8F8F8] dark:hover:bg-[#242424]"
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-[#171717] dark:text-[#F5F5F5]">
                      Meta Official API
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {waProvider === "META_OFFICIAL" && (
                        <Badge variant="default" size="sm">
                          Ativo
                        </Badge>
                      )}
                      <Badge variant="outline" size="sm">
                        Oficial Cloud API
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs text-[#737373] dark:text-[#A6A6A6] mt-1">
                    Conexão oficial via Meta Graph API com assinatura HMAC no webhook.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setWaProvider("OPENWA");
                    setWaDirty(true);
                  }}
                  className={cn(
                    "text-left rounded-xl border p-3.5 transition-colors cursor-pointer",
                    waProvider === "OPENWA"
                      ? "border-[var(--primary)] bg-[var(--primary)]/10 dark:border-[#525252] dark:bg-[#292929]"
                      : "border-[#E5E5E5] dark:border-[#393939] bg-white dark:bg-[#1B1B1B] hover:bg-[#F8F8F8] dark:hover:bg-[#242424]"
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-[#171717] dark:text-[#F5F5F5]">
                      OpenWA
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {waProvider === "OPENWA" && (
                        <Badge variant="default" size="sm">
                          Ativo
                        </Badge>
                      )}
                      <Badge variant="secondary" size="sm">
                        Sessão QR Code
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs text-[#737373] dark:text-[#A6A6A6] mt-1">
                    Servidor próprio conectado por leitura de QR Code do aplicativo.
                  </p>
                </button>
              </div>
            </div>

            {waProvider === "META_OFFICIAL" ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Phone Number ID *"
                    placeholder="Ex: 104958291038475"
                    className="tabular-nums"
                    value={metaPhoneNumberId}
                    onChange={(e) => {
                      setMetaPhoneNumberId(e.target.value);
                      setWaDirty(true);
                    }}
                  />

                  <Input
                    label="WABA ID (WhatsApp Business Account)"
                    placeholder="Opcional: 109283746501928"
                    className="tabular-nums"
                    value={metaWabaId}
                    onChange={(e) => {
                      setMetaWabaId(e.target.value);
                      setWaDirty(true);
                    }}
                  />

                  <div className="space-y-1.5">
                    <Input
                      label={
                        snapshot.whatsapp.meta.hasAccessToken && !clearMetaToken
                          ? "Access Token Meta (Salvo — preencha para alterar)"
                          : "Access Token Permanente *"
                      }
                      type={showMetaToken ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder={
                        snapshot.whatsapp.meta.hasAccessToken && !clearMetaToken
                          ? snapshot.whatsapp.meta.maskedAccessToken || "••••••••"
                          : "Token de acesso de usuário do sistema Meta"
                      }
                      value={metaAccessToken}
                      onChange={(e) => {
                        setMetaAccessToken(e.target.value);
                        setClearMetaToken(false);
                        setWaDirty(true);
                      }}
                      rightIcon={
                        <button
                          type="button"
                          onClick={() => setShowMetaToken((v) => !v)}
                          className="pointer-events-auto cursor-pointer text-[#737373] hover:text-[#171717] dark:text-[#A6A6A6] dark:hover:text-[#F5F5F5]"
                          aria-label={
                            showMetaToken ? "Ocultar Access Token" : "Exibir Access Token"
                          }
                        >
                          {showMetaToken ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      }
                    />
                    {snapshot.whatsapp.meta.hasAccessToken && !metaAccessToken && (
                      <button
                        type="button"
                        onClick={() => {
                          setClearMetaToken((prev) => !prev);
                          setWaDirty(true);
                        }}
                        className="text-[11px] font-medium text-[#737373] dark:text-[#A6A6A6] hover:text-red-600 dark:hover:text-red-400 underline cursor-pointer"
                      >
                        {clearMetaToken
                          ? "Remoção pendente ao salvar (clique para cancelar)"
                          : "Limpar token salvo"}
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Input
                      label={
                        snapshot.whatsapp.meta.hasAppSecret && !clearMetaAppSecret
                          ? "App Secret Meta (Salvo — validação HMAC)"
                          : "App Secret Meta (HMAC Webhook)"
                      }
                      type={showMetaAppSecret ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder={
                        snapshot.whatsapp.meta.hasAppSecret && !clearMetaAppSecret
                          ? snapshot.whatsapp.meta.maskedAppSecret || "••••••••"
                          : "Recomendado para verificar assinatura X-Hub-Signature-256"
                      }
                      value={metaAppSecret}
                      onChange={(e) => {
                        setMetaAppSecret(e.target.value);
                        setClearMetaAppSecret(false);
                        setWaDirty(true);
                      }}
                      rightIcon={
                        <button
                          type="button"
                          onClick={() => setShowMetaAppSecret((v) => !v)}
                          className="pointer-events-auto cursor-pointer text-[#737373] hover:text-[#171717] dark:text-[#A6A6A6] dark:hover:text-[#F5F5F5]"
                          aria-label={
                            showMetaAppSecret ? "Ocultar App Secret" : "Exibir App Secret"
                          }
                        >
                          {showMetaAppSecret ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      }
                    />
                    {snapshot.whatsapp.meta.hasAppSecret && !metaAppSecret && (
                      <button
                        type="button"
                        onClick={() => {
                          setClearMetaAppSecret((prev) => !prev);
                          setWaDirty(true);
                        }}
                        className="text-[11px] font-medium text-[#737373] dark:text-[#A6A6A6] hover:text-red-600 dark:hover:text-red-400 underline cursor-pointer"
                      >
                        {clearMetaAppSecret
                          ? "Remoção pendente ao salvar (clique para cancelar)"
                          : "Limpar App Secret salvo"}
                      </button>
                    )}
                  </div>

                  <Input
                    label="Verify Token (Desafio GET Webhook)"
                    placeholder="Defina um token secreto compartilhado no Meta Developers"
                    value={metaVerifyToken}
                    onChange={(e) => {
                      setMetaVerifyToken(e.target.value);
                      setWaDirty(true);
                    }}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <Input
                        label="Nome do Template (Opcional)"
                        placeholder="Ex: lembrete_consulta_psi"
                        value={metaTemplateName}
                        onChange={(e) => {
                          setMetaTemplateName(e.target.value);
                          setWaDirty(true);
                        }}
                      />
                    </div>
                    <Input
                      label="Idioma"
                      placeholder="pt_BR"
                      value={metaTemplateLanguage}
                      onChange={(e) => {
                        setMetaTemplateLanguage(e.target.value);
                        setWaDirty(true);
                      }}
                    />
                  </div>
                </div>

                {/* Box do Webhook URL */}
                <div className="rounded-xl border border-[#E5E5E5] dark:border-[#333333] bg-[#F8F8F8] dark:bg-[#141414] p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <span className="text-xs font-semibold block text-[#171717] dark:text-[#F5F5F5]">
                      URL de Callback do Webhook (Meta Developers)
                    </span>
                    <code className="block text-[11px] font-mono text-[#525252] dark:text-[#CCCCCC] break-all">
                      {snapshot.whatsapp.meta.webhookUrl}
                    </code>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyWebhook}
                    className="gap-1.5 shrink-0 w-full sm:w-auto"
                  >
                    {copiedWebhook ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copiar URL</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Alert variant="warning">
                  O OpenWA utiliza uma sessão não oficial conectada ao WhatsApp Web e pode sofrer desconexões ou bloqueios. Recomenda-se utilizar um número exclusivo do consultório e acompanhar o status da sessão.
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <Input
                      label="URL Base da API OpenWA *"
                      placeholder="https://openwa.seuconsultorio.com.br"
                      value={openwaApiUrl}
                      onChange={(e) => {
                        setOpenwaApiUrl(e.target.value);
                        setWaDirty(true);
                      }}
                    />
                  </div>

                  <Input
                    label="ID da Sessão"
                    placeholder="default"
                    value={openwaSessionId}
                    onChange={(e) => {
                      setOpenwaSessionId(e.target.value);
                      setWaDirty(true);
                    }}
                  />

                  <div className="md:col-span-3 space-y-1.5">
                    <Input
                      label={
                        snapshot.whatsapp.openwa.hasApiKey && !clearOpenwaKey
                          ? "API Key OpenWA (Salva — preencha apenas para substituir)"
                          : "API Key OpenWA (se configurada no gateway)"
                      }
                      type={showOpenwaKey ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder={
                        snapshot.whatsapp.openwa.hasApiKey && !clearOpenwaKey
                          ? snapshot.whatsapp.openwa.maskedApiKey || "••••••••"
                          : "Chave X-Api-Key / Bearer do servidor OpenWA"
                      }
                      value={openwaApiKey}
                      onChange={(e) => {
                        setOpenwaApiKey(e.target.value);
                        setClearOpenwaKey(false);
                        setWaDirty(true);
                      }}
                      rightIcon={
                        <button
                          type="button"
                          onClick={() => setShowOpenwaKey((v) => !v)}
                          className="pointer-events-auto cursor-pointer text-[#737373] hover:text-[#171717] dark:text-[#A6A6A6] dark:hover:text-[#F5F5F5]"
                          aria-label={
                            showOpenwaKey ? "Ocultar API Key OpenWA" : "Exibir API Key OpenWA"
                          }
                        >
                          {showOpenwaKey ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      }
                    />
                    {snapshot.whatsapp.openwa.hasApiKey && !openwaApiKey && (
                      <button
                        type="button"
                        onClick={() => {
                          setClearOpenwaKey((prev) => !prev);
                          setWaDirty(true);
                        }}
                        className="text-[11px] font-medium text-[#737373] dark:text-[#A6A6A6] hover:text-red-600 dark:hover:text-red-400 underline cursor-pointer"
                      >
                        {clearOpenwaKey
                          ? "Remoção pendente ao salvar (clique para cancelar)"
                          : "Limpar API Key salva"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Painel de controle da sessão OpenWA & QR Code */}
                <div className="rounded-xl border border-[#E5E5E5] dark:border-[#333333] bg-[#F8F8F8] dark:bg-[#141414] p-4 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-[#171717] dark:text-[#F5F5F5]">
                        Pareamento e Ciclo de Vida da Sessão ({snapshot.whatsapp.openwa.sessionId})
                      </p>
                      <p className="text-[11px] text-[#737373] dark:text-[#A6A6A6] tabular-nums">
                        {snapshot.whatsapp.openwa.connectedNumber
                          ? `Número conectado: ${snapshot.whatsapp.openwa.connectedNumber}`
                          : "Nenhum número pareado identificado no momento."}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:flex sm:flex-wrap items-stretch sm:items-center gap-2 w-full sm:w-auto">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleFetchOpenWaQr}
                        disabled={
                          isLoadingQr ||
                          waDirty ||
                          !snapshot.whatsapp.openwa.hasSavedCredentials
                        }
                        className="gap-1.5 w-full sm:w-auto"
                      >
                        {isLoadingQr ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                        ) : (
                          <QrCode className="h-3.5 w-3.5 shrink-0" />
                        )}
                        <span>Exibir QR Code</span>
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleReconnectOpenWa}
                        disabled={
                          isReconnectingWa ||
                          waDirty ||
                          !snapshot.whatsapp.openwa.hasSavedCredentials
                        }
                        className="gap-1.5 w-full sm:w-auto"
                      >
                        {isReconnectingWa ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                        ) : (
                          <RotateCcw className="h-3.5 w-3.5 shrink-0" />
                        )}
                        <span>Reconectar Sessão</span>
                      </Button>

                      {!confirmOpenwaDisconnect ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setConfirmOpenwaDisconnect(true)}
                          disabled={
                            isDisconnectingWa ||
                            waDirty ||
                            !snapshot.whatsapp.openwa.hasSavedCredentials
                          }
                          className="gap-1.5 min-[420px]:col-span-2 sm:col-span-1 w-full sm:w-auto"
                        >
                          <Unlink className="h-3.5 w-3.5 shrink-0" />
                          <span>Desconectar</span>
                        </Button>
                      ) : (
                        <div className="grid grid-cols-2 sm:flex items-center gap-1.5 min-[420px]:col-span-2 w-full sm:w-auto">
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={handleDisconnectOpenWa}
                            isLoading={isDisconnectingWa}
                            className="w-full sm:w-auto"
                          >
                            Confirmar Desconexão
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmOpenwaDisconnect(false)}
                            className="w-full sm:w-auto"
                          >
                            Cancelar
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {isWaitingOpenWaQr && (
                    <div className="flex items-center gap-2 text-[11px] text-amber-800 dark:text-amber-300">
                      <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                      <span>
                        Aguardando leitura do QR Code no aparelho — atualização automática a cada 6 segundos.
                      </span>
                    </div>
                  )}

                  {openwaQrDataUri && (
                    <div className="flex flex-col sm:flex-row items-center gap-4 pt-2 border-t border-[#E5E5E5] dark:border-[#2C2C2C]">
                      <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-[#E5E5E5] shrink-0">
                        <img
                          src={openwaQrDataUri}
                          alt="QR Code para parear sessão WhatsApp OpenWA"
                          className="h-36 w-36 sm:h-44 sm:w-44 object-contain"
                        />
                      </div>
                      <div className="text-xs text-[#525252] dark:text-[#D0D0D0] space-y-1.5">
                        <p className="font-semibold text-[#171717] dark:text-[#F5F5F5]">
                          Leia o QR Code no seu WhatsApp
                        </p>
                        <p>1. Abra o WhatsApp no celular exclusivo do consultório.</p>
                        <p>2. Acesse Dispositivos conectados e toque em Conectar dispositivo.</p>
                        <p>3. Aponte a câmera para o código ao lado e aguarde a confirmação automática.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {waFeedback && (
              <Alert
                variant={
                  waFeedback.type === "error"
                    ? "destructive"
                    : waFeedback.type === "info"
                    ? "info"
                    : "success"
                }
              >
                {waFeedback.text}
              </Alert>
            )}

            {waDirty && (
              <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                Há alterações não salvas na seção de WhatsApp. Salve antes de verificar a conexão, gerenciar sessão ou enviar teste.
              </p>
            )}

            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pt-4 border-t border-[#E5E5E5] dark:border-[#2C2C2C]">
              <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:flex sm:flex-wrap items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSavingWa}
                  className="gap-2 w-full sm:w-auto"
                >
                  <Save className="h-4 w-4 shrink-0" />
                  <span>Salvar Alterações</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleVerifyWhatsApp}
                  disabled={isVerifyingWa || isSavingWa || !waEnabled || waDirty}
                  className="gap-2 w-full sm:w-auto"
                >
                  {isVerifyingWa ? (
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  ) : (
                    <Wifi className="h-4 w-4 shrink-0" />
                  )}
                  <span>{isVerifyingWa ? "Verificando..." : "Verificar Conexão"}</span>
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-end gap-2.5 w-full lg:w-auto lg:min-w-[380px]">
                <div className="flex-1 min-w-0">
                  <Input
                    label="WhatsApp para Mensagem de Teste"
                    placeholder="(11) 99999-9999 ou +5511999999999"
                    value={waTestPhone}
                    onChange={(e) => setWaTestPhone(e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSendTestWhatsApp}
                  disabled={isTestingWa || isSavingWa || !waEnabled || waDirty}
                  className="gap-2 w-full sm:w-auto shrink-0"
                >
                  {isTestingWa ? (
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  ) : (
                    <Send className="h-4 w-4 shrink-0" />
                  )}
                  <span>{isTestingWa ? "Enviando..." : "Enviar Mensagem de Teste"}</span>
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
