"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ADMIN_EMAIL,
  PAGES,
  type DataScope,
  type PageAccess,
  type PageKey,
  type Privilege,
  type PrivilegeRank,
  type PrivilegeConfig,
  defaultAdminConfig,
  defaultUserConfig,
  normalizeConfig,
} from "@/lib/privileges";

// ===== Modo de atuação (transição Admin ↔ privilégio assumido, exclusiva do master) =====
// O admin pode "conferir a si mesmo" qualquer privilégio cadastrado: no modo de
// atuação ele vale EXATAMENTE o que aquele privilégio libera (nada de bypass).
// O valor persistido é o slug do privilégio (ou "admin"); o valor legacy "lider"
// continua funcionando (resolve pelo slug, com fallback para rank 'lider').
const MODE_KEY = "priv_admin_mode";
let currentMode: string = "admin";
try {
  const stored = localStorage.getItem(MODE_KEY);
  currentMode = stored && stored !== "admin" ? stored : "admin";
} catch {
  // storage indisponível
}

/** Troca o modo de atuação do admin ("admin" ou slug do privilégio assumido) */
export function setAdminMode(mode: string) {
  currentMode = mode;
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    // storage indisponível
  }
  cachedSlug = null;
  cachedConfig = null;
  window.dispatchEvent(new Event("priv-mode-changed"));
}

export interface Privileges {
  loading: boolean;
  email: string;
  username: string;
  /** id do usuário autenticado (para RPCs de hierarquia) */
  userId: string;
  /** true = usuário é o master (pode assumir privilégios) */
  isAdmin: boolean;
  /** admin em modo admin = acesso pleno; modo de atuação = vale o privilégio assumido */
  actingAsAdmin: boolean;
  /** modo de atuação atual: "admin" ou o slug do privilégio assumido */
  mode: string;
  setMode: (m: string) => void;
  /** privilégios que o master pode assumir (rank != admin) — para o seletor da sidebar */
  actingChoices: { slug: string; name: string; rank: PrivilegeRank }[];
  rank: PrivilegeRank;
  roleSlug: string;
  config: PrivilegeConfig;
  access: (page: PageKey) => PageAccess;
  scope: (page: PageKey) => DataScope;
  /** pode abrir a página (full ou readonly) */
  canOpen: (page: PageKey) => boolean;
  /** aparece na sidebar (qualquer coisa exceto hidden) */
  isVisible: (page: PageKey) => boolean;
  /** pode editar (somente full; admin no modo admin sempre) */
  canEdit: (page: PageKey) => boolean;
  /** vê dados de todos: modo admin, ou escopo 'all' configurado */
  seesAll: (page: PageKey) => boolean;
  /** função granular liberada na página */
  hasFeature: (page: PageKey, feature: string) => boolean;
  /** primeira página abrível (fallback p/ redirects) */
  homeHref: string;
  /** e-mails de self + descendentes (escopo hierarchy), carregados sob demanda */
  hierarchyEmails: string[];
}

// Cache em módulo: evita refetch da config ao navegar entre páginas
let cachedSlug: string | null = null;
let cachedConfig: PrivilegeConfig | null = null;
let cachedRank: PrivilegeRank | null = null;
let cachedHierarchyEmails: string[] | null = null;

/** Invalida o cache de config (usar após editar privilégios) */
export function invalidatePrivilegesCache() {
  cachedSlug = null;
  cachedConfig = null;
  cachedRank = null;
  cachedHierarchyEmails = null;
}

export function usePrivileges(): Privileges {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [userId, setUserId] = useState("");
  const [roleSlug, setRoleSlug] = useState("user");
  const [isMaster, setIsMaster] = useState(false);
  const [mode, setModeState] = useState<string>(currentMode);
  const [actingChoices, setActingChoices] = useState<{ slug: string; name: string; rank: PrivilegeRank }[]>([]);
  const [config, setConfig] = useState<PrivilegeConfig>(defaultUserConfig());
  const [rank, setRank] = useState<PrivilegeRank>("colaborador");
  const [hierarchyEmails, setHierarchyEmails] = useState<string[]>([]);
  const [hierarchyLoaded, setHierarchyLoaded] = useState(false);

  const setMode = useCallback((m: string) => {
    setAdminMode(m);
    setModeState(m);
    invalidatePrivilegesCache();
  }, []);

  // Reage à troca de modo feita por outra instância (ex.: sidebar)
  useEffect(() => {
    const handler = () => {
      setModeState(currentMode);
      invalidatePrivilegesCache();
    };
    window.addEventListener("priv-mode-changed", handler);
    return () => window.removeEventListener("priv-mode-changed", handler);
  }, []);

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
        const master = mail.toLowerCase() === ADMIN_EMAIL.toLowerCase();
        const metaRole =
          master ? "admin" : ((user.user_metadata?.role as string) || "user");

        setEmail(mail);
        setUserId(user.id);
        setUsername((user.user_metadata?.username as string) || mail.split("@")[0]);
        setIsMaster(master);
        setRoleSlug(metaRole);

        if (master && currentMode === "admin") {
          setConfig(defaultAdminConfig());
          setRank("admin");
          setLoading(false);
          return;
        }

        // Resolve o privilégio efetivo:
        //  - master em modo de atuação → o privilégio assumido (pelo slug escolhido;
        //    sem ele, cai para o primeiro de rank 'lider'; sem nenhum, "usuario")
        //  - role 'user' → privilégio padrão 'usuario'
        //  - demais → privilégio do slug do metadata
        let slug: string;
        if (master) {
          const selectPriv = supabase
            .from("privileges")
            .select("slug, rank, config");
          let assumido: Pick<Privilege, "slug" | "rank" | "config"> | null = null;
          if (currentMode !== "admin") {
            const { data: escolhido } = await selectPriv
              .eq("slug", currentMode)
              .maybeSingle();
            if (disposed) return;
            assumido = (escolhido as Pick<Privilege, "slug" | "rank" | "config">) ?? null;
          }
          if (!assumido) {
            // fallback: primeiro privilégio de rank 'lider' (comportamento legacy)
            const { data: lider } = await selectPriv
              .eq("rank", "lider")
              .limit(1)
              .maybeSingle();
            if (disposed) return;
            assumido = (lider as Pick<Privilege, "slug" | "rank" | "config">) ?? null;
          }
          if (assumido) {
            slug = assumido.slug;
            cachedSlug = slug;
            cachedConfig = normalizeConfig(assumido.config);
            cachedRank = (assumido.rank || "colaborador") as PrivilegeRank;
            setConfig(cachedConfig);
            setRank(cachedRank);
            setLoading(false);
            return;
          }
          slug = "usuario"; // sem privilégio assumido nem de rank 'lider': padrão seguro
        } else {
          slug = metaRole === "user" ? "usuario" : metaRole;
        }

        if (cachedSlug === slug && cachedConfig) {
          setConfig(cachedConfig);
          setRank(cachedRank ?? "colaborador");
          setLoading(false);
          return;
        }
        const { data, error } = await supabase
          .from("privileges")
          .select("config, rank")
          .eq("slug", slug)
          .maybeSingle();
        if (disposed) return;
        // Fallback seguro: sem a tabela (SQL ainda não rodado) ou slug sem
        // registro (privilégio excluído), vale o padrão "Usuário".
        const cfg = error || !data
          ? defaultUserConfig()
          : normalizeConfig((data as Pick<Privilege, "config">).config);
        const rnk = !error && data
          ? (((data as Pick<Privilege, "rank">).rank || "colaborador") as PrivilegeRank)
          : "colaborador";
        cachedSlug = slug;
        cachedConfig = cfg;
        cachedRank = rnk;
        setConfig(cfg);
        setRank(rnk);
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
  }, [mode]);

  // Privilégios que o master pode assumir (seletor de modo de atuação)
  useEffect(() => {
    if (!isMaster) return;
    let disposed = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("privileges")
          .select("slug, name, rank")
          .neq("rank", "admin")
          .order("name", { ascending: true });
        if (disposed) return;
        setActingChoices(
          error
            ? []
            : ((data ?? []) as { slug: string; name: string; rank: string }[]).map((p) => ({
                slug: p.slug,
                name: p.name,
                rank: (p.rank || "colaborador") as PrivilegeRank,
              }))
        );
      } catch {
        if (!disposed) setActingChoices([]);
      }
    })();
    return () => {
      disposed = true;
    };
  }, [isMaster]);

  // Carrega os e-mails da hierarquia quando o modo/nível exige (lazy, 1x)
  useEffect(() => {
    if (loading || hierarchyLoaded) return;
    const precisa = PAGES.some((p) => !((isMaster && mode === "admin") || config.pages[p.key]?.scope !== "hierarchy"));
    const souLider = rank === "lider" || rank === "gerente";
    if (!precisa && !souLider) return;
    let disposed = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.rpc("list_hierarchy_emails");
        if (disposed) return;
        cachedHierarchyEmails = error
          ? [email.toLowerCase()]
          : ((data ?? []) as { email?: string }[])
              .map((e) => String(e?.email ?? "").toLowerCase())
              .filter(Boolean);
      } catch {
        cachedHierarchyEmails = [email.toLowerCase()];
      }
      if (!disposed) {
        setHierarchyEmails(cachedHierarchyEmails ?? [email.toLowerCase()]);
        setHierarchyLoaded(true);
      }
    })();
    return () => {
      disposed = true;
    };
  }, [loading, config, isMaster, mode, rank, email, hierarchyLoaded]);

  return useMemo<Privileges>(() => {
    const actingAsAdmin = isMaster && mode === "admin";
    const access = (page: PageKey): PageAccess =>
      actingAsAdmin ? "full" : config.pages[page]?.access ?? "hidden";
    const scope = (page: PageKey): DataScope =>
      actingAsAdmin ? "all" : config.pages[page]?.scope ?? "own";
    const canOpen = (page: PageKey) => {
      const a = access(page);
      return a === "full" || a === "readonly";
    };
    const homeHref = PAGES.find((p) => canOpen(p.key))?.href ?? "/overview";
    return {
      loading,
      email,
      username,
      userId,
      isAdmin: isMaster,
      actingAsAdmin,
      mode,
      setMode,
      rank,
      roleSlug,
      config,
      access,
      scope,
      canOpen,
      isVisible: (page: PageKey) => access(page) !== "hidden",
      canEdit: (page: PageKey) => actingAsAdmin || access(page) === "full",
      seesAll: (page: PageKey) => actingAsAdmin || scope(page) === "all",
      hasFeature: (page: PageKey, feature: string) =>
        actingAsAdmin ||
        (canOpen(page) && (config.pages[page]?.features?.[feature] ?? true)),
      homeHref,
      hierarchyEmails,
      actingChoices,
    };
  }, [loading, email, username, userId, isMaster, mode, rank, roleSlug, config, hierarchyEmails, actingChoices, setMode]);
}
