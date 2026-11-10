const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function readFile(...segments) {
  return fs.readFileSync(path.join(process.cwd(), ...segments), "utf-8");
}

test("1. Terminologia UI: 'MiniSite' substituído por 'Site' preservando rotas e identificadores internos", () => {
  const adminLayout = readFile("src", "app", "admin", "layout.tsx");
  const adminHome = readFile("src", "app", "admin", "page.tsx");
  const adminSitePage = readFile("src", "app", "admin", "minisite", "page.tsx");
  const adminSettings = readFile("src", "app", "admin", "configuracoes", "page.tsx");
  const adminInfoPages = readFile("src", "app", "admin", "paginas-informativas", "page.tsx");
  const legalView = readFile("src", "components", "legal-page-view.tsx");
  const mediaSettingsApi = readFile(
    "src",
    "app",
    "api",
    "admin",
    "minisite",
    "media",
    "settings",
    "route.ts"
  );

  // Novos rótulos obrigatórios
  assert.ok(adminLayout.includes('label: "Site"') && adminLayout.includes('href: "/admin/minisite"'));
  assert.ok(adminLayout.includes("Ver Site") && adminLayout.includes("Abrir Site público em nova aba"));
  assert.ok(adminHome.includes("Visualizar Site"));
  assert.ok(adminSitePage.includes("Site & Presença Digital"));
  assert.ok(adminSitePage.includes("Visualizar Site"));
  assert.ok(adminSitePage.includes("Salvar Alterações do Site"));
  assert.ok(adminSitePage.includes("Configurações do Site atualizadas e publicadas com sucesso!"));
  assert.ok(adminSettings.includes("Imagens & Animações do Site"));
  assert.ok(adminSettings.includes("Salvar Mídias do Site"));
  assert.ok(adminInfoPages.includes("no Site público"));
  assert.ok(legalView.includes("Retornar ao Site"));
  assert.ok(mediaSettingsApi.includes("Configurações de mídia do Site salvas com sucesso!"));

  // Ausência de referências antigas visíveis ao usuário
  assert.ok(!adminLayout.includes("Ver MiniSite"));
  assert.ok(!adminHome.includes("Visualizar MiniSite"));
  assert.ok(!adminSitePage.includes("MiniSite & Presença"));
  assert.ok(!adminSettings.includes("Mídias do MiniSite") && !adminSettings.includes("Imagens do MiniSite"));
  assert.ok(!legalView.includes("MiniSite"));
  assert.ok(!adminInfoPages.includes("MiniSite"));
  assert.ok(!mediaSettingsApi.includes("Mídias do MiniSite"));
});

test("2. Ordem exata das 9 seções em Admin → Site e no Site público (Início até Rodapé)", () => {
  const adminSitePage = readFile("src", "app", "admin", "minisite", "page.tsx");
  const publicHomePage = readFile("src", "app", "page.tsx");

  const expectedAdminOrder = [
    'id="sec-1"',
    "Início / Hero",
    'id="sec-2"',
    "Atendimentos",
    'id="sec-3"',
    "Sobre Mim",
    'id="sec-4"',
    "Diferenciais",
    'id="sec-5"',
    "Como Funciona",
    'id="sec-6"',
    "Depoimentos",
    'id="sec-7"',
    "Localização",
    'id="sec-8"',
    "Chamada Final",
    'id="sec-9"',
    "Rodapé / Footer",
  ];

  const formStart = adminSitePage.indexOf("<form onSubmit={handleSave}");
  assert.ok(formStart > -1, "Admin → Site deve conter formulário principal");
  const formBody = adminSitePage.slice(formStart);

  let prevIdx = -1;
  for (const token of expectedAdminOrder) {
    const idx = formBody.indexOf(token, prevIdx + 1);
    assert.ok(idx > prevIdx, `Admin → Site deve conter '${token}' em ordem sequencial após índice ${prevIdx}`);
    prevIdx = idx;
  }

  // Garante que Rodapé aparece por último antes do botão de salvar
  const saveIdx = formBody.indexOf("Salvar Alterações do Site");
  const footerCardIdx = formBody.indexOf('id="sec-9"');
  assert.ok(footerCardIdx !== -1 && saveIdx > footerCardIdx, "Rodapé deve ser o último card de configuração antes do botão Salvar");

  // Ordem idêntica no site público
  const publicSectionOrder = [
    'id="inicio"',
    'id="atendimentos"',
    'id="sobre"',
    'id="diferenciais"',
    'id="como-funciona"',
    'id="depoimentos"',
    'id="localizacao"',
    'id="cta-final"',
    'id="contato"',
  ];

  let prevPublicIdx = -1;
  for (const secId of publicSectionOrder) {
    const idx = publicHomePage.indexOf(secId, prevPublicIdx + 1);
    assert.ok(idx > prevPublicIdx, `Site público deve renderizar '${secId}' em ordem crescente`);
    prevPublicIdx = idx;
  }
});

test("3. SiteSectionsConfig: parsing seguro, esquema Zod e atribuição fixa KelvynK", () => {
  const {
    DEVELOPER_ATTRIBUTION,
    DEFAULT_SITE_SECTIONS_CONFIG,
    siteSectionsConfigSchema,
    cloneDefaultSiteSectionsConfig,
    parseSiteSectionsConfig,
  } = require("../src/lib/site-sections.ts");

  assert.strictEqual(DEVELOPER_ATTRIBUTION.prefix, "Software Atendimento PSI — Desenvolvido por");
  assert.strictEqual(DEVELOPER_ATTRIBUTION.brandName, "KelvynK");
  assert.strictEqual(DEVELOPER_ATTRIBUTION.url, "https://kelvynk.com.br");

  // Fallback seguro quando nulo, inválido ou parcial
  assert.deepStrictEqual(parseSiteSectionsConfig(null), DEFAULT_SITE_SECTIONS_CONFIG);
  assert.deepStrictEqual(parseSiteSectionsConfig("{invalido"), DEFAULT_SITE_SECTIONS_CONFIG);

  const partial = parseSiteSectionsConfig(
    JSON.stringify({
      comoFunciona: { title: "Jornada Terapêutica" },
      rodape: { showDescription: false, copyrightText: "© 2026 Clínica Exemplo" },
    })
  );
  assert.strictEqual(partial.comoFunciona.title, "Jornada Terapêutica");
  assert.strictEqual(partial.comoFunciona.steps.length, 3);
  assert.strictEqual(partial.rodape.showDescription, false);
  assert.strictEqual(partial.rodape.copyrightText, "© 2026 Clínica Exemplo");
  assert.strictEqual(partial.atendimentos.title, DEFAULT_SITE_SECTIONS_CONFIG.atendimentos.title);

  // Validação Zod rejeita titulo vazio e etapa faltante
  const validClone = cloneDefaultSiteSectionsConfig();
  assert.strictEqual(siteSectionsConfigSchema.safeParse(validClone).success, true);
  validClone.diferenciais.items[0].title = "";
  assert.strictEqual(siteSectionsConfigSchema.safeParse(validClone).success, false);
});

test("4. Conformidade ética CFP, não duplicação de módulos e ausência de customHtml no Site", () => {
  const adminSitePage = readFile("src", "app", "admin", "minisite", "page.tsx");
  const publicHomePage = readFile("src", "app", "page.tsx");
  const adminApiRoute = readFile("src", "app", "api", "admin", "site", "settings", "route.ts");

  // Referências a módulos autoritativos únicos
  assert.ok(adminSitePage.includes('href="/admin/servicos"'));
  assert.ok(adminSitePage.includes('href="/admin/paginas-informativas"'));
  assert.ok(adminSitePage.includes('href="/admin/configuracoes?tab=profile"'));
  assert.ok(adminSitePage.includes('href="/admin/configuracoes?tab=appearance"'));

  // Sem campo inseguro de customHtml
  assert.ok(!adminSitePage.includes("customHtml"));
  assert.ok(!adminApiRoute.includes("customHtml"));

  // Filtro obrigatório de consentimento CFP antes de exibir depoimento no Site público
  assert.ok(
    publicHomePage.includes("item.isVisible && item.consentConfirmed"),
    "Site público só pode exibir depoimentos marcados como visíveis e com consentimento CFP confirmado"
  );
});

test("5. Rodapé Público: crédito oficial exato, link somente em 'KelvynK' e separação do copyright", () => {
  const publicHomePage = readFile("src", "app", "page.tsx");
  const footerStart = publicHomePage.indexOf('<footer id="contato"');
  const footerEnd = publicHomePage.indexOf("</footer>", footerStart);
  assert.ok(footerStart > -1 && footerEnd > footerStart, "Rodapé #contato deve existir em src/app/page.tsx");
  const footerBlock = publicHomePage.slice(footerStart, footerEnd);

  // Texto antigo removido
  assert.ok(
    !publicHomePage.includes("Software de Gestão Clínica PSI — Instalação Standalone Dedicada."),
    "Texto legado de instalação standalone deve ser removido do rodapé"
  );

  // Novo crédito fixo usando DEVELOPER_ATTRIBUTION
  assert.ok(
    footerBlock.includes("DEVELOPER_ATTRIBUTION.prefix") &&
      footerBlock.includes("DEVELOPER_ATTRIBUTION.url") &&
      footerBlock.includes("DEVELOPER_ATTRIBUTION.brandName"),
    "Rodapé deve renderizar o crédito fixo de desenvolvedor a partir de DEVELOPER_ATTRIBUTION"
  );

  // Link abre em nova aba com atributos de segurança
  const attrStart = footerBlock.indexOf('id="footer-developer-attribution"');
  assert.ok(attrStart > -1, "Deve existir parágrafo dedicado id='footer-developer-attribution'");
  const attrSnippet = footerBlock.slice(attrStart, footerBlock.indexOf("</p>", attrStart) + 4);
  assert.ok(attrSnippet.includes('target="_blank"'));
  assert.ok(attrSnippet.includes('rel="noopener noreferrer"'));
  assert.ok(attrSnippet.includes("{DEVELOPER_ATTRIBUTION.prefix}"));
  assert.ok(attrSnippet.includes("{DEVELOPER_ATTRIBUTION.brandName}</a>") || attrSnippet.includes("{DEVELOPER_ATTRIBUTION.brandName}\n"));

  // Separação clara entre copyright e crédito de desenvolvedor
  assert.ok(footerBlock.includes("{footerCopyrightText}"), "Copyright deve ficar em elemento separado do crédito da plataforma");
  assert.ok(footerBlock.includes("sections.rodape.showPrivacyLink") || publicHomePage.includes("hasFooterPrivacyLink"));
  assert.ok(footerBlock.includes("sections.rodape.showCookiePreferences"));
});
