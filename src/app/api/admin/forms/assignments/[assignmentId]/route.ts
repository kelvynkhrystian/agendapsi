import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    await requireAdmin();
    const { assignmentId } = await params;

    const assignment = await prisma.patientFormAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        patient: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            cpf: true,
          },
        },
        template: {
          select: {
            id: true,
            title: true,
            version: true,
          },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json({ error: "Atribuição não encontrada." }, { status: 404 });
    }

    return NextResponse.json({ assignment });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
    }
    console.error("Erro ao obter atribuição:", error);
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { assignmentId } = await params;

    const assignment = await prisma.patientFormAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        patient: {
          select: { id: true, fullName: true },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json({ error: "Atribuição não encontrada." }, { status: 404 });
    }

    // Se estiver concluído, não permitimos exclusão acidental; marcamos como CANCELLED ou exclui se solicitado
    await prisma.patientFormAssignment.update({
      where: { id: assignmentId },
      data: {
        status: "CANCELLED",
      },
    });

    // Registra auditoria
    await prisma.auditLog.create({
      data: {
        userId: admin.userId,
        userRole: admin.role,
        action: "CANCEL_FORM_ASSIGNMENT",
        resource: "PatientFormAssignment",
        resourceId: assignmentId,
        details: JSON.stringify({
          patientId: assignment.patientId,
          patientName: assignment.patient.fullName,
          previousStatus: assignment.status,
        }),
      },
    });

    return NextResponse.json({ message: "Atribuição cancelada com sucesso." });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
    }
    console.error("Erro ao cancelar atribuição:", error);
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}
