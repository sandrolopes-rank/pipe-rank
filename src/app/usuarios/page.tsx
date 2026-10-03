"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DashboardLayout } from "@/components/dashboard-layout";
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
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-[#525252] text-sm">Carregando...</div>
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
            style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(59,130,246,0.15))", border: "1px solid rgba(124,58,237,0.25)" }}
          >
            <Users size={18} style={{ color: "#a78bfa" }} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Gerenciamento de Usuários</h1>
            <p className="text-xs text-[#525252]">Acesso restrito ao administrador</p>
          </div>
        </div>
        <button
          onClick={() => { setShowCreateModal(true); setError(null); setSuccess(null); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90 cursor-pointer"
          style={{ background: "linear-gradient(135deg, #7c3aed, #3b82f6)" }}
        >
          <Plus size={14} />
          Novo Usuário
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-lg text-sm" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}>
          <AlertTriangle size={14} />
          {error}
          <button onClick={() => setError(null)} className="ml-auto cursor-pointer"><X size={12} /></button>
        </div>
      )}
      {success && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-lg text-sm" style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.3)", color: "#34d399" }}>
          <CheckCircle size={14} />
          {success}
          <button onClick={() => setSuccess(null)} className="ml-auto cursor-pointer"><X size={12} /></button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total", value: users.length, icon: Users, color: "#a78bfa" },
          { label: "Ativos", value: activeUsers.length, icon: UserCheck, color: "#34d399" },
          { label: "Desativados", value: bannedUsers.length, icon: Ban, color: "#f87171" },
          { label: "Pendentes", value: users.filter((u) => !u.email_confirmed_at).length, icon: UserX, color: "#fbbf24" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl p-4"
            style={{ background: "linear-gradient(135deg, rgba(26,26,26,0.8), rgba(17,17,17,0.9))", border: "1px solid #1e1e1e" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <stat.icon size={14} style={{ color: stat.color }} />
              <span className="text-xs text-[#737373]">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Users Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: "linear-gradient(135deg, rgba(26,26,26,0.6), rgba(17,17,17,0.8))", border: "1px solid #1e1e1e" }}
      >
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "1px solid #1e1e1e" }}>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#a3a3a3]">Usuário</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#a3a3a3]">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#a3a3a3]">Criado em</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#a3a3a3]">Último acesso</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#a3a3a3]">Privilégio</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#a3a3a3]">Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#1a1a1a] flex items-center justify-center">
                      <Users size={20} className="text-[#525252]" />
                    </div>
                    <p className="text-sm text-[#737373]">Nenhum usuário encontrado</p>
                  </div>
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const isConfirmed = !!user.email_confirmed_at;
                const isBanned = !!user.banned_until;
                const userRole = user.role || 'user';
                const isAdminRole = userRole === 'admin';
                const isCurrentUser = user.email.toLowerCase() === userEmail.toLowerCase();
                const displayName = user.username || user.email.split("@")[0];

                return (
                  <tr
                    key={user.id}
                    className="transition-colors hover:bg-[#1a1a1a]/50"
                    style={{ borderBottom: "1px solid rgba(30,30,30,0.5)", opacity: isBanned ? 0.6 : 1 }}
                  >
                    {/* User column */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold"
                          style={{ background: isBanned ? "rgba(248,113,113,0.15)" : "rgba(124,58,237,0.15)", color: isBanned ? "#f87171" : "#a78bfa" }}>
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-white">{displayName}</span>
                            {isCurrentUser && <span className="text-[9px] text-[#525252]">(você)</span>}
                          </div>
                          <span className="text-[10px] text-[#525252]">{user.email}</span>
                        </div>
                      </div>
                    </td>

                    {/* Status column */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {isBanned ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold w-fit"
                            style={{ background: "rgba(248,113,113,0.15)", color: "#f87171", border: "1px solid rgba(248,113,113,0.3)" }}>
                            <Ban size={10} /> Desativado
                          </span>
                        ) : isConfirmed ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold w-fit"
                            style={{ background: "rgba(52,211,153,0.15)", color: "#34d399", border: "1px solid rgba(52,211,153,0.3)" }}>
                            <UserCheck size={10} /> Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold w-fit"
                            style={{ background: "rgba(251,191,36,0.15)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.3)" }}>
                            <UserX size={10} /> Pendente
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Created at */}
                    <td className="px-4 py-3 text-xs text-[#737373]">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString("pt-BR") : "—"}
                    </td>

                    {/* Last sign in */}
                    <td className="px-4 py-3 text-xs text-[#737373]">
                      {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString("pt-BR") : "Nunca"}
                    </td>

                    {/* Privilege dropdown */}
                    <td className="px-4 py-3">
                      <div className="relative inline-block">
                        <select
                          value={userRole}
                          disabled={isCurrentUser}
                          onChange={(e) => handleSetRole(user.id, e.target.value)}
                          className="appearance-none text-[10px] font-semibold pl-6 pr-7 py-1 rounded-lg cursor-pointer focus:outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                          style={{
                            background: isAdminRole
                              ? "linear-gradient(135deg, rgba(124,58,237,0.15), rgba(124,58,237,0.08))"
                              : "linear-gradient(135deg, rgba(115,115,115,0.15), rgba(115,115,115,0.08))",
                            color: isAdminRole ? "#a78bfa" : "#a3a3a3",
                            border: `1px solid ${isAdminRole ? "rgba(124,58,237,0.3)" : "rgba(115,115,115,0.3)"}`,
                          }}
                          title={isCurrentUser ? "Não é possível alterar seu próprio privilégio" : "Alterar privilégio"}
                        >
                          <option value="user" style={{ background: "#1a1a1a", color: "#a3a3a3" }}>Usuário</option>
                          <option value="admin" style={{ background: "#1a1a1a", color: "#a78bfa" }}>Administrador</option>
                        </select>
                        <Shield size={10} className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none"
                          style={{ color: isAdminRole ? "#a78bfa" : "#737373" }} />
                        <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
                          style={{ color: isAdminRole ? "#a78bfa" : "#737373" }} />
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      {isCurrentUser ? (
                        <span className="text-[10px] text-[#404040]">—</span>
                      ) : (
                        <div className="flex items-center gap-1">
                          {/* Reset Password */}
                          {resetPasswordUser === user.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="password"
                                value={resetPasswordValue}
                                onChange={(e) => setResetPasswordValue(e.target.value)}
                                placeholder="Nova senha"
                                minLength={6}
                                className="w-24 bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2 py-1 text-[10px] text-white focus:outline-none focus:border-violet-500/50"
                              />
                              <button
                                onClick={() => handleResetPassword(user.id)}
                                disabled={resetSaving}
                                className="text-[10px] px-2 py-1 rounded text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer disabled:opacity-50"
                              >
                                {resetSaving ? "..." : "OK"}
                              </button>
                              <button
                                onClick={() => { setResetPasswordUser(null); setResetPasswordValue(""); }}
                                className="text-[10px] px-1 py-1 rounded text-[#737373] hover:bg-[#1a1a1a] transition-colors cursor-pointer"
                              >
                                <X size={10} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setResetPasswordUser(user.id); setResetPasswordValue(""); setError(null); }}
                              className="p-1.5 rounded-lg text-[#525252] hover:text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer"
                              title="Redefinir senha"
                            >
                              <Lock size={13} />
                            </button>
                          )}

                          {/* Toggle Active / Ban */}
                          <button
                            onClick={() => handleToggleActive(user.id, isBanned)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isBanned
                                ? "text-emerald-400 hover:bg-emerald-500/10"
                                : "text-[#525252] hover:text-amber-400 hover:bg-amber-500/10"
                            }`}
                            title={isBanned ? "Reativar usuário" : "Desativar usuário"}
                          >
                            {isBanned ? <RotateCcw size={13} /> : <Ban size={13} />}
                          </button>

                          {/* Delete */}
                          {deleteConfirm === user.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDeleteUser(user.id, user.email)}
                                className="text-[10px] px-2 py-1 rounded text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                              >
                                Sim
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="text-[10px] px-2 py-1 rounded text-[#737373] hover:bg-[#1a1a1a] transition-colors cursor-pointer"
                              >
                                Não
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(user.id)}
                              className="p-1.5 rounded-lg text-[#525252] hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
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
            style={{ background: "linear-gradient(135deg, #1a1a1a, #111111)", border: "1px solid #2a2a2a" }}
          >
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #1e1e1e" }}>
              <div className="flex items-center gap-2">
                <UserIcon size={16} style={{ color: "#a78bfa" }} />
                <h2 className="text-sm font-bold text-white">Criar Novo Usuário</h2>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-[#525252] hover:text-white transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#a3a3a3] mb-1.5">Nome de usuário</label>
                <div className="relative">
                  <UserIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#525252]" />
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="Ex: joao.silva"
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-[#525252] focus:outline-none focus:border-violet-500/50"
                  />
                </div>
                <p className="text-[10px] text-[#525252] mt-1">Nome exibido no sistema. Se vazio, usa o prefixo do email.</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#a3a3a3] mb-1.5">Email</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#525252]" />
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="usuario@rankmyapp.com.br"
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-[#525252] focus:outline-none focus:border-violet-500/50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#a3a3a3] mb-1.5">Senha temporária</label>
                <div className="relative">
                  <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#525252]" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-[#525252] focus:outline-none focus:border-violet-500/50"
                  />
                </div>
                <p className="text-[10px] text-[#525252] mt-1">O usuário deverá alterar a senha após o primeiro acesso</p>
              </div>
              {error && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}>
                  <AlertTriangle size={12} />
                  {error}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg text-sm text-[#a3a3a3] hover:text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-50 cursor-pointer"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #3b82f6)" }}
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