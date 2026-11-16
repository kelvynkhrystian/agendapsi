import { NextRequest, NextResponse } from "next/server";
import { processPaymentWebhook } from "@/lib/payments/webhook-handler";
import { PaymentProviderKey } from "@/lib/payments/types";

function normalizeProviderKey(raw: string): PaymentProviderKey | null {
  const clean = raw.toLowerCase().replace(/[-_]/g, "");
  if (clean === "mercadopago" || clean === "mp") return "MERCADO_PAGO";
  if (clean === "asaas") return "ASAAS";
  if (clean === "pagbank" || clean === "pagseguro") return "PAGBANK";
  if (clean === "inperson" || clean === "presencial") return "IN_PERSON";
  return null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params;
    const providerKey = normalizeProviderKey(provider);

    if (!providerKey) {
      return NextResponse.json({ error: `Provedor ${provider} desconhecido.` }, { status: 400 });
    }

    const rawBody = await req.text();
    const result = await processPaymentWebhook(providerKey, rawBody, req.headers);

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    console.error("Erro no processamento do webhook:", error);
    // Retorna 200/500 conforme tolerância do gateway
    return NextResponse.json(
      { success: false, message: "Erro interno no webhook.", error: String(error) },
      { status: 500 }
    );
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  return NextResponse.json({ status: "ok", provider, timestamp: new Date().toISOString() });
}
