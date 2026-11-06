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

  // Itens de navegação obrigatórios
  const items = ["Início", "Atendimentos", "Sobre Mim", "Diferenciais", "Como Funciona"];
  for (const item of items) {
    assert.strictEqual(content.includes(item), true, `Pill deve conter o item ${item}`);
  }

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

test("4. Micro-animações GSAP: Entrada fluida de logo, cápsula e autenticação com suporte a reduced-motion", () => {
  const headerPath = path.join(process.cwd(), "src", "components", "minisite", "header.tsx");
  const content = fs.readFileSync(headerPath, "utf-8");

  // Integração com GSAP
  assert.strictEqual(content.includes("gsap.context"), true, "Deve utilizar contexto seguro do GSAP");
  assert.strictEqual(content.includes("ctx.revert()"), true, "Deve limpar as animações na desmontagem");
  assert.strictEqual(content.includes("isReducedMotion()"), true, "Deve respeitar prefers-reduced-motion");

  // Animação de entrada dos 3 elementos
  assert.strictEqual(content.includes("gsap.from(logoRef.current"), true, "Deve animar entrada suave da logo");
  assert.strictEqual(content.includes("gsap.from(pillRef.current"), true, "Deve animar revelação da cápsula de navegação");
  assert.strictEqual(content.includes("gsap.from(authRef.current"), true, "Deve animar entrada do botão de autenticação");
});

test("5. Responsividade: Mobile mantém drawer e desktop recebe o novo visual de pill flutuante", () => {
  const headerPath = path.join(process.cwd(), "src", "components", "minisite", "header.tsx");
  const content = fs.readFileSync(headerPath, "utf-8");

  // Mobile drawer permanece intacto
  assert.strictEqual(content.includes("md:hidden"), true, "Deve conter cabeçalho e drawer para telas móveis");
  assert.strictEqual(content.includes("mobile-navigation-menu"), true, "Menu móvel deve permanecer disponível");

  // Desktop pill
  assert.strictEqual(content.includes("hidden md:grid"), true, "Layout pill desktop deve ser ativado em md: (>= 768px)");
});
