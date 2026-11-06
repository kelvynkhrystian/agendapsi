import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const serviceSchema = z.object({
  name: z.string().min(2, "Nome do serviço é obrigatório"),
  description: z.string().optional(),
  priceCents: z.number().int().min(0, "O preço deve ser um valor positivo em centavos"),
  isFree: z.boolean().default(false),
  durationMinutes: z.number().int().min(15, "A duração mínima é de 15 minutos"),
  bufferMinutes: z.number().int().min(0).optional(),
  modality: z.enum(["PRESENTIAL", "ONLINE", "BOTH"]).optional(),
  confirmationPolicy: z.enum(["AUTOMATIC", "UPON_PAYMENT", "MANUAL_ADMIN", "PAYMENT_AND_ADMIN"]).optional(),
  cancellationNoticeDays: z.number().int().min(0).optional(),
  isActive: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const publicOnly = searchParams.get("public") === "true";

    const services = await prisma.service.findMany({
      where: publicOnly ? { isActive: true } : undefined,
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(services);
  } catch (error) {
    console.error("Erro ao listar serviços:", error);
    return NextResponse.json({ error: "Erro ao buscar serviços." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const result = serviceSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = result.data;
    if (data.isFree) {
      data.priceCents = 0;
    }

    const settings = await prisma.systemSettings.findUnique({
      where: { id: "default" },
    });

    const service = await prisma.service.create({
      data: {
        name: data.name,
        description: data.description,
        priceCents: data.priceCents,
        isFree: data.isFree,
        durationMinutes: data.durationMinutes,
        bufferMinutes: data.bufferMinutes ?? settings?.defaultBufferMinutes ?? 10,
        modality: data.modality ?? settings?.defaultModality ?? "BOTH",
        confirmationPolicy: data.confirmationPolicy ?? settings?.defaultConfirmationPolicy ?? "AUTOMATIC",
        cancellationNoticeDays: data.cancellationNoticeDays ?? settings?.defaultCancellationNoticeDays ?? 3,
        isActive: data.isActive,
      },
    });

    return NextResponse.json(service, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao criar serviço:", error);
    return NextResponse.json({ error: "Erro ao criar serviço." }, { status: 500 });
  }
}
