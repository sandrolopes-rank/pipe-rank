// Testes do destino pós-login (primeira página acessível do privilégio).
import { describe, expect, it } from "vitest";
import { firstOpenPage, resolveHomeAfterLogin } from "../../src/lib/home-redirect";
import { defaultUserConfig, normalizeConfig } from "../../src/lib/privileges";

// Stub mínimo do client Supabase para o resolveHomeAfterLogin
function stubDb(rows: Record<string, unknown>[]) {
  return {
    from: (_table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
        }),
      }),
    }),
  } as unknown as Parameters<typeof resolveHomeAfterLogin>[0];
}

describe("firstOpenPage", () => {
  it("config Usuário padrão → /overview (única página liberada)", () => {
    expect(firstOpenPage(defaultUserConfig())).toBe("/overview");
  });

  it("privilégio com só Elephan aberta → /elephan (caso Nathalia)", () => {
    const cfg = normalizeConfig({ pages: { elephan: { access: "full", scope: "all", features: {} } } });
    expect(firstOpenPage(cfg)).toBe("/elephan");
  });

  it("respeita a ordem do registry (gerencial antes de overview)", () => {
    const cfg = normalizeConfig({
      pages: {
        overview: { access: "hidden" },
        gerencial: { access: "readonly" },
        recupera: { access: "full" },
      },
    });
    expect(firstOpenPage(cfg)).toBe("/gerencial");
  });

  it("nada liberado → fallback /overview (tela de aviso)", () => {
    const cfg = normalizeConfig({ pages: { elephan: { access: "disabled" } } });
    expect(firstOpenPage(cfg)).toBe("/overview");
  });
});

describe("resolveHomeAfterLogin", () => {
  it("master → /overview (modo admin pleno)", async () => {
    const destino = await resolveHomeAfterLogin(stubDb([]), {
      email: "sandro.lopes@rankmyapp.com.br",
      user_metadata: {},
    });
    expect(destino).toBe("/overview");
  });

  it("role 'user' → config 'usuario' → /overview", async () => {
    const destino = await resolveHomeAfterLogin(stubDb([{ config: null }]), {
      email: "alguem@rankmyapp.com.br",
      user_metadata: { role: "user" },
    });
    expect(destino).toBe("/overview");
  });

  it("role custom com só Elephan → /elephan (caso Nathalia/estrategista)", async () => {
    const config = {
      pages: { elephan: { access: "full", scope: "all", features: {} } },
    };
    const destino = await resolveHomeAfterLogin(stubDb([{ config }]), {
      email: "nathalia.simao@rankmyapp.com.br",
      user_metadata: { role: "estrategista" },
    });
    expect(destino).toBe("/elephan");
  });

  it("sem privilégio no banco → fallback /overview (fail-closed)", async () => {
    const destino = await resolveHomeAfterLogin(stubDb([]), {
      email: "x@rankmyapp.com.br",
      user_metadata: { role: "inexistente" },
    });
    expect(destino).toBe("/overview");
  });

  it("sem usuário → /overview", async () => {
    expect(await resolveHomeAfterLogin(stubDb([]), null)).toBe("/overview");
  });
});
