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
    const documents = shares.map((s) => ({
      id: s.file.id,
      shareId: s.id,
      name: s.file.originalName,
      mimeType: s.file.mimeType,
      sizeBytes: s.file.sizeBytes,
      sharedAt: s.sharedAt,
      expiresAt: s.expiresAt,
      isExpired: s.expiresAt ? s.expiresAt < now : false,
      canDownload: s.canDownload && (!s.expiresAt || s.expiresAt >= now),
    }));

    return NextResponse.json(documents);
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message.includes("FORBIDDEN"))) {
      return NextResponse.json({ error: "Acesso restrito ao paciente." }, { status: 403 });
    }
    console.error("Erro ao listar documentos do paciente:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
