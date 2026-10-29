// Autorização server-side das rotas /api/*.
// Extrai o JWT do header Authorization (ou usa a sessão de cookies do
// browser) e valida a sessão, resolvendo o que o chamador pode fazer
// (via RPCs SECURITY DEFINER do supabase-hierarquia.sql).
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { ADMIN_EMAIL } from "./privileges";

export interface Caller {
  userId: string;
  email: string;
  isAdmin: boolean;
  canPriv: boolean;
}

export function unauthorized(msg = "Não autorizado") {
  return NextResponse.json({ error: msg }, { status: 401 });
}

export function forbidden(msg = "Seu perfil não permite esta operação") {
  return NextResponse.json({ error: msg }, { status: 403 });
}

// Admin = role 'admin' no metadata OU o e-mail master do projeto.
// O client (use-privileges) identifica o master pelo e-mail (ADMIN_EMAIL);
// o server precisa usar o MESMO critério, senão o master real é rejeitado
// (caso real: conta master sem role no user_metadata → 401 em /api/users/*).
function resolveAdmin(user: User): boolean {
  const metaRole = ((user.user_metadata?.role as string) || "").toLowerCase();
  return (
    metaRole === "admin" ||
    (user.email ?? "").toLowerCase() === ADMIN_EMAIL.toLowerCase()
  );
}

async function resolveCaller(
  supabase: SupabaseClient,
  user: User
): Promise<Caller> {
  const isAdmin = resolveAdmin(user);

  let canPriv = isAdmin;
  if (!isAdmin) {
    try {
      const { data } = await supabase.rpc("can_manage_privileges");
      canPriv = data === true;
    } catch {
      canPriv = false;
    }
  }

  return { userId: user.id, email: user.email!, isAdmin, canPriv };
}

export async function getCaller(request: Request): Promise<Caller | null> {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !anon) return null;

  const supabase = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData?.user?.email) return null;

  return resolveCaller(supabase, userData.user);
}

// Resolve o chamador aceitando Bearer OU a sessão de cookies do browser.// Necessário porque os consumidores do proxy da Elephan e da rota de tema
// fazem fetch same-origin sem header Authorization (a sessão vai por cookie).
export async function getCallerWithSession(
  request: Request
): Promise<Caller | null> {
  const viaBearer = await getCaller(request);
  if (viaBearer) return viaBearer;

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return null;
    return resolveCaller(supabase, user);
  } catch {
    return null;
  }
}

// Executa uma RPC como o CHAMADOR (contexto auth.uid() dele), usando o
// mesmo client Bearer do getCaller. Usado para validar features do
// privilégio (caller_feature) e operações que precisam do contexto do
// usuário fora das rotas de service role.
export async function callerRpc(
  request: Request,
  fn: string,
  args: Record<string, unknown>
): Promise<{ data: unknown; error: { message: string } | null }> {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !anon) return { data: null, error: { message: "Sem credenciais" } };

  const supabase = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await supabase.rpc(fn, args);
  return { data, error: error ? { message: error.message } : null };
}

// Feature granular do privilégio do chamador (RPC caller_feature)
export async function callerFeature(
  request: Request,
  page: string,
  feature: string
): Promise<boolean> {
  try {
    const { data, error } = await callerRpc(request, "caller_feature", {
      p_page: page,
      p_feature: feature,
    });
    return !error && data === true;
  } catch {
    return false;
  }
}
