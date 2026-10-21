"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { usePrivileges } from "@/lib/use-privileges";
import { Inbox, Loader2 } from "lucide-react";

export default function RenovacoesPage() {
  const [allowed, setAllowed] = useState(false);
  // Email do usuario logado: mantem a sidebar em modo admin
  const [userEmail, setUserEmail] = useState("");
  const priv = usePrivileges();

  // Guarda por privilégio: abre quando o privilégio tem acesso à /renovacoes
  useEffect(() => {
    Promise.resolve().then(() => {
      if (priv.loading) return;
      if (!priv.email) {
        window.location.href = "/login";
        return;
      }
      if (!priv.canOpen("renovacoes")) {
        window.location.href = priv.homeHref === "/renovacoes" ? "/overview" : priv.homeHref;
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
              Renovações
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
              Gestão de renovações de contratos
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
            <Inbox size={32} style={{ color: "var(--muted)" }} />
          </div>
          <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--foreground)" }}>
            Em desenvolvimento
          </h2>
          <p className="text-sm max-w-md" style={{ color: "var(--muted)" }}>
            Esta página está sendo preparada. Em breve você poderá gerenciar todas as renovações de contratos aqui.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}