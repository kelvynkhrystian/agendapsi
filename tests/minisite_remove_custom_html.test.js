const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

test("1. Admin MiniSite: Remoção completa do Bloco HTML Personalizado da interface", () => {
  const filePath = path.join(__dirname, "../src/app/admin/minisite/page.tsx");
  assert.ok(fs.existsSync(filePath), "A página /admin/minisite deve existir");

  const content = fs.readFileSync(filePath, "utf8");

  // Não deve conter títulos, descrições ou referências ao bloco HTML personalizado
  assert.ok(
    !content.includes("Bloco HTML Personalizado"),
    "Interface administrativa não deve conter o card 'Bloco HTML Personalizado'"
  );
  assert.ok(
    !content.includes("scripts são sanitizados automaticamente"),
    "Interface não deve conter instruções sobre sanitização de scripts customizados no MiniSite"
  );
  assert.ok(
    !content.includes("customHtml"),
    "Componente React não deve conter estado, setter ou envio de 'customHtml'"
  );
});

test("2. Backend API Site Settings: Não aceita nem persiste customHtml", () => {
  const routePath = path.join(__dirname, "../src/app/api/admin/site/settings/route.ts");
  assert.ok(fs.existsSync(routePath), "A rota /api/admin/site/settings deve existir");

  const content = fs.readFileSync(routePath, "utf8");

  // Schema Zod não deve aceitar customHtml
  assert.ok(
    !content.includes("customHtml: z.string()"),
    "O schema Zod não deve conter campo customHtml"
  );

  // Prisma upsert não deve gravar customHtml
  assert.ok(
    !content.includes("customHtml:"),
    "A rota não deve persistir customHtml no banco de dados"
  );
});

test("3. MiniSite Público: Não renderiza customHtml nem scripts arbitrários", () => {
  const pagePath = path.join(__dirname, "../src/app/page.tsx");
  assert.ok(fs.existsSync(pagePath), "A página pública / deve existir");

  const content = fs.readFileSync(pagePath, "utf8");

  assert.ok(
    !content.includes("customHtml"),
    "O MiniSite público não deve acessar nem renderizar a propriedade customHtml"
  );
  assert.ok(
    !content.includes("dangerouslySetInnerHTML"),
    "O MiniSite público não deve conter dangerouslySetInnerHTML"
  );
});

test("4. Integridade das Páginas Informativas e Sanitização Legítima", () => {
  const legalViewPath = path.join(__dirname, "../src/components/legal-page-view.tsx");
  assert.ok(fs.existsSync(legalViewPath), "Componente LegalPageView deve existir");

  const sanitizeLibPath = path.join(__dirname, "../src/lib/sanitize.ts");
  assert.ok(fs.existsSync(sanitizeLibPath), "Módulo src/lib/sanitize.ts deve permanecer para páginas informativas");

  const sanitizeContent = fs.readFileSync(sanitizeLibPath, "utf8");
  assert.ok(
    sanitizeContent.includes("sanitizeCustomHtml"),
    "sanitizeCustomHtml deve permanecer disponível para higienização de páginas informativas/legais"
  );
});

test("5. Documentação do Banco e Preservação do Schema Não-Destrutivo", () => {
  const dictPath = path.join(__dirname, "../docs/DICIONARIO_DADOS.md");
  const dictContent = fs.readFileSync(dictPath, "utf8");

  assert.ok(
    dictContent.includes("DEPRECATED") && dictContent.includes("customHtml"),
    "Dicionário de dados deve documentar customHtml como depreciado/inativo"
  );

  const schemaPath = path.join(__dirname, "../prisma/schema.prisma");
  const schemaContent = fs.readFileSync(schemaPath, "utf8");

  assert.ok(
    schemaContent.includes("customHtml"),
    "Schema Prisma deve manter a coluna para compatibilidade sem reset de banco"
  );
});
