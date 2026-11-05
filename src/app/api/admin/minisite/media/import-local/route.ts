import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { requireAdmin } from "@/lib/auth";
import { importLocalFrames, MediaSlot } from "@/lib/minisite-media";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const body = await req.json();
    const slot = body.slot as MediaSlot; // "hero" | "about"

    if (!slot || !["hero", "about"].includes(slot)) {
      return NextResponse.json({ error: "Slot de mídia inválido. Use 'hero' ou 'about'." }, { status: 400 });
    }

    const sourceFolder = slot === "hero" ? "top" : "mid";
    const sourceDir = path.join(process.cwd(), "storage", "minisite", sourceFolder);

    const result = await importLocalFrames(sourceDir, slot);

    return NextResponse.json({
      success: true,
      slot,
      mediaType: "FRAME_ANIMATION",
      frameCount: result.frameCount,
      frames: result.frames,
      posterUrl: result.posterUrl,
      source: sourceDir,
      message: `${result.frameCount} frames importados com sucesso a partir de ${sourceFolder}!`,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    const message = error instanceof Error ? error.message : "Erro interno ao importar frames locais.";
    console.error("Erro na importação local de frames:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
