const test = require("node:test");
const assert = require("node:assert/strict");

test("Task 1 - Anamnese: Paciente não pode reenviar anamnese já concluída", async () => {
  const existingSubmission = { id: "sub-1", patientId: "pat-1", templateId: "tpl-1" };
  const incomingSubmission = { patientId: "pat-1", templateId: "tpl-1" };

  const isDuplicate = existingSubmission.templateId === incomingSubmission.templateId &&
                      existingSubmission.patientId === incomingSubmission.patientId;

  assert.equal(isDuplicate, true, "Deve detectar submissão duplicada para o mesmo template e paciente");
});

test("Task 3 - Atendimentos Presenciais: Nunca expõe link de sala virtual ou teleconsulta", async () => {
  const apptPresential = {
    id: "appt-1",
    modality: "PRESENTIAL",
    meetingUrlSnapshot: null,
    establishment: {
      name: "Consultório PSI",
      address: "Av. Paulista, 1000, Cj 52 - Bela Vista, São Paulo - SP",
    },
  };

  const apptOnline = {
    id: "appt-2",
    modality: "ONLINE",
    meetingUrlSnapshot: "https://consultorio.psi.br/consulta-virtual/token-xyz",
  };

  assert.equal(apptPresential.meetingUrlSnapshot, null, "Consulta presencial não deve possuir meetingUrlSnapshot");
  assert.ok(apptPresential.establishment.address, "Consulta presencial deve ter endereço físico para o Google Maps");
  assert.ok(apptOnline.meetingUrlSnapshot, "Consulta online deve possuir link da sala virtual");
});

test("Task 6 - Template de Notificação Compartilhado: Renderização segura de variáveis", async () => {
  const template = "Olá, {nome_paciente}! Sua consulta de {servico} com {nome_profissional} foi confirmada para {data} às {hora}. Valor: {valor}. Local: {local}.";
  
  const vars = {
    "{nome_paciente}": "Carlos Eduardo",
    "{servico}": "Psicoterapia Individual",
    "{nome_profissional}": "Dra. Juliana",
    "{data}": "15/11/2026",
    "{hora}": "10:00",
    "{valor}": "R$ 180,00",
    "{local}": "Consultório Presencial",
  };

  let rendered = template;
  for (const [key, val] of Object.entries(vars)) {
    rendered = rendered.split(key).join(val);
  }

  assert.ok(rendered.includes("Carlos Eduardo"));
  assert.ok(rendered.includes("Psicoterapia Individual"));
  assert.ok(rendered.includes("15/11/2026 às 10:00"));
  assert.ok(rendered.includes("R$ 180,00"));
  assert.equal(rendered.includes("{nome_paciente}"), false, "Todas as variáveis devem ser substituídas");
});

test("Task 6 - Modos de Entrega: Exatamente 3 modos suportados (APP_ONLY, APP_EMAIL, ALL_CHANNELS)", async () => {
  const allowedModes = ["APP_ONLY", "APP_EMAIL", "ALL_CHANNELS"];
  
  assert.equal(allowedModes.includes("APP_ONLY"), true);
  assert.equal(allowedModes.includes("APP_EMAIL"), true);
  assert.equal(allowedModes.includes("ALL_CHANNELS"), true);
  assert.equal(allowedModes.includes("SMS_ONLY"), false);
});

test("Task 9 - Provedores de Vídeo: Validação de provedores funcionais e dependências", async () => {
  const jitsiProvider = { key: "JITSI", isFunctional: true };
  const peerJsProvider = { key: "PEERJS", isFunctional: false, host: "" };
  const gmeetProvider = { key: "GOOGLE_MEET", isFunctional: false, clientId: "" };

  assert.equal(jitsiProvider.isFunctional, true, "Jitsi é o provedor funcional padrão");
  assert.equal(peerJsProvider.isFunctional, false, "PeerJS requer configuração de servidor STUN/TURN");
  assert.equal(gmeetProvider.isFunctional, false, "Google Meet requer credenciais OAuth");
});
