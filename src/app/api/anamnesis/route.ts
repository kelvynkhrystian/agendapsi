import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession, requirePatient } from "@/lib/auth";
import { dispatchNotification } from "@/lib/notifications";

const submitAnamnesisSchema = z.object({
  templateId: z.string().min(1),
  answers: z.record(z.any()),
});

export async function GET() {
  try {
    const session = await getSession();

    const template = await prisma.anamnesisTemplate.findFirst({
      where: { isActive: true },
      orderBy: { version: "desc" },
    });

    if (!template) {
      return NextResponse.json({ error: "Nenhum modelo de anamnese ativo." }, { status: 404 });
    }

    let completed = false;
    let submission = null;

    if (session && session.role === "PATIENT") {
      // Busca a submissão mais recente do paciente
      submission = await prisma.anamnesisSubmission.findFirst({
        where: {
          patientId: session.userId,
          templateId: template.id,
        },
        orderBy: { createdAt: "desc" },
      });

      // Se existir submissão e ela NÃO estiver com status REVISION_REQUESTED, está concluída
      if (submission && submission.status !== "REVISION_REQUESTED") {
        completed = true;
      }
    }

    return NextResponse.json(
      {
        ...template,
        completed,
        submission: completed ? submission : null,
      },
      {
        headers: {
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
        },
      }
    );
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

    // Regra: Bloqueia novo envio se o paciente já possui uma ficha ativa (PENDING_REVIEW ou APPROVED)
    const activeExisting = await prisma.anamnesisSubmission.findFirst({
      where: {
        patientId: session.userId,
        templateId,
        status: { in: ["PENDING_REVIEW", "APPROVED"] },
      },
      orderBy: { createdAt: "desc" },
    });

    if (activeExisting) {
      return NextResponse.json(
        { error: "Você já respondeu a esta ficha de anamnese. Ela não pode ser editada novamente." },
        { status: 409 }
      );
    }

    // Cria a nova submissão em transação preservando o histórico anterior
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

    // Notificação para o Paciente
    await dispatchNotification({
      recipientId: session.userId,
      recipientRole: "PATIENT",
      eventType: "ANAMNESIS_COMPLETED_PATIENT",
      targetUrl: "/paciente/anamnese",
      relatedEntityType: "AnamnesisSubmission",
      relatedEntityId: submission.id,
      vars: {
        patientName: session.name,
      },
      idempotencyKey: `anamnesis-patient-${submission.id}`,
    });

    // Notificação para o Administrador (Profissional)
    const admin = await prisma.adminAccount.findFirst();
    if (admin) {
      await dispatchNotification({
        recipientId: admin.id,
        recipientRole: "ADMIN",
        eventType: "ADMIN_ANAMNESIS_COMPLETED",
        targetUrl: `/admin/pacientes/${session.userId}`,
        relatedEntityType: "AnamnesisSubmission",
        relatedEntityId: submission.id,
        vars: {
          patientName: session.name,
        },
        idempotencyKey: `anamnesis-admin-${submission.id}`,
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: "Anamnese enviada com sucesso! O profissional irá analisar as respostas.",
        submission,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message.includes("FORBIDDEN"))) {
      return NextResponse.json({ error: "Acesso restrito ao paciente." }, { status: 403 });
    }
    console.error("Erro no envio da anamnese:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
