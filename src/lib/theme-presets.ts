export interface ThemePalette {
  key: string;
  label: string;
  swatch: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  buttonColor: string;
  backgroundColor: string;
  textColor: string;
}

export const THEME_PRESETS: Record<string, ThemePalette> = {
  AMARELO: {
    key: "AMARELO",
    label: "Amarelo",
    swatch: "#EAB308",
    primaryColor: "#CA8A04",
    secondaryColor: "#FEF08A",
    accentColor: "#FDE047",
    buttonColor: "#CA8A04",
    backgroundColor: "#FEFCE8",
    textColor: "#713F12",
  },
  LARANJA: {
    key: "LARANJA",
    label: "Laranja",
    swatch: "#F97316",
    primaryColor: "#EA580C",
    secondaryColor: "#FFEDD5",
    accentColor: "#FDBA74",
    buttonColor: "#EA580C",
    backgroundColor: "#FFF7ED",
    textColor: "#7C2D12",
  },
  VERMELHO: {
    key: "VERMELHO",
    label: "Vermelho",
    swatch: "#EF4444",
    primaryColor: "#DC2626",
    secondaryColor: "#FEE2E2",
    accentColor: "#FCA5A5",
    buttonColor: "#DC2626",
    backgroundColor: "#FEF2F2",
    textColor: "#7F1D1D",
  },
  ROSA: {
    key: "ROSA",
    label: "Rosa",
    swatch: "#EC4899",
    primaryColor: "#DB2777",
    secondaryColor: "#FCE7F3",
    accentColor: "#F9A8D4",
    buttonColor: "#DB2777",
    backgroundColor: "#FDF2F8",
    textColor: "#831843",
  },
  VERDE: {
    key: "VERDE",
    label: "Verde",
    swatch: "#22C55E",
    primaryColor: "#16A34A",
    secondaryColor: "#DCFCE7",
    accentColor: "#86EFAC",
    buttonColor: "#16A34A",
    backgroundColor: "#F0FDF4",
    textColor: "#14532D",
  },
  AZUL: {
    key: "AZUL",
    label: "Azul",
    swatch: "#3B82F6",
    primaryColor: "#2563EB",
    secondaryColor: "#DBEAFE",
    accentColor: "#93C5FD",
    buttonColor: "#2563EB",
    backgroundColor: "#EFF6FF",
    textColor: "#1E3A8A",
  },
  ROXO: {
    key: "ROXO",
    label: "Roxo",
    swatch: "#8B5CF6",
    primaryColor: "#7C3AED",
    secondaryColor: "#EDE9FE",
    accentColor: "#C4B5FD",
    buttonColor: "#7C3AED",
    backgroundColor: "#FAF5FF",
    textColor: "#4C1D95",
  },
  CINZA: {
    key: "CINZA",
    label: "Cinza",
    swatch: "#737373",
    primaryColor: "#525252",
    secondaryColor: "#F5F5F5",
    accentColor: "#D4D4D4",
    buttonColor: "#404040",
    backgroundColor: "#F8F8F8",
    textColor: "#171717",
  },
};

/**
 * Converte HEX para luminância relativa WCAG
 */
function getLuminance(hex: string): number {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return 0.5;

  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;

  const a = [r, g, b].map((v) => {
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });

  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

/**
 * Calcula a razão de contraste entre duas cores hexadecimais (ex: 4.5:1)
 */
export function calculateContrastRatio(hex1: string, hex2: string): number {
  try {
    const lum1 = getLuminance(hex1);
    const lum2 = getLuminance(hex2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return Number(((brightest + 0.05) / (darkest + 0.05)).toFixed(2));
  } catch {
    return 4.5;
  }
}

/**
 * Avalia se o contraste atinge WCAG AA (mínimo 4.5 para texto normal, 3.0 para texto grande)
 */
export function isContrastAccessible(textColor: string, bgColor: string): boolean {
  return calculateContrastRatio(textColor, bgColor) >= 4.5;
}

/**
 * Normaliza um valor hexadecimal de 6 dígitos (ex: #abc -> #aabbcc).
 */
export function normalizeHexColor(hex: string, fallback = "#16A34A"): string {
  const clean = (hex || "").trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(clean)) {
    const expanded = clean
      .split("")
      .map((c) => `${c}${c}`)
      .join("");
    return `#${expanded.toUpperCase()}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(clean)) {
    return `#${clean.toUpperCase()}`;
  }
  return fallback;
}

/**
 * Garante um fundo suficientemente contrastante para texto/ícones BRANCOS (#ffffff)
 * em botões no Light Mode (WCAG AA >= minRatio), preservando o matiz do tema escolhido.
 */
export function resolveAccessibleButtonBg(hexColor: string, minRatio: number = 4.6): string {
  const normalized = normalizeHexColor(hexColor, "#16A34A");
  if (calculateContrastRatio("#ffffff", normalized) >= minRatio) {
    return normalized;
  }

  const r0 = parseInt(normalized.slice(1, 3), 16);
  const g0 = parseInt(normalized.slice(3, 5), 16);
  const b0 = parseInt(normalized.slice(5, 7), 16);

  // Busca binária do maior fator de luminância linear que atinge o contraste mínimo contra #ffffff
  let low = 0;
  let high = 1;
  let bestHex = "#404040";

  for (let i = 0; i < 24; i++) {
    const mid = (low + high) / 2;
    const r = Math.max(0, Math.min(255, Math.round(r0 * mid)));
    const g = Math.max(0, Math.min(255, Math.round(g0 * mid)));
    const b = Math.max(0, Math.min(255, Math.round(b0 * mid)));
    const candidate = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`.toUpperCase();

    if (calculateContrastRatio("#ffffff", candidate) >= minRatio) {
      bestHex = candidate;
      low = mid;
    } else {
      high = mid;
    }
  }

  return bestHex;
}
