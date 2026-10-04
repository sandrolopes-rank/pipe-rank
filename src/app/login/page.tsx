"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Briefcase, Mail, Lock, Loader2, Globe, KeyRound } from "lucide-react";

const ALLOWED_DOMAIN = "rankmyapp.com.br";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Email ou senha inválidos. Verifique suas credenciais.");
      setLoading(false);
      return;
    }

    router.push("/overview");
    router.refresh();
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          hd: ALLOWED_DOMAIN,
        },
      },
    });

    if (error) {
      setError("Erro ao iniciar login com Google. Tente novamente.");
      setGoogleLoading(false);
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setResetLoading(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/recupera-senha`,
    });

    if (error) {
      setError("Erro ao enviar email de recuperação. Verifique o endereço.");
      setResetLoading(false);
      return;
    }

    setResetSent(true);
    setResetLoading(false);
  }

  if (showForgotPassword) {
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
            <p className="text-sm text-[var(--muted)] mt-1">Recuperar Senha</p>
          </div>

          <div
            className="rounded-2xl p-8 relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #141420 0%, #141414 60%)",
              border: "1px solid #222222",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            }}
          >
            {resetSent ? (
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                  <Mail size={20} className="text-emerald-400" />
                </div>
                <h2 className="text-lg font-semibold text-[var(--foreground)] mb-2">Email enviado!</h2>
                <p className="text-sm text-[var(--muted)] mb-6">
                  Verifique sua caixa de entrada em <strong className="text-[var(--foreground)]">{resetEmail}</strong> para redefinir sua senha.
                </p>
                <button
                  onClick={() => { setShowForgotPassword(false); setResetSent(false); setResetEmail(""); }}
                  className="w-full text-[var(--foreground)] text-sm font-medium py-2.5 rounded-lg transition-all cursor-pointer hover:opacity-90"
                  style={{
                    background: "linear-gradient(135deg, #7c3aed, #3b82f6)",
                    boxShadow: "0 4px 16px rgba(124, 58, 237, 0.3)",
                  }}
                >
                  Voltar ao Login
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-semibold text-[var(--foreground)] mb-1 relative">Esqueceu sua senha?</h2>
                <p className="text-xs text-[var(--muted)] mb-6 relative">
                  Informe seu email e enviaremos um link para redefinir sua senha.
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

                <form onSubmit={handleForgotPassword} className="space-y-4 relative">
                  <div>
                    <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">
                      Email institucional
                    </label>
                    <div className="relative">
                      <Mail
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
                      />
                      <input
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="seu.nome@rankmyapp.com.br"
                        required
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
                    disabled={resetLoading}
                    className="w-full text-[var(--foreground)] text-sm font-medium py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer hover:opacity-90 hover:shadow-xl disabled:opacity-50"
                    style={{
                      background: "linear-gradient(135deg, #7c3aed, #3b82f6)",
                      boxShadow: "0 4px 16px rgba(124, 58, 237, 0.3)",
                    }}
                  >
                    {resetLoading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      "Enviar link de recuperação"
                    )}
                  </button>
                </form>

                <button
                  onClick={() => { setShowForgotPassword(false); setError(""); }}
                  className="w-full mt-4 text-xs text-[var(--muted)] hover:text-[var(--muted)] transition-colors cursor-pointer"
                >
                  ← Voltar ao login
                </button>
              </>
            )}
          </div>

          <p className="text-center text-[10px] text-[var(--muted)] mt-6">
            Feito pela equipe RankMyApp
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
            <Briefcase size={28} className="text-[var(--foreground)]" />
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
          <p className="text-sm text-[var(--muted)] mt-1">Gestão de Oportunidades</p>
        </div>

        <div
          className="rounded-2xl p-8 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #141420 0%, #141414 60%)",
            border: "1px solid #222222",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          }}
        >
          <div
            className="absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl opacity-10 pointer-events-none"
            style={{ background: "radial-gradient(circle, #7c3aed, transparent)" }}
          />

          <h2 className="text-lg font-semibold text-[var(--foreground)] mb-1 relative">Entrar</h2>
          <p className="text-xs text-[var(--muted)] mb-6 relative">
            Use seu email institucional ou Google para acessar
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

          {/* Google OAuth Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 py-2.5 rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] hover:bg-[var(--card-border)] transition-all text-sm text-[var(--foreground)] font-medium mb-4 cursor-pointer disabled:opacity-50"
          >
            {googleLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Globe size={16} />
            )}
            Entrar com Google
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-[var(--input-border)]" />
            <span className="text-[10px] text-[var(--muted)] uppercase tracking-wider">ou</span>
            <div className="flex-1 h-px bg-[var(--input-border)]" />
          </div>

          <form onSubmit={handleLogin} className="space-y-4 relative">
            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">
                Email institucional
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.nome@rankmyapp.com.br"
                  required
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
                Senha
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
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </button>
          </form>

          <button
            onClick={() => { setShowForgotPassword(true); setError(""); }}
            className="w-full mt-4 text-xs text-[var(--muted)] hover:text-[var(--muted)] transition-colors cursor-pointer"
          >
            Esqueci minha senha
          </button>
        </div>

        <p className="text-center text-[10px] text-[var(--muted)] mt-6">
          Feito pela equipe RankMyApp
        </p>
      </div>
    </div>
  );
}