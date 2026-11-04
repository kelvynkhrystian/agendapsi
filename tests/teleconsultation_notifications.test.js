const test = require("node:test");
const assert = require("node:assert");

function checkMeetingAccess({ userRole, startAt, endAt, now = new Date() }) {
  if (userRole === "ADMIN") {
    return { canEnter: true, isEarly: false, minutesUntilOpen: 0 };
  }

  const openTime = new Date(startAt.getTime() - 15 * 60000);

  if (now < openTime) {
    const diffMs = openTime.getTime() - now.getTime();
    const minutesRemaining = Math.ceil(diffMs / 60000);
    return { canEnter: false, isEarly: true, minutesUntilOpen: minutesRemaining };
  }

  const closeTime = new Date(endAt.getTime() + 120 * 60000);
  if (now > closeTime) {
    return { canEnter: false, isEarly: false, minutesUntilOpen: 0 };
  }

  return { canEnter: true, isEarly: false, minutesUntilOpen: 0 };
}

test("Teleconsulta: Gating de acesso - Paciente liberado 15 minutos antes e Admin irrestrito", () => {
  const startAt = new Date("2026-11-20T15:00:00Z");
  const endAt = new Date("2026-11-20T16:00:00Z");

  // Caso 1: Paciente chega 30 minutos antes (14:30)
  const patientEarlyTime = new Date("2026-11-20T14:30:00Z");
  const accessEarly = checkMeetingAccess({
    userRole: "PATIENT",
    startAt,
    endAt,
    now: patientEarlyTime,
  });
  assert.strictEqual(accessEarly.canEnter, false, "Paciente com 30min de antecedência não deve entrar ainda");
  assert.strictEqual(accessEarly.isEarly, true);
  assert.strictEqual(accessEarly.minutesUntilOpen, 15);

  // Caso 2: Paciente chega 10 minutos antes (14:50) -> DENTRO DA JANELA DE 15 MIN
  const patientValidTime = new Date("2026-11-20T14:50:00Z");
  const accessValid = checkMeetingAccess({
    userRole: "PATIENT",
    startAt,
    endAt,
    now: patientValidTime,
  });
  assert.strictEqual(accessValid.canEnter, true, "Paciente dentro da janela de 15min deve ter acesso liberado");

  // Caso 3: Admin entra a qualquer momento
  const adminAccess = checkMeetingAccess({
    userRole: "ADMIN",
    startAt,
    endAt,
    now: patientEarlyTime,
  });
  assert.strictEqual(adminAccess.canEnter, true, "Profissional (ADMIN) deve ter acesso irrestrito para preparar a sala");
});

test("Notificações: Idempotência de lembretes e status de simulação em ambiente sem provedor", () => {
  const outbox = new Map();

  function triggerReminder(idempotencyKey, recipient, hasRealCredentials) {
    if (outbox.has(idempotencyKey)) {
      return { duplicate: true, record: outbox.get(idempotencyKey) };
    }

    const record = {
      id: "deliv_" + Math.random().toString(36).substring(2, 8),
      recipient,
      idempotencyKey,
      status: hasRealCredentials ? "DELIVERED" : "SIMULATED",
      simulated: !hasRealCredentials,
    };
    outbox.set(idempotencyKey, record);
    return { duplicate: false, record };
  }

  // Primeiro disparo em ambiente sem credenciais configuradas
  const key = "reminder_24h_appt_999";
  const run1 = triggerReminder(key, "11999999999", false);
  assert.strictEqual(run1.duplicate, false);
  assert.strictEqual(run1.record.status, "SIMULATED", "Sem provedor real configurado, status DEVE ser SIMULATED");
  assert.strictEqual(run1.record.simulated, true);

  // Segundo disparo da rotina cron (deve suprimir duplicidade)
  const run2 = triggerReminder(key, "11999999999", false);
  assert.strictEqual(run2.duplicate, true, "Execução subsequente do cron deve suprimir envio duplicado");
  assert.strictEqual(run2.record.id, run1.record.id);
});
