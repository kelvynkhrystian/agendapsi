import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);

    const [
      todayAppointments,
      nextAppointments,
      activePatientsCount,
      pendingApprovalsCount,
      pendingPayments,
      approvedPayments,
      recentActivity,
      fileCount,
      totalFileBytes,
    ] = await Promise.all([
      // Consultas de hoje
      prisma.appointment.findMany({
        where: {
          startAt: { gte: todayStart, lte: todayEnd },
          status: { notIn: ["CANCELLED"] },
        },
        include: {
          patient: { select: { fullName: true, phone: true } },
          service: { select: { name: true, durationMinutes: true } },
        },
        orderBy: { startAt: "asc" },
      }),

      // Próximas consultas (a partir de agora)
      prisma.appointment.findMany({
        where: {
          startAt: { gte: now },
          status: { notIn: ["CANCELLED"] },
        },
        take: 5,
        include: {
          patient: { select: { fullName: true, phone: true } },
          service: { select: { name: true, durationMinutes: true } },
        },
        orderBy: { startAt: "asc" },
      }),

      // Pacientes ativos
      prisma.patient.count({
        where: { isActive: true },
      }),

      // Solicitações pendentes de alteração cadastral
      prisma.patientProfileChangeRequest.count({
        where: { status: "PENDING" },
      }),

      // Pagamentos pendentes
      prisma.payment.findMany({
        where: { status: "PENDING" },
        select: { amountCents: true, isSimulated: true },
      }),

      // Pagamentos aprovados no mês corrente
      prisma.payment.findMany({
        where: {
          status: "APPROVED",
          createdAt: { gte: monthStart },
        },
        select: { amountCents: true, isSimulated: true, method: true },
      }),

      // Histórico de atividades recentes
      prisma.auditLog.findMany({
        take: 8,
        orderBy: { createdAt: "desc" },
      }),

      // Estatísticas de armazenamento
      prisma.storedFile.count(),
      prisma.storedFile.aggregate({
        _sum: { sizeBytes: true },
      }),
    ]);

    // Separação rigorosa entre receita real e receita simulada
    let realRevenueMonthCents = 0;
    let simulatedRevenueMonthCents = 0;

    for (const p of approvedPayments) {
      if (p.isSimulated) {
        simulatedRevenueMonthCents += p.amountCents;
      } else {
        realRevenueMonthCents += p.amountCents;
      }
    }

    let pendingBalanceCents = 0;
    for (const p of pendingPayments) {
      pendingBalanceCents += p.amountCents;
    }

    return NextResponse.json({
      todayAppointments,
      nextAppointments,
      activePatientsCount,
      pendingApprovalsCount,
      pendingPaymentsCount: pendingPayments.length,
      pendingBalanceCents,
      revenueMonth: {
        realCents: realRevenueMonthCents,
        simulatedCents: simulatedRevenueMonthCents,
        totalCombinedCents: realRevenueMonthCents + simulatedRevenueMonthCents,
      },
      storage: {
        fileCount,
        totalBytes: totalFileBytes._sum.sizeBytes || 0,
      },
      recentActivity,
    });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao carregar estatísticas do dashboard:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
