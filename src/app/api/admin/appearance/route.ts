import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const updateAppearanceSchema = z.object({
  logoUrl: z.string().nullable().optional(),
  logoHorizontalUrl: z.string().nullable().optional(),
  faviconUrl: z.string().nullable().optional(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor primária inválida"),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor secundária inválida").optional().default("#0f766e"),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor de destaque inválida").optional().default("#f59e0b"),
  buttonColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor de botões inválida").optional().default("#0d9488"),
});

export async function GET() {
  try {
    await requireAdmin();

    const site = await prisma.siteSettings.findUnique({
      where: { id: "default" },
    });

    return NextResponse.json({
      logoUrl: site?.logoUrl || null,
      logoHorizontalUrl: site?.logoHorizontalUrl || null,
      faviconUrl: site?.faviconUrl || null,
      primaryColor: site?.primaryColor || "#0d9488",
      secondaryColor: site?.secondaryColor || "#0f766e",
      accentColor: site?.accentColor || "#f59e0b",
      buttonColor: site?.buttonColor || "#0d9488",
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao obter configurações de aparência:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const result = updateAppearanceSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { logoUrl, logoHorizontalUrl, faviconUrl, primaryColor, secondaryColor, accentColor, buttonColor } =
      result.data;

    const updated = await prisma.siteSettings.upsert({
      where: { id: "default" },
      update: {
        logoUrl: logoUrl || null,
        logoHorizontalUrl: logoHorizontalUrl || null,
        faviconUrl: faviconUrl || null,
        primaryColor,
        secondaryColor,
        accentColor,
        buttonColor,
      },
      create: {
        id: "default",
        aboutText: "Consultório de Psicologia & Psiquiatria",
        logoUrl: logoUrl || null,
        logoHorizontalUrl: logoHorizontalUrl || null,
        faviconUrl: faviconUrl || null,
        primaryColor,
        secondaryColor,
        accentColor,
        buttonColor,
      },
    });

    return NextResponse.json({ success: true, appearance: updated });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao atualizar aparência:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
