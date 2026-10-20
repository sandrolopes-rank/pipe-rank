"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  AlertTriangle,
  TrendingDown,
  CheckCheck,
  Loader2,
  ExternalLink,
  X,
  Users,
  Calendar,
  Play,
} from "lucide-react";
import {
  avaliarAlertaReuniao,
  fetchElephan,
  normNome,
  urlElephan,
  type ElephanAlerta,
} from "@/lib/elephan";

interface SpeakerSentimentEntry {
  speaker?: string;
  sentiments?: Array<{ sentimental?: string; total?: number; perc?: number }>;
}
interface AlertTranscribe {
  id: string;
  title?: string;
  dateIncluded?: string;
  user?: { name?: string; email?: string };
  deal?: { crmUrl?: string | null } | null;
  reasons?: Array<{ type?: string; description?: string; details?: string }>;
  sentimentAnalysis?: {
    totalSentiment?: Array<{ sentimental?: string; total?: number; perc?: number }>;
    speakerSentiment?: SpeakerSentimentEntry[];
  } | null;
  url_file?: string;
}

interface Periodo {
  label: string;
}

const SENTIMENT_LABELS: Record<string, string> = {
  POSITIVE: "Positivo",
  NEGATIVE: "Negativo",
  NEUTRAL: "Neutro",
  MIXED: "Misto",
};
const SENTIMENT_CORES: Record<string, string> = {
  POSITIVE: "#10b981",
  NEGATIVE: "#ef4444",
  NEUTRAL: "#94a3b8",
  MIXED: "#f59e0b",
};
const ORDEM_SENTIMENTOS = ["POSITIVE", "NEUTRAL", "NEGATIVE", "MIXED"];

type Aba = "criticos" | "medianos";

export function ElephanAlerts({
  itens,
  periodo,
  excluidos,
  autoAbrir,
}: {
  itens: AlertTranscribe[];
  periodo: Periodo;
  excluidos: Set<string>;
  autoAbrir?: boolean;
}) {
  const [lidos, setLidos] = useState<Set<string>>(new Set());
  const [detalhesNegativos, setDetalhesNegativos] = useState<Map<string, AlertTranscribe>>(new Map());
  const [carregandoDetalhes, setCarregandoDetalhes] = useState(false);
  const [aba, setAba] = useState<Aba>("criticos");
  const [alertaSelecionado, setAlertaSelecionado] = useState<ElephanAlerta | null>(null);
  const [showQuadro, setShowQuadro] = useState(false);

  // Abre o quadro automaticamente quando o admin vem do sino
  useEffect(() => {
    if (autoAbrir) setShowQuadro(true);
  }, [autoAbrir]);

  // Restaura alertas já lidos (adiado para microtask: react-hooks)
  useEffect(() => {
    Promise.resolve().then(() => {
      try {
        const raw = localStorage.getItem("elephan_alerts_seen");
        if (raw) setLidos(new Set(JSON.parse(raw)));
      } catch {
        // storage indisponível
      }
    });
  }, []);

  // Reuniões com negativo dominante (candidatas a alerta de sentimento e churn)
  const negativas = useMemo(
    () =>
      itens.filter((o) => {
        const totals = o.sentimentAnalysis?.totalSentiment ?? [];
        const neg = totals.find((t) => (t.sentimental ?? "").toUpperCase() === "NEGATIVE");
        const pos = totals.find((t) => (t.sentimental ?? "").toUpperCase() === "POSITIVE");
        return neg && (neg.perc ?? 0) >= 40 && (!pos || (pos.perc ?? 0) < (neg.perc ?? 0));
      }),
    [itens]
  );

  // Busca detalhes apenas das negativas (para checar churn_signal em reasons[])
  useEffect(() => {
    let disposed = false;
    (async () => {
      await Promise.resolve();
      const faltando = negativas.filter((o) => !detalhesNegativos.has(o.id));
      if (disposed || faltando.length === 0) return;
      setCarregandoDetalhes(true);
      let apiKey = "";
      try {
        apiKey = localStorage.getItem("elephan_api_key") ?? "";
      } catch {
        // proxy usa a chave do .env
      }
      const mapa = new Map<string, AlertTranscribe>();
      const filas = [...faltando.map((o) => o.id)];
      await Promise.all(
        Array.from({ length: 4 }, async () => {
          while (filas.length > 0) {
            const id = filas.shift();
            if (!id) break;
            try {
              const body = await fetchElephan(`/v1/transcribes/${id}`, apiKey);
              if (body?.data) mapa.set(id, body.data as AlertTranscribe);
            } catch {
              // falha individual não derruba o lote
            }
          }
        })
      );
      if (!disposed) {
        setDetalhesNegativos((prev) => {
          const next = new Map(prev);
          mapa.forEach((v, k) => next.set(k, v));
          return next;
        });
      }
      if (!disposed) setCarregandoDetalhes(false);
    })();
    return () => {
      disposed = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [negativas]);

  // Avalia os alertas com os avaliadores ativos (respeitando exclusões do admin)
  const alertas = useMemo(() => {
    const porId = new Map<string, AlertTranscribe>();
    itens.forEach((o) => porId.set(o.id, o));
    negativas.forEach((o) => {
      const det = detalhesNegativos.get(o.id);
      if (det) porId.set(o.id, det);
    });
    const out: ElephanAlerta[] = [];
    porId.forEach((o) => {
      const resp = (o.user?.name || o.user?.email || "").trim();
      if (resp && excluidos.has(normNome(resp))) return; // pessoa excluída
      out.push(...avaliarAlertaReuniao(o));
    });
    const ordemSev = { critica: 0, alta: 1, media: 2 };
    return out.sort(
      (a, b) => ordemSev[a.severidade] - ordemSev[b.severidade] || (b.data ?? "").localeCompare(a.data ?? "")
    );
  }, [itens, negativas, detalhesNegativos, excluidos]);

  const criticos = alertas.filter((a) => a.tipo === "churn");
  const medianos = alertas.filter((a) => a.tipo === "sentimento");
  const naoLidos = alertas.filter((a) => !lidos.has(a.chave));

  function marcarTodosLidos() {
    try {
      const all = new Set([...lidos, ...alertas.map((a) => a.chave)]);
      setLidos(all);
      localStorage.setItem("elephan_alerts_seen", JSON.stringify([...all]));
      // avisa a sidebar (sino) para recomputar o badge
      window.dispatchEvent(new Event("elephan-alertas-lidos"));
    } catch {
      // storage indisponível
    }
  }

  const corSev = (sev: ElephanAlerta["severidade"]) =>
    sev === "critica" ? "#ef4444" : sev === "alta" ? "#f59e0b" : "#94a3b8";
  const bgSev = (sev: ElephanAlerta["severidade"]) =>
    sev === "critica" ? "rgba(239, 68, 68, 0.1)" : sev === "alta" ? "rgba(245, 158, 11, 0.1)" : "var(--input-bg)";

  const abas: Array<{ id: Aba; label: string; count: number; cor: string }> = [
    { id: "criticos", label: "Críticos", count: criticos.length, cor: "#ef4444" },
    { id: "medianos", label: "Medianos", count: medianos.length, cor: "#f59e0b" },
  ];

  // Reunião por trás do alerta selecionado (detalhe tem priority — traz reasons)
  const reuniaoDoAlerta = alertaSelecionado
    ? detalhesNegativos.get(alertaSelecionado.meetingId) ||
      itens.find((i) => i.id === alertaSelecionado.meetingId) ||
      null
    : null;

  return (
    <>
      {/* Card-resumo compacto (clicável) */}
      <button
        onClick={() => setShowQuadro(true)}
        className="w-full text-left relative overflow-hidden rounded-2xl p-5 flex items-center gap-4 transition-all hover:opacity-95 cursor-pointer"
        style={{ background: "linear-gradient(135deg, var(--card-bg) 0%, var(--background) 60%)", border: `1px solid ${criticos.length > 0 ? "#ef444444" : "var(--card-border)"}` }}
      >
        <div
          className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-20 pointer-events-none"
          style={{ background: `radial-gradient(circle, ${criticos.length > 0 ? "#ef4444" : "#f59e0b"}, transparent)` }}
        />
        <div
          className="relative w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: `color-mix(in srgb, ${criticos.length > 0 ? "#ef4444" : "#f59e0b"} 15%, transparent)`,
            border: `1px solid color-mix(in srgb, ${criticos.length > 0 ? "#ef4444" : "#f59e0b"} 30%, transparent)`,
          }}
        >
          <Bell size={17} style={{ color: criticos.length > 0 ? "#ef4444" : "#f59e0b" }} />
        </div>
        <div className="relative min-w-0">
          <span className="text-xs" style={{ color: "var(--muted)" }}>Alertas</span>
          <p className="text-2xl font-bold tracking-tight leading-tight" style={{ color: criticos.length > 0 ? "#ef4444" : "#f59e0b" }}>
            {naoLidos.length > 0 ? naoLidos.length : alertas.length}
          </p>
          <p className="text-[10px]" style={{ color: "var(--muted)" }}>
            {naoLidos.length > 0 ? `não lido(s) em ${periodo.label}` : `nenhum novo em ${periodo.label}`}
          </p>
        </div>
        <div className="relative ml-auto space-y-1 text-right text-[11px]">
          <p style={{ color: "#f87171" }}>🔴 Churn crítico: <span className="font-bold">{criticos.length}</span></p>
          <p style={{ color: "#fbbf24" }}>🟠 Sentimento negativo: <span className="font-bold">{medianos.length}</span></p>
          <p className="text-[9px] opacity-70" style={{ color: "var(--muted)" }}>camada de scorecard pronta</p>
        </div>
      </button>

      {/* Modal do quadro completo */}
      {showQuadro && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="rounded-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
            <div className="px-5 py-4 flex items-center justify-between flex-wrap gap-2" style={{ borderBottom: "1px solid var(--card-border)" }}>
              <div className="flex items-center gap-2">
                <Bell size={14} style={{ color: "#f59e0b" }} />
                <div>
                  <h2 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Quadro de alertas</h2>
                  <p className="text-[10px]" style={{ color: "var(--muted)" }}>
                    {periodo.label} • {naoLidos.length} novo(s) de {alertas.length} • camada de scorecard pronta
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {alertas.length > 0 && (
                  <button
                    onClick={marcarTodosLidos}
                    className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80 cursor-pointer"
                    style={{ background: "var(--nav-active-bg)", color: "var(--accent-text)", border: "1px solid var(--nav-active-border)" }}
                  >
                    <CheckCheck size={12} /> Marcar todos como lidos
                  </button>
                )}
                <button onClick={() => setShowQuadro(false)} className="transition-colors cursor-pointer" style={{ color: "var(--muted)" }}>
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Abas */}
            <div className="px-5 pt-3 flex gap-1.5" style={{ borderBottom: "1px solid var(--card-border)" }}>
              {abas.map((tb) => (
                <button
                  key={tb.id}
                  onClick={() => setAba(tb.id)}
                  className="text-[11px] font-semibold px-3 py-2 rounded-t-lg transition-all cursor-pointer"
                  style={
                    aba === tb.id
                      ? { background: "var(--input-bg)", color: tb.cor, borderBottom: `2px solid ${tb.cor}` }
                      : { color: "var(--muted)", borderBottom: "2px solid transparent" }
                  }
                >
                  {tb.label} {tb.count > 0 && <span className="font-bold">({tb.count})</span>}
                </button>
              ))}
            </div>

            {/* Conteúdo das abas */}
            <div className="p-4 space-y-2 max-h-[55vh] overflow-y-auto">
              {aba === "criticos" && (carregandoDetalhes ? (
                <div className="flex items-center gap-2 justify-center py-6">
                  <Loader2 size={15} className="animate-spin" style={{ color: "var(--muted)" }} />
                  <span className="text-xs" style={{ color: "var(--muted)" }}>Analisando reuniões para alertas...</span>
                </div>
              ) : criticos.length === 0 ? (
                <p className="text-xs text-center py-6" style={{ color: "var(--muted)" }}>
                  Nenhum alerta crítico em {periodo.label}.
                </p>
              ) : (
                criticos.map((a) => <LinhaAlerta key={a.chave} a={a} lido={lidos.has(a.chave)} onClick={() => setAlertaSelecionado(a)} />)
              ))}

              {aba === "medianos" && (medianos.length === 0 ? (
                <p className="text-xs text-center py-6" style={{ color: "var(--muted)" }}>
                  Nenhum alerta mediano em {periodo.label}.
                </p>
              ) : (
                medianos.map((a) => <LinhaAlerta key={a.chave} a={a} lido={lidos.has(a.chave)} onClick={() => setAlertaSelecionado(a)} />)
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal de detalhes do alerta */}
      {alertaSelecionado && (() => {
        const o = reuniaoDoAlerta;
        const totals = o?.sentimentAnalysis?.totalSentiment ?? [];
        const speakers = (o?.sentimentAnalysis?.speakerSentiment ?? []).filter((sp) => !excluidos.has(normNome(sp.speaker ?? "")));
        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
              <div className="flex items-start justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--table-border)" }}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span
                      className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                      style={{ background: corSev(alertaSelecionado.severidade) + "22", color: corSev(alertaSelecionado.severidade) }}
                    >
                      {alertaSelecionado.tipo === "churn" ? "Churn signal" : "Sentimento"}
                    </span>
                    {o?.dateIncluded && (
                      <span className="text-[10px] inline-flex items-center gap-1" style={{ color: "var(--muted)" }}>
                        <Calendar size={10} /> {o.dateIncluded.substring(0, 10).split("-").reverse().join("/")}
                      </span>
                    )}
                  </div>
                  <h2 className="text-base font-semibold truncate" style={{ color: "var(--foreground)" }}>
                    {o?.title || alertaSelecionado.titulo}
                  </h2>
                  {o?.user?.name && (
                    <p className="text-[11px] mt-0.5 inline-flex items-center gap-1" style={{ color: "var(--muted)" }}>
                      <Users size={10} /> {o.user.name}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  {o && (
                    <a href={urlElephan(o.id)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-opacity hover:opacity-80" style={{ background: "rgba(20, 184, 166, 0.15)", color: "#2dd4bf", border: "1px solid rgba(20, 184, 166, 0.3)" }}>
                      <Play size={11} /> Elephan
                    </a>
                  )}
                  {o?.url_file && (
                    <a href={o.url_file} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-opacity hover:opacity-80" style={{ background: "rgba(139, 92, 246, 0.15)", color: "#a78bfa", border: "1px solid rgba(139, 92, 246, 0.3)" }}>
                      <Play size={11} /> Gravação
                    </a>
                  )}
                  {o?.deal?.crmUrl && (
                    <a href={o.deal.crmUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-opacity hover:opacity-80" style={{ background: "rgba(255, 121, 0, 0.12)", color: "#ff7a59", border: "1px solid rgba(255, 121, 0, 0.3)" }}>
                      <ExternalLink size={11} /> CRM
                    </a>
                  )}
                  <button onClick={() => setAlertaSelecionado(null)} className="transition-colors cursor-pointer" style={{ color: "var(--muted)" }}>
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div className="overflow-y-auto flex-1 p-6 space-y-5">
                {/* Alerta */}
                <div className="rounded-lg px-4 py-3" style={{ background: bgSev(alertaSelecionado.severidade), border: `1px solid ${corSev(alertaSelecionado.severidade)}44` }}>
                  <p className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>{alertaSelecionado.titulo}</p>
                  <p className="text-[11px] mt-1 leading-relaxed" style={{ color: "var(--muted)" }}>{alertaSelecionado.descricao}</p>
                </div>

                {/* Distribuição de sentimentos */}
                {totals.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold mb-2" style={{ color: "var(--foreground)" }}>Sentimentos da reunião</h3>
                    <div className="space-y-1.5">
                      {ORDEM_SENTIMENTOS.map((s) => {
                        const f = totals.find((x) => (x.sentimental ?? "").toUpperCase() === s);
                        const perc = f ? Math.round(f.perc ?? 0) : 0;
                        return (
                          <div key={s} className="flex items-center gap-2">
                            <span className="text-[10px] w-16" style={{ color: "var(--muted)" }}>{SENTIMENT_LABELS[s]}</span>
                            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--table-border)" }}>
                              <div className="h-full rounded-full" style={{ width: `${perc}%`, background: SENTIMENT_CORES[s] }} />
                            </div>
                            <span className="text-[10px] tabular-nums w-8 text-right" style={{ color: "var(--muted)" }}>{perc}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Participantes */}
                {speakers.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: "var(--foreground)" }}>
                      <Users size={12} style={{ color: "var(--muted)" }} /> Sentimento por participante
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {speakers.map((sp, i) => {
                        const dom = (sp.sentiments ?? []).slice().sort((x, y) => (y.total ?? 0) - (x.total ?? 0))[0];
                        const s = (dom?.sentimental ?? "").toUpperCase();
                        const cor = SENTIMENT_CORES[s] ?? "var(--muted)";
                        return (
                          <span
                            key={i}
                            className="text-[10px] px-2 py-1 rounded-full"
                            style={{ background: "var(--input-bg)", border: `1px solid ${cor}44`, color: cor }}
                            title={(sp.sentiments ?? []).map((x) => `${SENTIMENT_LABELS[(x.sentimental ?? "").toUpperCase()] ?? x.sentimental}: ${Math.round(x.perc ?? 0)}%`).join(" • ")}
                          >
                            {sp.speaker || "—"}: {SENTIMENT_LABELS[s] ?? dom?.sentimental ?? "—"} {Math.round(dom?.perc ?? 0)}%
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Sinais extraídos */}
                {(o?.reasons ?? []).length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: "var(--foreground)" }}>
                      <TrendingDown size={12} style={{ color: "#ef4444" }} /> Sinais extraídos
                    </h3>
                    <div className="space-y-2">
                      {(o?.reasons ?? []).map((r, i) => (
                        <div key={i} className="rounded-lg px-3 py-2.5" style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", borderLeft: "3px solid #ef4444" }}>
                          {r.type && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(239, 68, 68, 0.15)", color: "#f87171" }}>
                              {r.type}
                            </span>
                          )}
                          <p className="text-xs mt-1" style={{ color: "var(--foreground)" }}>{r.description}</p>
                          {r.details && <p className="text-[11px] mt-0.5" style={{ color: "var(--muted)" }}>{r.details}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}

function LinhaAlerta({ a, lido, onClick }: { a: ElephanAlerta; lido: boolean; onClick: () => void }) {
  const corSev = (sev: ElephanAlerta["severidade"]) =>
    sev === "critica" ? "#ef4444" : sev === "alta" ? "#f59e0b" : "#94a3b8";
  const bgSev = (sev: ElephanAlerta["severidade"]) =>
    sev === "critica" ? "rgba(239, 68, 68, 0.1)" : sev === "alta" ? "rgba(245, 158, 11, 0.1)" : "var(--input-bg)";
  const dataFmt = a.data ? (() => { const d = new Date(a.data); return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`; })() : null;
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") onClick(); }}
      className="w-full text-left rounded-lg px-4 py-3 flex items-start gap-3 transition-all hover:opacity-90 cursor-pointer"
      style={{
        background: lido ? "var(--input-bg)" : bgSev(a.severidade),
        border: `1px solid ${lido ? "var(--input-border)" : corSev(a.severidade) + "44"}`,
        opacity: lido ? 0.55 : 1,
      }}
      title="Ver detalhes e insights"
    >
      <div className="flex-shrink-0 mt-0.5">
        {a.tipo === "churn" ? <TrendingDown size={15} style={{ color: corSev(a.severidade) }} /> : <AlertTriangle size={15} style={{ color: corSev(a.severidade) }} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider" style={{ background: corSev(a.severidade) + "22", color: corSev(a.severidade) }}>
            {a.tipo === "churn" ? "Churn" : "Sentimento"}
          </span>
          <span className="text-xs font-semibold truncate" style={{ color: "var(--foreground)" }}>{a.titulo}</span>
          {dataFmt && <span className="text-[10px]" style={{ color: "var(--muted)" }}>{dataFmt}</span>}
        </div>
        <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: "var(--muted)" }}>{a.descricao}</p>
        {a.responsavel && (
          <p className="text-[10px] mt-0.5" style={{ color: "var(--muted)", opacity: 0.8 }}>Responsável: {a.responsavel}</p>
        )}
      </div>
      {a.dealUrl && (
        <a
          href={a.dealUrl}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex-shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full transition-opacity hover:opacity-80 self-center"
          style={{ background: "rgba(255, 121, 0, 0.12)", color: "#ff7a59", border: "1px solid rgba(255, 121, 0, 0.3)" }}
        >
          <ExternalLink size={10} /> CRM
        </a>
      )}
    </div>
  );
}
