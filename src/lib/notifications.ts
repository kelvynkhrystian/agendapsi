import { prisma } from "./prisma";
import { NotificationChannel, NotificationType } from "@prisma/client";
import { formatBRL, formatDate, formatTime } from "./utils";
import { getEmailCapability, sendEmailMessage } from "./integrations-email";
import { getSmsCapability, sendSmsMessage } from "./integrations-sms";
import { getWhatsAppCapability, sendWhatsAppMessage } from "./integrations-whatsapp";

export type DeliveryMode = "APP_ONLY" | "APP_EMAIL" | "ALL_CHANNELS";

export interface NotificationVariables {
  patientName?: string;
  professionalName?: string;
  serviceName?: string;
  date?: string | Date;
  time?: string | Date;
  timezone?: string;
  valueCents?: number;
  location?: string;
  meetingLink?: string;
  [key: string]: unknown;
}

export interface DefaultTemplateDefinition {
  eventType: string;
  title: string;
  body: string;
  deliveryMode: DeliveryMode;
}

export const DEFAULT_NOTIFICATION_TEMPLATES: DefaultTemplateDefinition[] = [
  {
    eventType: "APPOINTMENT_CONFIRMED",
    title: "Consulta confirmada",
    body: "Olá, {nome_paciente}! Sua consulta de {servico} com {nome_profissional} foi confirmada para {data} às {hora}. Local: {local}.",
    deliveryMode: "APP_EMAIL",
  },
  {
    eventType: "APPOINTMENT_REGISTERED",
    title: "Agendamento recebido",
    body: "Olá, {nome_paciente}! Seu pedido de agendamento para {servico} em {data} às {hora} foi registrado com sucesso.",
    deliveryMode: "APP_EMAIL",
  },
  {
    eventType: "APPOINTMENT_CANCELLED",
    title: "Consulta cancelada",
    body: "Olá, {nome_paciente}! Sua consulta de {servico} agendada para {data} às {hora} foi cancelada.",
    deliveryMode: "APP_EMAIL",
  },
  {
    eventType: "APPOINTMENT_RESCHEDULED",
    title: "Consulta reagendada",
    body: "Olá, {nome_paciente}! Sua consulta foi reagendada para {data} às {hora}. Por gentileza, verifique os detalhes na sua área do paciente.",
    deliveryMode: "APP_EMAIL",
  },
  {
    eventType: "APPOINTMENT_REMINDER",
    title: "Lembrete de consulta",
    body: "Olá, {nome_paciente}! Passando para lembrar que sua consulta de {servico} será em {data}, às {hora}.",
    deliveryMode: "ALL_CHANNELS",
  },
  {
    eventType: "PAYMENT_PENDING",
    title: "Pagamento pendente",
    body: "Olá, {nome_paciente}! O pagamento no valor de {valor} para a sua sessão está pendente. Acesse a área financeira para concluir.",
    deliveryMode: "APP_ONLY",
  },
  {
    eventType: "PAYMENT_APPROVED",
    title: "Pagamento aprovado",
    body: "Olá, {nome_paciente}! Recebemos o seu pagamento de {valor} com sucesso. Muito obrigado!",
    deliveryMode: "APP_EMAIL",
  },
  {
    eventType: "PAYMENT_REFUNDED",
    title: "Pagamento estornado",
    body: "Olá, {nome_paciente}! O estorno no valor de {valor} referente à sua consulta foi processado.",
    deliveryMode: "APP_EMAIL",
  },
  {
    eventType: "PACKAGE_AWAITING_ACCEPTANCE",
    title: "Proposta de pacote de sessões disponível",
    body: "Olá, {nome_paciente}! O profissional enviou uma proposta de pacote de atendimentos no valor de {valor}. Acesse sua área para revisar e aceitar.",
    deliveryMode: "APP_EMAIL",
  },
  {
    eventType: "PACKAGE_CONFIRMED",
    title: "Pacote de sessões confirmado",
    body: "Olá, {nome_paciente}! Seu pacote de sessões foi confirmado com sucesso. Todos os horários estão garantidos na agenda.",
    deliveryMode: "APP_EMAIL",
  },
  {
    eventType: "ANAMNESIS_ASSIGNED",
    title: "Ficha de anamnese disponível",
    body: "Olá, {nome_paciente}! Uma ficha de anamnese inicial está disponível na sua área do paciente para preenchimento.",
    deliveryMode: "APP_EMAIL",
  },
  {
    eventType: "ANAMNESIS_COMPLETED_PATIENT",
    title: "Anamnese concluída",
    body: "Olá, {nome_paciente}! Sua ficha de anamnese foi enviada com sucesso e está sendo revisada pelo profissional.",
    deliveryMode: "APP_ONLY",
  },
  {
    eventType: "DOCUMENT_AVAILABLE",
    title: "Novo documento disponível",
    body: "Olá, {nome_paciente}! Um novo documento ou declaração foi disponibilizado pelo seu profissional na sua área de documentos.",
    deliveryMode: "APP_EMAIL",
  },
  // Eventos para o Administrador (Profissional)
  {
    eventType: "ADMIN_NEW_APPOINTMENT",
    title: "Novo agendamento recebido",
    body: "O paciente {nome_paciente} solicitou agendamento para {servico} em {data} às {hora}.",
    deliveryMode: "APP_ONLY",
  },
  {
    eventType: "ADMIN_NEW_PATIENT",
    title: "Novo paciente cadastrado",
    body: "O paciente {nome_paciente} completou o cadastro no consultório.",
    deliveryMode: "APP_ONLY",
  },
  {
    eventType: "ADMIN_ANAMNESIS_COMPLETED",
    title: "Anamnese preenchida aguardando revisão",
    body: "O paciente {nome_paciente} enviou as respostas da ficha de anamnese inicial.",
    deliveryMode: "APP_ONLY",
  },
  {
    eventType: "ADMIN_APPOINTMENT_CANCELLED",
    title: "Consulta cancelada pelo paciente",
    body: "O paciente {nome_paciente} cancelou a consulta agendada para {data} às {hora}.",
    deliveryMode: "APP_ONLY",
  },
  {
    eventType: "ADMIN_LATE_CANCELLATION",
    title: "Cancelamento tardio de consulta",
    body: "O paciente {nome_paciente} cancelou a consulta de {data} com menos de 72 horas de antecedência.",
    deliveryMode: "APP_ONLY",
  },
  {
    eventType: "ADMIN_MANUAL_PAYMENT_PENDING",
    title: "Pagamento pendente de conferência",
    body: "Há um pagamento de {valor} do paciente {nome_paciente} aguardando conciliação manual.",
    deliveryMode: "APP_ONLY",
  },
  {
    eventType: "ADMIN_PACKAGE_ACCEPTED",
    title: "Pacote de sessões aceito",
    body: "O paciente {nome_paciente} aceitou a proposta de pacote de sessões no valor de {valor}.",
    deliveryMode: "APP_ONLY",
  },
];

/**
 * Renderiza o texto substituindo variáveis de forma segura
 */
export function renderNotificationTemplate(
  text: string,
  vars: NotificationVariables
): string {
  let rendered = text;

  const dateStr = vars.date
    ? typeof vars.date === "string"
      ? vars.date
      : formatDate(vars.date, vars.timezone)
    : "";

  const timeStr = vars.time
    ? typeof vars.time === "string"
      ? vars.time
      : formatTime(vars.time, vars.timezone)
    : "";

  const valStr = vars.valueCents !== undefined ? formatBRL(vars.valueCents) : "";

  const replacements: Record<string, string> = {
    "{nome_paciente}": vars.patientName || "Paciente",
    "{nome_profissional}": vars.professionalName || "Profissional",
    "{servico}": vars.serviceName || "Consulta",
    "{data}": dateStr,
    "{hora}": timeStr,
    "{valor}": valStr,
    "{local}": vars.location || "Consultório / Sala Virtual",
    "{link_consulta}": vars.meetingLink || "",
  };

  for (const [placeholder, val] of Object.entries(replacements)) {
    rendered = rendered.split(placeholder).join(val);
  }

  return rendered;
}

/**
 * Busca ou inicializa o template configurado no banco
 */
export async function getOrCreateTemplate(eventType: string) {
  const existing = await prisma.sharedNotificationTemplate.findUnique({
    where: { eventType },
  });
  if (existing) return existing;

  const def = DEFAULT_NOTIFICATION_TEMPLATES.find((d) => d.eventType === eventType);
  const data = def || {
    eventType,
    title: "Notificação do Consultório",
    body: "Você possui uma nova notificação.",
    deliveryMode: "APP_ONLY" as DeliveryMode,
  };

  return prisma.sharedNotificationTemplate.create({
    data: {
      eventType: data.eventType,
      title: data.title,
      body: data.body,
      deliveryMode: data.deliveryMode,
    },
  });
}

export interface DispatchNotificationParams {
  recipientId: string;
  recipientRole: "ADMIN" | "PATIENT";
  eventType: string;
  targetUrl?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  vars: NotificationVariables;
  idempotencyKey?: string;
}

/**
 * Mascara destinatário (e-mail ou telefone) para exibição segura sem violar LGPD.
 */
export function maskRecipient(recipient: string, channel?: string): string {
  if (!recipient) return "***";

  // Se for e-mail
  if (channel === "EMAIL" || recipient.includes("@")) {
    const [user, domain] = recipient.split("@");
    if (!domain) return recipient;
    if (user.length <= 2) {
      return `${user.charAt(0)}***@${domain}`;
    }
    return `${user.slice(0, 2)}***${user.slice(-1)}@${domain}`;
  }

  // Se for número de telefone
  const digits = recipient.replace(/\D/g, "");
  if (digits.length >= 10) {
    const national = digits.length > 11 && digits.startsWith("55") ? digits.slice(2) : digits;
    if (national.length === 11) {
      return `(${national.slice(0, 2)}) ${national.slice(2, 3)}****-${national.slice(-4)}`;
    }
    if (national.length === 10) {
      return `(${national.slice(0, 2)}) ****-${national.slice(-4)}`;
    }
    return `${digits.slice(0, 4)}****${digits.slice(-4)}`;
  }

  // Se for ID longo (ex: cuid)
  if (recipient.length > 6) {
    return `${recipient.slice(0, 3)}...${recipient.slice(-3)}`;
  }

  return "***";
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildCleanEmailHtml(title: string, body: string): string {
  const safeTitle = escapeHtml(title);
  const paragraphs = body
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 12px;color:#333333;font-size:14px;line-height:1.6;">${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`)
    .join("");
  return `<!DOCTYPE html><html lang="pt-BR"><body style="margin:0;padding:24px;background:#F8F8F8;font-family:Arial,Helvetica,sans-serif;"><div style="max-width:560px;margin:0 auto;background:#FFFFFF;border:1px solid #E5E5E5;border-radius:16px;padding:28px;"><h2 style="margin:0 0 16px;font-size:18px;color:#171717;">${safeTitle}</h2>${paragraphs}<hr style="border:none;border-top:1px solid #E5E5E5;margin:20px 0 12px;"/><p style="margin:0;color:#737373;font-size:11px;">Mensagem automática enviada pelo Consultório PSI.</p></div></body></html>`;
}

function resolveNotificationTemplateType(eventType: string): NotificationType {
  switch (eventType) {
    case "APPOINTMENT_REGISTERED":
    case "ADMIN_NEW_APPOINTMENT":
      return "APPOINTMENT_CREATED";
    case "APPOINTMENT_CANCELLED":
    case "ADMIN_APPOINTMENT_CANCELLED":
    case "ADMIN_LATE_CANCELLATION":
      return "APPOINTMENT_CANCELLED";
    case "APPOINTMENT_RESCHEDULED":
      return "APPOINTMENT_RESCHEDULED";
    case "PAYMENT_APPROVED":
    case "PAYMENT_PENDING":
    case "PAYMENT_REFUNDED":
      return "PAYMENT_RECEIVED";
    case "PACKAGE_AWAITING_ACCEPTANCE":
    case "PACKAGE_CONFIRMED":
    case "ADMIN_PACKAGE_ACCEPTED":
      return "PACKAGE_PROPOSAL";
    case "APPOINTMENT_REMINDER":
      return "REMINDER_24H";
    default:
      return "APPOINTMENT_CONFIRMED";
  }
}

async function persistHealthTelemetry(
  sysId: string | undefined,
  data: Record<string, unknown>
): Promise<void> {
  if (!sysId) return;
  try {
    await prisma.systemSettings.update({
      where: { id: sysId },
      data,
    });
  } catch {
    // Telemetria auxiliar não deve interromper o fluxo transacional
  }
}

/**
 * Disparador unificado de notificações com suporte real a In-App, E-mail (SMTP), SMS (TextBee) e WhatsApp (Meta / OpenWA)
 */
export async function dispatchNotification(params: DispatchNotificationParams) {
  try {
    // 1. Idempotência: previne duplicação respeitando idempotencyKey e permitindo múltiplas remarcações distintas
    if (params.idempotencyKey) {
      const existingDelivery = await prisma.notificationDelivery.findFirst({
        where: {
          OR: [
            { idempotencyKey: `email-${params.idempotencyKey}` },
            { idempotencyKey: `wa-${params.idempotencyKey}` },
            { idempotencyKey: `sms-${params.idempotencyKey}` },
          ],
        },
        select: { id: true },
      });
      if (existingDelivery) {
        return existingDelivery;
      }

      if (params.eventType !== "APPOINTMENT_RESCHEDULED") {
        const existing = await prisma.notification.findFirst({
          where: {
            recipientId: params.recipientId,
            eventType: params.eventType,
            relatedEntityId: params.relatedEntityId,
          },
        });
        if (existing) {
          return existing;
        }
      }
    }

    const template = await getOrCreateTemplate(params.eventType);
    const title = renderNotificationTemplate(template.title, params.vars);
    const message = renderNotificationTemplate(template.body, params.vars);
    const resolvedTemplateType = resolveNotificationTemplateType(params.eventType);

    // 2. Sempre cria a notificação interna (In-App)
    const notification = await prisma.notification.create({
      data: {
        recipientId: params.recipientId,
        recipientRole: params.recipientRole,
        eventType: params.eventType,
        title,
        message,
        targetUrl: params.targetUrl,
        relatedEntityType: params.relatedEntityType,
        relatedEntityId: params.relatedEntityId,
      },
    });

    const deliveryMode = (template.deliveryMode || "APP_ONLY") as DeliveryMode;
    if (deliveryMode === "APP_ONLY") {
      return notification;
    }

    const sys = await prisma.systemSettings.findFirst();

    // Resolve dados de contato reais do destinatário
    let recipientEmail = params.recipientId.includes("@") ? params.recipientId : "";
    let recipientPhone =
      !params.recipientId.includes("@") && /^\+?[\d\s()-]{8,}$/.test(params.recipientId)
        ? params.recipientId
        : "";
    let patientSmsOptIn = false;

    if (params.recipientRole === "ADMIN") {
      const admin = await prisma.adminAccount.findUnique({
        where: { id: params.recipientId },
        select: { email: true, phone: true },
      });
      if (admin?.email) recipientEmail = admin.email;
      if (admin?.phone) recipientPhone = admin.phone;
    } else {
      const patient = await prisma.patient.findUnique({
        where: { id: params.recipientId },
        select: { email: true, phone: true, smsOptIn: true },
      });
      if (patient?.email) recipientEmail = patient.email;
      if (patient?.phone) recipientPhone = patient.phone;
      patientSmsOptIn = Boolean(patient?.smsOptIn);
    }

    // 3. E-mail se APP_EMAIL ou ALL_CHANNELS
    if (deliveryMode === "APP_EMAIL" || deliveryMode === "ALL_CHANNELS") {
      try {
        const emailCap = getEmailCapability(sys);
        const now = new Date();
        const targetEmail = recipientEmail || params.recipientId;
        const masked = maskRecipient(targetEmail, "EMAIL");

        if (!emailCap.canSendRealEmails) {
          await prisma.notificationDelivery.create({
            data: {
              recipient: targetEmail,
              maskedRecipient: masked,
              channel: "EMAIL",
              templateType: resolvedTemplateType,
              messageType: params.eventType,
              subjectOrCategory: title,
              recipientReference: params.recipientId,
              relatedAppointmentId:
                params.relatedEntityType === "Appointment" ? params.relatedEntityId : undefined,
              status: "SIMULATED",
              simulated: true,
              provider: "SIMULATED",
              attemptedAt: now,
              attemptCount: 1,
              errorDetails: emailCap.reason || "Canal de e-mail desativado ou não configurado; entrega simulada.",
              idempotencyKey: params.idempotencyKey ? `email-${params.idempotencyKey}` : undefined,
              metadataJson: JSON.stringify({
                title,
                message,
                eventType: params.eventType,
                vars: params.vars,
              }),
            },
          });
        } else if (!targetEmail || !targetEmail.includes("@")) {
          await prisma.notificationDelivery.create({
            data: {
              recipient: targetEmail || "ausente",
              maskedRecipient: masked,
              channel: "EMAIL",
              templateType: resolvedTemplateType,
              messageType: params.eventType,
              subjectOrCategory: title,
              recipientReference: params.recipientId,
              relatedAppointmentId:
                params.relatedEntityType === "Appointment" ? params.relatedEntityId : undefined,
              status: "FAILED",
              simulated: false,
              provider: emailCap.mode === "DEFAULT" ? "SMTP_DEFAULT" : "SMTP_CUSTOM",
              attemptedAt: now,
              failedAt: now,
              attemptCount: 1,
              errorCode: "INVALID_EMAIL",
              sanitizedErrorMessage: "Destinatário sem endereço de e-mail válido.",
              errorDetails: "Destinatário sem endereço de e-mail válido.",
              idempotencyKey: params.idempotencyKey ? `email-${params.idempotencyKey}` : undefined,
              metadataJson: JSON.stringify({ title, message, eventType: params.eventType }),
            },
          });
        } else {
          const emailRes = await sendEmailMessage(sys, {
            to: targetEmail,
            subject: title,
            text: message,
            html: buildCleanEmailHtml(title, message),
          });
          const doneAt = new Date();

          await prisma.notificationDelivery.create({
            data: {
              recipient: targetEmail,
              maskedRecipient: masked,
              channel: "EMAIL",
              templateType: resolvedTemplateType,
              messageType: params.eventType,
              subjectOrCategory: title,
              recipientReference: params.recipientId,
              relatedAppointmentId:
                params.relatedEntityType === "Appointment" ? params.relatedEntityId : undefined,
              status: emailRes.ok ? "ACCEPTED" : "FAILED",
              simulated: false,
              provider: emailRes.provider,
              providerMessageId: emailRes.providerMessageId || undefined,
              attemptedAt: doneAt,
              acceptedAt: emailRes.ok ? doneAt : undefined,
              failedAt: emailRes.ok ? undefined : doneAt,
              attemptCount: 1,
              errorCode: emailRes.ok ? null : emailRes.errorCode || "EMAIL_SEND_FAILED",
              sanitizedErrorMessage: emailRes.ok ? null : emailRes.sanitizedErrorMessage || "Falha ao enviar e-mail.",
              errorDetails: emailRes.ok ? null : emailRes.sanitizedErrorMessage || "Falha ao enviar e-mail.",
              idempotencyKey: params.idempotencyKey ? `email-${params.idempotencyKey}` : undefined,
              metadataJson: JSON.stringify({
                title,
                message,
                eventType: params.eventType,
                vars: params.vars,
              }),
            },
          });

          await persistHealthTelemetry(sys?.id, {
            emailHealthStatus: emailRes.healthStatus,
            emailHealthMessage: emailRes.ok ? null : emailRes.sanitizedErrorMessage || null,
            emailLastCheckedAt: doneAt,
          });
        }
      } catch (e) {
        console.error("Falha ao processar entrega de email:", e);
      }
    }

    // 4. WhatsApp se ALL_CHANNELS
    if (deliveryMode === "ALL_CHANNELS") {
      try {
        const waCap = getWhatsAppCapability(sys);
        const now = new Date();
        const targetPhone = recipientPhone || params.recipientId;
        const masked = maskRecipient(targetPhone, "WHATSAPP");

        if (!waCap.canSendRealMessages) {
          await prisma.notificationDelivery.create({
            data: {
              recipient: targetPhone,
              maskedRecipient: masked,
              channel: "WHATSAPP",
              templateType: resolvedTemplateType,
              messageType: params.eventType,
              subjectOrCategory: title,
              recipientReference: params.recipientId,
              relatedAppointmentId:
                params.relatedEntityType === "Appointment" ? params.relatedEntityId : undefined,
              status: "SIMULATED",
              simulated: true,
              provider: "SIMULATED",
              attemptedAt: now,
              attemptCount: 1,
              errorDetails: waCap.reason || "API de WhatsApp desativada ou não configurada; entrega simulada.",
              idempotencyKey: params.idempotencyKey ? `wa-${params.idempotencyKey}` : undefined,
              metadataJson: JSON.stringify({
                title,
                message,
                eventType: params.eventType,
                vars: params.vars,
              }),
            },
          });
        } else {
          const waRes = await sendWhatsAppMessage(sys, {
            to: targetPhone,
            message: `*${title}*\n\n${message}`,
          });
          const doneAt = new Date();

          await prisma.notificationDelivery.create({
            data: {
              recipient: targetPhone,
              maskedRecipient: masked,
              channel: "WHATSAPP",
              templateType: resolvedTemplateType,
              messageType: params.eventType,
              subjectOrCategory: title,
              recipientReference: params.recipientId,
              relatedAppointmentId:
                params.relatedEntityType === "Appointment" ? params.relatedEntityId : undefined,
              status: waRes.ok ? "ACCEPTED" : "FAILED",
              simulated: false,
              provider: waRes.provider,
              providerMessageId: waRes.providerMessageId || undefined,
              attemptedAt: doneAt,
              acceptedAt: waRes.ok ? doneAt : undefined,
              failedAt: waRes.ok ? undefined : doneAt,
              attemptCount: 1,
              errorCode: waRes.ok ? null : waRes.errorCode || "WHATSAPP_SEND_FAILED",
              sanitizedErrorMessage: waRes.ok ? null : waRes.sanitizedErrorMessage || "Falha ao enviar WhatsApp.",
              errorDetails: waRes.ok ? null : waRes.sanitizedErrorMessage || "Falha ao enviar WhatsApp.",
              idempotencyKey: params.idempotencyKey ? `wa-${params.idempotencyKey}` : undefined,
              metadataJson: JSON.stringify({
                title,
                message,
                eventType: params.eventType,
                vars: params.vars,
              }),
            },
          });

          await persistHealthTelemetry(sys?.id, {
            whatsappHealthStatus: waRes.healthStatus,
            whatsappHealthMessage: waRes.ok ? null : waRes.sanitizedErrorMessage || null,
            whatsappLastCheckedAt: doneAt,
          });
        }
      } catch (e) {
        console.error("Falha ao processar entrega de whatsapp:", e);
      }

      // 5. SMS (TextBee) se ativo, paciente com smsOptIn === true e modo ALL_CHANNELS
      try {
        const smsCap = getSmsCapability(sys);
        const allowSmsForRecipient = params.recipientRole === "PATIENT" ? patientSmsOptIn : true;

        if (smsCap.enabled && allowSmsForRecipient && recipientPhone && !recipientPhone.includes("@")) {
          const maskedSms = maskRecipient(recipientPhone, "SMS");
          const smsRes = await sendSmsMessage(sys, {
            to: recipientPhone,
            message: `${title}: ${message}`,
          });
          const doneAt = new Date();

          await prisma.notificationDelivery.create({
            data: {
              recipient: recipientPhone,
              maskedRecipient: maskedSms,
              channel: "SMS",
              templateType: resolvedTemplateType,
              messageType: params.eventType,
              subjectOrCategory: title,
              recipientReference: params.recipientId,
              relatedAppointmentId:
                params.relatedEntityType === "Appointment" ? params.relatedEntityId : undefined,
              status: smsRes.ok ? "ACCEPTED" : "FAILED",
              simulated: false,
              provider: smsRes.provider,
              providerMessageId: smsRes.providerMessageId || undefined,
              attemptedAt: doneAt,
              acceptedAt: smsRes.ok ? doneAt : undefined,
              failedAt: smsRes.ok ? undefined : doneAt,
              attemptCount: 1,
              errorCode: smsRes.ok ? null : smsRes.errorCode || "SMS_SEND_FAILED",
              sanitizedErrorMessage: smsRes.ok ? null : smsRes.sanitizedErrorMessage || "Falha ao enviar SMS.",
              errorDetails: smsRes.ok ? null : smsRes.sanitizedErrorMessage || "Falha ao enviar SMS.",
              idempotencyKey: params.idempotencyKey ? `sms-${params.idempotencyKey}` : undefined,
              metadataJson: JSON.stringify({
                title,
                message,
                eventType: params.eventType,
              }),
            },
          });

          await persistHealthTelemetry(sys?.id, {
            smsHealthStatus: smsRes.healthStatus,
            smsHealthMessage: smsRes.ok ? null : smsRes.sanitizedErrorMessage || null,
            smsLastCheckedAt: doneAt,
          });
        }
      } catch (e) {
        console.error("Falha ao processar entrega de SMS:", e);
      }
    }

    return notification;
  } catch (error) {
    console.error("Falha ao disparar notificação unificada:", error);
    return null;
  }
}

function buildFallbackTextFromVariables(
  templateType: NotificationType,
  subject: string | undefined,
  variables: Record<string, string>
): string {
  const patientName = variables.patientName || "Paciente";
  const dt = variables.appointmentDateTime || "";
  if (variables.customBody) return variables.customBody;

  if (templateType === "REMINDER_24H") {
    return `Olá, ${patientName}! Lembrete: sua consulta no Consultório PSI está agendada para ${dt}.${
      variables.entryUrl ? ` Link da sessão: ${variables.entryUrl}` : ""
    }`;
  }
  if (templateType === "REMINDER_2H") {
    return `Olá, ${patientName}! Sua consulta no Consultório PSI começará em breve (${dt}).${
      variables.entryUrl ? ` Link da sessão: ${variables.entryUrl}` : ""
    }`;
  }
  return `${subject || "Comunicação Consultório PSI"}\n\nOlá, ${patientName}!${
    dt ? `\nReferência: ${dt}` : ""
  }`;
}

/**
 * Envios diretos por canal específico (e-mail, WhatsApp ou SMS) com validação real de provedores.
 */
export async function sendNotification({
  recipient,
  channel,
  templateType,
  subject,
  variables,
  idempotencyKey,
  relatedAppointmentId,
  customMessage,
  customHtml,
  patientId,
  patientSmsOptIn,
  enforceSmsOptIn = true,
  useTemplateIfConfigured = false,
  messageType,
}: {
  recipient: string;
  channel: NotificationChannel;
  templateType: NotificationType;
  subject?: string;
  variables: Record<string, string>;
  idempotencyKey?: string;
  relatedAppointmentId?: string;
  customMessage?: string;
  customHtml?: string;
  patientId?: string;
  patientSmsOptIn?: boolean;
  enforceSmsOptIn?: boolean;
  useTemplateIfConfigured?: boolean;
  messageType?: string;
}) {
  if (idempotencyKey) {
    const existing = await prisma.notificationDelivery.findUnique({
      where: { idempotencyKey },
    });
    if (existing) {
      return {
        alreadySent: true,
        skipped: false,
        success: existing.status === "ACCEPTED" || existing.status === "DELIVERED" || existing.status === "SIMULATED",
        deliveryId: existing.id,
        status: existing.status,
        simulated: existing.simulated,
      };
    }
  }

  const sys = await prisma.systemSettings.findFirst();
  const bodyText = customMessage || buildFallbackTextFromVariables(templateType, subject, variables);
  const title = subject || `Notificação ${templateType}`;
  const masked = maskRecipient(recipient, channel);
  const now = new Date();

  if (channel === "EMAIL") {
    const emailCap = getEmailCapability(sys);
    if (!emailCap.canSendRealEmails) {
      const record = await prisma.notificationDelivery.create({
        data: {
          recipient,
          maskedRecipient: masked,
          channel,
          templateType,
          messageType: messageType || templateType.toString(),
          subjectOrCategory: title,
          recipientReference: patientId,
          relatedAppointmentId,
          status: "SIMULATED",
          simulated: true,
          provider: "SIMULATED",
          attemptedAt: now,
          attemptCount: 1,
          errorDetails: emailCap.reason || "Canal de e-mail desativado ou não configurado.",
          idempotencyKey,
          metadataJson: JSON.stringify({ subject: title, message: bodyText, variables }),
        },
      });
      return {
        success: true,
        alreadySent: false,
        skipped: false,
        deliveryId: record.id,
        simulated: true,
        status: record.status,
      };
    }

    const emailRes = await sendEmailMessage(sys, {
      to: recipient,
      subject: title,
      text: bodyText,
      html: customHtml || buildCleanEmailHtml(title, bodyText),
    });
    const doneAt = new Date();

    const record = await prisma.notificationDelivery.create({
      data: {
        recipient,
        maskedRecipient: masked,
        channel,
        templateType,
        messageType: messageType || templateType.toString(),
        subjectOrCategory: title,
        recipientReference: patientId,
        relatedAppointmentId,
        status: emailRes.ok ? "ACCEPTED" : "FAILED",
        simulated: false,
        provider: emailRes.provider,
        providerMessageId: emailRes.providerMessageId || undefined,
        attemptedAt: doneAt,
        acceptedAt: emailRes.ok ? doneAt : undefined,
        failedAt: emailRes.ok ? undefined : doneAt,
        attemptCount: 1,
        errorCode: emailRes.ok ? null : emailRes.errorCode || "EMAIL_SEND_FAILED",
        sanitizedErrorMessage: emailRes.ok ? null : emailRes.sanitizedErrorMessage,
        errorDetails: emailRes.ok ? null : emailRes.sanitizedErrorMessage,
        idempotencyKey,
        metadataJson: JSON.stringify({ subject: title, message: bodyText, variables }),
      },
    });

    await persistHealthTelemetry(sys?.id, {
      emailHealthStatus: emailRes.healthStatus,
      emailHealthMessage: emailRes.ok ? null : emailRes.sanitizedErrorMessage || null,
      emailLastCheckedAt: doneAt,
    });

    return {
      success: emailRes.ok,
      alreadySent: false,
      skipped: false,
      deliveryId: record.id,
      simulated: false,
      status: record.status,
      providerMessageId: record.providerMessageId,
      error: emailRes.sanitizedErrorMessage,
    };
  }

  if (channel === "SMS") {
    // Valida consentimento explícito de SMS do paciente antes de qualquer envio transacional
    if (enforceSmsOptIn) {
      let optedIn = patientSmsOptIn === true;
      if (patientSmsOptIn === undefined && patientId) {
        const patient = await prisma.patient.findUnique({
          where: { id: patientId },
          select: { smsOptIn: true },
        });
        optedIn = Boolean(patient?.smsOptIn);
      }
      if (!optedIn) {
        return {
          success: false,
          alreadySent: false,
          skipped: true,
          reason: "PATIENT_SMS_OPT_OUT",
          deliveryId: null,
          simulated: false,
          status: "SKIPPED",
        };
      }
    }

    const smsCap = getSmsCapability(sys);
    if (!smsCap.enabled) {
      return {
        success: false,
        alreadySent: false,
        skipped: true,
        reason: "SMS_DISABLED",
        deliveryId: null,
        simulated: false,
        status: "SKIPPED",
      };
    }

    const smsRes = await sendSmsMessage(sys, {
      to: recipient,
      message: bodyText,
    });
    const doneAt = new Date();

    const record = await prisma.notificationDelivery.create({
      data: {
        recipient,
        maskedRecipient: masked,
        channel: "SMS",
        templateType,
        messageType: messageType || templateType.toString(),
        subjectOrCategory: title,
        recipientReference: patientId,
        relatedAppointmentId,
        status: smsRes.ok ? "ACCEPTED" : "FAILED",
        simulated: false,
        provider: smsRes.provider,
        providerMessageId: smsRes.providerMessageId || undefined,
        attemptedAt: doneAt,
        acceptedAt: smsRes.ok ? doneAt : undefined,
        failedAt: smsRes.ok ? undefined : doneAt,
        attemptCount: 1,
        errorCode: smsRes.ok ? null : smsRes.errorCode || "SMS_SEND_FAILED",
        sanitizedErrorMessage: smsRes.ok ? null : smsRes.sanitizedErrorMessage,
        errorDetails: smsRes.ok ? null : smsRes.sanitizedErrorMessage,
        idempotencyKey,
        metadataJson: JSON.stringify({ subject: title, message: bodyText, variables }),
      },
    });

    await persistHealthTelemetry(sys?.id, {
      smsHealthStatus: smsRes.healthStatus,
      smsHealthMessage: smsRes.ok ? null : smsRes.sanitizedErrorMessage || null,
      smsLastCheckedAt: doneAt,
    });

    return {
      success: smsRes.ok,
      alreadySent: false,
      skipped: false,
      deliveryId: record.id,
      simulated: false,
      status: record.status,
      providerMessageId: record.providerMessageId,
      error: smsRes.sanitizedErrorMessage,
    };
  }

  // Canal WHATSAPP
  const waCap = getWhatsAppCapability(sys);
  if (!waCap.canSendRealMessages) {
    const record = await prisma.notificationDelivery.create({
      data: {
        recipient,
        maskedRecipient: masked,
        channel: "WHATSAPP",
        templateType,
        messageType: messageType || templateType.toString(),
        subjectOrCategory: title,
        recipientReference: patientId,
        relatedAppointmentId,
        status: "SIMULATED",
        simulated: true,
        provider: "SIMULATED",
        attemptedAt: now,
        attemptCount: 1,
        errorDetails: waCap.reason || "API de WhatsApp desativada ou não configurada.",
        idempotencyKey,
        metadataJson: JSON.stringify({ subject: title, message: bodyText, variables }),
      },
    });
    return {
      success: true,
      alreadySent: false,
      skipped: false,
      deliveryId: record.id,
      simulated: true,
      status: record.status,
    };
  }

  const waRes = await sendWhatsAppMessage(sys, {
    to: recipient,
    message: bodyText,
    useTemplateIfConfigured,
  });
  const doneAt = new Date();

  const record = await prisma.notificationDelivery.create({
    data: {
      recipient,
      maskedRecipient: masked,
      channel: "WHATSAPP",
      templateType,
      messageType: messageType || templateType.toString(),
      subjectOrCategory: title,
      recipientReference: patientId,
      relatedAppointmentId,
      status: waRes.ok ? "ACCEPTED" : "FAILED",
      simulated: false,
      provider: waRes.provider,
      providerMessageId: waRes.providerMessageId || undefined,
      attemptedAt: doneAt,
      acceptedAt: waRes.ok ? doneAt : undefined,
      failedAt: waRes.ok ? undefined : doneAt,
      attemptCount: 1,
      errorCode: waRes.ok ? null : waRes.errorCode || "WHATSAPP_SEND_FAILED",
      sanitizedErrorMessage: waRes.ok ? null : waRes.sanitizedErrorMessage,
      errorDetails: waRes.ok ? null : waRes.sanitizedErrorMessage,
      idempotencyKey,
      metadataJson: JSON.stringify({ subject: title, message: bodyText, variables }),
    },
  });

  await persistHealthTelemetry(sys?.id, {
    whatsappHealthStatus: waRes.healthStatus,
    whatsappHealthMessage: waRes.ok ? null : waRes.sanitizedErrorMessage || null,
    whatsappLastCheckedAt: doneAt,
  });

  return {
    success: waRes.ok,
    alreadySent: false,
    skipped: false,
    deliveryId: record.id,
    simulated: false,
    status: record.status,
    providerMessageId: waRes.providerMessageId,
    error: waRes.sanitizedErrorMessage,
  };
}
