// ============================================
// Gerador do registro de páginas para o sistema de privilégios
// ============================================
// Escaneia src/app/**/page.tsx e gera src/lib/privileges-pages.generated.ts
// com todas as rotas reais do app. Roda automaticamente em `npm run dev`
// e `npm run build` (scripts predev/prebuild). Páginas manuais do registry
// (src/lib/privileges.ts) têm prioridade; rotas novas entram sozinhas.
//
// Rode manualmente com: npm run gen:privileges

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_DIR = path.resolve(__dirname, "..", "src", "app");
const OUT_FILE = path.resolve(__dirname, "..", "src", "lib", "privileges-pages.generated.ts");

// Rotas que não fazem sentido como privilégio (públicas, redirects, sistema)
const EXCLUDED = new Set([
  "login",            // pública
  "recupera-senha",   // pública
  "auth",             // callback de OAuth
  "dashboard",        // redirect → /overview
  "oportunidades",    // redirect → /overview
  "usuarios",         // admin-only (gerencia usuários e privilégios)
]);

function walk(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const found = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (e.name.startsWith("_") || e.name.startsWith(".")) continue;
    if (e.name.startsWith("[") || e.name.startsWith("(")) continue; // dinâmicas e grupos
    const full = path.join(dir, e.name);
    if (fs.existsSync(path.join(full, "page.tsx")) || fs.existsSync(path.join(full, "page.jsx"))) {
      found.push(full);
    }
    found.push(...walk(full));
  }
  return found;
}

function toTitle(slug) {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const pageDirs = walk(APP_DIR)
  .map((full) => {
    const rel = path.relative(APP_DIR, full);
    const segments = rel.split(path.sep).filter((s) => !EXCLUDED.has(s));
    return { segments, rel };
  })
  .filter(({ segments }) => segments.length > 0);

const pages = pageDirs
  .map(({ segments }) => ({
    key: segments.join("-"),
    href: "/" + segments.join("/"),
    label: toTitle(segments[segments.length - 1]),
  }))
  .sort((a, b) => a.href.localeCompare(b.href));

const content = `// ============================================
// GERADO AUTOMATICAMENTE — não editar à mão
// ============================================
// Fonte: scripts/gen-privileges-pages.mjs (roda em predev/prebuild).
// Lista todas as rotas reais de src/app; o registry manual em
// src/lib/privileges.ts fornece labels/funções e tem prioridade.

export interface AutoPage {
  key: string;
  href: string;
  label: string;
}

export const AUTO_PAGES: AutoPage[] = ${JSON.stringify(pages, null, 2)};
`;

fs.writeFileSync(OUT_FILE, content, "utf8");
console.log(`[gen-privileges-pages] ${pages.length} página(s): ${pages.map((p) => p.href).join(", ")}`);
