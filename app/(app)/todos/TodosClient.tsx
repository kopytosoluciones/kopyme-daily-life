"use client";

import { useState, useTransition, useRef } from "react";
import { Plus, X, Trash2, Pencil, GripVertical, ChevronDown, Check } from "lucide-react";
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
  rectSortingStrategy,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  createList, deleteList, updateList,
  createTodo, toggleTodo, deleteTodo,
  reorderTodos, reorderLists,
} from "./actions";

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface ListWithTodos {
  id: string;
  name: string;
  color: string;
  _count: number;
  todos: Todo[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GRID_MAX = 6;

const LIST_COLORS = [
  "#9D4EDD", "#FF1493", "#39FF14", "#F59E0B",
  "#06B6D4", "#EF4444", "#F472B6", "#8B5CF6",
  "#0A0A0A", "#F97316",
];

// ─── List Modal (create + edit) ───────────────────────────────────────────────

function ListModal({
  list, onClose, onSave, onDelete,
}: {
  list: ListWithTodos | null;
  onClose: () => void;
  onSave: (name: string, color: string) => void;
  onDelete?: () => void;
}) {
  const isEdit = !!list;
  const [name,  setName]  = useState(list?.name  ?? "");
  const [color, setColor] = useState(list?.color ?? LIST_COLORS[0]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(name.trim(), color);
  }

  const isLight = color === "#39FF14" || color === "#F59E0B";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-[family-name:var(--font-playfair)] font-bold text-[#0A0A0A] text-lg">
            {isEdit ? "Editar lista" : "Nueva lista"}
          </h3>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#0A0A0A] transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="font-[family-name:var(--font-mono)] text-[10px] text-[#9CA3AF] uppercase tracking-wide block mb-1.5">
              nombre
            </label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej: Trabajo, Personal..."
              className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm font-[family-name:var(--font-mono)] text-[#0A0A0A] focus:outline-none focus:border-[#9D4EDD] placeholder:text-[#D1D5DB]"
            />
          </div>

          <div>
            <label className="font-[family-name:var(--font-mono)] text-[10px] text-[#9CA3AF] uppercase tracking-wide block mb-2">
              color
            </label>
            <div className="flex gap-2 flex-wrap">
              {LIST_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-full border-2 transition-all"
                  style={{
                    backgroundColor: c,
                    borderColor: color === c ? "#0A0A0A" : "transparent",
                    transform: color === c ? "scale(1.25)" : "scale(1)",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          {name.trim() && (
            <div
              className="rounded-xl px-3 py-2 flex items-center gap-2"
              style={{ backgroundColor: color }}
            >
              <span
                className="font-[family-name:var(--font-playfair)] font-bold text-sm"
                style={{ color: isLight ? "#0A0A0A" : "white" }}
              >
                {name}
              </span>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            {isEdit && onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="p-2 rounded-lg border border-[#FFE4E4] text-[#EF4444] hover:bg-[#FFF5F5] transition-colors"
              >
                <Trash2 size={14} />
              </button>
            )}
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 py-2 rounded-xl text-sm font-[family-name:var(--font-mono)] font-medium text-white disabled:opacity-30 transition-opacity hover:opacity-90"
              style={{ backgroundColor: isLight ? "#0A0A0A" : color }}
            >
              {isEdit ? "Guardar" : "Crear lista"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Task item (sortable, within card) ───────────────────────────────────────

function TaskItem({
  todo, listColor, checking, onCheck, onDelete,
}: {
  todo: Todo;
  listColor: string;
  checking: boolean;
  onCheck: () => void;
  onDelete: () => void;
}) {
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id: todo.id });

  const style: React.CSSProperties = {
    transform: checking
      ? `${CSS.Transform.toString(transform) ?? ""} translateY(-8px)`.trim()
      : (CSS.Transform.toString(transform) ?? undefined),
    transition: checking
      ? "opacity 0.28s ease, transform 0.28s ease"
      : (transition ?? undefined),
    opacity: isDragging ? 0.35 : checking ? 0 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 py-2 px-1.5 rounded-xl group/task ${
        isDragging ? "bg-[#F5F0FF]" : "hover:bg-[#FAFAFA]"
      } transition-colors`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="shrink-0 text-[#E5E7EB] hover:text-[#C9C9C9] cursor-grab active:cursor-grabbing transition-colors touch-none opacity-0 group-hover/task:opacity-100"
      >
        <GripVertical size={12} />
      </button>

      {/* Checkbox */}
      <button
        type="button"
        onClick={onCheck}
        className="shrink-0 w-[15px] h-[15px] rounded border-2 flex items-center justify-center transition-all hover:scale-110"
        style={{
          borderColor: listColor,
          backgroundColor: "transparent",
        }}
      />

      {/* Title */}
      <span className="flex-1 min-w-0 text-[13px] font-[family-name:var(--font-mono)] text-[#0A0A0A] truncate leading-snug">
        {todo.title}
      </span>

      {/* Delete */}
      <button
        type="button"
        onClick={onDelete}
        className="shrink-0 opacity-0 group-hover/task:opacity-100 text-[#D1D5DB] hover:text-[#FF1493] transition-all"
      >
        <X size={11} />
      </button>
    </div>
  );
}

// ─── Done item ────────────────────────────────────────────────────────────────

function DoneItem({
  todo, listColor, onUncheck, onDelete,
}: {
  todo: Todo;
  listColor: string;
  onUncheck: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-2 py-1.5 px-1.5 rounded-xl group/done hover:bg-[#FAFAFA] transition-colors">
      <div className="shrink-0 w-3" />
      <button
        type="button"
        onClick={onUncheck}
        className="shrink-0 w-[15px] h-[15px] rounded border-2 flex items-center justify-center transition-all hover:scale-110"
        style={{ borderColor: listColor, backgroundColor: listColor }}
      >
        <Check size={8} color="white" strokeWidth={3} />
      </button>
      <span className="flex-1 min-w-0 text-[12px] font-[family-name:var(--font-mono)] text-[#C9C9C9] line-through truncate">
        {todo.title}
      </span>
      <button
        type="button"
        onClick={onDelete}
        className="shrink-0 opacity-0 group-hover/done:opacity-100 text-[#E5E7EB] hover:text-[#FF1493] transition-all"
      >
        <X size={10} />
      </button>
    </div>
  );
}

// ─── Checklist Card ───────────────────────────────────────────────────────────

function ChecklistCard({
  list,
  dragHandleListeners,
  dragHandleAttributes,
  isDragging,
  onEdit,
}: {
  list: ListWithTodos;
  dragHandleListeners?: Record<string, unknown>;
  dragHandleAttributes?: Record<string, unknown>;
  isDragging?: boolean;
  onEdit: () => void;
}) {
  const [, startTransition] = useTransition();
  const [newTitle,     setNewTitle]     = useState("");
  const [doneOpen,     setDoneOpen]     = useState(false);
  const [checkingIds,  setCheckingIds]  = useState<Set<string>>(new Set());
  const [localTodos,   setLocalTodos]   = useState<Todo[]>(list.todos);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync server state
  const serverKey = list.todos.map(t => `${t.id}:${t.completed}`).join(",");
  const localKey  = localTodos.map(t => `${t.id}:${t.completed}`).join(",");
  if (serverKey !== localKey) setLocalTodos(list.todos);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const pendingTodos = localTodos
    .filter(t => !t.completed)
    .sort((a, b) => a.position - b.position);

  const doneTodos = localTodos
    .filter(t => t.completed)
    .sort((a, b) => {
      const da = a.completed_at ? new Date(a.completed_at).getTime() : 0;
      const db = b.completed_at ? new Date(b.completed_at).getTime() : 0;
      return db - da;
    });

  function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const title = newTitle.trim();
    setNewTitle("");
    const minPos = pendingTodos.length > 0 ? pendingTodos[0].position - 1 : 0;
    const tempTodo: Todo = {
      id: `temp-${Date.now()}`,
      title,
      completed: false,
      completed_at: null,
      due_date: null,
      created_at: new Date().toISOString(),
      list_id: list.id,
      position: minPos,
    };
    setLocalTodos(prev => [tempTodo, ...prev]);
    startTransition(() => createTodo(list.id, title));
    inputRef.current?.focus();
  }

  function handleCheck(todo: Todo) {
    if (!todo.completed) {
      // Checking: animate out → then move to done
      setCheckingIds(prev => new Set(prev).add(todo.id));
      setTimeout(() => {
        setLocalTodos(prev => prev.map(t =>
          t.id === todo.id ? { ...t, completed: true, completed_at: new Date().toISOString() } : t
        ));
        setCheckingIds(prev => { const n = new Set(prev); n.delete(todo.id); return n; });
        startTransition(() => toggleTodo(todo.id, true));
      }, 300);
    } else {
      // Unchecking: immediate
      setLocalTodos(prev => prev.map(t =>
        t.id === todo.id ? { ...t, completed: false, completed_at: null } : t
      ));
      startTransition(() => toggleTodo(todo.id, false));
    }
  }

  function handleDelete(id: string) {
    setLocalTodos(prev => prev.filter(t => t.id !== id));
    startTransition(() => deleteTodo(id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setLocalTodos(prev => {
      const pending = [...prev.filter(t => !t.completed)];
      const done    = prev.filter(t => t.completed);
      const oldIdx  = pending.findIndex(t => t.id === active.id);
      const newIdx  = pending.findIndex(t => t.id === over.id);
      if (oldIdx === -1 || newIdx === -1) return prev;
      const reordered = arrayMove(pending, oldIdx, newIdx);
      startTransition(() => reorderTodos(reordered.map(t => t.id)));
      return [...reordered, ...done];
    });
  }

  const accentColor = list.color ?? "#9D4EDD";
  const isLight     = accentColor === "#39FF14" || accentColor === "#F59E0B";
  const headerText  = isLight ? "#0A0A0A" : "#ffffff";
  const headerMuted = isLight ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.55)";

  return (
    <div
      className={`flex flex-col rounded-2xl overflow-hidden transition-shadow duration-200 ${
        isDragging
          ? "shadow-2xl ring-2 ring-[#9D4EDD]/30 rotate-1"
          : "shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_6px_24px_rgba(0,0,0,0.09)]"
      }`}
      style={{ minHeight: 280, background: "white" }}
    >
      {/* ── Colored header ── */}
      <div
        className="flex items-center gap-2 px-4 py-3 shrink-0"
        style={{ backgroundColor: accentColor }}
      >
        {/* Grid drag handle */}
        <button
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          {...(dragHandleAttributes as any)}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          {...(dragHandleListeners as any)}
          className="shrink-0 cursor-grab active:cursor-grabbing touch-none"
          style={{ color: headerMuted }}
        >
          <GripVertical size={14} />
        </button>

        <span
          className="flex-1 font-[family-name:var(--font-playfair)] font-bold text-sm truncate"
          style={{ color: headerText }}
        >
          {list.name}
        </span>

        {pendingTodos.length > 0 && (
          <span
            className="font-[family-name:var(--font-mono)] text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
            style={{
              background: isLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.22)",
              color: headerText,
            }}
          >
            {pendingTodos.length}
          </span>
        )}

        <button
          type="button"
          onClick={onEdit}
          className="shrink-0 transition-colors hover:opacity-100"
          style={{ color: headerMuted }}
        >
          <Pencil size={12} />
        </button>
      </div>

      {/* ── Card body ── */}
      <div className="flex-1 flex flex-col px-4 pt-3 pb-4 gap-2 min-h-0">
        {/* New task input */}
        <form onSubmit={handleAddTask}>
          <div className="flex items-center gap-2 bg-[#F9F9FB] rounded-xl px-3 py-2 focus-within:bg-white focus-within:shadow-[0_0_0_2px_#E5E7EB] transition-all">
            <Plus size={11} className="text-[#C9C9C9] shrink-0" />
            <input
              ref={inputRef}
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Nueva tarea..."
              className="flex-1 bg-transparent text-[13px] font-[family-name:var(--font-mono)] text-[#0A0A0A] placeholder:text-[#D1D5DB] focus:outline-none min-w-0"
            />
          </div>
        </form>

        {/* Todo tasks */}
        {pendingTodos.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-8">
            <span className="font-[family-name:var(--font-mono)] text-[11px] text-[#E5E7EB]">
              todo limpio ✓
            </span>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={pendingTodos.map(t => t.id)} strategy={verticalListSortingStrategy}>
              <div className="overflow-y-auto" style={{ maxHeight: 220 }}>
                {pendingTodos.map(todo => (
                  <TaskItem
                    key={todo.id}
                    todo={todo}
                    listColor={accentColor}
                    checking={checkingIds.has(todo.id)}
                    onCheck={() => handleCheck(todo)}
                    onDelete={() => handleDelete(todo.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {/* Done section */}
        {doneTodos.length > 0 && (
          <div className="border-t border-[#F5F5F5] pt-2 mt-auto">
            <button
              type="button"
              onClick={() => setDoneOpen(o => !o)}
              className="flex items-center gap-1.5 font-[family-name:var(--font-mono)] text-[10px] text-[#C9C9C9] hover:text-[#9CA3AF] transition-colors w-full mb-1"
            >
              <ChevronDown
                size={11}
                className="transition-transform duration-200 shrink-0"
                style={{ transform: doneOpen ? "rotate(0deg)" : "rotate(-90deg)" }}
              />
              completadas ({doneTodos.length})
            </button>
            {doneOpen && (
              <div className="overflow-y-auto" style={{ maxHeight: 160 }}>
                {doneTodos.map(todo => (
                  <DoneItem
                    key={todo.id}
                    todo={todo}
                    listColor={accentColor}
                    onUncheck={() => handleCheck(todo)}
                    onDelete={() => handleDelete(todo.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sortable card wrapper (grid level) ──────────────────────────────────────

function SortableCard({ list, onEdit }: { list: ListWithTodos; onEdit: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: list.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform) ?? undefined,
    transition: transition ?? undefined,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <ChecklistCard
        list={list}
        dragHandleListeners={listeners as Record<string, unknown>}
        dragHandleAttributes={attributes as unknown as Record<string, unknown>}
        isDragging={isDragging}
        onEdit={onEdit}
      />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TodosClient({ lists: initialLists }: { lists: ListWithTodos[] }) {
  const [, startTransition] = useTransition();
  const [listsData,   setListsData]   = useState<ListWithTodos[]>(initialLists);
  const [listOrder,   setListOrder]   = useState<string[]>(initialLists.map(l => l.id));
  const [modal,       setModal]       = useState<
    { type: "create" } | { type: "edit"; list: ListWithTodos } | null
  >(null);
  const [overflowOpen, setOverflowOpen] = useState(false);

  // Sync server revalidations
  const incomingKey = initialLists.map(l => l.id).sort().join(",");
  const localKey    = listsData.map(l => l.id).sort().join(",");
  if (incomingKey !== localKey) {
    const incomingIds = initialLists.map(l => l.id);
    setListOrder(prev => {
      const existing = prev.filter(id => incomingIds.includes(id));
      const added    = incomingIds.filter(id => !prev.includes(id));
      return [...existing, ...added];
    });
    setListsData(initialLists);
  }

  const gridSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const orderedLists  = listOrder.map(id => listsData.find(l => l.id === id)).filter((l): l is ListWithTodos => !!l);
  const gridLists     = orderedLists.slice(0, GRID_MAX);
  const overflowLists = orderedLists.slice(GRID_MAX);
  const totalPending  = listsData.reduce((s, l) => s + l._count, 0);

  function handleGridDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setListOrder(prev => {
      const oldIdx = prev.indexOf(active.id as string);
      const newIdx = prev.indexOf(over.id as string);
      if (oldIdx === -1 || newIdx === -1) return prev;
      const next = arrayMove(prev, oldIdx, newIdx);
      startTransition(() => reorderLists(next));
      return next;
    });
  }

  function handleCreateList(name: string, color: string) {
    setModal(null);
    startTransition(() => { createList(name, color); });
  }

  function handleSaveList(name: string, color: string) {
    if (modal?.type !== "edit") return;
    const { list } = modal;
    setListsData(prev => prev.map(l => l.id === list.id ? { ...l, name, color } : l));
    setModal(null);
    startTransition(() => updateList(list.id, name, color));
  }

  function handleDeleteList() {
    if (modal?.type !== "edit") return;
    const id = modal.list.id;
    setListsData(prev => prev.filter(l => l.id !== id));
    setListOrder(prev => prev.filter(lid => lid !== id));
    setModal(null);
    startTransition(() => deleteList(id));
  }

  return (
    <div className="min-h-screen bg-white">

      {/* ── Header ── */}
      <div className="px-8 pt-10 pb-6 flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-playfair)] text-[32px] font-bold text-[#0A0A0A] leading-tight">
            Mis listas
          </h1>
          <p className="font-[family-name:var(--font-mono)] text-[12px] text-[#B0B7C3] mt-1.5">
            {listsData.length} {listsData.length === 1 ? "lista" : "listas"} · {totalPending} pendientes
          </p>
        </div>

        <button
          onClick={() => setModal({ type: "create" })}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0A0A0A] text-white font-[family-name:var(--font-mono)] text-[12px] hover:bg-[#2D2D2D] transition-colors shadow-sm"
        >
          <Plus size={13} />
          Nueva lista
        </button>
      </div>

      {/* ── Grid ── */}
      <div className="px-8 pb-12">
        {gridLists.length === 0 ? (
          <div className="py-24 text-center">
            <p className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#0A0A0A] mb-2">
              Sin listas todavía
            </p>
            <p className="font-[family-name:var(--font-mono)] text-sm text-[#B0B7C3] mb-7">
              Creá tu primera checklist para empezar a organizar.
            </p>
            <button
              onClick={() => setModal({ type: "create" })}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0A0A0A] text-white font-[family-name:var(--font-mono)] text-sm hover:bg-[#2D2D2D] transition-colors"
            >
              <Plus size={14} />
              Crear primera lista
            </button>
          </div>
        ) : (
          <DndContext
            sensors={gridSensors}
            collisionDetection={closestCenter}
            onDragEnd={handleGridDragEnd}
          >
            <SortableContext items={gridLists.map(l => l.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-3 gap-5">
                {gridLists.map(list => (
                  <SortableCard
                    key={list.id}
                    list={list}
                    onEdit={() => setModal({ type: "edit", list })}
                  />
                ))}

                {/* Add card — only if < 6 lists */}
                {gridLists.length < GRID_MAX && (
                  <button
                    onClick={() => setModal({ type: "create" })}
                    className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#E5E7EB] text-[#C9C9C9] hover:border-[#9D4EDD] hover:text-[#9D4EDD] transition-all font-[family-name:var(--font-mono)] text-[11px]"
                    style={{ minHeight: 280 }}
                  >
                    <Plus size={18} />
                    nueva lista
                  </button>
                )}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {/* ── Overflow lists (> 6) ── */}
        {overflowLists.length > 0 && (
          <div className="mt-8">
            <button
              type="button"
              onClick={() => setOverflowOpen(o => !o)}
              className="flex items-center gap-2 font-[family-name:var(--font-mono)] text-[11px] text-[#9CA3AF] hover:text-[#0A0A0A] transition-colors mb-5"
            >
              <ChevronDown
                size={13}
                className="transition-transform duration-200"
                style={{ transform: overflowOpen ? "rotate(0deg)" : "rotate(-90deg)" }}
              />
              {overflowLists.length} lista{overflowLists.length !== 1 ? "s" : ""} más
            </button>

            {overflowOpen && (
              <div className="grid grid-cols-3 gap-5">
                {overflowLists.map(list => (
                  <ChecklistCard
                    key={list.id}
                    list={list}
                    onEdit={() => setModal({ type: "edit", list })}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {modal?.type === "create" && (
        <ListModal
          list={null}
          onClose={() => setModal(null)}
          onSave={handleCreateList}
        />
      )}
      {modal?.type === "edit" && (
        <ListModal
          list={modal.list}
          onClose={() => setModal(null)}
          onSave={handleSaveList}
          onDelete={handleDeleteList}
        />
      )}
    </div>
  );
}
