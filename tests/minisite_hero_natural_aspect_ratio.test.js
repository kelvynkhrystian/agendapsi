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
    controllerContent.includes('clearProps: "transform,opacity"'),
    "GSAP deve limpar transform/opacity da mídia do Hero após a entrada (opacidade final = 1)"
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

test("Hero Desktop Redesign: Mídia como background absoluto, sobreposição gradiente e alinhamento à esquerda", () => {
  const pagePath = path.join(process.cwd(), "src", "app", "page.tsx");
  const pageContent = fs.readFileSync(pagePath, "utf-8");
  const playerPath = path.join(process.cwd(), "src", "components", "minisite", "media-player.tsx");
  const playerContent = fs.readFileSync(playerPath, "utf-8");

  // 1. #hero-media-container como background absoluto no desktop (lg:absolute lg:inset-0 lg:w-full lg:h-full)
  assert.ok(
    pageContent.includes("lg:absolute lg:inset-0 lg:w-full lg:h-full lg:z-0 lg:overflow-hidden"),
    "#hero-media-container deve expandir como background absoluto no desktop"
  );

  // 2. Mídia sem sobreposição lateral na direita, com gradiente vertical sutil apenas na base (inferior 15-25%)
  assert.ok(
    !pageContent.includes("hidden lg:block absolute inset-0 z-[1] pointer-events-none"),
    "Não deve existir sobreposição gradiente cobrindo o corpo ou lado direito da mídia no desktop"
  );
  assert.ok(
    !pageContent.includes("linear-gradient(to right") && !pageContent.includes("bg-gradient-to-r"),
    "Não deve existir gradiente horizontal desbotando a mídia para a direita"
  );
  assert.ok(
    pageContent.includes("id=\"hero-bottom-gradient\""),
    "Deve conter elemento de gradiente inferior para conexão suave com a próxima seção"
  );
  assert.ok(
    pageContent.includes("bg-gradient-to-t from-white"),
    "Gradiente inferior deve transicionar suavemente em direção ao fundo da seção seguinte (white)"
  );

  // 3. Camada Parallax dedicada e integração GSAP ScrollTrigger
  assert.ok(
    pageContent.includes("id=\"hero-parallax-layer\""),
    "Deve conter #hero-parallax-layer com bleed vertical para movimento sem frestas"
  );
  const controllerPath = path.join(process.cwd(), "src", "components", "minisite", "motion-controller.tsx");
  const controllerContent = fs.readFileSync(controllerPath, "utf-8");
  assert.ok(
    controllerContent.includes("#hero-parallax-layer") && controllerContent.includes("yPercent: 12"),
    "GSAP Motion Controller deve aplicar parallax de ~12% com ScrollTrigger em #hero-parallax-layer"
  );

  // 3. Alinhamento à esquerda no desktop com margem de 7-8vw e largura máxima de 500-650px
  assert.ok(
    pageContent.includes("lg:pl-[7vw] xl:pl-[8vw]"),
    "Conteúdo e badge do Hero devem alinhar à esquerda com 7-8vw de recuo no desktop"
  );
  assert.ok(
    pageContent.includes("lg:max-w-xl xl:max-w-2xl"),
    "Coluna de conteúdo deve ter largura máxima controlada no desktop"
  );
  assert.ok(
    pageContent.includes("lg:items-start") && pageContent.includes("lg:text-left"),
    "Conteúdo deve estar alinhado estritamente à esquerda no desktop"
  );

  // 4. Benefícios organizados abaixo dos botões e horizontalmente no desktop
  assert.ok(
    pageContent.includes("lg:flex lg:flex-row lg:items-start lg:justify-start lg:gap-6") ||
    pageContent.includes("lg:flex lg:flex-row lg:items-start lg:justify-start"),
    "Benefícios devem formar linha horizontal alinhada à esquerda no desktop"
  );

  // 5. MiniSiteMediaPlayer adaptado para cover absoluto no desktop sem duplicar DOM
  assert.ok(
    playerContent.includes("lg:object-cover"),
    "MiniSiteMediaPlayer deve aplicar object-cover no desktop"
  );
  assert.ok(
    playerContent.includes("lg:h-full lg:w-full lg:absolute lg:inset-0"),
    "MiniSiteMediaPlayer deve preencher 100% da área como background absoluto no desktop"
  );
});

