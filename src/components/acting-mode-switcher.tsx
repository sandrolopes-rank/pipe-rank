"use client";

// Seletor de modo de atuação (exclusivo do master): Admin pleno ou assumir um
// privilégio — no modo assumido vale exatamente o que aquele privilégio libera.
// Dropdown refinado (drop-up, fecha com clique fora/Esc, badge por rank,
// marcação do item ativo) substituindo o par botão+select nativo.
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Crown, Shield, User, Users, type LucideIcon } from "lucide-react";
import type { PrivilegeRank } from "@/lib/privileges";

export interface ActingChoice {
  slug: string;
  name: string;
  rank: PrivilegeRank;
}

const RANK_LABEL: Record<PrivilegeRank, string> = {
  admin: "Admin",
  lider: "Líder",
  gerente: "Gerente",
  colaborador: "Colaborador",
};

const RANK_ICON: Record<PrivilegeRank, LucideIcon> = {
  admin: Shield,
  lider: Crown,
  gerente: Users,
  colaborador: User,
};

function Row({
  icon: Icone,
  title,
  subtitle,
  active,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors cursor-pointer"
      style={{
        background: active
          ? `linear-gradient(135deg, var(--accent-gradient-from), var(--accent-gradient-to))`
          : "transparent",
        color: active ? "#ffffff" : "var(--foreground)",
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = "var(--nav-active-bg)";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = "transparent";
      }}
    >
      <span
        className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
        style={{
          background: active ? "rgba(255,255,255,0.18)" : "var(--input-bg)",
        }}
      >
        <Icone size={12} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-xs font-semibold truncate">{title}</span>
        {subtitle && (
          <span
            className="block text-[10px] truncate"
            style={{ color: active ? "rgba(255,255,255,0.75)" : "var(--muted)" }}
          >
            {subtitle}
          </span>
        )}
      </span>
      {active && <Check size={14} className="flex-shrink-0" />}
    </button>
  );
}

export function ActingModeSwitcher({
  mode,
  choices,
  onSetMode,
}: {
  mode: string;
  choices: ActingChoice[];
  onSetMode: (m: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Fecha com clique fora ou Esc
  useEffect(() => {
    if (!open) return;
    function handleOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const assumido = mode === "admin" ? null : choices.find((c) => c.slug === mode) ?? null;
  const IconeAtual: LucideIcon = assumido ? RANK_ICON[assumido.rank] ?? User : Shield;

  return (
    <div className="relative mb-2" ref={ref}>
      {/* Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer"
        style={{
          background: assumido
            ? `linear-gradient(135deg, var(--accent-gradient-from), var(--accent-gradient-to))`
            : "var(--input-bg)",
          border: `1px solid ${assumido ? "transparent" : "var(--input-border)"}`,
          color: assumido ? "#ffffff" : "var(--foreground)",
        }}
      >
        <span
          className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
          style={{ background: assumido ? "rgba(255,255,255,0.18)" : "var(--nav-active-bg)" }}
        >
          <IconeAtual size={11} />
        </span>
        <span className="flex-1 text-left truncate">
          {assumido ? assumido.name : "Admin"}
          <span
            className="ml-1.5 text-[9px] font-bold uppercase tracking-wider"
            style={{ color: assumido ? "rgba(255,255,255,0.75)" : "var(--muted)" }}
          >
            {assumido ? `· ${RANK_LABEL[assumido.rank]}` : "· pleno"}
          </span>
        </span>
        <ChevronDown
          size={12}
          className="flex-shrink-0 transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "none" }}
        />
      </button>

      {/* Painel (drop-up) */}
      {open && (
        <div
          role="listbox"
          className="absolute bottom-full left-0 right-0 mb-1.5 rounded-xl overflow-hidden z-50"
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--card-border)",
            boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
          }}
        >
          <div
            className="px-3 pt-2.5 pb-1 text-[9px] font-bold uppercase tracking-wider"
            style={{ color: "var(--muted)" }}
          >
            Modo de atuação
          </div>
          <Row
            icon={Shield}
            title="Admin"
            subtitle="Acesso pleno ao sistema"
            active={mode === "admin"}
            onClick={() => {
              onSetMode("admin");
              setOpen(false);
            }}
          />
          <div className="my-1" style={{ borderTop: "1px solid var(--card-border)" }} />
          <div
            className="px-3 pb-1 text-[9px] font-bold uppercase tracking-wider"
            style={{ color: "var(--muted)" }}
          >
            Assumir privilégio
          </div>
          {choices.length === 0 ? (
            <div className="px-3 py-2.5 text-[11px]" style={{ color: "var(--muted)" }}>
              Nenhum privilégio disponível além do Admin.
            </div>
          ) : (
            choices.map((c) => {
              const Icone = RANK_ICON[c.rank] ?? User;
              return (
                <Row
                  key={c.slug}
                  icon={Icone}
                  title={c.name}
                  subtitle={RANK_LABEL[c.rank]}
                  active={mode === c.slug}
                  onClick={() => {
                    onSetMode(c.slug);
                    setOpen(false);
                  }}
                />
              );
            })
          )}
          <div className="h-1" />
        </div>
      )}
    </div>
  );
}
