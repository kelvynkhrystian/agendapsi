import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { NotificationChannel } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(5, parseInt(searchParams.get("pageSize") || "15", 10)));
    const channelParam = searchParams.get("channel") || "ALL";
    const statusParam = searchParams.get("status") || "ALL";
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const search = (searchParams.get("search") || "").trim();

    const where: any = {};

    // 1. Filtro por Canal
    if (channelParam === "EMAIL" || channelParam === "WHATSAPP" || channelParam === "SMS") {
      where.channel = channelParam as NotificationChannel;
    }

    // 2. Filtro por Status
    if (statusParam !== "ALL") {
      if (statusParam === "PENDING" || statusParam === "QUEUED") {
        where.status = { in: ["PENDING", "QUEUED", "PROCESSING"] };
      } else {
        where.status = statusParam;
      }
    }

    // 3. Filtro por Intervalo de Datas
    if (startDateParam || endDateParam) {
      where.sentAt = {};
      if (startDateParam) {
        const start = new Date(startDateParam);
        start.setHours(0, 0, 0, 0);
        where.sentAt.gte = start;
      }
      if (endDateParam) {
        const end = new Date(endDateParam);
        end.setHours(23, 59, 59, 999);
        where.sentAt.lte = end;
      }
    }

    // 4. Busca textual
    if (search) {
      where.OR = [
        { recipient: { contains: search } },
        { maskedRecipient: { contains: search } },
        { subjectOrCategory: { contains: search } },
        { messageType: { contains: search } },
        { errorDetails: { contains: search } },
        { sanitizedErrorMessage: { contains: search } },
      ];
    }

    // 5. Consulta paginada e contagem total
    const [logs, totalRecords] = await Promise.all([
      prisma.notificationDelivery.findMany({
        where,
        orderBy: { sentAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.notificationDelivery.count({ where }),
    ]);

    // 6. Estatísticas consolidadas dos últimos 7 dias para o resumo
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const [
      total7Days,
      accepted7Days,
      delivered7Days,
      failed7Days,
      pending7Days,
      simulated7Days,
    ] = await Promise.all([
      prisma.notificationDelivery.count({
        where: { sentAt: { gte: sevenDaysAgo } },
      }),
      prisma.notificationDelivery.count({
        where: { sentAt: { gte: sevenDaysAgo }, status: "ACCEPTED" },
      }),
      prisma.notificationDelivery.count({
        where: { sentAt: { gte: sevenDaysAgo }, status: "DELIVERED" },
      }),
      prisma.notificationDelivery.count({
        where: { sentAt: { gte: sevenDaysAgo }, status: "FAILED" },
      }),
      prisma.notificationDelivery.count({
        where: { sentAt: { gte: sevenDaysAgo }, status: { in: ["PENDING", "QUEUED", "PROCESSING"] } },
      }),
      prisma.notificationDelivery.count({
        where: { sentAt: { gte: sevenDaysAgo }, status: "SIMULATED" },
      }),
    ]);

    return NextResponse.json({
      success: true,
      logs: logs.map((log) => ({
        id: log.id,
        recipient: log.recipient,
        maskedRecipient: log.maskedRecipient || log.recipient,
        channel: log.channel,
        templateType: log.templateType,
        messageType: log.messageType || log.templateType,
        subjectOrCategory: log.subjectOrCategory || `Notificação ${log.templateType}`,
        status: log.status,
        simulated: log.simulated,
        provider: log.provider || (log.simulated ? "SIMULATED" : "SYSTEM"),
        attemptCount: log.attemptCount || 1,
        sentAt: log.sentAt,
        attemptedAt: log.attemptedAt || log.sentAt,
        acceptedAt: log.acceptedAt,
        deliveredAt: log.deliveredAt,
        failedAt: log.failedAt,
        errorCode: log.errorCode,
        errorDetails: log.sanitizedErrorMessage || log.errorDetails,
        relatedAppointmentId: log.relatedAppointmentId,
      })),
      pagination: {
        page,
        pageSize,
        totalRecords,
        totalPages: Math.ceil(totalRecords / pageSize) || 1,
      },
      summaryLast7Days: {
        totalAttempts: total7Days,
        accepted: accepted7Days,
        delivered: delivered7Days,
        failed: failed7Days,
        pending: pending7Days,
        simulated: simulated7Days,
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao listar logs de mensageria:", error);
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}
