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
  Sparkles,
  LogOut,
  Sun,
  Moon,
  Palette,
  ChevronDown,
  AlertTriangle,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useTheme } from "@/lib/theme/ThemeContext";
import { APP_VERSION_SHORT } from "@/lib/version";
import { usePrivileges } from "@/lib/use-privileges";
import { PAGES, type PageKey } from "@/lib/privileges";
import {
  carregarMes,
  lerCacheMes,
  cacheFresca,
  avaliarAlertaReuniao,
  fetchElephan,
  type ElephanAlerta,
  type ElephanTranscribeComSinais,
  type ElephanTranscribeResumo,
} from "@/lib/elephan";

const navItems = [
  { label: "Overview", href: "/overview", icon: LayoutDashboard },
];

// Somente admin navega nestas paginas (por enquanto)
const adminNavItems = [
  { label: "Recupera", href: "/recupera", icon: LifeBuoy },
  { label: "Renovações", href: "/renovacoes", icon: RefreshCw },
  { label: "Elephan.AI", href: "/elephan", icon: Sparkles },
  { label: "Planos", href: "/planos", icon: ClipboardList },
];

const upcomingItems = [
  { label: "Recupera", icon: LifeBuoy },
  { label: "Renovações", icon: RefreshCw },
  { label: "Elephan.AI", icon: Sparkles },
];

const adminItems = [
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Usuários", href: "/usuarios", icon: Users },
];

// Itens de notificação já abertos individualmente (chave -> ref de updated_at/created_at)
const READ_MAP_KEY = "alertas_read_v1";

const ADMIN_EMAIL = "sandro.lopes@rankmyapp.com.br";

// Ícone de cada página do registry de privilégios
const PAGE_ICONS: Record<PageKey, LucideIcon> = {
  overview: LayoutDashboard,
  elephan: Sparkles,
  recupera: LifeBuoy,
  renovacoes: RefreshCw,
  analytics: BarChart3,
  alertas: AlertTriangle,
};

// Status encerrados não geram alerta de inatividade
const CLOSED_STATUSES = new Set(["Fechado", "Assinado", "Perdido", "Proposta Perdida"]);

function daysSince(iso?: string): number {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

// Capturado uma vez na carga do módulo (fora do render): base para "Xmin atrás"
const AGORA_BASE = Date.now();

export function Sidebar({ userEmail: propUserEmail, activeCount }: { userEmail?: string; activeCount?: number | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const { paletteId, mode, setPaletteId, toggleMode, allPalettes } = useTheme();
  const [showSettings, setShowSettings] = useState(false);
  const userEmail = propUserEmail ?? "";
  const settingsRef = useRef<HTMLDivElement>(null);
  const priv = usePrivileges();

  const isAdmin =
    priv.isAdmin || userEmail?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  // Alertas da Elephan no sino: admin OU privilégio com a função liberada
  const canElephanAlerts = isAdmin || priv.hasFeature("elephan", "alertas");
  // Notificações já abertas individualmente (a bolinha amarela some ao clicar)
  const [readMap, setReadMap] = useState<Record<string, string>>({});
  // Dot de carregamento até o fetch inicial de notificações resolver
  const [countsLoading, setCountsLoading] = useState(true);
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
  // Alertas da Elephan (sentimentação/churn) — somente admin
  const [elephanAlertas, setElephanAlertas] = useState<ElephanAlerta[]>([]);
  const [elephanSeen, setElephanSeen] = useState<Set<string>>(new Set());

  // Carrega do navegador as notificações já abertas individualmente.
  // Adiado para microtask: setState síncrono dentro de effect não é permitido (react-hooks).
  useEffect(() => {
    Promise.resolve().then(() => {
      try {
        setReadMap(JSON.parse(localStorage.getItem(READ_MAP_KEY) ?? "{}"));
      } catch {
        // mapa corrompido: recomeça vazio
      }
    });
  }, []);

  // Alertas da Elephan: sentimento negativo dominante + churn
  // signals das reuniões do mês, respeitando o que já foi marcado como lido
  // no quadro da página /elephan. Cache-first: reusa o cache do navegador.
  useEffect(() => {
    if (!canElephanAlerts) return;
    let disposed = false;
    (async () => {
      await Promise.resolve();
      try {
        const now = new Date();
        const inicio = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const fim = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

        // cache-first: reusa o cache do navegador quando fresco
        const cache = lerCacheMes(inicio.substring(0, 7));
        let itens: ElephanTranscribeResumo[];
        if (cache && cacheFresca(cache.ts)) {
          itens = cache.itens;
        } else {
          const r = await carregarMes(inicio, fim, "", { maxPaginas: 3 });
          if (disposed) return;
          itens = r.itens;
        }

        // reuniões com negativo dominante ainda não vistas no quadro
        let seen: Set<string> = new Set();
        try {
          seen = new Set(JSON.parse(localStorage.getItem("elephan_alerts_seen") ?? "[]"));
        } catch {
          // storage indisponível
        }
        const pendentes = itens.filter(
          (o) =>
            !seen.has(`${o.id}:sentimento`) &&
            (() => {
              const totals = o.sentimentAnalysis?.totalSentiment ?? [];
              const neg = totals.find((t) => (t.sentimental ?? "").toUpperCase() === "NEGATIVE");
              const pos = totals.find((t) => (t.sentimental ?? "").toUpperCase() === "POSITIVE");
              return neg && (neg.perc ?? 0) >= 40 && (!pos || (pos.perc ?? 0) < (neg.perc ?? 0));
            })()
        );

        // detalhes apenas das pendentes (churn signals vivem em reasons[])
        const detalhes = new Map<string, ElephanTranscribeComSinais>();
        const filas = [...pendentes.map((o) => o.id)];
        await Promise.all(
          Array.from({ length: 4 }, async () => {
            while (filas.length > 0) {
              const id = filas.shift()!;
              try {
                const body = await fetchElephan(`/v1/transcribes/${id}`);
                if (body?.data) detalhes.set(id, body.data as ElephanTranscribeComSinais);
              } catch {
                // falha individual não derruba o lote
              }
            }
          })
        );
        if (disposed) return;

        const alertas: ElephanAlerta[] = [];
        pendentes.forEach((o) => {
          const det = detalhes.get(o.id);
          alertas.push(...avaliarAlertaReuniao(det ? ({ ...o, ...det } as ElephanTranscribeResumo) : o));
        });
        if (!disposed) {
          setElephanAlertas(alertas);
          setElephanSeen(seen);
        }
      } catch {
        // silencioso: o sino apenas não mostra alertas da Elephan
      }
    })();
    return () => {
      disposed = true;
    };
  }, [canElephanAlerts]);

  // Notificações de inatividade (7+ dias, escopo do usuario via RLS) — todos
  useEffect(() => {
    const supabase = createClient();
    let disposed = false;

    async function loadStale() {
      try {
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
      } finally {
        if (!disposed) setCountsLoading(false);
      }
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

    async function loadAudit() {
      try {
        // Itens recentes para o painel do sino
        const { data } = await supabase
          .from("audit_log")
          .select("id, actor_email, record_label, action, created_at, table_name, record_id")
          .order("created_at", { ascending: false })
          .limit(6);
        if (!disposed) setAuditItems((data as AuditItem[]) ?? []);
      } finally {
        if (!disposed) setCountsLoading(false);
      }
    }

    loadAudit();

    channel = supabase
      .channel(`alertas-badge-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "audit_log" },
        (payload) => {
          const row = payload.new as AuditItem;
          if (row.actor_email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) return;
          setAuditItems((prev) => [row, ...prev].slice(0, 6));
        }
      )
      .subscribe();

    return () => {
      disposed = true;
      if (channel) supabase.removeChannel(channel);
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

  // Marca um item como aberto (some a bolinha amarela e reduz os contadores)
  function markRead(key: string, ref: string) {
    setReadMap((prev) => {
      if (prev[key] === ref) return prev;
      const next = { ...prev, [key]: ref };
      try {
        localStorage.setItem(READ_MAP_KEY, JSON.stringify(next));
      } catch {
        // storage indisponível: mantém apenas nesta sessão
      }
      return next;
    });
  }

  const staleKey = (id: string) => `stale-${id}`;
  const auditKey = (id: number) => `audit-${id}`;
  const isOwnAction = (a: AuditItem) =>
    a.actor_email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  // Não abertas individualmente (bolinha amarela). O painel mostra no máximo 6
  // itens de inatividade; a contagem considera os itens visíveis para que cada
  // clique reduza o badge do sino até zerar.
  const unreadStale = staleItems.slice(0, 6).filter((o) => readMap[staleKey(o.id)] !== o.updated_at);
  const unreadAudit = auditItems.filter(
    (a) => !isOwnAction(a) && readMap[auditKey(a.id)] !== a.created_at
  );
  // Badge vermelho do sino = notificações não lidas: diminui uma a uma conforme
  // cada notificação é aberta, e some quando todas foram visualizadas.
  // Inclui os alertas da Elephan (sentimentação/churn, admin) não lidos no quadro.
  const elephanNaoLidos = elephanAlertas.filter((a) => !elephanSeen.has(a.chave)).length;
  const totalUnread = unreadStale.length + (isAdmin ? unreadAudit.length : 0) + elephanNaoLidos;

  // Reação ao quadro da página /elephan: quando o admin marca os alertas como
  // lidos lá, o sino recomputa o badge na hora (sem refetch)
  useEffect(() => {
    const handler = () => {
      try {
        const seen = new Set<string>(JSON.parse(localStorage.getItem("elephan_alerts_seen") ?? "[]"));
        setElephanSeen(seen);
        setElephanAlertas((prev) => prev.filter((a) => !seen.has(a.chave)));
      } catch {
        // storage indisponível
      }
    };
    window.addEventListener("elephan-alertas-lidos", handler);
    return () => window.removeEventListener("elephan-alertas-lidos", handler);
  }, []);

  function timeAgoShort(iso: string): string {
    const diff = AGORA_BASE - new Date(iso).getTime();
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
    // Abrir o sino NÃO zera o badge: ele diminui conforme cada notificação é aberta
    setShowAlerts((s) => !s);
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
      {/* Logo / Header — grid fixo 3 colunas para não pular durante o fetch */}
      <div
        className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-4 min-h-[72px]"
        style={{ borderBottom: "1px solid var(--sidebar-border)" }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0"
          style={{
            background: `linear-gradient(135deg, var(--logo-gradient-from), var(--logo-gradient-to))`,
            boxShadow: `0 4px 12px rgba(0, 0, 0, 0.3)`,
          }}
        >
          <Briefcase size={16} className="text-white" />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h1
              className="text-sm font-bold leading-tight whitespace-nowrap truncate"
              style={{
                background: `linear-gradient(90deg, var(--logo-gradient-from), var(--logo-gradient-to))`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Rank CRM
            </h1>
            <span
              className="text-[9px] font-medium select-none flex-shrink-0"
              style={{ color: "var(--muted)" }}
              title={`Rank CRM ${APP_VERSION_SHORT}`}
            >
              {APP_VERSION_SHORT}
            </span>
          </div>
          <p className="text-[10px] leading-tight truncate" style={{ color: "var(--muted)" }}>
            Gestão de Receita
          </p>
        </div>

        {/* Sino de notificações (painel livre) */}
        <div className="relative flex-shrink-0" ref={alertsRef}>
          <button
            onClick={toggleAlerts}
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-all cursor-pointer hover:opacity-80"
            style={{ color: totalUnread > 0 ? "var(--foreground)" : "var(--muted)" }}
            title="Notificações"
          >
            <Bell size={16} />
            {countsLoading ? (
              <span
                aria-hidden
                className="absolute top-1 right-1 w-2 h-2 rounded-full animate-pulse"
                style={{ background: "var(--muted)" }}
              />
            ) : (
              totalUnread > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 text-[9px] font-bold text-white rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center tabular-nums"
                  style={{ background: "#ef4444" }}
                >
                  {totalUnread > 99 ? "99+" : totalUnread}
                </span>
              )
            )}
          </button>

          {/* Painel de notificações */}
          {showAlerts && (
            <div
              className="absolute left-0 top-full mt-2 w-80 rounded-xl overflow-hidden shadow-2xl z-50"
              style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
            >
              <div
                className="px-4 py-2.5 flex items-center justify-between"
                style={{ borderBottom: "1px solid var(--card-border)" }}
              >
                <span className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>
                  Notificações
                </span>
                {totalUnread > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>
                    {totalUnread}
                  </span>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto">
                {staleItems.length === 0 && auditItems.length === 0 && elephanAlertas.length === 0 ? (
                  <p className="text-xs text-center py-6" style={{ color: "var(--muted)" }}>
                    Sem notificações no momento.
                  </p>
                ) : (
                  <>
                    {/* Paradas sem atualização (escopo do usuário via RLS) */}
                    {staleItems.slice(0, 6).map((o) => (
                      <button
                        key={`stale-${o.id}`}
                        onClick={() => { markRead(staleKey(o.id), o.updated_at); setShowAlerts(false); router.push(`/overview?edit=${o.id}`); }}
                        className="relative w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all cursor-pointer hover:opacity-80"
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
                        {readMap[staleKey(o.id)] !== o.updated_at && (
                          <span
                            aria-hidden
                            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                            style={{ background: "#eab308" }}
                          />
                        )}
                      </button>
                    ))}

                    {/* Alertas da Elephan (sentimentação/churn — admin ou função liberada) */}
                    {canElephanAlerts && elephanAlertas.length > 0 && (
                      <>
                        <div className="px-4 pt-2 pb-1">
                          <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                            Elephan.AI
                          </span>
                        </div>
                        {elephanAlertas.map((a) => (
                          <button
                            key={a.chave}
                            onClick={() => { setShowAlerts(false); router.push("/elephan?alertas=1"); window.dispatchEvent(new Event("elephan-abrir-quadro")); }}
                            className="relative w-full flex items-start gap-3 px-4 py-2.5 text-left transition-all cursor-pointer hover:opacity-80"
                            style={{ borderBottom: "1px solid var(--card-border)" }}
                            title="Abrir painel de alertas da Elephan"
                          >
                            <span
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 mt-0.5"
                              style={{
                                background: a.severidade === "critica" ? "rgba(239, 68, 68, 0.15)" : "rgba(245, 158, 11, 0.15)",
                                color: a.severidade === "critica" ? "#f87171" : "#fbbf24",
                              }}
                            >
                              {a.tipo === "churn" ? "Churn" : "Sent."}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs truncate" style={{ color: "var(--foreground)" }}>
                                <span className="font-semibold">{a.titulo}</span>
                              </p>
                              <p className="text-[10px] truncate" style={{ color: "var(--muted)" }}>{a.descricao}</p>
                              {a.data && (
                                <p className="text-[10px]" style={{ color: "var(--muted)", opacity: 0.8 }}>
                                  {a.data.substring(0, 10).split("-").reverse().join("/")}
                                </p>
                              )}
                            </div>
                          </button>
                        ))}
                      </>
                    )}

                    {/* Alterações (somente admin) */}
                    {isAdmin && auditItems.map((a) => (
                      <button
                        key={`audit-${a.id}`}
                        onClick={() => {
                          markRead(auditKey(a.id), a.created_at);
                          setShowAlerts(false);
                          // INSERT/UPDATE em oportunidades: abre o formulário de edição do item.
                          // DELETE ou outra tabela: registro não existe mais → página de alertas.
                          if (a.table_name === "oportunidades" && a.action !== "DELETE" && a.record_id) {
                            router.push(`/overview?edit=${a.record_id}`);
                          } else {
                            router.push("/alertas");
                          }
                        }}
                        className="relative w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all cursor-pointer hover:opacity-80"
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
                        {!isOwnAction(a) && readMap[auditKey(a.id)] !== a.created_at && (
                          <span
                            aria-hidden
                            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                            style={{ background: "#eab308" }}
                          />
                        )}
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
        {(() => {
          // Não-admin: navegação dirigida pelo privilégio atribuído.
          // Enquanto o hook resolve, mostra o fallback conservador (UX atual do usuário padrão).
          const resolved = isAdmin || !priv.loading;
          const openPages = PAGES.filter((p) => priv.canOpen(p.key));
          const blockedPages = PAGES.filter(
            (p) => !priv.canOpen(p.key) && priv.access(p.key) === "disabled"
          );
          const mainItems = isAdmin
            ? navItems.concat(adminNavItems)
            : resolved && openPages.length > 0
              ? openPages.map((p) => ({ label: p.label, href: p.href, icon: PAGE_ICONS[p.key] }))
              : navItems;
          const sectionLabel = isAdmin
            ? "Admin"
            : !resolved || openPages.length <= 1
              ? "Em Breve"
              : "Bloqueadas";
          const sectionItems = isAdmin
            ? adminItems
            : !resolved
              ? upcomingItems
              : blockedPages.map((p) => ({ label: p.label, icon: PAGE_ICONS[p.key] }));
          return (
            <>
        {mainItems.map((item) => {
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
              {item.href === "/overview" && activeCount !== undefined && (
                activeCount === null ? (
                  <span
                    aria-hidden
                    className="w-2 h-2 rounded-full animate-pulse flex-shrink-0"
                    style={{ background: "var(--muted)" }}
                  />
                ) : activeCount > 0 ? (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center tabular-nums flex-shrink-0"
                    style={{
                      background: "var(--nav-active-bg)",
                      color: "var(--accent-text)",
                      border: "1px solid var(--nav-active-border)",
                    }}
                  >
                    {activeCount > 99 ? "99+" : activeCount}
                  </span>
                ) : null
              )}
            </Link>
          );
        })}

        {sectionItems.length > 0 && (
          <div
            className="pt-3 pb-1 px-3 mt-2"
            style={{ borderTop: "1px solid var(--sidebar-border)" }}
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
              {sectionLabel}
            </span>
          </div>
        )}

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
          : sectionItems.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-not-allowed"
                style={{ color: "var(--muted)", opacity: 0.5 }}
                title={resolved ? "Bloqueado pelo seu privilégio" : undefined}
              >
                <item.icon size={16} />
                {item.label}
              </div>
            ))}
            </>
          );
        })()}
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
              {userEmail ? userEmail.charAt(0).toUpperCase() : (
                <span className="block w-3 h-3 rounded-full animate-pulse" style={{ background: "rgba(255,255,255,0.4)" }} aria-hidden />
              )}
            </div>
            <div className="flex-1 min-w-0 text-left">
              {userEmail ? (
                <>
                  <p className="text-xs font-medium truncate" style={{ color: "var(--foreground)" }}>
                    {userEmail.split("@")[0]}
                  </p>
                  <p className="text-[10px] truncate" style={{ color: "var(--muted)" }}>{userEmail}</p>
                </>
              ) : (
                <>
                  <p
                    className="h-3 w-24 rounded animate-pulse mb-1.5"
                    style={{ background: "var(--muted)", opacity: 0.3 }}
                    aria-hidden />
                  <p
                    className="h-2 w-32 rounded animate-pulse"
                    style={{ background: "var(--muted)", opacity: 0.2 }}
                    aria-hidden />
                </>
              )}
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