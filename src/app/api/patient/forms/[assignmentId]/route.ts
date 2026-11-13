import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePatient } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const session = await requirePatient();
    const { assignmentId } = await params;

    const assignment = await prisma.patientFormAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        template: {
          select: { title: true },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json({ error: "Formulário não encontrado." }, { status: 404 });
    }

    if (assignment.patientId !== session.userId) {
      return NextResponse.json({ error: "Acesso negado a este formulário." }, { status: 403 });
    }

    const now = new Date();
    let status = assignment.status;
    if (
      (status === "PENDING" || status === "IN_PROGRESS") &&
      assignment.expiresAt &&
      new Date(assignment.expiresAt) < now
    ) {
      status = "EXPIRED";
    }

    const snapshot = assignment.snapshot as any;

    return NextResponse.json({
      form: {
        id: assignment.id,
        title: snapshot?.title || assignment.template?.title || "Formulário",
        description: snapshot?.description || "",
        instructions: snapshot?.instructions || "",
        status,
        expiresAt: assignment.expiresAt ? assignment.expiresAt.toISOString() : null,
        submittedAt: assignment.submittedAt ? assignment.submittedAt.toISOString() : null,
        questions: snapshot?.questions || [],
        answers: assignment.answers || {},
      },
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
    }
    console.error("Erro ao carregar formulário:", error);
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const session = await requirePatient();
    const { assignmentId } = await params;

    const assignment = await prisma.patientFormAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        patient: { select: { id: true, fullName: true } },
      },
    });

    if (!assignment) {
      return NextResponse.json({ error: "Formulário não encontrado." }, { status: 404 });
    }

    if (assignment.patientId !== session.userId) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    if (assignment.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Este formulário já foi respondido e não aceita novas modificações." },
        { status: 400 }
      );
    }

    const now = new Date();
    if (assignment.expiresAt && new Date(assignment.expiresAt) < now) {
      return NextResponse.json(
        { error: "O prazo de resposta para este formulário expirou." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { answers, isDraft } = body;

    if (!answers || typeof answers !== "object") {
      return NextResponse.json({ error: "Respostas inválidas." }, { status: 400 });
    }

    const snapshot = assignment.snapshot as any;
    const questions: any[] = Array.isArray(snapshot?.questions) ? snapshot.questions : [];

    // Se NÃO for rascunho (é submissão final), valida perguntas obrigatórias
    if (!isDraft) {
      const missingFields: string[] = [];

      for (const q of questions) {
        if (q.type === "INFO_SECTION") continue;
        if (q.isRequired) {
          const val = answers[q.id];
          const isEmpty =
            val === undefined ||
            val === null ||
            val === "" ||
            (Array.isArray(val) && val.length === 0);

          if (isEmpty) {
            missingFields.push(q.label);
          }
        }
      }

      if (missingFields.length > 0) {
        return NextResponse.json(
          {
            error: "Existem perguntas obrigatórias não respondidas.",
            missingFields,
          },
          { status: 400 }
        );
      }

      // Conclui o formulário
      const updated = await prisma.patientFormAssignment.update({
        where: { id: assignmentId },
        data: {
          answers,
          status: "COMPLETED",
          submittedAt: new Date(),
        },
      });

      // Cria notificação para o ADMIN
      await prisma.notification.create({
        data: {
          recipientId: "admin",
          recipientRole: "ADMIN",
          eventType: "FORM_COMPLETED",
          title: "Formulário preenchido por paciente",
          message: `${assignment.patient.fullName} completou o preenchimento do formulário "${snapshot?.title || "Formulário"}".`,
          targetUrl: `/admin/pacientes/${assignment.patientId}?tab=forms`,
          relatedEntityType: "FORM_ASSIGNMENT",
          relatedEntityId: assignment.id,
        },
      });

      return NextResponse.json({
        message: "Formulário enviado com sucesso!",
        assignment: updated,
      });
    }

    // Se for salvamento de rascunho (auto-save ou botão "Salvar Rascunho")
    const updated = await prisma.patientFormAssignment.update({
      where: { id: assignmentId },
      data: {
        answers,
        status: assignment.status === "PENDING" ? "IN_PROGRESS" : assignment.status,
      },
    });

    return NextResponse.json({
      message: "Rascunho salvo com sucesso.",
      assignment: updated,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
    }
    console.error("Erro ao salvar respostas do formulário:", error);
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}
