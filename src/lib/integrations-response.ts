import { NextRequest, NextResponse } from "next/server";
import type { SystemSettings } from "@prisma/client";
import { hasStoredSecret, maskSecret } from "@/lib/secrets";
import {
  getHealthStatusMeta,
  isSmsRecoveryReady,
  normalizeHealthStatus,
} from "@/lib/integrations-health";
import {
  getDefaultEnvSmtpConfig,
  getEmailCapability,
} from "@/lib/integrations-email";
import {
  getSmsCapability,
  TEXTBEE_CLOUD_BASE_URL,
} from "@/lib/integrations-sms";
import { getWhatsAppCapability } from "@/lib/integrations-whatsapp";

export function handleAdminApiError(error: unknown, fallbackMessage = "Erro interno.") {
  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Autenticação necessária." }, { status: 401 });
    }
    if (error.message === "FORBIDDEN" || error.message === "FORBIDDEN_RESOURCE_ACCESS") {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
  }
  console.error(fallbackMessage, error);
  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}

export function resolveWebhookEndpointUrl(req?: NextRequest): string {
  const envAppUrl = (process.env.APP_URL || "").trim().replace(/\/+$/, "");
  if (req) {
    const proto =
      req.headers.get("x-forwarded-proto") ||
      (req.nextUrl.protocol ? req.nextUrl.protocol.replace(/:$/, "") : "http");
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    if (host) {
      return `${proto}://${host}/api/webhooks/messages`;
    }
  }
  return `${envAppUrl || "http://localhost:3000"}/api/webhooks/messages`;
}

export function buildIntegrationSnapshot(
  sys: SystemSettings | null,
  options?: {
    req?: NextRequest;
    totalActivePatients?: number;
    smsOptInPatientsCount?: number;
  }
) {
  const emailCap = getEmailCapability(sys);
  const defaultEnv = getDefaultEnvSmtpConfig();
  const smsCap = getSmsCapability(sys);
  const waCap = getWhatsAppCapability(sys);
  const smsRecoveryReady = isSmsRecoveryReady(sys);

  const emailHealth = getHealthStatusMeta(
    sys?.emailHealthStatus,
    emailCap.enabled,
    emailCap.configured
  );
  const smsHealth = getHealthStatusMeta(
    sys?.smsHealthStatus,
    smsCap.enabled,
    smsCap.configured
  );
  const whatsappHealth = getHealthStatusMeta(
    sys?.whatsappHealthStatus,
    waCap.enabled,
    waCap.configured
  );

  const recoveryStrategy =
    sys?.emailDisabledRecoveryStrategy === "SMS" && smsRecoveryReady ? "SMS" : "ADMIN_ASSISTED";

  return {
    email: {
      enabled: emailCap.enabled,
      mode: emailCap.mode,
      configured: emailCap.configured,
      canSend: emailCap.canSendRealEmails,
      host: sys?.smtpHost || "",
      port: sys?.smtpPort || (sys?.smtpEncryption === "SSL" ? 465 : 587),
      encryption: sys?.smtpEncryption || "TLS",
      user: sys?.smtpUser || "",
      hasPassword: hasStoredSecret(sys?.smtpPass),
      maskedPassword: maskSecret(sys?.smtpPass),
      senderName: sys?.smtpSenderName || "",
      senderEmail: sys?.smtpFrom || "",
      replyTo: sys?.smtpReplyTo || "",
      hasSavedCustomCredentials: Boolean(sys?.smtpHost || sys?.smtpUser || hasStoredSecret(sys?.smtpPass)),
      defaultEnvConfigured: defaultEnv.configured,
      defaultEnvSummary: defaultEnv.summary,
      missingFields: emailCap.missingFields,
      status: emailHealth.status,
      healthMeta: emailHealth,
      healthMessage:
        emailHealth.status === "DISABLED"
          ? "Canal de e-mail desativado."
          : emailHealth.status === "NOT_CONFIGURED"
          ? emailCap.reason || "Credenciais SMTP obrigatórias ausentes."
          : sys?.emailHealthMessage || emailHealth.description,
      lastCheckedAt: sys?.emailLastCheckedAt ? sys.emailLastCheckedAt.toISOString() : null,
      lastTestedAt: sys?.emailLastTestedAt ? sys.emailLastTestedAt.toISOString() : null,
      recoveryStrategy,
      rawRecoveryStrategy: sys?.emailDisabledRecoveryStrategy || "ADMIN_ASSISTED",
      smsRecoveryReady,
    },
    sms: {
      enabled: smsCap.enabled,
      provider: "TEXTBEE",
      configured: smsCap.configured,
      canSend: smsCap.canSendRealSms,
      hostingMode: smsCap.hostingMode,
      cloudBaseUrl: TEXTBEE_CLOUD_BASE_URL,
      apiUrl: sys?.textbeeApiUrl || "",
      hasApiKey: hasStoredSecret(sys?.textbeeApiKey),
      maskedApiKey: maskSecret(sys?.textbeeApiKey),
      deviceId: sys?.textbeeDeviceId || "",
      hasSavedCredentials: Boolean(hasStoredSecret(sys?.textbeeApiKey) && sys?.textbeeDeviceId),
      missingFields: smsCap.missingFields,
      urlError: smsCap.urlError,
      status: smsHealth.status,
      healthMeta: smsHealth,
      healthMessage:
        smsHealth.status === "DISABLED"
          ? "Canal SMS desativado."
          : smsHealth.status === "NOT_CONFIGURED"
          ? smsCap.reason || "Informe API Key e Device ID do TextBee."
          : sys?.smsHealthMessage || smsHealth.description,
      lastCheckedAt: sys?.smsLastCheckedAt ? sys.smsLastCheckedAt.toISOString() : null,
      lastTestedAt: sys?.smsLastTestedAt ? sys.smsLastTestedAt.toISOString() : null,
      patientOptInStats: {
        totalActivePatients: options?.totalActivePatients ?? 0,
        optedInCount: options?.smsOptInPatientsCount ?? 0,
      },
    },
    whatsapp: {
      enabled: waCap.enabled,
      provider: waCap.provider,
      configured: waCap.configured,
      canSend: waCap.canSendRealMessages,
      missingFields: waCap.missingFields,
      urlError: waCap.urlError,
      status: whatsappHealth.status,
      healthMeta: whatsappHealth,
      healthMessage:
        whatsappHealth.status === "DISABLED"
          ? "Canal WhatsApp desativado."
          : whatsappHealth.status === "NOT_CONFIGURED"
          ? waCap.reason || "Complete e salve as credenciais do provedor selecionado."
          : sys?.whatsappHealthMessage || whatsappHealth.description,
      lastCheckedAt: sys?.whatsappLastCheckedAt ? sys.whatsappLastCheckedAt.toISOString() : null,
      lastTestedAt: sys?.whatsappLastTestedAt ? sys.whatsappLastTestedAt.toISOString() : null,
      meta: {
        phoneNumberId: sys?.whatsappMetaPhoneNumberId || "",
        wabaId: sys?.whatsappMetaWabaId || "",
        hasAccessToken: hasStoredSecret(sys?.whatsappMetaAccessToken),
        maskedAccessToken: maskSecret(sys?.whatsappMetaAccessToken),
        verifyToken: sys?.whatsappMetaVerifyToken || "",
        hasAppSecret: hasStoredSecret(sys?.whatsappMetaAppSecret),
        maskedAppSecret: maskSecret(sys?.whatsappMetaAppSecret),
        templateName: sys?.whatsappMetaTemplateName || "",
        templateLanguage: sys?.whatsappMetaTemplateLanguage || "pt_BR",
        hasSavedCredentials: Boolean(
          sys?.whatsappMetaPhoneNumberId && hasStoredSecret(sys?.whatsappMetaAccessToken)
        ),
        webhookUrl: resolveWebhookEndpointUrl(options?.req),
      },
      openwa: {
        apiUrl: sys?.openWaApiUrl || "",
        hasApiKey: hasStoredSecret(sys?.openWaApiKey),
        maskedApiKey: maskSecret(sys?.openWaApiKey),
        sessionId: sys?.openWaSessionId || "default",
        connectedNumber: sys?.openWaConnectedNumber || null,
        hasSavedCredentials: Boolean(sys?.openWaApiUrl),
      },
      rawPersistedStatus: normalizeHealthStatus(sys?.whatsappHealthStatus),
    },
  };
}
