"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createEntry(
  content: string,
  entryDate: string,
  emoji: string | null,
  mood: number | null,
): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado" };

    const { error } = await supabase
      .from("diary_entries")
      .insert({ user_id: user.id, content, entry_date: entryDate, emoji, mood });

    if (error) return { error: error.message };

    revalidatePath("/diary");
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

export async function deleteEntry(id: string): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("diary_entries")
      .delete()
      .eq("id", id);

    if (error) return { error: error.message };

    revalidatePath("/diary");
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error desconocido" };
  }
}
