const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

test("1. Rota Dedicada de Novo Paciente (/admin/pacientes/novo)", () => {
  const filePath = path.join(__dirname, "../src/app/admin/pacientes/novo/page.tsx");
  assert.ok(fs.existsSync(filePath), "A página /admin/pacientes/novo/page.tsx deve existir");

  const content = fs.readFileSync(filePath, "utf8");

  // Botão/Link de retorno visível
  assert.ok(
    content.includes("Voltar para Pacientes") || content.includes("Voltar"),
    "A página deve ter botão de navegação de retorno visível"
  );
  assert.ok(
    content.includes('href="/admin/pacientes"'),
    "O link de retorno deve apontar para /admin/pacientes"
  );

  // Breadcrumbs e Título de Página
  assert.ok(
    content.includes("Cadastro de Novo Paciente") || content.includes("Cadastrar Novo Paciente"),
    "Deve ter título de página claro"
  );
  assert.ok(content.includes("Dados Pessoais"), "Deve conter seção de Dados Pessoais");
  assert.ok(
    content.includes("Contato e Localização") || content.includes("Contato & Localização"),
    "Deve conter seção de Contato e Localização"
  );
  assert.ok(
    content.includes("Proteção e Atendimento de Menor de Idade") || content.includes("Proteção ao Menor"),
    "Deve conter seção de Proteção ao Menor de Idade"
  );

  // Alerta com senha temporária gerada e cópia em um clique
  assert.ok(
    content.includes("Paciente Cadastrado com Sucesso"),
    "Deve apresentar tela de sucesso após criação"
  );
  assert.ok(
    content.includes("tempPassword") || content.includes("createdPatient"),
    "Deve exibir a senha temporária gerada"
  );
  assert.ok(
    content.includes("navigator.clipboard.writeText"),
    "Deve conter botão de copiar credenciais"
  );

  // Prevenção de perda de dados / mudanças não salvas
  assert.ok(
    content.includes("showExitConfirm") || content.includes("isDirty"),
    "Deve proteger formulário com alerta de alterações não salvas"
  );
});

test("2. Rota Dedicada de Edição de Paciente (/admin/pacientes/[id]/editar)", () => {
  const filePath = path.join(__dirname, "../src/app/admin/pacientes/[id]/editar/page.tsx");
  assert.ok(fs.existsSync(filePath), "A página /admin/pacientes/[id]/editar/page.tsx deve existir");

  const content = fs.readFileSync(filePath, "utf8");

  // Botão de retorno para a ficha do paciente
  assert.ok(
    content.includes("Voltar para a Ficha do Paciente") || content.includes("Voltar"),
    "A página deve ter link de retorno para a ficha do paciente"
  );
  assert.ok(
    content.includes("/admin/pacientes/"),
    "O link de retorno deve apontar de volta para a ficha do paciente"
  );

  // Título e seções
  assert.ok(
    content.includes("Editar Cadastro"),
    "Deve ter cabeçalho de edição claro"
  );
  assert.ok(content.includes("Dados Pessoais"), "Deve conter seção de Dados Pessoais");
  assert.ok(
    content.includes("Canais de Contato") || content.includes("Contato"),
    "Deve conter seção de Contato"
  );
  assert.ok(content.includes("Situação Cadastral"), "Deve conter seção de Situação Cadastral");

  // Chamada de atualização para a API
  assert.ok(
    content.includes("/api/patients/") && content.includes('"PATCH"'),
    "Deve enviar requisição PATCH para /api/patients/[id]"
  );

  // Prevenção de perda de dados
  assert.ok(
    content.includes("showExitConfirm") || content.includes("isDirty"),
    "Deve proteger formulário com alerta de alterações não salvas"
  );
});

test("3. Listagem de Pacientes (/admin/pacientes) abre página dedicada em vez de modal pesado", () => {
  const filePath = path.join(__dirname, "../src/app/admin/pacientes/page.tsx");
  const content = fs.readFileSync(filePath, "utf8");

  // Deve linkar para /admin/pacientes/novo
  assert.ok(
    content.includes('href="/admin/pacientes/novo"'),
    "O botão Cadastrar Paciente deve navegar para /admin/pacientes/novo"
  );

  // Não deve conter o modal inline grande de cadastro de paciente
  assert.ok(
    !content.includes('title="Cadastrar Novo Paciente"'),
    "Não deve renderizar modal grande de cadastro na listagem"
  );
});

test("4. Ficha do Paciente (/admin/pacientes/[id]) disponibiliza acesso à página de edição", () => {
  const filePath = path.join(__dirname, "../src/app/admin/pacientes/[id]/page.tsx");
  const content = fs.readFileSync(filePath, "utf8");

  // Deve linkar para a rota de edição
  assert.ok(
    content.includes("/admin/pacientes/${patient.id}/editar") ||
    content.includes("/admin/pacientes/") && content.includes("/editar"),
    "A ficha do paciente deve ter atalhos para a página de edição dedicada"
  );
  assert.ok(
    content.includes("Editar Cadastro"),
    "Deve ter botão com rótulo 'Editar Cadastro'"
  );
});

test("5. Diálogos de confirmação rápidos e seguros são preservados como modal", () => {
  const patientDetailContent = fs.readFileSync(
    path.join(__dirname, "../src/app/admin/pacientes/[id]/page.tsx"),
    "utf8"
  );

  // Confirmação de reenvio de anamnese é uma decisão simples (sim/não), deve permanecer modal
  assert.ok(
    patientDetailContent.includes("Solicitar Novo Preenchimento de Anamnese"),
    "Diálogos de confirmação atômica (sim/não) devem ser preservados como modal"
  );
});
