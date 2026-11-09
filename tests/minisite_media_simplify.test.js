const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const sharp = require("sharp");
const AdmZip = require("adm-zip");

function loadTsModule(relPath, extraMocks = {}) {
  const fullPath = path.join(process.cwd(), relPath);
  const source = fs.readFileSync(fullPath, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: fullPath,
  });

  const mod = { exports: {} };
  const dir = path.dirname(fullPath);

  function customRequire(specifier) {
    if (extraMocks[specifier]) return extraMocks[specifier];
    if (specifier.startsWith(".")) {
      const candidate = path.resolve(dir, specifier);
      if (fs.existsSync(candidate + ".ts")) {
        const subRel = path.relative(process.cwd(), candidate + ".ts");
        return loadTsModule(subRel, extraMocks);
      }
      if (fs.existsSync(candidate)) {
        return require(candidate);
      }
    }
    return require(specifier);
  }

  const fn = new vm.Script(`(function(exports, require, module, __filename, __dirname) {\n${outputText}\n})`);
  const compiled = fn.runInThisContext();
  compiled(mod.exports, customRequire, mod, fullPath, dir);
  return mod.exports;
}

const mediaLib = loadTsModule("src/lib/minisite-media.ts");
const colorLib = loadTsModule("src/lib/hero-color-detector.ts");

test("1. Reconhecimento automático de formatos (JPG, PNG, WebP, MP4, WebM, ZIP) por assinatura binária", async () => {
  const pngBuf = await sharp({
    create: { width: 8, height: 8, channels: 4, background: { r: 10, g: 20, b: 30, alpha: 1 } },
  })
    .png()
    .toBuffer();

  const jpgBuf = await sharp({
    create: { width: 8, height: 8, channels: 3, background: { r: 240, g: 230, b: 220 } },
  })
    .jpeg()
    .toBuffer();

  const webpBuf = await sharp({
    create: { width: 8, height: 8, channels: 4, background: { r: 100, g: 150, b: 200, alpha: 1 } },
  })
    .webp()
    .toBuffer();

  const zip = new AdmZip();
  zip.addFile("001.png", pngBuf);
  zip.addFile("002.png", pngBuf);
  const zipBuf = zip.toBuffer();

  // Assinatura mínima MP4 (ISO Base Media ftyp)
  const mp4Buf = Buffer.from([
    0x00, 0x00, 0x00, 0x18,
    0x66, 0x74, 0x79, 0x70, // "ftyp"
    0x69, 0x73, 0x6f, 0x6d, // "isom"
    0x00, 0x00, 0x02, 0x00,
  ]);

  // Assinatura mínima WebM (EBML + doctype webm)
  const webmBuf = Buffer.concat([
    Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x82, 0x84]),
    Buffer.from("webm", "ascii"),
  ]);

  assert.deepStrictEqual(mediaLib.detectMediaTypeFromFile("foto.bin", "", pngBuf), {
    mediaType: "IMAGE",
    extension: ".png",
    kind: "image",
  });
  assert.deepStrictEqual(mediaLib.detectMediaTypeFromFile("foto.jpeg", "image/jpeg", jpgBuf), {
    mediaType: "IMAGE",
    extension: ".jpeg",
    kind: "image",
  });
  assert.deepStrictEqual(mediaLib.detectMediaTypeFromFile("foto.webp", "image/webp", webpBuf), {
    mediaType: "IMAGE",
    extension: ".webp",
    kind: "image",
  });
  assert.deepStrictEqual(mediaLib.detectMediaTypeFromFile("animacao.zip", "application/zip", zipBuf), {
    mediaType: "FRAME_ANIMATION",
    extension: ".zip",
    kind: "zip",
  });
  assert.deepStrictEqual(mediaLib.detectMediaTypeFromFile("video.mp4", "video/mp4", mp4Buf), {
    mediaType: "VIDEO",
    extension: ".mp4",
    kind: "video",
  });
  assert.deepStrictEqual(mediaLib.detectMediaTypeFromFile("video.webm", "video/webm", webmBuf), {
    mediaType: "VIDEO",
    extension: ".webm",
    kind: "video",
  });
});

test("2. Rejeição de arquivos não suportados ou inválidos no detector automático", () => {
  const exeBuf = Buffer.from("MZ\x90\x00\x03\x00\x00\x00", "latin1");
  const movBuf = Buffer.from([
    0x00, 0x00, 0x00, 0x14,
    0x66, 0x74, 0x79, 0x70, // "ftyp"
    0x71, 0x74, 0x20, 0x20, // "qt  "
  ]);

  assert.throws(() => mediaLib.detectMediaTypeFromFile("malware.exe", "application/octet-stream", exeBuf));
  assert.throws(() => mediaLib.detectMediaTypeFromFile("clip.mov", "video/quicktime", movBuf));
  assert.throws(() => mediaLib.detectMediaTypeFromFile("empty.png", "image/png", Buffer.from([1, 2])));
});

test("3. Mapeamento independente de pastas por slot (top, top-mobile, sobre) e normalização de velocidade", () => {
  assert.strictEqual(mediaLib.getSlotDirectory("hero"), "top");
  assert.strictEqual(mediaLib.getSlotDirectory("hero_mobile"), "top-mobile");
  assert.strictEqual(mediaLib.getSlotDirectory("about"), "sobre");

  assert.strictEqual(mediaLib.normalizePlaybackSpeed(0.5), 0.5);
  assert.strictEqual(mediaLib.normalizePlaybackSpeed(1), 1);
  assert.strictEqual(mediaLib.normalizePlaybackSpeed(2), 2);
  assert.strictEqual(mediaLib.normalizePlaybackSpeed("0.5"), 0.5);
  assert.strictEqual(mediaLib.normalizePlaybackSpeed("2"), 2);
  assert.strictEqual(mediaLib.normalizePlaybackSpeed("invalid"), 1);
  assert.strictEqual(mediaLib.normalizePlaybackSpeed(-5), 1);
});

test("4. Detector robusto de cor de fundo (imagem, múltiplos quadros de vídeo e ZIP com objeto móvel)", async () => {
  // Imagem 80x80 com fundo creme #E8DDCF e grande objeto central escuro #221133
  const bg = { r: 232, g: 221, b: 207 };
  const fg = { r: 34, g: 17, b: 51 };

  async function buildFrame(offsetX) {
    const raw = Buffer.alloc(80 * 80 * 4);
    for (let y = 0; y < 80; y++) {
      for (let x = 0; x < 80; x++) {
        const idx = (y * 80 + x) * 4;
        const inSubject = x >= 18 + offsetX && x <= 55 + offsetX && y >= 15 && y <= 65;
        const c = inSubject ? fg : bg;
        raw[idx] = c.r;
        raw[idx + 1] = c.g;
        raw[idx + 2] = c.b;
        raw[idx + 3] = 255;
      }
    }
    return sharp(raw, { raw: { width: 80, height: 80, channels: 4 } }).png().toBuffer();
  }

  const f1 = await buildFrame(0);
  const f2 = await buildFrame(-4);
  const f3 = await buildFrame(4);

  const singleResult = await colorLib.detectImageBackgroundColor(f1);
  assert.strictEqual(singleResult.status, "SUCCESS");
  assert.strictEqual(singleResult.hex, "#E8DDCF");

  const multiResult = await colorLib.detectMultiFrameBackgroundColor([f1, f2, f3]);
  assert.strictEqual(multiResult.status, "SUCCESS");
  assert.strictEqual(multiResult.hex, "#E8DDCF");

  const zip = new AdmZip();
  zip.addFile("frame-001.png", f1);
  zip.addFile("frame-002.png", f2);
  zip.addFile("frame-003.png", f3);
  const zipResult = await colorLib.detectZipBackgroundColor(zip.toBuffer());
  assert.strictEqual(zipResult.status, "SUCCESS");
  assert.strictEqual(zipResult.hex, "#E8DDCF");
});

test("5. Schema Prisma, UI Admin e Card Reutilizável implementam os 3 blocos simplificados corretamente", () => {
  const cardSrc = fs.readFileSync(
    path.join(process.cwd(), "src/components/admin/minisite-media-slot-card.tsx"),
    "utf8"
  );
  const adminSrc = fs.readFileSync(
    path.join(process.cwd(), "src/app/admin/configuracoes/page.tsx"),
    "utf8"
  );
  const playerSrc = fs.readFileSync(
    path.join(process.cwd(), "src/components/minisite/media-player.tsx"),
    "utf8"
  );
  const pageSrc = fs.readFileSync(path.join(process.cwd(), "src/app/page.tsx"), "utf8");

  // Card reutilizável
  assert.ok(
    cardSrc.includes("Envie uma imagem, vídeo ou animação ZIP (JPG, PNG, WebP, MP4, WebM ou ZIP)."),
    "Mensagem única obrigatória de formatos aceitos deve estar presente"
  );
  assert.ok(
    cardSrc.includes('mediaType === "VIDEO" || mediaType === "FRAME_ANIMATION"'),
    "Seletor de Velocidade deve aparecer apenas para vídeo ou animação ZIP"
  );
  assert.ok(
    cardSrc.includes("0.5x") && cardSrc.includes("1x (Padrão)") && cardSrc.includes("2x"),
    "Opções de velocidade 0.5x, 1x (Padrão) e 2x devem estar presentes"
  );
  assert.ok(!cardSrc.includes("FPS") && !cardSrc.includes('type="range"'), "Slider técnico de FPS não deve existir na UI");

  // Admin Page
  assert.ok(adminSrc.includes('title="Hero — Desktop"'));
  assert.ok(adminSrc.includes('title="Hero — Mobile"'));
  assert.ok(adminSrc.includes('title="Sobre Mim"'));
  assert.ok(adminSrc.includes("Salvar Mídias do MiniSite"));
  assert.ok(
    !adminSrc.includes("Fase 3: Mídias Dinâmicas") &&
      !adminSrc.includes("Modo de Reprodução") &&
      !adminSrc.includes("Direção do Loop") &&
      !adminSrc.includes("Enquadramento / Posicionamento"),
    "Controles técnicos excessivos não devem estar presentes na UI simplificada"
  );

  // Media Player (playbackRate e FPS multiplicado pela velocidade preservando o FPS base em 1x)
  assert.ok(playerSrc.includes("v.playbackRate = effectiveSpeed"), "Vídeos devem respeitar playbackSpeed");
  assert.ok(playerSrc.includes("(fps || 24) * effectiveSpeed"), "ZIP frames devem escalar FPS base por playbackSpeed");

  // Home Page (Mobile Hero independente + fallback para Desktop Hero)
  assert.ok(pageSrc.includes("hasMobileHeroMedia"), "MiniSite público deve checar mídia mobile independente");
  assert.ok(pageSrc.includes('slot="hero_mobile"'), "MiniSite público deve renderizar slot hero_mobile quando houver mídia mobile");
  assert.ok(pageSrc.includes("effectiveMobileHeroBgColor"), "Hero mobile deve aplicar cor detectada independente ou fallback desktop");
  assert.ok(pageSrc.includes("playbackSpeed={site?.aboutPlaybackSpeed ?? 1}"), "Sobre Mim deve aplicar velocidade configurada");
});
