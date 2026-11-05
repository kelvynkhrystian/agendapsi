import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePatient } from "@/lib/auth";

const profileUpdateSchema = z.object({
  fullName: z.string().trim().min(2, "Nome deve ter no mínimo 2 caracteres").max(120, "Nome muito longo"),
  cpf: z.string().trim().optional().nullable(),
  birthDate: z.string().trim().optional().nullable(),
  phone: z.string().trim().min(8, "Telefone deve ter no mínimo 8 dígitos").max(30, "Telefone muito longo"),
  gender: z.string().trim().max(50).optional().nullable(),
  address: z.string().trim().max(255).optional().nullable(),
  emergencyContact: z.string().trim().max(255).optional().nullable(),
});

function isValidCpfFormat(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false; // todos os dígitos iguais
  return true;
}

export async function GET() {
  try {
    const session = await requirePatient();

    const patient = await prisma.patient.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        cpf: true,
        birthDate: true,
        isMinor: true,
        gender: true,
        address: true,
        emergencyContact: true,
        mustChangePassword: true,
        guardians: {
          select: {
            id: true,
            fullName: true,
            cpf: true,
            phone: true,
            relationship: true,
          },
        },
      },
    });

    if (!patient) {
      return NextResponse.json({ error: "Paciente não encontrado." }, { status: 404 });
    }

    const sys = await prisma.systemSettings.findFirst();
    const emailDeliveryConfigured = !!(sys?.smtpEnabled && sys?.smtpHost && sys?.smtpUser);

    return NextResponse.json({
      success: true,
      patient,
      emailDeliveryConfigured,
    });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message.includes("FORBIDDEN"))) {
      return NextResponse.json({ error: "Acesso restrito ao paciente autenticado." }, { status: 403 });
    }
    console.error("Erro ao carregar perfil do paciente:", error);
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requirePatient();
    const body = await req.json();
    const result = profileUpdateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = result.data;
    let cleanCpf: string | null = null;

    if (data.cpf && data.cpf.trim() !== "") {
      const digits = data.cpf.replace(/\D/g, "");
      if (!isValidCpfFormat(digits)) {
        return NextResponse.json({ error: "CPF informado é inválido." }, { status: 400 });
      }
      cleanCpf = digits;

      // Validação de unicidade de CPF entre pacientes
      const existingCpf = await prisma.patient.findFirst({
        where: {
          cpf: cleanCpf,
          id: { not: session.userId },
        },
      });

      if (existingCpf) {
        return NextResponse.json(
          { error: "Este CPF já está cadastrado para outro paciente." },
          { status: 400 }
        );
      }
    }

    let parsedBirthDate: Date | null = null;
    if (data.birthDate && data.birthDate.trim() !== "") {
      const dateVal = new Date(data.birthDate);
      if (!isNaN(dateVal.getTime())) {
        parsedBirthDate = dateVal;
      }
    }

    const updatedPatient = await prisma.patient.update({
      where: { id: session.userId },
      data: {
        fullName: data.fullName,
        phone: data.phone,
        cpf: cleanCpf,
        birthDate: parsedBirthDate,
        gender: data.gender || null,
        address: data.address || null,
        emergencyContact: data.emergencyContact || null,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        cpf: true,
        birthDate: true,
        gender: true,
        address: true,
        emergencyContact: true,
        isMinor: true,
        guardians: {
          select: {
            id: true,
            fullName: true,
            cpf: true,
            phone: true,
            relationship: true,
          },
        },
      },
    });

    // Auditoria segura sem expor dados confidenciais
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        userRole: "PATIENT",
        action: "PATIENT_PROFILE_UPDATED",
        resource: "Patient",
        resourceId: session.userId,
        details: JSON.stringify({
          updatedFields: Object.keys(data).filter(
            (k) => data[k as keyof typeof data] !== undefined && data[k as keyof typeof data] !== null
          ),
          hasCpf: !!cleanCpf,
        }),
        ipAddress,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Perfil atualizado com sucesso.",
      patient: updatedPatient,
    });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message.includes("FORBIDDEN"))) {
      return NextResponse.json({ error: "Acesso restrito ao paciente autenticado." }, { status: 403 });
    }
    console.error("Erro ao atualizar perfil do paciente:", error);
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}

export const PUT = PATCH;

