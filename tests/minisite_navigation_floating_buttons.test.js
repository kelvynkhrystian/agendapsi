const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

// ==============================================================================
// TESTES: CABEÇALHO DO MINISITE, BRANDING, LOGIN E USUÁRIO AUTENTICADO
// ==============================================================================

test("1. MiniSiteHeader — Ausência da Marca 'PSI' e Uso Estrito da Logo Horizontal", () => {
  const headerPath = path.join(process.cwd(), "src", "components", "minisite", "header.tsx");
  assert.strictEqual(fs.existsSync(headerPath), true, "src/components/minisite/header.tsx deve existir");

  const content = fs.readFileSync(headerPath, "utf-8");

  // Logo horizontal prioritária
  assert.strictEqual(
    content.includes("logoHorizontalUrl ? ("),
    true,
    "Deve priorizar a logo horizontal no cabeçalho"
  );
  assert.strictEqual(
    content.includes("object-contain"),
    true,
    "Deve usar object-fit: contain para preservar as proporções da logo"
  );

  // Não exibe a palavra "PSI" isolada como texto visível de marca
  assert.strictEqual(
    content.includes('clinicName !== "PSI"'),
    true,
    "Deve filtrar e nunca substituir pelo nome interno 'PSI'"
  );
  assert.strictEqual(
    content.includes("neutralFallbackName"),
    true,
    "Deve possuir fallback neutro sem usar marca do software"
  );

  // Ambas as ramificações de logo horizontal não renderizam texto ao lado
  const mobileLogoBranch = content.split("logoHorizontalUrl ? (")[1].split(": logoUrl ? (")[0];
  assert.strictEqual(
    mobileLogoBranch.includes("<span"),
    false,
    "Não deve exibir rótulo textual ao lado da logo horizontal no mobile"
  );

  const desktopLogoBranch = content.split("logoHorizontalUrl ? (")[2].split(": logoUrl ? (")[0];
  assert.strictEqual(
    desktopLogoBranch.includes("<span"),
    false,
    "Não deve exibir rótulo textual ao lado da logo horizontal no desktop"
  );
});

test("2. MiniSiteHeader — Remoção do Botão 'Agendar Consulta' do Cabeçalho e Menu", () => {
  const headerPath = path.join(process.cwd(), "src", "components", "minisite", "header.tsx");
  const headerContent = fs.readFileSync(headerPath, "utf-8");

  assert.strictEqual(
    headerContent.includes("Agendar Consulta"),
    false,
    "Não deve conter botão 'Agendar Consulta' no cabeçalho desktop nem no menu móvel"
  );
  assert.strictEqual(
    headerContent.includes('href="/agendar"'),
    false,
    "Não deve conter link para /agendar dentro do cabeçalho de navegação"
  );

  // Verifica que os botões de agendamento nas outras seções do MiniSite continuam existindo
  const pagePath = path.join(process.cwd(), "src", "app", "page.tsx");
  const pageContent = fs.readFileSync(pagePath, "utf-8");
  assert.strictEqual(
    pageContent.includes('href="/agendar"'),
    true,
    "Botões de agendamento em Hero, Serviços, Sobre e CTA final devem ser preservados"
  );
});

test("3. MiniSiteHeader — Botão de Login para Visitantes Não Autenticados", () => {
  const headerPath = path.join(process.cwd(), "src", "components", "minisite", "header.tsx");
  const content = fs.readFileSync(headerPath, "utf-8");

  // Ícone e texto Login
  assert.strictEqual(
    content.includes("<LogIn"),
    true,
    "Deve conter o ícone LogIn da biblioteca Lucide React"
  );
  assert.strictEqual(
    content.includes("<span>Login</span>"),
    true,
    "Deve exibir o texto 'Login' quando não autenticado"
  );
  assert.strictEqual(
    content.includes('href="/login"'),
    true,
    "Deve direcionar para o fluxo existente de autenticação (/login)"
  );
});

test("4. MiniSiteHeader — Exibição do Primeiro Nome em Pílula Unificada e Ação de Conta", () => {
  const headerPath = path.join(process.cwd(), "src", "components", "minisite", "header.tsx");
  const content = fs.readFileSync(headerPath, "utf-8");

  // Pílula unificada Model 01 com avatar por iniciais e estritamente o primeiro nome
  assert.strictEqual(
    content.includes("extractFirstName") && content.includes("getUserInitials"),
    true,
    "Deve derivar estritamente o primeiro nome e as iniciais do avatar a partir do usuário autenticado"
  );
  assert.strictEqual(
    content.includes("{firstName}") && content.includes("{initials}"),
    true,
    "Deve exibir o primeiro nome e as iniciais no cabeçalho autenticado"
  );
  assert.strictEqual(
    content.includes('data-testid="minisite-profile-pill"'),
    true,
    "Deve renderizar o perfil desktop em uma única pílula horizontal coesa"
  );

  // Redirecionamento por papel (Role-based routing)
  assert.strictEqual(
    content.includes('user?.role === "ADMIN" ? "/admin" : "/paciente"'),
    true,
    "Admin deve ser direcionado para /admin e Paciente para /paciente"
  );

  // Ação de logout integrada
  assert.strictEqual(
    content.includes('fetch("/api/auth/logout"'),
    true,
    "Deve disponibilizar ação de logout chamando o endpoint oficial"
  );
});

test("5. MiniSiteHeader — Drawer de Navegação Móvel Completo", () => {
  const headerPath = path.join(process.cwd(), "src", "components", "minisite", "header.tsx");
  const content = fs.readFileSync(headerPath, "utf-8");

  const expectedMobileIds = [
    'id: "inicio"',
    'id: "atendimentos"',
    'id: "sobre"',
    'id: "diferenciais"',
    'id: "como-funciona"',
  ];

  for (const idAttr of expectedMobileIds) {
    assert.strictEqual(
      content.includes(idAttr),
      true,
      `Menu móvel deve incluir item ${idAttr}`
    );
  }
  assert.strictEqual(
    content.includes('href={`#${item.id}`}'),
    true,
    "Menu móvel deve renderizar links âncora dinâmicos para cada seção"
  );

  // Localização condicional
  assert.strictEqual(
    content.includes("shouldShowLocation && ("),
    true,
    "Link de Localização deve ser exibido condicionalmente"
  );

  // Acessibilidade e fechamento do menu
  assert.strictEqual(
    content.includes('e.key === "Escape"'),
    true,
    "Menu móvel deve fechar ao pressionar Escape"
  );
  assert.strictEqual(
    content.includes("handleLinkClick"),
    true,
    "Menu deve fechar ao clicar em qualquer link de seção"
  );
  assert.strictEqual(
    content.includes('document.body.style.overflow = "hidden"'),
    true,
    "Deve evitar rolagem do fundo quando menu estiver aberto"
  );
});

test("6. MiniSiteHeader — Comportamento Sticky e Suporte a Safe-Area", () => {
  const headerPath = path.join(process.cwd(), "src", "components", "minisite", "header.tsx");
  const content = fs.readFileSync(headerPath, "utf-8");

  assert.strictEqual(
    (content.includes("fixed top-0") || content.includes("sticky top-0")) && content.includes("z-40"),
    true,
    "Cabeçalho deve ser fixo no topo da tela com z-index adequado"
  );
  assert.strictEqual(
    content.includes("env(safe-area-inset-top"),
    true,
    "Deve respeitar safe-area-inset-top em dispositivos móveis (notches)"
  );
  assert.strictEqual(
    content.includes("setIsScrolled(window.scrollY > 12)"),
    true,
    "Deve monitorar o scroll da janela para aplicar fundo e sombra dinâmicos"
  );
});

test("7. MiniSiteFloatingControls — Preservação dos Botões Flutuantes (WhatsApp e Topo)", () => {
  const controlsPath = path.join(process.cwd(), "src", "components", "minisite", "floating-controls.tsx");
  assert.strictEqual(fs.existsSync(controlsPath), true, "src/components/minisite/floating-controls.tsx deve existir");

  const content = fs.readFileSync(controlsPath, "utf-8");

  // Posicionamento no canto inferior direito
  assert.strictEqual(
    content.includes("fixed bottom-5 right-4 sm:bottom-6 sm:right-6 z-50"),
    true,
    "Controles flutuantes devem estar fixos no canto inferior direito"
  );
  assert.strictEqual(
    content.includes("env(safe-area-inset-bottom"),
    true,
    "Deve respeitar safe-area-inset-bottom em dispositivos móveis"
  );

  // WhatsApp Flutuante
  assert.strictEqual(
    content.includes("bg-[#25D366]"),
    true,
    "Botão WhatsApp deve preservar sua cor verde oficial #25D366"
  );

  // Voltar ao Topo (Back to Top)
  assert.strictEqual(
    content.includes("window.scrollY > 350"),
    true,
    "Botão de voltar ao topo deve aparecer após rolagem de ~1 viewport"
  );
  assert.strictEqual(
    content.includes("window.scrollTo({"),
    true,
    "Botão de voltar ao topo deve chamar scrollTo com comportamento suave"
  );

  // Ordem vertical: WhatsApp primeiro, Voltar ao Topo abaixo
  const idxWhatsApp = content.indexOf("BOTÃO FLUTUANTE DO WHATSAPP");
  const idxBackToTop = content.indexOf("BOTÃO VOLTAR AO TOPO");
  assert.strictEqual(
    idxWhatsApp < idxBackToTop,
    true,
    "O botão WhatsApp deve estar empilhado ACIMA do botão Voltar ao Topo"
  );
});

test("8. Smooth Scrolling e Margens de Rolagem (Scroll Offsets)", () => {
  const cssPath = path.join(process.cwd(), "src", "app", "globals.css");
  const cssContent = fs.readFileSync(cssPath, "utf-8");

  assert.strictEqual(
    cssContent.includes("scroll-behavior: smooth;"),
    true,
    "globals.css deve definir scroll-behavior: smooth no html"
  );
  assert.strictEqual(
    cssContent.includes("scroll-padding-top: 5rem;"),
    true,
    "globals.css deve definir scroll-padding-top para não cobrir títulos com o header fixo"
  );

  const homePath = path.join(process.cwd(), "src", "app", "page.tsx");
  const homeContent = fs.readFileSync(homePath, "utf-8");

  // Seções com scroll-mt-20
  assert.strictEqual(homeContent.includes('id="inicio"'), true, "Hero deve conter id=\"inicio\"");
  assert.strictEqual(homeContent.includes('id="atendimentos" className="py-16 px-4 bg-white scroll-mt-20"'), true, "Atendimentos com scroll-mt-20");
  assert.strictEqual(homeContent.includes('id="sobre" className="py-16 px-4 bg-[#F8F5EE] border-y border-slate-200/60 scroll-mt-20"'), true, "Sobre Mim com scroll-mt-20");
  assert.strictEqual(homeContent.includes('id="diferenciais" className="py-16 px-4 bg-white scroll-mt-20"'), true, "Diferenciais com scroll-mt-20");
  assert.strictEqual(homeContent.includes('id="como-funciona" className="py-16 px-4 bg-[#F8F5EE] scroll-mt-20"'), true, "Como Funciona com scroll-mt-20");
});

test("9. Validação do Servidor: getSession() Injetado no MiniSiteHeader", () => {
  const homePath = path.join(process.cwd(), "src", "app", "page.tsx");
  const homeContent = fs.readFileSync(homePath, "utf-8");

  assert.strictEqual(
    homeContent.includes("getSession()"),
    true,
    "page.tsx deve invocar getSession() para validação server-side da sessão"
  );
  assert.strictEqual(
    homeContent.includes("currentUser={currentUser}"),
    true,
    "Deve passar currentUser validado pelo servidor para o MiniSiteHeader"
  );
});
