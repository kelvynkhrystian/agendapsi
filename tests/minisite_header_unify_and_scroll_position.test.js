const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("1. Cabeçalho desktop: Navegação, Login e Perfil compartilham exatamente a mesma altura e superfície glass", () => {
  const headerPath = path.join(process.cwd(), "src", "components", "minisite", "header.tsx");
  const src = fs.readFileSync(headerPath, "utf-8");

  assert.ok(
    src.includes('const DESKTOP_PILL_HEIGHT_CLASS = "h-[50px] lg:h-[54px]";'),
    "Altura das pílulas desktop deve vir de uma única constante compartilhada baseada na navegação central"
  );
  assert.ok(
    src.includes("function getDesktopGlassPillClass(scrolled: boolean): string"),
    "Superfície de vidro das três pílulas deve usar um único utilitário compartilhado"
  );

  // Exatamente 3 usos da função utilitária no JSX desktop (<nav>, perfil autenticado e Login)
  const navBlock = src.split("<nav")[1].split("</nav>")[0];
  const authBlock = src.split('id="hero-header-auth"')[1].split("MENU MÓVEL EXPANSÍVEL")[0];

  assert.ok(navBlock.includes("getDesktopGlassPillClass(isScrolled)"), "Navegação central deve usar getDesktopGlassPillClass");
  assert.ok(authBlock.includes("getDesktopGlassPillClass(isScrolled)"), "Bloco auth deve usar getDesktopGlassPillClass");

  const profilePillBlock = authBlock.split('data-testid="minisite-profile-pill"')[1].split(") : (")[0];
  const loginPillBlock = authBlock.split('data-testid="minisite-login-pill"')[1].split("</Link>")[0];

  assert.ok(
    authBlock.indexOf("getDesktopGlassPillClass(isScrolled)") < authBlock.indexOf('data-testid="minisite-login-pill"') ||
      profilePillBlock !== undefined,
    "Pílula de perfil deve aplicar getDesktopGlassPillClass"
  );
  assert.ok(
    authBlock.split("getDesktopGlassPillClass(isScrolled)").length === 3,
    "As exatas duas ramificações de auth (Perfil + Login) devem invocar getDesktopGlassPillClass"
  );

  // Sem fundos divergentes hardcoded na pílula de perfil ou no Login
  assert.equal(authBlock.includes("bg-black/55"), false, "Não deve manter bg-black/55 divergente");
  assert.equal(authBlock.includes("bg-black/68"), false, "Não deve manter bg-black/68 divergente");
  assert.equal(authBlock.includes("hover:lg:bg-black/50"), false, "Não deve sobrescrever o glass padrão no botão Login");

  // Texto e ícone brancos no Login desktop
  assert.ok(loginPillBlock.includes("lg:text-white"), "Texto e ícone do Login devem permanecer brancos no desktop");
  assert.ok(loginPillBlock.includes("<LogIn") && loginPillBlock.includes("<span>Login</span>"));
});

test("2. Cabeçalho autenticado: Substitui 'ADMIN' por ação funcional 'Painel' com ícone Lucide e redirecionamento por papel", () => {
  const headerPath = path.join(process.cwd(), "src", "components", "minisite", "header.tsx");
  const src = fs.readFileSync(headerPath, "utf-8");

  assert.ok(src.includes("LayoutDashboard"), "Deve importar o ícone LayoutDashboard do Lucide");
  assert.ok(src.includes('user?.role === "ADMIN" ? "/admin" : "/paciente"'));

  const desktopAuth = src.split('id="hero-header-auth"')[1].split("MENU MÓVEL EXPANSÍVEL")[0];
  assert.equal(desktopAuth.includes("ADMIN"), false, "Rótulo 'ADMIN' não deve aparecer no cabeçalho desktop autenticado");
  assert.equal(desktopAuth.includes("minisite-profile-admin-badge"), false);

  assert.ok(desktopAuth.includes('data-testid="minisite-profile-panel-action"'));
  assert.ok(desktopAuth.includes("<LayoutDashboard"));
  assert.ok(desktopAuth.includes("<span>Painel</span>"));
  assert.ok(desktopAuth.includes("bg-[var(--primary)] text-white"), "Destaque 'Painel' deve seguir cor oficial do tema");

  // Link envolve perfil + Painel e o botão Sair fica fora do Link
  const pillPart = desktopAuth.split('data-testid="minisite-profile-pill"')[1].split(") : (")[0];
  assert.ok(pillPart.indexOf("<span>Painel</span>") < pillPart.indexOf("</Link>"), "'Painel' deve ser uma ação navegável de painel");
  assert.ok(pillPart.indexOf("</Link>") < pillPart.indexOf("onClick={handleLogout}"), "Botão de sair deve permanecer separado da ação do painel");
});

test("3. Menu desktop simplificado e cabeçalho mobile preservados", () => {
  const headerPath = path.join(process.cwd(), "src", "components", "minisite", "header.tsx");
  const src = fs.readFileSync(headerPath, "utf-8");

  const desktopNav = src.split("<nav")[1].split("</nav>")[0];
  for (const required of ["Início", "Sobre Mim", "Como Funciona", "Localização"]) {
    assert.ok(desktopNav.includes(required), `Link '${required}' deve estar presente no menu desktop`);
  }
  assert.equal(desktopNav.includes("Atendimentos"), false, "'Atendimentos' deve permanecer fora do menu desktop");
  assert.equal(desktopNav.includes("Diferenciais"), false, "'Diferenciais' deve permanecer fora do menu desktop");

  // Layout mobile permanece intacto
  assert.ok(src.includes("bg-white/40 backdrop-blur-md rounded-full"), "Barra mobile transparente inicial deve ser preservada");
  assert.ok(src.includes('id="mobile-navigation-menu"'), "Drawer mobile deve ser preservado");
});

test("4. Scroll indicator: Posicionado no centro vertical à direita (~50% do Hero), animado e com cor dinâmica do tema", () => {
  const pagePath = path.join(process.cwd(), "src", "app", "page.tsx");
  const indicatorPath = path.join(process.cwd(), "src", "components", "minisite", "hero-scroll-indicator.tsx");
  const controlsPath = path.join(process.cwd(), "src", "components", "minisite", "floating-controls.tsx");

  const pageSrc = fs.readFileSync(pagePath, "utf-8");
  const indicatorSrc = fs.readFileSync(indicatorPath, "utf-8");
  const controlsSrc = fs.readFileSync(controlsPath, "utf-8");

  // Posicionamento fora de #hero-scroll-indicator para não conflitar com a timeline GSAP
  assert.ok(
    pageSrc.includes('id="hero-scroll-indicator-position"') &&
      pageSrc.includes("hidden lg:flex absolute top-1/2 -translate-y-1/2 right-6 xl:right-8 z-20 w-[52px]"),
    "Indicador deve usar container posicionador em 50% da altura (top-1/2 -translate-y-1/2) na lateral direita do Hero"
  );
  assert.equal(pageSrc.includes("bottom-40"), false, "Posição inferior antiga (bottom-40) não deve mais existir");

  // WhatsApp permanece intacto no canto inferior direito
  assert.ok(controlsSrc.includes("fixed bottom-5 right-4 sm:bottom-6 sm:right-6 z-50"));

  // Sem card, sem legenda visível, sem sombra desnecessária e cor oficial var(--primary) sobre SVG nativo
  assert.equal(indicatorSrc.includes("drop-shadow-"), false, "Indicador não deve adicionar sombra extra ao redor do SVG");
  assert.equal(indicatorSrc.includes("Role para baixo"), false);
  assert.ok(indicatorSrc.includes('backgroundColor: "var(--primary)"'));
  assert.ok(indicatorSrc.includes('url("/minisite/scroll-down.svg")'));
  assert.ok(indicatorSrc.includes('aria-label="Rolar para a próxima seção"'));
});
