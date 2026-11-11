import fsSync, { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import zlib from "zlib";
import { promisify } from "util";
import AdmZip from "adm-zip";
import { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "./prisma";
import {
  canonicalPathKey,
  collectActiveReferencedSiteMedia,
  isMediaCleanupInProgress,
} from "./site-media-cleanup";

const deflateRawAsync = promisify(zlib.deflateRaw);

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

export const BACKUP_STAGES = [
  { step: 1, key: "PREPARING", label: "Preparando backup" },
  { step: 2, key: "EXPORTING_DATABASE", label: "Exportando banco de dados" },
  { step: 3, key: "COPYING_MEDIA", label: "Copiando documentos e mídias" },
  { step: 4, key: "COMPRESSING", label: "Compactando arquivos" },
  { step: 5, key: "VERIFYING", label: "Verificando integridade" },
  { step: 6, key: "FINALIZING", label: "Finalizando backup" },
] as const;

export type BackupStageKey = (typeof BACKUP_STAGES)[number]["key"];
export type BackupExecutionStatus =
  | "RUNNING"
  | "CANCELLING"
  | "COMPLETED"
  | "CANCELLED"
  | "FAILED";

export interface BackupProgressSnapshot {
  jobId: string;
  status: BackupExecutionStatus;
  stageKey: BackupStageKey;
  stageIndex: number;
  totalStages: 6;
  stageLabel: string;
  detailText: string | null;
  percent: number | null;
  cancellable: boolean;
  startedAt: string;
  updatedAt: string;
  finishedAt: string | null;
  error: string | null;
  resultBackup: {
    id: string;
    filename: string;
    sizeBytes: number;
    status: string;
    checksumSha256: string;
    fileCount: number;
  } | null;
}

export function getBackupJobStateFilePath(roots: BackupStorageRoots = getDefaultStorageRoots()): string {
  return path.join(path.dirname(roots.backupDir), ".backup-job.json");
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

export const RESTORE_MAINTENANCE_MESSAGE =
  "Sistema em modo de manutenção durante a restauração de backup. Novas gravações estão temporariamente suspensas.";

export async function isRestoreInProgress(roots: BackupStorageRoots = getDefaultStorageRoots()): Promise<boolean> {
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

const IGNORED_UPLOAD_FILENAMES = new Set([
  ".gitkeep",
  ".DS_Store",
  "Thumbs.db",
  ".restore.lock",
  ".backup-job.json",
  ".media-cleanup.lock",
]);

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
      if (
        entry.name.startsWith(".tmp_") ||
        entry.name.endsWith(".tmp") ||
        entry.name.endsWith(".bak")
      ) {
        continue;
      }

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

const STORE_ONLY_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".mp4",
  ".webm",
  ".zip",
  ".gz",
  ".bz2",
  ".xz",
  ".pdf",
  ".woff2",
]);

function toDosTimeDate(date: Date): { dosTime: number; dosDate: number } {
  const year = Math.max(1980, date.getFullYear());
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = Math.floor(date.getSeconds() / 2);
  return {
    dosTime: (hours << 11) | (minutes << 5) | seconds,
    dosDate: ((year - 1980) << 9) | (month << 5) | day,
  };
}

interface ZipStreamInputEntry {
  entryName: string;
  readData: () => Promise<Buffer>;
}

interface ZipCentralRecord {
  nameBuf: Buffer;
  method: number;
  dosTime: number;
  dosDate: number;
  crc32: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
}

async function writeZipArchiveStreaming({
  outputPath,
  entries,
  onEntryDone,
  shouldCancel,
}: {
  outputPath: string;
  entries: ZipStreamInputEntry[];
  onEntryDone?: (doneCount: number, totalCount: number, entryName: string) => Promise<void> | void;
  shouldCancel?: () => boolean | Promise<boolean>;
}): Promise<void> {
  const now = new Date();
  const { dosTime, dosDate } = toDosTimeDate(now);
  const fh = await fs.open(outputPath, "w");
  const centralRecords: ZipCentralRecord[] = [];
  let offset = 0;

  try {
    for (let i = 0; i < entries.length; i++) {
      if (shouldCancel && (await shouldCancel())) {
        throw new Error("BACKUP_CANCELADO_PELO_USUARIO");
      }

      const item = entries[i];
      const rawData = await item.readData();
      const nameBuf = Buffer.from(item.entryName, "utf8");
      const crc = zlib.crc32(rawData) >>> 0;
      const ext = path.posix.extname(item.entryName).toLowerCase();

      let method = 0;
      let payload = rawData;
      if (!STORE_ONLY_EXTENSIONS.has(ext) && rawData.length > 64) {
        const deflated = await deflateRawAsync(rawData);
        if (deflated.length < rawData.length) {
          method = 8;
          payload = deflated;
        }
      }

      const localHeader = Buffer.allocUnsafe(30);
      localHeader.writeUInt32LE(0x04034b50, 0);
      localHeader.writeUInt16LE(20, 4);
      localHeader.writeUInt16LE(0x0800, 6);
      localHeader.writeUInt16LE(method, 8);
      localHeader.writeUInt16LE(dosTime, 10);
      localHeader.writeUInt16LE(dosDate, 12);
      localHeader.writeUInt32LE(crc, 14);
      localHeader.writeUInt32LE(payload.length, 18);
      localHeader.writeUInt32LE(rawData.length, 22);
      localHeader.writeUInt16LE(nameBuf.length, 26);
      localHeader.writeUInt16LE(0, 28);

      const localHeaderOffset = offset;
      await fh.write(localHeader, 0, localHeader.length, offset);
      offset += localHeader.length;
      await fh.write(nameBuf, 0, nameBuf.length, offset);
      offset += nameBuf.length;
      if (payload.length > 0) {
        await fh.write(payload, 0, payload.length, offset);
        offset += payload.length;
      }

      centralRecords.push({
        nameBuf,
        method,
        dosTime,
        dosDate,
        crc32: crc,
        compressedSize: payload.length,
        uncompressedSize: rawData.length,
        localHeaderOffset,
      });

      if (onEntryDone) {
        await onEntryDone(i + 1, entries.length, item.entryName);
      }
      // Cede turno do event loop para processar requisições de cancelamento/progresso em backups grandes
      await new Promise((resolve) => setImmediate(resolve));
    }

    if (shouldCancel && (await shouldCancel())) {
      throw new Error("BACKUP_CANCELADO_PELO_USUARIO");
    }

    const centralDirStartOffset = offset;
    for (const rec of centralRecords) {
      const central = Buffer.allocUnsafe(46);
      central.writeUInt32LE(0x02014b50, 0);
      central.writeUInt16LE(20, 4);
      central.writeUInt16LE(20, 6);
      central.writeUInt16LE(0x0800, 8);
      central.writeUInt16LE(rec.method, 10);
      central.writeUInt16LE(rec.dosTime, 12);
      central.writeUInt16LE(rec.dosDate, 14);
      central.writeUInt32LE(rec.crc32, 16);
      central.writeUInt32LE(rec.compressedSize, 20);
      central.writeUInt32LE(rec.uncompressedSize, 24);
      central.writeUInt16LE(rec.nameBuf.length, 28);
      central.writeUInt16LE(0, 30);
      central.writeUInt16LE(0, 32);
      central.writeUInt16LE(0, 34);
      central.writeUInt16LE(0, 36);
      central.writeUInt32LE(0, 38);
      central.writeUInt32LE(rec.localHeaderOffset, 42);

      await fh.write(central, 0, central.length, offset);
      offset += central.length;
      await fh.write(rec.nameBuf, 0, rec.nameBuf.length, offset);
      offset += rec.nameBuf.length;
    }

    const centralDirSize = offset - centralDirStartOffset;
    const eocd = Buffer.allocUnsafe(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(0, 4);
    eocd.writeUInt16LE(0, 6);
    eocd.writeUInt16LE(centralRecords.length, 8);
    eocd.writeUInt16LE(centralRecords.length, 10);
    eocd.writeUInt32LE(centralDirSize, 12);
    eocd.writeUInt32LE(centralDirStartOffset, 16);
    eocd.writeUInt16LE(0, 20);

    await fh.write(eocd, 0, eocd.length, offset);
    await fh.sync();
  } finally {
    await fh.close().catch(() => {});
  }
}

async function copyFileComputeSha256WithProgress({
  srcPath,
  destPath,
  onChunk,
  shouldCancel,
}: {
  srcPath: string;
  destPath: string;
  onChunk?: (bytesCopied: number) => Promise<void> | void;
  shouldCancel?: () => boolean | Promise<boolean>;
}): Promise<{ sha256: string; sizeBytes: number }> {
  await fs.mkdir(path.dirname(destPath), { recursive: true });
  const srcHandle = await fs.open(srcPath, "r");
  const destHandle = await fs.open(destPath, "w");
  const hash = crypto.createHash("sha256");
  const chunkSize = 256 * 1024;
  const buf = Buffer.allocUnsafe(chunkSize);
  let totalSize = 0;

  try {
    while (true) {
      if (shouldCancel && (await shouldCancel())) {
        throw new Error("BACKUP_CANCELADO_PELO_USUARIO");
      }
      const { bytesRead } = await srcHandle.read(buf, 0, chunkSize, null);
      if (bytesRead === 0) break;
      const slice = buf.subarray(0, bytesRead);
      hash.update(slice);
      await destHandle.write(slice, 0, bytesRead, null);
      totalSize += bytesRead;
      if (onChunk) {
        await onChunk(bytesRead);
      }
      await new Promise((resolve) => setImmediate(resolve));
    }
    return {
      sha256: hash.digest("hex"),
      sizeBytes: totalSize,
    };
  } finally {
    await srcHandle.close().catch(() => {});
    await destHandle.close().catch(() => {});
  }
}

async function sha256FileWithProgress(
  filePath: string,
  onProgress?: (readBytes: number, totalBytes: number) => Promise<void> | void,
  shouldCancel?: () => boolean | Promise<boolean>
): Promise<string> {
  const stat = await fs.stat(filePath);
  const totalBytes = stat.size;
  const fh = await fs.open(filePath, "r");
  const hash = crypto.createHash("sha256");
  const chunkSize = 512 * 1024;
  const buf = Buffer.allocUnsafe(chunkSize);
  let readTotal = 0;

  try {
    while (true) {
      if (shouldCancel && (await shouldCancel())) {
        throw new Error("BACKUP_CANCELADO_PELO_USUARIO");
      }
      const { bytesRead } = await fh.read(buf, 0, chunkSize, null);
      if (bytesRead === 0) break;
      hash.update(buf.subarray(0, bytesRead));
      readTotal += bytesRead;
      if (onProgress) {
        await onProgress(readTotal, totalBytes);
      }
      await new Promise((resolve) => setImmediate(resolve));
    }
    return hash.digest("hex");
  } finally {
    await fh.close().catch(() => {});
  }
}

export interface BackupProgressCallbacks {
  onProgress?: (
    patch: Partial<
      Pick<
        BackupProgressSnapshot,
        "stageKey" | "stageIndex" | "stageLabel" | "detailText" | "percent" | "cancellable"
      >
    >
  ) => Promise<void> | void;
  shouldCancel?: () => boolean | Promise<boolean>;
  onBeforeAtomicCommit?: () => Promise<void> | void;
  _testStageHook?: (stageKey: BackupStageKey) => Promise<void> | void;
}

export async function createFullBackupArchive({
  db = defaultPrisma,
  roots = getDefaultStorageRoots(),
  backupType = "MANUAL",
  customFilename,
  includeUnusedSiteMedia = false,
  onProgress,
  shouldCancel,
  onBeforeAtomicCommit,
  _testStageHook,
}: {
  db?: PrismaClient;
  roots?: BackupStorageRoots;
  backupType?: "MANUAL" | "PRE_RESTORE_SNAPSHOT";
  customFilename?: string;
  includeUnusedSiteMedia?: boolean;
} & BackupProgressCallbacks): Promise<{
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
  const throwIfCancelled = async () => {
    if (shouldCancel && (await shouldCancel())) {
      throw new Error("BACKUP_CANCELADO_PELO_USUARIO");
    }
  };

  const emitStage = async (
    stepIndex: number,
    detailText: string | null,
    percent: number | null,
    cancellable = true
  ) => {
    const def = BACKUP_STAGES[stepIndex - 1];
    if (onProgress && def) {
      await onProgress({
        stageKey: def.key,
        stageIndex: def.step,
        stageLabel: def.label,
        detailText,
        percent,
        cancellable,
      });
    }
  };

  // Etapa 1: Preparando backup (barra indeterminada até dimensões exatas serem conhecidas)
  await emitStage(1, "Preparando diretório seguro e inventário...", null, true);
  if (_testStageHook) await _testStageHook("PREPARING");
  await throwIfCancelled();

  // Coordena brevemente caso haja uma limpeza de mídia finalizando
  const cleanupWaitDeadline = Date.now() + 2500;
  while (await isMediaCleanupInProgress({ backupDir: roots.backupDir, lockFilePath: roots.lockFilePath })) {
    await throwIfCancelled();
    if (Date.now() > cleanupWaitDeadline) {
      throw new Error("LIMPEZA_MIDIA_EM_ANDAMENTO");
    }
    await new Promise((r) => setTimeout(r, 60));
  }

  await fs.mkdir(roots.backupDir, { recursive: true });
  const stageToken = `${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  const stagingDir = path.join(roots.backupDir, `.tmp_stage_${stageToken}`);
  let tmpZipPath: string | null = null;
  let renamedToFinal = false;

  try {
    await fs.mkdir(stagingDir, { recursive: true });

    const createdAtIso = new Date().toISOString();
    const { migrationVersion, schemaDigest } = await computeSchemaMetadata(db);
    const installationId = process.env.INSTALLATION_ID || "psi-standalone-instance-default";

    await throwIfCancelled();

    // Etapa 2: Exportando banco de dados (progresso real tabela a tabela)
    await emitStage(2, "Iniciando leitura consistente do banco de dados...", 5, true);
    if (_testStageHook) await _testStageHook("EXPORTING_DATABASE");
    await throwIfCancelled();

    const snapshot = await db.$transaction(
      async (tx) => {
        const tableTotal = PERSISTENT_BACKUP_TABLES.length;
        let tablesDone = 0;
        const stepTable = async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
          await throwIfCancelled();
          const res = await fn();
          tablesDone += 1;
          const pct = 5 + Math.round((tablesDone / tableTotal) * 20);
          await emitStage(2, `Exportando ${label} (${tablesDone}/${tableTotal})...`, pct, true);
          return res;
        };

        const adminAccounts = await stepTable("contas administrativas", () =>
          tx.adminAccount.findMany({ orderBy: { createdAt: "asc" } })
        );
        const patientsRaw = await stepTable("pacientes", () =>
          tx.patient.findMany({ orderBy: { createdAt: "asc" } })
        );
        const guardians = await stepTable("responsáveis legais", () =>
          tx.guardian.findMany({ orderBy: { createdAt: "asc" } })
        );
        const patientProfileChangeRequests = await stepTable("solicitações cadastrais", () =>
          tx.patientProfileChangeRequest.findMany({ orderBy: { createdAt: "asc" } })
        );
        const consentAcceptances = await stepTable("consentimentos LGPD", () =>
          tx.consentAcceptance.findMany({ orderBy: { acceptedAt: "asc" } })
        );
        const services = await stepTable("serviços", () =>
          tx.service.findMany({ orderBy: { createdAt: "asc" } })
        );
        const weeklyAvailability = await stepTable("disponibilidade semanal", () =>
          tx.weeklyAvailability.findMany({ orderBy: { dayOfWeek: "asc" } })
        );
        const availabilityExceptions = await stepTable("exceções de agenda", () =>
          tx.availabilityException.findMany({ orderBy: { date: "asc" } })
        );
        const appointmentPackages = await stepTable("pacotes de sessões", () =>
          tx.appointmentPackage.findMany({ orderBy: { createdAt: "asc" } })
        );
        const appointments = await stepTable("consultas", () =>
          tx.appointment.findMany({ orderBy: { startAt: "asc" } })
        );
        const appointmentHolds = await stepTable("reservas temporárias", () =>
          tx.appointmentHold.findMany({
            where: { expiresAt: { gt: new Date() } },
            orderBy: { createdAt: "asc" },
          })
        );
        const payments = await stepTable("pagamentos", () =>
          tx.payment.findMany({ orderBy: { createdAt: "asc" } })
        );
        const paymentAttempts = await stepTable("tentativas de pagamento", () =>
          tx.paymentAttempt.findMany({ orderBy: { createdAt: "asc" } })
        );
        const refunds = await stepTable("estornos", () =>
          tx.refund.findMany({ orderBy: { refundedAt: "asc" } })
        );
        const gatewayConfigurationsRaw = await stepTable("configurações de gateway", () =>
          tx.gatewayConfiguration.findMany({ orderBy: { slotNumber: "asc" } })
        );
        const anamnesisTemplates = await stepTable("modelos de anamnese", () =>
          tx.anamnesisTemplate.findMany({ orderBy: { createdAt: "asc" } })
        );
        const anamnesisSubmissions = await stepTable("respostas de anamnese", () =>
          tx.anamnesisSubmission.findMany({ orderBy: { createdAt: "asc" } })
        );
        const clinicalRecords = await stepTable("prontuários clínicos", () =>
          tx.clinicalRecord.findMany({ orderBy: { sessionDate: "asc" } })
        );
        const clinicalRecordRevisions = await stepTable("retificações de prontuário", () =>
          tx.clinicalRecordRevision.findMany({ orderBy: { revisedAt: "asc" } })
        );
        const storedFiles = await stepTable("metadados de arquivos", () =>
          tx.storedFile.findMany({ orderBy: { createdAt: "asc" } })
        );
        const storedFileShares = await stepTable("compartilhamentos de arquivos", () =>
          tx.storedFileShare.findMany({ orderBy: { sharedAt: "asc" } })
        );
        const videoMeetings = await stepTable("salas de vídeo", () =>
          tx.videoMeeting.findMany({ orderBy: { createdAt: "asc" } })
        );
        const notificationTemplates = await stepTable("templates de notificação", () =>
          tx.notificationTemplate.findMany({ orderBy: { type: "asc" } })
        );
        const notificationDeliveries = await stepTable("entregas de notificação", () =>
          tx.notificationDelivery.findMany({ orderBy: { createdAt: "asc" } })
        );
        const notifications = await stepTable("notificações", () =>
          tx.notification.findMany({ orderBy: { createdAt: "asc" } })
        );
        const sharedNotificationTemplates = await stepTable("templates compartilhados", () =>
          tx.sharedNotificationTemplate.findMany({ orderBy: { eventType: "asc" } })
        );
        const siteSettings = await stepTable("configurações do Site", () => tx.siteSettings.findMany());
        const professionalProfiles = await stepTable("perfil profissional", () =>
          tx.professionalProfile.findMany()
        );
        const legalPages = await stepTable("páginas legais", () =>
          tx.legalPage.findMany({ orderBy: { id: "asc" } })
        );
        const systemSettingsRaw = await stepTable("configurações do sistema", () =>
          tx.systemSettings.findMany()
        );
        const auditLogs = await stepTable("trilhas de auditoria", () =>
          tx.auditLog.findMany({ orderBy: { createdAt: "asc" } })
        );

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

    await throwIfCancelled();

    // Prepara os JSONs das tabelas no staging isolado
    const checksumEntries: Record<string, BackupChecksumsEntry> = {};
    const stagedZipEntries: ZipStreamInputEntry[] = [];
    const tableCounts: Record<string, number> = {};
    let totalUncompressedBytes = 0;

    const dbStagingDir = path.join(stagingDir, "database");
    await fs.mkdir(dbStagingDir, { recursive: true });

    for (const tableKey of PERSISTENT_BACKUP_TABLES) {
      await throwIfCancelled();
      const rows = snapshot[tableKey];
      tableCounts[tableKey] = rows.length;
      const jsonBuf = Buffer.from(safeJsonStringify(rows), "utf8");
      const entryPath = `psi-backup/database/${tableKey}.json`;
      const stagedPath = path.join(dbStagingDir, `${tableKey}.json`);
      await fs.writeFile(stagedPath, jsonBuf);
      checksumEntries[entryPath] = {
        sha256: sha256Buffer(jsonBuf),
        sizeBytes: jsonBuf.length,
      };
      totalUncompressedBytes += jsonBuf.length;
      stagedZipEntries.push({
        entryName: entryPath,
        readData: () => fs.readFile(stagedPath),
      });
    }

    // Etapa 3: Copiando documentos e mídias (sempre 100% dos docs privados + mídias ativas do Site)
    await emitStage(3, "Mapeando documentos privados e mídias ativas do Site...", 25, true);
    if (_testStageHook) await _testStageHook("COPYING_MEDIA");
    await throwIfCancelled();

    const activeSiteRefs = includeUnusedSiteMedia
      ? null
      : await collectActiveReferencedSiteMedia(db, {
          minisiteDir: roots.minisiteDir,
          publicUploadsDir: roots.publicUploadsDir,
        });

    const [privateFiles, rawMinisiteFiles, rawPublicUploadFiles] = await Promise.all([
      walkPersistentDirectory(roots.privateUploadsDir, [roots.backupDir]),
      walkPersistentDirectory(roots.minisiteDir, [roots.backupDir]),
      walkPersistentDirectory(roots.publicUploadsDir, [roots.backupDir]),
    ]);

    const selectedMinisiteFiles = activeSiteRefs
      ? rawMinisiteFiles.files.filter((f) => activeSiteRefs.referencedPaths.has(canonicalPathKey(f.absPath)))
      : rawMinisiteFiles.files;

    const selectedPublicUploadFiles = activeSiteRefs
      ? rawPublicUploadFiles.files.filter((f) => activeSiteRefs.referencedPaths.has(canonicalPathKey(f.absPath)))
      : rawPublicUploadFiles.files;

    const uploadRootsToPackage: Array<{
      stageSubdir: string;
      prefix: string;
      collected: CollectedDiskFile[];
    }> = [
      { stageSubdir: "private", prefix: "psi-backup/uploads/private", collected: privateFiles.files },
      { stageSubdir: "minisite", prefix: "psi-backup/uploads/minisite", collected: selectedMinisiteFiles },
      { stageSubdir: "public-uploads", prefix: "psi-backup/uploads/public-uploads", collected: selectedPublicUploadFiles },
    ];

    const totalMediaFiles = uploadRootsToPackage.reduce((acc, a) => acc + a.collected.length, 0);
    const totalMediaBytes = uploadRootsToPackage.reduce(
      (acc, a) => acc + a.collected.reduce((s, f) => s + f.sizeBytes, 0),
      0
    );

    let copiedMediaFiles = 0;
    let copiedMediaBytes = 0;

    for (const area of uploadRootsToPackage) {
      for (const fileItem of area.collected) {
        await throwIfCancelled();
        const stagedPath = path.join(stagingDir, "uploads", area.stageSubdir, ...fileItem.relativePosixPath.split("/"));
        const { sha256, sizeBytes } = await copyFileComputeSha256WithProgress({
          srcPath: fileItem.absPath,
          destPath: stagedPath,
          shouldCancel,
          onChunk: async (bytes) => {
            copiedMediaBytes += bytes;
            if (totalMediaBytes > 0) {
              const pct = 25 + Math.round((copiedMediaBytes / totalMediaBytes) * 30);
              await emitStage(
                3,
                `Copiando arquivos (${copiedMediaFiles + 1}/${totalMediaFiles})...`,
                Math.min(55, pct),
                true
              );
            }
          },
        });
        copiedMediaFiles += 1;
        if (totalMediaBytes === 0) {
          const pct = 25 + Math.round((copiedMediaFiles / Math.max(totalMediaFiles, 1)) * 30);
          await emitStage(3, `Copiando arquivos (${copiedMediaFiles}/${totalMediaFiles})...`, pct, true);
        }

        const zipEntryPath = `${area.prefix}/${fileItem.relativePosixPath}`;
        checksumEntries[zipEntryPath] = { sha256, sizeBytes };
        totalUncompressedBytes += sizeBytes;
        stagedZipEntries.push({
          entryName: zipEntryPath,
          readData: () => fs.readFile(stagedPath),
        });
      }
    }

    await emitStage(
      3,
      totalMediaFiles > 0
        ? `${totalMediaFiles} arquivo(s) preparados para compactação`
        : "Nenhum arquivo enviado encontrado; preparando manifesto...",
      55,
      true
    );

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
    if (selectedMinisiteFiles.length > 0) categories.push("Mídias e Animações do Site");
    if (selectedPublicUploadFiles.length > 0) categories.push("Logos e Ícones do Site");

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
      fileCount: copiedMediaFiles,
      totalUncompressedBytes: 0,
      redactedSecretFields: [...REDACTED_SECRET_FIELDS],
      excludedSystemDirectories: [...EXCLUDED_BACKUP_SYSTEM_DIRECTORIES],
      integrity: {
        algorithm: "SHA-256",
        checksumsPath: "psi-backup/checksums.json",
        entryCount: entryCountBeforeManifest,
      },
    };

    const manifestDraftSize = Buffer.byteLength(safeJsonStringify(manifest), "utf8");
    manifest.totalUncompressedBytes = totalUncompressedBytes + manifestDraftSize;
    const manifestBuf = Buffer.from(safeJsonStringify(manifest), "utf8");
    const manifestStagePath = path.join(stagingDir, "manifest.json");
    await fs.writeFile(manifestStagePath, manifestBuf);
    checksumEntries["psi-backup/manifest.json"] = {
      sha256: sha256Buffer(manifestBuf),
      sizeBytes: manifestBuf.length,
    };
    stagedZipEntries.push({
      entryName: "psi-backup/manifest.json",
      readData: () => fs.readFile(manifestStagePath),
    });

    const checksumsPayload: BackupChecksumsFile = {
      algorithm: "SHA-256",
      generatedAt: createdAtIso,
      entries: checksumEntries,
    };
    const checksumsBuf = Buffer.from(safeJsonStringify(checksumsPayload), "utf8");
    const checksumsStagePath = path.join(stagingDir, "checksums.json");
    await fs.writeFile(checksumsStagePath, checksumsBuf);
    stagedZipEntries.push({
      entryName: "psi-backup/checksums.json",
      readData: () => fs.readFile(checksumsStagePath),
    });

    // Etapa 4: Compactando arquivos em disco temporário
    const timestampStamp = createdAtIso.replace(/[:.]/g, "-").replace("T", "_").slice(0, 19);
    const randSuffix = crypto.randomBytes(4).toString("hex");
    const baseFilename =
      customFilename || `psi_backup_${timestampStamp}_${randSuffix}.zip`;
    const finalPath = resolveSafeBackupFilePath(roots.backupDir, baseFilename);
    tmpZipPath = path.join(roots.backupDir, `.tmp_${stageToken}_${baseFilename}`);

    await emitStage(4, `Compactando ${stagedZipEntries.length} itens...`, 55, true);
    if (_testStageHook) await _testStageHook("COMPRESSING");
    await throwIfCancelled();

    await writeZipArchiveStreaming({
      outputPath: tmpZipPath,
      entries: stagedZipEntries,
      shouldCancel,
      onEntryDone: async (doneCount, totalCount) => {
        const pct = 55 + Math.round((doneCount / Math.max(totalCount, 1)) * 30);
        await emitStage(4, `Compactando item ${doneCount} de ${totalCount}...`, Math.min(85, pct), true);
      },
    });

    // Libera diretório de staging temporário logo após compactação
    await fs.rm(stagingDir, { recursive: true, force: true }).catch(() => {});

    // Etapa 5: Verificando integridade (SHA-256 + leitura estrutural do pacote ZIP antes da conclusão)
    await emitStage(5, "Calculando checksum SHA-256 do pacote...", 85, true);
    if (_testStageHook) await _testStageHook("VERIFYING");
    await throwIfCancelled();

    const archiveChecksumSha256 = await sha256FileWithProgress(
      tmpZipPath,
      async (readBytes, totalBytes) => {
        if (totalBytes > 0) {
          const pct = 85 + Math.round((readBytes / totalBytes) * 8);
          await emitStage(5, "Verificando checksum SHA-256 do pacote...", Math.min(93, pct), true);
        }
      },
      shouldCancel
    );

    await emitStage(5, "Validando manifesto e integridade de cada arquivo...", 94, true);
    await throwIfCancelled();
    await validateAndInspectBackupArchive(tmpZipPath, db);
    await emitStage(5, "Integridade verificada com sucesso", 98, true);
    await throwIfCancelled();

    // Etapa 6: Finalizando backup (etapa crítica atômica — NÃO cancelável)
    if (onBeforeAtomicCommit) {
      await onBeforeAtomicCommit();
    }
    await emitStage(6, "Gravando arquivo final e registrando histórico...", 99, false);
    if (_testStageHook) await _testStageHook("FINALIZING");

    await fs.rename(tmpZipPath, finalPath);
    renamedToFinal = true;

    const stat = await fs.stat(finalPath);
    const realSizeBytes = stat.size;

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
      fileCount: copiedMediaFiles,
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

    // 100% emitido SOMENTE após geração e verificação completas
    await emitStage(6, "Backup concluído e verificado", 100, false);

    return {
      backupJob,
      manifest,
      archivePath: finalPath,
      realSizeBytes,
    };
  } finally {
    await fs.rm(stagingDir, { recursive: true, force: true }).catch(() => {});
    if (tmpZipPath && !renamedToFinal) {
      await fs.unlink(tmpZipPath).catch(() => {});
    }
  }
}

interface PersistedBackupJobRecord {
  pid: number;
  heartbeatAt: string;
  cancelRequested: boolean;
  snapshot: BackupProgressSnapshot;
}

interface BackupJobRuntimeEntry {
  roots: BackupStorageRoots;
  snapshot: BackupProgressSnapshot;
  cancelRequested: boolean;
  promise: Promise<void>;
}

const globalForBackupJobs = globalThis as unknown as {
  __psiBackupRuntimeMap?: Map<string, BackupJobRuntimeEntry>;
};

function getBackupRuntimeMap(): Map<string, BackupJobRuntimeEntry> {
  if (!globalForBackupJobs.__psiBackupRuntimeMap) {
    globalForBackupJobs.__psiBackupRuntimeMap = new Map<string, BackupJobRuntimeEntry>();
  }
  return globalForBackupJobs.__psiBackupRuntimeMap;
}

function makeRuntimeKey(roots: BackupStorageRoots, jobId: string): string {
  return `${path.resolve(roots.backupDir)}::${jobId}`;
}

function isProcessAlive(pid: unknown): boolean {
  if (typeof pid !== "number" || !Number.isInteger(pid) || pid <= 0) return false;
  if (pid === process.pid) return true;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException)?.code;
    return code === "EPERM";
  }
}

const TRACKED_JOB_STALE_MS = 15 * 60 * 1000;

async function persistBackupJobRecord(
  roots: BackupStorageRoots,
  record: PersistedBackupJobRecord
): Promise<void> {
  const filePath = getBackupJobStateFilePath(roots);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tmpFile = `${filePath}.${process.pid}.${crypto.randomBytes(3).toString("hex")}.tmp`;
  await fs.writeFile(tmpFile, JSON.stringify(record, null, 2), "utf8");
  await fs.rename(tmpFile, filePath);
}

async function readPersistedBackupJobRecord(
  roots: BackupStorageRoots
): Promise<PersistedBackupJobRecord | null> {
  const filePath = getBackupJobStateFilePath(roots);
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as PersistedBackupJobRecord;
    if (!parsed?.snapshot?.jobId) return null;

    if (parsed.snapshot.status === "RUNNING" || parsed.snapshot.status === "CANCELLING") {
      const ageMs = parsed.heartbeatAt ? Date.now() - new Date(parsed.heartbeatAt).getTime() : NaN;
      const pidDead = parsed.pid && !isProcessAlive(parsed.pid);
      const stale = !Number.isFinite(ageMs) || ageMs > TRACKED_JOB_STALE_MS;
      if (pidDead || stale) {
        // Limpa eventuais temporários de um processo anterior interrompido
        const entries = await fs.readdir(roots.backupDir).catch(() => []);
        for (const name of entries) {
          if (name.startsWith(".tmp_")) {
            await fs.rm(path.join(roots.backupDir, name), { recursive: true, force: true }).catch(() => {});
          }
        }
        const recovered: PersistedBackupJobRecord = {
          ...parsed,
          heartbeatAt: new Date().toISOString(),
          snapshot: {
            ...parsed.snapshot,
            status: "FAILED",
            cancellable: false,
            finishedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            error: "O processo anterior de backup foi interrompido antes da conclusão.",
          },
        };
        await persistBackupJobRecord(roots, recovered).catch(() => {});
        return recovered;
      }
    }

    return parsed;
  } catch {
    return null;
  }
}

export async function isBackupJobActive(
  roots: BackupStorageRoots = getDefaultStorageRoots()
): Promise<boolean> {
  const dirKey = `${path.resolve(roots.backupDir)}::`;
  for (const [k, entry] of getBackupRuntimeMap().entries()) {
    if (
      k.startsWith(dirKey) &&
      (entry.snapshot.status === "RUNNING" || entry.snapshot.status === "CANCELLING")
    ) {
      return true;
    }
  }
  const persisted = await readPersistedBackupJobRecord(roots);
  return Boolean(
    persisted &&
      (persisted.snapshot.status === "RUNNING" || persisted.snapshot.status === "CANCELLING")
  );
}

export async function getTrackedBackupJobStatus(
  roots: BackupStorageRoots = getDefaultStorageRoots(),
  jobId?: string | null
): Promise<BackupProgressSnapshot | null> {
  const map = getBackupRuntimeMap();
  if (jobId) {
    const inMem = map.get(makeRuntimeKey(roots, jobId));
    if (inMem) return { ...inMem.snapshot };
    const persisted = await readPersistedBackupJobRecord(roots);
    if (persisted?.snapshot.jobId === jobId) return persisted.snapshot;
    return null;
  }

  const dirKey = `${path.resolve(roots.backupDir)}::`;
  for (const [k, entry] of map.entries()) {
    if (
      k.startsWith(dirKey) &&
      (entry.snapshot.status === "RUNNING" || entry.snapshot.status === "CANCELLING")
    ) {
      return { ...entry.snapshot };
    }
  }

  const persisted = await readPersistedBackupJobRecord(roots);
  if (
    persisted &&
    (persisted.snapshot.status === "RUNNING" || persisted.snapshot.status === "CANCELLING")
  ) {
    return persisted.snapshot;
  }
  return null;
}

export async function startTrackedBackupJob({
  db = defaultPrisma,
  roots = getDefaultStorageRoots(),
  adminUserId,
  ipAddress = "127.0.0.1",
  includeUnusedSiteMedia = false,
  _testStageHook,
}: {
  db?: PrismaClient;
  roots?: BackupStorageRoots;
  adminUserId: string;
  ipAddress?: string;
  includeUnusedSiteMedia?: boolean;
  _testStageHook?: (stageKey: BackupStageKey, snapshot: BackupProgressSnapshot) => Promise<void> | void;
}): Promise<BackupProgressSnapshot> {
  if (await isRestoreInProgress(roots)) {
    throw new Error("RESTAURACAO_EM_ANDAMENTO");
  }
  if (await isBackupJobActive(roots)) {
    throw new Error("BACKUP_EM_ANDAMENTO");
  }
  if (await isMediaCleanupInProgress({ backupDir: roots.backupDir, lockFilePath: roots.lockFilePath })) {
    throw new Error("LIMPEZA_MIDIA_EM_ANDAMENTO");
  }

  const nowIso = new Date().toISOString();
  const jobId = `bkp_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  const initialSnapshot: BackupProgressSnapshot = {
    jobId,
    status: "RUNNING",
    stageKey: "PREPARING",
    stageIndex: 1,
    totalStages: 6,
    stageLabel: BACKUP_STAGES[0].label,
    detailText: "Iniciando processo de cópia de segurança...",
    percent: null,
    cancellable: true,
    startedAt: nowIso,
    updatedAt: nowIso,
    finishedAt: null,
    error: null,
    resultBackup: null,
  };

  const runtime: BackupJobRuntimeEntry = {
    roots,
    snapshot: initialSnapshot,
    cancelRequested: false,
    promise: Promise.resolve(),
  };

  const runtimeKey = makeRuntimeKey(roots, jobId);
  getBackupRuntimeMap().set(runtimeKey, runtime);

  await persistBackupJobRecord(roots, {
    pid: process.pid,
    heartbeatAt: nowIso,
    cancelRequested: false,
    snapshot: initialSnapshot,
  });

  const syncPersist = async (patch: Partial<BackupProgressSnapshot>) => {
    const ts = new Date().toISOString();
    runtime.snapshot = {
      ...runtime.snapshot,
      ...patch,
      updatedAt: ts,
    };
    await persistBackupJobRecord(roots, {
      pid: process.pid,
      heartbeatAt: ts,
      cancelRequested: runtime.cancelRequested,
      snapshot: runtime.snapshot,
    }).catch(() => {});
  };

  const checkCancelRequested = async (): Promise<boolean> => {
    if (runtime.cancelRequested) return true;
    const persisted = await readPersistedBackupJobRecord(roots);
    if (persisted?.snapshot.jobId === jobId && persisted.cancelRequested) {
      runtime.cancelRequested = true;
      return true;
    }
    return false;
  };

  const workerPromise = (async () => {
    try {
      const created = await createFullBackupArchive({
        db,
        roots,
        backupType: "MANUAL",
        includeUnusedSiteMedia,
        shouldCancel: checkCancelRequested,
        _testStageHook: _testStageHook
          ? async (stageKey) => _testStageHook(stageKey, { ...runtime.snapshot })
          : undefined,
        onBeforeAtomicCommit: async () => {
          // Aviso final: se cancelado exatamente antes de entrar na Fase 6, aborta antes do commit atômico
          if (await checkCancelRequested()) {
            throw new Error("BACKUP_CANCELADO_PELO_USUARIO");
          }
          await syncPersist({
            stageKey: "FINALIZING",
            stageIndex: 6,
            stageLabel: BACKUP_STAGES[5].label,
            cancellable: false,
          });
        },
        onProgress: async (patch) => {
          await syncPersist({
            ...patch,
            status: runtime.cancelRequested ? "CANCELLING" : "RUNNING",
          });
        },
      });

      await db.auditLog
        .create({
          data: {
            userId: adminUserId,
            userRole: "ADMIN",
            action: "BACKUP_GENERATED",
            resource: "BackupJob",
            resourceId: created.backupJob.id,
            details: JSON.stringify({
              filename: created.backupJob.filename,
              sizeBytes: created.realSizeBytes,
              checksumSha256: created.backupJob.checksumSha256,
              fileCount: created.manifest.fileCount,
              format: created.manifest.format,
            }),
            ipAddress,
          },
        })
        .catch(() => {});

      await syncPersist({
        status: "COMPLETED",
        stageKey: "FINALIZING",
        stageIndex: 6,
        stageLabel: BACKUP_STAGES[5].label,
        detailText: "Backup concluído e verificado com sucesso!",
        percent: 100,
        cancellable: false,
        finishedAt: new Date().toISOString(),
        resultBackup: {
          id: created.backupJob.id,
          filename: created.backupJob.filename,
          sizeBytes: created.realSizeBytes,
          status: created.backupJob.status,
          checksumSha256: created.backupJob.checksumSha256,
          fileCount: created.manifest.fileCount,
        },
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "BACKUP_CANCELADO_PELO_USUARIO") {
        // Garante remoção residual de qualquer .tmp_ pertencente a este job
        const entries = await fs.readdir(roots.backupDir).catch(() => []);
        for (const name of entries) {
          if (name.startsWith(".tmp_")) {
            await fs.rm(path.join(roots.backupDir, name), { recursive: true, force: true }).catch(() => {});
          }
        }

        await db.auditLog
          .create({
            data: {
              userId: adminUserId,
              userRole: "ADMIN",
              action: "BACKUP_CANCELLED",
              resource: "BackupJob",
              resourceId: jobId,
              details: JSON.stringify({
                stageKey: runtime.snapshot.stageKey,
                stageLabel: runtime.snapshot.stageLabel,
              }),
              ipAddress,
            },
          })
          .catch(() => {});

        await syncPersist({
          status: "CANCELLED",
          detailText: "Geração de backup cancelada com segurança.",
          cancellable: false,
          finishedAt: new Date().toISOString(),
          error: null,
        });
      } else {
        const msg =
          err instanceof Error && err.message === "LIMPEZA_MIDIA_EM_ANDAMENTO"
            ? "Uma limpeza de mídias está em execução. Aguarde alguns instantes e tente novamente."
            : err instanceof Error
            ? err.message
            : "Erro inesperado ao gerar cópia de segurança.";

        await syncPersist({
          status: "FAILED",
          cancellable: false,
          finishedAt: new Date().toISOString(),
          error: msg,
        });
      }
    } finally {
      // Mantém entrada em memória brevemente para consultas imediatas pós-término e limpa depois
      setTimeout(() => {
        const entry = getBackupRuntimeMap().get(runtimeKey);
        if (entry === runtime) {
          getBackupRuntimeMap().delete(runtimeKey);
        }
      }, 60_000).unref?.();
    }
  })();

  runtime.promise = workerPromise;
  return { ...initialSnapshot };
}

export async function requestBackupCancellation({
  roots = getDefaultStorageRoots(),
  jobId,
}: {
  roots?: BackupStorageRoots;
  jobId?: string | null;
} = {}): Promise<{
  cancelled: boolean;
  nonCancellableStage?: boolean;
  notActive?: boolean;
  message: string;
  snapshot: BackupProgressSnapshot | null;
}> {
  const current = await getTrackedBackupJobStatus(roots, jobId);
  if (!current) {
    return {
      cancelled: false,
      notActive: true,
      message: "Nenhum processo ativo de backup foi encontrado no momento.",
      snapshot: null,
    };
  }

  if (current.status === "COMPLETED") {
    return {
      cancelled: false,
      message: "O backup já foi concluído antes do cancelamento.",
      snapshot: current,
    };
  }

  if (current.status === "CANCELLED") {
    return {
      cancelled: true,
      message: "Backup cancelado com segurança.",
      snapshot: current,
    };
  }

  if (!current.cancellable || current.stageKey === "FINALIZING") {
    return {
      cancelled: false,
      nonCancellableStage: true,
      message:
        "O backup já entrou na etapa final de gravação atômica e não pode ser interrompido com segurança. Aguarde a conclusão.",
      snapshot: current,
    };
  }

  const runtimeKey = makeRuntimeKey(roots, current.jobId);
  const runtime = getBackupRuntimeMap().get(runtimeKey);

  if (runtime) {
    runtime.cancelRequested = true;
    runtime.snapshot = {
      ...runtime.snapshot,
      status: "CANCELLING",
      detailText: "Cancelando backup com segurança e removendo temporários...",
      updatedAt: new Date().toISOString(),
    };
    await persistBackupJobRecord(roots, {
      pid: process.pid,
      heartbeatAt: runtime.snapshot.updatedAt,
      cancelRequested: true,
      snapshot: runtime.snapshot,
    }).catch(() => {});

    // Aguarda encerramento limpo e remoção dos arquivos temporários antes de confirmar sucesso
    await Promise.race([
      runtime.promise,
      new Promise((resolve) => setTimeout(resolve, 10000)),
    ]);

    const finalSnap = (await getTrackedBackupJobStatus(roots, current.jobId)) || runtime.snapshot;
    if (finalSnap.status === "CANCELLED") {
      return {
        cancelled: true,
        message: "Backup cancelado com segurança. Os arquivos temporários foram removidos e seus dados permanecem preservados.",
        snapshot: finalSnap,
      };
    }
    if (finalSnap.status === "COMPLETED") {
      return {
        cancelled: false,
        nonCancellableStage: true,
        message: "O backup concluiu a gravação final antes de ser interrompido.",
        snapshot: finalSnap,
      };
    }
    return {
      cancelled: finalSnap.status === "FAILED",
      message:
        finalSnap.status === "FAILED"
          ? "Backup interrompido e temporários removidos."
          : "Solicitação de cancelamento registrada; finalizando limpeza segura...",
      snapshot: finalSnap,
    };
  }

  // Fallback cross-process/HMR via arquivo de controle .backup-job.json
  const persisted = await readPersistedBackupJobRecord(roots);
  if (persisted && persisted.snapshot.jobId === current.jobId) {
    await persistBackupJobRecord(roots, {
      ...persisted,
      cancelRequested: true,
      snapshot: {
        ...persisted.snapshot,
        status: "CANCELLING",
        detailText: "Cancelando backup com segurança...",
        updatedAt: new Date().toISOString(),
      },
    });
    const deadline = Date.now() + 8000;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 120));
      const next = await getTrackedBackupJobStatus(roots, current.jobId);
      if (next && (next.status === "CANCELLED" || next.status === "COMPLETED" || next.status === "FAILED")) {
        return {
          cancelled: next.status === "CANCELLED",
          nonCancellableStage: next.status === "COMPLETED",
          message:
            next.status === "CANCELLED"
              ? "Backup cancelado com segurança. Os arquivos temporários foram removidos."
              : "O backup concluiu a gravação final.",
          snapshot: next,
        };
      }
    }
  }

  return {
    cancelled: false,
    message: "Cancelamento solicitado; aguardando confirmação segura do processo.",
    snapshot: await getTrackedBackupJobStatus(roots, current.jobId),
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
  if (await isBackupJobActive(roots)) {
    throw new Error("BACKUP_EM_ANDAMENTO");
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

// ============================================================================
// UNIT E — VALIDAÇÃO SEGURA DE IMPORTAÇÃO E RESTAURAÇÃO EM 5 FASES (A - E)
// ============================================================================

const BLOCKED_ARCHIVE_EXTENSIONS = new Set([
  ".sql",
  ".sh",
  ".bash",
  ".bat",
  ".cmd",
  ".ps1",
  ".exe",
  ".dll",
  ".msi",
  ".vbs",
  ".js",
  ".mjs",
  ".cjs",
  ".ts",
  ".php",
  ".phtml",
  ".py",
  ".rb",
  ".pl",
]);

const CORE_REQUIRED_TABLES: ReadonlyArray<PersistentTableKey> = [
  "adminAccounts",
  "patients",
  "services",
  "appointments",
  "clinicalRecords",
  "systemSettings",
  "siteSettings",
];

const TABLE_DATE_FIELDS: Record<PersistentTableKey, readonly string[]> = {
  adminAccounts: ["lockedUntil", "createdAt", "updatedAt"],
  patients: ["birthDate", "createdAt", "updatedAt"],
  guardians: ["createdAt", "updatedAt"],
  patientProfileChangeRequests: ["reviewedAt", "createdAt"],
  consentAcceptances: ["acceptedAt"],
  services: ["createdAt", "updatedAt"],
  weeklyAvailability: ["createdAt", "updatedAt"],
  availabilityExceptions: ["date", "createdAt", "updatedAt"],
  appointmentPackages: ["expiresAt", "acceptedAt", "rejectedAt", "createdAt", "updatedAt"],
  appointments: ["startAt", "endAt", "cancelledAt", "noShowRecordedAt", "createdAt", "updatedAt"],
  appointmentHolds: ["startAt", "endAt", "expiresAt", "createdAt"],
  payments: ["confirmedAt", "createdAt", "updatedAt"],
  paymentAttempts: ["createdAt"],
  refunds: ["refundedAt"],
  gatewayConfigurations: ["updatedAt"],
  anamnesisTemplates: ["createdAt", "updatedAt"],
  anamnesisSubmissions: ["reviewedAt", "createdAt", "updatedAt"],
  clinicalRecords: ["sessionDate", "createdAt", "updatedAt"],
  clinicalRecordRevisions: ["revisedAt"],
  storedFiles: ["createdAt"],
  storedFileShares: ["expiresAt", "revokedAt", "sharedAt"],
  videoMeetings: ["createdAt"],
  notificationTemplates: ["updatedAt"],
  notificationDeliveries: ["sentAt", "attemptedAt", "acceptedAt", "deliveredAt", "failedAt", "createdAt", "updatedAt"],
  notifications: ["readAt", "createdAt"],
  sharedNotificationTemplates: ["updatedAt"],
  siteSettings: ["updatedAt"],
  professionalProfiles: ["updatedAt"],
  legalPages: ["publishedAt", "updatedAt"],
  systemSettings: ["googleMeetTokenExpiresAt", "googleMeetConnectedAt", "peerJsLastTestedAt", "updatedAt"],
  auditLogs: ["createdAt"],
};

export interface ValidatedUploadEntry {
  archivePath: string;
  area: "private" | "minisite" | "public-uploads";
  relativePosixPath: string;
  sizeBytes: number;
  sha256: string;
  zipEntry: AdmZip.IZipEntry;
}

export interface ArchiveCompatibilityReport {
  compatible: boolean;
  notes: string[];
  missingOptionalTables: string[];
}

export interface ValidatedBackupPackage {
  manifest: BackupManifest;
  checksums: BackupChecksumsFile;
  tables: Record<PersistentTableKey, Array<Record<string, unknown>>>;
  uploads: ValidatedUploadEntry[];
  fileCount: number;
  totalUncompressedBytes: number;
  compatibility: ArchiveCompatibilityReport;
}

export interface RestorePreviewSummary {
  backupJob: EnrichedBackupJob;
  manifest: BackupManifest;
  compatibility: ArchiveCompatibilityReport;
  environmentChecks: {
    databaseConnected: boolean;
    storageWritable: boolean;
    availableDiskBytes: number | null;
    requiredDiskBytes: number;
    hasSufficientDiskSpace: boolean;
  };
  affectedCounts: {
    patients: number;
    appointments: number;
    clinicalRecords: number;
    payments: number;
    services: number;
    storedFiles: number;
    uploadedFilesOnDisk: number;
  };
  reconfigureSecretsChecklist: string[];
}

export interface StagedRestoreResult {
  success: true;
  restoredFromBackupId: string;
  restoredFromFilename: string;
  safetySnapshot: {
    id: string;
    filename: string;
    sizeBytes: number;
  };
  verification: {
    verifiedAt: string;
    patientCount: number;
    appointmentCount: number;
    clinicalRecordCount: number;
    storedFileCount: number;
    restoredDiskFileCount: number;
    integrityChecksPassed: boolean;
  };
  reconfigureSecretsChecklist: string[];
}

export const SECRETS_RECONFIGURATION_CHECKLIST: string[] = [
  "Senha SMTP e ativação de envio de e-mail em Admin -> Integrações (se aplicável).",
  "Token e ativação da API de WhatsApp em Admin -> Integrações (se aplicável).",
  "Credenciais OAuth (Client Secret / Tokens) do Google Meet em Admin -> Configurações -> Consultas Virtuais.",
  "Segredo TURN do PeerJS (se utilizar servidor TURN dedicado).",
  "Credenciais criptografadas de gateway de pagamento (quando configuradas em produção).",
  "Variáveis de ambiente do servidor (.env): DATABASE_URL, JWT_SECRET e TECHNICAL_STATUS_BEARER_TOKEN.",
];

function isValidZipMagic(headerBytes: Buffer): boolean {
  if (headerBytes.length < 4) return false;
  return (
    headerBytes[0] === 0x50 &&
    headerBytes[1] === 0x4b &&
    ((headerBytes[2] === 0x03 && headerBytes[3] === 0x04) ||
      (headerBytes[2] === 0x05 && headerBytes[3] === 0x06))
  );
}

function validateSafeArchiveEntryPath(rawEntryName: string): string {
  if (!rawEntryName || typeof rawEntryName !== "string") {
    throw new Error("Entrada de arquivo vazia no pacote de backup.");
  }
  if (rawEntryName.includes("\0") || rawEntryName.includes("\\")) {
    throw new Error(`Caminho inseguro detectado no arquivo ZIP: ${rawEntryName}`);
  }
  if (rawEntryName.startsWith("/") || /^[a-zA-Z]:/.test(rawEntryName)) {
    throw new Error(`Caminho absoluto não permitido no arquivo ZIP: ${rawEntryName}`);
  }
  const rawParts = rawEntryName.split("/");
  if (rawParts.some((seg) => seg === ".." || seg === ".")) {
    throw new Error(`Tentativa de path traversal detectada no backup: ${rawEntryName}`);
  }
  const clean = path.posix.normalize(rawEntryName);
  const parts = clean.split("/");
  if (parts.some((seg) => seg === ".." || seg === ".")) {
    throw new Error(`Tentativa de path traversal detectada no backup: ${rawEntryName}`);
  }
  if (!clean.startsWith("psi-backup/") && clean !== "psi-backup") {
    throw new Error(
      `Estrutura de backup inválida: o arquivo '${rawEntryName}' está fora da raiz obrigatória 'psi-backup/'.`
    );
  }
  return clean;
}

function resolveContainedPath(baseDir: string, relativePosixPath: string): string {
  const resolvedBase = path.resolve(baseDir);
  const cleanRel = relativePosixPath.replace(/\\/g, "/");
  if (!cleanRel || cleanRel.startsWith("/") || /^[a-zA-Z]:/.test(cleanRel) || cleanRel.includes("\0")) {
    throw new Error(`Caminho relativo inválido durante extração: ${relativePosixPath}`);
  }
  const segments = cleanRel.split("/").filter(Boolean);
  if (segments.length === 0 || segments.some((s) => s === "." || s === "..")) {
    throw new Error(`Segmento de diretório não permitido durante extração: ${relativePosixPath}`);
  }
  const dest = path.resolve(resolvedBase, ...segments);
  const relBack = path.relative(resolvedBase, dest);
  if (!relBack || relBack.startsWith("..") || path.isAbsolute(relBack)) {
    throw new Error(`Bloqueio de segurança: tentativa de escapar de '${resolvedBase}'.`);
  }
  return dest;
}

function parseSemverTuple(version: string | undefined | null): [number, number, number] {
  if (!version || typeof version !== "string") return [0, 0, 0];
  const m = version.trim().match(/^v?(\d+)\.(\d+)\.(\d+)/);
  if (!m) return [0, 0, 0];
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function parseRowWithDates(
  tableKey: PersistentTableKey,
  row: Record<string, unknown>
): Record<string, unknown> {
  const dateFields = TABLE_DATE_FIELDS[tableKey];
  if (!dateFields || dateFields.length === 0) return { ...row };
  const normalized: Record<string, unknown> = { ...row };
  for (const field of dateFields) {
    const rawVal = normalized[field];
    if (typeof rawVal === "string" && rawVal.length > 0) {
      const parsed = new Date(rawVal);
      if (Number.isNaN(parsed.getTime())) {
        throw new Error(`Data inválida em '${tableKey}.${field}': ${rawVal}`);
      }
      normalized[field] = parsed;
    }
  }
  return normalized;
}

export async function validateAndInspectBackupArchive(
  source: string | Buffer,
  db: PrismaClient = defaultPrisma
): Promise<ValidatedBackupPackage> {
  let zipBufferHeader: Buffer;
  let archiveFileSize = 0;

  if (typeof source === "string") {
    const st = await fs.stat(source);
    if (!st.isFile()) {
      throw new Error("Arquivo de backup não encontrado.");
    }
    archiveFileSize = st.size;
    if (archiveFileSize === 0) {
      throw new Error("O arquivo enviado está vazio.");
    }
    if (archiveFileSize > MAX_BACKUP_IMPORT_BYTES) {
      throw new Error("O arquivo de backup excede o limite máximo permitido de 512 MB.");
    }
    const fh = await fs.open(source, "r");
    try {
      const head = Buffer.alloc(Math.min(256, st.size));
      await fh.read(head, 0, head.length, 0);
      zipBufferHeader = head;
    } finally {
      await fh.close();
    }
  } else {
    archiveFileSize = source.length;
    if (archiveFileSize === 0) {
      throw new Error("O arquivo enviado está vazio.");
    }
    if (archiveFileSize > MAX_BACKUP_IMPORT_BYTES) {
      throw new Error("O arquivo de backup excede o limite máximo permitido de 512 MB.");
    }
    zipBufferHeader = source.subarray(0, Math.min(256, source.length));
  }

  // Rejeita manifestos JSON puros enviados como backup completo
  const trimmedHead = zipBufferHeader.toString("utf8").trimStart();
  if (trimmedHead.startsWith("{") || trimmedHead.startsWith("[")) {
    throw new Error(
      "Arquivos .json isolados (manifestos legados) não permitem restauração completa. Envie um arquivo .zip completo gerado pelo PSI."
    );
  }
  if (!isValidZipMagic(zipBufferHeader)) {
    throw new Error("Formato de arquivo inválido. O backup precisa ser um arquivo .zip válido do PSI.");
  }

  let zip: AdmZip;
  try {
    zip = new AdmZip(source);
  } catch {
    throw new Error("Não foi possível abrir o arquivo .zip: o arquivo está corrompido ou truncado.");
  }

  const allEntries = zip.getEntries();
  if (!allEntries || allEntries.length === 0) {
    throw new Error("O pacote .zip de backup está vazio.");
  }
  if (allEntries.length > MAX_ARCHIVE_ENTRIES) {
    throw new Error(
      `O arquivo excede o limite de segurança de ${MAX_ARCHIVE_ENTRIES} itens (proteção contra ZIP bomb).`
    );
  }

  let declaredUncompressedTotal = 0;
  let actualUncompressedTotal = 0;
  const entryMap = new Map<string, { entry: AdmZip.IZipEntry; data: Buffer; sha256: string }>();

  for (const entry of allEntries) {
    const cleanPath = validateSafeArchiveEntryPath(entry.entryName);

    // Bloqueia links simbólicos (Unix mode S_IFLNK = 0o120000 no atributo superior)
    const externalAttr = Number(entry.header?.attr || 0);
    const unixMode = (externalAttr >>> 16) & 0o170000;
    if (unixMode === 0o120000) {
      throw new Error(`Links simbólicos não são permitidos no pacote de backup: ${cleanPath}`);
    }

    if (entry.isDirectory) {
      continue;
    }
    if (cleanPath === "psi-backup") {
      throw new Error("Entrada de arquivo inválida na raiz 'psi-backup'.");
    }

    const ext = path.posix.extname(cleanPath).toLowerCase();
    // Arquivos legítimos de database/*.json usam .json; fora disso nunca aceitar scripts/SQL/executáveis
    if (BLOCKED_ARCHIVE_EXTENSIONS.has(ext)) {
      throw new Error(
        `Tipo de arquivo não permitido por segurança no backup (${ext}): ${cleanPath}`
      );
    }

    const headerSize = Number(entry.header?.size || 0);
    const compressedSize = Number(entry.header?.compressedSize || 0);
    if (headerSize < 0 || headerSize > MAX_SINGLE_ENTRY_BYTES) {
      throw new Error(
        `O item '${cleanPath}' excede o limite máximo por arquivo de 200 MB (proteção contra ZIP bomb).`
      );
    }
    declaredUncompressedTotal += headerSize;
    if (declaredUncompressedTotal > MAX_EXTRACTED_ARCHIVE_BYTES) {
      throw new Error(
        "O tamanho descompactado declarado excede o limite de segurança de 1 GB (proteção contra ZIP bomb)."
      );
    }

    let data: Buffer;
    try {
      data = entry.getData();
    } catch {
      throw new Error(`Falha ao ler ou descompactar o item '${cleanPath}'. O backup pode estar corrompido.`);
    }

    if (data.length > MAX_SINGLE_ENTRY_BYTES) {
      throw new Error(
        `Conteúdo descompactado de '${cleanPath}' excede 200 MB (proteção contra ZIP bomb).`
      );
    }
    if (data.length > 10 * 1024 * 1024 && compressedSize > 0 && data.length / compressedSize > 200) {
      throw new Error(
        `Taxa de compressão anômala detectada em '${cleanPath}' (proteção contra ZIP bomb).`
      );
    }

    actualUncompressedTotal += data.length;
    if (actualUncompressedTotal > MAX_EXTRACTED_ARCHIVE_BYTES) {
      throw new Error(
        "O volume total descompactado excede o limite de segurança de 1 GB (proteção contra ZIP bomb)."
      );
    }

    // Validação estrita da hierarquia permitida
    const isManifest = cleanPath === "psi-backup/manifest.json";
    const isChecksums = cleanPath === "psi-backup/checksums.json";
    const isDbJson = cleanPath.startsWith("psi-backup/database/") && cleanPath.endsWith(".json");
    const isUploadPrivate = cleanPath.startsWith("psi-backup/uploads/private/");
    const isUploadMinisite = cleanPath.startsWith("psi-backup/uploads/minisite/");
    const isUploadPublic = cleanPath.startsWith("psi-backup/uploads/public-uploads/");

    if (
      !isManifest &&
      !isChecksums &&
      !isDbJson &&
      !isUploadPrivate &&
      !isUploadMinisite &&
      !isUploadPublic
    ) {
      throw new Error(
        `Arquivo inesperado fora da estrutura oficial de backup do PSI: ${cleanPath}`
      );
    }

    if (entryMap.has(cleanPath)) {
      throw new Error(`Entrada duplicada detectada no backup: ${cleanPath}`);
    }

    entryMap.set(cleanPath, {
      entry,
      data,
      sha256: sha256Buffer(data),
    });
  }

  const manifestEntry = entryMap.get("psi-backup/manifest.json");
  const checksumsEntry = entryMap.get("psi-backup/checksums.json");

  if (!manifestEntry) {
    throw new Error("Backup inválido: o arquivo obrigatório 'psi-backup/manifest.json' está ausente.");
  }
  if (!checksumsEntry) {
    throw new Error("Backup inválido: o arquivo obrigatório 'psi-backup/checksums.json' está ausente.");
  }

  let manifest: BackupManifest;
  try {
    manifest = JSON.parse(manifestEntry.data.toString("utf8")) as BackupManifest;
  } catch {
    throw new Error("O arquivo 'psi-backup/manifest.json' está corrompido ou malformado.");
  }

  if (!manifest || manifest.format !== BACKUP_FORMAT_ID) {
    throw new Error(
      "Formato de backup não suportado. Apenas backups completos no formato 'psi-backup-v1' podem ser importados ou restaurados."
    );
  }
  if (
    !manifest.formatVersion ||
    !(SUPPORTED_BACKUP_FORMAT_VERSIONS as readonly string[]).includes(manifest.formatVersion)
  ) {
    throw new Error(
      `Versão do formato de backup incompatível (${manifest.formatVersion || "desconhecida"}).`
    );
  }

  const [archiveMajor] = parseSemverTuple(manifest.appVersion);
  const [currentMajor] = parseSemverTuple(APP_VERSION);
  if (archiveMajor > currentMajor && currentMajor > 0) {
    throw new Error(
      `Este backup foi gerado em uma versão principal mais recente do PSI (${manifest.appVersion}) e é incompatível com a versão atual (${APP_VERSION}).`
    );
  }

  let checksums: BackupChecksumsFile;
  try {
    checksums = JSON.parse(checksumsEntry.data.toString("utf8")) as BackupChecksumsFile;
  } catch {
    throw new Error("O arquivo 'psi-backup/checksums.json' está corrompido ou malformado.");
  }

  if (
    !checksums ||
    checksums.algorithm !== "SHA-256" ||
    !checksums.entries ||
    typeof checksums.entries !== "object"
  ) {
    throw new Error("O índice de verificação 'checksums.json' está incompleto ou inválido.");
  }

  // Verifica reciprocamente todas as entradas do ZIP e todas as declarações do checksums.json
  for (const [entryPath, item] of entryMap.entries()) {
    if (entryPath === "psi-backup/checksums.json") continue;
    const expected = checksums.entries[entryPath];
    if (!expected || !expected.sha256) {
      throw new Error(
        `Falha de integridade: o item '${entryPath}' não possui checksum registrado em 'checksums.json'.`
      );
    }
    if (expected.sha256 !== item.sha256 || Number(expected.sizeBytes) !== item.data.length) {
      throw new Error(
        `Falha de integridade SHA-256 detectada em '${entryPath}'. O backup está corrompido ou foi adulterado.`
      );
    }
  }

  for (const expectedPath of Object.keys(checksums.entries)) {
    if (!entryMap.has(expectedPath)) {
      throw new Error(
        `Backup incompleto: o arquivo '${expectedPath}' listado no manifesto de integridade está ausente do pacote.`
      );
    }
  }

  // Verifica compatibilidade de migração conhecida sem executar SQL do arquivo
  const compatibilityNotes: string[] = [];
  const currentMeta = await computeSchemaMetadata(db);
  if (
    manifest.migrationVersion &&
    currentMeta.migrationVersion &&
    manifest.migrationVersion !== currentMeta.migrationVersion
  ) {
    if (manifest.migrationVersion > currentMeta.migrationVersion) {
      throw new Error(
        `Backup incompatível: a migração do banco registrada no backup (${manifest.migrationVersion}) é mais recente que a do sistema atual (${currentMeta.migrationVersion}). Atualize a aplicação PSI antes de restaurar.`
      );
    }
    compatibilityNotes.push(
      `Backup originado da migração anterior '${manifest.migrationVersion}'; os dados serão ajustados de forma segura ao esquema atual (${currentMeta.migrationVersion}).`
    );
  }

  // Valida todas as entradas database/*.json contra os modelos conhecidos
  const validTableKeySet = new Set<string>(PERSISTENT_BACKUP_TABLES);
  for (const entryPath of entryMap.keys()) {
    if (!entryPath.startsWith("psi-backup/database/")) continue;
    const baseName = path.posix.basename(entryPath, ".json");
    if (!validTableKeySet.has(baseName) || entryPath !== `psi-backup/database/${baseName}.json`) {
      throw new Error(`Tabela desconhecida ou não suportada no backup: ${entryPath}`);
    }
  }

  const parsedTables = {} as Record<PersistentTableKey, Array<Record<string, unknown>>>;
  const missingOptionalTables: string[] = [];

  for (const tableKey of PERSISTENT_BACKUP_TABLES) {
    const dbEntry = entryMap.get(`psi-backup/database/${tableKey}.json`);
    if (!dbEntry) {
      if (CORE_REQUIRED_TABLES.includes(tableKey)) {
        throw new Error(
          `Backup incompatível ou incompleto: a tabela obrigatória '${tableKey}' está ausente.`
        );
      }
      missingOptionalTables.push(tableKey);
      parsedTables[tableKey] = [];
      continue;
    }

    let rawParsed: unknown;
    try {
      rawParsed = JSON.parse(dbEntry.data.toString("utf8"));
    } catch {
      throw new Error(`Dados corrompidos na tabela '${tableKey}.json'.`);
    }
    if (!Array.isArray(rawParsed)) {
      throw new Error(`Formato inválido na tabela '${tableKey}.json' (esperada lista de registros).`);
    }
    parsedTables[tableKey] = rawParsed.map((row) => {
      if (!row || typeof row !== "object" || Array.isArray(row)) {
        throw new Error(`Registro inválido encontrado na tabela '${tableKey}.json'.`);
      }
      return parseRowWithDates(tableKey, row as Record<string, unknown>);
    });
  }

  if (missingOptionalTables.length > 0) {
    compatibilityNotes.push(
      `Tabelas opcionais adicionadas em versões recentes foram inicializadas vazias: ${missingOptionalTables.join(", ")}.`
    );
  }

  // Coleta as entradas de upload validadas
  const uploads: ValidatedUploadEntry[] = [];
  for (const [entryPath, item] of entryMap.entries()) {
    if (!entryPath.startsWith("psi-backup/uploads/")) continue;
    let area: ValidatedUploadEntry["area"] | null = null;
    let relativePosixPath = "";
    if (entryPath.startsWith("psi-backup/uploads/private/")) {
      area = "private";
      relativePosixPath = entryPath.slice("psi-backup/uploads/private/".length);
    } else if (entryPath.startsWith("psi-backup/uploads/minisite/")) {
      area = "minisite";
      relativePosixPath = entryPath.slice("psi-backup/uploads/minisite/".length);
    } else if (entryPath.startsWith("psi-backup/uploads/public-uploads/")) {
      area = "public-uploads";
      relativePosixPath = entryPath.slice("psi-backup/uploads/public-uploads/".length);
    }
    if (!area || !relativePosixPath) {
      throw new Error(`Caminho de arquivo enviado inválido no backup: ${entryPath}`);
    }
    // Verifica contenção lógica do caminho relativo antes mesmo de restaurar
    resolveContainedPath("/virtual-stage", relativePosixPath);
    uploads.push({
      archivePath: entryPath,
      area,
      relativePosixPath,
      sizeBytes: item.data.length,
      sha256: item.sha256,
      zipEntry: item.entry,
    });
  }

  return {
    manifest,
    checksums,
    tables: parsedTables,
    uploads,
    fileCount: uploads.length,
    totalUncompressedBytes: actualUncompressedTotal,
    compatibility: {
      compatible: true,
      notes: compatibilityNotes,
      missingOptionalTables,
    },
  };
}

export async function prepareRestorePreview({
  backupId,
  db = defaultPrisma,
  roots = getDefaultStorageRoots(),
}: {
  backupId: string;
  db?: PrismaClient;
  roots?: BackupStorageRoots;
}): Promise<{
  preview: RestorePreviewSummary;
  validated: ValidatedBackupPackage;
  archivePath: string;
}> {
  const job = await db.backupJob.findUnique({ where: { id: backupId } });
  if (!job) {
    throw new Error("BACKUP_NAO_ENCONTRADO");
  }

  const enriched = await classifyBackupJob(job, roots);
  if (enriched.isLegacy) {
    throw new Error("BACKUP_LEGADO_NAO_RESTAURAVEL");
  }
  if (!enriched.fileExists) {
    throw new Error("ARQUIVO_BACKUP_AUSENTE");
  }
  if (!enriched.restorable) {
    throw new Error(enriched.restorableReason || "BACKUP_NAO_RESTAURAVEL");
  }

  const archivePath = resolveSafeBackupFilePath(roots.backupDir, job.filename);
  const actualArchiveHash = await sha256File(archivePath);
  if (job.checksumSha256 && actualArchiveHash !== job.checksumSha256) {
    throw new Error(
      "O checksum SHA-256 do arquivo de backup no disco não confere com o registro salvo. Restauração bloqueada por segurança."
    );
  }

  // Checagem de conectividade do banco
  let databaseConnected = false;
  try {
    await db.$queryRawUnsafe("SELECT 1");
    databaseConnected = true;
  } catch {
    throw new Error("Não foi possível conectar ao banco de dados para iniciar a restauração.");
  }

  // Checagem e preparação dos diretórios necessários
  let storageWritable = false;
  try {
    for (const dir of [
      roots.backupDir,
      roots.privateUploadsDir,
      roots.minisiteDir,
      roots.publicUploadsDir,
    ]) {
      await fs.mkdir(dir, { recursive: true });
      await fs.access(dir, fsSync.constants.R_OK | fsSync.constants.W_OK);
    }
    storageWritable = true;
  } catch {
    throw new Error("Permissão insuficiente nos diretórios de armazenamento exigidos para restauração.");
  }

  const validated = await validateAndInspectBackupArchive(archivePath, db);
  const requiredDiskBytes = Math.max(
    validated.totalUncompressedBytes * 2 + 20 * 1024 * 1024,
    25 * 1024 * 1024
  );

  let availableDiskBytes: number | null = null;
  let hasSufficientDiskSpace = true;
  try {
    const statFs = await fs.statfs(roots.backupDir);
    availableDiskBytes = Number(BigInt(statFs.bavail) * BigInt(statFs.bsize));
    if (Number.isFinite(availableDiskBytes) && availableDiskBytes < requiredDiskBytes) {
      hasSufficientDiskSpace = false;
      throw new Error(
        `Espaço em disco insuficiente para realizar snapshot de segurança e restauração (disponível: ${Math.round(
          availableDiskBytes / (1024 * 1024)
        )} MB).`
      );
    }
  } catch (diskErr: unknown) {
    if (
      diskErr instanceof Error &&
      diskErr.message.includes("Espaço em disco insuficiente")
    ) {
      throw diskErr;
    }
    availableDiskBytes = null;
  }

  return {
    archivePath,
    validated,
    preview: {
      backupJob: enriched,
      manifest: validated.manifest,
      compatibility: validated.compatibility,
      environmentChecks: {
        databaseConnected,
        storageWritable,
        availableDiskBytes,
        requiredDiskBytes,
        hasSufficientDiskSpace,
      },
      affectedCounts: {
        patients: validated.tables.patients.length,
        appointments: validated.tables.appointments.length,
        clinicalRecords: validated.tables.clinicalRecords.length,
        payments: validated.tables.payments.length,
        services: validated.tables.services.length,
        storedFiles: validated.tables.storedFiles.length,
        uploadedFilesOnDisk: validated.uploads.length,
      },
      reconfigureSecretsChecklist: [...SECRETS_RECONFIGURATION_CHECKLIST],
    },
  };
}

export async function importBackupArchive({
  db = defaultPrisma,
  roots = getDefaultStorageRoots(),
  fileBuffer,
  originalFilename,
  adminUserId,
  ipAddress = "127.0.0.1",
}: {
  db?: PrismaClient;
  roots?: BackupStorageRoots;
  fileBuffer: Buffer;
  originalFilename: string;
  adminUserId: string;
  ipAddress?: string;
}): Promise<{
  backup: EnrichedBackupJob;
  preview: RestorePreviewSummary;
}> {
  if (await isRestoreInProgress(roots)) {
    throw new Error("RESTAURACAO_EM_ANDAMENTO");
  }
  if (await isBackupJobActive(roots)) {
    throw new Error("BACKUP_EM_ANDAMENTO");
  }

  if (!fileBuffer || fileBuffer.length === 0) {
    throw new Error("O arquivo enviado está vazio.");
  }
  if (fileBuffer.length > MAX_BACKUP_IMPORT_BYTES) {
    throw new Error("O arquivo excede o tamanho máximo permitido de 512 MB.");
  }

  const lowerName = (originalFilename || "").toLowerCase();
  if (lowerName.endsWith(".json")) {
    throw new Error(
      "Arquivos .json isolados (manifestos legados) não podem ser importados para restauração completa. Envie um arquivo .zip completo do PSI."
    );
  }
  if (!lowerName.endsWith(".zip")) {
    throw new Error("Extensão de arquivo não permitida. Selecione um arquivo de backup .zip válido do PSI.");
  }

  await fs.mkdir(roots.backupDir, { recursive: true });
  const tempPath = path.join(
    roots.backupDir,
    `.tmp_import_${Date.now()}_${crypto.randomBytes(6).toString("hex")}.zip`
  );

  let registeredBackupId: string | null = null;
  try {
    await fs.writeFile(tempPath, fileBuffer);
    const validated = await validateAndInspectBackupArchive(tempPath, db);
    const archiveChecksumSha256 = await sha256File(tempPath);
    const stat = await fs.stat(tempPath);

    const stamp = new Date().toISOString().replace(/[:.]/g, "-").replace("T", "_").slice(0, 19);
    const finalFilename = `psi_imported_${stamp}_${archiveChecksumSha256.slice(0, 8)}.zip`;
    const finalPath = resolveSafeBackupFilePath(roots.backupDir, finalFilename);
    await fs.rename(tempPath, finalPath);

    const detailsPayload: BackupJobMetadataSummary = {
      format: BACKUP_FORMAT_ID,
      formatVersion: validated.manifest.formatVersion,
      appVersion: validated.manifest.appVersion,
      migrationVersion: validated.manifest.migrationVersion,
      schemaDigest: validated.manifest.schemaDigest,
      installationId: validated.manifest.installationId,
      backupType: "IMPORTED",
      origin: "IMPORTED",
      isLegacy: false,
      categories: validated.manifest.categories,
      tableCounts: validated.manifest.tableCounts,
      fileCount: validated.fileCount,
      realSizeBytes: stat.size,
      patientCount: validated.tables.patients.length,
      appointmentCount: validated.tables.appointments.length,
      recordCount: validated.tables.clinicalRecords.length,
    };

    const createdJob = await db.backupJob.create({
      data: {
        filename: finalFilename,
        sizeBytes: Math.min(stat.size, 2_147_483_647),
        checksumSha256: archiveChecksumSha256,
        status: "COMPLETED",
        details: JSON.stringify(detailsPayload),
      },
    });
    registeredBackupId = createdJob.id;

    await db.auditLog.create({
      data: {
        userId: adminUserId,
        userRole: "ADMIN",
        action: "BACKUP_IMPORTED",
        resource: "BackupJob",
        resourceId: createdJob.id,
        details: JSON.stringify({
          filename: finalFilename,
          originalFilename: path.basename(originalFilename),
          sizeBytes: stat.size,
          checksumSha256: archiveChecksumSha256,
          fileCount: validated.fileCount,
        }),
        ipAddress,
      },
    });

    const prepared = await prepareRestorePreview({
      backupId: createdJob.id,
      db,
      roots,
    });

    return {
      backup: prepared.preview.backupJob,
      preview: prepared.preview,
    };
  } catch (err) {
    await fs.unlink(tempPath).catch(() => {});
    if (registeredBackupId) {
      await db.backupJob.delete({ where: { id: registeredBackupId } }).catch(() => {});
    }
    throw err;
  }
}

function chunkRows<T>(rows: T[], size = 500): T[][] {
  if (rows.length === 0) return [];
  const chunks: T[][] = [];
  for (let i = 0; i < rows.length; i += size) {
    chunks.push(rows.slice(i, i + size));
  }
  return chunks;
}

async function moveDirectorySafely(srcDir: string, destDir: string): Promise<void> {
  await fs.mkdir(path.dirname(destDir), { recursive: true });
  try {
    await fs.rename(srcDir, destDir);
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === "EXDEV" || code === "EPERM") {
      await fs.cp(srcDir, destDir, { recursive: true, force: true });
      await fs.rm(srcDir, { recursive: true, force: true });
    } else {
      throw err;
    }
  }
}

async function applyValidatedDatabaseSnapshot(
  db: PrismaClient,
  tables: ValidatedBackupPackage["tables"]
): Promise<void> {
  await db.$transaction(
    async (tx) => {
      // 1. Limpeza em ordem topológica estrita (filhos -> pais), mantendo FKs sempre ativas
      await tx.patientEmailChangeToken.deleteMany();
      await tx.session.deleteMany();
      await tx.videoMeeting.deleteMany();
      await tx.storedFileShare.deleteMany();
      await tx.storedFile.deleteMany();
      await tx.clinicalRecordRevision.deleteMany();
      await tx.clinicalRecord.deleteMany();
      await tx.refund.deleteMany();
      await tx.paymentAttempt.deleteMany();
      await tx.payment.deleteMany();
      await tx.appointmentHold.deleteMany();
      await tx.appointment.deleteMany();
      await tx.appointmentPackage.deleteMany();
      await tx.anamnesisSubmission.deleteMany();
      await tx.anamnesisTemplate.deleteMany();
      await tx.patientProfileChangeRequest.deleteMany();
      await tx.consentAcceptance.deleteMany();
      await tx.guardian.deleteMany();
      await tx.patient.deleteMany();
      await tx.service.deleteMany();
      await tx.weeklyAvailability.deleteMany();
      await tx.availabilityException.deleteMany();
      await tx.gatewayConfiguration.deleteMany();
      await tx.notificationDelivery.deleteMany();
      await tx.notification.deleteMany();
      await tx.notificationTemplate.deleteMany();
      await tx.sharedNotificationTemplate.deleteMany();
      await tx.siteSettings.deleteMany();
      await tx.professionalProfile.deleteMany();
      await tx.legalPage.deleteMany();
      await tx.systemSettings.deleteMany();
      await tx.auditLog.deleteMany();
      await tx.adminAccount.deleteMany();

      // 2. Reinserção em ordem topológica estrita (pais -> filhos)
      const insertChunks = async (
        tableKey: PersistentTableKey,
        inserter: (batch: Array<Record<string, unknown>>) => Promise<unknown>,
        transform?: (row: Record<string, unknown>) => Record<string, unknown>
      ) => {
        const rawRows = tables[tableKey];
        if (!rawRows || rawRows.length === 0) return;
        const rows = transform ? rawRows.map(transform) : rawRows;
        for (const batch of chunkRows(rows, 500)) {
          await inserter(batch);
        }
      };

      await insertChunks("adminAccounts", (b) => tx.adminAccount.createMany({ data: b as never[] }));
      await insertChunks(
        "systemSettings",
        (b) => tx.systemSettings.createMany({ data: b as never[] }),
        (r) => ({
          ...r,
          // Garante consistência quando segredos sensíveis foram omitidos do pacote portátil
          smtpEnabled: r.smtpPass ? Boolean(r.smtpEnabled) : false,
          whatsappEnabled: r.whatsappApiToken ? Boolean(r.whatsappEnabled) : false,
          googleMeetStatus: r.googleMeetRefreshToken ? r.googleMeetStatus : null,
        })
      );
      await insertChunks("professionalProfiles", (b) =>
        tx.professionalProfile.createMany({ data: b as never[] })
      );
      await insertChunks("siteSettings", (b) => tx.siteSettings.createMany({ data: b as never[] }));
      await insertChunks("legalPages", (b) => tx.legalPage.createMany({ data: b as never[] }));
      await insertChunks("sharedNotificationTemplates", (b) =>
        tx.sharedNotificationTemplate.createMany({ data: b as never[] })
      );
      await insertChunks("notificationTemplates", (b) =>
        tx.notificationTemplate.createMany({ data: b as never[] })
      );
      await insertChunks(
        "gatewayConfigurations",
        (b) => tx.gatewayConfiguration.createMany({ data: b as never[] }),
        (r) => ({
          ...r,
          isEnabled: r.configDataEncrypted ? Boolean(r.isEnabled) : false,
        })
      );
      await insertChunks("services", (b) => tx.service.createMany({ data: b as never[] }));
      await insertChunks("weeklyAvailability", (b) =>
        tx.weeklyAvailability.createMany({ data: b as never[] })
      );
      await insertChunks("availabilityExceptions", (b) =>
        tx.availabilityException.createMany({ data: b as never[] })
      );
      await insertChunks("anamnesisTemplates", (b) =>
        tx.anamnesisTemplate.createMany({ data: b as never[] })
      );
      await insertChunks(
        "patients",
        (b) => tx.patient.createMany({ data: b as never[] }),
        (r) => ({ ...r, tempPassword: null })
      );
      await insertChunks("guardians", (b) => tx.guardian.createMany({ data: b as never[] }));
      await insertChunks("consentAcceptances", (b) =>
        tx.consentAcceptance.createMany({ data: b as never[] })
      );
      await insertChunks("patientProfileChangeRequests", (b) =>
        tx.patientProfileChangeRequest.createMany({ data: b as never[] })
      );
      await insertChunks("anamnesisSubmissions", (b) =>
        tx.anamnesisSubmission.createMany({ data: b as never[] })
      );
      await insertChunks("appointmentPackages", (b) =>
        tx.appointmentPackage.createMany({ data: b as never[] })
      );
      await insertChunks("appointments", (b) => tx.appointment.createMany({ data: b as never[] }));
      await insertChunks("appointmentHolds", (b) =>
        tx.appointmentHold.createMany({ data: b as never[] })
      );
      await insertChunks("videoMeetings", (b) =>
        tx.videoMeeting.createMany({ data: b as never[] })
      );
      await insertChunks("payments", (b) => tx.payment.createMany({ data: b as never[] }));
      await insertChunks("paymentAttempts", (b) =>
        tx.paymentAttempt.createMany({ data: b as never[] })
      );
      await insertChunks("refunds", (b) => tx.refund.createMany({ data: b as never[] }));
      await insertChunks("clinicalRecords", (b) =>
        tx.clinicalRecord.createMany({ data: b as never[] })
      );
      await insertChunks("clinicalRecordRevisions", (b) =>
        tx.clinicalRecordRevision.createMany({ data: b as never[] })
      );
      await insertChunks("storedFiles", (b) => tx.storedFile.createMany({ data: b as never[] }));
      await insertChunks("storedFileShares", (b) =>
        tx.storedFileShare.createMany({ data: b as never[] })
      );
      await insertChunks("notifications", (b) => tx.notification.createMany({ data: b as never[] }));
      await insertChunks("notificationDeliveries", (b) =>
        tx.notificationDelivery.createMany({ data: b as never[] })
      );
      await insertChunks("auditLogs", (b) => tx.auditLog.createMany({ data: b as never[] }));
    },
    { maxWait: 20000, timeout: 180000 }
  );
}

async function applyValidatedUploadsStageAndSwap(
  validated: ValidatedBackupPackage,
  roots: BackupStorageRoots,
  beforeSwapHook?: () => void
): Promise<{ restoredDiskFileCount: number }> {
  const stageRoot = path.join(
    path.dirname(roots.backupDir),
    `.restore_stage_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`
  );
  const stagePrivate = path.join(stageRoot, "new_private");
  const stageMinisite = path.join(stageRoot, "new_minisite");
  const stagePublic = path.join(stageRoot, "new_public");

  const prevPrivate = path.join(stageRoot, "prev_private");
  const prevMinisite = path.join(stageRoot, "prev_minisite");
  const prevPublic = path.join(stageRoot, "prev_public");

  await fs.mkdir(stagePrivate, { recursive: true });
  await fs.mkdir(stageMinisite, { recursive: true });
  await fs.mkdir(stagePublic, { recursive: true });
  // Preserva marcador padrão de diretório privado
  await fs.writeFile(path.join(stagePrivate, ".gitkeep"), "", "utf8");

  let restoredDiskFileCount = 0;
  try {
    for (const item of validated.uploads) {
      const targetBase =
        item.area === "private"
          ? stagePrivate
          : item.area === "minisite"
          ? stageMinisite
          : stagePublic;

      const destPath = resolveContainedPath(targetBase, item.relativePosixPath);
      await fs.mkdir(path.dirname(destPath), { recursive: true });
      const data = item.zipEntry.getData();
      await fs.writeFile(destPath, data);

      const diskHash = await sha256File(destPath);
      if (diskHash !== item.sha256) {
        throw new Error(
          `Falha de verificação em disco para arquivo extraído '${item.relativePosixPath}'.`
        );
      }
      restoredDiskFileCount++;
    }

    if (beforeSwapHook) {
      beforeSwapHook();
    }

    const swaps: Array<{ liveDir: string; stageDir: string; prevDir: string }> = [
      { liveDir: roots.privateUploadsDir, stageDir: stagePrivate, prevDir: prevPrivate },
      { liveDir: roots.minisiteDir, stageDir: stageMinisite, prevDir: prevMinisite },
      { liveDir: roots.publicUploadsDir, stageDir: stagePublic, prevDir: prevPublic },
    ];

    const completedSwaps: typeof swaps = [];
    try {
      for (const s of swaps) {
        let liveExisted = false;
        try {
          const st = await fs.lstat(s.liveDir);
          liveExisted = st.isDirectory();
        } catch {
          liveExisted = false;
        }

        if (liveExisted) {
          await moveDirectorySafely(s.liveDir, s.prevDir);
        }
        await moveDirectorySafely(s.stageDir, s.liveDir);
        completedSwaps.push({ ...s });
      }
    } catch (swapErr) {
      // Reverte imediatamente qualquer diretório já substituído antes da falha
      for (const done of completedSwaps.reverse()) {
        await fs.rm(done.liveDir, { recursive: true, force: true }).catch(() => {});
        try {
          const st = await fs.lstat(done.prevDir);
          if (st.isDirectory()) {
            await moveDirectorySafely(done.prevDir, done.liveDir);
          }
        } catch {
          // melhor esforço durante reversão local
        }
      }
      throw swapErr;
    }

    return { restoredDiskFileCount };
  } finally {
    await fs.rm(stageRoot, { recursive: true, force: true }).catch(() => {});
  }
}

export async function executeStagedBackupRestoration({
  db = defaultPrisma,
  roots = getDefaultStorageRoots(),
  backupId,
  confirmationText,
  adminUserId,
  ipAddress = "127.0.0.1",
  _testFailureHook,
}: {
  db?: PrismaClient;
  roots?: BackupStorageRoots;
  backupId: string;
  confirmationText: string;
  adminUserId: string;
  ipAddress?: string;
  _testFailureHook?: (
    phase: "AFTER_SNAPSHOT" | "AFTER_DB_RESTORE" | "DURING_FILE_SWAP"
  ) => void;
}): Promise<StagedRestoreResult> {
  // FASE B — Confirmação explícita obrigatória ("RESTAURAR")
  if (typeof confirmationText !== "string" || confirmationText.trim() !== "RESTAURAR") {
    throw new Error("CONFIRMACAO_INVALIDA");
  }
  if (await isBackupJobActive(roots)) {
    throw new Error("BACKUP_EM_ANDAMENTO");
  }
  if (await isMediaCleanupInProgress({ backupDir: roots.backupDir, lockFilePath: roots.lockFilePath })) {
    throw new Error("LIMPEZA_MIDIA_EM_ANDAMENTO");
  }

  // Bloqueio global contra escritas concorrentes durante a restauração
  await acquireRestoreLock(roots, {
    backupId,
    adminUserId,
    stage: "PHASE_A_VALIDATION",
  });

  let markedRestoring = false;
  let safetySnapshot: Awaited<ReturnType<typeof createFullBackupArchive>> | null = null;
  let safetyValidated: ValidatedBackupPackage | null = null;

  try {
    // FASE A — Validação integral do arquivo, checksums, banco e espaço em disco
    const prepared = await prepareRestorePreview({ backupId, db, roots });

    // FASE C — Snapshot de segurança automático da instalação atual antes de qualquer alteração
    safetySnapshot = await createFullBackupArchive({
      db,
      roots,
      backupType: "PRE_RESTORE_SNAPSHOT",
      includeUnusedSiteMedia: true,
    });
    safetyValidated = await validateAndInspectBackupArchive(safetySnapshot.archivePath, db);

    if (_testFailureHook) {
      _testFailureHook("AFTER_SNAPSHOT");
    }

    // FASE D — Restauração controlada (BD + Sistema de arquivos em stage) com rollback automático
    await db.backupJob.update({
      where: { id: backupId },
      data: { status: "RESTORING" },
    });
    markedRestoring = true;

    try {
      await applyValidatedDatabaseSnapshot(db, prepared.validated.tables);

      if (_testFailureHook) {
        _testFailureHook("AFTER_DB_RESTORE");
      }

      const { restoredDiskFileCount } = await applyValidatedUploadsStageAndSwap(
        prepared.validated,
        roots,
        _testFailureHook ? () => _testFailureHook("DURING_FILE_SWAP") : undefined
      );

      // FASE E — Verificação final de integridade relacional e arquivos em disco
      const [
        patientCount,
        appointmentCount,
        clinicalRecordCount,
        storedFilesList,
        sharesList,
      ] = await Promise.all([
        db.patient.count(),
        db.appointment.count(),
        db.clinicalRecord.count(),
        db.storedFile.findMany({ select: { id: true, storedFileName: true } }),
        db.storedFileShare.findMany({
          include: {
            file: { select: { id: true } },
            patient: { select: { id: true } },
          },
        }),
      ]);

      if (patientCount !== prepared.validated.tables.patients.length) {
        throw new Error(
          `Divergência pós-restauração em pacientes (esperado: ${prepared.validated.tables.patients.length}, atual: ${patientCount}).`
        );
      }
      if (appointmentCount !== prepared.validated.tables.appointments.length) {
        throw new Error(
          `Divergência pós-restauração em consultas (esperado: ${prepared.validated.tables.appointments.length}, atual: ${appointmentCount}).`
        );
      }
      if (clinicalRecordCount !== prepared.validated.tables.clinicalRecords.length) {
        throw new Error(
          `Divergência pós-restauração em prontuários (esperado: ${prepared.validated.tables.clinicalRecords.length}, atual: ${clinicalRecordCount}).`
        );
      }

      for (const sFile of storedFilesList) {
        const expectedDiskPath = path.resolve(
          roots.privateUploadsDir,
          path.basename(sFile.storedFileName)
        );
        try {
          const st = await fs.stat(expectedDiskPath);
          if (!st.isFile()) {
            throw new Error(`Documento referenciado ausente em disco: ${sFile.storedFileName}`);
          }
        } catch {
          throw new Error(`Documento referenciado ausente após restauração: ${sFile.storedFileName}`);
        }
      }

      for (const share of sharesList) {
        if (!share.file?.id || !share.patient?.id) {
          throw new Error(`Relacionamento quebrado em StoredFileShare (${share.id}).`);
        }
      }

      if (restoredDiskFileCount !== prepared.validated.uploads.length) {
        throw new Error("Nem todos os arquivos de mídia/documentos foram restaurados para o disco.");
      }

      await db.backupJob.update({
        where: { id: backupId },
        data: { status: "COMPLETED" },
      });
      markedRestoring = false;

      await db.auditLog.create({
        data: {
          userId: adminUserId,
          userRole: "ADMIN",
          action: "BACKUP_RESTORED",
          resource: "BackupJob",
          resourceId: backupId,
          details: JSON.stringify({
            restoredFilename: prepared.preview.backupJob.filename,
            safetySnapshotId: safetySnapshot.backupJob.id,
            safetySnapshotFilename: safetySnapshot.backupJob.filename,
            patientCount,
            appointmentCount,
            clinicalRecordCount,
            restoredDiskFileCount,
          }),
          ipAddress,
        },
      });

      return {
        success: true,
        restoredFromBackupId: backupId,
        restoredFromFilename: prepared.preview.backupJob.filename,
        safetySnapshot: {
          id: safetySnapshot.backupJob.id,
          filename: safetySnapshot.backupJob.filename,
          sizeBytes: safetySnapshot.realSizeBytes,
        },
        verification: {
          verifiedAt: new Date().toISOString(),
          patientCount,
          appointmentCount,
          clinicalRecordCount,
          storedFileCount: storedFilesList.length,
          restoredDiskFileCount,
          integrityChecksPassed: true,
        },
        reconfigureSecretsChecklist: [...SECRETS_RECONFIGURATION_CHECKLIST],
      };
    } catch (restoreErr: unknown) {
      // Rollback automático a partir do Snapshot de Segurança da Fase C
      let rollbackSucceeded = false;
      if (safetyValidated) {
        try {
          await applyValidatedDatabaseSnapshot(db, safetyValidated.tables);
          await applyValidatedUploadsStageAndSwap(safetyValidated, roots);
          rollbackSucceeded = true;
        } catch (rollbackErr) {
          console.error("CRÍTICO: Falha ao aplicar rollback do snapshot de segurança:", rollbackErr);
        }
      }

      if (markedRestoring) {
        await db.backupJob
          .update({
            where: { id: backupId },
            data: { status: "COMPLETED" },
          })
          .catch(() => {});
      }

      await db.auditLog
        .create({
          data: {
            userId: adminUserId,
            userRole: "ADMIN",
            action: "BACKUP_RESTORE_FAILED",
            resource: "BackupJob",
            resourceId: backupId,
            details: JSON.stringify({
              rollbackSucceeded,
              safetySnapshotFilename: safetySnapshot?.backupJob.filename,
              reason: restoreErr instanceof Error ? restoreErr.message : "Erro desconhecido",
            }),
            ipAddress,
          },
        })
        .catch(() => {});

      const baseMsg =
        restoreErr instanceof Error ? restoreErr.message : "Erro inesperado na restauração.";
      if (rollbackSucceeded) {
        throw new Error(
          `ROLLBACK_EXECUTADO: ${baseMsg} O estado anterior da instalação foi recuperado automaticamente a partir do snapshot de segurança (${safetySnapshot?.backupJob.filename}).`
        );
      }
      throw new Error(`FALHA_CRITICA_RESTAURACAO: ${baseMsg}`);
    }
  } finally {
    await releaseRestoreLock(roots);
  }
}
