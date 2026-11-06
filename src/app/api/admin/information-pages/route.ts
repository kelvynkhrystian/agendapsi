import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { INFORMATION_PAGES_DEFAULTS } from "@/lib/information-pages-defaults";

export async function GET() {
  try {
    await requireAdmin();

    // Assegura que as 4 páginas existem no banco
    const pageKeys = ["terms", "privacy", "lgpd", "ethics"] as const;
    const existing = await prisma.legalPage.findMany();
    const existingMap = new Map(existing.map((p) => [p.id, p]));

    for (const key of pageKeys) {
      if (!existingMap.has(key)) {
        const def = INFORMATION_PAGES_DEFAULTS[key];
        const created = await prisma.legalPage.create({
          data: {
            id: key,
            title: def.title,
            description: def.description,
            contentHtml: def.contentHtml,
            version: def.version,
            isPublished: true,
            publishedAt: new Date(),
          },
        });
        existingMap.set(key, created);
      }
    }

    // Retorna ordenado conforme as 4 páginas principais
    const pages = pageKeys.map((key) => {
      const page = existingMap.get(key)!;
      const def = INFORMATION_PAGES_DEFAULTS[key];
      return {
        id: page.id,
        title: page.title || def.title,
        description: page.description || def.description,
        publicSlug: def.publicSlug,
        alternateSlug: def.alternateSlug,
        version: page.version,
        isPublished: page.isPublished ?? true,
        publishedAt: page.publishedAt,
        updatedAt: page.updatedAt,
      };
    });

    return NextResponse.json(pages);
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao listar páginas informativas:", error);
    return NextResponse.json(
      { error: "Erro ao buscar páginas informativas." },
      { status: 500 }
    );
  }
}
