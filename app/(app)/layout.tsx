import { cookies } from "next/headers";
import Sidebar from "@/components/layout/Sidebar";
import { THEME_COOKIE, parseTheme } from "@/lib/theme";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar theme={theme} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
