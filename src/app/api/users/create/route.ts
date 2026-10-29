import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { callerFeature, callerRpc, getCaller, unauthorized, forbidden } from "@/lib/api-auth";

export async function POST(request: Request) {
  // Admin OU quem tiver a função "cadastrar_usuarios" liberada no privilégio
  // (mesma regra do antigo create_user_scoped). A criação usa a API oficial
  // do GoTrue (auth.admin.createUser) — inserir direto em auth.users via
  // SQL gerava linhas que o GoTrue não enxerga (login quebrado).
  const caller = await getCaller(request);
  if (!caller) return unauthorized();
  if (!caller.isAdmin && !(await callerFeature(request, "usuarios", "cadastrar_usuarios"))) {
    return forbidden("Seu perfil não permite cadastrar usuários");
  }

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
    const { username, email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email e senha são obrigatórios." },
        { status: 400 }
      );
    }

    // Derive username from email if not provided
    const derivedUsername = username || email.split("@")[0];

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username: derivedUsername, role: "user" },
    });

    if (error) {
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

    // Quem cadastra (não-admin) torna-se líder do novo usuário — mesma regra
    // do create_user_scoped, via RPC executado no contexto do chamador.
    if (!caller.isAdmin) {
      const { error: hierError } = await callerRpc(request, "link_new_user_hierarchy", {
        p_member: data.user.id,
      });
      if (hierError) {
        // Usuário criado, mas o vínculo falhou: não falha a operação inteira,
        // o admin pode vincular na aba Hierarquia.
        return NextResponse.json({
          user: { id: data.user.id, email: data.user.email || "" },
          warning: "Usuário criado, mas não foi possível vinculá-lo à sua hierarquia: " + hierError.message,
        });
      }
    }

    return NextResponse.json({
      user: {
        id: data.user.id,
        email: data.user.email || "",
        created_at: data.user.created_at,
        last_sign_in_at: data.user.last_sign_in_at ?? null,
        email_confirmed_at: data.user.email_confirmed_at ?? null,
        role: data.user.user_metadata?.role || "user",
        username: data.user.user_metadata?.username || derivedUsername,
        banned_until: data.user.banned_until ?? null,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}