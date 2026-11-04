import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { DEFAULT_NOTIFICATION_TEMPLATES } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json().catch(() => ({}));
    const eventType = body?.eventType;

    if (eventType) {
      const def = DEFAULT_NOTIFICATION_TEMPLATES.find((t) => t.eventType === eventType);
      if (!def) {
        return NextResponse.json({ error: "Template padrão não encontrado." }, { status: 404 });
      }

      const restored = await prisma.sharedNotificationTemplate.upsert({
        where: { eventType },
        update: {
          title: def.title,
          body: def.body,
          deliveryMode: def.deliveryMode,
        },
        create: {
          eventType: def.eventType,
          title: def.title,
          body: def.body,
          deliveryMode: def.deliveryMode,
        },
      });

      return NextResponse.json({ success: true, template: restored });
    }

    // Se nenhum eventType especificado, restaura todos
    for (const def of DEFAULT_NOTIFICATION_TEMPLATES) {
      await prisma.sharedNotificationTemplate.upsert({
        where: { eventType: def.eventType },
        update: {
          title: def.title,
          body: def.body,
          deliveryMode: def.deliveryMode,
        },
        create: {
          eventType: def.eventType,
          title: def.title,
          body: def.body,
          deliveryMode: def.deliveryMode,
        },
      });
    }

    return NextResponse.json({ success: true, message: "Todos os templates foram restaurados para o padrão." });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao restaurar template padrão:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
