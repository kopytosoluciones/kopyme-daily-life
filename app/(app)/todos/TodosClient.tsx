"use client";

import { useState, useTransition, useRef, useOptimistic } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Trash2, Calendar, Check, ChevronDown } from "lucide-react";
import { createList, deleteList, updateListName, createTodo, toggleTodo, deleteTodo, updateTodoTitle, updateTodoDueDate } from "./actions";

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  completed_at: string | null;
  due_date: string | null;
  created_at: string;
  list_id: string;
}

interface List {
  id: string;
  name: string;
  color: string;
  _count: number;
}

interface Props {
  lists: List[];
  activeListId: string | null;
  todos: Todo[];
}

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

const LIST_COLORS = [
  "#0A0A0A", "#9D4EDD", "#FF1493", "#39FF14",
  "#F4A9D6", "#D9B3E8", "#B8E8C1", "#6366f1",
];

function formatDate(dateStr: string) {
  const date = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Mañana";
  if (diff === -1) return "Ayer";
  if (diff < 0) return `Hace ${Math.abs(diff)}d`;
  return date.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

function daysSince(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// ─── TodoItem ─────────────────────────────────────────────────────────────────

function TodoItem({ todo }: { todo: Todo }) {
  const [, startTransition] = useTransition();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleVal, setTitleVal] = useState(todo.title);
  const [editingDate, setEditingDate] = useState(false);
  const dateRef = useRef<HTMLInputElement>(null);
  const days = daysSince(todo.created_at);

  const isOverdue = todo.due_date && !todo.completed &&
    new Date(todo.due_date + "T00:00:00") < new Date(new Date().toDateString());

  function saveTitle() {
    setEditingTitle(false);
    if (titleVal.trim() && titleVal !== todo.title) {
      startTransition(() => updateTodoTitle(todo.id, titleVal));
    } else {
      setTitleVal(todo.title);
    }
  }

  return (
    <div className={`group flex items-start gap-3 px-3 py-2.5 rounded-lg transition-all hover:bg-[#F5F5F5] ${todo.completed ? "opacity-50" : ""}`}>
      {/* Checkbox */}
      <button
        onClick={() => startTransition(() => toggleTodo(todo.id, !todo.completed))}
        className={`shrink-0 mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
          todo.completed
            ? "bg-[#0A0A0A] border-[#0A0A0A]"
            : "border-[#D1D5DB] hover:border-[#0A0A0A]"
        }`}
      >
        {todo.completed && <Check size={10} strokeWidth={3} className="text-white" />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {editingTitle ? (
          <input
            autoFocus
            value={titleVal}
            onChange={e => setTitleVal(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={e => {
              if (e.key === "Enter") saveTitle();
              if (e.key === "Escape") { setEditingTitle(false); setTitleVal(todo.title); }
            }}
            className="w-full bg-transparent text-sm text-[#0A0A0A] focus:outline-none border-b-2 border-[#9D4EDD] pb-0.5"
          />
        ) : (
          <span
            onClick={() => !todo.completed && setEditingTitle(true)}
            className={`text-sm cursor-text select-none ${
              todo.completed
                ? "line-through text-[#9CA3AF]"
                : "text-[#0A0A0A] hover:text-[#9D4EDD]"
            } transition-colors`}
          >
            {todo.title}
          </span>
        )}

        {/* Meta */}
        <div className="flex items-center gap-3 mt-0.5">
          {days > 0 && !todo.completed && (
            <span className="font-[family-name:var(--font-mono)] text-[10px] text-[#9CA3AF]">
              {days === 1 ? "ayer" : `${days}d`}
            </span>
          )}

          {editingDate ? (
            <input
              ref={dateRef}
              autoFocus
              type="date"
              defaultValue={todo.due_date ?? ""}
              onBlur={e => {
                setEditingDate(false);
                startTransition(() => updateTodoDueDate(todo.id, e.target.value || null));
              }}
              onKeyDown={e => { if (e.key === "Escape") setEditingDate(false); }}
              className="font-[family-name:var(--font-mono)] text-[10px] bg-transparent text-[#9CA3AF] focus:outline-none"
            />
          ) : todo.due_date ? (
            <button
              onClick={() => setEditingDate(true)}
              className={`flex items-center gap-1 font-[family-name:var(--font-mono)] text-[10px] transition-colors ${
                isOverdue ? "text-[#FF1493]" : "text-[#9CA3AF] hover:text-[#9D4EDD]"
              }`}
            >
              <Calendar size={9} />
              {formatDate(todo.due_date)}
              {isOverdue && " · vencida"}
            </button>
          ) : (
            <button
              onClick={() => setEditingDate(true)}
              className="flex items-center gap-1 font-[family-name:var(--font-mono)] text-[10px] text-[#E5E7EB] hover:text-[#9CA3AF] transition-colors opacity-0 group-hover:opacity-100"
            >
              <Calendar size={9} />
              fecha
            </button>
          )}
        </div>
      </div>

      {/* Delete */}
      <button
        onClick={() => startTransition(() => deleteTodo(todo.id))}
        className="shrink-0 opacity-0 group-hover:opacity-100 text-[#E5E7EB] hover:text-[#FF1493] transition-all mt-0.5"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TodosClient({ lists, activeListId, todos }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // List creation
  const [creatingList, setCreatingList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [selectedColor, setSelectedColor] = useState(LIST_COLORS[0]);

  // Task creation
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const dateRef = useRef<HTMLInputElement>(null);

  // Filter
  const [filter, setFilter] = useState<"pending" | "completed">("pending");

  // List rename
  const [renamingListId, setRenamingListId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");

  const activeList = lists.find(l => l.id === activeListId);
  const now = Date.now();

  const pending = todos.filter(t =>
    !t.completed || (t.completed_at && now - new Date(t.completed_at).getTime() < TWELVE_HOURS_MS)
  );
  const completed = todos.filter(t =>
    t.completed && t.completed_at && now - new Date(t.completed_at).getTime() >= TWELVE_HOURS_MS
  );
  const pendingCount = pending.filter(t => !t.completed).length;
  const shown = filter === "completed" ? completed : pending;

  function handleCreateList(e: React.FormEvent) {
    e.preventDefault();
    if (!newListName.trim()) return;
    startTransition(() => createList(newListName.trim()));
    setNewListName("");
    setCreatingList(false);
    setSelectedColor(LIST_COLORS[0]);
  }

  function handleAddTodo(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim() || !activeListId) return;
    startTransition(() => createTodo(activeListId, newTitle, newDate || undefined));
    setNewTitle("");
    setNewDate("");
  }

  function handleRenameList(id: string) {
    if (renameVal.trim() && renameVal !== lists.find(l => l.id === id)?.name) {
      startTransition(() => updateListName(id, renameVal.trim()));
    }
    setRenamingListId(null);
  }

  return (
    <div className="min-h-screen bg-white">
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="border-b border-[#F5F5F5] px-8 pt-10 pb-6">
        <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[#0A0A0A] mb-1">
          Mis listas
        </h1>
        <p className="font-[family-name:var(--font-mono)] text-xs text-[#9CA3AF]">
          {lists.length} {lists.length === 1 ? "lista" : "listas"} ·{" "}
          {lists.reduce((acc, l) => acc + l._count, 0)} pendientes
        </p>
      </div>

      {/* ── Lists bar ───────────────────────────────────────────────────────── */}
      <div className="px-8 py-4 border-b border-[#F5F5F5]">
        <div className="flex items-center gap-2 flex-wrap">
          {lists.map(list => (
            <div key={list.id} className="relative group/chip">
              {renamingListId === list.id ? (
                <input
                  autoFocus
                  value={renameVal}
                  onChange={e => setRenameVal(e.target.value)}
                  onBlur={() => handleRenameList(list.id)}
                  onKeyDown={e => {
                    if (e.key === "Enter") handleRenameList(list.id);
                    if (e.key === "Escape") setRenamingListId(null);
                  }}
                  className="px-4 py-2 rounded-lg border-2 border-[#9D4EDD] text-sm font-medium text-[#0A0A0A] focus:outline-none min-w-[80px]"
                />
              ) : (
                <button
                  onClick={() => router.push(`/todos?list=${list.id}`)}
                  onDoubleClick={() => { setRenamingListId(list.id); setRenameVal(list.name); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all select-none ${
                    list.id === activeListId
                      ? "bg-[#0A0A0A] border-[#0A0A0A] text-white shadow-sm"
                      : "bg-white border-[#0A0A0A] text-[#0A0A0A] hover:bg-[#F5F5F5]"
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: list.id === activeListId ? "white" : list.color }}
                  />
                  {list.name}
                  {list._count > 0 && (
                    <span className={`font-[family-name:var(--font-mono)] text-[10px] px-1.5 py-0.5 rounded ${
                      list.id === activeListId
                        ? "bg-white/20 text-white"
                        : "bg-[#F5F5F5] text-[#6B7280]"
                    }`}>
                      {list._count}
                    </span>
                  )}
                </button>
              )}

              {/* Delete list — appears on hover */}
              {list.id !== activeListId && (
                <button
                  onClick={() => startTransition(() => deleteList(list.id))}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-white border border-[#E5E7EB] flex items-center justify-center opacity-0 group-hover/chip:opacity-100 transition-opacity hover:bg-[#FF1493] hover:border-[#FF1493] hover:text-white text-[#9CA3AF]"
                >
                  <X size={8} />
                </button>
              )}
            </div>
          ))}

          {/* Create new list */}
          {creatingList ? (
            <form onSubmit={handleCreateList} className="flex items-center gap-2">
              {/* Color picker */}
              <div className="flex items-center gap-1">
                {LIST_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedColor(c)}
                    className={`w-4 h-4 rounded-full border-2 transition-all ${
                      selectedColor === c ? "border-[#0A0A0A] scale-110" : "border-transparent"
                    }`}
                    style={{ background: c }}
                  />
                ))}
              </div>
              <input
                autoFocus
                value={newListName}
                onChange={e => setNewListName(e.target.value)}
                placeholder="Nombre de lista"
                className="px-3 py-2 rounded-lg border-2 border-[#9D4EDD] text-sm text-[#0A0A0A] focus:outline-none placeholder-[#D1D5DB] w-40"
              />
              <button
                type="submit"
                disabled={!newListName.trim()}
                className="px-3 py-2 bg-[#0A0A0A] text-white text-sm font-medium rounded-lg hover:bg-[#1f1f1f] transition-all disabled:opacity-40"
              >
                Crear
              </button>
              <button
                type="button"
                onClick={() => { setCreatingList(false); setNewListName(""); }}
                className="px-3 py-2 text-sm text-[#9CA3AF] hover:text-[#0A0A0A] transition-colors"
              >
                Cancelar
              </button>
            </form>
          ) : (
            <button
              onClick={() => setCreatingList(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 border-dashed border-[#D1D5DB] text-sm text-[#9CA3AF] hover:border-[#9D4EDD] hover:text-[#9D4EDD] transition-all"
            >
              <Plus size={14} />
              Nueva lista
            </button>
          )}
        </div>

        {lists.length === 0 && !creatingList && (
          <p className="text-sm text-[#9CA3AF] mt-2">
            Creá tu primera lista para empezar.
          </p>
        )}
      </div>

      {/* ── Active list content ─────────────────────────────────────────────── */}
      {activeList ? (
        <div className="px-8 py-6 max-w-2xl">
          {/* List title + count */}
          <div className="flex items-center gap-3 mb-5">
            <span className="w-3 h-3 rounded-full" style={{ background: activeList.color }} />
            <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#0A0A0A]">
              {activeList.name}
            </h2>
            <span className="font-[family-name:var(--font-mono)] text-xs text-[#9CA3AF]">
              {pendingCount === 0
                ? "sin pendientes"
                : `${pendingCount} pendiente${pendingCount !== 1 ? "s" : ""}`}
            </span>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 mb-5">
            {(["pending", "completed"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all border-2 ${
                  filter === f
                    ? "bg-[#0A0A0A] border-[#0A0A0A] text-white"
                    : "bg-white border-[#E5E7EB] text-[#6B7280] hover:border-[#0A0A0A] hover:text-[#0A0A0A]"
                }`}
              >
                {f === "pending" ? "Pendientes" : "Completadas"}
              </button>
            ))}
          </div>

          {/* New task input — only on pending tab */}
          {filter === "pending" && (
            <form onSubmit={handleAddTodo} className="flex items-center gap-2 mb-4">
              <div className="flex-1 flex items-center gap-2 border-2 border-[#E5E7EB] rounded-lg px-3 py-2.5 focus-within:border-[#0A0A0A] transition-all bg-white">
                <span className="shrink-0 w-4 h-4 rounded border-2 border-dashed border-[#D1D5DB]" />
                <input
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Agregar tarea..."
                  className="flex-1 bg-transparent text-sm text-[#0A0A0A] placeholder-[#D1D5DB] focus:outline-none"
                />
                {newDate ? (
                  <button
                    type="button"
                    onClick={() => setNewDate("")}
                    className="shrink-0 font-[family-name:var(--font-mono)] text-xs text-[#9D4EDD] hover:text-[#FF1493] transition-colors flex items-center gap-1"
                  >
                    {formatDate(newDate)}
                    <X size={10} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setTimeout(() => dateRef.current?.showPicker?.(), 50)}
                    className="shrink-0 text-[#D1D5DB] hover:text-[#9CA3AF] transition-colors"
                  >
                    <Calendar size={14} />
                  </button>
                )}
                <input
                  ref={dateRef}
                  type="date"
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                  className="absolute opacity-0 w-0 h-0 pointer-events-none"
                />
              </div>
              <button
                type="submit"
                disabled={!newTitle.trim()}
                className="shrink-0 px-4 py-2.5 bg-[#0A0A0A] text-white text-sm font-medium rounded-lg hover:bg-[#1f1f1f] transition-all disabled:opacity-30 border-2 border-[#0A0A0A]"
              >
                Agregar
              </button>
            </form>
          )}

          {/* Task list */}
          {shown.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-[#D1D5DB]">
                {filter === "completed"
                  ? "Nada completado todavía."
                  : "Sin tareas. ¡Agregá la primera arriba!"}
              </p>
            </div>
          ) : (
            <div>
              {shown.map(todo => (
                <TodoItem key={todo.id} todo={todo} />
              ))}
            </div>
          )}

          {filter === "pending" && pending.some(t => t.completed) && (
            <p className="font-[family-name:var(--font-mono)] text-xs text-[#D1D5DB] text-center mt-4">
              Las completadas desaparecen a las 12 horas.
            </p>
          )}
        </div>
      ) : (
        <div className="px-8 py-20 text-center max-w-md mx-auto">
          <p className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#0A0A0A] mb-3">
            Sin listas todavía
          </p>
          <p className="text-sm text-[#9CA3AF] mb-6">
            Creá una lista para empezar a organizar tus tareas.
          </p>
          <button
            onClick={() => setCreatingList(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#0A0A0A] text-white text-sm font-medium rounded-lg hover:bg-[#1f1f1f] transition-all border-2 border-[#0A0A0A]"
          >
            <Plus size={16} />
            Crear primera lista
          </button>
        </div>
      )}
    </div>
  );
}
