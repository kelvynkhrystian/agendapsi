const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

test("1. Tipografia Desktop Ampliada (~1.5x) e Cápsula Proporcional", () => {
  const headerPath = path.join(process.cwd(), "src", "components", "minisite", "header.tsx");
  const content = fs.readFileSync(headerPath, "utf-8");

  // Links de navegação com tamanho ampliado em telas desktop (lg:text-[16px] / lg:text-[17px])
  assert.ok(
    content.includes("lg:text-[16px]") || content.includes("lg:text-[17px]"),
    "Links de navegação devem possuir tipografia ampliada em torno de 1.5x (16-17px) em desktop"
  );

  // Botão de login com tipografia ampliada proporcional
  assert.ok(
    content.includes("lg:text-[16px]") || content.includes("lg:text-[17px]"),
    "Botão de login deve acompanhar a tipografia ampliada no desktop"
  );

  // Espaçamento e padding proporcionais na cápsula
  assert.ok(
    content.includes("lg:px-4.5") || content.includes("lg:px-5"),
    "Cápsula deve possuir padding horizontal proporcional à tipografia"
  );
  assert.ok(
    content.includes("lg:py-2") || content.includes("lg:py-2.5"),
    "Cápsula deve possuir padding vertical proporcional à tipografia"
  );
});

test("2. Remoção da Faixa Branca Horizontal: Container Externo Totalmente Transparente", () => {
  const headerPath = path.join(process.cwd(), "src", "components", "minisite", "header.tsx");
  const content = fs.readFileSync(headerPath, "utf-8");

  // O container <header> deve ser transparente e sem bordas/sombras de largura total
  assert.ok(
    content.includes("bg-transparent"),
    "Container <header> externo deve ser bg-transparent"
  );
  assert.ok(
    content.includes("border-none"),
    "Container <header> externo deve ser border-none"
  );
  assert.ok(
    content.includes("shadow-none"),
    "Container <header> externo deve ser shadow-none"
  );

  // Não deve possuir classes de fundo opaco na tag <header>
  const headerTagMatch = content.match(/<header[\s\S]*?>/);
  assert.ok(headerTagMatch, "Tag <header> deve existir");
  const headerTag = headerTagMatch[0];
  assert.ok(
    !headerTag.includes("bg-white/90") && !headerTag.includes("bg-white/70"),
    "Tag <header> não deve possuir fundo branco de largura total"
  );
  assert.ok(
    !headerTag.includes("border-b border-slate"),
    "Tag <header> não deve possuir borda inferior de largura total"
  );
});

test("3. Composição Flutuante em 3 Áreas Independentes com Superfícies Próprias", () => {
  const headerPath = path.join(process.cwd(), "src", "components", "minisite", "header.tsx");
  const content = fs.readFileSync(headerPath, "utf-8");

  // Grid simétrico de 3 áreas no desktop
  assert.ok(content.includes("grid-cols-[1fr_auto_1fr]"), "Deve manter 3 colunas independentes");
  assert.ok(content.includes("ref={logoRef}"), "Área esquerda: Logo");
  assert.ok(content.includes("ref={pillRef}"), "Área central: Cápsula de navegação");
  assert.ok(content.includes("ref={authRef}"), "Área direita: Login / Usuário");

  // Apenas as ilhas individuais possuem superfícies translúcidas
  assert.ok(
    content.includes("backdrop-blur-md") || content.includes("backdrop-blur-lg"),
    "Apenas as ilhas de navegação e login devem possuir backdrop blur"
  );
  assert.ok(
    content.includes("rounded-full"),
    "Cápsula central e botão de login devem possuir cantos totalmente arredondados (pill)"
  );
});

test("4. Comportamento Fixed Confiável e Compensação de Altura no Hero", () => {
  const headerPath = path.join(process.cwd(), "src", "components", "minisite", "header.tsx");
  const pagePath = path.join(process.cwd(), "src", "app", "page.tsx");

  const headerContent = fs.readFileSync(headerPath, "utf-8");
  const pageContent = fs.readFileSync(pagePath, "utf-8");

  // Header deve utilizar position fixed no topo da viewport
  assert.ok(
    headerContent.includes("fixed top-0"),
    "Header deve possuir posicionamento fixed no topo da viewport"
  );
  assert.ok(
    headerContent.includes("pointer-events-none"),
    "Container externo deve ser pointer-events-none para não bloquear cliques nas áreas vazias"
  );
  assert.ok(
    headerContent.includes("pointer-events-auto"),
    "Elementos interativos (logo, cápsula, login) devem restaurar pointer-events-auto"
  );

  // Seção Hero deve ter espaçamento superior adequado para não ser coberta pelo header fixed
  assert.ok(
    pageContent.includes("pt-20") || pageContent.includes("pt-24") || pageContent.includes("md:pt-28") || pageContent.includes("lg:pt-32"),
    "Seção Hero deve ter padding top compensando a sobreposição do header flutuante"
  );
});

test("5. Comportamento ao Rolar (Scroll Appearance): Sem Faixa Branca Mesmo em Scroll", () => {
  const headerPath = path.join(process.cwd(), "src", "components", "minisite", "header.tsx");
  const content = fs.readFileSync(headerPath, "utf-8");

  // Durante o scroll, o container externo permanece transparente
  // e apenas as cápsulas ganham sutil reforço de desfoque/sombra
  assert.ok(
    content.includes("isScrolled") && content.includes("bg-white/95 backdrop-blur-lg"),
    "Cápsula de navegação reforça sutilmente o desfoque ao rolar"
  );
  assert.ok(
    content.includes("bg-transparent"),
    "Container externo permanece transparente"
  );
});

test("6. Integração com Cores do Tema e Preservação de Modo Claro", () => {
  const headerPath = path.join(process.cwd(), "src", "components", "minisite", "header.tsx");
  const pagePath = path.join(process.cwd(), "src", "app", "page.tsx");

  const headerContent = fs.readFileSync(headerPath, "utf-8");
  const pageContent = fs.readFileSync(pagePath, "utf-8");

  // Cores dinâmicas do tema aplicadas
  assert.ok(
    headerContent.includes("backgroundColor: \"var(--primary)\""),
    "Item ativo deve utilizar cor primária dinâmica do tema"
  );
  assert.ok(
    headerContent.includes("text-[var(--primary)]"),
    "Elementos interativos devem herdar a cor do tema"
  );

  // MiniSite opera estritamente em Light Mode
  assert.ok(
    pageContent.includes('data-theme="light"'),
    "MiniSite deve ser forçado em data-theme light"
  );
});

test("7. Preservação de Funcionalidades de Navegação e Responsividade Móvel", () => {
  const headerPath = path.join(process.cwd(), "src", "components", "minisite", "header.tsx");
  const content = fs.readFileSync(headerPath, "utf-8");

  // Links essenciais do menu desktop simplificado
  assert.ok(content.includes('href="#inicio"'), "Desktop deve conter link para Início");
  assert.ok(content.includes('href="#sobre"'), "Desktop deve conter link para Sobre Mim");
  assert.ok(content.includes('href="#como-funciona"'), "Desktop deve conter link para Como Funciona");
  assert.ok(content.includes('href="#localizacao"'), "Desktop deve conter link para Localização");
  assert.ok(!content.includes('href="#atendimentos"'), "Desktop não deve conter link para Atendimentos");
  assert.ok(!content.includes('href="#diferenciais"'), "Desktop não deve conter link para Diferenciais");

  // Navegação móvel preservada na íntegra via mobileNavItems
  assert.ok(content.includes('id: "atendimentos"'), "Mobile deve preservar link para Atendimentos");
  assert.ok(content.includes('id: "diferenciais"'), "Mobile deve preservar link para Diferenciais");

  // Não adiciona 'Agendar Consulta' nem marca 'PSI' no header
  assert.ok(
    !content.includes(">Agendar Consulta<") && !content.includes(">Agendar consulta<"),
    "Não deve adicionar botão 'Agendar Consulta' no cabeçalho"
  );

  // Mobile drawer permanece funcional e separado
  assert.ok(content.includes("mobile-navigation-menu"), "Drawer móvel deve existir");
  assert.ok(content.includes("setIsMenuOpen"), "Controle de menu móvel deve existir");
});
