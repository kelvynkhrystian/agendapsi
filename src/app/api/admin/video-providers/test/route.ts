import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const testSchema = z.object({
  host: z.string().optional(),
  port: z.number().int().optional(),
  path: z.string().optional(),
  secure: z.boolean().optional(),
  clientTestStatus: z.enum(["SUCCESS", "FAILED"]).optional(),
  clientErrorMessage: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const body = await req.json().catch(() => ({}));
    const parsed = testSchema.safeParse(body);
    const now = new Date();

    // Se o cliente (browser) executou a verificação real via WebSocket do PeerJS (on('open') / on('error'))
    if (parsed.success && parsed.data.clientTestStatus) {
      const isSuccess = parsed.data.clientTestStatus === "SUCCESS";
      await prisma.systemSettings.upsert({
        where: { id: "default" },
        update: {
          peerJsLastTestedAt: now,
          peerJsTestStatus: parsed.data.clientTestStatus,
        },
        create: {
          id: "default",
          peerJsLastTestedAt: now,
          peerJsTestStatus: parsed.data.clientTestStatus,
        },
      });

      return NextResponse.json({
        success: isSuccess,
        testStatus: parsed.data.clientTestStatus,
        lastTestedAt: now.toISOString(),
        message: isSuccess
          ? "Sinalização disponível e conectada com sucesso."
          : (parsed.data.clientErrorMessage || "Não foi possível conectar à sinalização."),
      });
    }

    const sys = await prisma.systemSettings.findFirst();

    const host =
      parsed.success && parsed.data.host
        ? parsed.data.host
        : (sys?.peerJsServerHost || process.env.PEERJS_SERVER_HOST || process.env.PEERJS_HOST || "0.peerjs.com");
    const isDefaultCloud = !host || host === "0.peerjs.com";
    const port =
      parsed.success && parsed.data.port !== undefined
        ? parsed.data.port
        : (isDefaultCloud ? 443 : (sys?.peerJsServerPort || Number(process.env.PEERJS_SERVER_PORT) || 9000));
    const path =
      parsed.success && parsed.data.path !== undefined
        ? parsed.data.path
        : (isDefaultCloud ? "/" : (sys?.peerJsPath || process.env.PEERJS_PATH || "/peerjs"));
    const secure =
      parsed.success && parsed.data.secure !== undefined
        ? parsed.data.secure
        : (isDefaultCloud ? true : (sys?.peerJsSecure ?? (process.env.PEERJS_SECURE !== "false")));

    // No PeerJS Cloud oficial, a rota pública padrão é "/" ou "/peerjs/id"
    const targetUrl = isDefaultCloud
      ? "https://0.peerjs.com/peerjs/id"
      : ((secure && port === 443) || (!secure && port === 80)
          ? `${secure ? "https" : "http"}://${host}${path.startsWith("/") ? path : `/${path}`}`
          : `${secure ? "https" : "http"}://${host}:${port}${path.startsWith("/") ? path : `/${path}`}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    let testSuccess = false;
    let errorMessage = "";

    try {
      const res = await fetch(targetUrl, {
        signal: controller.signal,
        headers: {
          Accept: "text/plain, application/json, */*",
          "User-Agent": "PSI-Consultorios/1.0 WebRTC-Signaling-Check",
        },
      });
      clearTimeout(timeoutId);

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

    const testCompletedAt = new Date();
    const testStatus = testSuccess ? "SUCCESS" : "FAILED";

    // Persiste o resultado do teste de sinalização nas configurações
    await prisma.systemSettings.upsert({
      where: { id: "default" },
      update: {
        peerJsLastTestedAt: testCompletedAt,
        peerJsTestStatus: testStatus,
      },
      create: {
        id: "default",
        peerJsLastTestedAt: testCompletedAt,
        peerJsTestStatus: testStatus,
      },
    });

    if (!testSuccess) {
      return NextResponse.json(
        {
          success: false,
          testStatus: "FAILED",
          lastTestedAt: testCompletedAt.toISOString(),
          error: errorMessage,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      testStatus: "SUCCESS",
      lastTestedAt: testCompletedAt.toISOString(),
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
