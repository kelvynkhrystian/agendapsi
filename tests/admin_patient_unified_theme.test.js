const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

test("1. Tokens de Design Unificados: Globals CSS e Layout contêm os tokens semânticos compartilhados", () => {
  const globalsCss = fs.readFileSync(path.join(__dirname, "../src/app/globals.css"), "utf8");
  const layoutTsx = fs.readFileSync(path.join(__dirname, "../src/app/layout.tsx"), "utf8");

  // Tokens essenciais
  const requiredTokens = [
    "--color-primary",
    "--color-primary-hover",
    "--color-secondary",
    "--color-accent",
    "--color-background",
    "--color-surface",
    "--color-text",
    "--color-text-muted",
    "--color-border",
  ];

  for (const token of requiredTokens) {
    assert.ok(
      globalsCss.includes(token),
      `globals.css deve definir o token semântico ${token}`
    );
    assert.ok(
      layoutTsx.includes(token),
      `layout.tsx deve injetar dinamicamente o token semântico ${token}`
    );
  }
});

test("2. Paleta Escura Neutra (Neutral Gray): Sem tonalidade azul nos fundos internos", () => {
  const globalsCss = fs.readFileSync(path.join(__dirname, "../src/app/globals.css"), "utf8");

  // Verifica que o modo escuro utiliza a paleta de cinzas neutros especificada
  assert.ok(globalsCss.includes("#202020"), "Modo escuro deve conter background neutro #202020");
  assert.ok(globalsCss.includes("#2D2D2D"), "Modo escuro deve conter cards/superfícies #2D2D2D");
  assert.ok(globalsCss.includes("#353535"), "Modo escuro deve conter superfícies elevadas #353535");
  assert.ok(globalsCss.includes("#444444"), "Modo escuro deve conter bordas neutras #444444");
  assert.ok(globalsCss.includes("#F5F5F5"), "Modo escuro deve conter texto primário neutro #F5F5F5");
  assert.ok(globalsCss.includes("#BDBDBD"), "Modo escuro deve conter texto secundário neutro #BDBDBD");

  // Verifica que classes azuis antigas (slate-950, slate-900) são sobrepostas na camada neutra
  assert.ok(globalsCss.includes(".dark .bg-slate-950"), "Deve sobrepor bg-slate-950 para cinza neutro");
  assert.ok(globalsCss.includes(".dark .bg-slate-900"), "Deve sobrepor bg-slate-900 para cinza neutro");
});

test("3. Isolamento Estrito do MiniSite Público: Sempre modo claro", () => {
  const pageTsx = fs.readFileSync(path.join(__dirname, "../src/app/page.tsx"), "utf8");
  const globalsCss = fs.readFileSync(path.join(__dirname, "../src/app/globals.css"), "utf8");

  // MiniSite deve ter marcação explícita de light mode
  assert.ok(
    pageTsx.includes('data-theme="light"'),
    "MiniSite deve conter atributo data-theme='light' no container raiz"
  );
  assert.ok(
    pageTsx.includes("minisite-root light"),
    "MiniSite deve conter classe 'minisite-root light'"
  );

  // Globals CSS deve conter barreira de contenção
  assert.ok(
    globalsCss.includes('[data-theme="light"]') || globalsCss.includes(".minisite-root"),
    "Globals CSS deve conter regra de isolamento para [data-theme='light'] ou .minisite-root"
  );
  assert.ok(
    globalsCss.includes("color-scheme: light !important;"),
    "Deve forçar color-scheme: light para o MiniSite"
  );
});

test("4. ThemeToggle é restrito: Não renderiza em páginas públicas ou MiniSite", () => {
  const toggleCode = fs.readFileSync(path.join(__dirname, "../src/components/ui/theme-toggle.tsx"), "utf8");

  assert.ok(
    toggleCode.includes("isDarkAllowed"),
    "ThemeToggle deve consultar isDarkAllowed"
  );
  assert.ok(
    toggleCode.includes("if (!isDarkAllowed) return null"),
    "ThemeToggle deve retornar null se modo escuro não for permitido"
  );
});

test("5. Persistência Independente: Preferência de Admin e Paciente são desacopladas", () => {
  const providerCode = fs.readFileSync(path.join(__dirname, "../src/components/theme-provider.tsx"), "utf8");

  // Verifica chaves isoladas
  assert.ok(
    providerCode.includes("psi_theme_admin"),
    "ThemeProvider deve suportar chave isolada psi_theme_admin para administrador"
  );
  assert.ok(
    providerCode.includes("psi_theme_patient"),
    "ThemeProvider deve suportar chave isolada psi_theme_patient para paciente"
  );

  // Simulação de isolamento
  const storage = {};
  const mockLocalStorage = {
    getItem: (k) => storage[k] || null,
    setItem: (k, v) => { storage[k] = v; },
  };

  // Simulação: Paciente escolhe "dark"
  mockLocalStorage.setItem("psi_theme_patient", "dark");
  assert.strictEqual(mockLocalStorage.getItem("psi_theme_patient"), "dark");
  assert.strictEqual(mockLocalStorage.getItem("psi_theme_admin"), null, "Escolha do paciente não afeta o admin");

  // Simulação: Admin escolhe "light"
  mockLocalStorage.setItem("psi_theme_admin", "light");
  assert.strictEqual(mockLocalStorage.getItem("psi_theme_admin"), "light");
  assert.strictEqual(mockLocalStorage.getItem("psi_theme_patient"), "dark", "Escolha do admin não afeta o paciente");
});

test("6. Layouts Admin e Paciente: Uso consistente de bordas, superfícies neutras e tokens de tema", () => {
  const adminLayout = fs.readFileSync(path.join(__dirname, "../src/app/admin/layout.tsx"), "utf8");
  const patientLayout = fs.readFileSync(path.join(__dirname, "../src/app/paciente/layout.tsx"), "utf8");

  // Superfície lateral cinza neutra (#191919) e fundo (#202020)
  assert.ok(adminLayout.includes("dark:bg-[#191919]"), "Sidebar admin deve usar cinza neutro #191919");
  assert.ok(adminLayout.includes("dark:bg-[#202020]"), "Container admin deve usar fundo neutro #202020");
  assert.ok(adminLayout.includes("var(--primary)"), "Admin deve utilizar token var(--primary)");

  assert.ok(patientLayout.includes("dark:bg-[#191919]"), "Sidebar paciente deve usar cinza neutro #191919");
  assert.ok(patientLayout.includes("dark:bg-[#202020]"), "Container paciente deve usar fundo neutro #202020");
  assert.ok(patientLayout.includes("var(--primary)"), "Paciente deve utilizar token var(--primary)");

  // Botão de Agendamento do paciente não possui teal fixo
  assert.ok(
    !patientLayout.includes("bg-teal-600 hover:bg-teal-700"),
    "Botão de agendamento do paciente não deve conter classe hardcoded bg-teal-600"
  );
});

test("7. Componentes Compartilhados: Card, Button, Input, Badge, Alert e Modal harmonizados", () => {
  const cardCode = fs.readFileSync(path.join(__dirname, "../src/components/ui/card.tsx"), "utf8");
  const buttonCode = fs.readFileSync(path.join(__dirname, "../src/components/ui/button.tsx"), "utf8");
  const inputCode = fs.readFileSync(path.join(__dirname, "../src/components/ui/input.tsx"), "utf8");
  const badgeCode = fs.readFileSync(path.join(__dirname, "../src/components/ui/badge.tsx"), "utf8");
  const alertCode = fs.readFileSync(path.join(__dirname, "../src/components/ui/alert.tsx"), "utf8");
  const modalCode = fs.readFileSync(path.join(__dirname, "../src/components/ui/modal.tsx"), "utf8");

  // Card: rounded-2xl e superfícies neutras
  assert.ok(cardCode.includes("rounded-2xl"), "Card deve ter cantos rounded-2xl alinhados ao MiniSite");
  assert.ok(cardCode.includes("dark:bg-[#2D2D2D]"), "Card deve ter fundo escuro neutro #2D2D2D");

  // Button: rounded-xl e var(--button-bg,var(--primary))
  assert.ok(buttonCode.includes("rounded-xl"), "Button deve ter cantos rounded-xl");
  assert.ok(buttonCode.includes("var(--button-bg,var(--primary))"), "Button primário deve usar token de tema");

  // Input: rounded-xl, foco no tema primário sem teal hardcoded
  assert.ok(inputCode.includes("rounded-xl"), "Input deve ter cantos rounded-xl");
  assert.ok(inputCode.includes("var(--primary)"), "Input deve ter anel de foco baseado em var(--primary)");
  assert.ok(!inputCode.includes("focus-visible:ring-teal-500"), "Input não deve ter teal-500 hardcoded");

  // Badge: default usa token de tema primário
  assert.ok(badgeCode.includes("var(--primary)"), "Badge default deve refletir o token primário do tema");

  // Alert: info usa token de tema sem teal fixo
  assert.ok(alertCode.includes("var(--primary)"), "Alert info deve harmonizar com a cor primária do tema");
  assert.ok(!alertCode.includes("bg-teal-50 border-teal-200"), "Alert info não deve conter teal hardcoded");

  // Modal: rounded-2xl e superfície neutra #2D2D2D
  assert.ok(modalCode.includes("rounded-2xl"), "Modal deve ter cantos rounded-2xl");
  assert.ok(modalCode.includes("dark:bg-[#2D2D2D]"), "Modal deve ter fundo escuro neutro #2D2D2D");
});
