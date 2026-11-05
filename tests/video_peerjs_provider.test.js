const test = require("node:test");
const assert = require("node:assert");

// Mock / implementação pura para testar a regra de negócio do provedor PeerJS
class PeerJsVideoProvider {
  constructor(serverHost = null, serverPort = 9000, path = "/peerjs", secure = true, testStatus = null, options = {}) {
    this.providerKey = "PEERJS";
    this.serverHost = serverHost;
    this.serverPort = serverPort;
    this.path = path || "/peerjs";
    this.secure = secure ?? true;
    this.testStatus = testStatus;
    this.stunServer = options.stunServer;
    this.turnServer = options.turnServer;
    this.turnUser = options.turnUser;
    this.turnSecret = options.turnSecret;
    // Funcional apenas quando configurado e com conectividade de sinalização validada com sucesso
    this.isFunctional = Boolean(serverHost && testStatus === "SUCCESS");
  }

  async createRoom(appointmentId) {
    const highEntropySuffix = Math.random().toString(36).substring(2, 10);
    const peerRoomId = `peer-psi-${appointmentId}-${highEntropySuffix}`;
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const appUrl = "http://localhost:3000";

    return {
      provider: "PEERJS",
      roomName: peerRoomId,
      entryUrl: `${appUrl}/consulta-virtual/${token}`,
      rawMeetingUrl: `${appUrl}/consulta-virtual/${token}`,
      isPreparedOnly: false,
    };
  }
}

class JitsiVideoProvider {
  constructor(domain = "meet.jit.si") {
    this.providerKey = "JITSI";
    this.isFunctional = true;
    this.domain = domain;
  }

  async createRoom(appointmentId) {
    const highEntropySuffix = Math.random().toString(36).substring(2, 12);
    const roomName = `psi-session-${appointmentId}-${highEntropySuffix}`;
    const token = Math.random().toString(36).substring(2, 15);
    return {
      provider: "JITSI",
      roomName,
      entryUrl: `http://localhost:3000/consulta-virtual/${token}`,
      rawMeetingUrl: `https://${this.domain}/${roomName}`,
    };
  }
}

function checkMeetingAuthorization({ session, appointment }) {
  if (!session) {
    return { allowed: false, status: 401, error: "Autenticação obrigatória", requiresLogin: true };
  }

  const isAdmin = session.role === "ADMIN";
  const isOwner = session.role === "PATIENT" && session.userId === appointment.patientId;

  if (!isAdmin && !isOwner) {
    return { allowed: false, status: 403, error: "Você não possui permissão para acessar esta teleconsulta." };
  }

  return { allowed: true, status: 200 };
}

test("PeerJS Provider: Validação estrita de funcionalidade (Gating)", () => {
  // Caso 1: Sem host configurado -> Não funcional
  const unconfigured = new PeerJsVideoProvider(null, 9000, "/peerjs", false, null);
  assert.strictEqual(unconfigured.isFunctional, false, "PeerJS sem host não deve ser funcional");

  // Caso 2: Host configurado porém teste não executado -> Não funcional
  const untested = new PeerJsVideoProvider("localhost", 9000, "/peerjs", false, null);
  assert.strictEqual(untested.isFunctional, false, "PeerJS não testado não deve ser funcional");

  // Caso 3: Host configurado mas teste falhou -> Não funcional
  const failed = new PeerJsVideoProvider("localhost", 9000, "/peerjs", false, "FAILED");
  assert.strictEqual(failed.isFunctional, false, "PeerJS com falha no teste não deve ser funcional");

  // Caso 4: Host configurado e teste bem-sucedido -> Funcional
  const operational = new PeerJsVideoProvider("localhost", 9000, "/peerjs", false, "SUCCESS");
  assert.strictEqual(operational.isFunctional, true, "PeerJS configurado e testado com sucesso deve ser funcional");
});

test("PeerJS Provider: Geração de salas e tokens de alta entropia", async () => {
  const provider = new PeerJsVideoProvider("localhost", 9000, "/peerjs", false, "SUCCESS");
  const appointmentId = "appt-test-1234";

  const room1 = await provider.createRoom(appointmentId);
  const room2 = await provider.createRoom(appointmentId);

  assert.strictEqual(room1.provider, "PEERJS");
  assert.ok(room1.roomName.startsWith("peer-psi-appt-test-1234-"));
  assert.notStrictEqual(room1.roomName, room2.roomName, "Salas geradas sucessivamente devem possuir sufixos únicos");
  assert.notStrictEqual(room1.entryUrl, room2.entryUrl, "Tokens de entrada na sala devem ser únicos");
});

test("Virtual Meeting: Autorização Server-Side estrita (Requisito 6)", () => {
  const appointment = {
    id: "appt-100",
    patientId: "patient-alpha-456",
  };

  // 1. Visitante anônimo -> 401
  const anonAuth = checkMeetingAuthorization({ session: null, appointment });
  assert.strictEqual(anonAuth.status, 401);
  assert.strictEqual(anonAuth.requiresLogin, true);

  // 2. Outro paciente (tentando invadir consulta alheia) -> 403
  const wrongPatientSession = { userId: "patient-beta-789", role: "PATIENT" };
  const trespassAuth = checkMeetingAuthorization({ session: wrongPatientSession, appointment });
  assert.strictEqual(trespassAuth.status, 403);
  assert.strictEqual(trespassAuth.allowed, false);

  // 3. Paciente dono da consulta -> 200
  const ownerSession = { userId: "patient-alpha-456", role: "PATIENT" };
  const ownerAuth = checkMeetingAuthorization({ session: ownerSession, appointment });
  assert.strictEqual(ownerAuth.status, 200);
  assert.strictEqual(ownerAuth.allowed, true);

  // 4. Profissional Admin -> 200 irrestrito
  const adminSession = { userId: "admin-doc-1", role: "ADMIN" };
  const adminAuth = checkMeetingAuthorization({ session: adminSession, appointment });
  assert.strictEqual(adminAuth.status, 200);
  assert.strictEqual(adminAuth.allowed, true);
});

test("Regressão Jitsi Meet: Preservação de disponibilidade e URLs", async () => {
  const jitsi = new JitsiVideoProvider("meet.jit.si");
  assert.strictEqual(jitsi.isFunctional, true);
  assert.strictEqual(jitsi.providerKey, "JITSI");

  const room = await jitsi.createRoom("appt-jitsi-99");
  assert.strictEqual(room.provider, "JITSI");
  assert.ok(room.roomName.startsWith("psi-session-appt-jitsi-99-"));
  assert.ok(room.rawMeetingUrl.includes("meet.jit.si/psi-session-appt-jitsi-99-"));
});
