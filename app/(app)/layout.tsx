import Sidebar from "@/components/layout/Sidebar";
import { createClient } from "@/lib/supabase/server";
import { getNotices } from "@/lib/notifications";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const notices = user ? await getNotices(user.id) : [];

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar notices={notices} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
