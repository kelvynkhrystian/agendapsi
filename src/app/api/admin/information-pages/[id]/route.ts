import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { sanitizeCustomHtml } from "@/lib/sanitize";
import { INFORMATION_PAGES_DEFAULTS } from "@/lib/information-pages-defaults";

const updatePageSchema = z.object({
  title: z.string().min(2, "O título é obrigatório"),
  description: z.string().optional().nullable(),
  contentHtml: z.string().min(10, "O conteúdo deve conter pelo menos 10 caracteres"),
  version: z.string().default("1.0"),
  isPublished: z.boolean().default(true),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    let page = await prisma.legalPage.findUnique({
      where: { id },
    });

    const def = INFORMATION_PAGES_DEFAULTS[id];

    if (!page && def) {
      page = await prisma.legalPage.create({
        data: {
          id,
          title: def.title,
          description: def.description,
          contentHtml: def.contentHtml,
          version: def.version,
          isPublished: true,
          publishedAt: new Date(),
        },
      });
    }

    if (!page) {
      return NextResponse.json({ error: "Página não encontrada." }, { status: 404 });
    }

    return NextResponse.json({
      ...page,
      publicSlug: def?.publicSlug || `/${page.id}`,
      alternateSlug: def?.alternateSlug || `/${page.id}`,
    });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao carregar página informativa:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    const { id } = await params;
    const body = await req.json();

    const parsed = updatePageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos.", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { title, description, contentHtml, version, isPublished } = parsed.data;
    const cleanHtml = sanitizeCustomHtml(contentHtml);

    const existing = await prisma.legalPage.findUnique({ where: { id } });

    // Atualiza a data de publicação se estiver passando de rascunho para publicado
    const publishedAt =
      isPublished && !existing?.isPublished
        ? new Date()
        : existing?.publishedAt || (isPublished ? new Date() : null);

    const updated = await prisma.legalPage.upsert({
      where: { id },
      update: {
        title,
        description: description || null,
        contentHtml: cleanHtml,
        version,
        isPublished,
        publishedAt,
      },
      create: {
        id,
        title,
        description: description || null,
        contentHtml: cleanHtml,
        version,
        isPublished,
        publishedAt,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        userRole: user.role,
        action: "UPDATE_INFORMATION_PAGE",
        resource: "LegalPage",
        resourceId: id,
        details: JSON.stringify({
          title,
          version,
          isPublished,
          contentLength: cleanHtml.length,
        }),
      },
    });

    const def = INFORMATION_PAGES_DEFAULTS[id];

    return NextResponse.json({
      success: true,
      message: "Página salva com sucesso!",
      page: {
        ...updated,
        publicSlug: def?.publicSlug || `/${updated.id}`,
        alternateSlug: def?.alternateSlug || `/${updated.id}`,
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao salvar página informativa:", error);
    return NextResponse.json({ error: "Erro ao salvar página informativa." }, { status: 500 });
  }
}
