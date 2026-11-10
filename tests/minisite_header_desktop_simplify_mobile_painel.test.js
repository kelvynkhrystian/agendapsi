const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("1. Desktop profile pill: contém apenas avatar circular clicável ('Acessar painel') e logout sem nome nem 'Painel' visíveis", () => {
  const headerPath = path.join(process.cwd(), "src", "components", "minisite", "header.tsx");
  const src = fs.readFileSync(headerPath, "utf-8");

  const desktopAuth = src.split('id="hero-header-auth"')[1].split("MENU MÓVEL EXPANSÍVEL")[0];
  const loginStartIndex = desktopAuth.lastIndexOf("<Link");
  const profilePill = desktopAuth.slice(desktopAuth.indexOf('data-testid="minisite-profile-pill"'), loginStartIndex);

  // Mantém a mesma função de cápsula glass e altura da navegação central
  assert.ok(profilePill.includes("getDesktopGlassPillClass(isScrolled)"));
  assert.ok(profilePill.includes("inline-flex items-center justify-center"));

  // Remove primeiro nome e rótulo 'Painel' da versão desktop
  assert.equal(profilePill.includes("{firstName}"), false);
  assert.equal(profilePill.includes("Painel"), false);
  assert.equal(profilePill.includes("ADMIN"), false);

  // Avatar circular clicável com iniciais e tooltip/label acessível 'Acessar painel'
  assert.ok(profilePill.includes('data-testid="minisite-profile-avatar-link"'));
  assert.ok(profilePill.includes('href={dashboardUrl}'));
  assert.ok(profilePill.includes('title="Acessar painel"'));
  assert.ok(profilePill.includes('aria-label="Acessar painel"'));
  assert.ok(profilePill.includes("rounded-full bg-[var(--primary)] text-white"));
  assert.ok(profilePill.includes("{initials}"));

  // Divisor sutil vertical + botão Sair preservados
  assert.ok(profilePill.includes("w-px h-5"));
  assert.ok(profilePill.includes('onClick={handleLogout}'));
  assert.ok(profilePill.includes('aria-label="Sair da conta"'));

  // Botão Login deslogado preservado
  const loginBlock = desktopAuth.slice(loginStartIndex);
  assert.ok(
    loginBlock.includes('data-testid="minisite-login-pill"') &&
      loginBlock.includes('href="/login"') &&
      loginBlock.includes("<span>Login</span>")
  );
});

test("2. Mobile drawer: substitui badge 'ADMIN' por ação clicável 'Painel' respeitando papel e tema sem vazar rotas ou papéis", () => {
  const headerPath = path.join(process.cwd(), "src", "components", "minisite", "header.tsx");
  const src = fs.readFileSync(headerPath, "utf-8");

  assert.ok(src.includes('const hasDashboardAccess = user?.role === "ADMIN" || user?.role === "PATIENT";'));
  assert.ok(src.includes('const dashboardUrl = user?.role === "ADMIN" ? "/admin" : "/paciente";'));

  const mobileAuth = src.split("Autenticação no Mobile")[1];
  assert.ok(mobileAuth.includes("{initials}"), "Avatar deve ser preservado no menu mobile");
  assert.ok(mobileAuth.includes("{firstName}"), "Primeiro nome deve ser preservado no menu mobile");
  assert.equal(mobileAuth.includes("ADMIN"), false, "Menu mobile não deve exibir badge 'ADMIN'");
  assert.equal(/PACIENTE/i.test(mobileAuth), false, "Menu mobile não deve exibir badge 'PACIENTE'");

  assert.ok(mobileAuth.includes('data-testid="minisite-mobile-panel-action"'));
  assert.ok(mobileAuth.includes("<LayoutDashboard"));
  assert.ok(mobileAuth.includes("<span>Painel</span>"));
  assert.ok(mobileAuth.includes("bg-[var(--primary)] text-white"), "Destaque 'Painel' deve usar cor do tema var(--primary)");
  assert.ok(mobileAuth.includes('href={dashboardUrl}'), "Link do Painel deve seguir papel autenticado");
  assert.ok(mobileAuth.includes("Sair da conta"), "Botão 'Sair da conta' deve permanecer abaixo do perfil");
});

test("3. Mobile top header: padding vertical equilibrado (8px topo/base), transparência preservada e alinhamento seguro", () => {
  const headerPath = path.join(process.cwd(), "src", "components", "minisite", "header.tsx");
  const src = fs.readFileSync(headerPath, "utf-8");

  const mobileHeader = src.split('id="hero-header-mobile"')[1].split("CABEÇALHO DESKTOP")[0];
  assert.ok(mobileHeader.includes('paddingTop: "calc(0.5rem + env(safe-area-inset-top, 0px))"'), "Safe-area inset deve ser respeitado");
  assert.ok(mobileHeader.includes("py-2"), "Barra superior mobile deve aplicar padding vertical equilibrado de 8px (py-2)");
  assert.ok(mobileHeader.includes("flex items-center justify-between"), "Logo, CRP e hamburguer devem manter alinhamento vertical centralizado");
  assert.ok(mobileHeader.includes("bg-transparent border-0 rounded-none shadow-none backdrop-blur-none outline-none"), "Transparência quando fechado deve ser preservada");

  // Tamanhos originais de logo desktop intactos
  const desktopHeader = src.split("CABEÇALHO DESKTOP")[1].split("MENU MÓVEL EXPANSÍVEL")[0];
  assert.ok(desktopHeader.includes("h-8 md:h-9 lg:h-10 w-auto max-w-[200px] lg:max-w-[240px] object-contain"));

  // Drawer sincronizado abaixo da barra aberta com respiro vertical
  const drawerBlock = src.split('id="mobile-navigation-menu"')[1];
  assert.ok(drawerBlock.includes('top: "calc(70px + env(safe-area-inset-top, 0px))"'));
});
