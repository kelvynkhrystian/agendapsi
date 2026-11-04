import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function POST() {
  try {
    const session = await requireAuth();

    await prisma.notification.updateMany({
      where: {
        recipientId: session.userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, message: "Todas as notificações foram marcadas como lidas." });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }
    console.error("Erro ao marcar todas notificações como lidas:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
