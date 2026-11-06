import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { INFORMATION_PAGES_DEFAULTS } from "@/lib/information-pages-defaults";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    const { id } = await params;

    const def = INFORMATION_PAGES_DEFAULTS[id];
    if (!def) {
      return NextResponse.json({ error: "Modelo padrão não encontrado para esta página." }, { status: 404 });
    }

    const updated = await prisma.legalPage.upsert({
      where: { id },
      update: {
        title: def.title,
        description: def.description,
        contentHtml: def.contentHtml,
        version: def.version,
      },
      create: {
        id,
        title: def.title,
        description: def.description,
        contentHtml: def.contentHtml,
        version: def.version,
        isPublished: true,
        publishedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        userRole: user.role,
        action: "RESTORE_DEFAULT_INFORMATION_PAGE",
        resource: "LegalPage",
        resourceId: id,
        details: JSON.stringify({ title: def.title }),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Modelo padrão restaurado com sucesso!",
      page: updated,
    });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao restaurar modelo padrão:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
