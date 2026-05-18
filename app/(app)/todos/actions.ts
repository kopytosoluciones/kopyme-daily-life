"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createTodo(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const title = (formData.get("title") as string)?.trim();
  if (!title) return;

  const due_date = (formData.get("due_date") as string) || null;

  await supabase.from("todos").insert({
    user_id: user.id,
    title,
    due_date: due_date || null,
  });

  revalidatePath("/todos");
}

export async function toggleTodo(id: string, completed: boolean) {
  const supabase = await createClient();
  await supabase
    .from("todos")
    .update({
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    })
    .eq("id", id);
  revalidatePath("/todos");
}

export async function deleteTodo(id: string) {
  const supabase = await createClient();
  await supabase.from("todos").delete().eq("id", id);
  revalidatePath("/todos");
}

export async function updateTodoTitle(id: string, title: string) {
  const supabase = await createClient();
  const trimmed = title.trim();
  if (!trimmed) return;
  await supabase.from("todos").update({ title: trimmed }).eq("id", id);
  revalidatePath("/todos");
}

export async function updateTodoDueDate(id: string, due_date: string | null) {
  const supabase = await createClient();
  await supabase.from("todos").update({ due_date: due_date || null }).eq("id", id);
  revalidatePath("/todos");
}
