"use client";

import { useEffect, useState, useTransition, useRef } from "react";
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(name.trim(), color);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label={isEdit ? "Editar lista" : "Nueva lista"}
        className="w-full max-w-sm border-2 border-foreground bg-card shadow-hard-lg"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b-2 border-foreground px-4 py-2.5">
          <h3 className="font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
            ── {isEdit ? "Editar lista" : "Nueva lista"}
          </h3>
          <button onClick={onClose} aria-label="Cerrar" className="font-mono text-xs text-muted-foreground hover:text-foreground">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="list-name" className="font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">Nombre</label>
            <input
              id="list-name"
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej: Trabajo, Personal…"
              className="border-2 border-foreground bg-card px-3 py-2 font-mono text-sm outline-none placeholder:text-muted-foreground focus:bg-primary/10"
            />
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">Marca</span>
            <div className="flex flex-wrap gap-2">
              {LIST_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Color ${c}`}
                  aria-pressed={color === c}
                  onClick={() => setColor(c)}
                  className={`size-6 border-2 ${color === c ? "border-foreground outline-2 outline-offset-2 outline-foreground" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            {isEdit && onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="border-2 border-destructive bg-card px-3 py-2 font-mono text-xs text-destructive uppercase hover:bg-destructive/10"
              >
                Borrar
              </button>
            )}
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 border-2 border-foreground bg-primary px-3 py-2 font-mono text-xs tracking-[0.06em] text-primary-foreground uppercase shadow-hard-primary transition-transform duration-100 hover:-translate-x-px hover:-translate-y-px active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-40"
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
  todo, checking, onCheck, onDelete,
}: {
  todo: Todo;
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
      ? `${CSS.Transform.toString(transform) ?? ""} translateY(-4px)`.trim()
      : (CSS.Transform.toString(transform) ?? undefined),
    transition: checking
      ? "opacity 0.12s ease, transform 0.12s ease"
      : (transition ?? undefined),
    opacity: isDragging ? 0.35 : checking ? 0 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group/task flex items-center gap-2 px-1.5 py-1.5 ${isDragging ? "bg-muted" : "hover:bg-muted/60"}`}
    >
      <button
        {...attributes}
        {...listeners}
        aria-label="Mover tarea"
        className="shrink-0 cursor-grab touch-none font-mono text-xs text-muted-foreground opacity-0 group-hover/task:opacity-100 focus-visible:opacity-100 active:cursor-grabbing"
      >
        ⠿
      </button>

      <button
        type="button"
        onClick={onCheck}
        aria-label={`Completar ${todo.title}`}
        className="size-[15px] shrink-0 border-2 border-foreground bg-card hover:bg-muted"
      />

      <span className="min-w-0 flex-1 truncate font-mono text-[13px] leading-snug">{todo.title}</span>

      <button
        type="button"
        onClick={onDelete}
        aria-label={`Borrar ${todo.title}`}
        className="shrink-0 font-mono text-[11px] text-muted-foreground opacity-0 group-hover/task:opacity-100 hover:text-destructive focus-visible:opacity-100"
      >
        ✕
      </button>
    </div>
  );
}

// ─── Done item ────────────────────────────────────────────────────────────────

function DoneItem({
  todo, onUncheck, onDelete,
}: {
  todo: Todo;
  onUncheck: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group/done flex items-center gap-2 px-1.5 py-1 hover:bg-muted/60">
      <span aria-hidden className="w-3 shrink-0" />
      <button
        type="button"
        onClick={onUncheck}
        aria-label={`Desmarcar ${todo.title}`}
        className="flex size-[15px] shrink-0 items-center justify-center border-2 border-foreground bg-foreground font-mono text-[9px] leading-none text-background"
      >
        ✓
      </button>
      <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-muted-foreground line-through">{todo.title}</span>
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Borrar ${todo.title}`}
        className="shrink-0 font-mono text-[10px] text-muted-foreground opacity-0 group-hover/done:opacity-100 hover:text-destructive focus-visible:opacity-100"
      >
        ✕
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

  // Sync server state — compare IDs only, NOT completion state.
  // Completion is always driven by local optimistic updates; syncing it
  // from the (stale) server prop would immediately revert every check/uncheck.
  const serverIds = list.todos.map(t => t.id).sort().join(",");
  const localIds  = localTodos.map(t => t.id).sort().join(",");
  if (serverIds !== localIds) setLocalTodos(list.todos);

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
      }, 140);
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

  const marker = list.color ?? "#9D4EDD";

  return (
    <div
      className={`flex min-h-[280px] flex-col border-2 border-foreground bg-card ${isDragging ? "shadow-hard-lg" : ""}`}
    >
      <div className="flex shrink-0 items-center gap-2 border-b-2 border-foreground px-3 py-2.5">
        <button
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          {...(dragHandleAttributes as any)}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          {...(dragHandleListeners as any)}
          aria-label={`Mover lista ${list.name}`}
          className="shrink-0 cursor-grab touch-none font-mono text-xs text-muted-foreground hover:text-foreground active:cursor-grabbing"
        >
          ⠿
        </button>
        <span aria-hidden className="size-2.5 shrink-0" style={{ backgroundColor: marker }} />
        <span className="flex-1 truncate font-bold">{list.name}</span>
        {pendingTodos.length > 0 && (
          <span className="font-mono text-[11px] text-muted-foreground tabular">[{pendingTodos.length}]</span>
        )}
        <button
          type="button"
          onClick={onEdit}
          className="shrink-0 font-mono text-[10px] text-muted-foreground uppercase hover:text-foreground"
        >
          editar
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 px-3 pt-2.5 pb-3">
        <form onSubmit={handleAddTask}>
          <label className="flex items-center gap-2 border-b border-dashed border-muted-foreground px-1.5 py-1.5 focus-within:border-solid focus-within:border-foreground">
            <span aria-hidden className="font-mono text-xs text-muted-foreground">+</span>
            <input
              ref={inputRef}
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Nueva tarea…"
              aria-label={`Nueva tarea en ${list.name}`}
              className="min-w-0 flex-1 bg-transparent font-mono text-[13px] outline-none placeholder:text-muted-foreground"
            />
          </label>
        </form>

        {pendingTodos.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-8">
            <span className="font-mono text-[11px] text-muted-foreground">[ ✓ ] todo limpio</span>
          </div>
        ) : (
          <DndContext
            id={`list-${list.id}`}
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={pendingTodos.map(t => t.id)} strategy={verticalListSortingStrategy}>
              <div className="max-h-[220px] overflow-y-auto">
                {pendingTodos.map(todo => (
                  <TaskItem
                    key={todo.id}
                    todo={todo}
                    checking={checkingIds.has(todo.id)}
                    onCheck={() => handleCheck(todo)}
                    onDelete={() => handleDelete(todo.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {doneTodos.length > 0 && (
          <div className="mt-auto border-t border-muted pt-2">
            <button
              type="button"
              aria-expanded={doneOpen}
              onClick={() => setDoneOpen(o => !o)}
              className="mb-1 flex w-full items-center gap-1.5 font-mono text-[10px] tracking-[0.06em] text-muted-foreground uppercase hover:text-foreground"
            >
              <span aria-hidden>{doneOpen ? "▾" : "▸"}</span>
              completadas ({doneTodos.length})
            </button>
            {doneOpen && (
              <div className="max-h-[160px] overflow-y-auto">
                {doneTodos.map(todo => (
                  <DoneItem
                    key={todo.id}
                    todo={todo}
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
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-4 py-7 md:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[40px] leading-none font-bold tracking-[-0.02em]">
            Checklists<span className="k-cursor">_</span>
          </h1>
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            {listsData.length} {listsData.length === 1 ? "lista" : "listas"} · {totalPending} pendientes
          </p>
        </div>
        <button
          onClick={() => setModal({ type: "create" })}
          className="border-2 border-foreground bg-primary px-3.5 py-2 font-mono text-xs tracking-[0.06em] text-primary-foreground uppercase shadow-hard-primary transition-transform duration-100 hover:-translate-x-px hover:-translate-y-px active:translate-x-1 active:translate-y-1 active:shadow-none"
        >
          + Nueva lista
        </button>
      </header>

      {gridLists.length === 0 ? (
        <div className="border-2 border-dashed border-muted-foreground px-6 py-16 text-center font-mono text-xs text-muted-foreground">
          <pre aria-hidden className="mb-3 leading-tight">{"┌──────┐\n│ □ □  │\n│ □    │\n└──────┘"}</pre>
          Sin listas todavía. Creá tu primera checklist para empezar a organizar.
          <div className="mt-4">
            <button
              onClick={() => setModal({ type: "create" })}
              className="border-2 border-foreground bg-card px-3.5 py-2 text-foreground uppercase shadow-hard active:translate-x-1 active:translate-y-1 active:shadow-none"
            >
              + Crear primera lista
            </button>
          </div>
        </div>
      ) : (
        <DndContext
          id="lists-grid"
          sensors={gridSensors}
          collisionDetection={closestCenter}
          onDragEnd={handleGridDragEnd}
        >
          <SortableContext items={gridLists.map(l => l.id)} strategy={rectSortingStrategy}>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {gridLists.map(list => (
                <SortableCard
                  key={list.id}
                  list={list}
                  onEdit={() => setModal({ type: "edit", list })}
                />
              ))}

              {gridLists.length < GRID_MAX && (
                <button
                  onClick={() => setModal({ type: "create" })}
                  className="flex min-h-[280px] flex-col items-center justify-center gap-2 border-2 border-dashed border-muted-foreground font-mono text-[11px] text-muted-foreground uppercase hover:border-foreground hover:text-foreground"
                >
                  <span aria-hidden className="text-lg">+</span>
                  nueva lista
                </button>
              )}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {overflowLists.length > 0 && (
        <div className="flex flex-col gap-4">
          <button
            type="button"
            aria-expanded={overflowOpen}
            onClick={() => setOverflowOpen(o => !o)}
            className="flex w-fit items-center gap-2 font-mono text-[11px] tracking-[0.06em] text-muted-foreground uppercase hover:text-foreground"
          >
            <span aria-hidden>{overflowOpen ? "▾" : "▸"}</span>
            {overflowLists.length} lista{overflowLists.length !== 1 ? "s" : ""} más
          </button>

          {overflowOpen && (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
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
