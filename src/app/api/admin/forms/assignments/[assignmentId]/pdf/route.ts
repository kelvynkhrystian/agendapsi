import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { generateFormSubmissionPdf } from "@/lib/forms-pdf";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    await requireAdmin();
    const { assignmentId } = await params;

    const assignment = await prisma.patientFormAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        patient: { select: { fullName: true } },
        template: { select: { title: true } },
      },
    });

    if (!assignment) {
      return NextResponse.json({ error: "Atribuição não encontrada." }, { status: 404 });
    }

    const pdfBuffer = await generateFormSubmissionPdf(assignmentId);

    const snapshot = assignment.snapshot as any;
    const formTitle = snapshot?.title || assignment.template?.title || "formulario";
    const patientName = assignment.patient?.fullName || "paciente";

    const cleanFileName = `formulario-${patientName}-${formTitle}`
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 80);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${cleanFileName}.pdf"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
    }
    console.error("Erro ao gerar PDF do formulário:", error);
    return NextResponse.json({ error: "Erro interno ao gerar PDF." }, { status: 500 });
  }
}
