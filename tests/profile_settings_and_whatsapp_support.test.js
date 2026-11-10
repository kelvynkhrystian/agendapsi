const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

test("1. Admin Configurações: Nova aba Perfil posicionada antes de Aparência e organizada em 3 seções", () => {
  const filePath = path.join(__dirname, "../src/app/admin/configuracoes/page.tsx");
  assert.ok(fs.existsSync(filePath), "A página /admin/configuracoes deve existir");

  const content = fs.readFileSync(filePath, "utf8");

  // A aba 'profile' deve estar presente no estado e tipo
  assert.ok(content.includes('"profile" | "appearance"'), "Aba profile deve constar no tipo de activeTab");

  // Ordem visual das abas: Perfil antes de Aparência
  const profileIndex = content.indexOf('setActiveTab("profile")');
  const appearanceIndex = content.indexOf('setActiveTab("appearance")');
  assert.ok(profileIndex !== -1, "Botão da aba Perfil deve existir");
  assert.ok(appearanceIndex !== -1, "Botão da aba Aparência deve existir");
  assert.ok(profileIndex < appearanceIndex, "A aba Perfil deve ser posicionada ANTES de Aparência");

  // Seções A, B e C
  assert.ok(content.includes("Seção A — Dados da Aplicação"), "Deve conter Seção A — Dados da Aplicação");
  assert.ok(content.includes("Nome da Aplicação / Consultório"), "Deve conter campo Nome da Aplicação");
  assert.ok(content.includes("Versão da Aplicação"), "Deve conter campo Versão da Aplicação");
  assert.ok(content.includes("Metadado do Projeto"), "Versão deve indicar que é metadado do projeto");

  assert.ok(content.includes("Seção B — Dados do Administrador / Profissional"), "Deve conter Seção B — Dados do Profissional");
  assert.ok(content.includes("Nome Completo do Profissional"), "Deve conter campo Nome Completo");
  assert.ok(content.includes("Nome de Exibição Público"), "Deve conter campo Nome de Exibição Público");
  assert.ok(content.includes("Registro Profissional (CRP / CRM)"), "Deve conter campo Registro Profissional");
  assert.ok(content.includes("Especialidade / Título Profissional"), "Deve conter campo Especialidade");
  assert.ok(content.includes("E-mail Administrativo de Acesso"), "Deve conter exibição do e-mail administrativo");
  assert.ok(content.includes("Autenticação Segura"), "E-mail administrativo deve possuir aviso de autenticação segura");

  assert.ok(content.includes("Seção C — Contatos e Redes Sociais"), "Deve conter Seção C — Contatos e Redes Sociais");
  assert.ok(content.includes("Telefone / WhatsApp de Contato"), "Deve conter campo WhatsApp");
  assert.ok(content.includes("Telefone Comercial Alternativo"), "Deve conter campo Telefone Comercial");
  assert.ok(content.includes("E-mail Público de Contato"), "Deve conter campo E-mail de Contato Público");
  assert.ok(content.includes("Instagram"), "Deve conter campo Instagram");
});

test("2. Normalização de WhatsApp e Utilitários de Telefone", () => {
  const { normalizeWhatsAppNumber, formatPhoneDisplay, buildWhatsAppLink } = require("../src/lib/phone-utils.ts");

  // Celular brasileiro com DDD (11 dígitos) -> prefixa 55
  assert.strictEqual(normalizeWhatsAppNumber("(11) 99123-4567"), "5511991234567");
  assert.strictEqual(normalizeWhatsAppNumber("11991234567"), "5511991234567");

  // Fixo brasileiro com DDD (10 dígitos) -> prefixa 55
  assert.strictEqual(normalizeWhatsAppNumber("(11) 3214-5678"), "551132145678");

  // Já com DDI 55
  assert.strictEqual(normalizeWhatsAppNumber("+55 (11) 99123-4567"), "5511991234567");
  assert.strictEqual(normalizeWhatsAppNumber("5511991234567"), "5511991234567");

  // Número vazio ou nulo
  assert.strictEqual(normalizeWhatsAppNumber(""), "");
  assert.strictEqual(normalizeWhatsAppNumber(null), "");

  // Link wa.me
  const linkWithMsg = buildWhatsAppLink("11991234567", "Olá suporte!");
  assert.ok(linkWithMsg.includes("https://wa.me/5511991234567"));
  assert.ok(linkWithMsg.includes("text=Ol%C3%A1%20suporte!"));

  const linkNoMsg = buildWhatsAppLink("11991234567");
  assert.strictEqual(linkNoMsg, "https://wa.me/5511991234567");
});

test("3. Backend API de Perfil Centralizado (/api/admin/profile)", () => {
  const routePath = path.join(__dirname, "../src/app/api/admin/profile/route.ts");
  assert.ok(fs.existsSync(routePath), "A rota /api/admin/profile deve existir");

  const content = fs.readFileSync(routePath, "utf8");

  assert.ok(content.includes("requireAdmin"), "Rota deve exigir autenticação de administrador");
  assert.ok(content.includes("profileSettingsSchema"), "Rota deve validar payload com Zod");
  assert.ok(content.includes("normalizeWhatsAppNumber"), "Rota deve normalizar número de WhatsApp");
  assert.ok(content.includes("prisma.siteSettings.upsert"), "Rota deve atualizar SiteSettings");
  assert.ok(content.includes("prisma.professionalProfile.upsert"), "Rota deve atualizar ProfessionalProfile");
  assert.ok(content.includes("packageJson.version"), "Rota deve ler versão da aplicação dos metadados");

  // O e-mail e senha de login nunca devem ser alterados silenciosamente
  assert.ok(!content.includes("passwordHash"), "Rota não pode modificar o hash de senha do admin");
  assert.ok(!content.includes("adminAccount.update({ data: { email"), "Rota não pode alterar o email de login do admin");
});

test("4. MiniSite Admin: Remoção de campos duplicados e preservação de conteúdos específicos", () => {
  const filePath = path.join(__dirname, "../src/app/admin/minisite/page.tsx");
  const content = fs.readFileSync(filePath, "utf8");

  // Inputs duplicados removidos
  assert.ok(!content.includes('label="Nome Completo *"'), "Não deve ter input de Nome Completo no MiniSite");
  assert.ok(!content.includes('label="Título / Especialidade"'), "Não deve ter input de Título no MiniSite");
  assert.ok(!content.includes('label="Registro (CRP / CRM)"'), "Não deve ter input de CRP/CRM no MiniSite");
  assert.ok(!content.includes('label="Número de WhatsApp do Consultório (com DDD) *"'), "Não deve ter input de WhatsApp no MiniSite");
  assert.ok(!content.includes('label="Telefone Fixo / Comercial Adicional"'), "Não deve ter input de Telefone Fixo no MiniSite");
  assert.ok(!content.includes('label="E-mail de Contato Público"'), "Não deve ter input de E-mail de Contato no MiniSite");
  assert.ok(!content.includes('label="Instagram (@seuperfil)"'), "Não deve ter input de Instagram no MiniSite");

  // Links informativos para Configurações -> Perfil
  assert.ok(
    content.includes("/admin/configuracoes?tab=profile"),
    "Deve conter links direcionando para Configurações -> Perfil"
  );
  assert.ok(
    content.includes("Configurações Gerais → Perfil"),
    "Deve instruir que dados de contato e profissional são centralizados"
  );

  // Conteúdos específicos do MiniSite preservados
  assert.ok(content.includes("Biografia / Abordagem Terapêutica"), "Deve manter Biografia específica do MiniSite");
  assert.ok(content.includes("Mensagem Padrão de Início de Conversa"), "Deve manter mensagem de WhatsApp do MiniSite");
  assert.ok(content.includes("Botão Flutuante Ativo"), "Deve manter toggle de Botão Flutuante");
  assert.ok(content.includes("whatsappChatUrlPreview"), "Deve manter prévia funcional do WhatsApp");
});

test("5. Suporte via WhatsApp na Área do Paciente", () => {
  // 1. Rota de API
  const routePath = path.join(__dirname, "../src/app/api/patient/support/route.ts");
  assert.ok(fs.existsSync(routePath), "A rota /api/patient/support deve existir");

  const routeContent = fs.readFileSync(routePath, "utf8");
  assert.ok(routeContent.includes("requirePatient"), "Rota de suporte deve ser restrita ao paciente");
  assert.ok(routeContent.includes("buildWhatsAppLink"), "Rota deve utilizar utilitário de link do WhatsApp");
  assert.ok(
    routeContent.includes("Olá! Estou acessando o Portal do Paciente e gostaria de falar com o suporte"),
    "Deve conter a mensagem padrão de suporte especificada"
  );
  assert.ok(!routeContent.includes("cpf"), "Não pode expor CPF do paciente");
  assert.ok(!routeContent.includes("clinicalRecord"), "Não pode expor prontuários clínicos");

  // 2. Layout do Paciente
  const layoutPath = path.join(__dirname, "../src/app/paciente/layout.tsx");
  const layoutContent = fs.readFileSync(layoutPath, "utf8");

  assert.ok(layoutContent.includes("/api/patient/support"), "Layout deve consumir API de suporte");
  assert.ok(layoutContent.includes("WhatsAppIcon") || layoutContent.includes("MessageCircle"), "Layout deve exibir ícone de WhatsApp/MessageCircle");
  assert.ok(layoutContent.includes("Suporte"), "Layout deve exibir ação nomeada 'Suporte'");
  assert.ok(layoutContent.includes('target="_blank"'), "Ação deve abrir em nova aba");
});

test("6. MiniSite: Padronização idêntica dos botões flutuantes (52x52px)", () => {
  const filePath = path.join(__dirname, "../src/components/minisite/floating-controls.tsx");
  assert.ok(fs.existsSync(filePath), "Componente MiniSiteFloatingControls deve existir");

  const content = fs.readFileSync(filePath, "utf8");

  // Dimensões idênticas: 52px de largura e altura, borda 50%
  assert.ok(content.includes("w-[52px] h-[52px] rounded-full"), "Deve usar w-[52px] h-[52px] rounded-full para ambos os botões");

  // Ícones padronizados em 24px (h-6 w-6)
  assert.ok(content.includes("h-6 w-6"), "Ícones devem ter tamanho 24px (h-6 w-6)");

  // Espaçamento de ~12px (gap-3) e ordem vertical
  assert.ok(content.includes("gap-3"), "Espaçamento vertical deve ser ~12px (gap-3)");

  // Botão voltar ao topo
  assert.ok(content.includes("scrollToTop"), "Deve conter função scrollToTop");
  assert.ok(content.includes("window.innerHeight"), "Deve aparecer após rolagem equivalente a viewport");
  assert.ok(content.includes("motion-reduce:transition-none"), "Deve respeitar prefers-reduced-motion");
});

test("7. MiniSite Público: Priorização de Nome de Exibição e Consumo Centralizado", () => {
  const pagePath = path.join(__dirname, "../src/app/page.tsx");
  const content = fs.readFileSync(pagePath, "utf8");

  assert.ok(
    content.includes("profile?.displayName || profile?.fullName"),
    "Deve priorizar displayName com fallback para fullName"
  );
  assert.ok(content.includes("site?.clinicName"), "Deve consumir clinicName de siteSettings");
});
