import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exchangeGoogleCode } from "@/lib/google-calendar";

export async function GET(req: NextRequest) {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const redirectBase = `${appUrl}/admin/configuracoes`;

  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const state = searchParams.get("state");

    if (error) {
      console.warn("[Google OAuth Callback] Erro retornado pelo Google:", error);
      return NextResponse.redirect(
        `${redirectBase}?error=${encodeURIComponent(
          "Autorização cancelada ou negada no Google."
        )}`
      );
    }

    if (!code) {
      return NextResponse.redirect(
        `${redirectBase}?error=${encodeURIComponent(
          "Código de autorização não recebido do Google."
        )}`
      );
    }

    const settings = await prisma.systemSettings.findFirst();
    const clientId = settings?.googleMeetClientId || process.env.GOOGLE_CLIENT_ID;
    const clientSecret = settings?.googleMeetClientSecret || process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        `${redirectBase}?error=${encodeURIComponent(
          "Configurações de Client ID ou Client Secret ausentes no sistema."
        )}`
      );
    }

    const redirectUri = `${appUrl}/api/admin/integrations/google/callback`;

    // Troca o código pelo token
    const tokenData = await exchangeGoogleCode({
      code,
      clientId,
      clientSecret,
      redirectUri,
    });

    const now = new Date();
    const expiresAt = new Date(now.getTime() + tokenData.expiresIn * 1000);

    // Salva as credenciais OAuth e status da conta
    await prisma.systemSettings.upsert({
      where: { id: "default" },
      update: {
        googleMeetRefreshToken:
          tokenData.refreshToken || settings?.googleMeetRefreshToken || null,
        googleMeetAccessToken: tokenData.accessToken,
        googleMeetTokenExpiresAt: expiresAt,
        googleMeetAccountEmail: tokenData.email,
        googleMeetConnectedAt: now,
        googleMeetStatus: "CONNECTED",
      },
      create: {
        id: "default",
        googleMeetRefreshToken: tokenData.refreshToken || null,
        googleMeetAccessToken: tokenData.accessToken,
        googleMeetTokenExpiresAt: expiresAt,
        googleMeetAccountEmail: tokenData.email,
        googleMeetConnectedAt: now,
        googleMeetStatus: "CONNECTED",
      },
    });

    // Registra auditoria
    await prisma.auditLog.create({
      data: {
        action: "GOOGLE_MEET_CONNECTED",
        resource: "SystemSettings",
        details: `Conta Google ${tokenData.email} autorizada para geração de links Google Meet via Google Calendar API.`,
      },
    });

    return NextResponse.redirect(
      `${redirectBase}?google_connected=1`
    );
  } catch (err: unknown) {
    console.error("[Google OAuth Callback Error]", err);
    const msg =
      err instanceof Error
        ? err.message
        : "Erro interno durante a autenticação com o Google.";
    return NextResponse.redirect(
      `${redirectBase}?error=${encodeURIComponent(msg)}`
    );
  }
}
