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

test("Backup Completo D — 1. Contratos de Autorização, Streaming e Rótulos pt-BR", () => {
  const translations = fs.readFileSync(
    path.join(process.cwd(), "src", "lib", "translations.ts"),
    "utf8"
  );
  for (const expected of [
    'COMPLETED: "Concluído"',
    'FAILED: "Falhou"',
    'PROCESSING: "Processando"',
    'RESTORING: "Restaurando"',
    "BACKUP_DELETED:",
    "BACKUP_IMPORTED:",
    "BACKUP_RESTORED:",
  ]) {
    assert.ok(translations.includes(expected), `translations.ts deve conter '${expected}'`);
  }

  const downloadRoute = fs.readFileSync(
    path.join(process.cwd(), "src", "app", "api", "admin", "backup", "[id]", "download", "route.ts"),
    "utf8"
  );
  assert.ok(downloadRoute.includes("requireAdmin"));
  assert.ok(downloadRoute.includes("createReadableFileStream"));
  assert.ok(downloadRoute.includes("attachment; filename="));
  assert.ok(downloadRoute.includes("private, no-store"));

  const deleteRoute = fs.readFileSync(
    path.join(process.cwd(), "src", "app", "api", "admin", "backup", "[id]", "route.ts"),
    "utf8"
  );
  assert.ok(deleteRoute.includes("requireAdmin"));
  assert.ok(deleteRoute.includes("deleteBackupArchiveAndRecord"));

  const page = fs.readFileSync(
    path.join(process.cwd(), "src", "app", "admin", "arquivos", "page.tsx"),
    "utf8"
  );
  for (const label of [
    "Gerar Novo Backup",
    "Baixar",
    "Baixar Backup",
    "Excluir",
    "Tem certeza que deseja excluir este backup? Esta ação não poderá ser desfeita.",
    "Cancelar",
    "Excluir Backup",
    "formatBackupStatus(b.status)",
  ]) {
    assert.ok(page.includes(label), `admin/arquivos/page.tsx deve conter '${label}'`);
  }
});

test("Backup Completo D — 2. Geração .zip Real, Higienização de Segredos, Checksums, Legado, Download e Exclusão Segura", async (t) => {
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

  const testDbName = `psi_backup_unitd_test_${Date.now()}`;
  const testDbUrlObj = new URL(baseUrl.toString());
  testDbUrlObj.pathname = `/${testDbName}`;
  const testDbUrl = testDbUrlObj.toString();

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "psi-backup-d-"));
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
  fs.mkdirSync(path.join(roots.minisiteDir, "top", "up_test"), { recursive: true });
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
      listClassifiedBackups,
      collectStorageOverview,
      deleteBackupArchiveAndRecord,
      resolveSafeBackupFilePath,
      createReadableFileStream,
      BACKUP_FORMAT_ID,
    } = require(path.join(tmpLibDir, "backup.js"));

    // Segredos sentinela que NUNCA podem aparecer no arquivo portátil
    const SECRET_SMTP = "SEG_SMTP_ULTRA_SECRETO_9981";
    const SECRET_WA = "SEG_WHATSAPP_TOKEN_7712";
    const SECRET_OAUTH = "SEG_GOOGLE_SECRET_5544";
    const SECRET_REFRESH = "SEG_GOOGLE_REFRESH_3322";
    const SECRET_TURN = "SEG_TURN_1122";
    const SECRET_GATEWAY = "SEG_GATEWAY_ENC_6655";
    const SECRET_TEMP_PASS = "TempPassPlaintext123!";
    const CLINICAL_NOTE = "Evolução clínica confidencial: paciente apresentou progresso estável.";

    const admin = await prisma.adminAccount.create({
      data: {
        name: "Dr. Backup Teste",
        email: "admin-backup@psi.local",
        passwordHash: "$2a$10$dummyhashfordbtestonly",
        phone: "11999998888",
      },
    });

    await prisma.systemSettings.create({
      data: {
        id: "default",
        timezone: "America/Sao_Paulo",
        smtpEnabled: true,
        smtpHost: "smtp.clinica.local",
        smtpUser: "contato@clinica.local",
        smtpPass: SECRET_SMTP,
        whatsappApiToken: SECRET_WA,
        googleMeetClientSecret: SECRET_OAUTH,
        googleMeetRefreshToken: SECRET_REFRESH,
        googleMeetAccessToken: "SEG_ACCESS_0011",
        peerJsTurnSecret: SECRET_TURN,
      },
    });

    await prisma.gatewayConfiguration.create({
      data: {
        slotNumber: 1,
        providerKey: "MERCADOPAGO",
        name: "Gateway Principal",
        isEnabled: true,
        configDataEncrypted: SECRET_GATEWAY,
      },
    });

    await prisma.siteSettings.create({
      data: {
        id: "default",
        clinicName: "Clínica Teste Backup",
        aboutText: "Texto institucional sobre atendimento",
        logoUrl: "/uploads/branding/logo-site.png",
        heroMediaUrl: "/api/minisite/media/top/up_test/frame-001.png",
      },
    });

    const service = await prisma.service.create({
      data: {
        name: "Sessão Individual",
        priceCents: 22000,
        durationMinutes: 50,
        modality: "BOTH",
      },
    });

    const patient = await prisma.patient.create({
      data: {
        fullName: "Carlos Drummond",
        email: "carlos@psi.local",
        phone: "11988776655",
        tempPassword: SECRET_TEMP_PASS,
      },
    });

    const appt = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        serviceId: service.id,
        startAt: new Date(Date.now() + 86400000),
        endAt: new Date(Date.now() + 86400000 + 50 * 60000),
        modality: "PRESENTIAL",
        status: "CONFIRMED",
        clinicalRecord: {
          create: {
            patientId: patient.id,
            sessionDate: new Date(),
            noteRichText: `<p>${CLINICAL_NOTE}</p>`,
          },
        },
        payment: {
          create: {
            patientId: patient.id,
            amountCents: 22000,
            status: "APPROVED",
            method: "IN_PERSON",
            isSimulated: false,
          },
        },
      },
    });

    // Arquivos físicos distribuídos nas 3 áreas persistentes
    const docBytes = Buffer.from("%PDF-1.4\n%Conteudo documento teste\n", "utf8");
    const docPath = path.join(roots.privateUploadsDir, "doc1.pdf");
    fs.writeFileSync(docPath, docBytes);

    await prisma.storedFile.create({
      data: {
        title: "Laudo Assinado",
        originalName: "laudo.pdf",
        storedFileName: "doc1.pdf",
        mimeType: "application/pdf",
        sizeBytes: docBytes.length,
        category: "PATIENT_DOCUMENT",
        uploadedBy: admin.id,
        shares: {
          create: {
            patientId: patient.id,
            canDownload: true,
          },
        },
      },
    });

    const frameBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01, 0x02]);
    fs.writeFileSync(path.join(roots.minisiteDir, "top", "up_test", "frame-001.png"), frameBytes);
    const videoBytes = Buffer.from("FAKE_MP4_STREAM_DATA_12345");
    fs.writeFileSync(path.join(roots.minisiteDir, "sobre", "intro.mp4"), videoBytes);
    const logoBytes = Buffer.from("LOGO_PNG_BYTES");
    fs.writeFileSync(path.join(roots.publicUploadsDir, "branding", "logo-site.png"), logoBytes);
    const iconBytes = Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'></svg>");
    fs.writeFileSync(path.join(roots.publicUploadsDir, "icons", "custom.svg"), iconBytes);

    // Arquivo legado .json para garantir classificação e isolamento
    const legacyFilename = "psi_backup_1700000000000_legacy01.json";
    fs.writeFileSync(path.join(roots.backupDir, legacyFilename), JSON.stringify({ manifest: {}, data: {} }));
    await prisma.backupJob.create({
      data: {
        filename: legacyFilename,
        sizeBytes: 32,
        checksumSha256: crypto.createHash("sha256").update("legacy").digest("hex"),
        status: "COMPLETED",
        details: JSON.stringify({ patientCount: 1, appointmentCount: 1 }),
      },
    });

    // 1. Criação do Backup Completo (.zip)
    const created = await createFullBackupArchive({
      db: prisma,
      roots,
      backupType: "MANUAL",
    });

    assert.ok(created.backupJob.filename.endsWith(".zip"), "Backup novo deve gerar .zip");
    assert.ok(fs.existsSync(created.archivePath), "Arquivo .zip deve existir fora do diretório público");
    assert.equal(created.manifest.format, BACKUP_FORMAT_ID);
    assert.equal(created.manifest.fileCount, 5, "Deve empacotar todos os 5 arquivos das 3 pastas persistentes");

    // 2. Validação estrutural e criptográfica do ZIP gerado
    const zip = new AdmZip(created.archivePath);
    const entryNames = zip.getEntries().map((e) => e.entryName);
    assert.ok(entryNames.includes("psi-backup/manifest.json"));
    assert.ok(entryNames.includes("psi-backup/checksums.json"));
    assert.ok(entryNames.includes("psi-backup/database/patients.json"));
    assert.ok(entryNames.includes("psi-backup/database/appointments.json"));
    assert.ok(entryNames.includes("psi-backup/database/clinicalRecords.json"));
    assert.ok(entryNames.includes("psi-backup/database/payments.json"));
    assert.ok(entryNames.includes("psi-backup/database/storedFiles.json"));
    assert.ok(entryNames.includes("psi-backup/database/systemSettings.json"));
    assert.ok(entryNames.includes("psi-backup/uploads/private/doc1.pdf"));
    assert.ok(entryNames.includes("psi-backup/uploads/minisite/top/up_test/frame-001.png"));
    assert.ok(entryNames.includes("psi-backup/uploads/minisite/sobre/intro.mp4"));
    assert.ok(entryNames.includes("psi-backup/uploads/public-uploads/branding/logo-site.png"));
    assert.ok(entryNames.includes("psi-backup/uploads/public-uploads/icons/custom.svg"));
    assert.ok(
      !entryNames.some((n) => n.includes(legacyFilename)),
      "Pasta storage/backups nunca deve ser incluída recursivamente"
    );

    // Verifica que segredos foram redigidos em TODO o conteúdo de configuração e pacientes
    const allDatabaseEntriesText = entryNames
      .filter((n) => n.startsWith("psi-backup/database/") || n === "psi-backup/manifest.json")
      .map((n) => zip.readAsText(n))
      .join("\n");

    for (const secret of [
      SECRET_SMTP,
      SECRET_WA,
      SECRET_OAUTH,
      SECRET_REFRESH,
      SECRET_TURN,
      SECRET_GATEWAY,
      SECRET_TEMP_PASS,
    ]) {
      assert.equal(
        allDatabaseEntriesText.includes(secret),
        false,
        `Segredo '${secret}' nunca pode constar em backup portátil`
      );
    }

    // Verifica todos os checksums SHA-256 internos
    const checksumsObj = JSON.parse(zip.readAsText("psi-backup/checksums.json"));
    assert.equal(checksumsObj.algorithm, "SHA-256");
    for (const [entryPath, info] of Object.entries(checksumsObj.entries)) {
      const buf = zip.readFile(entryPath);
      assert.ok(buf, `Entrada listada no checksum deve existir no ZIP: ${entryPath}`);
      const actualHash = crypto.createHash("sha256").update(buf).digest("hex");
      assert.equal(actualHash, info.sha256, `SHA-256 deve conferir para ${entryPath}`);
    }

    // 3. Classificação Legado vs Completo & Overview
    const classified = await listClassifiedBackups(prisma, roots);
    assert.equal(classified.length, 2);
    const zipItem = classified.find((b) => b.id === created.backupJob.id);
    const legacyItem = classified.find((b) => b.filename === legacyFilename);
    assert.equal(zipItem.isLegacy, false);
    assert.equal(zipItem.restorable, true);
    assert.equal(legacyItem.isLegacy, true);
    assert.equal(legacyItem.restorable, false);

    const overview = await collectStorageOverview(prisma, roots);
    assert.equal(overview.fileCount, 5);
    assert.equal(overview.storedFileRecordsCount, 1);

    // 4. Download em Streaming e Proteção contra Path Traversal
    assert.throws(() => resolveSafeBackupFilePath(roots.backupDir, "../secret.zip"), /CAMINHO_BACKUP/);
    const stream = createReadableFileStream(created.archivePath);
    const reader = stream.getReader();
    const chunks = [];
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      chunks.push(Buffer.from(value));
    }
    const streamedBuffer = Buffer.concat(chunks);
    const streamedHash = crypto.createHash("sha256").update(streamedBuffer).digest("hex");
    assert.equal(streamedHash, created.backupJob.checksumSha256, "Download em stream deve entregar o .zip íntegro");

    // 5. Exclusão segura remove APENAS o arquivo e o registro do backup
    const deleted = await deleteBackupArchiveAndRecord({
      db: prisma,
      roots,
      backupId: created.backupJob.id,
      adminUserId: admin.id,
    });
    assert.equal(deleted.archiveFileRemoved, true);
    assert.equal(fs.existsSync(created.archivePath), false, "Arquivo .zip deve ser removido do disco");
    assert.equal(await prisma.backupJob.findUnique({ where: { id: created.backupJob.id } }), null);

    // Garante integridade preservada do restante do sistema
    assert.equal(fs.existsSync(docPath), true, "Documentos privados de pacientes NÃO podem ser excluídos");
    assert.equal(
      fs.existsSync(path.join(roots.minisiteDir, "sobre", "intro.mp4")),
      true,
      "Mídias do Site NÃO podem ser excluídas"
    );
    assert.equal(
      fs.existsSync(path.join(roots.backupDir, legacyFilename)),
      true,
      "Outros backups não selecionados devem permanecer intactos"
    );
    assert.equal(await prisma.patient.count(), 1, "Pacientes não podem ser afetados ao excluir backup");
    assert.equal(await prisma.appointment.count(), 1, "Consultas não podem ser afetadas");
    assert.equal(await prisma.clinicalRecord.count(), 1, "Prontuários não podem ser afetados");

    const delAudit = await prisma.auditLog.findFirst({
      where: { action: "BACKUP_DELETED", resourceId: created.backupJob.id },
    });
    assert.ok(delAudit, "Exclusão de backup deve gerar registro em AuditLog");
    assert.equal(
      (delAudit.details || "").includes(CLINICAL_NOTE),
      false,
      "AuditLog não pode vazar texto clínico"
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
