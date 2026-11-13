const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Helper para carregar a biblioteca de extração de PDF transpilada
function loadFormsPdfModule() {
  const tsPath = path.join(process.cwd(), "src", "lib", "forms-pdf.ts");
  const source = fs.readFileSync(tsPath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: tsPath,
  });

  const customRequire = (moduleName) => {
    if (moduleName === "@/lib/prisma" || moduleName === "./prisma") {
      return { prisma };
    }
    return require(moduleName);
  };

  const moduleObj = { exports: {} };
  const fn = new Function("module", "exports", "require", transpiled.outputText);
  fn(moduleObj, moduleObj.exports, customRequire);
  return moduleObj.exports;
}

test("Módulo de Formulários — 1. Validação de Estrutura de Rotas, Componentes e Regras PT-BR", () => {
  // 1. Rota de templates de formulários (/api/admin/forms)
  const formsRoute = fs.readFileSync(
    path.join(process.cwd(), "src", "app", "api", "admin", "forms", "route.ts"),
    "utf8"
  );
  assert.ok(formsRoute.includes("requireAdmin"), "Rota de formulários deve exigir requireAdmin()");
  assert.ok(formsRoute.includes("formTemplate"), "Deve interagir com model formTemplate");
  assert.ok(formsRoute.includes("questions"), "Deve incluir e ordenar perguntas do formulário");

  // 2. Rota de importação PDF (/api/admin/forms/import-pdf)
  const importPdfRoute = fs.readFileSync(
    path.join(process.cwd(), "src", "app", "api", "admin", "forms", "import-pdf", "route.ts"),
    "utf8"
  );
  assert.ok(importPdfRoute.includes("extractQuestionsFromPdf"), "Deve utilizar extrator de perguntas de PDF");
  assert.ok(importPdfRoute.includes("requireAdmin"), "Importação de PDF deve exigir requireAdmin()");

  // 3. Rota de duplicação (/api/admin/forms/[id]/duplicate)
  const duplicateRoute = fs.readFileSync(
    path.join(process.cwd(), "src", "app", "api", "admin", "forms", "[id]", "duplicate", "route.ts"),
    "utf8"
  );
  assert.ok(duplicateRoute.includes("Cópia de"), "Duplicação deve prefixar título com 'Cópia de'");

  // 4. Rota de atribuição de formulários a pacientes (/api/patients/[id]/forms)
  const assignRoute = fs.readFileSync(
    path.join(process.cwd(), "src", "app", "api", "patients", "[id]", "forms", "route.ts"),
    "utf8"
  );
  assert.ok(assignRoute.includes("snapshot"), "Atribuição deve congelar snapshot imutável");
  assert.ok(assignRoute.includes("AuditLog"), "Atribuição deve registrar em AuditLog");
  assert.ok(assignRoute.includes("PUBLISHED"), "Apenas formulários publicados podem ser atribuídos");

  // 5. Rota do portal do paciente (/api/patient/forms)
  const patientFormsRoute = fs.readFileSync(
    path.join(process.cwd(), "src", "app", "api", "patient", "forms", "route.ts"),
    "utf8"
  );
  assert.ok(patientFormsRoute.includes("requirePatient"), "Área do paciente deve exigir requirePatient()");

  // 6. Rota de preenchimento e rascunho (/api/patient/forms/[assignmentId])
  const patientAnswerRoute = fs.readFileSync(
    path.join(process.cwd(), "src", "app", "api", "patient", "forms", "[assignmentId]", "route.ts"),
    "utf8"
  );
  assert.ok(patientAnswerRoute.includes("isDraft"), "Deve suportar salvamento de rascunho");
  assert.ok(patientAnswerRoute.includes("COMPLETED"), "Deve finalizar status como COMPLETED");
  assert.ok(patientAnswerRoute.includes("FORM_COMPLETED"), "Deve notificar profissional ao concluir");

  // 7. Rota de geração de PDF (/api/admin/forms/assignments/[assignmentId]/pdf)
  const pdfRoute = fs.readFileSync(
    path.join(process.cwd(), "src", "app", "api", "admin", "forms", "assignments", "[assignmentId]", "pdf", "route.ts"),
    "utf8"
  );
  assert.ok(pdfRoute.includes("generateFormSubmissionPdf"), "Deve gerar PDF via generateFormSubmissionPdf");
  assert.ok(pdfRoute.includes("application/pdf"), "Header deve indicar application/pdf");

  // 8. Tela de detalhes do paciente com aba Formulários entre Documentos e Financeiro
  const patientPage = fs.readFileSync(
    path.join(process.cwd(), "src", "app", "admin", "pacientes", "[id]", "page.tsx"),
    "utf8"
  );
  assert.ok(patientPage.includes('{ key: "documents"'), "Deve conter aba de documentos");
  assert.ok(patientPage.includes('{ key: "forms", label: "Formulários"'), "Deve conter aba de formulários");
  assert.ok(patientPage.includes('{ key: "payments"'), "Deve conter aba de financeiro");

  // Verifica ordem estrita no array de abas: documents -> forms -> payments
  const docIndex = patientPage.indexOf('{ key: "documents"');
  const formsIndex = patientPage.indexOf('{ key: "forms"');
  const payIndex = patientPage.indexOf('{ key: "payments"');
  assert.ok(docIndex < formsIndex, "Aba 'documents' deve vir antes de 'forms'");
  assert.ok(formsIndex < payIndex, "Aba 'forms' deve vir antes de 'payments' (EXATAMENTE ENTRE DOCUMENTOS E FINANCEIRO)");

  // 9. Preservação do módulo de Anamnese (não deve ser removido ou alterado)
  assert.ok(patientPage.includes('{ key: "anamnesis"'), "Módulo de Anamnese deve permanecer preservado");
});

test("Módulo de Formulários — 2. Ciclo de Vida no Banco de Dados (CRUD, Versionamento, Snapshot Imutável)", async () => {
  let testPatient = null;
  let testTemplate = null;
  let testAssignment = null;

  try {
    // 1. Paciente de teste
    testPatient = await prisma.patient.upsert({
      where: { email: "teste_unitario_forms@psi.local" },
      update: {},
      create: {
        fullName: "Paciente Teste Forms",
        email: "teste_unitario_forms@psi.local",
        phone: "11999998888",
      },
    });
    assert.ok(testPatient.id);

    // 2. Criação de template com 9 tipos de perguntas
    testTemplate = await prisma.formTemplate.create({
      data: {
        title: "Avaliação Psicológica de Teste Unitário",
        description: "Formulário de teste das 9 tipologias de questões",
        instructions: "Preencha todas as questões com sinceridade.",
        status: "DRAFT",
        version: 1,
        questions: {
          create: [
            { type: "INFO_SECTION", label: "Orientações Iniciais", orderIndex: 1 },
            { type: "SHORT_TEXT", label: "Profissão", isRequired: true, orderIndex: 2 },
            { type: "LONG_TEXT", label: "Histórico e Queixa Principal", orderIndex: 3 },
            { type: "SINGLE_CHOICE", label: "Qualidade do sono", options: ["Boa", "Regular", "Ruim"], orderIndex: 4 },
            { type: "MULTIPLE_CHOICE", label: "Sintomas físicos", options: ["Dor", "Cansaço", "Tontura"], orderIndex: 5 },
            { type: "DROPDOWN", label: "Faixa etária", options: ["18-25", "26-40", "41+"], orderIndex: 6 },
            { type: "NUMBER", label: "Nível de disposição (1 a 10)", orderIndex: 7 },
            { type: "DATE", label: "Data de início dos sintomas", orderIndex: 8 },
            { type: "YES_NO", label: "Faz uso de medicação contínua?", options: ["Sim", "Não"], orderIndex: 9 },
          ],
        },
      },
      include: { questions: { orderBy: { orderIndex: "asc" } } },
    });

    assert.equal(testTemplate.version, 1);
    assert.equal(testTemplate.questions.length, 9);
    assert.equal(testTemplate.status, "DRAFT");

    // 3. Publicação
    const published = await prisma.formTemplate.update({
      where: { id: testTemplate.id },
      data: { status: "PUBLISHED" },
      include: { questions: true },
    });
    assert.equal(published.status, "PUBLISHED");

    // 4. Criação da atribuição com snapshot
    const snapshot = {
      templateId: published.id,
      title: published.title,
      version: published.version,
      questions: published.questions.map((q) => ({
        id: q.id,
        type: q.type,
        label: q.label,
        options: q.options,
      })),
    };

    testAssignment = await prisma.patientFormAssignment.create({
      data: {
        patientId: testPatient.id,
        templateId: published.id,
        formVersion: published.version,
        status: "PENDING",
        snapshot,
        answers: {},
      },
    });

    assert.ok(testAssignment.id);
    assert.equal(testAssignment.status, "PENDING");

    // 5. Atualização de Rascunho (IN_PROGRESS)
    const inProgress = await prisma.patientFormAssignment.update({
      where: { id: testAssignment.id },
      data: {
        status: "IN_PROGRESS",
        answers: { [published.questions[1].id]: "Engenheiro" },
      },
    });
    assert.equal(inProgress.status, "IN_PROGRESS");

    // 6. Conclusão (COMPLETED)
    const completed = await prisma.patientFormAssignment.update({
      where: { id: testAssignment.id },
      data: {
        status: "COMPLETED",
        submittedAt: new Date(),
        answers: {
          [published.questions[1].id]: "Engenheiro",
          [published.questions[8].id]: false,
        },
      },
    });
    assert.equal(completed.status, "COMPLETED");

    // 7. Modificação do template original para demonstrar imutabilidade do snapshot
    await prisma.formTemplate.update({
      where: { id: published.id },
      data: {
        title: "Título Alterado Posteriormente (v2)",
        version: 2,
      },
    });

    const verifyFrozen = await prisma.patientFormAssignment.findUnique({
      where: { id: testAssignment.id },
    });

    assert.equal(verifyFrozen.snapshot.title, "Avaliação Psicológica de Teste Unitário");
    assert.equal(verifyFrozen.snapshot.version, 1);
  } finally {
    if (testAssignment?.id) {
      await prisma.patientFormAssignment.deleteMany({ where: { id: testAssignment.id } }).catch(() => {});
    }
    if (testTemplate?.id) {
      await prisma.formQuestion.deleteMany({ where: { templateId: testTemplate.id } }).catch(() => {});
      await prisma.formTemplate.deleteMany({ where: { id: testTemplate.id } }).catch(() => {});
    }
    if (testPatient?.id) {
      await prisma.patient.deleteMany({ where: { id: testPatient.id } }).catch(() => {});
    }
    await prisma.$disconnect();
  }
});

test("Módulo de Formulários — 3. Extração Rigorosa do PDF de Teste com 10 Questões de Psicologia", async () => {
  const { extractQuestionsFromPdf } = loadFormsPdfModule();

  const fixturePath = path.join(process.cwd(), "tests", "fixtures", "ficha_teste_formulario_psicologia_10_perguntas.pdf");
  assert.ok(fs.existsSync(fixturePath), "Arquivo PDF de teste de psicologia deve existir no diretório de fixtures");

  const pdfBuffer = fs.readFileSync(fixturePath);
  const result = await extractQuestionsFromPdf(pdfBuffer);

  // 1. Título do documento
  assert.equal(result.title, "Ficha de Acolhimento Psicológico", "Título deve ser identificado corretamente");
  assert.ok(!result.isScannedOrEmpty, "Não deve ser classificado como escaneado");
  assert.ok(!result.noQuestionsFound, "Deve encontrar perguntas");

  // 2. Contagem exata de questões
  assert.equal(result.questions.length, 10, "O PDF de teste deve extrair EXATAMENTE 10 questões");

  // 3. Validação individual das 10 questões conforme especificação do prompt
  // Q1: Long text
  assert.equal(result.questions[0].type, "LONG_TEXT", "Questão 01 deve ser Texto longo");
  assert.ok(result.questions[0].label.includes("Qual é o principal motivo que levou você a procurar atendimento psicológico?"));
  assert.ok(!result.questions[0].label.includes("Tipo de resposta"), "Não deve conter metadado 'Tipo de resposta' no label");

  // Q2: Radio (SINGLE_CHOICE) com 5 opções
  assert.equal(result.questions[1].type, "SINGLE_CHOICE", "Questão 02 deve ser Escolha única (radio)");
  assert.ok(result.questions[1].label.includes("Como você descreveria seu estado emocional durante a última semana?"));
  assert.equal(result.questions[1].options?.length, 5, "Questão 02 deve conter 5 opções");
  assert.deepEqual(result.questions[1].options, ["Muito bem", "Bem", "Regular", "Mal", "Muito mal"]);

  // Q3: Checkbox (MULTIPLE_CHOICE) com 6 opções
  assert.equal(result.questions[2].type, "MULTIPLE_CHOICE", "Questão 03 deve ser Múltipla escolha (checkbox)");
  assert.ok(result.questions[2].label.includes("Quais áreas da sua vida têm causado mais estresse recentemente?"));
  assert.equal(result.questions[2].options?.length, 6, "Questão 03 deve conter 6 opções");
  assert.deepEqual(result.questions[2].options, [
    "Trabalho ou estudos",
    "Família",
    "Relacionamentos",
    "Finanças",
    "Saúde",
    "Outras",
  ]);

  // Q4: Number (NUMBER)
  assert.equal(result.questions[3].type, "NUMBER", "Questão 04 deve ser Número (0 a 10)");
  assert.ok(result.questions[3].label.includes("De 0 a 10, qual foi seu nível médio de estresse nos últimos 7 dias?"));

  // Q5: Radio (SINGLE_CHOICE) com 5 opções
  assert.equal(result.questions[4].type, "SINGLE_CHOICE", "Questão 05 deve ser Escolha única (radio)");
  assert.ok(result.questions[4].label.includes("Como você avalia a qualidade do seu sono nas últimas duas semanas?"));
  assert.equal(result.questions[4].options?.length, 5, "Questão 05 deve conter 5 opções");

  // Q6: Multiline Long Text (combinando quebra de linha de 'emocionalmente' e 'difíceis?')
  assert.equal(result.questions[5].type, "LONG_TEXT", "Questão 06 deve ser Texto longo");
  assert.equal(
    result.questions[5].label,
    "O que costuma ajudar você a se sentir melhor em momentos emocionalmente difíceis?",
    "Questão multilinha 06 deve ser unificada corretamente"
  );

  // Q7: Multiline Radio (SINGLE_CHOICE) com 3 opções (Sim, Não, Às vezes)
  assert.equal(result.questions[6].type, "SINGLE_CHOICE", "Questão 07 deve ser Escolha única (radio)");
  assert.equal(
    result.questions[6].label,
    "Você sente que tem alguém de confiança com quem conversar quando precisa de apoio?",
    "Questão multilinha 07 deve ser unificada corretamente"
  );
  assert.equal(result.questions[6].options?.length, 3, "Questão 07 deve conter 3 opções");
  assert.deepEqual(result.questions[6].options, ["Sim", "Não", "Às vezes"]);

  // Q8: Radio (SINGLE_CHOICE) com 4 opções
  assert.equal(result.questions[7].type, "SINGLE_CHOICE", "Questão 08 deve ser Escolha única (radio)");
  assert.ok(result.questions[7].label.includes("Com que frequência você consegue reservar tempo para descanso ou lazer?"));
  assert.equal(result.questions[7].options?.length, 4, "Questão 08 deve conter 4 opções");

  // Q9: Multiline Checkbox (MULTIPLE_CHOICE) com 6 opções
  assert.equal(result.questions[8].type, "MULTIPLE_CHOICE", "Questão 09 deve ser Múltipla escolha (checkbox)");
  assert.equal(
    result.questions[8].label,
    "Quais assuntos você gostaria de trabalhar durante o acompanhamento psicológico?",
    "Questão multilinha 09 deve ser unificada corretamente"
  );
  assert.equal(result.questions[8].options?.length, 6, "Questão 09 deve conter 6 opções");

  // Q10: Multiline Long Text
  assert.equal(result.questions[9].type, "LONG_TEXT", "Questão 10 deve ser Texto longo");
  assert.equal(
    result.questions[9].label,
    "Existe alguma informação adicional que você gostaria de compartilhar com o profissional?",
    "Questão multilinha 10 deve ser unificada corretamente"
  );

  // 4. Verificação das contagens por tipo: 3 long text, 1 number, 4 single choice, 2 multiple choice
  const typeCounts = {
    LONG_TEXT: result.questions.filter((q) => q.type === "LONG_TEXT").length,
    NUMBER: result.questions.filter((q) => q.type === "NUMBER").length,
    SINGLE_CHOICE: result.questions.filter((q) => q.type === "SINGLE_CHOICE").length,
    MULTIPLE_CHOICE: result.questions.filter((q) => q.type === "MULTIPLE_CHOICE").length,
  };

  assert.equal(typeCounts.LONG_TEXT, 3, "Devem existir exatamente 3 questões de Texto longo");
  assert.equal(typeCounts.NUMBER, 1, "Deve existir exatamente 1 questão numérica");
  assert.equal(typeCounts.SINGLE_CHOICE, 4, "Devem existir exatamente 4 questões de Escolha única (radio)");
  assert.equal(typeCounts.MULTIPLE_CHOICE, 2, "Devem existir exatamente 2 questões de Múltipla escolha (checkbox)");
  assert.equal(typeCounts.LONG_TEXT + typeCounts.NUMBER + typeCounts.SINGLE_CHOICE + typeCounts.MULTIPLE_CHOICE, 10);
});

test("Módulo de Formulários — 4. Tratamento de Casos de Borda: PDF Escaneado e PDF Sem Perguntas", async () => {
  const { extractQuestionsFromPdf } = loadFormsPdfModule();

  // Teste 1: Buffer vazio / lixo binário pequeno
  const emptyBuffer = Buffer.from("%PDF-1.4\n%%EOF");
  const emptyResult = await extractQuestionsFromPdf(emptyBuffer);
  assert.equal(emptyResult.questions.length, 0);
  assert.ok(emptyResult.isScannedOrEmpty || emptyResult.warning);

  // Teste 2: Diagnóstico honesto de PDF sem perguntas
  const { PDFDocument: PDFLibDoc } = require("pdfkit");
  const pdfDoc = new PDFLibDoc();
  const chunks = [];
  pdfDoc.on("data", (c) => chunks.push(c));

  await new Promise((resolve) => {
    pdfDoc.on("end", resolve);
    pdfDoc.fontSize(12).text("Este é um texto corrido institucional sem nenhuma questão numerada ou formulário.");
    pdfDoc.moveDown();
    pdfDoc.text("Apenas parágrafos informativos institucionais sobre a clínica e as normas de atendimento.");
    pdfDoc.end();
  });

  const textOnlyBuffer = Buffer.concat(chunks);
  const textResult = await extractQuestionsFromPdf(textOnlyBuffer);

  assert.equal(textResult.questions.length, 0);
  assert.equal(textResult.noQuestionsFound, true);
  assert.equal(
    textResult.warning,
    "Texto extraído, mas nenhuma pergunta foi identificada automaticamente."
  );
});

test("Módulo de Formulários — 5. PDF com Numeração Simples (1., 2., 3.) e Sem Rótulos Explícitos de Tipo", async () => {
  const { extractQuestionsFromPdf } = loadFormsPdfModule();
  const { PDFDocument: PDFLibDoc } = require("pdfkit");

  const pdfDoc = new PDFLibDoc();
  const chunks = [];
  pdfDoc.on("data", (c) => chunks.push(c));

  await new Promise((resolve) => {
    pdfDoc.on("end", resolve);
    pdfDoc.fontSize(14).text("Questionário Simples de Avaliação");
    pdfDoc.moveDown();
    pdfDoc.fontSize(10).text("1. Como você se sente hoje?");
    pdfDoc.text("( ) Excelente");
    pdfDoc.text("( ) Bem");
    pdfDoc.text("( ) Regular");
    pdfDoc.moveDown();
    pdfDoc.text("2. Quais sintomas você sentiu durante a última");
    pdfDoc.text("semana de trabalho?");
    pdfDoc.text("[ ] Dor de cabeça");
    pdfDoc.text("[ ] Cansaço");
    pdfDoc.moveDown();
    pdfDoc.text("3. De 0 a 10, qual seu nível de estresse?");
    pdfDoc.moveDown();
    pdfDoc.text("4. Descreva detalhadamente o que causou seu estresse recente.");
    pdfDoc.end();
  });

  const simplePdfBuffer = Buffer.concat(chunks);
  const result = await extractQuestionsFromPdf(simplePdfBuffer);

  assert.equal(result.questions.length, 4, "Deve extrair exatamente as 4 questões");
  assert.equal(result.questions[0].type, "SINGLE_CHOICE", "Questão 1 com ( ) deve ser SINGLE_CHOICE");
  assert.equal(result.questions[0].options?.length, 3);
  assert.equal(result.questions[1].type, "MULTIPLE_CHOICE", "Questão 2 com [ ] deve ser MULTIPLE_CHOICE");
  assert.equal(result.questions[1].label, "Quais sintomas você sentiu durante a última semana de trabalho?", "Multilinha unificada");
  assert.equal(result.questions[2].type, "NUMBER", "Questão 3 com '0 a 10' deve ser NUMBER");
  assert.equal(result.questions[3].type, "LONG_TEXT", "Questão 4 com 'Descreva' deve ser LONG_TEXT");
});
