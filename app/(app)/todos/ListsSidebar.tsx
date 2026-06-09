"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createList, updateListName, deleteList } from "./actions";
import { Plus, Trash2, Check } from "lucide-react";

const COLORS = ["#E07B4A","#7CB87A","#4A8FA8","#C17A9E","#E8C84A","#8A7ACE","#E07A7A","#4AB8A8"];

interface TodoList {
  id: string;
  name: string;
  color: string;
  _count: number;
}

interface Props {
  lists: TodoList[];
  activeListId: string | null;
}

export default function ListsSidebar({ lists, activeListId }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [creatingNew, setCreatingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const newInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (creatingNew) newInputRef.current?.focus();
  }, [creatingNew]);

  function handleCreateSubmit() {
    if (!newName.trim()) { setCreatingNew(false); return; }
    startTransition(() => { createList(newName); });
    setCreatingNew(false);
    setNewName("");
  }

  function handleRenameSubmit(id: string) {
    setEditingId(null);
    if (editName.trim()) startTransition(() => updateListName(id, editName));
  }

  function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (confirm("¿Eliminar esta lista y todas sus tareas?")) {
      startTransition(() => deleteList(id));
    }
  }

  // Color cycle for new lists
  const nextColor = COLORS[lists.length % COLORS.length];

  return (
    <aside className="w-60 shrink-0 flex flex-col border-r border-[#F0EBE2] bg-[#FDFAF4]">
      {/* Header */}
      <div className="px-5 pt-8 pb-4">
        <h2 className="text-xs font-semibold text-[#B8B0A4] uppercase tracking-wider">Mis listas</h2>
      </div>

      {/* Lists */}
      <nav className="flex-1 overflow-y-auto px-3 space-y-0.5">
        {lists.map(list => (
          <div
            key={list.id}
            className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
              activeListId === list.id
                ? "bg-[#F0EBE2]"
                : "hover:bg-[#F5F0E8]"
            }`}
            onClick={() => router.push(`/todos?list=${list.id}`)}
          >
            {/* Color dot */}
            <span className="shrink-0 w-2.5 h-2.5 rounded-full" style={{ background: list.color }} />

            {/* Name — editable on double-click */}
            {editingId === list.id ? (
              <input
                autoFocus
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onBlur={() => handleRenameSubmit(list.id)}
                onKeyDown={e => {
                  if (e.key === "Enter") handleRenameSubmit(list.id);
                  if (e.key === "Escape") setEditingId(null);
                }}
                onClick={e => e.stopPropagation()}
                className="flex-1 min-w-0 bg-transparent text-sm text-[#2C2416] focus:outline-none border-b border-[#E07B4A]"
              />
            ) : (
              <span
                className="flex-1 min-w-0 text-sm text-[#2C2416] truncate"
                onDoubleClick={e => {
                  e.stopPropagation();
                  setEditingId(list.id);
                  setEditName(list.name);
                }}
              >
                {list.name}
              </span>
            )}

            {/* Task count */}
            {list._count > 0 && (
              <span className="text-xs text-[#B8B0A4] shrink-0 group-hover:hidden">
                {list._count}
              </span>
            )}

            {/* Delete on hover */}
            <button
              onClick={e => handleDelete(list.id, e)}
              className="shrink-0 opacity-0 group-hover:opacity-100 text-[#D9D0C0] hover:text-red-400 transition-all"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}

        {/* New list input */}
        {creatingNew && (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#F5F0E8]">
            <span className="shrink-0 w-2.5 h-2.5 rounded-full" style={{ background: nextColor }} />
            <input
              ref={newInputRef}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onBlur={handleCreateSubmit}
              onKeyDown={e => {
                if (e.key === "Enter") handleCreateSubmit();
                if (e.key === "Escape") { setCreatingNew(false); setNewName(""); }
              }}
              placeholder="Nombre de la lista"
              className="flex-1 min-w-0 bg-transparent text-sm text-[#2C2416] placeholder-[#C8BFB0] focus:outline-none"
            />
            <button onClick={handleCreateSubmit} className="text-[#7CB87A]">
              <Check size={14} />
            </button>
          </div>
        )}
      </nav>

      {/* New list button */}
      <div className="px-3 py-4 border-t border-[#F0EBE2]">
        <button
          onClick={() => setCreatingNew(true)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-[#B8B0A4] hover:text-[#E07B4A] hover:bg-[#F5F0E8] transition-all"
        >
          <Plus size={15} />
          <span>Nueva lista</span>
        </button>
      </div>
    </aside>
  );
}
