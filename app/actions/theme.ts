"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { THEME_COOKIE, parseTheme, type Theme } from "@/lib/theme";

export async function setTheme(value: Theme): Promise<{ error: string | null }> {
  const theme = parseTheme(value);

  (await cookies()).set(THEME_COOKIE, theme, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: null };

  const { error } = await supabase.from("profiles").update({ theme }).eq("id", user.id);
  return { error: error?.message ?? null };
}
