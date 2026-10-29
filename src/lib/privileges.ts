// ============================================
// Registry de privilégios (RBAC por página/função)
// ============================================
// Fonte única de verdade das páginas e funções passíveis de controle
// por privilégio. O formulário de criação de privilégios (/usuarios)
// é renderizado a partir deste registry.
//
// A lista de páginas é MESCLADA de duas fontes:
//   1. PAGES_MANUAL (abaixo): páginas com label/descrição/funções granulares
//   2. AUTO_PAGES (src/lib/privileges-pages.generated.ts): TODAS as rotas
//      reais do app, gerada automaticamente em predev/prebuild por
//      scripts/gen-privileges-pages.mjs a partir de src/app/**/page.tsx
//
// Páginas novas aparecem sozinhas no formulário de privilégios, com
// acesso padrão "Oculta" (a segurança exige habilitação explícita).

import { AUTO_PAGES } from "./privileges-pages.generated";

export const ADMIN_EMAIL = "sandro.lopes@rankmyapp.com.br";

// Níveis de acesso por página:
//   full     → abre a página e permite editar
//   readonly → abre a página só para visualização
//   disabled → aparece na sidebar cinza e não-clicável; rota bloqueada
//   hidden   → não aparece na sidebar; rota bloqueada
export type PageAccess = "full" | "readonly" | "disabled" | "hidden";

// Escopo de dados: geral, hierarquia (self + descendentes na árvore da
// equipe) ou somente os dados atribuídos ao próprio usuário
export type DataScope = "all" | "hierarchy" | "own";

// Nível hierárquico do privilégio (define quem pode ser subordinado de quem)
export type PrivilegeRank = "admin" | "lider" | "gerente" | "colaborador";

export const RANK_OPTIONS: { value: PrivilegeRank; label: string }[] = [
  { value: "lider", label: "Líder (gerencia equipe)" },
  { value: "gerente", label: "Gerente (subordinado de líder)" },
  { value: "colaborador", label: "Colaborador (sem equipe)" },
];

export const SCOPE_OPTIONS: { value: DataScope; label: string }[] = [
  { value: "all", label: "Ver tudo (geral)" },
  { value: "hierarchy", label: "Ver sua hierarquia (equipe)" },
  { value: "own", label: "Somente dados atribuídos" },
];

// Chave de página: string (não union fechada) para que páginas novas
// geradas automaticamente funcionem sem alterar tipos em todo o app.
export type PageKey = string;

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
  rank: PrivilegeRank;
  config: PrivilegeConfig;
  created_at: string;
  updated_at: string;
}

// ---- Registry manual (labels, descrições e funções granulares) ----
// Observação: "Gerenciamento de Usuários" (/usuarios) permanece
// exclusivo do admin por segurança (cria usuários e privilégios),
// por isso não faz parte do registry configurável.
const PAGES_MANUAL: PageDef[] = [
  {
    key: "gerencial",
    label: "Gerencial",
    href: "/gerencial",
    description: "Visão gerencial do pipeline (em construção; visível somente para Admin)",
    features: [],
  },
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
  {
    key: "planos",
    label: "Planos",
    href: "/planos",
    description: "Anotações e planos futuros do time",
    features: [],
  },
  {
    key: "usuarios",
    label: "Usuários",
    href: "/usuarios",
    description: "Gestão de usuários, hierarquias e privilégios (com funções controláveis por privilégio)",
    features: [
      { key: "administrar_privilegios", label: "Administrar privilégios", description: "Criar, editar e excluir privilégios do sistema" },
      { key: "cadastrar_usuarios", label: "Cadastrar novos usuários", description: "Criar contas; quem cadastra (não-admin) torna-se líder do novo usuário" },
      { key: "editar_usuarios", label: "Editar usuários atuais", description: "Alterar nome e dados exibidos dos usuários" },
      { key: "alterar_senha", label: "Alterar senha", description: "Redefinir a senha de usuários" },
      { key: "alterar_privilegio", label: "Alterar privilégio de usuários", description: "Trocar o privilégio atribuído (não-admin: apenas na própria hierarquia e sem promover a Admin/Líder)" },
      { key: "bloquear_usuarios", label: "Bloquear ou reativar usuários", description: "Desativar e reativar acessos" },
      { key: "deletar_usuarios", label: "Excluir usuários", description: "Excluir contas permanentemente" },
      { key: "atribuir_hierarquia", label: "Atribuir hierarquias", description: "Gerenciar a equipe: definir quem fica subordinado a quem (apenas perfis de nível inferior)" },
    ],
  },
];

// ---- Mesclagem: manual tem prioridade; rotas novas entram sozinhas ----
const knownKeys = new Set(PAGES_MANUAL.map((p) => p.key));
const knownHrefs = new Set(PAGES_MANUAL.map((p) => p.href));
const AUTO_EXTRA: PageDef[] = AUTO_PAGES.filter(
  (a) => !knownKeys.has(a.key) && !knownHrefs.has(a.href)
).map((a) => ({
  key: a.key,
  label: a.label,
  href: a.href,
  description: "Página detectada automaticamente no projeto",
  features: [],
}));

export const PAGES: PageDef[] = [...PAGES_MANUAL, ...AUTO_EXTRA];

export const PAGE_MAP: Record<PageKey, PageDef> = Object.fromEntries(
  PAGES.map((p) => [p.key, p])
) as Record<PageKey, PageDef>;

export const ACCESS_OPTIONS: { value: PageAccess; label: string }[] = [
  { value: "full", label: "Acesso total" },
  { value: "readonly", label: "Somente visualização" },
  { value: "disabled", label: "Visível, bloqueada" },
  { value: "hidden", label: "Oculta" },
];

// ---- Configs padrão (derivadas dinamicamente do registry) ----

// Acesso padrão do privilégio "Usuário" por página; o que não estiver
// aqui (incluindo páginas novas) nasce como "hidden".
const USER_DEFAULT_ACCESS: Partial<Record<PageKey, PageAccess>> = {
  overview: "full",
  elephan: "disabled",
  recupera: "disabled",
  renovacoes: "disabled",
  analytics: "hidden",
  alertas: "hidden",
};

// Funções granulares que ficam ativas no padrão "Usuário" (quando a página é acessível)
const USER_DEFAULT_FEATURES: Partial<Record<PageKey, string[]>> = {
  overview: ["kpis", "graficos", "tabela"],
  elephan: ["dashboard", "alertas", "reunioes"],
};

function ruleFor(page: PageDef, access: PageAccess, scope: DataScope, enabledFeatures: string[]): PageRule {
  return {
    access,
    scope,
    features: Object.fromEntries(page.features.map((f) => [f.key, enabledFeatures.includes(f.key)])),
  };
}

export function defaultAdminConfig(): PrivilegeConfig {
  return {
    pages: Object.fromEntries(
      PAGES.map((p) => [p.key, ruleFor(p, "full", "all", p.features.map((f) => f.key))])
    ) as Record<PageKey, PageRule>,
  };
}

export function defaultUserConfig(): PrivilegeConfig {
  return {
    pages: Object.fromEntries(
      PAGES.map((p) => [
        p.key,
        ruleFor(p, USER_DEFAULT_ACCESS[p.key] ?? "hidden", "own", USER_DEFAULT_FEATURES[p.key] ?? []),
      ])
    ) as Record<PageKey, PageRule>,
  };
}

// Config inicial de um NOVO privilégio custom: tudo oculto, o admin
// habilita explicitamente o que o privilégio enxerga.
export function blankConfig(): PrivilegeConfig {
  return {
    pages: Object.fromEntries(
      PAGES.map((p) => [p.key, ruleFor(p, "hidden", "own", [])])
    ) as Record<PageKey, PageRule>,
  };
}

const VALID_ACCESS: PageAccess[] = ["full", "readonly", "disabled", "hidden"];

// Funções sensíveis: quando a página é habilitada num privilégio, estas
// features nascem DESLIGADAS (o admin marca explicitamente o que pode).
// Usuários: administrar privilégios, cadastrar, excluir etc. são críticas.
const SENSITIVE_PAGES = new Set<PageKey>(["usuarios"]);

function defaultFeatureValue(page: PageKey): boolean {
  return !SENSITIVE_PAGES.has(page);
}

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
    const scope: DataScope = ["all", "hierarchy", "own"].includes(rule.scope as DataScope)
      ? (rule.scope as DataScope)
      : "own";
    const features: Record<string, boolean> = {};
    for (const f of page.features) {
      const v = rule.features?.[f.key];
      features[f.key] = typeof v === "boolean" ? v : defaultFeatureValue(page.key);
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
