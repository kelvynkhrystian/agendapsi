import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const updateTemplateSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  body: z.string().min(1, "Mensagem é obrigatória"),
  deliveryMode: z.enum(["APP_ONLY", "APP_EMAIL", "ALL_CHANNELS"]),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ eventType: string }> }
) {
  try {
    await requireAdmin();
    const { eventType } = await params;
    const body = await req.json();

    const result = updateTemplateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const updated = await prisma.sharedNotificationTemplate.upsert({
      where: { eventType },
      update: {
        title: result.data.title,
        body: result.data.body,
        deliveryMode: result.data.deliveryMode,
      },
      create: {
        eventType,
        title: result.data.title,
        body: result.data.body,
        deliveryMode: result.data.deliveryMode,
      },
    });

    return NextResponse.json({ success: true, template: updated });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao atualizar template:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
