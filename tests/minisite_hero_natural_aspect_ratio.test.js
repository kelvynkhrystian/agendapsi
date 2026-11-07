const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

test("Hero Media: Remoção de formato Stories rígido e adoção de proporção natural", () => {
  const pagePath = path.join(process.cwd(), "src", "app", "page.tsx");
  const pageContent = fs.readFileSync(pagePath, "utf-8");

  // 1. Não deve conter classes de aspecto rígido 9/16 ou alturas fixas no container de mídia do Hero
  assert.strictEqual(
    pageContent.includes("aspect-[9/16]"),
    false,
    "Não deve conter aspect-[9/16] forçado no Hero"
  );
  assert.strictEqual(
    pageContent.includes("h-[380px]"),
    false,
    "Não deve conter altura fixa h-[380px]"
  );
  assert.strictEqual(
    pageContent.includes("md:h-[500px]"),
    false,
    "Não deve conter altura fixa md:h-[500px]"
  );

  // 2. Não deve conter molduras, bordas ou sombras artificiais no Hero
  assert.strictEqual(
    pageContent.includes("rounded-2xl sm:rounded-3xl flex items-center justify-center overflow-hidden transition-all duration-300 shadow-md"),
    false,
    "Não deve conter moldura com bordas arredondadas e sombra artificial em torno da mídia"
  );

  // 3. O container #hero-media-container deve existir para animações GSAP e usar proporções naturais e full-width
  assert.ok(
    pageContent.includes('id="hero-media-container"'),
    "Deve manter o seletor #hero-media-container para GSAP"
  );
  assert.ok(
    pageContent.includes('id="inicio"\n        className="relative pt-20 sm:pt-24 md:pt-28 lg:pt-32 pb-16 px-0') ||
    pageContent.includes('px-0 overflow-hidden'),
    "Seção Hero deve ter px-0 para permitir 100% de largura sem bordas brancas"
  );
  assert.ok(
    pageContent.includes('className="w-full h-auto'),
    "MiniSiteMediaPlayer no Hero deve ter w-full e h-auto"
  );
});

test("Hero Media: MiniSiteMediaPlayer com suporte a proporção natural para Imagem, Vídeo e ZIP Frames", () => {
  const playerPath = path.join(process.cwd(), "src", "components", "minisite", "media-player.tsx");
  const playerContent = fs.readFileSync(playerPath, "utf-8");

  // 1. Suporte dinâmico a videoAspectRatio e detecção de dimensões intrínsecas
  assert.ok(
    playerContent.includes("videoAspectRatio") || playerContent.includes("handleVideoMetadata"),
    "Deve detectar e aplicar a proporção nativa do vídeo"
  );
  assert.ok(
    playerContent.includes("onLoadedMetadata"),
    "Vídeo deve escutar onLoadedMetadata para capturar dimensões intrínsecas"
  );

  // 2. Suporte dinâmico a frameAspectRatio em animações ZIP
  assert.ok(
    playerContent.includes("frameAspectRatio") || playerContent.includes("setFrameAspectRatio"),
    "Deve calcular o aspect ratio do primeiro frame da animação ZIP"
  );

  // 3. Suporte a Canvas de Alta Resolução com devicePixelRatio
  assert.ok(
    playerContent.includes("devicePixelRatio"),
    "Canvas deve tratar devicePixelRatio para nitidez em telas de alta densidade"
  );

  // 4. Imagem estática com w-full h-auto e transparência
  assert.ok(
    playerContent.includes("w-full h-auto"),
    "Mídia no Hero deve usar w-full h-auto sem altura fixa"
  );

  // 5. Preservação de atributos essenciais de vídeo
  assert.ok(
    playerContent.includes("playsInline") && playerContent.includes("autoPlay") && playerContent.includes("muted"),
    "Vídeo deve preservar playsInline, autoPlay e muted"
  );

  // 6. Limpeza de canvas com transparência
  assert.ok(
    playerContent.includes("ctx.clearRect(0, 0, canvas.width, canvas.height)"),
    "Canvas deve preservar transparência do canal alfa"
  );
});

test("Hero Media: GSAP e layout fluido sem overflow horizontal", () => {
  const pagePath = path.join(process.cwd(), "src", "app", "page.tsx");
  const pageContent = fs.readFileSync(pagePath, "utf-8");
  const controllerPath = path.join(process.cwd(), "src", "components", "minisite", "motion-controller.tsx");
  const controllerContent = fs.readFileSync(controllerPath, "utf-8");

  // GSAP Controller anima #hero-media-container
  assert.ok(
    controllerContent.includes("#hero-media-container"),
    "GSAP deve animar #hero-media-container"
  );
  assert.ok(
    controllerContent.includes('clearProps: "all"'),
    "GSAP deve limpar propriedades inline após entrada"
  );

  // Proteção contra overflow horizontal
  assert.ok(
    pageContent.includes("overflow-x-hidden"),
    "Página raiz do MiniSite deve conter overflow-x-hidden"
  );
  assert.ok(
    pageContent.includes("overflow-hidden"),
    "Seção Hero deve conter overflow-hidden para prevenir barras de rolagem"
  );
});
