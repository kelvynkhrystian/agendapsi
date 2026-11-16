const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("1. PatientRegisterForm: componente compartilhado com campos estritos e proteção de menores", () => {
  const compPath = path.join(process.cwd(), "src", "components", "auth", "patient-register-form.tsx");
  assert.ok(fs.existsSync(compPath), "patient-register-form.tsx deve existir em src/components/auth/");

  const src = fs.readFileSync(compPath, "utf-8");

  // Campos obrigatórios mínimos
  assert.ok(src.includes("fullName"), "Deve conter estado/campo de Nome Completo");
  assert.ok(src.includes("email"), "Deve conter estado/campo de E-mail");
  assert.ok(src.includes("phone"), "Deve conter estado/campo de Telefone / WhatsApp");
  assert.ok(src.includes("password"), "Deve conter estado/campo de Senha");
  assert.ok(src.includes("confirmPassword"), "Deve conter estado/campo de Confirmar Senha");
  assert.ok(src.includes("acceptTerms"), "Deve conter estado/campo de Aceite de Termos e Privacidade");

  // Proteção de Menores de Idade (LGPD & CFP)
  assert.ok(src.includes("isMinor"), "Deve permitir marcar paciente como menor de 18 anos");
  assert.ok(src.includes("guardianFullName"), "Deve conter campo Nome do Responsável Legal");
  assert.ok(src.includes("guardianCpf"), "Deve conter campo CPF do Responsável Legal");
  assert.ok(src.includes("guardianPhone"), "Deve conter campo Telefone/WhatsApp do Responsável Legal");
  assert.ok(src.includes("guardianRelationship"), "Deve conter campo Grau de Parentesco");

  // Validação estrita de senhas
  assert.ok(src.includes("password !== confirmPassword"), "Deve validar se as senhas coincidem");
  assert.ok(src.includes("password.length < 8"), "Deve validar tamanho mínimo de 8 caracteres");

  // Endpoint oficial backend
  assert.ok(src.includes("/api/auth/register-patient"), "Deve enviar dados para /api/auth/register-patient");
});

test("2. Reuso sem duplicação: /agendar e /cadastro utilizam o mesmo PatientRegisterForm", () => {
  const agendarPath = path.join(process.cwd(), "src", "app", "agendar", "page.tsx");
  const cadastroPath = path.join(process.cwd(), "src", "app", "cadastro", "page.tsx");

  const agendarSrc = fs.readFileSync(agendarPath, "utf-8");
  const cadastroSrc = fs.readFileSync(cadastroPath, "utf-8");

  // /agendar importa e renderiza PatientRegisterForm
  assert.ok(agendarSrc.includes("PatientRegisterForm"), "/agendar deve importar PatientRegisterForm");
  assert.ok(agendarSrc.includes("<PatientRegisterForm"), "/agendar deve renderizar <PatientRegisterForm");

  // /cadastro importa e renderiza PatientRegisterForm
  assert.ok(cadastroSrc.includes("PatientRegisterForm"), "/cadastro deve importar PatientRegisterForm");
  assert.ok(cadastroSrc.includes("<PatientRegisterForm"), "/cadastro deve renderizar <PatientRegisterForm");
});

test("3. BookingHeader: cabeçalho dedicado com Voltar, Logo centralizada no mobile e Menu Hambúrguer", () => {
  const headerPath = path.join(process.cwd(), "src", "components", "booking", "booking-header.tsx");
  assert.ok(fs.existsSync(headerPath), "booking-header.tsx deve existir em src/components/booking/");

  const src = fs.readFileSync(headerPath, "utf-8");

  // Layout mobile: [ Seta Voltar ] — [ Logo Centralizada ] — [ Menu Hamburguer ]
  assert.ok(src.includes("onBack"), "Deve suportar prop onBack");
  assert.ok(src.includes("ArrowLeft"), "Deve renderizar ícone de seta para voltar");
  assert.ok(src.includes("Menu"), "Deve incluir botão de menu hamburguer no mobile");
  assert.ok(src.includes("logoHorizontalUrl"), "Deve suportar logo horizontal");
  assert.ok(src.includes("logoUrl"), "Deve suportar logo quadrada");
  assert.ok(src.includes("fixed top-0"), "Deve ser fixo no topo");
  assert.ok(src.includes("bg-white"), "Deve ter fundo branco sólido");

  // Layout desktop: fundo branco sólido, contorno e letras laranjas
  assert.ok(src.includes("border-[var(--primary)]"), "Deve ter contorno com a cor do tema (laranja)");
  assert.ok(src.includes("text-[var(--primary)]"), "Deve ter letras com a cor do tema (laranja)");
});

test("4. Cabeçalho compartilhado entre /agendar, /login, /cadastro e /recuperar-senha", () => {
  const agendarPath = path.join(process.cwd(), "src", "app", "agendar", "page.tsx");
  const loginPath = path.join(process.cwd(), "src", "app", "login", "page.tsx");
  const cadastroPath = path.join(process.cwd(), "src", "app", "cadastro", "page.tsx");
  const recuperarPath = path.join(process.cwd(), "src", "app", "recuperar-senha", "page.tsx");

  const agendarSrc = fs.readFileSync(agendarPath, "utf-8");
  const loginSrc = fs.readFileSync(loginPath, "utf-8");
  const cadastroSrc = fs.readFileSync(cadastroPath, "utf-8");
  const recuperarSrc = fs.readFileSync(recuperarPath, "utf-8");

  // Todos utilizam BookingHeader
  assert.ok(agendarSrc.includes("<BookingHeader"), "/agendar deve renderizar <BookingHeader");
  assert.ok(loginSrc.includes("<BookingHeader"), "/login deve renderizar <BookingHeader");
  assert.ok(cadastroSrc.includes("<BookingHeader"), "/cadastro deve renderizar <BookingHeader");
  assert.ok(recuperarSrc.includes("<BookingHeader"), "/recuperar-senha deve renderizar <BookingHeader");

  // Visual Light Mode e sem ThemeToggle
  assert.ok(loginSrc.includes('data-theme="light"'), "/login deve forçar data-theme='light'");
  assert.ok(!loginSrc.includes("ThemeToggle"), "/login não deve incluir ThemeToggle");
  assert.ok(!loginSrc.includes("dark:bg-"), "/login não deve conter classes de modo escuro");

  assert.ok(cadastroSrc.includes('data-theme="light"'), "/cadastro deve forçar data-theme='light'");
  assert.ok(!cadastroSrc.includes("ThemeToggle"), "/cadastro não deve incluir ThemeToggle");
  assert.ok(!cadastroSrc.includes("dark:bg-"), "/cadastro não deve conter classes de modo escuro");

  // Sem branding hardcoded "PSI Consultório"
  assert.ok(!loginSrc.includes("PSI Consultório"), "/login não deve ter 'PSI Consultório' fixo");
  assert.ok(!cadastroSrc.includes("PSI Consultório"), "/cadastro não deve ter 'PSI Consultório' fixo");
});

test("5. Navegação segura do botão Voltar", () => {
  const agendarPath = path.join(process.cwd(), "src", "app", "agendar", "page.tsx");
  const loginPath = path.join(process.cwd(), "src", "app", "login", "page.tsx");
  const cadastroPath = path.join(process.cwd(), "src", "app", "cadastro", "page.tsx");
  const recuperarPath = path.join(process.cwd(), "src", "app", "recuperar-senha", "page.tsx");

  const agendarSrc = fs.readFileSync(agendarPath, "utf-8");
  const loginSrc = fs.readFileSync(loginPath, "utf-8");
  const cadastroSrc = fs.readFileSync(cadastroPath, "utf-8");
  const recuperarSrc = fs.readFileSync(recuperarPath, "utf-8");

  // /agendar: step 1 volta para '/', step > 1 volta para step anterior
  assert.ok(agendarSrc.includes("step === 1"), "/agendar deve checar se step === 1");
  assert.ok(agendarSrc.includes('router.push("/")'), "/agendar deve voltar para '/' no step 1");
  assert.ok(agendarSrc.includes("prev - 1"), "/agendar deve retornar para prev - 1 nos steps posteriores");

  // /login
  assert.ok(loginSrc.includes('fromParam === "agendar"'), "/login deve retornar a /agendar se from=agendar");

  // /cadastro
  assert.ok(cadastroSrc.includes('fromParam === "agendar"'), "/cadastro deve retornar a /agendar se from=agendar");
  assert.ok(cadastroSrc.includes('router.push("/login")'), "/cadastro deve retornar a /login por padrão");

  // /recuperar-senha
  assert.ok(recuperarSrc.includes('fromParam === "agendar"'), "/recuperar-senha deve retornar a /agendar se from=agendar");
  assert.ok(recuperarSrc.includes('router.push("/login")'), "/recuperar-senha deve retornar a /login por padrão");
});
