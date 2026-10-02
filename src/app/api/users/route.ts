import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[API /api/users] Missing env vars:", {
      hasUrl: !!supabaseUrl,
      hasKey: !!serviceRoleKey,
    });
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
    // Try RPC function first (bypasses admin API issues)
    const { data: rpcData, error: rpcError } = await supabase.rpc("list_all_auth_users");

    if (!rpcError && rpcData) {
      const users = rpcData.map((user: Record<string, unknown>) => ({
        id: user.id as string,
        email: (user.email as string) || "",
        created_at: user.created_at as string,
        last_sign_in_at: (user.last_sign_in_at as string | null) ?? null,
        email_confirmed_at: (user.email_confirmed_at as string | null) ?? null,
        role: ((user.raw_user_meta_data as Record<string, unknown>)?.role as string) || "user",
      }));
      return NextResponse.json({ users });
    }

    // Fallback to admin.listUsers if RPC fails
    console.warn("[API /api/users] RPC failed, trying admin.listUsers:", rpcError);
    const { data: adminData, error: adminError } = await supabase.auth.admin.listUsers();

    if (adminError) {
      console.error("[API /api/users] Both RPC and admin.listUsers failed:", { rpcError, adminError });
      return NextResponse.json({ error: adminError.message }, { status: 500 });
    }

    if (adminData?.users) {
      const users = adminData.users.map((user) => ({
        id: user.id,
        email: user.email || "",
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at ?? null,
        email_confirmed_at: user.email_confirmed_at ?? null,
        role: user.user_metadata?.role || "user",
      }));
      return NextResponse.json({ users });
    }

    return NextResponse.json({ users: [] });
  } catch (err) {
    console.error("[API /api/users] Exception:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}