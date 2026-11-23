import { cookies } from "next/headers";
import ThemeToggle from "@/components/layout/ThemeToggle";
import { THEME_COOKIE, parseTheme } from "@/lib/theme";

export const metadata = { title: "Ajustes · kopyme" };

export default async function SettingsPage() {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);

  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-6 px-4 py-7 md:px-6">
      <header>
        <h1 className="text-[40px] leading-none font-bold tracking-[-0.02em]">
          Ajustes<span className="k-cursor">_</span>
        </h1>
        <p className="mt-2 font-mono text-xs text-muted-foreground">cómo se ve y se comporta kopyme</p>
      </header>

      <section className="border-2 border-foreground bg-card">
        <div className="border-b-2 border-foreground px-4 py-2.5">
          <h2 className="font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">── Apariencia</h2>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="font-medium">Tema</p>
            <p className="text-sm text-muted-foreground">Sistema sigue la configuración de tu compu o celular.</p>
          </div>
          <div className="w-full max-w-[280px]">
            <ThemeToggle initial={theme} />
          </div>
        </div>
      </section>
    </div>
  );
}
