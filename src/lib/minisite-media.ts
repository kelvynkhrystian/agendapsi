import path from "path";
import { promises as fs } from "fs";
import AdmZip from "adm-zip";

export type MediaSlot = "hero" | "about";
export type MediaType = "IMAGE" | "FRAME_ANIMATION" | "VIDEO";
export type PlaybackMode = "AUTOMATIC" | "SCROLL";
export type PlaybackDirection = "FORWARD" | "ALTERNATE";

export interface FrameProcessingResult {
  frameCount: number;
  frames: string[];
  posterUrl: string;
}

export interface ZipValidationResult {
  valid: boolean;
  error?: string;
  entries?: AdmZip.IZipEntry[];
}

export const ALLOWED_IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];
export const ALLOWED_VIDEO_EXTENSIONS = [".mp4", ".webm"];
export const MAX_FRAMES = 150;
export const MIN_FRAMES = 2;
export const MAX_TOTAL_UNCOMPRESSED_BYTES = 150 * 1024 * 1024; // 150MB

/**
 * Mapeia o slot de mídia da UI para a pasta de armazenamento isolada no disco
 * Hero -> storage/minisite/top
 * Sobre Mim -> storage/minisite/sobre
 */
export function getSlotDirectory(slot: MediaSlot): "top" | "sobre" {
  return slot === "hero" ? "top" : "sobre";
}

/**
 * Validação rigorosa de segurança contra ZIP bombs, path traversal e arquivos perigosos
 */
export function validateZipSecurity(zip: AdmZip): ZipValidationResult {
  const entries = zip.getEntries();
  if (entries.length === 0) {
    return { valid: false, error: "O arquivo ZIP está vazio." };
  }

  let totalUncompressedSize = 0;
  const validImageEntries: AdmZip.IZipEntry[] = [];

  for (const entry of entries) {
    // Ignorar pastas e metadados de sistema operacional (__MACOSX, .DS_Store)
    if (entry.isDirectory || entry.entryName.includes("__MACOSX") || entry.name.startsWith(".")) {
      continue;
    }

    // Prevenção de Path Traversal (rejeita entradas com ".." ou caminhos absolutos)
    const normalized = path.normalize(entry.entryName);
    if (
      normalized.includes("..") ||
      path.isAbsolute(entry.entryName) ||
      entry.entryName.startsWith("/") ||
      entry.entryName.startsWith("\\")
    ) {
      return { valid: false, error: `Tentativa de Path Traversal detectada no arquivo: ${entry.entryName}` };
    }

    // Prevenção de Symlinks ou executáveis
    const ext = path.extname(entry.name).toLowerCase();
    if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
      const dangerousExts = [".exe", ".bat", ".cmd", ".sh", ".php", ".phtml", ".js", ".vbs", ".msi", ".dll"];
      if (dangerousExts.includes(ext)) {
        return { valid: false, error: `Arquivo potencialmente perigoso detectado no ZIP: ${entry.name}` };
      }
      continue;
    }

    totalUncompressedSize += entry.header.size;
    if (totalUncompressedSize > MAX_TOTAL_UNCOMPRESSED_BYTES) {
      return { valid: false, error: "Tamanho total descompactado excede o limite de segurança de 150 MB (Proteção contra ZIP bomb)." };
    }

    validImageEntries.push(entry);
  }

  if (validImageEntries.length < MIN_FRAMES) {
    return {
      valid: false,
      error: `O ZIP deve conter no mínimo ${MIN_FRAMES} frames válidos de imagem (PNG, JPG ou WebP). Encontrados: ${validImageEntries.length}.`,
    };
  }

  if (validImageEntries.length > MAX_FRAMES) {
    return {
      valid: false,
      error: `O arquivo contém ${validImageEntries.length} frames, excedendo o limite máximo seguro de ${MAX_FRAMES} quadros.`,
    };
  }

  // Ordenação numérica natural dos frames (ex: ezgif-frame-001.png, 002.png, ..., 040.png)
  validImageEntries.sort((a, b) => {
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
  });

  return { valid: true, entries: validImageEntries };
}

/**
 * Extrai e persiste os frames de um ZIP em storage/minisite/{top|sobre}/{uploadId}/
 */
export async function processZipBuffer(
  buffer: Buffer,
  slot: MediaSlot
): Promise<FrameProcessingResult> {
  const zip = new AdmZip(buffer);
  const validation = validateZipSecurity(zip);

  if (!validation.valid || !validation.entries) {
    throw new Error(validation.error || "Falha na validação do arquivo ZIP.");
  }

  const slotFolder = getSlotDirectory(slot);
  const uploadId = `up_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const targetDir = path.join(process.cwd(), "storage", "minisite", slotFolder, uploadId);

  await fs.mkdir(targetDir, { recursive: true });

  const relativeFrames: string[] = [];

  for (let i = 0; i < validation.entries.length; i++) {
    const entry = validation.entries[i];
    const ext = path.extname(entry.name).toLowerCase();
    const frameIndex = String(i + 1).padStart(3, "0");
    const safeFilename = `frame-${frameIndex}${ext}`;
    const destinationPath = path.join(targetDir, safeFilename);

    const entryData = entry.getData();
    await fs.writeFile(destinationPath, entryData);

    relativeFrames.push(`/api/minisite/media/${slotFolder}/${uploadId}/${safeFilename}`);
  }

  return {
    frameCount: relativeFrames.length,
    frames: relativeFrames,
    posterUrl: relativeFrames[0],
  };
}

/**
 * Processa múltiplos arquivos de imagem ou seleção de pasta em storage/minisite/{top|sobre}/{uploadId}/
 */
export async function processMultipleImageFiles(
  files: { name: string; buffer: Buffer }[],
  slot: MediaSlot
): Promise<FrameProcessingResult> {
  // Filtra arquivos válidos ignorando metadados de SO
  const validFiles = files.filter((f) => {
    const base = path.basename(f.name);
    if (base.startsWith(".") || f.name.includes("__MACOSX")) return false;
    const ext = path.extname(f.name).toLowerCase();
    return ALLOWED_IMAGE_EXTENSIONS.includes(ext);
  });

  if (validFiles.length < MIN_FRAMES) {
    throw new Error(`Selecione no mínimo ${MIN_FRAMES} frames válidos de imagem (PNG, JPG ou WebP).`);
  }

  if (validFiles.length > MAX_FRAMES) {
    throw new Error(`O total de ${validFiles.length} arquivos excede o limite máximo permitido de ${MAX_FRAMES} frames.`);
  }

  // Ordenação numérica natural pelo nome do arquivo
  validFiles.sort((a, b) => {
    return path.basename(a.name).localeCompare(path.basename(b.name), undefined, {
      numeric: true,
      sensitivity: "base",
    });
  });

  const slotFolder = getSlotDirectory(slot);
  const uploadId = `up_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const targetDir = path.join(process.cwd(), "storage", "minisite", slotFolder, uploadId);

  await fs.mkdir(targetDir, { recursive: true });

  const relativeFrames: string[] = [];

  for (let i = 0; i < validFiles.length; i++) {
    const file = validFiles[i];
    const ext = path.extname(file.name).toLowerCase();
    const frameIndex = String(i + 1).padStart(3, "0");
    const safeFilename = `frame-${frameIndex}${ext}`;
    const destinationPath = path.join(targetDir, safeFilename);

    await fs.writeFile(destinationPath, file.buffer);
    relativeFrames.push(`/api/minisite/media/${slotFolder}/${uploadId}/${safeFilename}`);
  }

  return {
    frameCount: relativeFrames.length,
    frames: relativeFrames,
    posterUrl: relativeFrames[0],
  };
}

/**
 * Salva uma mídia estática individual (imagem ou vídeo) em storage/minisite/{top|sobre}/{uploadId}/
 */
export async function saveStaticMediaFile(
  filename: string,
  buffer: Buffer,
  slot: MediaSlot,
  type: "image" | "video"
): Promise<string> {
  const ext = path.extname(filename).toLowerCase();
  const allowed = type === "image" ? ALLOWED_IMAGE_EXTENSIONS : ALLOWED_VIDEO_EXTENSIONS;

  if (!allowed.includes(ext)) {
    throw new Error(`Extensão ${ext} não permitida para ${type}.`);
  }

  const slotFolder = getSlotDirectory(slot);
  const uploadId = `up_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const targetDir = path.join(process.cwd(), "storage", "minisite", slotFolder, uploadId);

  await fs.mkdir(targetDir, { recursive: true });

  const safeFilename = `${type}${ext}`;
  const destinationPath = path.join(targetDir, safeFilename);

  await fs.writeFile(destinationPath, buffer);
  return `/api/minisite/media/${slotFolder}/${uploadId}/${safeFilename}`;
}

/**
 * Detecta frames já existentes no diretório legado storage/minisite/{top|sobre}
 */
export async function detectExistingFrames(slot: MediaSlot): Promise<FrameProcessingResult | null> {
  const slotFolder = getSlotDirectory(slot);
  const baseDir = path.join(process.cwd(), "storage", "minisite", slotFolder);

  try {
    const stat = await fs.stat(baseDir);
    if (!stat.isDirectory()) return null;

    // Primeiro verifica se há subpasta contendo frames (ex: 'b' no top ou 'a' no sobre)
    const subEntries = await fs.readdir(baseDir, { withFileTypes: true });
    let frameDir = baseDir;
    let urlPrefix = `/api/minisite/media/${slotFolder}`;

    // Procura por arquivos de frame diretamente na raiz do slot
    let directFrames = (await fs.readdir(baseDir)).filter((f) => {
      const ext = path.extname(f).toLowerCase();
      return ALLOWED_IMAGE_EXTENSIONS.includes(ext);
    });

    if (directFrames.length >= MIN_FRAMES) {
      directFrames.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
      return {
        frameCount: directFrames.length,
        frames: directFrames.map((f) => `${urlPrefix}/${f}`),
        posterUrl: `${urlPrefix}/${directFrames[0]}`,
      };
    }

    // Se não encontrou na raiz, procura nas subpastas
    for (const entry of subEntries) {
      if (entry.isDirectory()) {
        const subPath = path.join(baseDir, entry.name);
        const subFiles = (await fs.readdir(subPath)).filter((f) => {
          const ext = path.extname(f).toLowerCase();
          return ALLOWED_IMAGE_EXTENSIONS.includes(ext);
        });

        if (subFiles.length >= MIN_FRAMES) {
          subFiles.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
          return {
            frameCount: subFiles.length,
            frames: subFiles.map((f) => `${urlPrefix}/${entry.name}/${f}`),
            posterUrl: `${urlPrefix}/${entry.name}/${subFiles[0]}`,
          };
        }
      }
    }

    // Se houver um arquivo ZIP (ex: b.zip ou a.zip), podemos descompactar para a pasta do slot
    const zipName = slot === "hero" ? "b.zip" : "a.zip";
    const zipPath = path.join(baseDir, zipName);
    try {
      const zipStat = await fs.stat(zipPath);
      if (zipStat.isFile()) {
        const zipBuffer = await fs.readFile(zipPath);
        return await processZipBuffer(zipBuffer, slot);
      }
    } catch {}

    return null;
  } catch (e) {
    console.warn(`Aviso ao detectar frames em ${baseDir}:`, e);
    return null;
  }
}
