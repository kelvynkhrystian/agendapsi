import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    const { id } = await params;

    const page = await prisma.legalPage.findUnique({
      where: { id },
    });

    if (!page) {
      return NextResponse.json({ error: "Página não encontrada." }, { status: 404 });
    }

    const nextPublished = !page.isPublished;

    const updated = await prisma.legalPage.update({
      where: { id },
      data: {
        isPublished: nextPublished,
        publishedAt: nextPublished ? new Date() : page.publishedAt,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        userRole: user.role,
        action: nextPublished ? "PUBLISH_INFORMATION_PAGE" : "UNPUBLISH_INFORMATION_PAGE",
        resource: "LegalPage",
        resourceId: id,
        details: JSON.stringify({ isPublished: nextPublished }),
      },
    });

    return NextResponse.json({
      success: true,
      message: nextPublished ? "Página publicada com sucesso!" : "Página convertida em rascunho (despublicada).",
      isPublished: updated.isPublished,
      publishedAt: updated.publishedAt,
    });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao alterar status de publicação:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
