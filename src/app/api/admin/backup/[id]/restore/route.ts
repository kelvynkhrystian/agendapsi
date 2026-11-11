import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import {
  executeStagedBackupRestoration,
  getDefaultStorageRoots,
  isRestoreInProgress,
  prepareRestorePreview,
} from "@/lib/backup";

const restoreConfirmSchema = z.object({
  confirmation: z.string().min(1, "Digite RESTAURAR para confirmar a operação."),
});

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const roots = getDefaultStorageRoots();

    if (await isRestoreInProgress(roots)) {
      return NextResponse.json(
        { error: "Já existe uma restauração em execução neste momento." },
        { status: 409 }
      );
    }

    const { preview } = await prepareRestorePreview({
      backupId: id,
      db: prisma,
      roots,
    });

    return NextResponse.json({
      success: true,
      preview,
    });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    if (error instanceof Error) {
      if (error.message === "BACKUP_NAO_ENCONTRADO") {
        return NextResponse.json({ error: "Backup não encontrado." }, { status: 404 });
      }
      if (error.message === "BACKUP_LEGADO_NAO_RESTAURAVEL") {
        return NextResponse.json(
          {
            error:
              "Backups legados (.json) contêm apenas manifesto parcial e não podem realizar restauração completa do sistema.",
          },
          { status: 400 }
        );
      }
      if (error.message === "ARQUIVO_BACKUP_AUSENTE") {
        return NextResponse.json(
          { error: "O arquivo de backup não foi localizado no armazenamento privado." },
          { status: 404 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Erro ao inspecionar prévia de restauração:", error);
    return NextResponse.json({ error: "Erro interno ao validar backup." }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const adminSession = await requireAdmin();
    const { id } = await context.params;

    const body = await req.json().catch(() => null);
    const parsed = restoreConfirmSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Confirmação explícita obrigatória." },
        { status: 400 }
      );
    }

    const roots = getDefaultStorageRoots();
    const result = await executeStagedBackupRestoration({
      db: prisma,
      roots,
      backupId: id,
      confirmationText: parsed.data.confirmation,
      adminUserId: adminSession.userId,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    try {
      revalidatePath("/", "layout");
      revalidatePath("/");
      revalidatePath("/agendar");
      revalidatePath("/admin");
      revalidatePath("/admin/arquivos");
    } catch (revalErr) {
      console.warn("Aviso ao revalidar cache após restauração:", revalErr);
    }

    return NextResponse.json({
      success: true,
      message: "Backup restaurado e verificado com sucesso.",
      result,
    });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    if (error instanceof Error) {
      if (error.message === "CONFIRMACAO_INVALIDA") {
        return NextResponse.json(
          { error: "Confirmação inválida. Digite exatamente RESTAURAR para continuar." },
          { status: 400 }
        );
      }
      if (error.message === "RESTAURACAO_EM_ANDAMENTO") {
        return NextResponse.json(
          { error: "Já existe uma restauração em andamento. Aguarde a conclusão." },
          { status: 409 }
        );
      }
      if (error.message === "BACKUP_EM_ANDAMENTO") {
        return NextResponse.json(
          { error: "Há um backup sendo gerado no momento. Aguarde a conclusão ou cancele antes de restaurar." },
          { status: 409 }
        );
      }
      if (error.message === "LIMPEZA_MIDIA_EM_ANDAMENTO") {
        return NextResponse.json(
          { error: "Há uma limpeza de mídias em execução. Aguarde alguns instantes." },
          { status: 409 }
        );
      }
      if (error.message === "BACKUP_NAO_ENCONTRADO") {
        return NextResponse.json({ error: "Backup não encontrado." }, { status: 404 });
      }
      if (error.message === "BACKUP_LEGADO_NAO_RESTAURAVEL") {
        return NextResponse.json(
          {
            error:
              "Backups legados (.json) não suportam restauração completa. Selecione um backup completo em .zip.",
          },
          { status: 400 }
        );
      }
      if (error.message.startsWith("ROLLBACK_EXECUTADO:")) {
        return NextResponse.json(
          { error: error.message.replace(/^ROLLBACK_EXECUTADO:\s*/, "") },
          { status: 500 }
        );
      }
      if (error.message.startsWith("FALHA_CRITICA_RESTAURACAO:")) {
        return NextResponse.json(
          { error: error.message.replace(/^FALHA_CRITICA_RESTAURACAO:\s*/, "") },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Erro crítico na restauração do backup:", error);
    return NextResponse.json({ error: "Erro interno durante a restauração." }, { status: 500 });
  }
}
