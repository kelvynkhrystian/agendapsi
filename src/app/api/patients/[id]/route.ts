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
