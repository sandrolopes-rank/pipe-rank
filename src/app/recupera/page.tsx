"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { DashboardLayout } from "@/components/dashboard-layout";
import {
  Search,
  Plus,
  MoreHorizontal,
  Filter,
  Columns3,
  X,
  Save,
  Trash2,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingDown,
} from "lucide-react";

interface Recovery {
  id: string;
  responsavel: string;
  cliente: string;
  receita_em_risco: number;
  receita_recuperada: number | null;
  tipo_recupera: "Preditivo" | "Churn";
  data_pedido_churn: string | null;
  status_recupera: "Em andamento" | "Recuperado" | "Perdido";
  ja_na_projecao: boolean;
  data_prevista_churn: string | null;
  proposta_enviada: boolean;
  proposta_com_reducao: boolean;
  status_proposta: string | null;
  created_at: string;
  updated_at: string;
}

interface User {
  email: string;
  name: string;
}

const tipoRecuperaOptions = ["Preditivo", "Churn"] as const;
const statusRecuperaOptions = ["Em andamento", "Recuperado", "Perdido"] as const;
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

const ADMIN_EMAIL = "sandro.lopes@rankmyapp.com.br";

export default function RecuperaPage() {
  const [recoveries, setRecoveries] = useState<Recovery[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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

  useEffect(() => {
    async function guardAndLoad() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        window.location.href = "/login";
        return;
      }
      // Pagina em "Em Breve" para usuarios comuns: somente admin acessa
      if (user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
        window.location.href = "/overview";
        return;
      }
      loadData();
    }
    guardAndLoad();
  }, []);

  async function loadData() {
    const supabase = createClient();

    // Load users
    const { data: userData } = await supabase
      .from("users")
      .select("email, name")
      .eq("active", true);

    if (userData) {
      setUsers(userData.map(u => ({ email: u.email, name: u.name || u.email.split("@")[0] })));
    }

    // Load recoveries
    const { data: recoveryData } = await supabase
      .from("recoveries")
      .select("*")
      .order("created_at", { ascending: false });

    if (recoveryData) {
      setRecoveries(recoveryData as Recovery[]);
    }

    setLoading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();

    if (editingId) {
      await supabase
        .from("recoveries")
        .update(formData)
        .eq("id", editingId);
    } else {
      await supabase
        .from("recoveries")
        .insert([formData]);
    }

    setShowCreateModal(false);
    setEditingId(null);
    resetForm();
    loadData();
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir este registro?")) return;
    const supabase = createClient();
    await supabase.from("recoveries").delete().eq("id", id);
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

  const filteredRecoveries = useMemo(() => {
    if (!searchTerm) return recoveries;
    const term = searchTerm.toLowerCase();
    return recoveries.filter(r =>
      r.cliente.toLowerCase().includes(term) ||
      r.responsavel.toLowerCase().includes(term)
    );
  }, [recoveries, searchTerm]);

  const formatCurrency = (value: number | null) => {
    if (value === null) return "-";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

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
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: "var(--accent)" }} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
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
          <button
            onClick={() => { resetForm(); setEditingId(null); setShowCreateModal(true); }}
            className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-lg transition-all font-medium cursor-pointer hover:opacity-90"
            style={{
              background: "linear-gradient(135deg, var(--accent-gradient-from), var(--accent-gradient-to))",
            }}
          >
            <Plus size={16} />
            Nova Recuperação
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div
            className="rounded-xl p-4"
            style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "color-mix(in srgb, var(--warning) 15%, transparent)" }}>
                <Clock size={20} style={{ color: "var(--warning)" }} />
              </div>
              <div>
                <p className="text-xs" style={{ color: "var(--muted)" }}>Em Andamento</p>
                <p className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
                  {recoveries.filter(r => r.status_recupera === "Em andamento").length}
                </p>
              </div>
            </div>
          </div>

          <div
            className="rounded-xl p-4"
            style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "color-mix(in srgb, var(--success) 15%, transparent)" }}>
                <CheckCircle2 size={20} style={{ color: "var(--success)" }} />
              </div>
              <div>
                <p className="text-xs" style={{ color: "var(--muted)" }}>Recuperados</p>
                <p className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
                  {recoveries.filter(r => r.status_recupera === "Recuperado").length}
                </p>
              </div>
            </div>
          </div>

          <div
            className="rounded-xl p-4"
            style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "color-mix(in srgb, var(--danger) 15%, transparent)" }}>
                <TrendingDown size={20} style={{ color: "var(--danger)" }} />
              </div>
              <div>
                <p className="text-xs" style={{ color: "var(--muted)" }}>Perdidos</p>
                <p className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
                  {recoveries.filter(r => r.status_recupera === "Perdido").length}
                </p>
              </div>
            </div>
          </div>

          <div
            className="rounded-xl p-4"
            style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)" }}>
                <AlertTriangle size={20} style={{ color: "var(--accent)" }} />
              </div>
              <div>
                <p className="text-xs" style={{ color: "var(--muted)" }}>Receita em Risco</p>
                <p className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
                  {formatCurrency(recoveries.reduce((sum, r) => sum + (r.receita_em_risco || 0), 0))}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted)" }} />
            <input
              type="text"
              placeholder="Buscar por cliente ou responsável..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg text-sm"
              style={{
                background: "var(--input-bg)",
                border: "1px solid var(--input-border)",
                color: "var(--foreground)",
              }}
            />
          </div>
        </div>

        {/* Table */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--table-border)" }}>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: "var(--muted)", background: "var(--table-header)" }}>Account</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: "var(--muted)", background: "var(--table-header)" }}>Cliente</th>
                  <th className="text-right px-4 py-3 font-medium" style={{ color: "var(--muted)", background: "var(--table-header)" }}>Receita em Risco</th>
                  <th className="text-right px-4 py-3 font-medium" style={{ color: "var(--muted)", background: "var(--table-header)" }}>Receita Recuperada</th>
                  <th className="text-center px-4 py-3 font-medium" style={{ color: "var(--muted)", background: "var(--table-header)" }}>Recupera Preditivo/Churn</th>
                  <th className="text-center px-4 py-3 font-medium" style={{ color: "var(--muted)", background: "var(--table-header)" }}>Data Pedido Churn</th>
                  <th className="text-center px-4 py-3 font-medium" style={{ color: "var(--muted)", background: "var(--table-header)" }}>Status Recupera</th>
                  <th className="text-center px-4 py-3 font-medium" style={{ color: "var(--muted)", background: "var(--table-header)" }}>Já na Projeção</th>
                  <th className="text-center px-4 py-3 font-medium" style={{ color: "var(--muted)", background: "var(--table-header)" }}>Data Prevista Churn</th>
                  <th className="text-center px-4 py-3 font-medium" style={{ color: "var(--muted)", background: "var(--table-header)" }}>Proposta Enviada</th>
                  <th className="text-center px-4 py-3 font-medium" style={{ color: "var(--muted)", background: "var(--table-header)" }}>Proposta c/ Redução</th>
                  <th className="text-center px-4 py-3 font-medium" style={{ color: "var(--muted)", background: "var(--table-header)" }}>Status Proposta</th>
                  <th className="text-center px-4 py-3 font-medium" style={{ color: "var(--muted)", background: "var(--table-header)" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecoveries.map((recovery) => {
                  const statusColor = getStatusColor(recovery.status_recupera);
                  const tipoColor = getTipoColor(recovery.tipo_recupera);
                  return (
                    <tr
                      key={recovery.id}
                      style={{ borderBottom: "1px solid var(--table-border)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--table-row-hover)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td className="px-4 py-3" style={{ color: "var(--foreground)" }}>{recovery.responsavel}</td>
                      <td className="px-4 py-3 font-medium" style={{ color: "var(--foreground)" }}>{recovery.cliente}</td>
                      <td className="px-4 py-3 text-right" style={{ color: "var(--foreground)" }}>{formatCurrency(recovery.receita_em_risco)}</td>
                      <td className="px-4 py-3 text-right" style={{ color: recovery.receita_recuperada ? "var(--success)" : "var(--muted)" }}>
                        {formatCurrency(recovery.receita_recuperada)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className="inline-flex px-2 py-1 rounded-full text-xs font-medium"
                          style={{ background: tipoColor.bg, color: tipoColor.text }}
                        >
                          {recovery.tipo_recupera}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center" style={{ color: "var(--foreground)" }}>{recovery.data_pedido_churn || "-"}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className="inline-flex px-2 py-1 rounded-full text-xs font-medium"
                          style={{ background: statusColor.bg, color: statusColor.text }}
                        >
                          {recovery.status_recupera}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span style={{ color: recovery.ja_na_projecao ? "var(--success)" : "var(--danger)" }}>
                          {recovery.ja_na_projecao ? "Sim" : "Não"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center" style={{ color: "var(--foreground)" }}>{recovery.data_prevista_churn || "-"}</td>
                      <td className="px-4 py-3 text-center">
                        <span style={{ color: recovery.proposta_enviada ? "var(--success)" : "var(--muted)" }}>
                          {recovery.proposta_enviada ? "Sim" : "Não"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span style={{ color: recovery.proposta_com_reducao ? "var(--warning)" : "var(--muted)" }}>
                          {recovery.proposta_com_reducao ? "Sim" : "Não"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center" style={{ color: "var(--foreground)" }}>{recovery.status_proposta || "-"}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEditModal(recovery)}
                            className="p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-[var(--input-bg)]"
                            style={{ color: "var(--accent)" }}
                          >
                            <MoreHorizontal size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(recovery.id)}
                            className="p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-[var(--input-bg)]"
                            style={{ color: "var(--danger)" }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredRecoveries.length === 0 && (
                  <tr>
                    <td colSpan={13} className="px-4 py-12 text-center" style={{ color: "var(--muted)" }}>
                      Nenhuma recuperação encontrada
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create/Edit Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
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
                      {tipoRecuperaOptions.map(opt => (
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
                      {statusRecuperaOptions.map(opt => (
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