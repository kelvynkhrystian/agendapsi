import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const weeklyRuleSchema = z.object({
  rules: z.array(
    z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      startTime: z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:mm"),
      endTime: z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:mm"),
      isActive: z.boolean(),
    })
  ),
});

export async function GET() {
  try {
    const rules = await prisma.weeklyAvailability.findMany({
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });
    return NextResponse.json(rules);
  } catch (error) {
    console.error("Erro ao buscar horários semanais:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const result = weeklyRuleSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Atualiza regras semanais em transação
    await prisma.$transaction(async (tx) => {
      await tx.weeklyAvailability.deleteMany({});
      for (const rule of result.data.rules) {
        await tx.weeklyAvailability.create({
          data: rule,
        });
      }
    });

    const updated = await prisma.weeklyAvailability.findMany({
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao salvar disponibilidade:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
