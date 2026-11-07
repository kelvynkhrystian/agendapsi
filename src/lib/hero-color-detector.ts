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

interface ColorBucket {
  rSum: number;
  gSum: number;
  bSum: number;
  count: number;
  weight: number;
}

/**
 * Analisa um buffer de pixels RGBA brutos focando em bordas e cantos
 * Ignora pixels transparentes e agrupa cores similares por quantização
 */
export function analyzeRawRgbaEdgePixels(
  data: Buffer | Uint8Array | Uint8ClampedArray,
  width: number,
  height: number
): DetectionResult {
  if (!data || data.length < width * height * 4 || width <= 0 || height <= 0) {
    return { hex: null, status: "FAILED" };
  }

  // Largura da margem de borda (aproximadamente 12% da dimensão)
  const marginX = Math.max(2, Math.floor(width * 0.12));
  const marginY = Math.max(2, Math.floor(height * 0.12));

  // Mapa de quantização com passo de 16 para agrupar tons similares
  const STEP = 16;
  const buckets = new Map<string, ColorBucket>();
  let validPixelCount = 0;

  for (let y = 0; y < height; y++) {
    const isTopBorder = y < marginY;
    const isBottomBorder = y >= height - marginY;

    for (let x = 0; x < width; x++) {
      const isLeftBorder = x < marginX;
      const isRightBorder = x >= width - marginX;

      // Analisa prioritariamente pixels de borda e cantos
      if (!isTopBorder && !isBottomBorder && !isLeftBorder && !isRightBorder) {
        continue;
      }

      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      // Ignora pixels transparentes ou semitransparentes (alpha < 128)
      if (a < 128) {
        continue;
      }

      // Cantos têm peso 2.0; bordas têm peso 1.0
      const isCorner = (isTopBorder || isBottomBorder) && (isLeftBorder || isRightBorder);
      const weight = isCorner ? 2.0 : 1.0;

      // Quantização simples em baldes
      const qR = Math.floor(r / STEP);
      const qG = Math.floor(g / STEP);
      const qB = Math.floor(b / STEP);
      const key = `${qR},${qG},${qB}`;

      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = { rSum: 0, gSum: 0, bSum: 0, count: 0, weight: 0 };
        buckets.set(key, bucket);
      }

      bucket.rSum += r;
      bucket.gSum += g;
      bucket.bSum += b;
      bucket.count += 1;
      bucket.weight += weight;
      validPixelCount++;
    }
  }

  // Se não houver pixels opacos visíveis (ex: imagem 100% transparente)
  if (validPixelCount === 0 || buckets.size === 0) {
    return { hex: null, status: "FAILED", sampleCount: 0 };
  }

  // Encontra o balde com maior peso acumulado nas bordas
  let bestBucket: ColorBucket | null = null;
  let maxWeight = -1;

  for (const bucket of buckets.values()) {
    if (bucket.weight > maxWeight) {
      maxWeight = bucket.weight;
      bestBucket = bucket;
    }
  }

  if (!bestBucket || bestBucket.count === 0) {
    return { hex: null, status: "FAILED", sampleCount: validPixelCount };
  }

  const avgR = bestBucket.rSum / bestBucket.count;
  const avgG = bestBucket.gSum / bestBucket.count;
  const avgB = bestBucket.bSum / bestBucket.count;

  const hex = rgbToHex(avgR, avgG, avgB);
  const confidence = Math.min(1, bestBucket.count / validPixelCount);

  return {
    hex,
    status: "SUCCESS",
    sampleCount: validPixelCount,
    confidence: Number(confidence.toFixed(2)),
  };
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
 * Amostra frames representativos do início, meio e fim
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

    // Seleciona índices representativos (início, meio e fim)
    const sampleIndices = Array.from(
      new Set([
        0,
        Math.floor(count * 0.25),
        Math.floor(count * 0.5),
        Math.floor(count * 0.75),
        count - 1,
      ])
    ).filter((i) => i >= 0 && i < count);

    // Amostra e acumula pixels de borda de todos os frames selecionados
    const combinedBuckets = new Map<string, ColorBucket>();
    let totalSamples = 0;
    const STEP = 16;
    const SAMPLE_SIZE = 100;

    for (const idx of sampleIndices) {
      const entry = entries[idx];
      const frameBuffer = entry.getData();

      try {
        const { data, info } = await sharp(frameBuffer)
          .resize(SAMPLE_SIZE, SAMPLE_SIZE, { fit: "fill" })
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true });

        const marginX = Math.max(2, Math.floor(info.width * 0.12));
        const marginY = Math.max(2, Math.floor(info.height * 0.12));

        for (let y = 0; y < info.height; y++) {
          const isTopBorder = y < marginY;
          const isBottomBorder = y >= info.height - marginY;

          for (let x = 0; x < info.width; x++) {
            const isLeftBorder = x < marginX;
            const isRightBorder = x >= info.width - marginX;

            if (!isTopBorder && !isBottomBorder && !isLeftBorder && !isRightBorder) {
              continue;
            }

            const pIdx = (y * info.width + x) * 4;
            const r = data[pIdx];
            const g = data[pIdx + 1];
            const b = data[pIdx + 2];
            const a = data[pIdx + 3];

            if (a < 128) continue;

            const isCorner = (isTopBorder || isBottomBorder) && (isLeftBorder || isRightBorder);
            const weight = isCorner ? 2.0 : 1.0;

            const qR = Math.floor(r / STEP);
            const qG = Math.floor(g / STEP);
            const qB = Math.floor(b / STEP);
            const key = `${qR},${qG},${qB}`;

            let bucket = combinedBuckets.get(key);
            if (!bucket) {
              bucket = { rSum: 0, gSum: 0, bSum: 0, count: 0, weight: 0 };
              combinedBuckets.set(key, bucket);
            }

            bucket.rSum += r;
            bucket.gSum += g;
            bucket.bSum += b;
            bucket.count += 1;
            bucket.weight += weight;
            totalSamples++;
          }
        }
      } catch (frameErr) {
        console.warn(`[HeroColorDetector] Erro no frame ${idx}:`, frameErr);
      }
    }

    if (totalSamples === 0 || combinedBuckets.size === 0) {
      return { hex: null, status: "FAILED", sampleCount: 0 };
    }

    let bestBucket: ColorBucket | null = null;
    let maxWeight = -1;

    for (const bucket of combinedBuckets.values()) {
      if (bucket.weight > maxWeight) {
        maxWeight = bucket.weight;
        bestBucket = bucket;
      }
    }

    if (!bestBucket || bestBucket.count === 0) {
      return { hex: null, status: "FAILED", sampleCount: totalSamples };
    }

    const avgR = bestBucket.rSum / bestBucket.count;
    const avgG = bestBucket.gSum / bestBucket.count;
    const avgB = bestBucket.bSum / bestBucket.count;

    return {
      hex: rgbToHex(avgR, avgG, avgB),
      status: "SUCCESS",
      sampleCount: totalSamples,
      confidence: Number((bestBucket.count / totalSamples).toFixed(2)),
    };
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
    // 1. Caso Frame Animation com frames existentes
    if (mediaType === "FRAME_ANIMATION" && framesJson) {
      let frames: string[] = [];
      try {
        frames = JSON.parse(framesJson);
      } catch {}

      if (frames.length > 0) {
        // Amostra até 3 frames dos arquivos locais
        const sampleFrames = [
          frames[0],
          frames[Math.floor(frames.length / 2)],
          frames[frames.length - 1],
        ].filter(Boolean);

        for (const frameUrl of sampleFrames) {
          const filePath = resolveMediaUrlToFilePath(frameUrl);
          if (filePath) {
            try {
              const buf = await fs.readFile(filePath);
              const result = await detectImageBackgroundColor(buf);
              if (result.status === "SUCCESS" && result.hex) {
                return result;
              }
            } catch {}
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
