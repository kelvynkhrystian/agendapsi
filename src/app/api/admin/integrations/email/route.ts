import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const emailConfigSchema = z.object({
  enabled: z.boolean(),
  host: z.string().optional(),
  port: z.number().int().optional(),
  encryption: z.string().default("TLS"),
  user: z.string().optional(),
  password: z.string().optional(),
  senderName: z.string().optional(),
  senderEmail: z.string().email("E-mail de remetente inválido").optional().or(z.literal("")),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const result = emailConfigSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { enabled, host, port, encryption, user, password, senderName, senderEmail } = result.data;

    const dataToUpdate: Record<string, unknown> = {
      smtpEnabled: enabled,
      smtpHost: host || null,
      smtpPort: port || 587,
      smtpEncryption: encryption,
      smtpUser: user || null,
      smtpSenderName: senderName || null,
      smtpFrom: senderEmail || null,
    };

    // Atualiza a senha apenas se for enviada nova senha não vazia
    if (password && password.trim() !== "") {
      dataToUpdate.smtpPass = password;
    }

    await prisma.systemSettings.upsert({
      where: { id: "default" },
      update: dataToUpdate,
      create: {
        id: "default",
        ...dataToUpdate,
      },
    });

    return NextResponse.json({ success: true, message: "Configurações de e-mail salvas com sucesso!" });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao salvar configuração de e-mail:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
