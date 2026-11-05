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

    if (!session) {
      return NextResponse.json(
        {
          error: "Autenticação obrigatória para acessar a sala de teleconsulta.",
          requiresLogin: true,
        },
        { status: 401 }
      );
    }

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

    // Regra de Autorização estrita: apenas o Admin (profissional titular) ou o paciente dono da consulta
    const isAdmin = session.role === "ADMIN";
    const isOwnerPatient = session.role === "PATIENT" && session.userId === appointment.patientId;

    if (!isAdmin && !isOwnerPatient) {
      return NextResponse.json(
        { error: "Você não possui permissão para acessar esta teleconsulta." },
        { status: 403 }
      );
    }

    // Validação de acesso com janela de tempo (Admin irrestrito, paciente 15 minutos antes)
    const access = checkMeetingAccess({
      userRole: session.role,
      startAt: appointment.startAt,
      endAt: appointment.endAt,
    });

    const settings = await prisma.systemSettings.findUnique({ where: { id: "default" } });
    const profile = await prisma.professionalProfile.findUnique({ where: { id: "default" } });

    const role = isAdmin ? "doctor" : "patient";
    const peerId = `${videoMeeting.roomName}-${role}`;
    const targetPeerId = isAdmin ? `${videoMeeting.roomName}-patient` : `${videoMeeting.roomName}-doctor`;

    const peerJsConfig =
      videoMeeting.provider === "PEERJS"
        ? {
            host: settings?.peerJsServerHost || "localhost",
            port: settings?.peerJsServerPort || 9000,
            path: settings?.peerJsPath || "/peerjs",
            secure: settings?.peerJsSecure ?? false,
            stunServer: settings?.peerJsStunServer || "stun:stun.l.google.com:19302",
            turnServer: settings?.peerJsTurnServer || null,
            turnUser: settings?.peerJsTurnUser || null,
            turnSecret: settings?.peerJsTurnSecret || null,
            role,
            peerId,
            targetPeerId,
          }
        : null;

    return NextResponse.json({
      provider: videoMeeting.provider,
      roomName: videoMeeting.roomName,
      domain: settings?.jitsiDomain || "meet.jit.si",
      peerJsConfig,
      canEnter: access.canEnter,
      isEarly: access.isEarly,
      minutesUntilOpen: access.minutesUntilOpen,
      message: access.message,
      currentUserRole: session.role,
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
