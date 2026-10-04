"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { palettes, getPaletteById, type Palette } from "./palettes";
import { createClient } from "@/lib/supabase/client";

type ThemeMode = "dark" | "light";

interface ThemeContextType {
  palette: Palette;
  paletteId: string;
  mode: ThemeMode;
  setPaletteId: (id: string) => void;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  allPalettes: Palette[];
  loading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

function applyThemeToDOM(palette: Palette, mode: ThemeMode) {
  const colors = mode === "dark" ? palette.dark : palette.light;
  const root = document.documentElement;

  root.style.setProperty("--background", colors.background);
  root.style.setProperty("--foreground", colors.foreground);
  root.style.setProperty("--sidebar-bg", colors.sidebarBg);
  root.style.setProperty("--sidebar-border", colors.sidebarBorder);
  root.style.setProperty("--card-bg", colors.cardBg);
  root.style.setProperty("--card-border", colors.cardBorder);
  root.style.setProperty("--input-bg", colors.inputBg);
  root.style.setProperty("--input-border", colors.inputBorder);
  root.style.setProperty("--accent", colors.accent);
  root.style.setProperty("--accent-hover", colors.accentHover);
  root.style.setProperty("--accent-gradient-from", colors.accentGradientFrom);
  root.style.setProperty("--accent-gradient-to", colors.accentGradientTo);
  root.style.setProperty("--accent-text", colors.accentText);
  root.style.setProperty("--muted", colors.muted);
  root.style.setProperty("--table-header", colors.tableHeader);
  root.style.setProperty("--table-row-hover", colors.tableRowHover);
  root.style.setProperty("--table-border", colors.tableBorder);
  root.style.setProperty("--success", colors.success);
  root.style.setProperty("--warning", colors.warning);
  root.style.setProperty("--danger", colors.danger);
  root.style.setProperty("--logo-gradient-from", colors.logoGradientFrom);
  root.style.setProperty("--logo-gradient-to", colors.logoGradientTo);
  root.style.setProperty("--nav-active-bg", colors.navActiveBg);
  root.style.setProperty("--nav-active-border", colors.navActiveBorder);
  root.style.setProperty("--scrollbar-thumb", colors.scrollbarThumb);
  root.style.setProperty("--scrollbar-thumb-hover", colors.scrollbarThumbHover);

  // Set data attribute for mode
  root.setAttribute("data-theme-mode", mode);
}

async function saveThemeToSupabase(paletteId: string, mode: ThemeMode) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.auth.updateUser({
      data: {
        theme_palette: paletteId,
        theme_mode: mode,
      },
    });
  } catch (err) {
    console.error("Failed to save theme to Supabase:", err);
  }
}

async function loadThemeFromSupabase(): Promise<{ paletteId: string; mode: ThemeMode } | null> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.user_metadata) return null;

    const paletteId = user.user_metadata.theme_palette as string | undefined;
    const mode = user.user_metadata.theme_mode as ThemeMode | undefined;

    if (paletteId && mode) {
      return { paletteId, mode };
    }
    return null;
  } catch (err) {
    console.error("Failed to load theme from Supabase:", err);
    return null;
  }
}

function loadThemeFromLocalStorage(): { paletteId: string; mode: ThemeMode } | null {
  try {
    const saved = localStorage.getItem("rank-crm-theme");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.paletteId && parsed.mode) {
        return parsed;
      }
    }
    return null;
  } catch {
    return null;
  }
}

function saveThemeToLocalStorage(paletteId: string, mode: ThemeMode) {
  try {
    localStorage.setItem("rank-crm-theme", JSON.stringify({ paletteId, mode }));
  } catch {
    // Ignore localStorage errors
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [paletteId, setPaletteIdState] = useState<string>("violet");
  const [mode, setModeState] = useState<ThemeMode>("light");
  const [loading, setLoading] = useState(true);

  // Initialize theme on mount
  useEffect(() => {
    async function initTheme() {
      // Try Supabase first (for cross-device persistence)
      const supabaseTheme = await loadThemeFromSupabase();
      if (supabaseTheme) {
        setPaletteIdState(supabaseTheme.paletteId);
        setModeState(supabaseTheme.mode);
        saveThemeToLocalStorage(supabaseTheme.paletteId, supabaseTheme.mode);
      } else {
        // Fallback to localStorage
        const localTheme = loadThemeFromLocalStorage();
        if (localTheme) {
          setPaletteIdState(localTheme.paletteId);
          setModeState(localTheme.mode);
        }
      }
      setLoading(false);
    }
    initTheme();
  }, []);

  // Apply theme whenever palette or mode changes
  useEffect(() => {
    const palette = getPaletteById(paletteId);
    applyThemeToDOM(palette, mode);
    saveThemeToLocalStorage(paletteId, mode);
  }, [paletteId, mode]);

  const setPaletteId = useCallback((id: string) => {
    setPaletteIdState(id);
    saveThemeToSupabase(id, mode);
  }, [mode]);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    saveThemeToSupabase(paletteId, newMode);
  }, [paletteId]);

  const toggleMode = useCallback(() => {
    const newMode = mode === "dark" ? "light" : "dark";
    setModeState(newMode);
    saveThemeToSupabase(paletteId, newMode);
  }, [mode, paletteId]);

  const palette = getPaletteById(paletteId);

  return (
    <ThemeContext.Provider
      value={{
        palette,
        paletteId,
        mode,
        setPaletteId,
        setMode,
        toggleMode,
        allPalettes: palettes,
        loading,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}