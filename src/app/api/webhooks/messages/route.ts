import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    // 1. Validação de autenticidade: se houver segredo de webhook configurado, valida token
    const expectedSecret = process.env.MESSAGE_WEBHOOK_SECRET;
    if (expectedSecret) {
      const providedSecret =
        req.headers.get("x-webhook-secret") ||
        req.headers.get("x-api-key") ||
        req.nextUrl.searchParams.get("secret");

      if (providedSecret !== expectedSecret) {
        return NextResponse.json({ error: "Assinatura ou token do webhook inválido." }, { status: 401 });
      }
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Payload JSON obrigatório." }, { status: 400 });
    }

    // Identifica o ID correlacionado (providerMessageId, deliveryId ou id)
    const correlationId =
      body.providerMessageId || body.messageId || body.deliveryId || body.id;

    if (!correlationId) {
      return NextResponse.json({ error: "ID de correlação da mensagem não informado." }, { status: 400 });
    }

    // Busca o registro de disparo
    const record = await prisma.notificationDelivery.findFirst({
      where: {
        OR: [{ providerMessageId: correlationId }, { id: correlationId }],
      },
    });

    if (!record) {
      // Retorna 200 para evitar que o provedor fique retentando eventos desconhecidos
      return NextResponse.json({ received: true, matched: false });
    }

    const eventStatus = (body.status || body.event || "").toUpperCase();
    const now = new Date();

    // Idempotência: se já estava como DELIVERED, ignora
    if (record.status === "DELIVERED" && (eventStatus === "DELIVERED" || eventStatus === "DELIVERY")) {
      return NextResponse.json({ received: true, alreadyDelivered: true });
    }

    if (
      eventStatus === "DELIVERED" ||
      eventStatus === "DELIVERY" ||
      eventStatus === "SENT_TO_INBOX" ||
      eventStatus === "READ"
    ) {
      await prisma.notificationDelivery.update({
        where: { id: record.id },
        data: {
          status: "DELIVERED",
          deliveredAt: now,
          errorDetails: null,
          sanitizedErrorMessage: null,
        },
      });
    } else if (
      eventStatus === "FAILED" ||
      eventStatus === "BOUNCED" ||
      eventStatus === "REJECTED" ||
      eventStatus === "ERROR"
    ) {
      await prisma.notificationDelivery.update({
        where: { id: record.id },
        data: {
          status: "FAILED",
          failedAt: now,
          errorCode: body.errorCode || "PROVIDER_DELIVERY_FAILURE",
          sanitizedErrorMessage: body.errorMessage || body.reason || "Falha na entrega reportada pelo provedor externo.",
        },
      });
    }

    return NextResponse.json({ success: true, updated: true, deliveryId: record.id });
  } catch (error) {
    console.error("Erro no processamento do webhook de mensageria:", error);
    return NextResponse.json({ error: "Erro interno no processamento do webhook." }, { status: 500 });
  }
}
