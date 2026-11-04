import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const updateSchema = z.object({
  noteRichText: z.string().min(1),
  summary: z.string().optional(),
  moodRating: z.number().int().min(1).max(10).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const record = await prisma.clinicalRecord.findUnique({
      where: { id },
      include: {
        patient: true,
        revisions: { orderBy: { revisedAt: "desc" } },
      },
    });

    if (!record) {
      return NextResponse.json({ error: "Prontuário não encontrado." }, { status: 404 });
    }

    return NextResponse.json(record);
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Acesso restrito ao profissional." }, { status: 403 });
    }
    console.error("Erro ao carregar prontuário:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminSession = await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const result = updateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { noteRichText, summary, moodRating } = result.data;

    const existing = await prisma.clinicalRecord.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Prontuário não encontrado." }, { status: 404 });
    }

    // Salva revisão anterior e atualiza o prontuário em transação atômica
    const updated = await prisma.$transaction(async (tx) => {
      // 1. Cria snapshot da revisão anterior
      await tx.clinicalRecordRevision.create({
        data: {
          recordId: id,
          contentSnapshot: existing.noteRichText,
          moodRatingSnapshot: existing.moodRating,
          revisedBy: adminSession.userId,
        },
      });

      // 2. Atualiza registro clínico
      const rec = await tx.clinicalRecord.update({
        where: { id },
        data: {
          noteRichText,
          summary,
          moodRating,
        },
      });

      // 3. Auditoria
      await tx.auditLog.create({
        data: {
          userId: adminSession.userId,
          userRole: "ADMIN",
          action: "CLINICAL_RECORD_REVISED",
          resource: "ClinicalRecord",
          resourceId: id,
          ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
        },
      });

      return rec;
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Acesso restrito ao profissional." }, { status: 403 });
    }
    console.error("Erro ao atualizar prontuário:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
