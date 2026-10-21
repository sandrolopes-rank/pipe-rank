// ============================================
// Registry de privilégios (RBAC por página/função)
// ============================================
// Fonte única de verdade das páginas e funções passíveis de controle
// por privilégio. O formulário de criação de privilégios (/usuarios)
// é renderizado a partir deste registry — adicionar uma página/função
// aqui a torna automaticamente configurável.

export const ADMIN_EMAIL = "sandro.lopes@rankmyapp.com.br";

// Níveis de acesso por página:
//   full     → abre a página e permite editar
//   readonly → abre a página só para visualização
//   disabled → aparece na sidebar cinza e não-clicável; rota bloqueada
//   hidden   → não aparece na sidebar; rota bloqueada
export type PageAccess = "full" | "readonly" | "disabled" | "hidden";

// Escopo de dados: o privilégio vê tudo ou apenas os dados atribuídos a ele
export type DataScope = "all" | "own";

export type PageKey =
  | "overview"
  | "elephan"
  | "recupera"
  | "renovacoes"
  | "analytics"
  | "alertas";

export interface FeatureDef {
  key: string;
  label: string;
  description: string;
}

export interface PageDef {
  key: PageKey;
  label: string;
  href: string;
  description: string;
  features: FeatureDef[];
}

export interface PageRule {
  access: PageAccess;
  scope: DataScope;
  features: Record<string, boolean>;
}

export interface PrivilegeConfig {
  pages: Record<PageKey, PageRule>;
}

export interface Privilege {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  is_system: boolean;
  config: PrivilegeConfig;
  created_at: string;
  updated_at: string;
}

// ---- Registry de páginas e funções ----
// Observação: "Gerenciamento de Usuários" (/usuarios) permanece
// exclusivo do admin por segurança (cria usuários e privilégios),
// por isso não faz parte do registry configurável.
export const PAGES: PageDef[] = [
  {
    key: "overview",
    label: "Overview",
    href: "/overview",
    description: "Dashboard principal e tabela de oportunidades",
    features: [
      { key: "kpis", label: "KPIs do topo", description: "Cards de Upsell/Cross Sell e Propostas em Andamento (com modais de detalhe)" },
      { key: "graficos", label: "Gráficos", description: "Upsell por mês, Mapa de calor e análise por status (com drill-down)" },
      { key: "tabela", label: "Tabela de oportunidades", description: "Lista com busca, filtros, colunas e exportação" },
    ],
  },
  {
    key: "elephan",
    label: "Elephan.AI",
    href: "/elephan",
    description: "Revenue intelligence das reuniões do time",
    features: [
      { key: "dashboard", label: "Navegar no dashboard mensal", description: "KPIs do mês, visões por dia/responsável/clientes e sentimentação (com navegação entre meses)" },
      { key: "alertas", label: "Quadro de alertas", description: "Alertas de sentimentação negativa e churn signals" },
      { key: "reunioes", label: "Ver dados da tabela de reuniões", description: "Lista de reuniões com filtros e modal de detalhe (transcrição, scorecard, gravação)" },
      { key: "playground", label: "API Playground", description: "Explorador da API da Elephan (botão no topo da página)" },
    ],
  },
  {
    key: "recupera",
    label: "Recupera",
    href: "/recupera",
    description: "Gestão de contas em risco de churn",
    features: [],
  },
  {
    key: "renovacoes",
    label: "Renovações",
    href: "/renovacoes",
    description: "Pipeline de renovações de contrato",
    features: [],
  },
  {
    key: "analytics",
    label: "Analytics",
    href: "/analytics",
    description: "Visões analíticas do pipeline",
    features: [],
  },
  {
    key: "alertas",
    label: "Alertas",
    href: "/alertas",
    description: "Histórico de alertas e auditoria",
    features: [],
  },
];

export const PAGE_MAP: Record<PageKey, PageDef> = Object.fromEntries(
  PAGES.map((p) => [p.key, p])
) as Record<PageKey, PageDef>;

export const ACCESS_OPTIONS: { value: PageAccess; label: string }[] = [
  { value: "full", label: "Acesso total" },
  { value: "readonly", label: "Somente visualização" },
  { value: "disabled", label: "Visível, bloqueada" },
  { value: "hidden", label: "Oculta" },
];

// ---- Configs padrão ----

export function defaultAdminConfig(): PrivilegeConfig {
  return {
    pages: {
      overview: { access: "full", scope: "all", features: { kpis: true, graficos: true, tabela: true } },
      elephan: { access: "full", scope: "all", features: { dashboard: true, alertas: true, reunioes: true, playground: true } },
      recupera: { access: "full", scope: "all", features: {} },
      renovacoes: { access: "full", scope: "all", features: {} },
      analytics: { access: "full", scope: "all", features: {} },
      alertas: { access: "full", scope: "all", features: {} },
    },
  };
}

export function defaultUserConfig(): PrivilegeConfig {
  return {
    pages: {
      overview: { access: "full", scope: "own", features: { kpis: true, graficos: true, tabela: true } },
      elephan: { access: "disabled", scope: "own", features: { dashboard: true, alertas: true, reunioes: true, playground: false } },
      recupera: { access: "disabled", scope: "own", features: {} },
      renovacoes: { access: "disabled", scope: "own", features: {} },
      analytics: { access: "hidden", scope: "own", features: {} },
      alertas: { access: "hidden", scope: "own", features: {} },
    },
  };
}

// Config inicial de um NOVO privilégio custom: tudo oculto, o admin
// habilita explicitamente o que o privilégio enxerga.
export function blankConfig(): PrivilegeConfig {
  return {
    pages: Object.fromEntries(
      PAGES.map((p) => [
        p.key,
        {
          access: "hidden" as PageAccess,
          scope: "own" as DataScope,
          features: Object.fromEntries(p.features.map((f) => [f.key, f.key !== "playground"])),
        },
      ])
    ) as Record<PageKey, PageRule>,
  };
}

const VALID_ACCESS: PageAccess[] = ["full", "readonly", "disabled", "hidden"];

// Normaliza uma config vinda do banco: preenche páginas/funções ausentes
// com defaults seguros (página ausente → oculta; função ausente em página
// acessível → liberada, pois função é refinamento e não portão).
export function normalizeConfig(raw: unknown): PrivilegeConfig {
  const base = blankConfig();
  const pages = (raw as { pages?: Record<string, Partial<PageRule>> } | null)?.pages;
  if (!pages || typeof pages !== "object") return base;
  for (const page of PAGES) {
    const rule = pages[page.key];
    if (!rule || typeof rule !== "object") continue;
    const access: PageAccess = VALID_ACCESS.includes(rule.access as PageAccess)
      ? (rule.access as PageAccess)
      : "hidden";
    const scope: DataScope = rule.scope === "all" ? "all" : "own";
    const features: Record<string, boolean> = {};
    for (const f of page.features) {
      const v = rule.features?.[f.key];
      features[f.key] = typeof v === "boolean" ? v : true;
    }
    base.pages[page.key] = { access, scope, features };
  }
  return base;
}

// Gera slug a partir do nome (usado como chave de atribuição no metadata do usuário)
export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036F]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

// Slugs reservados: não podem ser usados por privilégios custom
// ('admin' e 'usuario' são os slugs de sistema; 'user' é o role padrão do metadata)
export const RESERVED_SLUGS = new Set(["admin", "usuario", "user"]);
