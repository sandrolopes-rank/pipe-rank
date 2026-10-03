import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[API /api/users] Missing env vars");
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
    console.log("[API /api/users] Calling RPC list_all_auth_users...");
    const { data: rpcData, error: rpcError } = await supabase.rpc("list_all_auth_users");

    if (rpcError) {
      console.error("[API /api/users] RPC error:", rpcError);
      return NextResponse.json(
        { error: `Erro na função RPC list_all_auth_users: ${rpcError.message}. Verifique se a função foi criada corretamente no Supabase SQL Editor.` },
        { status: 500 }
      );
    }

    if (!rpcData || !Array.isArray(rpcData)) {
      console.warn("[API /api/users] RPC returned no data:", rpcData);
      return NextResponse.json({ users: [] });
    }

    console.log("[API /api/users] RPC success, found", rpcData.length, "users");

    const users = rpcData.map((user: Record<string, unknown>) => ({
      id: user.id as string,
      email: (user.email as string) || "",
      created_at: user.created_at as string,
      last_sign_in_at: (user.last_sign_in_at as string | null) ?? null,
      email_confirmed_at: (user.email_confirmed_at as string | null) ?? null,
      role: ((user.raw_user_meta_data as Record<string, unknown>)?.role as string) || "user",
      username: ((user.raw_user_meta_data as Record<string, unknown>)?.username as string) || ((user.email as string)?.split("@")[0]) || "",
      banned_until: (user.banned_until as string | null) ?? null,
    }));

    return NextResponse.json({ users });
  } catch (err) {
    console.error("[API /api/users] Exception:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}