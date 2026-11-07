import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { requireAdmin } from "@/lib/auth";
import {
  processZipBuffer,
  processMultipleImageFiles,
  saveStaticMediaFile,
  MediaSlot,
  MediaType,
  ALLOWED_IMAGE_EXTENSIONS,
  ALLOWED_VIDEO_EXTENSIONS,
} from "@/lib/minisite-media";
import {
  detectImageBackgroundColor,
  detectZipBackgroundColor,
} from "@/lib/hero-color-detector";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const formData = await req.formData();
    const slot = formData.get("slot") as MediaSlot | null; // "hero" | "about"
    const mediaType = formData.get("mediaType") as MediaType | null; // "IMAGE" | "FRAME_ANIMATION" | "VIDEO"
    const isFolderOrMultiple = formData.get("isMultiple") === "true";

    if (!slot || !mediaType) {
      return NextResponse.json(
        { error: "Slot de mídia ou tipo não fornecido." },
        { status: 400 }
      );
    }

    if (!["hero", "about"].includes(slot)) {
      return NextResponse.json({ error: "Slot de mídia inválido. Use 'hero' ou 'about'." }, { status: 400 });
    }

    // Caso A: Upload de Múltiplos Arquivos ou Pasta de Frames
    const multiFiles = formData.getAll("files") as File[];
    if (isFolderOrMultiple || (multiFiles && multiFiles.length > 1)) {
      const fileBuffers: { name: string; buffer: Buffer }[] = [];
      for (const f of multiFiles) {
        if (f.size > 15 * 1024 * 1024) {
          return NextResponse.json(
            { error: `O frame ${f.name} excede o limite individual de 15MB.` },
            { status: 400 }
          );
        }
        const buf = Buffer.from(await f.arrayBuffer());
        fileBuffers.push({ name: f.name, buffer: buf });
      }

      const result = await processMultipleImageFiles(fileBuffers, slot);
      return NextResponse.json({
        success: true,
        slot,
        mediaType: "FRAME_ANIMATION",
        frameCount: result.frameCount,
        frames: result.frames,
        posterUrl: result.posterUrl,
        message: `${result.frameCount} frames processados e salvos com sucesso!`,
      });
    }

    // Caso B: Upload de Arquivo Único (ZIP, Imagem ou Vídeo)
    const file = (formData.get("file") as File | null) || (multiFiles.length === 1 ? multiFiles[0] : null);
    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const rawExt = path.extname(file.name).toLowerCase();

    // 1. Frame Animation via ZIP
    if (mediaType === "FRAME_ANIMATION" || rawExt === ".zip") {
      const MAX_ZIP_SIZE = 100 * 1024 * 1024; // 100MB
      if (file.size > MAX_ZIP_SIZE) {
        return NextResponse.json(
          { error: "O arquivo ZIP de animação excede o limite máximo permitido de 100 MB." },
          { status: 400 }
        );
      }

      const result = await processZipBuffer(buffer, slot);

      let detectedBgColor: string | null = null;
      let detectionStatus: string = "IDLE";
      if (slot === "hero") {
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
        message: `Animação ZIP com ${result.frameCount} frames descompactada e persistida com sucesso!`,
      });
    }

    // 2. Imagem Estática (JPG, PNG, WebP)
    if (mediaType === "IMAGE") {
      const MAX_IMG_SIZE = 15 * 1024 * 1024; // 15MB
      if (file.size > MAX_IMG_SIZE) {
        return NextResponse.json(
          { error: "A imagem excede o limite máximo permitido de 15 MB." },
          { status: 400 }
        );
      }

      if (!ALLOWED_IMAGE_EXTENSIONS.includes(rawExt)) {
        return NextResponse.json(
          { error: "Formato de imagem inválido. Formatos suportados: JPG, PNG e WebP." },
          { status: 400 }
        );
      }

      const publicUrl = await saveStaticMediaFile(file.name, buffer, slot, "image");

      let detectedBgColor: string | null = null;
      let detectionStatus: string = "IDLE";
      if (slot === "hero") {
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
        message: "Imagem estática salva com sucesso!",
      });
    }

    // 3. Vídeo (WebM / MP4)
    if (mediaType === "VIDEO") {
      const MAX_VID_SIZE = 50 * 1024 * 1024; // 50MB
      if (file.size > MAX_VID_SIZE) {
        return NextResponse.json(
          { error: "O arquivo de vídeo excede o limite máximo permitido de 50 MB." },
          { status: 400 }
        );
      }

      if (!ALLOWED_VIDEO_EXTENSIONS.includes(rawExt)) {
        return NextResponse.json(
          { error: "Formato de vídeo inválido. Formatos suportados: MP4 e WebM." },
          { status: 400 }
        );
      }

      const publicUrl = await saveStaticMediaFile(file.name, buffer, slot, "video");

      return NextResponse.json({
        success: true,
        slot,
        mediaType: "VIDEO",
        url: publicUrl,
        posterUrl: publicUrl,
        message: "Vídeo salvo com sucesso!",
      });
    }

    return NextResponse.json({ error: "Tipo de mídia não suportado." }, { status: 400 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    const message = error instanceof Error ? error.message : "Erro interno ao processar o upload.";
    console.error("Erro no upload de mídia:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
