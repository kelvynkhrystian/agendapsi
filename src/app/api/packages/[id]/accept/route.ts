import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { dispatchNotification } from "@/lib/notifications";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const pkg = await prisma.appointmentPackage.findUnique({
      where: { id },
      include: {
        holds: { include: { service: true } },
        payment: true,
        patient: true,
      },
    });

    if (!pkg) {
      return NextResponse.json({ error: "Pacote não encontrado." }, { status: 404 });
    }

    if (session.role === "PATIENT" && pkg.patientId !== session.userId) {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
    }

    if (pkg.status !== "PROPOSED") {
      return NextResponse.json(
        { error: `Este pacote já se encontra com status '${pkg.status}'.` },
        { status: 400 }
      );
    }

    if (pkg.expiresAt && pkg.expiresAt < new Date()) {
      await prisma.appointmentPackage.update({
        where: { id },
        data: { status: "EXPIRED" },
      });
      // Libera holds
      await prisma.appointmentHold.deleteMany({ where: { packageId: id } });
      return NextResponse.json(
        { error: "A proposta deste pacote expirou. Entre em contato com o consultório." },
        { status: 410 }
      );
    }

    // Transação atômica "tudo ou nada"
    await prisma.$transaction(async (tx) => {
      // 1. Converte cada hold em consulta confirmada
      for (const hold of pkg.holds) {
        const appt = await tx.appointment.create({
          data: {
            patientId: pkg.patientId,
            serviceId: hold.serviceId,
            packageId: pkg.id,
            startAt: hold.startAt,
            endAt: hold.endAt,
            modality: hold.service.modality,
            status: "CONFIRMED",
          },
        });

        // Se for online, gera sala de teleconsulta (Jitsi ou PeerJS conforme provedor ativo)
        if (hold.service.modality === "ONLINE" || hold.service.modality === "BOTH") {
          const settings = await tx.systemSettings.findFirst();
          const activeProvider = settings?.activeVideoProvider === "PEERJS" ? "PEERJS" : "JITSI";

          const roomPrefix = activeProvider === "PEERJS" ? "peer-psi-pkg" : "psi-pkg";
          const roomSuffix = Math.random().toString(36).substring(2, 10);
          const roomName = `${roomPrefix}-${appt.id}-${roomSuffix}`;
          const psiEntryToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

          await tx.videoMeeting.create({
            data: {
              appointmentId: appt.id,
              provider: activeProvider,
              roomName,
              psiEntryToken,
            },
          });
          const entryUrl = `${process.env.APP_URL || "http://localhost:3000"}/consulta-virtual/${psiEntryToken}`;
          await tx.appointment.update({
            where: { id: appt.id },
            data: { meetingUrlSnapshot: entryUrl },
          });
        }
      }

      // 2. Atualiza status do pacote
      await tx.appointmentPackage.update({
        where: { id },
        data: {
          status: "ACCEPTED",
          acceptedAt: new Date(),
        },
      });

      // 3. Atualiza pagamento para APPROVED (simulador online)
      if (pkg.payment) {
        await tx.payment.update({
          where: { id: pkg.payment.id },
          data: {
            status: "APPROVED",
            confirmedAt: new Date(),
            confirmedBy: "SIMULATOR_PACKAGE_ACCEPT",
          },
        });
      }

      // 4. Remove holds vinculados
      await tx.appointmentHold.deleteMany({
        where: { packageId: id },
      });

      // Auditoria
      await tx.auditLog.create({
        data: {
          userId: session.userId,
          userRole: session.role,
          action: "PACKAGE_ACCEPTED",
          resource: "AppointmentPackage",
          resourceId: id,
          details: JSON.stringify({ slotsConfirmed: pkg.holds.length }),
          ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
        },
      });
    });

    // Notificações
    const patientName = pkg.patient.fullName;

    // 1. Paciente
    await dispatchNotification({
      recipientId: pkg.patientId,
      recipientRole: "PATIENT",
      eventType: "PACKAGE_CONFIRMED",
      targetUrl: "/paciente",
      relatedEntityType: "AppointmentPackage",
      relatedEntityId: pkg.id,
      vars: {
        patientName,
        valueCents: pkg.totalPriceCents,
      },
    });

    // 2. Administrador
    const admin = await prisma.adminAccount.findFirst();
    if (admin) {
      await dispatchNotification({
        recipientId: admin.id,
        recipientRole: "ADMIN",
        eventType: "ADMIN_PACKAGE_ACCEPTED",
        targetUrl: "/admin/pacotes",
        relatedEntityType: "AppointmentPackage",
        relatedEntityId: pkg.id,
        vars: {
          patientName,
          valueCents: pkg.totalPriceCents,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Proposta de pacote aceita com sucesso! Todas as sessões foram confirmadas na agenda.",
    });
  } catch (error) {
    console.error("Erro ao aceitar pacote:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
