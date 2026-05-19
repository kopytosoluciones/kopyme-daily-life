"use client";

import { useState, useTransition } from "react";
import { toggleTodo, deleteTodo, updateTodoTitle, updateTodoDueDate } from "./actions";
import { Trash2, Calendar } from "lucide-react";

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  completed_at: string | null;
  due_date: string | null;
  created_at: string;
}

function daysSince(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

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

export default function TodoItem({ todo }: { todo: Todo }) {
  const [, startTransition] = useTransition();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleVal, setTitleVal] = useState(todo.title);
  const [editingDate, setEditingDate] = useState(false);
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
    <div className={`group flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-all hover:bg-[#F5F5F5] ${
      todo.completed ? "opacity-50" : ""
    }`}>

      {/* Checkbox */}
      <button
        onClick={() => startTransition(() => toggleTodo(todo.id, !todo.completed))}
        className={`shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
          todo.completed
            ? "bg-[#0A0A0A] border-[#0A0A0A]"
            : "border-[#D1D5DB] hover:border-[#0A0A0A]"
        }`}
      >
        {todo.completed && (
          <svg viewBox="0 0 10 8" fill="none" className="w-2.5">
            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0 flex items-center gap-3">
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
            className="flex-1 bg-transparent text-sm text-[#0A0A0A] focus:outline-none border-b border-[#9D4EDD] pb-0.5"
          />
        ) : (
          <span
            onClick={() => !todo.completed && setEditingTitle(true)}
            className={`text-sm cursor-text truncate ${
              todo.completed ? "line-through text-[#9CA3AF]" : "text-[#0A0A0A] hover:text-[#9D4EDD]"
            } transition-colors`}
          >
            {todo.title}
          </span>
        )}

        {/* Meta — inline */}
        <div className="flex items-center gap-2 shrink-0">
          {days > 0 && !todo.completed && (
            <span className="font-[family-name:var(--font-mono)] text-[10px] text-[#D1D5DB]">
              {days === 1 ? "ayer" : `${days}d`}
            </span>
          )}

          {editingDate ? (
            <input
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
        className="shrink-0 opacity-0 group-hover:opacity-100 text-[#E5E7EB] hover:text-[#FF1493] transition-all"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}
