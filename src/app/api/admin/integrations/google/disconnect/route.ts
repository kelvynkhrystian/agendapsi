import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function POST(_req: NextRequest) {
  try {
    const session = await requireAdmin();

    const settings = await prisma.systemSettings.findFirst();

    if (!settings?.googleMeetRefreshToken && !settings?.googleMeetAccountEmail) {
      return NextResponse.json(
        { error: "Nenhuma conta Google está conectada no momento." },
        { status: 400 }
      );
    }

    const previousEmail = settings.googleMeetAccountEmail;

    // Tenta revogar o token junto ao Google caso exista
    const tokenToRevoke = settings.googleMeetRefreshToken || settings.googleMeetAccessToken;
    if (tokenToRevoke) {
      try {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${tokenToRevoke}`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });
      } catch (revokeErr) {
        console.warn("Aviso: Falha ao revogar token remotamente no Google:", revokeErr);
      }
    }

    // Se o provedor padrão atual for o Google Meet, reverte com segurança para o JITSI
    const fallbackProvider =
      settings.activeVideoProvider === "GOOGLE_MEET" ? "JITSI" : settings.activeVideoProvider;

    await prisma.systemSettings.update({
      where: { id: "default" },
      data: {
        activeVideoProvider: fallbackProvider,
        googleMeetRefreshToken: null,
        googleMeetAccessToken: null,
        googleMeetTokenExpiresAt: null,
        googleMeetAccountEmail: null,
        googleMeetConnectedAt: null,
        googleMeetStatus: "DISCONNECTED",
      },
    });

    // Registra auditoria de segurança
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        userRole: session.role,
        action: "GOOGLE_MEET_DISCONNECTED",
        resource: "SystemSettings",
        details: `Conta Google ${previousEmail || "desconhecida"} foi desconectada pelo administrador.`,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Conta Google desconectada com sucesso.",
      activeVideoProvider: fallbackProvider,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao desconectar Google Meet:", error);
    return NextResponse.json({ error: "Erro interno ao desconectar conta Google." }, { status: 500 });
  }
}
