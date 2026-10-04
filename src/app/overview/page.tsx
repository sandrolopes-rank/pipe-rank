"use client";
// v3 - 2026-09-30: complete visual refactor with gradients + data layer fix + month inputs

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useTheme } from "@/lib/theme/ThemeContext";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  Cell,
} from "recharts";
import {
  TrendingUp,
  DollarSign,
  Target,
  BarChart3,
  Search,
  Download,
  Plus,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  Columns3,
  X,
  Save,
  Trash2,
  Info,
  Flame,
  Thermometer,
  Snowflake,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  Clock,
  Menu,
  Inbox,
} from "lucide-react";

interface Opportunity {
  id: string;
  owner_email: string;
  responsavel: string;
  cliente: string;
  produto: string;
  receita_atual: number;
  receita_negociacao: number;
  upsell: number;
  calor: string;
  mes_atuacao: string;
  status: string;
  proposta_em: string;
  data_fechamento: string;
  observacoes_1: string;
  observacoes_2: string;
  created_at: string;
  updated_at: string;
}

const statusOptions = [
  "Fechado",
  "Perdido",
  "Negociação",
  "Envio de Proposta",
  "Em Assinatura",
  "FUP",
  "Aprovação do Contrato",
  "Confecção do Contrato",
  "Proposta Perdida",
  "Assinado",
];

const calorOptions = ["Quente", "Morno", "Frio"];

const statusColors: Record<string, string> = {
  Fechado: "bg-emerald-500/20 text-emerald-400",
  Perdido: "bg-red-500/20 text-red-400",
  Negociação: "bg-amber-500/20 text-amber-400",
  "Envio de Proposta": "bg-sky-500/20 text-sky-400",
  "Em Assinatura": "bg-violet-500/20 text-violet-400",
  FUP: "bg-pink-500/20 text-pink-400",
  "Aprovação do Contrato": "bg-teal-500/20 text-teal-400",
  "Confecção do Contrato": "bg-orange-500/20 text-orange-400",
  "Proposta Perdida": "bg-red-500/20 text-red-400",
  Assinado: "bg-emerald-500/20 text-emerald-400",
};

const statusColorsDashboard: Record<string, string> = {
  Fechado: "bg-emerald-500/15 text-emerald-400",
  Perdido: "bg-red-500/15 text-red-400",
  Negociação: "bg-amber-500/15 text-amber-400",
  "Envio de Proposta": "bg-sky-500/15 text-sky-400",
  "Em Assinatura": "bg-violet-500/15 text-violet-400",
  FUP: "bg-pink-500/15 text-pink-400",
  "Aprovação do Contrato": "bg-teal-500/15 text-teal-400",
  "Confecção do Contrato": "bg-orange-500/15 text-orange-400",
};

const calorColors: Record<string, string> = {
  Quente: "text-red-400",
  Morno: "text-amber-400",
  Frio: "text-blue-400",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

const emptyOpportunity: Omit<Opportunity, "id" | "created_at" | "updated_at"> = {
  owner_email: "",
  responsavel: "",
  cliente: "",
  produto: "",
  receita_atual: 0,
  receita_negociacao: 0,
  upsell: 0,
  calor: "Morno",
  mes_atuacao: "",
  status: "Negociação",
  proposta_em: "",
  data_fechamento: "",
  observacoes_1: "",
  observacoes_2: "",
};

export default function OverviewPage() {
  const { mode } = useTheme();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState<"bar" | "line">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("rank-crm-chart-type") as "bar" | "line") || "bar";
    }
    return "bar";
  });

  function handleChartTypeChange(type: "bar" | "line") {
    setChartType(type);
    localStorage.setItem("rank-crm-chart-type", type);
  }

  // Table state
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<{ id: string; email: string }[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null);
  const [formData, setFormData] = useState(emptyOpportunity);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    responsavel: true,
    cliente: true,
    produto: true,
    receita_atual: true,
    receita_negociacao: true,
    upsell: true,
    calor: true,
    mes_atuacao: true,
    status: true,
    proposta_em: true,
    data_fechamento: true,
    observacoes_1: false,
    observacoes_2: false,
  });
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [showProdutoDropdown, setShowProdutoDropdown] = useState(false);
  const [showPropostasModal, setShowPropostasModal] = useState(false);

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterCalor, setFilterCalor] = useState<string>("");
  const [filterResponsavel, setFilterResponsavel] = useState<string>("");

  const ADMIN_EMAIL = "sandro.lopes@rankmyapp.com.br";

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
        setCurrentUser({ id: user.id, email: user.email });
        setIsAdmin(user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase());

        // Fetch all available users for admin assignment dropdown
        if (user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
          try {
            const res = await fetch("/api/users");
            const data = await res.json();
            if (res.ok && data.users) {
              setAvailableUsers(data.users.map((u: { id: string; email: string }) => ({ id: u.id, email: u.email })));
            } else {
              // Fallback to current user only
              setAvailableUsers([{ id: user.id, email: user.email }]);
            }
          } catch {
            setAvailableUsers([{ id: user.id, email: user.email }]);
          }
        } else {
          // Non-admin users can only assign to themselves
          setAvailableUsers([{ id: user.id, email: user.email }]);
        }
      }

      const { data } = await supabase
        .from("oportunidades")
        .select("*")
        .order("created_at", { ascending: false });

      if (data) {
        // Filter by owner_email: admin sees all, others see only their own
        const filtered = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
          ? data
          : data.filter((o) => o.owner_email?.toLowerCase() === user?.email?.toLowerCase());
        setOpportunities(filtered as Opportunity[]);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("oportunidades-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "oportunidades" },
        async () => {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          const { data } = await supabase
            .from("oportunidades")
            .select("*")
            .order("created_at", { ascending: false });
          if (data && user) {
            const filtered =
              user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
                ? data
                : data.filter((o) => o.owner_email?.toLowerCase() === user.email?.toLowerCase());
            setOpportunities(filtered as Opportunity[]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filter out closed/lost statuses for dashboard metrics (Upsell, Propostas, Mapa de Calor)
  const activeOpportunities = opportunities.filter(
    (o) =>
      o.status !== "Proposta Perdida" &&
      o.status !== "Assinado" &&
      o.status !== "Fechado" &&
      o.status !== "Perdido"
  );

  // KPIs - Upsell vs Cross Sell (Upsell = MI, RI, Features; Cross Sell = rest)
  const isUpsellProduct = (produto?: string) => {
    if (!produto) return false;
    const items = produto.split(", ").map(p => p.trim().toLowerCase());
    return items.some(p => p === "mi" || p === "ri" || p === "features");
  };

  const upsellNegociado = activeOpportunities
    .filter(o => isUpsellProduct(o.produto))
    .reduce((s, o) => s + (o.upsell || 0), 0);

  const crossSellNegociado = activeOpportunities
    .filter(o => !isUpsellProduct(o.produto))
    .reduce((s, o) => s + (o.upsell || 0), 0);

  // Volume de Propostas em andamento
  const volumePropostas = activeOpportunities.length;

  // Top 3 products by upsell (for Propostas card)
  const topProdutos = (() => {
    const grouped: Record<string, number> = {};
    activeOpportunities.forEach(o => {
      if (o.produto && o.upsell) {
        const items = o.produto.split(", ").map(p => p.trim());
        items.forEach(item => {
          if (item) {
            grouped[item] = (grouped[item] || 0) + (o.upsell / items.length);
          }
        });
      }
    });
    return Object.entries(grouped)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([produto, value]) => ({ produto, value }));
  })();

  // All products for modal
  const allProdutos = (() => {
    const grouped: Record<string, number> = {};
    activeOpportunities.forEach(o => {
      if (o.produto && o.upsell) {
        const items = o.produto.split(", ").map(p => p.trim());
        items.forEach(item => {
          if (item) {
            grouped[item] = (grouped[item] || 0) + (o.upsell / items.length);
          }
        });
      }
    });
    return Object.entries(grouped)
      .sort(([, a], [, b]) => b - a)
      .map(([produto, value]) => ({ produto, value }));
  })();

  // Mapa de Calor - soma de upsell por temperatura
  const calorQuente = activeOpportunities
    .filter((o) => o.calor === "Quente")
    .reduce((s, o) => s + (o.upsell || 0), 0);
  const calorMorno = activeOpportunities
    .filter((o) => o.calor === "Morno")
    .reduce((s, o) => s + (o.upsell || 0), 0);
  const calorFrio = activeOpportunities
    .filter((o) => o.calor === "Frio")
    .reduce((s, o) => s + (o.upsell || 0), 0);

  // Chart data - Upsell por mês (active opportunities only)
  const chartDataUpsell = (() => {
    const grouped: Record<string, { value: number; clients: string[] }> = {};
    activeOpportunities.forEach((o) => {
      if (o.data_fechamento) {
        const month = o.data_fechamento.substring(0, 7);
        if (!grouped[month]) grouped[month] = { value: 0, clients: [] };
        grouped[month].value += (o.upsell || 0);
        if (o.cliente) grouped[month].clients.push(o.cliente);
      }
    });
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month: new Date(month + "-01").toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
        value: data.value,
        clients: data.clients,
      }));
  })();

  // Chart data - Negociações Fechadas por mês (status === "Fechado" or "Assinado")
  const chartDataFechadas = (() => {
    const grouped: Record<string, { value: number; count: number; clients: string[] }> = {};
    opportunities
      .filter((o) => o.status === "Fechado" || o.status === "Assinado")
      .forEach((o) => {
        if (o.data_fechamento) {
          const month = o.data_fechamento.substring(0, 7);
          if (!grouped[month]) grouped[month] = { value: 0, count: 0, clients: [] };
          grouped[month].value += (o.receita_negociacao || 0);
          grouped[month].count += 1;
          if (o.cliente) grouped[month].clients.push(o.cliente);
        }
      });
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month: new Date(month + "-01").toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
        value: data.value,
        count: data.count,
        clients: data.clients,
      }));
  })();

  // Chart data - Negociações Perdidas por mês (status === "Perdido" or "Proposta Perdida")
  const chartDataPerdidas = (() => {
    const grouped: Record<string, { value: number; count: number; clients: string[] }> = {};
    opportunities
      .filter((o) => o.status === "Perdido" || o.status === "Proposta Perdida")
      .forEach((o) => {
        if (o.data_fechamento) {
          const month = o.data_fechamento.substring(0, 7);
          if (!grouped[month]) grouped[month] = { value: 0, count: 0, clients: [] };
          grouped[month].value += (o.upsell || 0);
          grouped[month].count += 1;
          if (o.cliente) grouped[month].clients.push(o.cliente);
        }
      });
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month: new Date(month + "-01").toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
        value: data.value,
        count: data.count,
        clients: data.clients,
      }));
  })();

  // Chart carousel state
  const [chartSlide, setChartSlide] = useState(0);
  const chartSlides = [
    { key: "upsell", label: "Upsell por Mês", data: chartDataUpsell, color: "#8b5cf6", gradientFrom: "#8b5cf680", gradientTo: "#8b5cf600", accent: "text-violet-400" },
    { key: "fechadas", label: "Negociações Fechadas", data: chartDataFechadas, color: "#10b981", gradientFrom: "#10b98180", gradientTo: "#10b98100", accent: "text-emerald-400" },
    { key: "perdidas", label: "Negociações Perdidas", data: chartDataPerdidas, color: "#f43f5e", gradientFrom: "#f43f5e80", gradientTo: "#f43f5e00", accent: "text-rose-400" },
  ];

  // Days since last update per opportunity
  function daysSinceUpdate(updatedAt?: string): number {
    if (!updatedAt) return 0;
    const now = new Date();
    const updated = new Date(updatedAt);
    return Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24));
  }

  // Previous month upsell for trend calculation
  const prevMonthUpsell = (() => {
    const now = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const key = prev.toISOString().substring(0, 7);
    return activeOpportunities
      .filter((o) => o.data_fechamento?.startsWith(key))
      .reduce((s, o) => s + (o.upsell || 0), 0);
  })();
  const upsellTrend = prevMonthUpsell > 0
    ? ((upsellNegociado - prevMonthUpsell) / prevMonthUpsell) * 100
    : 0;

  const kpis = [
    {
      label: "Upsell Negociado",
      value: formatCurrency(upsellNegociado),
      icon: BarChart3,
      color: "text-violet-400",
      bgColor: "bg-violet-500/10",
      tooltip: "Soma de todos os upsell em propostas ativas (exclui Proposta Perdida e Assinado)",
      trend: upsellTrend,
    },
    {
      label: "Propostas em Andamento",
      value: String(volumePropostas),
      icon: Target,
      color: "text-amber-400",
      bgColor: "bg-amber-500/10",
      tooltip: "Quantidade de propostas ativas no pipeline (exclui Proposta Perdida e Assinado)",
      trend: undefined,
    },
  ];

  // Table filtering & pagination
  const filteredOpportunities = useMemo(() => {
    let result = opportunities;
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(
        (o) =>
          o.cliente?.toLowerCase().includes(s) ||
          o.produto?.toLowerCase().includes(s) ||
          o.responsavel?.toLowerCase().includes(s) ||
          o.observacoes_1?.toLowerCase().includes(s)
      );
    }
    if (filterStatus) {
      result = result.filter((o) => o.status === filterStatus);
    }
    if (filterCalor) {
      result = result.filter((o) => o.calor === filterCalor);
    }
    if (filterResponsavel) {
      result = result.filter((o) => o.responsavel === filterResponsavel);
    }
    return result;
  }, [opportunities, search, filterStatus, filterCalor, filterResponsavel]);

  const totalPages = Math.max(1, Math.ceil(filteredOpportunities.length / perPage));

  // Table sorting state
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  function handleSort(column: string) {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  }

  // Sort filtered opportunities
  const sortedOpportunities = useMemo(() => {
    if (!sortColumn) return filteredOpportunities;
    return [...filteredOpportunities].sort((a, b) => {
      const aVal = a[sortColumn as keyof Opportunity];
      const bVal = b[sortColumn as keyof Opportunity];
      const dir = sortDirection === "asc" ? 1 : -1;
      if (typeof aVal === "number" && typeof bVal === "number") {
        return (aVal - bVal) * dir;
      }
      return String(aVal ?? "").localeCompare(String(bVal ?? "")) * dir;
    });
  }, [filteredOpportunities, sortColumn, sortDirection]);

  const paginatedOpportunities = sortedOpportunities.slice(
    (page - 1) * perPage,
    page * perPage
  );

  const uniqueResponsaveis = useMemo(
    () => [...new Set(opportunities.map((o) => o.responsavel).filter(Boolean))],
    [opportunities]
  );

  function openCreateModal() {
    setEditingOpportunity(null);
    setFormData({ ...emptyOpportunity, responsavel: userEmail.split("@")[0] || "" });
    setShowModal(true);
  }

  function openEditModal(opp: Opportunity) {
    setEditingOpportunity(opp);
    setFormData({
      owner_email: opp.owner_email,
      responsavel: opp.responsavel,
      cliente: opp.cliente,
      produto: opp.produto,
      receita_atual: opp.receita_atual,
      receita_negociacao: opp.receita_negociacao,
      upsell: opp.upsell,
      calor: opp.calor,
      mes_atuacao: opp.mes_atuacao,
      status: opp.status,
      proposta_em: opp.proposta_em,
      data_fechamento: opp.data_fechamento,
      observacoes_1: opp.observacoes_1,
      observacoes_2: opp.observacoes_2,
    });
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();

    // Calculate upsell automatically: receita_negociacao - receita_atual
    const calculatedUpsell = (formData.receita_negociacao || 0) - (formData.receita_atual || 0);

    // Determine owner_email: admin can assign via form field, others always use their own email
    const ownerEmail = isAdmin && formData.owner_email ? formData.owner_email : currentUser?.email || "";

    const dataToSave = { ...formData, upsell: calculatedUpsell, owner_email: ownerEmail };

    if (editingOpportunity) {
      await supabase
        .from("oportunidades")
        .update({ ...dataToSave, updated_at: new Date().toISOString() })
        .eq("id", editingOpportunity.id);
    } else {
      await supabase.from("oportunidades").insert(dataToSave);
    }

    // Reload data after save to ensure UI reflects changes
    const { data } = await supabase
      .from("oportunidades")
      .select("*")
      .order("created_at", { ascending: false });
    if (data && currentUser) {
      const filtered = currentUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
        ? data
        : data.filter((o) => o.owner_email?.toLowerCase() === currentUser.email?.toLowerCase());
      setOpportunities(filtered as Opportunity[]);
    }

    setShowModal(false);
    setSaving(false);
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    await supabase.from("oportunidades").delete().eq("id", id);
    setDeleteConfirm(null);
    setOpenMenu(null);
  }

  function handleExport() {
    const headers = [
      "Responsável",
      "Cliente",
      "Produto",
      "Receita Atual",
      "Receita Negociação",
      "Upsell",
      "Calor",
      "Mês Atuação",
      "Status",
      "Proposta em",
      "Data Fechamento",
      "Observações 1",
      "Observações 2",
    ];
    const rows = filteredOpportunities.map((o) => [
      o.responsavel,
      o.cliente,
      o.produto,
      o.receita_atual,
      o.receita_negociacao,
      o.upsell,
      o.calor,
      o.mes_atuacao,
      o.status,
      o.proposta_em,
      o.data_fechamento,
      o.observacoes_1,
      o.observacoes_2,
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `oportunidades_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const columnLabels: Record<string, string> = {
    responsavel: "Responsável",
    cliente: "Cliente",
    produto: "Produto",
    receita_atual: "R$ Atual",
    receita_negociacao: "R$ Negociado",
    upsell: "Upsell",
    calor: "Calor",
    mes_atuacao: "Mês Atuação",
    status: "Status",
    proposta_em: "Proposta em",
    data_fechamento: "Data prevista de fechamento",
    observacoes_1: "Observações 1",
    observacoes_2: "Observações 2",
  };

  return (
    <DashboardLayout userEmail={userEmail} activeCount={volumePropostas}>
      {/* ===== DASHBOARD SECTION ===== */}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {/* Card 1: Upsell + Cross Sell Negociado */}
        <div
          className="relative overflow-hidden rounded-2xl p-5 group"
          style={{
            background: `linear-gradient(135deg, var(--card-bg) 0%, var(--background) 60%)`,
            border: "1px solid var(--card-border)",
          }}
        >
          <div
            className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-20 pointer-events-none"
            style={{ background: `radial-gradient(circle, var(--accent), transparent)` }}
          />
          <div className="relative flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[#737373]">Upsell / Cross Sell Negociado</span>
              <div className="relative group/tip">
                <Info size={12} className="text-[#525252] cursor-help" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-xs text-[#a3a3a3] whitespace-nowrap opacity-0 invisible group-hover/tip:opacity-100 group-hover/tip:visible transition-all z-50 shadow-lg">
                  Upsell: MI, RI, Features | Cross Sell: demais produtos
                </div>
              </div>
            </div>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, color-mix(in srgb, var(--accent) 20%, transparent), color-mix(in srgb, var(--accent) 7%, transparent))`,
                border: `1px solid color-mix(in srgb, var(--accent) 27%, transparent)`,
              }}
            >
              <BarChart3 size={16} style={{ color: "var(--accent-text)" }} />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#a3a3a3]">Upsell</span>
              <p
                className="text-xl font-bold tracking-tight"
                style={{
                  background: "linear-gradient(90deg, #c4b5fd, #8b5cf6)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {formatCurrency(upsellNegociado)}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#a3a3a3]">Cross Sell</span>
              <p
                className="text-xl font-bold tracking-tight"
                style={{
                  background: "linear-gradient(90deg, #67e8f9, #06b6d4)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {formatCurrency(crossSellNegociado)}
              </p>
            </div>
          </div>
          {upsellTrend !== 0 && (
            <div className="flex items-center gap-1 mt-2">
              <span
                className="text-xs font-medium"
                style={{ color: upsellTrend > 0 ? "#34d399" : "#f87171" }}
              >
                {upsellTrend > 0 ? "↑" : "↓"} {Math.abs(upsellTrend).toFixed(1)}%
              </span>
              <span className="text-[10px] text-[#525252]">vs mês anterior</span>
            </div>
          )}
        </div>

        {/* Card 2: Propostas em Andamento com Top 3 Produtos */}
        <div
          className="relative overflow-hidden rounded-2xl p-5 group cursor-pointer transition-colors"
          style={{
            background: `linear-gradient(135deg, var(--card-bg) 0%, var(--background) 60%)`,
            border: "1px solid var(--card-border)",
          }}
          onClick={() => setShowPropostasModal(true)}
        >
          <div
            className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-20 pointer-events-none"
            style={{ background: `radial-gradient(circle, var(--warning), transparent)` }}
          />
          <div className="relative flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[#737373]">Propostas em Andamento</span>
              <div className="relative group/tip">
                <Info size={12} className="text-[#525252] cursor-help" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-xs text-[#a3a3a3] whitespace-nowrap opacity-0 invisible group-hover/tip:opacity-100 group-hover/tip:visible transition-all z-50 shadow-lg">
                  Top 3 produtos por upsell negociado (clique para ver todos)
                </div>
              </div>
            </div>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, color-mix(in srgb, var(--warning) 20%, transparent), color-mix(in srgb, var(--warning) 7%, transparent))`,
                border: `1px solid color-mix(in srgb, var(--warning) 27%, transparent)`,
              }}
            >
              <Target size={16} style={{ color: "var(--warning)" }} />
            </div>
          </div>
          <p
            className="text-2xl font-bold tracking-tight mb-3"
            style={{
              background: "linear-gradient(90deg, #fde68a, #f59e0b)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {volumePropostas}
          </p>
          <div className="space-y-1.5">
            {topProdutos.length > 0 ? (
              topProdutos.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="text-[#a3a3a3] truncate max-w-[120px]">{item.produto}</span>
                  <span className="text-amber-400 font-medium">{formatCurrency(item.value)}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-[#525252]">Nenhum produto ativo</p>
            )}
          </div>
        </div>
        {/* Mapa de Calor Card */}
        <div
          className="relative overflow-hidden rounded-2xl p-5 group"
          style={{
            background: `linear-gradient(135deg, var(--card-bg) 0%, var(--background) 60%)`,
            border: "1px solid var(--card-border)",
          }}
        >
          <div
            className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-20 pointer-events-none"
            style={{ background: `radial-gradient(circle, var(--accent-gradient-to), transparent)` }}
          />
          <div className="relative flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs" style={{ color: "var(--muted)" }}>Mapa de Calor</span>
              <div className="relative group/tip">
                <Info size={12} className="text-[#525252] cursor-help" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-xs text-[#a3a3a3] whitespace-nowrap opacity-0 invisible group-hover/tip:opacity-100 group-hover/tip:visible transition-all z-50 shadow-lg">
                  Soma de upsell por temperatura em propostas ativas
                </div>
              </div>
            </div>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, color-mix(in srgb, var(--accent-gradient-to) 20%, transparent), color-mix(in srgb, var(--accent-gradient-to) 7%, transparent))`,
                border: `1px solid color-mix(in srgb, var(--accent-gradient-to) 27%, transparent)`,
              }}
            >
              <Flame size={16} style={{ color: "var(--accent-text)" }} />
            </div>
          </div>
          <div className="relative space-y-2.5">
            {/* Proportion bar (item 3) */}
            {(() => {
              const total = calorQuente + calorMorno + calorFrio;
              if (total === 0) return null;
              const pcts = [
                { pct: (calorQuente / total) * 100, color: "#ef4444" },
                { pct: (calorMorno / total) * 100, color: "#f59e0b" },
                { pct: (calorFrio / total) * 100, color: "#0ea5e9" },
              ];
              return (
                <div className="flex h-1.5 rounded-full overflow-hidden mb-3 bg-[#1a1a1a]">
                  {pcts.map((p, i) =>
                    p.pct > 0 ? (
                      <div
                        key={i}
                        style={{ width: `${p.pct}%`, background: p.color, transition: "width 0.5s" }}
                      />
                    ) : null
                  )}
                </div>
              );
            })()}
            {[
              { icon: Flame, label: "Quente", value: calorQuente, color: "#f87171", gradFrom: "#ef444433", gradTo: "#ef444411", border: "#ef444444" },
              { icon: Thermometer, label: "Morno", value: calorMorno, color: "#fbbf24", gradFrom: "#f59e0b33", gradTo: "#f59e0b11", border: "#f59e0b44" },
              { icon: Snowflake, label: "Frio", value: calorFrio, color: "#38bdf8", gradFrom: "#0ea5e933", gradTo: "#0ea5e911", border: "#0ea5e944" },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between rounded-lg px-3 py-2"
                style={{
                  background: `linear-gradient(90deg, ${row.gradFrom}, ${row.gradTo})`,
                  border: `1px solid ${row.border}`,
                }}
              >
                <div className="flex items-center gap-2">
                  <row.icon size={12} style={{ color: row.color }} />
                  <span className="text-xs text-[#a3a3a3]">{row.label}</span>
                </div>
                <span className="text-sm font-bold" style={{ color: row.color }}>
                  {formatCurrency(row.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div
        className="relative overflow-hidden rounded-2xl p-5 mb-6"
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
            <h3 className="text-sm font-semibold text-white">
              {chartSlides[chartSlide].label}
            </h3>
            <p className="text-xs text-[#737373]">Evolução mensal do pipeline</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Carousel navigation dots */}
            <div className="flex items-center gap-1.5">
              {chartSlides.map((slide, idx) => (
                <button
                  key={slide.key}
                  onClick={() => setChartSlide(idx)}
                  className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                    idx === chartSlide ? "w-6" : "opacity-40 hover:opacity-70"
                  }`}
                  style={{ background: idx === chartSlide ? slide.color : "#525252" }}
                  title={slide.label}
                />
              ))}
            </div>
            {/* Chart type toggle */}
            <div className="flex bg-[#1a1a1a] rounded-lg p-0.5 border border-[#2a2a2a]">
              <button
                onClick={() => handleChartTypeChange("bar")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors cursor-pointer ${
                  chartType === "bar"
                    ? "bg-[#2a2a2a] text-white shadow-sm"
                    : "text-[#737373] hover:text-white"
                }`}
                title="Gráfico de barras"
              >
                <BarChart3 size={13} />
                Barras
              </button>
              <button
                onClick={() => handleChartTypeChange("line")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors cursor-pointer ${
                  chartType === "line"
                    ? "bg-[#2a2a2a] text-white shadow-sm"
                    : "text-[#737373] hover:text-white"
                }`}
                title="Gráfico de linhas"
              >
                <TrendingUp size={13} />
                Linhas
              </button>
            </div>
            {/* Prev/Next arrows */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setChartSlide((prev) => (prev - 1 + chartSlides.length) % chartSlides.length)}
                className="w-7 h-7 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-[#737373] hover:text-white hover:border-[#3a3a3a] transition-colors cursor-pointer"
                title="Anterior"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setChartSlide((prev) => (prev + 1) % chartSlides.length)}
                className="w-7 h-7 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-[#737373] hover:text-white hover:border-[#3a3a3a] transition-colors cursor-pointer"
                title="Próximo"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
        <div className="h-80">
          {(() => {
            const currentSlide = chartSlides[chartSlide];
            const data = currentSlide.data;
            if (data.length === 0) {
              return (
                <div className="h-full flex flex-col items-center justify-center text-[#525252] gap-2">
                  <BarChart3 size={32} className="opacity-30" />
                  <span className="text-sm">{loading ? "Carregando dados..." : "Sem dados para exibir"}</span>
                </div>
              );
            }
            return (
              <ResponsiveContainer width="100%" height="100%">
                {chartType === "bar" ? (
                  <BarChart data={data} barSize={36} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                    <defs>
                      <linearGradient id={`gradient-${currentSlide.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={currentSlide.color} stopOpacity={0.9} />
                        <stop offset="100%" stopColor={currentSlide.color} stopOpacity={0.4} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--table-border)" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: "var(--muted)", fontSize: 11 }}
                      axisLine={{ stroke: "var(--table-border)" }}
                      tickLine={false}
                      dy={8}
                    />
                    <YAxis
                      tick={{ fill: "var(--muted)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) =>
                        new Intl.NumberFormat("pt-BR", { notation: "compact", compactDisplay: "short" }).format(v)
                      }
                      width={50}
                    />
                    <Tooltip
                      cursor={{ fill: `${currentSlide.color}15`, stroke: `${currentSlide.color}40`, strokeWidth: 1 }}
                      contentStyle={{
                        backgroundColor: "#0f0f0f",
                        border: `1px solid ${currentSlide.color}60`,
                        borderRadius: "10px",
                        color: "#fff",
                        fontSize: "12px",
                        boxShadow: `0 8px 24px rgba(0,0,0,0.6), 0 0 0 1px ${currentSlide.color}20`,
                        backdropFilter: "blur(8px)",
                      }}
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const item = payload[0].payload as any;
                        return (
                          <div style={{ padding: "10px 14px", minWidth: "180px" }}>
                            <p style={{ color: "#e5e5e5", marginBottom: 6, fontSize: 12, fontWeight: 600, textTransform: "capitalize" }}>{label}</p>
                            <p style={{ color: currentSlide.color, fontWeight: 700, marginBottom: 8, fontSize: 14, textShadow: `0 0 8px ${currentSlide.color}50` }}>
                              {formatCurrency(Number(item.value))}
                            </p>
                            {item.count !== undefined && (
                              <p style={{ color: "#a3a3a3", fontSize: 11, marginBottom: 4 }}>{item.count} negociação(ões)</p>
                            )}
                            {item.clients?.length > 0 && (
                              <div style={{ borderTop: `1px solid ${currentSlide.color}30`, paddingTop: 8 }}>
                                <p style={{ color: currentSlide.color, fontSize: 10, marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Clientes ({item.clients.length})</p>
                                {item.clients.slice(0, 5).map((c: string, i: number) => (
                                  <p key={i} style={{ color: "#d4d4d4", fontSize: 11, marginBottom: 2 }}>• {c}</p>
                                ))}
                                {item.clients.length > 5 && (
                                  <p style={{ color: "#737373", fontSize: 10, fontStyle: "italic" }}>+{item.clients.length - 5} mais</p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={44} fill={`url(#gradient-${currentSlide.key})`}>
                      <LabelList
                        dataKey="value"
                        position="top"
                        style={{ fill: "#a3a3a3", fontSize: 10, fontWeight: 500 }}
                        formatter={(value: unknown) =>
                          new Intl.NumberFormat("pt-BR", { notation: "compact", compactDisplay: "short" }).format(Number(value ?? 0))
                        }
                      />
                    </Bar>
                  </BarChart>
                ) : (
                  <AreaChart data={data} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                    <defs>
                      <linearGradient id={`areaGradient-${currentSlide.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={currentSlide.color} stopOpacity={0.4} />
                        <stop offset="100%" stopColor={currentSlide.color} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--table-border)" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: "var(--muted)", fontSize: 11 }}
                      axisLine={{ stroke: "var(--table-border)" }}
                      tickLine={false}
                      dy={8}
                    />
                    <YAxis
                      tick={{ fill: "var(--muted)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) =>
                        new Intl.NumberFormat("pt-BR", { notation: "compact", compactDisplay: "short" }).format(v)
                      }
                      width={50}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f0f0f",
                        border: `1px solid ${currentSlide.color}60`,
                        borderRadius: "10px",
                        color: "#fff",
                        fontSize: "12px",
                        boxShadow: `0 8px 24px rgba(0,0,0,0.6)`,
                      }}
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const item = payload[0].payload as any;
                        return (
                          <div style={{ padding: "10px 14px", minWidth: "180px" }}>
                            <p style={{ color: "#e5e5e5", marginBottom: 6, fontSize: 12, fontWeight: 600, textTransform: "capitalize" }}>{label}</p>
                            <p style={{ color: currentSlide.color, fontWeight: 700, marginBottom: 8, fontSize: 14 }}>
                              {formatCurrency(Number(item.value))}
                            </p>
                            {item.count !== undefined && (
                              <p style={{ color: "#a3a3a3", fontSize: 11, marginBottom: 4 }}>{item.count} negociação(ões)</p>
                            )}
                            {item.clients?.length > 0 && (
                              <div style={{ borderTop: `1px solid ${currentSlide.color}30`, paddingTop: 8 }}>
                                <p style={{ color: currentSlide.color, fontSize: 10, marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Clientes ({item.clients.length})</p>
                                {item.clients.slice(0, 5).map((c: string, i: number) => (
                                  <p key={i} style={{ color: "#d4d4d4", fontSize: 11, marginBottom: 2 }}>• {c}</p>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={currentSlide.color}
                      strokeWidth={2.5}
                      fill={`url(#areaGradient-${currentSlide.key})`}
                      dot={{ r: 4, fill: currentSlide.color, strokeWidth: 2, stroke: "#141414" }}
                      activeDot={{ r: 6, strokeWidth: 2, stroke: "#141414" }}
                    >
                      <LabelList
                        dataKey="value"
                        position="top"
                        style={{ fill: "#a3a3a3", fontSize: 10, fontWeight: 500 }}
                        formatter={(value: unknown) =>
                          new Intl.NumberFormat("pt-BR", { notation: "compact", compactDisplay: "short" }).format(Number(value ?? 0))
                        }
                      />
                    </Area>
                  </AreaChart>
                )}
              </ResponsiveContainer>
            );
          })()}
        </div>
      </div>

      {/* Analytics Row - Status breakdown */}
      <div className="grid grid-cols-1 gap-4 mb-6">
        {/* Status breakdown */}
        <div
          className="relative overflow-hidden rounded-2xl p-5"
          style={{
            background: `linear-gradient(135deg, var(--card-bg) 0%, var(--background) 60%)`,
            border: "1px solid var(--card-border)",
          }}
        >
          <div
            className="absolute bottom-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10 pointer-events-none"
            style={{ background: `radial-gradient(circle, var(--success), transparent)` }}
          />
          <div className="relative flex items-center justify-between mb-4">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Distribuição por Status</h3>
              <div className="relative group/tip">
                <Info size={12} style={{ color: "var(--muted)" }} className="cursor-help" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg text-xs whitespace-nowrap opacity-0 invisible group-hover/tip:opacity-100 group-hover/tip:visible transition-all z-50 shadow-lg" style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--foreground)" }}>
                  Quantidade de propostas por estágio no pipeline completo
                </div>
              </div>
            </div>
            <span className="text-xs" style={{ color: "var(--muted)" }}>{opportunities.length} oportunidades</span>
          </div>
          <div className="relative space-y-3">
            {Object.entries(statusColorsDashboard).map(([status, classes]) => {
              const count = opportunities.filter((o) => o.status === status).length;
              const pct = opportunities.length > 0 ? Math.round((count / opportunities.length) * 100) : 0;
              const totalUpsell = opportunities
                .filter((o) => o.status === status)
                .reduce((sum, o) => sum + (o.upsell || 0), 0);

              // Gradient map for status bars
              const statusGradients: Record<string, string> = {
                "Fechado": "linear-gradient(90deg, #10b981, #34d399)",
                "Assinado": "linear-gradient(90deg, #10b981, #34d399)",
                "Perdido": "linear-gradient(90deg, #ef4444, #f87171)",
                "Proposta Perdida": "linear-gradient(90deg, #ef4444, #f87171)",
                "Negociação": "linear-gradient(90deg, #f59e0b, #fbbf24)",
                "Envio de Proposta": "linear-gradient(90deg, #0ea5e9, #38bdf8)",
                "Em Assinatura": "linear-gradient(90deg, #8b5cf6, #a78bfa)",
                "FUP": "linear-gradient(90deg, #ec4899, #f472b6)",
                "Aprovação do Contrato": "linear-gradient(90deg, #14b8a6, #2dd4bf)",
                "Confecção do Contrato": "linear-gradient(90deg, #f97316, #fb923c)",
              };

              return (
                <div key={status} className="group">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block w-2 h-2 rounded-full"
                        style={{ background: statusGradients[status] || "linear-gradient(90deg, #737373, #a3a3a3)" }}
                      />
                      <span className="text-xs text-[#a3a3a3]">{status}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-[#525252]">{formatCurrency(totalUpsell)}</span>
                      <span className="text-xs font-medium text-white min-w-[32px] text-right">
                        {count} ({pct}%)
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-[#1a1a1a] rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        background: statusGradients[status] || "linear-gradient(90deg, #737373, #a3a3a3)"
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      
      {/* ===== DIVIDER ===== */}
      <div className="border-t border-[#1e1e1e] my-2 mb-6" />

      {/* ===== OPORTUNIDADES TABLE SECTION ===== */}

      {/* Actions Bar */}
      <div className="flex items-center gap-2 mb-4 justify-end">
        <div className="relative">
          <button
            onClick={() => setShowColumnPicker(!showColumnPicker)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#a3a3a3] hover:text-white bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg transition-colors cursor-pointer"
          >
            <Columns3 size={14} />
            Personalizar Colunas
          </button>
          {showColumnPicker && (
            <div className="absolute right-0 top-full mt-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3 z-50 min-w-[220px] shadow-xl">
              <p className="text-xs font-semibold text-white mb-2">Colunas visíveis</p>
              {Object.entries(columnLabels).map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center gap-2 py-1 cursor-pointer text-xs text-[#a3a3a3] hover:text-white"
                >
                  <input
                    type="checkbox"
                    checked={visibleColumns[key]}
                    onChange={(e) =>
                      setVisibleColumns((prev) => ({ ...prev, [key]: e.target.checked }))
                    }
                    className="rounded border-[#2a2a2a] bg-[#0a0a0a] accent-blue-500"
                  />
                  {label}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Search and Actions Bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#525252]"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar oportunidades..."
            className="w-full bg-[#141414] border border-[#222222] rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-[#525252] focus:outline-none focus:border-blue-500/50 transition-colors"
          />
        </div>

        {/* Filters */}
        <select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-lg px-3 py-2 text-xs focus:outline-none cursor-pointer"
style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--foreground)" }}
        >
          <option value="">Todos os Status</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={filterCalor}
          onChange={(e) => {
            setFilterCalor(e.target.value);
            setPage(1);
          }}
          className="rounded-lg px-3 py-2 text-xs focus:outline-none cursor-pointer"
style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--foreground)" }}
        >
          <option value="">Todo Calor</option>
          {calorOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {uniqueResponsaveis.length > 1 && (
          <select
            value={filterResponsavel}
            onChange={(e) => {
              setFilterResponsavel(e.target.value);
              setPage(1);
            }}
            className="rounded-lg px-3 py-2 text-xs focus:outline-none cursor-pointer"
style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--foreground)" }}
          >
            <option value="">Todos Responsáveis</option>
            {uniqueResponsaveis.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        )}

        <div className="flex-1" />

        <span className="text-xs text-[#525252]">
          {filteredOpportunities.length} registros
        </span>

        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg transition-colors cursor-pointer"
          style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", color: "var(--foreground)" }}
        >
          <Download size={14} />
          Exportar
        </button>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-4 py-2 text-xs text-white rounded-lg transition-all font-medium cursor-pointer hover:opacity-90 hover:shadow-lg"
          style={{
            background: `linear-gradient(135deg, var(--accent-gradient-from), var(--accent-gradient-to))`,
            boxShadow: `0 4px 12px color-mix(in srgb, var(--accent) 25%, transparent)`,
          }}
        >
          <Plus size={14} />
          Nova Oportunidade
        </button>
      </div>

      {/* Table */}
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
                      className="text-left px-4 py-3 text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors select-none"
                      style={{ color: "var(--muted)" }}
                      onClick={() => handleSort(key)}
                    >
                      <div className="flex items-center gap-1">
                        {label}
                        {sortColumn === key ? (
                          sortDirection === "asc" ? (
                            <ArrowUp size={12} style={{ color: "var(--accent-text)" }} />
                          ) : (
                            <ArrowDown size={12} style={{ color: "var(--accent-text)" }} />
                          )
                        ) : (
                          <ArrowUpDown size={12} style={{ color: "var(--muted)", opacity: 0 }} className="group-hover:opacity-100" />
                        )}
                      </div>
                    </th>
                  ))}
                <th className="w-10 px-2 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={Object.values(visibleColumns).filter(Boolean).length + 1}
                    className="text-center py-12 text-[#525252]"
                  >
                    Carregando...
                  </td>
                </tr>
              ) : paginatedOpportunities.length === 0 ? (
                <tr>
                  <td
                    colSpan={Object.values(visibleColumns).filter(Boolean).length + 2}
                    className="text-center py-16"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-[#1a1a1a] flex items-center justify-center">
                        <Inbox size={20} className="text-[#525252]" />
                      </div>
                      <p className="text-sm text-[#737373]">Nenhuma oportunidade encontrada</p>
                      <p className="text-xs text-[#525252]">Tente ajustar os filtros ou criar uma nova oportunidade</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedOpportunities.map((opp) => (
                  <tr
                    key={opp.id}
                    onClick={(e) => {
                      // Don't open edit modal if clicking on the actions menu button or its dropdown
                      const target = e.target as HTMLElement;
                      if (target.closest('button') || target.closest('[data-menu]')) return;
                      openEditModal(opp);
                    }}
                    className="border-b transition-colors cursor-pointer"
                    style={{ borderColor: "var(--table-border)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--table-row-hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    {visibleColumns.responsavel && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: "var(--input-bg)", color: "var(--muted)" }}>
                            {opp.responsavel?.charAt(0).toUpperCase() || "?"}
                          </div>
                          <span className="text-xs truncate max-w-[80px]" style={{ color: "var(--muted)" }}>
                            {opp.responsavel}
                          </span>
                        </div>
                      </td>
                    )}
                    {visibleColumns.cliente && (
                      <td className="px-4 py-3 text-xs text-white font-medium">
                        {opp.cliente}
                      </td>
                    )}
                    {visibleColumns.produto && (
                      <td className="px-4 py-3 text-xs text-[#a3a3a3] max-w-[200px]">
                        <div className="truncate" title={opp.produto}>
                          {opp.produto}
                        </div>
                      </td>
                    )}
                    {visibleColumns.receita_atual && (
                      <td className="px-4 py-3 text-xs text-white whitespace-nowrap">
                        {formatCurrency(opp.receita_atual)}
                      </td>
                    )}
                    {visibleColumns.receita_negociacao && (
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        <span
                          className="font-bold"
                          style={{ color: opp.receita_negociacao >= opp.receita_atual ? "#38bdf8" : "#f43f5e" }}
                        >
                          {formatCurrency(opp.receita_negociacao)}
                        </span>
                      </td>
                    )}
                    {visibleColumns.upsell && (
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 font-bold" style={{ color: opp.upsell >= 0 ? "#4ade80" : "#f43f5e" }}>
                          {formatCurrency(opp.upsell)}
                          {opp.upsell >= 0 && <TrendingUp size={12} />}
                        </span>
                      </td>
                    )}
                    {visibleColumns.calor && (
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                          style={{
                            background: opp.calor === "Quente" ? "rgba(239,68,68,0.15)" : opp.calor === "Morno" ? "rgba(245,158,11,0.15)" : "rgba(14,165,233,0.15)",
                            color: opp.calor === "Quente" ? "#f87171" : opp.calor === "Morno" ? "#fbbf24" : "#38bdf8",
                            border: `1px solid ${opp.calor === "Quente" ? "rgba(239,68,68,0.3)" : opp.calor === "Morno" ? "rgba(245,158,11,0.3)" : "rgba(14,165,233,0.3)"}`,
                          }}
                        >
                          {opp.calor === "Quente" && <Flame size={10} />}
                          {opp.calor === "Morno" && <Thermometer size={10} />}
                          {opp.calor === "Frio" && <Snowflake size={10} />}
                          {opp.calor}
                        </span>
                      </td>
                    )}
                    {visibleColumns.mes_atuacao && (
                      <td className="px-4 py-3 text-xs text-[#a3a3a3]">
                        {opp.mes_atuacao ? (() => {
                          const [year, month] = opp.mes_atuacao.split("-");
                          const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
                          return `${months[parseInt(month) - 1]}/${year.slice(2)}`;
                        })() : ""}
                      </td>
                    )}
                    {visibleColumns.status && (
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                            statusColors[opp.status] || "bg-[#2a2a2a] text-[#a3a3a3]"
                          }`}
                        >
                          {opp.status}
                        </span>
                      </td>
                    )}
                    {visibleColumns.proposta_em && (
                      <td className="px-4 py-3 text-xs text-[#a3a3a3]">
                        {opp.proposta_em ? (() => {
                          const [year, month] = opp.proposta_em.split("-");
                          const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
                          return `${months[parseInt(month) - 1]}/${year.slice(2)}`;
                        })() : ""}
                      </td>
                    )}
                    {visibleColumns.data_fechamento && (
                      <td className="px-4 py-3 text-xs text-[#a3a3a3]">
                        {opp.data_fechamento ? (() => {
                          const [year, month] = opp.data_fechamento.split("-");
                          const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
                          return `${months[parseInt(month) - 1]}/${year.slice(2)}`;
                        })() : ""}
                      </td>
                    )}
                    {visibleColumns.observacoes_1 && (
                      <td className="px-4 py-3 text-xs text-[#737373] max-w-[200px] truncate">
                        {opp.observacoes_1}
                      </td>
                    )}
                    {visibleColumns.observacoes_2 && (
                      <td className="px-4 py-3 text-xs text-[#737373] max-w-[200px] truncate">
                        {opp.observacoes_2}
                      </td>
                    )}
                    {/* Days without update (item 4) */}
                    {(() => {
                      const days = daysSinceUpdate(opp.updated_at);
                      const isStale = days > 7;
                      return (
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-medium"
                            style={{ color: isStale ? "#f87171" : days > 3 ? "#fbbf24" : "#525252" }}
                          >
                            {isStale && <AlertTriangle size={10} />}
                            {!isStale && days > 0 && <Clock size={10} />}
                            {days === 0 ? "Hoje" : `${days}d`}
                          </span>
                        </td>
                      );
                    })()}
                    <td className="px-2 py-3">
                      <div className="relative">
                        <button
                          onClick={() =>
                            setOpenMenu(openMenu === opp.id ? null : opp.id)
                          }
                          className="p-1 transition-colors cursor-pointer"
                          style={{ color: "var(--muted)" }}
                        >
                          <MoreHorizontal size={16} />
                        </button>
                        {openMenu === opp.id && (
                          <div className="absolute right-0 top-full mt-1 rounded-lg py-1 z-50 min-w-[140px] shadow-xl" style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}>
                            <button
                              onClick={() => {
                                openEditModal(opp);
                                setOpenMenu(null);
                              }}
                              className="w-full text-left px-3 py-1.5 text-xs transition-colors cursor-pointer"
                              style={{ color: "var(--foreground)" }}
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => {
                                setDeleteConfirm(opp.id);
                                setOpenMenu(null);
                              }}
                              className="w-full text-left px-3 py-1.5 text-xs transition-colors cursor-pointer"
                              style={{ color: "var(--danger)" }}
                            >
                              Excluir
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: "1px solid var(--table-border)" }}>
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            0 de {filteredOpportunities.length} linha(s) selecionada(s).
          </span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: "var(--muted)" }}>Linhas por página</span>
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setPage(1);
                }}
                className="rounded px-2 py-1 text-xs cursor-pointer"
                style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--foreground)" }}
              >
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <span className="text-xs text-[#525252]">
              Página {page} de {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="p-1 text-[#525252] hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
              >
                <ChevronsLeft size={16} />
              </button>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1 text-[#525252] hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1 text-[#525252] hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="p-1 text-[#525252] hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
              >
                <ChevronsRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Propostas em Andamento Modal */}
      {showPropostasModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--table-border)" }}>
              <h2 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
                Produtos Negociados - Relação Completa
              </h2>
              <button
                onClick={() => setShowPropostasModal(false)}
                className="transition-colors cursor-pointer"
                style={{ color: "var(--muted)" }}
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>
                Excluindo status Fechado e Perdido • {allProdutos.length} produto(s)
              </p>
              {allProdutos.length > 0 ? (
                <div className="space-y-2">
                  {allProdutos.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-4 py-3 rounded-lg"
                      style={{ background: "var(--input-bg)", border: "1px solid var(--card-border)" }}
                    >
                      <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{item.produto}</span>
                      <span className="text-sm font-bold" style={{ color: "var(--warning)" }}>
                        {formatCurrency(item.value)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-center py-8" style={{ color: "var(--muted)" }}>
                  Nenhum produto ativo no momento
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--table-border)" }}>
              <h2 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
                {editingOpportunity ? "Editar Oportunidade" : "Nova Oportunidade"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="transition-colors cursor-pointer"
                style={{ color: "var(--muted)" }}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {/* Admin: assign owner */}
              {isAdmin && (
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>
                    Atribuir para (Admin)
                  </label>
                  <select
                    value={formData.owner_email}
                    onChange={(e) => {
                      const selectedEmail = e.target.value;
                      const name = selectedEmail ? selectedEmail.split("@")[0] : "";
                      setFormData({ ...formData, owner_email: selectedEmail, responsavel: name });
                    }}
                    className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer"
                    style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--foreground)" }}
                  >
                    <option value="">Selecione um usuário...</option>
                    {availableUsers.map((u) => {
                      const name = u.email.split("@")[0];
                      const isMe = u.email === currentUser?.email;
                      return (
                        <option key={u.id} value={u.email}>
                          {isMe ? `${name} (eu)` : name}
                        </option>
                      );
                    })}
                  </select>
                  <p className="text-[10px] mt-1" style={{ color: "var(--muted)" }}>
                    Apenas usuários com acesso ao sistema aparecem aqui
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>
                    Responsável
                  </label>
                  <input
                    type="text"
                    value={formData.responsavel}
                    onChange={(e) =>
                      setFormData({ ...formData, responsavel: e.target.value })
                    }
                    required
                    className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer"
                    style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--foreground)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>
                    Cliente
                  </label>
                  <input
                    type="text"
                    value={formData.cliente}
                    onChange={(e) =>
                      setFormData({ ...formData, cliente: e.target.value })
                    }
                    required
                    className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer"
                    style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--foreground)" }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>
                  Produto
                </label>
                <div className="relative">
                  <div
                    className="w-full rounded-lg px-3 py-2 text-sm cursor-pointer min-h-[38px] flex items-center flex-wrap gap-1"
                    style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--foreground)" }}
                    onClick={() => setShowProdutoDropdown(!showProdutoDropdown)}
                  >
                    {formData.produto ? (
                      formData.produto.split(", ").map((item, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs"
                          style={{ background: "var(--nav-active-bg)", color: "var(--accent-text)" }}
                        >
                          {item}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const items = formData.produto.split(", ").filter((_, i) => i !== idx);
                              setFormData({ ...formData, produto: items.join(", ") });
                            }}
                            className="hover:opacity-70"
                          >
                            ×
                          </button>
                        </span>
                      ))
                    ) : (
                      <span style={{ color: "var(--muted)" }}>Selecione produtos...</span>
                    )}
                  </div>
                  {showProdutoDropdown && (
                    <div className="absolute z-50 mt-1 w-full rounded-lg shadow-xl max-h-64 overflow-y-auto" style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}>
                      {["MI", "RI", "Ads Intelligence", "GEO", "RMAds", "Data Ads", "Data Rank", "Features", "Outros"].map((option) => {
                        const isSelected = formData.produto.split(", ").includes(option);
                        return (
                          <div
                            key={option}
                            className="px-3 py-2 text-sm cursor-pointer flex items-center gap-2"
                            style={{ color: "var(--foreground)" }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--table-row-hover)")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                            onClick={() => {
                              const items = formData.produto ? formData.produto.split(", ") : [];
                              if (isSelected) {
                                setFormData({ ...formData, produto: items.filter((i) => i !== option).join(", ") });
                              } else {
                                setFormData({ ...formData, produto: [...items, option].join(", ") });
                              }
                            }}
                          >
                            <div className="w-4 h-4 rounded border flex items-center justify-center" style={{ background: isSelected ? "var(--accent)" : "transparent", borderColor: isSelected ? "var(--accent)" : "var(--muted)" }}>
                              {isSelected && <span className="text-white text-xs">✓</span>}
                            </div>
                            <span style={{ color: isSelected ? "var(--foreground)" : "var(--muted)" }}>{option}</span>
                          </div>
                        );
                      })}
                      <div className="p-2" style={{ borderTop: "1px solid var(--input-border)" }}>
                        <input
                          type="text"
                          placeholder="Digitar outro..."
                          className="w-full rounded px-2 py-1.5 text-sm focus:outline-none"
                          style={{ background: "var(--background)", border: "1px solid var(--input-border)", color: "var(--foreground)" }}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && e.currentTarget.value.trim()) {
                              const items = formData.produto ? formData.produto.split(", ") : [];
                              if (!items.includes(e.currentTarget.value.trim())) {
                                setFormData({ ...formData, produto: [...items, e.currentTarget.value.trim()].join(", ") });
                              }
                              e.currentTarget.value = "";
                            }
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>
                    Receita Atual (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.receita_atual}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        receita_atual: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer"
                    style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--foreground)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>
                    Receita Negociação (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.receita_negociacao}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        receita_negociacao: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer"
                    style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--foreground)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>
                    Upsell (R$)
                  </label>
                  <div className="w-full rounded-lg px-3 py-2 text-sm font-bold" style={{ background: "color-mix(in srgb, var(--input-bg) 50%, transparent)", border: "1px solid var(--input-border)", color: (formData.receita_negociacao - formData.receita_atual) >= 0 ? "var(--accent-text)" : "var(--danger)" }}>
                    {formatCurrency(formData.receita_negociacao - formData.receita_atual)}
                  </div>
                  <p className="text-[10px] mt-1" style={{ color: "var(--muted)" }}>Calculado automaticamente: Receita Negociação − Receita Atual</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>
                    Calor
                  </label>
                  <select
                    value={formData.calor}
                    onChange={(e) =>
                      setFormData({ ...formData, calor: e.target.value })
                    }
                    className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer"
                    style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--foreground)" }}
                  >
                    {calorOptions.map((c) => (
                      <option key={c} value={c} style={{ background: "var(--card-bg)", color: "var(--foreground)" }}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                    className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer"
                    style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--foreground)" }}
                  >
                    {statusOptions.map((s) => (
                      <option key={s} value={s} style={{ background: "var(--card-bg)", color: "var(--foreground)" }}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>
                    Mês Atuação
                  </label>
                  <input
                    type="month"
                    value={formData.mes_atuacao}
                    onChange={(e) =>
                      setFormData({ ...formData, mes_atuacao: e.target.value })
                    }
                    className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer"
                    style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--foreground)", colorScheme: mode === "dark" ? "dark" : "light" }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>
                    Proposta em
                  </label>
                  <input
                    type="month"
                    value={formData.proposta_em}
                    onChange={(e) =>
                      setFormData({ ...formData, proposta_em: e.target.value })
                    }
                    className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer"
                    style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--foreground)", colorScheme: mode === "dark" ? "dark" : "light" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>
                    Previsão de Fechamento
                  </label>
                  <input
                    type="month"
                    value={formData.data_fechamento}
                    onChange={(e) =>
                      setFormData({ ...formData, data_fechamento: e.target.value })
                    }
                    className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer"
                    style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--foreground)", colorScheme: mode === "dark" ? "dark" : "light" }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>
                  Observações 1
                </label>
                <textarea
                  value={formData.observacoes_1}
                  onChange={(e) =>
                    setFormData({ ...formData, observacoes_1: e.target.value })
                  }
                  rows={2}
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none resize-none cursor-pointer"
                  style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--foreground)" }}
                  placeholder=""
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>
                  Observações 2
                </label>
                <textarea
                  value={formData.observacoes_2}
                  onChange={(e) =>
                    setFormData({ ...formData, observacoes_2: e.target.value })
                  }
                  rows={2}
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none resize-none cursor-pointer"
                  style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--foreground)" }}
                  placeholder=""
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm rounded-lg transition-colors cursor-pointer"
                  style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--foreground)" }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-lg transition-all font-medium cursor-pointer hover:opacity-90 hover:shadow-lg disabled:opacity-50"
                  style={{
                    background: `linear-gradient(135deg, var(--accent-gradient-from), var(--accent-gradient-to))`,
                    boxShadow: `0 4px 12px color-mix(in srgb, var(--accent) 25%, transparent)`,
                  }}
                >
                  <Save size={14} />
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="rounded-xl p-6 max-w-sm w-full" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
            <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--foreground)" }}>
              Confirmar exclusão
            </h3>
            <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
              Tem certeza que deseja excluir esta oportunidade? Esta ação não pode ser
              desfeita.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm rounded-lg transition-colors cursor-pointer"
                style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--foreground)" }}
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-lg transition-colors font-medium cursor-pointer"
                style={{ background: "var(--danger)" }}
              >
                <Trash2 size={14} />
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close menus */}
      {openMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setOpenMenu(null)} />
      )}
      {showColumnPicker && (
        <div className="fixed inset-0 z-40" onClick={() => setShowColumnPicker(false)} />
      )}
    </DashboardLayout>
  );
}