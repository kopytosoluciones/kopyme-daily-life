"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ── LIST ACTIONS ──────────────────────────────────────────────

export async function createList(name: string, color: string = "#9D4EDD") {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const trimmed = name.trim();
  if (!trimmed) return { error: "Nombre requerido" };

  const { data: last } = await supabase
    .from("todo_lists")
    .select("position")
    .eq("user_id", user.id)
    .order("position", { ascending: false })
    .limit(1)
    .single();

  await supabase
    .from("todo_lists")
    .insert({ user_id: user.id, name: trimmed, color, position: (last?.position ?? -1) + 1 });

  revalidatePath("/todos");
  return { error: null };
}

export async function updateList(id: string, name: string, color: string) {
  const supabase = await createClient();
  await supabase.from("todo_lists").update({ name: name.trim(), color }).eq("id", id);
  revalidatePath("/todos");
}

export async function deleteList(id: string) {
  const supabase = await createClient();
  await supabase.from("todo_lists").delete().eq("id", id);
  revalidatePath("/todos");
}

export async function reorderLists(orderedIds: string[]) {
  const supabase = await createClient();
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("todo_lists").update({ position: index }).eq("id", id)
    )
  );
  revalidatePath("/todos");
}

// Keep for backward compat (unused in new UI)
export async function updateListName(id: string, name: string) {
  const supabase = await createClient();
  const trimmed = name.trim();
  if (!trimmed) return;
  await supabase.from("todo_lists").update({ name: trimmed }).eq("id", id);
  revalidatePath("/todos");
}

// ── TODO ACTIONS ──────────────────────────────────────────────

export async function createTodo(listId: string, title: string, dueDate?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const trimmed = title.trim();
  if (!trimmed) return;

  // Insert at top: position = (current minimum) - 1
  const { data: first } = await supabase
    .from("todos")
    .select("position")
    .eq("list_id", listId)
    .order("position", { ascending: true })
    .limit(1)
    .single();

  await supabase.from("todos").insert({
    user_id: user.id,
    list_id: listId,
    title: trimmed,
    due_date: dueDate || null,
    position: (first?.position ?? 1) - 1,
  });

  revalidatePath("/todos");
}

export async function reorderTodos(orderedIds: string[]) {
  const supabase = await createClient();
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("todos").update({ position: index }).eq("id", id)
    )
  );
  revalidatePath("/todos");
}

export async function toggleTodo(id: string, completed: boolean) {
  const supabase = await createClient();
  await supabase.from("todos").update({
    completed,
    completed_at: completed ? new Date().toISOString() : null,
  }).eq("id", id);
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
