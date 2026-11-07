import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireAuth } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const file = await prisma.storedFile.findUnique({
      where: { id },
      include: {
        shares: {
          include: {
            patient: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        },
        clinicalRecord: {
          select: {
            id: true,
            sessionDate: true,
          },
        },
      },
    });

    if (!file) {
      return NextResponse.json({ error: "Documento não encontrado." }, { status: 404 });
    }

    // Se for paciente, só pode consultar se o documento tiver sido compartilhado com ele
    if (session.role === "PATIENT") {
      const isSharedWithUser = file.shares.some((s) => s.patientId === session.userId);
      if (!isSharedWithUser) {
        return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
      }
    }

    return NextResponse.json(file);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }
    console.error("Erro ao obter documento:", error);
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminSession = await requireAdmin();
    const { id } = await params;

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Identificador de documento inválido." }, { status: 400 });
    }

    const file = await prisma.storedFile.findUnique({
      where: { id },
      include: {
        shares: true,
        clinicalRecord: true,
      },
    });

    if (!file) {
      return NextResponse.json({ error: "Documento não encontrado ou já excluído." }, { status: 404 });
    }

    // Proteção legal e clínica: Documentos vinculados a prontuários ativos não podem ser excluídos
    if (file.clinicalRecordId || file.category === "CLINICAL_NOTE_EXPORT") {
      return NextResponse.json(
        {
          error:
            "Este documento está vinculado a um prontuário clínico e deve ser preservado por exigência de retenção legal do CFP/CFM.",
        },
        { status: 400 }
      );
    }

    // Remove arquivo físico se nenhuma outra entidade referenciar o mesmo arquivo
    const storageDir = path.resolve(process.cwd(), process.env.STORAGE_DIR || "storage/uploads");
    const safePath = path.resolve(storageDir, path.basename(file.storedFileName));

    const otherRefs = await prisma.storedFile.count({
      where: {
        storedFileName: file.storedFileName,
        id: { not: file.id },
      },
    });

    if (otherRefs === 0 && safePath.startsWith(storageDir)) {
      try {
        await fs.unlink(safePath);
      } catch (fsError: any) {
        // Se o arquivo já não existir fisicamente no disco, prossegue com a limpeza do banco
        if (fsError.code !== "ENOENT") {
          console.warn("Aviso ao remover arquivo físico:", fsError);
        }
      }
    }

    // Exclusão atômica de compartilhamentos, registro do arquivo e auditoria
    await prisma.$transaction(async (tx) => {
      await tx.storedFileShare.deleteMany({
        where: { fileId: id },
      });

      await tx.storedFile.delete({
        where: { id },
      });

      await tx.auditLog.create({
        data: {
          userId: adminSession.userId,
          userRole: "ADMIN",
          action: "DOCUMENT_DELETED",
          resource: "StoredFile",
          resourceId: file.id,
          details: JSON.stringify({
            title: file.title,
            originalName: file.originalName,
            mimeType: file.mimeType,
            sizeBytes: file.sizeBytes,
            category: file.category,
            sharesRevokedCount: file.shares.length,
          }),
          ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Documento excluído com sucesso.",
    });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message.includes("FORBIDDEN"))) {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao excluir documento:", error);
    return NextResponse.json({ error: "Erro interno ao processar a exclusão do documento." }, { status: 500 });
  }
}
