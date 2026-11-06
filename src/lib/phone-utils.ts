/**
 * Utilitários de normalização e formatação de telefones e WhatsApp para o PSI.
 */

/**
 * Normaliza um número de telefone/WhatsApp para o formato internacional numérico (apenas dígitos).
 * Para números brasileiros com 10 ou 11 dígitos (DDD + número), garante a adição do DDI 55.
 */
export function normalizeWhatsAppNumber(raw?: string | null): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";

  // Se tiver 10 dígitos (fixo com DDD) ou 11 dígitos (celular com DDD), prefixa DDI 55
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  return digits;
}

/**
 * Formata um número para exibição amigável ao usuário.
 */
export function formatPhoneDisplay(raw?: string | null): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";

  // Formato brasileiro com DDI 55: 5511999999999 (13 dígitos) ou 551133333333 (12 dígitos)
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    const ddd = digits.slice(2, 4);
    const rest = digits.slice(4);
    if (rest.length === 9) {
      return `+55 (${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
    }
    return `+55 (${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  }

  // Celular nacional: 11999999999 (11 dígitos)
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  // Fixo nacional: 1133333333 (10 dígitos)
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return raw;
}

/**
 * Constrói o link oficial wa.me para abertura direta do WhatsApp.
 */
export function buildWhatsAppLink(normalizedPhone: string, message?: string | null): string | null {
  const normalized = normalizeWhatsAppNumber(normalizedPhone);
  if (!normalized || normalized.length < 10) return null;

  if (message && message.trim().length > 0) {
    return `https://wa.me/${normalized}?text=${encodeURIComponent(message.trim())}`;
  }

  return `https://wa.me/${normalized}`;
}
