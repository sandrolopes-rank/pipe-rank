import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/overview";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Check if user email is from allowed domain
      const { data: { user } } = await supabase.auth.getUser();
      const allowedDomain = "rankmyapp.com.br";

      if (user?.email && !user.email.toLowerCase().endsWith(allowedDomain)) {
        // Sign out user if not from allowed domain
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/login?error=unauthorized_domain`);
      }

      // Registra o acesso (login via Google) no caderno de portaria
      if (user) {
        try {
          await supabase.from("access_logs").insert({
            user_id: user.id,
            email: user.email ?? "",
            event: "login",
            user_agent: request.headers.get("user-agent") ?? "",
          });
        } catch {
          // Falha no log nunca pode impedir o login
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}