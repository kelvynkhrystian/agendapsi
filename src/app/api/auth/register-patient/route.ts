import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE_NAME, hashPassword, signToken } from "@/lib/auth";
import { dispatchNotification } from "@/lib/notifications";

const registerSchema = z
  .object({
    fullName: z.string().min(3, "Nome completo é obrigatório"),
    email: z.string().email("E-mail inválido"),
    password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres"),
    phone: z.string().min(8, "Telefone é obrigatório"),
    cpf: z.string().optional(),
    birthDate: z.string().optional(),
    isMinor: z.boolean().default(false),
    gender: z.string().optional(),
    address: z.string().optional(),
    guardianFullName: z.string().optional(),
    guardianCpf: z.string().optional(),
    guardianPhone: z.string().optional(),
    guardianEmail: z.string().optional(),
    guardianRelationship: z.string().optional(),
    acceptTerms: z.boolean().refine((val) => val === true, {
      message: "Você deve aceitar os termos de uso e política de privacidade",
    }),
  })
  .refine(
    (data) => {
      if (data.isMinor) {
        return !!(
          data.guardianFullName &&
          data.guardianCpf &&
          data.guardianPhone &&
          data.guardianRelationship
        );
      }
      return true;
    },
    {
      message:
        "Para pacientes menores de idade, os dados do responsável legal são obrigatórios.",
      path: ["guardianFullName"],
    }
  );

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = registerSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = result.data;
    const normalizedEmail = data.email.trim().toLowerCase();

    // Verifica se já existe paciente ou admin com esse email
    const [existingAdmin, existingPatient] = await Promise.all([
      prisma.adminAccount.findUnique({ where: { email: normalizedEmail } }),
      prisma.patient.findUnique({ where: { email: normalizedEmail } }),
    ]);

    if (existingAdmin || existingPatient) {
      return NextResponse.json(
        { error: "Este e-mail já está cadastrado no sistema." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(data.password);
    const birthDateObj = data.birthDate ? new Date(data.birthDate) : null;

    // Se a data de nascimento tem menos de 18 anos, força isMinor
    let isMinor = data.isMinor;
    if (birthDateObj) {
      const ageDiffMs = Date.now() - birthDateObj.getTime();
      const ageDate = new Date(ageDiffMs);
      const calculatedAge = Math.abs(ageDate.getUTCFullYear() - 1970);
      if (calculatedAge < 18) {
        isMinor = true;
      }
    }

    const patient = await prisma.patient.create({
      data: {
        fullName: data.fullName,
        email: normalizedEmail,
        passwordHash,
        phone: data.phone,
        cpf: data.cpf,
        birthDate: birthDateObj,
        isMinor,
        gender: data.gender,
        address: data.address,
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
        consentAcceptances: {
          create: [
            {
              policyType: "TERMS_AND_PRIVACY",
              policyVersion: "1.0",
              ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
              userAgent: req.headers.get("user-agent") || undefined,
              context: "PUBLIC_REGISTRATION",
            },
          ],
        },
      },
      include: {
        guardians: true,
      },
    });

    // Registra auditoria
    await prisma.auditLog.create({
      data: {
        userId: patient.id,
        userRole: "PATIENT",
        action: "PATIENT_REGISTERED",
        resource: "Patient",
        resourceId: patient.id,
        details: JSON.stringify({ isMinor }),
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      },
    });

    // Notificação ao administrador sobre novo paciente
    const admin = await prisma.adminAccount.findFirst();
    if (admin) {
      await dispatchNotification({
        recipientId: admin.id,
        recipientRole: "ADMIN",
        eventType: "ADMIN_NEW_PATIENT",
        targetUrl: `/admin/pacientes/${patient.id}`,
        relatedEntityType: "Patient",
        relatedEntityId: patient.id,
        vars: {
          patientName: patient.fullName,
        },
        idempotencyKey: `new-patient-${patient.id}`,
      });
    }

    const token = await signToken({
      userId: patient.id,
      email: patient.email,
      name: patient.fullName,
      role: "PATIENT",
    });

    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: patient.id,
          name: patient.fullName,
          email: patient.email,
          role: "PATIENT",
        },
        redirectTo: "/paciente",
      },
      { status: 201 }
    );

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error("Erro no cadastro de paciente:", error);
    return NextResponse.json(
      { error: "Erro interno ao processar cadastro." },
      { status: 500 }
    );
  }
}
