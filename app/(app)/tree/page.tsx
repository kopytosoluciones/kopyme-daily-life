import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TreeClient from "./TreeClient";

export default async function TreePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-5 border-b border-[#E5E7EB] shrink-0">
        <h1 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#0A0A0A]">
          Árbol de la vida
        </h1>
        <p className="text-sm text-[#6B7280] mt-0.5">
          Hacé click en cada parte para registrar y ver tu historial.
        </p>
      </div>
      <div className="flex-1 overflow-hidden">
        <TreeClient />
      </div>
    </div>
  );
}
