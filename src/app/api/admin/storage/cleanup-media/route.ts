import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { collectStorageOverview, getDefaultStorageRoots } from "@/lib/backup";
import {
  executeOrphanedSiteMediaCleanup,
  scanOrphanedSiteMedia,
} from "@/lib/site-media-cleanup";

const executeCleanupSchema = z.object({
  confirm: z.literal(true),
  targetRelativeKeys: z.array(z.string().min(1)).optional(),
});

export async function GET() {
  try {
    await requireAdmin();
    const backupRoots = getDefaultStorageRoots();
    const coordRoots = {
      backupDir: backupRoots.backupDir,
      lockFilePath: backupRoots.lockFilePath,
    };

    const [preview, storageStats] = await Promise.all([
      scanOrphanedSiteMedia({ db: prisma, coordRoots }),
      collectStorageOverview(prisma, backupRoots),
    ]);

    return NextResponse.json(
      {
        success: true,
        preview,
        storageStats,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao analisar mídias não utilizadas do Site:", error);
    return NextResponse.json(
      { error: "Erro interno ao analisar mídias não utilizadas." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminSession = await requireAdmin();
    const rawBody = await req.json().catch(() => null);
    const parsed = executeCleanupSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Confirmação explícita obrigatória para executar a limpeza." },
        { status: 400 }
      );
    }

    const backupRoots = getDefaultStorageRoots();
    const coordRoots = {
      backupDir: backupRoots.backupDir,
      lockFilePath: backupRoots.lockFilePath,
    };

    const result = await executeOrphanedSiteMediaCleanup({
      db: prisma,
      coordRoots,
      targetRelativeKeys: parsed.data.targetRelativeKeys,
      adminUserId: adminSession.userId,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    const storageStats = await collectStorageOverview(prisma, backupRoots);

    try {
      revalidatePath("/");
      revalidatePath("/admin/arquivos");
      revalidatePath("/admin/configuracoes");
    } catch {
      // silencioso fora do servidor Next
    }

    const message =
      result.deletedCount > 0
        ? `Limpeza concluída com sucesso: ${result.deletedCount} arquivo(s) não utilizado(s) removido(s).`
        : "Nenhuma mídia não utilizada elegível para remoção foi encontrada.";

    return NextResponse.json({
      success: true,
      message,
      result,
      storageStats,
    });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    if (error instanceof Error) {
      if (error.message === "OPERACAO_BACKUP_OU_RESTAURACAO_ATIVA") {
        return NextResponse.json(
          {
            error:
              "Não é possível limpar mídias enquanto um backup ou restauração está em andamento. Aguarde a conclusão.",
          },
          { status: 409 }
        );
      }
      if (error.message === "LIMPEZA_MIDIA_EM_ANDAMENTO") {
        return NextResponse.json(
          { error: "Já existe uma limpeza de mídias em execução neste momento." },
          { status: 409 }
        );
      }
    }
    console.error("Erro ao executar limpeza de mídias não utilizadas:", error);
    return NextResponse.json(
      { error: "Erro interno ao remover mídias não utilizadas." },
      { status: 500 }
    );
  }
}
