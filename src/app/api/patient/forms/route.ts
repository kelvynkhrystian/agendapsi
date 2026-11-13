import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePatient } from "@/lib/auth";

export async function GET() {
  try {
    const session = await requirePatient();
    const patientId = session.userId;

    const assignments = await prisma.patientFormAssignment.findMany({
      where: {
        patientId,
        status: {
          not: "CANCELLED",
        },
      },
      include: {
        template: {
          select: {
            title: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

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
      const questionsCount = Array.isArray(snapshot?.questions)
        ? snapshot.questions.filter((q: any) => q.type !== "INFO_SECTION").length
        : 0;

      const answersObj = (a.answers as Record<string, any>) || {};
      const answeredCount = Object.keys(answersObj).filter(
        (k) => answersObj[k] !== undefined && answersObj[k] !== null && answersObj[k] !== ""
      ).length;

      return {
        id: a.id,
        title: snapshot?.title || a.template?.title || "Formulário",
        description: snapshot?.description || "",
        status: currentStatus,
        totalQuestions: questionsCount,
        answeredQuestions: answeredCount,
        expiresAt: a.expiresAt ? a.expiresAt.toISOString() : null,
        submittedAt: a.submittedAt ? a.submittedAt.toISOString() : null,
        createdAt: a.createdAt.toISOString(),
      };
    });

    return NextResponse.json({ forms: formatted });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
    }
    console.error("Erro ao listar formulários do paciente:", error);
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}
