const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

function loadHeaderProfileModule() {
  const tsPath = path.join(process.cwd(), "src", "lib", "header-profile.ts");
  const source = fs.readFileSync(tsPath, "utf-8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;

  const mod = { exports: {} };
  const fn = new Function("exports", "module", transpiled);
  fn(mod.exports, mod);
  return mod.exports;
}

test("1. Lógica pura de Primeiro Nome e Iniciais (src/lib/header-profile.ts)", () => {
  const {
    extractFirstName,
    getUserInitials,
    DEFAULT_PROFILE_FALLBACK_NAME,
  } = loadHeaderProfileModule();

  assert.strictEqual(extractFirstName("Rômulo Mafra"), "Rômulo");
  assert.strictEqual(getUserInitials("Rômulo Mafra"), "RM");

  assert.strictEqual(extractFirstName("Carlos Eduardo Silva"), "Carlos");
  assert.strictEqual(getUserInitials("Carlos Eduardo Silva"), "CS");

  assert.strictEqual(extractFirstName("Ana Carolina"), "Ana");
  assert.strictEqual(getUserInitials("Ana Carolina"), "AC");

  assert.strictEqual(extractFirstName("  Marina   "), "Marina");
  assert.strictEqual(getUserInitials("  Marina   "), "M");

  assert.strictEqual(extractFirstName("Bartholomeuconstantine Silva"), "Bartholomeuconstantine");
  assert.strictEqual(getUserInitials("Bartholomeuconstantine Silva"), "BS");

  // Fallbacks seguros para nome ausente ou vazio
  assert.strictEqual(extractFirstName(""), DEFAULT_PROFILE_FALLBACK_NAME);
  assert.strictEqual(extractFirstName("   \t\n "), DEFAULT_PROFILE_FALLBACK_NAME);
  assert.strictEqual(extractFirstName(null), DEFAULT_PROFILE_FALLBACK_NAME);
  assert.strictEqual(extractFirstName(undefined), DEFAULT_PROFILE_FALLBACK_NAME);
  assert.strictEqual(getUserInitials(""), "U");
  assert.strictEqual(getUserInitials(null), "U");
});

test("2. Modelo 01 — Pílula Inteiriça & Glass: Estrutura unificada sem botão de sair separado", () => {
  const headerPath = path.join(process.cwd(), "src", "components", "minisite", "header.tsx");
  const src = fs.readFileSync(headerPath, "utf-8");

  const desktopAuthSection = src.split('id="hero-header-auth"')[1].split("MENU MÓVEL EXPANSÍVEL")[0];

  // Contêiner único coeso reutilizando o utilitário compartilhado getDesktopGlassPillClass (mesma altura e vidro do menu central)
  assert.ok(src.includes("function getDesktopGlassPillClass(scrolled: boolean)"));
  assert.ok(desktopAuthSection.includes('data-testid="minisite-profile-pill"'));
  assert.ok(desktopAuthSection.includes("inline-flex items-center"));
  assert.ok(desktopAuthSection.includes("getDesktopGlassPillClass(isScrolled)"));
  assert.ok(src.includes("rounded-full") && src.includes("backdrop-blur-"));
  assert.ok(src.includes("lg:bg-black/35") && src.includes("lg:border-white/20"));

  // Avatar circular à esquerda, divisor vertical e logout integrado no final
  assert.ok(desktopAuthSection.includes("w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-[var(--primary)] text-white"));
  assert.ok(desktopAuthSection.includes("{initials}"));
  assert.ok(desktopAuthSection.includes("{firstName}"));
  assert.ok(desktopAuthSection.includes("truncate max-w-"));
  assert.ok(desktopAuthSection.includes("whitespace-nowrap"));
  assert.ok(desktopAuthSection.includes("w-px h-5") && desktopAuthSection.includes("lg:bg-white/20"));

  // O botão de logout é irmão do Link (evita navegação acidental) e está dentro da mesma pílula
  const pillInner = desktopAuthSection.split('data-testid="minisite-profile-pill"')[1].split(") : (")[0];
  assert.strictEqual((pillInner.match(/<LogOut/g) || []).length, 1, "Deve haver exatamente 1 botão de logout integrado dentro da pílula desktop");
  assert.ok(pillInner.includes("</Link>"), "Link do painel deve encerrar antes do divisor e botão de logout");
  assert.ok(pillInner.indexOf("</Link>") < pillInner.indexOf("onClick={handleLogout}"), "Botão de logout não pode ficar aninhado dentro do <Link>");
  assert.ok(pillInner.includes('aria-label="Sair da conta"'));
  assert.ok(pillInner.includes("w-8 h-8 lg:w-9 lg:h-9 rounded-full") && pillInner.includes("lg:hover:bg-white/15"));

  // Garante que apenas o primeiro nome é exposto em labels/titles (sem vazar nome completo em atributos)
  assert.strictEqual(desktopAuthSection.includes("{user.name}"), false);
  assert.strictEqual(desktopAuthSection.includes("(${user.name})"), false);
});

test("3. Bloco desktop exibe ação 'Painel' (sem 'ADMIN') conforme papel autenticado", () => {
  const headerPath = path.join(process.cwd(), "src", "components", "minisite", "header.tsx");
  const src = fs.readFileSync(headerPath, "utf-8");

  assert.ok(src.includes('const isAdmin = user?.role === "ADMIN";'), "Status Admin deve derivar apenas de user?.role === 'ADMIN'");
  assert.ok(src.includes('const hasDashboardAccess = user?.role === "ADMIN" || user?.role === "PATIENT";'));
  assert.ok(!src.includes("localStorage"), "Cabeçalho do MiniSite não deve consultar localStorage para inferir papel");

  const desktopAuthSection = src.split('id="hero-header-auth"')[1].split("MENU MÓVEL EXPANSÍVEL")[0];
  assert.strictEqual(desktopAuthSection.includes("ADMIN"), false, "Bloco desktop de autenticação não deve mais exibir selo ADMIN");
  assert.ok(desktopAuthSection.includes("Painel"), "Bloco desktop autenticado deve exibir ação Painel");
  assert.ok(desktopAuthSection.includes("<LayoutDashboard"), "Ação Painel deve acompanhar ícone layout-dashboard");

  // Não deve exibir selos "Paciente", "Usuário" ou "Cliente" no cabeçalho
  assert.strictEqual(src.includes('"Paciente"'), false, "Não deve exibir badge 'Paciente' no header");
  assert.strictEqual(src.includes('"PACIENTE"'), false);
  assert.strictEqual(src.includes('"CLIENTE"'), false);
  assert.strictEqual(src.includes('"USUÁRIO"'), false);

  // Não deve hardcodar laranja (#EA580C ou bg-orange-) na pílula
  assert.strictEqual(src.includes("#EA580C"), false, "Não deve hardcodar cor laranja de exemplo");
  assert.strictEqual(src.includes("bg-orange-"), false, "Avatar e destaque Painel devem seguir var(--primary)");
});

test("4. Responsividade preservada no cabeçalho mobile (< 768px) e navegação central", () => {
  const headerPath = path.join(process.cwd(), "src", "components", "minisite", "header.tsx");
  const src = fs.readFileSync(headerPath, "utf-8");

  const mobileTopBar = src.split("CABEÇALHO DESKTOP")[0];
  assert.strictEqual(mobileTopBar.includes("minisite-profile-pill"), false, "Pílula desktop completa não deve ser espremida no topo mobile");
  assert.ok(mobileTopBar.includes("id=\"hero-header-mobile-logo\""));
  assert.ok(mobileTopBar.includes("id=\"hero-header-mobile-toggle\""));

  const mobileDrawerAuth = src.split("Autenticação no Mobile")[1];
  assert.ok(mobileDrawerAuth.includes("{firstName}"), "Drawer mobile deve exibir apenas o primeiro nome");
  assert.ok(mobileDrawerAuth.includes("{initials}"), "Drawer mobile deve exibir avatar com iniciais");
  assert.ok(mobileDrawerAuth.includes("isAdmin &&"), "Drawer mobile deve restringir rótulo ADMIN a administradores");
});
