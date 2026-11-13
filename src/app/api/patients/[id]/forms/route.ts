import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const assignFormSchema = z.object({
  templateId: z.string().min(1, "O modelo de formulário é obrigatório."),
  expiresAt: z.string().datetime().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id: patientId } = await params;

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, fullName: true, email: true },
    });

    if (!patient) {
      return NextResponse.json({ error: "Paciente não encontrado." }, { status: 404 });
    }

    const assignments = await prisma.patientFormAssignment.findMany({
      where: { patientId },
      include: {
        template: {
          select: {
            id: true,
            title: true,
            status: true,
            version: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Atualiza automaticamente itens expirados se necessário
    const now = new Date();
    const formatted = assignments.map((a) => {
      let currentStatus = a.status;
      if (
        (currentStatus === "PENDING" || currentStatus === "IN_PROGRESS") &&
        a.expiresAt &&
        new Date(a.expiresAt) < now
      ) {
        currentStatus = "EXPIRED";
      }

      const snapshot = a.snapshot as any;
      const questionsCount = Array.isArray(snapshot?.questions) ? snapshot.questions.length : 0;
      const answersObj = (a.answers as Record<string, any>) || {};
      const answeredCount = Object.keys(answersObj).filter(
        (k) => answersObj[k] !== undefined && answersObj[k] !== null && answersObj[k] !== ""
      ).length;

      return {
        id: a.id,
        patientId: a.patientId,
        templateId: a.templateId,
        formTitle: snapshot?.title || a.template?.title || "Formulário",
        formVersion: a.formVersion,
        status: currentStatus,
        expiresAt: a.expiresAt ? a.expiresAt.toISOString() : null,
        submittedAt: a.submittedAt ? a.submittedAt.toISOString() : null,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
        notes: a.notes,
        hasPdf: a.status === "COMPLETED",
        totalQuestions: questionsCount,
        answeredQuestions: answeredCount,
      };
    });

    return NextResponse.json({ assignments: formatted });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
    }
    console.error("Erro ao listar atribuições do paciente:", error);
    return NextResponse.json({ error: "Erro interno ao listar formulários." }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id: patientId } = await params;

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      return NextResponse.json({ error: "Paciente não encontrado." }, { status: 404 });
    }

    const body = await req.json();
    const parsed = assignFormSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos.", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { templateId, expiresAt, notes } = parsed.data;

    // Busca o template e suas questões ordenadas
    const template = await prisma.formTemplate.findUnique({
      where: { id: templateId },
      include: {
        questions: {
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!template) {
      return NextResponse.json({ error: "Modelo de formulário não encontrado." }, { status: 404 });
    }

    if (template.status !== "PUBLISHED") {
      return NextResponse.json(
        { error: "Apenas formulários com status 'Publicado' podem ser atribuídos a pacientes." },
        { status: 400 }
      );
    }

    // Congela o Snapshot Imutável para que futuras alterações no template não alterem esta atribuição
    const snapshot = {
      templateId: template.id,
      title: template.title,
      description: template.description,
      instructions: template.instructions,
      version: template.version,
      snapshottedAt: new Date().toISOString(),
      questions: template.questions.map((q) => ({
        id: q.id,
        type: q.type,
        label: q.label,
        description: q.description,
        placeholder: q.placeholder,
        isRequired: q.isRequired,
        orderIndex: q.orderIndex,
        options: q.options,
      })),
    };

    const assignment = await prisma.patientFormAssignment.create({
      data: {
        patientId,
        templateId,
        formVersion: template.version,
        status: "PENDING",
        snapshot,
        answers: {},
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        notes: notes || null,
      },
    });

    // Cria notificação interna para o paciente
    await prisma.notification.create({
      data: {
        recipientId: patient.id,
        recipientRole: "PATIENT",
        eventType: "FORM_ASSIGNED",
        title: "Novo formulário atribuído",
        message: `Você tem um novo formulário para preencher: "${template.title}". Acesse sua área do paciente para responder.`,
        targetUrl: `/paciente/formularios/${assignment.id}`,
        relatedEntityType: "FORM_ASSIGNMENT",
        relatedEntityId: assignment.id,
      },
    });

    // Registra no AuditLog
    await prisma.auditLog.create({
      data: {
        userId: admin.userId,
        userRole: admin.role,
        action: "ASSIGN_FORM",
        resource: "PatientFormAssignment",
        resourceId: assignment.id,
        details: JSON.stringify({
          patientId,
          patientName: patient.fullName,
          templateId: template.id,
          formTitle: template.title,
          formVersion: template.version,
        }),
      },
    });

    return NextResponse.json({
      message: "Formulário atribuído com sucesso.",
      assignmentId: assignment.id,
    }, { status: 201 });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
    }
    console.error("Erro ao atribuir formulário ao paciente:", error);
    return NextResponse.json({ error: "Erro interno ao atribuir formulário." }, { status: 500 });
  }
}
