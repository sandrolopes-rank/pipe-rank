"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Clock,
  ExternalLink,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Search,
  Sparkles,
  Play,
} from "lucide-react";
import { ElephanMeetingDetailModal } from "@/components/elephan-meeting-detail";

interface ElephanUser {
  id: string;
  name?: string;
  email?: string;
}
interface ElephanPrompt {
  id: string;
  name?: string;
  type?: string;
}
interface ElephanDeal {
  id?: string;
  type?: string;
  crmUrl?: string | null;
}
interface ElephanTranscribe {
  id: string;
  title?: string;
  dateIncluded?: string;
  status?: string;
  duration?: number;
  user?: ElephanUser;
  prompt?: ElephanPrompt;
  transcript?: {
    text?: string;
    speakers?: Array<{
      text?: string;
      start?: number;
      end?: number;
      sentiment?: { Sentiment?: string };
    }>;
  };
  reasons?: Array<{ type?: string; description?: string; details?: string }>;
  importantPoints?: string[];
  answers?: Array<{
    question?: string;
    score?: number | null;
    yesNo?: boolean | null;
    subtopics?: string[];
  }>;
  keywords?: Array<{ word?: string; count?: number }> | string[];
  competitors?: Array<{ word?: string; count?: number }>;
  sentimentAnalysis?: {
    totalSentiment?: Array<{ sentimental?: string; total?: number; perc?: number }>;
    speakerSentiment?: Array<{
      speaker?: string;
      total?: number;
      sentiments?: Array<{ sentimental?: string; total?: number; perc?: number }>;
    }>;
  } | null;
  summary?: string | null;
  deal?: ElephanDeal | null;
  url_file?: string;
}


const PAGE_SIZE = 20;
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
// Deep link para a reunião dentro do app da Elephan (mesmo ObjectId da API)
const ELEPHAN_APP_URL = "https://app.elephan.ai/info-transcript/?t=";
function urlElephan(id: string): string {
  return `${ELEPHAN_APP_URL}${id}`;
}

function formatData(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${MESES[d.getMonth()]}`;
}
function formatHora(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}h${String(d.getMinutes()).padStart(2, "0")}`;
}
function formatDuracao(seg?: number): string {
  if (!seg) return "—";
  const m = Math.round(seg / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}` : `${m}min`;
}

export function ElephanMeetings() {
  const [items, setItems] = useState<ElephanTranscribe[]>([]);
  const [users, setUsers] = useState<ElephanUser[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroResp, setFiltroResp] = useState("");
  const [filtroDe, setFiltroDe] = useState("");
  const [filtroAte, setFiltroAte] = useState("");
  const [detalhe, setDetalhe] = useState<ElephanTranscribe | null>(null);
  const [detalheLoading, setDetalheLoading] = useState(false);

  async function callApi(path: string) {
    let apiKey = "";
    try {
      apiKey = localStorage.getItem("elephan_api_key") ?? "";
    } catch {
      // storage indisponível — o proxy usa a chave do .env
    }
    const res = await fetch("/api/elephan/proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, apiKey }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Falha na consulta");
    if (data.status >= 400) throw new Error(`API Elephan: ${data.status}`);
    return data.body;
  }

  const construirPath = useCallback((p: number) => {
    const params = new URLSearchParams();
    params.set("page", String(p));
    params.set("limit", String(PAGE_SIZE));
    if (filtroResp) params.set("email", filtroResp);
    if (filtroDe) params.set("startDate", `${filtroDe}T00:00:00.000Z`);
    if (filtroAte) params.set("endDate", `${filtroAte}T23:59:59.999Z`);
    return `/v1/transcribes?${params.toString()}`;
  }, [filtroResp, filtroDe, filtroAte]);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const body = await callApi(construirPath(p));
      setItems((body?.data ?? []) as ElephanTranscribe[]);
      setTotal(body?.pagination?.total ?? 0);
      setTotalPages(body?.pagination?.totalPages ?? 1);
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [construirPath]);

  // Carrega responsáveis (uma vez) para o filtro
  useEffect(() => {
    (async () => {
      try {
        const body = await callApi("/v1/users?limit=100");
        setUsers((body?.data ?? []) as ElephanUser[]);
      } catch {
        // filtro de responsável fica vazio em caso de erro
      }
    })();
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => {
      load(page);
    });
  }, [page, load]);

  async function abrirDetalhe(id: string) {
    setDetalhe({ id } as ElephanTranscribe);
    setDetalheLoading(true);
    try {
      const body = await callApi(`/v1/transcribes/${id}`);
      setDetalhe((body?.data ?? null) as ElephanTranscribe | null);
    } catch {
      setDetalhe(null);
    } finally {
      setDetalheLoading(false);
    }
  }

  const filtrados = items.filter(
    (o) =>
      !busca.trim() ||
      (o.title ?? "").toLowerCase().includes(busca.toLowerCase()) ||
      (o.user?.email ?? "").toLowerCase().includes(busca.toLowerCase()) ||
      (o.user?.name ?? "").toLowerCase().includes(busca.toLowerCase())
  );

  // Agrupa as utterances da transcrição em blocos legíveis (pausa > 10s = nova fala)

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
      {/* Cabeçalho */}
      <div className="px-5 py-4 flex items-center gap-2">
        <Sparkles size={14} style={{ color: "var(--accent-text)" }} />
        <div>
          <h2 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            Reuniões do time
          </h2>
          <p className="text-[10px]" style={{ color: "var(--muted)" }}>
            Transcrições da Elephan • {total} reunião(ões) • clique para ver resumo IA e deal do CRM
          </p>
        </div>
      </div>

      {/* Filtros: busca, responsável e período — mesma linha, mesma altura */}
      <div className="px-5 pb-4 flex items-center gap-2 flex-wrap" style={{ borderBottom: "1px solid var(--card-border)" }}>
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--muted)" }} />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por título ou responsável..."
            className="text-xs rounded-lg pl-8 pr-3 py-2 w-56 outline-none h-[38px]"
            style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--foreground)" }}
          />
        </div>
        <select
          value={filtroResp}
          onChange={(e) => { setFiltroResp(e.target.value); setPage(1); }}
          className="text-xs rounded-lg px-3 py-2 outline-none cursor-pointer min-w-[190px] h-[38px]"
          style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--foreground)" }}
        >
          <option value="">Todos os responsáveis</option>
          {users.map((u) => (
            <option key={u.id} value={u.email}>
              {u.name || u.email}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px]" style={{ color: "var(--muted)" }}>De</span>
          <input
            type="date"
            value={filtroDe}
            onChange={(e) => { setFiltroDe(e.target.value); setPage(1); }}
            className="text-xs rounded-lg px-2.5 py-2 outline-none h-[38px]"
            style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--foreground)" }}
          />
          <span className="text-[11px]" style={{ color: "var(--muted)" }}>até</span>
          <input
            type="date"
            value={filtroAte}
            onChange={(e) => { setFiltroAte(e.target.value); setPage(1); }}
            className="text-xs rounded-lg px-2.5 py-2 outline-none h-[38px]"
            style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--foreground)" }}
          />
        </div>
        {(filtroResp || filtroDe || filtroAte) && (
          <button
            onClick={() => { setFiltroResp(""); setFiltroDe(""); setFiltroAte(""); setPage(1); }}
            className="text-[11px] font-medium px-3 py-2 rounded-lg transition-opacity hover:opacity-80 cursor-pointer h-[38px]"
            style={{ background: "var(--nav-active-bg)", color: "var(--accent-text)", border: "1px solid var(--nav-active-border)" }}
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div className="flex items-center justify-center py-12 gap-2">
          <Loader2 size={18} className="animate-spin" style={{ color: "var(--muted)" }} />
          <span className="text-xs" style={{ color: "var(--muted)" }}>Carregando reuniões...</span>
        </div>
      ) : error ? (
        <p className="text-xs text-center py-8" style={{ color: "#f87171" }}>{error}</p>
      ) : filtrados.length === 0 ? (
        <p className="text-xs text-center py-8" style={{ color: "var(--muted)" }}>
          Nenhuma reunião encontrada {busca ? "para a busca" : ""}.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--table-border)", background: "var(--input-bg)" }}>
                <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--muted)" }}>Reunião</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--muted)" }}>Responsável</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--muted)" }}>Tipo</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--muted)" }}>Duração</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--muted)" }}>Data</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--muted)" }}>Gravação</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--muted)" }}>CRM</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((o) => (
                <tr
                  key={o.id}
                  className="border-b hover:opacity-90 cursor-pointer"
                  style={{ borderColor: "var(--table-border)" }}
                  onClick={() => abrirDetalhe(o.id)}
                >
                  <td className="px-4 py-3 text-sm font-medium max-w-[280px] truncate" style={{ color: "var(--foreground)" }}>
                    {o.title || "Sem título"}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--muted)" }}>
                    {o.user?.name?.split(" ").slice(0, 2).join(" ") || o.user?.email?.split("@")[0] || "—"}
                  </td>
                  <td className="px-4 py-3">
                    {o.prompt?.name ? (
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                        style={{ background: "var(--nav-active-bg)", color: "var(--accent-text)", border: "1px solid var(--nav-active-border)" }}
                      >
                        {o.prompt.name}
                      </span>
                    ) : (
                      <span className="text-xs" style={{ color: "var(--muted)" }}>—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-right flex items-center justify-end gap-1" style={{ color: "var(--muted)" }}>
                    <Clock size={11} /> {formatDuracao(o.duration)}
                  </td>
                  <td className="px-4 py-3 text-xs text-right whitespace-nowrap" style={{ color: "var(--muted)" }}>
                    {formatData(o.dateIncluded)} {formatHora(o.dateIncluded)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1.5">
                      {o.url_file && (
                        <a
                          href={o.url_file}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center justify-center w-7 h-7 rounded-full transition-all hover:opacity-80 cursor-pointer"
                          style={{ background: "rgba(139, 92, 246, 0.15)", color: "#a78bfa", border: "1px solid rgba(139, 92, 246, 0.3)" }}
                          title="Ouvir gravação (áudio)"
                        >
                          <Play size={11} />
                        </a>
                      )}
                      <a
                        href={urlElephan(o.id)}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center justify-center w-7 h-7 rounded-full transition-all hover:opacity-80 cursor-pointer"
                        style={{ background: "rgba(20, 184, 166, 0.15)", color: "#2dd4bf", border: "1px solid rgba(20, 184, 166, 0.3)" }}
                        title="Abrir na Elephan"
                      >
                        <ExternalLink size={11} />
                      </a>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {o.deal?.crmUrl ? (
                      <a
                        href={o.deal.crmUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full transition-opacity hover:opacity-80"
                        style={{ background: "rgba(255, 121, 0, 0.12)", color: "#ff7a59", border: "1px solid rgba(255, 121, 0, 0.3)" }}
                        title={`Deal ${o.deal.id} no HubSpot`}
                      >
                        <ExternalLink size={10} /> HubSpot
                      </a>
                    ) : (
                      <span className="text-xs" style={{ color: "var(--muted)", opacity: 0.5 }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginação */}
      {!loading && !error && total > 0 && (
        <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: "1px solid var(--card-border)" }}>
          <span className="text-[11px]" style={{ color: "var(--muted)" }}>
            Página {page} de {totalPages} • {total} reuniões
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg transition-opacity hover:opacity-80 cursor-pointer disabled:opacity-30"
              style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--muted)" }}
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg transition-opacity hover:opacity-80 cursor-pointer disabled:opacity-30"
              style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--muted)" }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Modal de detalhe (componente compartilhado) */}
      {(detalhe || detalheLoading) && (
        <ElephanMeetingDetailModal detalhe={detalhe} loading={detalheLoading} onClose={() => { setDetalhe(null); setDetalheLoading(false); }} />
      )}
    </div>
  );
}
