const test = require("node:test");
const assert = require("node:assert");

// Importa função de sobreposição de intervalos
function intervalsOverlap(startA, endA, startB, endB) {
  return startA.getTime() < endB.getTime() && endA.getTime() > startB.getTime();
}

test("Concorrência da Agenda: Detecção matemática de sobreposição de horários", () => {
  // Consulta A: 14:00 às 15:00
  const startA = new Date("2026-11-10T14:00:00Z");
  const endA = new Date("2026-11-10T15:00:00Z");

  // Consulta B: 14:30 às 15:30 (sobrepõe o final de A)
  const startB = new Date("2026-11-10T14:30:00Z");
  const endB = new Date("2026-11-10T15:30:00Z");
  assert.strictEqual(intervalsOverlap(startA, endA, startB, endB), true);

  // Consulta C: 13:30 às 14:30 (sobrepõe o início de A)
  const startC = new Date("2026-11-10T13:30:00Z");
  const endC = new Date("2026-11-10T14:30:00Z");
  assert.strictEqual(intervalsOverlap(startA, endA, startC, endC), true);

  // Consulta D: 14:15 às 14:45 (totalmente contida dentro de A)
  const startD = new Date("2026-11-10T14:15:00Z");
  const endD = new Date("2026-11-10T14:45:00Z");
  assert.strictEqual(intervalsOverlap(startA, endA, startD, endD), true);

  // Consulta E: 15:00 às 16:00 (adjacente, não colide em intervalo aberto)
  const startE = new Date("2026-11-10T15:00:00Z");
  const endE = new Date("2026-11-10T16:00:00Z");
  assert.strictEqual(intervalsOverlap(startA, endA, startE, endE), false);

  // Consulta F: com buffer de 10 min em A, 15:05 colide com o buffer!
  const bufferMinutes = 10;
  const endAWithBuffer = new Date(endA.getTime() + bufferMinutes * 60000);
  const startF = new Date("2026-11-10T15:05:00Z");
  const endF = new Date("2026-11-10T16:05:00Z");
  assert.strictEqual(intervalsOverlap(startA, endAWithBuffer, startF, endF), true, "Deve colidir com o buffer de resguardo");
});

test("Política de Cancelamento Tardio: Detecção de antecedência mínima de 3 dias", () => {
  const noticeDaysRequired = 3;
  const noticeMs = noticeDaysRequired * 24 * 60 * 60 * 1000;

  const now = new Date("2026-11-10T10:00:00Z");

  // Consulta daqui a 5 dias (Dentro do prazo)
  const apptOnTime = new Date("2026-11-15T10:00:00Z");
  const msRemainingOnTime = apptOnTime.getTime() - now.getTime();
  const isLate1 = msRemainingOnTime < noticeMs;
  assert.strictEqual(isLate1, false, "Cancelamento com 5 dias não deve ser tardio");

  // Consulta daqui a 1 dia (Tardio / Quebra de política)
  const apptLate = new Date("2026-11-11T10:00:00Z");
  const msRemainingLate = apptLate.getTime() - now.getTime();
  const isLate2 = msRemainingLate < noticeMs;
  assert.strictEqual(isLate2, true, "Cancelamento com 24h deve ser registrado como tardio");
});

test("Cálculo de Preço e Centavos (BRL cents)", () => {
  const priceCents = 18000; // R$ 180,00
  const formatted = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(priceCents / 100);

  assert.ok(formatted.includes("180,00"));
});
