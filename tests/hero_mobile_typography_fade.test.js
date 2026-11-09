const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("1. Bottom fade mobile na mídia do Hero (#hero-mobile-bottom-fade): suave nos 15–25% inferiores sem afetar desktop", () => {
  const pageSrc = fs.readFileSync(path.join(process.cwd(), "src", "app", "page.tsx"), "utf-8");

  assert.ok(pageSrc.includes('id="hero-mobile-bottom-fade"'), "Hero media mobile deve possuir camada de degradê inferior");
  const fadeSnippet = pageSrc.split('id="hero-mobile-bottom-fade"')[1].slice(0, 420);
  assert.ok(
    fadeSnippet.includes("block lg:hidden") && fadeSnippet.includes("inset-x-0") && fadeSnippet.includes("h-[22%]"),
    "Degradê inferior deve aplicar apenas no mobile (< lg) nos ~22% inferiores (faixa 15–25%)"
  );
  assert.ok(
    fadeSnippet.includes("linear-gradient(to bottom") && fadeSnippet.includes("mobileHeroBgRgb"),
    "Degradê deve fundir gradualmente com a cor real de fundo do Hero mobile"
  );
  assert.ok(
    pageSrc.includes("hexToRgbTriplet"),
    "Deve derivar canais RGB dinamicamente da cor de fundo configurada/detectada"
  );
});

test("2. Tipografia Mobile: Playfair Display Italic no nome (+10–15%), Manrope na especialidade (+10–15%) e zero contorno/stroke", () => {
  const layoutSrc = fs.readFileSync(path.join(process.cwd(), "src", "app", "layout.tsx"), "utf-8");
  const globalsCss = fs.readFileSync(path.join(process.cwd(), "src", "app", "globals.css"), "utf-8");
  const pageSrc = fs.readFileSync(path.join(process.cwd(), "src", "app", "page.tsx"), "utf-8");

  // Carregamento oficial via next/font/google
  assert.ok(
    layoutSrc.includes("Playfair_Display") && layoutSrc.includes("--font-playfair"),
    "layout.tsx deve carregar Playfair_Display via next/font/google com variável --font-playfair"
  );
  assert.ok(
    layoutSrc.includes("Manrope") && layoutSrc.includes("--font-manrope"),
    "layout.tsx deve carregar Manrope via next/font/google com variável --font-manrope"
  );

  // Escopo isolado ao mobile mantendo desktop (>= 1024px) idêntico
  assert.ok(
    globalsCss.includes(".hero-name-font") &&
      globalsCss.includes("--font-playfair") &&
      globalsCss.includes("@media (min-width: 1024px)"),
    "Playfair Display deve aplicar no Hero mobile e preservar a fonte desktop em >= 1024px"
  );
  assert.ok(
    globalsCss.includes("@media (max-width: 1023px)") && globalsCss.includes(".hero-specialty-font") && globalsCss.includes("--font-manrope"),
    "Manrope deve aplicar exclusivamente na especialidade mobile (< 1024px)"
  );

  // Remoção estrita de contorno/outline e aumento proporcional ~10–15% no mobile mantendo desktop lg:text-5xl xl:text-6xl
  assert.equal(globalsCss.includes(".hero-name-outline"), false, "CSS de contorno .hero-name-outline deve ser removido");
  assert.equal(globalsCss.includes("-webkit-text-stroke"), false, "Propriedade -webkit-text-stroke deve ser removida");
  assert.ok(
    pageSrc.includes("text-[40px] min-[375px]:text-[41px] sm:text-[54px] lg:text-5xl xl:text-6xl"),
    "Nome mobile deve ampliar em ~10–15% mantendo tamanhos originais lg/xl do desktop"
  );
  assert.ok(
    pageSrc.includes("text-[13.5px] sm:text-[16px] lg:text-sm"),
    "Especialidade mobile deve ampliar em ~10–15% mantendo tamanho original lg:text-sm no desktop"
  );
});

test("3. Linha decorativa (#hero-accent-line) com var(--primary), 48–60px x 3px e cantos arredondados", () => {
  const pageSrc = fs.readFileSync(path.join(process.cwd(), "src", "app", "page.tsx"), "utf-8");
  const globalsCss = fs.readFileSync(path.join(process.cwd(), "src", "app", "globals.css"), "utf-8");

  const titlePos = pageSrc.indexOf('id="hero-title"');
  const accentPos = pageSrc.indexOf('id="hero-accent-line"');
  const subtitlePos = pageSrc.indexOf('id="hero-subtitle"');
  assert.ok(titlePos > 0 && accentPos > titlePos && subtitlePos > accentPos, "Linha decorativa deve ficar entre a especialidade e a descrição");

  const accentSnippet = pageSrc.slice(accentPos, accentPos + 200);
  assert.ok(
    accentSnippet.includes("block lg:hidden") &&
      accentSnippet.includes("w-14") &&
      accentSnippet.includes("h-[3px]") &&
      accentSnippet.includes("rounded-full") &&
      accentSnippet.includes("bg-[var(--primary)]") &&
      accentSnippet.includes("mx-auto"),
    "Linha decorativa deve usar 56px (48–60px) x 3px arredondada, centralizada, apenas no mobile e com var(--primary)"
  );
  assert.equal(/#(EA580C|F97316|C2410C)/i.test(accentSnippet), false, "Não deve fixar cor laranja hardcoded na linha decorativa");
  assert.ok(globalsCss.includes("html.hero-anim-pending #hero-accent-line"), "Linha decorativa deve participar do bloqueio anti-flash inicial");
});

test("4. Utilitário compartilhado Typewriter (Nome, Especialidade e Descrição) e acessibilidade", () => {
  const gsapSrc = fs.readFileSync(path.join(process.cwd(), "src", "lib", "animation", "gsap.ts"), "utf-8");
  const controllerSrc = fs.readFileSync(path.join(process.cwd(), "src", "components", "minisite", "motion-controller.tsx"), "utf-8");
  const pageSrc = fs.readFileSync(path.join(process.cwd(), "src", "app", "page.tsx"), "utf-8");

  assert.ok(gsapSrc.includes("computeTypewriterDuration"), "Duração do nome mantida em ~1.3–1.8s");
  assert.ok(gsapSrc.includes("computeSpecialtyTypewriterDuration"), "Duração proporcional da especialidade");
  assert.ok(gsapSrc.includes("computeDescriptionTypewriterDuration"), "Duração rápida (~1.5–2.0s) da descrição");
  assert.ok(gsapSrc.includes("createTypewriterTween"), "Fábrica única compartilhada para os 3 textos");

  assert.ok(
    pageSrc.includes('<span className="sr-only">{professionalTitle}</span>') &&
      pageSrc.includes('<span id="hero-title-text" aria-hidden="true"') &&
      pageSrc.includes('<span className="sr-only">{heroSubtitle}</span>') &&
      pageSrc.includes('<span id="hero-subtitle-text" aria-hidden="true"'),
    "Especialidade e descrição devem manter texto completo acessível para leitores de tela e SSR/SEO"
  );

  assert.ok(
    controllerSrc.includes("mobileSpecialtyHandle") &&
      controllerSrc.includes("mobileSubtitleHandle") &&
      controllerSrc.includes("populateMobileHeroSequence"),
    "Sequência mobile deve orquestrar os 3 Typewriters na ordem estrita via função compartilhada"
  );
});
