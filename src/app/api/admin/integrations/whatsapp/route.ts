import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const whatsappConfigSchema = z.object({
  enabled: z.boolean(),
  provider: z.string().default("EVOLUTION_API"),
  apiUrl: z.string().optional(),
  apiToken: z.string().optional(),
  instanceId: z.string().optional(),
  senderNumber: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const result = whatsappConfigSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { enabled, provider, apiUrl, apiToken, instanceId, senderNumber } = result.data;

    const dataToUpdate: Record<string, unknown> = {
      whatsappEnabled: enabled,
      whatsappProvider: provider,
      whatsappApiUrl: apiUrl || null,
      whatsappInstanceId: instanceId || null,
      whatsappSenderNumber: senderNumber || null,
    };

    if (apiToken && apiToken.trim() !== "") {
      dataToUpdate.whatsappApiToken = apiToken;
    }

    await prisma.systemSettings.upsert({
      where: { id: "default" },
      update: dataToUpdate,
      create: {
        id: "default",
        ...dataToUpdate,
      },
    });

    return NextResponse.json({ success: true, message: "Configurações de WhatsApp salvas com sucesso!" });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao salvar configuração do WhatsApp:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
