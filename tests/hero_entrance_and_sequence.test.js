const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

test("1. Remoção completa de zoom/scale inicial na mídia do Hero", () => {
  const controllerPath = path.join(process.cwd(), "src", "components", "minisite", "motion-controller.tsx");
  const src = fs.readFileSync(controllerPath, "utf-8");

  // Timeline heroTl não deve animar ou escalar a mídia do Hero
  const timelineBlockMatch = src.match(/const heroTl = gsap\.timeline[\s\S]*?(?=const mm = gsap\.matchMedia)/);
  assert.ok(timelineBlockMatch, "Timeline heroTl deve existir em MiniSiteMotionController");
  const timelineBlock = timelineBlockMatch[0];

  assert.strictEqual(
    timelineBlock.includes("#hero-media-container") && timelineBlock.includes("scale:"),
    false,
    "heroTl não deve animar scale de #hero-media-container"
  );
  assert.strictEqual(
    timelineBlock.includes('from("#hero-media-container"') ||
      timelineBlock.includes('fromTo(\n        "#hero-media-container"') ||
      timelineBlock.includes('fromTo("#hero-media-container"'),
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

test("2. Ordem estrita da timeline coordenada (1 Header -> 2 CRP -> 3 Nome -> 4 Especialidade -> 5 Descrição -> 6 CTAs -> 7 Benefícios)", () => {
  const controllerPath = path.join(process.cwd(), "src", "components", "minisite", "motion-controller.tsx");
  const src = fs.readFileSync(controllerPath, "utf-8");

  const sequenceBlockMatch = src.match(/const heroTl = gsap\.timeline[\s\S]*?(?=rootEl\?\.classList\.remove\("hero-anim-pending"\))/);
  assert.ok(sequenceBlockMatch, "Bloco completo da sequência Hero deve existir");
  const tl = sequenceBlockMatch[0];

  const orderedHeaderAndBadge = ["1 — HEADER", "2 — BADGE CRP/CRM"];
  let prevIdx = -1;
  for (const label of orderedHeaderAndBadge) {
    const idx = tl.indexOf(label, prevIdx + 1);
    assert.ok(idx > prevIdx, `Etapa '${label}' deve aparecer na ordem coordenada da sequência Hero`);
    prevIdx = idx;
  }

  // Ramo desktop / mobile acima da dobra (else)
  const afterBranch = tl.split("if (deferHeroTextToMobileScroll)")[1];
  const [mobileBranch, desktopBranch] = afterBranch.split("\n    } else {\n");
  assert.ok(mobileBranch && desktopBranch, "Ramos mobile e desktop devem estar claramente delimitados");

  const desktopOrderedSteps = [
    "3 — NOME PROFISSIONAL",
    "4 — ESPECIALIDADE",
    "5 — DESCRIÇÃO",
    "6 — BOTÕES DE AÇÃO HERO",
    "7 — ITENS DE BENEFÍCIO",
  ];
  let desktopPrev = -1;
  for (const label of desktopOrderedSteps) {
    const idx = desktopBranch.indexOf(label, desktopPrev + 1);
    assert.ok(idx > desktopPrev, `Desktop: etapa '${label}' deve manter ordem estrita da timeline`);
    desktopPrev = idx;
  }

  // Ramo mobile abaixo da dobra (ScrollTrigger)
  const mobileOrderedSteps = [
    "3 — NOME PROFISSIONAL",
    "4 — ESPECIALIDADE",
    "5 — DESCRIÇÃO",
    "6 — BOTÕES CTA",
    "7 — ITENS DE BENEFÍCIO",
  ];
  let mobilePrev = -1;
  for (const label of mobileOrderedSteps) {
    const idx = mobileBranch.indexOf(label, mobilePrev + 1);
    assert.ok(idx > mobilePrev, `Mobile ScrollTrigger: etapa '${label}' deve manter ordem estrita`);
    mobilePrev = idx;
  }

  // Entradas espaciais do Hero vêm de baixo para cima (y > 0 ou yPercent > 0)
  const yFromMatches = [...tl.matchAll(/\{\s*y:\s*(-?\d+),\s*opacity:\s*0\s*\}/g)].map((m) => Number(m[1]));
  assert.ok(yFromMatches.length >= 4, "Header, CRP, CTAs e Benefícios devem animar de baixo para cima (y > 0)");
  for (const yVal of yFromMatches) {
    assert.ok(yVal > 0 && yVal <= 40, `Deslocamento inicial deve ser sutil e de baixo para cima (recebido y: ${yVal})`);
  }
});

test("3. Nome profissional (#hero-name): Typewriter GSAP TextPlugin, cursor piscante, acessibilidade e reserva de layout", () => {
  const gsapLib = fs.readFileSync(path.join(process.cwd(), "src", "lib", "animation", "gsap.ts"), "utf-8");
  const pageSrc = fs.readFileSync(path.join(process.cwd(), "src", "app", "page.tsx"), "utf-8");
  const cssSrc = fs.readFileSync(path.join(process.cwd(), "src", "app", "globals.css"), "utf-8");
  const controllerSrc = fs.readFileSync(path.join(process.cwd(), "src", "components", "minisite", "motion-controller.tsx"), "utf-8");

  assert.ok(gsapLib.includes('from "gsap/TextPlugin"'), "gsap.ts deve importar TextPlugin");
  assert.ok(gsapLib.includes('from "gsap/SplitText"'), "gsap.ts deve importar SplitText");
  assert.ok(gsapLib.includes("registerPlugin(ScrollTrigger, SplitText, TextPlugin, useGSAP)"), "Plugins GSAP devem ser registrados no cliente");
  assert.ok(gsapLib.includes("computeTypewriterDuration") && gsapLib.includes("Intl.Segmenter"), "Duração do Typewriter deve adaptar ao comprimento respeitando acentuação Unicode");
  assert.ok(gsapLib.includes("Math.min(1.8, Math.max(1.3"), "Duração do Typewriter deve permanecer entre ~1.3s e 1.8s");

  // HTML semântico acessível e camada visual isolada no Hero (zero hardcode de nome)
  assert.ok(pageSrc.includes('<h1\n                id="hero-name"') || pageSrc.includes('id="hero-name"'), "page.tsx deve renderizar h1#hero-name");
  assert.ok(pageSrc.includes('<span className="sr-only">{professionalName}</span>'), "Nome completo deve permanecer acessível para leitores de tela");
  assert.ok(pageSrc.includes('<span id="hero-name-text" aria-hidden="true">'), "Camada visual animada não deve duplicar leitura para leitores de tela");
  assert.strictEqual(controllerSrc.includes("Rômulo Mafra"), false, "Controlador de movimento não deve fixar nome hardcoded");

  // Uso do TextPlugin com newClass/oldClass para reservar largura e quebras finais durante a digitação
  assert.ok(controllerSrc.includes('newClass: "hero-typewriter-revealed"'), "Deve revelar caracteres progressivamente mantendo layout reservado");
  assert.ok(controllerSrc.includes('oldClass: "hero-typewriter-unrevealed"'), "Caracteres ainda não digitados devem ocupar espaço reservado sem saltos de linha");
  assert.ok(cssSrc.includes("visibility: hidden;") && cssSrc.includes("visibility: visible;"), "CSS do Typewriter deve preservar dimensões finais sem saltos");
  assert.ok(cssSrc.includes("heroTypewriterCursorBlink") && cssSrc.includes("heroTypewriterCursorFadeOut"), "Cursor fino deve piscar durante digitação e desaparecer suavemente ao finalizar");
  assert.ok(
    cssSrc.includes("hero-typewriter-revealed::after") && cssSrc.includes("position: absolute;"),
    "Cursor do Typewriter deve usar position: absolute estático para evitar quebras de linha em nomes longos"
  );
});

test("4. Especialidade (#hero-title) e Descrição (#hero-subtitle): SplitText words + mask lines com autoSplit e limpeza", () => {
  const controllerSrc = fs.readFileSync(path.join(process.cwd(), "src", "components", "minisite", "motion-controller.tsx"), "utf-8");

  // Especialidade palavra por palavra (~15-20px, ~0.5s) após o Typewriter
  assert.ok(controllerSrc.includes('type: "words"'), "Especialidade deve utilizar SplitText palavra por palavra");
  assert.ok(controllerSrc.includes("specialtySplit.words"), "Animação da especialidade deve atingir cada palavra individualmente");
  assert.ok(controllerSrc.includes("{ y: 18, opacity: 0 }") && controllerSrc.includes("duration: 0.5"), "Palavras da especialidade devem entrar suavemente de baixo para cima em ~0.5s");
  assert.ok(controllerSrc.includes("const specialtyStartTime = nameTween ? nameStartTime + typewriterDuration : nameStartTime"), "Especialidade só deve iniciar após a conclusão do Typewriter do nome");

  // Descrição linha a linha mascarada com autoSplit e revert seguro
  assert.ok(controllerSrc.includes('type: "lines"') && controllerSrc.includes('mask: "lines"'), "Descrição deve utilizar SplitText com máscara linha a linha");
  assert.ok(controllerSrc.includes("autoSplit: true") && controllerSrc.includes("onSplit:"), "Descrição deve usar re-split responsivo autoSplit do SplitText");
  assert.ok(controllerSrc.includes("yPercent: 105") && controllerSrc.includes("duration: 0.6"), "Linhas da descrição devem surgir suavemente de baixo para cima em ~0.6s");
  assert.ok(controllerSrc.includes("specialtySplit?.revert()") && controllerSrc.includes("subtitleSplit?.revert()"), "SplitText deve restaurar o DOM original no cleanup");
});

test("5. Separação Desktop vs Mobile ScrollTrigger, Parallax e Reduced Motion", () => {
  const controllerSrc = fs.readFileSync(path.join(process.cwd(), "src", "components", "minisite", "motion-controller.tsx"), "utf-8");
  const globalsCss = fs.readFileSync(path.join(process.cwd(), "src", "app", "globals.css"), "utf-8");
  const layoutSrc = fs.readFileSync(path.join(process.cwd(), "src", "app", "layout.tsx"), "utf-8");

  assert.ok(controllerSrc.includes("gsap.matchMedia()"), "Parallax desktop deve usar gsap.matchMedia isolado");
  assert.ok(controllerSrc.includes('mm.add("(min-width: 1024px)"'), "Parallax no Hero deve ser isolado ao breakpoint desktop >= 1024px");
  assert.ok(controllerSrc.includes("#hero-parallax-layer") && controllerSrc.includes("yPercent: 12"), "Scroll parallax deve ser preservado");
  assert.ok(controllerSrc.includes("deferHeroTextToMobileScroll") && controllerSrc.includes("mobileHeroTextTl"), "Mobile abaixo da dobra deve iniciar sequência textual via ScrollTrigger ao entrar na viewport");
  assert.ok(controllerSrc.includes("once: true"), "ScrollTriggers de entrada do Hero no mobile devem executar apenas uma vez");
  assert.ok(controllerSrc.includes("if (isReducedMotion()) return;"), "Reduced motion deve interromper animações e manter conteúdo estático visível");
  assert.ok(globalsCss.includes("@media (prefers-reduced-motion: reduce)") && globalsCss.includes("display: none !important;"), "Cursor e ocultações devem ser desativados sob prefers-reduced-motion: reduce");

  const headSection = layoutSrc.split("<body")[0];
  assert.ok(headSection.includes("psi-hero-anim-prep") && headSection.includes("hero-anim-pending"), "Script anti-flash deve executar sincronamente no <head>");
});

test("6. Preservação de dimensões intrínsecas de mídia (zero resize no carregamento de metadados)", () => {
  const mediaLibSrc = fs.readFileSync(path.join(process.cwd(), "src", "lib", "minisite-media.ts"), "utf-8");
  const playerSrc = fs.readFileSync(path.join(process.cwd(), "src", "components", "minisite", "media-player.tsx"), "utf-8");

  assert.ok(mediaLibSrc.includes("export async function getLocalMediaDimensions"), "Helper getLocalMediaDimensions deve existir para leitura segura no servidor");
  assert.ok(playerSrc.includes("intrinsicWidth") && playerSrc.includes("intrinsicHeight"), "MiniSiteMediaPlayer deve receber intrinsicWidth/intrinsicHeight para estabilizar layout mobile");
  assert.ok(playerSrc.includes("isImagePoster"), "MiniSiteMediaPlayer deve ignorar poster URLs que apontam para arquivos de vídeo");
});
