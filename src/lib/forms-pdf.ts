import PDFDocument from "pdfkit";
import { prisma } from "@/lib/prisma";

export interface ExtractedQuestion {
  id: string;
  type:
    | "SHORT_TEXT"
    | "LONG_TEXT"
    | "SINGLE_CHOICE"
    | "MULTIPLE_CHOICE"
    | "DROPDOWN"
    | "NUMBER"
    | "DATE"
    | "YES_NO"
    | "INFO_SECTION";
  label: string;
  description?: string;
  placeholder?: string;
  isRequired: boolean;
  orderIndex: number;
  options?: string[];
}

export interface PdfExtractionResult {
  title: string;
  description: string;
  instructions: string;
  questions: ExtractedQuestion[];
  isScannedOrEmpty?: boolean;
  noQuestionsFound?: boolean;
  warning?: string;
  rawTextPreview?: string;
  stats?: {
    pagesCount: number;
    charCount: number;
    questionBlocksDetected: number;
    convertedFieldsCount: number;
  };
}

/**
 * Mapeia termos descritivos de tipo de resposta em formato textual para os enums oficiais do PSI.
 */
function mapExplicitAnswerType(hint: string): ExtractedQuestion["type"] | null {
  const lower = hint.toLowerCase();

  if (
    lower.includes("longo") ||
    lower.includes("longa") ||
    lower.includes("parágrafo") ||
    lower.includes("paragrafo") ||
    lower.includes("dissertativa") ||
    lower.includes("texto livre")
  ) {
    return "LONG_TEXT";
  }

  if (
    lower.includes("curto") ||
    lower.includes("curta") ||
    lower.includes("linha única") ||
    lower.includes("uma linha")
  ) {
    return "SHORT_TEXT";
  }

  if (
    lower.includes("múltipla") ||
    lower.includes("multipla") ||
    lower.includes("checkbox") ||
    lower.includes("caixa de seleção") ||
    lower.includes("caixas")
  ) {
    return "MULTIPLE_CHOICE";
  }

  if (
    lower.includes("única") ||
    lower.includes("unica") ||
    lower.includes("radio") ||
    lower.includes("exclusiva") ||
    lower.includes("botão de opção") ||
    lower.includes("uma opção")
  ) {
    return "SINGLE_CHOICE";
  }

  if (
    lower.includes("número") ||
    lower.includes("numero") ||
    lower.includes("escala") ||
    lower.includes("numérica") ||
    lower.includes("numerica") ||
    lower.includes("0 a 10") ||
    lower.includes("1 a 10") ||
    lower.includes("1 a 5")
  ) {
    return "NUMBER";
  }

  if (lower.includes("data") || lower.includes("dia/mês/ano")) {
    return "DATE";
  }

  if (lower.includes("sim ou não") || lower.includes("sim/não") || lower.includes("binária")) {
    return "YES_NO";
  }

  if (
    lower.includes("lista suspensa") ||
    lower.includes("suspensa") ||
    lower.includes("dropdown") ||
    lower.includes("seleção") ||
    lower.includes("select")
  ) {
    return "DROPDOWN";
  }

  if (
    lower.includes("seção") ||
    lower.includes("informativo") ||
    lower.includes("orientação") ||
    lower.includes("aviso")
  ) {
    return "INFO_SECTION";
  }

  return null;
}

/**
 * Analisa e extrai perguntas, alternativas e seções a partir do texto de um arquivo PDF.
 */
export async function extractQuestionsFromPdf(buffer: Buffer): Promise<PdfExtractionResult> {
  const pdfParseModule = await import("pdf-parse");

  let fullText = "";
  let pagesCount = 1;

  try {
    const uint8 = new Uint8Array(buffer);

    // Suporte para pdf-parse v2 (classe PDFParse) e v1 (função direta)
    if ((pdfParseModule as any).PDFParse) {
      const parser = new (pdfParseModule as any).PDFParse(uint8);
      const res = await parser.getText();
      fullText = res.text || "";
      pagesCount = res.pages ? res.pages.length : res.total || 1;
    } else if (typeof (pdfParseModule as any).default === "function") {
      const res = await (pdfParseModule as any).default(buffer);
      fullText = res.text || "";
      pagesCount = res.numpages || 1;
    } else if (typeof (pdfParseModule as any) === "function") {
      const res = await (pdfParseModule as any)(buffer);
      fullText = res.text || "";
      pagesCount = res.numpages || 1;
    } else {
      throw new Error("Módulo PDFParse não exporta interface suportada.");
    }
  } catch (err: any) {
    console.error("[PDF Extraction Diagnostics] Falha crítica de extração de texto:", err?.message || err);
    return {
      title: "Formulário Importado",
      description: "",
      instructions: "",
      questions: [],
      isScannedOrEmpty: false,
      warning:
        "Não foi possível ler o texto deste arquivo PDF. O arquivo pode estar corrompido, protegido por senha ou possuir codificação incompatível.",
      stats: { pagesCount: 0, charCount: 0, questionBlocksDetected: 0, convertedFieldsCount: 0 },
    };
  }

  const rawText = (fullText || "").trim();
  const charCount = rawText.replace(/\s+/g, "").length;

  // Detecção de PDF escaneado / sem camada de texto vetorial
  if (charCount < 30) {
    console.log(
      `[PDF Extraction Diagnostics] PDF escaneado ou vazio detectado. Páginas: ${pagesCount} | Caracteres: ${charCount}`
    );
    return {
      title: "Formulário Importado",
      description: "",
      instructions: "",
      questions: [],
      isScannedOrEmpty: true,
      warning:
        "O arquivo PDF enviado parece ser uma imagem digitalizada ou não possui texto selecionável. A extração automática de questões requer um PDF com texto vetorial legível.",
      rawTextPreview: rawText.slice(0, 500),
      stats: { pagesCount, charCount, questionBlocksDetected: 0, convertedFieldsCount: 0 },
    };
  }

  const lines = rawText
    .split(/\r?\n/)
    .map((line: string) => line.trim())
    .filter((line: string) => line.length > 0);

  // Padrões de cabeçalho, rodapé e metadados que NÃO são perguntas
  const ignoredLinePatterns = [
    /^psi\s*\|/i,
    /página\s*\d+(\s*de\s*\d+)?$/i,
    /^--\s*\d+\s*of\s*\d+\s*--$/i,
    /^modelo de demonstração/i,
    /•\s*continuação/i,
    /^ficha de acolhimento psicológico\s*•/i,
    /^[_\-–=•]{3,}$/,
    /^_{2,}$/,
  ];

  // Regex para início de questão numerada:
  // "1.", "01.", "001.", "1)", "01)", "1 -", "01 -", "1 –", "Pergunta 1:", "Questão 01:", "Item 1."
  const questionStartRegex =
    /^(?:(?:pergunta|questão|item)\s*)?(\d{1,3})(?:[\.\)\-–:]\s*|\s*[:\-–]\s*)(.+)$/i;

  // Regex para indicação explícita de tipo de resposta:
  // "Tipo de resposta: Texto longo", "Tipo de resposta: Escolha única (radio)", etc.
  const answerTypeRegex = /^tipo\s+de\s+resposta\s*:\s*(.+)$/i;

  // Regex para alternativa de resposta:
  // "( )", "[ ]", "(x)", "[x]", "a)", "b)", "A.", "1.", "- ", "• "
  const optionRegex =
    /^(?:(\(\s*[xX*]?\s*\))|(\[\s*[xX*]?\s*\])|([a-hA-H][\.\)])|([-•*]))\s+(.+)$/;

  let title = "Ficha de Acolhimento Psicológico";
  let titleSet = false;
  let description = "";
  let instructions = "Por favor, responda a todas as questões com sinceridade.";
  const questions: ExtractedQuestion[] = [];

  let currentQuestion: {
    number: number;
    label: string;
    description: string;
    options: string[];
    explicitType: ExtractedQuestion["type"] | null;
    hasRadio: boolean;
    hasCheckbox: boolean;
  } | null = null;

  let currentOrder = 1;
  let questionBlocksDetected = 0;

  function finalizeCurrentQuestion() {
    if (!currentQuestion) return;

    // Normaliza espaçamento e limpa resíduos de "Tipo de resposta" caso estejam concatenados
    let cleanLabel = currentQuestion.label
      .replace(/tipo\s+de\s+resposta\s*:\s*.*$/i, "")
      .replace(/\s+/g, " ")
      .trim();

    if (cleanLabel.length === 0) return;

    const lowerLabel = cleanLabel.toLowerCase();
    const options = currentQuestion.options
      .map((opt) => opt.trim())
      .filter((opt) => opt.length > 0);

    let type: ExtractedQuestion["type"] = currentQuestion.explicitType || "SHORT_TEXT";

    // Se NÃO houve tipo explícito especificado no texto, aplica heurísticas refinadas
    if (!currentQuestion.explicitType) {
      if (currentQuestion.hasCheckbox) {
        type = "MULTIPLE_CHOICE";
      } else if (currentQuestion.hasRadio || options.length > 0) {
        if (
          options.length === 2 &&
          options.some((o) => /^sim$/i.test(o.trim())) &&
          options.some((o) => /^não$/i.test(o.trim()))
        ) {
          type = "YES_NO";
        } else if (
          lowerLabel.includes("marque todas") ||
          lowerLabel.includes("assinale todas") ||
          lowerLabel.includes("quais") ||
          lowerLabel.includes("selecione os")
        ) {
          type = "MULTIPLE_CHOICE";
        } else {
          type = "SINGLE_CHOICE";
        }
      } else if (
        lowerLabel.startsWith("data de") ||
        lowerLabel.startsWith("data:") ||
        lowerLabel.includes("data de nascimento")
      ) {
        type = "DATE";
      } else if (
        lowerLabel.includes("de 0 a 10") ||
        lowerLabel.includes("escala de 0 a 10") ||
        lowerLabel.includes("nível médio de estresse") ||
        lowerLabel.startsWith("idade") ||
        lowerLabel.startsWith("quantidade") ||
        lowerLabel.includes("quantos") ||
        lowerLabel.includes("nota de 1 a 5")
      ) {
        type = "NUMBER";
      } else if (
        lowerLabel.startsWith("descreva") ||
        lowerLabel.startsWith("explique") ||
        lowerLabel.startsWith("comente") ||
        lowerLabel.startsWith("justifique") ||
        lowerLabel.startsWith("o que costuma") ||
        lowerLabel.startsWith("existe alguma") ||
        lowerLabel.includes("observações") ||
        cleanLabel.length > 80
      ) {
        type = "LONG_TEXT";
      }
    }

    questions.push({
      id: `q-${Date.now()}-${currentOrder}`,
      type,
      label: cleanLabel,
      description: currentQuestion.description.trim() || undefined,
      isRequired: type !== "INFO_SECTION",
      orderIndex: currentOrder,
      options: options.length > 0 ? options : type === "YES_NO" ? ["Sim", "Não"] : undefined,
    });

    currentOrder++;
    currentQuestion = null;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 1. Ignora linhas que correspondam a padrões de cabeçalho, rodapé ou paginação
    if (ignoredLinePatterns.some((pattern) => pattern.test(line))) {
      continue;
    }

    // 2. Identificação de início de questão numerada
    const qMatch = line.match(questionStartRegex);
    if (qMatch) {
      finalizeCurrentQuestion();
      questionBlocksDetected++;

      const num = parseInt(qMatch[1], 10);
      const initialText = qMatch[2].trim();

      currentQuestion = {
        number: num,
        label: initialText,
        description: "",
        options: [],
        explicitType: null,
        hasRadio: false,
        hasCheckbox: false,
      };
      continue;
    }

    // 3. Identificação de metadado explícito: "Tipo de resposta: ..."
    const tMatch = line.match(answerTypeRegex);
    if (tMatch && currentQuestion) {
      const explicit = mapExplicitAnswerType(tMatch[1]);
      if (explicit) {
        currentQuestion.explicitType = explicit;
      }
      continue;
    }

    // 4. Identificação de alternativa de resposta
    const optMatch = line.match(optionRegex);
    if (optMatch && currentQuestion) {
      if (optMatch[1]) currentQuestion.hasRadio = true;
      if (optMatch[2]) currentQuestion.hasCheckbox = true;
      currentQuestion.options.push(optMatch[5].trim());
      continue;
    }

    // 5. Linhas dentro do contexto de uma pergunta ativa (Multilinhas)
    if (currentQuestion) {
      if (currentQuestion.options.length === 0) {
        // Se ainda não começamos a listar opções, a linha é continuação do enunciado (pergunta multilinha)
        currentQuestion.label += ` ${line.trim()}`;
      } else {
        // Se já estávamos listando opções, a linha é continuação da última opção listada
        const lastIdx = currentQuestion.options.length - 1;
        currentQuestion.options[lastIdx] += ` ${line.trim()}`;
      }
      continue;
    }

    // 6. Linhas prévias à primeira pergunta (identificação de título e descrição do formulário)
    const lowerLine = line.toLowerCase();
    if (
      !titleSet &&
      (lowerLine.includes("ficha") ||
        lowerLine.includes("questionário") ||
        lowerLine.includes("avaliação") ||
        lowerLine.includes("escala") ||
        lowerLine.includes("anamnese")) &&
      line.length < 80
    ) {
      title = line;
      titleSet = true;
    } else if (description.length < 350 && !lowerLine.includes("modelo de demonstração")) {
      description += (description.length ? " " : "") + line;
    }
  }

  finalizeCurrentQuestion();

  // Fallback: se nenhuma pergunta numerada foi detectada, busca linhas que terminem com "?"
  if (questions.length === 0 && lines.length > 0) {
    let fallbackOrder = 1;
    for (const rawLine of lines) {
      if (ignoredLinePatterns.some((pattern) => pattern.test(rawLine))) continue;
      if (rawLine === title) continue;
      if (rawLine.endsWith("?")) {
        questionBlocksDetected++;
        questions.push({
          id: `q-fallback-${fallbackOrder}`,
          type: rawLine.length > 80 ? "LONG_TEXT" : "SHORT_TEXT",
          label: rawLine.replace(/tipo\s+de\s+resposta\s*:\s*.*$/i, "").trim(),
          isRequired: true,
          orderIndex: fallbackOrder,
        });
        fallbackOrder++;
      }
    }
  }

  const noQuestionsFound = questions.length === 0;

  console.log(
    `[PDF Extraction Diagnostics] Concluído. Páginas: ${pagesCount} | Caracteres: ${charCount} | Blocos detectados: ${questionBlocksDetected} | Campos convertidos: ${questions.length}`
  );

  return {
    title: title || "Formulário Importado via PDF",
    description: description || "Questionário importado de arquivo PDF para revisão e edição.",
    instructions: instructions || "Preencha todas as perguntas com atenção.",
    questions,
    isScannedOrEmpty: false,
    noQuestionsFound,
    warning: noQuestionsFound
      ? "Texto extraído, mas nenhuma pergunta foi identificada automaticamente."
      : undefined,
    rawTextPreview: rawText.slice(0, 1000),
    stats: {
      pagesCount,
      charCount,
      questionBlocksDetected,
      convertedFieldsCount: questions.length,
    },
  };
}

/**
 * Gera um buffer de PDF formatado profissionalmente (Padrão A4) com cabeçalho,
 * identificação do paciente, dados clínicos, corpo de respostas e rodapé com paginação.
 */
export async function generateFormSubmissionPdf(assignmentId: string): Promise<Buffer> {
  const assignment = await prisma.patientFormAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      patient: true,
      template: true,
    },
  });

  if (!assignment) {
    throw new Error("Atribuição de formulário não encontrada.");
  }

  const site = await prisma.siteSettings.findUnique({ where: { id: "default" } });
  const profile = await prisma.professionalProfile.findUnique({ where: { id: "default" } });

  const professionalName = profile?.fullName || site?.clinicName || "Profissional Titular";
  const professionalTitle = profile?.title || "Psicólogo(a)";
  const crpCrm = profile?.crpCrm ? `CRP/CRM: ${profile.crpCrm}` : null;
  const clinicName = site?.clinicName || "PSI — Gestão de Consultório";

  const patientName = assignment.patient?.fullName || "Paciente Não Identificado";
  const patientCpf = assignment.patient?.cpf ? `CPF: ${assignment.patient.cpf}` : null;

  const snapshot = assignment.snapshot as any;
  const formTitle = snapshot?.title || assignment.template?.title || "Formulário Clínico";
  const formDescription = snapshot?.description || assignment.template?.description || "";
  const submissionDate = assignment.submittedAt
    ? new Date(assignment.submittedAt).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : new Date().toLocaleDateString("pt-BR");

  const answers = (assignment.answers as Record<string, any>) || {};
  const questions: ExtractedQuestion[] = Array.isArray(snapshot?.questions)
    ? snapshot.questions
    : [];

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      bufferPages: true,
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
    doc.on("error", (err) => reject(err));

    // Paleta de cores neutra e profissional
    const primaryColor = site?.primaryColor || "#0f766e";
    const darkTextColor = "#171717";
    const mutedTextColor = "#525252";
    const borderColor = "#E5E5E5";
    const accentBg = "#F8F8F8";

    // 1. CABEÇALHO DO DOCUMENTO
    doc
      .fontSize(16)
      .fillColor(primaryColor)
      .font("Helvetica-Bold")
      .text(clinicName, { align: "left" });

    doc
      .fontSize(10)
      .fillColor(mutedTextColor)
      .font("Helvetica")
      .text([professionalName, professionalTitle, crpCrm].filter(Boolean).join(" • "), {
        align: "left",
      });

    doc.moveDown(0.5);

    // Linha divisória de cabeçalho
    doc
      .strokeColor(primaryColor)
      .lineWidth(1.5)
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .stroke();

    doc.moveDown(1);

    // Box de Identificação da Avaliação e do Paciente
    const boxTop = doc.y;
    doc
      .roundedRect(50, boxTop, 495, 65, 6)
      .fillColor(accentBg)
      .fill()
      .strokeColor(borderColor)
      .lineWidth(1)
      .stroke();

    const textY = boxTop + 10;
    doc
      .fontSize(12)
      .fillColor(darkTextColor)
      .font("Helvetica-Bold")
      .text(`Formulário: ${formTitle}`, 65, textY);

    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor(mutedTextColor)
      .text(`Paciente: ${patientName}${patientCpf ? ` (${patientCpf})` : ""}`, 65, textY + 18);

    doc
      .fontSize(9)
      .fillColor(mutedTextColor)
      .text(`Data de Preenchimento: ${submissionDate}`, 65, textY + 34);

    doc.y = boxTop + 75;
    doc.moveDown(0.8);

    if (formDescription) {
      doc
        .fontSize(9)
        .font("Helvetica-Oblique")
        .fillColor(mutedTextColor)
        .text(formDescription, { align: "justify" });
      doc.moveDown(1);
    }

    // 2. CORPO: PERGUNTAS E RESPOSTAS
    questions.forEach((q, idx) => {
      // Se estiver próximo do fim da página, cria nova página
      if (doc.y > 680) {
        doc.addPage();
      }

      const qAnswer = answers[q.id];

      // Seção Informativa (sem campo de resposta)
      if (q.type === "INFO_SECTION") {
        doc.moveDown(0.5);
        doc
          .fontSize(11)
          .font("Helvetica-Bold")
          .fillColor(primaryColor)
          .text(q.label);

        if (q.description) {
          doc
            .fontSize(9)
            .font("Helvetica")
            .fillColor(mutedTextColor)
            .text(q.description);
        }
        doc.moveDown(0.5);
        return;
      }

      // Pergunta comum
      const questionTitle = `${idx + 1}. ${q.label}`;

      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .fillColor(darkTextColor)
        .text(questionTitle);

      if (q.description) {
        doc
          .fontSize(8.5)
          .font("Helvetica-Oblique")
          .fillColor(mutedTextColor)
          .text(q.description);
      }

      doc.moveDown(0.2);

      // Formatação da Resposta
      let answerText = "Não respondido";
      const hasAnswer =
        qAnswer !== undefined &&
        qAnswer !== null &&
        qAnswer !== "" &&
        !(Array.isArray(qAnswer) && qAnswer.length === 0);

      if (hasAnswer) {
        if (Array.isArray(qAnswer)) {
          answerText = qAnswer.join(", ");
        } else if (typeof qAnswer === "boolean") {
          answerText = qAnswer ? "Sim" : "Não";
        } else if (q.type === "DATE" && typeof qAnswer === "string") {
          answerText = qAnswer.includes("T") ? qAnswer.split("T")[0] : qAnswer;
        } else {
          answerText = String(qAnswer);
        }
      }

      const isUnanswered = !hasAnswer;

      doc
        .fontSize(9.5)
        .font(isUnanswered ? "Helvetica-Oblique" : "Helvetica")
        .fillColor(isUnanswered ? "#8C8C8C" : "#0D0D0D")
        .text(`Resposta: ${answerText}`, 65, doc.y, {
          indent: 0,
          align: "left",
        });

      doc.moveDown(0.8);
    });

    // 3. RODAPÉ DINÂMICO EM TODAS AS PÁGINAS
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);

      // Linha separadora do rodapé
      doc
        .strokeColor(borderColor)
        .lineWidth(0.5)
        .moveTo(50, 770)
        .lineTo(545, 770)
        .stroke();

      const footerText = `${professionalName}  |  Paciente: ${patientName}  |  Página ${i + 1} de ${range.count}`;
      doc
        .fontSize(8)
        .font("Helvetica")
        .fillColor(mutedTextColor)
        .text(footerText, 50, 778, { align: "center", width: 495 });
    }

    doc.end();
  });
}
