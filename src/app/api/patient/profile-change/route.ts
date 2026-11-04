import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePatient } from "@/lib/auth";

const changeRequestSchema = z.object({
  field: z.enum(["fullName", "cpf", "birthDate", "email"]),
  newValue: z.string().min(1, "Novo valor é obrigatório"),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requirePatient();
    const body = await req.json();
    const result = changeRequestSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { field, newValue } = result.data;

    // Busca valor atual no paciente
    const patient = await prisma.patient.findUnique({
      where: { id: session.userId },
    });

    if (!patient) {
      return NextResponse.json({ error: "Paciente não encontrado." }, { status: 404 });
    }

    let oldValue = "";
    if (field === "fullName") oldValue = patient.fullName;
    else if (field === "cpf") oldValue = patient.cpf || "";
    else if (field === "birthDate") oldValue = patient.birthDate ? patient.birthDate.toISOString().slice(0, 10) : "";
    else if (field === "email") oldValue = patient.email;

    const request = await prisma.patientProfileChangeRequest.create({
      data: {
        patientId: patient.id,
        field,
        oldValue,
        newValue,
        status: "PENDING",
      },
    });

    // Auditoria
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        userRole: "PATIENT",
        action: "PROFILE_CHANGE_REQUESTED",
        resource: "PatientProfileChangeRequest",
        resourceId: request.id,
        details: JSON.stringify({ field, oldValue, newValue }),
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Solicitação de alteração enviada para aprovação do profissional.",
      request,
    });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message.includes("FORBIDDEN"))) {
      return NextResponse.json({ error: "Acesso restrito ao paciente." }, { status: 403 });
    }
    console.error("Erro na solicitação de alteração:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
