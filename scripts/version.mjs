#!/usr/bin/env node
/**
 * Deriva a versão do app a partir do histórico de commits (Conventional Commits).
 *
 * Regra (SemVer simplificado, baseline v0.1.0 = commit inicial):
 *   - commit "feat"  → incrementa MINOR e zera PATCH  (ex.: 0.10.2 → 0.11.0)
 *   - commit "fix"   → incrementa PATCH               (ex.: 0.10.1 → 0.10.2)
 *   - commit "chore"/"docs"/etc. → não altera a versão
 *
 * A versão calculada deve estar refletida em:
 *   - src/lib/version.ts   (export const APP_VERSION)
 *   - package.json         (campo "version")
 *
 * Uso:
 *   node scripts/version.mjs             # verifica (padrão); exit 1 se divergente
 *   node scripts/version.mjs --check     # idem, explícito (útil em CI)
 *   node scripts/version.mjs --write     # sincroniza os dois arquivos
 *
 * npm scripts: `npm run version:check` | `npm run version:update`
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VERSION_TS = path.join(ROOT, "src", "lib", "version.ts");
const PACKAGE_JSON = path.join(ROOT, "package.json");

// Versão declarada no commit raiz ("chore: initial commit v0.1 - Rank CRM").
const BASELINE = [0, 1, 0];

/** Assuntos dos commits, do mais antigo para o mais recente. */
function gitSubjects() {
  try {
    const out = execFileSync("git", ["log", "--reverse", "--format=%s"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    return out.split(/\r?\n/).filter(Boolean);
  } catch {
    console.error("✗ Não foi possível ler o histórico do git (git ausente ou fora do repositório).");
    process.exit(1);
  }
}

/**
 * Tipo do commit convencional — aceita escopos ("feat(overview): ...",
 * "fix(ui): ...") e marcador de breaking change ("feat!:").
 * Retorna null para mensagens fora do padrão (merge commits etc.) → não bumpam.
 */
function commitType(subject) {
  const match = subject.match(/^\s*(\w+)(?:\([\w./-]+\))?!?\s*:/);
  return match ? match[1].toLowerCase() : null;
}

/** Versão resultante da aplicação da regra sobre os commits (baseline = raiz). */
function computeVersion(subjects) {
  let [major, minor, patch] = BASELINE;
  // slice(1): o commit inicial é a própria baseline (v0.1.0) e não bumpa.
  for (const subject of subjects.slice(1)) {
    const type = commitType(subject);
    if (type === "feat") {
      minor += 1;
      patch = 0;
    } else if (type === "fix") {
      patch += 1;
    }
  }
  return `${major}.${minor}.${patch}`;
}

/** Versões atualmente declaradas em src/lib/version.ts e package.json. */
function declaredVersions() {
  const ts = readFileSync(VERSION_TS, "utf8");
  const app = ts.match(/export const APP_VERSION = "([^"]+)"/)?.[1] ?? null;
  const pkg = JSON.parse(readFileSync(PACKAGE_JSON, "utf8")).version ?? null;
  return { app, pkg };
}

/** Grava a versão calculada nos dois arquivos (preserva a formatação). */
function syncFiles(version) {
  const ts = readFileSync(VERSION_TS, "utf8");
  writeFileSync(
    VERSION_TS,
    ts.replace(/export const APP_VERSION = "[^"]+"/, `export const APP_VERSION = "${version}"`),
  );
  const pkg = readFileSync(PACKAGE_JSON, "utf8");
  writeFileSync(
    PACKAGE_JSON,
    pkg.replace(/("version"\s*:\s*")[^"]+(")/, `$1${version}$2`),
  );
}

const mode = process.argv.includes("--write") ? "write" : "check";
const subjects = gitSubjects();
const computed = computeVersion(subjects);
const { app, pkg } = declaredVersions();

const counts = { feat: 0, fix: 0, outros: 0 };
for (const subject of subjects.slice(1)) {
  const type = commitType(subject);
  if (type === "feat") counts.feat += 1;
  else if (type === "fix") counts.fix += 1;
  else counts.outros += 1;
}

console.log(`Commits desde a baseline v0.${BASELINE[1]}.${BASELINE[2]}: ${counts.feat} feat, ${counts.fix} fix, ${counts.outros} sem bump (chore/docs/merge)`);
console.log(`Versão calculada do histórico:   ${computed}`);
console.log(`Declarada em src/lib/version.ts: ${app ?? "(não encontrada)"}`);
console.log(`Declarada em package.json:       ${pkg ?? "(não encontrada)"}`);

if (mode === "write") {
  if (computed === app && computed === pkg) {
    console.log("✓ Já sincronizado — nada a atualizar.");
  } else {
    syncFiles(computed);
    console.log(`✓ src/lib/version.ts e package.json atualizados para ${computed}.`);
  }
} else if (computed !== app || computed !== pkg) {
  console.error("✗ Versão declarada divergente do histórico de commits. Rode: npm run version:update");
  process.exit(1);
} else {
  console.log("✓ Versões sincronizadas com o histórico de commits.");
}
