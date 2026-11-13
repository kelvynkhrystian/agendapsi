import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { decryptSecret, sanitizeErrorMessage } from "@/lib/secrets";
import type { IntegrationHealthStatus } from "@/lib/integrations-health";

export type EmailMode = "DEFAULT" | "CUSTOM";
export type SmtpEncryption = "TLS" | "SSL" | "NONE";

export interface EmailSettingsInput {
  smtpEnabled?: boolean | null;
  emailMode?: string | null;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpEncryption?: string | null;
  smtpUser?: string | null;
  smtpPass?: string | null;
  smtpFrom?: string | null;
  smtpSenderName?: string | null;
  smtpReplyTo?: string | null;
  emailHealthStatus?: string | null;
  emailDisabledRecoveryStrategy?: string | null;
}

export interface DefaultEnvSmtpConfig {
  configured: boolean;
  host: string | null;
  port: number | null;
  encryption: SmtpEncryption;
  user: string | null;
  pass: string | null;
  senderEmail: string | null;
  senderName: string | null;
  replyTo: string | null;
  summary: string;
}

export interface EmailCapability {
  enabled: boolean;
  mode: EmailMode;
  configured: boolean;
  canSendRealEmails: boolean;
  sourceLabel: string;
  host: string | null;
  port: number | null;
  encryption: SmtpEncryption;
  user: string | null;
  pass: string | null;
  senderEmail: string | null;
  senderName: string | null;
  replyTo: string | null;
  missingFields: string[];
  reason: string | null;
}

function parseEncryption(raw?: string | null): SmtpEncryption {
  const upper = (raw || "TLS").trim().toUpperCase();
  if (upper === "SSL" || upper === "SMTPS") return "SSL";
  if (upper === "NONE" || upper === "PLAIN") return "NONE";
  return "TLS";
}

function parsePort(raw: string | number | null | undefined, encryption: SmtpEncryption): number | null {
  if (typeof raw === "number" && Number.isInteger(raw) && raw > 0 && raw <= 65535) {
    return raw;
  }
  if (typeof raw === "string" && raw.trim()) {
    const n = Number(raw.trim());
    if (Number.isInteger(n) && n > 0 && n <= 65535) return n;
  }
  if (encryption === "SSL") return 465;
  if (encryption === "TLS") return 587;
  return null;
}

export function getDefaultEnvSmtpConfig(): DefaultEnvSmtpConfig {
  const host = (process.env.PSI_DEFAULT_SMTP_HOST || process.env.SMTP_HOST || "").trim() || null;
  const encryption = parseEncryption(process.env.PSI_DEFAULT_SMTP_ENCRYPTION || process.env.SMTP_ENCRYPTION || "TLS");
  const port = parsePort(process.env.PSI_DEFAULT_SMTP_PORT || process.env.SMTP_PORT, encryption);
  const user = (process.env.PSI_DEFAULT_SMTP_USER || process.env.SMTP_USER || "").trim() || null;
  const pass = (process.env.PSI_DEFAULT_SMTP_PASS || process.env.SMTP_PASS || "").trim() || null;
  const senderEmail = (process.env.PSI_DEFAULT_SMTP_FROM || process.env.SMTP_FROM || user || "").trim() || null;
  const senderName =
    (process.env.PSI_DEFAULT_SMTP_SENDER_NAME || process.env.SMTP_SENDER_NAME || "Consultório PSI").trim() || null;
  const replyTo = (process.env.PSI_DEFAULT_SMTP_REPLY_TO || process.env.SMTP_REPLY_TO || "").trim() || null;

  const missingAuth = Boolean(user && !pass);
  const configured = Boolean(host && port && senderEmail && !missingAuth);

  let summary = "Serviço padrão do servidor não configurado nas variáveis de ambiente.";
  if (configured && host && port) {
    summary = `${host}:${port} (${senderEmail})`;
  } else if (host && missingAuth) {
    summary = "Variável PSI_DEFAULT_SMTP_HOST presente, mas a senha SMTP padrão está ausente.";
  }

  return {
    configured,
    host,
    port,
    encryption,
    user,
    pass,
    senderEmail,
    senderName,
    replyTo,
    summary,
  };
}

export function resolveEmailMode(sys?: EmailSettingsInput | null): EmailMode {
  const mode = (sys?.emailMode || "").trim().toUpperCase();
  if (mode === "CUSTOM") return "CUSTOM";
  if (mode === "DEFAULT") return "DEFAULT";
  // Fallback legado se registro anterior possuir host customizado sem emailMode definido
  if (sys?.smtpHost) return "CUSTOM";
  return "DEFAULT";
}

export function getEmailCapability(sys?: EmailSettingsInput | null): EmailCapability {
  const enabled = Boolean(sys?.smtpEnabled);
  const mode = resolveEmailMode(sys);

  if (mode === "DEFAULT") {
    const envCfg = getDefaultEnvSmtpConfig();
    const missingFields: string[] = [];
    if (!envCfg.host) missingFields.push("Host SMTP padrão (.env)");
    if (!envCfg.port) missingFields.push("Porta SMTP padrão (.env)");
    if (!envCfg.senderEmail) missingFields.push("E-mail remetente padrão (.env)");
    if (envCfg.user && !envCfg.pass) missingFields.push("Senha SMTP padrão (.env)");

    const configured = envCfg.configured;
    const canSendRealEmails = enabled && configured;
    let reason: string | null = null;
    if (!enabled) {
      reason = "O canal de e-mail está desativado pelo administrador.";
    } else if (!configured) {
      reason =
        "O modo E-mail Padrão foi selecionado, mas o servidor ainda não possui SMTP padrão configurado no ambiente.";
    }

    return {
      enabled,
      mode,
      configured,
      canSendRealEmails,
      sourceLabel: "E-mail Padrão (Servidor PSI)",
      host: envCfg.host,
      port: envCfg.port,
      encryption: envCfg.encryption,
      user: envCfg.user,
      pass: envCfg.pass,
      senderEmail: envCfg.senderEmail,
      senderName: envCfg.senderName,
      replyTo: envCfg.replyTo,
      missingFields,
      reason,
    };
  }

  const host = (sys?.smtpHost || "").trim() || null;
  const encryption = parseEncryption(sys?.smtpEncryption);
  const port = parsePort(sys?.smtpPort ?? null, encryption);
  const user = (sys?.smtpUser || "").trim() || null;
  const pass = decryptSecret(sys?.smtpPass);
  const senderEmail = (sys?.smtpFrom || user || "").trim() || null;
  const senderName = (sys?.smtpSenderName || "Consultório PSI").trim() || null;
  const replyTo = (sys?.smtpReplyTo || "").trim() || null;

  const missingFields: string[] = [];
  if (!host) missingFields.push("Host SMTP");
  if (!port) missingFields.push("Porta");
  if (!senderEmail) missingFields.push("E-mail do remetente");
  if (user && !pass) missingFields.push("Senha SMTP");

  const configured = missingFields.length === 0;
  const canSendRealEmails = enabled && configured;

  let reason: string | null = null;
  if (!enabled) {
    reason = "O canal de e-mail está desativado pelo administrador.";
  } else if (!configured) {
    reason = `Configuração SMTP personalizada incompleta: ${missingFields.join(", ")}.`;
  }

  return {
    enabled,
    mode,
    configured,
    canSendRealEmails,
    sourceLabel: "E-mail Personalizado (SMTP)",
    host,
    port,
    encryption,
    user,
    pass,
    senderEmail,
    senderName,
    replyTo,
    missingFields,
    reason,
  };
}

function buildNodemailerTransport(cap: EmailCapability) {
  if (!cap.host || !cap.port) {
    throw new Error("Host ou porta SMTP não configurados.");
  }

  const isLocalhost =
    cap.host === "127.0.0.1" || cap.host.toLowerCase() === "localhost" || cap.host === "::1";

  const transportOptions: SMTPTransport.Options = {
    host: cap.host,
    port: cap.port,
    secure: cap.encryption === "SSL",
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
  };

  if (cap.encryption === "NONE") {
    transportOptions.ignoreTLS = true;
  } else if (cap.encryption === "TLS") {
    transportOptions.requireTLS = !isLocalhost && cap.port === 587;
    if (isLocalhost) {
      transportOptions.tls = { rejectUnauthorized: false };
    }
  }

  if (cap.user && cap.pass) {
    transportOptions.auth = {
      user: cap.user,
      pass: cap.pass,
    };
  }

  return nodemailer.createTransport(transportOptions);
}

function classifySmtpError(err: unknown, secretToScrub?: string | null): {
  healthStatus: IntegrationHealthStatus;
  errorCode: string;
  message: string;
} {
  const errObj = err as { code?: string; responseCode?: number; message?: string } | null;
  const code = String(errObj?.code || "").toUpperCase();
  const responseCode = Number(errObj?.responseCode || 0);
  const sanitized = sanitizeErrorMessage(err, [secretToScrub]);

  if (code === "EAUTH" || responseCode === 535 || responseCode === 534 || responseCode === 530) {
    return {
      healthStatus: "INVALID_AUTH",
      errorCode: code || `SMTP_${responseCode || "AUTH"}`,
      message: "Credenciais SMTP recusadas pelo servidor. Verifique usuário e senha/token.",
    };
  }

  if (code === "ETIMEDOUT" || code === "ESOCKETTIMEDOUT" || code === "ENOTFOUND" || code === "ECONNREFUSED") {
    return {
      healthStatus: "SERVICE_UNAVAILABLE",
      errorCode: code,
      message: `Não foi possível alcançar o servidor SMTP (${code}): ${sanitized}`,
    };
  }

  return {
    healthStatus: "CONNECTION_FAILED",
    errorCode: code || (responseCode ? `SMTP_${responseCode}` : "SMTP_ERROR"),
    message: `Falha ao validar conexão SMTP: ${sanitized}`,
  };
}

export async function verifyEmailConnection(sys?: EmailSettingsInput | null): Promise<{
  ok: boolean;
  healthStatus: IntegrationHealthStatus;
  message: string;
  errorCode?: string;
  latencyMs: number;
}> {
  const cap = getEmailCapability(sys);
  const startedAt = Date.now();

  if (!cap.enabled) {
    return {
      ok: false,
      healthStatus: "DISABLED",
      message: "Ative o canal de e-mail para habilitar envios automáticos e testar a conexão.",
      latencyMs: Date.now() - startedAt,
    };
  }

  if (!cap.configured) {
    return {
      ok: false,
      healthStatus: "NOT_CONFIGURED",
      message: cap.reason || "Configuração de e-mail incompleta.",
      latencyMs: Date.now() - startedAt,
    };
  }

  try {
    const transporter = buildNodemailerTransport(cap);
    await transporter.verify();
    return {
      ok: true,
      healthStatus: "CONNECTED",
      message: `Conexão SMTP verificada com sucesso em ${cap.host}:${cap.port}.`,
      latencyMs: Date.now() - startedAt,
    };
  } catch (err: unknown) {
    const classified = classifySmtpError(err, cap.pass);
    return {
      ok: false,
      healthStatus: classified.healthStatus,
      message: classified.message,
      errorCode: classified.errorCode,
      latencyMs: Date.now() - startedAt,
    };
  }
}

export async function sendEmailMessage(
  sys: EmailSettingsInput | null | undefined,
  payload: {
    to: string;
    subject: string;
    text: string;
    html?: string;
    replyTo?: string | null;
  }
): Promise<{
  ok: boolean;
  provider: string;
  providerMessageId?: string | null;
  healthStatus: IntegrationHealthStatus;
  errorCode?: string;
  sanitizedErrorMessage?: string;
}> {
  const cap = getEmailCapability(sys);
  const providerTag = cap.mode === "DEFAULT" ? "SMTP_DEFAULT" : "SMTP_CUSTOM";

  if (!cap.enabled) {
    return {
      ok: false,
      provider: providerTag,
      healthStatus: "DISABLED",
      errorCode: "EMAIL_DISABLED",
      sanitizedErrorMessage: "O canal de e-mail está desativado pelo administrador.",
    };
  }

  if (!cap.configured || !cap.senderEmail) {
    return {
      ok: false,
      provider: providerTag,
      healthStatus: "NOT_CONFIGURED",
      errorCode: "EMAIL_NOT_CONFIGURED",
      sanitizedErrorMessage: cap.reason || "Credenciais SMTP incompletas.",
    };
  }

  try {
    const transporter = buildNodemailerTransport(cap);
    const safeSenderName = (cap.senderName || "Consultório PSI").replace(/["\r\n]/g, "").trim();
    const fromHeader = safeSenderName ? `"${safeSenderName}" <${cap.senderEmail}>` : cap.senderEmail;

    const info = await transporter.sendMail({
      from: fromHeader,
      to: payload.to,
      replyTo: payload.replyTo || cap.replyTo || undefined,
      subject: payload.subject,
      text: payload.text,
      html: payload.html || undefined,
    });

    return {
      ok: true,
      provider: providerTag,
      providerMessageId: info?.messageId || null,
      healthStatus: "CONNECTED",
    };
  } catch (err: unknown) {
    const classified = classifySmtpError(err, cap.pass);
    return {
      ok: false,
      provider: providerTag,
      healthStatus: classified.healthStatus,
      errorCode: classified.errorCode,
      sanitizedErrorMessage: classified.message,
    };
  }
}
