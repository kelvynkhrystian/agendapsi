import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import {
  classifyBackupJob,
  collectStorageOverview,
  createFullBackupArchive,
  getDefaultStorageRoots,
  isRestoreInProgress,
  listClassifiedBackups,
} from "@/lib/backup";

export async function GET() {
  try {
    await requireAdmin();
    const roots = getDefaultStorageRoots();
    const [backups, storageStats, restoreInProgress] = await Promise.all([
      listClassifiedBackups(prisma, roots),
      collectStorageOverview(prisma, roots),
      isRestoreInProgress(roots),
    ]);

    return NextResponse.json({
      backups,
      storageStats,
      restoreInProgress,
    });
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

    if (await isRestoreInProgress(roots)) {
      return NextResponse.json(
        { error: "Há uma restauração de backup em andamento. Aguarde a conclusão." },
        { status: 409 }
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
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
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
    console.error("Erro na geração do backup:", error);
    return NextResponse.json({ error: "Erro interno ao gerar backup completo." }, { status: 500 });
  }
}
