import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { deleteBackupArchiveAndRecord, getDefaultStorageRoots } from "@/lib/backup";

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const adminSession = await requireAdmin();
    const { id } = await context.params;

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Identificador de backup inválido." }, { status: 400 });
    }

    const roots = getDefaultStorageRoots();
    const result = await deleteBackupArchiveAndRecord({
      db: prisma,
      roots,
      backupId: id,
      adminUserId: adminSession.userId,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({
      success: true,
      message: `Backup "${result.filename}" excluído com sucesso.`,
      deletedId: result.deletedId,
      filename: result.filename,
    });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    if (error instanceof Error) {
      if (error.message === "BACKUP_NAO_ENCONTRADO") {
        return NextResponse.json({ error: "Backup não encontrado." }, { status: 404 });
      }
      if (error.message === "RESTAURACAO_EM_ANDAMENTO") {
        return NextResponse.json(
          { error: "Não é possível excluir um backup enquanto uma restauração estiver em andamento." },
          { status: 409 }
        );
      }
      if (error.message === "BACKUP_EM_ANDAMENTO") {
        return NextResponse.json(
          { error: "Não é possível excluir um backup enquanto uma cópia de segurança estiver sendo gerada." },
          { status: 409 }
        );
      }
      if (
        error.message === "CAMINHO_BACKUP_INVALIDO" ||
        error.message === "CAMINHO_BACKUP_FORA_DIRETORIO"
      ) {
        return NextResponse.json({ error: "Caminho de backup inválido." }, { status: 400 });
      }
    }
    console.error("Erro ao excluir backup:", error);
    return NextResponse.json({ error: "Erro interno ao excluir backup." }, { status: 500 });
  }
}
