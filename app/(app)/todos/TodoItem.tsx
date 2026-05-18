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
    <div className={`group flex items-start gap-3 px-4 py-3 rounded-xl transition-all hover:bg-[#FDFAF4] ${
      todo.completed ? "opacity-60" : ""
    }`}>

      {/* Checkbox */}
      <button
        onClick={() => startTransition(() => toggleTodo(todo.id, !todo.completed))}
        className={`shrink-0 mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
          todo.completed
            ? "bg-[#7CB87A] border-[#7CB87A]"
            : "border-[#D9D0C0] hover:border-[#7CB87A]"
        }`}
      >
        {todo.completed && (
          <svg viewBox="0 0 10 8" fill="none" className="w-3">
            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
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
            className="w-full bg-transparent text-sm text-[#2C2416] focus:outline-none border-b border-[#E07B4A] pb-0.5"
          />
        ) : (
          <span
            onClick={() => !todo.completed && setEditingTitle(true)}
            className={`text-sm text-[#2C2416] cursor-text ${
              todo.completed ? "line-through text-[#B8B0A4]" : "hover:text-[#E07B4A]"
            } transition-colors`}
          >
            {todo.title}
          </span>
        )}

        {/* Meta */}
        <div className="flex items-center gap-3 mt-1">
          {days > 0 && (
            <span className="text-[10px] text-[#C8BFB0]">
              {days === 1 ? "ayer" : `hace ${days}d`}
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
              className="text-[10px] bg-transparent text-[#B8B0A4] focus:outline-none"
            />
          ) : todo.due_date ? (
            <button
              onClick={() => setEditingDate(true)}
              className={`flex items-center gap-1 text-[10px] transition-colors ${
                isOverdue ? "text-red-400" : "text-[#B8B0A4] hover:text-[#E07B4A]"
              }`}
            >
              <Calendar size={10} />
              {formatDate(todo.due_date)}
              {isOverdue && " · vencida"}
            </button>
          ) : (
            <button
              onClick={() => setEditingDate(true)}
              className="flex items-center gap-1 text-[10px] text-[#E2D9C8] hover:text-[#B8B0A4] transition-colors opacity-0 group-hover:opacity-100"
            >
              <Calendar size={10} />
              fecha
            </button>
          )}
        </div>
      </div>

      {/* Delete */}
      <button
        onClick={() => startTransition(() => deleteTodo(todo.id))}
        className="shrink-0 opacity-0 group-hover:opacity-100 text-[#E2D9C8] hover:text-red-400 transition-all mt-0.5"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
