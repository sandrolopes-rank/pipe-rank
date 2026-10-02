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
    <div className="flex min-h-screen">
      {/* Mobile: sidebar hidden; desktop: fixed sidebar (item 9 - responsive) */}
      <div className="hidden lg:block">
        <Sidebar userEmail={userEmail} activeCount={activeCount} />
      </div>
      <main className="flex-1 lg:ml-56">
        <div className="p-4 lg:p-6 max-w-[1400px] mx-auto">{children}</div>
        {/* Footer */}
        <footer className="border-t border-[#1e1e1e] py-6 text-center">
          <p className="text-xs text-[#525252]">
            Feito pela equipe{" "}
            <span className="font-semibold text-[#a3a3a3]">RankMyApp</span>
          </p>
        </footer>
      </main>
    </div>
  );
}