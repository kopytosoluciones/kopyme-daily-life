import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getFinanceData } from "@/lib/supabase/finance";
import CombustibleClient from "./CombustibleClient";

export const metadata = { title: "Combustible · kopyme" };

export default async function CombustiblePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { wallets, months, error } = await getFinanceData(supabase);

  return <CombustibleClient initialWallets={wallets} initialMonths={months} loadError={error} />;
}
