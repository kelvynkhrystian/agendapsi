import fs from "node:fs";
import path from "node:path";

const FORBIDDEN_HEXES = [
  "#111827",
  "#1f2937",
  "#374151",
  "#0f172a",
  "#1e293b",
  "#334155",
  "#020617",
  "#172554",
  "#080809",
  "#101012",
  "#19191c",
  "#222226",
  "#303034",
  "#e2e4e8",
  "#141416",
  "#1e1e22",
];

const FORBIDDEN_PATTERNS = [
  { name: "Teal utility class", regex: /\bteal-[0-9]+/g },
  {
    name: "Forbidden blue-tinted/slate hex",
    regex: new RegExp(`(${FORBIDDEN_HEXES.join("|")})\\b`, "gi"),
  },
];

const EXCLUSION_DIRS = ["node_modules", ".next", ".git"];

function scanDir(dir, errors = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!EXCLUSION_DIRS.includes(entry.name)) {
        scanDir(path.join(dir, entry.name), errors);
      }
    } else if (
      entry.isFile() &&
      (entry.name.endsWith(".tsx") ||
        entry.name.endsWith(".ts") ||
        entry.name.endsWith(".css"))
    ) {
      const filePath = path.join(dir, entry.name);
      const content = fs.readFileSync(filePath, "utf8");
      const lines = content.split("\n");

      lines.forEach((line, idx) => {
        // Ignora comentários de documentação ou eslint
        if (line.trim().startsWith("//") || line.trim().startsWith("/*")) return;

        for (const { name, regex } of FORBIDDEN_PATTERNS) {
          const matches = line.match(regex);
          if (matches) {
            errors.push({
              file: filePath,
              line: idx + 1,
              name,
              matches,
              text: line.trim(),
            });
          }
        }
      });
    }
  }

  return errors;
}

console.log("🔍 Verificando integridade das cores e temas neutros do PSI...");
const violations = scanDir("src");

if (violations.length > 0) {
  console.error(`❌ Foram encontradas ${violations.length} violações de cores/tokens:`);
  violations.forEach((v) => {
    console.error(`  - ${v.file}:${v.line} [${v.name}] -> ${v.matches.join(", ")}`);
    console.error(`    Linha: ${v.text}`);
  });
  process.exit(1);
} else {
  console.log("✅ Auditoria de Cores Aprovada! Nenhum tom indesejado ou classe estática de teal foi encontrada.");
  process.exit(0);
}
