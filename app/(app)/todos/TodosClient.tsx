"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Trash2, Calendar, Check, Pencil } from "lucide-react";
import {
  createList, deleteList, updateList,
  createTodo, toggleTodo, deleteTodo, updateTodoTitle, updateTodoDueDate,
  reorderTodos,
} from "./actions";
import TodoItem from "./TodoItem";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  completed_at: string | null;
  due_date: string | null;
  created_at: string;
  list_id: string;
  position: number;
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

export default function TodosClient({ lists, activeListId, todos }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // List creation
  const [creatingList, setCreatingList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [selectedColor, setSelectedColor] = useState(LIST_COLORS[0]);

  // List editing
  const [editingList, setEditingList] = useState<List | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  // Task creation
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const dateRef = useRef<HTMLInputElement>(null);

  // Filter
  const [filter, setFilter] = useState<"pending" | "completed">("pending");

  // Local todo order for optimistic drag
  const [localTodos, setLocalTodos] = useState<Todo[]>(todos);
  // Sync when server data changes
  if (todos.map(t => t.id).join() !== localTodos.map(t => t.id).join() &&
      todos.length !== localTodos.length) {
    setLocalTodos(todos);
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const activeList = lists.find(l => l.id === activeListId);
  const now = Date.now();

  const pending = localTodos.filter(t =>
    !t.completed || (t.completed_at && now - new Date(t.completed_at).getTime() < TWELVE_HOURS_MS)
  );
  const completed = localTodos.filter(t =>
    t.completed && t.completed_at && now - new Date(t.completed_at).getTime() >= TWELVE_HOURS_MS
  );
  const pendingCount = pending.filter(t => !t.completed).length;
  const shown = filter === "completed" ? completed : pending;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = localTodos.findIndex(t => t.id === active.id);
    const newIndex = localTodos.findIndex(t => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(localTodos, oldIndex, newIndex);
    setLocalTodos(reordered);
    startTransition(() => reorderTodos(reordered.map(t => t.id)));
  }

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

  function openEditList(list: List) {
    setEditingList(list);
    setEditName(list.name);
    setEditColor(list.color);
  }

  function handleSaveList(e: React.FormEvent) {
    e.preventDefault();
    if (!editingList || !editName.trim()) return;
    startTransition(() => updateList(editingList.id, editName, editColor));
    setEditingList(null);
  }

  return (
    <div className="min-h-screen bg-white">

      {/* Edit list modal */}
      {editingList && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setEditingList(null); }}
        >
          <form
            onSubmit={handleSaveList}
            className="bg-white rounded-xl border-2 border-[#0A0A0A] shadow-[0_8px_24px_rgba(0,0,0,0.15)] w-full max-w-sm mx-4 p-6"
          >
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#0A0A0A]">
                Editar lista
              </h3>
              <button type="button" onClick={() => setEditingList(null)} className="text-[#D1D5DB] hover:text-[#0A0A0A] transition-colors">
                <X size={16} />
              </button>
            </div>

            <label className="block text-xs text-[#6B7280] mb-1.5">Nombre</label>
            <input
              autoFocus
              value={editName}
              onChange={e => setEditName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-[#0A0A0A] bg-[#F5F5F5] text-[#0A0A0A] focus:outline-none focus:ring-2 focus:ring-[#9D4EDD] focus:border-[#9D4EDD] text-sm transition-all mb-4"
            />

            <label className="block text-xs text-[#6B7280] mb-2">Color</label>
            <div className="flex items-center gap-2 mb-6 flex-wrap">
              {LIST_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setEditColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${
                    editColor === c ? "border-[#0A0A0A] scale-110" : "border-transparent hover:scale-105"
                  }`}
                  style={{ background: c }}
                />
              ))}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setEditingList(null); startTransition(() => deleteList(editingList.id)); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm text-[#9CA3AF] hover:text-[#FF1493] hover:border-[#FF1493] transition-all"
              >
                <Trash2 size={13} />
                Eliminar
              </button>
              <button
                type="submit"
                disabled={!editName.trim()}
                className="flex-1 py-2 rounded-lg bg-[#0A0A0A] text-white text-sm font-medium border-2 border-[#0A0A0A] hover:bg-[#1f1f1f] transition-all disabled:opacity-40"
              >
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Page header */}
      <div className="border-b border-[#F5F5F5] px-8 pt-10 pb-6">
        <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[#0A0A0A] mb-1">
          Mis listas
        </h1>
        <p className="font-[family-name:var(--font-mono)] text-xs text-[#9CA3AF]">
          {lists.length} {lists.length === 1 ? "lista" : "listas"} ·{" "}
          {lists.reduce((acc, l) => acc + l._count, 0)} pendientes
        </p>
      </div>

      {/* Lists bar */}
      <div className="px-8 py-4 border-b border-[#F5F5F5]">
        <div className="flex items-center gap-2 flex-wrap">
          {lists.map(list => (
            <div key={list.id} className="relative group/chip flex items-center">
              <button
                onClick={() => router.push(`/todos?list=${list.id}`)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all select-none pr-3 ${
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
                    list.id === activeListId ? "bg-white/20 text-white" : "bg-[#F5F5F5] text-[#6B7280]"
                  }`}>
                    {list._count}
                  </span>
                )}
              </button>
              {/* Edit button */}
              <button
                onClick={() => openEditList(list)}
                className={`ml-0.5 p-1.5 rounded-lg transition-all opacity-0 group-hover/chip:opacity-100 ${
                  list.id === activeListId
                    ? "text-white/60 hover:text-white hover:bg-white/10"
                    : "text-[#9CA3AF] hover:text-[#0A0A0A] hover:bg-[#F5F5F5]"
                }`}
              >
                <Pencil size={11} />
              </button>
            </div>
          ))}

          {/* Create new list */}
          {creatingList ? (
            <form onSubmit={handleCreateList} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
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
                className="text-[#9CA3AF] hover:text-[#0A0A0A] transition-colors"
              >
                <X size={16} />
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
      </div>

      {/* Active list content */}
      {activeList ? (
        <div className="px-8 py-6 max-w-2xl">

          {/* List header */}
          <div className="flex items-center gap-3 mb-4">
            <span className="w-3 h-3 rounded-full" style={{ background: activeList.color }} />
            <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#0A0A0A]">
              {activeList.name}
            </h2>
            <span className="font-[family-name:var(--font-mono)] text-xs text-[#9CA3AF]">
              {pendingCount === 0 ? "sin pendientes" : `${pendingCount} pendiente${pendingCount !== 1 ? "s" : ""}`}
            </span>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 mb-4">
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

          {/* New task input */}
          {filter === "pending" && (
            <form onSubmit={handleAddTodo} className="flex items-center gap-2 mb-3">
              <div className="flex-1 flex items-center gap-2 border-2 border-[#E5E7EB] rounded-lg px-3 py-2 focus-within:border-[#0A0A0A] transition-all bg-white">
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
                    {formatDate(newDate)} <X size={10} />
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
                className="shrink-0 px-4 py-2 bg-[#0A0A0A] text-white text-sm font-medium rounded-lg hover:bg-[#1f1f1f] transition-all disabled:opacity-30 border-2 border-[#0A0A0A]"
              >
                Agregar
              </button>
            </form>
          )}

          {/* Task list */}
          {shown.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-[#D1D5DB]">
                {filter === "completed" ? "Nada completado todavía." : "Sin tareas. ¡Agregá la primera arriba!"}
              </p>
            </div>
          ) : filter === "pending" ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={shown.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <div>
                  {shown.map(todo => (
                    <TodoItem key={todo.id} todo={todo} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div>
              {shown.map(todo => (
                <TodoItem key={todo.id} todo={todo} />
              ))}
            </div>
          )}

          {filter === "pending" && pending.some(t => t.completed) && (
            <p className="font-[family-name:var(--font-mono)] text-xs text-[#D1D5DB] text-center mt-3">
              Las completadas desaparecen a las 12 horas.
            </p>
          )}
        </div>
      ) : (
        <div className="px-8 py-20 text-center max-w-md mx-auto">
          <p className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#0A0A0A] mb-3">
            Sin listas todavía
          </p>
          <p className="text-sm text-[#9CA3AF] mb-6">Creá una lista para empezar a organizar tus tareas.</p>
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
