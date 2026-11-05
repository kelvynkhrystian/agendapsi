import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePatient } from "@/lib/auth";

export async function GET() {
  try {
    const session = await requirePatient();

    const shares = await prisma.storedFileShare.findMany({
      where: {
        patientId: session.userId,
      },
      include: {
        file: true,
      },
      orderBy: { sharedAt: "desc" },
    });

    const now = new Date();
    const documents = shares.map((s) => {
      const isExpired = s.expiresAt ? new Date(s.expiresAt) < now : false;
      const isRevoked = !s.canDownload || !!s.revokedAt;
      const isActive = !isExpired && !isRevoked;

      // Calcular validade restante em dias
      let remainingDays: number | null = null;
      if (s.expiresAt && !isExpired) {
        remainingDays = Math.max(
          0,
          Math.ceil((new Date(s.expiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        );
      }

      return {
        id: s.file.id,
        shareId: s.id,
        name: s.file.title || s.file.originalName,
        originalName: s.file.originalName,
        description: s.file.description || null,
        mimeType: s.file.mimeType,
        sizeBytes: s.file.sizeBytes,
        sharedAt: s.sharedAt.toISOString(),
        expiresAt: s.expiresAt ? s.expiresAt.toISOString() : null,
        isExpired,
        isRevoked,
        canDownload: isActive,
        remainingDays,
      };
    });

    return NextResponse.json(documents, {
      headers: {
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message.includes("FORBIDDEN"))) {
      return NextResponse.json({ error: "Acesso restrito ao paciente." }, { status: 403 });
    }
    console.error("Erro ao listar documentos do paciente:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
