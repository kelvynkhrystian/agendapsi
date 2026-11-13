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
    const site = await prisma.siteSettings.findUnique({ where: { id: "default" } });

    // Correção: identifica se o agendamento é estritamente presencial
    const isPresential =
      appointment.modality === "PRESENTIAL" ||
      appointment.service.name.toLowerCase().includes("(presencial)") ||
      appointment.service.modality === "PRESENTIAL";

    const role = isAdmin ? "doctor" : "patient";
    const peerId = `${videoMeeting.roomName}-${role}`;
    const targetPeerId = isAdmin ? `${videoMeeting.roomName}-patient` : `${videoMeeting.roomName}-doctor`;

    const peerHost = settings?.peerJsServerHost || process.env.PEERJS_SERVER_HOST || process.env.PEERJS_HOST || "0.peerjs.com";
    const isDefaultCloud = !settings?.peerJsServerHost || peerHost === "0.peerjs.com";
    const peerPort = isDefaultCloud
      ? 443
      : (settings?.peerJsServerPort || (process.env.PEERJS_SERVER_PORT ? Number(process.env.PEERJS_SERVER_PORT) : 9000));
    const peerPath = isDefaultCloud
      ? "/"
      : (settings?.peerJsPath || process.env.PEERJS_PATH || "/peerjs");
    const peerSecure = isDefaultCloud
      ? true
      : (settings?.peerJsSecure ?? (process.env.PEERJS_SECURE !== undefined ? process.env.PEERJS_SECURE === "true" : true));

    const peerJsConfig =
      videoMeeting.provider === "PEERJS"
        ? {
            host: peerHost,
            port: peerPort,
            path: peerPath,
            secure: peerSecure,
            stunServer: settings?.peerJsStunServer || process.env.PEERJS_STUN_SERVER || "stun:stun.l.google.com:19302",
            turnServer: settings?.peerJsTurnServer || process.env.PEERJS_TURN_SERVER || null,
            turnUser: settings?.peerJsTurnUser || process.env.PEERJS_TURN_USER || null,
            turnSecret: settings?.peerJsTurnSecret || process.env.PEERJS_TURN_SECRET || null,
            role,
            peerId,
            targetPeerId,
          }
        : null;

    const rawMeetingUrl =
      videoMeeting.provider === "GOOGLE_MEET"
        ? videoMeeting.conferenceUrl || videoMeeting.roomName
        : videoMeeting.provider === "JITSI"
        ? `https://${settings?.jitsiDomain || "meet.jit.si"}/${videoMeeting.roomName}`
        : null;

    return NextResponse.json({
      provider: videoMeeting.provider,
      roomName: videoMeeting.roomName,
      domain: settings?.jitsiDomain || "meet.jit.si",
      rawMeetingUrl,
      peerJsConfig,
      canEnter: access.canEnter,
      isEarly: access.isEarly,
      minutesUntilOpen: access.minutesUntilOpen,
      message: access.message,
      currentUserRole: session.role,
      isPresential,
      appointment: {
        startAt: appointment.startAt,
        endAt: appointment.endAt,
        modality: appointment.modality,
        serviceName: appointment.service.name,
        professionalName: profile?.fullName || "Profissional de Saúde",
        patientName: appointment.patient.fullName,
        address: site?.address || "Consultório do Profissional (endereço cadastrado no sistema)",
      },
    });
  } catch (error) {
    console.error("Erro ao validar teleconsulta:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
