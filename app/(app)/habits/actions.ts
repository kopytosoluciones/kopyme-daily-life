"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createHabit(data: {
  name: string;
  goal_type: "boolean" | "numeric" | "dropdown";
  goal_unit?: string;
  goal_target?: string;
  goal_options?: string[];
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error } = await supabase.from("habits").insert({
    user_id: user.id,
    name: data.name,
    goal_type: data.goal_type,
    goal_unit: data.goal_unit || null,
    goal_target: data.goal_target || null,
    goal_options: data.goal_options || [],
  });

  if (error) return { error: error.message };
  revalidatePath("/habits");
}

export async function upsertHabitLog(habitId: string, date: string, value: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("habit_logs").upsert(
    { user_id: user.id, habit_id: habitId, logged_date: date, value },
    { onConflict: "habit_id,logged_date" }
  );

  revalidatePath("/habits");
}

export async function deleteHabitLog(habitId: string, date: string) {
  const supabase = await createClient();
  await supabase
    .from("habit_logs")
    .delete()
    .eq("habit_id", habitId)
    .eq("logged_date", date);
  revalidatePath("/habits");
}

export async function updateHabitGoal(habitId: string, goal_target: string) {
  const supabase = await createClient();
  await supabase.from("habits").update({ goal_target }).eq("id", habitId);
  revalidatePath("/habits");
}

export async function updateHabitName(habitId: string, name: string) {
  const supabase = await createClient();
  if (!name.trim()) return;
  await supabase.from("habits").update({ name: name.trim() }).eq("id", habitId);
  revalidatePath("/habits");
}

export async function archiveHabit(habitId: string) {
  const supabase = await createClient();
  await supabase.from("habits").update({ archived: true }).eq("id", habitId);
  revalidatePath("/habits");
}
