import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requirePatient } from "@/lib/auth";
import { sendNotification } from "@/lib/notifications";

const emailRequestSchema = z.object({
  newEmail: z.string().trim().email("Formato de e-mail inválido").toLowerCase(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requirePatient();
    const body = await req.json();
    const result = emailRequestSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Informe um endereço de e-mail válido.", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { newEmail } = result.data;
    const currentEmail = session.email.toLowerCase().trim();

    if (newEmail === currentEmail) {
      return NextResponse.json(
        { error: "O novo e-mail deve ser diferente do seu e-mail atual." },
        { status: 400 }
      );
    }

    // 1. Validação de Unicidade no sistema (Patient e AdminAccount)
    const [existingPatient, existingAdmin] = await Promise.all([
      prisma.patient.findFirst({
        where: {
          email: newEmail,
          id: { not: session.userId },
        },
      }),
      prisma.adminAccount.findFirst({
        where: { email: newEmail },
      }),
    ]);

    if (existingPatient || existingAdmin) {
      return NextResponse.json(
        { error: "Este endereço de e-mail já está em uso no sistema." },
        { status: 409 }
      );
    }

    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";

    // 2. Verificação de infraestrutura de envio de e-mails (SMTP)
    const sys = await prisma.systemSettings.findFirst();
    const isEmailConfigured = !!(sys?.smtpEnabled && sys?.smtpHost && sys?.smtpUser);

    if (!isEmailConfigured) {
      // REGRA: Se a infraestrutura de verificação não estiver disponível,
      // NUNCA alterar silenciosamente o e-mail nem fingir sucesso.
      // O e-mail atual permanece ativo e inalterado.
      await prisma.auditLog.create({
        data: {
          userId: session.userId,
          userRole: "PATIENT",
          action: "EMAIL_CHANGE_REJECTED_NO_SMTP",
          resource: "Patient",
          resourceId: session.userId,
          details: JSON.stringify({
            reason: "Servidor SMTP não configurado. Alteração de e-mail bloqueada para proteger o acesso.",
          }),
          ipAddress,
        },
      });

      return NextResponse.json(
        {
          configured: false,
          error:
            "A alteração de e-mail requer confirmação por link de verificação, mas o serviço de envio de e-mails (SMTP) não está ativado no consultório. O seu e-mail de login atual permanece ativo. Solicite ao profissional que configure as notificações por e-mail em Configurações > Integrações.",
        },
        { status: 422 }
      );
    }

    // 3. Rate Limiting: Máximo de 3 solicitações por hora por paciente
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentRequests = await prisma.patientEmailChangeToken.count({
      where: {
        patientId: session.userId,
        createdAt: { gte: oneHourAgo },
      },
    });

    if (recentRequests >= 3) {
      return NextResponse.json(
        {
          error:
            "Muitas tentativas recentes de alteração de e-mail. Por segurança, aguarde 1 hora antes de solicitar novamente.",
        },
        { status: 429 }
      );
    }

    // 4. Invalida tokens pendentes anteriores deste paciente
    await prisma.patientEmailChangeToken.updateMany({
      where: {
        patientId: session.userId,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    // 5. Geração de token criptográfico seguro de uso único
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    await prisma.patientEmailChangeToken.create({
      data: {
        patientId: session.userId,
        oldEmail: currentEmail,
        newEmail,
        tokenHash,
        expiresAt,
        ipAddress,
      },
    });

    // 6. Disparo da notificação com o link de confirmação
    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const verificationUrl = `${appUrl}/paciente/verificar-email?token=${rawToken}`;

    const delivery = await sendNotification({
      recipient: newEmail,
      channel: "EMAIL",
      templateType: "APPOINTMENT_CONFIRMED",
      subject: "Confirmação de alteração de e-mail — PSI Consultório",
      variables: {
        patientName: session.name || "Paciente",
        professionalName: "Consultório PSI",
        appointmentDateTime: verificationUrl,
      },
    });

    // 7. Registro de Auditoria (sem vazar token bruto ou tokenHash)
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        userRole: "PATIENT",
        action: "EMAIL_CHANGE_REQUESTED",
        resource: "PatientEmailChangeToken",
        resourceId: session.userId,
        details: JSON.stringify({
          oldEmailDomain: currentEmail.split("@")[1],
          newEmailDomain: newEmail.split("@")[1],
          expiresInMinutes: 15,
        }),
        ipAddress,
      },
    });

    const isDev = process.env.NODE_ENV !== "production";

    return NextResponse.json({
      success: true,
      message:
        "Enviamos um link de confirmação para o novo endereço de e-mail. O link é válido por 15 minutos. Seu e-mail de login atual continuará ativo até que a confirmação seja concluída.",
      expiresAt: expiresAt.toISOString(),
      ...(isDev && delivery.simulated ? { devVerificationUrl: verificationUrl } : {}),
    });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message.includes("FORBIDDEN"))) {
      return NextResponse.json({ error: "Acesso restrito ao paciente autenticado." }, { status: 403 });
    }
    console.error("Erro na solicitação de troca de e-mail:", error);
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}
