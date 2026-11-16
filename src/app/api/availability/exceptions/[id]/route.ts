import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const exceptionUpdateSchema = z.object({
  date: z.string().min(10, "Data inicial é obrigatória").optional(),
  endDate: z.string().min(10, "Data final inválida").nullable().optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:mm").nullable().optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:mm").nullable().optional(),
  isBlocked: z.boolean().optional(),
  reason: z.string().nullable().optional(),
  isYearlyRecurring: z.boolean().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const result = exceptionUpdateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const existing = await prisma.availabilityException.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Bloqueio não encontrado." }, { status: 404 });
    }

    const { date, endDate, startTime, endTime, isBlocked, reason, isYearlyRecurring } = result.data;
    const dateObj = date
      ? new Date(date.length === 10 ? `${date}T00:00:00.000Z` : date)
      : existing.date;

    let endDateObj: Date | null = existing.endDate;
    if (endDate !== undefined) {
      endDateObj = endDate
        ? new Date(endDate.length === 10 ? `${endDate}T23:59:59.999Z` : endDate)
        : null;
    }

    if (endDateObj && endDateObj < dateObj) {
      return NextResponse.json(
        { error: "A data final deve ser posterior ou igual à data inicial." },
        { status: 400 }
      );
    }

    const resolvedStart = startTime !== undefined ? startTime : existing.startTime;
    const resolvedEnd = endTime !== undefined ? endTime : existing.endTime;

    if (resolvedStart && resolvedEnd && resolvedStart >= resolvedEnd) {
      return NextResponse.json(
        { error: "O horário inicial deve ser anterior ao horário final." },
        { status: 400 }
      );
    }

    const updated = await prisma.availabilityException.update({
      where: { id },
      data: {
        ...(date ? { date: dateObj } : {}),
        endDate: endDateObj,
        startTime: resolvedStart,
        endTime: resolvedEnd,
        ...(isBlocked !== undefined ? { isBlocked } : {}),
        ...(reason !== undefined ? { reason } : {}),
        ...(isYearlyRecurring !== undefined ? { isYearlyRecurring } : {}),
      },
    });

    const queryRangeEnd = endDateObj || new Date(dateObj.getTime() + 86400000 - 1);
    const affectedCount = await prisma.appointment.count({
      where: {
        status: { notIn: ["CANCELLED", "LATE_CANCELLED"] },
        startAt: {
          gte: dateObj,
          lte: queryRangeEnd,
        },
      },
    });

    const warning =
      affectedCount > 0
        ? `Atenção: existem ${affectedCount} agendamento(s) confirmado(s) neste período. Eles foram mantidos intactos, mas recomendamos verificar a agenda.`
        : null;

    return NextResponse.json({ ...updated, warning, affectedCount });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao atualizar exceção:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    await prisma.availabilityException.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Exceção removida com sucesso." });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao deletar exceção:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
