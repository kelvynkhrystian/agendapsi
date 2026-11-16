const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("1. Recuperar Senha: Identidade visual consistente com /agendar, Light Mode estrito e sem ThemeToggle", () => {
  const filePath = path.join(process.cwd(), "src", "app", "recuperar-senha", "page.tsx");
  assert.ok(fs.existsSync(filePath), "Arquivo /recuperar-senha/page.tsx deve existir");
  const content = fs.readFileSync(filePath, "utf-8");

  // Modo claro estrito e background consistente com /agendar (#FDFCFB)
  assert.ok(content.includes('data-theme="light"'), "Deve forçar data-theme light");
  assert.ok(content.includes("bg-[#FDFCFB]"), "Deve utilizar o fundo claro neutro padronizado #FDFCFB");
  assert.equal(
    content.includes("ThemeToggle"),
    false,
    "Não deve conter ThemeToggle na tela pública de recuperação de senha"
  );
  assert.equal(
    content.includes("dark:"),
    false,
    "Não deve conter classes de dark mode na interface pública de recuperação"
  );
});

test("2. Recuperar Senha: Cabeçalho com BookingHeader, branding dinâmico e sem 'PSI Consultório' hardcoded", () => {
  const filePath = path.join(process.cwd(), "src", "app", "recuperar-senha", "page.tsx");
  const content = fs.readFileSync(filePath, "utf-8");

  // Reutilização do BookingHeader com botão voltar
  assert.ok(content.includes("<BookingHeader"), "Deve renderizar o BookingHeader dedicado");
  assert.ok(content.includes("onBack={handleBack}"), "Deve vincular onBack à navegação segura");

  // Branding dinâmico vindo da API
  assert.ok(content.includes('fetch("/api/site/settings"'), "Deve carregar configurações de site");
  assert.ok(content.includes('fetch("/api/profile"'), "Deve carregar perfil profissional");
  assert.ok(content.includes("logoHorizontalUrl={site?.logoHorizontalUrl}"), "Deve passar logo horizontal");
  assert.ok(content.includes("logoUrl={site?.logoUrl}"), "Deve passar logo quadrada");
  assert.ok(content.includes("clinicName={site?.clinicName}"), "Deve passar nome do consultório dinâmico");

  // Ausência de branding hardcoded
  assert.equal(
    content.includes("PSI Consultório"),
    false,
    "Não deve hardcodar a marca 'PSI Consultório'"
  );
});

test("3. Recuperar Senha: Sem ondas decorativas, sem faixa laranja e com cores dinâmicas do tema", () => {
  const filePath = path.join(process.cwd(), "src", "app", "recuperar-senha", "page.tsx");
  const content = fs.readFileSync(filePath, "utf-8");

  // Sem ondas nem faixas coloridas
  assert.equal(content.includes("BookingHeaderWaves"), false, "Não deve conter ondas decorativas");
  assert.equal(content.includes("<svg"), false, "Não deve conter camadas de ondas SVG decorativas");
  assert.equal(content.includes("bg-orange-"), false, "Não deve hardcodar classes Tailwind orange");
  assert.equal(content.includes("#f97316"), false, "Não deve hardcodar cor hex laranja");

  // Uso de tokens do tema
  assert.ok(
    content.includes("var(--primary)") || content.includes("var(--button-bg,var(--primary))"),
    "Deve utilizar variáveis CSS do tema para botões e destaques"
  );
});

test("4. Recuperar Senha: Preservação integral da segurança, validações e fluxos de recuperação", () => {
  const filePath = path.join(process.cwd(), "src", "app", "recuperar-senha", "page.tsx");
  const content = fs.readFileSync(filePath, "utf-8");

  // Endpoint de recuperação
  assert.ok(
    content.includes('fetch("/api/auth/recover-password"'),
    "Deve consultar e submeter ao endpoint oficial /api/auth/recover-password"
  );

  // Tratamento dos fluxos de recuperação
  assert.ok(content.includes("isAdminAssistedOnly"), "Deve suportar fluxo de atendimento assistido");
  assert.ok(content.includes("isSmsFallback"), "Deve suportar fallback via SMS");
  assert.ok(content.includes("devLink"), "Deve exibir devLink em ambiente de desenvolvimento");
  assert.ok(content.includes("Enviar Instruções"), "Botão principal padrão deve ser 'Enviar Instruções'");
  assert.ok(content.includes("Voltar ao Login"), "Ação secundária deve ser 'Voltar ao Login'");
});

test("5. Recuperar Senha: Navegação segura preservando retorno quando originado de /agendar", () => {
  const filePath = path.join(process.cwd(), "src", "app", "recuperar-senha", "page.tsx");
  const content = fs.readFileSync(filePath, "utf-8");

  // Suporte a retorno seguro para agendamento
  assert.ok(content.includes('from === "agendar"'), "Deve detectar retorno para /agendar");
  assert.ok(content.includes('router.push("/agendar")'), "Deve redirecionar para /agendar ao voltar");
  assert.ok(
    content.includes('!document.referrer.includes("/admin")'),
    "Não deve redirecionar involuntariamente para páginas administrativas"
  );
  assert.ok(content.includes('loginUrl'), "Deve fornecer rota segura para login");
});

test("6. Agendamento (/agendar): Remoção completa das ondas decorativas do cabeçalho e uso de BookingHeader", () => {
  const filePath = path.join(process.cwd(), "src", "app", "agendar", "page.tsx");
  const content = fs.readFileSync(filePath, "utf-8");

  // Remoção das ondas
  assert.equal(
    content.includes("BookingHeaderWaves"),
    false,
    "/agendar não deve importar nem renderizar BookingHeaderWaves"
  );

  // Espaçamento natural sem gap excessivo
  assert.ok(
    content.includes("pt-20") || content.includes("pt-22") || content.includes("pt-24"),
    "Main deve ter padding superior compacto alinhado com o cabeçalho"
  );

  // Preservação do Stepper e do Header Branded
  assert.ok(content.includes("<BookingStepper"), "Deve preservar o BookingStepper");
  assert.ok(content.includes("<BookingHeader"), "Deve renderizar o BookingHeader minimalista");
});

test("7. BookingHeader: Consistência visual, layout justify-between e backdrop limpo com borda sutil", () => {
  const filePath = path.join(process.cwd(), "src", "components", "booking", "booking-header.tsx");
  const content = fs.readFileSync(filePath, "utf-8");

  assert.ok(content.includes("data-testid=\"booking-header\""), "BookingHeader deve ter data-testid='booking-header'");
  assert.ok(content.includes("justify-between"), "Deve usar justify-between com botão voltar à esquerda e logo à direita");
  assert.ok(content.includes("border-b"), "Deve possuir borda inferior sutil");
  assert.ok(content.includes("bg-white"), "Deve ter fundo branco limpo");
});
