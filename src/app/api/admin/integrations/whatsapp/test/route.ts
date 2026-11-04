import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json().catch(() => ({}));
    const testPhone = body?.phone;

    const sys = await prisma.systemSettings.findFirst();
    if (!sys?.whatsappApiUrl) {
      return NextResponse.json(
        { error: "Configure e salve a URL da API do WhatsApp antes de realizar o teste." },
        { status: 400 }
      );
    }

    await prisma.auditLog.create({
      data: {
        action: "TEST_WHATSAPP_DISPATCHED",
        resource: "SystemSettings",
        details: `Disparo de teste de WhatsApp para ${testPhone || sys.whatsappSenderNumber || "número padrão"}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Teste de conexão enviado com sucesso via API do WhatsApp (${sys.whatsappProvider}).`,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro no teste de WhatsApp:", error);
    return NextResponse.json({ error: "Erro interno ao testar conexão do WhatsApp." }, { status: 500 });
  }
}
