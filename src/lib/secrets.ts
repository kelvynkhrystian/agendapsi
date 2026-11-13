import crypto from "crypto";

const ENC_PREFIX = "enc:v1:";
const DEV_FALLBACK_KEY_MATERIAL = "psi-local-dev-encryption-fallback-only";
let warnedMissingKey = false;

function getEncryptionKey(customKeyMaterial?: string): Buffer {
  const material =
    customKeyMaterial ||
    process.env.PSI_ENCRYPTION_KEY?.trim() ||
    process.env.JWT_SECRET?.trim() ||
    "";

  if (!material) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("PSI_ENCRYPTION_KEY ou JWT_SECRET ausente em produção.");
    }
    if (!warnedMissingKey) {
      warnedMissingKey = true;
      console.warn(
        "[PSI][secrets] Aviso: PSI_ENCRYPTION_KEY e JWT_SECRET não definidos; usando chave de desenvolvimento local."
      );
    }
    return crypto.createHash("sha256").update(DEV_FALLBACK_KEY_MATERIAL).digest();
  }

  return crypto.createHash("sha256").update(material).digest();
}

export function isEncryptedSecret(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(ENC_PREFIX);
}

/**
 * Criptografa um segredo com AES-256-GCM. Idempotente para valores já criptografados (`enc:v1:...`).
 */
export function encryptSecret(
  plainText: string | null | undefined,
  customKeyMaterial?: string
): string | null {
  if (typeof plainText !== "string") return null;
  const trimmed = plainText.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith(ENC_PREFIX)) return trimmed;

  const key = getEncryptionKey(customKeyMaterial);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(trimmed, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${ENC_PREFIX}${iv.toString("base64url")}:${authTag.toString("base64url")}:${encrypted.toString("base64url")}`;
}

/**
 * Descriptografa um segredo criptografado com AES-256-GCM.
 * Mantém compatibilidade reversa com registros legados ainda armazenados em texto puro antes da migração.
 */
export function decryptSecret(
  storedValue: string | null | undefined,
  customKeyMaterial?: string
): string | null {
  if (typeof storedValue !== "string") return null;
  const trimmed = storedValue.trim();
  if (!trimmed) return null;

  if (!trimmed.startsWith(ENC_PREFIX)) {
    return trimmed;
  }

  const rest = trimmed.slice(ENC_PREFIX.length);
  const parts = rest.split(":");
  if (parts.length !== 3) return null;

  try {
    const key = getEncryptionKey(customKeyMaterial);
    const iv = Buffer.from(parts[0], "base64url");
    const authTag = Buffer.from(parts[1], "base64url");
    const ciphertext = Buffer.from(parts[2], "base64url");
    if (iv.length !== 12 || authTag.length !== 16) return null;

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString("utf8");
  } catch {
    return null;
  }
}

/**
 * Retorna indicação mascarada segura sem nunca vazar o segredo completo para o frontend.
 */
export function maskSecret(storedOrPlain: string | null | undefined): string {
  const plain = decryptSecret(storedOrPlain);
  if (!plain) return "";
  if (plain.length >= 12) {
    return `••••••••${plain.slice(-4)}`;
  }
  return "••••••••";
}

export function hasStoredSecret(storedOrPlain: string | null | undefined): boolean {
  const plain = decryptSecret(storedOrPlain);
  return Boolean(plain && plain.length > 0);
}

/**
 * Remove segredos, credenciais de URL, tokens e cabeçalhos sensíveis de mensagens de erro.
 */
export function sanitizeErrorMessage(
  err: unknown,
  extraSecrets: Array<string | null | undefined> = []
): string {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === "string"
      ? err
      : "Erro inesperado de comunicação com o provedor.";

  let clean = raw || "Erro inesperado de comunicação com o provedor.";

  // Remove quaisquer segredos explícitos (puro, descriptografado e URL-encoded)
  for (const candidate of extraSecrets) {
    if (!candidate) continue;
    const expanded = [candidate, decryptSecret(candidate)].filter(
      (v): v is string => typeof v === "string" && v.trim().length >= 4
    );
    for (const secret of expanded) {
      clean = clean.split(secret).join("[SEGREDO_OCULTADO]");
      const encoded = encodeURIComponent(secret);
      if (encoded !== secret && encoded.length >= 4) {
        clean = clean.split(encoded).join("[SEGREDO_OCULTADO]");
      }
    }
  }

  clean = clean
    .replace(/enc:v1:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+/g, "[SEGREDO_OCULTADO]")
    .replace(/(https?:\/\/)([^:@/\s]+):([^@/\s]+)@/gi, "$1[USUARIO]:[SENHA]@")
    .replace(/\b(Bearer|Basic)\s+[A-Za-z0-9\-._~+/]+=*/gi, "$1 [TOKEN_OCULTADO]")
    .replace(/\b(x-api-key|authorization|api[-_]?key|access[-_]?token|app[-_]?secret|smtp[-_]?pass|password|senha)\s*[:=]\s*[^\s,;]+/gi, "$1=[OCULTADO]")
    .replace(/\bEAA[A-Za-z0-9]{12,}\b/g, "[TOKEN_META_OCULTADO]");

  clean = clean.replace(/\s+/g, " ").trim();
  if (clean.length > 320) {
    clean = `${clean.slice(0, 317)}...`;
  }
  return clean || "Erro de comunicação com o provedor.";
}

function isIpv4InCidrBlock(hostname: string): "METADATA" | "ZERO" | "LOOPBACK" | "PRIVATE" | "PUBLIC" | null {
  const m = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return null;
  const octets = m.slice(1).map(Number);
  if (octets.some((n) => n < 0 || n > 255)) return "ZERO";
  const [a, b] = octets;
  if (a === 0) return "ZERO";
  if (a === 169 && b === 254) return "METADATA";
  if (a === 100 && b >= 64 && b <= 127) return "METADATA"; // CGNAT / Alibaba Cloud metadata
  if (a === 127) return "LOOPBACK";
  if (a === 10) return "PRIVATE";
  if (a === 172 && b >= 16 && b <= 31) return "PRIVATE";
  if (a === 192 && b === 168) return "PRIVATE";
  return "PUBLIC";
}

export interface ValidateProviderUrlOptions {
  allowHttpLocalhost?: boolean;
  allowPrivateNetwork?: boolean;
}

export function validateProviderBaseUrl(
  rawUrl: string,
  options: ValidateProviderUrlOptions = {}
): { valid: true; normalized: string } | { valid: false; error: string } {
  const { allowHttpLocalhost = true, allowPrivateNetwork = false } = options;
  const trimmed = (rawUrl || "").trim();
  if (!trimmed) {
    return { valid: false, error: "URL do provedor é obrigatória." };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: "URL inválida. Informe um endereço HTTP(S) válido." };
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return {
      valid: false,
      error: "Protocolo não permitido. Utilize apenas endereços HTTPS (ou HTTP local autorizado).",
    };
  }

  if (parsed.username || parsed.password) {
    return {
      valid: false,
      error: "A URL do provedor não pode conter usuário ou senha embutidos.",
    };
  }

  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host) {
    return { valid: false, error: "Host inválido na URL do provedor." };
  }

  // Bloqueio permanente de endpoints de metadados em nuvem e curingas inválidos
  if (
    host === "0.0.0.0" ||
    host === "::" ||
    host === "metadata.google.internal" ||
    host === "metadata.goog" ||
    host.endsWith(".internal") ||
    host.startsWith("fe80:") ||
    host.startsWith("fd00:ec2:")
  ) {
    return {
      valid: false,
      error: "Endereço de rede interno ou de metadados em nuvem bloqueado por segurança.",
    };
  }

  const ipClass = isIpv4InCidrBlock(host);
  if (ipClass === "METADATA" || ipClass === "ZERO") {
    return {
      valid: false,
      error: "Endereço IP de metadados em nuvem ou link-local bloqueado por segurança.",
    };
  }

  const isLocalhostHost = host === "localhost" || host === "127.0.0.1" || host === "::1" || ipClass === "LOOPBACK";
  const isPrivateHost = ipClass === "PRIVATE" || host.startsWith("fc") || host.startsWith("fd");

  if (isPrivateHost && !allowPrivateNetwork) {
    return {
      valid: false,
      error: "Endereços IP privados internos não são permitidos sem configuração explícita de rede local.",
    };
  }

  if (parsed.protocol === "http:") {
    if (isLocalhostHost) {
      if (!allowHttpLocalhost) {
        return { valid: false, error: "Conexões HTTP locais não são permitidas neste modo." };
      }
    } else if (!isPrivateHost) {
      return {
        valid: false,
        error: "Endereços externos devem utilizar HTTPS para proteger tokens e mensagens em trânsito.",
      };
    }
  }

  if (isLocalhostHost && !allowHttpLocalhost) {
    return { valid: false, error: "Endereços loopback não são permitidos." };
  }

  // Remove barra final excessiva mantendo eventual path base (/api/v1)
  const cleanPathname = parsed.pathname.replace(/\/+$/, "");
  const normalized = `${parsed.protocol}//${parsed.host}${cleanPathname}`;
  return { valid: true, normalized };
}
