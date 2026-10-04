"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  LifeBuoy,
  Briefcase,
  Bell,
  Users,
  LogOut,
  Sun,
  Moon,
  Palette,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useTheme } from "@/lib/theme/ThemeContext";

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
  const { paletteId, mode, setPaletteId, toggleMode, allPalettes } = useTheme();
  const [showPalettePicker, setShowPalettePicker] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside
      className="w-56 min-h-screen flex flex-col fixed left-0 top-0 z-30"
      style={{
        background: "var(--sidebar-bg)",
        borderRight: "1px solid var(--sidebar-border)",
      }}
    >
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-3" style={{ borderBottom: "1px solid var(--sidebar-border)" }}>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg"
          style={{
            background: `linear-gradient(135deg, var(--logo-gradient-from), var(--logo-gradient-to))`,
            boxShadow: `0 4px 12px rgba(0, 0, 0, 0.3)`,
          }}
        >
          <Briefcase size={16} className="text-white" />
        </div>
        <div>
          <h1
            className="text-sm font-bold leading-tight"
            style={{
              background: `linear-gradient(90deg, var(--logo-gradient-from), var(--logo-gradient-to))`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Rank CRM
          </h1>
          <p className="text-[10px] leading-tight" style={{ color: "var(--muted)" }}>Gestão de Receita</p>
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
                      background: "var(--nav-active-bg)",
                      color: "var(--foreground)",
                      fontWeight: 500,
                      border: "1px solid var(--nav-active-border)",
                    }
                  : {
                      color: "var(--muted)",
                      border: "1px solid transparent",
                    }
              }
            >
              <item.icon size={16} style={isActive ? { color: "var(--accent-text)" } : undefined} />
              <span className="flex-1">{item.label}</span>
              {item.href === "/overview" && activeCount !== undefined && activeCount > 0 && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center"
                  style={{
                    background: "var(--nav-active-bg)",
                    color: "var(--accent-text)",
                    border: "1px solid var(--nav-active-border)",
                  }}
                >
                  {activeCount}
                </span>
              )}
            </Link>
          );
        })}

        <div className="pt-4 pb-2 px-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
            Em Breve
          </span>
        </div>

        {upcomingItems.map((item) => {
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
                        background: "var(--nav-active-bg)",
                        color: "var(--foreground)",
                        fontWeight: 500,
                        border: "1px solid var(--nav-active-border)",
                      }
                    : {
                        color: "var(--muted)",
                        border: "1px solid transparent",
                      }
                }
              >
                <item.icon size={16} style={isActive ? { color: "var(--accent-text)" } : undefined} />
                {item.label}
              </Link>
            );
          }
          return (
            <div
              key={item.label}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-not-allowed"
              style={{ color: "var(--muted)", opacity: 0.5 }}
            >
              <item.icon size={16} />
              {item.label}
            </div>
          );
        })}
      </nav>

      {/* Theme Controls */}
      <div className="px-3 py-3 space-y-2" style={{ borderTop: "1px solid var(--sidebar-border)" }}>
        {/* Dark/Light Toggle */}
        <button
          onClick={toggleMode}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all cursor-pointer"
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--card-border)",
            color: "var(--foreground)",
          }}
        >
          {mode === "dark" ? <Sun size={13} /> : <Moon size={13} />}
          <span>{mode === "dark" ? "Modo Claro" : "Modo Escuro"}</span>
        </button>

        {/* Palette Picker */}
        <div className="relative">
          <button
            onClick={() => setShowPalettePicker(!showPalettePicker)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all cursor-pointer"
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--card-border)",
              color: "var(--foreground)",
            }}
          >
            <Palette size={13} style={{ color: "var(--accent-text)" }} />
            <span className="flex-1 text-left">
              {allPalettes.find(p => p.id === paletteId)?.emoji} {allPalettes.find(p => p.id === paletteId)?.name}
            </span>
            {showPalettePicker ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>

          {showPalettePicker && (
            <div
              className="absolute bottom-full left-0 right-0 mb-2 rounded-lg overflow-hidden shadow-xl max-h-60 overflow-y-auto z-50"
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--card-border)",
              }}
            >
              {allPalettes.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setPaletteId(p.id);
                    setShowPalettePicker(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-all cursor-pointer hover:opacity-80"
                  style={{
                    background: p.id === paletteId ? "var(--nav-active-bg)" : "transparent",
                    color: "var(--foreground)",
                    borderLeft: p.id === paletteId ? "2px solid var(--accent)" : "2px solid transparent",
                  }}
                >
                  <span
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${p.dark.accentGradientFrom}, ${p.dark.accentGradientTo})` }}
                  />
                  <span>{p.emoji} {p.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* User info */}
      <div className="px-4 py-4" style={{ borderTop: "1px solid var(--sidebar-border)" }}>
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{
              background: `linear-gradient(135deg, var(--logo-gradient-from), var(--logo-gradient-to))`,
            }}
          >
            {userEmail ? userEmail.charAt(0).toUpperCase() : "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate" style={{ color: "var(--foreground)" }}>
              {userEmail ? userEmail.split("@")[0] : "Usuário"}
            </p>
            <p className="text-[10px] truncate" style={{ color: "var(--muted)" }}>{userEmail || ""}</p>
          </div>
          <button
            onClick={handleLogout}
            className="transition-colors cursor-pointer"
            style={{ color: "var(--muted)" }}
            title="Sair"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}