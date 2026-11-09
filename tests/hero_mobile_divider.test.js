const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("1. Divisor SVG decorativo entre Hero e Atendimentos permanece oculto no mobile", () => {
  const pagePath = path.join(process.cwd(), "src", "app", "page.tsx");
  const src = fs.readFileSync(pagePath, "utf-8");

  const dividerStart = src.indexOf('id="hero-mobile-divider"');
  assert.ok(dividerStart !== -1, "Wrapper do divisor SVG deve possuir identificador #hero-mobile-divider");

  const dividerSnippet = src.slice(dividerStart, dividerStart + 380);
  assert.ok(dividerSnippet.includes('className="hidden w-full overflow-hidden leading-none -mt-1"'), "Divisor SVG deve estar oculto no mobile com classe hidden");
  assert.equal(dividerSnippet.includes("lg:hidden"), false, "Não deve exibir divisor no mobile apenas com lg:hidden");
});

test("2. SVG do divisor e transições desktop (#hero-bottom-gradient e parallax) são preservados", () => {
  const pagePath = path.join(process.cwd(), "src", "app", "page.tsx");
  const src = fs.readFileSync(pagePath, "utf-8");
  const controllerSrc = fs.readFileSync(
    path.join(process.cwd(), "src", "components", "minisite", "motion-controller.tsx"),
    "utf-8"
  );

  // Código-fonte do asset SVG mantido intacto
  assert.ok(src.includes('viewBox="0 0 1200 120"'), "SVG original do divisor não deve ser deletado do código-fonte");
  assert.ok(src.includes('d="M0,0 C300,90 900,-30 1200,60 L1200,120 L0,120 Z"'), "Path original do SVG deve ser preservado");

  // Gradiente inferior desktop preservado
  assert.ok(src.includes('id="hero-bottom-gradient"'), "Gradiente inferior do Hero desktop deve permanecer");
  assert.ok(
    src.includes("hidden lg:block absolute inset-x-0 bottom-0 h-32 sm:h-40 xl:h-48"),
    "Classes do gradiente inferior desktop devem permanecer intactas"
  );

  // Seção Atendimentos preservada
  assert.ok(src.includes('id="atendimentos" className="py-16 px-4 bg-white scroll-mt-20"'), "Seção Atendimentos não deve ser alterada");

  // Parallax GSAP desktop preservado
  assert.ok(controllerSrc.includes("#hero-parallax-layer") && controllerSrc.includes("yPercent: 12"), "Efeito parallax desktop GSAP deve permanecer");
});
