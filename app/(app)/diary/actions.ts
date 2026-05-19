"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createEntry(content: string, entryDate: string, emoji: string | null) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase
    .from("diary_entries")
    .insert({ user_id: user.id, content, entry_date: entryDate, emoji });
  if (error) throw new Error(error.message);
  revalidatePath("/diary");
}

export async function deleteEntry(id: string) {
  const supabase = await createClient();
  await supabase.from("diary_entries").delete().eq("id", id);
  revalidatePath("/diary");
}
