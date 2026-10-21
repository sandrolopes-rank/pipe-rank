"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ADMIN_EMAIL,
  PAGES,
  type DataScope,
  type PageAccess,
  type PageKey,
  type Privilege,
  type PrivilegeConfig,
  defaultAdminConfig,
  defaultUserConfig,
  normalizeConfig,
} from "@/lib/privileges";

export interface Privileges {
  loading: boolean;
  email: string;
  username: string;
  /** true = acesso pleno a tudo (email admin ou role 'admin') */
  isAdmin: boolean;
  /** role do metadata: 'admin' | 'user' | <slug de privilégio custom> */
  roleSlug: string;
  /** config efetiva (admin → tudo liberado) */
  config: PrivilegeConfig;
  access: (page: PageKey) => PageAccess;
  scope: (page: PageKey) => DataScope;
  /** pode abrir a página (full ou readonly) */
  canOpen: (page: PageKey) => boolean;
  /** aparece na sidebar (qualquer coisa exceto hidden) */
  isVisible: (page: PageKey) => boolean;
  /** pode editar (somente full; admin sempre) */
  canEdit: (page: PageKey) => boolean;
  /** vê dados de todos (scope all; admin sempre) */
  seesAll: (page: PageKey) => boolean;
  /** função granular liberada na página (admin sempre) */
  hasFeature: (page: PageKey, feature: string) => boolean;
  /** primeira página abrível pelo privilégio (fallback p/ redirects) */
  homeHref: string;
}

// Cache em módulo: evita refetch da config ao navegar entre páginas
let cachedSlug: string | null = null;
let cachedConfig: PrivilegeConfig | null = null;

export function usePrivileges(): Privileges {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [roleSlug, setRoleSlug] = useState("user");
  // Estado inicial conservador (privilégio "Usuário"): sem sessão a sidebar
  // nunca mostra páginas restritas; ao resolver admin, vira acesso pleno.
  const [config, setConfig] = useState<PrivilegeConfig>(defaultUserConfig());

  useEffect(() => {
    let disposed = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (disposed) return;
        if (!user?.email) {
          setLoading(false);
          return;
        }
        const mail = user.email;
        const role =
          mail.toLowerCase() === ADMIN_EMAIL.toLowerCase()
            ? "admin"
            : ((user.user_metadata?.role as string) || "user");

        setEmail(mail);
        setUsername(
          (user.user_metadata?.username as string) || mail.split("@")[0]
        );
        setRoleSlug(role);

        if (role === "admin") {
          setConfig(defaultAdminConfig());
          setLoading(false);
          return;
        }

        // role 'user' e slugs custom: resolve a config na tabela privileges
        const slug = role === "user" ? "usuario" : role;
        if (cachedSlug === slug && cachedConfig) {
          setConfig(cachedConfig);
          setLoading(false);
          return;
        }
        const { data, error } = await supabase
          .from("privileges")
          .select("config")
          .eq("slug", slug)
          .maybeSingle();
        if (disposed) return;
        // Fallback seguro: sem a tabela (SQL ainda não rodado) ou slug sem
        // registro (privilégio excluído), vale o padrão "Usuário".
        const cfg =
          error || !data
            ? defaultUserConfig()
            : normalizeConfig((data as Pick<Privilege, "config">).config);
        cachedSlug = slug;
        cachedConfig = cfg;
        setConfig(cfg);
        setLoading(false);
      } catch {
        if (!disposed) {
          setConfig(defaultUserConfig());
          setLoading(false);
        }
      }
    })();
    return () => {
      disposed = true;
    };
  }, []);

  return useMemo<Privileges>(() => {
    const isAdmin =
      roleSlug === "admin" || email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    const access = (page: PageKey): PageAccess =>
      isAdmin ? "full" : config.pages[page]?.access ?? "hidden";
    const scope = (page: PageKey): DataScope =>
      isAdmin ? "all" : config.pages[page]?.scope ?? "own";
    const canOpen = (page: PageKey) => {
      const a = access(page);
      return a === "full" || a === "readonly";
    };
    const homeHref =
      PAGES.find((p) => canOpen(p.key))?.href ?? "/overview";
    return {
      loading,
      email,
      username,
      isAdmin,
      roleSlug,
      config,
      access,
      scope,
      canOpen,
      isVisible: (page: PageKey) => access(page) !== "hidden",
      canEdit: (page: PageKey) => isAdmin || access(page) === "full",
      seesAll: (page: PageKey) => isAdmin || scope(page) === "all",
      hasFeature: (page: PageKey, feature: string) =>
        isAdmin ||
        (canOpen(page) && (config.pages[page]?.features?.[feature] ?? true)),
      homeHref,
    };
  }, [loading, email, username, roleSlug, config]);
}

/** Invalida o cache de config (usar após editar privilégios) */
export function invalidatePrivilegesCache() {
  cachedSlug = null;
  cachedConfig = null;
}
