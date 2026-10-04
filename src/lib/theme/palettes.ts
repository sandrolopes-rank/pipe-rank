export interface Palette {
  id: string;
  name: string;
  emoji: string;
  // Dark mode colors
  dark: {
    background: string;
    foreground: string;
    sidebarBg: string;
    sidebarBorder: string;
    cardBg: string;
    cardBorder: string;
    inputBg: string;
    inputBorder: string;
    accent: string;
    accentHover: string;
    accentGradientFrom: string;
    accentGradientTo: string;
    accentText: string;
    muted: string;
    tableHeader: string;
    tableRowHover: string;
    tableBorder: string;
    success: string;
    warning: string;
    danger: string;
    logoGradientFrom: string;
    logoGradientTo: string;
    navActiveBg: string;
    navActiveBorder: string;
    scrollbarThumb: string;
    scrollbarThumbHover: string;
  };
  // Light mode colors
  light: {
    background: string;
    foreground: string;
    sidebarBg: string;
    sidebarBorder: string;
    cardBg: string;
    cardBorder: string;
    inputBg: string;
    inputBorder: string;
    accent: string;
    accentHover: string;
    accentGradientFrom: string;
    accentGradientTo: string;
    accentText: string;
    muted: string;
    tableHeader: string;
    tableRowHover: string;
    tableBorder: string;
    success: string;
    warning: string;
    danger: string;
    logoGradientFrom: string;
    logoGradientTo: string;
    navActiveBg: string;
    navActiveBorder: string;
    scrollbarThumb: string;
    scrollbarThumbHover: string;
  };
}

export const palettes: Palette[] = [
  {
    id: "violet",
    name: "Lilás",
    emoji: "💜",
    dark: {
      background: "#0a0a0a", foreground: "#ededed", sidebarBg: "#0d0d0d", sidebarBorder: "#1e1e1e",
      cardBg: "#141414", cardBorder: "#222222", inputBg: "#1a1a1a", inputBorder: "#2a2a2a",
      accent: "#7c3aed", accentHover: "#6d28d9", accentGradientFrom: "#7c3aed", accentGradientTo: "#3b82f6",
      accentText: "#c4b5fd", muted: "#737373", tableHeader: "#1a1a1a", tableRowHover: "#1a1a1a", tableBorder: "#1e1e1e",
      success: "#22c55e", warning: "#f59e0b", danger: "#ef4444",
      logoGradientFrom: "#7c3aed", logoGradientTo: "#3b82f6",
      navActiveBg: "rgba(124,58,237,0.15)", navActiveBorder: "rgba(124,58,237,0.25)",
      scrollbarThumb: "#333", scrollbarThumbHover: "#444",
    },
    light: {
      background: "#fafafa", foreground: "#171717", sidebarBg: "#ffffff", sidebarBorder: "#e5e5e5",
      cardBg: "#ffffff", cardBorder: "#e5e5e5", inputBg: "#f5f5f5", inputBorder: "#d4d4d4",
      accent: "#7c3aed", accentHover: "#6d28d9", accentGradientFrom: "#7c3aed", accentGradientTo: "#3b82f6",
      accentText: "#5b21b6", muted: "#737373", tableHeader: "#f5f5f5", tableRowHover: "#f5f5f5", tableBorder: "#e5e5e5",
      success: "#16a34a", warning: "#d97706", danger: "#dc2626",
      logoGradientFrom: "#7c3aed", logoGradientTo: "#3b82f6",
      navActiveBg: "rgba(124,58,237,0.1)", navActiveBorder: "rgba(124,58,237,0.2)",
      scrollbarThumb: "#d4d4d4", scrollbarThumbHover: "#a3a3a3",
    },
  },
  {
    id: "ocean",
    name: "Oceano",
    emoji: "🌊",
    dark: {
      background: "#0a0f1a", foreground: "#e0f2fe", sidebarBg: "#0c1220", sidebarBorder: "#1e3a5f",
      cardBg: "#0f1729", cardBorder: "#1e3a5f", inputBg: "#132038", inputBorder: "#1e3a5f",
      accent: "#0ea5e9", accentHover: "#0284c7", accentGradientFrom: "#0ea5e9", accentGradientTo: "#06b6d4",
      accentText: "#7dd3fc", muted: "#64748b", tableHeader: "#132038", tableRowHover: "#132038", tableBorder: "#1e3a5f",
      success: "#22c55e", warning: "#f59e0b", danger: "#ef4444",
      logoGradientFrom: "#0ea5e9", logoGradientTo: "#06b6d4",
      navActiveBg: "rgba(14,165,233,0.15)", navActiveBorder: "rgba(14,165,233,0.25)",
      scrollbarThumb: "#1e3a5f", scrollbarThumbHover: "#2563eb",
    },
    light: {
      background: "#f0f9ff", foreground: "#0c4a6e", sidebarBg: "#ffffff", sidebarBorder: "#bae6fd",
      cardBg: "#ffffff", cardBorder: "#bae6fd", inputBg: "#f0f9ff", inputBorder: "#7dd3fc",
      accent: "#0284c7", accentHover: "#0369a1", accentGradientFrom: "#0ea5e9", accentGradientTo: "#06b6d4",
      accentText: "#0369a1", muted: "#64748b", tableHeader: "#f0f9ff", tableRowHover: "#e0f2fe", tableBorder: "#bae6fd",
      success: "#16a34a", warning: "#d97706", danger: "#dc2626",
      logoGradientFrom: "#0ea5e9", logoGradientTo: "#06b6d4",
      navActiveBg: "rgba(14,165,233,0.1)", navActiveBorder: "rgba(14,165,233,0.2)",
      scrollbarThumb: "#bae6fd", scrollbarThumbHover: "#7dd3fc",
    },
  },
  {
    id: "emerald",
    name: "Esmeralda",
    emoji: "💚",
    dark: {
      background: "#0a0f0a", foreground: "#dcfce7", sidebarBg: "#0d120d", sidebarBorder: "#1a3a1a",
      cardBg: "#0f170f", cardBorder: "#1a3a1a", inputBg: "#132013", inputBorder: "#1a3a1a",
      accent: "#10b981", accentHover: "#059669", accentGradientFrom: "#10b981", accentGradientTo: "#34d399",
      accentText: "#6ee7b7", muted: "#6b7280", tableHeader: "#132013", tableRowHover: "#132013", tableBorder: "#1a3a1a",
      success: "#22c55e", warning: "#f59e0b", danger: "#ef4444",
      logoGradientFrom: "#10b981", logoGradientTo: "#34d399",
      navActiveBg: "rgba(16,185,129,0.15)", navActiveBorder: "rgba(16,185,129,0.25)",
      scrollbarThumb: "#1a3a1a", scrollbarThumbHover: "#22c55e",
    },
    light: {
      background: "#f0fdf4", foreground: "#14532d", sidebarBg: "#ffffff", sidebarBorder: "#bbf7d0",
      cardBg: "#ffffff", cardBorder: "#bbf7d0", inputBg: "#f0fdf4", inputBorder: "#86efac",
      accent: "#059669", accentHover: "#047857", accentGradientFrom: "#10b981", accentGradientTo: "#34d399",
      accentText: "#047857", muted: "#6b7280", tableHeader: "#f0fdf4", tableRowHover: "#dcfce7", tableBorder: "#bbf7d0",
      success: "#16a34a", warning: "#d97706", danger: "#dc2626",
      logoGradientFrom: "#10b981", logoGradientTo: "#34d399",
      navActiveBg: "rgba(16,185,129,0.1)", navActiveBorder: "rgba(16,185,129,0.2)",
      scrollbarThumb: "#bbf7d0", scrollbarThumbHover: "#86efac",
    },
  },
  {
    id: "rose",
    name: "Rosa",
    emoji: "🌹",
    dark: {
      background: "#0f0a0a", foreground: "#fce7f3", sidebarBg: "#120d0d", sidebarBorder: "#3a1a2a",
      cardBg: "#170f0f", cardBorder: "#3a1a2a", inputBg: "#201313", inputBorder: "#3a1a2a",
      accent: "#f43f5e", accentHover: "#e11d48", accentGradientFrom: "#f43f5e", accentGradientTo: "#ec4899",
      accentText: "#fda4af", muted: "#737373", tableHeader: "#201313", tableRowHover: "#201313", tableBorder: "#3a1a2a",
      success: "#22c55e", warning: "#f59e0b", danger: "#ef4444",
      logoGradientFrom: "#f43f5e", logoGradientTo: "#ec4899",
      navActiveBg: "rgba(244,63,94,0.15)", navActiveBorder: "rgba(244,63,94,0.25)",
      scrollbarThumb: "#3a1a2a", scrollbarThumbHover: "#f43f5e",
    },
    light: {
      background: "#fff1f2", foreground: "#881337", sidebarBg: "#ffffff", sidebarBorder: "#fecdd3",
      cardBg: "#ffffff", cardBorder: "#fecdd3", inputBg: "#fff1f2", inputBorder: "#fda4af",
      accent: "#e11d48", accentHover: "#be123c", accentGradientFrom: "#f43f5e", accentGradientTo: "#ec4899",
      accentText: "#be123c", muted: "#737373", tableHeader: "#fff1f2", tableRowHover: "#fce7f3", tableBorder: "#fecdd3",
      success: "#16a34a", warning: "#d97706", danger: "#dc2626",
      logoGradientFrom: "#f43f5e", logoGradientTo: "#ec4899",
      navActiveBg: "rgba(244,63,94,0.1)", navActiveBorder: "rgba(244,63,94,0.2)",
      scrollbarThumb: "#fecdd3", scrollbarThumbHover: "#fda4af",
    },
  },
  {
    id: "amber",
    name: "Âmbar",
    emoji: "🔥",
    dark: {
      background: "#0f0d0a", foreground: "#fef3c7", sidebarBg: "#12100d", sidebarBorder: "#3a2a1a",
      cardBg: "#17130f", cardBorder: "#3a2a1a", inputBg: "#201a13", inputBorder: "#3a2a1a",
      accent: "#f59e0b", accentHover: "#d97706", accentGradientFrom: "#f59e0b", accentGradientTo: "#ef4444",
      accentText: "#fcd34d", muted: "#737373", tableHeader: "#201a13", tableRowHover: "#201a13", tableBorder: "#3a2a1a",
      success: "#22c55e", warning: "#f59e0b", danger: "#ef4444",
      logoGradientFrom: "#f59e0b", logoGradientTo: "#ef4444",
      navActiveBg: "rgba(245,158,11,0.15)", navActiveBorder: "rgba(245,158,11,0.25)",
      scrollbarThumb: "#3a2a1a", scrollbarThumbHover: "#f59e0b",
    },
    light: {
      background: "#fffbeb", foreground: "#78350f", sidebarBg: "#ffffff", sidebarBorder: "#fde68a",
      cardBg: "#ffffff", cardBorder: "#fde68a", inputBg: "#fffbeb", inputBorder: "#fcd34d",
      accent: "#d97706", accentHover: "#b45309", accentGradientFrom: "#f59e0b", accentGradientTo: "#ef4444",
      accentText: "#b45309", muted: "#737373", tableHeader: "#fffbeb", tableRowHover: "#fef3c7", tableBorder: "#fde68a",
      success: "#16a34a", warning: "#d97706", danger: "#dc2626",
      logoGradientFrom: "#f59e0b", logoGradientTo: "#ef4444",
      navActiveBg: "rgba(245,158,11,0.1)", navActiveBorder: "rgba(245,158,11,0.2)",
      scrollbarThumb: "#fde68a", scrollbarThumbHover: "#fcd34d",
    },
  },
  {
    id: "cyan",
    name: "Ciano",
    emoji: "🧊",
    dark: {
      background: "#0a0f0f", foreground: "#cffafe", sidebarBg: "#0d1212", sidebarBorder: "#1a3a3a",
      cardBg: "#0f1717", cardBorder: "#1a3a3a", inputBg: "#132020", inputBorder: "#1a3a3a",
      accent: "#06b6d4", accentHover: "#0891b2", accentGradientFrom: "#06b6d4", accentGradientTo: "#3b82f6",
      accentText: "#67e8f9", muted: "#6b7280", tableHeader: "#132020", tableRowHover: "#132020", tableBorder: "#1a3a3a",
      success: "#22c55e", warning: "#f59e0b", danger: "#ef4444",
      logoGradientFrom: "#06b6d4", logoGradientTo: "#3b82f6",
      navActiveBg: "rgba(6,182,212,0.15)", navActiveBorder: "rgba(6,182,212,0.25)",
      scrollbarThumb: "#1a3a3a", scrollbarThumbHover: "#06b6d4",
    },
    light: {
      background: "#ecfeff", foreground: "#164e63", sidebarBg: "#ffffff", sidebarBorder: "#a5f3fc",
      cardBg: "#ffffff", cardBorder: "#a5f3fc", inputBg: "#ecfeff", inputBorder: "#67e8f9",
      accent: "#0891b2", accentHover: "#0e7490", accentGradientFrom: "#06b6d4", accentGradientTo: "#3b82f6",
      accentText: "#0e7490", muted: "#6b7280", tableHeader: "#ecfeff", tableRowHover: "#cffafe", tableBorder: "#a5f3fc",
      success: "#16a34a", warning: "#d97706", danger: "#dc2626",
      logoGradientFrom: "#06b6d4", logoGradientTo: "#3b82f6",
      navActiveBg: "rgba(6,182,212,0.1)", navActiveBorder: "rgba(6,182,212,0.2)",
      scrollbarThumb: "#a5f3fc", scrollbarThumbHover: "#67e8f9",
    },
  },
  {
    id: "indigo",
    name: "Índigo",
    emoji: "🔮",
    dark: {
      background: "#0a0a12", foreground: "#e0e7ff", sidebarBg: "#0d0d15", sidebarBorder: "#1e1e3a",
      cardBg: "#0f0f1a", cardBorder: "#1e1e3a", inputBg: "#131325", inputBorder: "#1e1e3a",
      accent: "#6366f1", accentHover: "#4f46e5", accentGradientFrom: "#6366f1", accentGradientTo: "#8b5cf6",
      accentText: "#a5b4fc", muted: "#6b7280", tableHeader: "#131325", tableRowHover: "#131325", tableBorder: "#1e1e3a",
      success: "#22c55e", warning: "#f59e0b", danger: "#ef4444",
      logoGradientFrom: "#6366f1", logoGradientTo: "#8b5cf6",
      navActiveBg: "rgba(99,102,241,0.15)", navActiveBorder: "rgba(99,102,241,0.25)",
      scrollbarThumb: "#1e1e3a", scrollbarThumbHover: "#6366f1",
    },
    light: {
      background: "#eef2ff", foreground: "#312e81", sidebarBg: "#ffffff", sidebarBorder: "#c7d2fe",
      cardBg: "#ffffff", cardBorder: "#c7d2fe", inputBg: "#eef2ff", inputBorder: "#a5b4fc",
      accent: "#4f46e5", accentHover: "#4338ca", accentGradientFrom: "#6366f1", accentGradientTo: "#8b5cf6",
      accentText: "#4338ca", muted: "#6b7280", tableHeader: "#eef2ff", tableRowHover: "#e0e7ff", tableBorder: "#c7d2fe",
      success: "#16a34a", warning: "#d97706", danger: "#dc2626",
      logoGradientFrom: "#6366f1", logoGradientTo: "#8b5cf6",
      navActiveBg: "rgba(99,102,241,0.1)", navActiveBorder: "rgba(99,102,241,0.2)",
      scrollbarThumb: "#c7d2fe", scrollbarThumbHover: "#a5b4fc",
    },
  },
  {
    id: "teal",
    name: "Teal",
    emoji: "🍃",
    dark: {
      background: "#0a0f0e", foreground: "#ccfbf1", sidebarBg: "#0d1211", sidebarBorder: "#1a3a35",
      cardBg: "#0f1715", cardBorder: "#1a3a35", inputBg: "#13201d", inputBorder: "#1a3a35",
      accent: "#14b8a6", accentHover: "#0d9488", accentGradientFrom: "#14b8a6", accentGradientTo: "#06b6d4",
      accentText: "#5eead4", muted: "#6b7280", tableHeader: "#13201d", tableRowHover: "#13201d", tableBorder: "#1a3a35",
      success: "#22c55e", warning: "#f59e0b", danger: "#ef4444",
      logoGradientFrom: "#14b8a6", logoGradientTo: "#06b6d4",
      navActiveBg: "rgba(20,184,166,0.15)", navActiveBorder: "rgba(20,184,166,0.25)",
      scrollbarThumb: "#1a3a35", scrollbarThumbHover: "#14b8a6",
    },
    light: {
      background: "#f0fdfa", foreground: "#134e4a", sidebarBg: "#ffffff", sidebarBorder: "#99f6e4",
      cardBg: "#ffffff", cardBorder: "#99f6e4", inputBg: "#f0fdfa", inputBorder: "#5eead4",
      accent: "#0d9488", accentHover: "#0f766e", accentGradientFrom: "#14b8a6", accentGradientTo: "#06b6d4",
      accentText: "#0f766e", muted: "#6b7280", tableHeader: "#f0fdfa", tableRowHover: "#ccfbf1", tableBorder: "#99f6e4",
      success: "#16a34a", warning: "#d97706", danger: "#dc2626",
      logoGradientFrom: "#14b8a6", logoGradientTo: "#06b6d4",
      navActiveBg: "rgba(20,184,166,0.1)", navActiveBorder: "rgba(20,184,166,0.2)",
      scrollbarThumb: "#99f6e4", scrollbarThumbHover: "#5eead4",
    },
  },
  {
    id: "orange",
    name: "Laranja",
    emoji: "🍊",
    dark: {
      background: "#0f0d0a", foreground: "#ffedd5", sidebarBg: "#12100d", sidebarBorder: "#3a2515",
      cardBg: "#17130f", cardBorder: "#3a2515", inputBg: "#201a13", inputBorder: "#3a2515",
      accent: "#f97316", accentHover: "#ea580c", accentGradientFrom: "#f97316", accentGradientTo: "#f59e0b",
      accentText: "#fdba74", muted: "#737373", tableHeader: "#201a13", tableRowHover: "#201a13", tableBorder: "#3a2515",
      success: "#22c55e", warning: "#f59e0b", danger: "#ef4444",
      logoGradientFrom: "#f97316", logoGradientTo: "#f59e0b",
      navActiveBg: "rgba(249,115,22,0.15)", navActiveBorder: "rgba(249,115,22,0.25)",
      scrollbarThumb: "#3a2515", scrollbarThumbHover: "#f97316",
    },
    light: {
      background: "#fff7ed", foreground: "#7c2d12", sidebarBg: "#ffffff", sidebarBorder: "#fed7aa",
      cardBg: "#ffffff", cardBorder: "#fed7aa", inputBg: "#fff7ed", inputBorder: "#fdba74",
      accent: "#ea580c", accentHover: "#c2410c", accentGradientFrom: "#f97316", accentGradientTo: "#f59e0b",
      accentText: "#c2410c", muted: "#737373", tableHeader: "#fff7ed", tableRowHover: "#ffedd5", tableBorder: "#fed7aa",
      success: "#16a34a", warning: "#d97706", danger: "#dc2626",
      logoGradientFrom: "#f97316", logoGradientTo: "#f59e0b",
      navActiveBg: "rgba(249,115,22,0.1)", navActiveBorder: "rgba(249,115,22,0.2)",
      scrollbarThumb: "#fed7aa", scrollbarThumbHover: "#fdba74",
    },
  },
  {
    id: "pink",
    name: "Pink",
    emoji: "🌸",
    dark: {
      background: "#0f0a0e", foreground: "#fce7f3", sidebarBg: "#120d11", sidebarBorder: "#3a1a30",
      cardBg: "#170f14", cardBorder: "#3a1a30", inputBg: "#20131a", inputBorder: "#3a1a30",
      accent: "#ec4899", accentHover: "#db2777", accentGradientFrom: "#ec4899", accentGradientTo: "#f43f5e",
      accentText: "#f9a8d4", muted: "#737373", tableHeader: "#20131a", tableRowHover: "#20131a", tableBorder: "#3a1a30",
      success: "#22c55e", warning: "#f59e0b", danger: "#ef4444",
      logoGradientFrom: "#ec4899", logoGradientTo: "#f43f5e",
      navActiveBg: "rgba(236,72,153,0.15)", navActiveBorder: "rgba(236,72,153,0.25)",
      scrollbarThumb: "#3a1a30", scrollbarThumbHover: "#ec4899",
    },
    light: {
      background: "#fdf2f8", foreground: "#831843", sidebarBg: "#ffffff", sidebarBorder: "#fbcfe8",
      cardBg: "#ffffff", cardBorder: "#fbcfe8", inputBg: "#fdf2f8", inputBorder: "#f9a8d4",
      accent: "#db2777", accentHover: "#be185d", accentGradientFrom: "#ec4899", accentGradientTo: "#f43f5e",
      accentText: "#be185d", muted: "#737373", tableHeader: "#fdf2f8", tableRowHover: "#fce7f3", tableBorder: "#fbcfe8",
      success: "#16a34a", warning: "#d97706", danger: "#dc2626",
      logoGradientFrom: "#ec4899", logoGradientTo: "#f43f5e",
      navActiveBg: "rgba(236,72,153,0.1)", navActiveBorder: "rgba(236,72,153,0.2)",
      scrollbarThumb: "#fbcfe8", scrollbarThumbHover: "#f9a8d4",
    },
  },
  {
    id: "slate",
    name: "Ardósia",
    emoji: "🪨",
    dark: {
      background: "#0a0a0a", foreground: "#e2e8f0", sidebarBg: "#0d0d0d", sidebarBorder: "#1e293b",
      cardBg: "#0f1218", cardBorder: "#1e293b", inputBg: "#131820", inputBorder: "#1e293b",
      accent: "#64748b", accentHover: "#475569", accentGradientFrom: "#64748b", accentGradientTo: "#94a3b8",
      accentText: "#cbd5e1", muted: "#64748b", tableHeader: "#131820", tableRowHover: "#131820", tableBorder: "#1e293b",
      success: "#22c55e", warning: "#f59e0b", danger: "#ef4444",
      logoGradientFrom: "#64748b", logoGradientTo: "#94a3b8",
      navActiveBg: "rgba(100,116,139,0.15)", navActiveBorder: "rgba(100,116,139,0.25)",
      scrollbarThumb: "#1e293b", scrollbarThumbHover: "#64748b",
    },
    light: {
      background: "#f8fafc", foreground: "#1e293b", sidebarBg: "#ffffff", sidebarBorder: "#cbd5e1",
      cardBg: "#ffffff", cardBorder: "#cbd5e1", inputBg: "#f1f5f9", inputBorder: "#94a3b8",
      accent: "#475569", accentHover: "#334155", accentGradientFrom: "#64748b", accentGradientTo: "#94a3b8",
      accentText: "#334155", muted: "#64748b", tableHeader: "#f1f5f9", tableRowHover: "#e2e8f0", tableBorder: "#cbd5e1",
      success: "#16a34a", warning: "#d97706", danger: "#dc2626",
      logoGradientFrom: "#64748b", logoGradientTo: "#94a3b8",
      navActiveBg: "rgba(100,116,139,0.1)", navActiveBorder: "rgba(100,116,139,0.2)",
      scrollbarThumb: "#cbd5e1", scrollbarThumbHover: "#94a3b8",
    },
  },
  {
    id: "red",
    name: "Vermelho",
    emoji: "❤️",
    dark: {
      background: "#0f0a0a", foreground: "#fee2e2", sidebarBg: "#120d0d", sidebarBorder: "#3a1a1a",
      cardBg: "#170f0f", cardBorder: "#3a1a1a", inputBg: "#201313", inputBorder: "#3a1a1a",
      accent: "#ef4444", accentHover: "#dc2626", accentGradientFrom: "#ef4444", accentGradientTo: "#f97316",
      accentText: "#fca5a5", muted: "#737373", tableHeader: "#201313", tableRowHover: "#201313", tableBorder: "#3a1a1a",
      success: "#22c55e", warning: "#f59e0b", danger: "#ef4444",
      logoGradientFrom: "#ef4444", logoGradientTo: "#f97316",
      navActiveBg: "rgba(239,68,68,0.15)", navActiveBorder: "rgba(239,68,68,0.25)",
      scrollbarThumb: "#3a1a1a", scrollbarThumbHover: "#ef4444",
    },
    light: {
      background: "#fef2f2", foreground: "#7f1d1d", sidebarBg: "#ffffff", sidebarBorder: "#fecaca",
      cardBg: "#ffffff", cardBorder: "#fecaca", inputBg: "#fef2f2", inputBorder: "#fca5a5",
      accent: "#dc2626", accentHover: "#b91c1c", accentGradientFrom: "#ef4444", accentGradientTo: "#f97316",
      accentText: "#b91c1c", muted: "#737373", tableHeader: "#fef2f2", tableRowHover: "#fee2e2", tableBorder: "#fecaca",
      success: "#16a34a", warning: "#d97706", danger: "#dc2626",
      logoGradientFrom: "#ef4444", logoGradientTo: "#f97316",
      navActiveBg: "rgba(239,68,68,0.1)", navActiveBorder: "rgba(239,68,68,0.2)",
      scrollbarThumb: "#fecaca", scrollbarThumbHover: "#fca5a5",
    },
  },
  {
    id: "lime",
    name: "Lima",
    emoji: "🍋",
    dark: {
      background: "#0a0f0a", foreground: "#ecfccb", sidebarBg: "#0d120d", sidebarBorder: "#2a3a1a",
      cardBg: "#0f170f", cardBorder: "#2a3a1a", inputBg: "#132013", inputBorder: "#2a3a1a",
      accent: "#84cc16", accentHover: "#65a30d", accentGradientFrom: "#84cc16", accentGradientTo: "#22c55e",
      accentText: "#bef264", muted: "#6b7280", tableHeader: "#132013", tableRowHover: "#132013", tableBorder: "#2a3a1a",
      success: "#22c55e", warning: "#f59e0b", danger: "#ef4444",
      logoGradientFrom: "#84cc16", logoGradientTo: "#22c55e",
      navActiveBg: "rgba(132,204,22,0.15)", navActiveBorder: "rgba(132,204,22,0.25)",
      scrollbarThumb: "#2a3a1a", scrollbarThumbHover: "#84cc16",
    },
    light: {
      background: "#f7fee7", foreground: "#365314", sidebarBg: "#ffffff", sidebarBorder: "#d9f99d",
      cardBg: "#ffffff", cardBorder: "#d9f99d", inputBg: "#f7fee7", inputBorder: "#bef264",
      accent: "#65a30d", accentHover: "#4d7c0f", accentGradientFrom: "#84cc16", accentGradientTo: "#22c55e",
      accentText: "#4d7c0f", muted: "#6b7280", tableHeader: "#f7fee7", tableRowHover: "#ecfccb", tableBorder: "#d9f99d",
      success: "#16a34a", warning: "#d97706", danger: "#dc2626",
      logoGradientFrom: "#84cc16", logoGradientTo: "#22c55e",
      navActiveBg: "rgba(132,204,22,0.1)", navActiveBorder: "rgba(132,204,22,0.2)",
      scrollbarThumb: "#d9f99d", scrollbarThumbHover: "#bef264",
    },
  },
  {
    id: "sky",
    name: "Céu",
    emoji: "☁️",
    dark: {
      background: "#0a0d12", foreground: "#e0f2fe", sidebarBg: "#0d1015", sidebarBorder: "#1a2a3a",
      cardBg: "#0f131a", cardBorder: "#1a2a3a", inputBg: "#131a25", inputBorder: "#1a2a3a",
      accent: "#38bdf8", accentHover: "#0ea5e9", accentGradientFrom: "#38bdf8", accentGradientTo: "#818cf8",
      accentText: "#7dd3fc", muted: "#64748b", tableHeader: "#131a25", tableRowHover: "#131a25", tableBorder: "#1a2a3a",
      success: "#22c55e", warning: "#f59e0b", danger: "#ef4444",
      logoGradientFrom: "#38bdf8", logoGradientTo: "#818cf8",
      navActiveBg: "rgba(56,189,248,0.15)", navActiveBorder: "rgba(56,189,248,0.25)",
      scrollbarThumb: "#1a2a3a", scrollbarThumbHover: "#38bdf8",
    },
    light: {
      background: "#f0f9ff", foreground: "#0c4a6e", sidebarBg: "#ffffff", sidebarBorder: "#bae6fd",
      cardBg: "#ffffff", cardBorder: "#bae6fd", inputBg: "#f0f9ff", inputBorder: "#7dd3fc",
      accent: "#0ea5e9", accentHover: "#0284c7", accentGradientFrom: "#38bdf8", accentGradientTo: "#818cf8",
      accentText: "#0284c7", muted: "#64748b", tableHeader: "#f0f9ff", tableRowHover: "#e0f2fe", tableBorder: "#bae6fd",
      success: "#16a34a", warning: "#d97706", danger: "#dc2626",
      logoGradientFrom: "#38bdf8", logoGradientTo: "#818cf8",
      navActiveBg: "rgba(56,189,248,0.1)", navActiveBorder: "rgba(56,189,248,0.2)",
      scrollbarThumb: "#bae6fd", scrollbarThumbHover: "#7dd3fc",
    },
  },
  {
    id: "fuchsia",
    name: "Fúcsia",
    emoji: "🦄",
    dark: {
      background: "#0f0a10", foreground: "#fae8ff", sidebarBg: "#120d13", sidebarBorder: "#3a1a3a",
      cardBg: "#170f18", cardBorder: "#3a1a3a", inputBg: "#201322", inputBorder: "#3a1a3a",
      accent: "#d946ef", accentHover: "#c026d3", accentGradientFrom: "#d946ef", accentGradientTo: "#8b5cf6",
      accentText: "#e879f9", muted: "#737373", tableHeader: "#201322", tableRowHover: "#201322", tableBorder: "#3a1a3a",
      success: "#22c55e", warning: "#f59e0b", danger: "#ef4444",
      logoGradientFrom: "#d946ef", logoGradientTo: "#8b5cf6",
      navActiveBg: "rgba(217,70,239,0.15)", navActiveBorder: "rgba(217,70,239,0.25)",
      scrollbarThumb: "#3a1a3a", scrollbarThumbHover: "#d946ef",
    },
    light: {
      background: "#fdf4ff", foreground: "#701a75", sidebarBg: "#ffffff", sidebarBorder: "#f5d0fe",
      cardBg: "#ffffff", cardBorder: "#f5d0fe", inputBg: "#fdf4ff", inputBorder: "#e879f9",
      accent: "#c026d3", accentHover: "#a21caf", accentGradientFrom: "#d946ef", accentGradientTo: "#8b5cf6",
      accentText: "#a21caf", muted: "#737373", tableHeader: "#fdf4ff", tableRowHover: "#fae8ff", tableBorder: "#f5d0fe",
      success: "#16a34a", warning: "#d97706", danger: "#dc2626",
      logoGradientFrom: "#d946ef", logoGradientTo: "#8b5cf6",
      navActiveBg: "rgba(217,70,239,0.1)", navActiveBorder: "rgba(217,70,239,0.2)",
      scrollbarThumb: "#f5d0fe", scrollbarThumbHover: "#e879f9",
    },
  },
  {
    id: "stone",
    name: "Pedra",
    emoji: "🏔️",
    dark: {
      background: "#0c0a09", foreground: "#e7e5e4", sidebarBg: "#100e0d", sidebarBorder: "#292524",
      cardBg: "#141210", cardBorder: "#292524", inputBg: "#1c1917", inputBorder: "#292524",
      accent: "#a8a29e", accentHover: "#78716c", accentGradientFrom: "#a8a29e", accentGradientTo: "#d6d3d1",
      accentText: "#d6d3d1", muted: "#78716c", tableHeader: "#1c1917", tableRowHover: "#1c1917", tableBorder: "#292524",
      success: "#22c55e", warning: "#f59e0b", danger: "#ef4444",
      logoGradientFrom: "#a8a29e", logoGradientTo: "#d6d3d1",
      navActiveBg: "rgba(168,162,158,0.15)", navActiveBorder: "rgba(168,162,158,0.25)",
      scrollbarThumb: "#292524", scrollbarThumbHover: "#a8a29e",
    },
    light: {
      background: "#fafaf9", foreground: "#292524", sidebarBg: "#ffffff", sidebarBorder: "#d6d3d1",
      cardBg: "#ffffff", cardBorder: "#d6d3d1", inputBg: "#f5f5f4", inputBorder: "#a8a29e",
      accent: "#78716c", accentHover: "#57534e", accentGradientFrom: "#a8a29e", accentGradientTo: "#d6d3d1",
      accentText: "#57534e", muted: "#78716c", tableHeader: "#f5f5f4", tableRowHover: "#e7e5e4", tableBorder: "#d6d3d1",
      success: "#16a34a", warning: "#d97706", danger: "#dc2626",
      logoGradientFrom: "#a8a29e", logoGradientTo: "#d6d3d1",
      navActiveBg: "rgba(168,162,158,0.1)", navActiveBorder: "rgba(168,162,158,0.2)",
      scrollbarThumb: "#d6d3d1", scrollbarThumbHover: "#a8a29e",
    },
  },
  {
    id: "blue",
    name: "Azul",
    emoji: "💙",
    dark: {
      background: "#0a0a12", foreground: "#dbeafe", sidebarBg: "#0d0d15", sidebarBorder: "#1e2a4a",
      cardBg: "#0f0f1a", cardBorder: "#1e2a4a", inputBg: "#131325", inputBorder: "#1e2a4a",
      accent: "#3b82f6", accentHover: "#2563eb", accentGradientFrom: "#3b82f6", accentGradientTo: "#6366f1",
      accentText: "#93c5fd", muted: "#6b7280", tableHeader: "#131325", tableRowHover: "#131325", tableBorder: "#1e2a4a",
      success: "#22c55e", warning: "#f59e0b", danger: "#ef4444",
      logoGradientFrom: "#3b82f6", logoGradientTo: "#6366f1",
      navActiveBg: "rgba(59,130,246,0.15)", navActiveBorder: "rgba(59,130,246,0.25)",
      scrollbarThumb: "#1e2a4a", scrollbarThumbHover: "#3b82f6",
    },
    light: {
      background: "#eff6ff", foreground: "#1e3a8a", sidebarBg: "#ffffff", sidebarBorder: "#bfdbfe",
      cardBg: "#ffffff", cardBorder: "#bfdbfe", inputBg: "#eff6ff", inputBorder: "#93c5fd",
      accent: "#2563eb", accentHover: "#1d4ed8", accentGradientFrom: "#3b82f6", accentGradientTo: "#6366f1",
      accentText: "#1d4ed8", muted: "#6b7280", tableHeader: "#eff6ff", tableRowHover: "#dbeafe", tableBorder: "#bfdbfe",
      success: "#16a34a", warning: "#d97706", danger: "#dc2626",
      logoGradientFrom: "#3b82f6", logoGradientTo: "#6366f1",
      navActiveBg: "rgba(59,130,246,0.1)", navActiveBorder: "rgba(59,130,246,0.2)",
      scrollbarThumb: "#bfdbfe", scrollbarThumbHover: "#93c5fd",
    },
  },
  {
    id: "yellow",
    name: "Amarelo",
    emoji: "⭐",
    dark: {
      background: "#0f0e0a", foreground: "#fef9c3", sidebarBg: "#12110d", sidebarBorder: "#3a3515",
      cardBg: "#17150f", cardBorder: "#3a3515", inputBg: "#201d13", inputBorder: "#3a3515",
      accent: "#eab308", accentHover: "#ca8a04", accentGradientFrom: "#eab308", accentGradientTo: "#f97316",
      accentText: "#fde047", muted: "#737373", tableHeader: "#201d13", tableRowHover: "#201d13", tableBorder: "#3a3515",
      success: "#22c55e", warning: "#f59e0b", danger: "#ef4444",
      logoGradientFrom: "#eab308", logoGradientTo: "#f97316",
      navActiveBg: "rgba(234,179,8,0.15)", navActiveBorder: "rgba(234,179,8,0.25)",
      scrollbarThumb: "#3a3515", scrollbarThumbHover: "#eab308",
    },
    light: {
      background: "#fefce8", foreground: "#713f12", sidebarBg: "#ffffff", sidebarBorder: "#fef08a",
      cardBg: "#ffffff", cardBorder: "#fef08a", inputBg: "#fefce8", inputBorder: "#fde047",
      accent: "#ca8a04", accentHover: "#a16207", accentGradientFrom: "#eab308", accentGradientTo: "#f97316",
      accentText: "#a16207", muted: "#737373", tableHeader: "#fefce8", tableRowHover: "#fef9c3", tableBorder: "#fef08a",
      success: "#16a34a", warning: "#d97706", danger: "#dc2626",
      logoGradientFrom: "#eab308", logoGradientTo: "#f97316",
      navActiveBg: "rgba(234,179,8,0.1)", navActiveBorder: "rgba(234,179,8,0.2)",
      scrollbarThumb: "#fef08a", scrollbarThumbHover: "#fde047",
    },
  },
  {
    id: "green",
    name: "Verde",
    emoji: "🌿",
    dark: {
      background: "#0a0f0a", foreground: "#dcfce7", sidebarBg: "#0d120d", sidebarBorder: "#1a3a1a",
      cardBg: "#0f170f", cardBorder: "#1a3a1a", inputBg: "#132013", inputBorder: "#1a3a1a",
      accent: "#22c55e", accentHover: "#16a34a", accentGradientFrom: "#22c55e", accentGradientTo: "#14b8a6",
      accentText: "#86efac", muted: "#6b7280", tableHeader: "#132013", tableRowHover: "#132013", tableBorder: "#1a3a1a",
      success: "#22c55e", warning: "#f59e0b", danger: "#ef4444",
      logoGradientFrom: "#22c55e", logoGradientTo: "#14b8a6",
      navActiveBg: "rgba(34,197,94,0.15)", navActiveBorder: "rgba(34,197,94,0.25)",
      scrollbarThumb: "#1a3a1a", scrollbarThumbHover: "#22c55e",
    },
    light: {
      background: "#f0fdf4", foreground: "#14532d", sidebarBg: "#ffffff", sidebarBorder: "#bbf7d0",
      cardBg: "#ffffff", cardBorder: "#bbf7d0", inputBg: "#f0fdf4", inputBorder: "#86efac",
      accent: "#16a34a", accentHover: "#15803d", accentGradientFrom: "#22c55e", accentGradientTo: "#14b8a6",
      accentText: "#15803d", muted: "#6b7280", tableHeader: "#f0fdf4", tableRowHover: "#dcfce7", tableBorder: "#bbf7d0",
      success: "#16a34a", warning: "#d97706", danger: "#dc2626",
      logoGradientFrom: "#22c55e", logoGradientTo: "#14b8a6",
      navActiveBg: "rgba(34,197,94,0.1)", navActiveBorder: "rgba(34,197,94,0.2)",
      scrollbarThumb: "#bbf7d0", scrollbarThumbHover: "#86efac",
    },
  },
  {
    id: "purple",
    name: "Púrpura",
    emoji: "👑",
    dark: {
      background: "#0d0a10", foreground: "#f3e8ff", sidebarBg: "#100d13", sidebarBorder: "#2a1a3a",
      cardBg: "#140f18", cardBorder: "#2a1a3a", inputBg: "#1a1322", inputBorder: "#2a1a3a",
      accent: "#a855f7", accentHover: "#9333ea", accentGradientFrom: "#a855f7", accentGradientTo: "#ec4899",
      accentText: "#d8b4fe", muted: "#737373", tableHeader: "#1a1322", tableRowHover: "#1a1322", tableBorder: "#2a1a3a",
      success: "#22c55e", warning: "#f59e0b", danger: "#ef4444",
      logoGradientFrom: "#a855f7", logoGradientTo: "#ec4899",
      navActiveBg: "rgba(168,85,247,0.15)", navActiveBorder: "rgba(168,85,247,0.25)",
      scrollbarThumb: "#2a1a3a", scrollbarThumbHover: "#a855f7",
    },
    light: {
      background: "#faf5ff", foreground: "#581c87", sidebarBg: "#ffffff", sidebarBorder: "#e9d5ff",
      cardBg: "#ffffff", cardBorder: "#e9d5ff", inputBg: "#faf5ff", inputBorder: "#d8b4fe",
      accent: "#9333ea", accentHover: "#7e22ce", accentGradientFrom: "#a855f7", accentGradientTo: "#ec4899",
      accentText: "#7e22ce", muted: "#737373", tableHeader: "#faf5ff", tableRowHover: "#f3e8ff", tableBorder: "#e9d5ff",
      success: "#16a34a", warning: "#d97706", danger: "#dc2626",
      logoGradientFrom: "#a855f7", logoGradientTo: "#ec4899",
      navActiveBg: "rgba(168,85,247,0.1)", navActiveBorder: "rgba(168,85,247,0.2)",
      scrollbarThumb: "#e9d5ff", scrollbarThumbHover: "#d8b4fe",
    },
  },
  {
    id: "midnight",
    name: "Meia-Noite",
    emoji: "🌙",
    dark: {
      background: "#050510", foreground: "#c7d2fe", sidebarBg: "#080815", sidebarBorder: "#151530",
      cardBg: "#0a0a1a", cardBorder: "#151530", inputBg: "#0d0d22", inputBorder: "#151530",
      accent: "#818cf8", accentHover: "#6366f1", accentGradientFrom: "#818cf8", accentGradientTo: "#c084fc",
      accentText: "#a5b4fc", muted: "#4b5563", tableHeader: "#0d0d22", tableRowHover: "#0d0d22", tableBorder: "#151530",
      success: "#22c55e", warning: "#f59e0b", danger: "#ef4444",
      logoGradientFrom: "#818cf8", logoGradientTo: "#c084fc",
      navActiveBg: "rgba(129,140,248,0.15)", navActiveBorder: "rgba(129,140,248,0.25)",
      scrollbarThumb: "#151530", scrollbarThumbHover: "#818cf8",
    },
    light: {
      background: "#eef2ff", foreground: "#312e81", sidebarBg: "#ffffff", sidebarBorder: "#c7d2fe",
      cardBg: "#ffffff", cardBorder: "#c7d2fe", inputBg: "#eef2ff", inputBorder: "#a5b4fc",
      accent: "#6366f1", accentHover: "#4f46e5", accentGradientFrom: "#818cf8", accentGradientTo: "#c084fc",
      accentText: "#4f46e5", muted: "#4b5563", tableHeader: "#eef2ff", tableRowHover: "#e0e7ff", tableBorder: "#c7d2fe",
      success: "#16a34a", warning: "#d97706", danger: "#dc2626",
      logoGradientFrom: "#818cf8", logoGradientTo: "#c084fc",
      navActiveBg: "rgba(129,140,248,0.1)", navActiveBorder: "rgba(129,140,248,0.2)",
      scrollbarThumb: "#c7d2fe", scrollbarThumbHover: "#a5b4fc",
    },
  },
  {
    id: "sunset",
    name: "Pôr do Sol",
    emoji: "🌅",
    dark: {
      background: "#0f0a08", foreground: "#fed7aa", sidebarBg: "#120d0a", sidebarBorder: "#3a2015",
      cardBg: "#17100d", cardBorder: "#3a2015", inputBg: "#201510", inputBorder: "#3a2015",
      accent: "#fb923c", accentHover: "#f97316", accentGradientFrom: "#fb923c", accentGradientTo: "#f43f5e",
      accentText: "#fdba74", muted: "#737373", tableHeader: "#201510", tableRowHover: "#201510", tableBorder: "#3a2015",
      success: "#22c55e", warning: "#f59e0b", danger: "#ef4444",
      logoGradientFrom: "#fb923c", logoGradientTo: "#f43f5e",
      navActiveBg: "rgba(251,146,60,0.15)", navActiveBorder: "rgba(251,146,60,0.25)",
      scrollbarThumb: "#3a2015", scrollbarThumbHover: "#fb923c",
    },
    light: {
      background: "#fff7ed", foreground: "#7c2d12", sidebarBg: "#ffffff", sidebarBorder: "#fed7aa",
      cardBg: "#ffffff", cardBorder: "#fed7aa", inputBg: "#fff7ed", inputBorder: "#fdba74",
      accent: "#f97316", accentHover: "#ea580c", accentGradientFrom: "#fb923c", accentGradientTo: "#f43f5e",
      accentText: "#ea580c", muted: "#737373", tableHeader: "#fff7ed", tableRowHover: "#ffedd5", tableBorder: "#fed7aa",
      success: "#16a34a", warning: "#d97706", danger: "#dc2626",
      logoGradientFrom: "#fb923c", logoGradientTo: "#f43f5e",
      navActiveBg: "rgba(251,146,60,0.1)", navActiveBorder: "rgba(251,146,60,0.2)",
      scrollbarThumb: "#fed7aa", scrollbarThumbHover: "#fdba74",
    },
  },
];

export function getPaletteById(id: string): Palette {
  return palettes.find((p) => p.id === id) || palettes[0];
}