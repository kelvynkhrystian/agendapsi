import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const updateVideoProvidersSchema = z.object({
  activeVideoProvider: z.enum(["JITSI", "PEERJS", "GOOGLE_MEET"]),
  jitsiDomain: z.string().optional(),
  peerJsServerHost: z.string().optional().nullable(),
  peerJsServerPort: z.number().int().optional().nullable(),
  peerJsPath: z.string().optional().nullable(),
  peerJsSecure: z.boolean().optional(),
  peerJsStunServer: z.string().optional().nullable(),
  peerJsTurnServer: z.string().optional().nullable(),
  peerJsTurnUser: z.string().optional().nullable(),
  peerJsTurnSecret: z.string().optional().nullable(),
  googleMeetClientId: z.string().optional().nullable(),
  googleMeetClientSecret: z.string().optional().nullable(),
});

export async function GET() {
  try {
    await requireAdmin();

    const sys = await prisma.systemSettings.findFirst();

    const activeProvider = sys?.activeVideoProvider || "JITSI";

    // 1. PeerJS Status & Funcionalidade
    const isPeerJsFunctional = !!(sys?.peerJsServerHost && sys?.peerJsTestStatus === "SUCCESS");
    let peerJsStatus = "CONFIG_REQUIRED";
    if (!sys?.peerJsServerHost) {
      peerJsStatus = "CONFIG_REQUIRED";
    } else if (sys?.peerJsTestStatus === "SUCCESS") {
      peerJsStatus = "OPERATIONAL";
    } else if (sys?.peerJsTestStatus === "FAILED") {
      peerJsStatus = "FAILED";
    } else {
      peerJsStatus = "CONFIGURED";
    }

    // 2. Google Meet Status & Funcionalidade (OAuth 2.0 / Google Calendar)
    const hasGoogleCredentials = Boolean(sys?.googleMeetClientId && sys?.googleMeetClientSecret);
    const hasGoogleRefreshToken = Boolean(sys?.googleMeetRefreshToken);
    const isGoogleConnected = sys?.googleMeetStatus === "CONNECTED" && hasGoogleRefreshToken;
    const isGoogleMeetFunctional = hasGoogleCredentials && isGoogleConnected;

    let googleMeetStatus = "CONFIG_REQUIRED";
    if (!sys?.googleMeetClientId || !sys?.googleMeetClientSecret) {
      googleMeetStatus = "CONFIG_REQUIRED";
    } else if (sys?.googleMeetStatus === "REVOKED") {
      googleMeetStatus = "REVOKED";
    } else if (isGoogleConnected) {
      googleMeetStatus = "CONNECTED";
    } else {
      googleMeetStatus = "CONFIGURED"; // Credenciais salvas, pendente autorização OAuth
    }

    const providers = [
      {
        key: "JITSI",
        name: "Jitsi Meet",
        description:
          "Salas de teleconsulta integradas com link temporário criptografado e sala de espera do consultório.",
        status: "ACTIVE", // Sempre disponível no V1
        isFunctional: true,
        isActive: activeProvider === "JITSI",
        config: {
          domain: sys?.jitsiDomain || "meet.jit.si",
        },
      },
      {
        key: "PEERJS",
        name: "PeerJS / WebRTC Direto",
        description:
          "Comunicação P2P ponta a ponta sem servidores intermediários de mídia. Requer servidor de sinalização STUN/TURN.",
        status: peerJsStatus,
        isFunctional: isPeerJsFunctional,
        isActive: activeProvider === "PEERJS",
        config: {
          host: sys?.peerJsServerHost || "",
          port: sys?.peerJsServerPort || 9000,
          path: sys?.peerJsPath || "/peerjs",
          secure: sys?.peerJsSecure ?? false,
          stunServer: sys?.peerJsStunServer || "stun:stun.l.google.com:19302",
          turnServer: sys?.peerJsTurnServer || "",
          turnUser: sys?.peerJsTurnUser || "",
          hasTurnSecret: !!sys?.peerJsTurnSecret,
          turnSecret: sys?.peerJsTurnSecret ? "••••••••" : "",
          lastTestedAt: sys?.peerJsLastTestedAt || null,
          testStatus: sys?.peerJsTestStatus || null,
        },
      },
      {
        key: "GOOGLE_MEET",
        name: "Google Meet",
        description:
          "Geração automática de reuniões no Google Agenda via Google OAuth 2.0 e Google Calendar API.",
        status: googleMeetStatus,
        isFunctional: isGoogleMeetFunctional,
        isActive: activeProvider === "GOOGLE_MEET",
        config: {
          clientId: sys?.googleMeetClientId || "",
          hasClientSecret: Boolean(sys?.googleMeetClientSecret),
          clientSecret: sys?.googleMeetClientSecret ? "••••••••" : "",
          accountEmail: sys?.googleMeetAccountEmail || null,
          connectedAt: sys?.googleMeetConnectedAt || null,
          status: sys?.googleMeetStatus || null,
        },
      },
    ];

    return NextResponse.json({
      activeVideoProvider: activeProvider,
      providers,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao consultar provedores de vídeo:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const result = updateVideoProvidersSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const {
      activeVideoProvider,
      jitsiDomain,
      peerJsServerHost,
      peerJsServerPort,
      peerJsPath,
      peerJsSecure,
      peerJsStunServer,
      peerJsTurnServer,
      peerJsTurnUser,
      peerJsTurnSecret,
      googleMeetClientId,
      googleMeetClientSecret,
    } = result.data;

    const existing = await prisma.systemSettings.findFirst();

    // Regra da Task 9 / Phase 1: Bloqueia PeerJS não funcional
    if (activeVideoProvider === "PEERJS") {
      if (!peerJsServerHost) {
        return NextResponse.json(
          { error: "O provedor PeerJS não pode ser ativado sem configurar o host do servidor de sinalização." },
          { status: 400 }
        );
      }
      if (existing?.peerJsTestStatus !== "SUCCESS") {
        return NextResponse.json(
          { error: "O provedor PeerJS requer um teste de conexão bem-sucedido antes de ser ativado como provedor padrão." },
          { status: 400 }
        );
      }
    }

    // Regra da Phase 2: Bloqueia Google Meet não funcional
    if (activeVideoProvider === "GOOGLE_MEET") {
      const hasId = Boolean(googleMeetClientId || existing?.googleMeetClientId);
      const hasSecret = Boolean(
        (googleMeetClientSecret && googleMeetClientSecret !== "••••••••") ||
          existing?.googleMeetClientSecret
      );
      const isConnected = existing?.googleMeetStatus === "CONNECTED" && Boolean(existing?.googleMeetRefreshToken);

      if (!hasId || !hasSecret) {
        return NextResponse.json(
          { error: "O Google Meet requer configuração do Client ID e Client Secret do Google Cloud Console." },
          { status: 400 }
        );
      }

      if (!isConnected) {
        return NextResponse.json(
          {
            error:
              "O Google Meet não pode ser definido como provedor padrão antes de autorizar e conectar sua conta Google via OAuth.",
          },
          { status: 400 }
        );
      }
    }

    // Preserva TURN secret existente se mascarado ou omitido
    let finalTurnSecret = existing?.peerJsTurnSecret || null;
    if (peerJsTurnSecret !== undefined && peerJsTurnSecret !== "••••••••") {
      finalTurnSecret = peerJsTurnSecret ? peerJsTurnSecret.trim() : null;
    }

    // Preserva Google Client Secret existente se mascarado ou omitido
    let finalGoogleSecret = existing?.googleMeetClientSecret || null;
    if (googleMeetClientSecret !== undefined && googleMeetClientSecret !== "••••••••") {
      finalGoogleSecret = googleMeetClientSecret ? googleMeetClientSecret.trim() : null;
    }

    const updated = await prisma.systemSettings.upsert({
      where: { id: "default" },
      update: {
        activeVideoProvider,
        jitsiDomain: jitsiDomain || "meet.jit.si",
        peerJsServerHost: peerJsServerHost || null,
        peerJsServerPort: peerJsServerPort || 9000,
        peerJsPath: peerJsPath || "/peerjs",
        peerJsSecure: peerJsSecure ?? false,
        peerJsStunServer: peerJsStunServer || null,
        peerJsTurnServer: peerJsTurnServer || null,
        peerJsTurnUser: peerJsTurnUser || null,
        peerJsTurnSecret: finalTurnSecret,
        googleMeetClientId: googleMeetClientId || null,
        googleMeetClientSecret: finalGoogleSecret,
      },
      create: {
        id: "default",
        activeVideoProvider,
        jitsiDomain: jitsiDomain || "meet.jit.si",
        peerJsServerHost: peerJsServerHost || null,
        peerJsServerPort: peerJsServerPort || 9000,
        peerJsPath: peerJsPath || "/peerjs",
        peerJsSecure: peerJsSecure ?? false,
        peerJsStunServer: peerJsStunServer || null,
        peerJsTurnServer: peerJsTurnServer || null,
        peerJsTurnUser: peerJsTurnUser || null,
        peerJsTurnSecret: finalTurnSecret,
        googleMeetClientId: googleMeetClientId || null,
        googleMeetClientSecret: finalGoogleSecret,
      },
    });

    return NextResponse.json({ success: true, settings: updated });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao atualizar provedores de vídeo:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
