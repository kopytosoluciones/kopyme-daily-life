import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TodosClient from "./TodosClient";

export default async function TodosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: rawLists }, { data: allTodos }] = await Promise.all([
    supabase
      .from("todo_lists")
      .select("id, name, color")
      .eq("user_id", user.id)
      .order("position", { ascending: true }),
    supabase
      .from("todos")
      .select("id, title, completed, completed_at, due_date, created_at, list_id, position")
      .eq("user_id", user.id)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  const todos = allTodos ?? [];
  const lists = (rawLists ?? []).map(l => ({
    ...l,
    color: l.color ?? "#9D4EDD",
    todos: todos.filter(t => t.list_id === l.id),
    _count: todos.filter(t => t.list_id === l.id && !t.completed).length,
  }));

  return <TodosClient lists={lists} />;
}
