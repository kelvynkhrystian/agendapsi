const test = require("node:test");
const assert = require("node:assert");

test("Identidade do Paciente: Validação de menor de idade e responsável legal", () => {
  // Paciente Menor
  const patientMinor = {
    fullName: "Enzo Gabriel",
    birthDate: "2015-04-10",
    isMinor: true,
  };

  const calculateAge = (birthDateStr) => {
    const birth = new Date(birthDateStr);
    const ageDiff = Date.now() - birth.getTime();
    return Math.abs(new Date(ageDiff).getUTCFullYear() - 1970);
  };

  const age = calculateAge(patientMinor.birthDate);
  assert.ok(age < 18, "Idade deve ser menor que 18");

  // Regra de validação de responsável
  const validateGuardian = (isMinor, guardian) => {
    if (isMinor) {
      if (!guardian || !guardian.fullName || !guardian.cpf || !guardian.phone) {
        return false;
      }
    }
    return true;
  };

  assert.strictEqual(validateGuardian(true, null), false, "Menor sem responsável deve ser rejeitado");
  assert.strictEqual(
    validateGuardian(true, { fullName: "Carla Mãe", cpf: "12345678900", phone: "11999999999" }),
    true,
    "Menor com responsável válido deve ser aceito"
  );
});

test("Fluxo de Alteração de Dados Sensíveis: Preservação de valores até aprovação", () => {
  const patient = {
    id: "p1",
    fullName: "Carlos Silva Antigo",
    cpf: "11122233344",
  };

  const changeRequest = {
    id: "req1",
    patientId: "p1",
    field: "fullName",
    oldValue: patient.fullName,
    newValue: "Carlos Silva Novo",
    status: "PENDING",
  };

  // Enquanto status for PENDING, o paciente mantém o nome antigo
  assert.strictEqual(patient.fullName, "Carlos Silva Antigo");
  assert.strictEqual(changeRequest.status, "PENDING");

  // Quando o Admin aprova, atualiza
  const approveChange = (currentPatient, request) => {
    if (request.status === "APPROVED" && request.field === "fullName") {
      return { ...currentPatient, fullName: request.newValue };
    }
    return currentPatient;
  };

  const updatedPatient = approveChange(patient, { ...changeRequest, status: "APPROVED" });
  assert.strictEqual(updatedPatient.fullName, "Carlos Silva Novo");
});
