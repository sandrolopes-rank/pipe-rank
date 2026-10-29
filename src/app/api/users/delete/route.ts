import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCaller, unauthorized } from "@/lib/api-auth";

export async function DELETE(request: Request) {
  // Somente admin: líderes excluem via RPC delete_user_scoped
  const caller = await getCaller(request);
  if (!caller) return unauthorized();
  if (!caller.isAdmin) return unauthorized("Apenas administradores excluem usuários por aqui");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Missing Supabase environment variables" },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "userId é obrigatório." },
        { status: 400 }
      );
    }

    const { error } = await supabase.auth.admin.deleteUser(userId);

    if (error) {
      console.error("[API /api/users/delete] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[API /api/users/delete] Exception:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}