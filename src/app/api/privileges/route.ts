import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  RESERVED_SLUGS,
  normalizeConfig,
  slugify,
  type Privilege,
  type PrivilegeRank,
} from "@/lib/privileges";
import { getCaller, unauthorized, forbidden } from "@/lib/api-auth";

const VALID_RANKS: PrivilegeRank[] = ["lider", "gerente", "colaborador"];

function serviceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// GET /api/privileges — lista todos os privilégios (sistema + custom)
export async function GET(request: Request) {
  const caller = await getCaller(request);
  if (!caller) return unauthorized();
  if (!caller.canPriv) return forbidden("Seu perfil não permite gerenciar privilégios");

  const supabase = serviceClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Missing Supabase environment variables" },
      { status: 500 }
    );
  }

  const { data, error } = await supabase
    .from("privileges")
    .select("*")
    .order("is_system", { ascending: false })
    .order("name", { ascending: true });

  if (error) {
    console.error("[API /api/privileges] GET error:", error);
    return NextResponse.json(
      {
        error: `${error.message}. Verifique se a tabela 'privileges' foi criada (supabase-privileges.sql).`,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ privileges: (data ?? []) as Privilege[] });
}

// POST /api/privileges — cria um privilégio custom
export async function POST(request: Request) {
  const caller = await getCaller(request);
  if (!caller) return unauthorized();
  if (!caller.canPriv) return forbidden("Seu perfil não permite criar privilégios");

  const supabase = serviceClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Missing Supabase environment variables" },
      { status: 500 }
    );
  }

  try {
    const { name, description, config, rank } = await request.json();

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Nome do privilégio é obrigatório." },
        { status: 400 }
      );
    }

    const nivel: PrivilegeRank =
      rank && VALID_RANKS.includes(rank as PrivilegeRank) ? (rank as PrivilegeRank) : "colaborador";

    const slug = slugify(name);
    if (!slug) {
      return NextResponse.json(
        { error: "Nome inválido para gerar o identificador (slug)." },
        { status: 400 }
      );
    }
    if (RESERVED_SLUGS.has(slug)) {
      return NextResponse.json(
        { error: `O nome geraria o identificador reservado "${slug}". Escolha outro nome.` },
        { status: 400 }
      );
    }

    const { data: existing } = await supabase
      .from("privileges")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (existing) {
      return NextResponse.json(
        { error: `Já existe um privilégio com o identificador "${slug}".` },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from("privileges")
      .insert({
        slug,
        name: name.trim(),
        description: typeof description === "string" ? description.trim() || null : null,
        is_system: false,
        rank: nivel,
        config: normalizeConfig(config),
      })
      .select()
      .single();

    if (error) {
      console.error("[API /api/privileges] POST error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, privilege: data as Privilege });
  } catch (err) {
    console.error("[API /api/privileges] POST exception:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
