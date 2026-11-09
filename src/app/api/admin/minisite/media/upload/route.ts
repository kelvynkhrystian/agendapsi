import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import {
  processZipBuffer,
  saveStaticMediaFile,
  detectMediaTypeFromFile,
  MediaSlot,
} from "@/lib/minisite-media";
import {
  detectImageBackgroundColor,
  detectZipBackgroundColor,
} from "@/lib/hero-color-detector";

const uploadSlotSchema = z.enum(["hero", "hero_mobile", "about"]);

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const formData = await req.formData();
    const rawSlot = formData.get("slot");
    const parsedSlot = uploadSlotSchema.safeParse(rawSlot);

    if (!parsedSlot.success) {
      return NextResponse.json(
        { error: "Área de mídia inválida. Use 'hero', 'hero_mobile' ou 'about'." },
        { status: 400 }
      );
    }

    const slot: MediaSlot = parsedSlot.data;
    const isHeroSlot = slot === "hero" || slot === "hero_mobile";

    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Reconhecimento automático pelo conteúdo real do arquivo (magic bytes + MIME/extensão)
    let detected;
    try {
      detected = detectMediaTypeFromFile(file.name, file.type, buffer);
    } catch (detectErr) {
      const errMsg =
        detectErr instanceof Error
          ? detectErr.message
          : "Formato de arquivo não suportado. Envie JPG, PNG, WebP, MP4, WebM ou ZIP.";
      return NextResponse.json({ error: errMsg }, { status: 400 });
    }

    // 1. Animação por Frames em ZIP
    if (detected.mediaType === "FRAME_ANIMATION") {
      const MAX_ZIP_SIZE = 100 * 1024 * 1024; // 100MB
      if (file.size > MAX_ZIP_SIZE) {
        return NextResponse.json(
          { error: "O arquivo ZIP de animação excede o limite máximo permitido de 100 MB." },
          { status: 400 }
        );
      }

      let result;
      try {
        result = await processZipBuffer(buffer, slot);
      } catch (zipErr) {
        const msg = zipErr instanceof Error ? zipErr.message : "Arquivo ZIP inválido.";
        return NextResponse.json({ error: msg }, { status: 400 });
      }

      let detectedBgColor: string | null = null;
      let detectionStatus: string = "IDLE";
      if (isHeroSlot) {
        try {
          const colorResult = await detectZipBackgroundColor(buffer);
          detectedBgColor = colorResult.hex;
          detectionStatus = colorResult.status;
        } catch (colorErr) {
          console.warn("[Upload] Falha ao detectar cor do ZIP:", colorErr);
          detectionStatus = "FAILED";
        }
      }

      return NextResponse.json({
        success: true,
        slot,
        mediaType: "FRAME_ANIMATION",
        frameCount: result.frameCount,
        frames: result.frames,
        posterUrl: result.posterUrl,
        detectedBgColor,
        detectionStatus,
        message: `Animação ZIP reconhecida (${result.frameCount} frames) e preparada com sucesso!`,
      });
    }

    // 2. Imagem Estática (JPG, PNG, WebP)
    if (detected.mediaType === "IMAGE") {
      const MAX_IMG_SIZE = 15 * 1024 * 1024; // 15MB
      if (file.size > MAX_IMG_SIZE) {
        return NextResponse.json(
          { error: "A imagem excede o limite máximo permitido de 15 MB." },
          { status: 400 }
        );
      }

      const publicUrl = await saveStaticMediaFile(
        file.name,
        buffer,
        slot,
        "image",
        detected.extension
      );

      let detectedBgColor: string | null = null;
      let detectionStatus: string = "IDLE";
      if (isHeroSlot) {
        try {
          const colorResult = await detectImageBackgroundColor(buffer);
          detectedBgColor = colorResult.hex;
          detectionStatus = colorResult.status;
        } catch (colorErr) {
          console.warn("[Upload] Falha ao detectar cor da imagem:", colorErr);
          detectionStatus = "FAILED";
        }
      }

      return NextResponse.json({
        success: true,
        slot,
        mediaType: "IMAGE",
        url: publicUrl,
        posterUrl: publicUrl,
        detectedBgColor,
        detectionStatus,
        message: "Imagem reconhecida e preparada com sucesso!",
      });
    }

    // 3. Vídeo (MP4 / WebM)
    if (detected.mediaType === "VIDEO") {
      const MAX_VID_SIZE = 50 * 1024 * 1024; // 50MB
      if (file.size > MAX_VID_SIZE) {
        return NextResponse.json(
          { error: "O arquivo de vídeo excede o limite máximo permitido de 50 MB." },
          { status: 400 }
        );
      }

      const publicUrl = await saveStaticMediaFile(
        file.name,
        buffer,
        slot,
        "video",
        detected.extension
      );

      return NextResponse.json({
        success: true,
        slot,
        mediaType: "VIDEO",
        url: publicUrl,
        posterUrl: publicUrl,
        detectedBgColor: null,
        detectionStatus: isHeroSlot ? "PENDING_CLIENT_FRAMES" : "IDLE",
        message: "Vídeo reconhecido e preparado com sucesso!",
      });
    }

    return NextResponse.json(
      { error: "Formato de arquivo não suportado." },
      { status: 400 }
    );
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    const message = error instanceof Error ? error.message : "Erro interno ao processar o upload.";
    console.error("Erro no upload de mídia:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
