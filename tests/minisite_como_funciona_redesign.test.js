const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

test("1. Seção Como Funciona restaurada para o card branco limpo pré-folhas com suporte a seções dinâmicas", () => {
  const pageSrc = fs.readFileSync(path.join(process.cwd(), "src", "app", "page.tsx"), "utf-8");

  assert.ok(
    pageSrc.includes('id="como-funciona" className="py-16 px-4 bg-[#F8F5EE] scroll-mt-20"'),
    "Deve preservar id='como-funciona' e fundo bege #F8F5EE com scroll-mt-20"
  );
  assert.ok(
    pageSrc.includes('id="como-funciona-card"') &&
      pageSrc.includes("rounded-3xl bg-white border border-[#EFE9DF] shadow-xs space-y-8"),
    "Deve restaurar container branco limpo (rounded-3xl bg-white border-[#EFE9DF])"
  );
  assert.ok(
    !pageSrc.includes("como-funciona-decor-leaves") &&
      !pageSrc.includes("como-funciona-decor-wave") &&
      !pageSrc.includes("como-funciona-line") &&
      !pageSrc.includes("como-funciona-mobile-line"),
    "Não deve renderizar folhas decorativas, onda orgânica ou conectores de timeline"
  );
  assert.ok(
    pageSrc.includes("max-w-4xl mx-auto") &&
      pageSrc.includes("sections.comoFunciona.isVisible") &&
      pageSrc.includes("sections.comoFunciona.title") &&
      pageSrc.includes("sections.comoFunciona.subtitle"),
    "Deve manter largura max-w-4xl e leitura dinâmica de sections.comoFunciona"
  );
  assert.ok(
    pageSrc.includes('href="/agendar"') &&
      pageSrc.includes("Iniciar Agendamento Online") &&
      pageSrc.includes("ArrowRight"),
    "Deve preservar CTA de agendamento online para /agendar"
  );
});

test("2. Passos de Como Funciona usam ícones animados pulsoicon-react com data-icon-trigger e prefers-reduced-motion", () => {
  const pageSrc = fs.readFileSync(path.join(process.cwd(), "src", "app", "page.tsx"), "utf-8");
  const stepIconSrc = fs.readFileSync(
    path.join(process.cwd(), "src", "components", "minisite", "como-funciona-step-icon.tsx"),
    "utf-8"
  );

  assert.ok(
    pageSrc.includes("<ComoFuncionaStepIcon") && pageSrc.includes("data-icon-trigger"),
    "Cada passo deve usar ComoFuncionaStepIcon dentro de card com data-icon-trigger"
  );
  assert.ok(
    pageSrc.includes("{index + 1}. {step.title}"),
    "Títulos dos passos devem seguir o formato clássico numerado (1., 2., 3.)"
  );
  assert.ok(
    stepIconSrc.includes('from "pulsoicon-react"') &&
      stepIconSrc.includes("startAnimation") &&
      stepIconSrc.includes("stopAnimation") &&
      stepIconSrc.includes("IntersectionObserver") &&
      stepIconSrc.includes("prefers-reduced-motion"),
    "ComoFuncionaStepIcon deve animar ícones pulsoicon-react via IntersectionObserver/ciclo/hover respeitando reduced-motion"
  );
  assert.ok(
    stepIconSrc.includes("w-13 h-13 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]"),
    "Caixa dos ícones deve manter o estilo original rounded-2xl com bg-[var(--primary)]/10"
  );
});

test("3. MotionController de Como Funciona restaura entrada limpa no ScrollTrigger + hover sutil no wrap", () => {
  const controllerSrc = fs.readFileSync(
    path.join(process.cwd(), "src", "components", "minisite", "motion-controller.tsx"),
    "utf-8"
  );

  assert.ok(
    controllerSrc.includes('trigger: "#como-funciona"') &&
      controllerSrc.includes('"#como-funciona-header"') &&
      controllerSrc.includes('"#como-funciona-steps > div"'),
    "Deve animar cabeçalho e cards de passo via ScrollTrigger"
  );
  assert.ok(
    controllerSrc.includes(".como-funciona-icon-wrap") && controllerSrc.includes("y: -5"),
    "Deve aplicar hover sutil vertical no container do ícone"
  );
  assert.ok(
    !controllerSrc.includes(".como-funciona-line") && !controllerSrc.includes(".como-funciona-dot"),
    "Não deve referenciar conectores removidos da timeline"
  );
  assert.ok(
    controllerSrc.includes("if (isReducedMotion()) return;"),
    "Deve respeitar prefers-reduced-motion"
  );
});
