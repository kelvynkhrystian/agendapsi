const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("1. Cabeçalho Mobile Scroll: transparente no topo e branco sólido (#FFFFFF) em área total ao rolar com transição ~250ms", () => {
  const headerPath = path.join(process.cwd(), "src", "components", "minisite", "header.tsx");
  const src = fs.readFileSync(headerPath, "utf-8");

  // Detecção eficiente com listener passivo e cleanup garantido
  assert.ok(src.includes('window.addEventListener("scroll", handleScroll, { passive: true })'));
  assert.ok(src.includes('window.removeEventListener("scroll", handleScroll)'));

  const mobileContainer = src.split('id="hero-header-mobile"')[1].split('id="hero-header-mobile-bar"')[0];
  assert.ok(
    mobileContainer.includes("isScrolled && !isMenuOpen"),
    "Fundo branco no scroll deve aplicar-se apenas quando isScrolled && !isMenuOpen"
  );
  assert.ok(
    mobileContainer.includes("bg-[#FFFFFF]"),
    "Container mobile inteiro (#hero-header-mobile) deve ficar branco sólido #FFFFFF ao rolar"
  );
  assert.ok(
    mobileContainer.includes("transition-[background-color,box-shadow]") &&
      mobileContainer.includes("duration-[250ms]"),
    "Transição de cor/sombra deve durar aproximadamente 250ms"
  );
  assert.ok(
    mobileContainer.includes("bg-transparent shadow-none backdrop-blur-none"),
    "Estado inicial e retorno ao topo devem restaurar transparência total sem sombra nem blur"
  );
  assert.equal(mobileContainer.includes("backdrop-blur-md"), false, "Header mobile não deve usar backdrop blur");
  assert.equal(mobileContainer.includes("backdrop-blur-lg"), false, "Header mobile não deve usar backdrop blur");
  assert.ok(
    !mobileContainer.includes("bg-white/"),
    "Ao rolar, cabeçalho mobile deve ser branco sólido #FFFFFF sem transparência"
  );

  // Desktop (#hero-header-desktop): também transparente no topo e branco sólido #FFFFFF em largura total ao rolar (~250ms)
  const desktopContainer = src.split('id="hero-header-desktop"')[1].split('grid-cols-[1fr_auto_1fr]')[0];
  assert.ok(
    desktopContainer.includes("isScrolled") &&
      desktopContainer.includes("bg-[#FFFFFF]") &&
      desktopContainer.includes("transition-[background-color,box-shadow]") &&
      desktopContainer.includes("duration-[250ms]"),
    "Container desktop (#hero-header-desktop) deve ficar branco sólido #FFFFFF com transição ~250ms ao rolar"
  );
  assert.ok(
    desktopContainer.includes("bg-transparent shadow-none backdrop-blur-none"),
    "Container desktop deve permanecer transparente no topo da página"
  );
  assert.equal(desktopContainer.includes("backdrop-blur-md"), false);
  assert.equal(desktopContainer.includes("backdrop-blur-lg"), false);
  assert.ok(
    !desktopContainer.includes("bg-white/"),
    "Fundo do container desktop no scroll deve ser branco sólido #FFFFFF sem transparência"
  );

  // <header> externo preserva neutralidade e pílulas de vidro centrais/auth preservam getDesktopGlassPillClass
  const headerTag = src.match(/<header[\s\S]*?>/)[0];
  assert.ok(headerTag.includes("bg-transparent") && !headerTag.includes("bg-[#FFFFFF]"));
  assert.ok(src.includes("getDesktopGlassPillClass(isScrolled)"));
});

test("2. CTA Final Mobile vs Desktop: textos simplificados apenas no mobile preservando integralmente o desktop", () => {
  const pagePath = path.join(process.cwd(), "src", "app", "page.tsx");
  const pageSrc = fs.readFileSync(pagePath, "utf-8");

  const ctaStart = pageSrc.indexOf('id="cta-final"');
  const ctaEnd = pageSrc.indexOf("</section>", ctaStart);
  assert.ok(ctaStart > -1 && ctaEnd > ctaStart);
  const ctaBlock = pageSrc.slice(ctaStart, ctaEnd);

  // Textos exatos Mobile-only (md:hidden)
  assert.ok(ctaBlock.includes('<span className="md:hidden">Agende sua consulta!</span>'));
  assert.ok(ctaBlock.includes('<span className="md:hidden">Bem-estar e independência emocional.</span>'));
  assert.ok(ctaBlock.includes('<span className="md:hidden">Agenda agora pelo app!</span>'));

  // Textos Desktop originais preservados (hidden md:inline)
  assert.ok(ctaBlock.includes('<span className="hidden md:inline">Agende sua consulta agora</span>'));
  assert.ok(ctaBlock.includes('<span className="hidden md:inline">Dê o primeiro passo para o seu bem-estar emocional.</span>'));
  assert.ok(ctaBlock.includes('<span className="hidden md:inline">Agendar agora sua consulta pelo app</span>'));

  // Layout vertical no mobile e horizontal preservado no desktop
  assert.ok(ctaBlock.includes("flex flex-col md:flex-row items-center"));
  assert.ok(ctaBlock.includes('href="/agendar"') && ctaBlock.includes("<ArrowRight"));
  assert.ok(ctaBlock.includes("bg-white text-slate-900"));
});
