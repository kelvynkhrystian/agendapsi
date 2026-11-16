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

const DAY_NAMES = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

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

    const { rules } = result.data;

    // 1. Validação de horário de início anterior ao término
    for (const rule of rules) {
      if (rule.startTime >= rule.endTime) {
        return NextResponse.json(
          {
            error: `Em ${DAY_NAMES[rule.dayOfWeek]}, o horário de início (${rule.startTime}) deve ser anterior ao de término (${rule.endTime}).`,
          },
          { status: 400 }
        );
      }
    }

    // 2. Validação de sobreposição de intervalos no mesmo dia
    const rulesByDay: Record<number, typeof rules> = {};
    for (const rule of rules) {
      if (!rulesByDay[rule.dayOfWeek]) rulesByDay[rule.dayOfWeek] = [];
      rulesByDay[rule.dayOfWeek].push(rule);
    }

    for (const [dayStr, dayRules] of Object.entries(rulesByDay)) {
      const day = Number(dayStr);
      const activeRules = dayRules
        .filter((r) => r.isActive)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));

      for (let i = 0; i < activeRules.length; i++) {
        for (let j = i + 1; j < activeRules.length; j++) {
          const r1 = activeRules[i];
          const r2 = activeRules[j];
          if (r1.startTime < r2.endTime && r1.endTime > r2.startTime) {
            return NextResponse.json(
              {
                error: `Conflito em ${DAY_NAMES[day]}: os intervalos ${r1.startTime}–${r1.endTime} e ${r2.startTime}–${r2.endTime} se sobrepõem.`,
              },
              { status: 400 }
            );
          }
        }
      }
    }

    // 3. Ordenação cronológica das regras por dia da semana e início
    const sortedRules = [...rules].sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
      return a.startTime.localeCompare(b.startTime);
    });

    // 4. Atualiza regras semanais em transação
    await prisma.$transaction(async (tx) => {
      await tx.weeklyAvailability.deleteMany({});
      for (const rule of sortedRules) {
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
