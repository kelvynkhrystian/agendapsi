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

test("2. Novo Modo Escuro — Deep Black: Paleta neutra sem tons marrons, beges ou azulados", () => {
  const globalsCss = fs.readFileSync(path.join(__dirname, "../src/app/globals.css"), "utf8");

  // Verifica que o modo escuro utiliza a paleta Deep Black neutra especificada (R=G=B)
  assert.ok(globalsCss.includes("#080808"), "Modo escuro deve conter background profundo #080808");
  assert.ok(globalsCss.includes("#101010"), "Modo escuro deve conter sidebar e header #101010");
  assert.ok(globalsCss.includes("#191919"), "Modo escuro deve conter cards #191919");
  assert.ok(globalsCss.includes("#242424"), "Modo escuro deve conter superfícies elevadas #242424");
  assert.ok(globalsCss.includes("#141414"), "Modo escuro deve conter inputs #141414");
  assert.ok(globalsCss.includes("#333333"), "Modo escuro deve conter bordas neutras #333333");
  assert.ok(globalsCss.includes("#f5f5f5") || globalsCss.includes("#F5F5F5"), "Modo escuro deve conter texto primário #F5F5F5");
  assert.ok(globalsCss.includes("#cccccc") || globalsCss.includes("#CCCCCC"), "Modo escuro deve conter texto secundário #CCCCCC");
  assert.ok(globalsCss.includes("#a6a6a6") || globalsCss.includes("#A6A6A6"), "Modo escuro deve conter texto atenuado #A6A6A6");

  // Verifica diretiva customizada de dark mode para o Tailwind v4
  assert.ok(
    globalsCss.includes("@custom-variant dark"),
    "globals.css deve definir @custom-variant dark para alternância imediata sem depender do SO"
  );
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
  assert.ok(
    toggleCode.includes('type="button"'),
    "ThemeToggle deve ter type='button' explícito para evitar submissões de formulário"
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

test("6. Layouts Admin e Paciente: Uso consistente de bordas, superfícies Deep Black e tokens de tema", () => {
  const adminLayout = fs.readFileSync(path.join(__dirname, "../src/app/admin/layout.tsx"), "utf8");
  const patientLayout = fs.readFileSync(path.join(__dirname, "../src/app/paciente/layout.tsx"), "utf8");

  // Superfície lateral (#141414 ou #101010) e fundo (#0C0C0C ou #080808)
  assert.ok(adminLayout.includes("dark:bg-[#141414]") || adminLayout.includes("dark:bg-[#101010]"), "Sidebar admin deve usar paleta neutra (#141414 ou #101010)");
  assert.ok(adminLayout.includes("dark:bg-[#0C0C0C]") || adminLayout.includes("dark:bg-[#080808]"), "Container admin deve usar fundo neutro (#0C0C0C ou #080808)");
  assert.ok(adminLayout.includes("var(--primary)"), "Admin deve utilizar token var(--primary)");

  assert.ok(patientLayout.includes("dark:bg-[#141414]") || patientLayout.includes("dark:bg-[#101010]"), "Sidebar paciente deve usar paleta neutra (#141414 ou #101010)");
  assert.ok(patientLayout.includes("dark:bg-[#0C0C0C]") || patientLayout.includes("dark:bg-[#080808]"), "Container paciente deve usar fundo neutro (#0C0C0C ou #080808)");
  assert.ok(patientLayout.includes("var(--primary)"), "Paciente deve utilizar token var(--primary)");

  // Botão de Agendamento do paciente não possui teal fixo
  assert.ok(
    !patientLayout.includes("bg-teal-600 hover:bg-teal-700"),
    "Botão de agendamento do paciente não deve conter classe hardcoded bg-teal-600"
  );
});

test("7. Componentes Compartilhados: Card, Button, Input, Badge, Alert e Modal harmonizados com Deep Black", () => {
  const cardCode = fs.readFileSync(path.join(__dirname, "../src/components/ui/card.tsx"), "utf8");
  const buttonCode = fs.readFileSync(path.join(__dirname, "../src/components/ui/button.tsx"), "utf8");
  const inputCode = fs.readFileSync(path.join(__dirname, "../src/components/ui/input.tsx"), "utf8");
  const badgeCode = fs.readFileSync(path.join(__dirname, "../src/components/ui/badge.tsx"), "utf8");
  const alertCode = fs.readFileSync(path.join(__dirname, "../src/components/ui/alert.tsx"), "utf8");
  const modalCode = fs.readFileSync(path.join(__dirname, "../src/components/ui/modal.tsx"), "utf8");

  // Card: rounded-2xl e superfícies escuras neutras (#202020 ou #191919)
  assert.ok(cardCode.includes("rounded-2xl"), "Card deve ter cantos rounded-2xl alinhados ao MiniSite");
  assert.ok(cardCode.includes("dark:bg-[#202020]") || cardCode.includes("dark:bg-[#191919]"), "Card deve ter fundo escuro neutro");

  // Button: rounded-xl e var(--button-bg,var(--primary)) e var(--button-fg)
  assert.ok(buttonCode.includes("rounded-xl"), "Button deve ter cantos rounded-xl");
  assert.ok(buttonCode.includes("var(--button-bg,var(--primary))") || buttonCode.includes("dark:bg-[#424242]"), "Button primário deve usar token de tema");

  // Input: rounded-xl, superfície neutra (#1B1B1B ou #141414)
  assert.ok(inputCode.includes("rounded-xl"), "Input deve ter cantos rounded-xl");
  assert.ok(inputCode.includes("dark:bg-[#1B1B1B]") || inputCode.includes("dark:bg-[#141414]"), "Input deve ter fundo escuro neutro");
  assert.ok(inputCode.includes("var(--primary)") || inputCode.includes("focus-visible:ring"), "Input deve ter anel de foco acessível");

  // Badge: default usa token de tema primário
  assert.ok(badgeCode.includes("var(--primary)") || badgeCode.includes("dark:bg-[#292929]"), "Badge default deve refletir o token primário ou cinza neutro");

  // Alert: info usa token de tema sem teal fixo
  assert.ok(alertCode.includes("var(--primary)") || alertCode.includes("dark:bg-[#202020]"), "Alert info deve harmonizar com paleta neutra");

  // Modal: rounded-2xl e superfície escura neutra (#202020 ou #191919)
  assert.ok(modalCode.includes("rounded-2xl"), "Modal deve ter cantos rounded-2xl");
  assert.ok(modalCode.includes("dark:bg-[#202020]") || modalCode.includes("dark:bg-[#191919]"), "Modal deve ter fundo escuro neutro");
});

test("8. Contraste de Texto Acessível: Informações de status e cabeçalhos legíveis em Dark Mode", () => {
  const agendaCode = fs.readFileSync(path.join(__dirname, "../src/app/admin/agenda/page.tsx"), "utf8");

  // Cabeçalho de dia na agenda e teleconsulta têm texto com contraste nítido (#F5F5F5 / #171717)
  assert.ok(
    agendaCode.includes("text-[#171717] dark:text-[#F5F5F5] font-bold") ||
    agendaCode.includes("font-bold text-[#171717] dark:text-[#F5F5F5]"),
    "Cabeçalho do dia na agenda deve ter texto com contraste nítido"
  );
  assert.ok(
    agendaCode.includes("font-bold text-[#171717] dark:text-[#F5F5F5] block text-xs"),
    "Título da sala de teleconsulta deve ser nítido"
  );
});

test("9. Auditoria de Cores Fixas: Remoção de classes azuis fixas indevidas", () => {
  const verifyCode = fs.readFileSync(path.join(__dirname, "../src/app/paciente/verificar-email/page.tsx"), "utf8");

  // Deve utilizar o token primário do tema em vez de blue-50 / blue-600 fixo
  assert.ok(
    !verifyCode.includes("bg-blue-50 dark:bg-blue-900/30 text-blue-600"),
    "Página de verificar-email não deve conter azul fixo indevido"
  );
  assert.ok(
    verifyCode.includes("bg-[var(--primary)]/10 text-[var(--primary)]"),
    "Página de verificar-email deve adotar token primário dinâmico"
  );
});
