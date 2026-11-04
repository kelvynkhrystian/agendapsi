import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { checkMeetingAccess } from "@/lib/video-provider";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const session = await getSession();

    const videoMeeting = await prisma.videoMeeting.findUnique({
      where: { psiEntryToken: token },
      include: {
        appointment: {
          include: {
            patient: true,
            service: true,
          },
        },
      },
    });

    if (!videoMeeting) {
      return NextResponse.json(
        { error: "Link de teleconsulta inválido ou não encontrado." },
        { status: 404 }
      );
    }

    const { appointment } = videoMeeting;
    const userRole = session?.role || "PATIENT";

    // Validação de acesso com janela de 15 minutos
    const access = checkMeetingAccess({
      userRole,
      startAt: appointment.startAt,
      endAt: appointment.endAt,
    });

    const settings = await prisma.systemSettings.findUnique({ where: { id: "default" } });
    const profile = await prisma.professionalProfile.findUnique({ where: { id: "default" } });

    return NextResponse.json({
      roomName: videoMeeting.roomName,
      domain: settings?.jitsiDomain || "meet.jit.si",
      canEnter: access.canEnter,
      isEarly: access.isEarly,
      minutesUntilOpen: access.minutesUntilOpen,
      message: access.message,
      appointment: {
        startAt: appointment.startAt,
        endAt: appointment.endAt,
        serviceName: appointment.service.name,
        professionalName: profile?.fullName || "Profissional de Saúde",
        patientName: appointment.patient.fullName,
      },
    });
  } catch (error) {
    console.error("Erro ao validar teleconsulta:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
