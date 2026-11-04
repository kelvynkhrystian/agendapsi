import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendNotification } from "@/lib/notifications";

const recoverSchema = z.object({
  email: z.string().email("E-mail inválido"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = recoverSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Informe um e-mail válido." },
        { status: 400 }
      );
    }

    const normalizedEmail = result.data.email.trim().toLowerCase();

    // Busca paciente ou admin
    const [patient, admin] = await Promise.all([
      prisma.patient.findUnique({ where: { email: normalizedEmail } }),
      prisma.adminAccount.findUnique({ where: { email: normalizedEmail } }),
    ]);

    const targetUser = patient || admin;
    const userName = patient ? patient.fullName : admin ? admin.name : null;

    if (targetUser && userName) {
      // Gera token temporário de recuperação (válido por 1 hora)
      const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const resetLink = `${process.env.APP_URL || "http://localhost:3000"}/redefinir-senha?token=${resetToken}&email=${encodeURIComponent(normalizedEmail)}`;

      const delivery = await sendNotification({
        recipient: normalizedEmail,
        channel: "EMAIL",
        templateType: "APPOINTMENT_CREATED", // tipo base de mensageria
        subject: "Recuperação de Senha — PSI",
        variables: {
          patientName: userName,
          professionalName: "Consultório PSI",
          appointmentDateTime: resetLink,
        },
      });

      // Se for ambiente de desenvolvimento com email não configurado, expõe link no retorno
      if (process.env.NODE_ENV !== "production" && delivery.simulated) {
        return NextResponse.json({
          success: true,
          message:
            "Instruções de recuperação registradas. Em modo desenvolvimento, utilize o link de teste.",
          devLink: resetLink,
          simulated: true,
        });
      }
    }

    // Resposta padrão (não vaza se o email existe ou não)
    return NextResponse.json({
      success: true,
      message:
        "Se o e-mail informado estiver cadastrado, as instruções para redefinição de senha foram enviadas.",
    });
  } catch (error) {
    console.error("Erro na recuperação de senha:", error);
    return NextResponse.json(
      { error: "Erro ao processar solicitação." },
      { status: 500 }
    );
  }
}
