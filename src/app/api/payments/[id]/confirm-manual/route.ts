import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { FakePaymentProvider } from "@/lib/payment-provider";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminSession = await requireAdmin();
    const { id } = await params;

    const payment = await FakePaymentProvider.confirmManualPayment(
      id,
      adminSession.userId
    );

    return NextResponse.json({
      success: true,
      message: "Pagamento confirmado manualmente com sucesso.",
      payment,
    });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro na confirmação manual:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
