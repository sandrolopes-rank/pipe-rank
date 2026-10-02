"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  LifeBuoy,
  Briefcase,
  Bell,
  Users,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const navItems = [
  { label: "Overview", href: "/overview", icon: LayoutDashboard },
  { label: "Recupera", href: "/recupera", icon: LifeBuoy },
];

const upcomingItems = [
  { label: "Alertas", icon: Bell },
  { label: "Usuários", icon: Users },
];

const ADMIN_EMAIL = "sandro.lopes@rankmyapp.com.br";

export function Sidebar({ userEmail, activeCount }: { userEmail?: string; activeCount?: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = userEmail?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside
      className="w-56 min-h-screen flex flex-col fixed left-0 top-0 z-30"
      style={{
        background: "linear-gradient(180deg, #0d0d0d 0%, #111111 100%)",
        borderRight: "1px solid #1e1e1e",
      }}
    >
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-3 border-b border-[#1e1e1e]">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg"
          style={{
            background: "linear-gradient(135deg, #7c3aed, #3b82f6)",
            boxShadow: "0 4px 12px rgba(124, 58, 237, 0.3)",
          }}
        >
          <Briefcase size={16} className="text-white" />
        </div>
        <div>
          <h1
            className="text-sm font-bold leading-tight"
            style={{
              background: "linear-gradient(90deg, #c4b5fd, #93c5fd)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Rank CRM
          </h1>
          <p className="text-[10px] text-[#737373] leading-tight">Gestão de Receita</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all"
              style={
                isActive
                  ? {
                      background: "linear-gradient(90deg, rgba(124,58,237,0.15), rgba(59,130,246,0.08))",
                      color: "#fff",
                      fontWeight: 500,
                      border: "1px solid rgba(124,58,237,0.25)",
                    }
                  : {
                      color: "#a3a3a3",
                      border: "1px solid transparent",
                    }
              }
            >
              <item.icon size={16} style={isActive ? { color: "#a78bfa" } : undefined} />
              <span className="flex-1">{item.label}</span>
              {/* Active count badge (test layer - item 8) */}
              {item.href === "/overview" && activeCount !== undefined && activeCount > 0 && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center"
                  style={{
                    background: "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(59,130,246,0.2))",
                    color: "#c4b5fd",
                    border: "1px solid rgba(124,58,237,0.3)",
                  }}
                >
                  {activeCount}
                </span>
              )}
            </Link>
          );
        })}

        <div className="pt-4 pb-2 px-3">
          <span className="text-[10px] font-semibold text-[#525252] uppercase tracking-wider">
            Em Breve
          </span>
        </div>

        {upcomingItems.map((item) => {
          // "Usuários" is clickable only for admin
          if (item.label === "Usuários" && isAdmin) {
            const isActive = pathname === "/usuarios";
            return (
              <Link
                key={item.label}
                href="/usuarios"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all"
                style={
                  isActive
                    ? {
                        background: "linear-gradient(90deg, rgba(124,58,237,0.15), rgba(59,130,246,0.08))",
                        color: "#fff",
                        fontWeight: 500,
                        border: "1px solid rgba(124,58,237,0.25)",
                      }
                    : {
                        color: "#a3a3a3",
                        border: "1px solid transparent",
                      }
                }
              >
                <item.icon size={16} style={isActive ? { color: "#a78bfa" } : undefined} />
                {item.label}
              </Link>
            );
          }
          return (
            <div
              key={item.label}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#525252] cursor-not-allowed"
            >
              <item.icon size={16} />
              {item.label}
            </div>
          );
        })}
      </nav>

      {/* User info */}
      <div className="px-4 py-4 border-t border-[#1e1e1e]">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #3b82f6)",
            }}
          >
            {userEmail ? userEmail.charAt(0).toUpperCase() : "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">
              {userEmail ? userEmail.split("@")[0] : "Usuário"}
            </p>
            <p className="text-[10px] text-[#525252] truncate">{userEmail || ""}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-[#525252] hover:text-white transition-colors cursor-pointer"
            title="Sair"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}