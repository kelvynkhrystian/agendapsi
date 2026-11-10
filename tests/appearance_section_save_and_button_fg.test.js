const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("Appearance Settings, Independent Section Saving & Global Light Mode White Button Foreground", async (t) => {
  await t.test("1. resolveAccessibleButtonBg garante contraste >= 4.5:1 com texto branco", () => {
    const themePresets = require("../src/lib/theme-presets.ts");
    const samples = [
      "#FFFFFF",
      "#FACC15",
      "#EAB308",
      "#FEF08A",
      "#EC4899",
      "#16A34A",
      "#EA580C",
      "#2563EB",
      "#9333EA",
      "#0F766E",
    ];

    for (const hex of samples) {
      const resolved = themePresets.resolveAccessibleButtonBg(hex, 4.6);
      assert.match(resolved, /^#[0-9A-F]{6}$/i, `Cor resolvida para ${hex} deve ser HEX válido`);
      const ratio = themePresets.calculateContrastRatio("#FFFFFF", resolved);
      assert.ok(
        ratio >= 4.5,
        `Botão com fundo ${resolved} (origem ${hex}) deve ter contraste >= 4.5:1 contra branco (obtido ${ratio}:1)`
      );
    }
  });

  await t.test("2. API /api/admin/appearance suporta scope='theme' e scope='images' sem sobrescritas cruzadas", () => {
    const routePath = path.join(process.cwd(), "src/app/api/admin/appearance/route.ts");
    const src = fs.readFileSync(routePath, "utf8");

    assert.ok(src.includes('scope === "theme"'), "Deve tratar scope='theme' de forma isolada");
    assert.ok(src.includes('scope === "images"'), "Deve tratar scope='images' de forma isolada");
    assert.ok(src.includes('"Tema atualizado com sucesso."'), "Deve retornar exatamente 'Tema atualizado com sucesso.'");
    assert.ok(src.includes("logoUrl"), "Deve manter persistência de logoUrl no escopo de imagens");
    assert.ok(src.includes("revalidatePath"), "Deve revalidar rotas após alterações");
  });

  await t.test("3. API /api/admin/profile suporta section='application' | 'professional' | 'contact' isoladamente", () => {
    const routePath = path.join(process.cwd(), "src/app/api/admin/profile/route.ts");
    const src = fs.readFileSync(routePath, "utf8");

    assert.ok(src.includes('"application"') && src.includes('"professional"') && src.includes('"contact"'));
    assert.ok(src.includes("parsed.data.section") || src.includes("section === \"application\""));
    assert.ok(!src.includes("passwordHash"));
  });

  await t.test("4. UI /admin/configuracoes coloca 'Salvar Tema' ao lado do Preview e exibe Cores Personalizadas condicionalmente", () => {
    const pagePath = path.join(process.cwd(), "src/app/admin/configuracoes/page.tsx");
    const src = fs.readFileSync(pagePath, "utf8");

    // Preview + "Salvar Tema" lado a lado dentro da mesma seção Aparência
    const previewIdx = src.indexOf('data-testid="theme-preview-box"');
    const saveThemeIdx = src.indexOf("onClick={handleSaveTheme}");
    assert.ok(previewIdx !== -1 && saveThemeIdx !== -1, "Preview e botão handleSaveTheme devem existir");
    assert.ok(src.includes("md:flex-row") && src.includes("Salvar Tema"), "Botão Salvar Tema deve ficar ao lado do Preview no desktop");
    assert.ok(!src.includes("Salvar e Aplicar Tema"), "Não deve existir botão duplicado 'Salvar e Aplicar Tema'");

    // Cores Personalizadas estritamente condicional a themeName === "PERSONALIZADO"
    assert.ok(src.includes('{themeName === "PERSONALIZADO" && ('), "Cores Personalizadas só deve ser renderizado quando Personalizado estiver selecionado");
    assert.ok(src.includes("animate-custom-colors-enter"), "Cores Personalizadas deve usar transição suave de entrada");
    assert.ok(src.includes('handleCustomColorChange("buttonColor"'), "Deve incluir input para Cor dos Botões");

    // Inicialização semântica a partir do último preset selecionado
    assert.ok(src.includes("lastBasePreset"), "Deve rastrear o último preset selecionado antes de entrar em Personalizado");
    assert.ok(src.includes("handleSelectCustomTheme"), "Preset Personalizado deve usar handleSelectCustomTheme");

    // Salvamento independente por seção e persistência real de Agenda & Políticas
    assert.ok(src.includes("handleSaveAppSection"));
    assert.ok(src.includes("handleSaveProfSection"));
    assert.ok(src.includes("handleSaveContactSection"));
    assert.ok(src.includes("handleSaveSystemImages"));
    assert.ok(src.includes("handleSaveGeneralSettings"));
    assert.ok(src.includes('/api/admin/services/settings'), "Agenda & Políticas deve persistir via /api/admin/services/settings");
  });

  await t.test("5. UI Kit Button usa tokens claros no Light Mode (primário com --button-fg branco) e Dark Mode fosco com destaque", () => {
    const buttonPath = path.join(process.cwd(), "src/components/ui/button.tsx");
    const buttonSrc = fs.readFileSync(buttonPath, "utf8");
    const cssPath = path.join(process.cwd(), "src/app/globals.css");
    const cssSrc = fs.readFileSync(cssPath, "utf8");

    assert.ok(buttonSrc.includes("--button-bg"), "Button primary deve ler --button-bg");
    assert.ok(buttonSrc.includes("--button-fg"), "Button primary deve usar --button-fg branco");
    assert.ok(buttonSrc.includes("--button-secondary-bg"), "Button secondary deve ler --button-secondary-bg branco no Light Mode");
    assert.ok(buttonSrc.includes("--button-secondary-fg"), "Button secondary deve ler --button-secondary-fg laranja/tema no Light Mode");
    assert.ok(buttonSrc.includes("--button-outline-bg"), "Button outline deve ler --button-outline-bg branco no Light Mode");
    assert.ok(buttonSrc.includes("--button-outline-fg"), "Button outline deve ler --button-outline-fg laranja/tema no Light Mode");
    assert.ok(buttonSrc.includes("--button-ghost-bg"), "Button ghost deve ler --button-ghost-bg transparente no Light Mode");
    assert.ok(buttonSrc.includes("--button-ghost-fg"), "Button ghost deve ler --button-ghost-fg laranja/tema no Light Mode");
    assert.ok(cssSrc.includes("--button-fg: #ffffff;"), "globals.css deve definir --button-fg: #ffffff em :root");
    assert.ok(cssSrc.includes("--button-secondary-bg: #ffffff;"), "globals.css deve manter secondary branco no Light Mode");
    assert.ok(cssSrc.includes("--button-secondary-fg: #ca4c0a;"), "globals.css deve manter secondary com letra laranja acessível no Light Mode");
    assert.ok(cssSrc.includes("--button-outline-bg: #ffffff;"), "globals.css deve manter outline branco no Light Mode");
    assert.ok(cssSrc.includes("--button-outline-fg: #ca4c0a;"), "globals.css deve manter outline com letra laranja acessível no Light Mode");
    assert.ok(
      cssSrc.includes(".dark,") &&
        cssSrc.includes("--background: #0c0c0c;") &&
        cssSrc.includes("--card: #1a1a1a;") &&
        cssSrc.includes("--color-surface: #202020;") &&
        cssSrc.includes("--dark-accent-vivid:"),
      "Dark Mode fosco (#0c0c0c / #1a1a1a / #202020) com destaque quente deve permanecer preservado"
    );
  });
});
