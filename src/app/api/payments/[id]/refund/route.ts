import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPaymentProvider, getDecryptedGatewayCredentials } from "@/lib/payments/registry";
import { PaymentProviderKey } from "@/lib/payments/types";
import { isRestoreInProgress, RESTORE_MAINTENANCE_MESSAGE } from "@/lib/backup";

const refundSchema = z.object({
  amountCents: z.number().int().min(1).optional(),
  reason: z.string().max(500).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminSession = await requireAdmin();
    if (await isRestoreInProgress()) {
      return NextResponse.json({ error: RESTORE_MAINTENANCE_MESSAGE }, { status: 503 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const result = refundSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Dados inválidos para estorno.", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { refunds: true, patient: true, appointment: true },
    });

    if (!payment) {
      return NextResponse.json({ error: "Pagamento não encontrado." }, { status: 404 });
    }

    if (payment.status !== "APPROVED") {
      return NextResponse.json(
        { error: "Apenas pagamentos aprovados podem ser estornados." },
        { status: 400 }
      );
    }

    const totalAlreadyRefunded = payment.refunds.reduce((acc, r) => acc + r.amountCents, 0);
    const availableToRefund = payment.amountCents - totalAlreadyRefunded;

    if (availableToRefund <= 0) {
      return NextResponse.json(
        { error: "Este pagamento já foi totalmente estornado." },
        { status: 400 }
      );
    }

    const amountCentsToRefund = result.data.amountCents || availableToRefund;

    if (amountCentsToRefund > availableToRefund) {
      return NextResponse.json(
        { error: `O valor solicitado excede o saldo disponível para estorno (${availableToRefund} centavos).` },
        { status: 400 }
      );
    }

    const providerKey = (payment.gatewayProvider || payment.method) as PaymentProviderKey;
    let gatewayRefundId: string | undefined = undefined;
    let gatewayStatus = "approved";

    // Se foi pago por um gateway online real, dispara o estorno na API do provedor
    if (providerKey === "MERCADO_PAGO" || providerKey === "ASAAS" || providerKey === "PAGBANK") {
      try {
        const gatewayData = await getDecryptedGatewayCredentials(providerKey);
        if (gatewayData) {
          const providerImpl = getPaymentProvider(providerKey);
          const refundRes = await providerImpl.processRefund(
            {
              paymentId: payment.id,
              gatewayPaymentId: payment.gatewayPaymentId || undefined,
              amountCents: amountCentsToRefund,
              reason: result.data.reason,
              adminUserId: adminSession.userId,
            },
            gatewayData.credentials,
            gatewayData.environment
          );

          if (!refundRes.success) {
            return NextResponse.json(
              { error: refundRes.error || "Falha na comunicação com o gateway para processar o estorno." },
              { status: 502 }
            );
          }

          gatewayRefundId = refundRes.gatewayRefundId;
          gatewayStatus = refundRes.gatewayStatus;
        }
      } catch (err: unknown) {
        console.error("Erro ao chamar API de estorno do gateway:", err);
        return NextResponse.json(
          { error: `Erro no provedor de pagamento: ${err instanceof Error ? err.message : String(err)}` },
          { status: 502 }
        );
      }
    }

    // Persistência atômica do estorno e atualização de status
    const isFullRefund = totalAlreadyRefunded + amountCentsToRefund >= payment.amountCents;

    const [refundRecord, updatedPayment] = await prisma.$transaction(async (tx) => {
      const refund = await tx.refund.create({
        data: {
          paymentId: payment.id,
          amountCents: amountCentsToRefund,
          reason: result.data.reason || "Estorno autorizado pelo administrador",
          gatewayRefundId,
          gatewayStatus,
          refundedBy: adminSession.userId,
        },
      });

      const updated = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: isFullRefund ? "REFUNDED" : "APPROVED",
        },
      });

      await tx.auditLog.create({
        data: {
          userId: adminSession.userId,
          userRole: adminSession.role,
          action: "PROCESS_REFUND",
          resource: "Payment",
          resourceId: payment.id,
          details: `Estorno de R$ ${(amountCentsToRefund / 100).toFixed(2)} processado via ${providerKey}. Motivo: ${result.data.reason || "Não informado"}`,
        },
      });

      return [refund, updated];
    });

    return NextResponse.json({
      success: true,
      message: "Estorno processado com sucesso.",
      refund: refundRecord,
      payment: updatedPayment,
    });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro no processamento do estorno:", error);
    return NextResponse.json({ error: "Erro interno ao processar estorno." }, { status: 500 });
  }
}
