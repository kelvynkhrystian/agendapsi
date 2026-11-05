const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

// ==============================================================================
// TESTES: CABEÇALHO MOBILE, NAVEGAÇÃO STICKY E BOTÕES FLUTUANTES (MINISITE)
// ==============================================================================

test("1. MiniSiteHeader — Layout do Cabeçalho Mobile e Logo Horizontal", () => {
  const headerPath = path.join(process.cwd(), "src", "components", "minisite", "header.tsx");
  assert.strictEqual(fs.existsSync(headerPath), true, "src/components/minisite/header.tsx deve existir");

  const content = fs.readFileSync(headerPath, "utf-8");

  // Verifica que o mobile header (< md) renderiza a logo horizontal no lado esquerdo
  assert.strictEqual(
    content.includes("logoHorizontalUrl ? ("),
    true,
    "Deve priorizar a logo horizontal no cabeçalho"
  );
  assert.strictEqual(
    content.includes("object-contain"),
    true,
    "Deve usar object-fit: contain para preservar as proporções da logo"
  );

  // Verifica que no mobile com logoHorizontal NÃO renderiza texto PSI redundante
  // Na renderização com logoHorizontalUrl, renderiza apenas a tag <img>
  const mobileLogoBranch = content.split("logoHorizontalUrl ? (")[1].split(": logoUrl ? (")[0];
  assert.strictEqual(
    mobileLogoBranch.includes("<span"),
    false,
    "Não deve exibir rótulo de texto PSI ao lado da logo horizontal no mobile"
  );

  // Lado direito: Botão hamburguer com acessibilidade
  assert.strictEqual(
    content.includes("aria-label={isMenuOpen ? \"Fechar menu de navegação\" : \"Abrir menu de navegação\"}"),
    true,
    "Botão hamburguer deve conter aria-label acessível"
  );
  assert.strictEqual(
    content.includes("aria-expanded={isMenuOpen}"),
    true,
    "Botão hamburguer deve expor aria-expanded"
  );
});

test("2. MiniSiteHeader — Drawer de Navegação Móvel e Acessibilidade", () => {
  const headerPath = path.join(process.cwd(), "src", "components", "minisite", "header.tsx");
  const content = fs.readFileSync(headerPath, "utf-8");

  // Links obrigatórios de seções
  const expectedLinks = [
    'href="#inicio"',
    'href="#atendimentos"',
    'href="#sobre"',
    'href="#diferenciais"',
    'href="#como-funciona"',
    'href="/agendar"',
    'href="/login"',
  ];

  for (const link of expectedLinks) {
    assert.strictEqual(
      content.includes(link),
      true,
      `Menu móvel deve incluir link para ${link}`
    );
  }

  // Localização condicional (apenas se shouldShowLocation for verdadeiro)
  assert.strictEqual(
    content.includes("shouldShowLocation && ("),
    true,
    "Link de Localização deve ser exibido condicionalmente"
  );

  // Acessibilidade e fechamento do menu
  assert.strictEqual(
    content.includes('e.key === "Escape"'),
    true,
    "Menu móvel deve fechar ao pressionar Escape"
  );
  assert.strictEqual(
    content.includes("handleLinkClick"),
    true,
    "Menu deve fechar ao clicar em qualquer link de seção"
  );
  assert.strictEqual(
    content.includes("document.body.style.overflow = \"hidden\""),
    true,
    "Deve evitar rolagem do fundo quando menu estiver aberto"
  );
});

test("3. MiniSiteHeader — Comportamento Sticky e Suporte a Safe-Area", () => {
  const headerPath = path.join(process.cwd(), "src", "components", "minisite", "header.tsx");
  const content = fs.readFileSync(headerPath, "utf-8");

  assert.strictEqual(
    content.includes("sticky top-0 z-40"),
    true,
    "Cabeçalho deve ser sticky no topo da tela com z-index adequado"
  );
  assert.strictEqual(
    content.includes("env(safe-area-inset-top"),
    true,
    "Deve respeitar safe-area-inset-top em dispositivos móveis (notches)"
  );
  assert.strictEqual(
    content.includes("setIsScrolled(window.scrollY > 12)"),
    true,
    "Deve monitorar o scroll da janela para aplicar fundo e sombra dinâmicos"
  );
});

test("4. MiniSiteFloatingControls — Botão WhatsApp e Voltar ao Topo Empilhados", () => {
  const controlsPath = path.join(process.cwd(), "src", "components", "minisite", "floating-controls.tsx");
  assert.strictEqual(fs.existsSync(controlsPath), true, "src/components/minisite/floating-controls.tsx deve existir");

  const content = fs.readFileSync(controlsPath, "utf-8");

  // Posicionamento no canto inferior direito
  assert.strictEqual(
    content.includes("fixed bottom-5 right-4 sm:bottom-6 sm:right-6 z-50"),
    true,
    "Controles flutuantes devem estar fixos no canto inferior direito"
  );
  assert.strictEqual(
    content.includes("env(safe-area-inset-bottom"),
    true,
    "Deve respeitar safe-area-inset-bottom em dispositivos móveis"
  );

  // WhatsApp Flutuante
  assert.strictEqual(
    content.includes("bg-[#25D366]"),
    true,
    "Botão WhatsApp deve preservar sua cor verde oficial #25D366"
  );

  // Voltar ao Topo (Back to Top)
  assert.strictEqual(
    content.includes("window.scrollY > 350"),
    true,
    "Botão de voltar ao topo deve aparecer após rolagem de ~1 viewport"
  );
  assert.strictEqual(
    content.includes("window.scrollTo({"),
    true,
    "Botão de voltar ao topo deve chamar scrollTo com comportamento suave"
  );
  assert.strictEqual(
    content.includes("aria-label=\"Voltar ao início da página\""),
    true,
    "Botão de voltar ao topo deve ter rótulo acessível"
  );

  // Ordem vertical: WhatsApp primeiro, Voltar ao Topo abaixo
  const idxWhatsApp = content.indexOf("BOTÃO FLUTUANTE DO WHATSAPP");
  const idxBackToTop = content.indexOf("BOTÃO VOLTAR AO TOPO");
  assert.strictEqual(
    idxWhatsApp < idxBackToTop,
    true,
    "O botão WhatsApp deve estar empilhado ACIMA do botão Voltar ao Topo"
  );
});

test("5. Smooth Scrolling e Margens de Rolagem (Scroll Offsets)", () => {
  const cssPath = path.join(process.cwd(), "src", "app", "globals.css");
  const cssContent = fs.readFileSync(cssPath, "utf-8");

  assert.strictEqual(
    cssContent.includes("scroll-behavior: smooth;"),
    true,
    "globals.css deve definir scroll-behavior: smooth no html"
  );
  assert.strictEqual(
    cssContent.includes("scroll-padding-top: 5rem;"),
    true,
    "globals.css deve definir scroll-padding-top para não cobrir títulos com o header fixo"
  );
  assert.strictEqual(
    cssContent.includes("prefers-reduced-motion: reduce"),
    true,
    "Deve respeitar acessibilidade de movimento reduzido no scroll"
  );

  const homePath = path.join(process.cwd(), "src", "app", "page.tsx");
  const homeContent = fs.readFileSync(homePath, "utf-8");

  // Seções com scroll-mt-20
  assert.strictEqual(homeContent.includes('id="inicio"'), true, "Hero deve conter id=\"inicio\"");
  assert.strictEqual(homeContent.includes('id="atendimentos" className="py-16 px-4 bg-white scroll-mt-20"'), true, "Atendimentos com scroll-mt-20");
  assert.strictEqual(homeContent.includes('id="sobre" className="py-16 px-4 bg-[#F8F5EE] border-y border-slate-200/60 scroll-mt-20"'), true, "Sobre Mim com scroll-mt-20");
  assert.strictEqual(homeContent.includes('id="diferenciais" className="py-16 px-4 bg-white scroll-mt-20"'), true, "Diferenciais com scroll-mt-20");
  assert.strictEqual(homeContent.includes('id="como-funciona" className="py-16 px-4 bg-[#F8F5EE] scroll-mt-20"'), true, "Como Funciona com scroll-mt-20");
});

test("6. Integração na Página Inicial: Eliminação de Botões Duplicados", () => {
  const homePath = path.join(process.cwd(), "src", "app", "page.tsx");
  const homeContent = fs.readFileSync(homePath, "utf-8");

  // Deve usar MiniSiteHeader e MiniSiteFloatingControls
  assert.strictEqual(homeContent.includes("<MiniSiteHeader"), true, "Deve renderizar MiniSiteHeader");
  assert.strictEqual(homeContent.includes("<MiniSiteFloatingControls"), true, "Deve renderizar MiniSiteFloatingControls");

  // Não deve haver outro botão WhatsApp flutuante duplicado estático na página
  const occurrences = (homeContent.match(/fixed bottom-/g) || []).length;
  assert.strictEqual(
    occurrences,
    0,
    "src/app/page.tsx não deve conter elementos fixed bottom- manuais duplicados"
  );
});

test("7. Formatação da Mensagem Padrão do WhatsApp", () => {
  const homePath = path.join(process.cwd(), "src", "app", "page.tsx");
  const homeContent = fs.readFileSync(homePath, "utf-8");

  assert.strictEqual(
    homeContent.includes("Olá! Conheci seu trabalho pelo site e gostaria de saber mais sobre os atendimentos e como agendar uma consulta."),
    true,
    "Deve conter a mensagem padrão exata de WhatsApp especificada no requisito"
  );
});
