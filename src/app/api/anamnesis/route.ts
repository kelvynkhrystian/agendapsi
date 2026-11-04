import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requirePatient } from "@/lib/auth";

const submitAnamnesisSchema = z.object({
  templateId: z.string().min(1),
  answers: z.record(z.any()),
});

export async function GET() {
  try {
    const template = await prisma.anamnesisTemplate.findFirst({
      where: { isActive: true },
      orderBy: { version: "desc" },
    });

    if (!template) {
      return NextResponse.json({ error: "Nenhum modelo de anamnese ativo." }, { status: 404 });
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error("Erro ao buscar template de anamnese:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePatient();
    const body = await req.json();
    const result = submitAnamnesisSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { templateId, answers } = result.data;

    const template = await prisma.anamnesisTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return NextResponse.json({ error: "Modelo de anamnese não encontrado." }, { status: 404 });
    }

    const submission = await prisma.anamnesisSubmission.create({
      data: {
        templateId,
        patientId: session.userId,
        templateVersion: template.version,
        answersJson: JSON.stringify(answers),
        status: "PENDING_REVIEW",
      },
    });

    // Auditoria
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        userRole: "PATIENT",
        action: "ANAMNESIS_SUBMITTED",
        resource: "AnamnesisSubmission",
        resourceId: submission.id,
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Anamnese enviada com sucesso! O profissional irá analisar as respostas.",
      submission,
    }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message.includes("FORBIDDEN"))) {
      return NextResponse.json({ error: "Acesso restrito ao paciente." }, { status: 403 });
    }
    console.error("Erro no envio da anamnese:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
