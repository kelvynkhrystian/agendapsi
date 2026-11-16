import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

const resetPasswordSchema = z.object({
  email: z.string().email("E-mail inválido"),
  token: z.string().min(16, "Token inválido"),
  newPassword: z.string().min(8, "A nova senha deve ter no mínimo 8 caracteres"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const result = resetPasswordSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, token, newPassword } = result.data;
    const normalizedEmail = email.trim().toLowerCase();
    const tokenHash = crypto.createHash("sha256").update(token.trim()).digest("hex");
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";

    const resetRecord = await prisma.passwordResetToken.findFirst({
      where: {
        email: normalizedEmail,
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!resetRecord) {
      return NextResponse.json(
        { error: "O link de redefinição de senha é inválido ou expirou. Solicite um novo link." },
        { status: 400 }
      );
    }

    const newHash = await hashPassword(newPassword);
    const now = new Date();

    if (resetRecord.role === "ADMIN") {
      const admin = await prisma.adminAccount.findUnique({
        where: { email: normalizedEmail },
      });

      if (!admin) {
        return NextResponse.json({ error: "Conta não encontrada." }, { status: 404 });
      }

      await prisma.$transaction([
        prisma.adminAccount.update({
          where: { id: admin.id },
          data: {
            passwordHash: newHash,
            mustChangePassword: false,
            failedLogins: 0,
            lockedUntil: null,
          },
        }),
        prisma.passwordResetToken.update({
          where: { id: resetRecord.id },
          data: { usedAt: now },
        }),
        prisma.passwordResetToken.deleteMany({
          where: { email: normalizedEmail, id: { not: resetRecord.id } },
        }),
        prisma.auditLog.create({
          data: {
            userId: admin.id,
            userRole: "ADMIN",
            action: "PASSWORD_RESET_COMPLETED",
            resource: "AdminAccount",
            resourceId: admin.id,
            details: JSON.stringify({ method: "PASSWORD_RESET_TOKEN" }),
            ipAddress,
          },
        }),
      ]);
    } else {
      const patient = await prisma.patient.findUnique({
        where: { email: normalizedEmail },
      });

      if (!patient) {
        return NextResponse.json({ error: "Conta não encontrada." }, { status: 404 });
      }

      await prisma.$transaction([
        prisma.patient.update({
          where: { id: patient.id },
          data: {
            passwordHash: newHash,
            mustChangePassword: false,
            failedLogins: 0,
            lockedUntil: null,
          },
        }),
        prisma.passwordResetToken.update({
          where: { id: resetRecord.id },
          data: { usedAt: now },
        }),
        prisma.passwordResetToken.deleteMany({
          where: { email: normalizedEmail, id: { not: resetRecord.id } },
        }),
        prisma.auditLog.create({
          data: {
            userId: patient.id,
            userRole: "PATIENT",
            action: "PASSWORD_RESET_COMPLETED",
            resource: "Patient",
            resourceId: patient.id,
            details: JSON.stringify({ method: "PASSWORD_RESET_TOKEN" }),
            ipAddress,
          },
        }),
      ]);
    }

    return NextResponse.json({
      success: true,
      message: "Sua senha foi redefinida com sucesso! Você já pode entrar com a nova senha.",
    });
  } catch (error) {
    console.error("Erro na redefinição de senha:", error);
    return NextResponse.json(
      { error: "Erro interno ao processar a redefinição de senha." },
      { status: 500 }
    );
  }
}
