import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Egg from "@/components/avatar/Egg";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
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
    egg: 50,
    cracking: 150,
    hatching: 350,
    emerging: 700,
    self: Infinity,
  };
  const nextPoints = nextStagePoints[stage] ?? 50;
  const progress = Math.min((points / nextPoints) * 100, 100);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-8 py-12">
      {/* Greeting */}
      <div className="text-center mb-10">
        <p className="text-[#7A6E5F] text-sm mb-1">{getGreeting()},</p>
        <h1 className="font-[family-name:var(--font-lora)] text-3xl font-semibold text-[#2C2416]">
          {name}
        </h1>
      </div>

      {/* Egg */}
      <Egg stage={stage as "egg" | "cracking" | "hatching" | "emerging" | "self"} />

      {/* Progress bar */}
      {stage !== "self" && (
        <div className="mt-10 w-full max-w-xs">
          <div className="flex justify-between text-xs text-[#7A6E5F] mb-1.5">
            <span>{points} puntos</span>
            <span>próxima etapa: {nextPoints}</span>
          </div>
          <div className="h-2 bg-[#E2D9C8] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#E07B4A] rounded-full transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="mt-10 grid grid-cols-2 gap-3 w-full max-w-xs">
        {[
          { href: "/mood",  icon: "🌊", label: "¿Cómo estás hoy?" },
          { href: "/diary", icon: "📖", label: "Escribir algo"     },
          { href: "/habits",icon: "🌱", label: "Mis hábitos"       },
          { href: "/goals", icon: "🎯", label: "Mis metas"         },
        ].map(({ href, icon, label }) => (
          <a
            key={href}
            href={href}
            className="flex items-center gap-2.5 bg-[#FDFAF4] border border-[#E2D9C8] rounded-xl px-4 py-3 text-sm text-[#2C2416] hover:border-[#E07B4A] hover:shadow-sm transition-all active:scale-[0.97]"
          >
            <span className="text-base">{icon}</span>
            <span className="font-medium">{label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
