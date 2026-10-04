"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useTheme } from "@/lib/theme/ThemeContext";
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
  ChevronDown,
  Ban,
  RotateCcw,
  Lock,
  User as UserIcon,
} from "lucide-react";

const ADMIN_EMAIL = "sandro.lopes@rankmyapp.com.br";

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
  const { mode } = useTheme();
  const [userEmail, setUserEmail] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AuthUser[]>([]);
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

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        window.location.href = "/login";
        return;
      }
      setUserEmail(user.email);
      const admin = user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
      setIsAdmin(admin);
      if (!admin) {
        window.location.href = "/overview";
        return;
      }
      await fetchUsers();
      setLoading(false);
    }
    checkAuth();
  }, []);

  async function fetchUsers() {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (!res.ok) {
        console.error("API /api/users error:", data.error);
        setError(`Erro ao carregar usuários: ${data.error || 'Erro desconhecido'}.`);
      } else if (data.users) {
        setUsers(data.users.map((u: AuthUser) => ({
          ...u,
          role: u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'admin' : (u.role || 'user'),
        })));
      }
    } catch (err) {
      console.error("Fetch /api/users failed:", err);
      setError("Erro de conexão ao buscar usuários.");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUsers([{
          id: user.id,
          email: user.email || '',
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at ?? null,
          email_confirmed_at: user.email_confirmed_at ?? null,
          role: user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'user',
          username: user.email?.split("@")[0] || '',
          banned_until: null,
        }]);
      }
    }
  }

  async function handleSetRole(userId: string, newRole: string) {
    try {
      const res = await fetch("/api/users/role", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError("Erro ao alterar privilégio: " + (data.error || "Erro desconhecido"));
      } else {
        setSuccess(`Privilégio alterado para ${newRole === 'admin' ? 'Administrador' : 'Usuário'}.`);
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
      const res = await fetch("/api/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newUsername, email: newEmail, password: newPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.error && (data.error.includes("duplicate") || data.error.includes("already registered") || data.error.includes("unique constraint"))) {
          setError(`O email ${newEmail} já está cadastrado no sistema.`);
        } else {
          setError(data.error || "Erro ao criar usuário.");
        }
      } else {
        setSuccess(`Usuário ${newUsername || newEmail.split("@")[0]} criado com sucesso!`);
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
      const res = await fetch("/api/users/reset-password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, newPassword: resetPasswordValue }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError("Erro ao redefinir senha: " + (data.error || "Erro desconhecido"));
      } else {
        const user = users.find(u => u.id === userId);
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
      const res = await fetch("/api/users/toggle-active", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, banDuration: currentlyBanned ? "none" : "876600h" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError("Erro ao alterar status: " + (data.error || "Erro desconhecido"));
      } else {
        const user = users.find(u => u.id === userId);
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
      const res = await fetch("/api/users/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError("Erro ao excluir usuário: " + (data.error || "Erro desconhecido"));
      } else {
        const user = users.find(u => u.id === id);
        const name = user?.username || email.split("@")[0];
        setSuccess(`Usuário ${name} excluído permanentemente.`);
        setUsers(users.filter((u) => u.id !== id));
      }
    } catch {
      setError("Erro de conexão ao excluir usuário.");
    }
    setDeleteConfirm(null);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <div className="text-sm" style={{ color: "var(--muted)" }}>Carregando...</div>
      </div>
    );
  }

  if (!isAdmin) return null;

  const activeUsers = users.filter(u => !u.banned_until);
  const bannedUsers = users.filter(u => !!u.banned_until);

  return (
    <DashboardLayout userEmail={userEmail}>
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
            <p className="text-xs" style={{ color: "var(--muted)" }}>Acesso restrito ao administrador</p>
          </div>
        </div>
        <button
          onClick={() => { setShowCreateModal(true); setError(null); setSuccess(null); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 cursor-pointer"
          style={{ color: "#ffffff", background: `linear-gradient(135deg, var(--accent-gradient-from), var(--accent-gradient-to))` }}
        >
          <Plus size={14} />
          Novo Usuário
        </button>
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
                    <p className="text-sm" style={{ color: "var(--muted)" }}>Nenhum usuário encontrado</p>
                  </div>
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const isConfirmed = !!user.email_confirmed_at;
                const isBanned = !!user.banned_until;
                const userRole = user.role || 'user';
                const isAdminUser = user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
                const isCurrentUser = user.email?.toLowerCase() === userEmail.toLowerCase();
                const displayName = user.username || user.email?.split("@")[0] || "Sem nome";

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
                            <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{displayName}</span>
                            {isCurrentUser && <span className="text-[9px]" style={{ color: "var(--muted)" }}>(você)</span>}
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
                      {isAdminUser ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent-text)" }}>
                          <Shield size={10} /> Administrador
                        </span>
                      ) : (
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
                              </select>
                              <button
                                onClick={() => setResetPasswordUser(user.id)}
                                className="p-1.5 rounded-lg transition-colors cursor-pointer"
                                style={{ color: "var(--muted)" }}
                                title="Redefinir senha"
                              >
                                <Key size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {!isAdminUser && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleToggleActive(user.id, isBanned)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isBanned ? "" : ""}`}
                            style={{ color: isBanned ? "var(--success)" : "var(--muted)" }}
                            title={isBanned ? "Reativar" : "Desativar"}
                          >
                            {isBanned ? <RotateCcw size={13} /> : <Lock size={13} />}
                          </button>
                          {deleteConfirm === user.id ? (
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
                              className="p-1.5 rounded-lg transition-colors cursor-pointer"
                              style={{ color: "var(--muted)" }}
                              title="Excluir permanentemente"
                            >
                              <Trash2 size={13} />
                            </button>
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
                <p className="text-[10px] mt-1" style={{ color: "var(--muted)" }}>Nome exibido no sistema. Se vazio, usa o prefixo do email.</p>
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