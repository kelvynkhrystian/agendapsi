import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { getDefaultStorageRoots, requestBackupCancellation } from "@/lib/backup";

const cancelSchema = z
  .object({
    jobId: z.string().min(1).optional(),
  })
  .optional();

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    let rawBody: unknown = undefined;
    try {
      const text = await req.text();
      if (text.trim()) {
        rawBody = JSON.parse(text);
      }
    } catch {
      return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
    }

    const parsed = cancelSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: "Parâmetros de cancelamento inválidos." }, { status: 400 });
    }

    const roots = getDefaultStorageRoots();
    const result = await requestBackupCancellation({
      roots,
      jobId: parsed.data?.jobId ?? null,
    });

    if (result.nonCancellableStage) {
      return NextResponse.json(
        {
          cancelled: false,
          nonCancellableStage: true,
          error: result.message,
          job: result.snapshot,
        },
        { status: 409 }
      );
    }

    if (result.notActive) {
      return NextResponse.json(
        {
          cancelled: false,
          notActive: true,
          error: result.message,
          job: null,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      cancelled: result.cancelled,
      message: result.message,
      job: result.snapshot,
    });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao cancelar backup:", error);
    return NextResponse.json({ error: "Erro interno ao cancelar geração de backup." }, { status: 500 });
  }
}
