import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const exceptionSchema = z.object({
  date: z.string().min(10, "Data é obrigatória"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:mm").nullable().optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:mm").nullable().optional(),
  isBlocked: z.boolean().default(true),
  reason: z.string().optional(),
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

    const { date, startTime, endTime, isBlocked, reason } = result.data;
    const dateObj = new Date(date);

    const created = await prisma.availabilityException.create({
      data: {
        date: dateObj,
        startTime: startTime || null,
        endTime: endTime || null,
        isBlocked,
        reason,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao cadastrar exceção:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
