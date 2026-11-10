const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

test("1. Cabeçalho Desktop: Layout em 3 áreas com cápsula de navegação perfeitamente centralizada", () => {
  const headerPath = path.join(process.cwd(), "src", "components", "minisite", "header.tsx");
  assert.strictEqual(fs.existsSync(headerPath), true, "header.tsx deve existir");

  const content = fs.readFileSync(headerPath, "utf-8");

  // Grid simétrico de 3 colunas que garante a centralização matemática independente
  assert.strictEqual(
    content.includes("grid-cols-[1fr_auto_1fr]"),
    true,
    "Deve utilizar grid-cols-[1fr_auto_1fr] para manter o pill centralizado independente do tamanho da logo ou login"
  );

  // 3 áreas presentes na estrutura desktop
  assert.strictEqual(content.includes("ref={logoRef}"), true, "Deve conter ref para a área esquerda (Logo)");
  assert.strictEqual(content.includes("ref={pillRef}"), true, "Deve conter ref para a área central (Pill Navigation)");
  assert.strictEqual(content.includes("ref={authRef}"), true, "Deve conter ref para a área direita (Auth)");
});

test("2. Floating Pill Navigation: Estilo cápsula arredondada, itens corretos e destaque com cor do tema", () => {
  const headerPath = path.join(process.cwd(), "src", "components", "minisite", "header.tsx");
  const content = fs.readFileSync(headerPath, "utf-8");

  // Estilização do pill
  assert.strictEqual(content.includes("rounded-full"), true, "Deve possuir formato totalmente arredondado (pill)");
  assert.strictEqual(content.includes("backdrop-blur"), true, "Deve possuir fundo com desfoque suave (backdrop-blur)");
  assert.strictEqual(content.includes("shadow-"), true, "Deve possuir sombra sutil e refinada");

  // Itens de navegação simplificados no pill desktop (exatamente 4 em ordem)
  const navMatch = content.match(/<nav[\s\S]*?<\/nav>/);
  assert.strictEqual(Boolean(navMatch), true, "Tag <nav> do pill desktop deve existir");
  const navHtml = navMatch[0];

  const desktopItems = ["Início", "Sobre Mim", "Como Funciona", "Localização"];
  let lastIdx = -1;
  for (const item of desktopItems) {
    const idx = navHtml.indexOf(item);
    assert.strictEqual(idx > lastIdx, true, `Pill desktop deve conter '${item}' na ordem correta`);
    lastIdx = idx;
  }
  assert.strictEqual(navHtml.includes("Atendimentos"), false, "Pill desktop não deve conter 'Atendimentos'");
  assert.strictEqual(navHtml.includes("Diferenciais"), false, "Pill desktop não deve conter 'Diferenciais'");

  // Destaque do item ativo com a cor do tema configurada
  assert.strictEqual(
    content.includes("backgroundColor: \"var(--primary)\""),
    true,
    "Item ativo deve receber a cor primária dinâmica do tema selecionado"
  );
  assert.strictEqual(
    content.includes("text-white"),
    true,
    "Item ativo deve ter contraste nítido com texto branco"
  );
});

test("3. Detecção Automática de Seção e Rolagem Suave com Compensação de Altura", () => {
  const headerPath = path.join(process.cwd(), "src", "components", "minisite", "header.tsx");
  const content = fs.readFileSync(headerPath, "utf-8");

  // Estado de seção ativa
  assert.strictEqual(content.includes("activeSection"), true, "Deve controlar estado da seção ativa");
  assert.strictEqual(content.includes("setActiveSection"), true, "Deve atualizar a seção ativa dinamicamente");

  // Rolagem suave com offset
  assert.strictEqual(content.includes("scrollToSection"), true, "Deve possuir função dedicada de scroll suave");
  assert.strictEqual(content.includes("headerOffset"), true, "Deve descontar a altura do cabeçalho sticky");
  assert.strictEqual(content.includes('behavior: "smooth"'), true, "Deve realizar scroll suave");
});

test("4. Micro-animações GSAP: Entrada fluida coordenada de logo, cápsula e autenticação com suporte a reduced-motion", () => {
  const headerPath = path.join(process.cwd(), "src", "components", "minisite", "header.tsx");
  const controllerPath = path.join(process.cwd(), "src", "components", "minisite", "motion-controller.tsx");
  const headerContent = fs.readFileSync(headerPath, "utf-8");
  const controllerContent = fs.readFileSync(controllerPath, "utf-8");

  // IDs semânticos no cabeçalho para entrada coordenada na timeline única do Hero
  assert.strictEqual(headerContent.includes('id="hero-header-logo"'), true, "Deve marcar área esquerda (Logo) com id estável");
  assert.strictEqual(headerContent.includes('id="hero-header-pill"'), true, "Deve marcar cápsula central com id estável");
  assert.strictEqual(headerContent.includes('id="hero-header-auth"'), true, "Deve marcar área direita (Auth) com id estável");
  assert.strictEqual(headerContent.includes('id="hero-header-mobile-logo"'), true, "Deve marcar logo mobile com id estável");
  assert.strictEqual(headerContent.includes('id="hero-header-mobile-toggle"'), true, "Deve marcar botão menu mobile com id estável");

  // Integração com timeline única GSAP e accessibility reduced-motion no MotionController
  assert.strictEqual(controllerContent.includes("useGSAP"), true, "Deve utilizar hook seguro useGSAP com cleanup automático");
  assert.strictEqual(controllerContent.includes("isReducedMotion()"), true, "Deve respeitar prefers-reduced-motion");
  assert.strictEqual(controllerContent.includes("#hero-header-logo"), true, "Timeline deve animar entrada da logo de baixo para cima");
  assert.strictEqual(controllerContent.includes("#hero-header-pill"), true, "Timeline deve animar revelação da cápsula de navegação de baixo para cima");
  assert.strictEqual(controllerContent.includes("#hero-header-auth"), true, "Timeline deve animar entrada do botão de autenticação de baixo para cima");
});

test("5. Responsividade: Mobile mantém drawer e desktop recebe o novo visual de pill flutuante", () => {
  const headerPath = path.join(process.cwd(), "src", "components", "minisite", "header.tsx");
  const content = fs.readFileSync(headerPath, "utf-8");

  // Mobile drawer permanece intacto
  assert.strictEqual(content.includes("md:hidden"), true, "Deve conter cabeçalho e drawer para telas móveis");
  assert.strictEqual(content.includes("mobile-navigation-menu"), true, "Menu móvel deve permanecer disponível");

  // Desktop pill (ativado em md: via container #hero-header-desktop com grid de 3 áreas)
  assert.strictEqual(
    content.includes('id="hero-header-desktop"') &&
      content.includes("hidden md:block") &&
      content.includes("grid grid-cols-[1fr_auto_1fr]"),
    true,
    "Layout pill desktop deve ser ativado em md: (>= 768px)"
  );
});
