"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createEntry(
  body: string,
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
      .insert({ user_id: user.id, body, entry_date: entryDate, emoji, mood });

    if (error) return { error: error.message };

    revalidatePath("/diary");
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

export async function updateEntry(
  id: string,
  body: string,
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
      .update({ body, entry_date: entryDate, emoji, mood })
      .eq("id", id)
      .eq("user_id", user.id);

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado" };

    const { error } = await supabase
      .from("diary_entries")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) return { error: error.message };

    revalidatePath("/diary");
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

export async function restoreLastDeleted(): Promise<{ error: string | null; restored: boolean }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado", restored: false };

    // Find the most recently soft-deleted entry
    const { data: entries, error: fetchError } = await supabase
      .from("diary_entries")
      .select("id")
      .eq("user_id", user.id)
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false })
      .limit(1);

    if (fetchError) return { error: fetchError.message, restored: false };
    if (!entries?.length) return { error: null, restored: false };

    const { error } = await supabase
      .from("diary_entries")
      .update({ deleted_at: null })
      .eq("id", entries[0].id);

    if (error) return { error: error.message, restored: false };

    revalidatePath("/diary");
    return { error: null, restored: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error desconocido", restored: false };
  }
}
