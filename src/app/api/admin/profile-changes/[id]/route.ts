import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const reviewSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminSession = await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const result = reviewSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Decisão inválida." }, { status: 400 });
    }

    const { decision } = result.data;

    const request = await prisma.patientProfileChangeRequest.findUnique({
      where: { id },
      include: { patient: true },
    });

    if (!request || request.status !== "PENDING") {
      return NextResponse.json(
        { error: "Solicitação não encontrada ou já processada." },
        { status: 404 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // Atualiza o status da solicitação
      await tx.patientProfileChangeRequest.update({
        where: { id },
        data: {
          status: decision,
          reviewedAt: new Date(),
          reviewedBy: adminSession.userId,
        },
      });

      // Se aprovado, aplica a mudança no paciente
      if (decision === "APPROVED") {
        const updateData: Record<string, unknown> = {};
        if (request.field === "fullName") updateData.fullName = request.newValue;
        else if (request.field === "cpf") updateData.cpf = request.newValue;
        else if (request.field === "birthDate") updateData.birthDate = new Date(request.newValue);
        else if (request.field === "email") updateData.email = request.newValue.trim().toLowerCase();

        await tx.patient.update({
          where: { id: request.patientId },
          data: updateData,
        });
      }

      // Auditoria
      await tx.auditLog.create({
        data: {
          userId: adminSession.userId,
          userRole: "ADMIN",
          action: `PROFILE_CHANGE_${decision}`,
          resource: "PatientProfileChangeRequest",
          resourceId: id,
          details: JSON.stringify({
            patientId: request.patientId,
            field: request.field,
            newValue: request.newValue,
          }),
          ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: `Solicitação ${decision === "APPROVED" ? "aprovada" : "rejeitada"} com sucesso.`,
    });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao revisar alteração cadastral:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
