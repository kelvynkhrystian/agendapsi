import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

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
          where: {
            patientId: session.userId,
          },
        },
      },
    });

    if (!file) {
      return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 });
    }

    // Se for Paciente, valida se existe concessão de acesso não expirada
    if (session.role === "PATIENT") {
      const activeShare = file.shares.find(
        (s) => !s.expiresAt || s.expiresAt > new Date()
      );

      if (!activeShare) {
        return NextResponse.json(
          { error: "Acesso não autorizado ou prazo de compartilhamento deste documento expirado." },
          { status: 403 }
        );
      }
    }

    const baseDir = path.join(/*turbopackIgnore: true*/ process.cwd(), process.env.STORAGE_DIR || "storage/uploads");
    const safePath = path.join(/*turbopackIgnore: true*/ baseDir, path.basename(file.storedFileName));

    if (!safePath.startsWith(baseDir)) {
      return NextResponse.json({ error: "Acesso inválido ao sistema de arquivos." }, { status: 403 });
    }

    const fileBuffer = await fs.readFile(/*turbopackIgnore: true*/ safePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(file.originalName)}"`,
        "Content-Length": String(fileBuffer.length),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }
    console.error("Erro no download de arquivo:", error);
    return NextResponse.json({ error: "Erro ao baixar arquivo." }, { status: 500 });
  }
}
