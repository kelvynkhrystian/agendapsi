const test = require("node:test");
const assert = require("node:assert");
const bcrypt = require("bcryptjs");
const { SignJWT, jwtVerify } = require("jose");

const JWT_SECRET = new TextEncoder().encode(
  "psi_dev_jwt_secret_98fbc9823e47a21cd678e012fae84321_secure"
);

test("Autenticação: Hash e verificação de senha com bcrypt", async () => {
  const password = "teste_senha_123";
  const hash = await bcrypt.hash(password, 10);

  assert.strictEqual(typeof hash, "string");
  assert.ok(hash.startsWith("$2"));

  const isValid = await bcrypt.compare(password, hash);
  assert.strictEqual(isValid, true, "A senha correta deve ser validada");

  const isInvalid = await bcrypt.compare("senha_errada", hash);
  assert.strictEqual(isInvalid, false, "Senha incorreta deve ser rejeitada");
});

test("Autenticação: Emissão e validação de JWT com jose", async () => {
  const payload = {
    userId: "admin_123",
    email: "adminpsi@localhost.test",
    name: "Dra. Helena",
    role: "ADMIN",
  };

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(JWT_SECRET);

  assert.strictEqual(typeof token, "string");

  const { payload: verified } = await jwtVerify(token, JWT_SECRET);
  assert.strictEqual(verified.userId, payload.userId);
  assert.strictEqual(verified.role, "ADMIN");
  assert.strictEqual(verified.email, payload.email);
});

test("Segurança: Token com papel PATIENT não deve ter acesso de ADMIN", async () => {
  const patientPayload = {
    userId: "patient_999",
    email: "paciente@localhost.test",
    name: "Carlos Paciente",
    role: "PATIENT",
  };

  const token = await new SignJWT(patientPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(JWT_SECRET);

  const { payload: verified } = await jwtVerify(token, JWT_SECRET);

  // Simula guarda de autorização
  const isAdmin = verified.role === "ADMIN";
  assert.strictEqual(isAdmin, false, "Paciente nunca deve ser autorizado como ADMIN");
});
