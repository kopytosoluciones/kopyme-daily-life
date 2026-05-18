import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/layout/Sidebar";
import JungleScene from "@/components/environment/JungleScene";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let stage = "egg";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("avatar_stage")
      .eq("id", user.id)
      .single();
    stage = profile?.avatar_stage ?? "egg";
  }

  return (
    <div className="flex min-h-screen relative">
      <JungleScene stage={stage} />
      <Sidebar />
      <main className="flex-1 overflow-y-auto relative" style={{ zIndex: 1 }}>
        {children}
      </main>
    </div>
  );
}
