import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getWeekStart, getWeekDays, toDateStr, fromDateStr } from "@/lib/utils/dates";
import HabitsGrid from "./HabitsGrid";
import HabitsDashboard from "./HabitsDashboard";

export default async function HabitsPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { week } = await searchParams;

  const weekStart = week ? fromDateStr(week) : getWeekStart(new Date());
  const weekDays  = getWeekDays(weekStart);
  const weekEnd   = weekDays[6];
  const weekStartStr = toDateStr(weekStart);
  const weekEndStr   = toDateStr(weekEnd);

  const prevWeekDate = new Date(weekStart); prevWeekDate.setDate(prevWeekDate.getDate() - 7);
  const nextWeekDate = new Date(weekStart); nextWeekDate.setDate(nextWeekDate.getDate() + 7);
  const prevWeek  = toDateStr(prevWeekDate);
  const nextWeek  = toDateStr(nextWeekDate);
  const canGoNext = nextWeekDate <= getWeekStart(new Date());

  const { data: habits } = await supabase
    .from("habits")
    .select("id, name, goal_type, goal_options, goal_unit, goal_target")
    .eq("user_id", user.id)
    .eq("archived", false)
    .order("created_at");

  const { data: weekLogs } = await supabase
    .from("habit_logs")
    .select("habit_id, logged_date, value")
    .eq("user_id", user.id)
    .gte("logged_date", weekStartStr)
    .lte("logged_date", weekEndStr);

  const yearAgo = new Date(); yearAgo.setFullYear(yearAgo.getFullYear() - 1);
  const { data: allLogs } = await supabase
    .from("habit_logs")
    .select("habit_id, logged_date, value")
    .eq("user_id", user.id)
    .gte("logged_date", toDateStr(yearAgo))
    .order("logged_date");

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[#0A0A0A]">
          Hábitos
        </h1>
        <p className="font-[family-name:var(--font-mono)] text-xs text-[#9CA3AF] mt-1">Tu semana de un vistazo.</p>
      </div>

      <HabitsGrid
        habits={habits ?? []}
        logs={weekLogs ?? []}
        weekDays={weekDays}
        weekStart={weekStartStr}
        prevWeek={prevWeek}
        nextWeek={nextWeek}
        canGoNext={canGoNext}
      />

      <HabitsDashboard
        habits={habits ?? []}
        allLogs={allLogs ?? []}
      />
    </div>
  );
}
