import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const serviceUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().nullable().optional(),
  priceCents: z.number().int().min(0).optional(),
  isFree: z.boolean().optional(),
  durationMinutes: z.number().int().min(15).optional(),
  bufferMinutes: z.number().int().min(0).optional(),
  modality: z.enum(["PRESENTIAL", "ONLINE", "BOTH"]).optional(),
  confirmationPolicy: z.enum(["AUTOMATIC", "UPON_PAYMENT", "MANUAL_ADMIN", "PAYMENT_AND_ADMIN"]).optional(),
  cancellationNoticeDays: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const service = await prisma.service.findUnique({
      where: { id },
    });

    if (!service) {
      return NextResponse.json({ error: "Serviço não encontrado." }, { status: 404 });
    }

    return NextResponse.json(service);
  } catch (error) {
    console.error("Erro ao buscar serviço:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const result = serviceUpdateSchema.safeParse(body);

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

    const updated = await prisma.service.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao atualizar serviço:", error);
    return NextResponse.json({ error: "Erro ao atualizar serviço." }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    // Em vez de exclusão física destrutiva que pode quebrar relacionamentos com agendamentos anteriores, desativa
    const deactivated = await prisma.service.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true, service: deactivated });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao desativar serviço:", error);
    return NextResponse.json({ error: "Erro ao desativar serviço." }, { status: 500 });
  }
}
