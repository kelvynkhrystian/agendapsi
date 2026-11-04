/**
 * Sanitiza HTML customizado para garantir que não contenha scripts executáveis,
 * manipuladores de eventos embutidos ou formulários invasivos.
 */
export function sanitizeCustomHtml(dirtyHtml?: string | null): string {
  if (!dirtyHtml) return "";

  let clean = dirtyHtml;

  // Remove scripts
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

  // Remove tags perigosas: iframe, object, embed, form, meta, link, base
  clean = clean.replace(/<\/?(iframe|object|embed|form|meta|link|base|applet)\b[^>]*>/gi, "");

  // Remove manipuladores de eventos on*: onclick, onload, onerror, onmouseover, etc.
  clean = clean.replace(/\son\w+\s*=\s*(['"]).*?\1/gi, "");
  clean = clean.replace(/\son\w+\s*=[^\s>]+/gi, "");

  // Remove javascript: e data: URLs
  clean = clean.replace(/href\s*=\s*(['"])\s*javascript:[^'"]*\1/gi, 'href="#"');
  clean = clean.replace(/src\s*=\s*(['"])\s*javascript:[^'"]*\1/gi, 'src=""');

  return clean;
}
