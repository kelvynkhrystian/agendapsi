import fsSync, { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import AdmZip from "adm-zip";
import { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "./prisma";

export const BACKUP_FORMAT_ID = "psi-backup-v1";
export const BACKUP_FORMAT_VERSION = "1.0.0";
export const SUPPORTED_BACKUP_FORMAT_VERSIONS = ["1.0.0"] as const;
export const APP_VERSION = process.env.npm_package_version || "1.0.0";

export const MAX_BACKUP_IMPORT_BYTES = 512 * 1024 * 1024; // 512 MB
export const MAX_EXTRACTED_ARCHIVE_BYTES = 1024 * 1024 * 1024; // 1 GB
export const MAX_SINGLE_ENTRY_BYTES = 200 * 1024 * 1024; // 200 MB
export const MAX_ARCHIVE_ENTRIES = 25000;

export const REDACTED_SECRET_FIELDS = [
  "Patient.tempPassword",
  "GatewayConfiguration.configDataEncrypted",
  "SystemSettings.smtpPass",
  "SystemSettings.whatsappApiToken",
  "SystemSettings.googleMeetClientSecret",
  "SystemSettings.googleMeetRefreshToken",
  "SystemSettings.googleMeetAccessToken",
  "SystemSettings.peerJsTurnSecret",
] as const;

export const EXCLUDED_BACKUP_SYSTEM_DIRECTORIES = [
  "storage/backups",
  "node_modules",
  ".next",
  ".git",
  "public/minisite",
] as const;

export const PERSISTENT_BACKUP_TABLES = [
  "adminAccounts",
  "patients",
  "guardians",
  "patientProfileChangeRequests",
  "consentAcceptances",
  "services",
  "weeklyAvailability",
  "availabilityExceptions",
  "appointmentPackages",
  "appointments",
  "appointmentHolds",
  "payments",
  "paymentAttempts",
  "refunds",
  "gatewayConfigurations",
  "anamnesisTemplates",
  "anamnesisSubmissions",
  "clinicalRecords",
  "clinicalRecordRevisions",
  "storedFiles",
  "storedFileShares",
  "videoMeetings",
  "notificationTemplates",
  "notificationDeliveries",
  "notifications",
  "sharedNotificationTemplates",
  "siteSettings",
  "professionalProfiles",
  "legalPages",
  "systemSettings",
  "auditLogs",
] as const;

export type PersistentTableKey = (typeof PERSISTENT_BACKUP_TABLES)[number];

export interface BackupStorageRoots {
  privateUploadsDir: string;
  minisiteDir: string;
  publicUploadsDir: string;
  backupDir: string;
  lockFilePath: string;
}

export interface BackupManifest {
  format: string;
  formatVersion: string;
  appVersion: string;
  migrationVersion: string | null;
  schemaDigest: string;
  createdAt: string;
  installationId: string;
  backupType: "MANUAL" | "PRE_RESTORE_SNAPSHOT" | "IMPORTED";
  categories: string[];
  tableCounts: Record<string, number>;
  fileCount: number;
  totalUncompressedBytes: number;
  redactedSecretFields: string[];
  excludedSystemDirectories: string[];
  integrity: {
    algorithm: "SHA-256";
    checksumsPath: string;
    entryCount: number;
  };
}

export interface BackupChecksumsEntry {
  sha256: string;
  sizeBytes: number;
}

export interface BackupChecksumsFile {
  algorithm: "SHA-256";
  generatedAt: string;
  entries: Record<string, BackupChecksumsEntry>;
}

export interface BackupJobMetadataSummary {
  format?: string;
  formatVersion?: string;
  appVersion?: string;
  migrationVersion?: string | null;
  schemaDigest?: string;
  installationId?: string;
  backupType?: string;
  origin?: string;
  isLegacy?: boolean;
  categories?: string[];
  tableCounts?: Record<string, number>;
  fileCount?: number;
  realSizeBytes?: number;
  patientCount?: number;
  appointmentCount?: number;
  recordCount?: number;
}

export interface EnrichedBackupJob {
  id: string;
  filename: string;
  sizeBytes: number;
  realSizeBytes: number;
  checksumSha256: string;
  status: string;
  details: string | null;
  createdAt: Date | string;
  isLegacy: boolean;
  restorable: boolean;
  restorableReason: string | null;
  fileExists: boolean;
  formatLabel: string;
  metadata: BackupJobMetadataSummary;
}

export interface StorageAreaStat {
  count: number;
  bytes: number;
}

export interface StorageOverviewStats {
  fileCount: number;
  totalBytes: number;
  storedFileRecordsCount: number;
  breakdown: {
    privateUploads: StorageAreaStat;
    minisiteMedia: StorageAreaStat;
    publicUploads: StorageAreaStat;
    backups: StorageAreaStat;
  };
}

export interface RestoreLockInfo {
  lockedAt: string;
  pid: number;
  backupId?: string;
  adminUserId?: string;
  stage?: string;
}

export function getDefaultStorageRoots(): BackupStorageRoots {
  const backupDir = path.resolve(process.cwd(), process.env.BACKUP_DIR || "./storage/backups");
  return {
    privateUploadsDir: path.resolve(process.cwd(), process.env.STORAGE_DIR || "./storage/uploads"),
    minisiteDir: path.resolve(process.cwd(), "./storage/minisite"),
    publicUploadsDir: path.resolve(process.cwd(), "./public/uploads"),
    backupDir,
    lockFilePath: path.join(path.dirname(backupDir), ".restore.lock"),
  };
}

export function resolveSafeBackupFilePath(backupDir: string, filename: string): string {
  const cleanName = path.basename(filename || "");
  if (
    !cleanName ||
    cleanName !== filename ||
    cleanName === "." ||
    cleanName === ".." ||
    cleanName.includes("/") ||
    cleanName.includes("\\") ||
    cleanName.includes("\0")
  ) {
    throw new Error("CAMINHO_BACKUP_INVALIDO");
  }

  const resolvedBase = path.resolve(backupDir);
  const candidate = path.resolve(resolvedBase, cleanName);
  const rel = path.relative(resolvedBase, candidate);

  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error("CAMINHO_BACKUP_FORA_DIRETORIO");
  }

  return candidate;
}

export function sha256Buffer(buffer: Buffer | string): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export async function sha256File(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fsSync.createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

export function createReadableFileStream(filePath: string): ReadableStream<Uint8Array> {
  let nodeStream: fsSync.ReadStream | null = null;
  return new ReadableStream<Uint8Array>({
    start(controller) {
      nodeStream = fsSync.createReadStream(filePath, { highWaterMark: 64 * 1024 });
      nodeStream.on("data", (chunk: Buffer | string) => {
        const bytes = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
        controller.enqueue(new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength));
      });
      nodeStream.on("end", () => {
        controller.close();
      });
      nodeStream.on("error", (err) => {
        controller.error(err);
      });
    },
    cancel() {
      if (nodeStream && !nodeStream.destroyed) {
        nodeStream.destroy();
      }
    },
  });
}

const RESTORE_LOCK_STALE_MS = 30 * 60 * 1000; // 30 minutos

export async function getRestoreLockInfo(roots: BackupStorageRoots): Promise<RestoreLockInfo | null> {
  try {
    const raw = await fs.readFile(roots.lockFilePath, "utf8");
    const parsed = JSON.parse(raw) as RestoreLockInfo;
    if (!parsed?.lockedAt) return null;
    const ageMs = Date.now() - new Date(parsed.lockedAt).getTime();
    if (Number.isFinite(ageMs) && ageMs > RESTORE_LOCK_STALE_MS) {
      await fs.unlink(roots.lockFilePath).catch(() => {});
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function isRestoreInProgress(roots: BackupStorageRoots): Promise<boolean> {
  return (await getRestoreLockInfo(roots)) !== null;
}

export async function acquireRestoreLock(
  roots: BackupStorageRoots,
  info: Omit<RestoreLockInfo, "lockedAt" | "pid">
): Promise<void> {
  await fs.mkdir(path.dirname(roots.lockFilePath), { recursive: true });
  const existing = await getRestoreLockInfo(roots);
  if (existing) {
    throw new Error("RESTAURACAO_EM_ANDAMENTO");
  }
  const payload: RestoreLockInfo = {
    ...info,
    lockedAt: new Date().toISOString(),
    pid: process.pid,
  };
  await fs.writeFile(roots.lockFilePath, JSON.stringify(payload, null, 2), { flag: "wx" });
}

export async function releaseRestoreLock(roots: BackupStorageRoots): Promise<void> {
  await fs.unlink(roots.lockFilePath).catch(() => {});
}

const IGNORED_UPLOAD_FILENAMES = new Set([".gitkeep", ".DS_Store", "Thumbs.db", ".restore.lock"]);

interface CollectedDiskFile {
  absPath: string;
  relativePosixPath: string;
  sizeBytes: number;
}

async function walkPersistentDirectory(
  rootDir: string,
  excludeDirs: string[] = []
): Promise<{ files: CollectedDiskFile[]; totalBytes: number }> {
  const resolvedRoot = path.resolve(rootDir);
  const resolvedExcludes = excludeDirs.map((d) => path.resolve(d));
  const files: CollectedDiskFile[] = [];
  let totalBytes = 0;

  let rootStat;
  try {
    rootStat = await fs.lstat(resolvedRoot);
  } catch {
    return { files: [], totalBytes: 0 };
  }

  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    return { files: [], totalBytes: 0 };
  }

  async function recurse(currentDir: string) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      if (IGNORED_UPLOAD_FILENAMES.has(entry.name)) continue;
      if (entry.name.endsWith(".tmp") || entry.name.endsWith(".bak")) continue;

      const absEntry = path.resolve(currentDir, entry.name);
      if (resolvedExcludes.includes(absEntry)) continue;
      const st = await fs.lstat(absEntry);
      if (st.isSymbolicLink()) continue;

      if (st.isDirectory()) {
        await recurse(absEntry);
      } else if (st.isFile()) {
        const rel = path.relative(resolvedRoot, absEntry);
        const relPosix = rel.split(path.sep).join("/");
        if (!relPosix || relPosix.startsWith("..") || relPosix.includes("\0")) continue;

        files.push({
          absPath: absEntry,
          relativePosixPath: relPosix,
          sizeBytes: st.size,
        });
        totalBytes += st.size;
      }
    }
  }

  await recurse(resolvedRoot);
  return { files, totalBytes };
}

export async function collectStorageOverview(
  db: PrismaClient = defaultPrisma,
  roots: BackupStorageRoots = getDefaultStorageRoots()
): Promise<StorageOverviewStats> {
  const [privateWalk, minisiteWalk, publicUploadsWalk, backupsWalk, storedFileRecordsCount] =
    await Promise.all([
      walkPersistentDirectory(roots.privateUploadsDir, [roots.backupDir]),
      walkPersistentDirectory(roots.minisiteDir, [roots.backupDir]),
      walkPersistentDirectory(roots.publicUploadsDir, [roots.backupDir]),
      walkPersistentDirectory(roots.backupDir),
      db.storedFile.count(),
    ]);

  const fileCount =
    privateWalk.files.length + minisiteWalk.files.length + publicUploadsWalk.files.length;
  const totalBytes =
    privateWalk.totalBytes + minisiteWalk.totalBytes + publicUploadsWalk.totalBytes;

  return {
    fileCount,
    totalBytes,
    storedFileRecordsCount,
    breakdown: {
      privateUploads: { count: privateWalk.files.length, bytes: privateWalk.totalBytes },
      minisiteMedia: { count: minisiteWalk.files.length, bytes: minisiteWalk.totalBytes },
      publicUploads: { count: publicUploadsWalk.files.length, bytes: publicUploadsWalk.totalBytes },
      backups: { count: backupsWalk.files.length, bytes: backupsWalk.totalBytes },
    },
  };
}

export async function computeSchemaMetadata(db: PrismaClient = defaultPrisma): Promise<{
  migrationVersion: string | null;
  schemaDigest: string;
}> {
  let migrationVersion: string | null = null;
  try {
    const existsRows = await db.$queryRawUnsafe<Array<{ cnt: number | bigint }>>(
      "SELECT COUNT(*) AS cnt FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '_prisma_migrations'"
    );
    const hasMigrationsTable = Number(existsRows?.[0]?.cnt || 0) > 0;
    if (hasMigrationsTable) {
      const rows = await db.$queryRawUnsafe<Array<{ migration_name: string }>>(
        "SELECT migration_name FROM `_prisma_migrations` WHERE finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 1"
      );
      if (Array.isArray(rows) && rows[0]?.migration_name) {
        migrationVersion = String(rows[0].migration_name);
      }
    }
  } catch {
    migrationVersion = null;
  }

  // Gera digest determinístico da estrutura esperada dos modelos Prisma + esquema em disco se disponível
  let schemaSourceText = PERSISTENT_BACKUP_TABLES.join("|");
  try {
    const schemaPath = path.resolve(process.cwd(), "prisma", "schema.prisma");
    schemaSourceText = await fs.readFile(schemaPath, "utf8");
  } catch {
    // fallback para lista de modelos em memória
  }
  const normalizedSchema = schemaSourceText.replace(/\r\n/g, "\n").trim();
  const schemaDigest = sha256Buffer(normalizedSchema);

  return {
    migrationVersion,
    schemaDigest,
  };
}

function safeJsonStringify(value: unknown): string {
  return JSON.stringify(
    value,
    (_key, val) => (typeof val === "bigint" ? val.toString() : val),
    2
  );
}

export async function createFullBackupArchive({
  db = defaultPrisma,
  roots = getDefaultStorageRoots(),
  backupType = "MANUAL",
  customFilename,
}: {
  db?: PrismaClient;
  roots?: BackupStorageRoots;
  backupType?: "MANUAL" | "PRE_RESTORE_SNAPSHOT";
  customFilename?: string;
}): Promise<{
  backupJob: {
    id: string;
    filename: string;
    sizeBytes: number;
    checksumSha256: string;
    status: string;
    details: string | null;
    createdAt: Date;
  };
  manifest: BackupManifest;
  archivePath: string;
  realSizeBytes: number;
}> {
  await fs.mkdir(roots.backupDir, { recursive: true });

  const createdAtIso = new Date().toISOString();
  const { migrationVersion, schemaDigest } = await computeSchemaMetadata(db);
  const installationId = process.env.INSTALLATION_ID || "psi-standalone-instance-default";

  // 1. Leitura consistente do banco de dados dentro de uma transação isolada
  const snapshot = await db.$transaction(
    async (tx) => {
      const [
        adminAccounts,
        patientsRaw,
        guardians,
        patientProfileChangeRequests,
        consentAcceptances,
        services,
        weeklyAvailability,
        availabilityExceptions,
        appointmentPackages,
        appointments,
        appointmentHolds,
        payments,
        paymentAttempts,
        refunds,
        gatewayConfigurationsRaw,
        anamnesisTemplates,
        anamnesisSubmissions,
        clinicalRecords,
        clinicalRecordRevisions,
        storedFiles,
        storedFileShares,
        videoMeetings,
        notificationTemplates,
        notificationDeliveries,
        notifications,
        sharedNotificationTemplates,
        siteSettings,
        professionalProfiles,
        legalPages,
        systemSettingsRaw,
        auditLogs,
      ] = await Promise.all([
        tx.adminAccount.findMany({
          orderBy: { createdAt: "asc" },
        }),
        tx.patient.findMany({
          orderBy: { createdAt: "asc" },
        }),
        tx.guardian.findMany({ orderBy: { createdAt: "asc" } }),
        tx.patientProfileChangeRequest.findMany({ orderBy: { createdAt: "asc" } }),
        tx.consentAcceptance.findMany({ orderBy: { acceptedAt: "asc" } }),
        tx.service.findMany({ orderBy: { createdAt: "asc" } }),
        tx.weeklyAvailability.findMany({ orderBy: { dayOfWeek: "asc" } }),
        tx.availabilityException.findMany({ orderBy: { date: "asc" } }),
        tx.appointmentPackage.findMany({ orderBy: { createdAt: "asc" } }),
        tx.appointment.findMany({ orderBy: { startAt: "asc" } }),
        tx.appointmentHold.findMany({
          where: { expiresAt: { gt: new Date() } },
          orderBy: { createdAt: "asc" },
        }),
        tx.payment.findMany({ orderBy: { createdAt: "asc" } }),
        tx.paymentAttempt.findMany({ orderBy: { createdAt: "asc" } }),
        tx.refund.findMany({ orderBy: { refundedAt: "asc" } }),
        tx.gatewayConfiguration.findMany({ orderBy: { slotNumber: "asc" } }),
        tx.anamnesisTemplate.findMany({ orderBy: { createdAt: "asc" } }),
        tx.anamnesisSubmission.findMany({ orderBy: { createdAt: "asc" } }),
        tx.clinicalRecord.findMany({ orderBy: { sessionDate: "asc" } }),
        tx.clinicalRecordRevision.findMany({ orderBy: { revisedAt: "asc" } }),
        tx.storedFile.findMany({ orderBy: { createdAt: "asc" } }),
        tx.storedFileShare.findMany({ orderBy: { sharedAt: "asc" } }),
        tx.videoMeeting.findMany({ orderBy: { createdAt: "asc" } }),
        tx.notificationTemplate.findMany({ orderBy: { type: "asc" } }),
        tx.notificationDelivery.findMany({ orderBy: { createdAt: "asc" } }),
        tx.notification.findMany({ orderBy: { createdAt: "asc" } }),
        tx.sharedNotificationTemplate.findMany({ orderBy: { eventType: "asc" } }),
        tx.siteSettings.findMany(),
        tx.professionalProfile.findMany(),
        tx.legalPage.findMany({ orderBy: { id: "asc" } }),
        tx.systemSettings.findMany(),
        tx.auditLog.findMany({ orderBy: { createdAt: "asc" } }),
      ]);

      // Remove senhas temporárias em texto puro, credenciais e tokens sensíveis do arquivo portátil
      const patients = patientsRaw.map((p) => ({
        ...p,
        tempPassword: null,
      }));

      const gatewayConfigurations = gatewayConfigurationsRaw.map((g) => ({
        ...g,
        configDataEncrypted: null,
      }));

      const systemSettings = systemSettingsRaw.map((s) => ({
        ...s,
        smtpPass: null,
        whatsappApiToken: null,
        googleMeetClientSecret: null,
        googleMeetRefreshToken: null,
        googleMeetAccessToken: null,
        peerJsTurnSecret: null,
      }));

      return {
        adminAccounts,
        patients,
        guardians,
        patientProfileChangeRequests,
        consentAcceptances,
        services,
        weeklyAvailability,
        availabilityExceptions,
        appointmentPackages,
        appointments,
        appointmentHolds,
        payments,
        paymentAttempts,
        refunds,
        gatewayConfigurations,
        anamnesisTemplates,
        anamnesisSubmissions,
        clinicalRecords,
        clinicalRecordRevisions,
        storedFiles,
        storedFileShares,
        videoMeetings,
        notificationTemplates,
        notificationDeliveries,
        notifications,
        sharedNotificationTemplates,
        siteSettings,
        professionalProfiles,
        legalPages,
        systemSettings,
        auditLogs,
      } satisfies Record<PersistentTableKey, unknown[]>;
    },
    { maxWait: 15000, timeout: 120000 }
  );

  // 2. Coleta todos os arquivos persistentes enviados em disco
  const [privateFiles, minisiteFiles, publicUploadFiles] = await Promise.all([
    walkPersistentDirectory(roots.privateUploadsDir, [roots.backupDir]),
    walkPersistentDirectory(roots.minisiteDir, [roots.backupDir]),
    walkPersistentDirectory(roots.publicUploadsDir, [roots.backupDir]),
  ]);

  const zip = new AdmZip();
  const checksumEntries: Record<string, BackupChecksumsEntry> = {};
  let totalUncompressedBytes = 0;

  function addEntry(entryPath: string, data: Buffer) {
    zip.addFile(entryPath, data);
    checksumEntries[entryPath] = {
      sha256: sha256Buffer(data),
      sizeBytes: data.length,
    };
    totalUncompressedBytes += data.length;
  }

  // 3. Serializa todas as tabelas para psi-backup/database/*.json
  const tableCounts: Record<string, number> = {};
  for (const tableKey of PERSISTENT_BACKUP_TABLES) {
    const rows = snapshot[tableKey];
    tableCounts[tableKey] = rows.length;
    const jsonBuf = Buffer.from(safeJsonStringify(rows), "utf8");
    addEntry(`psi-backup/database/${tableKey}.json`, jsonBuf);
  }

  // 4. Empacota os arquivos enviados mantendo a estrutura relativa exata
  const uploadRootsToPackage: Array<{
    prefix: string;
    collected: CollectedDiskFile[];
  }> = [
    { prefix: "psi-backup/uploads/private", collected: privateFiles.files },
    { prefix: "psi-backup/uploads/minisite", collected: minisiteFiles.files },
    { prefix: "psi-backup/uploads/public-uploads", collected: publicUploadFiles.files },
  ];

  let packagedFileCount = 0;
  for (const area of uploadRootsToPackage) {
    for (const fileItem of area.collected) {
      const fileBuf = await fs.readFile(fileItem.absPath);
      const zipEntryPath = `${area.prefix}/${fileItem.relativePosixPath}`;
      addEntry(zipEntryPath, fileBuf);
      packagedFileCount++;
    }
  }

  const categories: string[] = [
    "Pacientes e Responsáveis",
    "Agendamentos e Pacotes",
    "Serviços e Disponibilidade",
    "Pagamentos e Financeiro",
    "Prontuários e Anamneses",
    "Notificações e Lembretes",
    "Configurações do Site e Aparência",
    "Páginas Legais e Auditoria",
  ];
  if (privateFiles.files.length > 0) categories.push("Documentos Privados de Pacientes");
  if (minisiteFiles.files.length > 0) categories.push("Mídias e Animações do Site");
  if (publicUploadFiles.files.length > 0) categories.push("Logos e Ícones do Site");

  // Pré-monta manifest.json (sem incluir checksums.json no próprio hash para evitar ciclo)
  const entryCountBeforeManifest = Object.keys(checksumEntries).length + 1;
  const manifest: BackupManifest = {
    format: BACKUP_FORMAT_ID,
    formatVersion: BACKUP_FORMAT_VERSION,
    appVersion: APP_VERSION,
    migrationVersion,
    schemaDigest,
    createdAt: createdAtIso,
    installationId,
    backupType,
    categories,
    tableCounts,
    fileCount: packagedFileCount,
    totalUncompressedBytes: 0, // atualizado logo abaixo após serializar manifest
    redactedSecretFields: [...REDACTED_SECRET_FIELDS],
    excludedSystemDirectories: [...EXCLUDED_BACKUP_SYSTEM_DIRECTORIES],
    integrity: {
      algorithm: "SHA-256",
      checksumsPath: "psi-backup/checksums.json",
      entryCount: entryCountBeforeManifest,
    },
  };

  // Ajusta totalUncompressedBytes considerando o próprio manifest
  const manifestDraftSize = Buffer.byteLength(safeJsonStringify(manifest), "utf8");
  manifest.totalUncompressedBytes = totalUncompressedBytes + manifestDraftSize;
  const manifestBuf = Buffer.from(safeJsonStringify(manifest), "utf8");
  addEntry("psi-backup/manifest.json", manifestBuf);

  const checksumsPayload: BackupChecksumsFile = {
    algorithm: "SHA-256",
    generatedAt: createdAtIso,
    entries: checksumEntries,
  };
  zip.addFile("psi-backup/checksums.json", Buffer.from(safeJsonStringify(checksumsPayload), "utf8"));

  // 5. Grava ZIP em disco de forma atômica (.tmp -> rename)
  const timestampStamp = createdAtIso.replace(/[:.]/g, "-").replace("T", "_").slice(0, 19);
  const randSuffix = crypto.randomBytes(4).toString("hex");
  const baseFilename =
    customFilename || `psi_backup_${timestampStamp}_${randSuffix}.zip`;
  const finalPath = resolveSafeBackupFilePath(roots.backupDir, baseFilename);
  const tmpPath = path.join(
    roots.backupDir,
    `.tmp_${Date.now()}_${crypto.randomBytes(4).toString("hex")}_${baseFilename}`
  );

  await zip.writeZipPromise(tmpPath, { overwrite: true });
  await fs.rename(tmpPath, finalPath);

  const stat = await fs.stat(finalPath);
  const realSizeBytes = stat.size;
  const archiveChecksumSha256 = await sha256File(finalPath);

  // 6. Registra metadados em BackupJob (apenas metadados operacionais, nunca dados clínicos)
  const detailsPayload: BackupJobMetadataSummary = {
    format: BACKUP_FORMAT_ID,
    formatVersion: BACKUP_FORMAT_VERSION,
    appVersion: APP_VERSION,
    migrationVersion,
    schemaDigest,
    installationId,
    backupType,
    origin: backupType === "PRE_RESTORE_SNAPSHOT" ? "SAFETY_SNAPSHOT" : "GENERATED",
    isLegacy: false,
    categories,
    tableCounts,
    fileCount: packagedFileCount,
    realSizeBytes,
    patientCount: snapshot.patients.length,
    appointmentCount: snapshot.appointments.length,
    recordCount: snapshot.clinicalRecords.length,
  };

  const backupJob = await db.backupJob.create({
    data: {
      filename: baseFilename,
      sizeBytes: Math.min(realSizeBytes, 2_147_483_647),
      checksumSha256: archiveChecksumSha256,
      status: "COMPLETED",
      details: JSON.stringify(detailsPayload),
    },
  });

  return {
    backupJob,
    manifest,
    archivePath: finalPath,
    realSizeBytes,
  };
}

export async function classifyBackupJob(
  job: {
    id: string;
    filename: string;
    sizeBytes: number;
    checksumSha256: string;
    status: string;
    details: string | null;
    createdAt: Date | string;
  },
  roots: BackupStorageRoots = getDefaultStorageRoots()
): Promise<EnrichedBackupJob> {
  let metadata: BackupJobMetadataSummary = {};
  if (job.details) {
    try {
      metadata = JSON.parse(job.details) as BackupJobMetadataSummary;
    } catch {
      metadata = {};
    }
  }

  let fileExists = false;
  let diskSizeBytes = metadata.realSizeBytes ?? job.sizeBytes;
  try {
    const safePath = resolveSafeBackupFilePath(roots.backupDir, job.filename);
    const st = await fs.stat(safePath);
    if (st.isFile()) {
      fileExists = true;
      diskSizeBytes = st.size;
    }
  } catch {
    fileExists = false;
  }

  const isZipExtension = job.filename.toLowerCase().endsWith(".zip");
  const isCompleteFormat = metadata.format === BACKUP_FORMAT_ID;
  const isLegacy = !isZipExtension || !isCompleteFormat || metadata.isLegacy === true;

  let restorable = false;
  let restorableReason: string | null = null;

  if (job.status === "FAILED") {
    restorable = false;
    restorableReason = "Backup marcado com falha e não pode ser restaurado.";
  } else if (job.status === "PROCESSING" || job.status === "RESTORING") {
    restorable = false;
    restorableReason = "Backup em processamento no momento.";
  } else if (isLegacy) {
    restorable = false;
    restorableReason =
      "Backup legado (apenas manifesto JSON parcial, sem arquivos enviados nem todas as tabelas). Gere um novo backup completo em .zip.";
  } else if (!fileExists) {
    restorable = false;
    restorableReason = "Arquivo de backup não encontrado no diretório privado do servidor.";
  } else {
    restorable = true;
  }

  const formatLabel = isLegacy
    ? "Legado (Somente Manifesto JSON)"
    : metadata.backupType === "PRE_RESTORE_SNAPSHOT"
    ? "Snapshot de Segurança (.zip)"
    : metadata.origin === "IMPORTED"
    ? "Backup Importado (.zip)"
    : "Backup Completo (.zip)";

  return {
    id: job.id,
    filename: job.filename,
    sizeBytes: diskSizeBytes,
    realSizeBytes: diskSizeBytes,
    checksumSha256: job.checksumSha256,
    status: job.status,
    details: job.details,
    createdAt: job.createdAt,
    isLegacy,
    restorable,
    restorableReason,
    fileExists,
    formatLabel,
    metadata,
  };
}

export async function listClassifiedBackups(
  db: PrismaClient = defaultPrisma,
  roots: BackupStorageRoots = getDefaultStorageRoots()
): Promise<EnrichedBackupJob[]> {
  const rows = await db.backupJob.findMany({
    orderBy: { createdAt: "desc" },
  });
  return Promise.all(rows.map((row) => classifyBackupJob(row, roots)));
}

export async function deleteBackupArchiveAndRecord({
  db = defaultPrisma,
  roots = getDefaultStorageRoots(),
  backupId,
  adminUserId,
  ipAddress = "127.0.0.1",
}: {
  db?: PrismaClient;
  roots?: BackupStorageRoots;
  backupId: string;
  adminUserId: string;
  ipAddress?: string;
}): Promise<{
  deletedId: string;
  filename: string;
  archiveFileRemoved: boolean;
}> {
  if (await isRestoreInProgress(roots)) {
    throw new Error("RESTAURACAO_EM_ANDAMENTO");
  }

  const job = await db.backupJob.findUnique({
    where: { id: backupId },
  });
  if (!job) {
    throw new Error("BACKUP_NAO_ENCONTRADO");
  }
  if (job.status === "RESTORING") {
    throw new Error("RESTAURACAO_EM_ANDAMENTO");
  }

  const safePath = resolveSafeBackupFilePath(roots.backupDir, job.filename);
  let archiveFileRemoved = false;
  try {
    await fs.unlink(safePath);
    archiveFileRemoved = true;
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code !== "ENOENT") {
      throw err;
    }
  }

  await db.$transaction(async (tx) => {
    await tx.backupJob.delete({
      where: { id: job.id },
    });

    await tx.auditLog.create({
      data: {
        userId: adminUserId,
        userRole: "ADMIN",
        action: "BACKUP_DELETED",
        resource: "BackupJob",
        resourceId: job.id,
        details: JSON.stringify({
          filename: job.filename,
          sizeBytes: job.sizeBytes,
          archiveFileRemoved,
        }),
        ipAddress,
      },
    });
  });

  return {
    deletedId: job.id,
    filename: job.filename,
    archiveFileRemoved,
  };
}
