const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const AdmZip = require("adm-zip");

function compileBackupLibsToTempDir(tempDir) {
  const ts = require("typescript");
  const files = [
    "src/lib/prisma.ts",
    "src/lib/translations.ts",
    "src/lib/site-media-cleanup.ts",
    "src/lib/backup.ts",
  ];

  const nmTarget = path.join(process.cwd(), "node_modules");
  const nmLink = path.join(tempDir, "node_modules");
  if (!fs.existsSync(nmLink)) {
    fs.symlinkSync(nmTarget, nmLink, process.platform === "win32" ? "junction" : "dir");
  }

  for (const relPath of files) {
    const absIn = path.join(process.cwd(), relPath);
    const source = fs.readFileSync(absIn, "utf8");
    const transpiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
        resolveJsonModule: true,
      },
      fileName: absIn,
    });
    const outText = transpiled.outputText.replace(/@\/lib\//g, "./");
    const outPath = path.join(tempDir, path.basename(relPath, ".ts") + ".js");
    fs.writeFileSync(outPath, outText, "utf8");
  }
}

function buildTamperedZipFromBuffer(sourceZipBuf, mutator) {
  const zip = new AdmZip(sourceZipBuf);
  mutator(zip);
  return zip.toBuffer();
}

function recomputeZipChecksums(zip) {
  const manifestBuf = zip.readFile("psi-backup/manifest.json");
  const checksumsObj = JSON.parse(zip.readAsText("psi-backup/checksums.json"));
  const nextEntries = {};
  for (const entry of zip.getEntries()) {
    if (entry.isDirectory || entry.entryName === "psi-backup/checksums.json") continue;
    const data = entry.getData();
    nextEntries[entry.entryName] = {
      sha256: crypto.createHash("sha256").update(data).digest("hex"),
      sizeBytes: data.length,
    };
  }
  checksumsObj.entries = nextEntries;
  if (manifestBuf) {
    zip.updateFile("psi-backup/checksums.json", Buffer.from(JSON.stringify(checksumsObj, null, 2), "utf8"));
  }
}

test("Backup & Restauração E — 1. Contratos de API, UI pt-BR, Travas de Manutenção e Documentação", () => {
  const importRoute = fs.readFileSync(
    path.join(process.cwd(), "src", "app", "api", "admin", "backup", "import", "route.ts"),
    "utf8"
  );
  assert.ok(importRoute.includes("requireAdmin"));
  assert.ok(importRoute.includes("importBackupArchive"));
  assert.ok(importRoute.includes("isRestoreInProgress"));
  assert.equal(importRoute.includes("executeStagedBackupRestoration"), false, "Importação NUNCA pode restaurar automaticamente");

  const restoreRoute = fs.readFileSync(
    path.join(process.cwd(), "src", "app", "api", "admin", "backup", "[id]", "restore", "route.ts"),
    "utf8"
  );
  assert.ok(restoreRoute.includes("requireAdmin"));
  assert.ok(restoreRoute.includes("prepareRestorePreview"));
  assert.ok(restoreRoute.includes("executeStagedBackupRestoration"));
  assert.ok(restoreRoute.includes("RESTAURAR"));

  // Travas de escrita concorrente durante restauração em progresso
  const guardedRoutes = [
    "src/app/api/appointments/route.ts",
    "src/app/api/appointments/[id]/reschedule/route.ts",
    "src/app/api/appointments/[id]/status/route.ts",
    "src/app/api/booking/confirm/route.ts",
    "src/app/api/booking/draft-hold/route.ts",
    "src/app/api/files/upload/route.ts",
    "src/app/api/patients/route.ts",
    "src/app/api/clinical-records/route.ts",
    "src/app/api/payments/[id]/confirm-manual/route.ts",
    "src/app/api/admin/minisite/media/upload/route.ts",
    "src/app/api/admin/appearance/upload/route.ts",
  ];
  for (const relRoute of guardedRoutes) {
    const content = fs.readFileSync(path.join(process.cwd(), relRoute), "utf8");
    assert.ok(content.includes("isRestoreInProgress"), `${relRoute} deve verificar isRestoreInProgress`);
    assert.ok(content.includes("503"), `${relRoute} deve retornar HTTP 503 em modo de manutenção`);
  }

  const page = fs.readFileSync(
    path.join(process.cwd(), "src", "app", "admin", "arquivos", "page.tsx"),
    "utf8"
  );
  for (const label of [
    "Gerar Novo Backup",
    "Importar Backup",
    "Baixar",
    "Restaurar",
    "Excluir",
    "Restaurar Backup",
    "Restaurar este backup substituirá os dados atuais desta instalação pelos dados presentes na cópia de segurança.",
    "RESTAURAR",
  ]) {
    assert.ok(page.includes(label), `admin/arquivos/page.tsx deve conter '${label}'`);
  }

  const securityDoc = fs.readFileSync(
    path.join(process.cwd(), "docs", "BACKUP_SEGURANCA.md"),
    "utf8"
  );
  for (const docTerm of [
    "smtpPass",
    "whatsappApiToken",
    "googleMeetClientSecret",
    "configDataEncrypted",
    "tempPassword",
    "SHA-256",
    "LUKS",
    "BitLocker",
    "rollback",
  ]) {
    assert.ok(securityDoc.includes(docTerm), `docs/BACKUP_SEGURANCA.md deve documentar '${docTerm}'`);
  }
});

test("Backup & Restauração E — 2. Fluxo Completo Isolado: Rejeições de Segurança, Importação, Rollback Automático e Restauração Fases A-E", async (t) => {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    t.skip(".env ausente");
    return;
  }

  const dbMatch = fs.readFileSync(envPath, "utf8").match(/^DATABASE_URL=["']?([^\r\n"']+)/m);
  if (!dbMatch) {
    t.skip("DATABASE_URL ausente");
    return;
  }

  const baseUrl = new URL(dbMatch[1]);
  const adminConnUrl = new URL(baseUrl.toString());
  adminConnUrl.pathname = "/information_schema";

  const { PrismaClient } = require("@prisma/client");
  const bootstrapPrisma = new PrismaClient({
    datasources: { db: { url: adminConnUrl.toString() } },
  });

  try {
    await bootstrapPrisma.$queryRawUnsafe("SELECT 1");
  } catch (err) {
    await bootstrapPrisma.$disconnect().catch(() => {});
    t.skip(`MariaDB indisponível: ${err.message}`);
    return;
  }

  const testDbName = `psi_restore_test_${Date.now()}`;
  const testDbUrlObj = new URL(baseUrl.toString());
  testDbUrlObj.pathname = `/${testDbName}`;
  const testDbUrl = testDbUrlObj.toString();

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "psi-restore-e-"));
  const tmpLibDir = path.join(tmpRoot, "libs");
  const storageRoot = path.join(tmpRoot, "storage");
  const publicUploadsRoot = path.join(tmpRoot, "public_uploads");
  fs.mkdirSync(tmpLibDir, { recursive: true });

  const roots = {
    privateUploadsDir: path.join(storageRoot, "uploads"),
    minisiteDir: path.join(storageRoot, "minisite"),
    publicUploadsDir: publicUploadsRoot,
    backupDir: path.join(storageRoot, "backups"),
    lockFilePath: path.join(storageRoot, ".restore.lock"),
  };

  fs.mkdirSync(roots.privateUploadsDir, { recursive: true });
  fs.mkdirSync(path.join(roots.minisiteDir, "top", "up_hero"), { recursive: true });
  fs.mkdirSync(path.join(roots.minisiteDir, "sobre"), { recursive: true });
  fs.mkdirSync(path.join(roots.publicUploadsDir, "branding"), { recursive: true });
  fs.mkdirSync(path.join(roots.publicUploadsDir, "icons"), { recursive: true });
  fs.mkdirSync(roots.backupDir, { recursive: true });

  const prevDatabaseUrl = process.env.DATABASE_URL;

  try {
    await bootstrapPrisma.$executeRawUnsafe(
      `CREATE DATABASE \`${testDbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );

    execFileSync(
      process.platform === "win32" ? "npx.cmd" : "npx",
      ["prisma", "db", "push", "--skip-generate"],
      {
        cwd: process.cwd(),
        env: { ...process.env, DATABASE_URL: testDbUrl },
        stdio: "pipe",
        shell: process.platform === "win32",
      }
    );

    compileBackupLibsToTempDir(tmpLibDir);
    process.env.DATABASE_URL = testDbUrl;
    delete global.prisma;

    const { prisma } = require(path.join(tmpLibDir, "prisma.js"));
    const {
      createFullBackupArchive,
      validateAndInspectBackupArchive,
      importBackupArchive,
      prepareRestorePreview,
      executeStagedBackupRestoration,
      acquireRestoreLock,
      releaseRestoreLock,
      isRestoreInProgress,
    } = require(path.join(tmpLibDir, "backup.js"));

    // 1. Popula base representativa completa (todos os relacionamentos críticos)
    const admin = await prisma.adminAccount.create({
      data: {
        name: "Dra. Clarice Lispector",
        email: "admin-restore@psi.local",
        passwordHash: "$2a$10$originaladminhash00000000000",
        phone: "11999990001",
      },
    });

    await prisma.systemSettings.create({
      data: {
        id: "default",
        timezone: "America/Sao_Paulo",
        defaultBufferMinutes: 15,
        minBookingNoticeHours: 6,
        maxBookingHorizonDays: 45,
        smtpEnabled: true,
        smtpHost: "smtp.original.local",
        smtpUser: "clinica@original.local",
        smtpPass: "SEGREDO_SMTP_ORIGINAL",
        whatsappEnabled: true,
        whatsappApiToken: "SEGREDO_WHATSAPP_ORIGINAL",
        googleMeetStatus: "CONNECTED",
        googleMeetClientId: "google-client-id-123",
        googleMeetClientSecret: "SEGREDO_GOOGLE_OAUTH",
        googleMeetRefreshToken: "SEGREDO_GOOGLE_REFRESH",
        peerJsTurnSecret: "SEGREDO_TURN_ORIGINAL",
      },
    });

    await prisma.gatewayConfiguration.create({
      data: {
        slotNumber: 1,
        providerKey: "MERCADOPAGO",
        name: "Mercado Pago Principal",
        isEnabled: true,
        configDataEncrypted: "SEGREDO_GATEWAY_CRYPTO",
      },
    });

    await prisma.siteSettings.create({
      data: {
        id: "default",
        clinicName: "Clínica Original PSI",
        aboutText: "Cuidado psicológico e psiquiátrico integrado.",
        logoUrl: "/uploads/branding/logo-clinica.png",
        heroMediaUrl: "/api/minisite/media/top/up_hero/frame-001.png",
        aboutMediaType: "VIDEO",
        aboutMediaUrl: "/api/minisite/media/sobre/video.mp4",
        customHtml: '<p><a href="/api/minisite/media/sobre/a.zip">Animação</a></p>',
        benefitsJson: JSON.stringify([
          {
            id: "b1",
            icon: "heart",
            customIconUrl: "/uploads/icons/acolhimento.svg",
            title: "Acolhimento",
            isVisible: true,
            order: 1,
          },
        ]),
      },
    });

    await prisma.professionalProfile.create({
      data: {
        id: "default",
        fullName: "Dra. Clarice Lispector",
        title: "Psicóloga Clínica",
        crpCrm: "CRP 06/12345",
        bio: "Atendimento clínico especializado.",
      },
    });

    await prisma.legalPage.create({
      data: {
        id: "privacy",
        title: "Política de Privacidade",
        contentHtml: "<p>Conteúdo LGPD oficial.</p>",
        isPublished: true,
        publishedAt: new Date(),
      },
    });

    await prisma.notificationTemplate.create({
      data: {
        type: "APPOINTMENT_CONFIRMED",
        channel: "EMAIL",
        subject: "Consulta confirmada",
        bodyTemplate: "Olá {{patientName}}",
        isActive: true,
      },
    });

    const service = await prisma.service.create({
      data: {
        name: "Psicoterapia Individual",
        durationMinutes: 50,
        bufferMinutes: 10,
        priceCents: 25000,
        modality: "BOTH",
      },
    });

    await prisma.weeklyAvailability.create({
      data: {
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "18:00",
        isActive: true,
      },
    });

    const adultPatient = await prisma.patient.create({
      data: {
        fullName: "Machado de Assis",
        email: "machado@psi.local",
        phone: "11988881111",
        tempPassword: "SenhaTemporariaNaoExportavel",
      },
    });

    const minorPatient = await prisma.patient.create({
      data: {
        fullName: "João Guimarães Menor",
        email: "menor@psi.local",
        phone: "11988882222",
        isMinor: true,
        guardians: {
          create: {
            fullName: "Responsável Legal Guimarães",
            cpf: "12345678900",
            phone: "11977770000",
            email: "responsavel@psi.local",
            relationship: "Mãe",
          },
        },
      },
    });

    const anamnesisTpl = await prisma.anamnesisTemplate.create({
      data: {
        title: "Anamnese Padrão",
        fieldsJson: JSON.stringify([{ id: "q1", label: "Queixa principal" }]),
      },
    });

    await prisma.anamnesisSubmission.create({
      data: {
        patientId: adultPatient.id,
        templateId: anamnesisTpl.id,
        templateVersion: anamnesisTpl.version,
        answersJson: JSON.stringify({ q1: "Ansiedade moderada" }),
        status: "APPROVED",
      },
    });

    const pkg = await prisma.appointmentPackage.create({
      data: {
        patientId: adultPatient.id,
        title: "Pacote 4 Sessões",
        totalPriceCents: 90000,
        status: "ACCEPTED",
        acceptedAt: new Date(),
      },
    });

    const futureStart = new Date(Date.now() + 3 * 86400000);
    const futureEnd = new Date(futureStart.getTime() + 50 * 60000);
    const appt = await prisma.appointment.create({
      data: {
        patientId: adultPatient.id,
        serviceId: service.id,
        packageId: pkg.id,
        startAt: futureStart,
        endAt: futureEnd,
        modality: "ONLINE",
        status: "CONFIRMED",
        meetingUrlSnapshot: "https://meet.jit.si/psi-room-original",
        videoMeeting: {
          create: {
            provider: "JITSI",
            roomName: "psi-room-original",
            psiEntryToken: "room-token-original",
            conferenceUrl: "https://meet.jit.si/psi-room-original",
          },
        },
      },
    });

    const payment = await prisma.payment.create({
      data: {
        appointmentId: appt.id,
        patientId: adultPatient.id,
        amountCents: 25000,
        status: "APPROVED",
        method: "IN_PERSON",
        isSimulated: false,
        confirmedAt: new Date(),
      },
    });

    const CLINICAL_TEXT = "Prontuário sigiloso original: paciente relatou melhora significativa do sono.";
    const record = await prisma.clinicalRecord.create({
      data: {
        patientId: adultPatient.id,
        appointmentId: appt.id,
        sessionDate: futureStart,
        noteRichText: `<p>${CLINICAL_TEXT}</p>`,
        summary: "Melhora clínica inicial",
        moodRating: 8,
        revisions: {
          create: {
            contentSnapshot: "<p>Versão inicial</p>",
            moodRatingSnapshot: 7,
            revisedBy: admin.id,
          },
        },
      },
    });

    // Arquivos físicos nas 3 raízes persistentes
    const pdfContent = Buffer.from("%PDF-1.4\n%Documento original do paciente Machado\n", "utf8");
    const pdfHash = crypto.createHash("sha256").update(pdfContent).digest("hex");
    fs.writeFileSync(path.join(roots.privateUploadsDir, "paciente_exame.pdf"), pdfContent);

    const frameContent = Buffer.from("PNG_FRAME_DATA_ORIGINAL_001", "utf8");
    const frameHash = crypto.createHash("sha256").update(frameContent).digest("hex");
    fs.writeFileSync(path.join(roots.minisiteDir, "top", "up_hero", "frame-001.png"), frameContent);

    const animZipContent = Buffer.from("PK\x03\x04ZIP_ANIMATION_BYTES", "utf8");
    fs.writeFileSync(path.join(roots.minisiteDir, "sobre", "a.zip"), animZipContent);

    const videoContent = Buffer.from("MP4_SOBRE_VIDEO_ORIGINAL", "utf8");
    fs.writeFileSync(path.join(roots.minisiteDir, "sobre", "video.mp4"), videoContent);

    const logoContent = Buffer.from("PNG_LOGO_CLINICA_ORIGINAL", "utf8");
    const logoHash = crypto.createHash("sha256").update(logoContent).digest("hex");
    fs.writeFileSync(path.join(roots.publicUploadsDir, "branding", "logo-clinica.png"), logoContent);

    const iconContent = Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'><circle r='4'/></svg>", "utf8");
    fs.writeFileSync(path.join(roots.publicUploadsDir, "icons", "acolhimento.svg"), iconContent);

    const storedFile = await prisma.storedFile.create({
      data: {
        title: "Exame Clínico Original",
        originalName: "exame.pdf",
        storedFileName: "paciente_exame.pdf",
        mimeType: "application/pdf",
        sizeBytes: pdfContent.length,
        category: "PATIENT_DOCUMENT",
        uploadedBy: admin.id,
        clinicalRecordId: record.id,
        shares: {
          create: {
            patientId: adultPatient.id,
            canDownload: true,
          },
        },
      },
    });

    // 2. Cria backup completo e exporta buffer (simulando download antes de apagar/corromper o servidor)
    const originBackup = await createFullBackupArchive({
      db: prisma,
      roots,
      backupType: "MANUAL",
    });
    const exportedZipBuf = fs.readFileSync(originBackup.archivePath);

    // Simula perda local dos arquivos e alteração severa da instalação ("pós-desastre")
    fs.unlinkSync(originBackup.archivePath);
    await prisma.backupJob.delete({ where: { id: originBackup.backupJob.id } });

    // Registra um backup legado .json no banco atual para testar rejeição explícita
    const legacyFilename = "psi_backup_1700000000001_legado.json";
    fs.writeFileSync(path.join(roots.backupDir, legacyFilename), JSON.stringify({ manifest: {}, data: {} }));
    const legacyJob = await prisma.backupJob.create({
      data: {
        filename: legacyFilename,
        sizeBytes: 32,
        checksumSha256: crypto.createHash("sha256").update("legacy").digest("hex"),
        status: "COMPLETED",
        details: JSON.stringify({ patientCount: 2 }),
      },
    });

    // Corrompe/altera dados atuais + arquivos em disco
    await prisma.siteSettings.update({
      where: { id: "default" },
      data: { clinicName: "Clínica Corrompida" },
    });
    await prisma.clinicalRecordRevision.deleteMany();
    await prisma.storedFileShare.deleteMany();
    await prisma.storedFile.deleteMany();
    await prisma.clinicalRecord.deleteMany();
    await prisma.payment.deleteMany();
    const extraPatient = await prisma.patient.create({
      data: {
        fullName: "Paciente Extra Pós-Backup",
        email: "extra@psi.local",
        phone: "11911112222",
      },
    });
    fs.unlinkSync(path.join(roots.privateUploadsDir, "paciente_exame.pdf"));
    fs.unlinkSync(path.join(roots.minisiteDir, "top", "up_hero", "frame-001.png"));
    fs.unlinkSync(path.join(roots.publicUploadsDir, "branding", "logo-clinica.png"));
    fs.writeFileSync(path.join(roots.minisiteDir, "extra_pos_backup.png"), Buffer.from("EXTRA"));

    // 3. Testes de Rejeição de Segurança (NENHUM pode importar ou alterar o banco)
    // 3a. Manifesto .json isolado
    await assert.rejects(
      () =>
        importBackupArchive({
          db: prisma,
          roots,
          fileBuffer: Buffer.from(JSON.stringify({ format: "legacy" }), "utf8"),
          originalFilename: "manifesto.json",
          adminUserId: admin.id,
        }),
      /Arquivos \.json isolados/
    );

    // 3b. Extensão não permitida / arquivo não ZIP
    await assert.rejects(
      () =>
        importBackupArchive({
          db: prisma,
          roots,
          fileBuffer: Buffer.from("NOT_A_ZIP_FILE", "utf8"),
          originalFilename: "malicioso.zip",
          adminUserId: admin.id,
        }),
      /Formato de arquivo inválido/
    );

    // 3c. ZIP truncado / corrompido
    await assert.rejects(
      () => validateAndInspectBackupArchive(exportedZipBuf.subarray(0, 200), prisma),
      /corrompido ou truncado/
    );

    // 3d. Path Traversal (../../evil.txt literal na entrada do ZIP)
    const traversalZip = buildTamperedZipFromBuffer(exportedZipBuf, (zip) => {
      zip.addFile("psi-backup/uploads/private/placeholder.txt", Buffer.from("pwned"));
      const entry = zip.getEntry("psi-backup/uploads/private/placeholder.txt");
      entry.entryName = "psi-backup/uploads/private/../../../evil.txt";
    });
    await assert.rejects(
      () => validateAndInspectBackupArchive(traversalZip, prisma),
      /path traversal|fora da raiz obrigatória/i
    );

    // 3e. Symlink dentro do ZIP (Unix mode S_IFLNK = 0o120000)
    const symlinkZip = buildTamperedZipFromBuffer(exportedZipBuf, (zip) => {
      zip.addFile("psi-backup/uploads/private/link_perigoso.txt", Buffer.from("/etc/passwd"));
      const entry = zip.getEntry("psi-backup/uploads/private/link_perigoso.txt");
      entry.header.attr = (0o120777 << 16) >>> 0;
    });
    await assert.rejects(
      () => validateAndInspectBackupArchive(symlinkZip, prisma),
      /Links simbólicos/i
    );

    // 3f. Script executável / SQL embutido no ZIP
    const sqlZip = buildTamperedZipFromBuffer(exportedZipBuf, (zip) => {
      zip.addFile("psi-backup/database/drop_all.sql", Buffer.from("DROP TABLE patient;"));
    });
    await assert.rejects(
      () => validateAndInspectBackupArchive(sqlZip, prisma),
      /Tipo de arquivo não permitido por segurança/i
    );

    // 3g. Adulteração de conteúdo sem bater SHA-256
    const tamperedContentZip = buildTamperedZipFromBuffer(exportedZipBuf, (zip) => {
      const patients = JSON.parse(zip.readAsText("psi-backup/database/patients.json"));
      patients[0].fullName = "Adulterado";
      zip.updateFile(
        "psi-backup/database/patients.json",
        Buffer.from(JSON.stringify(patients, null, 2), "utf8")
      );
    });
    await assert.rejects(
      () => validateAndInspectBackupArchive(tamperedContentZip, prisma),
      /Falha de integridade SHA-256/i
    );

    // 3h. Versão principal futura incompatível (com checksum válido)
    const futureMajorZip = buildTamperedZipFromBuffer(exportedZipBuf, (zip) => {
      const manifest = JSON.parse(zip.readAsText("psi-backup/manifest.json"));
      manifest.appVersion = "9.0.0";
      zip.updateFile("psi-backup/manifest.json", Buffer.from(JSON.stringify(manifest, null, 2), "utf8"));
      recomputeZipChecksums(zip);
    });
    await assert.rejects(
      () => validateAndInspectBackupArchive(futureMajorZip, prisma),
      /versão principal mais recente/i
    );

    // 3i. Tentativa de restaurar backup legado
    await assert.rejects(
      () => prepareRestorePreview({ backupId: legacyJob.id, db: prisma, roots }),
      /BACKUP_LEGADO_NAO_RESTAURAVEL/
    );

    // 4. Importação legítima do arquivo exportado (NÃO pode auto-restaurar)
    const imported = await importBackupArchive({
      db: prisma,
      roots,
      fileBuffer: exportedZipBuf,
      originalFilename: "backup-clinica-externo.zip",
      adminUserId: admin.id,
    });
    assert.equal(imported.backup.isLegacy, false);
    assert.equal(imported.backup.restorable, true);
    assert.equal(imported.backup.metadata.origin, "IMPORTED");

    // Garante que importar NÃO restaurou automaticamente
    assert.equal(
      (await prisma.siteSettings.findUnique({ where: { id: "default" } })).clinicName,
      "Clínica Corrompida",
      "Importação nunca pode sobrescrever dados atuais automaticamente"
    );
    assert.ok(
      await prisma.patient.findUnique({ where: { id: extraPatient.id } }),
      "Paciente extra deve permanecer até confirmação explícita de restauração"
    );

    // 5. Confirmação incorreta ("confirmar") deve ser recusada
    await assert.rejects(
      () =>
        executeStagedBackupRestoration({
          db: prisma,
          roots,
          backupId: imported.backup.id,
          confirmationText: "confirmar",
          adminUserId: admin.id,
        }),
      /CONFIRMACAO_INVALIDA/
    );

    // 6. Bloqueio de concorrência com trava ativa
    await acquireRestoreLock(roots, { backupId: imported.backup.id, adminUserId: admin.id, stage: "TEST" });
    assert.equal(await isRestoreInProgress(roots), true);
    await assert.rejects(
      () =>
        importBackupArchive({
          db: prisma,
          roots,
          fileBuffer: exportedZipBuf,
          originalFilename: "bloqueado.zip",
          adminUserId: admin.id,
        }),
      /RESTAURACAO_EM_ANDAMENTO/
    );
    await releaseRestoreLock(roots);
    assert.equal(await isRestoreInProgress(roots), false);

    // 7. Teste real de Rollback Automático (Fase C Snapshot + Falha induzida na troca de arquivos na Fase D)
    await assert.rejects(
      () =>
        executeStagedBackupRestoration({
          db: prisma,
          roots,
          backupId: imported.backup.id,
          confirmationText: "RESTAURAR",
          adminUserId: admin.id,
          _testFailureHook: (phase) => {
            if (phase === "DURING_FILE_SWAP") {
              throw new Error("SIMULATED_DISK_SWAP_FAILURE");
            }
          },
        }),
      /ROLLBACK_EXECUTADO/
    );

    // Após rollback, trava liberada e instalação 100% no estado pré-restauração consistente
    assert.equal(await isRestoreInProgress(roots), false, "Lock deve ser removido após rollback");
    assert.equal(
      (await prisma.siteSettings.findUnique({ where: { id: "default" } })).clinicName,
      "Clínica Corrompida",
      "Rollback deve restaurar exatamente o estado pré-restauração do banco"
    );
    assert.ok(
      await prisma.patient.findUnique({ where: { id: extraPatient.id } }),
      "Rollback deve preservar registros existentes antes da falha"
    );
    assert.equal(
      fs.existsSync(path.join(roots.minisiteDir, "extra_pos_backup.png")),
      true,
      "Rollback deve preservar arquivos existentes antes da falha"
    );
    const failedAudit = await prisma.auditLog.findFirst({
      where: { action: "BACKUP_RESTORE_FAILED", resourceId: imported.backup.id },
    });
    assert.ok(failedAudit, "Falha controlada deve registrar BACKUP_RESTORE_FAILED no AuditLog");

    // 8. Fase A Preview e Restauração Completa Bem-Sucedida (Fases A -> E)
    const previewRes = await prepareRestorePreview({
      backupId: imported.backup.id,
      db: prisma,
      roots,
    });
    assert.equal(previewRes.preview.environmentChecks.databaseConnected, true);
    assert.equal(previewRes.preview.environmentChecks.storageWritable, true);
    assert.equal(previewRes.preview.environmentChecks.hasSufficientDiskSpace, true);
    assert.equal(previewRes.preview.affectedCounts.patients, 2);
    assert.equal(previewRes.preview.affectedCounts.appointments, 1);
    assert.equal(previewRes.preview.affectedCounts.clinicalRecords, 1);
    assert.equal(previewRes.preview.affectedCounts.uploadedFilesOnDisk, 6);

    const restoreResult = await executeStagedBackupRestoration({
      db: prisma,
      roots,
      backupId: imported.backup.id,
      confirmationText: "RESTAURAR",
      adminUserId: admin.id,
    });

    assert.equal(restoreResult.success, true);
    assert.equal(restoreResult.verification.integrityChecksPassed, true);
    assert.equal(restoreResult.verification.patientCount, 2);
    assert.equal(restoreResult.verification.appointmentCount, 1);
    assert.equal(restoreResult.verification.clinicalRecordCount, 1);
    assert.equal(restoreResult.verification.storedFileCount, 1);
    assert.equal(restoreResult.verification.restoredDiskFileCount, 6);
    assert.equal(await isRestoreInProgress(roots), false, "Lock deve estar livre ao concluir");

    // Confere snapshot de segurança criado antes da restauração
    const safetyValid = await validateAndInspectBackupArchive(
      path.join(roots.backupDir, restoreResult.safetySnapshot.filename),
      prisma
    );
    assert.equal(safetyValid.manifest.backupType, "PRE_RESTORE_SNAPSHOT");

    // Confere integridade relacional e restauração completa no banco
    assert.equal(
      (await prisma.siteSettings.findUnique({ where: { id: "default" } })).clinicName,
      "Clínica Original PSI"
    );
    assert.equal(
      await prisma.patient.findUnique({ where: { id: extraPatient.id } }),
      null,
      "Dados posteriores ao backup devem ter sido substituídos"
    );
    const restoredAdult = await prisma.patient.findUnique({ where: { id: adultPatient.id } });
    assert.equal(restoredAdult.tempPassword, null, "tempPassword não deve ser restaurada em texto puro");
    const restoredMinor = await prisma.patient.findUnique({
      where: { id: minorPatient.id },
      include: { guardians: true },
    });
    assert.equal(restoredMinor.guardians.length, 1, "Relação Guardian deve permanecer íntegra");

    const restoredAppt = await prisma.appointment.findUnique({
      where: { id: appt.id },
      include: { payment: true, clinicalRecord: { include: { revisions: true } }, videoMeeting: true },
    });
    assert.equal(restoredAppt.payment.id, payment.id);
    assert.equal(restoredAppt.clinicalRecord.id, record.id);
    assert.equal(restoredAppt.clinicalRecord.noteRichText, `<p>${CLINICAL_TEXT}</p>`);
    assert.equal(restoredAppt.clinicalRecord.revisions.length, 1);
    assert.equal(restoredAppt.videoMeeting.provider, "JITSI");

    const restoredFileRow = await prisma.storedFile.findUnique({
      where: { id: storedFile.id },
      include: { shares: true },
    });
    assert.equal(restoredFileRow.shares.length, 1);
    assert.equal(restoredFileRow.shares[0].patientId, adultPatient.id);

    // Confere sanitização de segredos após restauração
    const restoredSys = await prisma.systemSettings.findUnique({ where: { id: "default" } });
    assert.equal(restoredSys.defaultBufferMinutes, 15);
    assert.equal(restoredSys.smtpHost, "smtp.original.local");
    assert.equal(restoredSys.smtpPass, null);
    assert.equal(restoredSys.smtpEnabled, false, "smtpEnabled deve ficar false sem smtpPass");
    assert.equal(restoredSys.whatsappApiToken, null);
    assert.equal(restoredSys.whatsappEnabled, false, "whatsappEnabled deve ficar false sem token");
    assert.equal(restoredSys.googleMeetClientSecret, null);
    assert.equal(restoredSys.googleMeetStatus, null);

    const restoredGw = await prisma.gatewayConfiguration.findFirst({ where: { slotNumber: 1 } });
    assert.equal(restoredGw.configDataEncrypted, null);
    assert.equal(restoredGw.isEnabled, false);

    // Confere arquivos físicos restaurados em TODAS as 3 raízes e limpeza de arquivos pós-desastre
    const restoredPdfHash = crypto
      .createHash("sha256")
      .update(fs.readFileSync(path.join(roots.privateUploadsDir, "paciente_exame.pdf")))
      .digest("hex");
    assert.equal(restoredPdfHash, pdfHash, "Documento privado do paciente deve bater hash SHA-256 original");

    const restoredFrameHash = crypto
      .createHash("sha256")
      .update(fs.readFileSync(path.join(roots.minisiteDir, "top", "up_hero", "frame-001.png")))
      .digest("hex");
    assert.equal(restoredFrameHash, frameHash, "Quadros do Hero do Site devem bater hash original");
    assert.equal(fs.existsSync(path.join(roots.minisiteDir, "sobre", "a.zip")), true);
    assert.equal(fs.existsSync(path.join(roots.minisiteDir, "sobre", "video.mp4")), true);

    const restoredLogoHash = crypto
      .createHash("sha256")
      .update(fs.readFileSync(path.join(roots.publicUploadsDir, "branding", "logo-clinica.png")))
      .digest("hex");
    assert.equal(restoredLogoHash, logoHash, "Logo do Site deve ser restaurado com hash original");
    assert.equal(fs.existsSync(path.join(roots.publicUploadsDir, "icons", "acolhimento.svg")), true);
    assert.equal(
      fs.existsSync(path.join(roots.minisiteDir, "extra_pos_backup.png")),
      false,
      "Arquivos residuais pós-desastre devem ser removidos pela troca limpa"
    );

    // Confere ausência de pastas de staging e presença do log final sem vazamento clínico
    const leftoverStage = fs.readdirSync(storageRoot).filter((n) => n.startsWith(".restore_stage_"));
    assert.equal(leftoverStage.length, 0, "Diretórios de staging temporários devem ser limpos");

    const restoreAudit = await prisma.auditLog.findFirst({
      where: { action: "BACKUP_RESTORED", resourceId: imported.backup.id },
    });
    assert.ok(restoreAudit, "Restauração bem-sucedida deve registrar BACKUP_RESTORED em AuditLog");
    assert.equal(
      (restoreAudit.details || "").includes(CLINICAL_TEXT),
      false,
      "AuditLog não pode conter notas clínicas"
    );

    await prisma.$disconnect();
  } finally {
    if (prevDatabaseUrl !== undefined) {
      process.env.DATABASE_URL = prevDatabaseUrl;
    } else {
      delete process.env.DATABASE_URL;
    }
    await bootstrapPrisma.$executeRawUnsafe(`DROP DATABASE IF EXISTS \`${testDbName}\``).catch(() => {});
    await bootstrapPrisma.$disconnect().catch(() => {});
    try {
      const nmLink = path.join(tmpLibDir, "node_modules");
      if (fs.existsSync(nmLink)) fs.unlinkSync(nmLink);
    } catch {}
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});
