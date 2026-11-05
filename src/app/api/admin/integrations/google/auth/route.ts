import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { getGoogleOAuthUrl } from "@/lib/google-calendar";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAdmin();

    const settings = await prisma.systemSettings.findFirst();
    const clientId = settings?.googleMeetClientId || process.env.GOOGLE_CLIENT_ID;
    const clientSecret = settings?.googleMeetClientSecret || process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        {
          error:
            "Client ID e Client Secret do Google OAuth são obrigatórios. Salve as credenciais nas configurações antes de conectar.",
        },
        { status: 400 }
      );
    }

    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const redirectUri = `${appUrl}/api/admin/integrations/google/callback`;

    // State CSRF seguro contendo o ID do admin e token aleatório
    const csrfToken = Math.random().toString(36).substring(2, 15);
    const state = `${session.userId}:${csrfToken}`;

    const authUrl = getGoogleOAuthUrl({
      clientId,
      redirectUri,
      state,
    });

    const isJson = req.headers.get("accept")?.includes("application/json");
    if (isJson) {
      return NextResponse.json({ authUrl, redirectUri });
    }

    return NextResponse.redirect(authUrl);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao gerar URL de autorização Google:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
