// ============================================
// Destino pós-login (primeira página acessível)
// ============================================
// O login sempre levava a /overview; quem não tem Overview liberada via
// privilégio caía na tela "Sem acesso à Overview" em todo login.
// Este helper resolve a primeira página abrível do privilégio do usuário
// (mesma resolução do use-privileges, sem React) para o login e o
// callback do Google redirecionarem direto para onde o usuário pode estar.

import {
  ADMIN_EMAIL,
  PAGES,
  defaultUserConfig,
  normalizeConfig,
  type PrivilegeConfig,
} from "./privileges";

/** Primeira página com acesso full/readonly na ordem do registry; fallback /overview */
export function firstOpenPage(config: PrivilegeConfig): string {
  for (const page of PAGES) {
    const access = config.pages[page.key]?.access;
    if (access === "full" || access === "readonly") return page.href;
  }
  // Nenhuma página liberada: o Overview mostra o aviso "Sem acesso"
  return "/overview";
}

/**
 * Resolve o destino pós-login do usuário, espelhando a resolução do
 * use-privileges: master → modo admin (/overview); demais → privilégio do
 * metadata ('user' → config "usuario"; ausente → config "usuario").
 */
export async function resolveHomeAfterLogin(
  supabase: { from: (table: string) => unknown },
  user: { email?: string | null; user_metadata?: Record<string, unknown> | null } | null
): Promise<string> {
  const mail = (user?.email || "").toLowerCase();
  if (!mail) return "/overview";
  if (mail === ADMIN_EMAIL.toLowerCase()) return "/overview";

  const slug = ((user?.user_metadata?.role as string) || "user");
  const target = slug === "user" ? "usuario" : slug;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await (supabase.from("privileges") as any)
      .select("config")
      .eq("slug", target)
      .maybeSingle();
    const config = normalizeConfig(data?.data?.config ?? null);
    return firstOpenPage(config);
  } catch {
    return firstOpenPage(defaultUserConfig());
  }
}
