"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { DashboardLayout } from "@/components/dashboard-layout";
import { usePrivileges } from "@/lib/use-privileges";
import {
  computeRecuperaStats,
  filterRecoveries,
  scopeRecoveries,
  formatBRL,
  formatPct,
  STATUS_RECUPERA,
  TIPO_RECUPERA,
  type Recovery,
} from "@/lib/recupera";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LabelList,
} from "recharts";
import {
  Search,
  Plus,
  MoreHorizontal,
  X,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingDown,
  TrendingUp,
  Wallet,
  BarChart3,
  FileWarning,
  Columns3,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Inbox,
  User,
} from "lucide-react";

interface User {
  email: string;
  name: string;
}

const statusPropostaOptions = [
  "Enviada",
  "Sem retorno",
  "Recusada",
  "Aprovada parcialmente",
  "Em análise",
  "Em produção",
] as const;

const meses = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// Cores fixas por status de proposta (donut)
const CORES_PROPOSTA: Record<string, string> = {
  "Enviada": "#8b5cf6",
  "Sem retorno": "#fbbf24",
  "Recusada": "#f43f5e",
  "Aprovada parcialmente": "#38bdf8",
  "Em análise": "#a78bfa",
  "Em produção": "#34d399",
};

// Colunas da tabela (Personalizar Colunas, padrão Overview)
const columnLabels: Record<string, string> = {
  responsavel: "Account",
  cliente: "Cliente",
  receita_em_risco: "Receita em Risco",
  receita_recuperada: "Receita Recuperada",
  tipo_recupera: "Recupera Preditivo/Churn",
  data_pedido_churn: "Data Pedido Churn",
  status_recupera: "Status Recupera",
  ja_na_projecao: "Já na Projeção",
  data_prevista_churn: "Data Prevista Churn",
  proposta_enviada: "Proposta Enviada",
  proposta_com_reducao: "Proposta c/ Redução",
  status_proposta: "Status Proposta",
};

const defaultVisibleColumns: Record<string, boolean> = {
  responsavel: true,
  cliente: true,
  receita_em_risco: true,
  receita_recuperada: true,
  tipo_recupera: true,
  data_pedido_churn: true,
  status_recupera: true,
  ja_na_projecao: true,
  data_prevista_churn: false,
  proposta_enviada: true,
  proposta_com_reducao: false,
  status_proposta: true,
};

export default function RecuperaPage() {
  const [recoveries, setRecoveries] = useState<Recovery[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterTipo, setFilterTipo] = useState("");
  const [filterResponsavel, setFilterResponsavel] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(defaultVisibleColumns);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  // Modal de drill-down analítico (padrão Overview): lista os registros por trás de um número
  const [drill, setDrill] = useState<{ titulo: string; subtitulo: string; itens: Recovery[] } | null>(null);
  // Email do usuario logado: mantem a sidebar em modo admin
  const [userEmail, setUserEmail] = useState("");

  // Form state
  const [formData, setFormData] = useState<Partial<Recovery>>({
    responsavel: "",
    cliente: "",
    receita_em_risco: 0,
    receita_recuperada: null,
    tipo_recupera: "Preditivo",
    data_pedido_churn: null,
    status_recupera: "Em andamento",
    ja_na_projecao: false,
    data_prevista_churn: null,
    proposta_enviada: false,
    proposta_com_reducao: false,
    status_proposta: null,
  });

  const priv = usePrivileges();
  // somente visualização: sem criar/editar/excluir
  const readOnly = !priv.canEdit("recupera");

  useEffect(() => {
    async function guardAndLoad() {
      await Promise.resolve(); // evita setState síncrono no corpo do effect (react-hooks)
      if (priv.loading) return;
      if (!priv.email) {
        window.location.href = "/login";
        return;
      }
      // Guarda por privilégio: abre quando o privilégio tem acesso à /recupera
      if (!priv.canOpen("recupera")) {
        window.location.href = priv.homeHref === "/recupera" ? "/overview" : priv.homeHref;
        return;
      }
      setUserEmail(priv.email);
      loadData();
    }
    guardAndLoad();
  }, [priv]);

  async function loadData() {
    const supabase = createClient();

    // Load users
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("email, name")
      .eq("active", true);

    if (userError) {
      setError("Não foi possível carregar a equipe (tabela users): " + userError.message);
    } else if (userData) {
      setUsers(userData.map(u => ({ email: u.email, name: u.name || u.email.split("@")[0] })));
    }

    // Load recoveries
    const { data: recoveryData, error: recoveryError } = await supabase
      .from("recoveries")
      .select("*")
      .order("created_at", { ascending: false });

    if (recoveryError) {
      setError("Não foi possível carregar as recuperações: " + recoveryError.message);
      setRecoveries([]);
    } else if (recoveryData) {
      setRecoveries(recoveryData as Recovery[]);
    }

    setLoading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();
    const payload = { ...formData, owner_email: priv.email };

    if (editingId) {
      const { error } = await supabase
        .from("recoveries")
        .update(payload)
        .eq("id", editingId);
      if (error) {
        setError("Erro ao salvar: " + error.message);
        return;
      }
    } else {
      const { error } = await supabase
        .from("recoveries")
        .insert([payload]);
      if (error) {
        setError("Erro ao criar: " + error.message);
        return;
      }
    }

    setShowCreateModal(false);
    setEditingId(null);
    setError("");
    resetForm();
    loadData();
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir este registro?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("recoveries").delete().eq("id", id);
    if (error) {
      setError("Erro ao excluir: " + error.message);
      return;
    }
    setError("");
    loadData();
  }

  function resetForm() {
    setFormData({
      responsavel: "",
      cliente: "",
      receita_em_risco: 0,
      receita_recuperada: null,
      tipo_recupera: "Preditivo",
      data_pedido_churn: null,
      status_recupera: "Em andamento",
      ja_na_projecao: false,
      data_prevista_churn: null,
      proposta_enviada: false,
      proposta_com_reducao: false,
      status_proposta: null,
    });
  }

  function openEditModal(recovery: Recovery) {
    setFormData(recovery);
    setEditingId(recovery.id);
    setShowCreateModal(true);
  }

  function handleSort(key: string) {
    if (sortColumn === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(key);
      setSortDirection("asc");
    }
  }

  // Escopo de dados do privilégio (all/hierarchy/own), como no Overview
  const scopedRecoveries = useMemo(() => {
    if (priv.loading) return [];
    return scopeRecoveries(recoveries, priv.scope("recupera"), {
      email: priv.email,
      hierarchyEmails: priv.hierarchyEmails,
    });
  }, [recoveries, priv]);

  const filteredRecoveries = useMemo(
    () =>
      filterRecoveries(scopedRecoveries, {
        search: searchTerm,
        status: filterStatus,
        tipo: filterTipo,
        responsavel: filterResponsavel,
      }),
    [scopedRecoveries, searchTerm, filterStatus, filterTipo, filterResponsavel]
  );

  const stats = useMemo(() => computeRecuperaStats(filteredRecoveries), [filteredRecoveries]);
  const statsGerais = useMemo(() => computeRecuperaStats(scopedRecoveries), [scopedRecoveries]);

  // Ordenação da tabela (padrão Overview)
  const sortedRecoveries = useMemo(() => {
    if (!sortColumn) return filteredRecoveries;
    return [...filteredRecoveries].sort((a, b) => {
      const aVal = a[sortColumn as keyof Recovery];
      const bVal = b[sortColumn as keyof Recovery];
      const dir = sortDirection === "asc" ? 1 : -1;
      if (typeof aVal === "number" && typeof bVal === "number") return (aVal - bVal) * dir;
      if (typeof aVal === "boolean" && typeof bVal === "boolean") return (Number(aVal) - Number(bVal)) * dir;
      return String(aVal ?? "").localeCompare(String(bVal ?? "")) * dir;
    });
  }, [filteredRecoveries, sortColumn, sortDirection]);

  const temFiltro = !!(searchTerm || filterStatus || filterTipo || filterResponsavel);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Em andamento":
        return { bg: "color-mix(in srgb, var(--warning) 15%, transparent)", text: "var(--warning)" };
      case "Recuperado":
        return { bg: "color-mix(in srgb, var(--success) 15%, transparent)", text: "var(--success)" };
      case "Perdido":
        return { bg: "color-mix(in srgb, var(--danger) 15%, transparent)", text: "var(--danger)" };
      default:
        return { bg: "var(--input-bg)", text: "var(--muted)" };
    }
  };

  const getTipoColor = (tipo: string) => {
    return tipo === "Preditivo"
      ? { bg: "color-mix(in srgb, var(--warning) 15%, transparent)", text: "var(--warning)" }
      : { bg: "color-mix(in srgb, var(--danger) 15%, transparent)", text: "var(--danger)" };
  };

  if (loading) {
    return (
      <DashboardLayout userEmail={userEmail}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: "var(--accent)" }} />
        </div>
      </DashboardLayout>
    );
  }

  // Drill-downs (cada KPI abre o modal com os registros por trás do número)
  const kpiDrills: Record<string, Recovery[]> = {
    "Em Andamento": filteredRecoveries.filter((r) => r.status_recupera === "Em andamento"),
    "Recuperados": filteredRecoveries.filter((r) => r.status_recupera === "Recuperado"),
    "Perdidos": filteredRecoveries.filter((r) => r.status_recupera === "Perdido"),
    "Receita em Risco": filteredRecoveries.filter((r) => (r.receita_em_risco || 0) > 0),
    "Receita Recuperada": filteredRecoveries.filter((r) => (r.receita_recuperada || 0) > 0),
  };

  const kpiCards = [
    {
      label: "Em Andamento",
      value: String(stats.emAndamento),
      sub: `${statsGerais.emAndamento} no escopo`,
      icon: Clock,
      color: "var(--warning)",
      tooltip: "Recuperações abertas (clique para ver)",
    },
    {
      label: "Recuperados",
      value: String(stats.recuperados),
      sub: stats.total > 0 ? `${formatPct(stats.recuperados / stats.total)} do filtrado` : "-",
      icon: CheckCircle2,
      color: "var(--success)",
      tooltip: "Clientes recuperados (clique para ver)",
    },
    {
      label: "Perdidos",
      value: String(stats.perdidos),
      sub: stats.total > 0 ? `${formatPct(stats.perdidos / stats.total)} do filtrado` : "-",
      icon: TrendingDown,
      color: "var(--danger)",
      tooltip: "Churn confirmado (clique para ver)",
    },
    {
      label: "Receita em Risco",
      value: formatBRL(stats.receitaEmRisco),
      sub: `Em aberto: ${formatBRL(stats.receitaEmAberto)}`,
      icon: AlertTriangle,
      color: "var(--accent)",
      tooltip: "Soma da receita em risco (clique para ver)",
    },
    {
      label: "Receita Recuperada",
      value: formatBRL(stats.receitaRecuperada),
      sub: `Taxa: ${formatPct(stats.taxaRecuperacao)}`,
      icon: TrendingUp,
      color: "var(--success)",
      tooltip: "Recuperada / em risco (clique para ver)",
    },
  ];

  return (
    <DashboardLayout userEmail={userEmail}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
              Recupera
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
              Gestão de recuperações preditivas e churn
            </p>
          </div>
        </div>

        {/* Erro de carregamento/CRUD (antes era engolido silenciosamente) */}
        {error && (
          <div
            className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm"
            style={{
              background: "color-mix(in srgb, var(--danger) 12%, transparent)",
              border: "1px solid color-mix(in srgb, var(--danger) 40%, transparent)",
              color: "var(--danger)",
            }}
          >
            <FileWarning size={16} />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError("")} className="cursor-pointer opacity-70 hover:opacity-100">
              <X size={14} />
            </button>
          </div>
        )}

        {/* KPI Cards (padrão Overview, clicáveis → drill-down) */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          {kpiCards.map((k) => (
            <button
              key={k.label}
              onClick={() => setDrill({ titulo: k.label, subtitulo: "Registros por trás deste número", itens: kpiDrills[k.label] ?? [] })}
              className="relative overflow-hidden rounded-2xl p-5 text-left transition-all cursor-pointer hover:opacity-90"
              style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
              title={k.tooltip}
            >
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs font-medium" style={{ color: "var(--muted)" }}>{k.label}</p>
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `color-mix(in srgb, ${k.color} 15%, transparent)` }}
                >
                  <k.icon size={16} style={{ color: k.color }} />
                </div>
              </div>
              <p className="text-xl font-bold" style={{ color: "var(--foreground)" }}>{k.value}</p>
              <p className="text-[11px] mt-1" style={{ color: "var(--muted)" }}>{k.sub}</p>
            </button>
          ))}
        </div>

        {/* Dashboards analíticos (padrão Overview, clicáveis) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Receita por mês */}
          <div
            className="relative overflow-hidden rounded-2xl p-5"
            style={{
              background: `linear-gradient(135deg, var(--card-bg) 0%, var(--background) 50%)`,
              border: "1px solid var(--card-border)",
            }}
          >
            <div
              className="absolute top-0 left-0 w-48 h-48 rounded-full blur-3xl opacity-10 pointer-events-none"
              style={{ background: `radial-gradient(circle, var(--accent), transparent)` }}
            />
            <div className="relative flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                  Receita por Mês
                </h3>
                <p className="text-xs" style={{ color: "var(--muted)" }}>
                  Em risco vs recuperada · clique na barra para ver o mês
                </p>
              </div>
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)" }}
              >
                <BarChart3 size={16} style={{ color: "var(--accent-text)" }} />
              </div>
            </div>
            <div className="h-64">
              {stats.porMes.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center gap-2" style={{ color: "var(--muted)" }}>
                  <BarChart3 size={28} className="opacity-30" />
                  <span className="text-sm">Sem dados para exibir</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.porMes} barSize={26} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="grad-risco" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.4} />
                      </linearGradient>
                      <linearGradient id="grad-recuperada" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#34d399" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#34d399" stopOpacity={0.4} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--table-border)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: "var(--muted)", fontSize: 10 }} axisLine={{ stroke: "var(--table-border)" }} tickLine={false} dy={6} />
                    <YAxis
                      tick={{ fill: "var(--muted)", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => new Intl.NumberFormat("pt-BR", { notation: "compact", compactDisplay: "short" }).format(Number(v))}
                      width={50}
                    />
                    <Tooltip
                      cursor={{ fill: "color-mix(in srgb, var(--accent) 8%, transparent)" }}
                      contentStyle={{
                        backgroundColor: "var(--card-bg)",
                        border: "1px solid var(--card-border)",
                        borderRadius: "10px",
                        color: "var(--foreground)",
                        fontSize: "12px",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                      }}
                      formatter={(value, name) => [formatBRL(Number(value)), name === "risco" ? "Em risco" : "Recuperada"]}
                    />
                    <Legend
                      formatter={(value) => <span style={{ color: "var(--muted)", fontSize: 11 }}>{value === "risco" ? "Em risco" : "Recuperada"}</span>}
                    />
                    <Bar dataKey="risco" name="risco" fill="url(#grad-risco)" radius={[6, 6, 0, 0]} cursor="pointer" isAnimationActive={false}
                      onClick={(barEntry: unknown) => {
                        const payload = (barEntry as { payload?: { month?: string } } | undefined)?.payload;
                        if (!payload?.month) return;
                        setDrill({
                          titulo: `Recuperações de ${payload.month}`,
                          subtitulo: "Pedido de churn no mês (em risco vs recuperada)",
                          itens: filteredRecoveries.filter((r) => r.data_pedido_churn === payload.month),
                        });
                      }}
                    >
                      <LabelList
                        dataKey="risco"
                        position="top"
                        formatter={(v: unknown) => new Intl.NumberFormat("pt-BR", { notation: "compact", compactDisplay: "short" }).format(Number(v))}
                        style={{ fill: "var(--muted)", fontSize: 10 }}
                      />
                    </Bar>
                    <Bar dataKey="recuperada" name="recuperada" fill="url(#grad-recuperada)" radius={[6, 6, 0, 0]} cursor="pointer" isAnimationActive={false}>
                      <LabelList
                        dataKey="recuperada"
                        position="top"
                        formatter={(v: unknown) => (Number(v) > 0 ? new Intl.NumberFormat("pt-BR", { notation: "compact", compactDisplay: "short" }).format(Number(v)) : "")}
                        style={{ fill: "var(--muted)", fontSize: 10 }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Propostas & Tipos */}
          <div
            className="relative overflow-hidden rounded-2xl p-5"
            style={{
              background: `linear-gradient(135deg, var(--card-bg) 0%, var(--background) 50%)`,
              border: "1px solid var(--card-border)",
            }}
          >
            <div
              className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl opacity-10 pointer-events-none"
              style={{ background: `radial-gradient(circle, var(--success), transparent)` }}
            />
            <div className="relative flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                  Propostas & Tipos
                </h3>
                <p className="text-xs" style={{ color: "var(--muted)" }}>
                  Status das propostas · clique na fatia para ver as propostas
                </p>
              </div>
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: "color-mix(in srgb, var(--success) 12%, transparent)" }}
              >
                <Wallet size={16} style={{ color: "var(--success)" }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 items-center">
              <div className="relative h-56">
                {stats.porStatusProposta.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center gap-2" style={{ color: "var(--muted)" }}>
                    <BarChart3 size={28} className="opacity-30" />
                    <span className="text-xs text-center px-4">Nenhuma proposta enviada nos dados filtrados</span>
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.porStatusProposta}
                          dataKey="count"
                          nameKey="status"
                          innerRadius="55%"
                          outerRadius="85%"
                          paddingAngle={3}
                          strokeWidth={0}
                          cursor="pointer"
                          isAnimationActive={false}
                          onClick={(pieEntry: unknown) => {
                            const payload = (pieEntry as { payload?: { status?: string } } | { payload?: { payload?: { status?: string } } } | undefined)?.payload;
                            const status = (payload as { status?: string })?.status
                              ?? ((payload as { payload?: { status?: string } } | undefined)?.payload as { status?: string } | undefined)?.status;
                            if (!status) return;
                            setDrill({
                              titulo: `Propostas: ${status}`,
                              subtitulo: "Registros com proposta enviada neste status",
                              itens: filteredRecoveries.filter((r) => r.proposta_enviada && r.status_proposta === status),
                            });
                          }}
                        >
                          {stats.porStatusProposta.map((entry) => (
                            <Cell key={entry.status} fill={CORES_PROPOSTA[entry.status] ?? "var(--accent)"} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "var(--card-bg)",
                            border: "1px solid var(--card-border)",
                            borderRadius: "10px",
                            color: "var(--foreground)",
                            fontSize: "12px",
                          }}
                          formatter={(value, name) => [`${Number(value)} proposta(s)`, String(name)]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Total no centro da rosca */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
                        {stats.porStatusProposta.reduce((s, p) => s + p.count, 0)}
                      </span>
                      <span className="text-[10px]" style={{ color: "var(--muted)" }}>propostas</span>
                    </div>
                  </>
                )}
              </div>
              {/* Legenda com valores (padrão "Distribuição por Status" da Overview, clicável) */}
              <div className="space-y-2 self-center">
                {stats.porStatusProposta.length === 0 ? (
                  <p className="text-xs text-center" style={{ color: "var(--muted)" }}>-</p>
                ) : (() => {
                  const totalPropostas = stats.porStatusProposta.reduce((s, p) => s + p.count, 0);
                  return stats.porStatusProposta.map((p) => (
                    <button
                      key={p.status}
                      onClick={() => setDrill({
                        titulo: `Propostas: ${p.status}`,
                        subtitulo: "Registros com proposta enviada neste status",
                        itens: filteredRecoveries.filter((r) => r.proposta_enviada && r.status_proposta === p.status),
                      })}
                      className="w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left transition-opacity hover:opacity-85 cursor-pointer"
                      style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span
                          className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: CORES_PROPOSTA[p.status] ?? "var(--accent)" }}
                        />
                        <span className="text-xs truncate" style={{ color: "var(--foreground)" }}>{p.status}</span>
                      </span>
                      <span className="text-xs font-semibold flex-shrink-0" style={{ color: "var(--foreground)" }}>
                        {p.count} <span style={{ color: "var(--muted)" }}>({formatPct(totalPropostas > 0 ? p.count / totalPropostas : 0)})</span>
                      </span>
                    </button>
                  ));
                })()}
              </div>
              <div className="flex flex-col gap-2">
                {stats.porTipo.map((t) => (
                  <button
                    key={t.tipo}
                    onClick={() => setDrill({
                      titulo: `Tipo: ${t.tipo}`,
                      subtitulo: "Registros deste tipo de recupera",
                      itens: filteredRecoveries.filter((r) => r.tipo_recupera === t.tipo),
                    })}
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-left transition-opacity hover:opacity-90 cursor-pointer"
                    style={{
                      background:
                        t.tipo === "Preditivo"
                          ? "linear-gradient(90deg, color-mix(in srgb, var(--warning) 12%, transparent), transparent)"
                          : "linear-gradient(90deg, color-mix(in srgb, var(--danger) 12%, transparent), transparent)",
                      border: `1px solid color-mix(in srgb, ${t.tipo === "Preditivo" ? "var(--warning)" : "var(--danger)"} 25%, transparent)`,
                    }}
                  >
                    <span className="text-xs" style={{ color: "var(--muted)" }}>{t.tipo}</span>
                    <span className="text-sm font-bold" style={{ color: t.tipo === "Preditivo" ? "var(--warning)" : "var(--danger)" }}>
                      {t.count} · {formatBRL(t.valor)}
                    </span>
                  </button>
                ))}
                <button
                  onClick={() => setDrill({
                    titulo: "Sem proposta enviada",
                    subtitulo: "Registros que ainda não tiveram proposta enviada",
                    itens: filteredRecoveries.filter((r) => !r.proposta_enviada),
                  })}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-left transition-opacity hover:opacity-90 cursor-pointer"
                  style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}
                >
                  <span className="text-xs" style={{ color: "var(--muted)" }}>Sem proposta enviada</span>
                  <span className="text-sm font-bold" style={{ color: "var(--foreground)" }}>{stats.semProposta}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Recupera por Responsável (padrão Overview — clicável filtra a tabela) */}
        <div
          className="relative overflow-hidden rounded-2xl p-5"
          style={{
            background: `linear-gradient(135deg, var(--card-bg) 0%, var(--background) 50%)`,
            border: "1px solid var(--card-border)",
          }}
        >
          <div className="relative flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                Recupera por Responsável
              </h3>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                Clique para filtrar a tabela pelo responsável
              </p>
            </div>
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)" }}
            >
              <User size={16} style={{ color: "var(--accent-text)" }} />
            </div>
          </div>
          {stats.porResponsavel.length === 0 ? (
            <p className="text-sm py-4 text-center" style={{ color: "var(--muted)" }}>Sem dados para exibir</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {stats.porResponsavel.map((p) => {
                const ativo = filterResponsavel === p.responsavel;
                const taxa = p.risco > 0 ? p.recuperada / p.risco : 0;
                return (
                  <button
                    key={p.responsavel}
                    onClick={() => setFilterResponsavel(ativo ? "" : p.responsavel)}
                    className="rounded-xl px-4 py-3 text-left transition-all cursor-pointer"
                    style={{
                      background: ativo
                        ? `linear-gradient(135deg, var(--accent-gradient-from), var(--accent-gradient-to))`
                        : "var(--input-bg)",
                      border: `1px solid ${ativo ? "transparent" : "var(--input-border)"}`,
                      color: ativo ? "#ffffff" : "var(--foreground)",
                    }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-semibold truncate">{p.responsavel}</span>
                      <span className="text-xs" style={{ color: ativo ? "rgba(255,255,255,0.8)" : "var(--muted)" }}>
                        {p.count} registro(s)
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span style={{ color: ativo ? "rgba(255,255,255,0.75)" : "var(--muted)" }}>
                        Risco {formatBRL(p.risco)}
                      </span>
                      <span style={{ color: ativo ? "#ffffff" : "var(--success)" }}>
                        Recuperada {formatBRL(p.recuperada)} ({formatPct(taxa)})
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Divider + Table Section (padrão Overview) */}
        <div className="border-t my-2 mb-2" style={{ borderColor: "var(--table-border)" }} />

        {/* Actions Bar (padrão Overview) */}
        <div className="flex flex-wrap items-center gap-2 mb-4 justify-end">
          <div className="relative flex-1 min-w-[220px] max-w-md mr-auto">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted)" }} />
            <input
              type="text"
              placeholder="Buscar por cliente ou responsável..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none transition-colors"
              style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--foreground)" }}
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg px-3 py-2 text-xs focus:outline-none cursor-pointer"
            style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--foreground)" }}
          >
            <option value="">Todos Status</option>
            {STATUS_RECUPERA.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
            className="rounded-lg px-3 py-2 text-xs focus:outline-none cursor-pointer"
            style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--foreground)" }}
          >
            <option value="">Todos Tipos</option>
            {TIPO_RECUPERA.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>

          <select
            value={filterResponsavel}
            onChange={(e) => setFilterResponsavel(e.target.value)}
            className="rounded-lg px-3 py-2 text-xs focus:outline-none cursor-pointer"
            style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--foreground)" }}
          >
            <option value="">Todos Responsáveis</option>
            {[...new Set(scopedRecoveries.map((r) => r.responsavel).filter(Boolean))].sort().map((nome) => (
              <option key={nome} value={nome}>{nome}</option>
            ))}
          </select>

          <span className="text-xs" style={{ color: "var(--muted)" }}>
            {filteredRecoveries.length} registros
          </span>

          <div className="relative">
            <button
              onClick={() => setShowColumnPicker(!showColumnPicker)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg transition-colors cursor-pointer"
              style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", color: "var(--foreground)" }}
            >
              <Columns3 size={14} />
              Personalizar Colunas
            </button>
            {showColumnPicker && (
              <div className="absolute right-0 top-full mt-1 rounded-lg p-3 z-50 min-w-[220px] shadow-xl" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
                <p className="text-xs font-semibold mb-2" style={{ color: "var(--foreground)" }}>Colunas visíveis</p>
                {Object.entries(columnLabels).map(([key, label]) => (
                  <label
                    key={key}
                    className="flex items-center gap-2 py-1 cursor-pointer text-xs"
                    style={{ color: "var(--muted)" }}
                  >
                    <input
                      type="checkbox"
                      checked={visibleColumns[key]}
                      onChange={(e) => setVisibleColumns((prev) => ({ ...prev, [key]: e.target.checked }))}
                      className="rounded"
                      style={{ accentColor: "var(--accent)" }}
                    />
                    {label}
                  </label>
                ))}
              </div>
            )}
          </div>

          {!readOnly && (
            <button
              onClick={() => { resetForm(); setEditingId(null); setError(""); setShowCreateModal(true); }}
              className="flex items-center gap-1.5 px-4 py-2 text-xs rounded-lg transition-all font-medium cursor-pointer hover:opacity-90 hover:shadow-lg"
              style={{
                color: "#ffffff",
                background: `linear-gradient(135deg, var(--accent-gradient-from), var(--accent-gradient-to))`,
                boxShadow: `0 4px 12px color-mix(in srgb, var(--accent) 25%, transparent)`,
              }}
            >
              <Plus size={14} />
              Nova Recuperação
            </button>
          )}
        </div>

        {/* Table (padrão Overview) */}
        <div
          className="relative overflow-hidden rounded-2xl"
          style={{
            background: `linear-gradient(135deg, var(--card-bg) 0%, var(--background) 40%)`,
            border: "1px solid var(--card-border)",
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--table-border)" }}>
                  {Object.entries(columnLabels)
                    .filter(([key]) => visibleColumns[key])
                    .map(([key, label]) => (
                      <th
                        key={key}
                        className={`px-4 py-3 text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors select-none ${key === "receita_em_risco" || key === "receita_recuperada" ? "text-right" : "text-left"}`}
                        style={{ color: "var(--muted)" }}
                        onClick={() => handleSort(key)}
                      >
                        <div className={`flex items-center gap-1 ${key === "receita_em_risco" || key === "receita_recuperada" ? "justify-end" : ""}`}>
                          {label}
                          {sortColumn === key ? (
                            sortDirection === "asc" ? <ArrowUp size={12} style={{ color: "var(--accent-text)" }} /> : <ArrowDown size={12} style={{ color: "var(--accent-text)" }} />
                          ) : (
                            <ArrowUpDown size={12} style={{ color: "var(--muted)", opacity: 0.25 }} />
                          )}
                        </div>
                      </th>
                    ))}
                  <th className="w-10 px-2 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {sortedRecoveries.map((recovery) => {
                  const statusColor = getStatusColor(recovery.status_recupera);
                  const tipoColor = getTipoColor(recovery.tipo_recupera);
                  const celula = (key: string) => {
                    switch (key) {
                      case "responsavel":
                        return <span style={{ color: "var(--foreground)" }}>{recovery.responsavel}</span>;
                      case "cliente":
                        return <span className="font-medium" style={{ color: "var(--foreground)" }}>{recovery.cliente}</span>;
                      case "receita_em_risco":
                        return <span className="font-medium" style={{ color: "var(--foreground)" }}>{formatBRL(recovery.receita_em_risco)}</span>;
                      case "receita_recuperada":
                        return <span style={{ color: recovery.receita_recuperada ? "var(--success)" : "var(--muted)" }}>{formatBRL(recovery.receita_recuperada)}</span>;
                      case "tipo_recupera":
                        return (
                          <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap" style={{ background: tipoColor.bg, color: tipoColor.text }}>
                            {recovery.tipo_recupera}
                          </span>
                        );
                      case "data_pedido_churn":
                        return <span className="whitespace-nowrap" style={{ color: "var(--foreground)" }}>{recovery.data_pedido_churn || "-"}</span>;
                      case "status_recupera":
                        return (
                          <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap" style={{ background: statusColor.bg, color: statusColor.text }}>
                            {recovery.status_recupera}
                          </span>
                        );
                      case "ja_na_projecao":
                        return <span style={{ color: recovery.ja_na_projecao ? "var(--success)" : "var(--danger)" }}>{recovery.ja_na_projecao ? "Sim" : "Não"}</span>;
                      case "data_prevista_churn":
                        return <span className="whitespace-nowrap" style={{ color: "var(--foreground)" }}>{recovery.data_prevista_churn || "-"}</span>;
                      case "proposta_enviada":
                        return <span style={{ color: recovery.proposta_enviada ? "var(--success)" : "var(--muted)" }}>{recovery.proposta_enviada ? "Sim" : "Não"}</span>;
                      case "proposta_com_reducao":
                        return <span style={{ color: recovery.proposta_com_reducao ? "var(--warning)" : "var(--muted)" }}>{recovery.proposta_com_reducao ? "Sim" : "Não"}</span>;
                      case "status_proposta":
                        return <span className="whitespace-nowrap" style={{ color: "var(--foreground)" }}>{recovery.status_proposta || "-"}</span>;
                      default:
                        return null;
                    }
                  };
                  return (
                    <tr
                      key={recovery.id}
                      style={{ borderBottom: "1px solid var(--table-border)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--table-row-hover)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      {Object.entries(columnLabels)
                        .filter(([key]) => visibleColumns[key])
                        .map(([key]) => (
                          <td key={key} className={`px-4 py-3 ${key === "receita_em_risco" || key === "receita_recuperada" ? "text-right" : ""}`}>
                            {celula(key)}
                          </td>
                        ))}
                      <td className="px-2 py-3">
                        {!readOnly && (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => openEditModal(recovery)}
                              className="p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-[var(--input-bg)]"
                              style={{ color: "var(--accent)" }}
                              title="Editar"
                            >
                              <MoreHorizontal size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(recovery.id)}
                              className="p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-[var(--input-bg)]"
                              style={{ color: "var(--danger)" }}
                              title="Excluir"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {sortedRecoveries.length === 0 && (
                  <tr>
                    <td colSpan={Object.values(visibleColumns).filter(Boolean).length + 1} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "var(--input-bg)" }}>
                          <Inbox size={20} style={{ color: "var(--muted)" }} />
                        </div>
                        <p className="text-sm" style={{ color: "var(--muted)" }}>Nenhuma recuperação encontrada</p>
                        <p className="text-xs" style={{ color: "var(--muted)" }}>
                          {temFiltro ? "Tente ajustar os filtros" : "Crie a primeira recuperação com o botão acima"}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal de drill-down analítico (padrão Overview) */}
        {drill && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="rounded-xl w-full max-w-3xl max-h-[85vh] overflow-y-auto" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
              <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--table-border)" }}>
                <div>
                  <h2 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>{drill.titulo}</h2>
                  <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                    {drill.subtitulo} · {drill.itens.length} registro(s) · {formatBRL(drill.itens.reduce((s, r) => s + (r.receita_em_risco || 0), 0))} em risco
                  </p>
                </div>
                <button
                  onClick={() => setDrill(null)}
                  className="transition-colors cursor-pointer"
                  style={{ color: "var(--muted)" }}
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-4">
                {drill.itens.length === 0 ? (
                  <p className="text-sm py-8 text-center" style={{ color: "var(--muted)" }}>Nenhum registro neste recorte</p>
                ) : (
                  <div className="space-y-2">
                    {drill.itens.map((r) => {
                      const statusColor = getStatusColor(r.status_recupera);
                      const tipoColor = getTipoColor(r.tipo_recupera);
                      return (
                        <div
                          key={r.id}
                          className="flex items-center gap-3 rounded-lg px-4 py-3"
                          style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>{r.cliente}</p>
                            <p className="text-xs" style={{ color: "var(--muted)" }}>
                              {r.responsavel} · {r.data_pedido_churn || "sem mês"} · {r.proposta_enviada ? `Proposta: ${r.status_proposta || "enviada"}` : "sem proposta"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium" style={{ background: tipoColor.bg, color: tipoColor.text }}>
                              {r.tipo_recupera}
                            </span>
                            <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap" style={{ background: statusColor.bg, color: statusColor.text }}>
                              {r.status_recupera}
                            </span>
                            <span className="text-sm font-bold text-right" style={{ color: "var(--foreground)" }}>
                              {formatBRL(r.receita_em_risco)}
                              {r.receita_recuperada ? <span style={{ color: "var(--success)" }}> → {formatBRL(r.receita_recuperada)}</span> : null}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Create/Edit Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div
              className="rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
            >
              <div className="flex items-center justify-between p-6" style={{ borderBottom: "1px solid var(--table-border)" }}>
                <h2 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
                  {editingId ? "Editar Recuperação" : "Nova Recuperação"}
                </h2>
                <button
                  onClick={() => { setShowCreateModal(false); resetForm(); setEditingId(null); }}
                  className="p-2 rounded-lg cursor-pointer hover:bg-[var(--input-bg)]"
                  style={{ color: "var(--muted)" }}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>Responsável</label>
                    <select
                      value={formData.responsavel}
                      onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
                      required
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--foreground)" }}
                    >
                      <option value="">Selecione...</option>
                      {users.map(u => (
                        <option key={u.email} value={u.name}>{u.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>Cliente</label>
                    <input
                      type="text"
                      value={formData.cliente}
                      onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
                      required
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--foreground)" }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>Receita em Risco (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.receita_em_risco}
                      onChange={(e) => setFormData({ ...formData, receita_em_risco: parseFloat(e.target.value) || 0 })}
                      required
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--foreground)" }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>Receita Recuperada (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.receita_recuperada || ""}
                      onChange={(e) => setFormData({ ...formData, receita_recuperada: e.target.value ? parseFloat(e.target.value) : null })}
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--foreground)" }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>Tipo Recupera</label>
                    <select
                      value={formData.tipo_recupera}
                      onChange={(e) => setFormData({ ...formData, tipo_recupera: e.target.value as "Preditivo" | "Churn" })}
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--foreground)" }}
                    >
                      {TIPO_RECUPERA.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>Data Pedido Churn</label>
                    <select
                      value={formData.data_pedido_churn || ""}
                      onChange={(e) => setFormData({ ...formData, data_pedido_churn: e.target.value || null })}
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--foreground)" }}
                    >
                      <option value="">-</option>
                      {meses.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>Status Recupera</label>
                    <select
                      value={formData.status_recupera}
                      onChange={(e) => setFormData({ ...formData, status_recupera: e.target.value as "Em andamento" | "Recuperado" | "Perdido" })}
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--foreground)" }}
                    >
                      {STATUS_RECUPERA.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>Já na Projeção RankMyApp</label>
                    <select
                      value={formData.ja_na_projecao ? "sim" : "nao"}
                      onChange={(e) => setFormData({ ...formData, ja_na_projecao: e.target.value === "sim" })}
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--foreground)" }}
                    >
                      <option value="nao">Não</option>
                      <option value="sim">Sim</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>Data Prevista de Churn</label>
                    <select
                      value={formData.data_prevista_churn || ""}
                      onChange={(e) => setFormData({ ...formData, data_prevista_churn: e.target.value || null })}
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--foreground)" }}
                    >
                      <option value="">-</option>
                      {meses.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>Proposta de Recuperação Enviada</label>
                    <select
                      value={formData.proposta_enviada ? "sim" : "nao"}
                      onChange={(e) => setFormData({ ...formData, proposta_enviada: e.target.value === "sim" })}
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--foreground)" }}
                    >
                      <option value="nao">Não</option>
                      <option value="sim">Sim</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>Proposta com Redução de Receita</label>
                    <select
                      value={formData.proposta_com_reducao ? "sim" : "nao"}
                      onChange={(e) => setFormData({ ...formData, proposta_com_reducao: e.target.value === "sim" })}
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--foreground)" }}
                    >
                      <option value="nao">Não</option>
                      <option value="sim">Sim</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>Status Proposta</label>
                    <select
                      value={formData.status_proposta || ""}
                      onChange={(e) => setFormData({ ...formData, status_proposta: e.target.value || null })}
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--foreground)" }}
                    >
                      <option value="">-</option>
                      {statusPropostaOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4" style={{ borderTop: "1px solid var(--table-border)" }}>
                  <button
                    type="button"
                    onClick={() => { setShowCreateModal(false); resetForm(); setEditingId(null); }}
                    className="px-4 py-2 text-sm rounded-lg cursor-pointer"
                    style={{ background: "var(--input-bg)", color: "var(--foreground)" }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm text-white rounded-lg cursor-pointer"
                    style={{ background: "linear-gradient(135deg, var(--accent-gradient-from), var(--accent-gradient-to))" }}
                  >
                    {editingId ? "Salvar Alterações" : "Criar Recuperação"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
