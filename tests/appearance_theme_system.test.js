const test = require("node:test");
const assert = require("node:assert");

// Simulação de Presets e Helpers de Aparência para os testes
const THEME_PRESETS = {
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
    swatch: "#64748B",
    primaryColor: "#475569",
    secondaryColor: "#F1F5F9",
    accentColor: "#CBD5E1",
    buttonColor: "#334155",
    backgroundColor: "#F8FAFC",
    textColor: "#0F172A",
  },
};

function parseHex(hex) {
  let clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    clean = clean.split("").map((c) => c + c).join("");
  }
  if (clean.length !== 6) return null;
  const num = parseInt(clean, 16);
  if (isNaN(num)) return null;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function getLuminance(r, g, b) {
  const [sR, sG, sB] = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * sR + 0.7152 * sG + 0.0722 * sB;
}

function calculateContrastRatio(foregroundHex, backgroundHex) {
  const fg = parseHex(foregroundHex);
  const bg = parseHex(backgroundHex);
  if (!fg || !bg) return 1.0;
  const lum1 = getLuminance(fg.r, fg.g, fg.b);
  const lum2 = getLuminance(bg.r, bg.g, bg.b);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return Number(((brightest + 0.05) / (darkest + 0.05)).toFixed(2));
}

function isContrastAccessible(foregroundHex, backgroundHex) {
  return calculateContrastRatio(foregroundHex, backgroundHex) >= 4.5;
}

function isDarkModeAllowedOnRoute(pathname) {
  if (!pathname) return false;
  return pathname.startsWith("/admin") || pathname.startsWith("/paciente");
}

class AppearanceManager {
  constructor(initialSettings = {}) {
    this.themeName = initialSettings.themeName || "VERDE";
    this.primaryColor = initialSettings.primaryColor || "#16A34A";
    this.secondaryColor = initialSettings.secondaryColor || "#DCFCE7";
    this.accentColor = initialSettings.accentColor || "#86EFAC";
    this.buttonColor = initialSettings.buttonColor || "#16A34A";
    this.backgroundColor = initialSettings.backgroundColor || "#F0FDF4";
    this.textColor = initialSettings.textColor || "#14532D";
    this.logoUrl = initialSettings.logoUrl || null;
    this.logoHorizontalUrl = initialSettings.logoHorizontalUrl || null;
    this.faviconUrl = initialSettings.faviconUrl || null;
  }

  applyPreset(presetKey) {
    if (presetKey === "PERSONALIZADO") {
      this.themeName = "PERSONALIZADO";
      return;
    }
    const preset = THEME_PRESETS[presetKey];
    if (!preset) {
      throw new Error(`Tema pré-definido desconhecido: ${presetKey}`);
    }
    this.themeName = preset.key;
    this.primaryColor = preset.primaryColor;
    this.secondaryColor = preset.secondaryColor;
    this.accentColor = preset.accentColor;
    this.buttonColor = preset.buttonColor;
    this.backgroundColor = preset.backgroundColor;
    this.textColor = preset.textColor;
  }

  updateCustomColor(field, hexValue) {
    if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hexValue)) {
      throw new Error("Formato de cor hexadecimal inválido.");
    }
    this.themeName = "PERSONALIZADO";
    this[field] = hexValue;
  }

  saveAppearance(userRole, payload) {
    if (userRole !== "ADMIN") {
      throw new Error("Acesso restrito ao administrador.");
    }

    if (payload.themeName && payload.themeName !== "PERSONALIZADO" && !THEME_PRESETS[payload.themeName]) {
      throw new Error("Tema pré-definido inválido.");
    }

    const hexRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
    const colorFields = ["primaryColor", "secondaryColor", "accentColor", "buttonColor", "backgroundColor", "textColor"];
    for (const f of colorFields) {
      if (payload[f] && !hexRegex.test(payload[f])) {
        throw new Error(`Valor de cor inválido no campo ${f}`);
      }
    }

    if (payload.themeName) this.themeName = payload.themeName;
    if (payload.primaryColor) this.primaryColor = payload.primaryColor;
    if (payload.secondaryColor) this.secondaryColor = payload.secondaryColor;
    if (payload.accentColor) this.accentColor = payload.accentColor;
    if (payload.buttonColor) this.buttonColor = payload.buttonColor;
    if (payload.backgroundColor) this.backgroundColor = payload.backgroundColor;
    if (payload.textColor) this.textColor = payload.textColor;
    if (payload.logoUrl !== undefined) this.logoUrl = payload.logoUrl;
    if (payload.logoHorizontalUrl !== undefined) this.logoHorizontalUrl = payload.logoHorizontalUrl;
    if (payload.faviconUrl !== undefined) this.faviconUrl = payload.faviconUrl;

    return {
      success: true,
      data: {
        themeName: this.themeName,
        primaryColor: this.primaryColor,
        secondaryColor: this.secondaryColor,
        accentColor: this.accentColor,
        buttonColor: this.buttonColor,
        backgroundColor: this.backgroundColor,
        textColor: this.textColor,
        logoUrl: this.logoUrl,
        logoHorizontalUrl: this.logoHorizontalUrl,
        faviconUrl: this.faviconUrl,
      },
    };
  }

  validateUpload(fileSize, mimeType) {
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (fileSize > MAX_SIZE) {
      return { valid: false, error: "O arquivo excede o limite máximo permitido de 5 MB." };
    }
    const allowedMimes = ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/x-icon", "image/vnd.microsoft.icon"];
    if (!allowedMimes.includes(mimeType)) {
      return { valid: false, error: "Formato de arquivo inválido para identidade visual." };
    }
    return { valid: true };
  }
}

// =================== TESTES ===================

test("1. Deve conter os 8 temas pré-definidos com todos os tokens obrigatórios", () => {
  const expectedThemes = ["AMARELO", "LARANJA", "VERMELHO", "ROSA", "VERDE", "AZUL", "ROXO", "CINZA"];
  for (const key of expectedThemes) {
    const preset = THEME_PRESETS[key];
    assert.ok(preset, `Tema ${key} deve estar definido`);
    assert.ok(preset.swatch.startsWith("#"), `${key} swatch deve ser hex`);
    assert.ok(preset.primaryColor.startsWith("#"), `${key} primaryColor deve ser hex`);
    assert.ok(preset.secondaryColor.startsWith("#"), `${key} secondaryColor deve ser hex`);
    assert.ok(preset.accentColor.startsWith("#"), `${key} accentColor deve ser hex`);
    assert.ok(preset.buttonColor.startsWith("#"), `${key} buttonColor deve ser hex`);
    assert.ok(preset.backgroundColor.startsWith("#"), `${key} backgroundColor deve ser hex`);
    assert.ok(preset.textColor.startsWith("#"), `${key} textColor deve ser hex`);
  }
});

test("2. Deve calcular a razão de contraste WCAG AA e validar conformidade", () => {
  // Alto contraste: preto (#000000) no branco (#ffffff)
  const ratioMax = calculateContrastRatio("#000000", "#ffffff");
  assert.ok(ratioMax >= 20.0, `Contraste máximo deve ser próximo a 21:1, obtido: ${ratioMax}`);
  assert.strictEqual(isContrastAccessible("#000000", "#ffffff"), true);

  // Baixo contraste: amarelo claro no branco
  const ratioLow = calculateContrastRatio("#fef08a", "#ffffff");
  assert.ok(ratioLow < 4.5, `Contraste baixo deve ser < 4.5, obtido: ${ratioLow}`);
  assert.strictEqual(isContrastAccessible("#fef08a", "#ffffff"), false);

  // Paleta institucional verde do PSI (#14532D no #F0FDF4)
  const ratioVerde = calculateContrastRatio("#14532D", "#F0FDF4");
  assert.ok(ratioVerde >= 4.5, `Tema Verde deve cumprir WCAG AA (>= 4.5), obtido: ${ratioVerde}`);
  assert.strictEqual(isContrastAccessible("#14532D", "#F0FDF4"), true);
});

test("3. Isolamento estrito de modo escuro (Dark Mode Isolation)", () => {
  // Rotas públicas: NÃO devem permitir modo escuro
  assert.strictEqual(isDarkModeAllowedOnRoute("/"), false, "MiniSite público deve ser sempre claro");
  assert.strictEqual(isDarkModeAllowedOnRoute("/agendar"), false, "Agendamento público deve ser claro");
  assert.strictEqual(isDarkModeAllowedOnRoute("/login"), false, "Página de login pública deve ser clara");
  assert.strictEqual(isDarkModeAllowedOnRoute("/privacidade"), false, "Páginas institucionais devem ser claras");

  // Rotas autenticadas: DEVEM permitir modo escuro
  assert.strictEqual(isDarkModeAllowedOnRoute("/admin"), true, "Admin pode usar modo escuro");
  assert.strictEqual(isDarkModeAllowedOnRoute("/admin/configuracoes"), true, "Configurações do admin podem usar modo escuro");
  assert.strictEqual(isDarkModeAllowedOnRoute("/paciente"), true, "Portal do paciente pode usar modo escuro");
  assert.strictEqual(isDarkModeAllowedOnRoute("/paciente/perfil"), true, "Perfil do paciente pode usar modo escuro");
});

test("4. Aplicar tema pré-definido atualiza todos os tokens harmônicos", () => {
  const manager = new AppearanceManager();
  assert.strictEqual(manager.themeName, "VERDE");

  manager.applyPreset("AZUL");
  assert.strictEqual(manager.themeName, "AZUL");
  assert.strictEqual(manager.primaryColor, "#2563EB");
  assert.strictEqual(manager.backgroundColor, "#EFF6FF");
  assert.strictEqual(manager.textColor, "#1E3A8A");

  manager.applyPreset("ROSA");
  assert.strictEqual(manager.themeName, "ROSA");
  assert.strictEqual(manager.primaryColor, "#DB2777");
});

test("5. Alteração individual de cor customizada comuta o tema para PERSONALIZADO", () => {
  const manager = new AppearanceManager();
  manager.applyPreset("VERDE");
  assert.strictEqual(manager.themeName, "VERDE");

  manager.updateCustomColor("primaryColor", "#8B5CF6");
  assert.strictEqual(manager.themeName, "PERSONALIZADO");
  assert.strictEqual(manager.primaryColor, "#8B5CF6");

  // Rejeição de cores hex inválidas
  assert.throws(() => {
    manager.updateCustomColor("primaryColor", "azul-celeste");
  }, /Formato de cor hexadecimal inválido/);
});

test("6. Autorização e validação ao salvar configurações de aparência", () => {
  const manager = new AppearanceManager();

  // Paciente não pode alterar aparência institucional
  assert.throws(() => {
    manager.saveAppearance("PATIENT", { themeName: "AZUL" });
  }, /Acesso restrito ao administrador/);

  // Admin salva com sucesso
  const result = manager.saveAppearance("ADMIN", {
    themeName: "ROXO",
    primaryColor: "#7C3AED",
    buttonColor: "#7C3AED",
    logoUrl: "/uploads/branding/logo-123.png",
  });

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.data.themeName, "ROXO");
  assert.strictEqual(result.data.primaryColor, "#7C3AED");
  assert.strictEqual(result.data.logoUrl, "/uploads/branding/logo-123.png");
});

test("7. Validação de upload de assets do sistema (Favicon, Logo, Banner)", () => {
  const manager = new AppearanceManager();

  // Arquivo dentro do limite de 5MB
  const validCheck = manager.validateUpload(2 * 1024 * 1024, "image/png");
  assert.strictEqual(validCheck.valid, true);

  // Arquivo que excede 5MB
  const overSizeCheck = manager.validateUpload(6 * 1024 * 1024, "image/png");
  assert.strictEqual(overSizeCheck.valid, false);
  assert.match(overSizeCheck.error, /excede o limite máximo permitido de 5 MB/);

  // Formato MIME não suportado
  const invalidMimeCheck = manager.validateUpload(500 * 1024, "application/pdf");
  assert.strictEqual(invalidMimeCheck.valid, false);
  assert.match(invalidMimeCheck.error, /Formato de arquivo inválido/);
});
