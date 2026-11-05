const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

test("Phase 3 Dashboards — 1. Admin Dashboard: KPIs, Agenda e Integração de Dados Reais", () => {
  const adminPagePath = path.join(process.cwd(), "src", "app", "admin", "page.tsx");
  assert.ok(fs.existsSync(adminPagePath), "src/app/admin/page.tsx deve existir");
  const content = fs.readFileSync(adminPagePath, "utf-8");

  // Endpoint de dados reais
  assert.ok(
    content.includes('fetch("/api/admin/dashboard-stats")'),
    "Admin Dashboard deve consumir a API oficial de estatísticas reais"
  );

  // Cards de KPI
  assert.ok(content.includes("Atendimentos Hoje"), "Deve conter KPI de Atendimentos Hoje");
  assert.ok(content.includes("Pacientes Cadastrados"), "Deve conter KPI de Pacientes Cadastrados");
  assert.ok(content.includes("Receita deste Mês"), "Deve conter KPI de Receita do Mês");
  assert.ok(content.includes("Recebimentos Pendentes"), "Deve conter KPI de Recebimentos Pendentes");

  // Agenda de Hoje e Próximos Atendimentos
  assert.ok(content.includes("Agenda de Hoje"), "Deve exibir a lista de consultas do dia");
  assert.ok(content.includes("Próximos Atendimentos"), "Deve exibir próximos atendimentos agendados");

  // EmptyState para dias sem atendimento
  assert.ok(
    content.includes("EmptyState"),
    "Deve utilizar o componente compartilhado EmptyState para estados vazios"
  );

  // Widgets operacionais
  assert.ok(content.includes("Ações Rápidas"), "Deve conter painel de ações rápidas");
  assert.ok(content.includes("Armazenamento Local"), "Deve conter widget de armazenamento auditado");
  assert.ok(content.includes("Últimas Atividades"), "Deve conter registro de atividades auditadas");
});

test("Phase 3 Dashboards — 2. Patient Dashboard: Consultas, Destaque e Ações Seguras", () => {
  const patientPagePath = path.join(process.cwd(), "src", "app", "paciente", "page.tsx");
  assert.ok(fs.existsSync(patientPagePath), "src/app/paciente/page.tsx deve existir");
  const content = fs.readFileSync(patientPagePath, "utf-8");

  // Endpoint oficial de agendamentos do paciente
  assert.ok(
    content.includes('fetch("/api/appointments")'),
    "Patient Dashboard deve consumir o endpoint oficial /api/appointments"
  );

  // Destaque de próximo atendimento
  assert.ok(
    content.includes("Seu Próximo Atendimento") || content.includes("nextAppointment"),
    "Deve conter lógica e apresentação de destaque para o próximo atendimento"
  );

  // Modal de informações presenciais com Google Maps
  assert.ok(
    content.includes("selectedInPersonAppt"),
    "Deve manter o modal com dados da consulta presencial"
  );
  assert.ok(
    content.includes("google.com/maps"),
    "Modal presencial deve conter link direto para o Google Maps"
  );

  // Modal de cancelamento com cálculo de prazo contratual
  assert.ok(
    content.includes("handleConfirmCancel"),
    "Deve manter o fluxo de cancelamento de consulta"
  );
  assert.ok(
    content.includes("cancellationNoticeDays"),
    "Deve verificar e alertar sobre a política de antecedência de cancelamento"
  );

  // Atalhos Rápidos do Paciente
  assert.ok(content.includes("/paciente/anamnese"), "Deve conter atalho para a Ficha de Anamnese");
  assert.ok(content.includes("/paciente/documentos"), "Deve conter atalho para Documentos Liberados");
  assert.ok(content.includes("/paciente/financeiro"), "Deve conter atalho para Pacotes & Faturas");
});

test("Phase 3 Dashboards — 3. Harmonia Visual, Tipografia e Acessibilidade", () => {
  const adminContent = fs.readFileSync(path.join(process.cwd(), "src", "app", "admin", "page.tsx"), "utf-8");
  const patientContent = fs.readFileSync(path.join(process.cwd(), "src", "app", "paciente", "page.tsx"), "utf-8");

  // Tipografia font-heading
  assert.ok(
    adminContent.includes("font-heading"),
    "Admin Dashboard deve utilizar a tipografia unificada font-heading"
  );
  assert.ok(
    patientContent.includes("font-heading"),
    "Patient Dashboard deve utilizar a tipografia unificada font-heading"
  );

  // Não contém classes hardcoded de azul fixo em botões principais
  assert.ok(
    !adminContent.includes("bg-blue-600 hover:bg-blue-700"),
    "Admin Dashboard não deve conter classes rígidas bg-blue-600 em botões principais"
  );
  assert.ok(
    !patientContent.includes("bg-blue-600 hover:bg-blue-700"),
    "Patient Dashboard não deve conter classes rígidas bg-blue-600 em botões principais"
  );
});
