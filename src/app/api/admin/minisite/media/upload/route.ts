import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { requireAdmin } from "@/lib/auth";
import { processZipBuffer, MediaSlot, MediaType } from "@/lib/minisite-media";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const slot = formData.get("slot") as MediaSlot | null; // "hero" | "about"
    const mediaType = formData.get("mediaType") as MediaType | null; // "IMAGE" | "FRAME_ANIMATION" | "VIDEO"

    if (!file || !slot || !mediaType) {
      return NextResponse.json(
        { error: "Arquivo, slot de mídia ou tipo não fornecido." },
        { status: 400 }
      );
    }

    if (!["hero", "about"].includes(slot)) {
      return NextResponse.json({ error: "Slot de mídia inválido. Use 'hero' ou 'about'." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Caso 1: Frame Animation via ZIP
    if (mediaType === "FRAME_ANIMATION") {
      const MAX_ZIP_SIZE = 100 * 1024 * 1024; // 100MB
      if (file.size > MAX_ZIP_SIZE) {
        return NextResponse.json(
          { error: "O arquivo ZIP de animação excede o limite máximo permitido de 100 MB." },
          { status: 400 }
        );
      }

      const result = await processZipBuffer(buffer, slot);

      return NextResponse.json({
        success: true,
        slot,
        mediaType,
        frameCount: result.frameCount,
        frames: result.frames,
        posterUrl: result.posterUrl,
      });
    }

    // Caso 2: Imagem Estática
    if (mediaType === "IMAGE") {
      const MAX_IMG_SIZE = 10 * 1024 * 1024; // 10MB
      if (file.size > MAX_IMG_SIZE) {
        return NextResponse.json(
          { error: "A imagem excede o limite máximo permitido de 10 MB." },
          { status: 400 }
        );
      }

      const allowedImageMimes = ["image/jpeg", "image/png", "image/webp"];
      if (!allowedImageMimes.includes(file.type)) {
        return NextResponse.json(
          { error: "Formato de imagem inválido. Formatos suportados: JPG, PNG e WebP." },
          { status: 400 }
        );
      }

      const uploadDir = path.join(process.cwd(), "public", "uploads", "minisite");
      await fs.mkdir(uploadDir, { recursive: true });

      const ext = path.extname(file.name).toLowerCase() || (file.type === "image/webp" ? ".webp" : ".png");
      const filename = `${slot}-${Date.now()}${ext}`;
      const destPath = path.join(uploadDir, filename);

      await fs.writeFile(destPath, buffer);
      const publicUrl = `/uploads/minisite/${filename}`;

      return NextResponse.json({
        success: true,
        slot,
        mediaType,
        url: publicUrl,
        posterUrl: publicUrl,
      });
    }

    // Caso 3: Vídeo (WebM / MP4)
    if (mediaType === "VIDEO") {
      const MAX_VID_SIZE = 50 * 1024 * 1024; // 50MB
      if (file.size > MAX_VID_SIZE) {
        return NextResponse.json(
          { error: "O arquivo de vídeo excede o limite máximo permitido de 50 MB." },
          { status: 400 }
        );
      }

      const allowedVideoMimes = ["video/mp4", "video/webm"];
      if (!allowedVideoMimes.includes(file.type)) {
        return NextResponse.json(
          { error: "Formato de vídeo inválido. Formatos suportados: MP4 e WebM." },
          { status: 400 }
        );
      }

      const uploadDir = path.join(process.cwd(), "public", "uploads", "minisite");
      await fs.mkdir(uploadDir, { recursive: true });

      const ext = path.extname(file.name).toLowerCase() || (file.type === "video/webm" ? ".webm" : ".mp4");
      const filename = `${slot}-video-${Date.now()}${ext}`;
      const destPath = path.join(uploadDir, filename);

      await fs.writeFile(destPath, buffer);
      const publicUrl = `/uploads/minisite/${filename}`;

      return NextResponse.json({
        success: true,
        slot,
        mediaType,
        url: publicUrl,
      });
    }

    return NextResponse.json({ error: "Tipo de mídia não suportado." }, { status: 400 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    const message = error instanceof Error ? error.message : "Erro interno no upload de mídia.";
    console.error("Erro no upload de mídia do MiniSite:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
