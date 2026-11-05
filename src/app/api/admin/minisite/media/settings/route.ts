import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();

    const site = await prisma.siteSettings.findUnique({
      where: { id: "default" },
      select: {
        heroMediaType: true,
        heroMediaUrl: true,
        heroPosterUrl: true,
        heroFps: true,
        heroLoop: true,
        heroAutoplay: true,
        heroPlaybackMode: true,
        heroPlaybackDirection: true,
        heroPositioning: true,
        heroFrameCount: true,
        heroFramesJson: true,

        aboutMediaType: true,
        aboutMediaUrl: true,
        aboutPosterUrl: true,
        aboutFps: true,
        aboutLoop: true,
        aboutAutoplay: true,
        aboutPlaybackMode: true,
        aboutPlaybackDirection: true,
        aboutPositioning: true,
        aboutFrameCount: true,
        aboutFramesJson: true,
      },
    });

    let heroFrames: string[] = [];
    if (site?.heroFramesJson) {
      try {
        heroFrames = JSON.parse(site.heroFramesJson);
      } catch {}
    }

    let aboutFrames: string[] = [];
    if (site?.aboutFramesJson) {
      try {
        aboutFrames = JSON.parse(site.aboutFramesJson);
      } catch {}
    }

    return NextResponse.json({
      hero: {
        mediaType: site?.heroMediaType || "IMAGE",
        mediaUrl: site?.heroMediaUrl || null,
        posterUrl: site?.heroPosterUrl || null,
        fps: site?.heroFps ?? 24,
        loop: site?.heroLoop ?? true,
        autoplay: site?.heroAutoplay ?? true,
        playbackMode: site?.heroPlaybackMode || "AUTOMATIC",
        playbackDirection: site?.heroPlaybackDirection || "FORWARD",
        positioning: site?.heroPositioning || "center",
        frameCount: site?.heroFrameCount ?? 0,
        frames: heroFrames,
      },
      about: {
        mediaType: site?.aboutMediaType || "IMAGE",
        mediaUrl: site?.aboutMediaUrl || null,
        posterUrl: site?.aboutPosterUrl || null,
        fps: site?.aboutFps ?? 24,
        loop: site?.aboutLoop ?? true,
        autoplay: site?.aboutAutoplay ?? true,
        playbackMode: site?.aboutPlaybackMode || "AUTOMATIC",
        playbackDirection: site?.aboutPlaybackDirection || "FORWARD",
        positioning: site?.aboutPositioning || "center",
        frameCount: site?.aboutFrameCount ?? 0,
        frames: aboutFrames,
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao buscar configurações de mídia do MiniSite:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAdmin();

    const body = await req.json();
    const updateData: Record<string, any> = {};

    if (body.hero) {
      const h = body.hero;
      if (h.mediaType !== undefined) updateData.heroMediaType = h.mediaType;
      if (h.mediaUrl !== undefined) updateData.heroMediaUrl = h.mediaUrl;
      if (h.posterUrl !== undefined) updateData.heroPosterUrl = h.posterUrl;
      if (h.fps !== undefined) updateData.heroFps = Number(h.fps) || 24;
      if (h.loop !== undefined) updateData.heroLoop = Boolean(h.loop);
      if (h.autoplay !== undefined) updateData.heroAutoplay = Boolean(h.autoplay);
      if (h.playbackMode !== undefined) updateData.heroPlaybackMode = h.playbackMode;
      if (h.playbackDirection !== undefined) updateData.heroPlaybackDirection = h.playbackDirection;
      if (h.positioning !== undefined) updateData.heroPositioning = h.positioning;
      if (h.frameCount !== undefined) updateData.heroFrameCount = Number(h.frameCount) || 0;
      if (h.frames !== undefined) {
        updateData.heroFramesJson = Array.isArray(h.frames) ? JSON.stringify(h.frames) : null;
      }
    }

    if (body.about) {
      const a = body.about;
      if (a.mediaType !== undefined) updateData.aboutMediaType = a.mediaType;
      if (a.mediaUrl !== undefined) updateData.aboutMediaUrl = a.mediaUrl;
      if (a.posterUrl !== undefined) updateData.aboutPosterUrl = a.posterUrl;
      if (a.fps !== undefined) updateData.aboutFps = Number(a.fps) || 24;
      if (a.loop !== undefined) updateData.aboutLoop = Boolean(a.loop);
      if (a.autoplay !== undefined) updateData.aboutAutoplay = Boolean(a.autoplay);
      if (a.playbackMode !== undefined) updateData.aboutPlaybackMode = a.playbackMode;
      if (a.playbackDirection !== undefined) updateData.aboutPlaybackDirection = a.playbackDirection;
      if (a.positioning !== undefined) updateData.aboutPositioning = a.positioning;
      if (a.frameCount !== undefined) updateData.aboutFrameCount = Number(a.frameCount) || 0;
      if (a.frames !== undefined) {
        updateData.aboutFramesJson = Array.isArray(a.frames) ? JSON.stringify(a.frames) : null;
      }
    }

    const updated = await prisma.siteSettings.upsert({
      where: { id: "default" },
      update: updateData,
      create: {
        id: "default",
        aboutText: "Acolhimento clínico ético e humanizado.",
        ...updateData,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Configurações de mídia do MiniSite salvas com sucesso!",
      site: updated,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao atualizar configurações de mídia do MiniSite:", error);
    return NextResponse.json({ error: "Erro interno ao salvar configurações de mídia." }, { status: 500 });
  }
}
