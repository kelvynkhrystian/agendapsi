/**
 * PSI — Sistema de Gestão de Consultórios
 * Helpers para MiniSite: Localização, Google Maps e WhatsApp (Fase 4/5)
 */

export interface LocationData {
  clinicName?: string | null;
  address?: string | null;
  addressNumber?: string | null;
  addressComplement?: string | null;
  addressNeighborhood?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressPostalCode?: string | null;
  googleMapsUrl?: string | null;
  googleMapsEmbedUrl?: string | null;
  showLocation?: boolean;
}

/**
 * Formata o endereço completo do consultório de forma elegante e padronizada.
 */
export function formatFullAddress(loc?: LocationData | null): string {
  if (!loc || !loc.address) return "";

  let full = loc.address.trim();

  if (loc.addressNumber) {
    full += `, ${loc.addressNumber.trim()}`;
  }

  if (loc.addressComplement) {
    full += ` - ${loc.addressComplement.trim()}`;
  }

  if (loc.addressNeighborhood) {
    full += `, ${loc.addressNeighborhood.trim()}`;
  }

  if (loc.addressCity) {
    full += ` — ${loc.addressCity.trim()}`;
    if (loc.addressState) {
      full += `/${loc.addressState.trim().toUpperCase()}`;
    }
  }

  if (loc.addressPostalCode) {
    full += `, CEP ${loc.addressPostalCode.trim()}`;
  }

  return full;
}

/**
 * Retorna o link de destino seguro para a ação "Como Chegar" no Google Maps.
 */
export function getGoogleMapsDestinationUrl(loc?: LocationData | null): string | null {
  if (!loc) return null;

  if (loc.googleMapsUrl && loc.googleMapsUrl.trim().startsWith("http")) {
    return loc.googleMapsUrl.trim();
  }

  const full = formatFullAddress(loc);
  if (!full) return null;

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(full)}`;
}

/**
 * Gera ou valida a URL de incorporação segura (iframe embed) do Google Maps,
 * sem expor credenciais privadas de API.
 */
export function getGoogleMapsEmbedSrc(loc?: LocationData | null): string | null {
  if (!loc) return null;

  if (loc.googleMapsEmbedUrl && loc.googleMapsEmbedUrl.trim().startsWith("http")) {
    // Se o usuário colou a tag completa <iframe src="...">, extrai apenas o src
    const raw = loc.googleMapsEmbedUrl.trim();
    const match = raw.match(/src=["'](.*?)["']/);
    return match ? match[1] : raw;
  }

  const full = formatFullAddress(loc);
  if (!full) return null;

  return `https://maps.google.com/maps?q=${encodeURIComponent(full)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
}

/**
 * Gera a URL segura para iniciar conversa no WhatsApp sem expor dados clínicos.
 */
export function buildWhatsAppChatUrl(
  rawPhone?: string | null,
  customMessage?: string | null,
  professionalName?: string | null
): string | null {
  if (!rawPhone) return null;

  const digits = rawPhone.replace(/\D/g, "");
  if (!digits || digits.length < 10) return null;

  // Garante DDI 55 do Brasil se o número tiver 10 ou 11 dígitos
  const formattedNumber = digits.length <= 11 ? `55${digits}` : digits;

  const defaultMsg =
    customMessage && customMessage.trim().length > 0
      ? customMessage.trim()
      : `Olá${professionalName ? `, ${professionalName}` : ""}! Conheci seu trabalho pelo site e gostaria de saber mais sobre os atendimentos e como agendar uma consulta.`;

  return `https://wa.me/${formattedNumber}?text=${encodeURIComponent(defaultMsg)}`;
}
