import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { dispatchNotification } from "@/lib/notifications";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminSession = await requireAdmin();
    const { id: patientId } = await params;

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, fullName: true },
    });

    if (!patient) {
      return NextResponse.json({ error: "Paciente não encontrado." }, { status: 404 });
    }

    // Localiza a submissão ativa mais recente
    const activeSubmissions = await prisma.anamnesisSubmission.findMany({
      where: {
        patientId,
        status: { in: ["PENDING_REVIEW", "APPROVED"] },
      },
    });

    if (activeSubmissions.length === 0) {
      return NextResponse.json(
        { error: "Nenhuma ficha de anamnese ativa foi localizada para este paciente." },
        { status: 400 }
      );
    }

    // Invalida a ficha ativa anterior, marcando-a como REVISION_REQUESTED
    const updatedSubmissions = await prisma.anamnesisSubmission.updateMany({
      where: {
        patientId,
        status: { in: ["PENDING_REVIEW", "APPROVED"] },
      },
      data: {
        status: "REVISION_REQUESTED",
        reviewedAt: new Date(),
        reviewerNotes: "O profissional solicitou o preenchimento de uma nova ficha de anamnese.",
      },
    });

    // Auditoria
    await prisma.auditLog.create({
      data: {
        userId: adminSession.userId,
        userRole: "ADMIN",
        action: "ANAMNESIS_RESET_REQUESTED",
        resource: "AnamnesisSubmission",
        resourceId: activeSubmissions[0].id,
        details: JSON.stringify({
          patientId,
          patientName: patient.fullName,
          supersededCount: updatedSubmissions.count,
        }),
        ipAddress: _req.headers.get("x-forwarded-for") || "127.0.0.1",
      },
    });

    // Notificação ao Paciente
    await dispatchNotification({
      recipientId: patient.id,
      recipientRole: "PATIENT",
      eventType: "ANAMNESIS_RESET_REQUESTED",
      targetUrl: "/paciente/anamnese",
      relatedEntityType: "AnamnesisSubmission",
      relatedEntityId: activeSubmissions[0].id,
      vars: {
        patientName: patient.fullName,
      },
      idempotencyKey: `anamnesis-reset-${patient.id}-${Date.now()}`,
    });

    return NextResponse.json({
      success: true,
      message: `Novo preenchimento de anamnese solicitado com sucesso. A ficha anterior foi arquivada no histórico e o paciente receberá o novo formulário para preencher.`,
      supersededCount: updatedSubmissions.count,
    });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao solicitar nova anamnese:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
