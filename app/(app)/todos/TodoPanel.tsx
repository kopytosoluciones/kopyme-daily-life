"use client";

import { useState, useTransition, useRef } from "react";
import { createTodo } from "./actions";
import TodoItem from "./TodoItem";
import { Calendar } from "lucide-react";

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  completed_at: string | null;
  due_date: string | null;
  created_at: string;
}

interface Props {
  listId: string;
  listName: string;
  listColor: string;
  todos: Todo[];
}

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

export default function TodoPanel({ listId, listName, listColor, todos }: Props) {
  const [filter, setFilter] = useState<"pending" | "completed">("pending");
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [, startTransition] = useTransition();
  const dateRef = useRef<HTMLInputElement>(null);

  const now = Date.now();

  const pending = todos.filter(t =>
    !t.completed || (t.completed_at && now - new Date(t.completed_at).getTime() < TWELVE_HOURS_MS)
  );
  const completed = todos.filter(t =>
    t.completed && t.completed_at && now - new Date(t.completed_at).getTime() >= TWELVE_HOURS_MS
  );

  const pendingCount = pending.filter(t => !t.completed).length;
  const shown = filter === "completed" ? completed : pending;

  function handleAddTodo(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    startTransition(() => createTodo(listId, newTitle, newDate || undefined));
    setNewTitle("");
    setNewDate("");
    setShowDatePicker(false);
  }

  function formatDateLabel(d: string) {
    if (!d) return "";
    const date = new Date(d + "T00:00:00");
    return date.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <div className="px-8 pt-8 pb-5 border-b border-[#F0EBE2]">
        <div className="flex items-center gap-3 mb-1">
          <span className="w-3 h-3 rounded-full shrink-0" style={{ background: listColor }} />
          <h1 className="font-[family-name:var(--font-lora)] text-2xl font-semibold text-[#2C2416]">
            {listName}
          </h1>
        </div>
        <p className="text-sm text-[#B8B0A4] ml-6">
          {pendingCount === 0 ? "Sin tareas pendientes" : `${pendingCount} pendiente${pendingCount !== 1 ? "s" : ""}`}
        </p>
      </div>

      {/* Filter tabs */}
      <div className="px-8 pt-4 pb-0">
        <div className="flex gap-1 bg-[#F5F0E8] p-1 rounded-xl w-fit text-sm">
          {(["pending", "completed"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg transition-all ${
                filter === f
                  ? "bg-white text-[#2C2416] font-medium shadow-sm"
                  : "text-[#7A6E5F] hover:text-[#2C2416]"
              }`}
            >
              {f === "pending" ? "Pendientes" : "Completadas"}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable task area */}
      <div className="flex-1 overflow-y-auto px-8 py-4">

        {/* New task input — only on pending tab */}
        {filter === "pending" && (
          <form onSubmit={handleAddTodo} className="flex items-center gap-3 mb-4 group">
            <div className="flex-1 flex items-center gap-3 bg-[#F9F6F0] border border-[#EDE8DF] rounded-xl px-4 py-2.5 focus-within:border-[#E07B4A] focus-within:bg-white transition-all">
              {/* Circle placeholder */}
              <span className="shrink-0 w-4 h-4 rounded-full border-2 border-dashed border-[#D9D0C0]" />
              <input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="Agregar tarea..."
                className="flex-1 bg-transparent text-sm text-[#2C2416] placeholder-[#C8BFB0] focus:outline-none"
              />

              {/* Date badge or picker toggle */}
              {newDate ? (
                <button
                  type="button"
                  onClick={() => { setNewDate(""); setShowDatePicker(false); }}
                  className="shrink-0 text-xs text-[#E07B4A] hover:text-red-400 transition-colors"
                >
                  {formatDateLabel(newDate)} ×
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { setShowDatePicker(true); setTimeout(() => dateRef.current?.showPicker?.(), 50); }}
                  className="shrink-0 text-[#D9D0C0] hover:text-[#B8B0A4] transition-colors"
                >
                  <Calendar size={14} />
                </button>
              )}

              <input
                ref={dateRef}
                type="date"
                value={newDate}
                onChange={e => { setNewDate(e.target.value); setShowDatePicker(false); }}
                className="absolute opacity-0 w-0 h-0 pointer-events-none"
              />
            </div>

            <button
              type="submit"
              disabled={!newTitle.trim()}
              className="shrink-0 px-4 py-2.5 bg-[#E07B4A] text-white text-sm font-medium rounded-xl hover:bg-[#cc6d3e] transition-all disabled:opacity-40"
            >
              Agregar
            </button>
          </form>
        )}

        {/* Task list */}
        {shown.length === 0 ? (
          <div className="py-16 text-center text-[#C8BFB0] text-sm">
            {filter === "completed"
              ? "Nada completado todavía."
              : "Sin tareas. ¡Agregá la primera arriba!"}
          </div>
        ) : (
          <div className="space-y-1">
            {shown.map(todo => (
              <TodoItem key={todo.id} todo={todo} />
            ))}
          </div>
        )}

        {filter === "pending" && pending.some(t => t.completed) && (
          <p className="text-xs text-[#C8BFB0] text-center mt-4">
            Las completadas desaparecen a las 12 horas.
          </p>
        )}
      </div>
    </div>
  );
}
