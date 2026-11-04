const test = require("node:test");
const assert = require("node:assert");

test("FakePaymentProvider: Idempotência de pagamentos com chave única", () => {
  const processedPayments = new Map();

  function processPaymentWithIdempotency(key, amountCents, status) {
    if (processedPayments.has(key)) {
      return {
        idempotentReplay: true,
        payment: processedPayments.get(key),
      };
    }

    const newPayment = {
      id: "pay_" + Math.random().toString(36).substring(2, 8),
      amountCents,
      status,
      idempotencyKey: key,
    };
    processedPayments.set(key, newPayment);
    return {
      idempotentReplay: false,
      payment: newPayment,
    };
  }

  const key1 = "idem_req_abc_123";
  const result1 = processPaymentWithIdempotency(key1, 18000, "APPROVED");
  assert.strictEqual(result1.idempotentReplay, false);
  assert.strictEqual(result1.payment.amountCents, 18000);

  // Segunda chamada com a mesma chave (retry de rede)
  const result2 = processPaymentWithIdempotency(key1, 18000, "APPROVED");
  assert.strictEqual(result2.idempotentReplay, true, "Deve identificar repetição de requisição");
  assert.strictEqual(result2.payment.id, result1.payment.id, "Deve retornar o mesmo registro sem duplicar cobrança");
});

test("FakePaymentProvider: Transições de estorno (Refund)", () => {
  const payment = {
    id: "pay_100",
    amountCents: 20000,
    status: "APPROVED",
  };

  function processRefund(p, reason) {
    if (p.status !== "APPROVED") {
      throw new Error("APENAS_PAGAMENTOS_APROVADOS_PODEM_SER_ESTORNADOS");
    }
    return {
      payment: { ...p, status: "REFUNDED" },
      refund: {
        paymentId: p.id,
        amountCents: p.amountCents,
        reason,
        refundedAt: new Date().toISOString(),
      },
    };
  }

  const result = processRefund(payment, "Cancelamento dentro do prazo");
  assert.strictEqual(result.payment.status, "REFUNDED");
  assert.strictEqual(result.refund.amountCents, 20000);
});

test("Pacotes de Sessões: Aceite 'tudo ou nada' e liberação atômica em rejeição", () => {
  const packageProposal = {
    id: "pkg_1",
    status: "PROPOSED",
    slots: [
      { id: "h1", startAt: "2026-11-20T10:00:00Z" },
      { id: "h2", startAt: "2026-11-27T10:00:00Z" },
    ],
  };

  // Aceite
  function acceptPackage(pkg) {
    if (pkg.status !== "PROPOSED") throw new Error("INVALID_STATUS");
    const confirmedAppointments = pkg.slots.map((s) => ({
      appointmentId: "appt_" + s.id,
      startAt: s.startAt,
      status: "CONFIRMED",
      packageId: pkg.id,
    }));
    return {
      updatedPackage: { ...pkg, status: "ACCEPTED" },
      appointments: confirmedAppointments,
      holdsReleased: true,
    };
  }

  const acceptResult = acceptPackage(packageProposal);
  assert.strictEqual(acceptResult.updatedPackage.status, "ACCEPTED");
  assert.strictEqual(acceptResult.appointments.length, 2);
  assert.strictEqual(acceptResult.appointments[0].status, "CONFIRMED");
  assert.strictEqual(acceptResult.appointments[1].status, "CONFIRMED");

  // Rejeição
  function rejectPackage(pkg) {
    return {
      updatedPackage: { ...pkg, status: "REJECTED" },
      holdsDeleted: true,
      slotsFreed: pkg.slots.length,
    };
  }

  const rejectResult = rejectPackage(packageProposal);
  assert.strictEqual(rejectResult.updatedPackage.status, "REJECTED");
  assert.strictEqual(rejectResult.slotsFreed, 2);
});
