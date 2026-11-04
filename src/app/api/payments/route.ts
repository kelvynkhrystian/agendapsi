import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(req.url);

    const status = searchParams.get("status");
    const method = searchParams.get("method");
    const patientId = searchParams.get("patientId");

    const where: Record<string, unknown> = {};

    if (session.role === "PATIENT") {
      where.patientId = session.userId;
    } else if (patientId) {
      where.patientId = patientId;
    }

    if (status) where.status = status;
    if (method) where.method = method;

    const payments = await prisma.payment.findMany({
      where,
      include: {
        patient: { select: { fullName: true, email: true, phone: true } },
        appointment: {
          select: {
            startAt: true,
            service: { select: { name: true } },
          },
        },
        package: { select: { title: true } },
        refunds: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Calcula agregados com distinção rigorosa de real vs simulado
    let totalRealApprovedCents = 0;
    let totalSimulatedApprovedCents = 0;
    let totalPendingCents = 0;

    for (const p of payments) {
      if (p.status === "APPROVED") {
        if (p.isSimulated) {
          totalSimulatedApprovedCents += p.amountCents;
        } else {
          totalRealApprovedCents += p.amountCents;
        }
      } else if (p.status === "PENDING") {
        totalPendingCents += p.amountCents;
      }
    }

    return NextResponse.json({
      payments,
      totals: {
        realApprovedCents: totalRealApprovedCents,
        simulatedApprovedCents: totalSimulatedApprovedCents,
        pendingCents: totalPendingCents,
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }
    console.error("Erro ao listar pagamentos:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
