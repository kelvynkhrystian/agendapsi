import fsSync, { promises as fs } from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "./prisma";

export interface SiteMediaRoots {
  minisiteDir: string;
  publicUploadsDir: string;
}

export interface SiteMediaBackupCoordRoots {
  backupDir: string;
  lockFilePath: string;
}

export interface ManagedMediaLocation {
  area: "minisite" | "public-uploads";
  categoryLabel: string;
  absPath: string;
  relativeKey: string;
  upDirPath: string | null;
}

export interface ActiveSiteMediaReferences {
  referencedUrls: Set<string>;
  referencedPaths: Set<string>;
  referencedDirs: Set<string>;
}

export interface OrphanedSiteMediaFile {
  relativeKey: string;
  area: "minisite" | "public-uploads";
  categoryLabel: string;
  sizeBytes: number;
  mtimeMs: number;
}

export interface OrphanedSiteMediaCategorySummary {
  categoryLabel: string;
  count: number;
  bytes: number;
}

export interface OrphanedSiteMediaScanResult {
  files: OrphanedSiteMediaFile[];
  categorySummary: OrphanedSiteMediaCategorySummary[];
  totalCount: number;
  totalBytes: number;
  graceProtectedCount: number;
  gracePeriodMs: number;
  blockedByLock: boolean;
  blockReason: string | null;
}

export interface SiteMediaCleanupResult {
  deletedCount: number;
  deletedBytes: number;
  deletedFiles: string[];
  skippedSharedCount: number;
  deferredByLock: boolean;
  blockReason: string | null;
  categorySummary: OrphanedSiteMediaCategorySummary[];
}

export const DEFAULT_MANUAL_ORPHAN_GRACE_PERIOD_MS = 2 * 60 * 1000; // 2 minutos
export const DEFAULT_AUTO_ORPHAN_GRACE_PERIOD_MS = 10 * 60 * 1000; // 10 minutos
const CLEANUP_LOCK_STALE_MS = 10 * 60 * 1000; // 10 minutos
const RESTORE_LOCK_STALE_MS = 30 * 60 * 1000; // 30 minutos
const BACKUP_JOB_STALE_MS = 15 * 60 * 1000; // 15 minutos

const IGNORED_MEDIA_BASENAMES = new Set([".gitkeep", ".DS_Store", "Thumbs.db"]);
const PROTECTED_TOP_SUBDIRS_MINISITE = new Set(["top", "top-mobile", "sobre"]);
const PROTECTED_TOP_SUBDIRS_PUBLIC = new Set(["branding", "icons"]);

export function getDefaultSiteMediaRoots(): SiteMediaRoots {
  return {
    minisiteDir: path.resolve(process.cwd(), "./storage/minisite"),
    publicUploadsDir: path.resolve(process.cwd(), "./public/uploads"),
  };
}

export function getDefaultCoordRoots(): SiteMediaBackupCoordRoots {
  const backupDir = path.resolve(process.cwd(), process.env.BACKUP_DIR || "./storage/backups");
  return {
    backupDir,
    lockFilePath: path.join(path.dirname(backupDir), ".restore.lock"),
  };
}

export function getMediaCleanupLockPath(coordRoots: SiteMediaBackupCoordRoots = getDefaultCoordRoots()): string {
  return path.join(path.dirname(coordRoots.backupDir), ".media-cleanup.lock");
}

export function getBackupJobTrackingFilePath(coordRoots: SiteMediaBackupCoordRoots = getDefaultCoordRoots()): string {
  return path.join(path.dirname(coordRoots.backupDir), ".backup-job.json");
}

export function canonicalPathKey(targetPath: string): string {
  const resolved = path.resolve(targetPath);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

export function isPathInsideDir(baseDir: string, candidatePath: string): boolean {
  const resolvedBase = path.resolve(baseDir);
  const resolvedCandidate = path.resolve(candidatePath);
  const rel = path.relative(resolvedBase, resolvedCandidate);
  return Boolean(rel) && !rel.startsWith("..") && !path.isAbsolute(rel);
}

function isPidAlive(pid: unknown): boolean {
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

export async function isMediaCleanupInProgress(
  coordRoots: SiteMediaBackupCoordRoots = getDefaultCoordRoots()
): Promise<boolean> {
  const lockPath = getMediaCleanupLockPath(coordRoots);
  try {
    const raw = await fs.readFile(lockPath, "utf8");
    const parsed = JSON.parse(raw) as { lockedAt?: string; pid?: number };
    const ageMs = parsed?.lockedAt ? Date.now() - new Date(parsed.lockedAt).getTime() : NaN;
    if (!Number.isFinite(ageMs) || ageMs > CLEANUP_LOCK_STALE_MS || (parsed?.pid && !isPidAlive(parsed.pid))) {
      await fs.unlink(lockPath).catch(() => {});
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function acquireMediaCleanupLock(
  coordRoots: SiteMediaBackupCoordRoots,
  reason: string
): Promise<void> {
  const lockPath = getMediaCleanupLockPath(coordRoots);
  await fs.mkdir(path.dirname(lockPath), { recursive: true });

  const deadline = Date.now() + 2500;
  while (Date.now() <= deadline) {
    await isMediaCleanupInProgress(coordRoots);
    try {
      await fs.writeFile(
        lockPath,
        JSON.stringify({ lockedAt: new Date().toISOString(), pid: process.pid, reason }, null, 2),
        { flag: "wx" }
      );
      return;
    } catch (err: unknown) {
      const code = (err as NodeJS.ErrnoException)?.code;
      if (code !== "EEXIST") throw err;
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
  }
  throw new Error("LIMPEZA_MIDIA_EM_ANDAMENTO");
}

async function releaseMediaCleanupLock(coordRoots: SiteMediaBackupCoordRoots): Promise<void> {
  const lockPath = getMediaCleanupLockPath(coordRoots);
  await fs.unlink(lockPath).catch(() => {});
}

export async function checkActiveBackupOrRestoreLock(
  coordRoots: SiteMediaBackupCoordRoots = getDefaultCoordRoots()
): Promise<{ blocked: boolean; reason: string | null }> {
  // 1. Verifica trava de restauração
  try {
    const rawRestore = await fs.readFile(coordRoots.lockFilePath, "utf8");
    const parsedRestore = JSON.parse(rawRestore) as { lockedAt?: string };
    const ageMs = parsedRestore?.lockedAt ? Date.now() - new Date(parsedRestore.lockedAt).getTime() : NaN;
    if (Number.isFinite(ageMs) && ageMs <= RESTORE_LOCK_STALE_MS) {
      return {
        blocked: true,
        reason: "Há uma restauração de backup em andamento. Aguarde a conclusão antes de remover mídias.",
      };
    }
  } catch {
    // sem lock de restauração
  }

  // 2. Verifica job de backup ativo (.backup-job.json)
  const jobFilePath = getBackupJobTrackingFilePath(coordRoots);
  try {
    const rawJob = await fs.readFile(jobFilePath, "utf8");
    const parsedJob = JSON.parse(rawJob) as {
      pid?: number;
      heartbeatAt?: string;
      snapshot?: { status?: string };
    };
    const status = parsedJob?.snapshot?.status;
    if (status === "RUNNING" || status === "CANCELLING") {
      const ageMs = parsedJob?.heartbeatAt ? Date.now() - new Date(parsedJob.heartbeatAt).getTime() : NaN;
      const alive = parsedJob?.pid ? isPidAlive(parsedJob.pid) : true;
      if (alive && Number.isFinite(ageMs) && ageMs <= BACKUP_JOB_STALE_MS) {
        return {
          blocked: true,
          reason: "Há uma geração de backup em andamento. Aguarde a conclusão ou o cancelamento antes de remover mídias.",
        };
      }
    }
  } catch {
    // sem job de backup ativo
  }

  return { blocked: false, reason: null };
}

function classifyCategoryByRelativeKey(area: "minisite" | "public-uploads", relPosix: string): string {
  const normalized = relPosix.replace(/^\/+/, "");
  if (area === "minisite") {
    if (normalized === "top" || normalized.startsWith("top/")) return "Hero Desktop";
    if (normalized === "top-mobile" || normalized.startsWith("top-mobile/")) return "Hero Mobile";
    if (normalized === "sobre" || normalized.startsWith("sobre/")) return "Sobre Mim";
    return "Outras Mídias do Site";
  }
  if (normalized === "branding" || normalized.startsWith("branding/")) return "Logotipos / Identidade Visual";
  if (normalized === "icons" || normalized.startsWith("icons/")) return "Ícones Personalizados";
  return "Uploads Públicos do Site";
}

export function normalizeMediaUrlString(rawUrl: string | null | undefined): string | null {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  const withoutHash = trimmed.split("#")[0];
  const withoutQuery = withoutHash.split("?")[0].trim();
  if (!withoutQuery) return null;
  return withoutQuery;
}

export function resolveManagedSiteMediaUrl(
  rawUrl: string | null | undefined,
  mediaRoots: SiteMediaRoots = getDefaultSiteMediaRoots()
): ManagedMediaLocation | null {
  const cleanUrl = normalizeMediaUrlString(rawUrl);
  if (!cleanUrl) return null;
  if (cleanUrl.includes("\0") || cleanUrl.includes("\\")) return null;

  let decodedUrl = cleanUrl;
  try {
    decodedUrl = decodeURIComponent(cleanUrl);
  } catch {
    // mantém string literal caso % não forme sequência válida
  }

  if (decodedUrl.startsWith("/api/minisite/media/")) {
    const rawRel = decodedUrl.slice("/api/minisite/media/".length);
    const segments = rawRel.split("/").filter(Boolean);
    if (segments.length === 0 || segments.some((s) => s === "." || s === ".." || s.includes("\0"))) {
      return null;
    }
    const absPath = path.resolve(mediaRoots.minisiteDir, ...segments);
    if (!isPathInsideDir(mediaRoots.minisiteDir, absPath)) return null;

    const relPosix = segments.join("/");
    let upDirPath: string | null = null;
    if (
      segments.length >= 3 &&
      PROTECTED_TOP_SUBDIRS_MINISITE.has(segments[0]) &&
      segments[1].startsWith("up_")
    ) {
      const candidateDir = path.resolve(mediaRoots.minisiteDir, segments[0], segments[1]);
      if (isPathInsideDir(mediaRoots.minisiteDir, candidateDir)) {
        upDirPath = candidateDir;
      }
    }

    return {
      area: "minisite",
      categoryLabel: classifyCategoryByRelativeKey("minisite", relPosix),
      absPath,
      relativeKey: `minisite/${relPosix}`,
      upDirPath,
    };
  }

  if (decodedUrl.startsWith("/uploads/")) {
    const rawRel = decodedUrl.slice("/uploads/".length);
    const segments = rawRel.split("/").filter(Boolean);
    if (segments.length === 0 || segments.some((s) => s === "." || s === ".." || s.includes("\0"))) {
      return null;
    }
    const absPath = path.resolve(mediaRoots.publicUploadsDir, ...segments);
    if (!isPathInsideDir(mediaRoots.publicUploadsDir, absPath)) return null;

    const relPosix = segments.join("/");
    return {
      area: "public-uploads",
      categoryLabel: classifyCategoryByRelativeKey("public-uploads", relPosix),
      absPath,
      relativeKey: `public-uploads/${relPosix}`,
      upDirPath: null,
    };
  }

  return null;
}

export function resolveRelativeKeyToAbsPath(
  relativeKey: string,
  mediaRoots: SiteMediaRoots = getDefaultSiteMediaRoots()
): { area: "minisite" | "public-uploads"; absPath: string; relPosix: string } | null {
  if (!relativeKey || typeof relativeKey !== "string") return null;
  if (relativeKey.includes("\0") || relativeKey.includes("\\")) return null;

  if (relativeKey.startsWith("minisite/")) {
    const relPosix = relativeKey.slice("minisite/".length);
    const segments = relPosix.split("/").filter(Boolean);
    if (segments.length === 0 || segments.some((s) => s === "." || s === "..")) return null;
    const absPath = path.resolve(mediaRoots.minisiteDir, ...segments);
    if (!isPathInsideDir(mediaRoots.minisiteDir, absPath)) return null;
    return { area: "minisite", absPath, relPosix: segments.join("/") };
  }

  if (relativeKey.startsWith("public-uploads/")) {
    const relPosix = relativeKey.slice("public-uploads/".length);
    const segments = relPosix.split("/").filter(Boolean);
    if (segments.length === 0 || segments.some((s) => s === "." || s === "..")) return null;
    const absPath = path.resolve(mediaRoots.publicUploadsDir, ...segments);
    if (!isPathInsideDir(mediaRoots.publicUploadsDir, absPath)) return null;
    return { area: "public-uploads", absPath, relPosix: segments.join("/") };
  }

  return null;
}

export function parseMediaUrlsFromText(content: string | null | undefined): string[] {
  if (!content || typeof content !== "string") return [];
  const matches = content.match(/\/(?:api\/minisite\/media|uploads)\/[^\s"'<>()]+/g);
  if (!matches) return [];
  return matches
    .map((m) => normalizeMediaUrlString(m))
    .filter((m): m is string => Boolean(m));
}

function collectMediaUrlsFromJsonTree(node: unknown, out: string[]): void {
  if (!node) return;
  if (typeof node === "string") {
    const trimmed = node.trim();
    if (trimmed.startsWith("/api/minisite/media/") || trimmed.startsWith("/uploads/")) {
      const normalized = normalizeMediaUrlString(trimmed);
      if (normalized) out.push(normalized);
    } else if (trimmed.includes("/api/minisite/media/") || trimmed.includes("/uploads/")) {
      out.push(...parseMediaUrlsFromText(trimmed));
    }
    return;
  }
  if (Array.isArray(node)) {
    for (const item of node) {
      collectMediaUrlsFromJsonTree(item, out);
    }
    return;
  }
  if (typeof node === "object") {
    for (const val of Object.values(node as Record<string, unknown>)) {
      collectMediaUrlsFromJsonTree(val, out);
    }
  }
}

export function extractSiteSettingsSlotUrls(
  site: {
    logoUrl?: string | null;
    logoHorizontalUrl?: string | null;
    faviconUrl?: string | null;
    heroMediaType?: string | null;
    heroMediaUrl?: string | null;
    heroPosterUrl?: string | null;
    heroFramesJson?: string | null;
    heroBgMediaRef?: string | null;
    heroMobileMediaType?: string | null;
    heroMobileMediaUrl?: string | null;
    heroMobilePosterUrl?: string | null;
    heroMobileFramesJson?: string | null;
    heroMobileBgMediaRef?: string | null;
    aboutMediaType?: string | null;
    aboutMediaUrl?: string | null;
    aboutPosterUrl?: string | null;
    aboutFramesJson?: string | null;
    benefitsJson?: string | null;
    sectionsConfigJson?: string | null;
    customHtml?: string | null;
  },
  options?: { includeStaleSlotFrames?: boolean }
): string[] {
  const urls: string[] = [];
  const push = (val: string | null | undefined) => {
    const norm = normalizeMediaUrlString(val);
    if (norm) urls.push(norm);
  };

  push(site.logoUrl);
  push(site.logoHorizontalUrl);
  push(site.faviconUrl);

  const collectSlot = (
    mediaType: string | null | undefined,
    mediaUrl: string | null | undefined,
    posterUrl: string | null | undefined,
    framesJson: string | null | undefined,
    bgMediaRef?: string | null
  ) => {
    push(mediaUrl);
    push(posterUrl);

    if (options?.includeStaleSlotFrames) {
      push(bgMediaRef);
    } else if (bgMediaRef && normalizeMediaUrlString(bgMediaRef) === normalizeMediaUrlString(mediaUrl)) {
      push(bgMediaRef);
    }

    if (options?.includeStaleSlotFrames || mediaType === "FRAME_ANIMATION") {
      if (framesJson) {
        try {
          const parsed = JSON.parse(framesJson);
          if (Array.isArray(parsed)) {
            for (const f of parsed) {
              if (typeof f === "string") push(f);
            }
          }
        } catch {
          // ignora JSON inválido
        }
      }
    }
  };

  collectSlot(
    site.heroMediaType,
    site.heroMediaUrl,
    site.heroPosterUrl,
    site.heroFramesJson,
    site.heroBgMediaRef
  );
  collectSlot(
    site.heroMobileMediaType,
    site.heroMobileMediaUrl,
    site.heroMobilePosterUrl,
    site.heroMobileFramesJson,
    site.heroMobileBgMediaRef
  );
  collectSlot(
    site.aboutMediaType,
    site.aboutMediaUrl,
    site.aboutPosterUrl,
    site.aboutFramesJson
  );

  if (site.benefitsJson) {
    try {
      collectMediaUrlsFromJsonTree(JSON.parse(site.benefitsJson), urls);
    } catch {
      urls.push(...parseMediaUrlsFromText(site.benefitsJson));
    }
  }

  if (site.sectionsConfigJson) {
    try {
      collectMediaUrlsFromJsonTree(JSON.parse(site.sectionsConfigJson), urls);
    } catch {
      urls.push(...parseMediaUrlsFromText(site.sectionsConfigJson));
    }
  }

  if (site.customHtml) {
    urls.push(...parseMediaUrlsFromText(site.customHtml));
  }

  return Array.from(new Set(urls));
}

export async function collectActiveReferencedSiteMedia(
  db: PrismaClient = defaultPrisma,
  mediaRoots: SiteMediaRoots = getDefaultSiteMediaRoots()
): Promise<ActiveSiteMediaReferences> {
  const [siteRows, profileRows, legalRows, storedFiles] = await Promise.all([
    db.siteSettings.findMany({
      select: {
        logoUrl: true,
        logoHorizontalUrl: true,
        faviconUrl: true,
        heroMediaType: true,
        heroMediaUrl: true,
        heroPosterUrl: true,
        heroFramesJson: true,
        heroBgMediaRef: true,
        heroMobileMediaType: true,
        heroMobileMediaUrl: true,
        heroMobilePosterUrl: true,
        heroMobileFramesJson: true,
        heroMobileBgMediaRef: true,
        aboutMediaType: true,
        aboutMediaUrl: true,
        aboutPosterUrl: true,
        aboutFramesJson: true,
        benefitsJson: true,
        sectionsConfigJson: true,
        customHtml: true,
      },
    }),
    db.professionalProfile.findMany({
      select: { avatarUrl: true },
    }),
    db.legalPage.findMany({
      select: { contentHtml: true },
    }),
    db.storedFile.findMany({
      select: { storedFileName: true },
    }),
  ]);

  const rawUrls: string[] = [];

  for (const site of siteRows) {
    rawUrls.push(...extractSiteSettingsSlotUrls(site));
  }

  for (const prof of profileRows) {
    const norm = normalizeMediaUrlString(prof.avatarUrl);
    if (norm) rawUrls.push(norm);
  }

  for (const page of legalRows) {
    rawUrls.push(...parseMediaUrlsFromText(page.contentHtml));
  }

  for (const sf of storedFiles) {
    if (sf.storedFileName.startsWith("/")) {
      const norm = normalizeMediaUrlString(sf.storedFileName);
      if (norm) rawUrls.push(norm);
    }
  }

  const referencedUrls = new Set<string>();
  const referencedPaths = new Set<string>();
  const referencedDirs = new Set<string>();

  for (const url of rawUrls) {
    referencedUrls.add(url);
    const resolved = resolveManagedSiteMediaUrl(url, mediaRoots);
    if (resolved) {
      referencedPaths.add(canonicalPathKey(resolved.absPath));
      if (resolved.upDirPath) {
        referencedDirs.add(canonicalPathKey(resolved.upDirPath));
      }
    }
  }

  return {
    referencedUrls,
    referencedPaths,
    referencedDirs,
  };
}

const RETRYABLE_FS_CODES = new Set(["EBUSY", "EPERM", "EACCES", "ENOTEMPTY", "EMFILE"]);

export async function safeUnlinkWithRetry(
  absPath: string,
  allowedRoots: string[]
): Promise<{ removed: boolean; sizeBytes: number }> {
  const inside = allowedRoots.some((r) => isPathInsideDir(r, absPath));
  if (!inside) {
    throw new Error("BLOQUEIO_CAMINHO_FORA_ESCopo_MIDIA");
  }

  let sizeBytes = 0;
  try {
    const st = await fs.lstat(absPath);
    if (st.isSymbolicLink() || !st.isFile()) {
      return { removed: false, sizeBytes: 0 };
    }
    sizeBytes = st.size;
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException)?.code === "ENOENT") {
      return { removed: false, sizeBytes: 0 };
    }
    throw err;
  }

  const delays = [0, 60, 180];
  for (let attempt = 0; attempt < delays.length; attempt++) {
    if (delays[attempt] > 0) {
      await new Promise((r) => setTimeout(r, delays[attempt]));
    }
    try {
      await fs.unlink(absPath);
      return { removed: true, sizeBytes };
    } catch (err: unknown) {
      const code = (err as NodeJS.ErrnoException)?.code || "";
      if (code === "ENOENT") {
        return { removed: false, sizeBytes: 0 };
      }
      if (!RETRYABLE_FS_CODES.has(code) || attempt === delays.length - 1) {
        throw err;
      }
    }
  }
  return { removed: false, sizeBytes: 0 };
}

export async function safeRmDirWithRetry(absDirPath: string, allowedRoots: string[]): Promise<boolean> {
  const inside = allowedRoots.some((r) => isPathInsideDir(r, absDirPath));
  if (!inside) {
    throw new Error("BLOQUEIO_DIRETORIO_FORA_ESCOPO_MIDIA");
  }

  const delays = [0, 60, 180];
  for (let attempt = 0; attempt < delays.length; attempt++) {
    if (delays[attempt] > 0) {
      await new Promise((r) => setTimeout(r, delays[attempt]));
    }
    try {
      await fs.rm(absDirPath, { recursive: false });
      return true;
    } catch (err: unknown) {
      const code = (err as NodeJS.ErrnoException)?.code || "";
      if (code === "ENOENT") return false;
      if (!RETRYABLE_FS_CODES.has(code) || attempt === delays.length - 1) {
        return false;
      }
    }
  }
  return false;
}

async function listAllFilesInDirectory(dirPath: string): Promise<Array<{ absPath: string; sizeBytes: number }>> {
  const collected: Array<{ absPath: string; sizeBytes: number }> = [];
  let rootStat;
  try {
    rootStat = await fs.lstat(dirPath);
  } catch {
    return collected;
  }
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) return collected;

  async function walk(current: string) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const child = path.resolve(current, entry.name);
      const st = await fs.lstat(child).catch(() => null);
      if (!st || st.isSymbolicLink()) continue;
      if (st.isDirectory()) {
        await walk(child);
      } else if (st.isFile()) {
        collected.push({ absPath: child, sizeBytes: st.size });
      }
    }
  }

  await walk(dirPath);
  return collected;
}

async function pruneEmptyManagedSubdirectories(mediaRoots: SiteMediaRoots): Promise<void> {
  async function recursePrune(currentDir: string, rootDir: string, protectedTopNames: Set<string>): Promise<boolean> {
    let entries: fsSync.Dirent[];
    try {
      entries = await fs.readdir(currentDir, { withFileTypes: true });
    } catch {
      return false;
    }

    let hasRemainingItems = false;
    for (const entry of entries) {
      const fullPath = path.resolve(currentDir, entry.name);
      if (entry.isDirectory()) {
        const st = await fs.lstat(fullPath).catch(() => null);
        if (!st || st.isSymbolicLink()) {
          hasRemainingItems = true;
          continue;
        }
        const emptied = await recursePrune(fullPath, rootDir, protectedTopNames);
        const relFromRoot = path.relative(rootDir, fullPath).split(path.sep).join("/");
        const isProtectedTop = !relFromRoot.includes("/") && protectedTopNames.has(entry.name);
        if (emptied && !isProtectedTop) {
          const removed = await safeRmDirWithRetry(fullPath, [rootDir]);
          if (!removed) hasRemainingItems = true;
        } else {
          hasRemainingItems = true;
        }
      } else {
        hasRemainingItems = true;
      }
    }

    return !hasRemainingItems;
  }

  await recursePrune(mediaRoots.minisiteDir, mediaRoots.minisiteDir, PROTECTED_TOP_SUBDIRS_MINISITE).catch(() => {});
  await recursePrune(mediaRoots.publicUploadsDir, mediaRoots.publicUploadsDir, PROTECTED_TOP_SUBDIRS_PUBLIC).catch(() => {});
}

function summarizeDeletedOrScannedCategories(
  items: Array<{ categoryLabel: string; sizeBytes: number }>
): OrphanedSiteMediaCategorySummary[] {
  const map = new Map<string, { count: number; bytes: number }>();
  for (const item of items) {
    const existing = map.get(item.categoryLabel) || { count: 0, bytes: 0 };
    existing.count += 1;
    existing.bytes += item.sizeBytes;
    map.set(item.categoryLabel, existing);
  }
  return Array.from(map.entries())
    .map(([categoryLabel, val]) => ({ categoryLabel, count: val.count, bytes: val.bytes }))
    .sort((a, b) => b.bytes - a.bytes || a.categoryLabel.localeCompare(b.categoryLabel));
}

async function tryRecordMediaCleanupAuditLog(
  db: PrismaClient,
  payload: {
    adminUserId?: string;
    ipAddress?: string;
    reason: string;
    deletedCount: number;
    deletedBytes: number;
    skippedSharedCount: number;
    deletedFiles: string[];
  }
): Promise<void> {
  if (payload.deletedCount <= 0) return;
  try {
    await db.auditLog.create({
      data: {
        userId: payload.adminUserId || null,
        userRole: "ADMIN",
        action: "SITE_MEDIA_CLEANUP",
        resource: "SiteSettings",
        resourceId: "default",
        details: JSON.stringify({
          reason: payload.reason,
          deletedCount: payload.deletedCount,
          deletedBytes: payload.deletedBytes,
          skippedSharedCount: payload.skippedSharedCount,
          sampleKeys: payload.deletedFiles.slice(0, 20),
        }),
        ipAddress: payload.ipAddress || "127.0.0.1",
      },
    });
  } catch (err) {
    console.warn("[SiteMediaCleanup] Falha não-crítica ao gravar AuditLog:", err);
  }
}

export async function cleanupReplacedSiteMediaAfterSave({
  db = defaultPrisma,
  previousUrls = [],
  abandonedUrls = [],
  mediaRoots = getDefaultSiteMediaRoots(),
  coordRoots = getDefaultCoordRoots(),
  adminUserId,
  ipAddress = "127.0.0.1",
  reason = "SUBSTITUICAO_MIDIA_SITE",
}: {
  db?: PrismaClient;
  previousUrls?: Array<string | null | undefined>;
  abandonedUrls?: Array<string | null | undefined>;
  mediaRoots?: SiteMediaRoots;
  coordRoots?: SiteMediaBackupCoordRoots;
  adminUserId?: string;
  ipAddress?: string;
  reason?: string;
}): Promise<SiteMediaCleanupResult> {
  const candidatesRaw = [...previousUrls, ...abandonedUrls]
    .map((u) => normalizeMediaUrlString(u))
    .filter((u): u is string => Boolean(u));
  const uniqueUrls = Array.from(new Set(candidatesRaw));

  if (uniqueUrls.length === 0) {
    return {
      deletedCount: 0,
      deletedBytes: 0,
      deletedFiles: [],
      skippedSharedCount: 0,
      deferredByLock: false,
      blockReason: null,
      categorySummary: [],
    };
  }

  const lockStatus = await checkActiveBackupOrRestoreLock(coordRoots);
  if (lockStatus.blocked) {
    console.info("[SiteMediaCleanup] Exclusão adiada por operação ativa de backup/restauração.");
    return {
      deletedCount: 0,
      deletedBytes: 0,
      deletedFiles: [],
      skippedSharedCount: 0,
      deferredByLock: true,
      blockReason: lockStatus.reason,
      categorySummary: [],
    };
  }

  try {
    await acquireMediaCleanupLock(coordRoots, reason);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "LIMPEZA_MIDIA_EM_ANDAMENTO") {
      return {
        deletedCount: 0,
        deletedBytes: 0,
        deletedFiles: [],
        skippedSharedCount: 0,
        deferredByLock: true,
        blockReason: "Limpeza concorrente já em andamento.",
        categorySummary: [],
      };
    }
    throw err;
  }

  try {
    // Revalida novamente as referências ativas DEPOIS que o commit no banco foi concluído
    const activeRefs = await collectActiveReferencedSiteMedia(db, mediaRoots);
    const allowedRoots = [mediaRoots.minisiteDir, mediaRoots.publicUploadsDir];

    const filesToDelete = new Map<string, { absPath: string; relativeKey: string; categoryLabel: string }>();
    const dirsToInspect = new Map<string, string>();
    let skippedSharedCount = 0;

    for (const url of uniqueUrls) {
      const resolved = resolveManagedSiteMediaUrl(url, mediaRoots);
      if (!resolved) continue;

      const fileKey = canonicalPathKey(resolved.absPath);
      if (activeRefs.referencedPaths.has(fileKey)) {
        skippedSharedCount += 1;
        continue;
      }

      filesToDelete.set(fileKey, {
        absPath: resolved.absPath,
        relativeKey: resolved.relativeKey,
        categoryLabel: resolved.categoryLabel,
      });

      if (resolved.upDirPath) {
        const upKey = canonicalPathKey(resolved.upDirPath);
        if (!activeRefs.referencedDirs.has(upKey)) {
          dirsToInspect.set(upKey, resolved.upDirPath);
        }
      }
    }

    // Varre diretórios exclusivos (up_*) que não possuem mais nenhuma referência ativa
    for (const upDirPath of dirsToInspect.values()) {
      const allInside = await listAllFilesInDirectory(upDirPath);
      for (const item of allInside) {
        const k = canonicalPathKey(item.absPath);
        if (activeRefs.referencedPaths.has(k)) continue;
        const relFromMinisite = path.relative(mediaRoots.minisiteDir, item.absPath).split(path.sep).join("/");
        filesToDelete.set(k, {
          absPath: item.absPath,
          relativeKey: `minisite/${relFromMinisite}`,
          categoryLabel: classifyCategoryByRelativeKey("minisite", relFromMinisite),
        });
      }
    }

    const deletedFiles: string[] = [];
    const deletedCategoryItems: Array<{ categoryLabel: string; sizeBytes: number }> = [];
    let deletedCount = 0;
    let deletedBytes = 0;

    for (const target of filesToDelete.values()) {
      try {
        const { removed, sizeBytes } = await safeUnlinkWithRetry(target.absPath, allowedRoots);
        if (removed) {
          deletedCount += 1;
          deletedBytes += sizeBytes;
          deletedFiles.push(target.relativeKey);
          deletedCategoryItems.push({ categoryLabel: target.categoryLabel, sizeBytes });
        }
      } catch (unlinkErr) {
        console.warn("[SiteMediaCleanup] Falha ao remover arquivo obsoleto:", target.relativeKey, unlinkErr);
      }
    }

    // Remove diretórios up_* agora vazios e eventuais pastas vazias criadas no upload
    for (const upDirPath of dirsToInspect.values()) {
      const remaining = await listAllFilesInDirectory(upDirPath);
      if (remaining.length === 0) {
        await fs.rm(upDirPath, { recursive: true, force: true }).catch(() => {});
      }
    }
    await pruneEmptyManagedSubdirectories(mediaRoots);

    if (deletedCount > 0) {
      console.info(
        `[SiteMediaCleanup] Limpeza automática (${reason}): ${deletedCount} arquivo(s) removido(s), ${deletedBytes} bytes recuperados.`
      );
      await tryRecordMediaCleanupAuditLog(db, {
        adminUserId,
        ipAddress,
        reason,
        deletedCount,
        deletedBytes,
        skippedSharedCount,
        deletedFiles,
      });
    }

    return {
      deletedCount,
      deletedBytes,
      deletedFiles,
      skippedSharedCount,
      deferredByLock: false,
      blockReason: null,
      categorySummary: summarizeDeletedOrScannedCategories(deletedCategoryItems),
    };
  } finally {
    await releaseMediaCleanupLock(coordRoots);
  }
}

async function scanManagedAreaOrphans({
  rootDir,
  area,
  activeRefs,
  cutoffMs,
}: {
  rootDir: string;
  area: "minisite" | "public-uploads";
  activeRefs: ActiveSiteMediaReferences;
  cutoffMs: number;
}): Promise<{ orphans: OrphanedSiteMediaFile[]; graceProtectedCount: number }> {
  const orphans: OrphanedSiteMediaFile[] = [];
  let graceProtectedCount = 0;
  const resolvedRoot = path.resolve(rootDir);

  let rootStat;
  try {
    rootStat = await fs.lstat(resolvedRoot);
  } catch {
    return { orphans: [], graceProtectedCount: 0 };
  }
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    return { orphans: [], graceProtectedCount: 0 };
  }

  async function walk(currentDir: string) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      if (IGNORED_MEDIA_BASENAMES.has(entry.name)) continue;

      const absEntry = path.resolve(currentDir, entry.name);
      const st = await fs.lstat(absEntry).catch(() => null);
      if (!st || st.isSymbolicLink()) continue;

      if (st.isDirectory()) {
        await walk(absEntry);
      } else if (st.isFile()) {
        const key = canonicalPathKey(absEntry);
        if (activeRefs.referencedPaths.has(key)) continue;

        if (st.mtimeMs > cutoffMs) {
          graceProtectedCount += 1;
          continue;
        }

        const relPosix = path.relative(resolvedRoot, absEntry).split(path.sep).join("/");
        if (!relPosix || relPosix.startsWith("..") || relPosix.includes("\0")) continue;

        orphans.push({
          relativeKey: `${area}/${relPosix}`,
          area,
          categoryLabel: classifyCategoryByRelativeKey(area, relPosix),
          sizeBytes: st.size,
          mtimeMs: st.mtimeMs,
        });
      }
    }
  }

  await walk(resolvedRoot);
  return { orphans, graceProtectedCount };
}

export async function scanOrphanedSiteMedia({
  db = defaultPrisma,
  mediaRoots = getDefaultSiteMediaRoots(),
  coordRoots = getDefaultCoordRoots(),
  gracePeriodMs = DEFAULT_MANUAL_ORPHAN_GRACE_PERIOD_MS,
}: {
  db?: PrismaClient;
  mediaRoots?: SiteMediaRoots;
  coordRoots?: SiteMediaBackupCoordRoots;
  gracePeriodMs?: number;
} = {}): Promise<OrphanedSiteMediaScanResult> {
  const effectiveGraceMs = Math.max(0, Number.isFinite(gracePeriodMs) ? gracePeriodMs : DEFAULT_MANUAL_ORPHAN_GRACE_PERIOD_MS);
  const cutoffMs = Date.now() - effectiveGraceMs;

  const [lockStatus, activeRefs] = await Promise.all([
    checkActiveBackupOrRestoreLock(coordRoots),
    collectActiveReferencedSiteMedia(db, mediaRoots),
  ]);

  const [minisiteScan, publicScan] = await Promise.all([
    scanManagedAreaOrphans({
      rootDir: mediaRoots.minisiteDir,
      area: "minisite",
      activeRefs,
      cutoffMs,
    }),
    scanManagedAreaOrphans({
      rootDir: mediaRoots.publicUploadsDir,
      area: "public-uploads",
      activeRefs,
      cutoffMs,
    }),
  ]);

  const files = [...minisiteScan.orphans, ...publicScan.orphans];
  const totalBytes = files.reduce((acc, f) => acc + f.sizeBytes, 0);

  return {
    files,
    categorySummary: summarizeDeletedOrScannedCategories(files),
    totalCount: files.length,
    totalBytes,
    graceProtectedCount: minisiteScan.graceProtectedCount + publicScan.graceProtectedCount,
    gracePeriodMs: effectiveGraceMs,
    blockedByLock: lockStatus.blocked,
    blockReason: lockStatus.reason,
  };
}

export async function executeOrphanedSiteMediaCleanup({
  db = defaultPrisma,
  mediaRoots = getDefaultSiteMediaRoots(),
  coordRoots = getDefaultCoordRoots(),
  gracePeriodMs = DEFAULT_MANUAL_ORPHAN_GRACE_PERIOD_MS,
  targetRelativeKeys,
  adminUserId,
  ipAddress = "127.0.0.1",
  reason = "LIMPEZA_MANUAL_MIDIAS_NAO_UTILIZADAS",
}: {
  db?: PrismaClient;
  mediaRoots?: SiteMediaRoots;
  coordRoots?: SiteMediaBackupCoordRoots;
  gracePeriodMs?: number;
  targetRelativeKeys?: string[];
  adminUserId?: string;
  ipAddress?: string;
  reason?: string;
}): Promise<SiteMediaCleanupResult> {
  const lockStatus = await checkActiveBackupOrRestoreLock(coordRoots);
  if (lockStatus.blocked) {
    throw new Error("OPERACAO_BACKUP_OU_RESTAURACAO_ATIVA");
  }

  await acquireMediaCleanupLock(coordRoots, reason);

  try {
    // Re-checa lock após adquirir trava para eliminar janela de corrida
    const secondLockCheck = await checkActiveBackupOrRestoreLock(coordRoots);
    if (secondLockCheck.blocked) {
      throw new Error("OPERACAO_BACKUP_OU_RESTAURACAO_ATIVA");
    }

    const scan = await scanOrphanedSiteMedia({
      db,
      mediaRoots,
      coordRoots,
      gracePeriodMs,
    });

    // Re-verifica referências ativas frescas exatamente antes de remover
    const freshRefs = await collectActiveReferencedSiteMedia(db, mediaRoots);
    const allowedRoots = [mediaRoots.minisiteDir, mediaRoots.publicUploadsDir];
    const requestedSet =
      Array.isArray(targetRelativeKeys) && targetRelativeKeys.length > 0
        ? new Set(targetRelativeKeys)
        : null;

    const deletedFiles: string[] = [];
    const deletedCategoryItems: Array<{ categoryLabel: string; sizeBytes: number }> = [];
    let deletedCount = 0;
    let deletedBytes = 0;
    let skippedSharedCount = 0;

    for (const file of scan.files) {
      if (requestedSet && !requestedSet.has(file.relativeKey)) continue;

      const resolved = resolveRelativeKeyToAbsPath(file.relativeKey, mediaRoots);
      if (!resolved) continue;

      if (freshRefs.referencedPaths.has(canonicalPathKey(resolved.absPath))) {
        skippedSharedCount += 1;
        continue;
      }

      try {
        const { removed, sizeBytes } = await safeUnlinkWithRetry(resolved.absPath, allowedRoots);
        if (removed) {
          deletedCount += 1;
          deletedBytes += sizeBytes;
          deletedFiles.push(file.relativeKey);
          deletedCategoryItems.push({ categoryLabel: file.categoryLabel, sizeBytes });
        }
      } catch (err) {
        console.warn("[SiteMediaCleanup] Falha ao remover mídia órfã:", file.relativeKey, err);
      }
    }

    await pruneEmptyManagedSubdirectories(mediaRoots);

    if (deletedCount > 0) {
      console.info(
        `[SiteMediaCleanup] Limpeza confirmada (${reason}): ${deletedCount} arquivo(s) órfão(s) removido(s), ${deletedBytes} bytes recuperados.`
      );
      await tryRecordMediaCleanupAuditLog(db, {
        adminUserId,
        ipAddress,
        reason,
        deletedCount,
        deletedBytes,
        skippedSharedCount,
        deletedFiles,
      });
    }

    return {
      deletedCount,
      deletedBytes,
      deletedFiles,
      skippedSharedCount,
      deferredByLock: false,
      blockReason: null,
      categorySummary: summarizeDeletedOrScannedCategories(deletedCategoryItems),
    };
  } finally {
    await releaseMediaCleanupLock(coordRoots);
  }
}

export async function cleanupAbandonedTempDirectoryQuietly(dirPath: string | null | undefined): Promise<void> {
  if (!dirPath) return;
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch {
    // limpeza defensiva não-bloqueante
  }
}
