import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DiaryClient from "./DiaryClient";

export default async function DiaryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: entries } = await supabase
    .from("diary_entries")
    .select("id, content, entry_date, emoji, mood")
    .eq("user_id", user.id)
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false });

  return <DiaryClient entries={entries ?? []} />;
}
