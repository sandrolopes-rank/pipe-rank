// ============================================================
// Testes de API / segurança do rank-crm
// ============================================================
// Faz login REAL no Supabase com as duas contas de teste e exercita
// a matriz de autorização das rotas /api/*. Não cria nem apaga dados
// (apenas mutação revertida: tema do próprio usuário de teste).
//
// Uso:
//   node tests/api/run-api-tests.mjs [baseUrl]
//   (padrão: http://localhost:3000 — requer `npm run dev` ativo)
//
// Sai com código 1 se qualquer verificação falhar.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

// ---- .env.local ----
function envVar(name) {
  const txt = readFileSync(join(root, ".env.local"), "utf8");
  const line = txt.split(/\r?\n/).find((l) => l.startsWith(`${name}=`));
  if (!line) throw new Error(`Variável ${name} ausente no .env.local`);
  return line.slice(name.length + 1).trim();
}

const SUPABASE_URL = envVar("NEXT_PUBLIC_SUPABASE_URL");
const ANON_KEY = envVar("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const BASE = process.argv[2] || "http://localhost:3000";

const ADMIN = { email: "sandro.lopes@rankmyapp.com.br", password: "senha123" };
const USER = { email: "teste@rankmyapp.com.br", password: "senha123" };

// ---- resultados ----
const results = [];
function record(id, desc, expected, observed, pass, evidence) {
  results.push({ id, desc, expected, observed, pass });
  const icon = pass ? "PASS" : "FAIL";
  console.log(`[${icon}] ${id} — ${desc}`);
  console.log(`       esperado: ${expected} | observado: ${observed}`);
  if (evidence) console.log(`       evidência: ${evidence}`);
}

async function supabaseLogin({ email, password }) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON_KEY },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Login Supabase falhou para ${email}: HTTP ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

async function supabaseMe(token) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` },
  });
  return res.json();
}

async function callApi(method, path, { token, body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* corpo não-JSON */
  }
  return { status: res.status, json };
}

const negado = (s) => s === 401 || s === 403;

// ---- execução ----
async function main() {
  console.log(`Base URL: ${BASE}`);
  console.log(`Supabase: ${SUPABASE_URL}\n`);

  const adminToken = await supabaseLogin(ADMIN);
  const userToken = await supabaseLogin(USER);
  console.log("Logins obtidos (admin + usuário comum)\n");

  // Contexto: dados do próprio usuário de teste (id + metadata original p/ restaurar)
  const me = await supabaseMe(userToken);
  const alvo = { id: me.id, email: me.email, meta: me.user_metadata ?? {} };

  // ---------- T1xx: /api/users ----------
  {
    const r = await callApi("GET", "/api/users", { token: adminToken });
    record("T-101", "GET /api/users como admin (master)", "200", String(r.status), r.status === 200,
      r.status === 200 ? `${(r.json?.users ?? []).length} usuários` : JSON.stringify(r.json).slice(0, 150));
  }
  {
    const r = await callApi("GET", "/api/users", { token: userToken });
    record("T-102", "GET /api/users como usuário comum (IDOR)", "401/403", String(r.status), negado(r.status),
      negado(r.status) ? "negado corretamente" : `VAZOU: ${JSON.stringify(r.json).slice(0, 200)}`);
  }
  {
    const r = await callApi("GET", "/api/users");
    record("T-103", "GET /api/users sem token", "401/403", String(r.status), negado(r.status),
      negado(r.status) ? "negado" : "aceito sem auth");
  }

  // ---------- T2xx: rotas administrativas mutantes (usuário comum) ----------
  const mutantes = [
    ["T-201", "POST", "/api/users/create", { email: "intruso@rankmyapp.com.br", password: "x".repeat(10) }],
    ["T-202", "DELETE", "/api/users/delete", { userId: alvo.id }],
    ["T-203", "PATCH", "/api/users/reset-password", { userId: alvo.id, password: "NovaSenha123" }],
    ["T-204", "PATCH", "/api/users/role", { userId: alvo.id, role: "admin" }],
    ["T-205", "PATCH", "/api/users/toggle-active", { userId: alvo.id, active: false }],
  ];
  for (const [id, method, path, body] of mutantes) {
    const r = await callApi(method, path, { token: userToken, body });
    record(id, `${method} ${path} como usuário comum`, "401/403", String(r.status), negado(r.status),
      negado(r.status) ? "negado" : JSON.stringify(r.json).slice(0, 200));
  }

  // ---------- T3xx: privilégios ----------
  {
    const r = await callApi("GET", "/api/privileges", { token: userToken });
    record("T-301", "GET /api/privileges como usuário comum", "401/403", String(r.status), negado(r.status),
      negado(r.status) ? "negado" : JSON.stringify(r.json).slice(0, 200));
  }
  {
    const r = await callApi("POST", "/api/privileges", { token: userToken, body: { name: "Invasor", config: {} } });
    record("T-302", "POST /api/privileges como usuário comum", "401/403", String(r.status), negado(r.status),
      negado(r.status) ? "negado" : JSON.stringify(r.json).slice(0, 200));
  }
  {
    const r = await callApi("GET", "/api/privileges");
    record("T-303", "GET /api/privileges sem token", "401/403", String(r.status), negado(r.status),
      negado(r.status) ? "negado" : "aceito sem auth");
  }
  {
    const r = await callApi("GET", "/api/privileges", { token: adminToken });
    record("T-304", "GET /api/privileges como admin (master)", "200", String(r.status), r.status === 200,
      r.status === 200 ? `${(r.json ?? []).length} privilégios` : JSON.stringify(r.json).slice(0, 150));
  }

  // ---------- T4xx: /api/users/theme ----------
  {
    // mutação no PRÓPRIO usuário de teste (revertida ao final)
    const r = await callApi("PATCH", "/api/users/theme", {
      body: { userId: alvo.id, themePalette: "qa-audit", themeMode: "dark" },
    });
    record("T-401", "PATCH /api/users/theme SEM token (metadata de terceiros)", "401/403", String(r.status), negado(r.status),
      negado(r.status) ? "negado" : `ACEITO SEM AUTH (metadata de ${alvo.email} alterável por qualquer um)`);
    if (!negado(r.status) && r.status === 200) {
      const depois = await supabaseMe(userToken);
      record("T-402", "Efeito da T-401: theme_palette gravado sem auth", "não deveria acontecer",
        String(depois.user_metadata?.theme_palette), depois.user_metadata?.theme_palette === "qa-audit",
        "prova de escrita não autenticada em user_metadata");
    }
  }
  {
    const r = await callApi("PATCH", "/api/users/theme", { token: userToken, body: { userId: alvo.id, themePalette: "qa-audit", themeMode: "dark" } });
    record("T-403", "PATCH /api/users/theme com token do próprio usuário", "200 (uso legítimo)", String(r.status), r.status === 200,
      r.status === 200 ? "self-service ok" : JSON.stringify(r.json).slice(0, 150));
  }
  {
    // escrita cross-user: token do usuário comum tentando alterar o tema do admin
    const lista = await callApi("GET", "/api/users", { token: adminToken });
    const users = Array.isArray(lista.json) ? lista.json : lista.json?.users ?? [];
    const adminId = users.find((u) => (u.email || "").toLowerCase() === ADMIN.email)?.id;
    const r = await callApi("PATCH", "/api/users/theme", { token: userToken, body: { userId: adminId, themePalette: "hackeado" } });
    record("T-404", "PATCH /api/users/theme cross-user (usuário → admin)", "403", String(r.status), r.status === 403,
      r.status === 403 ? "self-service enforced" : `ESCREVEU EM TERCEIRO: ${JSON.stringify(r.json).slice(0, 120)}`);
  }

  // ---------- T5xx: Elephan ----------
  {
    const r = await callApi("POST", "/api/elephan/proxy", { body: { path: "/health" } });
    record("T-501", "POST /api/elephan/proxy SEM token (usa chave do servidor)", "401", String(r.status), r.status === 401,
      r.status === 401 ? "negado" : `proxy aberto sem auth: upstream=${r.json?.status ?? "?"}`);
  }
  {
    const r = await callApi("POST", "/api/elephan/proxy", { token: userToken, body: { path: "/health" } });
    record("T-504", "POST /api/elephan/proxy COM token (uso legítimo)", "200", String(r.status), r.status === 200,
      r.status === 200 ? `upstream=${r.json?.status}` : JSON.stringify(r.json).slice(0, 150));
  }
  {
    const r = await callApi("POST", "/api/elephan/proxy", { token: userToken, body: { path: "/v1/../admin" } });
    record("T-502", "POST /api/elephan/proxy com path traversal (autenticado)", "400", String(r.status), r.status === 400,
      JSON.stringify(r.json).slice(0, 120));
  }
  {
    const r = await callApi("POST", "/api/elephan/config", { token: userToken, body: { valor: "elk_prod_falso" } });
    record("T-503", "POST /api/elephan/config como usuário comum", "401/403", String(r.status), negado(r.status),
      negado(r.status) ? "negado" : "CHAVE ALTERADA POR NÃO-ADMIN");
  }
  {
    const r = await callApi("POST", "/api/elephan/config", { body: { valor: "elk_prod_falso" } });
    record("T-505", "POST /api/elephan/config SEM token", "401", String(r.status), r.status === 401,
      r.status === 401 ? "negado" : JSON.stringify(r.json).slice(0, 120));
  }
  {
    // chave propositalmente inválida: valida o caminho do admin (chega na validação
    // de formato, HTTP 400) SEM alterar app_config
    const r = await callApi("POST", "/api/elephan/config", { token: adminToken, body: { valor: "chave-invalida-qa" } });
    record("T-506", "POST /api/elephan/config como admin via Bearer (chave inválida)", "400", String(r.status), r.status === 400,
      r.status === 400 ? "autorizado e validado" : JSON.stringify(r.json).slice(0, 120));
  }

  // ---------- restauração ----------
  const metaOriginal = alvo.meta ?? {};
  const r = await callApi("PATCH", "/api/users/theme", {
    token: userToken,
    body: {
      userId: alvo.id,
      themePalette: metaOriginal.theme_palette ?? null,
      themeMode: metaOriginal.theme_mode ?? null,
    },
  });
  console.log(`\n[restauração] tema de ${USER.email} revertido ao original: HTTP ${r.status}`);

  // ---- resumo ----
  const falhas = results.filter((x) => !x.pass);
  console.log(`\n===== RESUMO: ${results.length} verificações, ${results.length - falhas.length} PASS, ${falhas.length} FAIL =====`);
  if (falhas.length) {
    for (const f of falhas) console.log(`  FAIL ${f.id}: ${f.desc} (esperado ${f.expected}, observado ${f.observed})`);
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error("ERRO FATAL:", e.message);
  process.exit(2);
});
