import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function PATCH(request: Request) {
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
    const { userId, themePalette, themeMode } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "userId é obrigatório." },
        { status: 400 }
      );
    }

    // Get current user metadata
    const { data: userData, error: getUserError } = await supabase.auth.admin.getUserById(userId);
    if (getUserError) {
      return NextResponse.json({ error: getUserError.message }, { status: 500 });
    }

    const currentMetadata = userData.user.user_metadata || {};
    const updatedMetadata = {
      ...currentMetadata,
      ...(themePalette !== undefined && { theme_palette: themePalette }),
      ...(themeMode !== undefined && { theme_mode: themeMode }),
    };

    const { error } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: updatedMetadata,
    });

    if (error) {
      console.error("[API /api/users/theme] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[API /api/users/theme] Exception:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}