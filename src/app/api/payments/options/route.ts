import { NextResponse } from "next/server";
import { getActivePaymentOptions } from "@/lib/payments/registry";

export async function GET() {
  try {
    const options = await getActivePaymentOptions();
    return NextResponse.json({
      success: true,
      options,
    });
  } catch (error: unknown) {
    console.error("Erro ao listar opções de pagamento ativas:", error);
    return NextResponse.json({ success: false, options: [] }, { status: 500 });
  }
}
