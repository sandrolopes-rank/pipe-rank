// Utilitários compartilhados da integração Elephan (client-side).
// Usados pela página /elephan, pelo quadro de alertas e pelo sino da sidebar.

export const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export const ELEPHAN_APP_URL = "https://app.elephan.ai/info-transcript/?t=";
export const LIMIAR_NEGATIVO = 40; // % negativo para caracterizar sentimento negativo dominante
export const CACHE_PREFIX = "elephan_cache_";
export const CACHE_TTL = 15 * 60 * 1000;

export function urlElephan(id: string): string {
  return `${ELEPHAN_APP_URL}${id}`;
}

export function normNome(nome: string): string {
  return nome.trim().toLowerCase().replace(/\s+/g, " ");
}

// Extrai o nome do cliente do título ("Alinhamento | Centauro <> RankMyApp" -> "Centauro")
export function clienteDoTitulo(title?: string): string | null {
  if (!title || !title.includes("<>")) return null;
  let parte = title.split("<>")[0].trim();
  if (parte.includes("|")) parte = parte.split("|").pop()!.trim();
  return parte || null;
}

export interface ElephanAlerta {
  chave: string;
  meetingId: string;
  tipo: "sentimento" | "churn" | "scorecard";
  severidade: "critica" | "alta" | "media";
  titulo: string;
  descricao: string;
  data?: string;
  responsavel?: string;
  dealUrl?: string | null;
}

interface SentimentoEntry {
  sentimental?: string;
  total?: number;
  perc?: number;
}

// Reunião com negativo dominante (>= LIMIAR_NEGATIVO e acima do positivo)
export function negativoDominante(
  totals: SentimentoEntry[] | undefined
): boolean {
  const neg = (totals ?? []).find((t) => (t.sentimental ?? "").toUpperCase() === "NEGATIVE");
  const pos = (totals ?? []).find((t) => (t.sentimental ?? "").toUpperCase() === "POSITIVE");
  return Boolean(neg && (neg.perc ?? 0) >= LIMIAR_NEGATIVO && (!pos || (pos.perc ?? 0) < (neg.perc ?? 0)));
}

// Avalia UMA reunião (com reasons[] quando disponível) e retorna os alertas:
// sentimento negativo dominante + churn signals. Scorecard: camada futura.
export type ElephanTranscribeComSinais = ElephanTranscribeResumo & {
  reasons?: Array<{ type?: string; description?: string; details?: string }>;
};
export function avaliarAlertaReuniao(o: ElephanTranscribeComSinais): ElephanAlerta[] {
  const out: ElephanAlerta[] = [];
  const cliente = o.title?.includes("<>") ? o.title.split("<>")[0].split("|").pop()?.trim() : o.title;

  if (negativoDominante(o.sentimentAnalysis?.totalSentiment)) {
    const totals = o.sentimentAnalysis?.totalSentiment ?? [];
    const neg = totals.find((t) => (t.sentimental ?? "").toUpperCase() === "NEGATIVE");
    const pos = totals.find((t) => (t.sentimental ?? "").toUpperCase() === "POSITIVE");
    out.push({
      chave: `${o.id}:sentimento`,
      meetingId: o.id,
      tipo: "sentimento",
      severidade: "alta",
      titulo: `Sentimento negativo dominante — ${cliente || o.title || "Reunião"}`,
      descricao: `Negativo ${Math.round(neg?.perc ?? 0)}% vs positivo ${Math.round(pos?.perc ?? 0)}% em "${o.title}"`,
      data: o.dateIncluded,
      responsavel: o.user?.name || o.user?.email,
      dealUrl: o.deal?.crmUrl ?? null,
    });
  }

  const churns = (o.reasons ?? []).filter((r) => (r.type ?? "").toLowerCase() === "churn_signal");
  churns.forEach((r, i) => {
    out.push({
      chave: `${o.id}:churn:${i}`,
      meetingId: o.id,
      tipo: "churn",
      severidade: "critica",
      titulo: `Sinal de churn — ${cliente || o.title || "Reunião"}`,
      descricao: r.description || "Sinal de churn detectado na reunião",
      data: o.dateIncluded,
      responsavel: o.user?.name || o.user?.email,
      dealUrl: o.deal?.crmUrl ?? null,
    });
  });

  // Camada de scorecard (futura): o avaliador de scorecard consumirá
  // answers[] detalhadas quando os scorecards forem configurados na Elephan.
  return out;
}

// Consulta via proxy server-side (evita CORS); timeout de segurança.
// apiKey é OPCIONAL: quando vazia, o proxy usa a chave configurada no
// servidor (.env.local / variável de ambiente da Vercel).
export interface ElephanApiResposta {
  data?: unknown;
  pagination?: { page?: number; limit?: number; total?: number; totalPages?: number; hasNext?: boolean; hasPrev?: boolean };
  status?: number;
}

export async function fetchElephan(path: string, apiKey = ""): Promise<ElephanApiResposta> {
  const res = await fetch("/api/elephan/proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, apiKey }),
    signal: AbortSignal.timeout(45000),
  });
  const data = await res.json();
  if (!res.ok || (data.status ?? 0) >= 400) throw new Error(data.error ?? `API ${data.status ?? 500}`);
  return (data.body ?? {}) as ElephanApiResposta;
}

export interface ElephanTranscribeResumo {
  id: string;
  title?: string;
  dateIncluded?: string;
  duration?: number;
  user?: { name?: string; email?: string };
  prompt?: { name?: string };
  deal?: { crmUrl?: string | null } | null;
  sentimentAnalysis?: {
    totalSentiment?: SentimentoEntry[];
    speakerSentiment?: Array<{
      speaker?: string;
      total?: number;
      sentiments?: SentimentoEntry[];
    }>;
  } | null;
  url_file?: string;
}

export interface CarregarMesResultado {
  itens: ElephanTranscribeResumo[];
  ts: number;
  doCache: boolean;
}

// Lê o cache do mês sem ir à rede (null quando não há)
export function lerCacheMes(inicioISO: string): CarregarMesResultado | null {
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${inicioISO.substring(0, 7)}`);
    if (!raw) return null;
    const cache = JSON.parse(raw) as CarregarMesResultado;
    return cache;
  } catch {
    return null;
  }
}

export function cacheFresca(ts: number): boolean {
  return Date.now() - ts < CACHE_TTL;
}

function itensLeves(todas: unknown[]): ElephanTranscribeResumo[] {
  // Descarta campos pesados (transcript ~25KB/reunião) antes de cachear
  return todas.map((o) => {
    const r = (o ?? {}) as Record<string, unknown> & { id: string };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { transcript, keywords, competitors, tags, importantPoints, summary, ...leve } = r;
    return { id: r.id, ...(leve as object) } as ElephanTranscribeResumo;
  });
}

// Carrega o mês: cache-first em localStorage (zero custo no Supabase);
// TTL de 15min — vencido, busca na rede e reescreve o cache.
export async function carregarMes(
  inicioISO: string,
  fimISO: string,
  apiKey = "",
  opts?: { forcar?: boolean; maxPaginas?: number }
): Promise<CarregarMesResultado> {
  const chave = `${CACHE_PREFIX}${inicioISO.substring(0, 7)}`;
  const maxPaginas = opts?.maxPaginas ?? 10;

  if (!opts?.forcar) {
    const cache = lerCacheMes(inicioISO);
    if (cache && cacheFresca(cache.ts)) return { ...cache, doCache: true };
  }

  const todas: Array<ElephanTranscribeResumo & Record<string, unknown>> = [];
  for (let p = 1; p <= maxPaginas; p++) {
    const body = await fetchElephan(
      `/v1/transcribes?limit=100&startDate=${inicioISO}&endDate=${fimISO}&page=${p}`,
      apiKey
    );
    todas.push(...((body.data ?? []) as Array<ElephanTranscribeResumo & Record<string, unknown>>));
    if (!body.pagination?.hasNext) break;
  }
  const itens = itensLeves(todas);
  const ts = Date.now();
  try {
    localStorage.setItem(chave, JSON.stringify({ ts, itens }));
    // poda: remove caches de outros meses (preserva espaço)
    Object.keys(localStorage)
      .filter((k) => k.startsWith(CACHE_PREFIX) && k !== chave)
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    // storage cheio/indisponível: segue sem cache
  }
  return { itens, ts, doCache: false };
}
