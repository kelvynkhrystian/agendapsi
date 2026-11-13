import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { extractQuestionsFromPdf } from "@/lib/forms-pdf";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const formData = await req.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
    }

    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Selecione um arquivo PDF para importar." }, { status: 400 });
    }

    // Validação de tipo MIME e extensão
    const isPdfMime = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdfMime) {
      return NextResponse.json({ error: "O arquivo deve ser obrigatoriamente um documento em formato PDF." }, { status: 400 });
    }

    // Limite de 15 MB
    const maxBytes = 15 * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json({ error: "O arquivo PDF excede o limite máximo de 15 MB." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const extraction = await extractQuestionsFromPdf(buffer);

    return NextResponse.json({
      success: true,
      title: extraction.title,
      description: extraction.description,
      instructions: extraction.instructions,
      questions: extraction.questions,
      isScannedOrEmpty: extraction.isScannedOrEmpty,
      noQuestionsFound: extraction.noQuestionsFound,
      warning: extraction.warning,
      rawTextPreview: extraction.rawTextPreview,
      stats: extraction.stats,
      data: extraction,
    });
  } catch (err: any) {
    if (err?.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro na importação de PDF:", err);
    return NextResponse.json({ error: "Falha ao processar o arquivo PDF." }, { status: 500 });
  }
}
