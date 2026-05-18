"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function register(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) return { error: error.message };
  if (!data.user) return { error: "No se pudo crear la cuenta." };

  // Use admin client to bypass RLS — session not yet active at this point
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  const username = email.split("@")[0].replace(/[^a-z0-9_]/gi, "_") + "_" + data.user.id.slice(0, 4);
  const { error: profileError } = await admin
    .from("profiles")
    .upsert({
      id: data.user.id,
      username,
      display_name: email.split("@")[0],
    });

  if (profileError) return { error: "Cuenta creada pero error al inicializar el perfil. Intentá entrar." };

  redirect("/dashboard");
}
