const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

test("Phase 4 Agenda — 1. Layout Rebrand: Cabeçalho com Mês/Ano, Navegação e Modos de Visão", () => {
  const agendaPath = path.join(process.cwd(), "src", "app", "admin", "agenda", "page.tsx");
  assert.ok(fs.existsSync(agendaPath), "src/app/admin/agenda/page.tsx deve existir");
  const content = fs.readFileSync(agendaPath, "utf-8");

  // Cabeçalho Rebrand-style
  assert.ok(
    content.includes("headerMonthTitle"),
    "Deve conter o título dinâmico com mês e ano no cabeçalho"
  );
  assert.ok(
    content.includes("Semana de"),
    "Deve conter o subtítulo indicando o intervalo da semana ativa"
  );

  // Seletor de visualizações: Semana, Dia, Lista
  assert.ok(content.includes('"week"'), "Deve conter modo de visualização Semana");
  assert.ok(content.includes('"day"'), "Deve conter modo de visualização Dia");
  assert.ok(content.includes('"list"'), "Deve conter modo de visualização Lista");
  assert.ok(content.includes("Semana"), "Deve renderizar o botão 'Semana'");
  assert.ok(content.includes("Dia"), "Deve renderizar o botão 'Dia'");
  assert.ok(content.includes("Lista"), "Deve renderizar o botão 'Lista'");

  // Navegação de datas (Anterior, Hoje, Próximo)
  assert.ok(content.includes("handlePrevWeek"), "Deve conter função de navegação para a semana anterior");
  assert.ok(content.includes("handleNextWeek"), "Deve conter função de navegação para a próxima semana");
  assert.ok(content.includes("handleToday"), "Deve conter função de atalho para o dia de hoje");
  assert.ok(content.includes("Hoje"), "Deve conter botão 'Hoje'");

  // Ação primária de novo agendamento
  assert.ok(content.includes("Novo Agendamento"), "Deve conter botão para criar novo agendamento");
});

test("Phase 4 Agenda — 2. Mini Calendar Lateral Interativo e Resumo da Semana", () => {
  const agendaPath = path.join(process.cwd(), "src", "app", "admin", "agenda", "page.tsx");
  const content = fs.readFileSync(agendaPath, "utf-8");

  // Mini Calendar Header e Navegação
  assert.ok(content.includes("Mini Calendar"), "Deve conter o card de Mini Calendar no estilo Rebrand");
  assert.ok(content.includes("handleMiniCalPrevMonth"), "Deve permitir retroceder o mês no Mini Calendar");
  assert.ok(content.includes("handleMiniCalNextMonth"), "Deve permitir avançar o mês no Mini Calendar");

  // Iniciais dos dias da semana
  assert.ok(
    content.includes('["D", "S", "T", "Q", "Q", "S", "S"]'),
    "Deve renderizar as iniciais dos dias da semana no mini calendário"
  );

  // Matriz de dias e seleção rápida de data
  assert.ok(content.includes("miniCalDays"), "Deve calcular a grade matricial dos dias do mês");
  assert.ok(
    content.includes("handleSelectMiniCalDay"),
    "Deve conter função para selecionar dia no Mini Calendar e sincronizar a agenda principal"
  );

  // Resumo da Semana (KPIs da grade)
  assert.ok(content.includes("Resumo da Semana"), "Deve conter widget de resumo da semana");
  assert.ok(content.includes("Total de Sessões"), "Deve exibir total de sessões na semana");
  assert.ok(content.includes("Confirmadas"), "Deve exibir total de consultas confirmadas");
  assert.ok(content.includes("Teleconsultas Online"), "Deve exibir métrica de teleconsultas");
  assert.ok(content.includes("Presenciais no Consultório"), "Deve exibir métrica de atendimentos presenciais");
});

test("Phase 4 Agenda — 3. Modos de Exibição: Semana, Dia e Lista Cronológica", () => {
  const agendaPath = path.join(process.cwd(), "src", "app", "admin", "agenda", "page.tsx");
  const content = fs.readFileSync(agendaPath, "utf-8");

  // Visualização Semana
  assert.ok(
    content.includes('viewMode === "week"'),
    "Deve condicionar a grade semanal quando viewMode === 'week'"
  );
  assert.ok(
    content.includes("weekDays.map"),
    "Deve iterar pelos 7 dias da semana na visualização semanal"
  );

  // Visualização Dia
  assert.ok(
    content.includes('viewMode === "day"'),
    "Deve renderizar visão detalhada do dia quando viewMode === 'day'"
  );
  assert.ok(
    content.includes("Cronograma detalhado de atendimentos do dia"),
    "Deve conter descrição do cronograma diário"
  );

  // Visualização Lista
  assert.ok(
    content.includes('viewMode === "list"'),
    "Deve renderizar listagem corrida quando viewMode === 'list'"
  );
  assert.ok(
    content.includes("Todas as Consultas da Semana"),
    "Deve conter título da listagem cronológica"
  );

  // EmptyState compartilhado
  assert.ok(
    content.includes("EmptyState"),
    "Deve utilizar o componente unificado EmptyState para períodos sem agendamentos"
  );
});

test("Phase 4 Agenda — 4. Preservação de Regras Clínicas, Encaixe e Transições de Status", () => {
  const agendaPath = path.join(process.cwd(), "src", "app", "admin", "agenda", "page.tsx");
  const content = fs.readFileSync(agendaPath, "utf-8");

  // Criação atômica de agendamento
  assert.ok(
    content.includes("handleCreateAppointment"),
    "Deve conter handler de submissão do agendamento manual"
  );
  assert.ok(
    content.includes("isAdminOverride"),
    "Deve preservar a flag de Encaixe com override de disponibilidade"
  );
  assert.ok(
    content.includes("isFreeOneOff"),
    "Deve preservar a flag de Cortesia pontual (sessão gratuita)"
  );

  // Modal de Detalhes e Transições de Status
  assert.ok(
    content.includes("handleUpdateStatus"),
    "Deve conter handler de transição de status de atendimento"
  );
  assert.ok(content.includes('"COMPLETED"'), "Deve suportar transição para Realizado (COMPLETED)");
  assert.ok(content.includes('"NO_SHOW"'), "Deve suportar transição para Não Comparecimento (NO_SHOW)");
  assert.ok(content.includes('"CANCELLED"'), "Deve suportar transição para Cancelado (CANCELLED)");

  // Sala de Teleconsulta (Jitsi)
  assert.ok(
    content.includes("meetingUrlSnapshot"),
    "Deve verificar e disponibilizar link direto para a sala de teleconsulta"
  );
  assert.ok(
    content.includes("Acessar Sala") || content.includes("Sala Virtual"),
    "Deve fornecer botão de acesso imediato à sala virtual para o profissional"
  );
});

test("Phase 4 Agenda — 5. Tokens de Modo Escuro (Deep Black) e Contraste Acessível", () => {
  const agendaPath = path.join(process.cwd(), "src", "app", "admin", "agenda", "page.tsx");
  const content = fs.readFileSync(agendaPath, "utf-8");

  // Superfícies Deep Black
  assert.ok(content.includes("dark:bg-[#19191C]"), "Deve utilizar card Deep Black (#19191C)");
  assert.ok(content.includes("dark:border-[#303034]"), "Deve utilizar bordas Deep Black (#303034)");
  assert.ok(content.includes("dark:text-[#F5F5F5]"), "Deve utilizar texto de alto contraste (#F5F5F5)");

  // Invariantes estritas de testes anteriores
  assert.ok(
    content.includes("text-[#111827] dark:text-[#F5F5F5] font-bold"),
    "Deve manter string exigida no cabeçalho de dia para compatibilidade com a suite existente"
  );
  assert.ok(
    content.includes("font-bold text-[#111827] dark:text-[#F5F5F5] block text-xs"),
    "Deve manter string exigida no modal de teleconsulta para compatibilidade com a suite existente"
  );
});
