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
});

export async function GET() {
  try {
    await requireAdmin();

    const sys = await prisma.systemSettings.findFirst();

    const activeProvider = sys?.activeVideoProvider || "JITSI";
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

    const providers = [
      {
        key: "JITSI",
        name: "Jitsi Meet",
        description: "Salas de teleconsulta integradas com link temporário criptografado e sala de espera do consultório.",
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
        description: "Comunicação P2P ponta a ponta sem servidores intermediários de mídia. Requer servidor de sinalização STUN/TURN.",
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
        description: "Geração automática de reuniões no Google Agenda. Requer credenciais OAuth de projeto no Google Cloud Console.",
        status: sys?.googleMeetClientId ? "CONFIGURED" : "CONFIG_REQUIRED",
        isFunctional: false, // Adaptador preparado para OAuth
        isActive: activeProvider === "GOOGLE_MEET",
        config: {
          clientId: sys?.googleMeetClientId || "",
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
    } = result.data;

    const existing = await prisma.systemSettings.findFirst();

    // Regra: Não permitir que um provedor indisponível/não funcional se torne o ativo
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

    if (activeVideoProvider === "GOOGLE_MEET" && !googleMeetClientId) {
      return NextResponse.json(
        { error: "O Google Meet requer configuração prévia do Client ID OAuth do Google Cloud." },
        { status: 400 }
      );
    }

    // Preserva secret existente se mascarado ou omitido
    let finalTurnSecret = existing?.peerJsTurnSecret || null;
    if (peerJsTurnSecret !== undefined && peerJsTurnSecret !== "••••••••") {
      finalTurnSecret = peerJsTurnSecret ? peerJsTurnSecret.trim() : null;
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
