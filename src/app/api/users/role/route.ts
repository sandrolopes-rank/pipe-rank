import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCaller, unauthorized } from "@/lib/api-auth";

export async function PATCH(request: Request) {
  // Somente admin: líderes alteram privilégios via RPC set_user_role_scoped
  const caller = await getCaller(request);
  if (!caller) return unauthorized();
  if (!caller.isAdmin) return unauthorized("Apenas administradores alteram privilégios por aqui");

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
    const { userId, role } = await request.json();

    if (!userId || !role) {
      return NextResponse.json(
        { error: "userId e role são obrigatórios." },
        { status: 400 }
      );
    }

    // Roles válidas: 'admin', 'user' ou slug de um privilégio custom existente
    if (role !== "admin" && role !== "user") {
      const { data: priv } = await supabase
        .from("privileges")
        .select("slug")
        .eq("slug", role)
        .eq("is_system", false)
        .maybeSingle();
      if (!priv) {
        return NextResponse.json(
          { error: "Privilégio inválido. Use 'admin', 'user' ou um privilégio cadastrado." },
          { status: 400 }
        );
      }
    }

    // Update user metadata with the new role
    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { role },
    });

    if (error) {
      console.error("[API /api/users/role] Error updating user:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email || "",
        role: data.user.user_metadata?.role || "user",
      },
    });
  } catch (err) {
    console.error("[API /api/users/role] Exception:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}