const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("Hero Scroll Indicator: SVG oficial existente preservado com cor herdável e animação SMIL", () => {
  const svgPath = path.join(process.cwd(), "public", "minisite", "scroll-down.svg");
  assert.ok(fs.existsSync(svgPath), "public/minisite/scroll-down.svg deve existir");

  const svgContent = fs.readFileSync(svgPath, "utf-8");
  assert.ok(svgContent.includes("<animate"), "SVG deve preservar tags <animate>");
  assert.ok(svgContent.includes("<animateMotion"), "SVG deve preservar <animateMotion>");
  assert.ok(svgContent.includes("<animateTransform"), "SVG deve preservar <animateTransform>");
  assert.ok(
    svgContent.includes('stroke="currentColor"') && !svgContent.includes('stroke="#ffffff"'),
    "Traços do SVG não devem fixar cor branca hardcoded (#ffffff); devem suportar adaptação ao tema"
  );
  assert.ok(!svgContent.toLowerCase().includes("<script"), "SVG não deve conter tags <script>");
  assert.ok(!svgContent.toLowerCase().includes("javascript:"), "SVG não deve conter URIs javascript:");
});

test("Hero Scroll Indicator: Sem rótulo de texto, cor do tema via var(--primary) e acessibilidade", () => {
  const indicatorPath = path.join(
    process.cwd(),
    "src",
    "components",
    "minisite",
    "hero-scroll-indicator.tsx"
  );
  assert.ok(fs.existsSync(indicatorPath), "hero-scroll-indicator.tsx deve existir");

  const src = fs.readFileSync(indicatorPath, "utf-8");

  // 1. Sem texto visível ("Role para baixo" completamente removido)
  assert.equal(
    src.includes("Role para baixo"),
    false,
    "Indicador não deve exibir texto visível 'Role para baixo'"
  );

  // 2. Aria-label exata no botão clicável
  assert.ok(
    src.includes('aria-label="Rolar para a próxima seção"'),
    "Botão clicável deve manter aria-label='Rolar para a próxima seção'"
  );

  // 3. Usa o arquivo oficial /minisite/scroll-down.svg e segue a cor primária do tema
  assert.ok(
    src.includes("/minisite/scroll-down.svg"),
    "Indicador deve utilizar public/minisite/scroll-down.svg via /minisite/scroll-down.svg"
  );
  assert.ok(
    src.includes("var(--primary)"),
    "Cor completa do SVG deve obedecer à variável CSS oficial var(--primary)"
  );
  assert.equal(
    /#(EA580C|F97316|CA8A04)/i.test(src),
    false,
    "Não deve fixar cor laranja hardcoded no componente do indicador"
  );

  // 4. Comportamentos preservados: hidden no mobile, scroll suave com offset 84px, fade-out no scroll
  assert.ok(src.includes("hidden lg:flex"), "Indicador deve permanecer oculto no mobile");
  assert.ok(src.includes("const headerOffset = 84"), "Rolagem ao clicar deve compensar cabeçalho fixo");
  assert.ok(src.includes("window.scrollTo"), "Deve executar rolagem suave até a seção seguinte");
  assert.ok(src.includes("tabIndex={isFadedOut ? -1 : 0}"), "Botão invisível após rolagem deve sair da tabulação");
  assert.ok(!src.includes("dangerouslySetInnerHTML"), "Não deve usar dangerouslySetInnerHTML");
});

test("Hero Benefits & Scroll Indicator: Alinhamento à direita acima do WhatsApp, benefícios ~1.5x e proximidade com CTAs", () => {
  const pagePath = path.join(process.cwd(), "src", "app", "page.tsx");
  const pageContent = fs.readFileSync(pagePath, "utf-8");

  // Posicionamento responsivo alinhado verticalmente à coluna direita (right-6 w-[52px]) sem colidir com WhatsApp (bottom-40)
  assert.ok(pageContent.includes("HeroScrollIndicator"), "page.tsx deve renderizar HeroScrollIndicator");
  assert.ok(pageContent.includes('targetSectionId="atendimentos"'), "Indicador deve rolar para #atendimentos");
  assert.ok(
    pageContent.includes("hidden lg:flex absolute bottom-40 right-6 z-20 w-[52px]"),
    "Indicador deve ficar no extremo direito (right-6 w-[52px]) alinhado verticalmente ao WhatsApp com espaçamento seguro (bottom-40)"
  );

  // Ampliação proporcional dos benefícios (~1.5x vs baseline anterior) e redução do gap com CTAs
  assert.ok(
    pageContent.includes("lg:w-[58px] lg:h-[58px] xl:w-[62px] xl:h-[62px]"),
    "Container do ícone dos benefícios deve permanecer ampliado proporcionalmente"
  );
  assert.ok(
    pageContent.includes("lg:h-[29px] lg:w-[29px] xl:h-[31px] xl:w-[31px]"),
    "Ícone ThemeIcon dos benefícios deve permanecer ampliado proporcionalmente"
  );
  assert.ok(
    pageContent.includes("pt-1 mb-3.5 sm:mb-4"),
    "Espaçamento inferior de #hero-cta deve aproximar os benefícios dos botões"
  );
  assert.ok(
    pageContent.includes("border-t border-slate-200/70 pt-3.5 mt-0 sm:pt-4"),
    "Divisor e padding de #hero-benefits devem manter ritmo visual equilibrado"
  );
});
