const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("1. Mobile Header: Logo reduzida em 50% mantendo proporção natural e dimensões reais menores", () => {
  const headerPath = path.join(process.cwd(), "src", "components", "minisite", "header.tsx");
  const src = fs.readFileSync(headerPath, "utf-8");

  const mobileBlock = src.split('id="hero-header-mobile"')[1].split("CABEÇALHO DESKTOP")[0];
  assert.ok(mobileBlock.includes("h-3.5 sm:h-4 w-auto max-w-[85px] sm:max-w-[105px] object-contain"));
  assert.ok(mobileBlock.includes("h-3.5 sm:h-4 w-auto max-w-[65px] object-contain rounded-sm"));
  assert.equal(mobileBlock.includes("scale(0.5)"), false, "Não deve reduzir apenas via transform scale");
  assert.equal(mobileBlock.includes("scale-50"), false, "Não deve usar scale-50 deixando espaço vazio");

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
  assert.equal(mobileBlock.includes("bg-white/40"), false, "Não deve manter cápsula translúcida bg-white/40");
  assert.equal(mobileBlock.includes("bg-white/95"), false, "Não deve aplicar cápsula branca ao rolar quando fechado");
  assert.equal(mobileBlock.includes("opacity-0"), false, "Não deve ocultar cabeçalho com opacity: 0");

  // Drawer aberto mantém leitura nítida e top alinhado à barra mobile aberta (h-12 + 8px = 56px)
  const drawerBlock = src.split('id="mobile-navigation-menu"')[1];
  assert.ok(drawerBlock.includes('top: "calc(56px + env(safe-area-inset-top, 0px))"'));
});

test("3. Hero & CRP Mobile: Mídia inicia no topo da viewport (pt-0) e CRP posicionado logo abaixo do header (~4px) com safe-area", () => {
  const pagePath = path.join(process.cwd(), "src", "app", "page.tsx");
  const src = fs.readFileSync(pagePath, "utf-8");

  // Sem faixa vazia no topo da seção Hero no mobile (< 768px)
  assert.ok(src.includes("pt-0 md:pt-24 lg:pt-28"), "Hero mobile deve iniciar em pt-0 preservando md/lg");

  // CRP posicionado sobre a mídia logo abaixo da altura real do cabeçalho mobile (40px + 4px + safe-area)
  assert.ok(src.includes('id="hero-badge-wrapper"'));
  assert.ok(src.includes("max-md:absolute max-md:inset-x-0 max-md:top-[calc(2.5rem+4px+env(safe-area-inset-top,0px))]"));
  const badgeBlock = src.split('id="hero-badge-wrapper"')[1].split('id="hero-media-container"')[0];
  assert.ok(badgeBlock.includes("bg-[var(--primary)]") && badgeBlock.includes("text-white"));
  assert.equal(badgeBlock.includes("-mt-"), false, "CRP não deve depender de margens negativas arbitrárias");
});
