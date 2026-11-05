/**
 * Mapeamentos centralizados de tradução e localização para o Português do Brasil (pt-BR).
 * Garante que nenhum termo técnico, enum ou descrição em inglês seja exibido ao usuário final.
 */

// ==========================================
// 1. ATIVIDADES RECENTES & AUDIT LOG (PRIORIDADE)
// ==========================================

export const ACTIVITY_ACTION_MAP: Record<string, string> = {
  // Pagamentos
  PAYMENT_CREATED: "Pagamento criado",
  PAYMENT_APPROVED: "Pagamento aprovado",
  PAYMENT_PENDING: "Pagamento pendente",
  PAYMENT_FAILED: "Falha no pagamento",
  PAYMENT_REFUNDED: "Pagamento estornado",
  PAYMENT_CONFIRMED_MANUALLY: "Pagamento confirmado manualmente",
  "Payment created": "Pagamento criado",
  "Payment approved": "Pagamento aprovado",
  "Payment pending": "Pagamento pendente",
  "Payment failed": "Falha no pagamento",
  "Payment refunded": "Pagamento reembolsado",
  "Payment completed": "Pagamento concluído",

  // Agendamentos e Consultas
  APPOINTMENT_CREATED: "Agendamento criado",
  APPOINTMENT_CANCELLED: "Agendamento cancelado",
  APPOINTMENT_RESCHEDULED: "Agendamento remarcado",
  APPOINTMENT_STATUS_CHANGED_TO_CONFIRMED: "Consulta confirmada",
  APPOINTMENT_STATUS_CHANGED_TO_COMPLETED: "Consulta realizada",
  APPOINTMENT_STATUS_CHANGED_TO_CANCELLED: "Consulta cancelada",
  APPOINTMENT_STATUS_CHANGED_TO_NO_SHOW: "Não comparecimento (No-Show) registrado",
  APPOINTMENT_STATUS_CHANGED_TO_LATE_CANCELLED: "Cancelamento tardio registrado",
  APPOINTMENT_STATUS_CHANGED_TO_PENDING_CONFIRMATION: "Consulta aguardando confirmação",
  "Appointment created": "Agendamento criado",
  "Appointment cancelled": "Agendamento cancelado",
  "Appointment rescheduled": "Agendamento remarcado",

  // Pacientes e Perfil
  PATIENT_REGISTERED: "Paciente cadastrado",
  PATIENT_CREATED_BY_ADMIN: "Paciente cadastrado pelo profissional",
  PATIENT_UPDATED_BY_ADMIN: "Cadastro do paciente atualizado",
  PATIENT_PROFILE_UPDATED: "Perfil do paciente atualizado",
  PROFILE_CHANGE_REQUESTED: "Solicitação de alteração cadastral recebida",
  PROFILE_CHANGE_APPROVED: "Alteração cadastral aprovada",
  PROFILE_CHANGE_REJECTED: "Alteração cadastral recusada",
  "Patient registered": "Paciente cadastrado",
  "Profile updated": "Perfil atualizado",

  // Autenticação e Credenciais
  LOGIN_SUCCESS: "Login realizado com sucesso",
  LOGIN_FAILED: "Tentativa de login malsucedida",
  PASSWORD_CHANGED: "Senha de acesso alterada",
  "Login successful": "Login realizado com sucesso",
  "Login failed": "Tentativa de login falhou",
  "Password changed": "Senha alterada",

  // Prontuários e Documentos Clínicos
  CLINICAL_RECORD_CREATED: "Evolução de prontuário registrada",
  CLINICAL_RECORD_REVISED: "Evolução de prontuário retificada",
  ANAMNESIS_SUBMITTED: "Ficha de anamnese enviada pelo paciente",
  ANAMNESIS_RESET_REQUESTED: "Reenvio de anamnese solicitado pelo profissional",
  FILE_SHARED_WITH_PATIENT: "Documento compartilhado com o paciente",
  FILE_SHARE_REVOKED: "Acesso a documento revogado",
  FILE_SHARE_REACTIVATED: "Acesso a documento reativado",
  FILE_UPLOADED: "Arquivo enviado com sucesso",
  "File uploaded": "Arquivo enviado com sucesso",
  "File shared": "Documento compartilhado",

  // Pacotes de Atendimento
  PACKAGE_PROPOSED: "Proposta de pacote enviada",
  PACKAGE_ACCEPTED: "Proposta de pacote aceita pelo paciente",
  PACKAGE_REJECTED: "Proposta de pacote recusada pelo paciente",
  "Package proposed": "Proposta de pacote enviada",
  "Package accepted": "Pacote de consultas aceito",
  "Package rejected": "Pacote de consultas recusado",

  // Integrações e Sistema
  BACKUP_GENERATED: "Backup do sistema gerado com sucesso",
  GOOGLE_MEET_CONNECTED: "Conta do Google Meet conectada",
  GOOGLE_MEET_DISCONNECTED: "Conta do Google Meet desconectada",
  TEST_EMAIL_DISPATCHED: "E-mail de teste disparado",
  TEST_WHATSAPP_DISPATCHED: "Mensagem de teste do WhatsApp disparada",
  EMAIL_CHANGE_REQUESTED: "Solicitação de troca de e-mail iniciada",
  EMAIL_CHANGE_REJECTED_NO_SMTP: "Troca de e-mail rejeitada por falta de servidor SMTP",
  EMAIL_CHANGED_VERIFIED: "Novo e-mail verificado e confirmado",
  SERVICE_CREATED: "Novo serviço cadastrado",
  SERVICE_UPDATED: "Serviço atualizado",
  SERVICE_DELETED: "Serviço desativado",
  "Service updated": "Serviço atualizado",
  "Backup created": "Backup do sistema gerado",
};

/**
 * Traduz a ação ou evento de atividade recente para o Português do Brasil.
 * Mantém compatibilidade com registros legados e históricos em inglês.
 */
export function formatActivityAction(action?: string | null): string {
  if (!action) return "Atividade registrada";

  // Busca correspondência direta no mapa
  if (ACTIVITY_ACTION_MAP[action]) {
    return ACTIVITY_ACTION_MAP[action];
  }

  // Verifica prefixos dinâmicos conhecidos
  if (action.startsWith("APPOINTMENT_STATUS_CHANGED_TO_")) {
    const targetStatus = action.replace("APPOINTMENT_STATUS_CHANGED_TO_", "");
    return `Status da consulta alterado para ${formatAppointmentStatus(targetStatus).toLowerCase()}`;
  }

  if (action.startsWith("PROFILE_CHANGE_")) {
    const decision = action.replace("PROFILE_CHANGE_", "");
    return `Alteração cadastral ${decision === "APPROVED" ? "aprovada" : "recusada"}`;
  }

  // Fallback seguro: formata termos técnicos com underline para exibição legível
  return action
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

// ==========================================
// 2. STATUS E MÉTODOS FINANCEIROS
// ==========================================

export const PAYMENT_STATUS_MAP: Record<string, string> = {
  PENDING: "Pendente",
  APPROVED: "Aprovado",
  PAID: "Pago",
  FAILED: "Falhou",
  CANCELLED: "Cancelado",
  REFUNDED: "Estornado",
  PROCESSING: "Em processamento",
  COMPLETED: "Concluído",
  OVERDUE: "Vencido",
  REJECTED: "Rejeitado",
  SIMULATED: "Simulado",
  // Formatos em minúsculo
  pending: "Pendente",
  approved: "Aprovado",
  paid: "Pago",
  failed: "Falhou",
  cancelled: "Cancelado",
  refunded: "Estornado",
  processing: "Em processamento",
  completed: "Concluído",
  overdue: "Vencido",
};

export function formatPaymentStatus(status?: string | null): string {
  if (!status) return "Indefinido";
  return PAYMENT_STATUS_MAP[status] || status;
}

export const PAYMENT_METHOD_MAP: Record<string, string> = {
  ONLINE_SIMULATED: "Online Simulado",
  IN_PERSON: "Presencial no Consultório",
  WHATSAPP_ARRANGED: "Combinado via WhatsApp",
  CREDIT_CARD: "Cartão de Crédito",
  PIX: "Pix",
  CASH: "Dinheiro em Espécie",
  BANK_TRANSFER: "Transferência Bancária",
  // Formatos com espaço
  "ONLINE SIMULATED": "Online Simulado",
  "IN PERSON": "Presencial no Consultório",
  "WHATSAPP ARRANGED": "Combinado via WhatsApp",
};

export function formatPaymentMethod(method?: string | null): string {
  if (!method) return "Não especificado";
  return PAYMENT_METHOD_MAP[method] || method.replace(/_/g, " ");
}

// ==========================================
// 3. STATUS E MODALIDADES DE AGENDAMENTO
// ==========================================

export const APPOINTMENT_STATUS_MAP: Record<string, string> = {
  PENDING_CONFIRMATION: "Aguardando Confirmação",
  CONFIRMED: "Confirmado",
  COMPLETED: "Realizado",
  CANCELLED: "Cancelado",
  LATE_CANCELLED: "Cancelamento Tardio",
  NO_SHOW: "Não Compareceu (No-Show)",
};

export function formatAppointmentStatus(status?: string | null): string {
  if (!status) return "Indefinido";
  return APPOINTMENT_STATUS_MAP[status] || status;
}

export const MODALITY_MAP: Record<string, string> = {
  ONLINE: "Teleconsulta Online",
  PRESENTIAL: "Presencial no Consultório",
  BOTH: "Híbrido (Presencial ou Online)",
};

export function formatModality(modality?: string | null): string {
  if (!modality) return "Não definida";
  return MODALITY_MAP[modality] || modality;
}

// ==========================================
// 4. PACOTES, POLÍTICAS E BACKUPS
// ==========================================

export const PACKAGE_STATUS_MAP: Record<string, string> = {
  PROPOSED: "Proposta Enviada",
  ACCEPTED: "Aceito",
  REJECTED: "Recusado",
  EXPIRED: "Expirado",
  CANCELLED: "Cancelado",
};

export function formatPackageStatus(status?: string | null): string {
  if (!status) return "Indefinido";
  return PACKAGE_STATUS_MAP[status] || status;
}

export const CONFIRMATION_POLICY_MAP: Record<string, string> = {
  AUTOMATIC: "Automática",
  UPON_PAYMENT: "Após Pagamento",
  MANUAL_ADMIN: "Manual pelo Profissional",
  PAYMENT_AND_ADMIN: "Pagamento e Aprovação Manual",
};

export function formatConfirmationPolicy(policy?: string | null): string {
  if (!policy) return "Padrão";
  return CONFIRMATION_POLICY_MAP[policy] || policy;
}

export const BACKUP_STATUS_MAP: Record<string, string> = {
  SUCCESS: "Concluído",
  PENDING: "Em andamento",
  FAILED: "Falhou",
};

export function formatBackupStatus(status?: string | null): string {
  if (!status) return "Indefinido";
  return BACKUP_STATUS_MAP[status] || status;
}
