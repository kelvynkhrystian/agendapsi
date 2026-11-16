/**
 * Gerenciador de limitação de taxa (Rate Limiting) em memória com janela deslizante.
 * Protege endpoints públicos contra força bruta, flooding e slot-hoarding DoS.
 */

export interface RateLimitOptions {
  windowMs: number; // Janela de tempo em milissegundos
  max: number;      // Número máximo de requisições permitidas na janela
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

const stores = new Map<string, Map<string, number[]>>();

export function checkRateLimit(
  namespace: string,
  identifier: string,
  options: RateLimitOptions
): RateLimitResult {
  const now = Date.now();
  if (!stores.has(namespace)) {
    stores.set(namespace, new Map());
  }
  const store = stores.get(namespace)!;
  const timestamps = store.get(identifier) || [];
  const cutoff = now - options.windowMs;
  const validTimestamps = timestamps.filter((t) => t > cutoff);

  if (validTimestamps.length >= options.max) {
    store.set(identifier, validTimestamps);
    const earliest = validTimestamps[0] || now;
    const retryAfterSeconds = Math.max(1, Math.ceil((earliest + options.windowMs - now) / 1000));
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  validTimestamps.push(now);
  store.set(identifier, validTimestamps);

  // Limpeza de entradas antigas se o mapa atingir tamanho representativo
  if (store.size > 2000) {
    for (const [key, list] of store.entries()) {
      const active = list.filter((t) => t > cutoff);
      if (active.length === 0) store.delete(key);
      else store.set(key, active);
    }
  }

  return {
    allowed: true,
    remaining: options.max - validTimestamps.length,
    retryAfterSeconds: 0,
  };
}
