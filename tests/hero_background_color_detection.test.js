const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

// Algoritmo de extração e quantização idêntico ao src/lib/hero-color-detector.ts
function rgbToHex(r, g, b) {
  const toHex = (c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function isValidHexColor(hex) {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex);
}

function normalizeHexColor(hex, fallback = "#FAF7F2") {
  if (!hex || typeof hex !== "string") return fallback;
  const cleaned = hex.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(cleaned)) return cleaned.toUpperCase();
  if (/^#[0-9A-Fa-f]{3}$/.test(cleaned)) {
    const r = cleaned[1];
    const g = cleaned[2];
    const b = cleaned[3];
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return fallback;
}

function analyzeRawRgbaEdgePixels(buffer, width, height, fallback = "#FAF7F2") {
  const marginX = Math.max(2, Math.floor(width * 0.12));
  const marginY = Math.max(2, Math.floor(height * 0.12));
  const buckets = new Map();

  for (let y = 0; y < height; y++) {
    const isTop = y < marginY;
    const isBottom = y >= height - marginY;
    for (let x = 0; x < width; x++) {
      const isLeft = x < marginX;
      const isRight = x >= width - marginX;

      if (!isTop && !isBottom && !isLeft && !isRight) {
        continue;
      }

      const idx = (y * width + x) * 4;
      const r = buffer[idx];
      const g = buffer[idx + 1];
      const b = buffer[idx + 2];
      const a = buffer[idx + 3];

      if (a < 128) continue;

      const isCorner = (isTop || isBottom) && (isLeft || isRight);
      const weight = isCorner ? 2.0 : 1.0;

      const qr = Math.floor(r / 16);
      const qg = Math.floor(g / 16);
      const qb = Math.floor(b / 16);
      const key = `${qr}_${qg}_${qb}`;

      let item = buckets.get(key);
      if (!item) {
        item = { sumR: 0, sumG: 0, sumB: 0, count: 0, weightedCount: 0 };
        buckets.set(key, item);
      }

      item.sumR += r * weight;
      item.sumG += g * weight;
      item.sumB += b * weight;
      item.count += 1;
      item.weightedCount += weight;
    }
  }

  if (buckets.size === 0) return fallback;

  let bestBucket = null;
  for (const bucket of buckets.values()) {
    if (!bestBucket || bucket.weightedCount > bestBucket.weightedCount) {
      bestBucket = bucket;
    }
  }

  if (!bestBucket || bestBucket.weightedCount === 0) return fallback;

  const avgR = bestBucket.sumR / bestBucket.weightedCount;
  const avgG = bestBucket.sumG / bestBucket.weightedCount;
  const avgB = bestBucket.sumB / bestBucket.weightedCount;

  return rgbToHex(avgR, avgG, avgB);
}

// ==================== TESTES DE UNIDADE E ALGORITMO ====================

test("1. Algoritmo de Bordas e Cantos: Detecta cor sólida perfeitamente", () => {
  const width = 20;
  const height = 20;
  const buffer = Buffer.alloc(width * height * 4);

  // Preenche tudo com azul #0055FF
  for (let i = 0; i < width * height; i++) {
    buffer[i * 4] = 0x00;
    buffer[i * 4 + 1] = 0x55;
    buffer[i * 4 + 2] = 0xff;
    buffer[i * 4 + 3] = 0xff;
  }

  const detected = analyzeRawRgbaEdgePixels(buffer, width, height);
  assert.strictEqual(detected, "#0055FF", "Deve retornar #0055FF para cor sólida uniforme");
});

test("2. Algoritmo de Bordas: Ignora sujeito central e prioriza bordas e cantos", () => {
  const width = 30;
  const height = 30;
  const buffer = Buffer.alloc(width * height * 4);

  // Bordas com verde escuro #103020
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const isCenter = x >= 8 && x <= 22 && y >= 8 && y <= 22;

      if (isCenter) {
        // Sujeito central (ex: vermelho brilhante)
        buffer[idx] = 255;
        buffer[idx + 1] = 0;
        buffer[idx + 2] = 0;
        buffer[idx + 3] = 255;
      } else {
        // Fundo das bordas
        buffer[idx] = 16;
        buffer[idx + 1] = 48;
        buffer[idx + 2] = 32;
        buffer[idx + 3] = 255;
      }
    }
  }

  const detected = analyzeRawRgbaEdgePixels(buffer, width, height);
  assert.strictEqual(detected, "#103020", "Não deve ser influenciado pelo sujeito central vermelho");
});

test("3. Algoritmo de Bordas: Ignora pixels com transparência (alfa < 128)", () => {
  const width = 10;
  const height = 10;
  const buffer = Buffer.alloc(width * height * 4);

  // Todos os pixels transparentes com ruído RGB aleatório
  for (let i = 0; i < width * height; i++) {
    buffer[i * 4] = 255;
    buffer[i * 4 + 1] = 0;
    buffer[i * 4 + 2] = 0;
    buffer[i * 4 + 3] = 50; // Quase transparente
  }

  const detected = analyzeRawRgbaEdgePixels(buffer, width, height, "#FAF7F2");
  assert.strictEqual(detected, "#FAF7F2", "Deve acionar fallback quando todos os pixels das bordas forem transparentes");
});

test("4. Normalização e Validação HEX", () => {
  assert.strictEqual(isValidHexColor("#FAF7F2"), true);
  assert.strictEqual(isValidHexColor("#fff"), true);
  assert.strictEqual(isValidHexColor("#000000"), true);
  assert.strictEqual(isValidHexColor("red"), false);
  assert.strictEqual(isValidHexColor("#12345"), false);
  assert.strictEqual(isValidHexColor("#1234567"), false);

  assert.strictEqual(normalizeHexColor("#abc"), "#AABBCC");
  assert.strictEqual(normalizeHexColor("#faf7f2"), "#FAF7F2");
  assert.strictEqual(normalizeHexColor("invalid", "#E5E5E5"), "#E5E5E5");
});

test("5. Processamento Real com Sharp: Detecta cor de imagem sintética", async () => {
  // Cria imagem sintética 50x50 com Sharp com fundo bege #F4EAD4
  const testImageBuffer = await sharp({
    create: {
      width: 50,
      height: 50,
      channels: 4,
      background: { r: 244, g: 234, b: 212, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

  const { data, info } = await sharp(testImageBuffer)
    .resize(40, 40, { fit: "cover" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const detected = analyzeRawRgbaEdgePixels(data, info.width, info.height);
  assert.strictEqual(detected, "#F4EAD4", "Sharp deve processar a imagem e extrair a cor bege exata #F4EAD4");
});

// ==================== TESTES DE INTEGRAÇÃO DE ARQUIVOS ====================

test("6. Integração do Banco de Dados: SiteSettings possui os 5 campos do Hero Background", () => {
  const schemaPrisma = fs.readFileSync(path.join(__dirname, "../prisma/schema.prisma"), "utf8");
  assert.ok(schemaPrisma.includes("heroBgMode"), "SiteSettings deve conter heroBgMode");
  assert.ok(schemaPrisma.includes("heroBgDetectedColor"), "SiteSettings deve conter heroBgDetectedColor");
  assert.ok(schemaPrisma.includes("heroBgCustomColor"), "SiteSettings deve conter heroBgCustomColor");
  assert.ok(schemaPrisma.includes("heroBgStatus"), "SiteSettings deve conter heroBgStatus");
  assert.ok(schemaPrisma.includes("heroBgMediaRef"), "SiteSettings deve conter heroBgMediaRef");
});

test("7. Documentação Obrigatória do Banco: Dicionários atualizados (Regra 6)", () => {
  const dicionario = fs.readFileSync(path.join(__dirname, "../docs/DICIONARIO_DADOS.md"), "utf8");
  const guia = fs.readFileSync(path.join(__dirname, "../docs/GUIA_BANCO.md"), "utf8");
  const database = fs.readFileSync(path.join(__dirname, "../docs/DATABASE.md"), "utf8");
  const business = fs.readFileSync(path.join(__dirname, "../docs/BUSINESS_RULES.md"), "utf8");

  for (const doc of [dicionario, guia, database, business]) {
    assert.ok(doc.includes("heroBgMode"), "Documentação deve listar heroBgMode");
    assert.ok(doc.includes("heroBgDetectedColor"), "Documentação deve listar heroBgDetectedColor");
    assert.ok(doc.includes("heroBgCustomColor"), "Documentação deve listar heroBgCustomColor");
    assert.ok(doc.includes("heroBgStatus"), "Documentação deve listar heroBgStatus");
    assert.ok(doc.includes("heroBgMediaRef"), "Documentação deve listar heroBgMediaRef");
  }
});

test("8. Rota de API: /api/admin/minisite/hero-color implementada com segurança e ações", () => {
  const routeTs = fs.readFileSync(
    path.join(__dirname, "../src/app/api/admin/minisite/hero-color/route.ts"),
    "utf8"
  );
  assert.ok(routeTs.includes("requireAdmin"), "Deve validar autenticação de administrador com requireAdmin");
  assert.ok(routeTs.includes("analyze-current"), "Deve suportar ação analyze-current");
  assert.ok(routeTs.includes("analyze-frame"), "Deve suportar ação analyze-frame");
});

test("9. Rota de Upload: /api/admin/minisite/media/upload analisa cor do slot hero", () => {
  const uploadRoute = fs.readFileSync(
    path.join(__dirname, "../src/app/api/admin/minisite/media/upload/route.ts"),
    "utf8"
  );
  assert.ok(uploadRoute.includes("detectImageBackgroundColor"), "Upload deve chamar detectImageBackgroundColor");
  assert.ok(uploadRoute.includes("detectedBgColor"), "Upload deve retornar detectedBgColor");
  assert.ok(
    !uploadRoute.includes("prisma.siteSettings"),
    "Upload não deve persistir a cor diretamente: a gravação ocorre apenas no fluxo Salvar do Admin"
  );
});

test("10. Rota de Configurações de Mídia: /api/admin/minisite/media/settings persiste bgMode e cores", () => {
  const settingsRoute = fs.readFileSync(
    path.join(__dirname, "../src/app/api/admin/minisite/media/settings/route.ts"),
    "utf8"
  );
  assert.ok(settingsRoute.includes("bgMode"), "Deve ler/gravar bgMode");
  assert.ok(settingsRoute.includes("bgDetectedColor"), "Deve ler/gravar bgDetectedColor");
  assert.ok(settingsRoute.includes("bgCustomColor"), "Deve ler/gravar bgCustomColor");
  assert.ok(settingsRoute.includes("bgStatus"), "Deve ler/gravar bgStatus");
  assert.ok(settingsRoute.includes("bgMediaRef"), "Deve ler/gravar bgMediaRef");
});

test("11. Renderização no MiniSite Público: Hero aplica cor dinâmica e escopo CSS", () => {
  const pageTsx = fs.readFileSync(path.join(__dirname, "../src/app/page.tsx"), "utf8");
  assert.ok(pageTsx.includes("effectiveHeroBgColor"), "page.tsx deve calcular effectiveHeroBgColor");
  assert.ok(pageTsx.includes("--hero-background-color"), "page.tsx deve injetar CSS variable --hero-background-color");
  assert.ok(pageTsx.includes("heroBgMode"), "page.tsx deve ler heroBgMode");

  const mediaPlayer = fs.readFileSync(
    path.join(__dirname, "../src/components/minisite/media-player.tsx"),
    "utf8"
  );
  assert.ok(
    mediaPlayer.includes("--hero-background-color"),
    "MiniSiteMediaPlayer deve usar var(--hero-background-color)"
  );
});

test("12. Painel Admin: Interface com modos Automática e Personalizada, preview e reanálise", () => {
  const adminConfig = fs.readFileSync(
    path.join(__dirname, "../src/app/admin/configuracoes/page.tsx"),
    "utf8"
  );
  assert.ok(adminConfig.includes("Cor de Fundo do Hero"), "Deve renderizar o grupo Cor de Fundo do Hero");
  assert.ok(adminConfig.includes("heroBgMode"), "Deve gerenciar o estado heroBgMode");
  assert.ok(adminConfig.includes("heroBgDetectedColor"), "Deve gerenciar heroBgDetectedColor");
  assert.ok(adminConfig.includes("heroBgCustomColor"), "Deve gerenciar heroBgCustomColor");
  assert.ok(adminConfig.includes("Analisar novamente"), "Deve fornecer botão Analisar novamente");
  assert.ok(adminConfig.includes("extractAndAnalyzeVideoFrame"), "Deve implementar extração de frame de vídeo via canvas");
});
