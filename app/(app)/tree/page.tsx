import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TreeClient from "./TreeClient";

export default async function TreePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <TreeClient />;
}
