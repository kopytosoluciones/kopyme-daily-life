"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type TreeEntry = {
  id: string;
  body: string;
  entry_date: string;
  created_at: string;
};

export async function saveTreeEntry(
  section: string,
  body: string,
  entryDate: string,
): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado" };

    const { error } = await supabase
      .from("life_tree_entries")
      .insert({ user_id: user.id, section, body, entry_date: entryDate });

    if (error) return { error: error.message };

    revalidatePath("/tree");
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

export async function getTreeEntries(
  section: string,
): Promise<{ entries: TreeEntry[]; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { entries: [], error: "No autenticado" };

    const { data, error } = await supabase
      .from("life_tree_entries")
      .select("id, body, entry_date, created_at")
      .eq("user_id", user.id)
      .eq("section", section)
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) return { entries: [], error: error.message };

    return { entries: data ?? [], error: null };
  } catch (e) {
    return { entries: [], error: e instanceof Error ? e.message : "Error desconocido" };
  }
}
