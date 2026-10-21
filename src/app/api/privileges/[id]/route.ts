import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeConfig, type Privilege } from "@/lib/privileges";

function serviceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// PATCH /api/privileges/[id] — atualiza nome/descrição/config
// Regras: 'admin' é imutável; 'usuario' é editável; slug nunca muda.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = serviceClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Missing Supabase environment variables" },
      { status: 500 }
    );
  }

  try {
    const { id } = await params;
    const body = await request.json();

    const { data: current, error: fetchError } = await supabase
      .from("privileges")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (fetchError || !current) {
      return NextResponse.json(
        { error: "Privilégio não encontrado." },
        { status: 404 }
      );
    }

    if (current.slug === "admin") {
      return NextResponse.json(
        { error: "O privilégio Admin tem acesso pleno e não pode ser alterado." },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {};
    if (typeof body.name === "string" && body.name.trim()) {
      updates.name = body.name.trim();
    }
    if (typeof body.description === "string") {
      updates.description = body.description.trim() || null;
    }
    if (body.config !== undefined) {
      updates.config = normalizeConfig(body.config);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "Nada para atualizar." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("privileges")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[API /api/privileges/[id]] PATCH error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, privilege: data as Privilege });
  } catch (err) {
    console.error("[API /api/privileges/[id]] PATCH exception:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// DELETE /api/privileges/[id] — exclui privilégio custom (sistema = proibido)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = serviceClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Missing Supabase environment variables" },
      { status: 500 }
    );
  }

  try {
    const { id } = await params;

    const { data: current } = await supabase
      .from("privileges")
      .select("slug, is_system")
      .eq("id", id)
      .maybeSingle();

    if (!current) {
      return NextResponse.json(
        { error: "Privilégio não encontrado." },
        { status: 404 }
      );
    }
    if (current.is_system) {
      return NextResponse.json(
        { error: "Privilégios de sistema (Admin, Usuário) não podem ser excluídos." },
        { status: 400 }
      );
    }

    const { error } = await supabase.from("privileges").delete().eq("id", id);
    if (error) {
      console.error("[API /api/privileges/[id]] DELETE error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[API /api/privileges/[id]] DELETE exception:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
