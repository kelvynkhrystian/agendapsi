import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const updateQuestionSchema = z.object({
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

const updateFormSchema = z.object({
  title: z.string().min(1, "O título do formulário é obrigatório."),
  description: z.string().optional().nullable(),
  instructions: z.string().optional().nullable(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  questions: z.array(updateQuestionSchema),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const form = await prisma.formTemplate.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { orderIndex: "asc" },
        },
        _count: {
          select: { assignments: true },
        },
      },
    });

    if (!form) {
      return NextResponse.json({ error: "Formulário não encontrado." }, { status: 404 });
    }

    return NextResponse.json({
      form: {
        id: form.id,
        title: form.title,
        description: form.description,
        instructions: form.instructions,
        status: form.status,
        version: form.version,
        createdAt: form.createdAt.toISOString(),
        updatedAt: form.updatedAt.toISOString(),
        assignmentsCount: form._count.assignments,
        questions: form.questions.map((q) => ({
          id: q.id,
          type: q.type,
          label: q.label,
          description: q.description,
          placeholder: q.placeholder,
          isRequired: q.isRequired,
          orderIndex: q.orderIndex,
          options: (q.options as string[]) || [],
        })),
      },
    });
  } catch (err: any) {
    if (err?.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao obter formulário:", err);
    return NextResponse.json({ error: "Erro interno ao buscar formulário." }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const body = await req.json().catch(() => ({}));
    const parsed = updateFormSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos.", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const existing = await prisma.formTemplate.findUnique({
      where: { id },
      include: { _count: { select: { assignments: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: "Formulário não encontrado." }, { status: 404 });
    }

    const { title, description, instructions, status, questions } = parsed.data;

    // Se já havia atribuições associadas, incrementa a versão do modelo para histórico seguro
    const nextVersion = existing._count.assignments > 0 ? existing.version + 1 : existing.version;

    // Executa em transação atômica
    const updated = await prisma.$transaction(async (tx) => {
      // 1. Remove perguntas antigas do modelo
      await tx.formQuestion.deleteMany({
        where: { templateId: id },
      });

      // 2. Atualiza os dados do modelo e insere o novo conjunto ordenado de perguntas
      return await tx.formTemplate.update({
        where: { id },
        data: {
          title,
          description: description || null,
          instructions: instructions || null,
          status,
          version: nextVersion,
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
    });

    return NextResponse.json({ form: updated });
  } catch (err: any) {
    if (err?.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao atualizar formulário:", err);
    return NextResponse.json({ error: "Erro interno ao atualizar formulário." }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const existing = await prisma.formTemplate.findUnique({
      where: { id },
      include: {
        _count: { select: { assignments: true } },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Formulário não encontrado." }, { status: 404 });
    }

    // Se possui atribuições a pacientes, não permite exclusão física destrutiva para preservar dados clínicos
    if (existing._count.assignments > 0) {
      // Arquiva o formulário com segurança
      await prisma.formTemplate.update({
        where: { id },
        data: { status: "ARCHIVED" },
      });
      return NextResponse.json({
        archived: true,
        message: "O formulário possui respostas ou atribuições de pacientes e foi arquivado com segurança.",
      });
    }

    // Se não possui nenhum vínculo com pacientes, exclui permanentemente
    await prisma.formTemplate.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Formulário excluído com sucesso." });
  } catch (err: any) {
    if (err?.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao excluir formulário:", err);
    return NextResponse.json({ error: "Erro interno ao excluir formulário." }, { status: 500 });
  }
}
