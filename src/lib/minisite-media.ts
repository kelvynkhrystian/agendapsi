import path from "path";
import { promises as fs } from "fs";
import AdmZip from "adm-zip";

export type MediaSlot = "hero" | "hero_mobile" | "about";
export type MediaType = "IMAGE" | "FRAME_ANIMATION" | "VIDEO";
export type PlaybackMode = "AUTOMATIC" | "SCROLL";
export type PlaybackDirection = "FORWARD" | "ALTERNATE";
export type PlaybackSpeed = 0.5 | 1 | 2;

export const ALLOWED_PLAYBACK_SPEEDS: readonly PlaybackSpeed[] = [0.5, 1, 2];

export interface DetectedFileFormat {
  mediaType: MediaType;
  extension: string;
  kind: "image" | "video" | "zip";
}

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
 * Normaliza e restringe a velocidade de reprodução aos valores suportados (0.5x, 1x, 2x)
 */
export function normalizePlaybackSpeed(value: unknown): PlaybackSpeed {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num) || num <= 0) return 1;
  if (num < 0.75) return 0.5;
  if (num >= 1.5) return 2;
  return 1;
}

/**
 * Reconhece automaticamente o tipo de mídia (Imagem, Vídeo ou ZIP de frames)
 * inspecionando assinatura binária (magic bytes), MIME type e extensão do arquivo.
 */
export function detectMediaTypeFromFile(
  filename: string,
  mimeType: string | undefined | null,
  buffer: Buffer
): DetectedFileFormat {
  if (!buffer || buffer.length < 4) {
    throw new Error("Arquivo inválido ou corrompido. Envie JPG, PNG, WebP, MP4, WebM ou ZIP.");
  }

  const rawExt = path.extname(filename || "").toLowerCase();
  const normalizedMime = (mimeType || "").toLowerCase();

  // 1. PNG (89 50 4E 47 0D 0A 1A 0A)
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { mediaType: "IMAGE", extension: ".png", kind: "image" };
  }

  // 2. JPEG / JPG (FF D8 FF)
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return {
      mediaType: "IMAGE",
      extension: rawExt === ".jpeg" ? ".jpeg" : ".jpg",
      kind: "image",
    };
  }

  // 3. WebP (RIFF....WEBP)
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { mediaType: "IMAGE", extension: ".webp", kind: "image" };
  }

  // 4. ZIP de frames sequenciais (PK..)
  if (
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    ((buffer[2] === 0x03 && buffer[3] === 0x04) ||
      (buffer[2] === 0x05 && buffer[3] === 0x06) ||
      (buffer[2] === 0x07 && buffer[3] === 0x08))
  ) {
    return { mediaType: "FRAME_ANIMATION", extension: ".zip", kind: "zip" };
  }

  // 5. MP4 (ISO Base Media: offset 4 = "ftyp")
  if (buffer.length >= 12 && buffer.toString("ascii", 4, 8) === "ftyp") {
    const brand = buffer.toString("ascii", 8, 12).toLowerCase();
    // Rejeitar explícitamente QuickTime (.mov) caso extensão seja .mov e brand seja qt
    if (brand === "qt  " && rawExt === ".mov") {
      throw new Error("Formato .mov não é suportado. Envie um vídeo MP4 ou WebM.");
    }
    return { mediaType: "VIDEO", extension: ".mp4", kind: "video" };
  }

  // 6. WebM (EBML header: 1A 45 DF A3 com assinatura DocType webm ou extensão/MIME webm)
  if (
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3
  ) {
    const headerSlice = buffer.subarray(0, Math.min(buffer.length, 256)).toString("latin1").toLowerCase();
    if (headerSlice.includes("matroska") && !headerSlice.includes("webm") && rawExt !== ".webm") {
      throw new Error("Formato MKV não é suportado. Envie um vídeo MP4 ou WebM.");
    }
    if (headerSlice.includes("webm") || rawExt === ".webm" || normalizedMime.includes("webm")) {
      return { mediaType: "VIDEO", extension: ".webm", kind: "video" };
    }
  }

  throw new Error(
    "Formato de arquivo não suportado. Envie uma imagem, vídeo ou animação ZIP (JPG, PNG, WebP, MP4, WebM ou ZIP)."
  );
}

/**
 * Mapeia o slot de mídia da UI para a pasta de armazenamento isolada no disco
 * Hero Desktop -> storage/minisite/top
 * Hero Mobile -> storage/minisite/top-mobile
 * Sobre Mim -> storage/minisite/sobre
 */
export function getSlotDirectory(slot: MediaSlot): "top" | "top-mobile" | "sobre" {
  if (slot === "hero") return "top";
  if (slot === "hero_mobile") return "top-mobile";
  return "sobre";
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
 * Salva uma mídia estática individual (imagem ou vídeo) em storage/minisite/{top|top-mobile|sobre}/{uploadId}/
 */
export async function saveStaticMediaFile(
  filename: string,
  buffer: Buffer,
  slot: MediaSlot,
  type: "image" | "video",
  detectedExt?: string
): Promise<string> {
  const ext = (detectedExt || path.extname(filename)).toLowerCase();
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

    // Se houver um arquivo ZIP legado (b.zip ou a.zip), podemos descompactar para a pasta do slot
    const zipName = slot === "hero" ? "b.zip" : slot === "about" ? "a.zip" : null;
    if (zipName) {
      const zipPath = path.join(baseDir, zipName);
      try {
        const zipStat = await fs.stat(zipPath);
        if (zipStat.isFile()) {
          const zipBuffer = await fs.readFile(zipPath);
          return await processZipBuffer(zipBuffer, slot);
        }
      } catch {}
    }

    return null;
  } catch (e) {
    console.warn(`Aviso ao detectar frames em ${baseDir}:`, e);
    return null;
  }
}

export interface MediaDimensions {
  width: number;
  height: number;
}

function parsePngDimensions(buf: Buffer): MediaDimensions | null {
  if (buf.length < 24) return null;
  if (buf.readUInt32BE(0) !== 0x89504e47 || buf.toString("ascii", 12, 16) !== "IHDR") return null;
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return width > 0 && height > 0 ? { width, height } : null;
}

function parseJpegDimensions(buf: Buffer): MediaDimensions | null {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let pos = 2;
  while (pos + 4 <= buf.length) {
    if (buf[pos] !== 0xff) {
      pos++;
      continue;
    }
    const marker = buf[pos + 1];
    if (marker === 0xff) {
      pos++;
      continue;
    }
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      pos += 2;
      continue;
    }
    if (pos + 4 > buf.length) break;
    const segLen = buf.readUInt16BE(pos + 2);
    if (segLen < 2 || pos + 2 + segLen > buf.length) break;
    const isSof =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);
    if (isSof && segLen >= 7) {
      const height = buf.readUInt16BE(pos + 5);
      const width = buf.readUInt16BE(pos + 7);
      if (width > 0 && height > 0) return { width, height };
    }
    pos += 2 + segLen;
  }
  return null;
}

function parseWebpDimensions(buf: Buffer): MediaDimensions | null {
  if (buf.length < 30) return null;
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WEBP") return null;
  const chunkType = buf.toString("ascii", 12, 16);
  if (chunkType === "VP8X") {
    const width = 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16));
    const height = 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16));
    return width > 0 && height > 0 ? { width, height } : null;
  }
  if (chunkType === "VP8 " && buf[23] === 0x9d && buf[24] === 0x01 && buf[25] === 0x2a) {
    const width = buf.readUInt16LE(26) & 0x3fff;
    const height = buf.readUInt16LE(28) & 0x3fff;
    return width > 0 && height > 0 ? { width, height } : null;
  }
  if (chunkType === "VP8L" && buf[20] === 0x2f) {
    const b1 = buf[21];
    const b2 = buf[22];
    const b3 = buf[23];
    const b4 = buf[24];
    const width = 1 + (((b2 & 0x3f) << 8) | b1);
    const height = 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6));
    return width > 0 && height > 0 ? { width, height } : null;
  }
  return null;
}

function parseMp4Dimensions(buf: Buffer): MediaDimensions | null {
  function walk(start: number, end: number): MediaDimensions | null {
    let pos = start;
    while (pos + 8 <= end) {
      let size = buf.readUInt32BE(pos);
      const type = buf.toString("ascii", pos + 4, pos + 8);
      let headerSize = 8;
      if (size === 1 && pos + 16 <= end) {
        size = Number(buf.readBigUInt64BE(pos + 8));
        headerSize = 16;
      } else if (size === 0) {
        size = end - pos;
      }
      if (size < headerSize || pos + size > end) break;

      if (type === "moov" || type === "trak") {
        const res = walk(pos + headerSize, pos + size);
        if (res) return res;
      } else if (type === "tkhd" && pos + headerSize + 4 <= pos + size) {
        const version = buf[pos + headerSize];
        const dimOffset = version === 1 ? pos + headerSize + 88 : pos + headerSize + 76;
        const matrixOffset = version === 1 ? pos + headerSize + 52 : pos + headerSize + 40;
        if (dimOffset + 8 <= pos + size) {
          let w = buf.readUInt32BE(dimOffset) >>> 16;
          let h = buf.readUInt32BE(dimOffset + 4) >>> 16;
          if (w > 0 && h > 0) {
            if (matrixOffset + 24 <= pos + size) {
              const a = buf.readInt32BE(matrixOffset);
              const b = buf.readInt32BE(matrixOffset + 4);
              const c = buf.readInt32BE(matrixOffset + 12);
              const d = buf.readInt32BE(matrixOffset + 16);
              if (a === 0 && d === 0 && b !== 0 && c !== 0) {
                const tmp = w;
                w = h;
                h = tmp;
              }
            }
            return { width: w, height: h };
          }
        }
      }
      pos += size;
    }
    return null;
  }
  return walk(0, buf.length);
}

/**
 * Lê dimensões intrínsecas de imagem ou vídeo local para evitar saltos de layout no carregamento inicial (mobile/desktop)
 */
export async function getLocalMediaDimensions(publicUrl?: string | null): Promise<MediaDimensions | null> {
  if (!publicUrl || typeof publicUrl !== "string") return null;
  const cleanUrl = publicUrl.split("?")[0].split("#")[0];
  let resolvedPath: string | null = null;

  if (cleanUrl.startsWith("/api/minisite/media/")) {
    const relSegments = cleanUrl.replace("/api/minisite/media/", "").split("/").filter(Boolean);
    if (relSegments.some((s) => s.includes(".."))) return null;
    const baseDir = path.resolve(process.cwd(), "storage", "minisite");
    const candidate = path.resolve(baseDir, ...relSegments);
    if (candidate.startsWith(baseDir)) resolvedPath = candidate;
  } else if (cleanUrl.startsWith("/uploads/")) {
    const relSegments = cleanUrl.replace(/^\//, "").split("/").filter(Boolean);
    if (relSegments.some((s) => s.includes(".."))) return null;
    const baseDir = path.resolve(process.cwd(), "public");
    const candidate = path.resolve(baseDir, ...relSegments);
    if (candidate.startsWith(baseDir)) resolvedPath = candidate;
  }

  if (!resolvedPath) return null;

  try {
    const ext = path.extname(resolvedPath).toLowerCase();
    if (ext === ".png") {
      const fh = await fs.open(resolvedPath, "r");
      try {
        const buf = Buffer.alloc(32);
        const { bytesRead } = await fh.read(buf, 0, 32, 0);
        return parsePngDimensions(buf.subarray(0, bytesRead));
      } finally {
        await fh.close();
      }
    }
    if (ext === ".webp") {
      const fh = await fs.open(resolvedPath, "r");
      try {
        const buf = Buffer.alloc(64);
        const { bytesRead } = await fh.read(buf, 0, 64, 0);
        return parseWebpDimensions(buf.subarray(0, bytesRead));
      } finally {
        await fh.close();
      }
    }
    if (ext === ".jpg" || ext === ".jpeg") {
      const buf = await fs.readFile(resolvedPath);
      return parseJpegDimensions(buf);
    }
    if (ext === ".mp4") {
      const buf = await fs.readFile(resolvedPath);
      return parseMp4Dimensions(buf);
    }
  } catch {
    return null;
  }
  return null;
}
