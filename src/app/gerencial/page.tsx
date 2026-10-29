"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { usePrivileges } from "@/lib/use-privileges";
import { Loader2, PieChart } from "lucide-react";

// Página Gerencial (em construção). Visível SOMENTE para Admin: o registry
// nasce com a página "hidden" em todos os privilégios não-admin e o guard
// abaixo redireciona qualquer acesso direto por URL.
export default function GerencialPage() {
  const [allowed, setAllowed] = useState(false);
  // Email do usuario logado: mantem a sidebar em modo admin
  const [userEmail, setUserEmail] = useState("");
  const priv = usePrivileges();

  // Guarda por privilégio: abre quando o privilégio tem acesso à /gerencial
  useEffect(() => {
    Promise.resolve().then(() => {
      if (priv.loading) return;
      if (!priv.email) {
        window.location.href = "/login";
        return;
      }
      if (!priv.canOpen("gerencial")) {
        window.location.href = priv.homeHref === "/gerencial" ? "/overview" : priv.homeHref;
        return;
      }
      setUserEmail(priv.email);
      setAllowed(true);
    });
  }, [priv]);

  if (!allowed) {
    return (
      <DashboardLayout userEmail={userEmail}>
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin" style={{ color: "var(--muted)" }} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userEmail={userEmail}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
              Gerencial
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
              Visão gerencial do pipeline
            </p>
          </div>
        </div>

        {/* Empty State */}
        <div
          className="rounded-2xl p-12 flex flex-col items-center justify-center text-center"
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--card-border)",
          }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
            style={{ background: "var(--input-bg)" }}
          >
            <PieChart size={32} style={{ color: "var(--muted)" }} />
          </div>
          <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--foreground)" }}>
            Em breve
          </h2>
          <p className="text-sm max-w-md" style={{ color: "var(--muted)" }}>
            Esta página está sendo preparada. Aqui entrarão as visões gerenciais do pipeline.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
