"use server";

import { createClient } from "@/lib/supabase/server";

export async function requestPasswordReset(email: string) {
  const supabase = await createClient();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${siteUrl}/auth/callback?type=recovery`,
  });

  if (error) return { error: error.message };
  return { error: null };
}
