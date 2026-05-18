import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TodosClient from "./TodosClient";

export default async function TodosPage({
  searchParams,
}: {
  searchParams: Promise<{ list?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { list: listParam } = await searchParams;

  const { data: rawLists } = await supabase
    .from("todo_lists")
    .select("id, name, color")
    .eq("user_id", user.id)
    .order("position", { ascending: true });

  const { data: allTodos } = await supabase
    .from("todos")
    .select("id, title, completed, completed_at, due_date, created_at, list_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const todos = allTodos ?? [];

  const lists = (rawLists ?? []).map(l => ({
    ...l,
    _count: todos.filter(t => t.list_id === l.id && !t.completed).length,
  }));

  const activeListId = lists.find(l => l.id === listParam)?.id ?? lists[0]?.id ?? null;
  const activeTodos = todos.filter(t => t.list_id === activeListId);

  return (
    <TodosClient
      lists={lists}
      activeListId={activeListId}
      todos={activeTodos}
    />
  );
}
