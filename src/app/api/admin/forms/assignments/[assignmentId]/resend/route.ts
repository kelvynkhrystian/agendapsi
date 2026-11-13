import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    await requireAdmin();
    const { assignmentId } = await params;

    const assignment = await prisma.patientFormAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        patient: true,
        template: true,
      },
    });

    if (!assignment) {
      return NextResponse.json({ error: "Atribuição não encontrada." }, { status: 404 });
    }

    if (assignment.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Este formulário já foi respondido pelo paciente." },
        { status: 400 }
      );
    }

    const snapshot = assignment.snapshot as any;
    const formTitle = snapshot?.title || assignment.template?.title || "Formulário";

    // Cria notificação reenviada
    await prisma.notification.create({
      data: {
        recipientId: assignment.patientId,
        recipientRole: "PATIENT",
        eventType: "FORM_REMINDER",
        title: "Lembrete: Formulário pendente de preenchimento",
        message: `Lembramos que o formulário "${formTitle}" está disponível para você responder na sua área do paciente.`,
        targetUrl: `/paciente/formularios/${assignment.id}`,
        relatedEntityType: "FORM_ASSIGNMENT",
        relatedEntityId: assignment.id,
      },
    });

    // Se estiver expirado ou cancelado, reativa para PENDING ao reenviar
    if (assignment.status === "EXPIRED" || assignment.status === "CANCELLED") {
      await prisma.patientFormAssignment.update({
        where: { id: assignment.id },
        data: {
          status: "PENDING",
        },
      });
    }

    return NextResponse.json({ message: "Notificação reenviada com sucesso." });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
    }
    console.error("Erro ao reenviar notificação:", error);
    return NextResponse.json({ error: "Erro interno ao reenviar notificação." }, { status: 500 });
  }
}
