import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import {
  createReadableFileStream,
  getDefaultStorageRoots,
  resolveSafeBackupFilePath,
} from "@/lib/backup";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await context.params;

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Identificador de backup inválido." }, { status: 400 });
    }

    const job = await prisma.backupJob.findUnique({
      where: { id },
    });

    if (!job) {
      return NextResponse.json({ error: "Registro de backup não encontrado." }, { status: 404 });
    }

    const roots = getDefaultStorageRoots();
    let safePath: string;
    try {
      safePath = resolveSafeBackupFilePath(roots.backupDir, job.filename);
    } catch {
      return NextResponse.json({ error: "Caminho de arquivo de backup inválido." }, { status: 400 });
    }

    let stat;
    try {
      stat = await fs.stat(safePath);
      if (!stat.isFile()) {
        return NextResponse.json({ error: "Arquivo de backup não encontrado em disco." }, { status: 404 });
      }
    } catch {
      return NextResponse.json(
        { error: "O arquivo de backup não está disponível no armazenamento privado." },
        { status: 404 }
      );
    }

    const isZip = job.filename.toLowerCase().endsWith(".zip");
    const contentType = isZip ? "application/zip" : "application/json; charset=utf-8";
    const safeDownloadName = job.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const stream = createReadableFileStream(safePath);

    return new NextResponse(stream, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${safeDownloadName}"`,
        "Content-Length": String(stat.size),
        "Cache-Control": "private, no-store, no-cache, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao baixar backup:", error);
    return NextResponse.json({ error: "Erro interno ao preparar o download do backup." }, { status: 500 });
  }
}
