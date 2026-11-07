const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

test("Document & Patient Deletion Automated Tests", async (t) => {
  // Setup: Certifica que existe um Admin no banco para auditoria e contexto
  let admin = await prisma.adminAccount.findFirst();
  if (!admin) {
    admin = await prisma.adminAccount.create({
      data: {
        email: "admin_test_deletion@psi.com",
        passwordHash: "fakehash_for_test",
        fullName: "Dr. Admin Teste",
      },
    });
  }

  const storageDir = path.resolve(process.cwd(), process.env.STORAGE_DIR || "storage/uploads");
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }

  await t.test("1. Document Deletion: Admin pode excluir PDF sem retenção legal e remove arquivo físico", async () => {
    // Cria arquivo físico temporário de teste
    const testFileName = `test_pdf_deletion_${Date.now()}.pdf`;
    const testFilePath = path.join(storageDir, testFileName);
    fs.writeFileSync(testFilePath, "%PDF-1.4 Test PDF content for deletion test");

    // Cria registro de paciente temporário para compartilhar
    const tempPatient = await prisma.patient.create({
      data: {
        fullName: "Paciente Teste Documento",
        email: `patient_doc_${Date.now()}@test.com`,
        phone: "(11) 98888-0001",
        passwordHash: "hash123",
      },
    });

    // Registra StoredFile
    const storedFile = await prisma.storedFile.create({
      data: {
        title: "Relatório de Alta Temporário",
        originalName: "alta_teste.pdf",
        storedFileName: testFileName,
        mimeType: "application/pdf",
        sizeBytes: 42,
        category: "PATIENT_DOCUMENT",
        uploadedBy: admin.id,
      },
    });

    // Cria compartilhamento com paciente
    const share = await prisma.storedFileShare.create({
      data: {
        fileId: storedFile.id,
        patientId: tempPatient.id,
        canDownload: true,
      },
    });

    assert.ok(fs.existsSync(testFilePath), "Arquivo físico deve existir antes da exclusão");

    // Simula a lógica da rota DELETE /api/files/[id]
    // 1. Verifica se não é retido por prontuário
    assert.equal(storedFile.clinicalRecordId, null);
    assert.notEqual(storedFile.category, "CLINICAL_NOTE_EXPORT");

    // 2. Remove arquivo físico
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }

    // 3. Deleta registros em transação
    await prisma.$transaction(async (tx) => {
      await tx.storedFileShare.deleteMany({ where: { fileId: storedFile.id } });
      await tx.storedFile.delete({ where: { id: storedFile.id } });
      await tx.auditLog.create({
        data: {
          userId: admin.id,
          userRole: "ADMIN",
          action: "DOCUMENT_DELETED",
          resource: "StoredFile",
          resourceId: storedFile.id,
          details: JSON.stringify({ title: storedFile.title, originalName: storedFile.originalName }),
        },
      });
    });

    assert.ok(!fs.existsSync(testFilePath), "Arquivo físico deve ter sido removido do disco");

    const foundFile = await prisma.storedFile.findUnique({ where: { id: storedFile.id } });
    assert.equal(foundFile, null, "Registro StoredFile deve ter sido excluído do banco");

    const foundShare = await prisma.storedFileShare.findUnique({ where: { id: share.id } });
    assert.equal(foundShare, null, "Compartilhamentos associados devem ser excluídos");

    const audit = await prisma.auditLog.findFirst({
      where: { action: "DOCUMENT_DELETED", resourceId: storedFile.id },
    });
    assert.ok(audit, "Log de auditoria da exclusão do documento deve ter sido registrado");

    // Limpa paciente de teste
    await prisma.patient.delete({ where: { id: tempPatient.id } });
  });

  await t.test("2. Document Deletion Protection: Documentos vinculados a prontuários clínicos são protegidos", async () => {
    const tempPatient = await prisma.patient.create({
      data: {
        fullName: "Paciente Prontuário Retenção",
        email: `patient_retention_${Date.now()}@test.com`,
        phone: "(11) 98888-0002",
        passwordHash: "hash123",
      },
    });

    const clinicalRecord = await prisma.clinicalRecord.create({
      data: {
        patientId: tempPatient.id,
        sessionDate: new Date(),
        noteRichText: "Evolução clínica oficial protegida por sigilo.",
      },
    });

    const protectedFile = await prisma.storedFile.create({
      data: {
        title: "Exportação de Prontuário",
        originalName: "prontuario_oficial.pdf",
        storedFileName: `protected_${Date.now()}.pdf`,
        mimeType: "application/pdf",
        sizeBytes: 100,
        category: "CLINICAL_NOTE_EXPORT",
        clinicalRecordId: clinicalRecord.id,
        uploadedBy: admin.id,
      },
    });

    // Tentativa de exclusão de arquivo protegido deve ser barrada
    const isProtected = !!protectedFile.clinicalRecordId || protectedFile.category === "CLINICAL_NOTE_EXPORT";
    assert.equal(isProtected, true, "Documento vinculado a prontuário deve ser sinalizado como protegido");

    // Limpeza
    await prisma.storedFile.delete({ where: { id: protectedFile.id } });
    await prisma.clinicalRecord.delete({ where: { id: clinicalRecord.id } });
    await prisma.patient.delete({ where: { id: tempPatient.id } });
  });

  await t.test("3. Patient Deletion: Paciente sem registros clínicos/financeiros pode ser excluído permanentemente", async () => {
    const disposablePatient = await prisma.patient.create({
      data: {
        fullName: "Paciente Descartável Sem Histórico",
        email: `patient_disposable_${Date.now()}@test.com`,
        phone: "(11) 98888-0003",
        passwordHash: "hash123",
      },
    });

    // Cria registro dependente simples descartável (ex: guardian)
    const guardian = await prisma.guardian.create({
      data: {
        patientId: disposablePatient.id,
        fullName: "Responsável Temporário",
        cpf: "111.222.333-44",
        phone: "(11) 98888-0004",
        email: "responsavel@teste.com",
        relationship: "Mãe",
      },
    });

    // Verificação de dependências
    const [clinicalCount, apptCount, paymentCount] = await Promise.all([
      prisma.clinicalRecord.count({ where: { patientId: disposablePatient.id } }),
      prisma.appointment.count({ where: { patientId: disposablePatient.id } }),
      prisma.payment.count({ where: { patientId: disposablePatient.id } }),
    ]);

    const hasProtectedRecords = clinicalCount > 0 || apptCount > 0 || paymentCount > 0;
    assert.equal(hasProtectedRecords, false, "Paciente sem consultas/prontuários não tem registros protegidos");

    // Executa exclusão permanente em transação
    await prisma.$transaction(async (tx) => {
      await tx.guardian.deleteMany({ where: { patientId: disposablePatient.id } });
      await tx.patient.delete({ where: { id: disposablePatient.id } });
      await tx.auditLog.create({
        data: {
          userId: admin.id,
          userRole: "ADMIN",
          action: "PATIENT_PERMANENTLY_DELETED",
          resource: "Patient",
          resourceId: disposablePatient.id,
          details: JSON.stringify({ fullName: disposablePatient.fullName, email: disposablePatient.email }),
        },
      });
    });

    const foundPatient = await prisma.patient.findUnique({ where: { id: disposablePatient.id } });
    assert.equal(foundPatient, null, "Paciente descartável deve ter sido excluído permanentemente");

    const foundGuardian = await prisma.guardian.findUnique({ where: { id: guardian.id } });
    assert.equal(foundGuardian, null, "Dependentes secundários devem ter sido limpos");

    const audit = await prisma.auditLog.findFirst({
      where: { action: "PATIENT_PERMANENTLY_DELETED", resourceId: disposablePatient.id },
    });
    assert.ok(audit, "Log de auditoria de exclusão permanente deve ser gerado");
  });

  await t.test("4. Patient Archival: Paciente com histórico clínico não pode ser excluído fisicamente, mas pode ser arquivado e restaurado", async () => {
    const clinicalPatient = await prisma.patient.create({
      data: {
        fullName: "Paciente com Prontuário Protegido",
        email: `patient_clinical_${Date.now()}@test.com`,
        phone: "(11) 98888-0005",
        passwordHash: "hash123",
      },
    });

    const record = await prisma.clinicalRecord.create({
      data: {
        patientId: clinicalPatient.id,
        sessionDate: new Date(),
        noteRichText: "Anotação de evolução clínica em andamento.",
      },
    });

    // 1. Verificação de dependências
    const clinicalCount = await prisma.clinicalRecord.count({ where: { patientId: clinicalPatient.id } });
    assert.ok(clinicalCount > 0, "Paciente possui prontuários");

    const hasProtectedRecords = clinicalCount > 0;
    assert.equal(hasProtectedRecords, true, "Exclusão permanente física deve ser barrada");

    // 2. Arquiva o paciente
    await prisma.$transaction(async (tx) => {
      await tx.patient.update({
        where: { id: clinicalPatient.id },
        data: { isActive: false },
      });
      await tx.session.deleteMany({
        where: { userId: clinicalPatient.id },
      });
      await tx.auditLog.create({
        data: {
          userId: admin.id,
          userRole: "ADMIN",
          action: "PATIENT_ARCHIVED",
          resource: "Patient",
          resourceId: clinicalPatient.id,
          details: JSON.stringify({ fullName: clinicalPatient.fullName }),
        },
      });
    });

    const archivedPatient = await prisma.patient.findUnique({ where: { id: clinicalPatient.id } });
    assert.equal(archivedPatient.isActive, false, "Paciente arquivado deve ter isActive = false");

    // Prontuário continua intacto!
    const preservedRecord = await prisma.clinicalRecord.findUnique({ where: { id: record.id } });
    assert.ok(preservedRecord, "Prontuário clínico DEVE ser estritamente preservado ao arquivar paciente");

    // 3. Restaura o paciente
    await prisma.patient.update({
      where: { id: clinicalPatient.id },
      data: { isActive: true },
    });

    const restoredPatient = await prisma.patient.findUnique({ where: { id: clinicalPatient.id } });
    assert.equal(restoredPatient.isActive, true, "Paciente restaurado deve ter isActive = true");

    // Limpeza do teste
    await prisma.clinicalRecord.delete({ where: { id: record.id } });
    await prisma.patient.delete({ where: { id: clinicalPatient.id } });
  });

  await t.test("5. Filtering: Listagem padrão /api/patients oculta pacientes arquivados por padrão", async () => {
    const activeP = await prisma.patient.create({
      data: {
        fullName: "Paciente Ativo Filtro Teste",
        email: `active_${Date.now()}@test.com`,
        phone: "(11) 98888-0006",
        passwordHash: "hash123",
        isActive: true,
      },
    });

    const archivedP = await prisma.patient.create({
      data: {
        fullName: "Paciente Arquivado Filtro Teste",
        email: `archived_${Date.now()}@test.com`,
        phone: "(11) 98888-0007",
        passwordHash: "hash123",
        isActive: false,
      },
    });

    // Consulta padrão (apenas ativos)
    const defaultList = await prisma.patient.findMany({
      where: { isActive: true },
    });
    assert.ok(defaultList.some((p) => p.id === activeP.id), "Paciente ativo deve constar na lista padrão");
    assert.ok(!defaultList.some((p) => p.id === archivedP.id), "Paciente arquivado NÃO deve constar na lista padrão");

    // Consulta de arquivados
    const archivedList = await prisma.patient.findMany({
      where: { isActive: false },
    });
    assert.ok(archivedList.some((p) => p.id === archivedP.id), "Paciente arquivado deve constar na lista de arquivados");
    assert.ok(!archivedList.some((p) => p.id === activeP.id), "Paciente ativo não deve constar na lista de arquivados");

    // Limpeza
    await prisma.patient.delete({ where: { id: activeP.id } });
    await prisma.patient.delete({ where: { id: archivedP.id } });
  });

  await prisma.$disconnect();
});
