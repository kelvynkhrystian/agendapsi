import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { DEFAULT_NOTIFICATION_TEMPLATES } from "@/lib/notifications";

export async function GET() {
  try {
    await requireAdmin();

    // Garante que todos os templates padrão existam no banco
    const existing = await prisma.sharedNotificationTemplate.findMany();
    const existingMap = new Map(existing.map((t) => [t.eventType, t]));

    const templates = [];

    for (const def of DEFAULT_NOTIFICATION_TEMPLATES) {
      if (existingMap.has(def.eventType)) {
        templates.push(existingMap.get(def.eventType)!);
      } else {
        const created = await prisma.sharedNotificationTemplate.create({
          data: {
            eventType: def.eventType,
            title: def.title,
            body: def.body,
            deliveryMode: def.deliveryMode,
          },
        });
        templates.push(created);
      }
    }

    return NextResponse.json(templates);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao listar templates de notificação:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
