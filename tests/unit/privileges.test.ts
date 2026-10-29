// Testes unitários do registry de privilégios (RBAC) — funções puras.
// Executar: npx vitest run tests/unit/privileges.test.ts
import { describe, expect, it } from "vitest";
import {
  ADMIN_EMAIL,
  ACCESS_OPTIONS,
  PAGES,
  PAGE_MAP,
  RESERVED_SLUGS,
  blankConfig,
  defaultAdminConfig,
  defaultUserConfig,
  normalizeConfig,
  slugify,
} from "../../src/lib/privileges";

describe("slugify", () => {
  it("remove acentos, espaços e capitalização", () => {
    expect(slugify("Comercial Nordeste")).toBe("comercial-nordeste");
    expect(slugify("Atenção TOTAL")).toBe("atencao-total");
  });

  it("normaliza múltiplos separadores e trim de hífens", () => {
    expect(slugify("  A -- B // C  ")).toBe("a-b-c");
    expect(slugify("---x---")).toBe("x");
  });

  it("limita a 48 caracteres", () => {
    expect(slugify("a".repeat(100)).length).toBeLessThanOrEqual(48);
  });

  it("string vazia vira string vazia (bloqueio é responsabilidade da rota)", () => {
    expect(slugify("")).toBe("");
    expect(slugify("***")).toBe("");
  });
});

describe("RESERVED_SLUGS", () => {
  it("protege os slugs de sistema", () => {
    expect(RESERVED_SLUGS.has("admin")).toBe(true);
    expect(RESERVED_SLUGS.has("usuario")).toBe(true);
    expect(RESERVED_SLUGS.has("user")).toBe(true);
  });
});

describe("blankConfig (config de novo privilégio custom)", () => {
  it("nasce com TODAS as páginas ocultas, escopo own e funções desligadas", () => {
    const cfg = blankConfig();
    for (const page of PAGES) {
      const rule = cfg.pages[page.key];
      expect(rule.access).toBe("hidden");
      expect(rule.scope).toBe("own");
      for (const f of page.features) {
        expect(rule.features[f.key]).toBe(false);
      }
    }
  });
});

describe("defaultAdminConfig", () => {
  it("todas as páginas full/all com todas as funções ligadas", () => {
    const cfg = defaultAdminConfig();
    for (const page of PAGES) {
      const rule = cfg.pages[page.key];
      expect(rule.access).toBe("full");
      expect(rule.scope).toBe("all");
      for (const f of page.features) {
        expect(rule.features[f.key]).toBe(true);
      }
    }
  });
});

describe("defaultUserConfig (privilégio padrão 'Usuário')", () => {
  it("overview liberado (full) e escopo own", () => {
    const cfg = defaultUserConfig();
    expect(cfg.pages.overview.access).toBe("full");
    expect(cfg.pages.overview.scope).toBe("own");
    expect(cfg.pages.overview.features).toEqual({
      kpis: true,
      graficos: true,
      tabela: true,
    });
  });

  it("módulos sensíveis ficam disabled/hidden por padrão", () => {
    const cfg = defaultUserConfig();
    expect(cfg.pages.elephan.access).toBe("disabled");
    expect(cfg.pages.recupera.access).toBe("disabled");
    expect(cfg.pages.renovacoes.access).toBe("disabled");
    expect(cfg.pages.analytics.access).toBe("hidden");
    expect(cfg.pages.alertas.access).toBe("hidden");
  });

  it("usuários (admin-only) fica oculto para o padrão Usuário", () => {
    const cfg = defaultUserConfig();
    expect(cfg.pages.usuarios.access).toBe("hidden");
  });
});

describe("normalizeConfig (defesa contra configs malformadas do banco)", () => {
  it("null/lixo → config em branco (tudo oculto)", () => {
    for (const raw of [null, undefined, "lixo", 42, { pages: "nao-objeto" }]) {
      const cfg = normalizeConfig(raw);
      expect(cfg.pages.overview.access).toBe("hidden");
    }
  });

  it("access inválido → hidden (fail-closed)", () => {
    const cfg = normalizeConfig({ pages: { overview: { access: "ROOT" } } });
    expect(cfg.pages.overview.access).toBe("hidden");
  });

  it("scope inválido → own (menor privilégio)", () => {
    const cfg = normalizeConfig({ pages: { overview: { access: "full", scope: "TUDO" } } });
    expect(cfg.pages.overview.scope).toBe("own");
  });

  it("função ausente em página comum → ligada; em página sensível → desligada", () => {
    // elephan não é sensível: função ausente nasce ligada (refinamento, não portão)
    const cfgElephan = normalizeConfig({ pages: { elephan: { access: "full" } } });
    expect(cfgElephan.pages.elephan.features.playground).toBe(true);
    // usuarios é sensível: função ausente nasce DESLIGADA
    const cfgUsuarios = normalizeConfig({ pages: { usuarios: { access: "full" } } });
    expect(cfgUsuarios.pages.usuarios.features.deletar_usuarios).toBe(false);
    expect(cfgUsuarios.pages.usuarios.features.administrar_privilegios).toBe(false);
  });

  it("páginas desconhecidas na config são ignoradas (não vazam no resultado)", () => {
    const cfg = normalizeConfig({
      pages: { pagina_fantasma: { access: "full", scope: "all" } },
    });
    expect(cfg.pages.pagina_fantasma).toBeUndefined();
    expect(Object.keys(cfg.pages).sort()).toEqual(PAGES.map((p) => p.key).sort());
  });

  it("mantém valores válidos intactos", () => {
    const cfg = normalizeConfig({
      pages: { overview: { access: "readonly", scope: "hierarchy", features: { tabela: false } } },
    });
    expect(cfg.pages.overview).toEqual({
      access: "readonly",
      scope: "hierarchy",
      features: { kpis: true, graficos: true, tabela: false },
    });
  });
});

describe("registry PAGES", () => {
  it("contém as páginas manuais essenciais", () => {
    for (const key of ["gerencial", "overview", "elephan", "recupera", "renovacoes", "analytics", "alertas", "planos", "usuarios"]) {
      expect(PAGE_MAP[key], `página ${key} deve existir no registry`).toBeTruthy();
    }
  });

  it("Gerencial vem ANTES de Overview (ordem da navegação)", () => {
    const keys = PAGES.map((p) => p.key);
    expect(keys.indexOf("gerencial")).toBeLessThan(keys.indexOf("overview"));
  });

  it("Gerencial é somente-Admin: hidden no padrão Usuário e em config em branco; full no Admin", () => {
    expect(defaultUserConfig().pages.gerencial.access).toBe("hidden");
    expect(blankConfig().pages.gerencial.access).toBe("hidden");
    // config armazenada sem a página (ex.: privilégio criado antes) → hidden
    expect(normalizeConfig({ pages: {} }).pages.gerencial.access).toBe("hidden");
    expect(defaultAdminConfig().pages.gerencial.access).toBe("full");
  });

  it("páginas do registry têm hrefs únicos e chaves únicas", () => {
    const keys = PAGES.map((p) => p.key);
    const hrefs = PAGES.map((p) => p.href);
    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("opções de acesso cobrem os 4 níveis", () => {
    expect(ACCESS_OPTIONS.map((o) => o.value)).toEqual(["full", "readonly", "disabled", "hidden"]);
  });

  it("ADMIN_EMAIL é o master documentado", () => {
    expect(ADMIN_EMAIL).toBe("sandro.lopes@rankmyapp.com.br");
  });
});
