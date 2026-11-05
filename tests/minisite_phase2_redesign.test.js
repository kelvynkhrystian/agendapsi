const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

test("Phase 2 MiniSite — 1. Tipografia Elegante e Hierarquia Visual", () => {
  const pagePath = path.join(process.cwd(), "src", "app", "page.tsx");
  const pageContent = fs.readFileSync(pagePath, "utf-8");

  // Uso de font-display para o nome profissional
  assert.ok(
    pageContent.includes("font-display") || pageContent.includes("font-serif"),
    "page.tsx deve utilizar tipografia display/serif elegante para o nome do profissional"
  );
  assert.ok(
    pageContent.includes("font-heading"),
    "page.tsx deve utilizar font-heading para títulos e subtítulos de seções"
  );

  const globalsPath = path.join(process.cwd(), "src", "app", "globals.css");
  const globalsContent = fs.readFileSync(globalsPath, "utf-8");

  assert.ok(
    globalsContent.includes("--font-display"),
    "globals.css deve definir o token --font-display no @theme"
  );
});

test("Phase 2 MiniSite — 2. Composição do Hero: Retrato, Decoração Orgânica e Ações de Agendamento", () => {
  const pagePath = path.join(process.cwd(), "src", "app", "page.tsx");
  const pageContent = fs.readFileSync(pagePath, "utf-8");

  // Preservação do CRP/CRM
  assert.ok(pageContent.includes("{crpCrm}"), "Hero deve exibir a credencial do profissional");

  // Container de mídia responsivo
  assert.ok(
    pageContent.includes("MiniSiteMediaPlayer") && pageContent.includes('slot="hero"'),
    "Hero deve utilizar o MiniSiteMediaPlayer no slot hero"
  );

  // Botões de ação principais
  assert.ok(
    pageContent.includes("Agende sua consulta"),
    "Hero deve conter o botão principal de agendamento"
  );
  assert.ok(
    pageContent.includes("Chamar no WhatsApp"),
    "Hero deve conter o botão secundário de WhatsApp"
  );

  // Benefícios Hero
  assert.ok(
    pageContent.includes("activeBenefits.map"),
    "Hero deve mapear e renderizar dinamicamente os benefícios configurados"
  );
});

test("Phase 2 MiniSite — 3. Variação Visual e Todas as 9 Seções Estruturais", () => {
  const pagePath = path.join(process.cwd(), "src", "app", "page.tsx");
  const pageContent = fs.readFileSync(pagePath, "utf-8");

  const requiredSections = [
    "HERO SECTION",
    "PRINCIPAIS DEMANDAS",
    "SOBRE MIM",
    "Diferenciais",
    "Como Funciona?",
    "DEPOIMENTOS",
    "LOCALIZAÇÃO DO CONSULTÓRIO",
    "FINAL CTA",
    "FOOTER",
  ];

  for (const sec of requiredSections) {
    assert.ok(
      pageContent.includes(sec),
      `page.tsx deve conter a seção ${sec}`
    );
  }

  // Cards de serviço com hover e transição
  assert.ok(
    pageContent.includes("hover:-translate-y-0.5") || pageContent.includes("hover:shadow-md"),
    "Cards de serviços devem possuir micro-interações elegantes de elevação"
  );

  // Sobre Mim assimétrico com segundo slot de mídia
  assert.ok(
    pageContent.includes('slot="about"'),
    "Seção Sobre Mim deve conter o slot independente de mídia"
  );

  // Depoimentos em conformidade com CFP
  assert.ok(
    pageContent.includes("Conselho Federal de Psicologia") || pageContent.includes("CFP"),
    "Depoimentos devem conter aviso de conformidade ética"
  );
});

test("Phase 2 MiniSite — 4. Isolamento Estrito de Modo Claro e Preservação do Tema", () => {
  const pagePath = path.join(process.cwd(), "src", "app", "page.tsx");
  const pageContent = fs.readFileSync(pagePath, "utf-8");

  assert.ok(
    pageContent.includes('data-theme="light"'),
    "O container raiz do MiniSite deve definir explicitamente data-theme=\"light\""
  );
  assert.ok(
    pageContent.includes("minisite-root"),
    "O container raiz do MiniSite deve possuir a classe minisite-root para isolamento CSS"
  );
  assert.ok(
    pageContent.includes("var(--primary)"),
    "O MiniSite deve utilizar as variáveis semânticas do tema global"
  );
});
