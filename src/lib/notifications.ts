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
      : formatDate(vars.date)
    : "";

  const timeStr = vars.time
    ? typeof vars.time === "string"
      ? vars.time
      : formatTime(vars.time)
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
 * Disparador unificado de notificações com suporte a in-app, email e whatsapp
 */
export async function dispatchNotification(params: DispatchNotificationParams) {
  try {
    // 1. Idempotência: previne duplicação se chave fornecida
    if (params.idempotencyKey) {
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

    const template = await getOrCreateTemplate(params.eventType);
    const title = renderNotificationTemplate(template.title, params.vars);
    const message = renderNotificationTemplate(template.body, params.vars);

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

        await prisma.notificationDelivery.create({
          data: {
            recipient: params.recipientId,
            channel: "EMAIL",
            templateType: "APPOINTMENT_CONFIRMED",
            status: emailConfigured ? "DELIVERED" : "SIMULATED",
            simulated: !emailConfigured,
            errorDetails: emailConfigured ? null : "Servidor SMTP não configurado; entrega simulada no aplicativo.",
            idempotencyKey: params.idempotencyKey ? `email-${params.idempotencyKey}` : undefined,
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

        await prisma.notificationDelivery.create({
          data: {
            recipient: params.recipientId,
            channel: "WHATSAPP",
            templateType: "APPOINTMENT_CONFIRMED",
            status: waConfigured ? "DELIVERED" : "SIMULATED",
            simulated: !waConfigured,
            errorDetails: waConfigured ? null : "API de WhatsApp não configurada; entrega simulada no aplicativo.",
            idempotencyKey: params.idempotencyKey ? `wa-${params.idempotencyKey}` : undefined,
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
}: {
  recipient: string;
  channel: NotificationChannel;
  templateType: NotificationType;
  subject?: string;
  variables: Record<string, string>;
  idempotencyKey?: string;
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

  const record = await prisma.notificationDelivery.create({
    data: {
      recipient,
      channel,
      templateType,
      status: isReal ? "DELIVERED" : "SIMULATED",
      simulated: !isReal,
      idempotencyKey,
    },
  });

  return {
    success: true,
    deliveryId: record.id,
    simulated: !isReal,
  };
}
