import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Egg from "@/components/avatar/Egg";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

const quickActions = [
  { href: "/mood",   label: "¿Cómo estás hoy?" },
  { href: "/diary",  label: "Escribir algo"     },
  { href: "/habits", label: "Mis hábitos"       },
  { href: "/goals",  label: "Mis metas"         },
];

const stageLabels: Record<string, string> = {
  egg: "huevo", cracking: "grieta", hatching: "eclosión", emerging: "tomando forma", self: "vos",
};

const label = "font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase";

function asciiBar(pct: number, width = 20) {
  const filled = Math.round((pct / 100) * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_stage, avatar_points")
    .eq("id", user.id)
    .single();

  const name = profile?.display_name || user.email?.split("@")[0] || "vos";
  const stage = profile?.avatar_stage || "egg";
  const points = profile?.avatar_points || 0;

  const nextStagePoints: Record<string, number> = {
    egg: 50, cracking: 150, hatching: 350, emerging: 700, self: Infinity,
  };
  const nextPoints = nextStagePoints[stage] ?? 50;
  const progress = Math.min((points / nextPoints) * 100, 100);

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-4 py-7 md:px-6">
      <div>
        <h1 className="text-[40px] leading-none font-bold tracking-[-0.02em] break-words">
          {getGreeting()}, {name}<span className="k-cursor">_</span>
        </h1>
        <p className="mt-2 font-mono text-xs text-muted-foreground">
          etapa: {stageLabels[stage] ?? stage} · <span className="tabular">{points}</span> pts
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <section className="border-2 border-foreground bg-card">
          <div className="border-b-2 border-foreground px-4 py-2.5">
            <span className={label}>── Avatar</span>
          </div>
          <div className="flex justify-center px-4 py-8">
            <Egg stage={stage as "egg" | "cracking" | "hatching" | "emerging" | "self"} />
          </div>
        </section>

        <div className="flex flex-col gap-6">
          <section className="border-2 border-foreground bg-card">
            <div className="flex items-center justify-between gap-3 border-b-2 border-foreground px-4 py-2.5">
              <span className={label}>── Progreso</span>
              <span className="font-mono text-[11px] text-muted-foreground">{stageLabels[stage] ?? stage}</span>
            </div>
            <div className="flex flex-col gap-1 p-4">
              <span className={label}>Puntos</span>
              <span className="font-mono text-[22px] font-bold tabular">{points}</span>
              {stage !== "self" ? (
                <>
                  <span className="overflow-hidden font-mono text-xs whitespace-nowrap">
                    <span aria-hidden className="select-none">[{asciiBar(progress)}]</span>{" "}
                    <span className="tabular">{Math.round(progress)}%</span>
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    próxima etapa: <span className="tabular">{nextPoints}</span> pts
                  </span>
                </>
              ) : (
                <span className="font-mono text-[11px] text-muted-foreground">etapa final</span>
              )}
            </div>
          </section>

          <nav aria-label="Accesos rápidos" className="border-2 border-foreground bg-card">
            <div className="border-b-2 border-foreground px-4 py-2.5">
              <span className={label}>── Para hoy</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2">
              {quickActions.map(({ href, label: text }, i) => (
                <Link
                  key={href}
                  href={href}
                  className={`flex min-h-[44px] items-center justify-between gap-3 border-muted px-4 py-3 text-sm font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary ${
                    i < quickActions.length - 1 ? "max-sm:border-b" : ""
                  } ${i % 2 === 0 ? "sm:border-r" : ""} ${i < 2 ? "sm:border-b" : ""}`}
                >
                  <span className="leading-tight">{text}</span>
                  <span aria-hidden className="font-mono text-muted-foreground">→</span>
                </Link>
              ))}
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
}
