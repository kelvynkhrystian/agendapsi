const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const AdmZip = require("adm-zip");

function compileProjectLibsToTempDir(tempDir) {
  const ts = require("typescript");
  const files = [
    "src/lib/prisma.ts",
    "src/lib/translations.ts",
    "src/lib/site-media-cleanup.ts",
    "src/lib/minisite-media.ts",
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

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function setOldMtime(filePath, ageMs = 10 * 60 * 1000) {
  const past = new Date(Date.now() - ageMs);
  fs.utimesSync(filePath, past, past);
}

test("Modal Progresso Backup & Limpeza Mídias — 1. Contratos UI/API pt-BR, Tokens Claro/Escuro e Bloqueios", () => {
  const modalComp = fs.readFileSync(
    path.join(process.cwd(), "src", "components", "ui", "modal.tsx"),
    "utf8"
  );
  assert.ok(modalComp.includes("preventClose?: boolean"));
  assert.ok(modalComp.includes("!preventClose"));

  const page = fs.readFileSync(
    path.join(process.cwd(), "src", "app", "admin", "arquivos", "page.tsx"),
    "utf8"
  );
  for (const requiredText of [
    "Criando cópia de segurança",
    "Backup em andamento. Não feche esta tela até a conclusão.",
    "Preparando backup",
    "Exportando banco de dados",
    "Copiando documentos e mídias",
    "Compactando arquivos",
    "Verificando integridade",
    "Finalizando backup",
    "Backup concluído com sucesso!",
    "Concluído",
    "Baixar Backup",
    "Limpar Mídias Não Utilizadas",
    "Confirmar Limpeza",
    "/api/admin/backup/progress",
    "/api/admin/backup/cancel",
    "/api/admin/storage/cleanup-media",
    "animate-backup-indeterminate",
    "bg-[var(--button-bg,var(--primary))]",
    "dark:bg-[#E5E5E5]",
    "dark:bg-[#202020]",
    "dark:bg-[#191919]",
    "dark:border-[#393939]",
  ]) {
    assert.ok(page.includes(requiredText), `admin/arquivos/page.tsx deve conter '${requiredText}'`);
  }

  // Ordem e posicionamento dos 4 botões abaixo da descrição do cabeçalho
  const descIdx = page.indexOf("mídias do Site.");
  const idxAtualizar = page.indexOf("Atualizar</span>", descIdx);
  const idxLimpar = page.indexOf("Limpar Mídias Não Utilizadas</span>", descIdx);
  const idxImportar = page.indexOf("Importar Backup</span>", descIdx);
  const idxGerar = page.indexOf("Gerar Novo Backup</span>", descIdx);
  assert.ok(descIdx > -1 && idxAtualizar > descIdx);
  assert.ok(idxAtualizar < idxLimpar && idxLimpar < idxImportar && idxImportar < idxGerar);
  assert.ok(page.includes('role="toolbar"'));

  // Tema Check: sem classes teal estáticas ou tons slate proibidos
  assert.equal(/\bteal-[0-9]+/.test(page), false);

  const progressRoute = fs.readFileSync(
    path.join(process.cwd(), "src", "app", "api", "admin", "backup", "progress", "route.ts"),
    "utf8"
  );
  assert.ok(progressRoute.includes("requireAdmin"));
  assert.ok(progressRoute.includes("getTrackedBackupJobStatus"));

  const cancelRoute = fs.readFileSync(
    path.join(process.cwd(), "src", "app", "api", "admin", "backup", "cancel", "route.ts"),
    "utf8"
  );
  assert.ok(cancelRoute.includes("requireAdmin"));
  assert.ok(cancelRoute.includes("requestBackupCancellation"));
  assert.ok(cancelRoute.includes("409"));

  const cleanupRoute = fs.readFileSync(
    path.join(process.cwd(), "src", "app", "api", "admin", "storage", "cleanup-media", "route.ts"),
    "utf8"
  );
  assert.ok(cleanupRoute.includes("requireAdmin"));
  assert.ok(cleanupRoute.includes("scanOrphanedSiteMedia"));
  assert.ok(cleanupRoute.includes("executeOrphanedSiteMediaCleanup"));
  assert.ok(cleanupRoute.includes("confirm: z.literal(true)"));

  const translations = fs.readFileSync(
    path.join(process.cwd(), "src", "lib", "translations.ts"),
    "utf8"
  );
  assert.ok(translations.includes("BACKUP_CANCELLED:"));
  assert.ok(translations.includes("SITE_MEDIA_CLEANUP:"));

  for (const saveRoute of [
    "src/app/api/admin/minisite/media/settings/route.ts",
    "src/app/api/admin/appearance/route.ts",
    "src/app/api/admin/site/settings/route.ts",
  ]) {
    const content = fs.readFileSync(path.join(process.cwd(), saveRoute), "utf8");
    assert.ok(content.includes("cleanupReplacedSiteMediaAfterSave"), `${saveRoute} deve integrar limpeza automática pós-save`);
    assert.ok(content.includes("isRestoreInProgress"), `${saveRoute} deve respeitar bloqueio de restauração`);
  }
});

test("Modal Progresso Backup & Limpeza Mídias — 2. Fluxo Completo Isolado (22 Cenários Reais em MariaDB + os.tmpdir)", async (t) => {
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

  const testDbName = `psi_media_cleanup_test_${Date.now()}`;
  const testDbUrlObj = new URL(baseUrl.toString());
  testDbUrlObj.pathname = `/${testDbName}`;
  const testDbUrl = testDbUrlObj.toString();

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "psi-progress-media-"));
  const tmpLibDir = path.join(tmpRoot, "libs");
  const storageRoot = path.join(tmpRoot, "storage");
  const publicUploadsRoot = path.join(tmpRoot, "public_uploads");
  fs.mkdirSync(tmpLibDir, { recursive: true });

  const backupRoots = {
    privateUploadsDir: path.join(storageRoot, "uploads"),
    minisiteDir: path.join(storageRoot, "minisite"),
    publicUploadsDir: publicUploadsRoot,
    backupDir: path.join(storageRoot, "backups"),
    lockFilePath: path.join(storageRoot, ".restore.lock"),
  };
  const mediaRoots = {
    minisiteDir: backupRoots.minisiteDir,
    publicUploadsDir: backupRoots.publicUploadsDir,
  };
  const coordRoots = {
    backupDir: backupRoots.backupDir,
    lockFilePath: backupRoots.lockFilePath,
  };

  fs.mkdirSync(backupRoots.privateUploadsDir, { recursive: true });
  fs.mkdirSync(path.join(backupRoots.minisiteDir, "top"), { recursive: true });
  fs.mkdirSync(path.join(backupRoots.minisiteDir, "top-mobile"), { recursive: true });
  fs.mkdirSync(path.join(backupRoots.minisiteDir, "sobre"), { recursive: true });
  fs.mkdirSync(path.join(backupRoots.publicUploadsDir, "branding"), { recursive: true });
  fs.mkdirSync(path.join(backupRoots.publicUploadsDir, "icons"), { recursive: true });
  fs.mkdirSync(backupRoots.backupDir, { recursive: true });

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

    process.env.DATABASE_URL = testDbUrl;
    delete global.prisma;
    compileProjectLibsToTempDir(tmpLibDir);

    const backupLib = require(path.join(tmpLibDir, "backup.js"));
    const mediaCleanup = require(path.join(tmpLibDir, "site-media-cleanup.js"));
    const minisiteMedia = require(path.join(tmpLibDir, "minisite-media.js"));
    const prisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });

    try {
      // Seed base: Admin, Paciente, Documento privado, SiteSettings inicial com todas as áreas
      const admin = await prisma.adminAccount.create({
        data: {
          name: "Dra. Juliana Teste",
          email: "dra@clinica.psi.br",
          passwordHash: "$2a$10$hash",
          phone: "11988880000",
        },
      });

      const patient = await prisma.patient.create({
        data: {
          fullName: "Paciente Ativo",
          email: "paciente@psi.br",
          phone: "11999990000",
          birthDate: new Date("1992-03-15T00:00:00.000Z"),
        },
      });

      const privateFileName = "laudo-privado-paciente.pdf";
      const privateAbsPath = path.join(backupRoots.privateUploadsDir, privateFileName);
      fs.writeFileSync(privateAbsPath, Buffer.from("%PDF-1.4\nCONFIDENTIAL CLINICAL DOC\n", "utf8"));
      const storedDoc = await prisma.storedFile.create({
        data: {
          title: "Laudo Confidencial",
          originalName: "Laudo Confidencial.pdf",
          storedFileName: privateFileName,
          mimeType: "application/pdf",
          sizeBytes: fs.statSync(privateAbsPath).size,
          category: "PATIENT_DOCUMENT",
          uploadedBy: admin.id,
        },
      });
      await prisma.storedFileShare.create({
        data: {
          fileId: storedDoc.id,
          patientId: patient.id,
          canDownload: true,
        },
      });

      // Cria mídias iniciais nas 5 áreas + 1 ZIP animation antigo
      const heroImg1Name = "hero_v1.png";
      fs.writeFileSync(path.join(backupRoots.minisiteDir, "top", heroImg1Name), Buffer.alloc(4096, 0x11));

      const mobVid1Name = "mob_v1.mp4";
      fs.writeFileSync(path.join(backupRoots.minisiteDir, "top-mobile", mobVid1Name), Buffer.alloc(6144, 0x22));

      const aboutOldName = "about_v1.png";
      fs.writeFileSync(path.join(backupRoots.minisiteDir, "sobre", aboutOldName), Buffer.alloc(3072, 0x33));

      const logoOldName = "logo_v1.png";
      const bannerOldName = "banner_v1.png";
      const favOldName = "fav_v1.png";
      fs.writeFileSync(path.join(backupRoots.publicUploadsDir, "branding", logoOldName), Buffer.alloc(2048, 0x44));
      fs.writeFileSync(path.join(backupRoots.publicUploadsDir, "branding", bannerOldName), Buffer.alloc(2048, 0x45));
      fs.writeFileSync(path.join(backupRoots.publicUploadsDir, "branding", favOldName), Buffer.alloc(1024, 0x46));

      const iconOld1 = "icon_v1.svg";
      const iconOld2 = "icon_v2.svg";
      fs.writeFileSync(path.join(backupRoots.publicUploadsDir, "icons", iconOld1), "<svg></svg>");
      fs.writeFileSync(path.join(backupRoots.publicUploadsDir, "icons", iconOld2), "<svg></svg>");

      await prisma.siteSettings.create({
        data: {
          id: "default",
          aboutText: "Clínica PSI",
          heroMediaType: "IMAGE",
          heroMediaUrl: `/api/minisite/media/top/${heroImg1Name}`,
          heroPosterUrl: `/api/minisite/media/top/${heroImg1Name}`,
          heroMobileMediaType: "VIDEO",
          heroMobileMediaUrl: `/api/minisite/media/top-mobile/${mobVid1Name}`,
          heroMobilePosterUrl: `/api/minisite/media/top-mobile/${mobVid1Name}`,
          aboutMediaType: "IMAGE",
          aboutMediaUrl: `/api/minisite/media/sobre/${aboutOldName}`,
          aboutPosterUrl: `/api/minisite/media/sobre/${aboutOldName}`,
          logoUrl: `/uploads/branding/${logoOldName}`,
          logoHorizontalUrl: `/uploads/branding/${bannerOldName}`,
          faviconUrl: `/uploads/branding/${favOldName}`,
          benefitsJson: JSON.stringify([
            { id: "b1", icon: "Heart", customIconUrl: `/uploads/icons/${iconOld1}`, title: "Acolhimento", isVisible: true, order: 1 },
          ]),
          sectionsConfigJson: JSON.stringify({
            diferenciais: {
              eyebrow: "DIFERENCIAIS",
              title: "Cuidado",
              isVisible: true,
              items: [
                { id: "d1", icon: "Shield", customIconUrl: `/uploads/icons/${iconOld2}`, title: "Sigilo", description: "Ética", isVisible: true },
              ],
            },
          }),
        },
      });

      // Arquivo compartilhado entre HeroPoster (ou LegalPage) & outro slot para testar preservação de arquivo compartilhado
      const sharedUrl = `/api/minisite/media/top/${heroImg1Name}`;
      await prisma.legalPage.create({
        data: {
          id: "privacy",
          title: "Privacidade",
          contentHtml: `<p>Selo oficial</p><img src="${sharedUrl}" alt="Selo" />`,
          isPublished: true,
        },
      });

      // Seed de histórico: 1 arquivo órfão antigo em minisite e 1 em branding + 1 rascunho recente na janela de carência
      const historicalOrphanHero = path.join(backupRoots.minisiteDir, "top", "historical_unused.jpg");
      fs.writeFileSync(historicalOrphanHero, Buffer.alloc(5000, 0x77));
      setOldMtime(historicalOrphanHero, 15 * 60 * 1000);

      const historicalOrphanBranding = path.join(backupRoots.publicUploadsDir, "branding", "old_orphan_logo.png");
      fs.writeFileSync(historicalOrphanBranding, Buffer.alloc(3500, 0x88));
      setOldMtime(historicalOrphanBranding, 15 * 60 * 1000);

      const recentDraftFile = path.join(backupRoots.minisiteDir, "sobre", "recent_draft_not_saved.webp");
      fs.writeFileSync(recentDraftFile, Buffer.alloc(2200, 0x99));
      // Mantém mtime atual (dentro da janela de segurança de 2 min)

      // ------------------------------------------------------------------
      // A. Backup Progress Modal + Real Stages + Reload Recovery + 100% Order
      // ------------------------------------------------------------------
      const seenStages = [];
      let prepSnapshot = null;
      let copySnapshot = null;
      let verifySnapshot = null;
      const pausePrep = createDeferred();
      const enteredPrep = createDeferred();
      const pauseCopy = createDeferred();
      const enteredCopy = createDeferred();
      const pauseVerify = createDeferred();
      const enteredVerify = createDeferred();

      const jobA = await backupLib.startTrackedBackupJob({
        db: prisma,
        roots: backupRoots,
        adminUserId: admin.id,
        _testStageHook: async (stageKey, snap) => {
          seenStages.push(stageKey);
          if (stageKey === "PREPARING") {
            prepSnapshot = await backupLib.getTrackedBackupJobStatus(backupRoots, snap.jobId);
            enteredPrep.resolve();
            await pausePrep.promise;
          }
          if (stageKey === "COPYING_MEDIA") {
            copySnapshot = await backupLib.getTrackedBackupJobStatus(backupRoots, snap.jobId);
            enteredCopy.resolve();
            await pauseCopy.promise;
          }
          if (stageKey === "VERIFYING") {
            verifySnapshot = await backupLib.getTrackedBackupJobStatus(backupRoots, snap.jobId);
            enteredVerify.resolve();
            await pauseVerify.promise;
          }
        },
      });

      await enteredPrep.promise;
      // Cenário 2 & 3: Etapa 1 inicia sem percentual fake (null = indeterminado), cancelável = true
      assert.equal(prepSnapshot.stageKey, "PREPARING");
      assert.equal(prepSnapshot.stageLabel, "Preparando backup");
      assert.equal(prepSnapshot.percent, null, "Etapa inicial deve iniciar em modo indeterminado (percent === null)");
      assert.equal(prepSnapshot.cancellable, true);

      // Cenário 7: Requisição duplicada bloqueada durante execução ativa
      await assert.rejects(
        () =>
          backupLib.startTrackedBackupJob({
            db: prisma,
            roots: backupRoots,
            adminUserId: admin.id,
          }),
        (err) => err && err.message === "BACKUP_EM_ANDAMENTO"
      );

      // Cenário 21 (Lock durante backup): scanOrphanedSiteMedia detecta bloqueio e cleanup falha com lock
      const scanDuringBackup = await mediaCleanup.scanOrphanedSiteMedia({
        db: prisma,
        mediaRoots,
        coordRoots,
      });
      assert.equal(scanDuringBackup.blockedByLock, true, "Scan deve informar blockedByLock=true durante backup ativo");
      await assert.rejects(
        () =>
          mediaCleanup.executeOrphanedSiteMediaCleanup({
            db: prisma,
            mediaRoots,
            coordRoots,
            adminUserId: admin.id,
          }),
        (err) => err && err.message === "OPERACAO_BACKUP_OU_RESTAURACAO_ATIVA"
      );

      // Destrava Stage 1 -> pausa em Stage 3 (COPYING_MEDIA)
      pausePrep.resolve();
      await enteredCopy.promise;

      // Cenário 4: Refresh / reabertura lê estado real persistido (.backup-job.json) em andamento
      assert.equal(copySnapshot.stageKey, "COPYING_MEDIA");
      assert.equal(copySnapshot.stageLabel, "Copiando documentos e mídias");
      assert.equal(typeof copySnapshot.percent, "number");
      assert.ok(copySnapshot.percent > 0 && copySnapshot.percent < 100);
      const persistedStateFile = backupLib.getBackupJobStateFilePath(backupRoots);
      assert.equal(fs.existsSync(persistedStateFile), true, ".backup-job.json deve existir durante execução");
      const rawPersisted = JSON.parse(fs.readFileSync(persistedStateFile, "utf8"));
      assert.equal(rawPersisted.snapshot.jobId, jobA.jobId);
      assert.equal(rawPersisted.snapshot.status, "RUNNING");
      assert.equal(rawPersisted.snapshot.stageKey, "COPYING_MEDIA");

      // Destrava Stage 3 -> pausa em Stage 5 (VERIFYING)
      pauseCopy.resolve();
      await enteredVerify.promise;

      // Cenário 3: Na verificação, percentual ainda NÃO pode ser 100% antes de concluir o hash + ZIP
      assert.equal(verifySnapshot.stageKey, "VERIFYING");
      assert.equal(verifySnapshot.stageLabel, "Verificando integridade");
      assert.ok(verifySnapshot.percent < 100, "Nunca mostrar 100% antes de validar integridade do ZIP");

      // Destrava Stage 5 e aguarda conclusão total
      pauseVerify.resolve();
      let finalJobA = null;
      for (let i = 0; i < 100; i++) {
        finalJobA = await backupLib.getTrackedBackupJobStatus(backupRoots, jobA.jobId);
        if (finalJobA && (finalJobA.status === "COMPLETED" || finalJobA.status === "FAILED")) break;
        await new Promise((r) => setTimeout(r, 40));
      }

      assert.equal(finalJobA.status, "COMPLETED");
      assert.equal(finalJobA.percent, 100);
      assert.ok(finalJobA.resultBackup);
      assert.ok(fs.existsSync(path.join(backupRoots.backupDir, finalJobA.resultBackup.filename)));
      assert.deepStrictEqual(seenStages, [
        "PREPARING",
        "EXPORTING_DATABASE",
        "COPYING_MEDIA",
        "COMPRESSING",
        "VERIFYING",
        "FINALIZING",
      ]);

      // Cenário 20: Verifica conteúdo do Backup A (.zip): 100% docs privados + apenas mídias ativas, SEM historical_unused
      const zipA = new AdmZip(path.join(backupRoots.backupDir, finalJobA.resultBackup.filename));
      const zipANames = zipA.getEntries().map((e) => e.entryName);
      assert.ok(zipANames.includes(`psi-backup/uploads/private/${privateFileName}`));
      assert.ok(zipANames.includes(`psi-backup/uploads/minisite/top/${heroImg1Name}`));
      assert.ok(!zipANames.some((n) => n.includes("historical_unused.jpg")), "Novo backup MANUAL não deve empacotar mídia histórica órfã");
      assert.ok(!zipANames.some((n) => n.includes("old_orphan_logo.png")), "Novo backup MANUAL não deve empacotar logo histórico órfão");
      assert.ok(!zipANames.some((n) => n.includes("recent_draft_not_saved.webp")), "Novo backup MANUAL não deve empacotar rascunho não publicado");

      const firstBackupSnapshotTime = fs.statSync(path.join(backupRoots.backupDir, finalJobA.resultBackup.filename)).mtimeMs;

      // ------------------------------------------------------------------
      // B. Safe Cancel During Stage 3 + Reject Cancel During Stage 6 Commit
      // ------------------------------------------------------------------
      const enteredCancelCopy = createDeferred();
      const releaseCancelCopy = createDeferred();
      const jobCancel = await backupLib.startTrackedBackupJob({
        db: prisma,
        roots: backupRoots,
        adminUserId: admin.id,
        _testStageHook: async (stageKey) => {
          if (stageKey === "COPYING_MEDIA") {
            enteredCancelCopy.resolve();
            await releaseCancelCopy.promise;
          }
        },
      });

      await enteredCancelCopy.promise;
      const cancelPromise = backupLib.requestBackupCancellation({
        roots: backupRoots,
        jobId: jobCancel.jobId,
      });
      // Libera ponto de pausa após solicitação de cancelamento entrar no runtime
      await new Promise((r) => setTimeout(r, 30));
      releaseCancelCopy.resolve();

      const cancelResult = await cancelPromise;
      // Cenário 5: Cancelamento limpo remove .tmp_*, preserva DB/uploads/backup anterior
      assert.equal(cancelResult.cancelled, true);
      assert.equal(cancelResult.snapshot.status, "CANCELLED");

      const leftTmp = fs.readdirSync(backupRoots.backupDir).filter((f) => f.startsWith(".tmp_"));
      assert.equal(leftTmp.length, 0, "Cancelamento deve apagar todos os arquivos e diretórios .tmp_*");
      assert.equal(await backupLib.isBackupJobActive(backupRoots), false, "Trava de backup deve ser liberada após cancelamento");
      assert.equal(fs.existsSync(privateAbsPath), true, "Documentos originais devem permanecer intactos");
      assert.equal(await prisma.patient.count(), 1, "Banco de dados deve permanecer intacto");
      assert.equal(await prisma.backupJob.count(), 1, "Cancelamento não deve inserir BackupJob incompleto");

      // Cenário 6: Cancelamento na etapa 6 (FINALIZING) não interrompe operação crítica atômica
      const enteredFinal6 = createDeferred();
      const releaseFinal6 = createDeferred();
      const jobNonCancel = await backupLib.startTrackedBackupJob({
        db: prisma,
        roots: backupRoots,
        adminUserId: admin.id,
        _testStageHook: async (stageKey) => {
          if (stageKey === "FINALIZING") {
            enteredFinal6.resolve();
            await releaseFinal6.promise;
          }
        },
      });
      await enteredFinal6.promise;
      const tryCancelFinal6 = await backupLib.requestBackupCancellation({
        roots: backupRoots,
        jobId: jobNonCancel.jobId,
      });
      assert.equal(tryCancelFinal6.cancelled, false);
      assert.equal(tryCancelFinal6.nonCancellableStage, true);
      releaseFinal6.resolve();

      let doneNonCancel = null;
      for (let i = 0; i < 60; i++) {
        doneNonCancel = await backupLib.getTrackedBackupJobStatus(backupRoots, jobNonCancel.jobId);
        if (doneNonCancel && doneNonCancel.status === "COMPLETED") break;
        await new Promise((r) => setTimeout(r, 40));
      }
      assert.equal(doneNonCancel.status, "COMPLETED");
      assert.equal(await prisma.backupJob.count(), 2);

      // ------------------------------------------------------------------
      // C. Substituições Automáticas, Shared Ref Protection & ZIP Folder Removal (Cenários 8-16)
      // ------------------------------------------------------------------
      // Cenário 8 + 15: Hero Desktop troca de hero_v1 -> hero_v2, mas LegalPage ainda referencia hero_v1 (compartilhado!)
      const heroImg2Name = "hero_v2.png";
      fs.writeFileSync(path.join(backupRoots.minisiteDir, "top", heroImg2Name), Buffer.alloc(4096, 0x51));
      await prisma.siteSettings.update({
        where: { id: "default" },
        data: {
          heroMediaUrl: `/api/minisite/media/top/${heroImg2Name}`,
          heroPosterUrl: `/api/minisite/media/top/${heroImg2Name}`,
        },
      });
      const sharedCleanupRes = await mediaCleanup.cleanupReplacedSiteMediaAfterSave({
        db: prisma,
        previousUrls: [`/api/minisite/media/top/${heroImg1Name}`],
        mediaRoots,
        coordRoots,
        adminUserId: admin.id,
        reason: "TESTE_COMPARTILHADO",
      });
      assert.equal(sharedCleanupRes.skippedSharedCount, 1);
      assert.equal(sharedCleanupRes.deletedCount, 0);
      assert.equal(fs.existsSync(path.join(backupRoots.minisiteDir, "top", heroImg1Name)), true, "Arquivo compartilhado com LegalPage NÃO pode ser excluído");

      // Agora remove a referência da LegalPage e testa substituição real Desktop Hero (Cenário 8)
      await prisma.legalPage.update({
        where: { id: "privacy" },
        data: { contentHtml: "<p>Sem mídia externa</p>" },
      });
      const heroImg3Name = "hero_v3.png";
      fs.writeFileSync(path.join(backupRoots.minisiteDir, "top", heroImg3Name), Buffer.alloc(4096, 0x52));
      await prisma.siteSettings.update({
        where: { id: "default" },
        data: {
          heroMediaUrl: `/api/minisite/media/top/${heroImg3Name}`,
          heroPosterUrl: `/api/minisite/media/top/${heroImg3Name}`,
        },
      });
      // Substitui também herov1 agora órfão e herov2 substituído
      const heroReplaceRes = await mediaCleanup.cleanupReplacedSiteMediaAfterSave({
        db: prisma,
        previousUrls: [`/api/minisite/media/top/${heroImg2Name}`],
        abandonedUrls: [`/api/minisite/media/top/${heroImg1Name}`],
        mediaRoots,
        coordRoots,
        adminUserId: admin.id,
        reason: "TESTE_HERO_DESKTOP",
      });
      assert.equal(heroReplaceRes.deletedCount, 2);
      assert.equal(fs.existsSync(path.join(backupRoots.minisiteDir, "top", heroImg1Name)), false);
      assert.equal(fs.existsSync(path.join(backupRoots.minisiteDir, "top", heroImg2Name)), false);
      assert.equal(fs.existsSync(path.join(backupRoots.minisiteDir, "top", heroImg3Name)), true);

      // Cenário 13: Substituição de animação ZIP remove pasta up_* e todos os frames extraídos
      const zipUpId = "up_testanim_123456";
      const zipUpDir = path.join(backupRoots.minisiteDir, "top", zipUpId);
      fs.mkdirSync(zipUpDir, { recursive: true });
      const frame1 = `/api/minisite/media/top/${zipUpId}/001.png`;
      const frame2 = `/api/minisite/media/top/${zipUpId}/002.png`;
      fs.writeFileSync(path.join(zipUpDir, "001.png"), Buffer.alloc(1024, 0x61));
      fs.writeFileSync(path.join(zipUpDir, "002.png"), Buffer.alloc(1024, 0x62));
      fs.writeFileSync(path.join(zipUpDir, "preview_unused.png"), Buffer.alloc(512, 0x63));

      await prisma.siteSettings.update({
        where: { id: "default" },
        data: {
          heroMediaType: "FRAME_ANIMATION",
          heroMediaUrl: frame1,
          heroPosterUrl: frame1,
          heroFrameCount: 2,
          heroFramesJson: JSON.stringify([frame1, frame2]),
        },
      });

      // Substitui ZIP animation por nova imagem heroImg3 (limpando também fields FRAME_ANIMATION)
      await prisma.siteSettings.update({
        where: { id: "default" },
        data: {
          heroMediaType: "IMAGE",
          heroMediaUrl: `/api/minisite/media/top/${heroImg3Name}`,
          heroPosterUrl: `/api/minisite/media/top/${heroImg3Name}`,
          heroFrameCount: 0,
          heroFramesJson: null,
        },
      });
      const zipCleanupRes = await mediaCleanup.cleanupReplacedSiteMediaAfterSave({
        db: prisma,
        previousUrls: [frame1, frame2],
        mediaRoots,
        coordRoots,
        adminUserId: admin.id,
        reason: "TESTE_ZIP_FOLDER",
      });
      assert.equal(zipCleanupRes.deletedCount, 3, "Todos os frames + preview extra dentro de up_* devem ser removidos");
      assert.equal(fs.existsSync(zipUpDir), false, "Pasta up_* antiga inteira deve ser removida sem sobrar diretório vazio");

      // Cenário 9, 10, 11, 12, 16: Hero Mobile, About, Branding, Custom Icons + rascunho abandonado
      const mobVid2 = "mob_v2.mp4";
      const aboutNew = "about_v2.png";
      const logoNew = "logo_v2.png";
      const draftAbandoned = "abandoned_icon_draft.svg";
      fs.writeFileSync(path.join(backupRoots.minisiteDir, "top-mobile", mobVid2), Buffer.alloc(3000, 0x29));
      fs.writeFileSync(path.join(backupRoots.minisiteDir, "sobre", aboutNew), Buffer.alloc(3000, 0x39));
      fs.writeFileSync(path.join(backupRoots.publicUploadsDir, "branding", logoNew), Buffer.alloc(2000, 0x49));
      fs.writeFileSync(path.join(backupRoots.publicUploadsDir, "icons", draftAbandoned), "<svg>abandoned</svg>");

      await prisma.siteSettings.update({
        where: { id: "default" },
        data: {
          heroMobileMediaUrl: `/api/minisite/media/top-mobile/${mobVid2}`,
          heroMobilePosterUrl: `/api/minisite/media/top-mobile/${mobVid2}`,
          aboutMediaUrl: `/api/minisite/media/sobre/${aboutNew}`,
          aboutPosterUrl: `/api/minisite/media/sobre/${aboutNew}`,
          logoUrl: `/uploads/branding/${logoNew}`,
          logoHorizontalUrl: null,
          faviconUrl: null,
          benefitsJson: JSON.stringify([{ id: "b1", icon: "Heart", customIconUrl: null, title: "Acolhimento", isVisible: true, order: 1 }]),
          sectionsConfigJson: JSON.stringify({
            diferenciais: {
              eyebrow: "DIFERENCIAIS",
              title: "Cuidado",
              isVisible: true,
              items: [{ id: "d1", icon: "Shield", customIconUrl: null, title: "Sigilo", description: "Ética", isVisible: true }],
            },
          }),
        },
      });

      const batchCleanupRes = await mediaCleanup.cleanupReplacedSiteMediaAfterSave({
        db: prisma,
        previousUrls: [
          `/api/minisite/media/top-mobile/${mobVid1Name}`,
          `/api/minisite/media/sobre/${aboutOldName}`,
          `/uploads/branding/${logoOldName}`,
          `/uploads/branding/${bannerOldName}`,
          `/uploads/branding/${favOldName}`,
          `/uploads/icons/${iconOld1}`,
          `/uploads/icons/${iconOld2}`,
        ],
        abandonedUrls: [`/uploads/icons/${draftAbandoned}`],
        mediaRoots,
        coordRoots,
        adminUserId: admin.id,
        reason: "TESTE_TODAS_AREAS",
      });
      assert.equal(batchCleanupRes.deletedCount, 8);
      assert.equal(fs.existsSync(path.join(backupRoots.minisiteDir, "top-mobile", mobVid1Name)), false);
      assert.equal(fs.existsSync(path.join(backupRoots.minisiteDir, "sobre", aboutOldName)), false);
      assert.equal(fs.existsSync(path.join(backupRoots.publicUploadsDir, "branding", logoOldName)), false);
      assert.equal(fs.existsSync(path.join(backupRoots.publicUploadsDir, "branding", bannerOldName)), false);
      assert.equal(fs.existsSync(path.join(backupRoots.publicUploadsDir, "branding", favOldName)), false);
      assert.equal(fs.existsSync(path.join(backupRoots.publicUploadsDir, "icons", iconOld1)), false);
      assert.equal(fs.existsSync(path.join(backupRoots.publicUploadsDir, "icons", iconOld2)), false);
      assert.equal(fs.existsSync(path.join(backupRoots.publicUploadsDir, "icons", draftAbandoned)), false);

      // Cenário 14: Falha em processZipBuffer remove apenas pasta parcial e mantém mídia ativa ilesa
      const corruptZipBuf = Buffer.from("PK\x03\x04CORRUPT_DATA_NOT_A_VALID_ZIP", "latin1");
      await assert.rejects(() =>
        minisiteMedia.processZipBuffer(corruptZipBuf, "hero", backupRoots.minisiteDir)
      );
      const topDirsAfterFail = fs.readdirSync(path.join(backupRoots.minisiteDir, "top"));
      assert.ok(!topDirsAfterFail.some((n) => n.startsWith("up_")), "Falha no upload ZIP não deve deixar pasta parcial up_*");
      assert.equal(fs.existsSync(path.join(backupRoots.minisiteDir, "top", heroImg3Name)), true);

      // ------------------------------------------------------------------
      // D. Dry-Run Preview & Confirmed Manual Orphan Cleanup (Cenários 17, 18, 19, 22)
      // ------------------------------------------------------------------
      const overviewBefore = await backupLib.collectStorageOverview(prisma, backupRoots);

      // Cenário 17: Preview apenas lê e NÃO exclui nada
      const previewScan = await mediaCleanup.scanOrphanedSiteMedia({
        db: prisma,
        mediaRoots,
        coordRoots,
      });
      assert.equal(previewScan.blockedByLock, false);
      assert.equal(previewScan.totalCount, 2, "Deve listar exatamente historical_unused.jpg e old_orphan_logo.png");
      assert.equal(previewScan.totalBytes, 5000 + 3500);
      assert.equal(previewScan.graceProtectedCount, 1, "Rascunho recente deve permanecer protegido pela carência de 2 min");
      assert.equal(fs.existsSync(historicalOrphanHero), true, "Dry-run nunca pode excluir arquivos");
      assert.equal(fs.existsSync(historicalOrphanBranding), true, "Dry-run nunca pode excluir arquivos");

      // Cenário 18 & 19: Confirmação apaga SOMENTE os 2 órfãos históricos antigos
      const execCleanup = await mediaCleanup.executeOrphanedSiteMediaCleanup({
        db: prisma,
        mediaRoots,
        coordRoots,
        targetRelativeKeys: previewScan.files.map((f) => f.relativeKey),
        adminUserId: admin.id,
      });
      assert.equal(execCleanup.deletedCount, 2);
      assert.equal(execCleanup.deletedBytes, 8500);
      assert.equal(fs.existsSync(historicalOrphanHero), false);
      assert.equal(fs.existsSync(historicalOrphanBranding), false);

      // Preservações críticas após limpeza
      assert.equal(fs.existsSync(recentDraftFile), true, "Arquivo recém-enviado protegido pela janela de carência");
      assert.equal(fs.existsSync(privateAbsPath), true, "Documento privado de paciente NUNCA é removido na limpeza de Site");
      assert.equal(fs.existsSync(path.join(backupRoots.minisiteDir, "top", heroImg3Name)), true);
      assert.equal(fs.existsSync(path.join(backupRoots.minisiteDir, "top-mobile", mobVid2)), true);
      assert.equal(fs.existsSync(path.join(backupRoots.minisiteDir, "sobre", aboutNew)), true);
      assert.equal(fs.existsSync(path.join(backupRoots.publicUploadsDir, "branding", logoNew)), true);

      // Backups anteriores intocados
      const firstArchiveAfterCleanup = path.join(backupRoots.backupDir, finalJobA.resultBackup.filename);
      assert.equal(fs.existsSync(firstArchiveAfterCleanup), true);
      assert.equal(fs.statSync(firstArchiveAfterCleanup).mtimeMs, firstBackupSnapshotTime);

      // Auditoria registrada
      const auditCleanups = await prisma.auditLog.findMany({
        where: { action: "SITE_MEDIA_CLEANUP" },
      });
      assert.ok(auditCleanups.length >= 2);

      // Cenário 22: Métricas de armazenamento refletem redução exata após limpeza
      const overviewAfter = await backupLib.collectStorageOverview(prisma, backupRoots);
      assert.equal(overviewBefore.fileCount - overviewAfter.fileCount, 2);
      assert.equal(overviewBefore.totalBytes - overviewAfter.totalBytes, 8500);

      // Cenário 21 parte B: cleanupReplacedSiteMediaAfterSave adia exclusão se lock de restauração estiver ativo
      fs.writeFileSync(backupRoots.lockFilePath, JSON.stringify({ lockedAt: new Date().toISOString(), pid: process.pid }), "utf8");
      const deferredRes = await mediaCleanup.cleanupReplacedSiteMediaAfterSave({
        db: prisma,
        previousUrls: [recentDraftFile.replace(backupRoots.minisiteDir, "/api/minisite/media").replace(/\\/g, "/")],
        mediaRoots,
        coordRoots,
        adminUserId: admin.id,
      });
      assert.equal(deferredRes.deferredByLock, true);
      assert.equal(deferredRes.deletedCount, 0);
      assert.equal(fs.existsSync(recentDraftFile), true);
      fs.unlinkSync(backupRoots.lockFilePath);
    } finally {
      await prisma.$disconnect().catch(() => {});
    }
  } finally {
    if (prevDatabaseUrl !== undefined) {
      process.env.DATABASE_URL = prevDatabaseUrl;
    } else {
      delete process.env.DATABASE_URL;
    }
    await bootstrapPrisma.$executeRawUnsafe(`DROP DATABASE IF EXISTS \`${testDbName}\``).catch(() => {});
    await bootstrapPrisma.$disconnect().catch(() => {});
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});
