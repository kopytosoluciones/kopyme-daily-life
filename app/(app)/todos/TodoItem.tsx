"use client";

import { useTransition, useState, useRef } from "react";
import { toggleTodo, deleteTodo, updateTodoTitle, updateTodoDueDate } from "./actions";

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
  return new Date(dateStr).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

function isOverdue(due_date: string | null, completed: boolean) {
  return due_date && !completed && new Date(due_date) < new Date();
}

export default function TodoItem({ todo }: { todo: Todo }) {
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(todo.title);
  const [editingDate, setEditingDate] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const days = daysSince(todo.created_at);
  const overdue = isOverdue(todo.due_date, todo.completed);

  function handleToggle() {
    startTransition(() => toggleTodo(todo.id, !todo.completed));
  }

  function handleDelete() {
    startTransition(() => deleteTodo(todo.id));
  }

  function handleTitleClick() {
    if (todo.completed) return;
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function handleTitleSave() {
    setEditing(false);
    if (editValue.trim() && editValue.trim() !== todo.title) {
      startTransition(() => updateTodoTitle(todo.id, editValue));
    } else {
      setEditValue(todo.title);
    }
  }

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    setEditingDate(false);
    startTransition(() => updateTodoDueDate(todo.id, e.target.value || null));
  }

  return (
    <div className={`group flex items-center gap-3 py-2.5 px-4 transition-opacity ${isPending ? "opacity-40" : ""}`}>
      {/* Checkbox */}
      <button
        onClick={handleToggle}
        className={`shrink-0 w-4 h-4 rounded-full border transition-all mt-0.5 ${
          todo.completed
            ? "bg-[#7CB87A] border-[#7CB87A]"
            : "border-[#C8BFB0] hover:border-[#E07B4A]"
        }`}
      >
        {todo.completed && (
          <svg viewBox="0 0 10 8" fill="none" className="w-full p-[2px]">
            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>

      {/* Title */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={e => { if (e.key === "Enter") handleTitleSave(); if (e.key === "Escape") { setEditValue(todo.title); setEditing(false); } }}
            className="w-full bg-transparent text-sm text-[#2C2416] focus:outline-none border-b border-[#E07B4A]"
          />
        ) : (
          <span
            onClick={handleTitleClick}
            className={`text-sm leading-snug cursor-text select-none ${
              todo.completed
                ? "line-through text-[#B8B0A4]"
                : "text-[#2C2416] hover:text-[#E07B4A]"
            }`}
          >
            {todo.title}
          </span>
        )}
      </div>

      {/* Meta: days + due date */}
      <div className="flex items-center gap-2 shrink-0 text-xs text-[#C8BFB0]">
        {days > 0 && (
          <span className={days >= 7 ? "text-[#E07B4A]" : ""}>{days}d</span>
        )}
        {todo.due_date ? (
          <button
            onClick={() => setEditingDate(true)}
            className={`hover:underline ${overdue ? "text-red-400" : "text-[#B8B0A4]"}`}
          >
            {overdue ? "⚠ " : ""}{formatDate(todo.due_date)}
          </button>
        ) : (
          !todo.completed && (
            <button
              onClick={() => setEditingDate(true)}
              className="opacity-0 group-hover:opacity-100 text-[#D9D0C0] hover:text-[#7A6E5F] transition-opacity text-xs"
            >
              + fecha
            </button>
          )
        )}
        {editingDate && (
          <input
            type="date"
            defaultValue={todo.due_date || ""}
            autoFocus
            onBlur={() => setEditingDate(false)}
            onChange={handleDateChange}
            className="w-28 text-xs bg-[#F5F0E8] border border-[#E2D9C8] rounded px-1 py-0.5 focus:outline-none focus:border-[#E07B4A]"
          />
        )}
      </div>

      {/* Delete */}
      <button
        onClick={handleDelete}
        className="opacity-0 group-hover:opacity-100 text-[#D9D0C0] hover:text-red-400 transition-all p-0.5"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  );
}
