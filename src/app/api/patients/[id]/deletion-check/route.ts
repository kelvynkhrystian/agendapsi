import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const patient = await prisma.patient.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        email: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!patient) {
      return NextResponse.json({ error: "Paciente não encontrado." }, { status: 404 });
    }

    const [
      clinicalRecordsCount,
      appointmentsCount,
      paymentsCount,
      appointmentPackagesCount,
      fileSharesCount,
      anamnesisCount,
    ] = await Promise.all([
      prisma.clinicalRecord.count({ where: { patientId: id } }),
      prisma.appointment.count({ where: { patientId: id } }),
      prisma.payment.count({ where: { patientId: id } }),
      prisma.appointmentPackage.count({ where: { patientId: id } }),
      prisma.storedFileShare.count({ where: { patientId: id } }),
      prisma.anamnesisSubmission.count({ where: { patientId: id } }),
    ]);

    const hasProtectedRecords = clinicalRecordsCount > 0 || appointmentsCount > 0 || paymentsCount > 0;
    const canPermanentlyDelete = !hasProtectedRecords;

    let explanation = "";
    if (hasProtectedRecords) {
      const reasons: string[] = [];
      if (clinicalRecordsCount > 0) {
        reasons.push(`${clinicalRecordsCount} nota(s) de prontuário clínico (guarda obrigatória de 20 anos pelo CFP/CFM)`);
      }
      if (appointmentsCount > 0) {
        reasons.push(`${appointmentsCount} agendamento(s) no histórico clínico`);
      }
      if (paymentsCount > 0) {
        reasons.push(`${paymentsCount} registro(s) financeiro(s) ou faturamento`);
      }
      explanation = `Este paciente possui registros protegidos por lei (${reasons.join(", ")}). A exclusão permanente não é permitida por conformidade ética e jurídica, mas você pode arquivar/desativar o paciente.`;
    } else {
      explanation = "Este paciente não possui prontuários clínicos nem histórico de atendimentos e pode ser excluído permanentemente com segurança.";
    }

    return NextResponse.json({
      patient,
      dependencies: {
        clinicalRecordsCount,
        appointmentsCount,
        paymentsCount,
        appointmentPackagesCount,
        fileSharesCount,
        anamnesisCount,
      },
      hasProtectedRecords,
      canPermanentlyDelete,
      explanation,
    });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message.includes("FORBIDDEN"))) {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao verificar dependências do paciente:", error);
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}
