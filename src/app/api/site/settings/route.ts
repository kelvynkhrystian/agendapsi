import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseSiteSectionsConfig } from "@/lib/site-sections";

export async function GET() {
  try {
    const [site, profile, services] = await Promise.all([
      prisma.siteSettings.findUnique({ where: { id: "default" } }),
      prisma.professionalProfile.findUnique({ where: { id: "default" } }),
      prisma.service.findMany({
        where: { isActive: true },
        orderBy: { priceCents: "asc" },
      }),
    ]);

    return NextResponse.json({
      site,
      profile,
      services,
      sectionsConfig: parseSiteSectionsConfig(site?.sectionsConfigJson),
    });
  } catch (error) {
    console.error("Erro ao buscar dados do Site:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
