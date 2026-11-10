import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { THEME_PRESETS } from "@/lib/theme-presets";

const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor hexadecimal inválida");

const updateAppearanceSchema = z.object({
  scope: z.enum(["theme", "images", "all"]).optional().default("all"),
  logoUrl: z.string().nullable().optional(),
  logoHorizontalUrl: z.string().nullable().optional(),
  faviconUrl: z.string().nullable().optional(),
  themeName: z.string().optional().default("VERDE"),
  primaryColor: hexColorSchema.optional(),
  secondaryColor: hexColorSchema.optional(),
  accentColor: hexColorSchema.optional(),
  buttonColor: hexColorSchema.optional(),
  backgroundColor: hexColorSchema.optional(),
  textColor: hexColorSchema.optional(),
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
      scope,
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

    if (scope === "images") {
      const updated = await prisma.siteSettings.upsert({
        where: { id: "default" },
        update: {
          logoUrl: logoUrl ?? null,
          logoHorizontalUrl: logoHorizontalUrl ?? null,
          faviconUrl: faviconUrl ?? null,
        },
        create: {
          id: "default",
          aboutText: "Consultório de Psicologia & Psiquiatria",
          logoUrl: logoUrl ?? null,
          logoHorizontalUrl: logoHorizontalUrl ?? null,
          faviconUrl: faviconUrl ?? null,
        },
      });

      try {
        revalidatePath("/", "layout");
        revalidatePath("/");
        revalidatePath("/agendar");
      } catch (revalErr) {
        console.warn("Aviso ao revalidar caminhos de cache:", revalErr);
      }

      return NextResponse.json({
        success: true,
        message: "Imagens do sistema atualizadas com sucesso.",
        appearance: updated,
      });
    }

    const fallbackPreset = THEME_PRESETS.VERDE;
    let finalPrimary = primaryColor || fallbackPreset.primaryColor;
    let finalButton = buttonColor || finalPrimary;
    let finalSecondary = secondaryColor || fallbackPreset.secondaryColor;
    let finalAccent = accentColor || fallbackPreset.accentColor;
    let finalBg = backgroundColor || fallbackPreset.backgroundColor;
    let finalTxt = textColor || fallbackPreset.textColor;

    // Se o tema for um preset pré-definido, sincroniza os tokens oficiais autoritativos
    if (themeName && themeName !== "PERSONALIZADO" && THEME_PRESETS[themeName]) {
      const preset = THEME_PRESETS[themeName];
      finalPrimary = preset.primaryColor;
      finalButton = preset.buttonColor;
      finalSecondary = preset.secondaryColor;
      finalAccent = preset.accentColor;
      finalBg = preset.backgroundColor;
      finalTxt = preset.textColor;
    } else if (!primaryColor) {
      return NextResponse.json(
        { error: "Informe a cor primária para salvar o tema personalizado." },
        { status: 400 }
      );
    } else if (themeName === "PERSONALIZADO" && !buttonColor) {
      finalButton = finalPrimary;
    }

    const themeFields = {
      themeName,
      primaryColor: finalPrimary,
      secondaryColor: finalSecondary,
      accentColor: finalAccent,
      buttonColor: finalButton,
      backgroundColor: finalBg,
      textColor: finalTxt,
    };

    const updated =
      scope === "theme"
        ? await prisma.siteSettings.upsert({
            where: { id: "default" },
            update: themeFields,
            create: {
              id: "default",
              aboutText: "Consultório de Psicologia & Psiquiatria",
              ...themeFields,
            },
          })
        : await prisma.siteSettings.upsert({
            where: { id: "default" },
            update: {
              logoUrl: logoUrl ?? null,
              logoHorizontalUrl: logoHorizontalUrl ?? null,
              faviconUrl: faviconUrl ?? null,
              ...themeFields,
            },
            create: {
              id: "default",
              aboutText: "Consultório de Psicologia & Psiquiatria",
              logoUrl: logoUrl ?? null,
              logoHorizontalUrl: logoHorizontalUrl ?? null,
              faviconUrl: faviconUrl ?? null,
              ...themeFields,
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

    return NextResponse.json({
      success: true,
      message: scope === "theme" ? "Tema atualizado com sucesso." : "Aparência atualizada com sucesso.",
      appearance: updated,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao atualizar aparência:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
