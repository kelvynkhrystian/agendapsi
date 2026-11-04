import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { dispatchNotification } from "@/lib/notifications";

const shareSchema = z.object({
  patientId: z.string().min(1, "Paciente é obrigatório"),
  expiresInDays: z.number().int().min(0).default(30), // 0 = sem expiração (indefinido), 15, 30, 60, 90
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminSession = await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const result = shareSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { patientId, expiresInDays } = result.data;

    const file = await prisma.storedFile.findUnique({
      where: { id },
    });

    if (!file) {
      return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 });
    }

    const expiresAt = expiresInDays > 0 ? new Date(Date.now() + expiresInDays * 86400000) : null;

    const share = await prisma.storedFileShare.create({
      data: {
        fileId: id,
        patientId,
        expiresAt,
      },
    });

    // Auditoria
    await prisma.auditLog.create({
      data: {
        userId: adminSession.userId,
        userRole: "ADMIN",
        action: "FILE_SHARED_WITH_PATIENT",
        resource: "StoredFileShare",
        resourceId: share.id,
        details: JSON.stringify({ fileId: id, patientId, expiresInDays }),
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      },
    });

    // Notificação para o paciente
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (patient) {
      await dispatchNotification({
        recipientId: patient.id,
        recipientRole: "PATIENT",
        eventType: "DOCUMENT_AVAILABLE",
        targetUrl: "/paciente/documentos",
        relatedEntityType: "StoredFileShare",
        relatedEntityId: share.id,
        vars: {
          patientName: patient.fullName,
        },
        idempotencyKey: `file-shared-${share.id}`,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Documento compartilhado com o paciente por ${expiresInDays > 0 ? `${expiresInDays} dias` : "prazo indeterminado"}.`,
      share,
    });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao compartilhar arquivo:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
