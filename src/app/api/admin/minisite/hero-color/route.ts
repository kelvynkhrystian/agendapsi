import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  detectCurrentHeroMediaColor,
  detectImageBackgroundColor,
  isValidHexColor,
} from "@/lib/hero-color-detector";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const body = await req.json().catch(() => ({}));
    const action = body.action || "analyze-current";

    // Ação 1: Analisar quadro capturado no navegador (ex: frame de vídeo via Canvas)
    if (action === "analyze-frame" && body.frameBase64) {
      const base64Data = body.frameBase64.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      const result = await detectImageBackgroundColor(buffer);
      if (result.status === "SUCCESS" && result.hex) {
        return NextResponse.json({
          success: true,
          hex: result.hex,
          status: "SUCCESS",
          sampleCount: result.sampleCount,
          confidence: result.confidence,
          message: "Cor de fundo detectada com sucesso a partir do quadro da mídia!",
        });
      }

      return NextResponse.json(
        {
          success: false,
          status: "FAILED",
          error: "Não foi possível extrair uma cor estável a partir das bordas do quadro.",
        },
        { status: 422 }
      );
    }

    // Ação 2: Reanalisar a mídia atualmente configurada no banco de dados
    if (action === "analyze-current") {
      const site = await prisma.siteSettings.findUnique({
        where: { id: "default" },
        select: {
          heroMediaType: true,
          heroMediaUrl: true,
          heroFramesJson: true,
          heroPosterUrl: true,
        },
      });

      if (!site) {
        return NextResponse.json({ error: "Configurações do site não encontradas." }, { status: 404 });
      }

      const mediaUrlToTest = site.heroMediaUrl || site.heroPosterUrl;
      const result = await detectCurrentHeroMediaColor(
        site.heroMediaType,
        mediaUrlToTest,
        site.heroFramesJson
      );

      if (result.status === "SUCCESS" && result.hex) {
        return NextResponse.json({
          success: true,
          hex: result.hex,
          status: "SUCCESS",
          mediaRef: mediaUrlToTest,
          confidence: result.confidence,
          message: "Cor de fundo da mídia principal analisada com sucesso!",
        });
      }

      return NextResponse.json(
        {
          success: false,
          status: "FAILED",
          error: "Não foi possível identificar uma cor de fundo estável nas bordas da mídia atual.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({ error: "Ação não suportada." }, { status: 400 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("[HeroColorAPI] Erro ao processar detecção de cor:", error);
    return NextResponse.json({ error: "Erro interno ao detectar cor de fundo." }, { status: 500 });
  }
}
