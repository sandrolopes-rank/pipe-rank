"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DashboardLayout } from "@/components/dashboard-layout";
import { PrivilegesManager } from "@/components/privileges-manager";
import { HierarchyManager } from "@/components/hierarchy-manager";
import { usePrivileges } from "@/lib/use-privileges";
import { ADMIN_EMAIL, type Privilege } from "@/lib/privileges";
import {
  Users,
  Plus,
  Trash2,
  Shield,
  UserCheck,
  UserX,
  Mail,
  Key,
  X,
  Save,
  AlertTriangle,
  CheckCircle,
  Ban,
  RotateCcw,
  Lock,
  Network,
  Pencil,
  User as UserIcon,
} from "lucide-react";

interface AuthUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  role: string;
  username: string;
  banned_until: string | null;
}

export default function UsuariosPage() {
  const priv = usePrivileges();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [tab, setTab] = useState<"usuarios" | "hierarquia" | "privilegios">("usuarios");
  const [customPrivileges, setCustomPrivileges] = useState<Privilege[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<string | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [resetSaving, setResetSaving] = useState(false);
  const [editingName, setEditingName] = useState<{ id: string; value: string } | null>(null);

  // Funções do privilégio sobre a página Usuários (admin master: todas)
  const can = {
    privileges: priv.hasFeature("usuarios", "administrar_privilegios"),
    create: priv.hasFeature("usuarios", "cadastrar_usuarios"),
    edit: priv.hasFeature("usuarios", "editar_usuarios"),
    password: priv.hasFeature("usuarios", "alterar_senha"),
    role: priv.hasFeature("usuarios", "alterar_privilegio"),
    block: priv.hasFeature("usuarios", "bloquear_usuarios"),
    delete: priv.hasFeature("usuarios", "deletar_usuarios"),
    hierarchy: priv.hasFeature("usuarios", "atribuir_hierarquia"),
  };
  const temAbaPriv = can.privileges;
  const temAbaHier = can.hierarchy;

  function handleManagerFeedback(kind: "error" | "success", msg: string) {
    if (!msg) {
      setError(null);
      setSuccess(null);
      return;
    }
    if (kind === "error") {
      setError(msg);
      setSuccess(null);
    } else {
      setSuccess(msg);
      setError(null);
    }
  }

  const fetchCustomPrivileges = useCallback(async () => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token ?? "";
      const res = await fetch("/api/privileges", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setCustomPrivileges((data.privileges ?? []).filter((p: Privilege) => !p.is_system));
      }
    } catch {
      // sem a lista custom, o select mostra apenas Usuário/Admin
    }
  }, [supabase]);

  // Guarda por privilégio
  useEffect(() => {
    if (priv.loading) return;
    if (!priv.email) {
      window.location.href = "/login";
      return;
    }
    if (!priv.canOpen("usuarios")) {
      window.location.href = priv.homeHref === "/usuarios" ? "/overview" : priv.homeHref;
      return;
    }
    Promise.resolve().then(() => {
      fetchCustomPrivileges();
    });
  }, [priv, fetchCustomPrivileges]);

  const fetchUsers = useCallback(async () => {
    const { data, error } = await supabase.rpc("list_users_scoped");
    if (error) {
      setError(`Erro ao carregar usuários: ${error.message}. Verifique se o SQL supabase-hierarquia.sql foi rodado.`);
      return;
    }
    let lista = (data ?? []) as Record<string, unknown>[];
    // Modo de atuação (master conferindo um privilégio a si): a RPC resolve o
    // escopo pelo chamador REAL — e o master é sempre admin para o banco —,
    // então o escopo do privilégio em atuação é aplicado aqui:
    //   all       → sem filtro
    //   hierarchy → self + descendentes (priv.hierarchyEmails)
    //   own       → somente o próprio usuário
    if (!priv.loading && !priv.actingAsAdmin) {
      const escopo = priv.scope("usuarios");
      const self = (priv.email || "").toLowerCase();
      if (escopo === "own") {
        lista = lista.filter((u) => ((u.email as string) || "").toLowerCase() === self);
      } else if (escopo === "hierarchy") {
        const permitidos = new Set(priv.hierarchyEmails.map((e) => e.toLowerCase()));
        lista = lista.filter((u) => permitidos.has(((u.email as string) || "").toLowerCase()));
      }
    }
    setUsers(
      lista.map((u) => ({
        id: u.id as string,
        email: (u.email as string) || "",
        created_at: u.created_at as string,
        last_sign_in_at: (u.last_sign_in_at as string | null) ?? null,
        email_confirmed_at: (u.email_confirmed_at as string | null) ?? null,
        role: ((u.raw_user_meta_data as Record<string, unknown>)?.role as string) || "user",
        username: ((u.raw_user_meta_data as Record<string, unknown>)?.username as string) || ((u.email as string)?.split("@")[0] ?? ""),
        banned_until: (u.banned_until as string | null) ?? null,
      }))
    );
  }, [supabase, priv.loading, priv.actingAsAdmin, priv.email, priv.scope, priv.hierarchyEmails]);

  useEffect(() => {
    Promise.resolve().then(async () => {
      if (priv.loading || !priv.email) return;
      setLoading(true);
      await fetchUsers();
      setLoading(false);
    });
  }, [priv.loading, priv.email, tab, fetchUsers]);

  async function handleSetRole(userId: string, newRole: string) {
    try {
      const { error } = await supabase.rpc("set_user_role_scoped", {
        p_target: userId,
        p_new_role: newRole,
      });
      if (error) {
        setError("Erro ao alterar privilégio: " + error.message);
      } else {
        const nomePriv =
          newRole === "admin"
            ? "Administrador"
            : newRole === "user"
              ? "Usuário"
              : (customPrivileges.find((p) => p.slug === newRole)?.name ?? newRole);
        setSuccess(`Privilégio alterado para ${nomePriv}.`);
        await fetchUsers();
      }
    } catch {
      setError("Erro de conexão ao alterar privilégio.");
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const { error } = await supabase.rpc("create_user_scoped", {
        p_username: newUsername,
        p_email: newEmail,
        p_password: newPassword,
      });
      if (error) {
        if (error.message.includes("já está cadastrado") || error.message.includes("duplicate") || error.message.includes("unique")) {
          setError(`O email ${newEmail} já está cadastrado no sistema.`);
        } else {
          setError(error.message || "Erro ao criar usuário.");
        }
      } else {
        const virouLider = !priv.actingAsAdmin ? " e vinculado à sua equipe" : "";
        setSuccess(`Usuário ${newUsername || newEmail.split("@")[0]} criado com sucesso${virouLider}!`);
        setNewUsername("");
        setNewEmail("");
        setNewPassword("");
        setShowCreateModal(false);
        await fetchUsers();
      }
    } catch {
      setError("Erro de conexão ao criar usuário.");
    }
    setSaving(false);
  }

  async function handleResetPassword(userId: string) {
    if (!resetPasswordValue || resetPasswordValue.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setResetSaving(true);
    setError(null);
    try {
      const { error } = await supabase.rpc("reset_password_scoped", {
        p_target: userId,
        p_password: resetPasswordValue,
      });
      if (error) {
        setError("Erro ao redefinir senha: " + error.message);
      } else {
        const user = users.find((u) => u.id === userId);
        setSuccess(`Senha de ${user?.username || user?.email?.split("@")[0]} redefinida com sucesso.`);
        setResetPasswordUser(null);
        setResetPasswordValue("");
      }
    } catch {
      setError("Erro de conexão ao redefinir senha.");
    }
    setResetSaving(false);
  }

  async function handleToggleActive(userId: string, currentlyBanned: boolean) {
    setError(null);
    try {
      const { error } = await supabase.rpc("toggle_active_scoped", {
        p_target: userId,
        p_ban: !currentlyBanned,
      });
      if (error) {
        setError("Erro ao alterar status: " + error.message);
      } else {
        const user = users.find((u) => u.id === userId);
        const name = user?.username || user?.email?.split("@")[0];
        setSuccess(currentlyBanned ? `${name} reativado com sucesso.` : `${name} desativado com sucesso.`);
        await fetchUsers();
      }
    } catch {
      setError("Erro de conexão ao alterar status.");
    }
  }

  async function handleDeleteUser(id: string, email: string) {
    if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      setError("Não é possível excluir o administrador principal.");
      setDeleteConfirm(null);
      return;
    }
    try {
      const { error } = await supabase.rpc("delete_user_scoped", { p_target: id });
      if (error) {
        setError("Erro ao excluir usuário: " + error.message);
      } else {
        const user = users.find((u) => u.id === id);
        const name = user?.username || email.split("@")[0];
        setSuccess(`Usuário ${name} excluído permanentemente.`);
        setUsers(users.filter((u) => u.id !== id));
      }
    } catch {
      setError("Erro de conexão ao excluir usuário.");
    }
    setDeleteConfirm(null);
  }

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (!editingName || !editingName.value.trim()) return;
    try {
      const { error } = await supabase.rpc("rename_user_scoped", {
        p_target: editingName.id,
        p_username: editingName.value,
      });
      if (error) {
        setError("Erro ao renomear: " + error.message);
      } else {
        setSuccess("Nome de usuário atualizado.");
        setEditingName(null);
        await fetchUsers();
      }
    } catch {
      setError("Erro de conexão ao renomear.");
    }
  }

  if (loading && users.length === 0 && !priv.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <div className="text-sm" style={{ color: "var(--muted)" }}>Carregando...</div>
      </div>
    );
  }

  if (!priv.canOpen("usuarios")) return null;

  const activeUsers = users.filter((u) => !u.banned_until);
  const bannedUsers = users.filter((u) => !!u.banned_until);
  const isMasterRow = (u: AuthUser) =>
    u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  return (
    <DashboardLayout userEmail={priv.email}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, color-mix(in srgb, var(--accent) 20%, transparent), color-mix(in srgb, var(--accent) 10%, transparent))`,
              border: `1px solid color-mix(in srgb, var(--accent) 25%, transparent)`,
            }}
          >
            <Users size={18} style={{ color: "var(--accent-text)" }} />
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>Gerenciamento de Usuários</h1>
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              {priv.actingAsAdmin
                ? "Acesso restrito ao administrador"
                : `Suas permissões vêm do privilégio "${customPrivileges.find((p) => p.slug === priv.roleSlug)?.name ?? priv.roleSlug}"`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Tabs: Usuários / Hierarquia / Privilégios */}
          <div
            className="flex items-center rounded-lg overflow-hidden p-0.5 gap-0.5"
            style={{ border: "1px solid var(--input-border)", background: "var(--input-bg)" }}
          >
            <button
              onClick={() => setTab("usuarios")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${tab === "usuarios" ? "hover:opacity-90" : "hover:bg-[var(--nav-active-bg)] hover:text-[var(--foreground)]"}`}
              style={{
                background: tab === "usuarios"
                  ? `linear-gradient(135deg, var(--accent-gradient-from), var(--accent-gradient-to))`
                  : "transparent",
                color: tab === "usuarios" ? "#ffffff" : "var(--muted)",
                boxShadow: tab === "usuarios" ? "0 2px 8px color-mix(in srgb, var(--accent) 35%, transparent)" : undefined,
              }}
            >
              <Users size={12} />
              Usuários
            </button>
            {temAbaHier && (
              <button
                onClick={() => setTab("hierarquia")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${tab === "hierarquia" ? "hover:opacity-90" : "hover:bg-[var(--nav-active-bg)] hover:text-[var(--foreground)]"}`}
                style={{
                  background: tab === "hierarquia"
                    ? `linear-gradient(135deg, var(--accent-gradient-from), var(--accent-gradient-to))`
                    : "transparent",
                  color: tab === "hierarquia" ? "#ffffff" : "var(--muted)",
                  boxShadow: tab === "hierarquia" ? "0 2px 8px color-mix(in srgb, var(--accent) 35%, transparent)" : undefined,
                }}
              >
                <Network size={12} />
                Hierarquia
              </button>
            )}
            {temAbaPriv && (
              <button
                onClick={() => setTab("privilegios")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${tab === "privilegios" ? "hover:opacity-90" : "hover:bg-[var(--nav-active-bg)] hover:text-[var(--foreground)]"}`}
                style={{
                  background: tab === "privilegios"
                    ? `linear-gradient(135deg, var(--accent-gradient-from), var(--accent-gradient-to))`
                    : "transparent",
                  color: tab === "privilegios" ? "#ffffff" : "var(--muted)",
                  boxShadow: tab === "privilegios" ? "0 2px 8px color-mix(in srgb, var(--accent) 35%, transparent)" : undefined,
                }}
              >
                {tab === "privilegios" ? <Shield size={12} /> : <Plus size={12} />}
                Privilégios
              </button>
            )}
          </div>
          {tab === "usuarios" && can.create && (
            <button
              onClick={() => { setShowCreateModal(true); setError(null); setSuccess(null); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 cursor-pointer"
              style={{ color: "#ffffff", background: `linear-gradient(135deg, var(--accent-gradient-from), var(--accent-gradient-to))` }}
            >
              <Plus size={14} />
              Novo Usuário
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-lg text-sm" style={{ background: "color-mix(in srgb, var(--danger) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--danger) 30%, transparent)", color: "var(--danger)" }}>
          <AlertTriangle size={14} />
          {error}
          <button onClick={() => setError(null)} className="ml-auto cursor-pointer"><X size={12} /></button>
        </div>
      )}
      {success && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-lg text-sm" style={{ background: "color-mix(in srgb, var(--success) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--success) 30%, transparent)", color: "var(--success)" }}>
          <CheckCircle size={14} />
          {success}
          <button onClick={() => setSuccess(null)} className="ml-auto cursor-pointer"><X size={12} /></button>
        </div>
      )}

      {/* Aba Hierarquia */}
      {tab === "hierarquia" && (
        <HierarchyManager onFeedback={handleManagerFeedback} />
      )}

      {/* Aba Privilégios */}
      {tab === "privilegios" && (
        <PrivilegesManager onFeedback={handleManagerFeedback} />
      )}

      {/* Aba Usuários */}
      {tab === "usuarios" && (
      <>
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total", value: users.length, icon: Users, colorVar: "var(--accent-text)" },
          { label: "Ativos", value: activeUsers.length, icon: UserCheck, colorVar: "var(--success)" },
          { label: "Desativados", value: bannedUsers.length, icon: Ban, colorVar: "var(--danger)" },
          { label: "Pendentes", value: users.filter((u) => !u.email_confirmed_at).length, icon: UserX, colorVar: "var(--warning)" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl p-4"
            style={{ background: `linear-gradient(135deg, var(--card-bg), var(--background))`, border: "1px solid var(--card-border)" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <stat.icon size={14} style={{ color: stat.colorVar }} />
              <span className="text-xs" style={{ color: "var(--muted)" }}>{stat.label}</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: stat.colorVar }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Users Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: `linear-gradient(135deg, var(--card-bg), var(--background))`, border: "1px solid var(--card-border)" }}
      >
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--table-border)" }}>
              <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: "var(--muted)" }}>Usuário</th>
              <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: "var(--muted)" }}>Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: "var(--muted)" }}>Criado em</th>
              <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: "var(--muted)" }}>Último acesso</th>
              <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: "var(--muted)" }}>Privilégio</th>
              <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: "var(--muted)" }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "var(--input-bg)" }}>
                      <Users size={20} style={{ color: "var(--muted)" }} />
                    </div>
                    <p className="text-sm" style={{ color: "var(--muted)" }}>Nenhum usuário visível para você</p>
                  </div>
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const isConfirmed = !!user.email_confirmed_at;
                const isBanned = !!user.banned_until;
                const userRole = user.role || "user";
                const isMaster = isMasterRow(user);
                const isCurrentUser = user.email?.toLowerCase() === priv.email.toLowerCase();
                const displayName = user.username || user.email?.split("@")[0] || "Sem nome";
                const podeEditarLinha = !isMaster && (can.edit || can.password || can.role || can.block || can.delete);

                return (
                  <tr
                    key={user.id}
                    className="transition-colors"
                    style={{ borderBottom: "1px solid var(--table-border)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--table-row-hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "var(--nav-active-bg)", color: "var(--accent-text)" }}>
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            {editingName?.id === user.id ? (
                              <form onSubmit={handleRename} className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={editingName.value}
                                  onChange={(e) => setEditingName({ id: user.id, value: e.target.value })}
                                  autoFocus
                                  className="w-32 rounded px-2 py-1 text-xs focus:outline-none"
                                  style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--foreground)" }}
                                />
                                <button type="submit" className="p-1 cursor-pointer" style={{ color: "var(--accent-text)" }} title="Salvar nome">
                                  <Save size={12} />
                                </button>
                                <button type="button" onClick={() => setEditingName(null)} className="p-1 cursor-pointer" style={{ color: "var(--muted)" }}>
                                  <X size={12} />
                                </button>
                              </form>
                            ) : (
                              <>
                                <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{displayName}</span>
                                {isCurrentUser && <span className="text-[9px]" style={{ color: "var(--muted)" }}>(você)</span>}
                                {can.edit && !isMaster && (
                                  <button
                                    onClick={() => setEditingName({ id: user.id, value: user.username || "" })}
                                    className="p-0.5 rounded cursor-pointer opacity-60 hover:opacity-100 transition-opacity"
                                    style={{ color: "var(--muted)" }}
                                    title="Renomear usuário"
                                  >
                                    <Pencil size={11} />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                          <span className="text-[10px]" style={{ color: "var(--muted)" }}>{user.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {isBanned ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: "color-mix(in srgb, var(--danger) 15%, transparent)", color: "var(--danger)" }}>
                          <Ban size={10} /> Desativado
                        </span>
                      ) : isConfirmed ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: "color-mix(in srgb, var(--success) 15%, transparent)", color: "var(--success)" }}>
                          <UserCheck size={10} /> Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: "color-mix(in srgb, var(--warning) 15%, transparent)", color: "var(--warning)" }}>
                          <UserX size={10} /> Pendente
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--muted)" }}>
                      {new Date(user.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--muted)" }}>
                      {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString("pt-BR") : "Nunca"}
                    </td>
                    <td className="px-4 py-3">
                      {isMaster ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent-text)" }}>
                          <Shield size={10} /> Administrador
                        </span>
                      ) : can.role ? (
                        <div className="flex items-center gap-1">
                          {resetPasswordUser === user.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="password"
                                value={resetPasswordValue}
                                onChange={(e) => setResetPasswordValue(e.target.value)}
                                placeholder="Nova senha"
                                minLength={6}
                                className="w-24 rounded px-2 py-1 text-[10px] focus:outline-none"
                                style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--foreground)" }}
                              />
                              <button
                                onClick={() => handleResetPassword(user.id)}
                                disabled={resetSaving}
                                className="text-[10px] px-1 py-1 rounded transition-colors cursor-pointer"
                                style={{ color: "var(--accent-text)" }}
                              >
                                {resetSaving ? "..." : "OK"}
                              </button>
                              <button
                                onClick={() => { setResetPasswordUser(null); setResetPasswordValue(""); }}
                                className="text-[10px] px-1 py-1 rounded transition-colors cursor-pointer"
                                style={{ color: "var(--muted)" }}
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <>
                              <select
                                value={userRole}
                                onChange={(e) => handleSetRole(user.id, e.target.value)}
                                className="rounded px-2 py-1 text-[10px] focus:outline-none cursor-pointer"
                                style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--foreground)" }}
                              >
                                <option value="user" style={{ background: "var(--card-bg)", color: "var(--foreground)" }}>Usuário</option>
                                <option value="admin" style={{ background: "var(--card-bg)", color: "var(--foreground)" }}>Admin</option>
                                {customPrivileges.map((p) => (
                                  <option key={p.id} value={p.slug} style={{ background: "var(--card-bg)", color: "var(--foreground)" }}>
                                    {p.name}
                                  </option>
                                ))}
                                {userRole !== "user" && userRole !== "admin" && !customPrivileges.some((p) => p.slug === userRole) && (
                                  <option value={userRole} style={{ background: "var(--card-bg)", color: "var(--foreground)" }}>
                                    {userRole} (removido)
                                  </option>
                                )}
                              </select>
                              {can.password && (
                                <button
                                  onClick={() => setResetPasswordUser(user.id)}
                                  className="p-1.5 rounded-lg transition-colors cursor-pointer"
                                  style={{ color: "var(--muted)" }}
                                  title="Redefinir senha"
                                >
                                  <Key size={13} />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px]" style={{ color: "var(--muted)" }}>
                          {userRole === "user" ? "Usuário" : (customPrivileges.find((p) => p.slug === userRole)?.name ?? userRole)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {podeEditarLinha && (
                        <div className="flex items-center gap-1">
                          {can.block && (
                            <button
                              onClick={() => handleToggleActive(user.id, isBanned)}
                              className="p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-[var(--input-bg)]"
                              style={{ color: isBanned ? "var(--success)" : "var(--muted)" }}
                              title={isBanned ? "Reativar" : "Desativar"}
                            >
                              {isBanned ? <RotateCcw size={13} /> : <Lock size={13} />}
                            </button>
                          )}
                          {can.delete && (
                            deleteConfirm === user.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleDeleteUser(user.id, user.email)}
                                  className="text-[10px] px-2 py-1 rounded transition-colors cursor-pointer"
                                  style={{ color: "var(--danger)" }}
                                >
                                  Sim
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm(null)}
                                  className="text-[10px] px-2 py-1 rounded transition-colors cursor-pointer"
                                  style={{ color: "var(--muted)" }}
                                >
                                  Não
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirm(user.id)}
                                className="p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-[var(--input-bg)] hover:text-[var(--danger)]"
                                style={{ color: "var(--muted)" }}
                                title="Excluir permanentemente"
                              >
                                <Trash2 size={13} />
                              </button>
                            )
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      </>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div
            className="w-full max-w-md rounded-2xl shadow-2xl"
            style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
          >
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--table-border)" }}>
              <div className="flex items-center gap-2">
                <UserIcon size={16} style={{ color: "var(--accent-text)" }} />
                <h2 className="text-sm font-bold" style={{ color: "var(--foreground)" }}>Criar Novo Usuário</h2>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="transition-colors cursor-pointer" style={{ color: "var(--muted)" }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>Nome de usuário</label>
                <div className="relative">
                  <UserIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted)" }} />
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="Ex: joao.silva"
                    className="w-full rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none"
                    style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--foreground)" }}
                  />
                </div>
                <p className="text-[10px] mt-1" style={{ color: "var(--muted)" }}>
                  Nome exibido no sistema. Se vazio, usa o prefixo do email.
                  {!priv.actingAsAdmin && " O novo usuário entrará na sua hierarquia."}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>Email</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted)" }} />
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="usuario@rankmyapp.com.br"
                    className="w-full rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none"
                    style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--foreground)" }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>Senha temporária</label>
                <div className="relative">
                  <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted)" }} />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none"
                    style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--foreground)" }}
                  />
                </div>
                <p className="text-[10px] mt-1" style={{ color: "var(--muted)" }}>O usuário deverá alterar a senha após o primeiro acesso</p>
              </div>
              {error && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: "color-mix(in srgb, var(--danger) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--danger) 30%, transparent)", color: "var(--danger)" }}>
                  <AlertTriangle size={12} />
                  {error}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg text-sm transition-colors cursor-pointer"
                  style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--foreground)" }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50 cursor-pointer"
                  style={{ color: "#ffffff", background: `linear-gradient(135deg, var(--accent-gradient-from), var(--accent-gradient-to))` }}
                >
                  <Save size={14} />
                  {saving ? "Criando..." : "Criar Usuário"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
