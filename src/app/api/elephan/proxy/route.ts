import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Proxy de consulta à API externa da Elephan (somente leitura, GET).
// Resolve a chave de API nesta ordem:
//   1. override do playground (admin, não persistida);
//   2. tabela app_config no Supabase (admin troca pela interface — vale
//      para todos os usuários imediatamente, sem redeploy);
//   3. variável de ambiente ELEPHAN_API_KEY (fallback inicial).

const BASE_URL = "https://api.elephan.dev";
// Apenas rotas de leitura documentadas (health + /v1/*)
const ALLOWED_PREFIXES = ["/health", "/v1/"];

// Cache em memória da chave lida do Supabase (evita consulta a cada request)
let chaveCache: { valor: string | null; ts: number } | null = null;
const CHAVE_CACHE_TTL = 60 * 1000;

async function chaveDoSupabase(): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  if (chaveCache && Date.now() - chaveCache.ts < CHAVE_CACHE_TTL) return chaveCache.valor;
  try {
    const supabase = createClient(url, serviceKey);
    const { data } = await supabase
      .from("app_config")
      .select("valor")
      .eq("chave", "elephan_api_key")
      .maybeSingle();
    chaveCache = { valor: (data?.valor as string) ?? null, ts: Date.now() };
    return chaveCache.valor;
  } catch {
    // tabela inexistente/erro: cai para o fallback de ambiente
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { path: apiPath, apiKey } = await request.json();

    if (typeof apiPath !== "string" || !ALLOWED_PREFIXES.some((p) => apiPath.startsWith(p))) {
      return NextResponse.json({ error: "Path não permitido" }, { status: 400 });
    }
    if (apiPath.includes("..") || apiPath.includes(" ")) {
      return NextResponse.json({ error: "Path inválido" }, { status: 400 });
    }

    const headers: Record<string, string> = { Accept: "application/json" };
    const key =
      typeof apiKey === "string" && apiKey.trim()
        ? apiKey.trim() // override do playground (admin)
        : (await chaveDoSupabase()) ?? process.env.ELEPHAN_API_KEY ?? "";
    if (key) {
      headers.Authorization = `Bearer ${key}`;
    }

    const started = Date.now();
    let upstream: Response;
    try {
      upstream = await fetch(`${BASE_URL}${apiPath}`, { headers, cache: "no-store" });
    } catch (e) {
      return NextResponse.json(
        { error: "Falha ao conectar na API da Elephan", message: String(e) },
        { status: 502 }
      );
    }
    const timeMs = Date.now() - started;
    const body = await upstream.text();

    let parsed: unknown = body;
    try {
      parsed = JSON.parse(body);
    } catch {
      // corpo nao-JSON: devolve como texto
    }

    return NextResponse.json({
      status: upstream.status,
      timeMs,
      rateLimit: {
        limit: upstream.headers.get("x-ratelimit-limit"),
        remaining: upstream.headers.get("x-ratelimit-remaining"),
        reset: upstream.headers.get("x-ratelimit-reset"),
      },
      body: parsed,
    });
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }
}
