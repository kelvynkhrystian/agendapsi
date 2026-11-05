import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const testSchema = z.object({
  domain: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json().catch(() => ({}));
    const parsed = testSchema.safeParse(body);

    const sys = await prisma.systemSettings.findFirst();
    const rawDomain =
      parsed.success && parsed.data.domain ? parsed.data.domain.trim() : sys?.jitsiDomain || "meet.jit.si";

    const cleanDomain = rawDomain.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    const testUrl = `https://${cleanDomain}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    try {
      const res = await fetch(testUrl, {
        signal: controller.signal,
        headers: { "User-Agent": "PSI-Teleconsulta/1.0" },
      });
      clearTimeout(timeout);

      return NextResponse.json({
        success: true,
        message: `Servidor Jitsi (${cleanDomain}) alcançável e operacional!`,
        domain: cleanDomain,
        status: res.status,
      });
    } catch (fetchErr: unknown) {
      clearTimeout(timeout);
      const msg = fetchErr instanceof Error ? fetchErr.message : "Tempo limite de conexão esgotado.";
      return NextResponse.json(
        {
          success: false,
          error: `Não foi possível conectar ao servidor Jitsi em ${testUrl} (${msg}). Verifique se o domínio está correto e possui certificado SSL válido.`,
        },
        { status: 400 }
      );
    }
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao testar Jitsi Meet:", error);
    return NextResponse.json({ error: "Erro interno ao testar Jitsi." }, { status: 500 });
  }
}
