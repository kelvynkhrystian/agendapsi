const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("1. Sobre Mim (#sobre) remove proporção fixa aspect-4/3 quando há mídia e limita altura em até 500px", () => {
  const pageSrc = fs.readFileSync(
    path.join(process.cwd(), "src", "app", "page.tsx"),
    "utf-8"
  );

  // Calcula dimensões intrínsecas locais da mídia de Sobre Mim
  assert.ok(
    pageSrc.includes("hasAboutMedia") &&
      pageSrc.includes("aboutDimensions = hasAboutMedia") &&
      pageSrc.includes("getLocalMediaDimensions(aboutDimensionsSource)"),
    "page.tsx deve resolver intrinsic dimensions do slot about"
  );

  // Wrapper do slot Sobre Mim usa max-h-[500px] sem aspect-4/3 quando há mídia configurada
  const sobreSectionStart = pageSrc.indexOf('id="sobre"');
  const sobreSectionEnd = pageSrc.indexOf("</section>", sobreSectionStart);
  const sobreBlock = pageSrc.slice(sobreSectionStart, sobreSectionEnd);

  assert.ok(sobreBlock.includes('id="sobre-media"'), "Deve preservar #sobre-media");
  assert.ok(sobreBlock.includes('id="sobre-content"'), "Deve preservar #sobre-content");
  assert.ok(
    sobreBlock.includes('hasAboutMedia ? "max-h-[500px]" : "aspect-4/3"'),
    "Não deve forçar aspect-4/3 quando houver mídia no Sobre Mim, aplicando max-h-[500px]"
  );
  assert.ok(
    sobreBlock.includes("intrinsicWidth={aboutDimensions?.width}") &&
      sobreBlock.includes("intrinsicHeight={aboutDimensions?.height}"),
    "Deve repassar intrinsicWidth e intrinsicHeight ao MiniSiteMediaPlayer do slot about"
  );
  assert.ok(
    sobreBlock.includes('md:flex-row items-center') &&
      sobreBlock.includes("md:w-5/12") &&
      sobreBlock.includes("md:w-7/12"),
    "Deve preservar layout em duas colunas no desktop e empilhado no mobile"
  );
});

test("2. MiniSiteMediaPlayer aplica object-contain e max-h-[500px] sem recortes para Imagem, Vídeo e ZIP no slot about", () => {
  const playerSrc = fs.readFileSync(
    path.join(process.cwd(), "src", "components", "minisite", "media-player.tsx"),
    "utf-8"
  );

  assert.ok(
    playerSrc.includes('const isPublicAbout = !previewMode && slot === "about"'),
    "Deve isolar comportamento público do slot about"
  );
  assert.ok(
    playerSrc.includes('if (previewMode || slot === "about") return "object-contain object-center"'),
    "getObjectFitClass deve garantir object-contain no slot about"
  );
  assert.ok(
    playerSrc.includes('"w-auto h-auto max-w-full max-h-[500px] block object-contain object-center"'),
    "Mídia pública de Sobre Mim deve usar w-auto h-auto max-w-full max-h-[500px] object-contain"
  );
  assert.ok(
    playerSrc.includes("const activeAspectStyle = isPublicAbout ? aboutAspectStyle : heroAspectStyle;"),
    "Deve aplicar aspectRatio intrínseco para Imagem, Vídeo e Canvas/ZIP sem deformação"
  );
  assert.ok(
    playerSrc.includes("style={activeAspectStyle}") &&
      playerSrc.includes('style={{ display: "block", ...(activeAspectStyle || {}) }}'),
    "Vídeo, imagem e canvas devem compartilhar activeAspectStyle mantendo compatibilidade com ZIP e MP4/WebM"
  );
});

test("3. Preservação estrita do preview do Admin, Hero Desktop e Hero Mobile", () => {
  const playerSrc = fs.readFileSync(
    path.join(process.cwd(), "src", "components", "minisite", "media-player.tsx"),
    "utf-8"
  );

  assert.ok(
    playerSrc.includes('? "w-full h-full object-contain"\n'),
    "previewMode no painel Admin permanece inalterado"
  );
  assert.ok(
    playerSrc.includes("hero-mobile-enlarged-media lg:object-cover"),
    "Hero Desktop/Mobile preserva regras próprias independentes de Sobre Mim"
  );
});
