import { NextRequest, NextResponse } from "next/server";

// Proxy de consulta à API externa da Elephan (somente leitura, GET).
// Serve para o playground da pagina /elephan: evita CORS e mantem as
// respostas legiveis no cliente. A API key vem do localStorage do admin
// e NAO e persistida no servidor.

const BASE_URL = "https://api.elephan.dev";
// Apenas rotas de leitura documentadas (health + /v1/*)
const ALLOWED_PREFIXES = ["/health", "/v1/"];

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
    if (typeof apiKey === "string" && apiKey.trim()) {
      headers.Authorization = `Bearer ${apiKey.trim()}`;
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
