import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const isInlineView = searchParams.get("view") === "inline" || searchParams.get("inline") === "true";

    const file = await prisma.storedFile.findUnique({
      where: { id },
      include: {
        shares: {
          where: {
            patientId: session.userId,
          },
        },
      },
    });

    if (!file) {
      return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 });
    }

    // Validação estrita para Pacientes (LGPD & Sigilo)
    if (session.role === "PATIENT") {
      const share = file.shares[0];

      if (!share) {
        return NextResponse.json(
          { error: "Acesso não autorizado. Este documento não foi compartilhado com sua conta." },
          { status: 403 }
        );
      }

      if (!share.canDownload || share.revokedAt) {
        return NextResponse.json(
          { error: "O acesso a este documento foi revogado pelo profissional." },
          { status: 403 }
        );
      }

      if (share.expiresAt && share.expiresAt < new Date()) {
        return NextResponse.json(
          { error: "O prazo de compartilhamento deste documento expirou." },
          { status: 403 }
        );
      }
    }

    const baseDir = path.resolve(process.cwd(), process.env.STORAGE_DIR || "storage/uploads");
    const safePath = path.resolve(baseDir, path.basename(file.storedFileName));

    if (!safePath.startsWith(baseDir)) {
      return NextResponse.json({ error: "Acesso inválido ao sistema de arquivos." }, { status: 403 });
    }

    try {
      const fileBuffer = await fs.readFile(safePath);
      const dispositionType = isInlineView ? "inline" : "attachment";
      const fileNameToUse = file.title
        ? `${file.title.replace(/[^a-zA-Z0-9._-]/g, "_")}${path.extname(file.originalName)}`
        : file.originalName;

      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          "Content-Type": file.mimeType || "application/octet-stream",
          "Content-Disposition": `${dispositionType}; filename="${encodeURIComponent(fileNameToUse)}"`,
          "Content-Length": String(fileBuffer.length),
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
        },
      });
    } catch (fsError) {
      console.error("Arquivo físico não encontrado em disco:", safePath, fsError);
      return NextResponse.json(
        { error: "O arquivo físico não foi encontrado no armazenamento protegido do servidor." },
        { status: 404 }
      );
    }
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }
    console.error("Erro no download de arquivo:", error);
    return NextResponse.json({ error: "Erro ao processar arquivo." }, { status: 500 });
  }
}
