const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

test("Phase 1 Design System — 1. Tipografia Profissional e Fontes Complementares", () => {
  const layoutPath = path.join(process.cwd(), "src", "app", "layout.tsx");
  const layoutContent = fs.readFileSync(layoutPath, "utf-8");

  // Verifica importação e instanciação de Plus Jakarta Sans e Inter
  assert.ok(
    layoutContent.includes("Plus_Jakarta_Sans") && layoutContent.includes("Inter"),
    "layout.tsx deve importar Plus_Jakarta_Sans e Inter de next/font/google"
  );
  assert.ok(
    layoutContent.includes("--font-heading"),
    "layout.tsx deve instanciar a variável --font-heading para Plus Jakarta Sans"
  );
  assert.ok(
    layoutContent.includes("--font-sans"),
    "layout.tsx deve instanciar a variável --font-sans para Inter"
  );

  // Verifica integração no elemento html
  assert.ok(
    layoutContent.includes("${headingFont.variable}") && layoutContent.includes("${sansFont.variable}"),
    "Elemento html deve injetar as variáveis de fonte de forma limpa"
  );

  // Verifica declaração no globals.css
  const globalsPath = path.join(process.cwd(), "src", "app", "globals.css");
  const globalsContent = fs.readFileSync(globalsPath, "utf-8");

  assert.ok(
    globalsContent.includes("--font-sans: var(--font-sans)") || globalsContent.includes("font-family: var(--font-sans)"),
    "globals.css deve definir e aplicar a fonte sans no corpo da aplicação"
  );
  assert.ok(
    globalsContent.includes("--font-heading: var(--font-heading)") || globalsContent.includes("font-family: var(--font-heading)"),
    "globals.css deve definir a fonte heading para títulos"
  );
  assert.ok(
    globalsContent.includes("font-feature-settings:"),
    "globals.css deve habilitar recursos tipográficos avançados de legibilidade"
  );
});

test("Phase 1 Design System — 2. Exportação Centralizada e Integridade de Componentes Compartilhados", () => {
  const indexUiPath = path.join(process.cwd(), "src", "components", "ui", "index.ts");
  assert.ok(fs.existsSync(indexUiPath), "Deve existir o barrel file src/components/ui/index.ts");
  const indexContent = fs.readFileSync(indexUiPath, "utf-8");

  const requiredExports = [
    "./alert",
    "./badge",
    "./button",
    "./card",
    "./dropdown",
    "./empty-state",
    "./input",
    "./modal",
    "./select",
    "./skeleton",
    "./table",
    "./tabs",
    "./theme-toggle",
    "./tooltip",
  ];

  for (const exp of requiredExports) {
    assert.ok(
      indexContent.includes(exp),
      `index.ts deve re-exportar ${exp}`
    );
  }
});

test("Phase 1 Design System — 3. Componentes de Formulário: Input e Select", () => {
  const inputPath = path.join(process.cwd(), "src", "components", "ui", "input.tsx");
  const inputContent = fs.readFileSync(inputPath, "utf-8");

  // Rótulos limpos e sem excesso de caixa alta com espaçamento exagerado
  assert.ok(
    !inputContent.includes("uppercase tracking-wider text-[#374151]"),
    "Input não deve utilizar rótulos agressivos em caixa alta excessiva"
  );
  assert.ok(inputContent.includes("rounded-xl"), "Input deve manter cantos arredondados rounded-xl");
  assert.ok(inputContent.includes("dark:bg-[#141416]"), "Input deve usar fundo Deep Black #141416");
  assert.ok(inputContent.includes("leftIcon") && inputContent.includes("rightIcon"), "Input deve suportar ícones à esquerda e à direita");

  const selectPath = path.join(process.cwd(), "src", "components", "ui", "select.tsx");
  assert.ok(fs.existsSync(selectPath), "Select deve existir como componente compartilhado");
  const selectContent = fs.readFileSync(selectPath, "utf-8");

  assert.ok(selectContent.includes("rounded-xl"), "Select deve ter cantos rounded-xl consistentes");
  assert.ok(selectContent.includes("dark:bg-[#141416]"), "Select deve ter superfície escura Deep Black #141416");
});

test("Phase 1 Design System — 4. Componente Table e Tabs", () => {
  const tablePath = path.join(process.cwd(), "src", "components", "ui", "table.tsx");
  assert.ok(fs.existsSync(tablePath), "Table deve existir como componente compartilhado");
  const tableContent = fs.readFileSync(tablePath, "utf-8");

  assert.ok(tableContent.includes("TableHead"), "Table deve exportar TableHead");
  assert.ok(tableContent.includes("TableCell"), "Table deve exportar TableCell");
  assert.ok(tableContent.includes("dark:bg-[#19191C]"), "Table deve usar fundo Deep Black #19191C");

  const tabsPath = path.join(process.cwd(), "src", "components", "ui", "tabs.tsx");
  assert.ok(fs.existsSync(tabsPath), "Tabs deve existir como componente compartilhado");
  const tabsContent = fs.readFileSync(tabsPath, "utf-8");

  assert.ok(tabsContent.includes("TabsTrigger"), "Tabs deve exportar TabsTrigger");
  assert.ok(tabsContent.includes("TabsContent"), "Tabs deve exportar TabsContent");
  assert.ok(tabsContent.includes("rounded-xl"), "TabsList deve ter cantos rounded-xl");
});

test("Phase 1 Design System — 5. Estados Vazios, Skeleton e Acessibilidade", () => {
  const emptyStatePath = path.join(process.cwd(), "src", "components", "ui", "empty-state.tsx");
  assert.ok(fs.existsSync(emptyStatePath), "EmptyState deve existir");
  const emptyContent = fs.readFileSync(emptyStatePath, "utf-8");
  assert.ok(emptyContent.includes("font-heading"), "EmptyState deve utilizar a tipografia font-heading para o título");

  const skeletonPath = path.join(process.cwd(), "src", "components", "ui", "skeleton.tsx");
  assert.ok(fs.existsSync(skeletonPath), "Skeleton deve existir");
  const skeletonContent = fs.readFileSync(skeletonPath, "utf-8");
  assert.ok(skeletonContent.includes("animate-pulse"), "Skeleton deve ter animação de pulso");
  assert.ok(skeletonContent.includes("LoadingSpinner"), "Skeleton deve exportar LoadingSpinner");

  // Reduced motion
  const globalsPath = path.join(process.cwd(), "src", "app", "globals.css");
  const globalsContent = fs.readFileSync(globalsPath, "utf-8");
  assert.ok(
    globalsContent.includes("prefers-reduced-motion: reduce"),
    "globals.css deve contemplar suporte a prefers-reduced-motion"
  );
});
