import { NextRequest, NextResponse } from "next/server";
import { processPaymentWebhook } from "@/lib/payments/webhook-handler";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const result = await processPaymentWebhook("PAGBANK", rawBody, req.headers);
    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    console.error("Erro no webhook PagBank:", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok", provider: "PAGBANK" });
}
