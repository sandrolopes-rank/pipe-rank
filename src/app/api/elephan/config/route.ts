import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseJs } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Salva a chave de API da Elephan na tabela app_config (Supabase).
// Somente o admin do CRM pode chamar esta rota — a chave vale para todos
// os usuários imediatamente (o proxy lê via service role).
const ADMIN_EMAIL = "sandro.lopes@rankmyapp.com.br";

export async function POST(request: NextRequest) {
  try {
    // valida a sessão e o perfil de admin
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email || user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      return NextResponse.json({ error: "Somente o admin pode configurar a chave." }, { status: 403 });
    }

    const { valor } = await request.json();
    if (typeof valor !== "string" || !valor.trim().startsWith("elk_prod_")) {
      return NextResponse.json({ error: "Chave inválida (esperado elk_prod_...)" }, { status: 400 });
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!serviceKey || !url) {
      return NextResponse.json({ error: "Service role não configurada no servidor." }, { status: 500 });
    }
    const admin = createSupabaseJs(url, serviceKey);
    const { error } = await admin
      .from("app_config")
      .upsert({ chave: "elephan_api_key", valor: valor.trim(), atualizado_em: new Date().toISOString() });
    if (error) {
      return NextResponse.json(
        { error: "Falha ao salvar a chave no Supabase", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: "Falha ao salvar a chave", message: String(e instanceof Error ? e.message : e) },
      { status: 500 }
    );
  }
}
