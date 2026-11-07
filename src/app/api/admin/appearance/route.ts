import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { THEME_PRESETS } from "@/lib/theme-presets";

const updateAppearanceSchema = z.object({
  logoUrl: z.string().nullable().optional(),
  logoHorizontalUrl: z.string().nullable().optional(),
  faviconUrl: z.string().nullable().optional(),
  themeName: z.string().optional().default("VERDE"),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor primária inválida"),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor secundária inválida").optional().default("#0f766e"),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor de destaque inválida").optional().default("#f59e0b"),
  buttonColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor de botões inválida").optional().default("#0d9488"),
  backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor de fundo inválida").optional().default("#f8f8f8"),
  textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor do texto inválida").optional().default("#171717"),
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
      themeName: site?.themeName || "VERDE",
      primaryColor: site?.primaryColor || "#16A34A",
      secondaryColor: site?.secondaryColor || "#DCFCE7",
      accentColor: site?.accentColor || "#86EFAC",
      buttonColor: site?.buttonColor || site?.primaryColor || "#16A34A",
      backgroundColor: site?.backgroundColor || "#F0FDF4",
      textColor: site?.textColor || "#14532D",
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

    const {
      logoUrl,
      logoHorizontalUrl,
      faviconUrl,
      themeName,
      primaryColor,
      secondaryColor,
      accentColor,
      buttonColor,
      backgroundColor,
      textColor,
    } = result.data;

    let finalPrimary = primaryColor;
    let finalButton = buttonColor;
    let finalSecondary = secondaryColor;
    let finalAccent = accentColor;
    let finalBg = backgroundColor;
    let finalTxt = textColor;

    // Se o tema for um preset pré-definido, sincroniza os tokens oficiais autoritativos
    if (themeName && themeName !== "PERSONALIZADO" && THEME_PRESETS[themeName]) {
      const preset = THEME_PRESETS[themeName];
      finalPrimary = preset.primaryColor;
      finalButton = preset.buttonColor;
      finalSecondary = preset.secondaryColor;
      finalAccent = preset.accentColor;
      finalBg = preset.backgroundColor;
      finalTxt = preset.textColor;
    } else if (themeName === "PERSONALIZADO" && (!buttonColor || buttonColor === primaryColor)) {
      finalButton = finalPrimary;
    }

    const updated = await prisma.siteSettings.upsert({
      where: { id: "default" },
      update: {
        logoUrl: logoUrl || null,
        logoHorizontalUrl: logoHorizontalUrl || null,
        faviconUrl: faviconUrl || null,
        themeName,
        primaryColor: finalPrimary,
        secondaryColor: finalSecondary,
        accentColor: finalAccent,
        buttonColor: finalButton,
        backgroundColor: finalBg,
        textColor: finalTxt,
      },
      create: {
        id: "default",
        aboutText: "Consultório de Psicologia & Psiquiatria",
        logoUrl: logoUrl || null,
        logoHorizontalUrl: logoHorizontalUrl || null,
        faviconUrl: faviconUrl || null,
        themeName,
        primaryColor: finalPrimary,
        secondaryColor: finalSecondary,
        accentColor: finalAccent,
        buttonColor: finalButton,
        backgroundColor: finalBg,
        textColor: finalTxt,
      },
    });

    // Invalida o cache das páginas públicas para propagar as cores instantaneamente
    try {
      revalidatePath("/", "layout");
      revalidatePath("/");
      revalidatePath("/agendar");
    } catch (revalErr) {
      console.warn("Aviso ao revalidar caminhos de cache:", revalErr);
    }

    return NextResponse.json({ success: true, appearance: updated });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao atualizar aparência:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
