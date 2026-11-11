import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  getDefaultStorageRoots,
  getTrackedBackupJobStatus,
  isRestoreInProgress,
} from "@/lib/backup";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const roots = getDefaultStorageRoots();
    const jobId = req.nextUrl.searchParams.get("jobId");

    const [job, restoreInProgress] = await Promise.all([
      getTrackedBackupJobStatus(roots, jobId),
      isRestoreInProgress(roots),
    ]);

    const active = Boolean(
      job && (job.status === "RUNNING" || job.status === "CANCELLING")
    );

    return NextResponse.json(
      {
        active,
        job,
        restoreInProgress,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao consultar progresso do backup:", error);
    return NextResponse.json({ error: "Erro interno ao consultar progresso do backup." }, { status: 500 });
  }
}
