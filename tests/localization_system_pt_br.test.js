const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

test("Localização pt-BR — 1. Mapeamento Centralizado de Atividades Recentes e Auditoria (Prioridade)", () => {
  const transPath = path.join(process.cwd(), "src", "lib", "translations.ts");
  assert.ok(fs.existsSync(transPath), "src/lib/translations.ts deve existir");
  const content = fs.readFileSync(transPath, "utf-8");

  // Eventos de Pagamento
  assert.ok(content.includes('PAYMENT_CREATED: "Pagamento criado"'), "Mapeamento PAYMENT_CREATED");
  assert.ok(content.includes('PAYMENT_APPROVED: "Pagamento aprovado"'), "Mapeamento PAYMENT_APPROVED");
  assert.ok(content.includes('PAYMENT_PENDING: "Pagamento pendente"'), "Mapeamento PAYMENT_PENDING");
  assert.ok(content.includes('PAYMENT_FAILED: "Falha no pagamento"'), "Mapeamento PAYMENT_FAILED");
  assert.ok(content.includes('PAYMENT_REFUNDED: "Pagamento estornado"'), "Mapeamento PAYMENT_REFUNDED");

  // Compatibilidade com registros legados em inglês
  assert.ok(content.includes('"Payment created": "Pagamento criado"'), "Legado Payment created");
  assert.ok(content.includes('"Payment approved": "Pagamento aprovado"'), "Legado Payment approved");
  assert.ok(content.includes('"Payment pending": "Pagamento pendente"'), "Legado Payment pending");
  assert.ok(content.includes('"Payment failed": "Falha no pagamento"'), "Legado Payment failed");
  assert.ok(content.includes('"Payment refunded": "Pagamento reembolsado"'), "Legado Payment refunded");
  assert.ok(content.includes('"Payment completed": "Pagamento concluído"'), "Legado Payment completed");

  // Agendamentos e Consultas
  assert.ok(content.includes('"Appointment created": "Agendamento criado"'), "Legado Appointment created");
  assert.ok(content.includes('"Appointment cancelled": "Agendamento cancelado"'), "Legado Appointment cancelled");
  assert.ok(content.includes('"Appointment rescheduled": "Agendamento remarcado"'), "Legado Appointment rescheduled");
  assert.ok(content.includes('APPOINTMENT_STATUS_CHANGED_TO_CONFIRMED: "Consulta confirmada"'), "APPOINTMENT_STATUS_CHANGED_TO_CONFIRMED");
  assert.ok(content.includes('APPOINTMENT_STATUS_CHANGED_TO_COMPLETED: "Consulta realizada"'), "APPOINTMENT_STATUS_CHANGED_TO_COMPLETED");

  // Pacientes e Usuários
  assert.ok(content.includes('"Patient registered": "Paciente cadastrado"'), "Legado Patient registered");
  assert.ok(content.includes('"Profile updated": "Perfil atualizado"'), "Legado Profile updated");
  assert.ok(content.includes('PROFILE_CHANGE_REQUESTED: "Solicitação de alteração cadastral recebida"'), "PROFILE_CHANGE_REQUESTED");
  assert.ok(content.includes('PROFILE_CHANGE_APPROVED: "Alteração cadastral aprovada"'), "PROFILE_CHANGE_APPROVED");
  assert.ok(content.includes('PROFILE_CHANGE_REJECTED: "Alteração cadastral recusada"'), "PROFILE_CHANGE_REJECTED");

  // Autenticação
  assert.ok(content.includes('LOGIN_SUCCESS: "Login realizado com sucesso"'), "LOGIN_SUCCESS");
  assert.ok(content.includes('LOGIN_FAILED: "Tentativa de login malsucedida"'), "LOGIN_FAILED");
  assert.ok(content.includes('"Login successful": "Login realizado com sucesso"'), "Legado Login successful");

  // Exclusões e Arquivamento (histórico e enums)
  assert.ok(content.includes('PATIENT_ARCHIVED: "Paciente arquivado"'), "PATIENT_ARCHIVED");
  assert.ok(
    content.includes('PATIENT_PERMANENTLY_DELETED: "Paciente excluído permanentemente"'),
    "PATIENT_PERMANENTLY_DELETED"
  );
  assert.ok(content.includes('DOCUMENT_DELETED: "Documento excluído"'), "DOCUMENT_DELETED");
  assert.ok(content.includes('"Patient archived": "Paciente arquivado"'), "Legado Patient archived");
  assert.ok(
    content.includes('"Patient permanently deleted": "Paciente excluído permanentemente"'),
    "Legado Patient permanently deleted"
  );
  assert.ok(content.includes('"Document deleted": "Documento excluído"'), "Legado Document deleted");

  // Função helper
  assert.ok(content.includes("export function formatActivityAction"), "Deve exportar formatActivityAction");
});

test("Localização pt-BR — 2. Mapeamento de Status Financeiros e Métodos de Pagamento", () => {
  const transPath = path.join(process.cwd(), "src", "lib", "translations.ts");
  const content = fs.readFileSync(transPath, "utf-8");

  // Status de Pagamento
  assert.ok(content.includes('PENDING: "Pendente"'), "Status PENDING");
  assert.ok(content.includes('APPROVED: "Aprovado"'), "Status APPROVED");
  assert.ok(content.includes('PAID: "Pago"'), "Status PAID");
  assert.ok(content.includes('FAILED: "Falhou"'), "Status FAILED");
  assert.ok(content.includes('CANCELLED: "Cancelado"'), "Status CANCELLED");
  assert.ok(content.includes('REFUNDED: "Estornado"'), "Status REFUNDED");
  assert.ok(content.includes('PROCESSING: "Em processamento"'), "Status PROCESSING");
  assert.ok(content.includes('COMPLETED: "Concluído"'), "Status COMPLETED");
  assert.ok(content.includes('OVERDUE: "Vencido"'), "Status OVERDUE");

  // Métodos de Pagamento
  assert.ok(content.includes('ONLINE_SIMULATED: "Online Simulado"'), "Método ONLINE_SIMULATED");
  assert.ok(content.includes('IN_PERSON: "Presencial no Consultório"'), "Método IN_PERSON");
  assert.ok(content.includes('WHATSAPP_ARRANGED: "Combinado via WhatsApp"'), "Método WHATSAPP_ARRANGED");

  // Funções helpers
  assert.ok(content.includes("export function formatPaymentStatus"), "Deve exportar formatPaymentStatus");
  assert.ok(content.includes("export function formatPaymentMethod"), "Deve exportar formatPaymentMethod");
});

test("Localização pt-BR — 3. Mapeamento de Status de Consultas, Modalidades e Políticas", () => {
  const transPath = path.join(process.cwd(), "src", "lib", "translations.ts");
  const content = fs.readFileSync(transPath, "utf-8");

  // Status de Agendamento
  assert.ok(content.includes('CONFIRMED: "Confirmado"'), "Status CONFIRMED");
  assert.ok(content.includes('COMPLETED: "Realizado"'), "Status COMPLETED");
  assert.ok(content.includes('CANCELLED: "Cancelado"'), "Status CANCELLED");
  assert.ok(content.includes('LATE_CANCELLED: "Cancelamento Tardio"'), "Status LATE_CANCELLED");
  assert.ok(content.includes('NO_SHOW: "Não Compareceu"'), "Status NO_SHOW em pt-BR sem termo inglês");
  assert.ok(content.includes('PENDING_CONFIRMATION: "Aguardando Confirmação"'), "Status PENDING_CONFIRMATION");

  // Modalidade
  assert.ok(content.includes('ONLINE: "Teleconsulta Online"'), "Modalidade ONLINE");
  assert.ok(content.includes('PRESENTIAL: "Presencial no Consultório"'), "Modalidade PRESENTIAL");
  assert.ok(content.includes('BOTH: "Híbrido (Presencial ou Online)"'), "Modalidade BOTH");

  // Status de Pacotes
  assert.ok(content.includes('PROPOSED: "Proposta Enviada"'), "Pacote PROPOSED");
  assert.ok(content.includes('ACCEPTED: "Aceito"'), "Pacote ACCEPTED");
  assert.ok(content.includes('REJECTED: "Recusado"'), "Pacote REJECTED");
  assert.ok(content.includes('EXPIRED: "Expirado"'), "Pacote EXPIRED");

  // Políticas de Confirmação
  assert.ok(content.includes('AUTOMATIC: "Automática"'), "Confirmação AUTOMATIC");
  assert.ok(content.includes('UPON_PAYMENT: "Após Pagamento"'), "Confirmação UPON_PAYMENT");
  assert.ok(content.includes('MANUAL_ADMIN: "Manual pelo Profissional"'), "Confirmação MANUAL_ADMIN");

  // Status de Backup
  assert.ok(content.includes('SUCCESS: "Concluído"'), "Backup SUCCESS");
  assert.ok(content.includes('FAILED: "Falhou"'), "Backup FAILED");
});

test("Localização pt-BR — 4. Integração das Telas de Admin e Paciente com Formatadores", () => {
  const adminPage = fs.readFileSync(path.join(process.cwd(), "src", "app", "admin", "page.tsx"), "utf-8");
  assert.ok(
    adminPage.includes("formatActivityAction(act.action)"),
    "Admin Dashboard deve formatar as ações de atividade recente em pt-BR"
  );
  assert.ok(
    adminPage.includes("formatAppointmentStatus(appt.status)"),
    "Admin Dashboard deve formatar os status de agendamento em pt-BR"
  );

  const adminFinanceiro = fs.readFileSync(path.join(process.cwd(), "src", "app", "admin", "financeiro", "page.tsx"), "utf-8");
  assert.ok(
    adminFinanceiro.includes("formatPaymentStatus(p.status)"),
    "Tela de Financeiro Admin deve formatar os status de pagamento em pt-BR"
  );
  assert.ok(
    adminFinanceiro.includes("formatPaymentMethod(p.method)"),
    "Tela de Financeiro Admin deve formatar os métodos de pagamento em pt-BR"
  );

  const pacienteFinanceiro = fs.readFileSync(path.join(process.cwd(), "src", "app", "paciente", "financeiro", "page.tsx"), "utf-8");
  assert.ok(
    pacienteFinanceiro.includes("formatPaymentStatus(p.status)"),
    "Tela de Financeiro do Paciente deve formatar os status de pagamento em pt-BR"
  );
  assert.ok(
    pacienteFinanceiro.includes("formatPaymentMethod(p.method)"),
    "Tela de Financeiro do Paciente deve formatar os métodos de pagamento em pt-BR"
  );

  const agendaPage = fs.readFileSync(path.join(process.cwd(), "src", "app", "admin", "agenda", "page.tsx"), "utf-8");
  assert.ok(
    agendaPage.includes("formatAppointmentStatus("),
    "Agenda Admin deve formatar os status de agendamento em pt-BR"
  );

  const pacientePage = fs.readFileSync(path.join(process.cwd(), "src", "app", "paciente", "page.tsx"), "utf-8");
  assert.ok(
    pacientePage.includes("formatAppointmentStatus("),
    "Painel do Paciente deve formatar os status de agendamento em pt-BR"
  );

  const servicosPage = fs.readFileSync(path.join(process.cwd(), "src", "app", "admin", "servicos", "page.tsx"), "utf-8");
  assert.ok(
    servicosPage.includes("formatModality(service.modality)"),
    "Tela de Serviços deve formatar a modalidade em pt-BR"
  );
  assert.ok(
    servicosPage.includes("formatConfirmationPolicy(service.confirmationPolicy)"),
    "Tela de Serviços deve formatar a política de confirmação em pt-BR"
  );

  const pacotesPage = fs.readFileSync(path.join(process.cwd(), "src", "app", "admin", "pacotes", "page.tsx"), "utf-8");
  assert.ok(
    pacotesPage.includes("formatPackageStatus(pkg.status)"),
    "Tela de Pacotes deve formatar o status em pt-BR"
  );

  const arquivosPage = fs.readFileSync(path.join(process.cwd(), "src", "app", "admin", "arquivos", "page.tsx"), "utf-8");
  assert.ok(
    arquivosPage.includes("formatBackupStatus(b.status)"),
    "Tela de Arquivos deve formatar o status de backup em pt-BR"
  );
});

test("Localização pt-BR — 5. Formatação Padrão de Moeda e Datas Brasileiras no Utils", () => {
  const utilsPath = path.join(process.cwd(), "src", "lib", "utils.ts");
  const utilsContent = fs.readFileSync(utilsPath, "utf-8");

  // Re-exporta helpers
  assert.ok(
    utilsContent.includes('export * from "./translations"'),
    "src/lib/utils.ts deve reexportar helpers de traduções"
  );

  // Formatação pt-BR
  assert.ok(utilsContent.includes('"pt-BR"'), "Deve usar locale pt-BR");
  assert.ok(utilsContent.includes('"BRL"'), "Deve usar moeda BRL");
  assert.ok(utilsContent.includes("Segunda-feira"), "Deve conter dias da semana em português");
  assert.ok(utilsContent.includes("Domingo"), "Deve conter Domingo em português");
});
