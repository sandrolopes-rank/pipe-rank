"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Play,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Check,
  Loader2,
  Trash2,
  ExternalLink,
} from "lucide-react";

const BASE_URL = "https://api.elephan.dev";
const DOCS_URL = "https://api.elephan.dev/docs/";

// Endpoints de leitura documentados (OpenAPI 3.0 da Elephan)
interface Ep {
  path: string;
  label: string;
  desc: string;
  pathParam?: string;
  requiredQuery?: string[];
}
const ENDPOINTS: Ep[] = [
  { path: "/health", label: "Health check", desc: "Verifica se a API está no ar — não exige chave." },
  { path: "/v1/transcribes", label: "Transcrições", desc: "Lista paginada de reuniões transcritas" },
  { path: "/v1/transcribes/{id}", label: "Transcrição por ID", desc: "Transcrição completa + resumo IA + deal do CRM", pathParam: "id" },
  { path: "/v1/users", label: "Usuários", desc: "Usuários do time" },
  { path: "/v1/users/{id}", label: "Usuário por ID", desc: "Detalhe de um usuário", pathParam: "id" },
  { path: "/v1/prompts", label: "Tipos de reunião", desc: "Prompts/tipos de reunião do time" },
  { path: "/v1/prompts/{id}", label: "Tipo de reunião por ID", desc: "Detalhe de um prompt", pathParam: "id" },
  { path: "/v1/stats", label: "Estatísticas de uso", desc: "Uso da API por dia (?days=7)" },
  { path: "/v1/conversations", label: "Conversas WhatsApp", desc: "Metadados + scorecard agregado (sem texto)" },
  { path: "/v1/conversations/{id}", label: "Conversa por ID", desc: "Metadados + scorecard + completion da IA", pathParam: "id" },
  { path: "/v1/conversations/{id}/messages", label: "Mensagens da conversa", desc: "Apenas metadados (sem texto)", pathParam: "id" },
  { path: "/v1/scorecard/by-seller", label: "Scorecard por vendedor", desc: "Notas médias por vendedor", requiredQuery: ["startDate", "endDate"] },
  { path: "/v1/scorecard/by-question", label: "Scorecard por pergunta", desc: "Médias por pergunta", requiredQuery: ["startDate", "endDate"] },
  { path: "/v1/scorecard/by-meeting/{transcribeId}", label: "Scorecard de uma reunião", desc: "Respostas do scorecard de uma reunião", pathParam: "transcribeId" },
  { path: "/v1/insights", label: "Insights", desc: "Insights de reuniões (product/sale/cs), com deal do CRM" },
  { path: "/v1/insights/clusters", label: "Insights por cluster", desc: "Agregados por cluster com amostras" },
];

interface Result {
  status: number;
  timeMs: number;
  rateLimit: { limit: string | null; remaining: string | null; reset: string | null };
  body: unknown;
}

export function ElephanPlayground() {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [serverSaved, setServerSaved] = useState(false);
  const [savingServer, setSavingServer] = useState(false);
  const [selected, setSelected] = useState(0);
  const [pathParam, setPathParam] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ep = ENDPOINTS[selected];
  const hasPathParam = Boolean(ep.pathParam);
  const isHealth = ep.path.startsWith("/health");

  // Preenche datas padrão (últimos 30 dias) para endpoints com período obrigatório
  useEffect(() => {
    Promise.resolve().then(() => {
      if (ep.requiredQuery && !query.trim()) {
        const end = new Date();
        const start = new Date(Date.now() - 30 * 86400000);
        setQuery(`startDate=${start.toISOString()}&endDate=${end.toISOString()}`);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const builtPath = useMemo(() => {
    let p = ep.path;
    if (hasPathParam) {
      p = p.replace(`{${ep.pathParam}}`, encodeURIComponent(pathParam.trim() || `{${ep.pathParam}}`));
    }
    const q = query.trim();
    return q ? `${p}?${q.replace(/^\?/, "")}` : p;
  }, [ep, hasPathParam, pathParam, query]);

  async function run() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/elephan/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: builtPath, apiKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(`${data.error ?? "Erro"}${data.message ? ` — ${data.message}` : ""}`);
      } else {
        setResult(data as Result);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function salvarNoServidor() {
    setSavingServer(true);
    try {
      const res = await fetch("/api/elephan/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ valor: apiKey.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(`${data.error ?? "Erro ao salvar"}${data.message ? ` — ${data.message}` : ""}`);
      } else {
        setServerSaved(true);
        setApiKey(""); // limpa o override: passa a usar a chave do servidor
        setTimeout(() => setServerSaved(false), 4000);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setSavingServer(false);
    }
  }

  function clearResult() {
    setResult(null);
    setError(null);
  }

  const statusColor = (status: number) =>
    status < 300 ? "#10b981" : status < 500 ? "#f59e0b" : "#ef4444";

  const pretty = result ? (typeof result.body === "string" ? result.body : JSON.stringify(result.body, null, 2)) : "";

  return (
    <div className="rounded-2xl p-5 space-y-4" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Play size={14} style={{ color: "var(--accent-text)" }} />
          <h2 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            API Playground — teste ao vivo
          </h2>
        </div>
        <a
          href={DOCS_URL}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-[11px] font-medium transition-opacity hover:opacity-80"
          style={{ color: "var(--accent-text)" }}
        >
          <ExternalLink size={11} />
          Documentação oficial
        </a>
      </div>

      {/* Chave de API (admin salva no servidor — vale para todos) */}
      <div>
        <label className="text-[11px] font-semibold flex items-center gap-1.5 mb-1.5" style={{ color: "var(--muted)" }}>
          <KeyRound size={11} /> Chave de API (elk_prod_...)
        </label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="elk_prod_xxxxxxxxxx"
              className="w-full text-xs rounded-lg px-3 py-2 pr-9 outline-none"
              style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--foreground)" }}
            />
            <button
              onClick={() => setShowKey((s) => !s)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
              style={{ color: "var(--muted)" }}
              title={showKey ? "Ocultar" : "Mostrar"}
            >
              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <button
            onClick={salvarNoServidor}
            disabled={savingServer || !apiKey.trim()}
            className="text-[11px] font-medium px-3 py-2 rounded-lg transition-opacity hover:opacity-80 cursor-pointer disabled:opacity-40 whitespace-nowrap"
            style={{ background: "var(--nav-active-bg)", color: "var(--accent-text)", border: "1px solid var(--nav-active-border)" }}
            title="Salva a chave no Supabase — vale para todos os usuários"
          >
            {savingServer ? "Salvando..." : serverSaved ? "Salvo ✓" : "Salvar no servidor"}
          </button>
        </div>
        <p className="text-[10px] mt-1" style={{ color: "var(--muted)" }}>
          Salva no Supabase e vale para todos os usuários imediatamente (sem variável de ambiente).
        </p>
      </div>

      {/* Endpoint + parâmetros */}
      <div className={`grid grid-cols-1 ${hasPathParam || !isHealth ? "md:grid-cols-2" : ""} gap-3`}>
        <div>
          <label className="text-[11px] font-semibold block mb-1.5" style={{ color: "var(--muted)" }}>
            Endpoint
          </label>
          <select
            value={selected}
            onChange={(e) => {
              setSelected(Number(e.target.value));
              setPathParam("");
              if (!ENDPOINTS[Number(e.target.value)].requiredQuery) setQuery("");
            }}
            className="w-full text-xs rounded-lg px-3 py-2 outline-none cursor-pointer"
            style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--foreground)" }}
          >
            {ENDPOINTS.map((e, i) => (
              <option key={e.path} value={i}>
                GET {e.label}
              </option>
            ))}
          </select>
          <p className="text-[10px] mt-1" style={{ color: "var(--muted)" }}>
            {ep.desc}
          </p>
        </div>
        {(hasPathParam || !isHealth) && (
          <div className="space-y-3">
            {hasPathParam && (
              <div>
                <label className="text-[11px] font-semibold block mb-1.5" style={{ color: "var(--muted)" }}>
                  Parâmetro de rota: {`{${ep.pathParam}}`}
                </label>
                <input
                  value={pathParam}
                  onChange={(e) => setPathParam(e.target.value)}
                  placeholder="UUID / ObjectId"
                  className="w-full text-xs rounded-lg px-3 py-2 outline-none font-mono"
                  style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--foreground)" }}
                />
              </div>
            )}
            {!isHealth && (
              <div>
                <label className="text-[11px] font-semibold block mb-1.5" style={{ color: "var(--muted)" }}>
                  Query string {ep.requiredQuery ? "(obrigatória)" : "(opcional)"}
                  {ep.requiredQuery ? ` — ${ep.requiredQuery.join(", ")}` : ""}
                </label>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="ex.: page=1&limit=20 ou email=joao@empresa.com"
                  className="w-full text-xs rounded-lg px-3 py-2 outline-none font-mono"
                  style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--foreground)" }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Executar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div
          className="text-[11px] font-mono px-3 py-2 rounded-lg flex-1 min-w-[260px] truncate"
          style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--muted)" }}
          title={`GET ${BASE_URL}${builtPath}`}
        >
          GET {BASE_URL}
          <span style={{ color: "var(--foreground)" }}>{builtPath}</span>
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg transition-opacity hover:opacity-80 cursor-pointer disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #8b5cf6, #06b6d4)", color: "#fff" }}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
          {loading ? "Consultando..." : "Executar"}
        </button>
        {(result || error) && (
          <button
            onClick={clearResult}
            className="p-2 rounded-lg transition-opacity hover:opacity-80 cursor-pointer"
            style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--muted)" }}
            title="Limpar resultado"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Resultado */}
      {error && (
        <div className="rounded-lg px-4 py-3 text-xs" style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#f87171" }}>
          {error}
        </div>
      )}
      {result && (
        <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--card-border)" }}>
          <div
            className="flex items-center justify-between px-4 py-2.5 flex-wrap gap-2"
            style={{ background: "var(--input-bg)", borderBottom: "1px solid var(--card-border)" }}
          >
            <div className="flex items-center gap-3 flex-wrap">
              <span
                className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: `${statusColor(result.status)}22`, color: statusColor(result.status) }}
              >
                {result.status}
              </span>
              <span className="text-[11px]" style={{ color: "var(--muted)" }}>
                {result.timeMs} ms
              </span>
              {result.rateLimit.remaining && (
                <span className="text-[11px]" style={{ color: "var(--muted)" }}>
                  rate limit: {result.rateLimit.remaining}/{result.rateLimit.limit ?? "?"}
                </span>
              )}
            </div>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(pretty);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="flex items-center gap-1 text-[11px] font-medium transition-opacity hover:opacity-80 cursor-pointer"
              style={{ color: "var(--muted)" }}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? "Copiado" : "Copiar JSON"}
            </button>
          </div>
          <pre
            className="text-[11px] leading-relaxed p-4 overflow-auto max-h-96 font-mono"
            style={{ color: "var(--foreground)", background: "var(--background)", margin: 0 }}
          >
            {pretty}
          </pre>
        </div>
      )}
    </div>
  );
}
