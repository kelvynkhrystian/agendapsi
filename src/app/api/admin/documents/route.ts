import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const category = searchParams.get("category")?.trim() || "";
    const patientId = searchParams.get("patientId")?.trim() || "";

    const files = await prisma.storedFile.findMany({
      where: {
        ...(search
          ? {
              OR: [
                { title: { contains: search } },
                { originalName: { contains: search } },
                { description: { contains: search } },
              ],
            }
          : {}),
        ...(category ? { category } : {}),
        ...(patientId
          ? {
              shares: {
                some: { patientId },
              },
            }
          : {}),
      },
      include: {
        shares: {
          include: {
            patient: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
          orderBy: { sharedAt: "desc" },
        },
        clinicalRecord: {
          select: {
            id: true,
            sessionDate: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(files, {
      headers: {
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message.includes("FORBIDDEN"))) {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao listar documentos:", error);
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}
