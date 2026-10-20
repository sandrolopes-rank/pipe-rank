"use client";

import { useMemo } from "react";
import { User, Calendar, Clock, ExternalLink, Play, X, Loader2, Sparkles, CheckCircle2, FileText } from "lucide-react";

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const ELEPHAN_APP_URL = "https://app.elephan.ai/info-transcript/?t=";
function urlElephan(id: string): string {
  return `${ELEPHAN_APP_URL}${id}`;
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

export interface ElephanTranscribeFull {
  id: string;
  title?: string;
  dateIncluded?: string;
  status?: string;
  duration?: number;
  user?: { id?: string; name?: string; email?: string };
  prompt?: { id?: string; name?: string; type?: string };
  transcript?: {
    text?: string;
    speakers?: Array<{ text?: string; start?: number; end?: number; sentiment?: { Sentiment?: string } }>;
  };
  answers?: Array<{ question?: string; score?: number | null; yesNo?: boolean | null; subtopics?: string[] }>;
  keywords?: Array<{ word?: string; count?: number }> | string[];
  competitors?: Array<{ word?: string; count?: number; position?: string }>;
  reasons?: Array<{ type?: string; description?: string; details?: string }>;
  importantPoints?: string[];
  sentimentAnalysis?: {
    totalSentiment?: Array<{ sentimental?: string; total?: number; perc?: number }>;
    speakerSentiment?: Array<{
      speaker?: string;
      total?: number;
      sentiments?: Array<{ sentimental?: string; total?: number; perc?: number }>;
    }>;
  } | null;
  summary?: string | null;
  deal?: { id?: string; type?: string; crmUrl?: string | null } | null;
  url_file?: string;
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
function mmss(ms?: number): string {
  if (ms == null) return "--:--";
  const total = Math.floor(ms / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function ElephanMeetingDetailModal({
  detalhe,
  loading,
  onClose,
}: {
  detalhe: ElephanTranscribeFull | null;
  loading: boolean;
  onClose: () => void;
}) {
  // Agrupa as utterances da transcrição em blocos legíveis (pausa > 10s = nova fala)
  const blocosFala = useMemo(() => {
    const falas = detalhe?.transcript?.speakers ?? [];
    if (falas.length === 0) return [];
    const out: Array<{ inicio: number; fim: number; texto: string; sentimentos: Record<string, number> }> = [];
    let atual: (typeof out)[number] | null = null;
    for (const f of falas) {
      const texto = (f.text ?? "").trim();
      if (!texto) continue;
      const inicio = f.start ?? 0;
      const fim = f.end ?? inicio;
      if (!atual || inicio - atual.fim > 10000) {
        atual = { inicio, fim, texto, sentimentos: {} };
        out.push(atual);
      } else {
        atual.fim = Math.max(atual.fim, fim);
        atual.texto += " " + texto;
      }
      const s = (f.sentiment?.Sentiment ?? "NEUTRAL").toUpperCase();
      atual.sentimentos[s] = (atual.sentimentos[s] ?? 0) + 1;
    }
    return out;
  }, [detalhe]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--table-border)" }}>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold truncate" style={{ color: "var(--foreground)" }}>
              {loading ? "Carregando reunião..." : detalhe?.title || "Reunião"}
            </h2>
            {!loading && detalhe && (
              <p className="text-xs mt-0.5 flex items-center gap-3 flex-wrap" style={{ color: "var(--muted)" }}>
                <span className="inline-flex items-center gap-1"><User size={11} /> {detalhe.user?.name || detalhe.user?.email || "—"}</span>
                <span className="inline-flex items-center gap-1"><Calendar size={11} /> {formatData(detalhe.dateIncluded)} {formatHora(detalhe.dateIncluded)}</span>
                <span className="inline-flex items-center gap-1"><Clock size={11} /> {formatDuracao(detalhe.duration)}</span>
                {detalhe.prompt?.name && <span>{detalhe.prompt.name}</span>}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
            {detalhe && (
              <a
                href={urlElephan(detalhe.id)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                style={{ background: "rgba(20, 184, 166, 0.15)", color: "#2dd4bf", border: "1px solid rgba(20, 184, 166, 0.3)" }}
                title="Abrir na Elephan"
              >
                <ExternalLink size={12} /> Elephan
              </a>
            )}
            {detalhe?.url_file && (
              <a
                href={detalhe.url_file}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                style={{ background: "rgba(139, 92, 246, 0.15)", color: "#a78bfa", border: "1px solid rgba(139, 92, 246, 0.3)" }}
                title="Ouvir gravação"
              >
                <Play size={12} /> Gravação
              </a>
            )}
            {detalhe?.deal?.crmUrl && (
              <a
                href={detalhe.deal.crmUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                style={{ background: "rgba(255, 121, 0, 0.12)", color: "#ff7a59", border: "1px solid rgba(255, 121, 0, 0.3)" }}
              >
                <ExternalLink size={12} /> Abrir no HubSpot
              </a>
            )}
            <button
              onClick={onClose}
              className="transition-colors cursor-pointer"
              style={{ color: "var(--muted)" }}
            >
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-2">
              <Loader2 size={18} className="animate-spin" style={{ color: "var(--muted)" }} />
              <span className="text-xs" style={{ color: "var(--muted)" }}>Buscando detalhes na Elephan...</span>
            </div>
          ) : detalhe ? (
            <>
              {/* Resumo IA */}
              {detalhe.summary && (
                <div>
                  <h3 className="text-xs font-semibold flex items-center gap-1.5 mb-2" style={{ color: "var(--foreground)" }}>
                    <Sparkles size={12} style={{ color: "#a78bfa" }} /> Resumo IA
                  </h3>
                  <div
                    className="text-xs leading-relaxed rounded-lg p-4 [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:mb-1 [&_ul]:list-disc [&_ul]:pl-4 [&_p]:mb-1 [&_strong]:font-semibold"
                    style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--foreground)" }}
                    dangerouslySetInnerHTML={{ __html: detalhe.summary }}
                  />
                </div>
              )}

              {/* Metadados de enriquecimento */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {detalhe.sentimentAnalysis?.totalSentiment && detalhe.sentimentAnalysis.totalSentiment.length > 0 && (
                  <div className="rounded-lg px-3 py-2.5" style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>Sentimento geral</p>
                    <div className="space-y-1.5">
                      {detalhe.sentimentAnalysis.totalSentiment.map((s, i) => {
                        const cor = SENTIMENT_CORES[(s.sentimental ?? "").toUpperCase()] ?? "var(--muted)";
                        const perc = Math.round(s.perc ?? 0);
                        return (
                          <div key={i}>
                            <div className="flex items-center justify-between text-[10px] mb-0.5">
                              <span style={{ color: cor, fontWeight: 600 }}>{SENTIMENT_LABELS[(s.sentimental ?? "").toUpperCase()] ?? s.sentimental}</span>
                              <span style={{ color: "var(--muted)" }}>{perc}%</span>
                            </div>
                            <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--table-border)" }}>
                              <div className="h-full rounded-full" style={{ width: `${perc}%`, background: cor }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {detalhe.keywords && detalhe.keywords.length > 0 && (
                  <div className="rounded-lg px-3 py-2.5" style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--muted)" }}>Palavras-chave</p>
                    <div className="flex flex-wrap gap-1">
                      {detalhe.keywords.slice(0, 8).map((k, i) => {
                        const word = typeof k === "string" ? k : (k?.word ?? "").trim();
                        if (!word) return null;
                        return (
                          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "var(--nav-active-bg)", color: "var(--accent-text)" }}>{word}</span>
                        );
                      })}
                    </div>
                  </div>
                )}
                {detalhe.competitors && detalhe.competitors.length > 0 && (
                  <div className="rounded-lg px-3 py-2.5" style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--muted)" }}>Concorrentes citados</p>
                    <div className="flex flex-wrap gap-1">
                      {detalhe.competitors.map((c, i) => (
                        <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(239, 68, 68, 0.12)", color: "#f87171" }}>
                          {c.word || "—"} ({c.count ?? 0}x)
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Scorecard da reunião (visualização de teste) */}
              {detalhe.answers && detalhe.answers.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold mb-2 flex items-center gap-2" style={{ color: "var(--foreground)" }}>
                    Scorecard da reunião
                    <span
                      className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                      style={{ background: "rgba(139, 92, 246, 0.15)", color: "#a78bfa" }}
                    >
                      Visualização de teste
                    </span>
                  </h3>
                  <div className="space-y-2">
                    {detalhe.answers.map((a, i) => {
                      const cor = a.score == null ? "var(--muted)" : a.score >= 7 ? "#10b981" : a.score >= 5 ? "#f59e0b" : "#ef4444";
                      return (
                        <div
                          key={i}
                          className="rounded-lg px-3 py-2.5 flex items-center justify-between gap-3 flex-wrap"
                          style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-xs" style={{ color: "var(--foreground)" }}>{a.question || "Pergunta"}</p>
                            {a.subtopics && a.subtopics.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {a.subtopics.map((s, j) => (
                                  <span key={j} className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "var(--nav-active-bg)", color: "var(--accent-text)" }}>
                                    {s}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          {a.yesNo === true && (
                            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}>Sim</span>
                          )}
                          {a.yesNo === false && (
                            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: "rgba(239, 68, 68, 0.15)", color: "#ef4444" }}>Não</span>
                          )}
                          {a.yesNo == null && a.score != null && (
                            <div className="flex items-center gap-2 min-w-[130px]">
                              <div className="h-1.5 rounded-full flex-1" style={{ background: "var(--table-border)" }}>
                                <div className="h-full rounded-full" style={{ width: `${Math.min(100, (a.score / 10) * 100)}%`, background: cor }} />
                              </div>
                              <span className="text-xs font-bold tabular-nums" style={{ color: cor }}>
                                {a.score}/10
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Objeções e razões */}
              {detalhe.reasons && detalhe.reasons.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold mb-2" style={{ color: "var(--foreground)" }}>
                    Objeções e razões
                  </h3>
                  <div className="space-y-2">
                    {detalhe.reasons.map((r, i) => (
                      <div
                        key={i}
                        className="rounded-lg px-3 py-2.5"
                        style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", borderLeft: "3px solid #f59e0b" }}
                      >
                        <div className="flex items-center gap-2 mb-0.5">
                          {r.type && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#fbbf24" }}>
                              {r.type}
                            </span>
                          )}
                        </div>
                        {r.description && (
                          <p className="text-xs" style={{ color: "var(--foreground)" }}>{r.description}</p>
                        )}
                        {r.details && (
                          <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: "var(--muted)" }}>{r.details}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pontos importantes */}
              {detalhe.importantPoints && detalhe.importantPoints.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold mb-2" style={{ color: "var(--foreground)" }}>
                    Pontos importantes
                  </h3>
                  <ul className="space-y-1.5 rounded-lg px-4 py-3" style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}>
                    {detalhe.importantPoints.map((p, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs leading-relaxed" style={{ color: "var(--foreground)" }}>
                        <CheckCircle2 size={13} className="flex-shrink-0 mt-0.5" style={{ color: "var(--accent-text)" }} />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Sentimento por participante */}
              {detalhe.sentimentAnalysis?.speakerSentiment && detalhe.sentimentAnalysis.speakerSentiment.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold mb-2" style={{ color: "var(--foreground)" }}>Sentimento por participante</h3>
                  <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--input-border)" }}>
                    <table className="w-full text-sm">
                      <tbody>
                        {detalhe.sentimentAnalysis.speakerSentiment.map((sp, i) => {
                          const dominante = (sp.sentiments ?? []).slice().sort((a, b) => (b.total ?? 0) - (a.total ?? 0))[0];
                          const cor = SENTIMENT_CORES[(dominante?.sentimental ?? "").toUpperCase()] ?? "var(--muted)";
                          return (
                            <tr key={i} className="border-b last:border-b-0" style={{ borderColor: "var(--input-border)" }}>
                              <td className="px-3 py-2 text-xs font-medium" style={{ color: "var(--foreground)" }}>{sp.speaker || "—"}</td>
                              <td className="px-3 py-2 text-xs text-right" style={{ color: cor, fontWeight: 600 }}>
                                {SENTIMENT_LABELS[(dominante?.sentimental ?? "").toUpperCase()] ?? dominante?.sentimental ?? "—"}
                                {dominante?.perc != null ? ` (${Math.round(dominante.perc)}%)` : ""}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Transcrição por fala (linha do tempo) */}
              {(blocosFala.length > 0 || detalhe.transcript?.text) && (
                <div>
                  <h3 className="text-xs font-semibold flex items-center gap-1.5 mb-2" style={{ color: "var(--foreground)" }}>
                    <FileText size={12} style={{ color: "var(--muted)" }} /> Transcrição por fala
                  </h3>
                  <details className="rounded-lg overflow-hidden" style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}>
                    <summary className="text-xs font-medium px-4 py-2.5 cursor-pointer" style={{ color: "var(--muted)" }}>
                      {blocosFala.length > 0
                        ? `${blocosFala.length} bloco(s) de fala — clique para expandir`
                        : `${(detalhe.transcript?.text ?? "").length.toLocaleString("pt-BR")} caracteres — clique para expandir`}
                    </summary>
                    {blocosFala.length > 0 ? (
                      <div className="px-4 pb-4 pt-1 max-h-96 overflow-y-auto space-y-4">
                        {blocosFala.map((b, i) => {
                          const dominante =
                            Object.entries(b.sentimentos).sort((x, y) => y[1] - x[1])[0]?.[0] ?? "NEUTRAL";
                          const cor = SENTIMENT_CORES[dominante] ?? "var(--muted)";
                          const frases = b.texto.split(/(?<=[.!?])\s+/).filter((f) => f.trim());
                          return (
                            <div key={i} className="flex gap-2.5">
                              <span className="text-[10px] font-mono pt-0.5 flex-shrink-0 tabular-nums" style={{ color: "var(--muted)" }}>
                                {mmss(b.inicio)}
                              </span>
                              <span
                                aria-hidden
                                className="w-1 rounded-full flex-shrink-0 self-stretch"
                                style={{ background: cor, minHeight: 18, opacity: 0.7 }}
                              />
                              <div>
                                {frases.map((frase, j) => (
                                  <p key={j} className="text-xs leading-relaxed mb-1.5" style={{ color: "var(--foreground)" }}>
                                    {frase.trim()}
                                  </p>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs leading-relaxed px-4 pb-4 whitespace-pre-wrap max-h-96 overflow-y-auto" style={{ color: "var(--foreground)" }}>
                        {detalhe.transcript?.text}
                      </p>
                    )}
                  </details>
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-center py-8" style={{ color: "var(--muted)" }}>Não foi possível carregar os detalhes.</p>
          )}
        </div>
      </div>
    </div>
  );
}
