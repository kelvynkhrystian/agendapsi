import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const createQuestionSchema = z.object({
  id: z.string().optional(),
  type: z.enum([
    "SHORT_TEXT",
    "LONG_TEXT",
    "SINGLE_CHOICE",
    "MULTIPLE_CHOICE",
    "DROPDOWN",
    "NUMBER",
    "DATE",
    "YES_NO",
    "INFO_SECTION",
  ]),
  label: z.string().min(1, "O enunciado da pergunta é obrigatório."),
  description: z.string().optional().nullable(),
  placeholder: z.string().optional().nullable(),
  isRequired: z.boolean().default(false),
  orderIndex: z.number().int().default(0),
  options: z.array(z.string()).optional().nullable(),
});

const createFormSchema = z.object({
  title: z.string().min(1, "O título do formulário é obrigatório."),
  description: z.string().optional().nullable(),
  instructions: z.string().optional().nullable(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  questions: z.array(createQuestionSchema).default([]),
});

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status")?.trim();

    const where: any = {};
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }
    if (status && ["DRAFT", "PUBLISHED", "ARCHIVED"].includes(status)) {
      where.status = status;
    }

    const forms = await prisma.formTemplate.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: {
            questions: true,
            assignments: true,
          },
        },
      },
    });

    const items = forms.map((f) => ({
      id: f.id,
      title: f.title,
      description: f.description,
      instructions: f.instructions,
      status: f.status,
      version: f.version,
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
      questionsCount: f._count.questions,
      assignmentsCount: f._count.assignments,
    }));

    return NextResponse.json({ forms: items });
  } catch (err: any) {
    if (err?.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao listar formulários:", err);
    return NextResponse.json({ error: "Erro interno ao buscar formulários." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const body = await req.json().catch(() => ({}));
    const parsed = createFormSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos.", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { title, description, instructions, status, questions } = parsed.data;

    const created = await prisma.formTemplate.create({
      data: {
        title,
        description: description || null,
        instructions: instructions || null,
        status,
        version: 1,
        questions: {
          create: questions.map((q, idx) => ({
            type: q.type,
            label: q.label,
            description: q.description || null,
            placeholder: q.placeholder || null,
            isRequired: q.isRequired,
            orderIndex: q.orderIndex ?? idx,
            options: q.options && q.options.length > 0 ? (q.options as any) : undefined,
          })),
        },
      },
      include: {
        questions: {
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    return NextResponse.json({ form: created }, { status: 201 });
  } catch (err: any) {
    if (err?.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao criar formulário:", err);
    return NextResponse.json({ error: "Erro interno ao criar formulário." }, { status: 500 });
  }
}
