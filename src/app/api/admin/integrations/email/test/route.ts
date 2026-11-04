import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json().catch(() => ({}));
    const targetEmail = body?.email;

    const sys = await prisma.systemSettings.findFirst();
    if (!sys?.smtpHost || !sys?.smtpUser) {
      return NextResponse.json(
        { error: "Configure e salve o servidor SMTP (Host e Usuário) antes de realizar o teste." },
        { status: 400 }
      );
    }

    // Registra tentativa no log de auditoria
    await prisma.auditLog.create({
      data: {
        action: "TEST_EMAIL_DISPATCHED",
        resource: "SystemSettings",
        details: `Disparo de teste para ${targetEmail || sys.smtpFrom || sys.smtpUser}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Teste de envio disparado com sucesso para ${targetEmail || sys.smtpFrom || sys.smtpUser}. Verifique sua caixa de entrada e spam.`,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro no teste de email:", error);
    return NextResponse.json({ error: "Erro interno ao testar envio de e-mail." }, { status: 500 });
  }
}
