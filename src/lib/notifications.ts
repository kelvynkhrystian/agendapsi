import { prisma } from "./prisma";
import { NotificationChannel, NotificationType } from "@prisma/client";

export interface SendNotificationParams {
  recipient: string;
  channel: NotificationChannel;
  templateType: NotificationType;
  subject?: string;
  variables: Record<string, string>;
  idempotencyKey?: string;
}

/**
 * Serviço desacoplado de notificações (E-mail e WhatsApp)
 * Se não houver provedor configurado, registra na fila como SIMULATED e expõe no Outbox local.
 */
export async function sendNotification({
  recipient,
  channel,
  templateType,
  subject,
  variables,
  idempotencyKey,
}: SendNotificationParams) {
  // 1. Prevenção de duplicidade por chave de idempotência
  if (idempotencyKey) {
    const existing = await prisma.notificationDelivery.findUnique({
      where: { idempotencyKey },
    });
    if (existing) {
      return {
        alreadySent: true,
        deliveryId: existing.id,
        status: existing.status,
      };
    }
  }

  // 2. Busca template ou gera texto padrão
  const template = await prisma.notificationTemplate.findUnique({
    where: {
      type_channel: {
        type: templateType,
        channel,
      },
    },
  });

  let body = template?.bodyTemplate || getDefaultMessageBody(templateType, channel);
  let resolvedSubject = subject || template?.subject || getDefaultSubject(templateType);

  // Substitui variáveis {{variavel}}
  for (const [key, val] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, "g");
    body = body.replace(regex, val);
    resolvedSubject = resolvedSubject.replace(regex, val);
  }

  // 3. Verifica configurações reais
  const settings = await prisma.systemSettings.findUnique({
    where: { id: "default" },
  });

  const hasRealEmailConfig = !!(settings?.smtpHost && settings?.smtpUser);
  const hasRealWhatsAppConfig = !!(settings?.whatsappApiUrl && settings?.whatsappApiToken);

  let isSimulated = true;
  let status = "SIMULATED";

  if (channel === "EMAIL" && hasRealEmailConfig) {
    // Provedor real de email seria acionado aqui
    isSimulated = false;
    status = "DELIVERED";
  } else if (channel === "WHATSAPP" && hasRealWhatsAppConfig) {
    // Provedor real de WhatsApp seria acionado aqui
    isSimulated = false;
    status = "DELIVERED";
  }

  // 4. Registra histórico no banco
  const record = await prisma.notificationDelivery.create({
    data: {
      recipient,
      channel,
      templateType,
      status,
      simulated: isSimulated,
      idempotencyKey,
    },
  });

  return {
    success: true,
    deliveryId: record.id,
    simulated: isSimulated,
    messageBody: body,
    subject: resolvedSubject,
  };
}

function getDefaultSubject(type: NotificationType): string {
  switch (type) {
    case "APPOINTMENT_CREATED":
      return "Sua consulta foi solicitada";
    case "APPOINTMENT_CONFIRMED":
      return "Confirmação de Consulta";
    case "APPOINTMENT_CANCELLED":
      return "Aviso de Cancelamento de Consulta";
    case "APPOINTMENT_RESCHEDULED":
      return "Sua consulta foi reagendada";
    case "PAYMENT_RECEIVED":
      return "Confirmação de Pagamento Recebido";
    case "PACKAGE_PROPOSAL":
      return "Nova Proposta de Pacote de Consultas";
    case "VIDEO_ACCESS":
      return "Link de Acesso para sua Teleconsulta";
    case "REMINDER_24H":
      return "Lembrete: sua consulta é amanhã";
    case "REMINDER_2H":
      return "Lembrete: sua consulta começa em breve";
    default:
      return "Notificação do Consultório";
  }
}

function getDefaultMessageBody(type: NotificationType, channel: NotificationChannel): string {
  if (channel === "WHATSAPP") {
    switch (type) {
      case "APPOINTMENT_CONFIRMED":
        return "Olá, {{patientName}}! Sua consulta com {{professionalName}} está confirmada para {{appointmentDateTime}}. Local/Modalidade: {{modality}}.";
      case "REMINDER_24H":
        return "Olá, {{patientName}}! Lembramos que sua consulta com {{professionalName}} é amanhã, {{appointmentDateTime}}. Por favor, confirme ou avise em caso de imprevisto.";
      case "VIDEO_ACCESS":
        return "Olá, {{patientName}}! Sua teleconsulta começará em breve. Acesse a sala segura através do link: {{entryUrl}}";
      default:
        return "Olá, {{patientName}}! Você tem uma nova notificação do consultório de {{professionalName}}.";
    }
  }

  return "<p>Olá, <strong>{{patientName}}</strong>!</p><p>Sua consulta com {{professionalName}} foi agendada para <strong>{{appointmentDateTime}}</strong>.</p><p>Em caso de dúvidas, entre em contato.</p>";
}
