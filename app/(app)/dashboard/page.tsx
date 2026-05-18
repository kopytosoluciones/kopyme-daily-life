import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Egg from "@/components/avatar/Egg";
import { Waves, BookOpen, Leaf, Target } from "lucide-react";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

const quickActions = [
  { href: "/mood",   Icon: Waves,    label: "¿Cómo estás hoy?" },
  { href: "/diary",  Icon: BookOpen, label: "Escribir algo"     },
  { href: "/habits", Icon: Leaf,     label: "Mis hábitos"       },
  { href: "/goals",  Icon: Target,   label: "Mis metas"         },
];

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
    <div className="min-h-screen flex flex-col items-center justify-center px-8 py-12">

      {/* Greeting */}
      <div className="text-center mb-10">
        <p className="text-sm mb-1" style={{ color: "rgba(255,255,255,0.75)", textShadow: "0 1px 4px rgba(0,0,0,0.4)" }}>{getGreeting()},</p>
        <h1
          className="font-[family-name:var(--font-lora)] text-3xl font-semibold"
          style={{ color: "#FFFFFF", textShadow: "0 2px 8px rgba(0,0,0,0.35)" }}
        >
          {name}
        </h1>
      </div>

      {/* Egg */}
      <Egg stage={stage as "egg" | "cracking" | "hatching" | "emerging" | "self"} />

      {/* Progress bar */}
      {stage !== "self" && (
        <div className="mt-10 w-full max-w-xs">
          <div className="flex justify-between text-xs mb-1.5" style={{ color: "rgba(255,255,255,0.8)", textShadow: "0 1px 3px rgba(0,0,0,0.4)" }}>
            <span>{points} puntos</span>
            <span>próxima etapa: {nextPoints}</span>
          </div>
          <div className="h-2 bg-white/15 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#E07B4A] rounded-full transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="mt-10 grid grid-cols-2 gap-3 w-full max-w-xs">
        {quickActions.map(({ href, Icon, label }) => (
          <a
            key={href}
            href={href}
            className="flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm text-[#E8DFC8] hover:text-white transition-all active:scale-[0.97] border border-white/15 hover:border-white/30 hover:bg-white/10"
            style={{ background: "rgba(10, 22, 8, 0.55)", backdropFilter: "blur(8px)" }}
          >
            <Icon size={16} strokeWidth={1.8} className="shrink-0 text-[#A8C890]" />
            <span className="font-medium leading-tight">{label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
