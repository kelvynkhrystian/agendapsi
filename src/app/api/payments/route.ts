import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { buildRevenueSeries, resolveSafeTz } from "@/lib/analytics-series";

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

    const [payments, systemSettings] = await Promise.all([
      prisma.payment.findMany({
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
      }),
      prisma.systemSettings.findFirst({ select: { timezone: true } }),
    ]);

    const tz = resolveSafeTz(systemSettings?.timezone);
    const now = new Date();

    // Calcula agregados com distinção rigorosa de real vs simulado
    let totalRealApprovedCents = 0;
    let totalSimulatedApprovedCents = 0;
    let totalPendingCents = 0;
    let totalRefundedCents = 0;
    let rejectedCancelledCents = 0;
    let approvedCount = 0;
    let pendingCount = 0;
    let refundedCount = 0;

    const methodCounters = {
      IN_PERSON: {
        method: "IN_PERSON",
        label: "Presencial",
        totalCents: 0,
        realApprovedCents: 0,
        simulatedApprovedCents: 0,
        pendingCents: 0,
        count: 0,
      },
      WHATSAPP_ARRANGED: {
        method: "WHATSAPP_ARRANGED",
        label: "Combinado WhatsApp",
        totalCents: 0,
        realApprovedCents: 0,
        simulatedApprovedCents: 0,
        pendingCents: 0,
        count: 0,
      },
      ONLINE_SIMULATED: {
        method: "ONLINE_SIMULATED",
        label: "Online Simulado",
        totalCents: 0,
        realApprovedCents: 0,
        simulatedApprovedCents: 0,
        pendingCents: 0,
        count: 0,
      },
    };

    const statusCounters = {
      APPROVED: { status: "APPROVED", label: "Confirmados", totalCents: 0, count: 0 },
      PENDING: { status: "PENDING", label: "Pendentes", totalCents: 0, count: 0 },
      REFUNDED: { status: "REFUNDED", label: "Estornados", totalCents: 0, count: 0 },
      OTHER: { status: "OTHER", label: "Cancelados / Rejeitados", totalCents: 0, count: 0 },
    };

    for (const p of payments) {
      const mc =
        p.method in methodCounters
          ? methodCounters[p.method as keyof typeof methodCounters]
          : null;
      if (mc) {
        mc.count += 1;
      }

      if (p.status === "APPROVED") {
        approvedCount++;
        statusCounters.APPROVED.count++;
        statusCounters.APPROVED.totalCents += p.amountCents;

        if (p.isSimulated) {
          totalSimulatedApprovedCents += p.amountCents;
          if (mc) {
            mc.simulatedApprovedCents += p.amountCents;
            mc.totalCents += p.amountCents;
          }
        } else {
          totalRealApprovedCents += p.amountCents;
          if (mc) {
            mc.realApprovedCents += p.amountCents;
            mc.totalCents += p.amountCents;
          }
        }
      } else if (p.status === "PENDING") {
        pendingCount++;
        totalPendingCents += p.amountCents;
        statusCounters.PENDING.count++;
        statusCounters.PENDING.totalCents += p.amountCents;

        if (mc) {
          mc.pendingCents += p.amountCents;
          mc.totalCents += p.amountCents;
        }
      } else if (p.status === "REFUNDED") {
        refundedCount++;
        const refundSum =
          p.refunds.length > 0
            ? p.refunds.reduce((acc, r) => acc + r.amountCents, 0)
            : p.amountCents;
        totalRefundedCents += refundSum;
        statusCounters.REFUNDED.count++;
        statusCounters.REFUNDED.totalCents += refundSum;
      } else {
        rejectedCancelledCents += p.amountCents;
        statusCounters.OTHER.count++;
        statusCounters.OTHER.totalCents += p.amountCents;
      }
    }

    const totalCount = payments.length;
    const approvalRate =
      totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;

    const series = buildRevenueSeries({
      payments,
      timezone: tz,
      referenceDate: now,
    });

    return NextResponse.json({
      timezone: tz,
      payments,
      totals: {
        realApprovedCents: totalRealApprovedCents,
        simulatedApprovedCents: totalSimulatedApprovedCents,
        pendingCents: totalPendingCents,
      },
      analytics: {
        refundedCents: totalRefundedCents,
        rejectedCancelledCents,
        totalCount,
        approvedCount,
        pendingCount,
        refundedCount,
        approvalRate,
        byMethod: Object.values(methodCounters),
        byStatus: Object.values(statusCounters),
        series,
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
