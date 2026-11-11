const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

function loadTsModule(relativePath) {
  const fullPath = path.join(process.cwd(), relativePath);
  const source = fs.readFileSync(fullPath, "utf-8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: fullPath,
  });

  const mod = { exports: {} };
  const fn = new Function("exports", "require", "module", "__filename", "__dirname", transpiled.outputText);
  fn(mod.exports, require, mod, fullPath, path.dirname(fullPath));
  return mod.exports;
}

test("Analytics Series & Redesigned Admin/Financeiro — 1. buildRevenueSeries agrupa em centavos e fuso horário", () => {
  const { buildRevenueSeries } = loadTsModule("src/lib/analytics-series.ts");

  const refDate = new Date("2026-11-10T15:00:00.000Z"); // 12:00 America/Sao_Paulo
  const series = buildRevenueSeries({
    timezone: "America/Sao_Paulo",
    referenceDate: refDate,
    payments: [
      {
        amountCents: 25000,
        status: "APPROVED",
        isSimulated: false,
        createdAt: "2026-11-10T03:30:00.000Z", // 00:30 America/Sao_Paulo -> 10/11
      },
      {
        amountCents: 18000,
        status: "APPROVED",
        isSimulated: true,
        createdAt: "2026-11-09T14:00:00.000Z", // 09/11
      },
      {
        amountCents: 12000,
        status: "PENDING",
        isSimulated: false,
        createdAt: "2026-11-10T12:00:00.000Z",
      },
    ],
    appointments: [
      { startAt: "2026-11-10T13:00:00.000Z", status: "CONFIRMED" },
      { startAt: "2026-11-10T16:00:00.000Z", status: "CANCELLED" },
    ],
  });

  assert.equal(series.d14.length, 14);
  assert.equal(series.d30.length, 30);
  assert.equal(series.m6.length, 6);

  const todayBucket = series.d14[series.d14.length - 1];
  assert.equal(todayBucket.label, "10/11");
  assert.equal(todayBucket.realCents, 25000);
  assert.equal(todayBucket.pendingCents, 12000);
  assert.equal(todayBucket.appointmentsCount, 1);

  const novMonthBucket = series.m6[series.m6.length - 1];
  assert.equal(novMonthBucket.realCents, 25000);
  assert.equal(novMonthBucket.simulatedCents, 18000);
  assert.equal(novMonthBucket.pendingCents, 12000);
});

test("Analytics & Charts — 2. Admin Dashboard e Financeiro integram gráficos reais sem strings hardcoded indevidas", () => {
  const adminSrc = fs.readFileSync(path.join(process.cwd(), "src/app/admin/page.tsx"), "utf8");
  const financeSrc = fs.readFileSync(path.join(process.cwd(), "src/app/admin/financeiro/page.tsx"), "utf8");
  const statsRouteSrc = fs.readFileSync(path.join(process.cwd(), "src/app/api/admin/dashboard-stats/route.ts"), "utf8");
  const paymentsRouteSrc = fs.readFileSync(path.join(process.cwd(), "src/app/api/payments/route.ts"), "utf8");
  const adminLayoutSrc = fs.readFileSync(path.join(process.cwd(), "src/app/admin/layout.tsx"), "utf8");

  // APIs retornam séries e analytics estruturados
  assert.ok(statsRouteSrc.includes("buildRevenueSeries"), "dashboard-stats deve retornar revenueSeries");
  assert.ok(statsRouteSrc.includes("monthlyGoalCents"), "dashboard-stats deve retornar monthlyGoalCents");
  assert.ok(paymentsRouteSrc.includes("buildRevenueSeries"), "api/payments deve retornar analytics.series");
  assert.ok(paymentsRouteSrc.includes("byMethod"), "api/payments deve retornar analytics.byMethod");

  // UI utiliza componentes de gráfico e mantém Light Mode branco+laranja e Dark Mode fosco com destaque laranja
  assert.ok(adminSrc.includes("LollipopPerformanceChart"), "Dashboard deve incluir gráfico interativo Lollipop");
  assert.ok(!adminSrc.includes("RadialArcProgress"), "Dashboard não deve exibir medidor radial Acompanhamento do Mês");
  assert.ok(!adminSrc.includes("Acompanhamento do Mês"), "Card Acompanhamento do Mês deve ser removido do Painel Geral");
  assert.ok(!adminSrc.includes("Resumo Financeiro"), "Card Resumo Financeiro deve ser removido do Painel Geral");
  assert.ok(adminSrc.includes("MiniSparkline"), "Dashboard deve incluir sparklines reais nos KPIs");
  assert.ok(!adminSrc.includes("Ao Vivo"), "Dashboard não deve exibir badge Ao Vivo");
  assert.ok(!adminSrc.includes("text-white dark:text-[#C0C0C0]"), "Ícones de botões outline em Light Mode não devem usar text-white");
  assert.ok(
    adminSrc.includes("bg-white text-[var(--button-outline-fg,var(--button-bg,var(--primary)))]"),
    "Controles não preenchidos do Dashboard devem usar botão branco com letra laranja no Light Mode"
  );
  assert.ok(adminSrc.includes("height={240}"), "Gráfico Desempenho & Receita deve utilizar altura compacta de 240px no Dashboard");
  assert.ok(adminSrc.includes("useGSAP") && adminSrc.includes("isDashboardReady"), "Dashboard deve executar animação única de entrada sem flicker");
  assert.ok(
    adminLayoutSrc.includes('pathname !== "/admin" && "admin-page-stage"'),
    "AdminLayout deve evitar dupla animação CSS/GSAP no Painel Geral (/admin)"
  );

  const analyticsChartsSrc = fs.readFileSync(path.join(process.cwd(), "src/components/admin/analytics-charts.tsx"), "utf8");
  assert.ok(
    analyticsChartsSrc.includes("DEFAULT_Y_AXIS_MAX_CENTS = 50000") &&
      analyticsChartsSrc.includes("FIXED_Y_TICKS_CENTS = [0, 10000, 25000]"),
    "Eixo Y do Lollipop deve usar marcos R$ 0, R$ 100, R$ 250 e teto mínimo R$ 500 (50000 centavos)"
  );
  assert.ok(
    analyticsChartsSrc.includes("cents / axisMaxCents") && analyticsChartsSrc.includes("formatAxisBRL"),
    "Eixo Y deve calcular posição estritamente proporcional ao máximo exibido e formatar valores em pt-BR"
  );

  const gsapSrc = fs.readFileSync(path.join(process.cwd(), "src/lib/animation/gsap.ts"), "utf8");
  assert.ok(
    gsapSrc.includes("gsap.killTweensOf") && gsapSrc.includes("gsap.fromTo("),
    "Utilitários GSAP de painel interno devem cancelar tweens anteriores e usar fromTo idempotente"
  );

  const siteHeaderSrc = fs.readFileSync(path.join(process.cwd(), "src/components/minisite/header.tsx"), "utf8");
  const inicioAriaMatches = siteHeaderSrc.match(/aria-label="Voltar ao início"/g) || [];
  assert.equal(inicioAriaMatches.length, 2, "Logos desktop e mobile do Site devem possuir aria-label acessível 'Voltar ao início'");
  assert.ok(
    siteHeaderSrc.includes("handleLogoClick") && siteHeaderSrc.includes('document.getElementById("inicio")'),
    "Logo do Site deve rolar suavemente ao Hero (#inicio) quando já estiver na home ou navegar para /"
  );

  assert.ok(financeSrc.includes("StemPerformanceChart"), "Financeiro deve incluir gráfico de evolução temporal");
  assert.ok(financeSrc.includes("PaymentMethodsDonutChart"), "Financeiro deve incluir gráfico donut de meios e status");
  assert.ok(!financeSrc.includes("bg-purple-50"), "Card de Receita Simulada não deve ter lavagem roxa no Light Mode");

  const finChartsSrc = fs.readFileSync(path.join(process.cwd(), "src/components/analytics/financial-charts.tsx"), "utf8");
  assert.ok(!finChartsSrc.includes("bg-[#171717] text-white"), "Pílulas ativas dos gráficos não devem usar preto/cinza no Light Mode");
  assert.ok(finChartsSrc.includes("bg-[var(--button-bg,var(--primary))] text-[var(--button-fg,#ffffff)]"));

  assert.ok(!adminLayoutSrc.includes("bg-[#262626] text-white"), "Botão mobile no Light Mode não deve usar preenchimento escuro pesado");
  assert.ok(adminLayoutSrc.includes("dark:bg-[var(--button-bg,var(--primary))]"), "Sidebar em Dark Mode deve destacar item ativo com a cor do tema");
});
