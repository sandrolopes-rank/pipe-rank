// ============================================
// Helpers da página Recupera (funções puras — testáveis)
// ============================================
// Estatísticas, filtros e ordenação usados pelo dashboard de /recupera.
// Toda a lógica analítica vive aqui para ser testável sem DOM/banco.

export interface Recovery {
  id: string;
  responsavel: string;
  cliente: string;
  receita_em_risco: number;
  receita_recuperada: number | null;
  tipo_recupera: "Preditivo" | "Churn";
  data_pedido_churn: string | null;
  status_recupera: "Em andamento" | "Recuperado" | "Perdido";
  ja_na_projecao: boolean;
  data_prevista_churn: string | null;
  proposta_enviada: boolean;
  proposta_com_reducao: boolean;
  status_proposta: string | null;
  owner_email?: string | null;
  created_at: string;
  updated_at: string;
}

export const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export const STATUS_RECUPERA = ["Em andamento", "Recuperado", "Perdido"] as const;
export const TIPO_RECUPERA = ["Preditivo", "Churn"] as const;

export interface RecuperaFilters {
  search?: string;
  status?: string;
  tipo?: string;
  responsavel?: string;
}

// Filtra a lista pelos controles da página (busca + selects). Tudo opcional;
// filtro vazio = sem restrição. Case-insensitive.
export function filterRecoveries(
  list: Recovery[],
  { search, status, tipo, responsavel }: RecuperaFilters
): Recovery[] {
  return list.filter((r) => {
    if (status && r.status_recupera !== status) return false;
    if (tipo && r.tipo_recupera !== tipo) return false;
    if (responsavel && r.responsavel !== responsavel) return false;
    if (search) {
      const term = search.toLowerCase();
      const cliente = (r.cliente || "").toLowerCase();
      const resp = (r.responsavel || "").toLowerCase();
      if (!cliente.includes(term) && !resp.includes(term)) return false;
    }
    return true;
  });
}

// Escopo de dados do privilégio (espelha Overview): aplica owner_email
// conforme all/hierarchy/own. hierarchy usa a lista de e-mails self+equipe.
export function scopeRecoveries(
  list: Recovery[],
  scope: "all" | "hierarchy" | "own",
  opts: { email: string; hierarchyEmails: string[] }
): Recovery[] {
  if (scope === "all") return list;
  const self = opts.email.toLowerCase();
  if (scope === "own") {
    return list.filter((r) => (r.owner_email || "").toLowerCase() === self);
  }
  const permitidos = new Set(opts.hierarchyEmails.map((e) => e.toLowerCase()));
  return list.filter((r) => permitidos.has((r.owner_email || "").toLowerCase()));
}

export interface RecuperaStats {
  emAndamento: number;
  recuperados: number;
  perdidos: number;
  total: number;
  receitaEmRisco: number;
  receitaRecuperada: number;
  /** receitaRecuperada / receitaEmRisco (0 quando não há risco) */
  taxaRecuperacao: number;
  /** valor em risco ainda em aberto (não recuperado nem perdido) */
  receitaEmAberto: number;
  /** série por mês de data_pedido_churn, na ordem do calendário */
  porMes: { month: string; risco: number; recuperada: number }[];
  porStatusProposta: { status: string; count: number }[];
  porTipo: { tipo: "Preditivo" | "Churn"; count: number; valor: number }[];
  semProposta: number;
  /** agregado por responsável, ordenado por receita em risco desc */
  porResponsavel: { responsavel: string; count: number; risco: number; recuperada: number }[];
}

export function computeRecuperaStats(list: Recovery[]): RecuperaStats {
  const emAndamento = list.filter((r) => r.status_recupera === "Em andamento").length;
  const recuperados = list.filter((r) => r.status_recupera === "Recuperado").length;
  const perdidos = list.filter((r) => r.status_recupera === "Perdido").length;
  const receitaEmRisco = list.reduce((s, r) => s + (r.receita_em_risco || 0), 0);
  const receitaRecuperada = list.reduce((s, r) => s + (r.receita_recuperada || 0), 0);
  const receitaEmAberto = list
    .filter((r) => r.status_recupera === "Em andamento")
    .reduce((s, r) => s + (r.receita_em_risco || 0), 0);
  const semProposta = list.filter((r) => !r.proposta_enviada).length;

  // Série mensal por data_pedido_churn (ordem do calendário; "-" primeiro)
  const porMesMap = new Map<string, { risco: number; recuperada: number }>();
  for (const r of list) {
    const mes = r.data_pedido_churn;
    if (!mes) continue;
    const acc = porMesMap.get(mes) ?? { risco: 0, recuperada: 0 };
    acc.risco += r.receita_em_risco || 0;
    acc.recuperada += r.receita_recuperada || 0;
    porMesMap.set(mes, acc);
  }
  const porMes = MESES.filter((m) => porMesMap.has(m)).map((month) => ({
    month,
    ...(porMesMap.get(month) as { risco: number; recuperada: number }),
  }));

  // Status de proposta (apenas registros com proposta enviada e status definido)
  const propostaMap = new Map<string, number>();
  for (const r of list) {
    if (r.proposta_enviada && r.status_proposta) {
      propostaMap.set(r.status_proposta, (propostaMap.get(r.status_proposta) || 0) + 1);
    }
  }
  const porStatusProposta = [...propostaMap.entries()]
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);

  // Tipo (Preditivo vs Churn)
  const tipoMap = new Map<string, { count: number; valor: number }>();
  for (const r of list) {
    const acc = tipoMap.get(r.tipo_recupera) ?? { count: 0, valor: 0 };
    acc.count += 1;
    acc.valor += r.receita_em_risco || 0;
    tipoMap.set(r.tipo_recupera, acc);
  }
  const porTipo = TIPO_RECUPERA.filter((t) => tipoMap.has(t)).map((tipo) => ({
    tipo,
    ...(tipoMap.get(tipo) as { count: number; valor: number }),
  }));

  // Por responsável (ordenado por receita em risco desc)
  const respMap = new Map<string, { count: number; risco: number; recuperada: number }>();
  for (const r of list) {
    const key = r.responsavel || "(sem responsável)";
    const acc = respMap.get(key) ?? { count: 0, risco: 0, recuperada: 0 };
    acc.count += 1;
    acc.risco += r.receita_em_risco || 0;
    acc.recuperada += r.receita_recuperada || 0;
    respMap.set(key, acc);
  }
  const porResponsavel = [...respMap.entries()]
    .map(([responsavel, v]) => ({ responsavel, ...v }))
    .sort((a, b) => b.risco - a.risco || b.count - a.count);

  return {
    emAndamento,
    recuperados,
    perdidos,
    total: list.length,
    receitaEmRisco,
    receitaRecuperada,
    taxaRecuperacao: receitaEmRisco > 0 ? receitaRecuperada / receitaEmRisco : 0,
    receitaEmAberto,
    porMes,
    porStatusProposta,
    porTipo,
    semProposta,
    porResponsavel,
  };
}

// Formata moeda pt-BR; null/vazio → "-"
export function formatBRL(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

// Percentual pt-BR com 0–1 dígitos
export function formatPct(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);
}
