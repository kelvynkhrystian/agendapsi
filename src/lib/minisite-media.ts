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

/**
 * Validação rigorosa de segurança contra ZIP bombs, path traversal e arquivos perigosos
 */
export function validateZipSecurity(zip: AdmZip): ZipValidationResult {
  const entries = zip.getEntries();
  if (entries.length === 0) {
    return { valid: false, error: "O arquivo ZIP está vazio." };
  }

  const MAX_FRAMES = 150;
  const MIN_FRAMES = 2;
  const MAX_TOTAL_UNCOMPRESSED_BYTES = 150 * 1024 * 1024; // 150MB
  const ALLOWED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];

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
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      // Se houver algum executável perigoso (.exe, .sh, .bat, .php, .js)
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
 * Extrai e persiste com segurança os frames de um arquivo ZIP em public/uploads/minisite-frames/{slot}-{timestamp}
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

  const timestamp = Date.now();
  const folderName = `${slot}-${timestamp}`;
  const targetDir = path.join(process.cwd(), "public", "uploads", "minisite-frames", folderName);

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

    relativeFrames.push(`/uploads/minisite-frames/${folderName}/${safeFilename}`);
  }

  return {
    frameCount: relativeFrames.length,
    frames: relativeFrames,
    posterUrl: relativeFrames[0],
  };
}

/**
 * Importa frames pré-existentes a partir do diretório storage/minisite/{top|mid}
 */
export async function importLocalFrames(
  sourceDir: string,
  slot: MediaSlot
): Promise<FrameProcessingResult> {
  const zipFileInDir = path.join(sourceDir, slot === "hero" ? "b.zip" : "a.zip");

  // Se o arquivo zip existir na pasta, processar diretamente via processZipBuffer
  try {
    const zipStat = await fs.stat(zipFileInDir);
    if (zipStat.isFile()) {
      const zipBuffer = await fs.readFile(zipFileInDir);
      return await processZipBuffer(zipBuffer, slot);
    }
  } catch {
    // Tenta ler imagens soltas se o zip específico não existir
  }

  // Fallback: ler imagens soltas do diretório
  const entries = await fs.readdir(sourceDir);
  const imageFiles = entries.filter((f) => {
    const ext = path.extname(f).toLowerCase();
    return [".png", ".jpg", ".jpeg", ".webp"].includes(ext);
  });

  if (imageFiles.length === 0) {
    throw new Error(`Nenhum frame ou arquivo ZIP encontrado em ${sourceDir}.`);
  }

  imageFiles.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));

  const timestamp = Date.now();
  const folderName = `${slot}-${timestamp}`;
  const targetDir = path.join(process.cwd(), "public", "uploads", "minisite-frames", folderName);

  await fs.mkdir(targetDir, { recursive: true });

  const relativeFrames: string[] = [];

  for (let i = 0; i < imageFiles.length; i++) {
    const filename = imageFiles[i];
    const ext = path.extname(filename).toLowerCase();
    const frameIndex = String(i + 1).padStart(3, "0");
    const safeFilename = `frame-${frameIndex}${ext}`;
    const srcPath = path.join(sourceDir, filename);
    const destPath = path.join(targetDir, safeFilename);

    await fs.copyFile(srcPath, destPath);
    relativeFrames.push(`/uploads/minisite-frames/${folderName}/${safeFilename}`);
  }

  return {
    frameCount: relativeFrames.length,
    frames: relativeFrames,
    posterUrl: relativeFrames[0],
  };
}
