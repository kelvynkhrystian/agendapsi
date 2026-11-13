import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decryptSecret, sanitizeErrorMessage } from "@/lib/secrets";
import { verifyMetaWebhookSignature } from "@/lib/integrations-whatsapp";

function constantTimeEquals(a: string, b: string): boolean {
  const hashA = crypto.createHash("sha256").update(a, "utf8").digest();
  const hashB = crypto.createHash("sha256").update(b, "utf8").digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

/**
 * Verificação de desafio (hub.challenge) oficial do Webhook da Meta Cloud API
 */
export async function GET(req: NextRequest) {
  try {
    const mode = req.nextUrl.searchParams.get("hub.mode");
    const verifyToken = req.nextUrl.searchParams.get("hub.verify_token") || "";
    const challenge = req.nextUrl.searchParams.get("hub.challenge") || "";

    if (mode !== "subscribe" || !challenge) {
      return NextResponse.json({ error: "Parâmetros de verificação inválidos." }, { status: 400 });
    }

    const sys = await prisma.systemSettings.findFirst({
      select: { whatsappMetaVerifyToken: true },
    });

    const expectedToken =
      (sys?.whatsappMetaVerifyToken || "").trim() ||
      (process.env.META_WEBHOOK_VERIFY_TOKEN || "").trim();

    if (!expectedToken || !verifyToken || !constantTimeEquals(verifyToken, expectedToken)) {
      return NextResponse.json({ error: "Verify Token inválido." }, { status: 403 });
    }

    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    console.error("Erro ao validar challenge do webhook Meta:", error);
    return NextResponse.json({ error: "Erro interno ao validar webhook." }, { status: 500 });
  }
}

async function applyDeliveryStatusUpdate(params: {
  providerMessageId: string;
  rawStatus: string;
  errorCode?: string | null;
  errorMessage?: string | null;
}) {
  const record = await prisma.notificationDelivery.findFirst({
    where: {
      OR: [{ providerMessageId: params.providerMessageId }, { id: params.providerMessageId }],
    },
  });

  if (!record) return { matched: false, updated: false, deliveryId: null };

  const eventStatus = params.rawStatus.trim().toUpperCase();
  const now = new Date();

  if (
    record.status === "DELIVERED" &&
    (eventStatus === "DELIVERED" || eventStatus === "DELIVERY" || eventStatus === "READ" || eventStatus === "MESSAGE_DELIVERED")
  ) {
    return { matched: true, updated: false, alreadyDelivered: true, deliveryId: record.id };
  }

  if (eventStatus === "SENT" || eventStatus === "ACCEPTED") {
    if (record.status !== "DELIVERED") {
      await prisma.notificationDelivery.update({
        where: { id: record.id },
        data: {
          status: "ACCEPTED",
          acceptedAt: record.acceptedAt || now,
        },
      });
    }
    return { matched: true, updated: true, deliveryId: record.id };
  }

  if (
    eventStatus === "DELIVERED" ||
    eventStatus === "DELIVERY" ||
    eventStatus === "SENT_TO_INBOX" ||
    eventStatus === "READ" ||
    eventStatus === "MESSAGE_DELIVERED"
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
    return { matched: true, updated: true, deliveryId: record.id };
  }

  if (
    eventStatus === "FAILED" ||
    eventStatus === "BOUNCED" ||
    eventStatus === "REJECTED" ||
    eventStatus === "ERROR" ||
    eventStatus === "MESSAGE_FAILED"
  ) {
    const cleanErr = sanitizeErrorMessage(
      params.errorMessage || "Falha na entrega reportada pelo provedor externo."
    );
    await prisma.notificationDelivery.update({
      where: { id: record.id },
      data: {
        status: "FAILED",
        failedAt: now,
        errorCode: params.errorCode || "PROVIDER_DELIVERY_FAILURE",
        sanitizedErrorMessage: cleanErr,
        errorDetails: cleanErr,
      },
    });
    return { matched: true, updated: true, deliveryId: record.id };
  }

  return { matched: true, updated: false, deliveryId: record.id };
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text().catch(() => "");
    if (!rawBody) {
      return NextResponse.json({ error: "Payload JSON obrigatório." }, { status: 400 });
    }

    let body: Record<string, unknown> | null = null;
    try {
      body = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Payload JSON inválido." }, { status: 400 });
    }

    // 1. Webhook oficial Meta WhatsApp Cloud API (com validação HMAC SHA-256)
    if (body?.object === "whatsapp_business_account" && Array.isArray(body?.entry)) {
      const sys = await prisma.systemSettings.findFirst({
        select: { whatsappMetaAppSecret: true },
      });
      const appSecret = decryptSecret(sys?.whatsappMetaAppSecret);

      if (appSecret) {
        const sigHeader = req.headers.get("x-hub-signature-256");
        if (!verifyMetaWebhookSignature(rawBody, sigHeader, appSecret)) {
          return NextResponse.json({ error: "Assinatura HMAC SHA-256 da Meta inválida." }, { status: 401 });
        }
      } else {
        const expectedSecret = process.env.MESSAGE_WEBHOOK_SECRET;
        if (expectedSecret) {
          const provided =
            req.headers.get("x-webhook-secret") ||
            req.headers.get("x-api-key") ||
            req.nextUrl.searchParams.get("secret") ||
            "";
          if (!provided || !constantTimeEquals(provided, expectedSecret)) {
            return NextResponse.json({ error: "Token de webhook inválido." }, { status: 401 });
          }
        }
      }

      let processedStatuses = 0;
      for (const entryItem of body.entry as Array<Record<string, unknown>>) {
        const changes = Array.isArray(entryItem?.changes) ? entryItem.changes : [];
        for (const ch of changes as Array<Record<string, unknown>>) {
          const val = (ch?.value || null) as Record<string, unknown> | null;
          const statuses = Array.isArray(val?.statuses) ? val.statuses : [];
          for (const st of statuses as Array<Record<string, unknown>>) {
            const msgId = typeof st?.id === "string" ? st.id : "";
            const stStatus = typeof st?.status === "string" ? st.status : "";
            if (!msgId || !stStatus) continue;
            const firstErr = Array.isArray(st?.errors) && st.errors[0] && typeof st.errors[0] === "object"
              ? (st.errors[0] as Record<string, unknown>)
              : null;

            await applyDeliveryStatusUpdate({
              providerMessageId: msgId,
              rawStatus: stStatus,
              errorCode: firstErr?.code ? `META_${String(firstErr.code)}` : null,
              errorMessage:
                (typeof firstErr?.title === "string" && firstErr.title) ||
                (typeof firstErr?.message === "string" && firstErr.message) ||
                null,
            });
            processedStatuses++;
          }
        }
      }

      return NextResponse.json({ success: true, received: true, processedStatuses });
    }

    // 2. Webhooks de TextBee / OpenWA / Provedores Genéricos
    const expectedSecret = process.env.MESSAGE_WEBHOOK_SECRET;
    if (expectedSecret) {
      const providedSecret =
        req.headers.get("x-webhook-secret") ||
        req.headers.get("x-api-key") ||
        req.nextUrl.searchParams.get("secret") ||
        "";

      if (!providedSecret || !constantTimeEquals(providedSecret, expectedSecret)) {
        return NextResponse.json({ error: "Assinatura ou token do webhook inválido." }, { status: 401 });
      }
    }

    const nestedData =
      body?.data && typeof body.data === "object" ? (body.data as Record<string, unknown>) : null;

    const correlationId = String(
      body.providerMessageId ||
        body.messageId ||
        body.smsBatchId ||
        body.deliveryId ||
        body.id ||
        nestedData?.smsBatchId ||
        nestedData?.messageId ||
        nestedData?.id ||
        ""
    ).trim();

    if (!correlationId) {
      return NextResponse.json({ error: "ID de correlação da mensagem não informado." }, { status: 400 });
    }

    const rawEventStatus = String(
      body.status || body.event || nestedData?.status || ""
    );

    const outcome = await applyDeliveryStatusUpdate({
      providerMessageId: correlationId,
      rawStatus: rawEventStatus,
      errorCode: typeof body.errorCode === "string" ? body.errorCode : null,
      errorMessage:
        (typeof body.errorMessage === "string" && body.errorMessage) ||
        (typeof body.reason === "string" && body.reason) ||
        (typeof body.error === "string" && body.error) ||
        null,
    });

    if (!outcome.matched) {
      return NextResponse.json({ received: true, matched: false });
    }

    return NextResponse.json({
      success: true,
      updated: outcome.updated,
      alreadyDelivered: Boolean(outcome.alreadyDelivered),
      deliveryId: outcome.deliveryId,
    });
  } catch (error) {
    console.error("Erro no processamento do webhook de mensageria:", error);
    return NextResponse.json({ error: "Erro interno no processamento do webhook." }, { status: 500 });
  }
}
