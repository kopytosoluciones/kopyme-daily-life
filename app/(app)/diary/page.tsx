import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DiaryClient from "./DiaryClient";

export default async function DiaryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: entries }, { data: profile }] = await Promise.all([
    supabase
      .from("diary_entries")
      .select("id, body, entry_date, emoji, mood")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single(),
  ]);

  const displayName = profile?.display_name || user.email?.split("@")[0] || "vos";

  return <DiaryClient entries={entries ?? []} displayName={displayName} />;
}
