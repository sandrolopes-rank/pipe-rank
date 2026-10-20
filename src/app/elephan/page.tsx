"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DashboardLayout } from "@/components/dashboard-layout";
import {
  Sparkles,
  Loader2,
  KeyRound,
  Users,
  Gauge,
  Receipt,
  LifeBuoy,
  Webhook,
  HelpCircle,
  Compass,
  Layers,
  ListChecks,
  CheckCircle2,
  Circle,
} from "lucide-react";

const ADMIN_EMAIL = "sandro.lopes@rankmyapp.com.br";

// Domínios de dados a mapear na API da Elephan (escopo de descoberta)
const DOMINIOS = [
  {
    icon: KeyRound,
    cor: "#8b5cf6",
    titulo: "Autenticação & Acesso",
    topicos: [
      "Modelo de autenticação (API key, OAuth2, JWT)",
      "Ambiente de sandbox / testes",
      "Escopos e permissões por token",
      "Rate limits e política de uso",
      "Versionamento e deprecação de endpoints",
    ],
  },
  {
    icon: Users,
    cor: "#0ea5e9",
    titulo: "Clientes & Contratos",
    topicos: [
      "Cadastro e identificação dos clientes (IDs externos)",
      "Status e ciclo de vida do contrato",
      "Datas de renovação e vigência",
      "Planos contratados e upgrades/downgrades",
    ],
  },
  {
    icon: Gauge,
    cor: "#10b981",
    titulo: "Consumo & Uso",
    topicos: [
      "Métricas de uso da plataforma por cliente",
      "Limites do plano vs. consumo atual",
      "Histórico de consumo ao longo do tempo",
    ],
  },
  {
    icon: Receipt,
    cor: "#f59e0b",
    titulo: "Faturamento",
    topicos: [
      "Faturas emitidas e status de pagamento",
      "Valores contratados e recorrência",
      "Inadimplência e histórico de pagamentos",
    ],
  },
  {
    icon: LifeBuoy,
    cor: "#f43f5e",
    titulo: "Suporte & Saúde",
    topicos: [
      "Tickets de suporte e SLA",
      "NPS / CSAT por cliente",
      "Health score e sinais de churn",
    ],
  },
  {
    icon: Webhook,
    cor: "#06b6d4",
    titulo: "Eventos & Webhooks",
    topicos: [
      "Eventos disponíveis e payloads",
      "Webhooks de push vs. polling agendado",
      "Retentativas e garantia de entrega",
    ],
  },
];

// Perguntas a validar com a Elephan antes do desenvolvimento
const PERGUNTAS = [
  "Existe documentação pública da API (OpenAPI/Swagger)?",
  "Há ambiente de sandbox para testes sem impacto em produção?",
  "Como solicitar credenciais de acesso e quais escopos são concedidos?",
  "Qual o rate limit por token e por endpoint?",
  "Dados históricos estão disponíveis ou só o estado atual?",
  "A API suporta webhooks ou apenas consulta ativa (polling)?",
  "Há restrições de LGPD / consentimento para uso dos dados no CRM?",
  "Existe SLA contratual, status page e canal de suporte técnico?",
];

// Módulos do CRM que a API poderá alimentar
const MODULOS = [
  {
    titulo: "Renovações automáticas",
    descricao: "Dados de contrato e vigência alimentando a página Renovações sem digitação manual.",
  },
  {
    titulo: "Health Score do cliente",
    descricao: "Uso da plataforma + suporte gerando alertas de churn direto no sino de notificações.",
  },
  {
    titulo: "Sinais de upsell por consumo",
    descricao: "Limite do plano próximo de ser atingido → oportunidade de upsell no pipeline.",
  },
  {
    titulo: "Receita real no Overview",
    descricao: "Faturamento da Elephan comparado com a receita prevista das negociações.",
  },
];

// Roteiro até o ambiente definitivo
const PASSOS = [
  "Obter acesso: credenciais, documentação e sandbox da API",
  "Mapear endpoints e campos disponíveis (checklist acima)",
  "Protótipo de consulta no sandbox e validação dos dados",
  "Definir modelo de dados e estratégia de sincronização (polling vs. webhook)",
  "Desenvolver o ambiente definitivo no CRM",
];

export default function ElephanPage() {
  const [allowed, setAllowed] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [marcadas, setMarcadas] = useState<Record<number, boolean>>({});

  // Pagina "Em Breve" para usuarios comuns: somente admin acessa
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

  if (!allowed) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin" style={{ color: "var(--muted)" }} />
        </div>
      </DashboardLayout>
    );
  }

  const respondidas = Object.values(marcadas).filter(Boolean).length;

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
                Planejamento
              </span>
            </div>
            <p className="text-sm mt-2" style={{ color: "var(--muted)" }}>
              Preparação para a integração com a API da Elephan — escopo de descoberta antes do desenvolvimento.
            </p>
          </div>
        </div>

        {/* Objetivo */}
        <div
          className="relative overflow-hidden rounded-2xl p-5"
          style={{
            background: "linear-gradient(135deg, var(--card-bg) 0%, var(--background) 60%)",
            border: "1px solid var(--card-border)",
          }}
        >
          <div
            className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-20 pointer-events-none"
            style={{ background: "radial-gradient(circle, #8b5cf6, transparent)" }}
          />
          <div className="relative flex items-start gap-3">
            <Compass size={18} style={{ color: "#a78bfa", marginTop: 2, flexShrink: 0 }} />
            <div>
              <h2 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                Objetivo desta página
              </h2>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--muted)" }}>
                Antes de escrever qualquer integração, precisamos <span style={{ color: "var(--foreground)" }}>consultar e mapear
                quais dados a API da Elephan fornece</span>. Este documento organiza o escopo: os domínios de dados que
                queremos obter, as perguntas abertas para o time da Elephan e os módulos do CRM que essa integração
                poderá alimentar. Conforme a descoberta avança, esta página vira a referência do ambiente definitivo.
              </p>
            </div>
          </div>
        </div>

        {/* Descoberta da API — domínios de dados */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Layers size={14} style={{ color: "var(--accent-text)" }} />
            <h2 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
              O que consultar na API — domínios de dados
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {DOMINIOS.map((dominio) => (
              <div
                key={dominio.titulo}
                className="rounded-2xl p-5 flex flex-col"
                style={{
                  background: "var(--card-bg)",
                  border: "1px solid var(--card-border)",
                }}
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      background: `color-mix(in srgb, ${dominio.cor} 15%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${dominio.cor} 30%, transparent)`,
                    }}
                  >
                    <dominio.icon size={14} style={{ color: dominio.cor }} />
                  </div>
                  <h3 className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>
                    {dominio.titulo}
                  </h3>
                </div>
                <ul className="space-y-1.5">
                  {dominio.topicos.map((topico) => (
                    <li key={topico} className="flex items-start gap-1.5 text-[11px] leading-relaxed" style={{ color: "var(--muted)" }}>
                      <span
                        aria-hidden
                        className="w-1 h-1 rounded-full flex-shrink-0 mt-1.5"
                        style={{ background: dominio.cor }}
                      />
                      {topico}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Perguntas abertas para a Elephan */}
        <div
          className="rounded-2xl p-5"
          style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
        >
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <HelpCircle size={14} style={{ color: "#fbbf24" }} />
              <h2 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                Perguntas abertas para a Elephan
              </h2>
            </div>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(245, 158, 11, 0.15)", color: "#fbbf24" }}
            >
              {respondidas}/{PERGUNTAS.length} respondidas
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
            {PERGUNTAS.map((pergunta, idx) => (
              <button
                key={pergunta}
                onClick={() => setMarcadas((prev) => ({ ...prev, [idx]: !prev[idx] }))}
                className="flex items-start gap-2.5 py-2 text-left cursor-pointer transition-opacity hover:opacity-80"
                style={{ borderBottom: "1px solid var(--table-border)" }}
              >
                {marcadas[idx] ? (
                  <CheckCircle2 size={15} className="flex-shrink-0 mt-0.5" style={{ color: "#10b981" }} />
                ) : (
                  <Circle size={15} className="flex-shrink-0 mt-0.5" style={{ color: "var(--muted)", opacity: 0.5 }} />
                )}
                <span
                  className="text-xs leading-relaxed"
                  style={{
                    color: marcadas[idx] ? "var(--muted)" : "var(--foreground)",
                    textDecoration: marcadas[idx] ? "line-through" : "none",
                  }}
                >
                  {pergunta}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Módulos previstos no CRM */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ListChecks size={14} style={{ color: "var(--accent-text)" }} />
            <h2 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
              Módulos do CRM que a integração poderá alimentar
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MODULOS.map((modulo) => (
              <div
                key={modulo.titulo}
                className="rounded-xl px-4 py-3.5"
                style={{
                  background: "var(--card-bg)",
                  border: "1px solid var(--card-border)",
                  borderLeft: "3px solid var(--accent-text)",
                }}
              >
                <h3 className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>
                  {modulo.titulo}
                </h3>
                <p className="text-[11px] mt-1 leading-relaxed" style={{ color: "var(--muted)" }}>
                  {modulo.descricao}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Próximos passos */}
        <div
          className="rounded-2xl p-5"
          style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Compass size={14} style={{ color: "var(--accent-text)" }} />
            <h2 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
              Próximos passos
            </h2>
          </div>
          <div className="space-y-0">
            {PASSOS.map((passo, idx) => (
              <div key={passo} className="flex items-start gap-3">
                <div className="flex flex-col items-center flex-shrink-0">
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{
                      background: "var(--nav-active-bg)",
                      color: "var(--accent-text)",
                      border: "1px solid var(--nav-active-border)",
                    }}
                  >
                    {idx + 1}
                  </span>
                  {idx < PASSOS.length - 1 && (
                    <span
                      aria-hidden
                      className="w-px flex-1 min-h-[18px]"
                      style={{ background: "var(--table-border)" }}
                    />
                  )}
                </div>
                <p className="text-xs leading-relaxed pb-4 pt-1" style={{ color: "var(--muted)" }}>
                  {passo}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Nota de rodapé */}
        <p className="text-[10px] text-center pb-2" style={{ color: "var(--muted)", opacity: 0.7 }}>
          Escopo vivo — atualize esta página conforme a descoberta da API da Elephan avançar.
        </p>
      </div>
    </DashboardLayout>
  );
}
