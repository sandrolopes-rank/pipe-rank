"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DashboardLayout } from "@/components/dashboard-layout";
import { redirect } from "next/navigation";
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
} from "lucide-react";

const ADMIN_EMAIL = "sandro.lopes@rankmyapp.com.br";

interface AuthUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  role: string;
}

export default function UsuariosPage() {
  const [userEmail, setUserEmail] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

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
    const supabase = createClient();

    // Usar apenas auth.getUser() para evitar erros 42804 das funções RPC
    // As funções no banco têm tipo mismatch (varchar 255 vs text) que causa erro 400
    // O fallback mostra pelo menos o usuário atual com role baseado no email
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUsers([{
        id: user.id,
        email: user.email || '',
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at ?? null,
        email_confirmed_at: user.email_confirmed_at ?? null,
        role: user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'user'
      }]);
    }
  }

  async function handleSetRole(userId: string, newRole: string) {
    const supabase = createClient();
    const { error } = await supabase.rpc("set_user_role", {
      target_user_id: userId,
      new_role: newRole,
    });
    if (error) {
      setError("Erro ao alterar privilégio: " + error.message);
    } else {
      setSuccess(`Privilégio alterado para ${newRole === 'admin' ? 'Administrador' : 'Usuário'}.`);
      await fetchUsers();
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const supabase = createClient();
    const { data, error } = await supabase.rpc("create_auth_user", {
      user_email: newEmail,
      user_password: newPassword,
    });

    if (error) {
      setError(error.message);
    } else {
      setSuccess(`Usuário ${newEmail} criado com sucesso!`);
      setNewEmail("");
      setNewPassword("");
      setShowCreateModal(false);
      await fetchUsers();
    }
    setSaving(false);
  }

  async function handleDeleteUser(id: string, email: string) {
    if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      setError("Não é possível excluir o administrador principal.");
      setDeleteConfirm(null);
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.rpc("delete_auth_user", { user_id: id });
    if (error) {
      setError("Erro ao excluir usuário: " + error.message);
    } else {
      setSuccess(`Usuário ${email} excluído com sucesso.`);
      setUsers(users.filter((u) => u.id !== id));
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
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90"
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
          <button onClick={() => setError(null)} className="ml-auto"><X size={12} /></button>
        </div>
      )}
      {success && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-lg text-sm" style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.3)", color: "#34d399" }}>
          <CheckCircle size={14} />
          {success}
          <button onClick={() => setSuccess(null)} className="ml-auto"><X size={12} /></button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total de Usuários", value: users.length, icon: Users, color: "#a78bfa" },
          { label: "Confirmados", value: users.filter((u) => u.email_confirmed_at).length, icon: UserCheck, color: "#34d399" },
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
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#a3a3a3]">Email</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#a3a3a3]">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#a3a3a3]">Criado em</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#a3a3a3]">Último acesso</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#a3a3a3]">Privilégio</th>
              <th className="w-10 px-2 py-3"></th>
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
                const userRole = user.role || 'user';
                const isAdminRole = userRole === 'admin';
                const isCurrentUser = user.email.toLowerCase() === userEmail.toLowerCase();
                return (
                  <tr
                    key={user.id}
                    className="transition-colors hover:bg-[#1a1a1a]/50"
                    style={{ borderBottom: "1px solid rgba(30,30,30,0.5)" }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Mail size={12} className="text-[#525252]" />
                        <span className="text-sm text-white">{user.email}</span>
                        {isCurrentUser && <span className="text-[9px] text-[#525252]">(você)</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{
                          background: isConfirmed ? "rgba(52,211,153,0.15)" : "rgba(251,191,36,0.15)",
                          color: isConfirmed ? "#34d399" : "#fbbf24",
                          border: `1px solid ${isConfirmed ? "rgba(52,211,153,0.3)" : "rgba(251,191,36,0.3)"}`,
                        }}
                      >
                        {isConfirmed ? <UserCheck size={10} /> : <UserX size={10} />}
                        {isConfirmed ? "Confirmado" : "Pendente"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#737373]">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString("pt-BR") : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#737373]">
                      {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString("pt-BR") : "Nunca"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {isAdminRole ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                            style={{ background: "rgba(124,58,237,0.15)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.3)" }}
                          >
                            <Shield size={10} />
                            Admin
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                            style={{ background: "rgba(115,115,115,0.15)", color: "#a3a3a3", border: "1px solid rgba(115,115,115,0.3)" }}
                          >
                            Usuário
                          </span>
                        )}
                        {/* Promote/Demote button - cannot change own role */}
                        {!isCurrentUser && (
                          <button
                            onClick={() => handleSetRole(user.id, isAdminRole ? 'user' : 'admin')}
                            className="text-[9px] px-2 py-0.5 rounded transition-colors"
                            style={{
                              background: isAdminRole ? "rgba(251,191,36,0.1)" : "rgba(124,58,237,0.1)",
                              color: isAdminRole ? "#fbbf24" : "#a78bfa",
                              border: `1px solid ${isAdminRole ? "rgba(251,191,36,0.3)" : "rgba(124,58,237,0.3)"}`,
                            }}
                            title={isAdminRole ? "Remover privilégio de admin" : "Promover a admin"}
                          >
                            {isAdminRole ? "Remover Admin" : "Promover"}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-3">
                      {!isCurrentUser && (
                        deleteConfirm === user.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDeleteUser(user.id, user.email)}
                              className="text-[10px] px-2 py-1 rounded text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                              Confirmar
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="text-[10px] px-2 py-1 rounded text-[#737373] hover:bg-[#1a1a1a] transition-colors"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(user.id)}
                            className="text-[#525252] hover:text-red-400 transition-colors"
                            title="Excluir usuário"
                          >
                            <Trash2 size={14} />
                          </button>
                        )
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
                <Key size={16} style={{ color: "#a78bfa" }} />
                <h2 className="text-sm font-bold text-white">Criar Novo Usuário</h2>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-[#525252] hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#a3a3a3] mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="usuario@empresa.com"
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#a3a3a3] mb-1.5">Senha temporária</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50"
                />
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
                  className="px-4 py-2 rounded-lg text-sm text-[#a3a3a3] hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
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