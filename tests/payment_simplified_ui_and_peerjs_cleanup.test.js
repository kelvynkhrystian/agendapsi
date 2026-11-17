const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("1. Visão Geral de Pagamentos: 4 Cards Compactos com Toggle e Status", () => {
  const tabPath = path.join(process.cwd(), "src", "components", "integrations", "payments-tab.tsx");
  assert.ok(fs.existsSync(tabPath), "payments-tab.tsx deve existir");

  const src = fs.readFileSync(tabPath, "utf-8");

  // Presença dos 4 provedores no array GATEWAY_ORDER
  assert.ok(src.includes("MERCADO_PAGO"), "Deve listar Mercado Pago");
  assert.ok(src.includes("ASAAS"), "Deve listar Asaas");
  assert.ok(src.includes("PAGBANK"), "Deve listar PagBank");
  assert.ok(src.includes("IN_PERSON"), "Deve listar Pagamento Presencial");

  // Reuso do ToggleSwitch animado
  assert.ok(src.includes("ToggleSwitch"), "Deve importar e renderizar ToggleSwitch");
  assert.ok(src.includes("e.stopPropagation()"), "Clique no toggle não deve disparar navegação do card");

  // Indicadores exigidos no card
  assert.ok(src.includes("IntegrationStatusBadge"), "Deve renderizar IntegrationStatusBadge com status real");
  assert.ok(src.includes("isSandbox"), "Deve exibir indicador de Sandbox / Produção quando aplicável");
  assert.ok(src.includes("shortDesc"), "Deve exibir descrição curta");
  assert.ok(src.includes("/admin/integracoes/pagamentos/"), "Card deve navegar para página dedicada de configuração");
});

test("2. Toggle Switch: Idêntico ao de Configurações → Horários", () => {
  const togglePath = path.join(process.cwd(), "src", "components", "ui", "toggle-switch.tsx");
  assert.ok(fs.existsSync(togglePath), "toggle-switch.tsx deve existir");

  const src = fs.readFileSync(togglePath, "utf-8");

  // Dimensões, transição e cores idênticas às de Configurações -> Horários
  assert.ok(src.includes("h-6 w-11"), "Dimensão externa deve ser h-6 w-11");
  assert.ok(src.includes("rounded-full"), "Deve ter bordas arredondadas rounded-full");
  assert.ok(src.includes("h-5 w-5"), "Círculo interno deve ter h-5 w-5");
  assert.ok(src.includes("translate-x-5"), "Transição ativo deve mover translate-x-5");
  assert.ok(src.includes("translate-x-0"), "Transição inativo deve ser translate-x-0");
  assert.ok(src.includes("bg-[var(--primary"), "Cor ativo deve usar var(--primary)");
  assert.ok(src.includes("bg-[#D4D4D4]"), "Cor inativo deve usar #D4D4D4");
  assert.ok(src.includes("role=\"switch\""), "Acessibilidade: role switch");
  assert.ok(src.includes("aria-checked"), "Acessibilidade: aria-checked");
});

test("3. Páginas Dedicadas de Configuração por Provedor com Botão Voltar", () => {
  const formCompPath = path.join(process.cwd(), "src", "components", "integrations", "payment-provider-form.tsx");
  assert.ok(fs.existsSync(formCompPath), "payment-provider-form.tsx deve existir");

  const formSrc = fs.readFileSync(formCompPath, "utf-8");

  // Slugs e rotas corretas
  assert.ok(formSrc.includes("mercadopago"), "Deve mapear slug mercadopago");
  assert.ok(formSrc.includes("asaas"), "Deve mapear slug asaas");
  assert.ok(formSrc.includes("pagbank"), "Deve mapear slug pagbank");
  assert.ok(formSrc.includes("presencial"), "Deve mapear slug presencial");

  // Botão Voltar
  assert.ok(formSrc.includes("Voltar para Integrações de Pagamentos"), "Deve conter botão Voltar para visão geral");
  assert.ok(formSrc.includes("/admin/integracoes?tab=pagamentos"), "Link de retorno deve apontar para a aba de pagamentos");

  // Campos essenciais preservados
  assert.ok(formSrc.includes("handleTestConnection"), "Deve conter botão de teste de conexão");
  assert.ok(formSrc.includes("webhookUrl"), "Deve exibir URL do webhook");
  assert.ok(formSrc.includes("handleSave"), "Deve conter ação de salvar");

  // Rota dinâmica no App Router
  const routePagePath = path.join(process.cwd(), "src", "app", "admin", "integracoes", "pagamentos", "[provider]", "page.tsx");
  assert.ok(fs.existsSync(routePagePath), "[provider]/page.tsx deve existir");
});

test("4. Provedor Online Padrão: Controle de Escolha Única (Single-Choice)", () => {
  const tabPath = path.join(process.cwd(), "src", "components", "integrations", "payments-tab.tsx");
  const tabSrc = fs.readFileSync(tabPath, "utf-8");

  // Controle de escolha única para Gateway Padrão
  assert.ok(tabSrc.includes("Gateway Online Padrão"), "Deve conter seção de Gateway Online Padrão");
  assert.ok(tabSrc.includes("handleSetDefaultGateway"), "Deve conter handler handleSetDefaultGateway");
  assert.ok(tabSrc.includes("isDefault: true"), "Deve enviar isDefault true");

  // Proteção: gateway não configurado não deve ser exposto a pacientes
  const registryPath = path.join(process.cwd(), "src", "lib", "payments", "registry.ts");
  const registrySrc = fs.readFileSync(registryPath, "utf-8");
  assert.ok(registrySrc.includes("getActivePaymentOptions"), "Deve validar gateways ativos");
  assert.ok(registrySrc.includes("healthStatus: { not: \"NOT_CONFIGURED\" }"), "Não deve disponibilizar gateway sem credenciais para pacientes");
});

test("5. Remoção do Bloco de Marketing do PeerJS em Configurações → Consultas Virtuais", () => {
  const configPagePath = path.join(process.cwd(), "src", "app", "admin", "configuracoes", "page.tsx");
  const configSrc = fs.readFileSync(configPagePath, "utf-8");

  // O bloco de marketing explicativo deve ter sido removido
  assert.ok(!configSrc.includes("Zero configuração manual:"), "Não deve conter texto promocional 'Zero configuração manual'");
  assert.ok(!configSrc.includes("Privacidade clínica:"), "Não deve conter texto promocional 'Privacidade clínica'");
  assert.ok(!configSrc.includes("Navegador nativo:"), "Não deve conter texto promocional 'Navegador nativo'");

  // Mas os elementos funcionais obrigatórios continuam preservados
  assert.ok(configSrc.includes("PSI Teleconsulta"), "Deve manter o nome do provedor PSI Teleconsulta");
  assert.ok(configSrc.includes("handleTestPeerJs"), "Deve manter o botão de teste de sinalização PeerJS");
  assert.ok(configSrc.includes("peerJsTestFeedback"), "Deve manter o status de sinalização");
  assert.ok(configSrc.includes("Definir como Padrão"), "Deve manter a seleção de provedor");
});
