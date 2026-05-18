import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { createTodo } from "./actions";
import TodoItem from "./TodoItem";

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

export default async function TodosPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { filter = "pending" } = await searchParams;

  const { data: allTodos } = await supabase
    .from("todos")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const now = Date.now();

  // Pending: not completed + completed but within 12h grace period
  const pending = (allTodos ?? []).filter(t =>
    !t.completed || (t.completed_at && now - new Date(t.completed_at).getTime() < TWELVE_HOURS_MS)
  );

  // Completed: completed AND past 12h
  const completed = (allTodos ?? []).filter(t =>
    t.completed && t.completed_at && now - new Date(t.completed_at).getTime() >= TWELVE_HOURS_MS
  );

  const shown = filter === "completed" ? completed : pending;
  const pendingCount = pending.filter(t => !t.completed).length;

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex items-baseline justify-between mb-6">
        <h1 className="font-[family-name:var(--font-lora)] text-3xl font-semibold text-[#2C2416]">
          To-dos
        </h1>
        <span className="text-sm text-[#B8B0A4]">
          {pendingCount} pendiente{pendingCount !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Filters */}
      <div className="flex gap-1 mb-5 bg-[#EDE8DF] p-1 rounded-xl w-fit text-sm">
        {(["pending", "completed"] as const).map((f) => (
          <a
            key={f}
            href={`/todos?filter=${f}`}
            className={`px-4 py-1.5 rounded-lg transition-all ${
              filter === f
                ? "bg-[#FDFAF4] text-[#2C2416] font-medium shadow-sm"
                : "text-[#7A6E5F] hover:text-[#2C2416]"
            }`}
          >
            {f === "pending" ? "Pendientes" : "Completados"}
          </a>
        ))}
      </div>

      {/* Paper */}
      <div className="bg-[#FDFAF4] rounded-2xl border border-[#E2D9C8] shadow-sm overflow-hidden"
           style={{ backgroundImage: "repeating-linear-gradient(to bottom, transparent, transparent 43px, #EDE8DF 43px, #EDE8DF 44px)" }}>

        {/* Left margin line */}
        <div className="flex">
          <div className="w-8 shrink-0 border-r border-[#F0C4A8]/60" />
          <div className="flex-1">

            {/* New task — always first line, only on pending */}
            {filter === "pending" && (
              <form action={createTodo} className="flex items-center gap-3 py-2.5 px-4 border-b border-[#EDE8DF]">
                <div className="shrink-0 w-4 h-4 rounded-full border border-dashed border-[#C8BFB0]" />
                <input
                  name="title"
                  type="text"
                  required
                  autoComplete="off"
                  placeholder="Nueva tarea..."
                  className="flex-1 bg-transparent text-sm text-[#2C2416] placeholder-[#C8BFB0] focus:outline-none font-[family-name:var(--font-lora)] italic"
                />
                <input
                  name="due_date"
                  type="date"
                  className="text-xs bg-transparent text-[#C8BFB0] focus:outline-none focus:text-[#7A6E5F] w-28 transition-colors"
                />
              </form>
            )}

            {/* Tasks */}
            {shown.length === 0 ? (
              <div className="py-12 text-center text-[#C8BFB0] text-sm">
                {filter === "completed" ? "Nada completado todavía." : "Escribí tu primera tarea arriba."}
              </div>
            ) : (
              <div className="divide-y divide-[#EDE8DF]">
                {shown.map(todo => (
                  <TodoItem key={todo.id} todo={todo} />
                ))}
              </div>
            )}

          </div>
        </div>
      </div>

      {filter === "pending" && pending.some(t => t.completed) && (
        <p className="text-xs text-[#C8BFB0] text-center mt-3">
          Las tareas completadas desaparecen a los 12hs.
        </p>
      )}
    </div>
  );
}
