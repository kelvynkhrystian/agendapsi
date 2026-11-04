import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, hashPassword } from "@/lib/auth";

const createPatientAdminSchema = z.object({
  fullName: z.string().min(3, "Nome completo é obrigatório"),
  email: z.string().email("E-mail inválido"),
  phone: z.string().min(8, "Telefone é obrigatório"),
  cpf: z.string().optional(),
  birthDate: z.string().optional(),
  isMinor: z.boolean().default(false),
  gender: z.string().optional(),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  guardianFullName: z.string().optional(),
  guardianCpf: z.string().optional(),
  guardianPhone: z.string().optional(),
  guardianEmail: z.string().optional(),
  guardianRelationship: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";

    const patients = await prisma.patient.findMany({
      where: search
        ? {
            OR: [
              { fullName: { contains: search } },
              { email: { contains: search } },
              { phone: { contains: search } },
            ],
          }
        : undefined,
      include: {
        guardians: true,
        _count: {
          select: {
            appointments: true,
            clinicalRecords: true,
          },
        },
      },
      orderBy: { fullName: "asc" },
    });

    return NextResponse.json(patients);
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao listar pacientes:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminSession = await requireAdmin();
    const body = await req.json();
    const result = createPatientAdminSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = result.data;
    const normalizedEmail = data.email.trim().toLowerCase();

    const existing = await prisma.patient.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Já existe um paciente cadastrado com este e-mail." },
        { status: 409 }
      );
    }

    // Gera senha temporária de 8 caracteres
    const tempPassword = Math.random().toString(36).substring(2, 10);
    const passwordHash = await hashPassword(tempPassword);

    const birthDateObj = data.birthDate ? new Date(data.birthDate) : null;
    let isMinor = data.isMinor;
    if (birthDateObj) {
      const ageDiff = Date.now() - birthDateObj.getTime();
      const age = Math.abs(new Date(ageDiff).getUTCFullYear() - 1970);
      if (age < 18) isMinor = true;
    }

    const patient = await prisma.patient.create({
      data: {
        fullName: data.fullName,
        email: normalizedEmail,
        passwordHash,
        tempPassword,
        mustChangePassword: true,
        phone: data.phone,
        cpf: data.cpf,
        birthDate: birthDateObj,
        isMinor,
        gender: data.gender,
        address: data.address,
        emergencyContact: data.emergencyContact,
        guardians: isMinor && data.guardianFullName
          ? {
              create: {
                fullName: data.guardianFullName,
                cpf: data.guardianCpf || "",
                phone: data.guardianPhone || "",
                email: data.guardianEmail || "",
                relationship: data.guardianRelationship || "Responsável Legal",
              },
            }
          : undefined,
      },
      include: {
        guardians: true,
      },
    });

    // Registra auditoria
    await prisma.auditLog.create({
      data: {
        userId: adminSession.userId,
        userRole: "ADMIN",
        action: "PATIENT_CREATED_BY_ADMIN",
        resource: "Patient",
        resourceId: patient.id,
        details: JSON.stringify({ fullName: patient.fullName, email: patient.email }),
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      },
    });

    return NextResponse.json({
      patient,
      tempPassword,
      message: "Paciente cadastrado com senha temporária gerada.",
    }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao cadastrar paciente:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
