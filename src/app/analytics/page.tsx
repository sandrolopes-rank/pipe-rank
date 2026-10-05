"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DashboardLayout } from "@/components/dashboard-layout";
import {
  Activity,
  LogIn,
  Users,
  CalendarDays,
  Loader2,
  MonitorSmartphone,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const ADMIN_EMAIL = "sandro.lopes@rankmyapp.com.br";

interface AccessRow {
  id: number;
  created_at: string;
  user_id: string;
  email: string;
  event: string;
  user_agent: string;
}

function browserFromUA(ua: string): string {
  if (!ua) return "Desconhecido";
  if (ua.includes("Edg")) return "Edge";
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Safari")) return "Safari";
  return "Outro";
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("pt-BR")} ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
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

export default function AnalyticsPage() {
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AccessRow[]>([]);

  useEffect(() => {
    async function init() {
      const supabase = createClient();
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

      const { data } = await supabase
        .from("access_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      setLogs((data as AccessRow[]) ?? []);
      setLoading(false);
    }
    init();
  }, []);

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const uniqueUsers = new Set(logs.map((l) => l.user_id)).size;
    return {
      total: logs.length,
      today: logs.filter((l) => new Date(l.created_at).toDateString() === today).length,
      uniqueUsers,
      lastAccess: logs[0]?.created_at ?? null,
    };
  }, [logs]);

  // Logins por dia — últimos 14 dias (com dias zerados preenchidos)
  const byDay = useMemo(() => {
    const days: { label: string; key: string; logins: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toDateString();
      days.push({
        key,
        label: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`,
        logins: 0,
      });
    }
    const map = new Map(days.map((d) => [d.key, d]));
    logs.forEach((l) => {
      const entry = map.get(new Date(l.created_at).toDateString());
      if (entry) entry.logins += 1;
    });
    return days;
  }, [logs]);

  // Ranking de usuários por número de logins
  const byUser = useMemo(() => {
    const map = new Map<string, number>();
    logs.forEach((l) => {
      const name = l.email.split("@")[0] || "desconhecido";
      map.set(name, (map.get(name) ?? 0) + 1);
    });
    return [...map.entries()]
      .map(([name, logins]) => ({ name, logins }))
      .sort((a, b) => b.logins - a.logins)
      .slice(0, 8);
  }, [logs]);

  if (loading) {
    return (
      <DashboardLayout userEmail={userEmail || undefined}>
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin" style={{ color: "var(--muted)" }} />
        </div>
      </DashboardLayout>
    );
  }

  const cards = [
    { label: "Logins registrados", value: stats.total, Icon: LogIn },
    { label: "Logins hoje", value: stats.today, Icon: CalendarDays },
    { label: "Usuários que acessaram", value: stats.uniqueUsers, Icon: Users },
    { label: "Último acesso", value: stats.lastAccess ? timeAgo(stats.lastAccess) : "—", Icon: Activity },
  ];

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
          <Activity size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Analytics de Acessos</h1>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            Registro de logins — visível somente para o administrador
          </p>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-xl p-4"
            style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <c.Icon size={14} style={{ color: "var(--accent-text)" }} />
              <span className="text-[11px] font-medium" style={{ color: "var(--muted)" }}>{c.label}</span>
            </div>
            <p className="text-xl font-bold" style={{ color: "var(--foreground)" }}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl p-4" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
          <p className="text-xs font-semibold mb-3" style={{ color: "var(--foreground)" }}>
            Logins por dia (últimos 14 dias)
          </p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--table-border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted)" }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "var(--muted)" }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card-bg)",
                    border: "1px solid var(--card-border)",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "var(--foreground)",
                  }}
                />
                <Bar dataKey="logins" fill="var(--accent, #8b5cf6)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl p-4" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
          <p className="text-xs font-semibold mb-3" style={{ color: "var(--foreground)" }}>
            Logins por usuário (top 8)
          </p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byUser} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--table-border)" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: "var(--muted)" }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10, fill: "var(--muted)" }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card-bg)",
                    border: "1px solid var(--card-border)",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "var(--foreground)",
                  }}
                />
                <Bar dataKey="logins" fill="var(--accent, #8b5cf6)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tabela de acessos */}
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
        <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid var(--table-border)" }}>
          <MonitorSmartphone size={14} style={{ color: "var(--accent-text)" }} />
          <p className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>
            Registro de acessos ({logs.length} últimos)
          </p>
        </div>
        {logs.length === 0 ? (
          <p className="text-sm text-center py-10" style={{ color: "var(--muted)" }}>
            Nenhum login registrado ainda — os novos logins aparecerão aqui automaticamente.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--table-border)" }}>
                  {["Data e horário", "Usuário", "Evento", "Navegador"].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-2.5 font-medium"
                      style={{ color: "var(--muted)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: "1px solid var(--table-border)" }}>
                    <td className="px-4 py-2.5" style={{ color: "var(--foreground)" }}>
                      {formatDateTime(log.created_at)}
                    </td>
                    <td className="px-4 py-2.5 font-medium" style={{ color: "var(--foreground)" }}>
                      {log.email}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{ background: "rgba(16,185,129,0.12)", color: "#10b981" }}
                      >
                        {log.event === "login" ? "Login" : log.event}
                      </span>
                    </td>
                    <td className="px-4 py-2.5" style={{ color: "var(--muted)" }}>
                      {browserFromUA(log.user_agent)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
