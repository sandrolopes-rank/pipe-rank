"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DashboardLayout } from "@/components/dashboard-layout";
import {
  Bell,
  PlusCircle,
  Pencil,
  Trash2,
  Search,
  History,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";

const ADMIN_EMAIL = "sandro.lopes@rankmyapp.com.br";
const LAST_SEEN_KEY = "alertas_last_seen";

interface AuditRow {
  id: number;
  created_at: string;
  table_name: string;
  record_id: string;
  record_label: string;
  action: "INSERT" | "UPDATE" | "DELETE";
  actor_id: string | null;
  actor_email: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
}

const FIELD_LABELS: Record<string, string> = {
  responsavel: "Responsável",
  cliente: "Cliente",
  produto: "Produto",
  receita_atual: "Receita Atual",
  receita_negociacao: "Receita em Negociação",
  upsell: "Upsell",
  calor: "Calor",
  mes_atuacao: "Mês de Atuação",
  status: "Status",
  proposta_em: "Proposta em",
  data_fechamento: "Data de Fechamento",
  observacoes_1: "Observações 1",
  observacoes_2: "Observações 2",
  arquivada: "Arquivada",
};

const HIDDEN_FIELDS = new Set(["id", "created_at", "updated_at", "owner_email"]);

const ACTION_META: Record<
  AuditRow["action"],
  { label: string; color: string; bg: string; Icon: typeof PlusCircle }
> = {
  INSERT: { label: "cadastrou", color: "#10b981", bg: "rgba(16,185,129,0.12)", Icon: PlusCircle },
  UPDATE: { label: "editou", color: "#f59e0b", bg: "rgba(245,158,11,0.12)", Icon: Pencil },
  DELETE: { label: "excluiu", color: "#ef4444", bg: "rgba(239,68,68,0.12)", Icon: Trash2 },
};

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "number") return value.toLocaleString("pt-BR");
  return String(value);
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("pt-BR")} às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "agora mesmo";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "há 1 dia" : `há ${days} dias`;
}

/** Campos que mudaram entre old_data e new_data (ignora campos técnicos) */
function changedFields(row: AuditRow): { field: string; label: string; before: string; after: string }[] {
  const source = row.action === "DELETE" ? row.old_data : row.new_data;
  const compare = row.action === "INSERT" ? {} : row.old_data;
  if (!source) return [];

  const keys = Object.keys(FIELD_LABELS).filter(
    (k) => !HIDDEN_FIELDS.has(k) && (k in source || (compare && k in compare))
  );
  const extra = Object.keys(source).filter((k) => !HIDDEN_FIELDS.has(k) && !(k in FIELD_LABELS));

  const all = [...keys, ...extra].map((field) => ({
    field,
    label: FIELD_LABELS[field] ?? field,
    before: formatValue(compare?.[field]),
    after: formatValue(source[field]),
  }));

  // Em edição, mostrar SOMENTE os campos que de fato mudaram
  if (row.action === "UPDATE") return all.filter((f) => f.before !== f.after);
  // Em cadastro/exclusão, omitir campos vazios
  return all.filter((f) => (row.action === "INSERT" ? f.after !== "—" : f.before !== "—"));
}

function FieldDiff({ row }: { row: AuditRow }) {
  const fields = changedFields(row);
  if (fields.length === 0) {
    return <p className="text-xs" style={{ color: "var(--muted)" }}>Nenhum campo visível alterado.</p>;
  }
  return (
    <div className="grid gap-1.5">
      {fields.map((f) => (
        <div
          key={f.field}
          className="flex items-baseline gap-2 text-xs px-3 py-1.5 rounded-lg"
          style={{ background: "var(--input-bg)", border: "1px solid var(--table-border)" }}
        >
          <span className="font-medium min-w-[110px]" style={{ color: "var(--muted)" }}>
            {f.label}
          </span>
          {row.action === "UPDATE" ? (
            <span style={{ color: "var(--foreground)" }}>
              <span style={{ color: "#ef4444", textDecoration: "line-through" }}>{f.before}</span>
              {" → "}
              <span className="font-semibold" style={{ color: "#10b981" }}>{f.after}</span>
            </span>
          ) : (
            <span style={{ color: "var(--foreground)" }}>{row.action === "DELETE" ? f.before : f.after}</span>
          )}
        </div>
      ))}
    </div>
  );
}

export default function AlertasPage() {
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<AuditRow[]>([]);
  const [filter, setFilter] = useState<"ALL" | AuditRow["action"]>("ALL");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [timelineFor, setTimelineFor] = useState<number | null>(null);
  const [timelineRows, setTimelineRows] = useState<AuditRow[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        window.location.href = "/login";
        return;
      }
      if (user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
        window.location.href = "/overview";
        return;
      }
      setUserEmail(user.email);

      // Feed de alertas: exclui ações do próprio admin (vão só para o histórico)
      const { data } = await supabase
        .from("audit_log")
        .select("*")
        .neq("actor_email", ADMIN_EMAIL)
        .order("created_at", { ascending: false })
        .limit(200);
      setAlerts((data as AuditRow[]) ?? []);
      setLoading(false);

      // Marca como visto (zera o badge do menu)
      localStorage.setItem(LAST_SEEN_KEY, new Date().toISOString());
      window.dispatchEvent(new Event("alertas-seen"));

      // Tempo real: novos alertas entram no topo sem F5
      channel = supabase
        .channel(`alertas-feed-${Date.now()}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "audit_log" },
          (payload) => {
            const row = payload.new as AuditRow;
            if (row.actor_email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) return;
            setAlerts((prev) => [row, ...prev].slice(0, 200));
          }
        )
        .subscribe();
    }

    init();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return alerts.filter((a) => {
      if (filter !== "ALL" && a.action !== filter) return false;
      if (!term) return true;
      return (
        a.record_label.toLowerCase().includes(term) ||
        a.actor_email.toLowerCase().includes(term)
      );
    });
  }, [alerts, filter, search]);

  async function toggleTimeline(row: AuditRow) {
    if (timelineFor === row.id) {
      setTimelineFor(null);
      setTimelineRows([]);
      return;
    }
    setTimelineFor(row.id);
    setTimelineLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("audit_log")
      .select("*")
      .eq("table_name", row.table_name)
      .eq("record_id", row.record_id)
      .order("created_at", { ascending: true });
    setTimelineRows((data as AuditRow[]) ?? []);
    setTimelineLoading(false);
  }

  if (loading) {
    return (
      <DashboardLayout userEmail={userEmail || undefined}>
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin" style={{ color: "var(--muted)" }} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userEmail={userEmail}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, var(--accent-gradient-from), var(--accent-gradient-to))",
            boxShadow: "0 4px 16px rgba(124,58,237,0.3)",
          }}
        >
          <Bell size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Alertas</h1>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            Cadastros, edições e exclusões feitas pelos usuários — com histórico completo
          </p>
        </div>
      </div>

      {/* Filtros + busca */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {(
          [
            ["ALL", "Todos"],
            ["INSERT", "Cadastros"],
            ["UPDATE", "Edições"],
            ["DELETE", "Exclusões"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className="text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer"
            style={
              filter === value
                ? { background: "var(--nav-active-bg)", color: "var(--accent-text)", border: "1px solid var(--nav-active-border)", fontWeight: 600 }
                : { color: "var(--muted)", border: "1px solid var(--table-border)" }
            }
          >
            {label}
          </button>
        ))}
        <div className="relative ml-auto">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por item ou usuário..."
            className="rounded-lg pl-9 pr-3 py-1.5 text-xs focus:outline-none"
            style={{
              background: "var(--input-bg)",
              border: "1px solid var(--input-border)",
              color: "var(--foreground)",
              minWidth: 220,
            }}
          />
        </div>
      </div>

      {/* Feed */}
      {filtered.length === 0 ? (
        <div
          className="rounded-xl p-10 text-center"
          style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
        >
          <Bell size={28} className="mx-auto mb-3" style={{ color: "var(--muted)", opacity: 0.5 }} />
          <p className="text-sm" style={{ color: "var(--muted)" }}>Nenhum alerta por aqui.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((row) => {
            const meta = ACTION_META[row.action];
            const expanded = expandedId === row.id;
            const timelineOpen = timelineFor === row.id;
            return (
              <div
                key={row.id}
                className="rounded-xl overflow-hidden"
                style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
              >
                {/* Linha do alerta */}
                <button
                  onClick={() => setExpandedId(expanded ? null : row.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer transition-all hover:opacity-90"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: meta.bg }}
                  >
                    <meta.Icon size={15} style={{ color: meta.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate" style={{ color: "var(--foreground)" }}>
                      <span className="font-semibold">{row.actor_email ? row.actor_email.split("@")[0] : "sistema"}</span>{" "}
                      <span style={{ color: "var(--muted)" }}>{meta.label}</span>{" "}
                      <span className="font-semibold">{row.record_label || "um item"}</span>
                    </p>
                    <p className="text-[11px]" style={{ color: "var(--muted)" }} title={formatDateTime(row.created_at)}>
                      {timeAgo(row.created_at)} · {formatDateTime(row.created_at)}
                    </p>
                  </div>
                  {expanded ? (
                    <ChevronUp size={16} style={{ color: "var(--muted)" }} />
                  ) : (
                    <ChevronDown size={16} style={{ color: "var(--muted)" }} />
                  )}
                </button>

                {/* Detalhe expandido */}
                {expanded && (
                  <div className="px-4 pb-4 pt-1" style={{ borderTop: "1px solid var(--table-border)" }}>
                    <p className="text-[11px] font-semibold uppercase tracking-wider mb-2 mt-3" style={{ color: "var(--muted)" }}>
                      {row.action === "UPDATE" ? "O que mudou" : row.action === "INSERT" ? "Dados cadastrados" : "Dados excluídos"}
                    </p>
                    <FieldDiff row={row} />

                    <button
                      onClick={() => toggleTimeline(row)}
                      className="mt-3 flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer hover:opacity-80"
                      style={{
                        background: "var(--nav-active-bg)",
                        color: "var(--accent-text)",
                        border: "1px solid var(--nav-active-border)",
                      }}
                    >
                      <History size={13} />
                      {timelineOpen ? "Ocultar histórico completo" : "Ver histórico completo deste item"}
                    </button>

                    {/* Cronologia do item */}
                    {timelineOpen && (
                      <div className="mt-3 ml-2 pl-4" style={{ borderLeft: "2px solid var(--nav-active-border)" }}>
                        {timelineLoading ? (
                          <div className="py-3">
                            <Loader2 size={16} className="animate-spin" style={{ color: "var(--muted)" }} />
                          </div>
                        ) : (
                          timelineRows.map((step, i) => {
                            const m = ACTION_META[step.action];
                            const fields = changedFields(step).filter((f) => f.before !== f.after);
                            return (
                              <div key={step.id} className="relative pb-4">
                                <div
                                  className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full"
                                  style={{ background: m.color }}
                                />
                                <p className="text-xs" style={{ color: "var(--foreground)" }}>
                                  <span className="font-semibold">{i + 1}º passo</span>
                                  {" — "}
                                  <span className="font-semibold">{step.actor_email ? step.actor_email.split("@")[0] : "sistema"}</span>{" "}
                                  <span style={{ color: m.color, fontWeight: 600 }}>{m.label}</span>
                                  {" em "}
                                  {formatDateTime(step.created_at)}
                                </p>
                                {fields.length > 0 && (
                                  <div className="mt-1 space-y-0.5">
                                    {fields.map((f) => (
                                      <p key={f.field} className="text-[11px]" style={{ color: "var(--muted)" }}>
                                        {f.label}:{" "}
                                        {step.action === "UPDATE" ? (
                                          <>
                                            <span style={{ textDecoration: "line-through" }}>{f.before}</span>
                                            {" → "}
                                            <span style={{ color: "var(--foreground)" }}>{f.after}</span>
                                          </>
                                        ) : (
                                          <span style={{ color: "var(--foreground)" }}>
                                            {step.action === "DELETE" ? f.before : f.after}
                                          </span>
                                        )}
                                      </p>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
