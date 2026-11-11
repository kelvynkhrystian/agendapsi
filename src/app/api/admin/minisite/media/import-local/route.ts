import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { isRestoreInProgress, RESTORE_MAINTENANCE_MESSAGE } from "@/lib/backup";
import { detectExistingFrames, MediaSlot } from "@/lib/minisite-media";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    if (await isRestoreInProgress()) {
      return NextResponse.json({ error: RESTORE_MAINTENANCE_MESSAGE }, { status: 503 });
    }

    const body = await req.json();
    const slot = body.slot as MediaSlot; // "hero" | "about"

    if (!slot || !["hero", "about"].includes(slot)) {
      return NextResponse.json({ error: "Slot de mídia inválido. Use 'hero' ou 'about'." }, { status: 400 });
    }

    const result = await detectExistingFrames(slot);

    if (!result) {
      const folderName = slot === "hero" ? "top" : "sobre";
      return NextResponse.json(
        { error: `Nenhum frame ou arquivo ZIP encontrado em storage/minisite/${folderName}.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      slot,
      mediaType: "FRAME_ANIMATION",
      frameCount: result.frameCount,
      frames: result.frames,
      posterUrl: result.posterUrl,
      message: `${result.frameCount} frames importados e sincronizados com sucesso a partir do storage!`,
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
