"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { usePrivileges } from "@/lib/use-privileges";
import { ClipboardList, Plug, Network, Loader2 } from "lucide-react";

// ============================================
// Planos — anotações do admin (rascunho)
// ============================================
// Página de anotações, visível somente para o admin. Por enquanto é
// apenas um bloco de notas: nenhuma integração ou visualização foi
// implementada ainda. Ver as anotações abaixo.

export default function PlanosPage() {
  const priv = usePrivileges();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.resolve().then(() => {
      if (priv.loading) return;
      if (!priv.email) {
        window.location.href = "/login";
        return;
      }
      // Guarda por privilégio: admin tem acesso pleno; demais precisam da
      // página /planos habilitada no privilégio atribuído
      if (!priv.canOpen("planos")) {
        window.location.href = priv.homeHref === "/planos" ? "/overview" : priv.homeHref;
        return;
      }
      setReady(true);
    });
  }, [priv.loading, priv.email, priv.isAdmin, priv.homeHref]);

  if (!ready) {
    return (
      <DashboardLayout userEmail={priv.email}>
        <div className="flex items-center justify-center min-h-[60vh] gap-2" style={{ color: "var(--muted)" }}>
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">Carregando…</span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userEmail={priv.email}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--nav-active-bg)", border: "1px solid var(--nav-active-border)" }}
          >
            <ClipboardList size={18} style={{ color: "var(--accent-text)" }} />
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
              Planos
            </h1>
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              Anotações e planos futuros — visível somente para o admin
            </p>
          </div>
        </div>

        {/* Anotação 1: Conexão com a ClickUp */}
        <div
          className="rounded-xl p-4"
          style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Plug size={14} style={{ color: "var(--accent-text)" }} />
            <span className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>
              Conexão com a ClickUp
            </span>
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
              style={{ background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b" }}
            >
              A fazer
            </span>
          </div>
          <ul className="text-xs space-y-1.5 list-disc pl-4" style={{ color: "var(--muted)" }}>
            <li>
              Conectar a ClickUp para <span style={{ color: "var(--foreground)" }}>puxar e organizar aqui</span> todos
              os <span style={{ color: "var(--foreground)" }}>planos de 2026</span> que estão no pipeline.
            </li>
            <li>
              Trazer também todos os planos movidos para{" "}
              <span className="font-semibold" style={{ color: "var(--foreground)" }}>&quot;Pronto para envio&quot;</span>{" "}
              e que estão em{" "}
              <span className="font-semibold" style={{ color: "var(--foreground)" }}>&quot;Aguardando aprovação&quot;</span>.
            </li>
            <li>
              O <span style={{ color: "var(--foreground)" }}>link do documento deve ser clicável</span> em cada plano.
            </li>
          </ul>
        </div>

        {/* Anotação 2: Mapa vivo Force-directed network */}
        <div
          className="rounded-xl p-4"
          style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Network size={14} style={{ color: "var(--accent-text)" }} />
            <span className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>
              Mapa vivo — Force-directed network
            </span>
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
              style={{ background: "rgba(99, 102, 241, 0.15)", color: "#818cf8" }}
            >
              Ideia
            </span>
          </div>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            Pensar em um <span style={{ color: "var(--foreground)" }}>mapa vivo</span> do tipo{" "}
            <span className="font-semibold" style={{ color: "var(--foreground)" }}>Force-directed network</span>:
            visualização de rede com nós conectados por forças (ex.: planos, clientes e status interligados),
            dinâmica conforme os dados mudam.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
