const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("1. Mobile Header: Logo ampliada em 1.5x com proporção preservada e hamburguer 28px (-30% de 2x) em alvo >= 44px", () => {
  const headerPath = path.join(process.cwd(), "src", "components", "minisite", "header.tsx");
  const src = fs.readFileSync(headerPath, "utf-8");

  const mobileBlock = src.split('id="hero-header-mobile"')[1].split("CABEÇALHO DESKTOP")[0];
  assert.ok(mobileBlock.includes("h-[21px] sm:h-6 w-auto max-w-[128px] sm:max-w-[158px] object-contain"));
  assert.ok(mobileBlock.includes("h-[21px] sm:h-6 w-auto max-w-[98px] object-contain rounded-sm"));
  assert.ok(mobileBlock.includes("min-h-[44px] min-w-[44px] flex items-center"));
  assert.ok(mobileBlock.includes("w-11 h-11") && mobileBlock.includes("h-7 w-7"), "Hamburguer mobile deve ter ícone 28px (-30% de 40px) em botão acessível 44x44px");
  assert.equal(mobileBlock.includes("scale("), false, "Não deve escalar por CSS transform");
  assert.equal(mobileBlock.includes("scale-50"), false, "Não deve deixar espaço residual por CSS scale");

  // Desktop mantém dimensões originais inalteradas
  const desktopBlock = src.split("CABEÇALHO DESKTOP")[1].split("MENU MÓVEL EXPANSÍVEL")[0];
  assert.ok(desktopBlock.includes("h-8 md:h-9 lg:h-10 w-auto max-w-[200px] lg:max-w-[240px] object-contain"));
});

test("2. Mobile Header: Completamente transparente, sem cápsula, borda, sombra ou blur quando fechado", () => {
  const headerPath = path.join(process.cwd(), "src", "components", "minisite", "header.tsx");
  const src = fs.readFileSync(headerPath, "utf-8");

  const mobileBlock = src.split('id="hero-header-mobile"')[1].split("CABEÇALHO DESKTOP")[0];
  assert.ok(mobileBlock.includes("isMenuOpen"));
  assert.ok(mobileBlock.includes("bg-transparent border-0 rounded-none shadow-none backdrop-blur-none outline-none"));
  // Barra mobile transparente quando fechada, com respiro vertical balanceado (py-2 = 8px top/bottom)
  assert.ok(mobileBlock.includes("min-h-11 py-2"), "Barra mobile deve aplicar respiro vertical py-2 (8px) mantendo altura mínima 44px");
  assert.equal(mobileBlock.includes("bg-white/40"), false, "Não deve manter cápsula translúcida bg-white/40");
  assert.equal(mobileBlock.includes("bg-white/95"), false, "Não deve aplicar cápsula branca ao rolar quando fechado");
  assert.equal(mobileBlock.includes("opacity-0"), false, "Não deve ocultar cabeçalho com opacity: 0");

  // Drawer aberto mantém leitura nítida e top alinhado à barra mobile aberta (8px + 44px + 16px py-2 + 2px border = 70px)
  const drawerBlock = src.split('id="mobile-navigation-menu"')[1];
  assert.ok(drawerBlock.includes('top: "calc(70px + env(safe-area-inset-top, 0px))"'));
});

test("3. Hero & CRP Mobile: CRP exibido no header mobile entre a logo e o menu, vídeo abaixo do CRP, nome em negrito com contorno e +15% no vídeo", () => {
  const pagePath = path.join(process.cwd(), "src", "app", "page.tsx");
  const headerPath = path.join(process.cwd(), "src", "components", "minisite", "header.tsx");
  const controllerPath = path.join(process.cwd(), "src", "components", "minisite", "motion-controller.tsx");
  const src = fs.readFileSync(pagePath, "utf-8");
  const headerSrc = fs.readFileSync(headerPath, "utf-8");
  const globalsCss = fs.readFileSync(path.join(process.cwd(), "src", "app", "globals.css"), "utf-8");
  const controllerSrc = fs.readFileSync(controllerPath, "utf-8");

  // page.tsx repassa crpCrm para MiniSiteHeader
  assert.ok(src.includes("crpCrm={crpCrm}"), "HomePage deve enviar crpCrm para MiniSiteHeader");

  // Header mobile renderiza CRP estritamente ENTRE #hero-header-mobile-logo e #hero-header-mobile-toggle
  const mobileBlock = headerSrc.split('id="hero-header-mobile"')[1].split("CABEÇALHO DESKTOP")[0];
  const logoIdx = mobileBlock.indexOf('id="hero-header-mobile-logo"');
  const crpIdx = mobileBlock.indexOf('id="hero-header-mobile-crp"');
  const toggleIdx = mobileBlock.indexOf('id="hero-header-mobile-toggle"');
  assert.ok(logoIdx > 0 && crpIdx > logoIdx && toggleIdx > crpIdx, "No mobile (< md), o CRP deve aparecer no header entre a logo e o botão de menu");
  assert.ok(mobileBlock.includes("{crpCrm}") && mobileBlock.includes("bg-[var(--primary)]"));

  // Previne FOUC e anima o CRP no header mobile via GSAP
  assert.ok(globalsCss.includes("#hero-header-mobile-crp"), "globals.css deve incluir #hero-header-mobile-crp na prevenção de flash inicial");
  assert.ok(controllerSrc.includes("#hero-header-mobile-crp"), "motion-controller.tsx deve animar e garantir visibilidade do #hero-header-mobile-crp");

  // Top padding mobile mantém o vídeo estritamente abaixo do cabeçalho (e abaixo do CRP)
  assert.ok(
    src.includes("pt-[calc(3.25rem+4px+env(safe-area-inset-top,0px))] md:pt-24 lg:pt-28"),
    "Hero mobile deve iniciar imediatamente abaixo do cabeçalho garantindo que o vídeo não passe do CRP"
  );

  // Badge fora do header fica oculta no mobile (evita duplicidade) e preservada em md+/desktop
  assert.ok(src.includes('id="hero-badge-wrapper"'));
  const badgeBlock = src.split('id="hero-badge-wrapper"')[1].split('id="hero-media-container"')[0];
  assert.ok(badgeBlock.includes("hidden md:flex") && badgeBlock.includes("order-1"), "CRP no corpo do Hero deve ocultar-se no mobile e permanecer visível em tablet/desktop");
  assert.equal(badgeBlock.includes("max-md:absolute"), false, "CRP não deve ficar em sobreposição absoluta sobre o topo do vídeo");
  assert.ok(badgeBlock.includes("bg-[var(--primary)]") && badgeBlock.includes("text-white"));

  // Título #hero-name sem contorno/stroke no mobile e subido próximo à base suavizada do vídeo mobile
  assert.ok(src.includes("-mt-3 sm:-mt-4 lg:mt-0"), "Bloco textual mobile deve subir até próximo à base do vídeo sem afetar desktop");
  assert.equal(src.includes("hero-name-outline"), false, "Nome no Hero não deve possuir classe de contorno .hero-name-outline");
  assert.equal(globalsCss.includes("-webkit-text-stroke"), false, "Contorno -webkit-text-stroke deve estar completamente removido");

  // Altura do vídeo mobile ajustada (-15% sobre fator anterior 1.3915 -> 1.1828) sem afetar desktop
  const mediaPlayerSrc = fs.readFileSync(path.join(process.cwd(), "src", "components", "minisite", "media-player.tsx"), "utf-8");
  assert.ok(mediaPlayerSrc.includes("/ 1.1828") && mediaPlayerSrc.includes("hero-mobile-enlarged-media"), "Vídeo mobile deve aplicar fator acumulado atualizado (1.1828x) preservando proporção sem distorção");
  assert.ok(globalsCss.includes(".hero-mobile-enlarged-media") && globalsCss.includes("--hero-mobile-enlarged-aspect"), "Regra CSS de ampliação deve isolar-se abaixo do breakpoint desktop");

  // Fontes dos 2 botões de ação ampliadas em ~1.4x no mobile (12px -> 17px) mantendo desktop lg:text-sm intacto
  const ctaBlock = src.split('id="hero-cta"')[1].split('id="hero-benefits"')[0];
  const ctaFontMatches = ctaBlock.match(/text-\[17px\] sm:text-\[18px\] lg:text-sm/g) || [];
  assert.equal(ctaFontMatches.length, 2, "Ambos os botões do Hero devem ampliar a fonte em ~1.4x no mobile preservando desktop lg:text-sm");
});
