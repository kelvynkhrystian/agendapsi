import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();

    const sys = await prisma.systemSettings.findFirst();

    // Retorna configurações com segredos mascarados para proteção no frontend
    return NextResponse.json({
      email: {
        enabled: sys?.smtpEnabled ?? false,
        host: sys?.smtpHost || "",
        port: sys?.smtpPort || 587,
        encryption: sys?.smtpEncryption || "TLS",
        user: sys?.smtpUser || "",
        hasPassword: !!sys?.smtpPass,
        senderName: sys?.smtpSenderName || "",
        senderEmail: sys?.smtpFrom || "",
        status: sys?.smtpEnabled && sys?.smtpHost && sys?.smtpUser ? "CONNECTED" : "NOT_CONFIGURED",
      },
      whatsapp: {
        enabled: sys?.whatsappEnabled ?? false,
        provider: sys?.whatsappProvider || "EVOLUTION_API",
        apiUrl: sys?.whatsappApiUrl || "",
        hasToken: !!sys?.whatsappApiToken,
        instanceId: sys?.whatsappInstanceId || "",
        senderNumber: sys?.whatsappSenderNumber || "",
        status: sys?.whatsappEnabled && sys?.whatsappApiUrl ? "CONNECTED" : "NOT_CONFIGURED",
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao obter integrações:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
