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
    <div className="min-h-screen bg-white px-8 py-12 max-w-lg mx-auto">

      {/* Greeting */}
      <div className="mb-10">
        <p className="font-[family-name:var(--font-mono)] text-xs text-[#9CA3AF] mb-1">
          {getGreeting()},
        </p>
        <h1 className="font-[family-name:var(--font-playfair)] text-4xl font-bold text-[#0A0A0A]">
          {name}
        </h1>
      </div>

      {/* Egg */}
      <div className="flex justify-center">
        <Egg stage={stage as "egg" | "cracking" | "hatching" | "emerging" | "self"} />
      </div>

      {/* Progress bar */}
      {stage !== "self" && (
        <div className="mt-10 w-full">
          <div className="flex justify-between mb-1.5">
            <span className="font-[family-name:var(--font-mono)] text-xs text-[#9CA3AF]">
              {points} pts
            </span>
            <span className="font-[family-name:var(--font-mono)] text-xs text-[#9CA3AF]">
              próxima etapa: {nextPoints}
            </span>
          </div>
          <div className="h-1.5 bg-[#F5F5F5] rounded-full overflow-hidden border border-[#E5E7EB]">
            <div
              className="h-full bg-[#39FF14] rounded-full transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="mt-10 grid grid-cols-2 gap-3">
        {quickActions.map(({ href, Icon, label }) => (
          <a
            key={href}
            href={href}
            className="flex items-center gap-2.5 bg-white border-2 border-[#0A0A0A] rounded-xl px-4 py-3 text-sm text-[#0A0A0A] font-medium hover:bg-[#F5F5F5] active:scale-[0.97] transition-all"
          >
            <Icon size={16} strokeWidth={1.8} className="shrink-0 text-[#9D4EDD]" />
            <span className="leading-tight">{label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
