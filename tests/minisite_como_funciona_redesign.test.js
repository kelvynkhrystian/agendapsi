const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

test("1. Seção Como Funciona: textos exatos, hierarquia visual, Playfair Display e ornamentos discretos", () => {
  const pageSrc = fs.readFileSync(path.join(process.cwd(), "src", "app", "page.tsx"), "utf-8");

  assert.ok(
    pageSrc.includes('id="como-funciona" className="py-16 px-4 bg-[#F8F5EE] scroll-mt-20"'),
    "Deve preservar id='como-funciona' e fundo bege #F8F5EE"
  );
  assert.ok(
    pageSrc.includes('id="como-funciona-card"') && pageSrc.includes("bg-[#FFFDF9]") && pageSrc.includes("rounded-[32px]"),
    "Deve criar container branco-creme com cantos bastante arredondados"
  );
  assert.ok(
    pageSrc.includes('id="como-funciona-decor-leaves"') && pageSrc.includes('id="como-funciona-decor-wave"'),
    "Deve incluir elementos decorativos discretos (ramo de folhas topo-esquerdo e forma orgânica inferior-direita)"
  );
  assert.ok(
    pageSrc.includes("PASSO A PASSO") &&
      pageSrc.includes("Como Funciona?") &&
      pageSrc.includes(
        "Um processo simples, acolhedor e seguro, pensado para ajudar você a cuidar da sua saúde emocional com clareza e consistência."
      ),
    "Cabeçalho deve conter exatamente eyebrow, título e subtítulo solicitados"
  );
  assert.ok(
    pageSrc.includes("--font-playfair"),
    "Título Como Funciona? deve utilizar fonte serifada elegante Playfair Display"
  );
});

test("2. Timeline Como Funciona: 3 etapas com ícones Lucide, círculo ~88px, cápsulas 01-03, conector horizontal/vertical e CTA #F45108", () => {
  const pageSrc = fs.readFileSync(path.join(process.cwd(), "src", "app", "page.tsx"), "utf-8");

  // Ícones obrigatórios
  for (const icon of ["CalendarDays", "MessagesSquare", "HandHeart", "ArrowRight"]) {
    assert.ok(pageSrc.includes(icon), `Deve importar e usar o ícone Lucide ${icon}`);
  }

  // Conteúdo exato das 3 etapas
  for (const text of [
    '"01"',
    "Agende sua consulta",
    "Escolha o horário e a modalidade ideal diretamente pelo nosso sistema online com praticidade e segurança.",
    '"02"',
    "Realize sua avaliação inicial",
    "Primeira conversa para compreender suas necessidades, histórico e objetivos terapêuticos, em um espaço de escuta acolhedora.",
    '"03"',
    "Inicie seu acompanhamento",
    "Sua jornada de cuidado, com sessões contínuas e um plano terapêutico personalizado, no seu ritmo e de forma consistente.",
  ]) {
    assert.ok(pageSrc.includes(text), `Deve conter o conteúdo exato da etapa: ${text}`);
  }

  // Círculo ~88px, cápsulas laranja-claro, botão #F45108 e rota /agendar
  assert.ok(
    pageSrc.includes("md:w-[88px] md:h-[88px]") &&
      pageSrc.includes("bg-[#FCEFE4]") &&
      pageSrc.includes("text-[#462516]"),
    "Deve renderizar ícone outline marrom escuro dentro de círculo bege-claro de 88px no desktop"
  );
  assert.ok(
    pageSrc.includes("bg-[#FDE4CF]"),
    "Numeração 01, 02 e 03 deve estar em cápsulas laranja-claro"
  );
  assert.ok(
    pageSrc.includes('href="/agendar"') &&
      pageSrc.includes("bg-[#F45108]") &&
      pageSrc.includes("rounded-full") &&
      pageSrc.includes("Iniciar Agendamento Online"),
    "Botão de agendamento deve preservar /agendar, formato pill, fundo #F45108 e texto exato"
  );

  // Conectores responsivos desktop e mobile
  assert.ok(
    pageSrc.includes("md:grid-cols-3") &&
      pageSrc.includes("como-funciona-line") &&
      pageSrc.includes("como-funciona-dot"),
    "Desktop deve distribuir 3 etapas horizontalmente conectadas por linha e círculos"
  );
  assert.ok(
    pageSrc.includes("flex-row items-start") &&
      pageSrc.includes("como-funciona-mobile-line") &&
      pageSrc.includes("como-funciona-mobile-dot"),
    "Mobile deve transformar a timeline em vertical com ícones/linha à esquerda e textos à direita"
  );
});

test("3. Animações GSAP de Como Funciona: ScrollTrigger sequencial, desenho progressivo, hover nos ícones e reduced-motion", () => {
  const controllerSrc = fs.readFileSync(
    path.join(process.cwd(), "src", "components", "minisite", "motion-controller.tsx"),
    "utf-8"
  );

  assert.ok(
    controllerSrc.includes('trigger: "#como-funciona"'),
    "Deve manter ScrollTrigger em #como-funciona"
  );
  assert.ok(
    controllerSrc.includes("if (isReducedMotion()) return;"),
    "Deve respeitar prefers-reduced-motion"
  );
  assert.ok(
    controllerSrc.includes("#como-funciona-title") &&
      controllerSrc.includes("#como-funciona-subtitle") &&
      controllerSrc.includes(".como-funciona-step"),
    "Deve animar título, subtítulo e etapas sequencialmente"
  );
  assert.ok(
    controllerSrc.includes("scaleX: 0") && controllerSrc.includes("scaleY: 0"),
    "Deve desenhar a linha da timeline progressivamente no desktop (scaleX) e mobile (scaleY)"
  );
  assert.ok(
    controllerSrc.includes(".como-funciona-icon-wrap") && controllerSrc.includes("y: -5"),
    "Deve aplicar hover discreto com leve movimento vertical nos ícones"
  );
});
