import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { isValidHexColor, normalizeHexColor } from "@/lib/hero-color-detector";
import { normalizePlaybackSpeed } from "@/lib/minisite-media";

const slotSettingsSchema = z.object({
  mediaType: z.enum(["IMAGE", "FRAME_ANIMATION", "VIDEO"]).optional(),
  mediaUrl: z.string().nullable().optional(),
  posterUrl: z.string().nullable().optional(),
  fps: z.coerce.number().int().min(10).max(60).optional(),
  playbackSpeed: z.coerce.number().optional(),
  loop: z.boolean().optional(),
  autoplay: z.boolean().optional(),
  playbackMode: z.enum(["AUTOMATIC", "SCROLL"]).optional(),
  playbackDirection: z.enum(["FORWARD", "ALTERNATE"]).optional(),
  positioning: z.enum(["center", "cover", "contain", "top", "bottom"]).optional(),
  frameCount: z.coerce.number().int().min(0).max(500).optional(),
  frames: z.array(z.string()).nullable().optional(),
  bgMode: z.enum(["AUTO", "MANUAL"]).optional(),
  bgDetectedColor: z.string().nullable().optional(),
  bgCustomColor: z.string().nullable().optional(),
  bgStatus: z.string().optional(),
  bgMediaRef: z.string().nullable().optional(),
});

const updateMediaSettingsSchema = z.object({
  hero: slotSettingsSchema.optional(),
  heroMobile: slotSettingsSchema.optional(),
  about: slotSettingsSchema.optional(),
});

function parseFramesJson(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

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
        heroPlaybackSpeed: true,
        heroLoop: true,
        heroAutoplay: true,
        heroPlaybackMode: true,
        heroPlaybackDirection: true,
        heroPositioning: true,
        heroFrameCount: true,
        heroFramesJson: true,
        heroBgMode: true,
        heroBgDetectedColor: true,
        heroBgCustomColor: true,
        heroBgStatus: true,
        heroBgMediaRef: true,

        heroMobileMediaType: true,
        heroMobileMediaUrl: true,
        heroMobilePosterUrl: true,
        heroMobileFps: true,
        heroMobilePlaybackSpeed: true,
        heroMobileLoop: true,
        heroMobileAutoplay: true,
        heroMobilePlaybackMode: true,
        heroMobilePlaybackDirection: true,
        heroMobilePositioning: true,
        heroMobileFrameCount: true,
        heroMobileFramesJson: true,
        heroMobileBgDetectedColor: true,
        heroMobileBgStatus: true,
        heroMobileBgMediaRef: true,

        aboutMediaType: true,
        aboutMediaUrl: true,
        aboutPosterUrl: true,
        aboutFps: true,
        aboutPlaybackSpeed: true,
        aboutLoop: true,
        aboutAutoplay: true,
        aboutPlaybackMode: true,
        aboutPlaybackDirection: true,
        aboutPositioning: true,
        aboutFrameCount: true,
        aboutFramesJson: true,
      },
    });

    const heroFrames = parseFramesJson(site?.heroFramesJson);
    const heroMobileFrames = parseFramesJson(site?.heroMobileFramesJson);
    const aboutFrames = parseFramesJson(site?.aboutFramesJson);

    return NextResponse.json({
      hero: {
        mediaType: site?.heroMediaType || "IMAGE",
        mediaUrl: site?.heroMediaUrl || null,
        posterUrl: site?.heroPosterUrl || null,
        fps: site?.heroFps ?? 24,
        playbackSpeed: normalizePlaybackSpeed(site?.heroPlaybackSpeed ?? 1),
        loop: site?.heroLoop ?? true,
        autoplay: site?.heroAutoplay ?? true,
        playbackMode: site?.heroPlaybackMode || "AUTOMATIC",
        playbackDirection: site?.heroPlaybackDirection || "FORWARD",
        positioning: site?.heroPositioning || "center",
        frameCount: site?.heroFrameCount ?? 0,
        frames: heroFrames,
        bgMode: site?.heroBgMode || "AUTO",
        bgDetectedColor: site?.heroBgDetectedColor || null,
        bgCustomColor: site?.heroBgCustomColor || null,
        bgStatus: site?.heroBgStatus || "IDLE",
        bgMediaRef: site?.heroBgMediaRef || null,
      },
      heroMobile: {
        mediaType: site?.heroMobileMediaType || "IMAGE",
        mediaUrl: site?.heroMobileMediaUrl || null,
        posterUrl: site?.heroMobilePosterUrl || null,
        fps: site?.heroMobileFps ?? 24,
        playbackSpeed: normalizePlaybackSpeed(site?.heroMobilePlaybackSpeed ?? 1),
        loop: site?.heroMobileLoop ?? true,
        autoplay: site?.heroMobileAutoplay ?? true,
        playbackMode: site?.heroMobilePlaybackMode || "AUTOMATIC",
        playbackDirection: site?.heroMobilePlaybackDirection || "FORWARD",
        positioning: site?.heroMobilePositioning || "center",
        frameCount: site?.heroMobileFrameCount ?? 0,
        frames: heroMobileFrames,
        bgDetectedColor: site?.heroMobileBgDetectedColor || null,
        bgStatus: site?.heroMobileBgStatus || "IDLE",
        bgMediaRef: site?.heroMobileBgMediaRef || null,
      },
      about: {
        mediaType: site?.aboutMediaType || "IMAGE",
        mediaUrl: site?.aboutMediaUrl || null,
        posterUrl: site?.aboutPosterUrl || null,
        fps: site?.aboutFps ?? 24,
        playbackSpeed: normalizePlaybackSpeed(site?.aboutPlaybackSpeed ?? 1),
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

    const rawBody = await req.json().catch(() => null);
    const parsed = updateMediaSettingsSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados de mídia inválidos.", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const body = parsed.data;
    const updateData: Record<string, unknown> = {};

    if (body.hero) {
      const h = body.hero;
      if (h.mediaType !== undefined) updateData.heroMediaType = h.mediaType;
      if (h.mediaUrl !== undefined) updateData.heroMediaUrl = h.mediaUrl;
      if (h.posterUrl !== undefined) updateData.heroPosterUrl = h.posterUrl;
      if (h.fps !== undefined) updateData.heroFps = h.fps;
      if (h.playbackSpeed !== undefined) updateData.heroPlaybackSpeed = normalizePlaybackSpeed(h.playbackSpeed);
      if (h.loop !== undefined) updateData.heroLoop = h.loop;
      if (h.autoplay !== undefined) updateData.heroAutoplay = h.autoplay;
      if (h.playbackMode !== undefined) updateData.heroPlaybackMode = h.playbackMode;
      if (h.playbackDirection !== undefined) updateData.heroPlaybackDirection = h.playbackDirection;
      if (h.positioning !== undefined) updateData.heroPositioning = h.positioning;
      if (h.frameCount !== undefined) updateData.heroFrameCount = h.frameCount;
      if (h.frames !== undefined) {
        updateData.heroFramesJson = Array.isArray(h.frames) ? JSON.stringify(h.frames) : null;
      }

      // Cor de fundo automática do Hero Desktop (mantendo suporte aos campos legados)
      if (h.bgMode !== undefined) {
        updateData.heroBgMode = h.bgMode === "MANUAL" ? "MANUAL" : "AUTO";
      }
      if (h.bgDetectedColor !== undefined) {
        updateData.heroBgDetectedColor =
          h.bgDetectedColor && isValidHexColor(h.bgDetectedColor)
            ? normalizeHexColor(h.bgDetectedColor)
            : null;
      }
      if (h.bgCustomColor !== undefined) {
        updateData.heroBgCustomColor =
          h.bgCustomColor && isValidHexColor(h.bgCustomColor)
            ? normalizeHexColor(h.bgCustomColor)
            : null;
      }
      if (h.bgStatus !== undefined) updateData.heroBgStatus = h.bgStatus;
      if (h.bgMediaRef !== undefined) updateData.heroBgMediaRef = h.bgMediaRef;
    }

    if (body.heroMobile) {
      const hm = body.heroMobile;
      if (hm.mediaType !== undefined) updateData.heroMobileMediaType = hm.mediaType;
      if (hm.mediaUrl !== undefined) updateData.heroMobileMediaUrl = hm.mediaUrl;
      if (hm.posterUrl !== undefined) updateData.heroMobilePosterUrl = hm.posterUrl;
      if (hm.fps !== undefined) updateData.heroMobileFps = hm.fps;
      if (hm.playbackSpeed !== undefined) {
        updateData.heroMobilePlaybackSpeed = normalizePlaybackSpeed(hm.playbackSpeed);
      }
      if (hm.loop !== undefined) updateData.heroMobileLoop = hm.loop;
      if (hm.autoplay !== undefined) updateData.heroMobileAutoplay = hm.autoplay;
      if (hm.playbackMode !== undefined) updateData.heroMobilePlaybackMode = hm.playbackMode;
      if (hm.playbackDirection !== undefined) {
        updateData.heroMobilePlaybackDirection = hm.playbackDirection;
      }
      if (hm.positioning !== undefined) updateData.heroMobilePositioning = hm.positioning;
      if (hm.frameCount !== undefined) updateData.heroMobileFrameCount = hm.frameCount;
      if (hm.frames !== undefined) {
        updateData.heroMobileFramesJson = Array.isArray(hm.frames) ? JSON.stringify(hm.frames) : null;
      }
      if (hm.bgDetectedColor !== undefined) {
        updateData.heroMobileBgDetectedColor =
          hm.bgDetectedColor && isValidHexColor(hm.bgDetectedColor)
            ? normalizeHexColor(hm.bgDetectedColor)
            : null;
      }
      if (hm.bgStatus !== undefined) updateData.heroMobileBgStatus = hm.bgStatus;
      if (hm.bgMediaRef !== undefined) updateData.heroMobileBgMediaRef = hm.bgMediaRef;
    }

    if (body.about) {
      const a = body.about;
      if (a.mediaType !== undefined) updateData.aboutMediaType = a.mediaType;
      if (a.mediaUrl !== undefined) updateData.aboutMediaUrl = a.mediaUrl;
      if (a.posterUrl !== undefined) updateData.aboutPosterUrl = a.posterUrl;
      if (a.fps !== undefined) updateData.aboutFps = a.fps;
      if (a.playbackSpeed !== undefined) updateData.aboutPlaybackSpeed = normalizePlaybackSpeed(a.playbackSpeed);
      if (a.loop !== undefined) updateData.aboutLoop = a.loop;
      if (a.autoplay !== undefined) updateData.aboutAutoplay = a.autoplay;
      if (a.playbackMode !== undefined) updateData.aboutPlaybackMode = a.playbackMode;
      if (a.playbackDirection !== undefined) updateData.aboutPlaybackDirection = a.playbackDirection;
      if (a.positioning !== undefined) updateData.aboutPositioning = a.positioning;
      if (a.frameCount !== undefined) updateData.aboutFrameCount = a.frameCount;
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

    try {
      revalidatePath("/");
      revalidatePath("/site");
      revalidatePath("/admin/configuracoes");
    } catch (revalErr) {
      console.warn("Aviso ao revalidar rotas do MiniSite:", revalErr);
    }

    return NextResponse.json({
      success: true,
      message: "Configurações de mídia do Site salvas com sucesso!",
      site: updated,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao atualizar configurações de mídia do Site:", error);
    return NextResponse.json({ error: "Erro interno ao salvar configurações de mídia." }, { status: 500 });
  }
}
