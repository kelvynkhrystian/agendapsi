const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

test("1. Remoção completa de zoom/scale inicial na mídia do Hero", () => {
  const controllerPath = path.join(process.cwd(), "src", "components", "minisite", "motion-controller.tsx");
  const src = fs.readFileSync(controllerPath, "utf-8");

  // Extrai bloco exclusivo da timeline heroTl (antes do ScrollTrigger parallax)
  const timelineBlockMatch = src.match(/const heroTl = gsap\.timeline[\s\S]*?(?=const mm = gsap\.matchMedia)/);
  assert.ok(timelineBlockMatch, "Timeline heroTl deve existir em MiniSiteMotionController");
  const timelineBlock = timelineBlockMatch[0];

  assert.strictEqual(
    timelineBlock.includes("#hero-media-container") && timelineBlock.includes("scale:"),
    false,
    "heroTl não deve animar scale de #hero-media-container"
  );
  assert.strictEqual(
    timelineBlock.includes('from("#hero-media-container"') || timelineBlock.includes('fromTo(\n        "#hero-media-container"') || timelineBlock.includes('fromTo("#hero-media-container"'),
    false,
    "heroTl não deve conter tween algum direcionado a #hero-media-container"
  );
  assert.strictEqual(
    timelineBlock.includes('from("#hero-bg-leaves"'),
    false,
    "heroTl não deve conter scale(0.8) em #hero-bg-leaves"
  );

  // O CSS anti-flash também jamais pode ocultar #hero-media-container
  const globalsCss = fs.readFileSync(path.join(process.cwd(), "src", "app", "globals.css"), "utf-8");
  assert.strictEqual(
    globalsCss.includes("hero-anim-pending #hero-media-container"),
    false,
    "hero-anim-pending nunca deve ocultar #hero-media-container"
  );
});

test("2. Ordem estrita da timeline GSAP coordenada (1 Header -> 2 CRP -> 3 Nome -> 4 Especialidade -> 5 Descrição -> 6 CTAs -> 7 Benefícios)", () => {
  const controllerPath = path.join(process.cwd(), "src", "components", "minisite", "motion-controller.tsx");
  const src = fs.readFileSync(controllerPath, "utf-8");

  const timelineBlockMatch = src.match(/const heroTl = gsap\.timeline[\s\S]*?(?=rootEl\?\.classList\.remove\("hero-anim-pending"\))/);
  assert.ok(timelineBlockMatch, "Bloco completo da timeline heroTl deve existir");
  const tl = timelineBlockMatch[0];

  const orderedSelectors = [
    "#hero-header-logo",
    "#hero-badge",
    "#hero-name",
    "#hero-title",
    "#hero-subtitle",
    "#hero-cta",
    "#hero-benefits",
  ];

  let prevIndex = -1;
  for (const selector of orderedSelectors) {
    const idx = tl.indexOf(selector);
    assert.ok(idx > prevIndex, `Elemento ${selector} deve aparecer na ordem coordenada da timeline (posição ${idx} > ${prevIndex})`);
    prevIndex = idx;
  }

  // Todos os elementos entram exclusivamente de BAIXO para CIMA (y > 0 -> y: 0)
  const yFromMatches = [...tl.matchAll(/\{\s*y:\s*(-?\d+),\s*opacity:\s*0\s*\}/g)].map((m) => Number(m[1]));
  assert.ok(yFromMatches.length >= 7, "Todas as 7 etapas do Hero devem iniciar com deslocamento vertical inicial");
  for (const yVal of yFromMatches) {
    assert.ok(yVal > 0 && yVal <= 40, `Deslocamento inicial deve ser sutil e de baixo para cima (recebido y: ${yVal})`);
  }
});

test("3. Descrição do Hero (#hero-subtitle) animada como bloco único após a especialidade", () => {
  const pageSrc = fs.readFileSync(path.join(process.cwd(), "src", "app", "page.tsx"), "utf-8");
  const controllerSrc = fs.readFileSync(path.join(process.cwd(), "src", "components", "minisite", "motion-controller.tsx"), "utf-8");

  assert.ok(
    pageSrc.includes('<p id="hero-subtitle"'),
    "page.tsx deve manter <p id=\"hero-subtitle\"> como bloco único sem dividir palavras em spans"
  );
  assert.ok(
    controllerSrc.includes('"#hero-subtitle"'),
    "MiniSiteMotionController deve animar #hero-subtitle"
  );
  assert.ok(
    controllerSrc.indexOf('"#hero-title"') < controllerSrc.indexOf('"#hero-subtitle"'),
    "#hero-subtitle deve animar imediatamente após #hero-title (Especialidade)"
  );
});

test("4. Separação entre entrada do Hero e ScrollTrigger Parallax (Desktop) + comportamento Mobile abaixo da dobra", () => {
  const controllerSrc = fs.readFileSync(path.join(process.cwd(), "src", "components", "minisite", "motion-controller.tsx"), "utf-8");

  assert.ok(controllerSrc.includes("gsap.matchMedia()"), "Parallax desktop deve usar gsap.matchMedia isolado");
  assert.ok(controllerSrc.includes('mm.add("(min-width: 1024px)"'), "Parallax no Hero deve ser isolado ao breakpoint desktop >= 1024px");
  assert.ok(controllerSrc.includes("#hero-parallax-layer") && controllerSrc.includes("yPercent: 12"), "Scroll parallax deve ser preservado");
  assert.ok(controllerSrc.includes("isHeroElementBelowMobileFold"), "Deve tratar elementos do Hero abaixo da dobra no mobile com ScrollTrigger");
  assert.ok(controllerSrc.includes("once: true"), "ScrollTriggers de entrada do Hero no mobile não devem reiniciar a cada scroll");
});

test("5. Preservação de dimensões intrínsecas de mídia (zero resize no carregamento de metadados) e acessibilidade reduced-motion", () => {
  const mediaLibSrc = fs.readFileSync(path.join(process.cwd(), "src", "lib", "minisite-media.ts"), "utf-8");
  const playerSrc = fs.readFileSync(path.join(process.cwd(), "src", "components", "minisite", "media-player.tsx"), "utf-8");
  const globalsCss = fs.readFileSync(path.join(process.cwd(), "src", "app", "globals.css"), "utf-8");

  assert.ok(mediaLibSrc.includes("export async function getLocalMediaDimensions"), "Helper getLocalMediaDimensions deve existir para leitura segura no servidor");
  assert.ok(playerSrc.includes("intrinsicWidth") && playerSrc.includes("intrinsicHeight"), "MiniSiteMediaPlayer deve receber intrinsicWidth/intrinsicHeight para estabilizar layout mobile antes dos metadados");
  assert.ok(playerSrc.includes("isImagePoster"), "MiniSiteMediaPlayer deve ignorar poster URLs que apontam para arquivos de vídeo");
  assert.ok(globalsCss.includes("@media (prefers-reduced-motion: no-preference)"), "Classe anti-flash só pode agir quando prefers-reduced-motion não está ativo");

  const layoutSrc = fs.readFileSync(path.join(process.cwd(), "src", "app", "layout.tsx"), "utf-8");
  const headSection = layoutSrc.split("<body")[0];
  assert.ok(headSection.includes("psi-hero-anim-prep") && headSection.includes("hero-anim-pending"), "Script anti-flash deve executar sincronamente no <head> antes do primeiro paint do <body>");
});
