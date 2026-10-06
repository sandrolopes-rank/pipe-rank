"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import {
  LayoutDashboard,
  LifeBuoy,
  RefreshCw,
  Briefcase,
  Bell,
  BarChart3,
  Users,
  LogOut,
  Sun,
  Moon,
  Palette,
  Settings,
  ChevronDown,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useTheme } from "@/lib/theme/ThemeContext";

const navItems = [
  { label: "Overview", href: "/overview", icon: LayoutDashboard },
];

// Somente admin navega nestas paginas (por enquanto)
const adminNavItems = [
  { label: "Recupera", href: "/recupera", icon: LifeBuoy },
  { label: "Renovações", href: "/renovacoes", icon: RefreshCw },
];

const upcomingItems = [
  { label: "Recupera", icon: LifeBuoy },
  { label: "Renovações", icon: RefreshCw },
  { label: "Usuários", icon: Users },
];

const adminItems = [
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Usuários", href: "/usuarios", icon: Users },
];

const ALERTS_SEEN_KEY = "alertas_last_seen";

const ADMIN_EMAIL = "sandro.lopes@rankmyapp.com.br";

// Status encerrados não geram alerta de inatividade
const CLOSED_STATUSES = new Set(["Fechado", "Assinado", "Perdido", "Proposta Perdida"]);

function daysSince(iso?: string): number {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

export function Sidebar({ userEmail: propUserEmail, activeCount }: { userEmail?: string; activeCount?: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const { paletteId, mode, setPaletteId, toggleMode, allPalettes } = useTheme();
  const [showSettings, setShowSettings] = useState(false);
  const [userEmail, setUserEmail] = useState(propUserEmail || "");
  const settingsRef = useRef<HTMLDivElement>(null);

  // Fetch user email from Supabase if not provided via props
  useEffect(() => {
    if (!propUserEmail) {
      async function fetchUser() {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          setUserEmail(user.email);
        }
      }
      fetchUser();
    }
  }, [propUserEmail]);

  const isAdmin = userEmail?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  const [alertsCount, setAlertsCount] = useState(0);
  const [staleCount, setStaleCount] = useState(0);
  const [showAlerts, setShowAlerts] = useState(false);
  const alertsRef = useRef<HTMLDivElement>(null);

  interface StaleItem {
    id: string;
    cliente: string;
    produto: string;
    responsavel: string;
    status: string;
    updated_at: string;
    arquivada?: boolean;
    days: number;
  }
  interface AuditItem {
    id: number;
    actor_email: string;
    record_label: string;
    action: "INSERT" | "UPDATE" | "DELETE";
    created_at: string;
    table_name: string;
    record_id: string;
  }
  const [staleItems, setStaleItems] = useState<StaleItem[]>([]);
  const [auditItems, setAuditItems] = useState<AuditItem[]>([]);

  // Notificações de inatividade (7+ dias, escopo do usuario via RLS) — todos
  useEffect(() => {
    const supabase = createClient();
    let disposed = false;

    async function loadStale() {
      const { data } = await supabase
        .from("oportunidades")
        .select("id, cliente, produto, responsavel, status, updated_at, arquivada")
        .order("updated_at", { ascending: true });
      if (disposed) return;
      const items = ((data ?? []) as Omit<StaleItem, "days">[])
        .filter((o) => !o.arquivada && !CLOSED_STATUSES.has(o.status))
        .map((o) => ({ ...o, days: daysSince(o.updated_at) }))
        .filter((o) => o.days >= 7);
      setStaleItems(items);
      setStaleCount(items.length);
    }
    loadStale();
    return () => { disposed = true; };
  }, []);

  // Badge extra do admin: eventos novos no audit_log
  useEffect(() => {
    if (!isAdmin) return;
    const supabase = createClient();
    let disposed = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function loadCount() {
      const lastSeen = localStorage.getItem(ALERTS_SEEN_KEY) ?? new Date(0).toISOString();
      const { count } = await supabase
        .from("audit_log")
        .select("id", { count: "exact", head: true })
        .gt("created_at", lastSeen)
        .neq("actor_email", ADMIN_EMAIL);
      if (!disposed) setAlertsCount(count ?? 0);
      // Itens recentes para o painel do sino
      const { data } = await supabase
        .from("audit_log")
        .select("id, actor_email, record_label, action, created_at, table_name, record_id")
        .order("created_at", { ascending: false })
        .limit(6);
      if (!disposed) setAuditItems((data as AuditItem[]) ?? []);
    }

    loadCount();

    channel = supabase
      .channel(`alertas-badge-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "audit_log" },
        (payload) => {
          const actor = (payload.new as { actor_email?: string }).actor_email;
          if (actor?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) return;
          setAlertsCount((c) => c + 1);
        }
      )
      .subscribe();

    function handleSeen() {
      setAlertsCount(0);
    }
    window.addEventListener("alertas-seen", handleSeen);

    return () => {
      disposed = true;
      if (channel) supabase.removeChannel(channel);
      window.removeEventListener("alertas-seen", handleSeen);
    };
  }, [isAdmin]);

  // Close settings menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false);
      }
      if (alertsRef.current && !alertsRef.current.contains(event.target as Node)) {
        setShowAlerts(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const totalBadge = alertsCount + staleCount;

  function timeAgoShort(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "agora";
    if (m < 60) return `${m}min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  }

  function staleColor(days: number): string {
    if (days >= 30) return "#ef4444";
    if (days >= 15) return "#f59e0b";
    return "#eab308";
  }

  const ACTION_VERB: Record<AuditItem["action"], string> = {
    INSERT: "cadastrou",
    UPDATE: "editou",
    DELETE: "excluiu",
  };

  function toggleAlerts() {
    const next = !showAlerts;
    setShowAlerts(next);
    if (next && isAdmin) {
      localStorage.setItem(ALERTS_SEEN_KEY, new Date().toISOString());
      window.dispatchEvent(new Event("alertas-seen"));
    }
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside
      className="w-56 min-h-screen flex flex-col fixed left-0 top-0 z-30"
      style={{
        background: "var(--sidebar-bg)",
        borderRight: "1px solid var(--sidebar-border)",
      }}
    >
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-3" style={{ borderBottom: "1px solid var(--sidebar-border)" }}>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg"
          style={{
            background: `linear-gradient(135deg, var(--logo-gradient-from), var(--logo-gradient-to))`,
            boxShadow: `0 4px 12px rgba(0, 0, 0, 0.3)`,
          }}
        >
          <Briefcase size={16} className="text-white" />
        </div>
        <div>
          <h1
            className="text-sm font-bold leading-tight"
            style={{
              background: `linear-gradient(90deg, var(--logo-gradient-from), var(--logo-gradient-to))`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Rank CRM
          </h1>
          <p className="text-[10px] leading-tight" style={{ color: "var(--muted)" }}>Gestão de Receita</p>
        </div>

        {/* Sino de notificações (painel livre) */}
        <div className="relative ml-auto" ref={alertsRef}>
          <button
            onClick={toggleAlerts}
            className="relative p-2 rounded-lg transition-all cursor-pointer hover:opacity-80"
            style={{ color: totalBadge > 0 ? "var(--foreground)" : "var(--muted)" }}
            title="Notificações"
          >
            <Bell size={16} />
            {totalBadge > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 text-[9px] font-bold text-white rounded-full min-w-[15px] h-[15px] flex items-center justify-center px-0.5"
                style={{ background: "#ef4444", boxShadow: "0 0 0 2px var(--sidebar-bg)" }}
              >
                {totalBadge > 99 ? "99+" : totalBadge}
              </span>
            )}
          </button>

          {/* Painel de notificações */}
          {showAlerts && (
            <div
              className="absolute right-0 top-full mt-2 w-80 rounded-xl overflow-hidden shadow-2xl z-50"
              style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
            >
              <div
                className="px-4 py-2.5 flex items-center justify-between"
                style={{ borderBottom: "1px solid var(--card-border)" }}
              >
                <span className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>
                  Notificações
                </span>
                {totalBadge > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>
                    {totalBadge}
                  </span>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto">
                {staleItems.length === 0 && auditItems.length === 0 ? (
                  <p className="text-xs text-center py-6" style={{ color: "var(--muted)" }}>
                    Sem notificações no momento.
                  </p>
                ) : (
                  <>
                    {/* Paradas sem atualização (escopo do usuário via RLS) */}
                    {staleItems.slice(0, 6).map((o) => (
                      <button
                        key={`stale-${o.id}`}
                        onClick={() => { setShowAlerts(false); router.push(`/overview?edit=${o.id}`); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all cursor-pointer hover:opacity-80"
                        style={{ borderBottom: "1px solid var(--card-border)" }}
                      >
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: `${staleColor(o.days)}22`, color: staleColor(o.days) }}
                        >
                          {o.days}d
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs truncate" style={{ color: "var(--foreground)" }}>
                            <span className="font-semibold">{o.cliente}</span>
                            {o.produto && <span style={{ color: "var(--muted)" }}> — {o.produto}</span>}
                          </p>
                          <p className="text-[10px]" style={{ color: "var(--muted)" }}>
                            {isAdmin && o.responsavel ? `${o.responsavel} · ` : ""}{o.status} · parada há {o.days} dias
                          </p>
                        </div>
                      </button>
                    ))}

                    {/* Alterações (somente admin) */}
                    {isAdmin && auditItems.map((a) => (
                      <button
                        key={`audit-${a.id}`}
                        onClick={() => {
                          setShowAlerts(false);
                          // INSERT/UPDATE em oportunidades: abre o formulário de edição do item.
                          // DELETE ou outra tabela: registro não existe mais → página de alertas.
                          if (a.table_name === "oportunidades" && a.action !== "DELETE" && a.record_id) {
                            router.push(`/overview?edit=${a.record_id}`);
                          } else {
                            router.push("/alertas");
                          }
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all cursor-pointer hover:opacity-80"
                        style={{ borderBottom: "1px solid var(--card-border)" }}
                      >
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: "var(--nav-active-bg)", color: "var(--accent-text)" }}
                        >
                          {ACTION_VERB[a.action]}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs truncate" style={{ color: "var(--foreground)" }}>
                            <span className="font-semibold">{a.actor_email ? a.actor_email.split("@")[0] : "sistema"}</span>
                            <span style={{ color: "var(--muted)" }}> {ACTION_VERB[a.action]} </span>
                            <span className="font-semibold">{a.record_label || "um item"}</span>
                          </p>
                          <p className="text-[10px]" style={{ color: "var(--muted)" }}>{timeAgoShort(a.created_at)} atrás</p>
                        </div>
                      </button>
                    ))}
                  </>
                )}
              </div>

              <Link
                href="/alertas"
                onClick={() => setShowAlerts(false)}
                className="block text-center text-[11px] font-medium py-2.5 transition-all hover:opacity-80"
                style={{ color: "var(--accent-text)", borderTop: "1px solid var(--card-border)" }}
              >
                Ver todos os alertas
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.concat(isAdmin ? adminNavItems : []).map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all"
              style={
                isActive
                  ? {
                      background: "var(--nav-active-bg)",
                      color: "var(--foreground)",
                      fontWeight: 500,
                      border: "1px solid var(--nav-active-border)",
                    }
                  : {
                      color: "var(--muted)",
                      border: "1px solid transparent",
                    }
              }
            >
              <item.icon size={16} style={isActive ? { color: "var(--accent-text)" } : undefined} />
              <span className="flex-1">{item.label}</span>
              {item.href === "/overview" && activeCount !== undefined && activeCount > 0 && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center"
                  style={{
                    background: "var(--nav-active-bg)",
                    color: "var(--accent-text)",
                    border: "1px solid var(--nav-active-border)",
                  }}
                >
                  {activeCount}
                </span>
              )}
            </Link>
          );
        })}

        <div className="pt-4 pb-2 px-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
            {isAdmin ? "Admin" : "Em Breve"}
          </span>
        </div>

        {isAdmin
          ? adminItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all"
                  style={
                    isActive
                      ? {
                          background: "var(--nav-active-bg)",
                          color: "var(--foreground)",
                          fontWeight: 500,
                          border: "1px solid var(--nav-active-border)",
                        }
                      : {
                          color: "var(--muted)",
                          border: "1px solid transparent",
                        }
                  }
                >
                  <item.icon size={16} style={isActive ? { color: "var(--accent-text)" } : undefined} />
                  <span className="flex-1">{item.label}</span>
                </Link>
              );
            })
          : upcomingItems.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-not-allowed"
                style={{ color: "var(--muted)", opacity: 0.5 }}
              >
                <item.icon size={16} />
                {item.label}
              </div>
            ))}
      </nav>

      {/* User info + Settings */}
      <div className="px-3 py-3" style={{ borderTop: "1px solid var(--sidebar-border)" }} ref={settingsRef}>
        <div className="relative">
          {/* User button - clickable to open settings */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="w-full flex items-center gap-3 px-2 py-2 rounded-lg transition-all cursor-pointer hover:opacity-80"
            style={{ background: showSettings ? "var(--nav-active-bg)" : "transparent" }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
              style={{
                background: `linear-gradient(135deg, var(--logo-gradient-from), var(--logo-gradient-to))`,
              }}
            >
              {userEmail ? userEmail.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-medium truncate" style={{ color: "var(--foreground)" }}>
                {userEmail ? userEmail.split("@")[0] : "Usuário"}
              </p>
              <p className="text-[10px] truncate" style={{ color: "var(--muted)" }}>{userEmail || ""}</p>
            </div>
            <ChevronDown
              size={12}
              style={{
                color: "var(--muted)",
                transform: showSettings ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s",
              }}
            />
          </button>

          {/* Settings dropdown */}
          {showSettings && (
            <div
              className="absolute bottom-full left-0 right-0 mb-2 rounded-xl overflow-hidden shadow-2xl z-50"
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--card-border)",
              }}
            >
              {/* Dark/Light Toggle */}
              <button
                onClick={() => {
                  toggleMode();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-xs transition-all cursor-pointer hover:opacity-80"
                style={{
                  borderBottom: "1px solid var(--card-border)",
                  color: "var(--foreground)",
                }}
              >
                {mode === "dark" ? <Sun size={14} style={{ color: "var(--accent-text)" }} /> : <Moon size={14} style={{ color: "var(--accent-text)" }} />}
                <span className="flex-1 text-left">{mode === "dark" ? "Modo Claro" : "Modo Escuro"}</span>
                <span
                  className="text-[9px] px-2 py-0.5 rounded-full"
                  style={{ background: "var(--nav-active-bg)", color: "var(--accent-text)" }}
                >
                  {mode === "dark" ? "DARK" : "LIGHT"}
                </span>
              </button>

              {/* Palette section header */}
              <div className="px-4 pt-3 pb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5" style={{ color: "var(--muted)" }}>
                  <Palette size={10} /> Paleta de Cores
                </span>
              </div>

              {/* Palette grid */}
              <div className="px-3 pb-3 max-h-48 overflow-y-auto">
                <div className="grid grid-cols-2 gap-1">
                  {allPalettes.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setPaletteId(p.id);
                        setShowSettings(false);
                      }}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-[10px] transition-all cursor-pointer hover:opacity-80"
                      style={{
                        background: p.id === paletteId ? "var(--nav-active-bg)" : "transparent",
                        color: "var(--foreground)",
                        border: p.id === paletteId ? "1px solid var(--nav-active-border)" : "1px solid transparent",
                      }}
                    >
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ background: `linear-gradient(135deg, ${p.dark.accentGradientFrom}, ${p.dark.accentGradientTo})` }}
                      />
                      <span className="truncate">{p.emoji} {p.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-xs transition-all cursor-pointer hover:opacity-80"
                style={{
                  borderTop: "1px solid var(--card-border)",
                  color: "var(--danger)",
                }}
              >
                <LogOut size={14} />
                <span>Sair</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}