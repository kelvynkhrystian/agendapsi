import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { testGoogleMeetIntegration } from "@/lib/google-calendar";

export async function POST(_req: NextRequest) {
  try {
    await requireAdmin();

    const result = await testGoogleMeetIntegration();

    return NextResponse.json({
      success: true,
      message: "Integração Google Meet validada com sucesso! Sala de teste gerada e removida da agenda.",
      meetUrl: result.meetUrl,
      accountEmail: result.accountEmail,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao testar Google Meet:", error);
    const msg =
      error instanceof Error ? error.message : "Erro desconhecido ao testar Google Meet.";
    return NextResponse.json(
      {
        success: false,
        error: msg,
      },
      { status: 400 }
    );
  }
}
