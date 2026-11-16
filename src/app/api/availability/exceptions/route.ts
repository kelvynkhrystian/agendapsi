import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const exceptionSchema = z.object({
  date: z.string().min(10, "Data inicial é obrigatória"),
  endDate: z.string().min(10, "Data final inválida").nullable().optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:mm").nullable().optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:mm").nullable().optional(),
  isBlocked: z.boolean().default(true),
  reason: z.string().optional().nullable(),
  isYearlyRecurring: z.boolean().default(false),
});

export async function GET() {
  try {
    const exceptions = await prisma.availabilityException.findMany({
      orderBy: { date: "asc" },
    });
    return NextResponse.json(exceptions);
  } catch (error) {
    console.error("Erro ao buscar exceções:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const result = exceptionSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { date, endDate, startTime, endTime, isBlocked, reason, isYearlyRecurring } = result.data;
    const dateObj = new Date(date.length === 10 ? `${date}T00:00:00.000Z` : date);
    let endDateObj: Date | null = null;
    if (endDate) {
      endDateObj = new Date(endDate.length === 10 ? `${endDate}T23:59:59.999Z` : endDate);
      if (endDateObj < dateObj) {
        return NextResponse.json(
          { error: "A data final deve ser posterior ou igual à data inicial." },
          { status: 400 }
        );
      }
    }

    // Se houver horário de início e fim, valida coerência
    if (startTime && endTime && startTime >= endTime) {
      return NextResponse.json(
        { error: "O horário inicial deve ser anterior ao horário final." },
        { status: 400 }
      );
    }

    const created = await prisma.availabilityException.create({
      data: {
        date: dateObj,
        endDate: endDateObj,
        startTime: startTime || null,
        endTime: endTime || null,
        isBlocked,
        reason: reason || null,
        isYearlyRecurring: isYearlyRecurring || false,
      },
    });

    // Verifica se existem agendamentos ativos no período bloqueado
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

    return NextResponse.json({ ...created, warning, affectedCount }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao cadastrar exceção:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
