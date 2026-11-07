import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const patientUpdateSchema = z.object({
  fullName: z.string().min(3).optional(),
  phone: z.string().min(8).optional(),
  cpf: z.string().optional(),
  birthDate: z.string().optional(),
  gender: z.string().optional(),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        guardians: true,
        appointments: {
          include: { service: true, payment: true, videoMeeting: true },
          orderBy: { startAt: "desc" },
        },
        profileChanges: {
          orderBy: { createdAt: "desc" },
        },
        anamnesisSubmits: {
          include: { template: true },
          orderBy: { createdAt: "desc" },
        },
        clinicalRecords: {
          include: {
            revisions: { orderBy: { revisedAt: "desc" } },
            appointment: { include: { service: true } },
          },
          orderBy: { sessionDate: "desc" },
        },
        fileShares: {
          include: { file: true },
          orderBy: { sharedAt: "desc" },
        },
        payments: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!patient) {
      return NextResponse.json({ error: "Paciente não encontrado." }, { status: 404 });
    }

    return NextResponse.json(patient);
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao carregar paciente:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminSession = await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const result = patientUpdateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = result.data;
    const updated = await prisma.patient.update({
      where: { id },
      data: {
        ...data,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
      },
    });

    // Auditoria
    await prisma.auditLog.create({
      data: {
        userId: adminSession.userId,
        userRole: "ADMIN",
        action: "PATIENT_UPDATED_BY_ADMIN",
        resource: "Patient",
        resourceId: id,
        details: JSON.stringify(data),
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      },
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao atualizar paciente:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminSession = await requireAdmin();
    const { id } = await params;
    const { searchParams } = new URL(req.url);

    let action = searchParams.get("action")?.toUpperCase();
    if (!action) {
      try {
        const body = await req.json();
        if (body && body.action) action = String(body.action).toUpperCase();
      } catch {
        // Sem corpo json, mantém ação padrão
      }
    }

    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            clinicalRecords: true,
            appointments: true,
            payments: true,
          },
        },
      },
    });

    if (!patient) {
      return NextResponse.json({ error: "Paciente não encontrado ou já excluído." }, { status: 404 });
    }

    const hasProtectedRecords =
      patient._count.clinicalRecords > 0 ||
      patient._count.appointments > 0 ||
      patient._count.payments > 0;

    // Ação: ARQUIVAR / DESATIVAR
    if (action === "ARCHIVE") {
      await prisma.$transaction(async (tx) => {
        await tx.patient.update({
          where: { id },
          data: { isActive: false },
        });

        // Revoga sessões ativas do paciente para impedir login
        await tx.session.deleteMany({
          where: { userId: id },
        });

        // Revoga compartilhamentos de arquivos ativos
        await tx.storedFileShare.updateMany({
          where: { patientId: id, canDownload: true },
          data: { canDownload: false, revokedAt: new Date() },
        });

        await tx.auditLog.create({
          data: {
            userId: adminSession.userId,
            userRole: "ADMIN",
            action: "PATIENT_ARCHIVED",
            resource: "Patient",
            resourceId: id,
            details: JSON.stringify({
              fullName: patient.fullName,
              email: patient.email,
              clinicalRecordsCount: patient._count.clinicalRecords,
              appointmentsCount: patient._count.appointments,
            }),
            ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
          },
        });
      });

      return NextResponse.json({
        success: true,
        action: "ARCHIVED",
        message: "Paciente arquivado com sucesso. O acesso ao consultório foi desativado e os registros clínicos foram preservados.",
      });
    }

    // Ação: RESTAURAR
    if (action === "RESTORE") {
      await prisma.patient.update({
        where: { id },
        data: { isActive: true },
      });

      await prisma.auditLog.create({
        data: {
          userId: adminSession.userId,
          userRole: "ADMIN",
          action: "PATIENT_RESTORED",
          resource: "Patient",
          resourceId: id,
          details: JSON.stringify({
            fullName: patient.fullName,
            email: patient.email,
          }),
          ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
        },
      });

      return NextResponse.json({
        success: true,
        action: "RESTORED",
        message: "Paciente restaurado com sucesso para a lista ativa.",
      });
    }

    // Ação: EXCLUSÃO PERMANENTE
    if (hasProtectedRecords) {
      return NextResponse.json(
        {
          error:
            "Não é permitido excluir permanentemente este paciente pois existem registros clínicos ou financeiros protegidos por lei (CFP/CFM e normas fiscais). Utilize a opção de Arquivar.",
          canPermanentlyDelete: false,
          hasProtectedRecords: true,
        },
        { status: 400 }
      );
    }

    // Exclusão física permanente segura de registros secundários órfãos e da conta
    await prisma.$transaction(async (tx) => {
      await tx.storedFileShare.deleteMany({ where: { patientId: id } });
      await tx.anamnesisSubmission.deleteMany({ where: { patientId: id } });
      await tx.appointmentPackage.deleteMany({ where: { patientId: id } });
      await tx.appointmentHold.deleteMany({ where: { patientId: id } });
      await tx.guardian.deleteMany({ where: { patientId: id } });
      await tx.consentAcceptance.deleteMany({ where: { patientId: id } });
      await tx.patientProfileChangeRequest.deleteMany({ where: { patientId: id } });
      await tx.patientEmailChangeToken.deleteMany({ where: { patientId: id } });
      await tx.session.deleteMany({ where: { userId: id } });
      await tx.notification.deleteMany({ where: { recipientId: id } });

      await tx.patient.delete({
        where: { id },
      });

      await tx.auditLog.create({
        data: {
          userId: adminSession.userId,
          userRole: "ADMIN",
          action: "PATIENT_PERMANENTLY_DELETED",
          resource: "Patient",
          resourceId: id,
          details: JSON.stringify({
            fullName: patient.fullName,
            email: patient.email,
          }),
          ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
        },
      });
    });

    return NextResponse.json({
      success: true,
      action: "DELETED",
      message: "Paciente excluído permanentemente com sucesso.",
    });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message.includes("FORBIDDEN"))) {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao processar exclusão do paciente:", error);
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}

