"use client";

import { DashboardLayout } from "@/components/dashboard-layout";
import { RefreshCw, Inbox } from "lucide-react";

export default function RenovacoesPage() {
  return (
    <DashboardLayout>
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