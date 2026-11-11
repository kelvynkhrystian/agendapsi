import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { FakePaymentProvider } from "@/lib/payment-provider";
import { dispatchNotification } from "@/lib/notifications";
import { isRestoreInProgress, RESTORE_MAINTENANCE_MESSAGE } from "@/lib/backup";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminSession = await requireAdmin();
    if (await isRestoreInProgress()) {
      return NextResponse.json({ error: RESTORE_MAINTENANCE_MESSAGE }, { status: 503 });
    }
    const { id } = await params;

    const payment = await FakePaymentProvider.confirmManualPayment(
      id,
      adminSession.userId
    );

    // Notificação ao paciente
    const patient = await prisma.patient.findUnique({ where: { id: payment.patientId } });
    if (patient) {
      await dispatchNotification({
        recipientId: patient.id,
        recipientRole: "PATIENT",
        eventType: "PAYMENT_APPROVED",
        targetUrl: "/paciente/financeiro",
        relatedEntityType: "Payment",
        relatedEntityId: payment.id,
        vars: {
          patientName: patient.fullName,
          valueCents: payment.amountCents,
        },
        idempotencyKey: `payment-approved-${payment.id}`,
      });
    }

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
