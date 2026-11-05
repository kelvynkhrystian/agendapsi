const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const AdmZip = require("adm-zip");

// ==============================================================================
// 1. TESTES DE AUDITORIA E INTEGRAÇÃO FINAL (PHASE 5/5)
// ==============================================================================

test("Phase 5 Audit — 1. Teste Real de Extração e Ordenação de ZIP de 40 Frames", () => {
  const topZipPath = path.join(process.cwd(), "storage", "minisite", "top", "b.zip");
  const sobreZipPath = fs.existsSync(path.join(process.cwd(), "storage", "minisite", "sobre", "a.zip"))
    ? path.join(process.cwd(), "storage", "minisite", "sobre", "a.zip")
    : path.join(process.cwd(), "storage", "minisite", "mid", "a.zip");

  assert.strictEqual(fs.existsSync(topZipPath), true, "storage/minisite/top/b.zip deve existir");
  assert.strictEqual(fs.existsSync(sobreZipPath), true, "storage/minisite/sobre/a.zip deve existir");

  // Testa b.zip
  const topZip = new AdmZip(topZipPath);
  const topEntries = topZip.getEntries().filter((e) => !e.isDirectory && e.entryName.endsWith(".png"));
  assert.strictEqual(topEntries.length, 40, "b.zip deve conter exatamente 40 frames PNG");

  topEntries.sort((a, b) =>
    path.basename(a.entryName).localeCompare(path.basename(b.entryName), undefined, { numeric: true, sensitivity: "base" })
  );
  assert.strictEqual(path.basename(topEntries[0].entryName), "ezgif-frame-001.png");
  assert.strictEqual(path.basename(topEntries[39].entryName), "ezgif-frame-040.png");

  // Testa a.zip
  const midZip = new AdmZip(sobreZipPath);
  const midEntries = midZip.getEntries().filter((e) => !e.isDirectory && e.entryName.endsWith(".png"));
  assert.strictEqual(midEntries.length, 40, "a.zip deve conter exatamente 40 frames PNG");

  midEntries.sort((a, b) =>
    path.basename(a.entryName).localeCompare(path.basename(b.entryName), undefined, { numeric: true, sensitivity: "base" })
  );
  assert.strictEqual(path.basename(midEntries[0].entryName), "ezgif-frame-001.png");
  assert.strictEqual(path.basename(midEntries[39].entryName), "ezgif-frame-040.png");
});

test("Phase 5 Audit — 2. Isolamento Estrito de Modo Escuro e Tokens Globais", () => {
  const layoutPath = path.join(process.cwd(), "src", "app", "layout.tsx");
  const layoutContent = fs.readFileSync(layoutPath, "utf-8");

  // Tokens globais
  assert.strictEqual(layoutContent.includes("--primary:"), true, "Deve definir --primary no CSS dinâmico");
  assert.strictEqual(layoutContent.includes("--button-bg:"), true, "Deve definir --button-bg no CSS dinâmico");
  assert.strictEqual(layoutContent.includes("--secondary:"), true, "Deve definir --secondary");

  // Verificação no ThemeProvider
  const themeProviderPath = path.join(process.cwd(), "src", "components", "theme-provider.tsx");
  const themeContent = fs.readFileSync(themeProviderPath, "utf-8");

  assert.strictEqual(
    themeContent.includes("pathname.startsWith(\"/admin\") || pathname.startsWith(\"/paciente\")"),
    true,
    "Dark mode deve ser permitido exclusivamente nas rotas /admin e /paciente"
  );
  assert.strictEqual(
    themeContent.includes("document.documentElement.classList.remove(\"dark\")"),
    true,
    "Rotas públicas (MiniSite) devem forçar a remoção da classe dark"
  );
});

test("Phase 5 Audit — 3. Verificação de Todas as 9 Seções do MiniSite Público", () => {
  const pagePath = path.join(process.cwd(), "src", "app", "page.tsx");
  const pageContent = fs.readFileSync(pagePath, "utf-8");

  // 1. Hero
  assert.strictEqual(pageContent.includes("HERO SECTION"), true, "Seção Hero deve existir");
  // 2. Serviços / Demandas
  assert.strictEqual(pageContent.includes("PRINCIPAIS DEMANDAS"), true, "Seção de Atendimentos deve existir");
  // 3. Sobre Mim
  assert.strictEqual(pageContent.includes("SOBRE MIM"), true, "Seção Sobre Mim deve existir");
  // 4. Diferenciais
  assert.strictEqual(pageContent.includes("Diferenciais"), true, "Seção Diferenciais deve existir");
  // 5. Como Funciona
  assert.strictEqual(pageContent.includes("Como Funciona?"), true, "Seção Como Funciona deve existir");
  // 6. Depoimentos
  assert.strictEqual(pageContent.includes("DEPOIMENTOS"), true, "Seção Depoimentos deve existir");
  // 7. Localização
  assert.strictEqual(pageContent.includes("LOCALIZAÇÃO DO CONSULTÓRIO"), true, "Seção Localização deve existir");
  // 8. Final CTA
  assert.strictEqual(pageContent.includes("FINAL CTA"), true, "Seção Final CTA deve existir");
  // 9. Footer
  assert.strictEqual(pageContent.includes("FOOTER"), true, "Rodapé deve existir");
});

test("Phase 5 Audit — 4. Links Funcionais de Agendamento, WhatsApp e Google Maps", () => {
  const pagePath = path.join(process.cwd(), "src", "app", "page.tsx");
  const pageContent = fs.readFileSync(pagePath, "utf-8");

  // Links de agendamento apontam para /agendar
  assert.strictEqual(pageContent.includes('href="/agendar"'), true, "Botões de agendamento devem direcionar para /agendar");
  assert.strictEqual(pageContent.includes('href={`/agendar?serviceId=${service.id}`}'), true, "Cards de serviço devem direcionar para /agendar?serviceId=");

  // Botão WhatsApp e Como Chegar
  assert.strictEqual(pageContent.includes("buildWhatsAppChatUrl"), true, "Deve usar gerador seguro de URL do WhatsApp");
  assert.strictEqual(pageContent.includes("getGoogleMapsDestinationUrl"), true, "Deve usar link de destino do Google Maps");

  // Rewrite de rota /site em next.config.mjs
  const nextConfigPath = path.join(process.cwd(), "next.config.mjs");
  const nextConfigContent = fs.readFileSync(nextConfigPath, "utf-8");
  assert.strictEqual(nextConfigContent.includes("source: '/site'"), true, "Rota /site deve reescrever para /");
});

test("Phase 5 Audit — 5. Omissão de Localização e Botão Flutuante quando Desabilitados", () => {
  const pagePath = path.join(process.cwd(), "src", "app", "page.tsx");
  const pageContent = fs.readFileSync(pagePath, "utf-8");

  // Localização deve ser condicionada a shouldShowLocation
  assert.strictEqual(pageContent.includes("{shouldShowLocation && ("), true);
  assert.strictEqual(
    pageContent.includes("site?.showFloatingWhatsApp !== false && whatsappUrl"),
    true,
    "Botão flutuante de WhatsApp deve respeitar a flag de exibição"
  );
});

test("Phase 5 Audit — 6. Performance e Recursos do MiniSiteMediaPlayer", () => {
  const playerPath = path.join(process.cwd(), "src", "components", "minisite", "media-player.tsx");
  const playerContent = fs.readFileSync(playerPath, "utf-8");

  assert.strictEqual(playerContent.includes("IntersectionObserver"), true, "Deve conter IntersectionObserver para pausar fora do viewport");
  assert.strictEqual(playerContent.includes("prefers-reduced-motion"), true, "Deve respeitar prefers-reduced-motion");
  assert.strictEqual(playerContent.includes("cancelAnimationFrame"), true, "Deve limpar animação ao desmontar componente");
  assert.strictEqual(playerContent.includes("requestAnimationFrame"), true, "Deve usar requestAnimationFrame para renderização suave");
});

test("Phase 5 Audit — 7. Segurança de Uploads e Preservação de Registros Clínicos", () => {
  const uploadApiPath = path.join(process.cwd(), "src", "app", "api", "admin", "minisite", "media", "upload", "route.ts");
  const uploadContent = fs.readFileSync(uploadApiPath, "utf-8");

  assert.strictEqual(uploadContent.includes("requireAdmin"), true, "Upload de mídias deve exigir requireAdmin");

  // Preservação do Sigilo de Prontuários (Regra Permanente do AGENTS.md)
  const clinicalSecurityPath = path.join(process.cwd(), "tests", "clinical_security.test.js");
  assert.strictEqual(fs.existsSync(clinicalSecurityPath), true, "Testes de sigilo clínico devem permanecer intactos");
});
