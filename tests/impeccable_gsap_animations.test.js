const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

test("1. Arquitetura GSAP: Registro limpo de plugins, easings, timings e suporte a reduced-motion", () => {
  const gsapLibPath = path.join(__dirname, "../src/lib/animation/gsap.ts");
  assert.ok(fs.existsSync(gsapLibPath), "O módulo src/lib/animation/gsap.ts deve existir");

  const content = fs.readFileSync(gsapLibPath, "utf8");

  // Registro de plugins e SSR safety
  assert.ok(content.includes('typeof window !== "undefined"'), "Deve registrar plugins apenas no ambiente do navegador");
  assert.ok(content.includes("ScrollTrigger"), "Deve registrar plugin ScrollTrigger");
  assert.ok(content.includes("useGSAP"), "Deve registrar plugin useGSAP");

  // Suporte a Acessibilidade (Reduced Motion)
  assert.ok(content.includes("isReducedMotion"), "Deve exportar função de detecção isReducedMotion()");
  assert.ok(content.includes("prefers-reduced-motion: reduce"), "Deve respeitar media query prefers-reduced-motion");

  // Padrões de duração e easings
  assert.ok(content.includes("microFast: 0.14"), "Deve definir micro-durações rápidas (~140ms)");
  assert.ok(content.includes("microStandard: 0.2"), "Deve definir micro-durações padrão (~200ms)");
  assert.ok(content.includes("heroElement"), "Deve definir durações expressivas para o MiniSite");
});

test("2. MiniSite: Controlador de movimento GSAP integrado com sequência Hero autoral", () => {
  const controllerPath = path.join(__dirname, "../src/components/minisite/motion-controller.tsx");
  assert.ok(fs.existsSync(controllerPath), "O componente MiniSiteMotionController deve existir");

  const controllerSrc = fs.readFileSync(controllerPath, "utf8");

  // Timeline e sequência Hero (ordem coordenada de baixo para cima: header -> badge -> nome -> especialidade -> descrição -> CTAs -> benefícios; sem escalar mídia)
  assert.ok(controllerSrc.includes("heroTl = gsap.timeline"), "Deve criar timeline dedicada para o Hero");
  assert.ok(controllerSrc.includes("#hero-header-pill"), "Deve incluir header desktop no início da timeline coordenada do Hero");
  assert.ok(controllerSrc.includes("#hero-header-mobile-logo"), "Deve incluir conteúdo do header mobile na timeline sem deslocar a barra fixa");
  assert.ok(controllerSrc.includes("#hero-badge"), "Deve animar badge de registro do profissional");
  assert.ok(controllerSrc.includes("#hero-name"), "Deve animar nome do profissional");
  assert.ok(controllerSrc.includes("#hero-title"), "Deve animar especialidade do profissional");
  assert.ok(controllerSrc.includes("#hero-subtitle"), "Deve animar descrição do herói");
  assert.ok(controllerSrc.includes("#hero-cta"), "Deve animar botões de ação do herói");
  assert.ok(controllerSrc.includes("#hero-benefits"), "Deve animar indicadores de benefícios com stagger");
  assert.ok(
    !controllerSrc.includes('heroTl.from("#hero-media-container"') &&
      !controllerSrc.includes('heroTl.fromTo("#hero-media-container"'),
    "Não deve animar ou escalar o container de mídia do Hero na entrada"
  );

  // Verificação de acessibilidade
  assert.ok(controllerSrc.includes("if (isReducedMotion()) return;"), "Deve cancelar animações espaciais caso o usuário solicite redução de movimento");
});

test("3. MiniSite: ScrollTriggers em seções sem sequestro de rolagem (Normal Browser Scroll)", () => {
  const controllerPath = path.join(__dirname, "../src/components/minisite/motion-controller.tsx");
  const controllerSrc = fs.readFileSync(controllerPath, "utf8");

  // ScrollTriggers para as seções públicas
  assert.ok(controllerSrc.includes("trigger: \"#atendimentos\""), "Deve possuir ScrollTrigger para Principais Demandas");
  assert.ok(controllerSrc.includes("trigger: \"#sobre\""), "Deve possuir ScrollTrigger para Sobre Mim");
  assert.ok(controllerSrc.includes("trigger: \"#diferenciais\""), "Deve possuir ScrollTrigger para Diferenciais");
  assert.ok(controllerSrc.includes("trigger: \"#como-funciona\""), "Deve possuir ScrollTrigger para Passo a Passo");
  assert.ok(controllerSrc.includes("trigger: \"#depoimentos\""), "Deve possuir ScrollTrigger para Depoimentos");
  assert.ok(controllerSrc.includes("trigger: \"#localizacao\""), "Deve possuir ScrollTrigger para Localização");
  assert.ok(controllerSrc.includes("trigger: \"#cta-final\""), "Deve possuir ScrollTrigger para CTA Final");

  // Scroll nativo preservado
  assert.ok(!controllerSrc.includes("overflow: hidden") && !controllerSrc.includes("preventDefault"), "Não deve sequestrar o scroll do navegador");
});

test("4. MiniSite: Preservação estrita dos players de mídia (Frames ZIP, Vídeo e Imagem)", () => {
  const homePath = path.join(__dirname, "../src/app/page.tsx");
  const homeSrc = fs.readFileSync(homePath, "utf8");

  // Ambos os slots de mídia do MiniSite continuam ativos e preservados
  assert.ok(homeSrc.includes('<MiniSiteMediaPlayer'), "MiniSiteMediaPlayer deve ser mantido no MiniSite");
  assert.ok(homeSrc.includes('slot="hero"'), "Slot 1 (Hero) deve ser preservado");
  assert.ok(homeSrc.includes('slot="about"'), "Slot 2 (About) deve ser preservado");

  // Controlador de movimento montado
  assert.ok(homeSrc.includes("<MiniSiteMotionController />"), "MiniSite deve montar o MiniSiteMotionController");
});

test("5. Painel Interno (Admin e Paciente): Micro-interações sutis (120-240ms) sem lentidão", () => {
  // Admin Dashboard
  const adminDashPath = path.join(__dirname, "../src/app/admin/page.tsx");
  const adminDashSrc = fs.readFileSync(adminDashPath, "utf8");
  assert.ok(adminDashSrc.includes("animatePageEnter") && adminDashSrc.includes("animateKpiEntrance"), "Admin Dashboard deve utilizar micro-animações de entrada");

  // Patient Dashboard
  const patientDashPath = path.join(__dirname, "../src/app/paciente/page.tsx");
  const patientDashSrc = fs.readFileSync(patientDashPath, "utf8");
  assert.ok(patientDashSrc.includes("animatePageEnter") && patientDashSrc.includes("animateKpiEntrance"), "Patient Dashboard deve utilizar micro-animações de entrada");

  // Agenda
  const agendaPath = path.join(__dirname, "../src/app/admin/agenda/page.tsx");
  const agendaSrc = fs.readFileSync(agendaPath, "utf8");
  assert.ok(agendaSrc.includes("animateTabContent"), "Agenda deve aplicar transição suave ao alternar visualizações");

  // Serviços
  const servicesPath = path.join(__dirname, "../src/app/admin/servicos/page.tsx");
  const servicesSrc = fs.readFileSync(servicesPath, "utf8");
  assert.ok(servicesSrc.includes("animateTabContent"), "Serviços deve aplicar transição suave ao alternar abas");
});
