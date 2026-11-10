const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function readWorkspaceFile(...segments) {
  return fs.readFileSync(path.join(process.cwd(), ...segments), "utf-8");
}

test("1. Localização (#localizacao): ícone do WhatsApp usa cor primária dinâmica do tema (var(--primary))", () => {
  const pageSrc = readWorkspaceFile("src", "app", "page.tsx");
  const locStart = pageSrc.indexOf('id="localizacao"');
  const locEnd = pageSrc.indexOf("</section>", locStart);
  assert.ok(locStart > -1 && locEnd > locStart, "Seção #localizacao deve existir");
  const locBlock = pageSrc.slice(locStart, locEnd);

  assert.ok(
    locBlock.includes("Telefone & WhatsApp"),
    "Card Telefone & WhatsApp deve ser preservado"
  );
  assert.ok(
    locBlock.includes('bg-[var(--primary)]/10 text-[var(--primary)]'),
    "Container do ícone na Localização deve preservar fundo suave e cor primária do tema"
  );
  assert.ok(
    locBlock.includes('<WhatsAppIcon className="h-5 w-5 text-[var(--primary)]" variant="monochrome" />'),
    "Ícone do WhatsApp na Localização deve usar variant monochrome com text-[var(--primary)]"
  );
  assert.ok(
    !locBlock.includes('variant="original"'),
    "Localização não deve usar variante verde fixa variant='original' no ícone do WhatsApp"
  );

  // Confirma que WhatsAppIcon variant="monochrome" usa currentColor
  const iconSrc = readWorkspaceFile("src", "components", "ui", "whatsapp-icon.tsx");
  assert.ok(
    iconSrc.includes('if (variant === "monochrome")') &&
      iconSrc.includes('fill="currentColor"'),
    "WhatsAppIcon monochrome deve pintar com fill='currentColor'"
  );
});

test("2. Preservação estrita do botão flutuante verde e do WhatsApp no Hero", () => {
  const floatingSrc = readWorkspaceFile("src", "components", "minisite", "floating-controls.tsx");
  assert.ok(
    floatingSrc.includes("bg-[#25D366]") && floatingSrc.includes('variant="white"'),
    "Botão flutuante de WhatsApp deve manter cor verde #25D366 inalterada"
  );

  const pageSrc = readWorkspaceFile("src", "app", "page.tsx");
  const heroStart = pageSrc.indexOf('id="hero-cta"');
  const heroEnd = pageSrc.indexOf("id=\"hero-benefits\"", heroStart);
  assert.ok(heroStart > -1 && heroEnd > heroStart, "Bloco #hero-cta deve existir");
  const heroCtaBlock = pageSrc.slice(heroStart, heroEnd);

  assert.ok(
    heroCtaBlock.includes("Chamar no WhatsApp") && heroCtaBlock.includes("<WhatsAppIcon"),
    "Botão de WhatsApp do Hero deve ser preservado intacto"
  );
});

test("3. CTA Final (#cta-final): título branco e mais espesso, sem botão WhatsApp e com novo rótulo exato", () => {
  const pageSrc = readWorkspaceFile("src", "app", "page.tsx");
  const ctaStart = pageSrc.indexOf('id="cta-final"');
  const ctaEnd = pageSrc.indexOf("</section>", ctaStart);
  assert.ok(ctaStart > -1 && ctaEnd > ctaStart, "Seção #cta-final deve existir");
  const ctaBlock = pageSrc.slice(ctaStart, ctaEnd);

  // 1) Título branco puro + weight 800 (ou >= 700)
  assert.ok(
    ctaBlock.includes("Agende sua consulta agora"),
    "Texto do título do CTA final deve ser preservado"
  );
  assert.ok(
    ctaBlock.includes("font-extrabold") && ctaBlock.includes("text-white"),
    "Título do CTA final deve usar cor branca pura (text-white) e font-weight 800 (font-extrabold)"
  );
  assert.ok(
    ctaBlock.includes("Dê o primeiro passo para o seu bem-estar emocional."),
    "Descrição abaixo do título deve ser preservada sem alterações"
  );

  // 2) Remoção completa do botão secundário de WhatsApp no banner final
  assert.ok(
    !ctaBlock.includes("WhatsAppIcon") &&
      !ctaBlock.includes("whatsappUrl") &&
      !ctaBlock.includes("WhatsApp"),
    "Banner #cta-final não deve renderizar nenhum botão ou ícone do WhatsApp"
  );

  // 3) Botão principal único com rótulo exato, sem uppercase e sem quebra no desktop
  assert.ok(
    !ctaBlock.includes("Agendar Consulta"),
    "Rótulo antigo 'Agendar Consulta' deve ser removido do banner #cta-final"
  );
  assert.ok(
    ctaBlock.includes("<span>Agendar agora sua consulta pelo app</span>"),
    "Botão deve exibir exatamente o texto 'Agendar agora sua consulta pelo app'"
  );
  assert.ok(
    !ctaBlock.includes("uppercase"),
    "Botão do CTA final não deve transformar o texto em maiúsculas via uppercase"
  );
  assert.ok(
    ctaBlock.includes('href="/agendar"') &&
      ctaBlock.includes("bg-white") &&
      ctaBlock.includes("text-slate-900") &&
      ctaBlock.includes("<ArrowRight") &&
      ctaBlock.includes("sm:whitespace-nowrap"),
    "Botão único deve manter destino /agendar, fundo branco, texto escuro, ícone de seta e linha única no desktop"
  );
});
