"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Briefcase, Mail, Lock, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0a0a0a 0%, #0d0d1a 50%, #0a0a0a 100%)" }}
    >
      {/* Background glow accents */}
      <div
        className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-10 pointer-events-none"
        style={{ background: "radial-gradient(circle, #7c3aed, transparent)" }}
      />
      <div
        className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-10 pointer-events-none"
        style={{ background: "radial-gradient(circle, #3b82f6, transparent)" }}
      />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #3b82f6)",
              boxShadow: "0 8px 32px rgba(124, 58, 237, 0.35)",
            }}
          >
            <Briefcase size={28} className="text-white" />
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
          <p className="text-sm text-[#737373] mt-1">Gestão de Oportunidades</p>
        </div>

        {/* Login Form */}
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

          <h2 className="text-lg font-semibold text-white mb-1 relative">Entrar</h2>
          <p className="text-xs text-[#737373] mb-6 relative">
            Use seu email institucional para acessar
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

          <form onSubmit={handleLogin} className="space-y-4 relative">
            <div>
              <label className="block text-xs font-medium text-[#a3a3a3] mb-1.5">
                Email institucional
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#525252]"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.nome@empresa.com"
                  required
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-[#525252] focus:outline-none transition-all"
                  style={{}}
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
              <label className="block text-xs font-medium text-[#a3a3a3] mb-1.5">
                Senha
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#525252]"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-[#525252] focus:outline-none transition-all"
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
              className="w-full text-white text-sm font-medium py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer hover:opacity-90 hover:shadow-xl disabled:opacity-50"
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
        </div>

        <p className="text-center text-[10px] text-[#404040] mt-6">
          Feito pela equipe RankMyApp
        </p>
      </div>
    </div>
  );
}