"use client";

import { Sidebar } from "./sidebar";

export function DashboardLayout({
  children,
  userEmail,
  activeCount,
}: {
  children: React.ReactNode;
  userEmail?: string;
  activeCount?: number;
}) {
  return (
    <div className="flex min-h-screen" style={{ background: "var(--background)" }}>
      {/* Mobile: sidebar hidden; desktop: fixed sidebar */}
      <div className="hidden lg:block">
        <Sidebar userEmail={userEmail} activeCount={activeCount} />
      </div>
      <main className="flex-1 lg:ml-56">
        <div className="p-4 lg:p-6 max-w-[1400px] mx-auto">{children}</div>
        {/* Footer */}
        <footer className="py-6 text-center" style={{ borderTop: "1px solid var(--table-border)" }}>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            Feito pela equipe{" "}
            <span className="font-semibold" style={{ color: "var(--accent-text)" }}>RankMyApp</span>
          </p>
        </footer>
      </main>
    </div>
  );
}