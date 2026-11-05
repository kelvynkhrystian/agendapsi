import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getSession, signToken, AUTH_COOKIE_NAME } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = typeof body?.token === "string" ? body.token.trim() : "";

    if (!token || token.length < 16) {
      return NextResponse.json(
        { error: "Token de verificação inválido ou ausente." },
        { status: 400 }
      );
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";

    const record = await prisma.patientEmailChangeToken.findUnique({
      where: { tokenHash },
      include: { patient: true },
    });

    if (!record) {
      return NextResponse.json(
        { error: "Link de verificação inválido ou inexistente." },
        { status: 400 }
      );
    }

    if (record.usedAt) {
      return NextResponse.json(
        { error: "Este link de confirmação já foi utilizado anteriormente." },
        { status: 400 }
      );
    }

    if (new Date() > record.expiresAt) {
      return NextResponse.json(
        { error: "Este link de confirmação expirou. Por favor, solicite uma nova alteração de e-mail no seu perfil." },
        { status: 400 }
      );
    }

    // 1. Verificação concorrente de unicidade no momento da aplicação
    const [conflictPatient, conflictAdmin] = await Promise.all([
      prisma.patient.findFirst({
        where: {
          email: record.newEmail,
          id: { not: record.patientId },
        },
      }),
      prisma.adminAccount.findFirst({
        where: { email: record.newEmail },
      }),
    ]);

    if (conflictPatient || conflictAdmin) {
      return NextResponse.json(
        { error: "O endereço de e-mail já foi vinculado a outro usuário do sistema." },
        { status: 409 }
      );
    }

    // 2. Transação atômica: marca token como usado, atualiza Patient e registra auditoria
    await prisma.$transaction(async (tx) => {
      await tx.patientEmailChangeToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      });

      await tx.patient.update({
        where: { id: record.patientId },
        data: { email: record.newEmail },
      });

      await tx.auditLog.create({
        data: {
          userId: record.patientId,
          userRole: "PATIENT",
          action: "EMAIL_CHANGED_VERIFIED",
          resource: "Patient",
          resourceId: record.patientId,
          details: JSON.stringify({
            oldEmailDomain: record.oldEmail.split("@")[1],
            newEmailDomain: record.newEmail.split("@")[1],
          }),
          ipAddress,
        },
      });
    });

    const response = NextResponse.json({
      success: true,
      message: "E-mail atualizado com sucesso! Agora você deve utilizar seu novo e-mail para acessar o sistema.",
      newEmail: record.newEmail,
    });

    // 3. Atualiza sessão JWT caso o paciente esteja com sessão ativa para evitar deslogar
    try {
      const currentSession = await getSession();
      if (currentSession && currentSession.userId === record.patientId && currentSession.role === "PATIENT") {
        const refreshedToken = await signToken({
          userId: record.patient.id,
          email: record.newEmail,
          name: record.patient.fullName,
          role: "PATIENT",
          mustChangePassword: record.patient.mustChangePassword,
        });

        response.cookies.set(AUTH_COOKIE_NAME, refreshedToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 7 * 24 * 60 * 60, // 7 dias
        });
      }
    } catch (sessionError) {
      console.warn("Não foi possível atualizar o cookie de sessão imediatamente:", sessionError);
    }

    return response;
  } catch (error) {
    console.error("Erro na verificação do token de e-mail:", error);
    return NextResponse.json(
      { error: "Erro interno ao processar a verificação de e-mail." },
      { status: 500 }
    );
  }
}
