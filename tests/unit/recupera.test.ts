// Testes unitários dos helpers da página Recupera (estatísticas, filtros, escopo).
// Executar: npx vitest run tests/unit/recupera.test.ts
import { describe, expect, it } from "vitest";
import {
  computeRecuperaStats,
  filterRecoveries,
  formatBRL,
  formatPct,
  scopeRecoveries,
  type Recovery,
} from "../../src/lib/recupera";

function rec(parcial: Partial<Recovery>): Recovery {
  return {
    id: parcial.id ?? Math.random().toString(36).slice(2),
    responsavel: "Ana",
    cliente: "Cliente X",
    receita_em_risco: 1000,
    receita_recuperada: null,
    tipo_recupera: "Preditivo",
    data_pedido_churn: "Março",
    status_recupera: "Em andamento",
    ja_na_projecao: false,
    data_prevista_churn: null,
    proposta_enviada: false,
    proposta_com_reducao: false,
    status_proposta: null,
    owner_email: "ana@rankmyapp.com.br",
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
    ...parcial,
  };
}

const lista: Recovery[] = [
  rec({ cliente: "Alpha", status_recupera: "Em andamento", receita_em_risco: 1000, receita_recuperada: null, data_pedido_churn: "Janeiro", proposta_enviada: false }),
  rec({ cliente: "Beta", status_recupera: "Recuperado", receita_em_risco: 2000, receita_recuperada: 1500, data_pedido_churn: "Janeiro", proposta_enviada: true, status_proposta: "Aprovada parcialmente" }),
  rec({ cliente: "Gama", status_recupera: "Perdido", receita_em_risco: 3000, receita_recuperada: null, data_pedido_churn: "Março", tipo_recupera: "Churn", proposta_enviada: true, status_proposta: "Recusada" }),
  rec({ cliente: "Delta", status_recupera: "Recuperado", receita_em_risco: 4000, receita_recuperada: 4000, data_pedido_churn: "Março", responsavel: "Bruno", owner_email: "bruno@rankmyapp.com.br", proposta_enviada: true, status_proposta: "Em produção" }),
];

describe("computeRecuperaStats", () => {
  it("conta status e soma receitas", () => {
    const s = computeRecuperaStats(lista);
    expect(s.total).toBe(4);
    expect(s.emAndamento).toBe(1);
    expect(s.recuperados).toBe(2);
    expect(s.perdidos).toBe(1);
    expect(s.receitaEmRisco).toBe(10000);
    expect(s.receitaRecuperada).toBe(5500);
    expect(s.receitaEmAberto).toBe(1000); // só o "Em andamento"
    expect(s.taxaRecuperacao).toBeCloseTo(0.55);
  });

  it("taxa de recuperação é 0 quando não há receita em risco", () => {
    const s = computeRecuperaStats([rec({ receita_em_risco: 0 })]);
    expect(s.taxaRecuperacao).toBe(0);
  });

  it("série mensal segue a ordem do calendário e agrega por mês", () => {
    const s = computeRecuperaStats(lista);
    expect(s.porMes.map((m) => m.month)).toEqual(["Janeiro", "Março"]);
    expect(s.porMes[0]).toEqual({ month: "Janeiro", risco: 3000, recuperada: 1500 });
    expect(s.porMes[1]).toEqual({ month: "Março", risco: 7000, recuperada: 4000 });
  });

  it("ignora registros sem mês ao montar a série", () => {
    const s = computeRecuperaStats([rec({ data_pedido_churn: null, receita_em_risco: 500 })]);
    expect(s.porMes).toEqual([]);
  });

  it("agrega status de proposta apenas de registros com proposta enviada", () => {
    const s = computeRecuperaStats(lista);
    expect(s.porStatusProposta).toEqual([
      { status: "Aprovada parcialmente", count: 1 },
      { status: "Recusada", count: 1 },
      { status: "Em produção", count: 1 },
    ]);
    expect(s.semProposta).toBe(1);
  });

  it("agrega por tipo com valor em risco", () => {
    const s = computeRecuperaStats(lista);
    expect(s.porTipo).toEqual([
      { tipo: "Preditivo", count: 3, valor: 7000 },
      { tipo: "Churn", count: 1, valor: 3000 },
    ]);
  });

  it("agrega por responsável ordenado por receita em risco", () => {
    const s = computeRecuperaStats(lista);
    expect(s.porResponsavel).toEqual([
      { responsavel: "Ana", count: 3, risco: 6000, recuperada: 1500 },
      { responsavel: "Bruno", count: 1, risco: 4000, recuperada: 4000 },
    ]);
  });

  it("responsável vazio agrupa como '(sem responsável)'", () => {
    const s = computeRecuperaStats([rec({ responsavel: "", receita_em_risco: 50 })]);
    expect(s.porResponsavel[0].responsavel).toBe("(sem responsável)");
  });

  it("lista vazia → zeros, sem divisão por zero", () => {
    const s = computeRecuperaStats([]);
    expect(s.total).toBe(0);
    expect(s.taxaRecuperacao).toBe(0);
    expect(s.porMes).toEqual([]);
    expect(s.porStatusProposta).toEqual([]);
    expect(s.porTipo).toEqual([]);
  });
});

describe("filterRecoveries", () => {
  it("busca por cliente e responsável (case-insensitive)", () => {
    expect(filterRecoveries(lista, { search: "alpha" }).map((r) => r.cliente)).toEqual(["Alpha"]);
    expect(filterRecoveries(lista, { search: "BRUNO" }).map((r) => r.cliente)).toEqual(["Delta"]);
  });

  it("combina filtros (status + tipo)", () => {
    const r = filterRecoveries(lista, { status: "Recuperado" });
    expect(r.length).toBe(2);
    expect(filterRecoveries(lista, { status: "Perdido", tipo: "Churn" }).map((x) => x.cliente)).toEqual(["Gama"]);
    expect(filterRecoveries(lista, { status: "Perdido", tipo: "Preditivo" })).toEqual([]);
  });

  it("filtra por responsável exato", () => {
    expect(filterRecoveries(lista, { responsavel: "Bruno" }).map((r) => r.cliente)).toEqual(["Delta"]);
  });

  it("sem filtros retorna tudo", () => {
    expect(filterRecoveries(lista, {})).toHaveLength(4);
  });
});

describe("scopeRecoveries (escopo own/hierarchy/all do privilégio)", () => {
  const opts = {
    email: "ana@rankmyapp.com.br",
    hierarchyEmails: ["ana@rankmyapp.com.br", "bruno@rankmyapp.com.br"],
  };

  it("all → tudo", () => {
    expect(scopeRecoveries(lista, "all", opts)).toHaveLength(4);
  });

  it("own → somente os próprios (owner_email)", () => {
    const r = scopeRecoveries(lista, "own", opts);
    expect(r.map((x) => x.cliente)).toEqual(["Alpha", "Beta", "Gama"]);
  });

  it("hierarchy → self + equipe", () => {
    expect(scopeRecoveries(lista, "hierarchy", opts)).toHaveLength(4);
  });

  it("hierarchy exclui quem está fora da árvore", () => {
    const fora = [rec({ cliente: "Fora", owner_email: "outra@rankmyapp.com.br" })];
    expect(scopeRecoveries(fora, "hierarchy", opts)).toEqual([]);
  });

  it("sem owner_email definido não vaza em own/hierarchy", () => {
    const semOwner = [rec({ cliente: "SemOwner", owner_email: null })];
    expect(scopeRecoveries(semOwner, "own", opts)).toEqual([]);
    expect(scopeRecoveries(semOwner, "hierarchy", opts)).toEqual([]);
  });
});

describe("formatadores", () => {
  it("formatBRL usa o padrão pt-BR (Intl) e '-' para vazio", () => {
    const esperado = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(1500);
    expect(formatBRL(1500)).toBe(esperado);
    expect(formatBRL(1500).replace(/\u00a0/g, " ")).toContain("1.500,00");
    expect(formatBRL(null)).toBe("-");
    expect(formatBRL(undefined)).toBe("-");
  });

  it("formatPct usa o padrão pt-BR (Intl)", () => {
    expect(formatPct(0.55)).toBe(new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 }).format(0.55));
    expect(formatPct(0.55)).toContain("%");
  });
});
