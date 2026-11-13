import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendNotification } from "@/lib/notifications";
import { getEmailCapability } from "@/lib/integrations-email";
import { isSmsRecoveryReady } from "@/lib/integrations-health";

const recoverSchema = z.object({
  email: z.string().email("E-mail inválido"),
});

async function loadRecoveryAvailability() {
  const [sys, site] = await Promise.all([
    prisma.systemSettings.findFirst(),
    prisma.siteSettings.findFirst({
      select: {
        clinicName: true,
        phone: true,
        whatsappNumber: true,
        email: true,
      },
    }),
  ]);

  const emailCap = getEmailCapability(sys);
  const smsRecoveryReady = isSmsRecoveryReady(sys);
  const recoveryStrategy: "EMAIL" | "SMS" | "ADMIN_ASSISTED" = emailCap.enabled
    ? "EMAIL"
    : sys?.emailDisabledRecoveryStrategy === "SMS" && smsRecoveryReady
    ? "SMS"
    : "ADMIN_ASSISTED";

  return {
    sys,
    emailCap,
    smsRecoveryReady,
    recoveryStrategy,
    clinicContact: {
      clinicName: site?.clinicName || "Consultório PSI",
      phone: site?.phone || null,
      whatsappNumber: site?.whatsappNumber || null,
      email: site?.email || null,
    },
  };
}

export async function GET() {
  try {
    const info = await loadRecoveryAvailability();
    return NextResponse.json({
      emailEnabled: info.emailCap.enabled,
      emailCanSend: info.emailCap.canSendRealEmails,
      recoveryStrategy: info.emailCap.enabled ? null : info.recoveryStrategy,
      smsRecoveryReady: info.smsRecoveryReady,
      clinicContact: info.clinicContact,
    });
  } catch (error) {
    console.error("Erro ao consultar disponibilidade de recuperação:", error);
    return NextResponse.json(
      { error: "Erro ao consultar opções de recuperação de acesso." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const result = recoverSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Informe um e-mail válido." },
        { status: 400 }
      );
    }

    const normalizedEmail = result.data.email.trim().toLowerCase();
    const availability = await loadRecoveryAvailability();

    // Se o canal de e-mail estiver desativado e sem fallback SMS pronto, orienta atendimento assistido
    if (!availability.emailCap.enabled && availability.recoveryStrategy === "ADMIN_ASSISTED") {
      return NextResponse.json(
        {
          error:
            "A recuperação automática por e-mail está desativada no momento. Entre em contato diretamente com o profissional ou consultório para redefinir seu acesso.",
          strategy: "ADMIN_ASSISTED",
          clinicContact: availability.clinicContact,
        },
        { status: 422 }
      );
    }

    // Busca paciente ou admin
    const [patient, admin] = await Promise.all([
      prisma.patient.findUnique({ where: { email: normalizedEmail } }),
      prisma.adminAccount.findUnique({ where: { email: normalizedEmail } }),
    ]);

    const targetUser = patient || admin;
    const userName = patient ? patient.fullName : admin ? admin.name : null;

    if (targetUser && userName) {
      const resetToken = crypto.randomBytes(24).toString("hex");
      const baseUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");
      const resetLink = `${baseUrl}/redefinir-senha?token=${resetToken}&email=${encodeURIComponent(normalizedEmail)}`;

      if (availability.recoveryStrategy === "SMS") {
        const allowSms = Boolean(targetUser.phone) && (!patient || patient.smsOptIn === true);

        if (allowSms && targetUser.phone) {
          const smsDelivery = await sendNotification({
            recipient: targetUser.phone,
            channel: "SMS",
            templateType: "APPOINTMENT_CREATED",
            messageType: "PASSWORD_RECOVERY",
            subject: "Recuperação de Senha — PSI",
            patientId: patient?.id,
            patientSmsOptIn: patient ? patient.smsOptIn : true,
            enforceSmsOptIn: Boolean(patient),
            variables: {
              patientName: userName,
              professionalName: availability.clinicContact.clinicName,
              appointmentDateTime: resetLink,
            },
            customMessage: `Consultorio PSI: Ola ${userName}, use o link para redefinir sua senha (1h): ${resetLink}`,
          });

          await prisma.auditLog.create({
            data: {
              userId: targetUser.id,
              userRole: patient ? "PATIENT" : "ADMIN",
              action: "PASSWORD_RECOVERY_REQUESTED",
              resource: patient ? "Patient" : "AdminAccount",
              resourceId: targetUser.id,
              details: JSON.stringify({
                channel: "SMS",
                status: smsDelivery.status,
              }),
              ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
            },
          });

          if (!smsDelivery.success && !smsDelivery.skipped && !smsDelivery.simulated) {
            return NextResponse.json(
              {
                error:
                  "Não foi possível enviar o SMS de recuperação no momento. Entre em contato com o consultório.",
              },
              { status: 502 }
            );
          }
        }
      } else {
        const delivery = await sendNotification({
          recipient: normalizedEmail,
          channel: "EMAIL",
          templateType: "APPOINTMENT_CREATED",
          messageType: "PASSWORD_RECOVERY",
          subject: "Recuperação de Senha — PSI",
          patientId: patient?.id,
          variables: {
            patientName: userName,
            professionalName: availability.clinicContact.clinicName,
            appointmentDateTime: resetLink,
          },
          customMessage: `Olá, ${userName}!\n\nRecebemos uma solicitação para redefinição da sua senha no ${availability.clinicContact.clinicName}.\n\nAcesse o link abaixo para continuar (válido por 1 hora):\n${resetLink}\n\nCaso não tenha solicitado, ignore esta mensagem.`,
        });

        await prisma.auditLog.create({
          data: {
            userId: targetUser.id,
            userRole: patient ? "PATIENT" : "ADMIN",
            action: "PASSWORD_RECOVERY_REQUESTED",
            resource: patient ? "Patient" : "AdminAccount",
            resourceId: targetUser.id,
            details: JSON.stringify({
              channel: "EMAIL",
              status: delivery.status,
              simulated: Boolean(delivery.simulated),
            }),
            ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
          },
        });

        if (availability.emailCap.canSendRealEmails && !delivery.success && !delivery.simulated) {
          return NextResponse.json(
            {
              error:
                "Não foi possível enviar o e-mail de recuperação no momento. Tente novamente ou contate o consultório.",
            },
            { status: 502 }
          );
        }

        // Em ambiente de desenvolvimento sem SMTP pronto, expõe link de teste apenas no modo não produtivo
        if (process.env.NODE_ENV !== "production" && !availability.emailCap.canSendRealEmails && delivery.simulated) {
          return NextResponse.json({
            success: true,
            channel: "EMAIL",
            message:
              "Instruções de recuperação registradas. Em modo desenvolvimento, utilize o link de teste abaixo.",
            devLink: resetLink,
            simulated: true,
          });
        }
      }
    }

    if (availability.recoveryStrategy === "SMS") {
      return NextResponse.json({
        success: true,
        channel: "SMS",
        message:
          "O envio por e-mail está desativado. Se o cadastro informado possuir celular com recebimento de SMS autorizado, as instruções de recuperação foram enviadas por SMS.",
      });
    }

    // Resposta padrão (não vaza se o email existe ou não)
    return NextResponse.json({
      success: true,
      channel: "EMAIL",
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
