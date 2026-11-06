const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

test("1. Admin Sidebar: 'MiniSite' renomeado e 'Páginas Informativas' inserido logo abaixo", () => {
  const layoutPath = path.join(__dirname, "../src/app/admin/layout.tsx");
  assert.ok(fs.existsSync(layoutPath), "Layout do Admin deve existir");

  const layoutContent = fs.readFileSync(layoutPath, "utf8");

  // Verifica que o item do MiniSite agora se chama apenas 'MiniSite'
  assert.ok(layoutContent.includes('label: "MiniSite"') && layoutContent.includes('href: "/admin/minisite"'), "Item do menu deve ser 'MiniSite'");
  assert.ok(!layoutContent.includes('"MiniSite & Páginas"'), "Não deve mais existir 'MiniSite & Páginas'");

  // Verifica novo item 'Páginas Informativas'
  assert.ok(
    layoutContent.includes('label: "Páginas Informativas"') && layoutContent.includes('href: "/admin/paginas-informativas"'),
    "Menu deve conter 'Páginas Informativas' apontando para /admin/paginas-informativas"
  );
  assert.ok(layoutContent.includes("FileText"), "Item deve utilizar o ícone FileText");

  // Garante que 'Páginas Informativas' está posicionado logo após 'MiniSite'
  const minisiteIdx = layoutContent.indexOf('href: "/admin/minisite"');
  const paginasIdx = layoutContent.indexOf('href: "/admin/paginas-informativas"');
  assert.ok(minisiteIdx !== -1 && paginasIdx !== -1 && paginasIdx > minisiteIdx, "Páginas Informativas deve vir logo após MiniSite");
});

test("2. Prisma Schema: LegalPage expandido com description, isPublished e publishedAt", () => {
  const schemaPath = path.join(__dirname, "../prisma/schema.prisma");
  const schemaContent = fs.readFileSync(schemaPath, "utf8");

  assert.ok(schemaContent.includes("model LegalPage {"), "Model LegalPage deve existir");
  assert.ok(/description\s+String\?\s+@db\.Text/.test(schemaContent), "LegalPage deve ter campo description");
  assert.ok(/isPublished\s+Boolean\s+@default\(true\)/.test(schemaContent), "LegalPage deve ter campo isPublished");
  assert.ok(/publishedAt\s+DateTime\?/.test(schemaContent), "LegalPage deve ter campo publishedAt");
});

test("3. Templates padrão: 4 páginas oficiais com regras reais do PSI e link CFP", () => {
  const defaultsPath = path.join(__dirname, "../src/lib/information-pages-defaults.ts");
  assert.ok(fs.existsSync(defaultsPath), "Arquivo de templates padrão deve existir");

  const content = fs.readFileSync(defaultsPath, "utf8");

  // As 4 páginas
  assert.ok(content.includes('id: "terms"'), "Deve conter modelo de Termos de Uso");
  assert.ok(content.includes('id: "privacy"'), "Deve conter modelo de Política de Privacidade");
  assert.ok(content.includes('id: "lgpd"'), "Deve conter modelo de Proteção de Dados (LGPD)");
  assert.ok(content.includes('id: "ethics"'), "Deve conter modelo de Ética Profissional");

  // Conteúdo fidedigno: regras do PSI
  assert.ok(content.includes("15 minutos"), "Deve mencionar prazo de 15 minutos para reservas temporárias (holds)");
  assert.ok(content.includes("3 dias úteis"), "Deve mencionar política padrão de 3 dias úteis de cancelamento");
  assert.ok(content.includes("https://site.cfp.org.br/legislacao/codigo-de-etica/"), "Deve conter link oficial para Código de Ética do CFP");
  assert.ok(content.includes("CFP 010/2005") || content.includes("Código de Ética Profissional"), "Deve citar o Código de Ética Profissional do Psicólogo");
  assert.ok(content.includes("Art. 7") && content.includes("Art. 11"), "Deve citar bases legais da LGPD");
});

test("4. Páginas Web Públicas: Todas as 4 páginas existem e utilizam LegalPageView", () => {
  const pages = [
    { file: "src/app/termos-de-uso/page.tsx", slug: "terms" },
    { file: "src/app/politica-de-privacidade/page.tsx", slug: "privacy" },
    { file: "src/app/protecao-de-dados/page.tsx", slug: "lgpd" },
    { file: "src/app/etica-profissional/page.tsx", slug: "ethics" },
  ];

  for (const p of pages) {
    const fullPath = path.join(__dirname, "..", p.file);
    assert.ok(fs.existsSync(fullPath), `Arquivo ${p.file} deve existir`);
    const src = fs.readFileSync(fullPath, "utf8");
    assert.ok(src.includes("LegalPageView"), `${p.file} deve renderizar LegalPageView`);
    assert.ok(src.includes(`slug="${p.slug}"`), `${p.file} deve apontar para o slug ${p.slug}`);
  }

  // Verifica que /cookies redireciona para /politica-de-privacidade
  const cookiesPath = path.join(__dirname, "../src/app/cookies/page.tsx");
  assert.ok(fs.existsSync(cookiesPath), "Página de cookies legada deve existir para redirecionamento");
  const cookiesSrc = fs.readFileSync(cookiesPath, "utf8");
  assert.ok(cookiesSrc.includes('redirect("/politica-de-privacidade")'), "Página /cookies deve redirecionar para /politica-de-privacidade");
});

test("5. LegalPageView: Light mode obrigatório, proteção de rascunho e sanitização XSS", () => {
  const compPath = path.join(__dirname, "../src/components/legal-page-view.tsx");
  assert.ok(fs.existsSync(compPath), "LegalPageView deve existir");

  const src = fs.readFileSync(compPath, "utf8");

  // Light Mode estrito
  assert.ok(src.includes("bg-[#F8F9FA]") && src.includes("text-[#111827]"), "Deve utilizar paleta estritamente clara");
  assert.ok(!src.includes("dark:bg-"), "Não deve possuir classes escuras no layout público");

  // Sanitização
  assert.ok(src.includes("sanitizeCustomHtml"), "Deve sanitizar HTML antes da renderização");

  // Proteção contra rascunhos não publicados
  assert.ok(src.includes("Página em Elaboração"), "Deve exibir mensagem quando a página não estiver publicada");

  // Inclusão de preferências de cookies
  assert.ok(src.includes("CookiePreferencesTrigger"), "Deve conter o botão de preferências de cookies no rodapé");
  assert.ok(src.includes("CookieBanner"), "Deve incluir o CookieBanner");
});

test("6. Editor Administrativo Full-Page: Live preview, tags e botão voltar com dirty state", () => {
  const editorPath = path.join(__dirname, "../src/app/admin/paginas-informativas/[id]/page.tsx");
  assert.ok(fs.existsSync(editorPath), "Editor full-page deve existir");

  const src = fs.readFileSync(editorPath, "utf8");

  // Live preview / Split view
  assert.ok(src.includes("showPreview") || src.includes("split"), "Editor deve ter modo de pré-visualização ao vivo");
  assert.ok(src.includes("insertTag"), "Deve possuir botões rápidos para formatação de tags HTML");
  assert.ok(src.includes("isDirty"), "Deve controlar estado isDirty do formulário");
  assert.ok(src.includes("beforeunload") || src.includes("alert") || src.includes("confirm"), "Deve proteger o usuário contra perda de dados não salvos");
  assert.ok(src.includes("restaurar") || src.includes("restore-default"), "Deve possuir ação para restaurar modelo padrão");
  assert.ok(src.includes("publish"), "Deve possuir controle de publicação / despublicação");
});

test("7. APIs de Gestão de Páginas Informativas implementadas com segurança e auditoria", () => {
  const apiBasePath = path.join(__dirname, "../src/app/api/admin/information-pages");
  assert.ok(fs.existsSync(path.join(apiBasePath, "route.ts")), "Endpoint base GET /api/admin/information-pages deve existir");
  assert.ok(fs.existsSync(path.join(apiBasePath, "[id]/route.ts")), "Endpoint GET/PUT /api/admin/information-pages/[id] deve existir");
  assert.ok(fs.existsSync(path.join(apiBasePath, "[id]/publish/route.ts")), "Endpoint POST publish deve existir");
  assert.ok(fs.existsSync(path.join(apiBasePath, "[id]/restore-default/route.ts")), "Endpoint POST restore-default deve existir");

  // Verifica validação e auditoria
  const updateSrc = fs.readFileSync(path.join(apiBasePath, "[id]/route.ts"), "utf8");
  assert.ok(updateSrc.includes("requireAdmin"), "Endpoint PUT deve exigir ADMIN");
  assert.ok(updateSrc.includes("sanitizeCustomHtml"), "Endpoint PUT deve sanitizar conteúdo HTML");
  assert.ok(updateSrc.includes("prisma.auditLog.create"), "Endpoint PUT deve registrar AuditLog");

  const publishSrc = fs.readFileSync(path.join(apiBasePath, "[id]/publish/route.ts"), "utf8");
  assert.ok(publishSrc.includes("requireAdmin"), "Endpoint publish deve exigir ADMIN");
  assert.ok(publishSrc.includes("prisma.auditLog.create"), "Endpoint publish deve registrar AuditLog");
});

test("8. Sistema de Cookies: Persistência de 180 dias, categorias de consentimento e reabertura", () => {
  const bannerPath = path.join(__dirname, "../src/components/cookie-consent/cookie-banner.tsx");
  assert.ok(fs.existsSync(bannerPath), "CookieBanner deve existir");

  const bannerSrc = fs.readFileSync(bannerPath, "utf8");

  // Chave no localStorage e validade de 180 dias
  assert.ok(bannerSrc.includes("psi_cookie_consent"), "Deve usar a chave 'psi_cookie_consent' no localStorage");
  assert.ok(bannerSrc.includes("180 * 24 * 60 * 60 * 1000") || bannerSrc.includes("180"), "Deve respeitar o período de expiração de 180 dias");

  // 3 Categorias de consentimento
  assert.ok(bannerSrc.includes("necessary"), "Deve gerenciar categoria de cookies Necessários");
  assert.ok(bannerSrc.includes("analytics"), "Deve gerenciar categoria de cookies Analíticos");
  assert.ok(bannerSrc.includes("externalMedia") || bannerSrc.includes("external_media"), "Deve gerenciar categoria de cookies de Mídia Externa");

  // Botões de ação
  assert.ok(bannerSrc.includes("Aceitar Opcionais") || bannerSrc.includes("Aceitar Todos"), "Deve possuir botão para aceitar");
  assert.ok(bannerSrc.includes("Rejeitar Opcionais"), "Deve possuir botão para rejeitar opcionais");
  assert.ok(bannerSrc.includes("Personalizar"), "Deve possuir botão para personalizar consentimento");

  // Evento para reabertura sob demanda
  assert.ok(bannerSrc.includes("open-psi-cookie-preferences"), "Deve ouvir evento open-psi-cookie-preferences para reabertura");

  // Componente de gatilho de reabertura
  const triggerPath = path.join(__dirname, "../src/components/cookie-consent/cookie-preferences-trigger.tsx");
  assert.ok(fs.existsSync(triggerPath), "CookiePreferencesTrigger deve existir");
  const triggerSrc = fs.readFileSync(triggerPath, "utf8");
  assert.ok(triggerSrc.includes("open-psi-cookie-preferences"), "Gatilho deve disparar o evento customizado");
  assert.ok(triggerSrc.includes("Preferências de cookies"), "Texto do botão deve ser 'Preferências de cookies'");
});

test("9. Rodapé do MiniSite: Exibe apenas páginas publicadas e substitui link direto de cookies", () => {
  const homePath = path.join(__dirname, "../src/app/page.tsx");
  const homeSrc = fs.readFileSync(homePath, "utf8");

  // Verifica inclusão dos componentes
  assert.ok(homeSrc.includes("CookieBanner"), "MiniSite deve incluir o CookieBanner");
  assert.ok(homeSrc.includes("CookiePreferencesTrigger"), "MiniSite deve incluir o gatilho de preferências no rodapé");

  // Verifica que não há mais link estático para /cookies no rodapé
  assert.ok(!homeSrc.includes('href="/cookies"'), "Não deve haver link direto para /cookies no rodapé do MiniSite");

  // Links condicionados a publicação
  assert.ok(homeSrc.includes("publishedPageIds.has"), "Links do rodapé devem respeitar páginas publicadas");
  assert.ok(homeSrc.includes("/termos-de-uso"), "Deve apontar para /termos-de-uso");
  assert.ok(homeSrc.includes("/politica-de-privacidade"), "Deve apontar para /politica-de-privacidade");
  assert.ok(homeSrc.includes("/protecao-de-dados"), "Deve apontar para /protecao-de-dados");
  assert.ok(homeSrc.includes("/etica-profissional"), "Deve apontar para /etica-profissional");
});
