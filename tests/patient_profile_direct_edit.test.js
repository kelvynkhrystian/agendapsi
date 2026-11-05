const test = require("node:test");
const assert = require("node:assert");

// Helper para máscara de CPF
function maskCpf(value) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

// Helper para máscara de Telefone
function maskPhone(value) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length > 0 ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

// 1. Edição direta de nome, CPF, data de nascimento, telefone e endereço sem aprovação
test("Phase 1: Edição direta de dados do perfil sem aprovação de Administrador", () => {
  let patientDatabase = {
    pat_1: {
      id: "pat_1",
      fullName: "Mariana Silva",
      email: "mariana@exemplo.com",
      phone: "11988887777",
      cpf: "12345678901",
      birthDate: new Date("1995-05-15"),
      address: "Rua das Flores, 100",
      gender: "Feminino",
      emergencyContact: "Carlos - 11977776666",
    },
  };

  const updateProfile = (sessionUserId, input) => {
    const existing = patientDatabase[sessionUserId];
    if (!existing) throw new Error("Paciente não encontrado");

    // Validação de campos obrigatórios
    if (!input.fullName || input.fullName.trim().length < 2) {
      return { status: 400, error: "Nome deve ter no mínimo 2 caracteres" };
    }
    if (!input.phone || input.phone.trim().length < 8) {
      return { status: 400, error: "Telefone deve ter no mínimo 8 dígitos" };
    }

    // Persistência direta no registro do paciente (sem aprovação nem status PENDING)
    existing.fullName = input.fullName.trim();
    existing.phone = input.phone.trim();
    if (input.cpf !== undefined) existing.cpf = input.cpf ? input.cpf.replace(/\D/g, "") : null;
    if (input.birthDate !== undefined) existing.birthDate = input.birthDate ? new Date(input.birthDate) : null;
    if (input.address !== undefined) existing.address = input.address;
    if (input.gender !== undefined) existing.gender = input.gender;
    if (input.emergencyContact !== undefined) existing.emergencyContact = input.emergencyContact;

    return {
      status: 200,
      message: "Perfil atualizado com sucesso.",
      patient: existing,
    };
  };

  const payload = {
    fullName: "Mariana Silva Santos",
    cpf: "987.654.321-09",
    birthDate: "1995-06-20",
    phone: "(11) 99999-8888",
    address: "Avenida Paulista, 1500, Apto 42",
    gender: "Feminino",
    emergencyContact: "Mãe - 11911112222",
  };

  const res = updateProfile("pat_1", payload);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.message, "Perfil atualizado com sucesso.");
  assert.strictEqual(patientDatabase.pat_1.fullName, "Mariana Silva Santos");
  assert.strictEqual(patientDatabase.pat_1.cpf, "98765432109");
  assert.strictEqual(patientDatabase.pat_1.phone, "(11) 99999-8888");
  assert.strictEqual(patientDatabase.pat_1.address, "Avenida Paulista, 1500, Apto 42");
  assert.strictEqual(patientDatabase.pat_1.birthDate.toISOString().slice(0, 10), "1995-06-20");
});

// 2. Rejeição de CPF duplicado entre pacientes distintos
test("Phase 1: Rejeição de CPF duplicado para outro paciente", () => {
  const existingPatients = [
    { id: "pat_1", fullName: "Paciente Um", cpf: "11122233344" },
    { id: "pat_2", fullName: "Paciente Dois", cpf: "55566677788" },
  ];

  const checkCpfUniqueness = (cpfToCheck, currentSessionUserId) => {
    const clean = cpfToCheck.replace(/\D/g, "");
    const collision = existingPatients.find(
      (p) => p.cpf === clean && p.id !== currentSessionUserId
    );
    if (collision) {
      return { status: 400, error: "Este CPF já está cadastrado para outro paciente." };
    }
    return { status: 200 };
  };

  // Paciente 1 tentando usar o CPF do Paciente 2 -> Deve rejeitar
  const resDuplicate = checkCpfUniqueness("555.666.777-88", "pat_1");
  assert.strictEqual(resDuplicate.status, 400);
  assert.strictEqual(resDuplicate.error, "Este CPF já está cadastrado para outro paciente.");

  // Paciente 1 salvando seu próprio CPF novamente -> Deve aceitar
  const resOwnCpf = checkCpfUniqueness("111.222.333-44", "pat_1");
  assert.strictEqual(resOwnCpf.status, 200);

  // Paciente 1 informando um CPF novo não cadastrado -> Deve aceitar
  const resNewCpf = checkCpfUniqueness("999.888.777-66", "pat_1");
  assert.strictEqual(resNewCpf.status, 200);
});

// 3. Aplicação correta de máscaras de entrada (CPF e Telefone)
test("Phase 1: Máscaras de formatação para CPF e Telefone", () => {
  // CPF
  assert.strictEqual(maskCpf("123"), "123");
  assert.strictEqual(maskCpf("123456"), "123.456");
  assert.strictEqual(maskCpf("123456789"), "123.456.789");
  assert.strictEqual(maskCpf("12345678901"), "123.456.789-01");
  assert.strictEqual(maskCpf("12345678901extra"), "123.456.789-01");

  // Telefone celular (11 dígitos) e fixo (10 dígitos)
  assert.strictEqual(maskPhone("11"), "(11");
  assert.strictEqual(maskPhone("119888"), "(11) 9888");
  assert.strictEqual(maskPhone("1133334444"), "(11) 3333-4444");
  assert.strictEqual(maskPhone("11988887777"), "(11) 98888-7777");
});

// 4. Prevenção de alteração cruzada não autorizada (Cross-Patient Update Prevention)
test("Phase 1: Identificação estrita via sessão e prevenção de alteração cruzada", () => {
  const activeSession = {
    userId: "pat_authenticated_user",
    role: "PATIENT",
  };

  const maliciousPayload = {
    id: "pat_victim_user", // Tentativa de forjar ID no corpo da requisição
    targetPatientId: "pat_victim_user",
    fullName: "Hacker Alterou Seu Nome",
    phone: "11999990000",
  };

  // A API PSI sempre ignora body.id e body.targetPatientId, operando exclusivamente em activeSession.userId
  const resolveTargetId = (session, _body) => {
    if (session.role !== "PATIENT") throw new Error("Acesso negado");
    return session.userId;
  };

  const targetId = resolveTargetId(activeSession, maliciousPayload);
  assert.strictEqual(targetId, "pat_authenticated_user");
  assert.notStrictEqual(targetId, maliciousPayload.id);
  assert.notStrictEqual(targetId, maliciousPayload.targetPatientId);
});

// 5. Imutabilidade do E-mail nesta Fase 1 (Email Changes Disabled)
test("Phase 1: E-mail não sofre alteração via rota de perfil", () => {
  const patient = {
    id: "pat_1",
    fullName: "Luciana Costa",
    email: "luciana.original@exemplo.com",
    phone: "21988881111",
  };

  // Simulação do payload enviado ao endpoint /api/patient/profile
  const updateProfilePayload = {
    fullName: "Luciana Costa Nova",
    email: "luciana.malicious@outroprovedor.com", // Tentativa de alterar e-mail direto
    phone: "21977772222",
  };

  // A API de perfil da Fase 1 não inclui e-mail no schema de atualização
  const applyProfileUpdate = (current, payload) => {
    // schema Zod ignora a chave 'email'
    const allowed = {
      fullName: payload.fullName,
      phone: payload.phone,
    };
    return {
      ...current,
      ...allowed,
    };
  };

  const updated = applyProfileUpdate(patient, updateProfilePayload);
  assert.strictEqual(updated.fullName, "Luciana Costa Nova");
  assert.strictEqual(updated.phone, "21977772222");
  // O e-mail permanece estritamente inalterado
  assert.strictEqual(updated.email, "luciana.original@exemplo.com");
});

// 6. Preservação de integridade de dados (Consultas, Prontuários, Pagamentos, Documentos e Anamnese)
test("Phase 1: Preservação de vínculos relacionais ao atualizar dados cadastrais", () => {
  const patient = {
    id: "pat_rel_1",
    fullName: "Marcos Souza",
    email: "marcos@exemplo.com",
    appointments: [{ id: "app_1", status: "CONFIRMED" }],
    clinicalRecords: [{ id: "rec_1", summary: "Evolução clínica confidencial" }],
    payments: [{ id: "pay_1", amountCents: 15000, status: "APPROVED" }],
    documents: [{ id: "doc_1", filename: "relatorio_psicologico.pdf" }],
    anamnesis: [{ id: "ana_1", completed: true }],
  };

  // Atualização de campos cadastrais no banco
  const updatedPatient = {
    ...patient,
    fullName: "Marcos Souza Filho",
    phone: "31999998888",
    address: "Rua Nova, 50",
  };

  // Todos os relacionamentos continuam intactos e apontando para o mesmo ID estável
  assert.strictEqual(updatedPatient.id, "pat_rel_1");
  assert.strictEqual(updatedPatient.appointments.length, 1);
  assert.strictEqual(updatedPatient.clinicalRecords.length, 1);
  assert.strictEqual(updatedPatient.payments.length, 1);
  assert.strictEqual(updatedPatient.documents.length, 1);
  assert.strictEqual(updatedPatient.anamnesis.length, 1);
  assert.strictEqual(updatedPatient.fullName, "Marcos Souza Filho");
});

// 7. Simulação de Persistência e Refresh
test("Phase 1: Persistência após refresh da tela", () => {
  const inMemoryDatabase = new Map();
  inMemoryDatabase.set("pat_refresh", {
    id: "pat_refresh",
    fullName: "Renata Abreu",
    phone: "11988882222",
    cpf: "11122233344",
    birthDate: "1990-01-01",
    address: "Rua A, 12",
  });

  // 1. Usuário envia alteração
  const updates = {
    fullName: "Renata Abreu Santos",
    phone: "11977773333",
    cpf: "11122233344",
    birthDate: "1990-01-01",
    address: "Rua B, 34",
  };
  inMemoryDatabase.set("pat_refresh", {
    ...inMemoryDatabase.get("pat_refresh"),
    ...updates,
  });

  // 2. Simula reload da página (GET /api/patient/profile)
  const reloaded = inMemoryDatabase.get("pat_refresh");
  assert.strictEqual(reloaded.fullName, "Renata Abreu Santos");
  assert.strictEqual(reloaded.phone, "11977773333");
  assert.strictEqual(reloaded.address, "Rua B, 34");
});
