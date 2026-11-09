import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  detectCurrentHeroMediaColor,
  detectImageBackgroundColor,
  detectMultiFrameBackgroundColor,
} from "@/lib/hero-color-detector";

const heroColorSchema = z.object({
  action: z.enum(["analyze-current", "analyze-frame", "analyze-frames"]).default("analyze-current"),
  slot: z.enum(["hero", "hero_mobile"]).optional().default("hero"),
  frameBase64: z.string().max(1_500_000).optional(),
  framesBase64: z.array(z.string().max(1_500_000)).min(1).max(8).optional(),
});

function decodeFrameBase64(dataUrl: string): Buffer | null {
  try {
    const clean = dataUrl.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, "");
    const buf = Buffer.from(clean, "base64");
    return buf.length > 0 ? buf : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const rawBody = await req.json().catch(() => ({}));
    const parsed = heroColorSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Parâmetros inválidos para detecção de cor.", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { action, slot, frameBase64, framesBase64 } = parsed.data;

    // Ação 1: Analisar múltiplos quadros capturados de vídeo no navegador (mais estável contra movimento)
    if (action === "analyze-frames" && framesBase64 && framesBase64.length > 0) {
      const buffers = framesBase64
        .map(decodeFrameBase64)
        .filter((b): b is Buffer => b !== null);

      const result = await detectMultiFrameBackgroundColor(buffers);
      if (result.status === "SUCCESS" && result.hex) {
        return NextResponse.json({
          success: true,
          hex: result.hex,
          detectedColor: result.hex,
          status: "SUCCESS",
          sampleCount: result.sampleCount,
          confidence: result.confidence,
          message: "Cor de fundo estável detectada a partir dos quadros representativos do vídeo!",
        });
      }

      return NextResponse.json(
        {
          success: false,
          status: "FAILED",
          error: "Não foi possível extrair uma cor estável a partir das bordas dos quadros.",
        },
        { status: 422 }
      );
    }

    // Ação 2: Analisar quadro único capturado no navegador (compatibilidade)
    if (action === "analyze-frame" && frameBase64) {
      const buffer = decodeFrameBase64(frameBase64);
      if (!buffer) {
        return NextResponse.json({ error: "Quadro em base64 inválido." }, { status: 400 });
      }

      const result = await detectImageBackgroundColor(buffer);
      if (result.status === "SUCCESS" && result.hex) {
        return NextResponse.json({
          success: true,
          hex: result.hex,
          detectedColor: result.hex,
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

    // Ação 3: Reanalisar a mídia atualmente configurada no banco de dados (Desktop ou Mobile Hero)
    if (action === "analyze-current") {
      const site = await prisma.siteSettings.findUnique({
        where: { id: "default" },
        select: {
          heroMediaType: true,
          heroMediaUrl: true,
          heroFramesJson: true,
          heroPosterUrl: true,
          heroMobileMediaType: true,
          heroMobileMediaUrl: true,
          heroMobileFramesJson: true,
          heroMobilePosterUrl: true,
        },
      });

      if (!site) {
        return NextResponse.json({ error: "Configurações do site não encontradas." }, { status: 404 });
      }

      const isMobile = slot === "hero_mobile";
      const mediaType = isMobile ? site.heroMobileMediaType : site.heroMediaType;
      const mediaUrlToTest = isMobile
        ? site.heroMobileMediaUrl || site.heroMobilePosterUrl
        : site.heroMediaUrl || site.heroPosterUrl;
      const framesJson = isMobile ? site.heroMobileFramesJson : site.heroFramesJson;

      const result = await detectCurrentHeroMediaColor(mediaType, mediaUrlToTest, framesJson);

      if (result.status === "SUCCESS" && result.hex) {
        return NextResponse.json({
          success: true,
          hex: result.hex,
          detectedColor: result.hex,
          status: "SUCCESS",
          mediaRef: mediaUrlToTest,
          confidence: result.confidence,
          message: "Cor de fundo da mídia analisada com sucesso!",
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

    return NextResponse.json({ error: "Ação não suportada ou quadros ausentes." }, { status: 400 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("[HeroColorAPI] Erro ao processar detecção de cor:", error);
    return NextResponse.json({ error: "Erro interno ao detectar cor de fundo." }, { status: 500 });
  }
}
