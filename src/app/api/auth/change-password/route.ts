import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession, hashPassword, verifyPassword } from "@/lib/auth";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "A senha atual é obrigatória"),
  newPassword: z.string().min(6, "A nova senha deve ter no mínimo 6 caracteres"),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const body = await req.json();
    const result = changePasswordSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = result.data;

    if (session.role === "ADMIN") {
      const admin = await prisma.adminAccount.findUnique({
        where: { id: session.userId },
      });
      if (!admin) {
        return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
      }

      const isValid = await verifyPassword(currentPassword, admin.passwordHash);
      if (!isValid) {
        return NextResponse.json({ error: "A senha atual está incorreta." }, { status: 400 });
      }

      const newHash = await hashPassword(newPassword);
      await prisma.adminAccount.update({
        where: { id: admin.id },
        data: { passwordHash: newHash, mustChangePassword: false },
      });

      await prisma.auditLog.create({
        data: {
          userId: admin.id,
          userRole: "ADMIN",
          action: "PASSWORD_CHANGED",
          resource: "AdminAccount",
          resourceId: admin.id,
          ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
        },
      });

      return NextResponse.json({ success: true, message: "Senha alterada com sucesso!" });
    }

    if (session.role === "PATIENT") {
      const patient = await prisma.patient.findUnique({
        where: { id: session.userId },
      });
      if (!patient || !patient.passwordHash) {
        return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
      }

      const isValid = await verifyPassword(currentPassword, patient.passwordHash);
      if (!isValid) {
        return NextResponse.json({ error: "A senha atual está incorreta." }, { status: 400 });
      }

      const newHash = await hashPassword(newPassword);
      await prisma.patient.update({
        where: { id: patient.id },
        data: { passwordHash: newHash, mustChangePassword: false },
      });

      await prisma.auditLog.create({
        data: {
          userId: patient.id,
          userRole: "PATIENT",
          action: "PASSWORD_CHANGED",
          resource: "Patient",
          resourceId: patient.id,
          ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
        },
      });

      return NextResponse.json({ success: true, message: "Senha alterada com sucesso!" });
    }

    return NextResponse.json({ error: "Papel não suportado." }, { status: 400 });
  } catch (error) {
    console.error("Erro na alteração de senha:", error);
    return NextResponse.json(
      { error: "Erro interno ao alterar senha." },
      { status: 500 }
    );
  }
}
