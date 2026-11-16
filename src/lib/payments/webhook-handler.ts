import { prisma } from "../prisma";
import { PaymentStatus } from "@prisma/client";
import { PaymentProviderKey, WebhookEventResult } from "./types";
import { getPaymentProvider, getDecryptedGatewayCredentials } from "./registry";
import { dispatchNotification } from "../notifications";

export async function processPaymentWebhook(
  providerKey: PaymentProviderKey,
  rawBody: string,
  headers: Headers | Record<string, string | string[] | undefined>
): Promise<{ success: boolean; duplicate?: boolean; message: string; details?: any }> {
  const provider = getPaymentProvider(providerKey);
  const gatewayData = await getDecryptedGatewayCredentials(providerKey);

  if (!gatewayData) {
    return { success: false, message: `Gateway ${providerKey} não encontrado no sistema.` };
  }

  // 1. Verificação e extração dos dados do webhook pelo provedor específico
  const eventResult: WebhookEventResult = await provider.verifyWebhook(
    rawBody,
    headers,
    gatewayData.credentials
  );

  if (!eventResult.handled) {
    return { success: true, message: eventResult.message || "Evento ignorado pelo provedor." };
  }

  const { eventId, eventType, gatewayPaymentId, paymentId, newStatus, rawPayload } = eventResult;

  // 2. Prevenção de duplicidade e Idempotência: verifica se o evento já foi processado
  const existingEvent = await prisma.paymentWebhookEvent.findUnique({
    where: {
      provider_eventId: {
        provider: providerKey,
        eventId,
      },
    },
  });

  if (existingEvent && existingEvent.processedStatus === "PROCESSED") {
    return {
      success: true,
      duplicate: true,
      message: `Webhook ${eventId} (${eventType}) já foi processado anteriormente.`,
    };
  }

  // 3. Localização da transação de pagamento no banco de dados do consultório
  // Procura por ID direto, gatewayPaymentId, ou externalReference
  let payment = null;

  if (paymentId) {
    payment = await prisma.payment.findFirst({
      where: {
        OR: [
          { id: paymentId },
          { externalReference: paymentId },
        ],
      },
      include: { appointment: { include: { service: true } }, patient: true, refunds: true },
    });
  }

  if (!payment && gatewayPaymentId) {
    payment = await prisma.payment.findFirst({
      where: {
        OR: [
          { gatewayPaymentId },
          { externalReference: gatewayPaymentId },
        ],
      },
      include: { appointment: { include: { service: true } }, patient: true, refunds: true },
    });
  }

  // Se a cobrança ainda não tem gatewayPaymentId associado, associa agora
  if (payment && gatewayPaymentId && !payment.gatewayPaymentId) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        gatewayPaymentId,
        gatewayProvider: providerKey,
      },
    });
  }

  // 4. Atualização de status e conciliação financeira
  let updatedPayment = payment;

  if (payment && newStatus) {
    const isNowApproved = newStatus === "APPROVED";
    const isNowRefunded = newStatus === "REFUNDED";

    // Transição atômica
    await prisma.$transaction(async (tx) => {
      // Atualiza pagamento
      updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: newStatus,
          gatewayStatus: eventType,
          isSimulated: false, // Pagamento processado via gateway real
          confirmedAt: isNowApproved ? payment.confirmedAt || new Date() : payment.confirmedAt,
          confirmedBy: isNowApproved
            ? payment.confirmedBy || `WEBHOOK_${providerKey}`
            : payment.confirmedBy,
        },
        include: { appointment: { include: { service: true } }, patient: true, refunds: true },
      });

      // Registra tentativa no log técnico
      await tx.paymentAttempt.create({
        data: {
          paymentId: payment.id,
          amountCents: payment.amountCents,
          rawStatus: eventType,
          rawResponse: typeof rawPayload === "string" ? rawPayload : JSON.stringify(rawPayload),
        },
      });

      // Se estornado, cria registro na tabela Refund se ainda não existir
      if (isNowRefunded && payment.refunds.length === 0) {
        await tx.refund.create({
          data: {
            paymentId: payment.id,
            amountCents: payment.amountCents,
            reason: `Estorno conciliado via webhook (${providerKey}: ${eventType})`,
            gatewayRefundId: eventId,
            gatewayStatus: "approved",
            refundedBy: `WEBHOOK_${providerKey}`,
          },
        });
      }

      // Se pagamento aprovado e vinculado a agendamento, confirma o agendamento
      if (isNowApproved && payment.appointmentId) {
        const currentApt = await tx.appointment.findUnique({
          where: { id: payment.appointmentId },
          include: { service: true },
        });

        if (currentApt && currentApt.status === "PENDING_CONFIRMATION") {
          await tx.appointment.update({
            where: { id: payment.appointmentId },
            data: { status: "CONFIRMED" },
          });
        }
      }
    });

    // 5. Notificação de pagamento recebido para o paciente se aprovado
    if (isNowApproved && payment.patient && payment.appointment) {
      dispatchNotification({
        recipientId: payment.patient.id,
        recipientRole: "PATIENT",
        eventType: "PAYMENT_APPROVED",
        relatedEntityType: "APPOINTMENT",
        relatedEntityId: payment.appointment.id,
        targetUrl: "/paciente",
        vars: {
          patientName: payment.patient.fullName,
          valueCents: payment.amountCents,
          date: payment.appointment.startAt,
        },
        idempotencyKey: `pay-approved-${payment.id}`,
      }).catch((e) => console.warn("[Webhook] Falha ao enviar notificação de pagamento:", e));
    }
  }

  // 6. Persistência do evento de webhook para garantir idempotência futura
  await prisma.paymentWebhookEvent.upsert({
    where: {
      provider_eventId: {
        provider: providerKey,
        eventId,
      },
    },
    create: {
      provider: providerKey,
      eventId,
      eventType,
      paymentId: payment?.id || null,
      payloadJson: typeof rawPayload === "string" ? rawPayload : JSON.stringify(rawPayload),
      processedStatus: "PROCESSED",
      receivedAt: new Date(),
    },
    update: {
      eventType,
      paymentId: payment?.id || null,
      processedStatus: "PROCESSED",
    },
  });

  // 7. Atualiza timestamp de último webhook recebido no GatewayConfiguration
  await prisma.gatewayConfiguration.update({
    where: { providerKey },
    data: {
      lastWebhookReceivedAt: new Date(),
      healthStatus: "CONNECTED",
    },
  });

  // 8. Registro de auditoria
  await prisma.auditLog.create({
    data: {
      userRole: "SYSTEM",
      action: "PAYMENT_WEBHOOK_PROCESSED",
      resource: "Payment",
      resourceId: payment?.id || null,
      details: `Webhook do provedor ${providerKey} processado. Evento: ${eventType}. Novo status: ${newStatus || "inalterado"}`,
    },
  });

  return {
    success: true,
    message: `Webhook ${eventId} do ${providerKey} processado com sucesso.`,
    details: { paymentId: payment?.id, status: newStatus },
  };
}
