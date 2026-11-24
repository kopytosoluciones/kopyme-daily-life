import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getConnections } from "@/lib/supabase/connections";
import VinculosClient from "./VinculosClient";

export const metadata = { title: "Vínculos · kopyme" };

export default async function ConnectionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { groups, people, error } = await getConnections(supabase);
  return <VinculosClient initialGroups={groups} initialPeople={people} loadError={error} />;
}
