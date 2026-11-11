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
  PAYMENT_RECEIVED: "Pagamento recebido",
  PAYMENT_PENDING: "Pagamento pendente",
  PAYMENT_FAILED: "Falha no pagamento",
  PAYMENT_REFUNDED: "Pagamento estornado",
  PAYMENT_CONFIRMED_MANUALLY: "Pagamento confirmado manualmente",
  "Payment created": "Pagamento criado",
  "Payment approved": "Pagamento aprovado",
  "Payment received": "Pagamento recebido",
  "Payment pending": "Pagamento pendente",
  "Payment failed": "Falha no pagamento",
  "Payment refunded": "Pagamento reembolsado",
  "Payment completed": "Pagamento concluído",

  // Agendamentos e Consultas
  APPOINTMENT_CREATED: "Agendamento criado",
  APPOINTMENT_CONFIRMED: "Consulta confirmada",
  APPOINTMENT_CANCELLED: "Agendamento cancelado",
  APPOINTMENT_CANCELED: "Agendamento cancelado",
  APPOINTMENT_RESCHEDULED: "Agendamento remarcado",
  APPOINTMENT_STATUS_CHANGED_TO_CONFIRMED: "Consulta confirmada",
  APPOINTMENT_STATUS_CHANGED_TO_COMPLETED: "Consulta realizada",
  APPOINTMENT_STATUS_CHANGED_TO_CANCELLED: "Consulta cancelada",
  APPOINTMENT_STATUS_CHANGED_TO_CANCELED: "Consulta cancelada",
  APPOINTMENT_STATUS_CHANGED_TO_NO_SHOW: "Não comparecimento registrado",
  APPOINTMENT_STATUS_CHANGED_TO_LATE_CANCELLED: "Cancelamento tardio registrado",
  APPOINTMENT_STATUS_CHANGED_TO_PENDING_CONFIRMATION: "Consulta aguardando confirmação",
  "Appointment created": "Agendamento criado",
  "Appointment confirmed": "Consulta confirmada",
  "Appointment cancelled": "Agendamento cancelado",
  "Appointment canceled": "Agendamento cancelado",
  "Appointment rescheduled": "Agendamento remarcado",

  // Pacientes e Perfil
  PATIENT_REGISTERED: "Paciente cadastrado",
  PATIENT_CREATED: "Paciente cadastrado",
  PATIENT_CREATED_BY_ADMIN: "Paciente cadastrado pelo profissional",
  PATIENT_UPDATED: "Dados do paciente atualizados",
  PATIENT_UPDATED_BY_ADMIN: "Dados do paciente atualizados",
  PATIENT_ARCHIVED: "Paciente arquivado",
  PATIENT_RESTORED: "Paciente restaurado",
  PATIENT_PERMANENTLY_DELETED: "Paciente excluído permanentemente",
  PATIENT_PROFILE_UPDATED: "Perfil do paciente atualizado",
  PROFILE_CHANGE_REQUESTED: "Solicitação de alteração cadastral recebida",
  PROFILE_CHANGE_APPROVED: "Alteração cadastral aprovada",
  PROFILE_CHANGE_REJECTED: "Alteração cadastral recusada",
  "Patient registered": "Paciente cadastrado",
  "Patient created": "Paciente cadastrado",
  "Patient created by admin": "Paciente cadastrado pelo profissional",
  "Patient updated": "Dados do paciente atualizados",
  "Patient updated by admin": "Dados do paciente atualizados",
  "Patient archived": "Paciente arquivado",
  "Patient restored": "Paciente restaurado",
  "Patient permanently deleted": "Paciente excluído permanentemente",
  "Patient profile updated": "Perfil do paciente atualizado",
  "Profile updated": "Perfil atualizado",
  "Profile change requested": "Solicitação de alteração cadastral recebida",
  "Profile change approved": "Alteração cadastral aprovada",
  "Profile change rejected": "Alteração cadastral recusada",

  // Autenticação e Credenciais
  LOGIN_SUCCESS: "Login realizado com sucesso",
  LOGIN_FAILED: "Tentativa de login malsucedida",
  PASSWORD_CHANGED: "Senha de acesso alterada",
  LOGOUT: "Sessão encerrada",
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
  DOCUMENT_UPLOADED: "Documento enviado",
  DOCUMENT_DELETED: "Documento excluído",
  FILE_DELETED: "Documento excluído",
  "Clinical record created": "Evolução de prontuário registrada",
  "Clinical record revised": "Evolução de prontuário retificada",
  "Anamnesis submitted": "Ficha de anamnese enviada pelo paciente",
  "Anamnesis reset requested": "Reenvio de anamnese solicitado pelo profissional",
  "File uploaded": "Arquivo enviado com sucesso",
  "Document uploaded": "Documento enviado",
  "File shared": "Documento compartilhado",
  "File shared with patient": "Documento compartilhado com o paciente",
  "File share revoked": "Acesso a documento revogado",
  "File share reactivated": "Acesso a documento reativado",
  "Document deleted": "Documento excluído",
  "File deleted": "Documento excluído",

  // Pacotes de Atendimento
  PACKAGE_PROPOSED: "Proposta de pacote enviada",
  PACKAGE_ACCEPTED: "Proposta de pacote aceita pelo paciente",
  PACKAGE_REJECTED: "Proposta de pacote recusada pelo paciente",
  "Package proposed": "Proposta de pacote enviada",
  "Package accepted": "Pacote de consultas aceito",
  "Package rejected": "Pacote de consultas recusado",

  // Integrações, Páginas e Sistema
  BACKUP_GENERATED: "Backup do sistema gerado com sucesso",
  BACKUP_IMPORTED: "Arquivo de backup importado",
  BACKUP_DELETED: "Backup excluído do histórico",
  BACKUP_RESTORED: "Backup restaurado no sistema",
  BACKUP_RESTORE_FAILED: "Falha na restauração de backup",
  GOOGLE_MEET_CONNECTED: "Conta do Google Meet conectada",
  GOOGLE_MEET_DISCONNECTED: "Conta do Google Meet desconectada",
  TEST_EMAIL_DISPATCHED: "E-mail de teste disparado",
  TEST_WHATSAPP_DISPATCHED: "Mensagem de teste do WhatsApp disparada",
  MESSAGE_MANUALLY_RESENT: "Mensagem reenviada manualmente",
  EMAIL_CHANGE_REQUESTED: "Solicitação de troca de e-mail iniciada",
  EMAIL_CHANGE_REJECTED_NO_SMTP: "Troca de e-mail rejeitada por falta de servidor SMTP",
  EMAIL_CHANGED_VERIFIED: "Novo e-mail verificado e confirmado",
  PUBLISH_INFORMATION_PAGE: "Página informativa publicada",
  UNPUBLISH_INFORMATION_PAGE: "Página informativa despublicada",
  RESTORE_DEFAULT_INFORMATION_PAGE: "Página informativa restaurada ao padrão",
  UPDATE_INFORMATION_PAGE: "Página informativa atualizada",
  UPDATE_GENERAL_SERVICE_SETTINGS: "Configurações gerais de atendimento atualizadas",
  SERVICE_CREATED: "Novo serviço cadastrado",
  SERVICE_UPDATED: "Serviço atualizado",
  SERVICE_DELETED: "Serviço desativado",
  "Service created": "Novo serviço cadastrado",
  "Service updated": "Serviço atualizado",
  "Service deleted": "Serviço desativado",
  "Backup created": "Backup do sistema gerado",
  "Backup generated": "Backup do sistema gerado com sucesso",
  "Google Meet connected": "Conta do Google Meet conectada",
  "Google Meet disconnected": "Conta do Google Meet desconectada",
  "Message manually resent": "Mensagem reenviada manualmente",
};

const ACTIVITY_FALLBACK_LABEL = "Atividade registrada no sistema";

function normalizeActivityActionKey(value: string): string {
  return value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[\s.-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
}

const NORMALIZED_ACTIVITY_ACTION_MAP: Record<string, string> = Object.entries(ACTIVITY_ACTION_MAP).reduce(
  (acc, [key, label]) => {
    const normalized = normalizeActivityActionKey(key);
    if (normalized && !Object.prototype.hasOwnProperty.call(acc, normalized)) {
      acc[normalized] = label;
    }
    return acc;
  },
  {} as Record<string, string>
);

/**
 * Traduz a ação ou evento de atividade recente para o Português do Brasil.
 * Mantém compatibilidade com registros legados e históricos em inglês.
 * Eventos desconhecidos recebem fallback seguro em pt-BR sem expor códigos técnicos crus.
 */
export function formatActivityAction(action?: string | null): string {
  if (!action) return ACTIVITY_FALLBACK_LABEL;

  const trimmed = action.trim();
  if (!trimmed) return ACTIVITY_FALLBACK_LABEL;

  // 1. Busca correspondência exata no mapa oficial
  if (Object.prototype.hasOwnProperty.call(ACTIVITY_ACTION_MAP, trimmed)) {
    return ACTIVITY_ACTION_MAP[trimmed];
  }

  // 2. Busca normalizada (insensível a maiúsculas/minúsculas, espaços, pontos ou camelCase)
  const normalized = normalizeActivityActionKey(trimmed);
  if (normalized && Object.prototype.hasOwnProperty.call(NORMALIZED_ACTIVITY_ACTION_MAP, normalized)) {
    return NORMALIZED_ACTIVITY_ACTION_MAP[normalized];
  }

  // 3. Verifica prefixos dinâmicos conhecidos
  if (normalized.startsWith("APPOINTMENT_STATUS_CHANGED_TO_")) {
    const targetStatus = normalized.slice("APPOINTMENT_STATUS_CHANGED_TO_".length);
    if (Object.prototype.hasOwnProperty.call(APPOINTMENT_STATUS_MAP, targetStatus)) {
      return `Status da consulta alterado para ${APPOINTMENT_STATUS_MAP[targetStatus].toLowerCase()}`;
    }
    return "Status da consulta atualizado";
  }

  if (normalized.startsWith("PROFILE_CHANGE_")) {
    const decision = normalized.slice("PROFILE_CHANGE_".length);
    if (decision === "APPROVED") return "Alteração cadastral aprovada";
    if (decision === "REJECTED") return "Alteração cadastral recusada";
    if (decision === "REQUESTED") return "Solicitação de alteração cadastral recebida";
    return "Solicitação de alteração cadastral atualizada";
  }

  // 4. Fallback seguro localizado em pt-BR para eventos desconhecidos
  return ACTIVITY_FALLBACK_LABEL;
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
  NO_SHOW: "Não Compareceu",
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
  COMPLETED: "Concluído",
  SUCCESS: "Concluído",
  PENDING: "Em andamento",
  PROCESSING: "Processando",
  RESTORING: "Restaurando",
  FAILED: "Falhou",
};

export function formatBackupStatus(status?: string | null): string {
  if (!status) return "Indefinido";
  return BACKUP_STATUS_MAP[status] || status;
}
