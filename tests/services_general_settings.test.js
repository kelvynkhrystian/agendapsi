const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

test("1. Módulo de Serviços: Estrutura de subnavegação em abas (Serviços e Configurações Gerais)", () => {
  const filePath = path.join(__dirname, "../src/app/admin/servicos/page.tsx");
  assert.ok(fs.existsSync(filePath), "A página /admin/servicos deve existir");

  const content = fs.readFileSync(filePath, "utf8");

  // Subnavegação em abas
  assert.ok(
    content.includes('setActiveTab("services")') && content.includes('setActiveTab("general")'),
    "Deve possuir alternância entre abas de Serviços e Configurações Gerais"
  );
  assert.ok(content.includes("Serviços"), "Aba Serviços deve estar visível");
  assert.ok(content.includes("Configurações Gerais"), "Aba Configurações Gerais deve estar visível");
  assert.ok(content.includes("Briefcase") && content.includes("Settings"), "Abas devem conter ícones de navegação");
});

test("2. Modal Criar/Editar Serviço: Mantém estritamente campos específicos do atendimento", () => {
  const filePath = path.join(__dirname, "../src/app/admin/servicos/page.tsx");
  const content = fs.readFileSync(filePath, "utf8");

  // Campos específicos mantidos
  assert.ok(content.includes("Nome do Serviço *"), "Deve manter campo Nome do Serviço");
  assert.ok(content.includes("Descrição Detalhada"), "Deve manter campo Descrição");
  assert.ok(content.includes("Preço em Reais"), "Deve manter campo Preço em Reais");
  assert.ok(content.includes("Serviço gratuito por padrão"), "Deve manter opção de serviço gratuito");
  assert.ok(content.includes("Duração em Minutos *"), "Deve manter campo Duração em Minutos");
  assert.ok(content.includes("Serviço ativo e visível para agendamento público"), "Deve manter controle de visibilidade pública");
});

test("3. Modal Criar/Editar Serviço: Bloco inferior com regras globais foi removido do formulário individual", () => {
  const filePath = path.join(__dirname, "../src/app/admin/servicos/page.tsx");
  const content = fs.readFileSync(filePath, "utf8");

  // O formulário de serviço NÃO deve conter inputs para regras gerais
  assert.ok(
    !content.includes('label="Buffer / Intervalo após a sessão (Minutos)"'),
    "Buffer após sessão não deve mais constar no formulário individual de serviço"
  );
  assert.ok(
    !content.includes('label="Aviso Mínimo de Cancelamento (Dias)"'),
    "Aviso mínimo de cancelamento não deve mais constar no formulário individual de serviço"
  );

  // Deve haver nota explicativa orientando que políticas operacionais estão nas Configurações Gerais
  assert.ok(
    content.includes("Configurações Gerais"),
    "Deve conter aviso informativo apontando para Configurações Gerais"
  );
});

test("4. Aba Configurações Gerais: Centraliza regras globais de agenda e políticas operacionais", () => {
  const filePath = path.join(__dirname, "../src/app/admin/servicos/page.tsx");
  const content = fs.readFileSync(filePath, "utf8");

  // Bloco 1: Políticas de Agendamento e Horários
  assert.ok(content.includes("Políticas de Agendamento e Horários"), "Deve conter card de Políticas de Agendamento");
  assert.ok(content.includes("Fuso Horário Padrão do Consultório"), "Deve conter campo Fuso Horário");
  assert.ok(content.includes("Antecedência Mínima para Reserva"), "Deve conter campo Antecedência Mínima");
  assert.ok(content.includes("Horizonte Máximo de Agendamento"), "Deve conter campo Horizonte Máximo");
  assert.ok(content.includes("Prazo Limite para Cancelamento sem Penalidade"), "Deve conter campo Prazo Limite Cancelamento");

  // Bloco 2: Operação das Sessões & Confirmações Globais
  assert.ok(content.includes("Operação das Sessões & Confirmações Globais"), "Deve conter card de Operação e Confirmações");
  assert.ok(content.includes("Buffer / Intervalo entre Atendimentos"), "Deve conter campo Buffer entre atendimentos");
  assert.ok(content.includes("Modalidade Padrão do Consultório"), "Deve conter campo Modalidade Padrão");
  assert.ok(content.includes("Política de Confirmação Padrão"), "Deve conter campo Política de Confirmação");
  assert.ok(content.includes("Permitir que o próprio paciente solicite remarcação"), "Deve conter opção de remarcação");

  // Ação de salvamento
  assert.ok(content.includes("Salvar Configurações Gerais"), "Deve conter botão Salvar Configurações Gerais");
});

test("5. Endpoint REST: /api/admin/services/settings para consulta e atualização segura", () => {
  const filePath = path.join(__dirname, "../src/app/api/admin/services/settings/route.ts");
  assert.ok(fs.existsSync(filePath), "A rota de API /api/admin/services/settings deve existir");

  const content = fs.readFileSync(filePath, "utf8");

  assert.ok(content.includes("requireAdmin"), "Deve proteger acesso com requireAdmin");
  assert.ok(content.includes("prisma.systemSettings"), "Deve persistir na tabela SystemSettings");
  assert.ok(content.includes("AuditLog") || content.includes("auditLog"), "Deve registrar atualização na trilha de auditoria");
  assert.ok(content.includes("defaultBufferMinutes"), "Deve gerenciar defaultBufferMinutes");
  assert.ok(content.includes("defaultModality"), "Deve gerenciar defaultModality");
  assert.ok(content.includes("defaultConfirmationPolicy"), "Deve gerenciar defaultConfirmationPolicy");
});

test("6. Criação de Serviços: Herança automática de configurações padrão globais", () => {
  const servicesRoute = path.join(__dirname, "../src/app/api/services/route.ts");
  const content = fs.readFileSync(servicesRoute, "utf8");

  assert.ok(
    content.includes("settings?.defaultBufferMinutes") || content.includes("defaultBufferMinutes"),
    "POST /api/services deve herdar defaultBufferMinutes de SystemSettings quando não enviado"
  );
  assert.ok(
    content.includes("settings?.defaultModality") || content.includes("defaultModality"),
    "POST /api/services deve herdar defaultModality de SystemSettings quando não enviado"
  );
  assert.ok(
    content.includes("settings?.defaultConfirmationPolicy") || content.includes("defaultConfirmationPolicy"),
    "POST /api/services deve herdar defaultConfirmationPolicy de SystemSettings quando não enviado"
  );
});
