import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE_NAME, signToken, verifyPassword } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "A senha é obrigatória"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = loginSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, password } = result.data;
    const normalizedEmail = email.trim().toLowerCase();

    // 1. Tenta autenticar como ADMIN
    const admin = await prisma.adminAccount.findUnique({
      where: { email: normalizedEmail },
    });

    if (admin) {
      // Verifica bloqueio por tentativas excessivas
      if (admin.lockedUntil && admin.lockedUntil > new Date()) {
        const remainingMinutes = Math.ceil(
          (admin.lockedUntil.getTime() - Date.now()) / (1000 * 60)
        );
        return NextResponse.json(
          {
            error: `Conta temporariamente bloqueada por excesso de tentativas. Tente novamente em ${remainingMinutes} minuto(s).`,
          },
          { status: 423 }
        );
      }

      const isValid = await verifyPassword(password, admin.passwordHash);
      if (!isValid) {
        const newFailed = admin.failedLogins + 1;
        let lockedUntil = admin.lockedUntil;
        if (newFailed >= 5) {
          lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos de bloqueio
        }

        await prisma.adminAccount.update({
          where: { id: admin.id },
          data: { failedLogins: newFailed, lockedUntil },
        });

        // Registrar auditoria de falha
        await prisma.auditLog.create({
          data: {
            userId: admin.id,
            userRole: "ADMIN",
            action: "LOGIN_FAILED",
            resource: "AdminAccount",
            resourceId: admin.id,
            ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
          },
        });

        return NextResponse.json(
          { error: "Credenciais incorretas." },
          { status: 401 }
        );
      }

      // Login bem-sucedido: zera falhas
      await prisma.adminAccount.update({
        where: { id: admin.id },
        data: { failedLogins: 0, lockedUntil: null },
      });

      const token = await signToken({
        userId: admin.id,
        email: admin.email,
        name: admin.name,
        role: "ADMIN",
        mustChangePassword: admin.mustChangePassword,
      });

      // Registrar auditoria de sucesso
      await prisma.auditLog.create({
        data: {
          userId: admin.id,
          userRole: "ADMIN",
          action: "LOGIN_SUCCESS",
          resource: "AdminAccount",
          resourceId: admin.id,
          ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
        },
      });

      const response = NextResponse.json({
        success: true,
        user: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          role: "ADMIN",
          mustChangePassword: admin.mustChangePassword,
        },
        redirectTo: "/admin",
      });

      response.cookies.set({
        name: AUTH_COOKIE_NAME,
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60, // 7 dias
      });

      return response;
    }

    // 2. Tenta autenticar como PACIENTE
    const patient = await prisma.patient.findUnique({
      where: { email: normalizedEmail },
    });

    if (patient) {
      if (!patient.isActive) {
        return NextResponse.json(
          { error: "Conta inativa. Entre em contato com o consultório." },
          { status: 403 }
        );
      }

      if (!patient.passwordHash) {
        return NextResponse.json(
          {
            error:
              "Esta conta ainda não possui senha configurada. Solicite a recuperação ou use a senha temporária fornecida.",
          },
          { status: 401 }
        );
      }

      const isValid = await verifyPassword(password, patient.passwordHash);
      if (!isValid) {
        return NextResponse.json(
          { error: "Credenciais incorretas." },
          { status: 401 }
        );
      }

      const token = await signToken({
        userId: patient.id,
        email: patient.email,
        name: patient.fullName,
        role: "PATIENT",
        mustChangePassword: patient.mustChangePassword,
      });

      const response = NextResponse.json({
        success: true,
        user: {
          id: patient.id,
          name: patient.fullName,
          email: patient.email,
          role: "PATIENT",
          mustChangePassword: patient.mustChangePassword,
        },
        redirectTo: "/paciente",
      });

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
    }

    return NextResponse.json(
      { error: "E-mail ou senha incorretos." },
      { status: 401 }
    );
  } catch (error) {
    console.error("Erro no login:", error);
    return NextResponse.json(
      { error: "Erro interno ao processar login." },
      { status: 500 }
    );
  }
}
