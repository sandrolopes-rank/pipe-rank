import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[API /api/users] Missing env vars:", {
      hasUrl: !!supabaseUrl,
      hasKey: !!serviceRoleKey
    });
    return NextResponse.json(
      { error: "Missing Supabase environment variables" },
      { status: 500 }
    );
  }

  // Create admin client with explicit options to ensure compatibility
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Try to list users with pagination to avoid timeout on large lists
    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 100 });

    if (error) {
      console.error("[API /api/users] Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || !data.users) {
      return NextResponse.json({ users: [] });
    }

    const users = data.users.map((user) => ({
      id: user.id,
      email: user.email || "",
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at ?? null,
      email_confirmed_at: user.email_confirmed_at ?? null,
      role: user.user_metadata?.role || "user",
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