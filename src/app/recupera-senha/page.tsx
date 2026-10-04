"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { KeyRound, Lock, Loader2, CheckCircle } from "lucide-react";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if we have a session (user came from reset email link)
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        // No session, redirect to login
        router.push("/login");
      }
    });
  }, [router]);

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      setError("Erro ao atualizar senha. Tente novamente.");
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);

    // Redirect to overview after 2 seconds
    setTimeout(() => {
      router.push("/overview");
    }, 2000);
  }

  if (success) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0a0a0a 0%, #0d0d1a 50%, #0a0a0a 100%)" }}
      >
        <div className="w-full max-w-md relative z-10 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2">Senha atualizada!</h1>
          <p className="text-sm text-[var(--muted)]">
            Sua senha foi redefinida com sucesso. Redirecionando...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0a0a0a 0%, #0d0d1a 50%, #0a0a0a 100%)" }}
    >
      <div
        className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-10 pointer-events-none"
        style={{ background: "radial-gradient(circle, #7c3aed, transparent)" }}
      />
      <div
        className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-10 pointer-events-none"
        style={{ background: "radial-gradient(circle, #3b82f6, transparent)" }}
      />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #3b82f6)",
              boxShadow: "0 8px 32px rgba(124, 58, 237, 0.35)",
            }}
          >
            <KeyRound size={28} className="text-[var(--foreground)]" />
          </div>
          <h1
            className="text-2xl font-bold"
            style={{
              background: "linear-gradient(90deg, #c4b5fd, #93c5fd)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Rank CRM
          </h1>
          <p className="text-sm text-[var(--muted)] mt-1">Redefinir Senha</p>
        </div>

        <div
          className="rounded-2xl p-8 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #141420 0%, #141414 60%)",
            border: "1px solid #222222",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          }}
        >
          <h2 className="text-lg font-semibold text-[var(--foreground)] mb-1 relative">Nova Senha</h2>
          <p className="text-xs text-[var(--muted)] mb-6 relative">
            Crie uma nova senha segura para sua conta.
          </p>

          {error && (
            <div
              className="rounded-lg p-3 mb-4 relative"
              style={{
                background: "linear-gradient(90deg, rgba(239,68,68,0.1), rgba(239,68,68,0.05))",
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleResetPassword} className="space-y-4 relative">
            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">
                Nova Senha
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg pl-10 pr-4 py-2.5 text-sm text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none transition-all"
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "rgba(124,58,237,0.5)";
                    e.currentTarget.style.boxShadow = "0 0 0 2px rgba(124,58,237,0.15)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#2a2a2a";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">
                Confirmar Senha
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg pl-10 pr-4 py-2.5 text-sm text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none transition-all"
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "rgba(124,58,237,0.5)";
                    e.currentTarget.style.boxShadow = "0 0 0 2px rgba(124,58,237,0.15)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#2a2a2a";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full text-[var(--foreground)] text-sm font-medium py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer hover:opacity-90 hover:shadow-xl disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #3b82f6)",
                boxShadow: "0 4px 16px rgba(124, 58, 237, 0.3)",
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Atualizando...
                </>
              ) : (
                "Atualizar Senha"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[10px] text-[var(--muted)] mt-6">
          Feito pela equipe RankMyApp
        </p>
      </div>
    </div>
  );
}