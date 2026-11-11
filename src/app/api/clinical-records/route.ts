import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { isRestoreInProgress, RESTORE_MAINTENANCE_MESSAGE } from "@/lib/backup";

const recordSchema = z.object({
  patientId: z.string().min(1, "Paciente é obrigatório"),
  appointmentId: z.string().optional(),
  sessionDate: z.string().datetime(),
  noteRichText: z.string().min(1, "O conteúdo do prontuário é obrigatório"),
  summary: z.string().optional(),
  moodRating: z.number().int().min(1).max(10).optional(),
});

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId");

    const where: Record<string, unknown> = {};
    if (patientId) where.patientId = patientId;

    const records = await prisma.clinicalRecord.findMany({
      where,
      include: {
        patient: { select: { fullName: true, phone: true } },
        appointment: { select: { startAt: true, service: { select: { name: true } } } },
        revisions: { orderBy: { revisedAt: "desc" } },
        attachments: true,
      },
      orderBy: { sessionDate: "desc" },
    });

    return NextResponse.json(records);
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Acesso restrito ao profissional." }, { status: 403 });
    }
    console.error("Erro ao listar prontuários:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminSession = await requireAdmin();
    if (await isRestoreInProgress()) {
      return NextResponse.json({ error: RESTORE_MAINTENANCE_MESSAGE }, { status: 503 });
    }
    const body = await req.json();
    const result = recordSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = result.data;

    const record = await prisma.clinicalRecord.create({
      data: {
        patientId: data.patientId,
        appointmentId: data.appointmentId,
        sessionDate: new Date(data.sessionDate),
        noteRichText: data.noteRichText,
        summary: data.summary,
        moodRating: data.moodRating,
      },
    });

    // Auditoria
    await prisma.auditLog.create({
      data: {
        userId: adminSession.userId,
        userRole: "ADMIN",
        action: "CLINICAL_RECORD_CREATED",
        resource: "ClinicalRecord",
        resourceId: record.id,
        details: JSON.stringify({ patientId: data.patientId, moodRating: data.moodRating }),
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Acesso restrito ao profissional." }, { status: 403 });
    }
    console.error("Erro ao criar prontuário:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
