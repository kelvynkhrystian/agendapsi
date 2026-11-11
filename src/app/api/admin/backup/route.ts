import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import {
  classifyBackupJob,
  collectStorageOverview,
  createFullBackupArchive,
  getDefaultStorageRoots,
  getTrackedBackupJobStatus,
  isBackupJobActive,
  isRestoreInProgress,
  listClassifiedBackups,
  startTrackedBackupJob,
} from "@/lib/backup";
import { isMediaCleanupInProgress } from "@/lib/site-media-cleanup";

const backupPostSchema = z
  .object({
    mode: z.enum(["async", "sync"]).optional().default("sync"),
  })
  .optional();

export async function GET() {
  try {
    await requireAdmin();
    const roots = getDefaultStorageRoots();
    const [backups, storageStats, restoreInProgress, activeBackupJob, mediaCleanupInProgress] =
      await Promise.all([
        listClassifiedBackups(prisma, roots),
        collectStorageOverview(prisma, roots),
        isRestoreInProgress(roots),
        getTrackedBackupJobStatus(roots),
        isMediaCleanupInProgress({ backupDir: roots.backupDir, lockFilePath: roots.lockFilePath }),
      ]);

    return NextResponse.json(
      {
        backups,
        storageStats,
        restoreInProgress,
        activeBackupJob,
        mediaCleanupInProgress,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao listar backups:", error);
    return NextResponse.json({ error: "Erro interno ao listar backups." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminSession = await requireAdmin();
    const roots = getDefaultStorageRoots();

    let rawBody: unknown = undefined;
    try {
      const text = await req.text();
      if (text.trim()) {
        rawBody = JSON.parse(text);
      }
    } catch {
      return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
    }

    const parsedBody = backupPostSchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
    }

    const mode = parsedBody.data?.mode ?? "sync";
    const ipAddress = req.headers.get("x-forwarded-for") || "127.0.0.1";

    if (await isRestoreInProgress(roots)) {
      return NextResponse.json(
        { error: "Há uma restauração de backup em andamento. Aguarde a conclusão." },
        { status: 409 }
      );
    }

    if (await isBackupJobActive(roots)) {
      return NextResponse.json(
        { error: "Já existe um processo de backup em andamento. Aguarde a conclusão ou cancele o atual." },
        { status: 409 }
      );
    }

    if (await isMediaCleanupInProgress({ backupDir: roots.backupDir, lockFilePath: roots.lockFilePath })) {
      return NextResponse.json(
        { error: "Uma limpeza de mídias não utilizadas está em execução. Aguarde a conclusão." },
        { status: 409 }
      );
    }

    if (mode === "async") {
      const job = await startTrackedBackupJob({
        db: prisma,
        roots,
        adminUserId: adminSession.userId,
        ipAddress,
      });

      return NextResponse.json(
        {
          success: true,
          async: true,
          message: "Criação de backup iniciada em segundo plano.",
          job,
        },
        { status: 202 }
      );
    }

    const created = await createFullBackupArchive({
      db: prisma,
      roots,
      backupType: "MANUAL",
    });

    await prisma.auditLog.create({
      data: {
        userId: adminSession.userId,
        userRole: "ADMIN",
        action: "BACKUP_GENERATED",
        resource: "BackupJob",
        resourceId: created.backupJob.id,
        details: JSON.stringify({
          filename: created.backupJob.filename,
          sizeBytes: created.realSizeBytes,
          checksumSha256: created.backupJob.checksumSha256,
          fileCount: created.manifest.fileCount,
          format: created.manifest.format,
        }),
        ipAddress,
      },
    });

    const enriched = await classifyBackupJob(created.backupJob, roots);

    return NextResponse.json(
      {
        success: true,
        message: "Backup completo (.zip) gerado e verificado com sucesso.",
        backup: enriched,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    if (error instanceof Error) {
      if (error.message === "RESTAURACAO_EM_ANDAMENTO") {
        return NextResponse.json(
          { error: "Há uma restauração de backup em andamento. Aguarde a conclusão." },
          { status: 409 }
        );
      }
      if (error.message === "BACKUP_EM_ANDAMENTO") {
        return NextResponse.json(
          { error: "Já existe um backup em andamento neste momento." },
          { status: 409 }
        );
      }
      if (error.message === "LIMPEZA_MIDIA_EM_ANDAMENTO") {
        return NextResponse.json(
          { error: "Uma limpeza de mídias está em execução. Aguarde alguns instantes." },
          { status: 409 }
        );
      }
    }
    console.error("Erro na geração do backup:", error);
    return NextResponse.json({ error: "Erro interno ao gerar backup completo." }, { status: 500 });
  }
}
