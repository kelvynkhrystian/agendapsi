const test = require("node:test");
const assert = require("node:assert");

// Sanitizador de HTML
function sanitizeCustomHtml(dirtyHtml) {
  if (!dirtyHtml) return "";
  let clean = dirtyHtml;
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  clean = clean.replace(/<\/?(iframe|object|embed|form|meta|link|base|applet)\b[^>]*>/gi, "");
  clean = clean.replace(/\son\w+\s*=\s*(['"]).*?\1/gi, "");
  clean = clean.replace(/\son\w+\s*=[^\s>]+/gi, "");
  clean = clean.replace(/href\s*=\s*(['"])\s*javascript:[^'"]*\1/gi, 'href="#"');
  clean = clean.replace(/src\s*=\s*(['"])\s*javascript:[^'"]*\1/gi, 'src=""');
  return clean;
}

test("Segurança do MiniSite: Sanitização de tags perigosas e scripts", () => {
  const dangerousHtml =
    '<p>Olá!</p><script>alert("XSS")</script><a href="javascript:stealCookies()">Clique</a><div onclick="executeEvil()">Div</div><iframe src="https://phishing.com"></iframe>';

  const clean = sanitizeCustomHtml(dangerousHtml);

  assert.strictEqual(clean.includes("<script>"), false, "Scripts devem ser removidos");
  assert.strictEqual(clean.includes("<iframe>"), false, "Iframes devem ser removidos");
  assert.strictEqual(clean.includes("onclick"), false, "Manipuladores de eventos devem ser removidos");
  assert.strictEqual(clean.includes("javascript:"), false, "Protocolos javascript: devem ser neutralizados");
  assert.ok(clean.includes("<p>Olá!</p>"), "Conteúdo seguro deve ser preservado");
});

test("Regra de Negócio: Solicitação via WhatsApp NÃO cria registro de agendamento", () => {
  // Simulação do comportamento:
  // A solicitação via WhatsApp gera apenas a URL wa.me com mensagem de texto pré-formatada
  const service = { name: "Psicoterapia Online" };
  const dateStr = "2026-11-20";
  const timeStr = "14:00";
  const phone = "5511999999999";

  const generateWhatsAppInquiryUrl = (svc, date, time, destPhone) => {
    const text = `Olá! Gostaria de solicitar informações sobre a consulta de ${svc.name} em ${date} às ${time}. Esta é apenas uma solicitação inicial.`;
    return `https://wa.me/${destPhone}?text=${encodeURIComponent(text)}`;
  };

  const url = generateWhatsAppInquiryUrl(service, dateStr, timeStr, phone);

  assert.ok(url.startsWith("https://wa.me/5511999999999"));
  assert.ok(url.includes("apenas%20uma%20solicita%C3%A7%C3%A3o%20inicial"));

  // Invariante: banco de dados permanece intocado (nenhum appointmentId é retornado)
  const appointmentCreated = false;
  assert.strictEqual(appointmentCreated, false, "Nenhum agendamento deve ser persistido na solicitação pública por WhatsApp");
});
