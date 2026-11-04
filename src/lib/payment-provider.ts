import { prisma } from "./prisma";
import { PaymentStatus, PaymentMethod } from "@prisma/client";

export interface ProcessPaymentInput {
  paymentId?: string;
  appointmentId?: string;
  packageId?: string;
  patientId: string;
  amountCents: number;
  method: PaymentMethod;
  idempotencyKey?: string;
  simulateStatus?: PaymentStatus; // default: APPROVED in simulator
}

export interface ProcessRefundInput {
  paymentId: string;
  amountCents?: number;
  reason?: string;
  refundedBy: string;
}

/**
 * FakePaymentProvider (V1)
 * Implementa máquina de estados completa para testes locais seguros,
 * com idempotência, histórico de tentativas e estornos.
 */
export class FakePaymentProvider {
  /**
   * Processa uma tentativa de pagamento no gateway simulado
   */
  static async processPayment({
    paymentId,
    appointmentId,
    packageId,
    patientId,
    amountCents,
    method,
    idempotencyKey,
    simulateStatus = "APPROVED",
  }: ProcessPaymentInput) {
    // 1. Idempotência: se a chave já existe, retorna o pagamento existente sem duplicar
    if (idempotencyKey) {
      const existing = await prisma.payment.findUnique({
        where: { idempotencyKey },
        include: { attempts: true },
      });
      if (existing) {
        return {
          idempotentReplay: true,
          payment: existing,
        };
      }
    }

    const isSimulated = method === "ONLINE_SIMULATED";
    const confirmedAt = simulateStatus === "APPROVED" ? new Date() : null;
    const confirmedBy = simulateStatus === "APPROVED" ? "SIMULATOR" : null;

    return prisma.$transaction(async (tx) => {
      let paymentRecord;

      if (paymentId) {
        paymentRecord = await tx.payment.update({
          where: { id: paymentId },
          data: {
            status: simulateStatus,
            method,
            isSimulated,
            confirmedAt,
            confirmedBy,
            idempotencyKey,
          },
        });
      } else {
        paymentRecord = await tx.payment.create({
          data: {
            appointmentId,
            packageId,
            patientId,
            amountCents,
            status: simulateStatus,
            method,
            isSimulated,
            confirmedAt,
            confirmedBy,
            idempotencyKey,
          },
        });
      }

      // Registra a tentativa de pagamento
      await tx.paymentAttempt.create({
        data: {
          paymentId: paymentRecord.id,
          amountCents,
          rawStatus: simulateStatus,
          rawResponse: JSON.stringify({
            gateway: "FakePaymentProvider_V1",
            simulateStatus,
            timestamp: new Date().toISOString(),
          }),
        },
      });

      // Se o pagamento for para agendamento e foi aprovado, garante status CONFIRMED
      if (appointmentId && simulateStatus === "APPROVED") {
        await tx.appointment.update({
          where: { id: appointmentId },
          data: { status: "CONFIRMED" },
        });
      }

      return {
        idempotentReplay: false,
        payment: paymentRecord,
      };
    });
  }

  /**
   * Executa estorno (refund) seguro
   */
  static async processRefund({
    paymentId,
    amountCents,
    reason,
    refundedBy,
  }: ProcessRefundInput) {
    return prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
      });

      if (!payment) {
        throw new Error("PAGAMENTO_NAO_ENCONTRADO");
      }

      if (payment.status !== "APPROVED") {
        throw new Error("APENAS_PAGAMENTOS_APROVADOS_PODEM_SER_ESTORNADOS");
      }

      const refundAmount = amountCents || payment.amountCents;

      // Cria registro de estorno
      const refund = await tx.refund.create({
        data: {
          paymentId,
          amountCents: refundAmount,
          reason: reason || "Estorno processado no simulador",
          refundedBy,
        },
      });

      // Atualiza status do pagamento para REFUNDED
      const updatedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: { status: "REFUNDED" },
      });

      return {
        refund,
        payment: updatedPayment,
      };
    });
  }

  /**
   * Confirmação manual de pagamento presencial ou por WhatsApp pelo Admin
   */
  static async confirmManualPayment(paymentId: string, adminUserId: string) {
    return prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
      });

      if (!payment) {
        throw new Error("PAGAMENTO_NAO_ENCONTRADO");
      }

      const updated = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: "APPROVED",
          isSimulated: false, // pagamento real recebido e confirmado em mãos pelo profissional
          confirmedAt: new Date(),
          confirmedBy: adminUserId,
        },
      });

      if (payment.appointmentId) {
        await tx.appointment.update({
          where: { id: payment.appointmentId },
          data: { status: "CONFIRMED" },
        });
      }

      return updated;
    });
  }
}
