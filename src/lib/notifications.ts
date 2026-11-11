import { prisma } from "./prisma";
import { NotificationChannel, NotificationType } from "@prisma/client";
import { formatBRL, formatDate, formatTime } from "./utils";

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
  if (recipient.includes("@")) {
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

/**
 * Disparador unificado de notificações com suporte a in-app, email e whatsapp
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

    // 3. E-mail se APP_EMAIL ou ALL_CHANNELS
    if (deliveryMode === "APP_EMAIL" || deliveryMode === "ALL_CHANNELS") {
      try {
        const sys = await prisma.systemSettings.findFirst();
        const emailConfigured = !!(sys?.smtpEnabled && sys?.smtpHost && sys?.smtpUser);

        // Busca e-mail real do paciente caso recipientId seja um ID
        let recipientEmail = params.recipientId;
        if (!recipientEmail.includes("@")) {
          const patient = await prisma.patient.findUnique({
            where: { id: params.recipientId },
            select: { email: true },
          });
          if (patient?.email) recipientEmail = patient.email;
        }

        const masked = maskRecipient(recipientEmail, "EMAIL");
        const status = emailConfigured ? "ACCEPTED" : "SIMULATED";
        const now = new Date();

        await prisma.notificationDelivery.create({
          data: {
            recipient: recipientEmail,
            maskedRecipient: masked,
            channel: "EMAIL",
            templateType: resolvedTemplateType,
            messageType: params.eventType,
            subjectOrCategory: title,
            recipientReference: params.recipientId,
            relatedAppointmentId:
              params.relatedEntityType === "Appointment" ? params.relatedEntityId : undefined,
            status,
            simulated: !emailConfigured,
            provider: emailConfigured ? "SMTP" : "SIMULATED",
            attemptedAt: now,
            acceptedAt: emailConfigured ? now : undefined,
            attemptCount: 1,
            errorDetails: emailConfigured
              ? null
              : "Servidor SMTP não configurado; entrega simulada no aplicativo.",
            idempotencyKey: params.idempotencyKey ? `email-${params.idempotencyKey}` : undefined,
            metadataJson: JSON.stringify({
              title,
              message,
              eventType: params.eventType,
              vars: params.vars,
            }),
          },
        });
      } catch (e) {
        console.error("Falha ao registrar entrega de email:", e);
      }
    }

    // 4. WhatsApp se ALL_CHANNELS
    if (deliveryMode === "ALL_CHANNELS") {
      try {
        const sys = await prisma.systemSettings.findFirst();
        const waConfigured = !!(sys?.whatsappEnabled && sys?.whatsappApiUrl);

        // Busca telefone real do paciente caso recipientId seja um ID
        let recipientPhone = params.recipientId;
        if (recipientPhone.includes("@") || recipientPhone.length < 8) {
          const patient = await prisma.patient.findUnique({
            where: { id: params.recipientId },
            select: { phone: true },
          });
          if (patient?.phone) recipientPhone = patient.phone;
        }

        const masked = maskRecipient(recipientPhone, "WHATSAPP");
        const status = waConfigured ? "ACCEPTED" : "SIMULATED";
        const now = new Date();

        await prisma.notificationDelivery.create({
          data: {
            recipient: recipientPhone,
            maskedRecipient: masked,
            channel: "WHATSAPP",
            templateType: resolvedTemplateType,
            messageType: params.eventType,
            subjectOrCategory: title,
            recipientReference: params.recipientId,
            relatedAppointmentId:
              params.relatedEntityType === "Appointment" ? params.relatedEntityId : undefined,
            status,
            simulated: !waConfigured,
            provider: waConfigured ? sys?.whatsappProvider || "WHATSAPP_API" : "SIMULATED",
            attemptedAt: now,
            acceptedAt: waConfigured ? now : undefined,
            attemptCount: 1,
            errorDetails: waConfigured
              ? null
              : "API de WhatsApp não configurada; entrega simulada no aplicativo.",
            idempotencyKey: params.idempotencyKey ? `wa-${params.idempotencyKey}` : undefined,
            metadataJson: JSON.stringify({
              title,
              message,
              eventType: params.eventType,
              vars: params.vars,
            }),
          },
        });
      } catch (e) {
        console.error("Falha ao registrar entrega de whatsapp:", e);
      }
    }

    return notification;
  } catch (error) {
    console.error("Falha ao disparar notificação unificada:", error);
    return null;
  }
}

/**
 * Compatibilidade legada com chamadas antigas de sendNotification
 */
export async function sendNotification({
  recipient,
  channel,
  templateType,
  subject,
  variables,
  idempotencyKey,
  relatedAppointmentId,
}: {
  recipient: string;
  channel: NotificationChannel;
  templateType: NotificationType;
  subject?: string;
  variables: Record<string, string>;
  idempotencyKey?: string;
  relatedAppointmentId?: string;
}) {
  if (idempotencyKey) {
    const existing = await prisma.notificationDelivery.findUnique({
      where: { idempotencyKey },
    });
    if (existing) {
      return { alreadySent: true, deliveryId: existing.id, status: existing.status };
    }
  }

  const sys = await prisma.systemSettings.findFirst();
  const isReal =
    channel === "EMAIL"
      ? !!(sys?.smtpEnabled && sys?.smtpHost && sys?.smtpUser)
      : !!(sys?.whatsappEnabled && sys?.whatsappApiUrl);

  const status = isReal ? "ACCEPTED" : "SIMULATED";
  const now = new Date();

  const record = await prisma.notificationDelivery.create({
    data: {
      recipient,
      maskedRecipient: maskRecipient(recipient, channel),
      channel,
      templateType,
      messageType: templateType.toString(),
      subjectOrCategory: subject || `Notificação ${templateType}`,
      relatedAppointmentId,
      status,
      simulated: !isReal,
      provider: isReal ? (channel === "EMAIL" ? "SMTP" : "WHATSAPP_API") : "SIMULATED",
      attemptedAt: now,
      acceptedAt: isReal ? now : undefined,
      attemptCount: 1,
      idempotencyKey,
      metadataJson: JSON.stringify({ subject, variables }),
    },
  });

  return {
    success: true,
    deliveryId: record.id,
    simulated: !isReal,
    status: record.status,
  };
}
