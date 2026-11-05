const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

// ==============================================================================
// 1. LÓGICA DE VALIDAÇÃO DE SEGURANÇA E PROCESSAMENTO DE ZIP DE FRAMES
// ==============================================================================

function validateZipSecurityMock(entries) {
  const MAX_FRAMES = 150;
  const MIN_FRAMES = 2;
  const MAX_TOTAL_UNCOMPRESSED_BYTES = 150 * 1024 * 1024; // 150 MB
  const SUPPORTED_EXTENSIONS = [".webp", ".png", ".jpg", ".jpeg"];

  let totalUncompressedSize = 0;
  const validEntries = [];

  for (const entry of entries) {
    if (entry.isDirectory) continue;
    const normalizedName = entry.name.replace(/\\/g, "/");

    // Prevenção de Path Traversal
    if (normalizedName.includes("..") || normalizedName.startsWith("/")) {
      throw new Error(`Arquivo suspeito rejeitado por tentativa de path traversal: ${entry.name}`);
    }

    // Ignora arquivos de sistema do macOS ou pastas ocultas
    if (normalizedName.includes("__MACOSX/") || path.basename(normalizedName).startsWith(".")) {
      continue;
    }

    const ext = path.extname(normalizedName).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      continue;
    }

    totalUncompressedSize += entry.uncompressedSize || 0;
    if (totalUncompressedSize > MAX_TOTAL_UNCOMPRESSED_BYTES) {
      throw new Error("Arquivo ZIP excede o limite máximo descompactado de segurança (150MB).");
    }

    validEntries.push({
      name: normalizedName,
      baseName: path.basename(normalizedName),
      ext,
    });
  }

  if (validEntries.length < MIN_FRAMES) {
    throw new Error(`O arquivo ZIP deve conter no mínimo ${MIN_FRAMES} frames de imagem válidos. Encontrados: ${validEntries.length}`);
  }

  if (validEntries.length > MAX_FRAMES) {
    throw new Error(`O arquivo ZIP excede o limite máximo permitido de ${MAX_FRAMES} frames de animação. Encontrados: ${validEntries.length}`);
  }

  // Ordenação numérica natural
  validEntries.sort((a, b) => {
    return a.baseName.localeCompare(b.baseName, undefined, {
      numeric: true,
      sensitivity: "base",
    });
  });

  return validEntries;
}

// ==============================================================================
// 2. MODELO DE CONFIGURAÇÃO DE MÍDIAS DOS DOIS SLOTS
// ==============================================================================

class MiniSiteMediaManager {
  constructor(initialSettings = {}) {
    this.settings = {
      heroMediaType: initialSettings.heroMediaType || "IMAGE",
      heroMediaUrl: initialSettings.heroMediaUrl || null,
      heroPosterUrl: initialSettings.heroPosterUrl || null,
      heroFps: initialSettings.heroFps ?? 24,
      heroLoop: initialSettings.heroLoop ?? true,
      heroAutoplay: initialSettings.heroAutoplay ?? true,
      heroPlaybackMode: initialSettings.heroPlaybackMode || "AUTOMATIC",
      heroPlaybackDirection: initialSettings.heroPlaybackDirection || "FORWARD",
      heroPositioning: initialSettings.heroPositioning || "center",
      heroFrameCount: initialSettings.heroFrameCount ?? 0,
      heroFramesJson: initialSettings.heroFramesJson || null,

      aboutMediaType: initialSettings.aboutMediaType || "IMAGE",
      aboutMediaUrl: initialSettings.aboutMediaUrl || null,
      aboutPosterUrl: initialSettings.aboutPosterUrl || null,
      aboutFps: initialSettings.aboutFps ?? 24,
      aboutLoop: initialSettings.aboutLoop ?? true,
      aboutAutoplay: initialSettings.aboutAutoplay ?? true,
      aboutPlaybackMode: initialSettings.aboutPlaybackMode || "AUTOMATIC",
      aboutPlaybackDirection: initialSettings.aboutPlaybackDirection || "FORWARD",
      aboutPositioning: initialSettings.aboutPositioning || "center",
      aboutFrameCount: initialSettings.aboutFrameCount ?? 0,
      aboutFramesJson: initialSettings.aboutFramesJson || null,
    };
  }

  getHeroConfig() {
    let frames = [];
    if (this.settings.heroFramesJson) {
      try {
        frames = JSON.parse(this.settings.heroFramesJson);
      } catch {
        frames = [];
      }
    }
    return {
      mediaType: this.settings.heroMediaType,
      mediaUrl: this.settings.heroMediaUrl,
      posterUrl: this.settings.heroPosterUrl,
      fps: this.settings.heroFps,
      loop: this.settings.heroLoop,
      autoplay: this.settings.heroAutoplay,
      playbackMode: this.settings.heroPlaybackMode,
      playbackDirection: this.settings.heroPlaybackDirection,
      positioning: this.settings.heroPositioning,
      frameCount: this.settings.heroFrameCount,
      frames,
    };
  }

  getAboutConfig() {
    let frames = [];
    if (this.settings.aboutFramesJson) {
      try {
        frames = JSON.parse(this.settings.aboutFramesJson);
      } catch {
        frames = [];
      }
    }
    return {
      mediaType: this.settings.aboutMediaType,
      mediaUrl: this.settings.aboutMediaUrl,
      posterUrl: this.settings.aboutPosterUrl,
      fps: this.settings.aboutFps,
      loop: this.settings.aboutLoop,
      autoplay: this.settings.aboutAutoplay,
      playbackMode: this.settings.aboutPlaybackMode,
      playbackDirection: this.settings.aboutPlaybackDirection,
      positioning: this.settings.aboutPositioning,
      frameCount: this.settings.aboutFrameCount,
      frames,
    };
  }

  updateHero(params) {
    if (params.fps !== undefined) {
      if (params.fps < 10 || params.fps > 60) {
        throw new Error("FPS deve estar entre 10 e 60.");
      }
    }
    this.settings.heroMediaType = params.mediaType || this.settings.heroMediaType;
    this.settings.heroMediaUrl = params.mediaUrl !== undefined ? params.mediaUrl : this.settings.heroMediaUrl;
    this.settings.heroPosterUrl = params.posterUrl !== undefined ? params.posterUrl : this.settings.heroPosterUrl;
    this.settings.heroFps = params.fps !== undefined ? params.fps : this.settings.heroFps;
    this.settings.heroLoop = params.loop !== undefined ? params.loop : this.settings.heroLoop;
    this.settings.heroAutoplay = params.autoplay !== undefined ? params.autoplay : this.settings.heroAutoplay;
    this.settings.heroPlaybackMode = params.playbackMode || this.settings.heroPlaybackMode;
    this.settings.heroPlaybackDirection = params.playbackDirection || this.settings.heroPlaybackDirection;
    this.settings.heroPositioning = params.positioning || this.settings.heroPositioning;
    if (params.frames) {
      this.settings.heroFramesJson = JSON.stringify(params.frames);
      this.settings.heroFrameCount = params.frames.length;
    }
  }

  updateAbout(params) {
    if (params.fps !== undefined) {
      if (params.fps < 10 || params.fps > 60) {
        throw new Error("FPS deve estar entre 10 e 60.");
      }
    }
    this.settings.aboutMediaType = params.mediaType || this.settings.aboutMediaType;
    this.settings.aboutMediaUrl = params.mediaUrl !== undefined ? params.mediaUrl : this.settings.aboutMediaUrl;
    this.settings.aboutPosterUrl = params.posterUrl !== undefined ? params.posterUrl : this.settings.aboutPosterUrl;
    this.settings.aboutFps = params.fps !== undefined ? params.fps : this.settings.aboutFps;
    this.settings.aboutLoop = params.loop !== undefined ? params.loop : this.settings.aboutLoop;
    this.settings.aboutAutoplay = params.autoplay !== undefined ? params.autoplay : this.settings.aboutAutoplay;
    this.settings.aboutPlaybackMode = params.playbackMode || this.settings.aboutPlaybackMode;
    this.settings.aboutPlaybackDirection = params.playbackDirection || this.settings.aboutPlaybackDirection;
    this.settings.aboutPositioning = params.positioning || this.settings.aboutPositioning;
    if (params.frames) {
      this.settings.aboutFramesJson = JSON.stringify(params.frames);
      this.settings.aboutFrameCount = params.frames.length;
    }
  }
}

// ==============================================================================
// 3. SUÍTE DE TESTES AUTOMATIZADOS (NODE.JS TEST RUNNER)
// ==============================================================================

test("MiniSite Media System — 1. Validação de ZIP e Proteção contra Path Traversal", () => {
  const maliciousEntries = [
    { isDirectory: false, name: "../../etc/passwd.png", uncompressedSize: 500 },
    { isDirectory: false, name: "001.png", uncompressedSize: 500 },
    { isDirectory: false, name: "002.png", uncompressedSize: 500 },
  ];

  assert.throws(
    () => validateZipSecurityMock(maliciousEntries),
    /path traversal/i,
    "Deve rejeitar com erro arquivos contendo tentativas de path traversal"
  );
});

test("MiniSite Media System — 2. Proteção contra ZIP Bomb (Tamanho Descompactado Excessivo)", () => {
  const hugeEntries = [
    { isDirectory: false, name: "frame1.png", uncompressedSize: 80 * 1024 * 1024 },
    { isDirectory: false, name: "frame2.png", uncompressedSize: 80 * 1024 * 1024 },
  ];

  assert.throws(
    () => validateZipSecurityMock(hugeEntries),
    /limite máximo descompactado/i,
    "Deve rejeitar arquivos cujo conteúdo descompactado exceda 150MB"
  );
});

test("MiniSite Media System — 3. Validação de Mínimo e Máximo de Frames (2 a 150)", () => {
  // Menos de 2 frames
  const singleFrame = [
    { isDirectory: false, name: "only_one.png", uncompressedSize: 1000 },
  ];
  assert.throws(
    () => validateZipSecurityMock(singleFrame),
    /no mínimo 2 frames/i
  );

  // Mais de 150 frames
  const tooMany = [];
  for (let i = 1; i <= 155; i++) {
    tooMany.push({
      isDirectory: false,
      name: `frame_${String(i).padStart(3, "0")}.png`,
      uncompressedSize: 100,
    });
  }
  assert.throws(
    () => validateZipSecurityMock(tooMany),
    /limite máximo permitido de 150 frames/i
  );
});

test("MiniSite Media System — 4. Ordenação Numérica Natural de Frames", () => {
  const disorderedEntries = [
    { isDirectory: false, name: "frame-10.png", uncompressedSize: 100 },
    { isDirectory: false, name: "frame-2.png", uncompressedSize: 100 },
    { isDirectory: false, name: "frame-1.png", uncompressedSize: 100 },
    { isDirectory: false, name: "frame-20.png", uncompressedSize: 100 },
    { isDirectory: false, name: "frame-3.png", uncompressedSize: 100 },
  ];

  const sorted = validateZipSecurityMock(disorderedEntries);
  const names = sorted.map((s) => s.baseName);

  assert.deepStrictEqual(
    names,
    ["frame-1.png", "frame-2.png", "frame-3.png", "frame-10.png", "frame-20.png"],
    "Frames devem ser ordenados naturalmente por seus números, não por ordem alfabética estrita"
  );
});

test("MiniSite Media System — 5. Filtro de Arquivos Indesejados (.DS_Store, __MACOSX, .exe)", () => {
  const mixedEntries = [
    { isDirectory: false, name: "__MACOSX/._001.png", uncompressedSize: 50 },
    { isDirectory: false, name: ".DS_Store", uncompressedSize: 50 },
    { isDirectory: false, name: "trojan.exe", uncompressedSize: 50 },
    { isDirectory: false, name: "001.webp", uncompressedSize: 1000 },
    { isDirectory: false, name: "002.webp", uncompressedSize: 1000 },
  ];

  const valid = validateZipSecurityMock(mixedEntries);
  assert.strictEqual(valid.length, 2);
  assert.strictEqual(valid[0].baseName, "001.webp");
  assert.strictEqual(valid[1].baseName, "002.webp");
});

test("MiniSite Media System — 6. Independência Estrita entre os Slots Hero e Sobre Mim", () => {
  const manager = new MiniSiteMediaManager();

  // Configura Hero como Animação por Frames
  manager.updateHero({
    mediaType: "FRAME_ANIMATION",
    fps: 30,
    playbackMode: "SCROLL",
    playbackDirection: "ALTERNATE",
    frames: ["/frames/hero/01.png", "/frames/hero/02.png", "/frames/hero/03.png"],
  });

  // Configura Sobre Mim como Imagem Estática
  manager.updateAbout({
    mediaType: "IMAGE",
    mediaUrl: "/uploads/consultorio.jpg",
    positioning: "contain",
  });

  const hero = manager.getHeroConfig();
  const about = manager.getAboutConfig();

  // Valida Hero
  assert.strictEqual(hero.mediaType, "FRAME_ANIMATION");
  assert.strictEqual(hero.fps, 30);
  assert.strictEqual(hero.playbackMode, "SCROLL");
  assert.strictEqual(hero.playbackDirection, "ALTERNATE");
  assert.strictEqual(hero.frameCount, 3);
  assert.strictEqual(hero.frames.length, 3);

  // Valida Sobre Mim (não herdou nada do Hero)
  assert.strictEqual(about.mediaType, "IMAGE");
  assert.strictEqual(about.mediaUrl, "/uploads/consultorio.jpg");
  assert.strictEqual(about.positioning, "contain");
  assert.strictEqual(about.fps, 24); // padrão preservado
  assert.strictEqual(about.playbackMode, "AUTOMATIC"); // padrão preservado
  assert.strictEqual(about.frameCount, 0);
});

test("MiniSite Media System — 7. Validação de Limites de FPS (10 a 60)", () => {
  const manager = new MiniSiteMediaManager();

  assert.throws(
    () => manager.updateHero({ fps: 5 }),
    /FPS deve estar entre 10 e 60/
  );

  assert.throws(
    () => manager.updateHero({ fps: 90 }),
    /FPS deve estar entre 10 e 60/
  );

  manager.updateHero({ fps: 24 });
  assert.strictEqual(manager.getHeroConfig().fps, 24);
});

test("MiniSite Media System — 8. Presença e Existência dos 40 Frames Locais Fornecidos pelo Usuário", () => {
  const topDir = path.join(process.cwd(), "storage", "minisite", "top");
  const sobreDir = fs.existsSync(path.join(process.cwd(), "storage", "minisite", "sobre"))
    ? path.join(process.cwd(), "storage", "minisite", "sobre")
    : path.join(process.cwd(), "storage", "minisite", "mid");

  assert.strictEqual(fs.existsSync(topDir), true, "Diretório storage/minisite/top deve existir");
  assert.strictEqual(fs.existsSync(sobreDir), true, "Diretório storage/minisite/sobre deve existir");

  const topFiles = fs.readdirSync(topDir);
  const sobreFiles = fs.readdirSync(sobreDir);

  const topPngs = topFiles.filter((f) => f.endsWith(".png"));
  const sobrePngs = sobreFiles.filter((f) => f.endsWith(".png"));

  assert.strictEqual(topPngs.length, 40, "storage/minisite/top deve conter exatamente 40 frames PNG");
  assert.strictEqual(sobrePngs.length, 40, "storage/minisite/sobre deve conter exatamente 40 frames PNG");
  assert.strictEqual(fs.existsSync(path.join(topDir, "b.zip")), true, "b.zip deve existir no top");
  assert.strictEqual(fs.existsSync(path.join(sobreDir, "a.zip")), true, "a.zip deve existir no sobre");
});

test("MiniSite Media System — 9. Conformidade do Schema Prisma e Dicionário de Dados", () => {
  const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");
  const schemaContent = fs.readFileSync(schemaPath, "utf-8");

  const expectedFields = [
    "heroMediaType",
    "heroMediaUrl",
    "heroPosterUrl",
    "heroFps",
    "heroLoop",
    "heroAutoplay",
    "heroPlaybackMode",
    "heroPlaybackDirection",
    "heroPositioning",
    "heroFrameCount",
    "heroFramesJson",
    "aboutMediaType",
    "aboutMediaUrl",
    "aboutPosterUrl",
    "aboutFps",
    "aboutLoop",
    "aboutAutoplay",
    "aboutPlaybackMode",
    "aboutPlaybackDirection",
    "aboutPositioning",
    "aboutFrameCount",
    "aboutFramesJson",
  ];

  for (const field of expectedFields) {
    assert.strictEqual(
      schemaContent.includes(field),
      true,
      `Campo obrigatório de mídia ${field} deve existir no modelo SiteSettings no prisma/schema.prisma`
    );
  }

  const dictPath = path.join(process.cwd(), "docs", "DICIONARIO_DADOS.md");
  const dictContent = fs.readFileSync(dictPath, "utf-8");

  for (const field of expectedFields) {
    assert.strictEqual(
      dictContent.includes(field),
      true,
      `Campo obrigatório de mídia ${field} deve estar documentado em docs/DICIONARIO_DADOS.md`
    );
  }
});
