"use client";

import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LabelList,
} from "recharts";
import {
  Calendar,
  Clock,
  Link2,
  Users,
  Loader2,
  X,
  SlidersHorizontal,
  UserX,
  Search,
} from "lucide-react";
import { ElephanMeetingDetailModal, ElephanTranscribeFull } from "@/components/elephan-meeting-detail";

interface TranscribeLite {
  id: string;
  title?: string;
  dateIncluded?: string;
  duration?: number;
  user?: { name?: string; email?: string };
  prompt?: { name?: string };
  deal?: { crmUrl?: string | null } | null;
  sentimentAnalysis?: {
    totalSentiment?: Array<{ sentimental?: string; total?: number; perc?: number }>;
    speakerSentiment?: Array<{
      speaker?: string;
      total?: number;
      sentiments?: Array<{ sentimental?: string; total?: number; perc?: number }>;
    }>;
  } | null;
}

interface Periodo {
  inicio: Date;
  fim: Date;
  diasNoMes: number;
  label: string;
  atual: boolean;
}

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function duracaoCurta(seg?: number): string {
  if (!seg) return "—";
  return `${Math.round(seg / 60)}min`;
}
function dataCurta(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${MESES[d.getMonth()]}`;
}
function horaCurta(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}h${String(d.getMinutes()).padStart(2, "0")}`;
}

// Extrai o nome do cliente do título ("Alinhamento | Centauro <> RankMyApp" -> "Centauro")
function clienteDoTitulo(title?: string): string | null {
  if (!title || !title.includes("<>")) return null;
  let parte = title.split("<>")[0].trim();
  if (parte.includes("|")) parte = parte.split("|").pop()!.trim();
  return parte || null;
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

// Lista gerenciada pelo admin: pessoas (ex.: membros internos) removidas da
// sentimentação para focar nos sentimentos dos clientes. Persistida no navegador.

function normNome(nome: string): string {
  return nome.trim().toLowerCase().replace(/\s+/g, " ");
}

export function ElephanDashboard({
  itens,
  periodo,
  loading,
  error,
  excluidos,
  onToggleExclusao,
  onRestoreExclusoes,
}: {
  itens: TranscribeLite[];
  periodo: Periodo;
  loading: boolean;
  error: string | null;
  excluidos: Set<string>;
  onToggleExclusao: (nome: string) => void;
  onRestoreExclusoes: () => void;
}) {
  const [respSelecionado, setRespSelecionado] = useState<string | null>(null);
  const [showExclusoes, setShowExclusoes] = useState(false);
  const [buscaExclusao, setBuscaExclusao] = useState("");
  // Modal de grupo: lista de reuniões de um agregado (dia, responsável, cliente, tipo)
  const [modalGrupo, setModalGrupo] = useState<{ titulo: string; subtitulo: string; itens: TranscribeLite[] } | null>(null);
  // Modal principal de detalhe da reunião (compartilhado)
  const [detalheAberto, setDetalheAberto] = useState<ElephanTranscribeFull | null>(null);
  const [detalheLoading, setDetalheLoading] = useState(false);

  async function abrirDetalheReuniao(id: string) {
    setDetalheLoading(true);
    try {
      let apiKey = "";
      try {
        apiKey = localStorage.getItem("elephan_api_key") ?? "";
      } catch {
        // proxy usa a chave do .env
      }
      const res = await fetch("/api/elephan/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: `/v1/transcribes/${id}`, apiKey }),
        signal: AbortSignal.timeout(30000),
      });
      const data = await res.json();
      if (!res.ok || data.status >= 400) throw new Error(data.error ?? `API ${data.status}`);
      setDetalheAberto((data.body?.data ?? null) as ElephanTranscribeFull | null);
    } catch {
      setDetalheAberto(null);
    } finally {
      setDetalheLoading(false);
    }
  }

  function abrirGrupo(titulo: string, subtitulo: string, lista: TranscribeLite[]) {
    if (lista.length === 0) return;
    setModalGrupo({ titulo, subtitulo, itens: lista });
  }

  // Todos os nomes conhecidos (responsáveis + participantes) para o gerenciador
  const todosNomes = useMemo(() => {
    const s = new Set<string>();
    itens.forEach((o) => {
      const nome = o.user?.name?.trim();
      if (nome) s.add(nome);
      (o.sentimentAnalysis?.speakerSentiment ?? []).forEach((sp) => {
        if (sp.speaker?.trim()) s.add(sp.speaker.trim());
      });
    });
    return [...s].sort();
  }, [itens]);

  const kpis = useMemo(() => {
    const total = itens.length;
    const duracaoSeg = itens.reduce((s, o) => s + (o.duration || 0), 0);
    const comDeal = itens.filter((o) => o.deal?.crmUrl).length;
    const pctDeal = total ? Math.round((comDeal / total) * 100) : 0;
    const ativos = new Set(itens.map((o) => o.user?.email).filter(Boolean)).size;
    return { total, horas: duracaoSeg / 3600, pctDeal, ativos, comDeal };
  }, [itens]);

  const porDia = useMemo(() => {
    const contagem: Record<number, number> = {};
    itens.forEach((o) => {
      if (!o.dateIncluded) return;
      const dia = new Date(o.dateIncluded).getDate();
      contagem[dia] = (contagem[dia] ?? 0) + 1;
    });
    // Somente dias que tiveram gravações (sem espaços vazios no eixo)
    return Object.entries(contagem)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([dia, value]) => ({ dia, value: Number(value) }));
  }, [itens]);

  function agruparPorResponsavel<K extends string>(keyFn: (o: TranscribeLite) => K | null, valorFn: (o: TranscribeLite) => number) {
    const g: Record<string, number> = {};
    itens.forEach((o) => {
      const k = keyFn(o);
      if (!k) return;
      g[k] = (g[k] ?? 0) + valorFn(o);
    });
    return Object.entries(g).sort(([, a], [, b]) => b - a);
  }

  const porResponsavel = useMemo(
    () => agruparPorResponsavel(
      (o) => o.user?.name?.trim() || o.user?.email || null,
      () => 1
    ).slice(0, 6).map(([nome, count]) => ({ nome, valor: String(count) })),
    [itens]
  );

  const horasPorResponsavel = useMemo(
    () => agruparPorResponsavel(
      (o) => o.user?.name?.trim() || o.user?.email || null,
      (o) => o.duration || 0
    ).slice(0, 6).map(([nome, seg]) => ({ nome, valor: `${(seg / 3600).toFixed(1)}h` })),
    [itens]
  );

  const principaisClientes = useMemo(() => {
    const g: Record<string, number> = {};
    itens.forEach((o) => {
      const c = clienteDoTitulo(o.title);
      if (!c) return;
      g[c] = (g[c] ?? 0) + 1;
    });
    return Object.entries(g)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([nome, count]) => ({ nome, valor: String(count) }));
  }, [itens]);

  // Média dos 4 sentimentos por responsável (casa speaker com o nome do responsável)
  const sentimentoPorResponsavel = useMemo(() => {
    const g: Record<string, { POSITIVE: number; NEUTRAL: number; NEGATIVE: number; MIXED: number; n: number }> = {};
    itens.forEach((o) => {
      const nome = o.user?.name?.trim();
      if (!nome) return;
      const speakers = o.sentimentAnalysis?.speakerSentiment ?? [];
      const sp =
        speakers.find((s) => (s.speaker ?? "").toLowerCase() === nome.toLowerCase()) ||
        speakers.find((s) => (s.speaker ?? "").toLowerCase().startsWith(nome.split(" ")[0].toLowerCase()));
      if (!sp?.sentiments) return;
      if (!g[nome]) g[nome] = { POSITIVE: 0, NEUTRAL: 0, NEGATIVE: 0, MIXED: 0, n: 0 };
      ORDEM_SENTIMENTOS.forEach((s) => {
        const found = sp.sentiments!.find((x) => (x.sentimental ?? "").toUpperCase() === s);
        if (found?.perc != null) g[nome][s as keyof typeof g[string]] += found.perc;
      });
      g[nome].n += 1;
    });
    return Object.entries(g)
      .map(([nome, v]) => ({
        nome,
        medias: {
          POSITIVE: Math.round(v.POSITIVE / v.n),
          NEUTRAL: Math.round(v.NEUTRAL / v.n),
          NEGATIVE: Math.round(v.NEGATIVE / v.n),
          MIXED: Math.round(v.MIXED / v.n),
        },
        reunioes: v.n,
      }))
      .sort((a, b) => b.medias.NEGATIVE - a.medias.NEGATIVE || a.medias.POSITIVE - b.medias.POSITIVE)
      .slice(0, 6);
  }, [itens]);

  const porTipo = useMemo(() => {
    const g: Record<string, number> = {};
    itens.forEach((o) => {
      const tipo = o.prompt?.name?.trim() || "Sem tipo";
      g[tipo] = (g[tipo] ?? 0) + 1;
    });
    return Object.entries(g)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([tipo, count]) => ({ tipo, count }));
  }, [itens]);

  // Filtros que abrem o modal de grupo com a lista de reuniões do agregado
  function porNome(nome: string) {
    const lista = itens.filter((o) => (o.user?.name?.trim() || o.user?.email) === nome);
    abrirGrupo(`Reuniões — ${nome}`, `${lista.length} reunião(ões) em ${periodo.label}`, lista);
  }
  function porCliente(cliente: string) {
    const lista = itens.filter((o) => clienteDoTitulo(o.title) === cliente);
    abrirGrupo(`Reuniões — ${cliente}`, `${lista.length} reunião(ões) em ${periodo.label}`, lista);
  }
  function porTipoFiltro(tipo: string) {
    const lista = itens.filter((o) => (o.prompt?.name?.trim() || "Sem tipo") === tipo);
    abrirGrupo(`Reuniões — ${tipo}`, `${lista.length} reunião(ões) em ${periodo.label}`, lista);
  }
  function porDiaFiltro(dia: string) {
    const lista = itens.filter((o) => {
      if (!o.dateIncluded) return false;
      const d = new Date(o.dateIncluded);
      return d.getDate() === Number(dia) && d.getMonth() === periodo.inicio.getMonth();
    });
    abrirGrupo(`Reuniões — ${dia}/${MESES[periodo.inicio.getMonth()]}`, `${lista.length} reunião(ões)`, lista);
  }

  // Drill-down: reuniões + participantes do responsável selecionado
  const reunioesDoSelecionado = useMemo(() => {
    if (!respSelecionado) return [];
    return itens
      .filter((o) => (o.user?.name?.trim() || o.user?.email) === respSelecionado)
      .sort((a, b) => (b.dateIncluded ?? "").localeCompare(a.dateIncluded ?? ""));
  }, [itens, respSelecionado]);

  const kpiCards = [
    { icon: Calendar, cor: "#8b5cf6", label: "Reuniões", value: String(kpis.total), sub: "no período selecionado" },
    { icon: Clock, cor: "#06b6d4", label: "Tempo em reuniões", value: `${kpis.horas.toFixed(1)}h`, sub: "soma da duração de todas" },
    { icon: Link2, cor: "#ff7a59", label: "Vinculadas ao CRM", value: `${kpis.pctDeal}%`, sub: `${kpis.comDeal} com deal no CRM` },
    { icon: Users, cor: "#10b981", label: "Responsáveis ativos", value: String(kpis.ativos), sub: "com reuniões no período" },
  ];

  function barraLista(titulo: string, sub: string | null, linhas: Array<{ nome: string; valor: string }>, maxValor: number, corFrom: string, corTo: string, onClickNome?: (nome: string) => void) {
    return (
      <div
        className="relative overflow-hidden rounded-2xl p-5"
        style={{ background: "linear-gradient(135deg, var(--card-bg) 0%, var(--background) 60%)", border: "1px solid var(--card-border)" }}
      >
        <div
          className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-15 pointer-events-none"
          style={{ background: `radial-gradient(circle, ${corFrom}, transparent)` }}
        />
        <h3 className="relative text-xs font-semibold mb-3" style={{ color: "var(--foreground)" }}>{titulo}</h3>
        {sub && <p className="relative text-[10px] -mt-2 mb-3" style={{ color: "var(--muted)" }}>{sub}</p>}
        <div className="relative space-y-1">
          {linhas.length === 0 && <p className="text-[11px]" style={{ color: "var(--muted)" }}>Sem dados no período.</p>}
          {linhas.map((r) => (
            <div
              key={r.nome}
              onClick={onClickNome ? () => onClickNome(r.nome) : undefined}
              className={`flex items-center gap-2 ${onClickNome ? "cursor-pointer hover:opacity-90 transition-opacity rounded-lg -mx-2 px-2 py-1" : ""}`}
              title={onClickNome ? "Ver reuniões" : undefined}
            >
              <span className="text-[11px] w-28 truncate" style={{ color: onClickNome ? "var(--accent-text)" : "var(--foreground)" }}>{r.nome}</span>
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--table-border)" }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.max(4, (parseInt(r.valor.replace(/[^\d.]/g, "")) || 0) / maxValor * 100)}%`, background: `linear-gradient(90deg, ${corFrom}, ${corTo})` }}
                />
              </div>
              <span className="text-[11px] font-bold tabular-nums w-9 text-right" style={{ color: "var(--muted)" }}>{r.valor}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const cardGlass = { background: "linear-gradient(135deg, var(--card-bg) 0%, var(--background) 60%)", border: "1px solid var(--card-border)" };

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="rounded-2xl p-12 flex items-center justify-center gap-2" style={cardGlass}>
          <Loader2 size={18} className="animate-spin" style={{ color: "var(--muted)" }} />
          <span className="text-xs" style={{ color: "var(--muted)" }}>Carregando dados do dashboard...</span>
        </div>
      ) : error ? (
        <div className="rounded-2xl p-8 text-center text-xs" style={cardGlass}>
          <p style={{ color: "#f87171" }}>{error}</p>
        </div>
      ) : itens.length === 0 ? (
        <div className="rounded-2xl p-8 text-center" style={cardGlass}>
          <p className="text-xs" style={{ color: "var(--muted)" }}>Nenhuma reunião em {periodo.label}.</p>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {kpiCards.map((k) => (
              <div key={k.label} className="relative overflow-hidden rounded-2xl p-5 flex flex-col" style={cardGlass}>
                <div
                  className="absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl opacity-20 pointer-events-none"
                  style={{ background: `radial-gradient(circle, ${k.cor}, transparent)` }}
                />
                <div className="relative flex items-center justify-between mb-2">
                  <span className="text-xs" style={{ color: "var(--muted)" }}>{k.label}</span>
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{
                      background: `color-mix(in srgb, ${k.cor} 15%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${k.cor} 30%, transparent)`,
                    }}
                  >
                    <k.icon size={14} style={{ color: k.cor }} />
                  </div>
                </div>
                <p className="relative text-2xl font-bold tracking-tight" style={{ color: k.cor }}>{k.value}</p>
                <p className="relative text-[10px] mt-0.5" style={{ color: "var(--muted)" }}>{k.sub}</p>
              </div>
            ))}
          </div>

          {/* Linha 1: por dia + horas por responsável */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="relative overflow-hidden rounded-2xl p-5" style={cardGlass}>
              <div
                className="absolute top-0 left-0 w-32 h-32 rounded-full blur-3xl opacity-10 pointer-events-none"
                style={{ background: "radial-gradient(circle, #8b5cf6, transparent)" }}
              />
              <h3 className="relative text-xs font-semibold mb-1" style={{ color: "var(--foreground)" }}>Reuniões por dia</h3>
              <p className="relative text-[10px] mb-3" style={{ color: "var(--muted)" }}>{periodo.label}</p>
              <div className="relative h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={porDia} barSize={porDia.length > 20 ? 12 : 18} margin={{ top: 18, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--table-border)" vertical={false} />
                    <XAxis dataKey="dia" tick={{ fill: "var(--muted)", fontSize: 9 }} axisLine={{ stroke: "var(--table-border)" }} tickLine={false} dy={6} interval={porDia.length > 20 ? 2 : 0} />
                    <YAxis tick={{ fill: "var(--muted)", fontSize: 9 }} axisLine={false} tickLine={false} allowDecimals={false} width={30} />
                    <Tooltip
                      cursor={{ fill: "rgba(139, 92, 246, 0.08)" }}
                      contentStyle={{ backgroundColor: "var(--card-bg)", border: "1px solid rgba(139, 92, 246, 0.4)", borderRadius: "10px", fontSize: "12px" }}
                      labelStyle={{ color: "var(--foreground)", marginBottom: 4 }}
                      itemStyle={{ color: "#a78bfa" }}
                    />
                    <Bar
                      dataKey="value"
                      radius={[4, 4, 0, 0]}
                      fill="#8b5cf6"
                      isAnimationActive={false}
                      cursor="pointer"
                      onClick={(barEntry: unknown) => {
                        const payload = (barEntry as { payload?: { dia: string } })?.payload;
                        if (!payload) return;
                        porDiaFiltro(payload.dia);
                      }}
                    >
                      <LabelList dataKey="value" position="top" style={{ fill: "var(--foreground)", fontSize: 10, fontWeight: 600 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {barraLista(
              "Horas por responsável",
              "tempo total em reunião no período — clique para ver as reuniões",
              horasPorResponsavel.map((r) => ({ nome: r.nome, valor: r.valor })),
              Math.max(...horasPorResponsavel.map((r) => parseFloat(r.valor)), 1),
              "#06b6d4",
              "#22d3ee",
              porNome
            )}
          </div>

          {/* Linha 2: responsáveis + clientes + sentimento (clicável) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {barraLista("Reuniões por responsável", "clique para ver as reuniões", porResponsavel, Math.max(...porResponsavel.map((r) => parseInt(r.valor)), 1), "#8b5cf6", "#a78bfa", porNome)}
            {barraLista("Principais clientes", "extraídos do título das reuniões — clique para ver", principaisClientes, Math.max(...principaisClientes.map((r) => parseInt(r.valor)), 1), "#f59e0b", "#fbbf24", porCliente)}

            {/* Sentimentação por responsável — ranking acionável, clicável, com exclusões */}
            {(() => {
              const visivel = sentimentoPorResponsavel.filter((r) => !excluidos.has(normNome(r.nome)));
              return (
                <div className="relative overflow-hidden rounded-2xl p-5" style={cardGlass}>
                  <div
                    className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-15 pointer-events-none"
                    style={{ background: "radial-gradient(circle, #10b981, transparent)" }}
                  />
                  <div className="relative flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>
                        Sentimentação por responsável
                      </h3>
                      <p className="text-[10px]" style={{ color: "var(--muted)" }}>
                        {excluidos.size > 0 ? `excluindo ${excluidos.size} pessoa(s) • ` : ""}ordenado pelo maior risco
                      </p>
                    </div>
                    <button
                      onClick={() => { setShowExclusoes(true); setBuscaExclusao(""); }}
                      className="flex items-center gap-1.5 text-[10px] font-medium px-2.5 py-1.5 rounded-lg transition-opacity hover:opacity-80 cursor-pointer"
                      style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--muted)" }}
                      title="Gerenciar pessoas removidas da sentimentação"
                    >
                      <SlidersHorizontal size={11} />
                      Pessoas
                    </button>
                  </div>
                  <div className="relative space-y-1.5">
                    {visivel.length === 0 && (
                      <p className="text-[11px]" style={{ color: "var(--muted)" }}>Sem dados no período.</p>
                    )}
                    {visivel.map((r) => {
                      const dominante = ORDEM_SENTIMENTOS.slice().sort((a, b) => r.medias[b as keyof typeof r.medias] - r.medias[a as keyof typeof r.medias])[0];
                      const cor = SENTIMENT_CORES[dominante];
                      return (
                        <button
                          key={r.nome}
                          onClick={() => setRespSelecionado(r.nome)}
                          className="w-full text-left rounded-lg px-3 py-2 transition-all hover:opacity-90 cursor-pointer"
                          style={{ background: "var(--input-bg)", border: `1px solid ${dominante === "NEGATIVE" ? "#ef444455" : "var(--input-border)"}` }}
                          title="Ver sentimentação por cliente e por participante"
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-xs font-medium truncate" style={{ color: "var(--foreground)" }}>{r.nome}</span>
                            <span
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                              style={{ background: `${cor}22`, color: cor }}
                            >
                              {SENTIMENT_LABELS[dominante]} {r.medias[dominante as keyof typeof r.medias]}%
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 flex h-1 rounded-full overflow-hidden" style={{ background: "var(--table-border)" }}>
                              {ORDEM_SENTIMENTOS.map((s) => {
                                const perc = r.medias[s as keyof typeof r.medias];
                                return perc > 0 ? (
                                  <div key={s} style={{ width: `${perc}%`, background: SENTIMENT_CORES[s] }} title={`${SENTIMENT_LABELS[s]}: ${perc}%`} />
                                ) : null;
                              })}
                            </div>
                            <span className="text-[9px] flex-shrink-0 tabular-nums" style={{ color: "var(--muted)" }}>{r.reunioes} reuniões</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Linha 3: tipos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {barraLista("Tipos de reunião", "clique para ver as reuniões", porTipo.map((t) => ({ nome: t.tipo, valor: String(t.count) })), Math.max(...porTipo.map((t) => t.count), 1), "#10b981", "#34d399", porTipoFiltro)}
          </div>

          {/* Modal de gerenciamento de exclusões */}
          {showExclusoes && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="rounded-xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
                <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--table-border)" }}>
                  <div>
                    <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: "var(--foreground)" }}>
                      <UserX size={16} style={{ color: "#f59e0b" }} />
                      Pessoas removidas da sentimentação
                    </h2>
                    <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                      Marque quem NÃO deve aparecer (ex.: membros internos). Sobram apenas clientes.
                    </p>
                  </div>
                  <button onClick={() => setShowExclusoes(false)} className="transition-colors cursor-pointer" style={{ color: "var(--muted)" }}>
                    <X size={20} />
                  </button>
                </div>
                <div className="p-5 space-y-3 overflow-y-auto flex-1">
                  {/* Busca de nomes */}
                  <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted)" }} />
                    <input
                      value={buscaExclusao}
                      onChange={(e) => setBuscaExclusao(e.target.value)}
                      placeholder="Buscar nome..."
                      className="w-full text-xs rounded-lg pl-9 pr-3 py-2 outline-none"
                      style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--foreground)" }}
                      autoFocus
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {todosNomes
                      .filter((nome) => !buscaExclusao.trim() || nome.toLowerCase().includes(buscaExclusao.trim().toLowerCase()))
                      .map((nome) => {
                        const ex = excluidos.has(normNome(nome));
                        return (
                          <button
                            key={nome}
                            onClick={() => onToggleExclusao(nome)}
                            className="text-[11px] px-3 py-1.5 rounded-full transition-all cursor-pointer hover:opacity-80"
                            style={
                              ex
                                ? { background: "rgba(239, 68, 68, 0.12)", color: "#f87171", border: "1px solid rgba(239, 68, 68, 0.35)", textDecoration: "line-through" }
                                : { background: "var(--nav-active-bg)", color: "var(--accent-text)", border: "1px solid var(--nav-active-border)" }
                            }
                            title={ex ? "Excluído — clique para reverter" : "Visível — clique para excluir"}
                          >
                            {ex ? "✕ " : ""}{nome}
                          </button>
                        );
                      })}
                  </div>
                  {todosNomes.filter((nome) => !buscaExclusao.trim() || nome.toLowerCase().includes(buscaExclusao.trim().toLowerCase())).length === 0 && (
                    <p className="text-xs text-center py-6" style={{ color: "var(--muted)" }}>
                      Nenhum nome encontrado para “{buscaExclusao}”.
                    </p>
                  )}
                </div>
                <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: "1px solid var(--card-border)" }}>
                  <span className="text-[10px]" style={{ color: "var(--muted)" }}>
                    {excluidos.size} pessoa(s) excluída(s) • salvo neste navegador
                  </span>
                  {excluidos.size > 0 && (
                    <button
                      onClick={() => onRestoreExclusoes()}
                      className="text-[11px] font-medium px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80 cursor-pointer"
                      style={{ background: "var(--nav-active-bg)", color: "var(--accent-text)", border: "1px solid var(--nav-active-border)" }}
                    >
                      Restaurar todos
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Modal drill-down de sentimentação */}
          {respSelecionado && (() => {
            // agregados do responsável
            const agg = sentimentoPorResponsavel.find((r) => r.nome === respSelecionado)?.medias;
            return (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
                  <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--table-border)" }}>
                    <div>
                      <h2 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
                        Sentimentação — {respSelecionado}
                      </h2>
                      <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                        {reunioesDoSelecionado.length} reunião(ões) em {periodo.label} • por cliente e por participante
                      </p>
                    </div>
                    <button onClick={() => setRespSelecionado(null)} className="transition-colors cursor-pointer" style={{ color: "var(--muted)" }}>
                      <X size={20} />
                    </button>
                  </div>
                  <div className="overflow-y-auto flex-1 p-6 space-y-5">
                    {/* Médias agregadas */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {ORDEM_SENTIMENTOS.map((s) => {
                        const perc = agg ? agg[s as keyof typeof agg] : 0;
                        return (
                          <div key={s} className="rounded-lg px-3 py-2.5" style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}>
                            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>{SENTIMENT_LABELS[s]}</p>
                            <p className="text-lg font-bold" style={{ color: SENTIMENT_CORES[s] }}>{perc}%</p>
                          </div>
                        );
                      })}
                    </div>

                    {/* Por reunião: cliente + participantes */}
                    <div className="space-y-3">
                      {reunioesDoSelecionado.map((o) => {
                        const totals = o.sentimentAnalysis?.totalSentiment ?? [];
                        const speakers = o.sentimentAnalysis?.speakerSentiment ?? [];
                        return (
                          <div
                            key={o.id}
                            onClick={() => abrirDetalheReuniao(o.id)}
                            className="rounded-lg px-4 py-3 cursor-pointer hover:opacity-90 transition-opacity"
                            style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}
                            title="Ver detalhes da reunião"
                          >
                            <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
                              <p className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>
                                {clienteDoTitulo(o.title) || o.title || "Reunião"}
                              </p>
                              <span className="text-[10px]" style={{ color: "var(--muted)" }}>
                                {(() => {
                                  if (!o.dateIncluded) return "—";
                                  const d = new Date(o.dateIncluded);
                                  return `${String(d.getDate()).padStart(2, "0")}/${MESES[d.getMonth()]} ${String(d.getHours()).padStart(2, "0")}h${String(d.getMinutes()).padStart(2, "0")}`;
                                })()}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 mb-2">
                              <div className="flex-1 flex h-1.5 rounded-full overflow-hidden" style={{ background: "var(--table-border)" }}>
                                {ORDEM_SENTIMENTOS.map((s) => {
                                  const f = totals.find((x) => (x.sentimental ?? "").toUpperCase() === s);
                                  const perc = f?.perc ?? 0;
                                  return perc > 0 ? <div key={s} style={{ width: `${perc}%`, background: SENTIMENT_CORES[s] }} title={`${SENTIMENT_LABELS[s]}: ${Math.round(perc)}%`} /> : null;
                                })}
                              </div>
                            </div>
                            {speakers.filter((sp) => !excluidos.has(normNome(sp.speaker ?? ""))).length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {speakers.filter((sp) => !excluidos.has(normNome(sp.speaker ?? ""))).map((sp, i) => {
                                  const dom = (sp.sentiments ?? []).slice().sort((x, y) => (y.total ?? 0) - (x.total ?? 0))[0];
                                  const s = (dom?.sentimental ?? "").toUpperCase();
                                  const cor = SENTIMENT_CORES[s] ?? "var(--muted)";
                                  return (
                                    <span
                                      key={i}
                                      className="text-[10px] px-2 py-0.5 rounded-full"
                                      style={{ background: "var(--card-bg)", border: `1px solid ${cor}44`, color: cor }}
                                      title={(sp.sentiments ?? []).map((x) => `${SENTIMENT_LABELS[(x.sentimental ?? "").toUpperCase()] ?? x.sentimental}: ${Math.round(x.perc ?? 0)}%`).join(" • ")}
                                    >
                                      {sp.speaker || "—"}: {SENTIMENT_LABELS[s] ?? dom?.sentimental ?? "—"} {Math.round(dom?.perc ?? 0)}%
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Modal de grupo: lista de reuniões do agregado clicado */}
          {modalGrupo && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="rounded-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col" style={{ background: "linear-gradient(135deg, var(--card-bg) 0%, var(--background) 60%)", border: "1px solid var(--card-border)" }}>
                <div className="relative flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--table-border)" }}>
                  <div
                    className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-15 pointer-events-none"
                    style={{ background: "radial-gradient(circle, #8b5cf6, transparent)" }}
                  />
                  <div className="relative">
                    <h2 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>{modalGrupo.titulo}</h2>
                    <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                      {modalGrupo.subtitulo} • clique para ver os detalhes completos
                    </p>
                  </div>
                  <button onClick={() => setModalGrupo(null)} className="relative transition-colors cursor-pointer" style={{ color: "var(--muted)" }}>
                    <X size={20} />
                  </button>
                </div>
                <div className="overflow-y-auto flex-1 p-4 space-y-2">
                  {modalGrupo.itens.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => abrirDetalheReuniao(o.id)}
                      className="w-full text-left rounded-lg px-4 py-3 transition-all hover:opacity-90 cursor-pointer"
                      style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}
                      title="Ver detalhes da reunião"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>{o.title || "Sem título"}</p>
                        <span className="text-[11px] whitespace-nowrap flex-shrink-0" style={{ color: "var(--muted)" }}>
                          {dataCurta(o.dateIncluded)} {horaCurta(o.dateIncluded)}
                        </span>
                      </div>
                      <p className="text-[11px] mt-1 truncate" style={{ color: "var(--muted)" }}>
                        {o.user?.name?.split(" ").slice(0, 2).join(" ") || o.user?.email?.split("@")[0] || "—"} • {o.prompt?.name || "Sem tipo"} • {duracaoCurta(o.duration)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Modal principal de detalhe da reunião */}
          {(detalheAberto || detalheLoading) && (
            <ElephanMeetingDetailModal detalhe={detalheAberto} loading={detalheLoading} onClose={() => { setDetalheAberto(null); setDetalheLoading(false); }} />
          )}
        </>
      )}
    </div>
  );
}
