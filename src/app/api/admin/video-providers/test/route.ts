import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const testSchema = z.object({
  host: z.string().optional(),
  port: z.number().int().optional(),
  path: z.string().optional(),
  secure: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const body = await req.json().catch(() => ({}));
    const parsed = testSchema.safeParse(body);

    const sys = await prisma.systemSettings.findFirst();

    const host = parsed.success && parsed.data.host !== undefined ? parsed.data.host : sys?.peerJsServerHost;
    const port = parsed.success && parsed.data.port !== undefined ? parsed.data.port : (sys?.peerJsServerPort || 9000);
    const path = parsed.success && parsed.data.path !== undefined ? parsed.data.path : (sys?.peerJsPath || "/peerjs");
    const secure = parsed.success && parsed.data.secure !== undefined ? parsed.data.secure : (sys?.peerJsSecure ?? false);

    if (!host) {
      return NextResponse.json(
        { error: "Host do servidor de sinalização é obrigatório para realizar o teste." },
        { status: 400 }
      );
    }

    const cleanPath = path ? (path.startsWith("/") ? path : `/${path}`) : "/peerjs";
    const protocol = secure ? "https" : "http";
    const targetUrl = `${protocol}://${host}:${port}${cleanPath}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    let testSuccess = false;
    let errorMessage = "";

    try {
      const res = await fetch(targetUrl, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      clearTimeout(timeoutId);

      // O PeerServer padrão responde com 200 ou 404 em rotas de base
      if (res.ok || res.status === 404) {
        testSuccess = true;
      } else {
        errorMessage = `Servidor retornou código HTTP ${res.status}: ${res.statusText}`;
      }
    } catch (fetchErr: unknown) {
      clearTimeout(timeoutId);
      const msg = fetchErr instanceof Error ? fetchErr.message : "Tempo limite de conexão esgotado.";
      errorMessage = `Não foi possível conectar ao servidor em ${targetUrl} (${msg})`;
    }

    const now = new Date();
    const testStatus = testSuccess ? "SUCCESS" : "FAILED";

    // Persiste o resultado do teste de sinalização nas configurações
    await prisma.systemSettings.upsert({
      where: { id: "default" },
      update: {
        peerJsLastTestedAt: now,
        peerJsTestStatus: testStatus,
      },
      create: {
        id: "default",
        peerJsLastTestedAt: now,
        peerJsTestStatus: testStatus,
      },
    });

    if (!testSuccess) {
      return NextResponse.json(
        {
          success: false,
          testStatus: "FAILED",
          lastTestedAt: now.toISOString(),
          error: errorMessage,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      testStatus: "SUCCESS",
      lastTestedAt: now.toISOString(),
      message: `Conexão de sinalização validada com sucesso em ${targetUrl}!`,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao testar sinalização PeerJS:", error);
    return NextResponse.json({ error: "Erro interno ao executar teste de sinalização." }, { status: 500 });
  }
}
