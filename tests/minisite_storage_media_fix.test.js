const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

// ==============================================================================
// TESTES DE FIXAÇÃO: MÍDIAS DO MINISITE (HERO: TOP / SOBRE MIM: SOBRE)
// ==============================================================================

test("1. Detecção e Presença de Arquivos Reais em storage/minisite/top e sobre", () => {
  const topDir = path.join(process.cwd(), "storage", "minisite", "top");
  const sobreDir = path.join(process.cwd(), "storage", "minisite", "sobre");

  assert.strictEqual(fs.existsSync(topDir), true, "storage/minisite/top deve existir");
  assert.strictEqual(fs.existsSync(sobreDir), true, "storage/minisite/sobre deve existir");

  const topFiles = fs.readdirSync(topDir).filter(f => f.endsWith(".png"));
  const sobreFiles = fs.readdirSync(sobreDir).filter(f => f.endsWith(".png"));

  assert.strictEqual(topFiles.length >= 40, true, "storage/minisite/top deve conter ao menos 40 frames PNG");
  assert.strictEqual(sobreFiles.length >= 40, true, "storage/minisite/sobre deve conter ao menos 40 frames PNG");

  topFiles.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
  sobreFiles.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));

  assert.strictEqual(topFiles[0], "ezgif-frame-001.png");
  assert.strictEqual(topFiles[39], "ezgif-frame-040.png");

  assert.strictEqual(sobreFiles[0], "ezgif-frame-001.png");
  assert.strictEqual(sobreFiles[39], "ezgif-frame-040.png");
});

test("2. Validação e Segurança da Rota Pública de Mídia (/api/minisite/media/[...path])", () => {
  const routeFilePath = path.join(process.cwd(), "src", "app", "api", "minisite", "media", "[...path]", "route.ts");
  assert.strictEqual(fs.existsSync(routeFilePath), true, "A rota de streaming de mídia deve existir");

  const routeContent = fs.readFileSync(routeFilePath, "utf-8");

  // Verifica proteção contra Path Traversal
  assert.strictEqual(routeContent.includes("seg.includes(\"..\")"), true, "Deve barrar '..' nos segmentos");
  assert.strictEqual(routeContent.includes("!ALLOWED_SLOTS.includes(slot)"), true, "Deve validar slots estritos ('top' ou 'sobre')");
  assert.strictEqual(routeContent.includes("MIME_MAP"), true, "Deve conter mapa MIME com suporte a png, webp, mp4, etc.");
  assert.strictEqual(routeContent.includes("Cache-Control"), true, "Deve configurar cabeçalho de cache eficiente");
});

test("3. Isolamento Arquitetural em storage/minisite/{top|top-mobile|sobre}/{uploadId}/", () => {
  const libFilePath = path.join(process.cwd(), "src", "lib", "minisite-media.ts");
  const libContent = fs.readFileSync(libFilePath, "utf-8");

  assert.strictEqual(
    libContent.includes('getSlotDirectory(slot: MediaSlot): "top" | "top-mobile" | "sobre"'),
    true,
    "Deve mapear slot hero->top, hero_mobile->top-mobile e about->sobre"
  );
  assert.strictEqual(
    libContent.includes("const uploadId = `up_${Date.now()}_"),
    true,
    "Deve gerar identificador único uploadId para isolamento de uploads"
  );
  assert.strictEqual(
    libContent.includes("/api/minisite/media/${slotFolder}/${uploadId}/"),
    true,
    "Deve retornar URLs relativas seguras sem expor caminhos absolutos do servidor"
  );
});

test("4. Suporte a Ordenação Numérica Natural e Extração Segura de Frames ZIP", () => {
  const libFilePath = path.join(process.cwd(), "src", "lib", "minisite-media.ts");
  const libContent = fs.readFileSync(libFilePath, "utf-8");

  assert.strictEqual(
    libContent.includes("detectMediaTypeFromFile"),
    true,
    "Deve reconhecer automaticamente JPG, PNG, WebP, MP4, WebM e ZIP via magic bytes"
  );
  assert.strictEqual(
    libContent.includes("processZipBuffer"),
    true,
    "Deve extrair frames de arquivos ZIP de animação com segurança"
  );
  assert.strictEqual(
    libContent.includes("numeric: true, sensitivity: \"base\""),
    true,
    "Deve ordenar frames numericamente (ex: frame-001, frame-002, ..., frame-040)"
  );
});

test("5. Frontend Admin Simplificado: Três Áreas Universais sem Botões Manuais de Tipo", () => {
  const adminPagePath = path.join(process.cwd(), "src", "app", "admin", "configuracoes", "page.tsx");
  const adminContent = fs.readFileSync(adminPagePath, "utf-8");
  const cardPath = path.join(process.cwd(), "src", "components", "admin", "minisite-media-slot-card.tsx");
  const cardContent = fs.readFileSync(cardPath, "utf-8");

  assert.strictEqual(adminContent.includes('title="Hero — Desktop"'), true, "Deve exibir Hero — Desktop");
  assert.strictEqual(adminContent.includes('title="Hero — Mobile"'), true, "Deve exibir Hero — Mobile");
  assert.strictEqual(adminContent.includes('title="Sobre Mim"'), true, "Deve exibir Sobre Mim");
  assert.strictEqual(
    adminContent.includes("Frames (ZIP)") || cardContent.includes("Frames (ZIP)"),
    false,
    "Botões manuais de tipo (Frames (ZIP)) devem ter sido removidos"
  );
  assert.strictEqual(
    cardContent.includes("Envie uma imagem, vídeo ou animação ZIP (JPG, PNG, WebP, MP4, WebM ou ZIP)."),
    true,
    "Deve exibir exatamente a mensagem de formatos aceitos"
  );
  assert.strictEqual(cardContent.includes("Velocidade"), true, "Deve conter seletor compacto de Velocidade");
});

test("6. MiniSite Público: Hero e Sobre Mim Conectados com Fallback Automático", () => {
  const homePagePath = path.join(process.cwd(), "src", "app", "page.tsx");
  const homeContent = fs.readFileSync(homePagePath, "utf-8");

  assert.strictEqual(homeContent.includes("detectExistingFrames"), true, "Deve importar e usar detectExistingFrames");
  assert.strictEqual(homeContent.includes("await detectExistingFrames(\"hero\")"), true, "Fallback dinâmico para hero");
  assert.strictEqual(homeContent.includes("await detectExistingFrames(\"about\")"), true, "Fallback dinâmico para about");

  // Props passadas ao MiniSiteMediaPlayer
  assert.strictEqual(homeContent.includes("mediaType={heroMediaType}"), true, "Deve passar heroMediaType");
  assert.strictEqual(homeContent.includes("frames={heroFrames}"), true, "Deve passar heroFrames");
  assert.strictEqual(homeContent.includes("mediaType={aboutMediaType}"), true, "Deve passar aboutMediaType");
  assert.strictEqual(homeContent.includes("frames={aboutFrames}"), true, "Deve passar aboutFrames");
});

test("7. MiniSiteMediaPlayer: Suporte a Transparência, Canvas e Movimento Reduzido", () => {
  const playerPath = path.join(process.cwd(), "src", "components", "minisite", "media-player.tsx");
  const playerContent = fs.readFileSync(playerPath, "utf-8");

  assert.strictEqual(playerContent.includes("ctx.clearRect(0, 0, canvas.width, canvas.height)"), true, "Deve limpar canvas com transparência");
  assert.strictEqual(playerContent.includes("ctx.drawImage(img, 0, 0)"), true, "Deve desenhar imagem com canal alfa");
  assert.strictEqual(playerContent.includes("prefers-reduced-motion"), true, "Deve respeitar acessibilidade de movimento reduzido");
  assert.strictEqual(playerContent.includes("IntersectionObserver"), true, "Deve pausar render quando fora do viewport");
});
