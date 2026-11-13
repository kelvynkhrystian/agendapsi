import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const source = await prisma.formTemplate.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!source) {
      return NextResponse.json({ error: "Formulário de origem não encontrado." }, { status: 404 });
    }

    const duplicated = await prisma.formTemplate.create({
      data: {
        title: `Cópia de ${source.title}`.slice(0, 190),
        description: source.description,
        instructions: source.instructions,
        status: "DRAFT",
        version: 1,
        questions: {
          create: source.questions.map((q) => ({
            type: q.type,
            label: q.label,
            description: q.description,
            placeholder: q.placeholder,
            isRequired: q.isRequired,
            orderIndex: q.orderIndex,
            options: q.options as any,
          })),
        },
      },
      include: {
        questions: true,
      },
    });

    return NextResponse.json({ form: duplicated }, { status: 201 });
  } catch (err: any) {
    if (err?.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao duplicar formulário:", err);
    return NextResponse.json({ error: "Erro interno ao duplicar formulário." }, { status: 500 });
  }
}
