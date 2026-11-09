const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

test("Hero Scroll Indicator: Arquivo SVG existente e íntegro", () => {
  const svgPath = path.join(process.cwd(), "public", "minisite", "scroll-down.svg");
  assert.ok(fs.existsSync(svgPath), "public/minisite/scroll-down.svg deve existir");

  const svgContent = fs.readFileSync(svgPath, "utf-8");
  assert.ok(svgContent.includes("<animate"), "SVG deve conter tags <animate> para auto-animação SMIL");
  assert.ok(svgContent.includes("<animateMotion"), "SVG deve conter <animateMotion>");
  assert.ok(!svgContent.toLowerCase().includes("<script"), "SVG não deve conter tags de script inseguras");
  assert.ok(!svgContent.toLowerCase().includes("javascript:"), "SVG não deve conter URIs javascript:");
});

test("Hero Scroll Indicator: Integração no MiniSite e posicionamento à direita", () => {
  const pagePath = path.join(process.cwd(), "src", "app", "page.tsx");
  const pageContent = fs.readFileSync(pagePath, "utf-8");

  assert.ok(
    pageContent.includes("HeroScrollIndicator"),
    "page.tsx deve importar e renderizar HeroScrollIndicator"
  );
  assert.ok(
    pageContent.includes('targetSectionId="atendimentos"'),
    "HeroScrollIndicator deve apontar para targetSectionId='atendimentos'"
  );
  assert.ok(
    pageContent.includes("bottom-10 right-24") || pageContent.includes("right-32") || pageContent.includes("bottom-10"),
    "HeroScrollIndicator deve ser posicionado no canto inferior direito do Hero desktop"
  );

  const indicatorPath = path.join(process.cwd(), "src", "components", "minisite", "hero-scroll-indicator.tsx");
  assert.ok(fs.existsSync(indicatorPath), "hero-scroll-indicator.tsx deve existir");

  const indicatorContent = fs.readFileSync(indicatorPath, "utf-8");
  assert.ok(
    indicatorContent.includes('aria-label="Rolar para a próxima seção"'),
    "Botão deve ter aria-label acessível"
  );
  assert.ok(
    indicatorContent.includes("/minisite/scroll-down.svg"),
    "Deve carregar a URL pública /minisite/scroll-down.svg"
  );
  assert.ok(
    indicatorContent.includes("window.scrollTo"),
    "Deve implementar rolagem suave ao clicar"
  );
  assert.ok(
    indicatorContent.includes("hidden lg:block"),
    "Deve ser exibido exclusivamente no desktop (hidden no mobile)"
  );
});

test("Hero Benefits: Ampliação proporcional em ~1.5x e aproximação dos botões de CTA", () => {
  const pagePath = path.join(process.cwd(), "src", "app", "page.tsx");
  const pageContent = fs.readFileSync(pagePath, "utf-8");

  // 1. Distância vertical reduzida em relação aos CTAs
  assert.ok(
    pageContent.includes("pt-3.5 mt-3") || pageContent.includes("pt-4 sm:mt-4") || pageContent.includes("pt-3.5"),
    "Espaçamento vertical entre CTAs e benefícios deve ser reduzido para criar conexão visual"
  );

  // 2. Container de ícone ampliado (~1.5x)
  assert.ok(
    pageContent.includes("w-14 sm:h-14") || pageContent.includes("lg:w-14 lg:h-14") || pageContent.includes("w-12 h-12 sm:w-14"),
    "Container do ícone de benefício deve ser ampliado proporcionalmente (~56px)"
  );

  // 3. Ícone interno ampliado (~1.5x)
  assert.ok(
    pageContent.includes("h-6.5 w-6.5 sm:h-7 sm:w-7") || pageContent.includes("h-7 w-7"),
    "Ícone ThemeIcon de benefício deve ser ampliado proporcionalmente (~28-30px)"
  );

  // 4. Tipografia ampliada (~1.5x)
  assert.ok(
    pageContent.includes("text-xs sm:text-sm lg:text-[15px]") || pageContent.includes("lg:text-[15px]"),
    "Título do benefício deve ter escala tipográfica ampliada"
  );
});
