import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { createAtomicAppointment } from "@/lib/schedule";
import { dispatchNotification } from "@/lib/notifications";
import { isRestoreInProgress, RESTORE_MAINTENANCE_MESSAGE } from "@/lib/backup";
import { getPaymentProvider, getDecryptedGatewayCredentials } from "@/lib/payments/registry";
import { PaymentProviderKey } from "@/lib/payments/types";

const confirmBookingSchema = z.object({
  holdToken: z.string().min(8),
  modality: z.enum(["PRESENTIAL", "ONLINE", "BOTH"]),
  paymentMethod: z.string().optional().default("ONLINE_SIMULATED"),
  gatewayProvider: z.enum(["MERCADO_PAGO", "ASAAS", "PAGBANK", "IN_PERSON", "ONLINE_SIMULATED"]).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (await isRestoreInProgress()) {
      return NextResponse.json({ error: RESTORE_MAINTENANCE_MESSAGE }, { status: 503 });
    }
    const body = await req.json();
    const result = confirmBookingSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { holdToken, modality, paymentMethod } = result.data;

    // Busca o hold ativo
    const hold = await prisma.appointmentHold.findUnique({
      where: { holdToken },
      include: { service: true },
    });

    if (!hold || hold.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "O tempo de reserva deste horário expirou. Por favor, selecione o horário novamente." },
        { status: 410 }
      );
    }

    // Define status inicial baseado na política de confirmação do serviço
    const policy = hold.service.confirmationPolicy;
    let initialStatus: "PENDING_CONFIRMATION" | "CONFIRMED" = "CONFIRMED";

    if (policy === "MANUAL_ADMIN" || policy === "PAYMENT_AND_ADMIN") {
      initialStatus = "PENDING_CONFIRMATION";
    }

    // Criação atômica do agendamento
    const appointment = await createAtomicAppointment({
      patientId: session.userId,
      serviceId: hold.serviceId,
      startAt: hold.startAt,
      endAt: hold.endAt,
      modality,
      status: initialStatus,
      holdToken,
    });

    // Se o serviço não for gratuito, cria o pagamento
    const isFree = hold.service.isFree || hold.service.priceCents === 0;
    let payment = null;
    let paymentInstructions = "";

    if (!isFree) {
      const chosenProvider = (
        result.data.gatewayProvider ||
        (paymentMethod === "IN_PERSON"
          ? "IN_PERSON"
          : paymentMethod === "MERCADO_PAGO"
          ? "MERCADO_PAGO"
          : paymentMethod === "ASAAS"
          ? "ASAAS"
          : paymentMethod === "PAGBANK"
          ? "PAGBANK"
          : "ONLINE_SIMULATED")
      ) as PaymentProviderKey | "ONLINE_SIMULATED";

      if (chosenProvider === "ONLINE_SIMULATED") {
        payment = await prisma.payment.create({
          data: {
            appointmentId: appointment.id,
            patientId: session.userId,
            amountCents: hold.service.priceCents,
            status: "APPROVED",
            method: "ONLINE_SIMULATED",
            gatewayProvider: "SIMULATOR",
            isSimulated: true,
            confirmedAt: new Date(),
            confirmedBy: "SIMULATOR",
          },
        });
      } else if (chosenProvider === "IN_PERSON") {
        const inPersonGateway = await getDecryptedGatewayCredentials("IN_PERSON");
        paymentInstructions =
          inPersonGateway?.instructions ||
          "O pagamento poderá ser realizado diretamente na recepção em dinheiro, cartão ou Pix no dia do atendimento.";

        payment = await prisma.payment.create({
          data: {
            appointmentId: appointment.id,
            patientId: session.userId,
            amountCents: hold.service.priceCents,
            status: "PENDING",
            method: "IN_PERSON",
            gatewayProvider: "IN_PERSON",
            isSimulated: false,
          },
        });
      } else {
        // Gateway online real: Mercado Pago, Asaas ou PagBank
        const gatewayData = await getDecryptedGatewayCredentials(chosenProvider);
        const patientData = await prisma.patient.findUnique({ where: { id: session.userId } });

        payment = await prisma.payment.create({
          data: {
            appointmentId: appointment.id,
            patientId: session.userId,
            amountCents: hold.service.priceCents,
            status: "PENDING",
            method: chosenProvider as any,
            gatewayProvider: chosenProvider,
            isSimulated: false,
          },
        });

        if (gatewayData && patientData) {
          try {
            const providerImpl = getPaymentProvider(chosenProvider);
            const webhookUrl = `${req.nextUrl.origin}/api/webhooks/payments/${chosenProvider.toLowerCase().replace(/_/g, "")}`;
            const payResult = await providerImpl.createPayment(
              {
                paymentId: payment.id,
                appointmentId: appointment.id,
                patient: {
                  id: patientData.id,
                  fullName: patientData.fullName,
                  email: patientData.email,
                  phone: patientData.phone,
                  cpf: patientData.cpf,
                },
                amountCents: hold.service.priceCents,
                description: `Agendamento - ${hold.service.name}`,
                returnUrl: `${req.nextUrl.origin}/paciente`,
              },
              gatewayData.credentials,
              gatewayData.environment,
              webhookUrl
            );

            if (payResult.success) {
              payment = await prisma.payment.update({
                where: { id: payment.id },
                data: {
                  gatewayPaymentId: payResult.gatewayPaymentId,
                  gatewayStatus: payResult.gatewayStatus,
                  pixQrCode: payResult.pixQrCode,
                  pixQrCodeBase64: payResult.pixQrCodeBase64,
                  checkoutUrl: payResult.checkoutUrl,
                },
              });
              paymentInstructions = payResult.instructions || "";
            }
          } catch (payErr) {
            console.error(`Erro ao gerar cobrança no ${chosenProvider}:`, payErr);
          }
        }
      }
    }

    // Busca detalhes do paciente e da clínica
    const [patient, site, profile] = await Promise.all([
      prisma.patient.findUnique({ where: { id: session.userId } }),
      prisma.siteSettings.findUnique({ where: { id: "default" } }),
      prisma.professionalProfile.findUnique({ where: { id: "default" } }),
    ]);

    const patientName = patient?.fullName || "Paciente";
    const professionalName = profile?.fullName || "Profissional";
    const location =
      modality === "PRESENTIAL"
        ? site?.address || "Consultório Presencial"
        : "Sala de Teleconsulta Virtual";

    // 1. Notificação para o Paciente
    if (patient) {
      await dispatchNotification({
        recipientId: patient.id,
        recipientRole: "PATIENT",
        eventType: initialStatus === "CONFIRMED" ? "APPOINTMENT_CONFIRMED" : "APPOINTMENT_REGISTERED",
        targetUrl: "/paciente",
        relatedEntityType: "Appointment",
        relatedEntityId: appointment.id,
        vars: {
          patientName,
          professionalName,
          serviceName: hold.service.name,
          date: appointment.startAt,
          time: appointment.startAt,
          valueCents: hold.service.priceCents,
          location,
          meetingLink: modality === "PRESENTIAL" ? "" : appointment.meetingUrlSnapshot || "",
        },
        idempotencyKey: `booking-patient-${appointment.id}`,
      });
    }

    // 2. Notificação para o Administrador
    const admin = await prisma.adminAccount.findFirst();
    if (admin) {
      await dispatchNotification({
        recipientId: admin.id,
        recipientRole: "ADMIN",
        eventType: "ADMIN_NEW_APPOINTMENT",
        targetUrl: "/admin/agenda",
        relatedEntityType: "Appointment",
        relatedEntityId: appointment.id,
        vars: {
          patientName,
          serviceName: hold.service.name,
          date: appointment.startAt,
          time: appointment.startAt,
          valueCents: hold.service.priceCents,
        },
        idempotencyKey: `booking-admin-${appointment.id}`,
      });
    }

    return NextResponse.json(
      {
        success: true,
        appointment,
        payment: payment
          ? {
              ...payment,
              instructions: paymentInstructions,
            }
          : null,
        message:
          initialStatus === "CONFIRMED"
            ? "Consulta agendada e confirmada com sucesso!"
            : "Consulta solicitada! Aguardando confirmação do profissional.",
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Faça login para concluir o agendamento." }, { status: 401 });
    }
    console.error("Erro ao confirmar agendamento:", error);
    return NextResponse.json({ error: "Erro interno ao confirmar agendamento." }, { status: 500 });
  }
}
