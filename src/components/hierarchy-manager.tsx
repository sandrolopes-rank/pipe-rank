"use client";

// ============================================
// Gestão de hierarquias (equipes)
// ============================================
// - Admin: escolhe o líder e monta a equipe dele (adiciona/remove membros;
//   lista de candidatos montada client-side a partir de list_users_scoped)
// - Líder/Gerente (com a função liberada no privilégio): gerencia apenas
//   a própria equipe, atribuindo por e-mail — o banco valida nível, vínculo
//   e ciclos (RPCs SECURITY DEFINER do supabase-hierarquia.sql)

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePrivileges } from "@/lib/use-privileges";
import type { Privilege, PrivilegeRank } from "@/lib/privileges";
import {
  Users,
  Plus,
  X,
  Loader2,
  UserCheck,
  Network,
  AlertTriangle,
  Crown,
  Search,
} from "lucide-react";

interface ScopedUser {
  id: string;
  email: string;
  username: string;
  role: string;
  banned_until: string | null;
}

export function HierarchyManager({
  onFeedback,
}: {
  onFeedback: (kind: "error" | "success", msg: string) => void;
}) {
  const priv = usePrivileges();
  const supabase = createClient();
  const isAdminMode = priv.actingAsAdmin;

  const [loading, setLoading] = useState(true);
  const [leaders, setLeaders] = useState<{ id: string; label: string; isMe: boolean }[]>([]);
  const [selectedLeader, setSelectedLeader] = useState("");
  const [allUsers, setAllUsers] = useState<ScopedUser[]>([]);
  const [memberIds, setMemberIds] = useState<Set<string>>(new Set());
  const [privileges, setPrivileges] = useState<Privilege[]>([]);
  const [busy, setBusy] = useState(false);
  const [novoEmail, setNovoEmail] = useState("");

  const rankOfRole = useCallback(
    (role: string, privs: Privilege[]): PrivilegeRank => {
      if (role === "admin") return "admin";
      if (role === "user") return "colaborador";
      return ((privs.find((p) => p.slug === role)?.rank ?? "colaborador") as PrivilegeRank);
    },
    []
  );

  const selectedLeaderRank = useCallback((): PrivilegeRank => {
    const leader = allUsers.find((u) => u.id === selectedLeader);
    if (!leader) return isAdminMode ? "admin" : priv.rank;
    return rankOfRole(leader.role, privileges);
  }, [allUsers, selectedLeader, isAdminMode, priv.rank, privileges, rankOfRole]);

  const refresh = useCallback(async (leaderId: string) => {
    if (!leaderId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("list_hierarchy_ids", { p_leader: leaderId });
      if (error) throw new Error(error.message);
      const ids = ((data ?? []) as { member_id?: string }[])
        .map((m) => String(m?.member_id ?? ""))
        .filter(Boolean);
      setMemberIds(new Set(ids));
    } catch (e) {
      onFeedback("error", e instanceof Error ? e.message : "Erro ao carregar hierarquia");
    } finally {
      setLoading(false);
    }
  }, [onFeedback, supabase]);

  // Carga inicial: líderes + usuários visíveis + ranks de privilégios
  useEffect(() => {
    if (priv.loading) return;
    (async () => {
      await Promise.resolve();
      try {
        const token = (await supabase.auth.getSession()).data.session?.access_token ?? "";
        const [usersRes, privsRes] = await Promise.all([
          supabase.rpc("list_users_scoped"),
          fetch("/api/privileges", { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        const privileges = privsRes.ok
          ? ((await privsRes.json()).privileges ?? []) as Privilege[]
          : [];
        const todos = ((usersRes.data ?? []) as Record<string, unknown>[]).map((u) => {
          const meta = (u.raw_user_meta_data ?? {}) as Record<string, unknown>;
          return {
            id: u.id as string,
            email: (u.email as string) || "",
            username: (meta.username as string) || ((u.email as string)?.split("@")[0] ?? ""),
            role: (meta.role as string) || "user",
            banned_until: (u.banned_until as string | null) ?? null,
          } as ScopedUser;
        }).filter((u) => !u.banned_until);
        setPrivileges(privileges);
        setAllUsers(todos);

        if (isAdminMode) {
          const lideres = todos
            .filter((u) => rankOfRole(u.role, privileges) === "lider" || u.email.toLowerCase() === priv.email.toLowerCase())
            .map((u) => ({
              id: u.id,
              label: `${u.username || u.email.split("@")[0]}${u.id === priv.userId ? " (você — Admin master)" : ""}`,
              isMe: u.id === priv.userId,
            }));
          setLeaders(lideres);
          const first = lideres.find((l) => l.isMe)?.id ?? lideres[0]?.id ?? "";
          setSelectedLeader(first);
          await refresh(first);
        } else {
          setLeaders([{ id: priv.userId, label: "Você", isMe: true }]);
          setSelectedLeader(priv.userId);
          await refresh(priv.userId);
        }
      } catch (e) {
        onFeedback("error", e instanceof Error ? e.message : "Erro ao carregar hierarquia");
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priv.loading]);

  async function changeLeader(id: string) {
    setSelectedLeader(id);
    await refresh(id);
  }

  async function toggleMembership(memberId: string, add: boolean) {
    setBusy(true);
    try {
      const { error } = await supabase.rpc("set_hierarchy", {
        p_leader: selectedLeader,
        p_member: memberId,
        p_add: add,
      });
      if (error) throw new Error(error.message);
      onFeedback("success", add ? "Membro adicionado à equipe." : "Membro removido da equipe.");
      await refresh(selectedLeader);
    } catch (e) {
      onFeedback("error", e instanceof Error ? e.message : "Erro ao atualizar hierarquia");
    }
    setBusy(false);
  }

  async function adicionarPorEmail() {
    const mail = novoEmail.trim().toLowerCase();
    if (!mail) return;
    const alvo = allUsers.find((u) => u.email.toLowerCase() === mail);
    if (!alvo) {
      onFeedback("error", `Usuário com email ${mail} não encontrado.`);
      return;
    }
    if (alvo.id === selectedLeader) {
      onFeedback("error", "Uma pessoa não pode ser subordinada de si mesma.");
      return;
    }
    setNovoEmail("");
    await toggleMembership(alvo.id, true);
  }

  if (priv.loading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={20} className="animate-spin" style={{ color: "var(--muted)" }} />
      </div>
    );
  }

  const leaderRank = selectedLeaderRank();
  const membros = allUsers.filter((u) => memberIds.has(u.id));
  const disponiveis = isAdminMode
    ? allUsers
        .filter((u) => u.id !== selectedLeader && !memberIds.has(u.id))
        .filter((u) => {
          const r = rankOfRole(u.role, privileges);
          return leaderRank === "admin" ? r !== "admin" && r !== "lider" : r < leaderRank;
        })
    : [];

  return (
    <div>
      <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>
        A equipe definida aqui alimenta o escopo &quot;Ver sua hierarquia&quot;: páginas configuradas com esse escopo mostram os dados de todos os membros da equipe, em todas as camadas. Um usuário só pode pertencer a uma equipe — reatribuí-lo move o vínculo. Perfis Admin e Líder não podem ser subordinados.
      </p>

      {/* Seleção do líder */}
      <div
        className="rounded-xl p-4 mb-4 flex items-center gap-3 flex-wrap"
        style={{ background: `linear-gradient(135deg, var(--card-bg), var(--background))`, border: "1px solid var(--card-border)" }}
      >
        <Network size={16} style={{ color: "var(--accent-text)" }} />
        <div className="flex-1 min-w-[240px]">
          <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--muted)" }}>
            Líder da equipe
          </label>
          {isAdminMode ? (
            <select
              value={selectedLeader}
              onChange={(e) => changeLeader(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer"
              style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--foreground)" }}
            >
              {leaders.map((l) => (
                <option key={l.id} value={l.id} style={{ background: "var(--card-bg)", color: "var(--foreground)" }}>
                  {l.label}
                </option>
              ))}
            </select>
          ) : (
            <div className="flex items-center gap-2 text-sm" style={{ color: "var(--foreground)" }}>
              <Crown size={14} style={{ color: "var(--accent-text)" }} />
              Você
            </div>
          )}
        </div>
        <span
          className="text-[10px] px-2 py-1 rounded-full font-medium"
          style={{ background: "var(--nav-active-bg)", color: "var(--accent-text)", border: "1px solid var(--nav-active-border)" }}
        >
          {membros.length} membro{membros.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Membros da equipe */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: `linear-gradient(135deg, var(--card-bg), var(--background))`, border: "1px solid var(--card-border)" }}
        >
          <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid var(--table-border)" }}>
            <UserCheck size={14} style={{ color: "var(--accent-text)" }} />
            <span className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>Membros da equipe</span>
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {membros.length === 0 ? (
              <p className="text-xs text-center py-10" style={{ color: "var(--muted)" }}>
                Nenhum membro na equipe ainda.
              </p>
            ) : (
              membros.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 px-4 py-2.5 transition-colors"
                  style={{ borderBottom: "1px solid var(--table-border)" }}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                    style={{ background: "var(--nav-active-bg)", color: "var(--accent-text)" }}
                  >
                    {(m.username || m.email.split("@")[0]).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: "var(--foreground)" }}>
                      {m.username || m.email.split("@")[0]}
                    </p>
                    <p className="text-[10px] truncate" style={{ color: "var(--muted)" }}>{m.email}</p>
                  </div>
                  <button
                    onClick={() => toggleMembership(m.id, false)}
                    disabled={busy}
                    className="p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-[var(--input-bg)] hover:text-[var(--danger)] disabled:opacity-40"
                    style={{ color: "var(--muted)" }}
                    title="Remover da equipe"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Disponíveis / atribuição */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: `linear-gradient(135deg, var(--card-bg), var(--background))`, border: "1px solid var(--card-border)" }}
        >
          <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid var(--table-border)" }}>
            <Users size={14} style={{ color: "var(--accent-text)" }} />
            <span className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>
              {isAdminMode ? "Disponíveis para atribuir" : "Adicionar por e-mail"}
            </span>
          </div>

          {/* Líder: busca por e-mail (sem expor a lista geral de usuários) */}
          {!isAdminMode && (
            <form
              onSubmit={(e) => { e.preventDefault(); adicionarPorEmail(); }}
              className="px-4 py-3 flex items-center gap-2"
              style={{ borderBottom: "1px solid var(--table-border)" }}
            >
              <div className="relative flex-1">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--muted)" }} />
                <input
                  type="email"
                  value={novoEmail}
                  onChange={(e) => setNovoEmail(e.target.value)}
                  placeholder="email@rankmyapp.com.br"
                  className="w-full text-xs rounded-lg pl-8 pr-3 py-2 outline-none"
                  style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--foreground)" }}
                />
              </div>
              <button
                type="submit"
                disabled={busy || !novoEmail.trim()}
                className="flex items-center gap-1 px-3 py-2 text-[11px] font-medium rounded-lg transition-all hover:opacity-90 disabled:opacity-40 cursor-pointer"
                style={{ color: "#ffffff", background: `linear-gradient(135deg, var(--accent-gradient-from), var(--accent-gradient-to))` }}
              >
                <Plus size={12} />
                Adicionar
              </button>
            </form>
          )}

          <div className="max-h-[380px] overflow-y-auto">
            {isAdminMode && disponiveis.length === 0 ? (
              <p className="text-xs text-center py-10" style={{ color: "var(--muted)" }}>
                Nenhum usuário disponível neste nível.
              </p>
            ) : (
              isAdminMode && disponiveis.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center gap-3 px-4 py-2.5 transition-colors"
                  style={{ borderBottom: "1px solid var(--table-border)" }}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                    style={{ background: "var(--input-bg)", color: "var(--muted)" }}
                  >
                    {(u.username || u.email.split("@")[0]).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: "var(--foreground)" }}>
                      {u.username || u.email.split("@")[0]}
                    </p>
                    <p className="text-[10px] truncate" style={{ color: "var(--muted)" }}>{u.email}</p>
                  </div>
                  <button
                    onClick={() => toggleMembership(u.id, true)}
                    disabled={busy}
                    className="p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-[var(--nav-active-bg)] hover:text-[var(--accent-text)] disabled:opacity-40"
                    style={{ color: "var(--muted)" }}
                    title="Adicionar à equipe"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2 mt-3">
        <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" style={{ color: "var(--muted)" }} />
        <p className="text-[10px]" style={{ color: "var(--muted)" }}>
          A atribuição respeita a hierarquia de níveis: Líder pode atribuir Gerentes e Colaboradores; Gerente (quando existir), apenas Colaboradores. O banco valida todas as operações.
        </p>
      </div>
    </div>
  );
}
