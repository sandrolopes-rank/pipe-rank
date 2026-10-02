import { NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Missing Supabase environment variables" },
      { status: 500 }
    );
  }

  const supabase = createSupabaseAdmin(supabaseUrl, serviceRoleKey);

  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email e senha são obrigatórios." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) {
      // Check for duplicate email error
      if (
        error.message.includes("duplicate") ||
        error.message.includes("already registered") ||
        error.message.includes("User already registered")
      ) {
        return NextResponse.json(
          { error: `O email ${email} já está cadastrado no sistema.` },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      user: {
        id: data.user.id,
        email: data.user.email || "",
        created_at: data.user.created_at,
        last_sign_in_at: data.user.last_sign_in_at ?? null,
        email_confirmed_at: data.user.email_confirmed_at ?? null,
        role: "user",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}