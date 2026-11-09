/**
 * Utilitários puros de formatação do perfil autenticado no cabeçalho do MiniSite (Modelo 01).
 */

export const DEFAULT_PROFILE_FALLBACK_NAME = "Usuário";

/**
 * Extrai apenas o primeiro nome do usuário autenticado a partir do nome salvo.
 * Aplica fallback localizado seguro quando o nome estiver vazio ou ausente.
 * Exemplos:
 *  - "Rômulo Mafra" -> "Rômulo"
 *  - "Carlos Eduardo Silva" -> "Carlos"
 *  - "Ana Carolina" -> "Ana"
 */
export function extractFirstName(fullName?: string | null): string {
  if (typeof fullName !== "string") {
    return DEFAULT_PROFILE_FALLBACK_NAME;
  }

  const normalized = fullName.trim();
  if (!normalized) {
    return DEFAULT_PROFILE_FALLBACK_NAME;
  }

  const parts = normalized.split(/\s+/).filter(Boolean);
  return parts[0] || DEFAULT_PROFILE_FALLBACK_NAME;
}

/**
 * Deriva iniciais curtas (1 ou 2 letras em caixa alta) para o avatar circular do perfil.
 * Utiliza a inicial do primeiro nome e a inicial do último sobrenome quando disponível.
 * Exemplos:
 *  - "Rômulo Mafra" -> "RM"
 *  - "Ana Carolina" -> "AC"
 *  - "Rômulo" -> "R"
 *  - "" / null -> "U"
 */
export function getUserInitials(fullName?: string | null): string {
  if (typeof fullName !== "string") {
    return (Array.from(DEFAULT_PROFILE_FALLBACK_NAME)[0] || "U").toUpperCase();
  }

  const normalized = fullName.trim();
  if (!normalized) {
    return (Array.from(DEFAULT_PROFILE_FALLBACK_NAME)[0] || "U").toUpperCase();
  }

  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return (Array.from(DEFAULT_PROFILE_FALLBACK_NAME)[0] || "U").toUpperCase();
  }

  const firstChar = Array.from(parts[0])[0] || "";
  if (parts.length === 1) {
    return firstChar.toUpperCase();
  }

  const lastChar = Array.from(parts[parts.length - 1])[0] || "";
  return `${firstChar}${lastChar}`.toUpperCase();
}
