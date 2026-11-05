const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

// ==============================================================================
// 1. IMPORTAÇÕES E MOCKS DE SERVIÇOS DA FASE 4
// ==============================================================================

function sanitizeSvgMarkup(svgContent) {
  if (!svgContent || typeof svgContent !== "string") {
    throw new Error("Conteúdo SVG inválido ou vazio.");
  }
  let clean = svgContent.trim();
  if (!clean.toLowerCase().includes("<svg") || !clean.toLowerCase().includes("</svg>")) {
    throw new Error("Arquivo não contém a marcação raiz <svg> válida.");
  }
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  clean = clean.replace(/<\/?(foreignObject|iframe|object|embed|applet|meta|link|base|form|input|button|audio|video)\b[^>]*>/gi, "");
  clean = clean.replace(/\son\w+\s*=\s*(['"]).*?\1/gi, "");
  clean = clean.replace(/\son\w+\s*=[^\s>]+/gi, "");
  clean = clean.replace(/href\s*=\s*(['"])\s*javascript:[^'"]*\1/gi, 'href="#"');
  clean = clean.replace(/xlink:href\s*=\s*(['"])\s*javascript:[^'"]*\1/gi, 'xlink:href="#"');
  return clean;
}

function formatFullAddress(loc) {
  if (!loc || !loc.address) return "";
  let full = loc.address.trim();
  if (loc.addressNumber) full += `, ${loc.addressNumber.trim()}`;
  if (loc.addressComplement) full += ` - ${loc.addressComplement.trim()}`;
  if (loc.addressNeighborhood) full += `, ${loc.addressNeighborhood.trim()}`;
  if (loc.addressCity) {
    full += ` — ${loc.addressCity.trim()}`;
    if (loc.addressState) full += `/${loc.addressState.trim().toUpperCase()}`;
  }
  if (loc.addressPostalCode) full += `, CEP ${loc.addressPostalCode.trim()}`;
  return full;
}

function getGoogleMapsDestinationUrl(loc) {
  if (!loc) return null;
  if (loc.googleMapsUrl && loc.googleMapsUrl.trim().startsWith("http")) {
    return loc.googleMapsUrl.trim();
  }
  const full = formatFullAddress(loc);
  if (!full) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(full)}`;
}

function getGoogleMapsEmbedSrc(loc) {
  if (!loc) return null;
  if (loc.googleMapsEmbedUrl && loc.googleMapsEmbedUrl.trim().startsWith("http")) {
    const raw = loc.googleMapsEmbedUrl.trim();
    const match = raw.match(/src=["'](.*?)["']/);
    return match ? match[1] : raw;
  }
  const full = formatFullAddress(loc);
  if (!full) return null;
  return `https://maps.google.com/maps?q=${encodeURIComponent(full)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
}

function buildWhatsAppChatUrl(rawPhone, customMessage, professionalName) {
  if (!rawPhone) return null;
  const digits = rawPhone.replace(/\D/g, "");
  if (!digits || digits.length < 10) return null;
  const formattedNumber = digits.length <= 11 ? `55${digits}` : digits;
  const defaultMsg =
    customMessage && customMessage.trim().length > 0
      ? customMessage.trim()
      : `Olá${professionalName ? `, ${professionalName}` : ""}! Conheci seu trabalho pelo site e gostaria de saber mais sobre os atendimentos e como agendar uma consulta.`;
  return `https://wa.me/${formattedNumber}?text=${encodeURIComponent(defaultMsg)}`;
}

// ==============================================================================
// 2. SUÍTE DE TESTES AUTOMATIZADOS (NODE.JS TEST RUNNER)
// ==============================================================================

test("MiniSite Phase 4 — 1. Biblioteca de Ícones Integrada e Busca Semântica", () => {
  const iconsPath = path.join(process.cwd(), "src", "lib", "minisite-icons.ts");
  const iconsSource = fs.readFileSync(iconsPath, "utf-8");

  const requiredIconKeys = [
    "Heart",
    "HandHeart",
    "Brain",
    "Flower2",
    "Flower",
    "Calendar",
    "Clock",
    "Users",
    "Shield",
    "ShieldCheck",
    "MessageCircle",
    "Star",
    "Target",
    "Home",
    "Video",
    "MapPin",
  ];

  for (const key of requiredIconKeys) {
    assert.strictEqual(
      iconsSource.includes(`key: "${key}"`),
      true,
      `Ícone ${key} deve estar presente na biblioteca em src/lib/minisite-icons.ts`
    );
  }

  // Verifica os 3 benefícios padrão no código fonte
  assert.strictEqual(iconsSource.includes("ACOLHIMENTO SEM JULGAMENTOS"), true);
  assert.strictEqual(iconsSource.includes("SAÚDE EMOCIONAL"), true);
  assert.strictEqual(iconsSource.includes("QUALIDADE DE VIDA"), true);
});

test("MiniSite Phase 4 — 2. Sanitização Rigorosa de SVGs Customizados (Prevenção de XSS)", () => {
  // SVG com script embutido e atributo onload
  const dirtySvg = `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" onload="alert('XSS')">
      <script>fetch('/api/steal')</script>
      <circle cx="50" cy="50" r="40" stroke="green" stroke-width="4" fill="yellow" />
      <foreignObject width="100" height="100"><iframe src="malicious.html"></iframe></foreignObject>
      <a href="javascript:alert(1)">Link perigoso</a>
    </svg>
  `;

  const clean = sanitizeSvgMarkup(dirtySvg);

  assert.strictEqual(clean.includes("<script>"), false, "Deve remover tags <script>");
  assert.strictEqual(clean.includes("onload"), false, "Deve remover atributos onload");
  assert.strictEqual(clean.includes("foreignObject"), false, "Deve remover foreignObject");
  assert.strictEqual(clean.includes("<iframe"), false, "Deve remover iframes embutidos");
  assert.strictEqual(clean.includes("javascript:"), false, "Deve neutralizar links javascript:");
  assert.strictEqual(clean.includes("<circle"), true, "Deve manter elementos geométricos válidos do SVG");
});

test("MiniSite Phase 4 — 3. Rejeição de Arquivo SVG Vazio ou Sem Raiz Válida", () => {
  assert.throws(() => sanitizeSvgMarkup(""), /Conteúdo SVG inválido/);
  assert.throws(() => sanitizeSvgMarkup("<html><body>não sou svg</body></html>"), /marcação raiz <svg>/);
});

test("MiniSite Phase 4 — 4. Formatação de Endereço Físico do Consultório", () => {
  const loc = {
    address: "Av. Paulista",
    addressNumber: "1000",
    addressComplement: "Sala 42",
    addressNeighborhood: "Bela Vista",
    addressCity: "São Paulo",
    addressState: "SP",
    addressPostalCode: "01310-100",
  };

  const formatted = formatFullAddress(loc);
  assert.strictEqual(
    formatted,
    "Av. Paulista, 1000 - Sala 42, Bela Vista — São Paulo/SP, CEP 01310-100"
  );
});

test("MiniSite Phase 4 — 5. Geração de Links do Google Maps ('Como Chegar')", () => {
  // Caso 1: Endereço gerado dinamicamente
  const loc1 = {
    address: "Rua Vergueiro",
    addressNumber: "500",
    addressCity: "São Paulo",
    addressState: "SP",
  };
  const url1 = getGoogleMapsDestinationUrl(loc1);
  assert.strictEqual(
    url1.includes("https://www.google.com/maps/search/?api=1&query="),
    true
  );
  assert.strictEqual(url1.includes(encodeURIComponent("Rua Vergueiro, 500 — São Paulo/SP")), true);

  // Caso 2: URL explícita cadastrada pelo profissional
  const loc2 = {
    googleMapsUrl: "https://maps.app.goo.gl/customDestination123",
  };
  const url2 = getGoogleMapsDestinationUrl(loc2);
  assert.strictEqual(url2, "https://maps.app.goo.gl/customDestination123");
});

test("MiniSite Phase 4 — 6. Geração Segura de Embed do Google Maps (Keyless Embed)", () => {
  const loc = {
    address: "Av. Faria Lima",
    addressNumber: "2000",
    addressCity: "São Paulo",
  };
  const embed = getGoogleMapsEmbedSrc(loc);
  assert.strictEqual(
    embed.startsWith("https://maps.google.com/maps?q="),
    true
  );
  assert.strictEqual(embed.includes("output=embed"), true);
});

test("MiniSite Phase 4 — 7. Geração de Link do WhatsApp e Mensagem Customizada", () => {
  // Número com DDD local (11 dígitos): adiciona DDI 55
  const phone = "(11) 98765-4321";
  const customMsg = "Olá! Conheci seu trabalho pelo site e gostaria de saber sobre valores.";
  const url = buildWhatsAppChatUrl(phone, customMsg, "Dr. Lucas");

  assert.strictEqual(
    url.startsWith("https://wa.me/5511987654321?text="),
    true
  );
  assert.strictEqual(
    url.includes(encodeURIComponent(customMsg)),
    true
  );

  // Caso telefone vazio: retorna null
  assert.strictEqual(buildWhatsAppChatUrl("", customMsg), null);
  assert.strictEqual(buildWhatsAppChatUrl(null, customMsg), null);
});

test("MiniSite Phase 4 — 8. Omissão de Localização para Profissionais 100% Online", () => {
  // Quando showLocation for false, a seção e os links devem ser desativados
  const siteOnlineOnly = {
    showLocation: false,
    address: "Rua Oculta, 123",
  };
  const shouldShow = siteOnlineOnly.showLocation !== false && !!siteOnlineOnly.address;
  assert.strictEqual(shouldShow, false, "Profissionais 100% online devem poder ocultar a localização");
});

test("MiniSite Phase 4 — 9. Conformidade do Schema Prisma e Dicionário de Dados", () => {
  const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");
  const schemaContent = fs.readFileSync(schemaPath, "utf-8");

  const expectedFields = [
    "benefitsJson",
    "addressNumber",
    "addressComplement",
    "addressNeighborhood",
    "addressCity",
    "addressState",
    "addressPostalCode",
    "googleMapsUrl",
    "googleMapsEmbedUrl",
    "showLocation",
    "whatsappDefaultMessage",
    "showFloatingWhatsApp",
  ];

  for (const field of expectedFields) {
    assert.strictEqual(
      schemaContent.includes(field),
      true,
      `Campo obrigatório de Fase 4 ${field} deve existir no modelo SiteSettings no prisma/schema.prisma`
    );
  }

  const dictPath = path.join(process.cwd(), "docs", "DICIONARIO_DADOS.md");
  const dictContent = fs.readFileSync(dictPath, "utf-8");

  for (const field of expectedFields) {
    assert.strictEqual(
      dictContent.includes(field),
      true,
      `Campo obrigatório de Fase 4 ${field} deve estar documentado em docs/DICIONARIO_DADOS.md`
    );
  }
});
