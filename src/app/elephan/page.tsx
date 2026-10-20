"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Sparkles, Loader2 } from "lucide-react";
import { ElephanPlayground } from "@/components/elephan-playground";
import { ElephanMeetings } from "@/components/elephan-meetings";
import { ElephanDashboard } from "@/components/elephan-dashboard";
import { ElephanAlerts } from "@/components/elephan-alerts";
import { carregarMes, lerCacheMes, cacheFresca, type ElephanTranscribeResumo } from "@/lib/elephan";
import { Play, X, ChevronLeft, ChevronRight } from "lucide-react";

const ADMIN_EMAIL = "sandro.lopes@rankmyapp.com.br";
const MESES_FULL = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const STORAGE_EXCLUIDOS = "elephan_sentimento_excluidos";

function normNome(nome: string): string {
  return nome.trim().toLowerCase().replace(/\s+/g, " ");
}

interface Periodo {
  inicio: Date;
  fim: Date;
  diasNoMes: number;
  label: string;
  atual: boolean;
}

export default function ElephanPage() {
  const [allowed, setAllowed] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [offsetMes, setOffsetMes] = useState(0); // 0 = mês atual, -1 = anterior...
  const [itens, setItens] = useState<ElephanTranscribeResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Pessoas removidas da sentimentação (gerenciadas pelo admin, compartilhado
  // entre o card do dashboard e o quadro de alertas)
  const [excluidos, setExcluidos] = useState<Set<string>>(new Set());
  const [showPlayground, setShowPlayground] = useState(false);
  const [cacheTs, setCacheTs] = useState<number | null>(null);
  // Abre o quadro de alertas automaticamente quando o admin vem do sino
  const [abrirQuadroAuto, setAbrirQuadroAuto] = useState(false);

  useEffect(() => {
    Promise.resolve().then(() => {
      try {
        const raw = localStorage.getItem(STORAGE_EXCLUIDOS);
        if (raw) setExcluidos(new Set(JSON.parse(raw)));
      } catch {
        // storage indisponível
      }
    });
  }, []);

  function alternarExclusao(nome: string) {
    const k = normNome(nome);
    setExcluidos((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      try {
        localStorage.setItem(STORAGE_EXCLUIDOS, JSON.stringify([...next]));
      } catch {
        // storage indisponível
      }
      return next;
    });
  }

  function restaurarExclusoes() {
    setExcluidos(new Set());
    try {
      localStorage.removeItem(STORAGE_EXCLUIDOS);
    } catch {
      // storage indisponível
    }
  }

  const periodo: Periodo = useMemo(() => {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth() + offsetMes, 1);
    const inicio = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
    const fim = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    return {
      inicio, fim,
      diasNoMes: fim.getDate(),
      label: `${MESES_FULL[d.getMonth()]} ${d.getFullYear()}`,
      atual: offsetMes === 0,
    };
  }, [offsetMes]);

  // Guarda de admin: somente admin acessa a camada de análise
  useEffect(() => {
    async function check() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        window.location.href = "/login";
        return;
      }
      if (user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
        window.location.href = "/overview";
        return;
      }
      setUserEmail(user.email);
      setAllowed(true);
    }
    check();
  }, []);

  // Carrega as transcrições do mês selecionado (uma fonte, compartilhada
  // entre dashboard e quadro de alertas). Estratégia: cache-first em
  // localStorage (stale-while-revalidate) — zero custo de dados no Supabase.
  const carregar = useCallback(async () => {
    await Promise.resolve(); // evita setState síncrono no corpo do effect (react-hooks)
    let apiKey = "";
    try {
      apiKey = localStorage.getItem("elephan_api_key") ?? "";
    } catch {
      // proxy usa a chave do .env
    }

    // 1) Serve do cache quando disponível (instantâneo, sem chamadas)
    const cache = lerCacheMes(periodo.inicio.toISOString().substring(0, 7));
    const fresco = cache && cacheFresca(cache.ts);
    if (cache) {
      setItens(cache.itens as unknown as ElephanTranscribeResumo[]);
      setCacheTs(cache.ts);
      setError(null);
      setLoading(false);
    }
    if (fresco) return; // dentro do TTL: zero chamadas à API

    // 2) Rede (primeira carga do mês ou revalidação de cache vencido)
    if (!cache) setLoading(true);
    setError(null);
    try {
      const r = await carregarMes(
        periodo.inicio.toISOString(),
        periodo.fim.toISOString(),
        apiKey
      );
      setItens(r.itens as unknown as ElephanTranscribeResumo[]);
      setCacheTs(r.ts);
    } catch (e) {
      // Com cache na tela, falha de rede não limpa os dados
      if (!cache) {
        setError(String(e instanceof Error ? e.message : e));
        setItens([]);
      }
    } finally {
      setLoading(false);
    }
  }, [periodo]);

  useEffect(() => {
    Promise.resolve().then(() => {
      if (allowed) carregar();
      // deep link do sino: abre o quadro de alertas
      if (new URLSearchParams(window.location.search).get("alertas") === "1") setAbrirQuadroAuto(true);
    });
  }, [allowed, carregar]);

  // Mesma página (SPA): o sino despacha o evento ao navegar
  useEffect(() => {
    const handler = () => setAbrirQuadroAuto(true);
    window.addEventListener("elephan-abrir-quadro", handler);
    return () => window.removeEventListener("elephan-abrir-quadro", handler);
  }, []);

  if (!allowed) {
    return (
      <DashboardLayout>
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
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: "linear-gradient(135deg, #8b5cf6, #06b6d4)",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.25)",
                }}
              >
                <Sparkles size={18} className="text-white" />
              </div>
              <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
                Elephan.AI
              </h1>
              <span
                className="text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider"
                style={{ background: "rgba(245, 158, 11, 0.15)", color: "#fbbf24" }}
              >
                Integração
              </span>
            </div>
            <p className="text-sm mt-2" style={{ color: "var(--muted)" }}>
              Reuniões do time capturadas pela Elephan, com resumo IA e link do CRM.
            </p>
          </div>
          {isAdminFlag(userEmail) && (
            <button
              onClick={() => setShowPlayground(true)}
              className="flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl transition-opacity hover:opacity-80 cursor-pointer flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #8b5cf6, #06b6d4)", color: "#fff" }}
              title="Explorar a API da Elephan"
            >
              <Play size={13} />
              API Playground
            </button>
          )}
        </div>

        {/* Navegação de período + selo de cache */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Dashboard de reuniões</h2>
            {cacheTs && (
              <span
                className="text-[9px] px-2 py-0.5 rounded-full"
                style={{ background: "var(--input-bg)", color: "var(--muted)", border: "1px solid var(--input-border)" }}
                title="Dados servidos do cache local — revalidados a cada 15 minutos"
              >
                dados de {new Date(cacheTs).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
          <div
            className="flex items-center gap-2 rounded-lg px-2 py-1.5"
            style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}
          >
            <button
              onClick={() => setOffsetMes((o) => o - 1)}
              className="p-1 rounded transition-opacity hover:opacity-80 cursor-pointer"
              style={{ color: "var(--muted)" }}
              title="Mês anterior"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs font-semibold min-w-[110px] text-center" style={{ color: "var(--foreground)" }}>
              {periodo.label}
            </span>
            <button
              onClick={() => setOffsetMes((o) => Math.min(0, o + 1))}
              disabled={periodo.atual}
              className="p-1 rounded transition-opacity hover:opacity-80 cursor-pointer disabled:opacity-30"
              style={{ color: "var(--muted)" }}
              title="Mês seguinte"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Quadro de alertas — abaixo do botão de período */}
        <ElephanAlerts itens={itens} periodo={{ label: periodo.label }} excluidos={excluidos} autoAbrir={abrirQuadroAuto} />

        {/* Dashboard de reuniões */}
        <ElephanDashboard
          itens={itens}
          periodo={periodo}
          loading={loading}
          error={error}
          excluidos={excluidos}
          onToggleExclusao={alternarExclusao}
          onRestoreExclusoes={restaurarExclusoes}
        />

        {/* Painel de reuniões (transcrições da Elephan) */}
        <ElephanMeetings />
      </div>

      {/* Modal do API Playground — somente admin */}
      {showPlayground && isAdminFlag(userEmail) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--table-border)" }}>
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #8b5cf6, #06b6d4)" }}
                >
                  <Play size={14} className="text-white" />
                </div>
                <h2 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>API Playground</h2>
              </div>
              <button onClick={() => setShowPlayground(false)} className="transition-colors cursor-pointer" style={{ color: "var(--muted)" }}>
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4">
              <ElephanPlayground />
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

function isAdminFlag(email: string): boolean {
  return email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}
