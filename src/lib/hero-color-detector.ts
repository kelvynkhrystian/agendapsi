import sharp from "sharp";
import AdmZip from "adm-zip";
import path from "path";
import fs from "fs/promises";
import { ALLOWED_IMAGE_EXTENSIONS, validateZipSecurity } from "./minisite-media";

export interface DetectionResult {
  hex: string | null;
  status: "SUCCESS" | "FAILED" | "FALLBACK";
  sampleCount?: number;
  confidence?: number;
}

/**
 * Valida se uma string é um código HEX hexadecimal válido (#RRGGBB)
 */
export function isValidHexColor(hex: string | null | undefined): boolean {
  if (!hex || typeof hex !== "string") return false;
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex.trim());
}

/**
 * Normaliza um HEX para formato 6 caracteres em maiúsculas (#RRGGBB)
 */
export function normalizeHexColor(hex: string): string {
  const clean = hex.trim().replace(/^#/, "");
  if (clean.length === 3) {
    const r = clean[0] + clean[0];
    const g = clean[1] + clean[1];
    const b = clean[2] + clean[2];
    return `#${r}${g}${b}`.toUpperCase();
  }
  return `#${clean}`.toUpperCase();
}

/**
 * Converte valores RGB (0-255) para string hexadecimal #RRGGBB
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const clamped = Math.max(0, Math.min(255, Math.round(n)));
    return clamped.toString(16).padStart(2, "0").toUpperCase();
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

interface ColorCluster {
  rValues: number[];
  gValues: number[];
  bValues: number[];
  count: number;
  weight: number;
}

function medianChannel(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function accumulateRawFrameEdges(
  data: Buffer | Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  clusters: Map<string, ColorCluster>
): number {
  if (!data || data.length < width * height * 4 || width <= 0 || height <= 0) {
    return 0;
  }

  // Largura da margem de borda (~12% da dimensão)
  const marginX = Math.max(2, Math.floor(width * 0.12));
  const marginY = Math.max(2, Math.floor(height * 0.12));
  const STEP = 16;
  let validPixelCount = 0;

  for (let y = 0; y < height; y++) {
    const isTopBorder = y < marginY;
    const isBottomBorder = y >= height - marginY;

    for (let x = 0; x < width; x++) {
      const isLeftBorder = x < marginX;
      const isRightBorder = x >= width - marginX;

      if (!isTopBorder && !isBottomBorder && !isLeftBorder && !isRightBorder) {
        continue;
      }

      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      // Ignora pixels transparentes ou semitransparentes
      if (a < 128) {
        continue;
      }

      // Cantos recebem peso dobrado por serem a região mais estável do plano de fundo
      const isCorner = (isTopBorder || isBottomBorder) && (isLeftBorder || isRightBorder);
      const weight = isCorner ? 2.0 : 1.0;

      const qR = Math.floor(r / STEP);
      const qG = Math.floor(g / STEP);
      const qB = Math.floor(b / STEP);
      const key = `${qR},${qG},${qB}`;

      let cluster = clusters.get(key);
      if (!cluster) {
        cluster = { rValues: [], gValues: [], bValues: [], count: 0, weight: 0 };
        clusters.set(key, cluster);
      }

      cluster.rValues.push(r);
      cluster.gValues.push(g);
      cluster.bValues.push(b);
      cluster.count += 1;
      cluster.weight += weight;
      validPixelCount++;
    }
  }

  return validPixelCount;
}

function finalizeClusterDetection(
  clusters: Map<string, ColorCluster>,
  validPixelCount: number
): DetectionResult {
  if (validPixelCount === 0 || clusters.size === 0) {
    return { hex: null, status: "FAILED", sampleCount: 0 };
  }

  let bestCluster: ColorCluster | null = null;
  let maxWeight = -1;

  for (const cluster of clusters.values()) {
    if (cluster.weight > maxWeight) {
      maxWeight = cluster.weight;
      bestCluster = cluster;
    }
  }

  if (!bestCluster || bestCluster.count === 0) {
    return { hex: null, status: "FAILED", sampleCount: validPixelCount };
  }

  // Estimação robusta baseada em mediana dos canais dentro do cluster predominante
  const medR = medianChannel(bestCluster.rValues);
  const medG = medianChannel(bestCluster.gValues);
  const medB = medianChannel(bestCluster.bValues);

  const hex = rgbToHex(medR, medG, medB);
  const confidence = Math.min(1, bestCluster.count / validPixelCount);

  return {
    hex,
    status: "SUCCESS",
    sampleCount: validPixelCount,
    confidence: Number(confidence.toFixed(2)),
  };
}

/**
 * Analisa um buffer de pixels RGBA brutos focando em bordas e cantos,
 * utilizando clustering quantizado + estimação por mediana robusta.
 */
export function analyzeRawRgbaEdgePixels(
  data: Buffer | Uint8Array | Uint8ClampedArray,
  width: number,
  height: number
): DetectionResult {
  const clusters = new Map<string, ColorCluster>();
  const validPixelCount = accumulateRawFrameEdges(data, width, height, clusters);
  return finalizeClusterDetection(clusters, validPixelCount);
}

/**
 * Analisa múltiplos quadros representativos de vídeo ou animação ZIP,
 * acumulando clusters nas bordas e cantos para identificar a cor de fundo mais estável.
 */
export async function detectMultiFrameBackgroundColor(
  frameBuffers: Buffer[]
): Promise<DetectionResult> {
  if (!frameBuffers || frameBuffers.length === 0) {
    return { hex: null, status: "FAILED", sampleCount: 0 };
  }

  const SAMPLE_SIZE = 120;
  const clusters = new Map<string, ColorCluster>();
  let totalSamples = 0;

  for (const buf of frameBuffers) {
    try {
      const { data, info } = await sharp(buf)
        .resize(SAMPLE_SIZE, SAMPLE_SIZE, { fit: "fill" })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      totalSamples += accumulateRawFrameEdges(data, info.width, info.height, clusters);
    } catch (frameErr) {
      console.warn("[HeroColorDetector] Erro ao decodificar frame:", frameErr);
    }
  }

  return finalizeClusterDetection(clusters, totalSamples);
}

/**
 * Detecta a cor de fundo representativa de uma imagem estática (JPG, PNG, WebP)
 * Redimensiona internamente para 120x120 para performance sem alterar o original
 */
export async function detectImageBackgroundColor(buffer: Buffer): Promise<DetectionResult> {
  try {
    const SAMPLE_SIZE = 120;
    const { data, info } = await sharp(buffer)
      .resize(SAMPLE_SIZE, SAMPLE_SIZE, { fit: "fill" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    return analyzeRawRgbaEdgePixels(data, info.width, info.height);
  } catch (error) {
    console.error("[HeroColorDetector] Erro ao analisar imagem:", error);
    return { hex: null, status: "FAILED" };
  }
}

/**
 * Detecta a cor de fundo representativa de uma animação ZIP de frames
 * Amostra múltiplos frames representativos distribuídos pela animação
 */
export async function detectZipBackgroundColor(zipBuffer: Buffer): Promise<DetectionResult> {
  try {
    const zip = new AdmZip(zipBuffer);
    const validation = validateZipSecurity(zip);

    if (!validation.valid || !validation.entries || validation.entries.length === 0) {
      return { hex: null, status: "FAILED" };
    }

    const entries = validation.entries;
    const count = entries.length;

    const sampleIndices = Array.from(
      new Set([
        0,
        Math.floor(count * 0.25),
        Math.floor(count * 0.5),
        Math.floor(count * 0.75),
        count - 1,
      ])
    ).filter((i) => i >= 0 && i < count);

    const frameBuffers: Buffer[] = [];
    for (const idx of sampleIndices) {
      try {
        frameBuffers.push(entries[idx].getData());
      } catch (err) {
        console.warn(`[HeroColorDetector] Erro ao ler entrada ZIP #${idx}:`, err);
      }
    }

    return await detectMultiFrameBackgroundColor(frameBuffers);
  } catch (error) {
    console.error("[HeroColorDetector] Erro ao analisar animação ZIP:", error);
    return { hex: null, status: "FAILED" };
  }
}

/**
 * Analisa a mídia atualmente salva no sistema de arquivos para o Hero
 */
export async function detectCurrentHeroMediaColor(
  mediaType: string,
  mediaUrl: string | null,
  framesJson: string | null
): Promise<DetectionResult> {
  try {
    // 1. Caso Frame Animation com frames existentes — amostra múltiplos frames combinados
    if (mediaType === "FRAME_ANIMATION" && framesJson) {
      let frames: string[] = [];
      try {
        frames = JSON.parse(framesJson);
      } catch {}

      if (frames.length > 0) {
        const count = frames.length;
        const sampleIndices = Array.from(
          new Set([
            0,
            Math.floor(count * 0.25),
            Math.floor(count * 0.5),
            Math.floor(count * 0.75),
            count - 1,
          ])
        ).filter((i) => i >= 0 && i < count);

        const frameBuffers: Buffer[] = [];
        for (const i of sampleIndices) {
          const filePath = resolveMediaUrlToFilePath(frames[i]);
          if (filePath) {
            try {
              frameBuffers.push(await fs.readFile(filePath));
            } catch {}
          }
        }

        if (frameBuffers.length > 0) {
          const result = await detectMultiFrameBackgroundColor(frameBuffers);
          if (result.status === "SUCCESS" && result.hex) {
            return result;
          }
        }
      }
    }

    // 2. Caso Imagem ou Poster de Vídeo
    if (mediaUrl) {
      const filePath = resolveMediaUrlToFilePath(mediaUrl);
      if (filePath) {
        const ext = path.extname(filePath).toLowerCase();
        if (ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
          const buf = await fs.readFile(filePath);
          return await detectImageBackgroundColor(buf);
        }
      }
    }

    return { hex: null, status: "FAILED" };
  } catch (error) {
    console.error("[HeroColorDetector] Erro ao analisar mídia atual:", error);
    return { hex: null, status: "FAILED" };
  }
}

/**
 * Converte URLs da API (/api/minisite/media/...) para caminhos absolutos do storage no servidor
 */
export function resolveMediaUrlToFilePath(publicUrl: string): string | null {
  if (!publicUrl || typeof publicUrl !== "string") return null;

  // Formato: /api/minisite/media/{top|sobre}/{uploadId}/{filename}
  const prefix = "/api/minisite/media/";
  if (publicUrl.startsWith(prefix)) {
    const relativePart = publicUrl.substring(prefix.length);
    const normalized = path.normalize(relativePart).replace(/^(\.\.[\/\\])+/, "");
    return path.join(process.cwd(), "storage", "minisite", normalized);
  }

  // Formato de upload de imagem legado: /uploads/{filename}
  if (publicUrl.startsWith("/uploads/")) {
    const relativePart = publicUrl.substring("/uploads/".length);
    const normalized = path.normalize(relativePart).replace(/^(\.\.[\/\\])+/, "");
    return path.join(process.cwd(), "storage", "uploads", normalized);
  }

  return null;
}
