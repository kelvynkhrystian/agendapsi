import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import {
  getDefaultStorageRoots,
  importBackupArchive,
  isRestoreInProgress,
  MAX_BACKUP_IMPORT_BYTES,
} from "@/lib/backup";

export async function POST(req: NextRequest) {
  try {
    const adminSession = await requireAdmin();
    const roots = getDefaultStorageRoots();

    if (await isRestoreInProgress(roots)) {
      return NextResponse.json(
        { error: "Há uma restauração de backup em andamento. Aguarde a conclusão antes de importar novos arquivos." },
        { status: 409 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Selecione um arquivo de backup .zip do PSI para importar." },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "O arquivo enviado está vazio." }, { status: 400 });
    }

    if (file.size > MAX_BACKUP_IMPORT_BYTES) {
      return NextResponse.json(
        { error: "O arquivo de backup excede o limite máximo permitido de 512 MB." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await importBackupArchive({
      db: prisma,
      roots,
      fileBuffer: buffer,
      originalFilename: file.name || "backup.zip",
      adminUserId: adminSession.userId,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json(
      {
        success: true,
        message:
          "Backup validado e importado com sucesso. Revise o resumo abaixo antes de confirmar a restauração.",
        backup: result.backup,
        preview: result.preview,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    if (error instanceof Error && error.message === "RESTAURACAO_EM_ANDAMENTO") {
      return NextResponse.json(
        { error: "Restauração em andamento. Tente novamente após a conclusão." },
        { status: 409 }
      );
    }
    const msg = error instanceof Error ? error.message : "Erro ao validar arquivo de backup enviado.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
