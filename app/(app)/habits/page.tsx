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
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-4 py-7 md:px-6">
      <header>
        <h1 className="text-[40px] leading-none font-bold tracking-[-0.02em]">
          Hábitos<span className="k-cursor">_</span>
        </h1>
        <p className="mt-2 font-mono text-xs text-muted-foreground">
          <span className="tabular">{habits?.length ?? 0}</span> {habits?.length === 1 ? "hábito" : "hábitos"} · tu semana de un vistazo
        </p>
      </header>

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
