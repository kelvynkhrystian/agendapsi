/**
 * scripts/check-db-docs.mjs
 * 
 * Verificador automático de consistência entre o esquema do Prisma (prisma/schema.prisma)
 * e os documentos de dicionário de dados (docs/DICIONARIO_DADOS.md e docs/GUIA_BANCO.md).
 * 
 * Execução: npm run docs:db:check
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const SCHEMA_PATH = path.join(rootDir, "prisma", "schema.prisma");
const DICIONARIO_PATH = path.join(rootDir, "docs", "DICIONARIO_DADOS.md");
const GUIA_BANCO_PATH = path.join(rootDir, "docs", "GUIA_BANCO.md");
const DATABASE_DOC_PATH = path.join(rootDir, "docs", "DATABASE.md");

console.log("\n=======================================================");
console.log(" 🔍 PSI — Verificação de Consistência da Documentação ");
console.log("=======================================================\n");

let hasErrors = false;

// 1. Verificar existência dos arquivos essenciais
const requiredFiles = [
  { name: "Esquema Prisma", path: SCHEMA_PATH },
  { name: "Dicionário de Dados", path: DICIONARIO_PATH },
  { name: "Guia Rápido do Banco", path: GUIA_BANCO_PATH },
  { name: "Arquitetura do Banco (DATABASE.md)", path: DATABASE_DOC_PATH }
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file.path)) {
    console.error(`❌ [ERRO] Arquivo obrigatório não encontrado: ${file.name} (${file.path})`);
    hasErrors = true;
  } else {
    console.log(`✅ Arquivo localizado: ${file.name}`);
  }
}

if (hasErrors) {
  process.exit(1);
}

// 2. Ler conteúdos
const schemaContent = fs.readFileSync(SCHEMA_PATH, "utf-8");
const dicionarioContent = fs.readFileSync(DICIONARIO_PATH, "utf-8");
const guiaContent = fs.readFileSync(GUIA_BANCO_PATH, "utf-8");

// 3. Extrair Enums do schema
const enumRegex = /enum\s+(\w+)\s+\{([^}]+)\}/g;
const enums = [];
let enumMatch;
while ((enumMatch = enumRegex.exec(schemaContent)) !== null) {
  const enumName = enumMatch[1];
  const values = enumMatch[2]
    .split("\n")
    .map(line => line.trim())
    .filter(line => line && !line.startsWith("//"));
  enums.push({ name: enumName, values });
}

// 4. Extrair Modelos e seus campos do schema
const modelRegex = /model\s+(\w+)\s+\{([^}]+)\}/g;
const models = [];
let modelMatch;
while ((modelMatch = modelRegex.exec(schemaContent)) !== null) {
  const modelName = modelMatch[1];
  const body = modelMatch[2];
  const lines = body.split("\n");
  const fields = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("//") || line.startsWith("@@")) continue;
    const parts = line.split(/\s+/);
    if (parts.length >= 2) {
      const fieldName = parts[0];
      const fieldType = parts[1];
      // Ignorar campos de navegação reversa implícitos se não forem colunas ou relações diretas
      fields.push({ name: fieldName, type: fieldType });
    }
  }

  models.push({ name: modelName, fields });
}

console.log(`\n📋 Estatísticas do Prisma Schema:`);
console.log(`   - Modelos detectados: ${models.length}`);
console.log(`   - Enums detectados: ${enums.length}\n`);

// 5. Validar presença dos Modelos e Campos no Dicionário
console.log("Verificando se todos os modelos e campos constam em docs/DICIONARIO_DADOS.md...");

let missingModels = 0;
let missingFields = 0;

for (const model of models) {
  // Verifica se o modelo é mencionado como cabeçalho ou seção
  const modelMentionRegex = new RegExp(`(Modelo:\\s*|Prisma:\\s*|\`)${model.name}(\`|\\s)`, "i");
  if (!modelMentionRegex.test(dicionarioContent) && !dicionarioContent.includes(model.name)) {
    console.error(`❌ [MODELO AUSENTE] O modelo '${model.name}' não foi encontrado no dicionário!`);
    missingModels++;
    hasErrors = true;
    continue;
  }

  // Verifica campos do modelo
  for (const field of model.fields) {
    // Procura pelo nome do campo entre crases ou na tabela
    const fieldPattern = new RegExp(`\`${field.name}\``, "g");
    if (!fieldPattern.test(dicionarioContent) && !dicionarioContent.includes(`| ${field.name} `)) {
      console.warn(`⚠️ [CAMPO NÃO DOCUMENTADO] Modelo '${model.name}' -> Campo '${field.name}' (${field.type}) não encontrado!`);
      missingFields++;
      hasErrors = true;
    }
  }
}

// 6. Validar presença dos Enums
console.log("\nVerificando se todos os Enums constam na documentação...");
let missingEnums = 0;
for (const en of enums) {
  if (!dicionarioContent.includes(en.name)) {
    console.error(`❌ [ENUM AUSENTE] O enum '${en.name}' não foi documentado!`);
    missingEnums++;
    hasErrors = true;
  }
}

// 7. Validar tópicos essenciais do Guia Rápido
console.log("\nVerificando tópicos essenciais em docs/GUIA_BANCO.md...");
const essentialTopics = [
  "AdminAccount",
  "Patient",
  "Session",
  "Appointment",
  "Payment",
  "ClinicalRecord",
  "StoredFile",
  "storage/uploads/",
  "passwordHash",
  "SiteSettings"
];

for (const topic of essentialTopics) {
  if (!guiaContent.includes(topic)) {
    console.warn(`⚠️ [TÓPICO NÃO ENCONTRADO] O Guia Rápido não cita o elemento '${topic}'`);
    hasErrors = true;
  }
}

console.log("\n-------------------------------------------------------");
if (hasErrors) {
  console.error(`❌ A verificação FALHOU!`);
  console.error(`   Modelos ausentes: ${missingModels}`);
  console.error(`   Campos ausentes: ${missingFields}`);
  console.error(`   Enums ausentes: ${missingEnums}`);
  console.error(`\nAtualize docs/DICIONARIO_DADOS.md ou docs/GUIA_BANCO.md para sincronizar.`);
  process.exit(1);
} else {
  console.log(`✅ SUCESSO: Todos os ${models.length} modelos, seus campos e enums estão documentados!`);
  console.log(`ℹ️ Nota: A verificação automatizada garante paridade estrutural.`);
  console.log(`   Revisões conceituais e semânticas de regras de negócio devem ser mantidas manualmente.`);
  console.log("-------------------------------------------------------\n");
  process.exit(0);
}
