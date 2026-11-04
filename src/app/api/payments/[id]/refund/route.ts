import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { FakePaymentProvider } from "@/lib/payment-provider";

const refundSchema = z.object({
  amountCents: z.number().int().min(1).optional(),
  reason: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminSession = await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const result = refundSchema.safeParse(body);

    const { amountCents, reason } = result.success ? result.data : {};

    const { refund, payment } = await FakePaymentProvider.processRefund({
      paymentId: id,
      amountCents,
      reason,
      refundedBy: adminSession.userId,
    });

    return NextResponse.json({
      success: true,
      message: "Estorno processado com sucesso.",
      refund,
      payment,
    });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro no estorno:", error);
    return NextResponse.json({ error: "Erro ao processar estorno." }, { status: 500 });
  }
}
