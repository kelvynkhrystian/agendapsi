/**
 * Sanitiza HTML customizado para garantir que não contenha scripts executáveis,
 * manipuladores de eventos embutidos, iframes ou elementos invasivos.
 * Aplica abordagem de desinfecção rigorosa em camadas.
 */
export function sanitizeCustomHtml(dirtyHtml?: string | null): string {
  if (!dirtyHtml || typeof dirtyHtml !== "string") return "";

  let clean = dirtyHtml;

  // 1. Remove blocos inteiros com seu conteúdo interno
  clean = clean.replace(/<(script|style|svg|object|embed|iframe|canvas|audio|video|applet)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi, "");
  clean = clean.replace(/<\/?(script|style|svg|object|embed|iframe|canvas|audio|video|applet|meta|link|base|form|input|button|textarea|select|option)\b[^>]*>/gi, "");

  // 2. Loop para desmantelar tags maliciosas aninhadas (ex: <scr<script>ipt>)
  let previous: string;
  do {
    previous = clean;
    clean = clean.replace(/<\/?(script|style|svg|object|embed|iframe)\b[^>]*>/gi, "");
  } while (clean !== previous);

  // 3. Remove manipuladores de eventos on* (precedidos por espaço, barra '/', tab ou início de atributo)
  clean = clean.replace(/[\s/]+on[a-zA-Z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, "");
  clean = clean.replace(/[\s/]+on[a-zA-Z]+[\s=>]/gi, "");

  // 4. Remove protocolos perigosos em qualquer atributo (href, src, formaction, action)
  clean = clean.replace(/\b(href|src|action)\s*=\s*(['"])\s*(?:javascript|vbscript|data):[^'"]*\2/gi, '$1="#"');
  clean = clean.replace(/\b(href|src|action)\s*=\s*(?:javascript|vbscript|data):[^\s>]+/gi, '$1="#"');

  return clean;
}
