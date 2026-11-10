import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { buildRevenueSeries, resolveSafeTz } from "@/lib/analytics-series";

const PT_MONTHS_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function toTzDateKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function toTzMonthKey(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value || "2026";
  const month = parts.find((p) => p.type === "month")?.value || "01";
  return `${year}-${month}`;
}

function shiftDateKey(dateKey: string, deltaDays: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + deltaDays, 12, 0, 0));
  return utc.toISOString().slice(0, 10);
}

function shiftMonthKey(monthKey: string, deltaMonths: number): { monthKey: string; label: string } {
  const [y, m] = monthKey.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1 + deltaMonths, 15, 12, 0, 0));
  const year = utc.getUTCFullYear();
  const monthIdx = utc.getUTCMonth();
  return {
    monthKey: `${year}-${String(monthIdx + 1).padStart(2, "0")}`,
    label: PT_MONTHS_SHORT[monthIdx] || String(monthIdx + 1),
  };
}

function formatDateKeyShort(dateKey: string): string {
  const [, m, d] = dateKey.split("-");
  return `${d}/${m}`;
}

export async function GET() {
  try {
    await requireAdmin();

    const now = new Date();
    const systemSettings = await prisma.systemSettings.findFirst({
      select: { timezone: true },
    });
    const tz = resolveSafeTz(systemSettings?.timezone);
    const todayKey = toTzDateKey(now, tz);
    const currentMonthKey = toTzMonthKey(now, tz);
    const prevMonthInfo = shiftMonthKey(currentMonthKey, -1);

    // Janela ampla (~36h antes e depois) para filtrar com precisão pelo dateKey do consultório
    const todayWindowStart = new Date(now.getTime() - 36 * 60 * 60 * 1000);
    const todayWindowEnd = new Date(now.getTime() + 36 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const sixMonthsAgo = new Date(now.getTime() - 190 * 24 * 60 * 60 * 1000);

    const [
      todayCandidates,
      nextAppointments,
      activePatientsCount,
      pendingApprovalsCount,
      pendingPayments,
      payments6Months,
      appointments6Months,
      patientsRecent,
      recentActivity,
      fileCount,
      totalFileBytes,
      recentNotifications,
      adminAccount,
    ] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          startAt: { gte: todayWindowStart, lte: todayWindowEnd },
          status: { notIn: ["CANCELLED"] },
        },
        include: {
          patient: { select: { fullName: true, phone: true } },
          service: { select: { name: true, durationMinutes: true } },
        },
        orderBy: { startAt: "asc" },
      }),

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

      prisma.patient.count({
        where: { isActive: true },
      }),

      prisma.patientProfileChangeRequest.count({
        where: { status: "PENDING" },
      }),

      prisma.payment.findMany({
        where: { status: "PENDING" },
        select: { amountCents: true, isSimulated: true, createdAt: true },
      }),

      prisma.payment.findMany({
        where: {
          createdAt: { gte: sixMonthsAgo },
        },
        select: {
          amountCents: true,
          status: true,
          isSimulated: true,
          method: true,
          packageId: true,
          createdAt: true,
          confirmedAt: true,
          appointment: { select: { modality: true } },
        },
      }),

      prisma.appointment.findMany({
        where: {
          startAt: { gte: sixMonthsAgo, lte: todayWindowEnd },
        },
        select: {
          startAt: true,
          status: true,
          modality: true,
          packageId: true,
          service: { select: { priceCents: true, isFree: true } },
        },
      }),

      prisma.patient.findMany({
        where: {
          isActive: true,
          createdAt: { gte: sixtyDaysAgo },
        },
        select: { createdAt: true },
      }),

      prisma.auditLog.findMany({
        take: 8,
        orderBy: { createdAt: "desc" },
      }),

      prisma.storedFile.count(),
      prisma.storedFile.aggregate({
        _sum: { sizeBytes: true },
      }),

      prisma.notificationDelivery.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { status: true },
      }),

      prisma.adminAccount.findFirst({
        select: { name: true },
      }),
    ]);

    const todayAppointments = todayCandidates.filter((a) => toTzDateKey(a.startAt, tz) === todayKey);

    let todayCompleted = 0;
    let todayOnline = 0;
    let todayPresential = 0;
    for (const a of todayAppointments) {
      if (a.status === "COMPLETED") todayCompleted++;
      if (a.modality === "ONLINE") todayOnline++;
      else todayPresential++;
    }

    let realRevenueMonthCents = 0;
    let simulatedRevenueMonthCents = 0;
    let prevMonthRealCents = 0;
    let monthPendingRealCents = 0;

    const dayKeys30: string[] = [];
    for (let i = 29; i >= 0; i--) {
      dayKeys30.push(shiftDateKey(todayKey, -i));
    }
    const dayBucketMap = new Map(
      dayKeys30.map((key) => [
        key,
        {
          dateKey: key,
          label: formatDateKeyShort(key),
          totalCents: 0,
          presentialCents: 0,
          onlineCents: 0,
          packageCents: 0,
          simulatedCents: 0,
          sessionsCount: 0,
          pendingCents: 0,
        },
      ])
    );

    const monthInfos6: Array<{ monthKey: string; label: string }> = [];
    for (let i = 5; i >= 0; i--) {
      monthInfos6.push(shiftMonthKey(currentMonthKey, -i));
    }
    const monthBucketMap = new Map(
      monthInfos6.map((m) => [
        m.monthKey,
        {
          monthKey: m.monthKey,
          label: m.label,
          totalCents: 0,
          presentialCents: 0,
          onlineCents: 0,
          packageCents: 0,
          simulatedCents: 0,
          sessionsCount: 0,
        },
      ])
    );

    for (const p of payments6Months) {
      const refDate = p.confirmedAt || p.createdAt;
      const pMonth = toTzMonthKey(refDate, tz);
      const pDate = toTzDateKey(refDate, tz);

      if (p.status === "APPROVED") {
        if (pMonth === currentMonthKey) {
          if (p.isSimulated) simulatedRevenueMonthCents += p.amountCents;
          else realRevenueMonthCents += p.amountCents;
        } else if (pMonth === prevMonthInfo.monthKey && !p.isSimulated) {
          prevMonthRealCents += p.amountCents;
        }

        const isPackage = Boolean(p.packageId);
        const modality = p.appointment?.modality;

        const dBucket = dayBucketMap.get(pDate);
        if (dBucket) {
          if (p.isSimulated) {
            dBucket.simulatedCents += p.amountCents;
          } else {
            dBucket.totalCents += p.amountCents;
            if (isPackage) dBucket.packageCents += p.amountCents;
            else if (modality === "ONLINE") dBucket.onlineCents += p.amountCents;
            else dBucket.presentialCents += p.amountCents;
          }
        }

        const mBucket = monthBucketMap.get(pMonth);
        if (mBucket) {
          if (p.isSimulated) {
            mBucket.simulatedCents += p.amountCents;
          } else {
            mBucket.totalCents += p.amountCents;
            if (isPackage) mBucket.packageCents += p.amountCents;
            else if (modality === "ONLINE") mBucket.onlineCents += p.amountCents;
            else mBucket.presentialCents += p.amountCents;
          }
        }
      } else if (p.status === "PENDING") {
        if (toTzMonthKey(p.createdAt, tz) === currentMonthKey && !p.isSimulated) {
          monthPendingRealCents += p.amountCents;
        }
        const pendDateKey = toTzDateKey(p.createdAt, tz);
        const dBucket = dayBucketMap.get(pendDateKey);
        if (dBucket) {
          dBucket.pendingCents += p.amountCents;
        }
      }
    }

    let monthAppointmentsTotal = 0;
    let monthCompletedCount = 0;
    let monthConfirmedCount = 0;
    let monthCancelledCount = 0;
    let monthExpectedServiceCents = 0;

    for (const appt of appointments6Months) {
      const aDateKey = toTzDateKey(appt.startAt, tz);
      const aMonthKey = toTzMonthKey(appt.startAt, tz);
      const isCancelled =
        appt.status === "CANCELLED" ||
        appt.status === "LATE_CANCELLED" ||
        appt.status === "NO_SHOW";

      if (aMonthKey === currentMonthKey) {
        if (isCancelled) {
          monthCancelledCount++;
        } else {
          monthAppointmentsTotal++;
          if (appt.status === "COMPLETED") monthCompletedCount++;
          if (appt.status === "CONFIRMED" || appt.status === "COMPLETED") monthConfirmedCount++;
          if (!appt.service?.isFree && appt.service?.priceCents) {
            monthExpectedServiceCents += appt.service.priceCents;
          }
        }
      }

      if (!isCancelled) {
        const dBucket = dayBucketMap.get(aDateKey);
        if (dBucket) dBucket.sessionsCount += 1;

        const mBucket = monthBucketMap.get(aMonthKey);
        if (mBucket) mBucket.sessionsCount += 1;
      }
    }

    let pendingBalanceCents = 0;
    for (const p of pendingPayments) {
      pendingBalanceCents += p.amountCents;
    }

    let patientsLast30 = 0;
    let patientsPrev30 = 0;
    const patients7dCounts = new Map(dayKeys30.slice(-7).map((k) => [k, 0]));
    for (const pt of patientsRecent) {
      if (pt.createdAt >= thirtyDaysAgo) patientsLast30++;
      else patientsPrev30++;

      const k = toTzDateKey(pt.createdAt, tz);
      if (patients7dCounts.has(k)) {
        patients7dCounts.set(k, (patients7dCounts.get(k) || 0) + 1);
      }
    }

    const last7Buckets = dayKeys30.slice(-7).map((k) => dayBucketMap.get(k)!);
    const sparklines = {
      revenue7d: last7Buckets.map((b) => b.totalCents),
      appointments7d: last7Buckets.map((b) => b.sessionsCount),
      patients7d: dayKeys30.slice(-7).map((k) => patients7dCounts.get(k) || 0),
      pending7d: last7Buckets.map((b) => b.pendingCents),
    };

    const revenueDeltaPct =
      prevMonthRealCents > 0
        ? Math.round(((realRevenueMonthCents - prevMonthRealCents) / prevMonthRealCents) * 100)
        : realRevenueMonthCents > 0
        ? 100
        : 0;

    const patientsDeltaPct =
      patientsPrev30 > 0
        ? Math.round(((patientsLast30 - patientsPrev30) / patientsPrev30) * 100)
        : patientsLast30 > 0
        ? 100
        : 0;

    const totalMonthBilledCents = realRevenueMonthCents + monthPendingRealCents;
    const collectionRatePct =
      totalMonthBilledCents > 0
        ? Math.min(100, Math.round((realRevenueMonthCents / totalMonthBilledCents) * 100))
        : realRevenueMonthCents > 0
        ? 100
        : 0;

    const monthlyGoalCents = Math.max(
      prevMonthRealCents > 0 ? Math.round(prevMonthRealCents * 1.15) : 0,
      monthExpectedServiceCents,
      totalMonthBilledCents
    );

    const monthCompletionPct =
      monthAppointmentsTotal > 0
        ? Math.round((monthCompletedCount / monthAppointmentsTotal) * 100)
        : 0;

    const revenueSeries = buildRevenueSeries({
      payments: payments6Months,
      appointments: appointments6Months,
      timezone: tz,
      referenceDate: now,
    });

    let msgDelivered = 0;
    let msgAccepted = 0;
    let msgFailed = 0;
    let msgSimulated = 0;
    let msgPending = 0;

    for (const n of recentNotifications) {
      if (n.status === "DELIVERED") {
        msgDelivered++;
      } else if (n.status === "ACCEPTED") {
        msgAccepted++;
      } else if (n.status === "FAILED") {
        msgFailed++;
      } else if (n.status === "SIMULATED") {
        msgSimulated++;
      } else if (n.status === "QUEUED" || n.status === "PROCESSING") {
        msgPending++;
      }
    }

    const messageDeliveryStats = {
      totalAttempts: recentNotifications.length,
      accepted: msgAccepted,
      delivered: msgDelivered,
      failed: msgFailed,
      pending: msgPending,
      simulated: msgSimulated,
      hasFailures: msgFailed > 0,
    };

    return NextResponse.json({
      timezone: systemSettings?.timezone || "America/Sao_Paulo",
      adminDisplayName: adminAccount?.name || "Profissional",
      todayAppointments,
      nextAppointments,
      activePatientsCount,
      pendingApprovalsCount,
      pendingPaymentsCount: pendingPayments.length,
      pendingBalanceCents,
      monthlyGoalCents,
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
      messageDeliveryStats,
      analytics: {
        monthlyGoalCents,
        revenueSeries,
        todaySummary: {
          total: todayAppointments.length,
          completed: todayCompleted,
          online: todayOnline,
          presential: todayPresential,
          completionRatePct:
            todayAppointments.length > 0
              ? Math.round((todayCompleted / todayAppointments.length) * 100)
              : 0,
        },
        monthSummary: {
          realCents: realRevenueMonthCents,
          prevMonthRealCents,
          simulatedCents: simulatedRevenueMonthCents,
          revenueDeltaPct,
          patientsDeltaPct,
          patientsLast30,
          monthAppointmentsTotal,
          monthCompletedCount,
          monthConfirmedCount,
          monthCancelledCount,
          monthCompletionPct,
          collectionRatePct,
        },
        sparklines,
        performanceSeries: {
          days30: Array.from(dayBucketMap.values()),
          months6: Array.from(monthBucketMap.values()),
        },
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao carregar estatísticas do dashboard:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
