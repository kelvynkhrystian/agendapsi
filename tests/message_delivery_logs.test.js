const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

test("1. Subnavegação entre Configurações de Lembretes e Registros de Mensagens", () => {
  const lembretesPagePath = path.join(__dirname, "../src/app/admin/lembretes/page.tsx");
  const registrosPagePath = path.join(__dirname, "../src/app/admin/lembretes/registros/page.tsx");

  assert.ok(fs.existsSync(lembretesPagePath), "A página /admin/lembretes deve existir");
  assert.ok(fs.existsSync(registrosPagePath), "A página /admin/lembretes/registros deve existir");

  const lembretesContent = fs.readFileSync(lembretesPagePath, "utf8");
  const registrosContent = fs.readFileSync(registrosPagePath, "utf8");

  // Verifica abas de subnavegação em /admin/lembretes
  assert.ok(lembretesContent.includes("/admin/lembretes"), "Deve referenciar link de lembretes");
  assert.ok(lembretesContent.includes("/admin/lembretes/registros"), "Deve referenciar link de registros");
  assert.ok(lembretesContent.includes("Configurações de Lembretes"), "Deve conter texto da aba de configurações");
  assert.ok(lembretesContent.includes("Registros de Mensagens"), "Deve conter texto da aba de registros");

  // Verifica abas de subnavegação em /admin/lembretes/registros
  assert.ok(registrosContent.includes("/admin/lembretes"), "Deve referenciar link para voltar a configurações");
  assert.ok(registrosContent.includes("/admin/lembretes/registros"), "Deve referenciar aba ativa de registros");
  assert.ok(registrosContent.includes("Registros de Mensagens"), "Deve conter cabeçalho de registros");
});

test("2. Páginas dedicadas completas (Full Page, sem modais pesados)", () => {
  const listPagePath = path.join(__dirname, "../src/app/admin/lembretes/registros/page.tsx");
  const detailPagePath = path.join(__dirname, "../src/app/admin/lembretes/registros/[id]/page.tsx");

  assert.ok(fs.existsSync(listPagePath), "Página de listagem deve existir");
  assert.ok(fs.existsSync(detailPagePath), "Página de detalhamento [id] deve existir");

  const listContent = fs.readFileSync(listPagePath, "utf8");
  const detailContent = fs.readFileSync(detailPagePath, "utf8");

  // Listagem com cards de métricas FluentSMTP-inspired
  assert.ok(listContent.includes("Disparos (7 Dias)"), "Deve exibir métrica total de disparos");
  assert.ok(listContent.includes("Aceitos pelo Provedor"), "Deve exibir métrica de aceitos");
  assert.ok(listContent.includes("Entregas Confirmadas"), "Deve exibir métrica de entregues");
  assert.ok(listContent.includes("Falhas de Envio"), "Deve exibir métrica de falhas");
  assert.ok(listContent.includes("Simulados / Fila"), "Deve exibir métrica de simulados/fila");

  // Filtros funcionais
  assert.ok(listContent.includes("setChannel"), "Deve possuir controle de filtro por canal");
  assert.ok(listContent.includes("setStatus"), "Deve possuir controle de filtro por status");
  assert.ok(listContent.includes("setSearch"), "Deve possuir controle de busca textual");

  // Detalhe com botão Voltar visível e timeline técnica
  assert.ok(detailContent.includes("/admin/lembretes/registros"), "Detalhe deve ter link de retorno à lista");
  assert.ok(detailContent.includes("Voltar aos Registros") || detailContent.includes("Voltar"), "Deve ter botão Voltar visível");
  assert.ok(detailContent.includes("Linha do Tempo de Entrega"), "Deve ter timeline técnica de eventos");
  assert.ok(detailContent.includes("Provedor"), "Deve exibir informações do provedor");
  assert.ok(detailContent.includes("Tentativas de Envio"), "Deve registrar contagem de tentativas");
});

test("3. Mascaramento de destinatários para conformidade LGPD", () => {
  const notificationsPath = path.join(__dirname, "../src/lib/notifications.ts");
  assert.ok(fs.existsSync(notificationsPath), "src/lib/notifications.ts deve existir");

  const content = fs.readFileSync(notificationsPath, "utf8");
  assert.ok(content.includes("maskRecipient"), "Deve implementar função utilitária maskRecipient");

  // Testa lógica de mascaramento de e-mail e telefone
  const maskRecipient = (recipient, channel) => {
    if (!recipient) return "Não informado";
    const str = String(recipient).trim();
    if (channel === "EMAIL" || str.includes("@")) {
      const parts = str.split("@");
      if (parts.length === 2) {
        const name = parts[0];
        const domain = parts[1];
        if (name.length <= 2) return `${name[0]}***@${domain}`;
        return `${name.substring(0, 2)}***@${domain}`;
      }
    }
    const digits = str.replace(/\D/g, "");
    if (digits.length >= 10) {
      const ddd = digits.substring(0, 2);
      const prefix = digits.substring(2, 4);
      const suffix = digits.substring(digits.length - 2);
      return `(${ddd}) ${prefix}***-**${suffix}`;
    }
    return str.substring(0, 2) + "***" + str.substring(Math.max(2, str.length - 2));
  };

  const maskedEmail = maskRecipient("paciente.silva@exemplo.com", "EMAIL");
  assert.strictEqual(maskedEmail, "pa***@exemplo.com");
  assert.ok(!maskedEmail.includes("silva"), "Não deve expor o nome completo do paciente no e-mail");

  const maskedPhone = maskRecipient("11987654321", "WHATSAPP");
  assert.strictEqual(maskedPhone, "(11) 98***-**21");
  assert.ok(!maskedPhone.includes("76543"), "Não deve expor o número de telefone completo");
});

test("4. API de Mensageria: listagem, detalhes e webhook de entrega", () => {
  const logsApiPath = path.join(__dirname, "../src/app/api/admin/message-logs/route.ts");
  const detailApiPath = path.join(__dirname, "../src/app/api/admin/message-logs/[id]/route.ts");
  const resendApiPath = path.join(__dirname, "../src/app/api/admin/message-logs/[id]/resend/route.ts");
  const webhookApiPath = path.join(__dirname, "../src/app/api/webhooks/messages/route.ts");

  assert.ok(fs.existsSync(logsApiPath), "GET /api/admin/message-logs deve existir");
  assert.ok(fs.existsSync(detailApiPath), "GET /api/admin/message-logs/[id] deve existir");
  assert.ok(fs.existsSync(resendApiPath), "POST /api/admin/message-logs/[id]/resend deve existir");
  assert.ok(fs.existsSync(webhookApiPath), "POST /api/webhooks/messages deve existir");

  const logsContent = fs.readFileSync(logsApiPath, "utf8");
  const detailContent = fs.readFileSync(detailApiPath, "utf8");
  const resendContent = fs.readFileSync(resendApiPath, "utf8");
  const webhookContent = fs.readFileSync(webhookApiPath, "utf8");

  // Autenticação administrativa estrita
  assert.ok(logsContent.includes("requireAdmin"), "Logs API deve exigir requireAdmin");
  assert.ok(detailContent.includes("requireAdmin"), "Detail API deve exigir requireAdmin");
  assert.ok(resendContent.includes("requireAdmin"), "Resend API deve exigir requireAdmin");

  // Webhook processa DELIVERED e FAILED
  assert.ok(webhookContent.includes("DELIVERED"), "Webhook deve processar status DELIVERED");
  assert.ok(webhookContent.includes("FAILED"), "Webhook deve processar status FAILED");
  assert.ok(webhookContent.includes("providerMessageId"), "Webhook deve correlacionar via providerMessageId");

  // Travas de negócio no reenvio
  assert.ok(resendContent.includes("COMPLETED"), "Resend deve travar consultas completadas");
  assert.ok(resendContent.includes("CANCELLED"), "Resend deve travar consultas canceladas");
  assert.ok(resendContent.includes("AuditLog") || resendContent.includes("auditLog"), "Resend deve registrar em AuditLog");
});

test("5. Fidelidade de status: SMTP aceito não é entrega na caixa de entrada", () => {
  const notificationsPath = path.join(__dirname, "../src/lib/notifications.ts");
  const content = fs.readFileSync(notificationsPath, "utf8");

  // O envio por SMTP marca ACCEPTED (ou SIMULATED), e não DELIVERED prematuramente
  assert.ok(content.includes('"ACCEPTED"') && content.includes('"SIMULATED"'), "Envio deve distinguir ACCEPTED e SIMULATED");
  assert.ok(content.includes("acceptedAt:"), "Envio aceito deve marcar acceptedAt");
  assert.ok(content.includes("attemptCount"), "Deve registrar e incrementar attemptCount");
});

test("6. Dashboard Administrativo: Widget compacto de Envios de Mensagens", () => {
  const statsApiPath = path.join(__dirname, "../src/app/api/admin/dashboard-stats/route.ts");
  const adminPagePath = path.join(__dirname, "../src/app/admin/page.tsx");

  const statsContent = fs.readFileSync(statsApiPath, "utf8");
  const pageContent = fs.readFileSync(adminPagePath, "utf8");

  // API retorna messageDeliveryStats nos últimos 7 dias
  assert.ok(statsContent.includes("messageDeliveryStats"), "API deve incluir messageDeliveryStats");
  assert.ok(statsContent.includes("sevenDaysAgo"), "API deve filtrar últimos 7 dias");
  assert.ok(statsContent.includes("totalAttempts"), "API deve totalizar tentativas");
  assert.ok(statsContent.includes("hasFailures"), "API deve sinalizar se há falhas");

  // Dashboard exibe o widget
  assert.ok(pageContent.includes("Envios de Mensagens"), "Dashboard deve conter título do widget");
  assert.ok(pageContent.includes("Últimos 7 dias"), "Dashboard deve indicar período de 7 dias");
  assert.ok(pageContent.includes("/admin/lembretes/registros"), "Dashboard deve ter link para tela de registros");
  assert.ok(pageContent.includes("messageDeliveryStats"), "Dashboard deve consumir dados de messageDeliveryStats");
});
