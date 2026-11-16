const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

test("1. Modelagem de Dados: GatewayConfiguration, Payment, Refund e PaymentWebhookEvent", async () => {
  const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");
  assert.ok(fs.existsSync(schemaPath), "prisma/schema.prisma deve existir");
  const schemaSrc = fs.readFileSync(schemaPath, "utf-8");

  // GatewayConfiguration
  assert.ok(schemaSrc.includes("model GatewayConfiguration"), "Deve conter model GatewayConfiguration");
  assert.ok(schemaSrc.includes("isSandbox"), "GatewayConfiguration deve conter isSandbox");
  assert.ok(schemaSrc.includes("isDefault"), "GatewayConfiguration deve conter isDefault");
  assert.ok(schemaSrc.includes("environment"), "GatewayConfiguration deve conter environment");
  assert.ok(schemaSrc.includes("webhookUrl"), "GatewayConfiguration deve conter webhookUrl");
  assert.ok(schemaSrc.includes("webhookSecretEncrypted"), "GatewayConfiguration deve conter webhookSecretEncrypted");
  assert.ok(schemaSrc.includes("healthStatus"), "GatewayConfiguration deve conter healthStatus");
  assert.ok(schemaSrc.includes("instructions"), "GatewayConfiguration deve conter instructions");

  // Payment
  assert.ok(schemaSrc.includes("gatewayProvider"), "Payment deve conter gatewayProvider");
  assert.ok(schemaSrc.includes("gatewayPaymentId"), "Payment deve conter gatewayPaymentId");
  assert.ok(schemaSrc.includes("gatewayStatus"), "Payment deve conter gatewayStatus");
  assert.ok(schemaSrc.includes("pixQrCode"), "Payment deve conter pixQrCode");
  assert.ok(schemaSrc.includes("pixQrCodeBase64"), "Payment deve conter pixQrCodeBase64");
  assert.ok(schemaSrc.includes("checkoutUrl"), "Payment deve conter checkoutUrl");

  // Refund
  assert.ok(schemaSrc.includes("gatewayRefundId"), "Refund deve conter gatewayRefundId");
  assert.ok(schemaSrc.includes("gatewayStatus"), "Refund deve conter gatewayStatus");

  // PaymentWebhookEvent
  assert.ok(schemaSrc.includes("model PaymentWebhookEvent"), "Deve conter model PaymentWebhookEvent");
  assert.ok(schemaSrc.includes("@@unique([provider, eventId])"), "PaymentWebhookEvent deve ter constraint única (provider, eventId)");
});

test("2. Suporte a Múltiplos Gateways Ativos Simultaneamente", async () => {
  // Garante que o banco possui os 4 slots
  const count = await prisma.gatewayConfiguration.count();
  assert.ok(count >= 4, "Deve haver pelo menos 4 slots de gateways cadastrados");

  // Ativa simultaneamente Mercado Pago, Asaas e Pagamento Presencial
  await prisma.gatewayConfiguration.update({
    where: { providerKey: "MERCADO_PAGO" },
    data: { isEnabled: true },
  });
  await prisma.gatewayConfiguration.update({
    where: { providerKey: "ASAAS" },
    data: { isEnabled: true },
  });
  await prisma.gatewayConfiguration.update({
    where: { providerKey: "IN_PERSON" },
    data: { isEnabled: true },
  });

  const activeGateways = await prisma.gatewayConfiguration.findMany({
    where: { isEnabled: true },
  });

  assert.ok(activeGateways.length >= 3, "Múltiplos gateways devem estar habilitados simultaneamente");
  const keys = activeGateways.map((g) => g.providerKey);
  assert.ok(keys.includes("MERCADO_PAGO"), "Mercado Pago deve estar ativo");
  assert.ok(keys.includes("ASAAS"), "Asaas deve estar ativo");
  assert.ok(keys.includes("IN_PERSON"), "Pagamento Presencial deve estar ativo");
});

test("3. Criptografia e Mascaramento Seguro de Credenciais", async () => {
  const secretsPath = path.join(process.cwd(), "src", "lib", "secrets.ts");
  assert.ok(fs.existsSync(secretsPath), "src/lib/secrets.ts deve existir");
  const secretsSrc = fs.readFileSync(secretsPath, "utf-8");

  assert.ok(secretsSrc.includes("encryptSecret"), "Deve exportar função encryptSecret");
  assert.ok(secretsSrc.includes("decryptSecret"), "Deve exportar função decryptSecret");

  const registryPath = path.join(process.cwd(), "src", "lib", "payments", "registry.ts");
  const registrySrc = fs.readFileSync(registryPath, "utf-8");

  assert.ok(registrySrc.includes("maskSecret"), "Deve mascarar credenciais no registry");
  assert.ok(!registrySrc.includes("rawAccessToken"), "Não deve exportar chaves cruas sem máscara nos DTOs de frontend");
});

test("4. Endpoint Público de Opções de Pagamento (/api/payments/options)", async () => {
  const optionsRoutePath = path.join(process.cwd(), "src", "app", "api", "payments", "options", "route.ts");
  assert.ok(fs.existsSync(optionsRoutePath), "src/app/api/payments/options/route.ts deve existir");

  const src = fs.readFileSync(optionsRoutePath, "utf-8");
  assert.ok(src.includes("getActivePaymentOptions"), "Deve chamar getActivePaymentOptions()");
  assert.ok(src.includes("export async function GET"), "Deve exportar método GET");
});

test("5. Seleção e Confirmação de Agendamento com Gateway Selecionado (/api/booking/confirm)", async () => {
  const confirmRoutePath = path.join(process.cwd(), "src", "app", "api", "booking", "confirm", "route.ts");
  assert.ok(fs.existsSync(confirmRoutePath), "src/app/api/booking/confirm/route.ts deve existir");

  const src = fs.readFileSync(confirmRoutePath, "utf-8");
  assert.ok(src.includes("gatewayProvider"), "Deve aceitar gatewayProvider no schema de confirmação");
  assert.ok(src.includes("MERCADO_PAGO"), "Deve suportar MERCADO_PAGO no schema");
  assert.ok(src.includes("ASAAS"), "Deve suportar ASAAS no schema");
  assert.ok(src.includes("PAGBANK"), "Deve suportar PAGBANK no schema");
  assert.ok(src.includes("IN_PERSON"), "Deve suportar IN_PERSON no schema");
  assert.ok(src.includes("pixQrCode"), "Deve retornar dados de Pix QR Code quando gerado");
});

test("6. Idempotência e Desduplicação de Webhooks com PaymentWebhookEvent", async () => {
  const testProvider = "MERCADO_PAGO";
  const testEventId = "test_evt_" + Date.now();

  // 1º evento recebido
  const firstEvent = await prisma.paymentWebhookEvent.create({
    data: {
      provider: testProvider,
      eventId: testEventId,
      eventType: "payment.created",
      payloadJson: JSON.stringify({ id: testEventId, status: "pending" }),
      processedStatus: "PROCESSED",
    },
  });
  assert.ok(firstEvent.id, "1º evento de webhook deve ser gravado com sucesso");

  // 2º evento idêntico (retry de webhook) deve falhar na restrição única
  let duplicateRejected = false;
  try {
    await prisma.paymentWebhookEvent.create({
      data: {
        provider: testProvider,
        eventId: testEventId,
        eventType: "payment.created",
        payloadJson: JSON.stringify({ id: testEventId, status: "pending" }),
      },
    });
  } catch (error) {
    duplicateRejected = true;
  }
  assert.ok(duplicateRejected, "Evento duplicado com mesmo (provider, eventId) deve ser rejeitado por constraint única");

  // Limpa evento de teste
  await prisma.paymentWebhookEvent.delete({ where: { id: firstEvent.id } });
});

test("7. Conciliação Automática e Atualização de Status", async () => {
  const handlerPath = path.join(process.cwd(), "src", "lib", "payments", "webhook-handler.ts");
  assert.ok(fs.existsSync(handlerPath), "src/lib/payments/webhook-handler.ts deve existir");

  const src = fs.readFileSync(handlerPath, "utf-8");
  assert.ok(src.includes("processPaymentWebhook"), "Deve exportar processPaymentWebhook");
  assert.ok(src.includes("paymentWebhookEvent"), "Deve registrar idempotência via paymentWebhookEvent");
  assert.ok(src.includes("status: newStatus"), "Deve atualizar status do pagamento recebido");
  assert.ok(src.includes("isNowApproved = newStatus === \"APPROVED\""), "Deve identificar pagamento aprovado");
  assert.ok(src.includes("status: \"CONFIRMED\""), "Deve confirmar consulta após pagamento aprovado");
});

test("8. Estorno Seguro de Pagamento (Refund) com Verificação de Saldo", async () => {
  const refundRoutePath = path.join(process.cwd(), "src", "app", "api", "payments", "[id]", "refund", "route.ts");
  assert.ok(fs.existsSync(refundRoutePath), "src/app/api/payments/[id]/refund/route.ts deve existir");

  const src = fs.readFileSync(refundRoutePath, "utf-8");
  assert.ok(src.includes("requireAdmin"), "Deve exigir permissão de ADMIN");
  assert.ok(src.includes("availableToRefund"), "Deve calcular saldo reembolsável");
  assert.ok(src.includes("isFullRefund"), "Deve distinguir estorno parcial e total");
  assert.ok(src.includes("status: isFullRefund ? \"REFUNDED\" : \"APPROVED\""), "Deve atualizar para REFUNDED apenas se estorno for total");
  assert.ok(src.includes("prisma.refund.create") || src.includes("tx.refund.create"), "Deve registrar o estorno em tabela Refund");
});

test("9. Pagamento Presencial: Independência de API Externa e Confirmação Manual", async () => {
  const inPersonProviderPath = path.join(process.cwd(), "src", "lib", "payments", "providers", "in-person.ts");
  assert.ok(fs.existsSync(inPersonProviderPath), "src/lib/payments/providers/in-person.ts deve existir");

  const providerSrc = fs.readFileSync(inPersonProviderPath, "utf-8");
  assert.ok(providerSrc.includes("InPersonProvider"), "Deve implementar InPersonProvider");

  const manualConfirmRoutePath = path.join(process.cwd(), "src", "app", "api", "payments", "[id]", "confirm-manual", "route.ts");
  assert.ok(fs.existsSync(manualConfirmRoutePath), "src/app/api/payments/[id]/confirm-manual/route.ts deve existir");

  const manualSrc = fs.readFileSync(manualConfirmRoutePath, "utf-8");
  assert.ok(manualSrc.includes("requireAdmin"), "Confirmação manual deve exigir ADMIN");
  assert.ok(manualSrc.includes("confirmManualPayment"), "Deve chamar confirmManualPayment");

  const providerHelperPath = path.join(process.cwd(), "src", "lib", "payment-provider.ts");
  const helperSrc = fs.readFileSync(providerHelperPath, "utf-8");
  assert.ok(helperSrc.includes("status: \"APPROVED\""), "Deve atualizar pagamento para APPROVED");
  assert.ok(helperSrc.includes("confirmedBy: adminUserId"), "Deve registrar o profissional que confirmou manualmente");
});

test("10. Interface do Usuário: Abas de Integrações, Financeiro e Agendamento Público", () => {
  // Aba Pagamentos em Admin -> Integrações
  const tabCompPath = path.join(process.cwd(), "src", "components", "integrations", "payments-tab.tsx");
  assert.ok(fs.existsSync(tabCompPath), "payments-tab.tsx deve existir em src/components/integrations/");
  const tabSrc = fs.readFileSync(tabCompPath, "utf-8");
  assert.ok(tabSrc.includes("Mercado Pago"), "Deve exibir Mercado Pago");
  assert.ok(tabSrc.includes("Asaas"), "Deve exibir Asaas");
  assert.ok(tabSrc.includes("PagBank"), "Deve exibir PagBank");
  assert.ok(tabSrc.includes("Pagamento Presencial"), "Deve exibir Pagamento Presencial");
  assert.ok(tabSrc.includes("webhookUrl"), "Deve exibir URL do webhook");
  assert.ok(tabSrc.includes("isSandbox"), "Deve conter alternador de Sandbox / Produção");

  // Inclusão da 4ª aba em /admin/integracoes
  const integracoesPagePath = path.join(process.cwd(), "src", "app", "admin", "integracoes", "page.tsx");
  const integracoesSrc = fs.readFileSync(integracoesPagePath, "utf-8");
  assert.ok(integracoesSrc.includes("Pagamentos"), "Pill-tab Pagamentos deve estar presente");
  assert.ok(integracoesSrc.includes("<PaymentsTab />"), "Deve renderizar <PaymentsTab />");

  // Modal de Estorno em /admin/financeiro
  const financeiroPagePath = path.join(process.cwd(), "src", "app", "admin", "financeiro", "page.tsx");
  const financeiroSrc = fs.readFileSync(financeiroPagePath, "utf-8");
  assert.ok(financeiroSrc.includes("handleProcessRefund"), "Deve conter submissão de estorno");
  assert.ok(financeiroSrc.includes("gatewayProvider"), "Modal de estorno deve exibir provider do gateway");

  // Página pública /agendar
  const agendarPath = path.join(process.cwd(), "src", "app", "agendar", "page.tsx");
  const agendarSrc = fs.readFileSync(agendarPath, "utf-8");
  assert.ok(agendarSrc.includes("/api/payments/options"), "Deve consultar opções de pagamento ativas");
  assert.ok(agendarSrc.includes("availableGateways"), "Deve armazenar e iterar sobre gateways ativos");
  assert.ok(agendarSrc.includes("pixQrCode"), "Deve exibir caixa de Pix Copia e Cola");
});
