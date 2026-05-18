"use client";

import { useTransition, useState, useRef } from "react";
import { upsertHabitLog, deleteHabitLog } from "./actions";

interface Props {
  habitId: string;
  date: string;         // YYYY-MM-DD
  value: string | null; // existing log value
  goalType: "boolean" | "numeric" | "dropdown";
  goalOptions: string[];
  isToday: boolean;
  isFuture: boolean;
}

export default function HabitCell({ habitId, date, value, goalType, goalOptions, isToday, isFuture }: Props) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState(value ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  const hasValue = value !== null && value !== "";

  function save(newValue: string) {
    if (!newValue.trim()) {
      startTransition(() => deleteHabitLog(habitId, date));
    } else {
      startTransition(() => upsertHabitLog(habitId, date, newValue));
    }
  }

  // BOOLEAN
  if (goalType === "boolean") {
    const checked = value === "true";
    return (
      <button
        disabled={isFuture || pending}
        onClick={() => save(checked ? "" : "true")}
        title={isFuture ? "Día futuro" : ""}
        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all mx-auto ${
          isFuture
            ? "border-[#F0EBE2] cursor-not-allowed"
            : checked
            ? "bg-[#7CB87A] border-[#7CB87A] hover:opacity-80"
            : "border-[#D9D0C0] hover:border-[#7CB87A] hover:bg-[#7CB87A]/10"
        } ${isToday && !checked ? "border-[#E07B4A]/50" : ""}`}
      >
        {checked && (
          <svg viewBox="0 0 10 8" fill="none" className="w-3.5">
            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>
    );
  }

  // DROPDOWN
  if (goalType === "dropdown") {
    return (
      <select
        disabled={isFuture || pending}
        value={value ?? ""}
        onChange={e => save(e.target.value)}
        className={`w-full text-xs text-center bg-transparent border rounded-lg px-1 py-1 focus:outline-none transition-all ${
          isFuture
            ? "border-transparent text-[#E2D9C8] cursor-not-allowed"
            : hasValue
            ? "border-[#7CB87A] text-[#2C2416] bg-[#7CB87A]/5"
            : "border-[#E2D9C8] text-[#B8B0A4] hover:border-[#7CB87A]"
        } ${isToday && !hasValue ? "border-[#E07B4A]/40" : ""}`}
      >
        <option value="">—</option>
        {goalOptions.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }

  // NUMERIC
  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        step="any"
        value={inputVal}
        autoFocus
        onChange={e => setInputVal(e.target.value)}
        onBlur={() => { setEditing(false); save(inputVal); }}
        onKeyDown={e => { if (e.key === "Enter") { setEditing(false); save(inputVal); } if (e.key === "Escape") { setEditing(false); setInputVal(value ?? ""); } }}
        className="w-full text-xs text-center bg-[#FDFAF4] border border-[#E07B4A] rounded-lg px-1 py-1 focus:outline-none"
      />
    );
  }

  return (
    <button
      disabled={isFuture || pending}
      onClick={() => { if (!isFuture) { setEditing(true); setTimeout(() => inputRef.current?.focus(), 0); } }}
      className={`w-full text-xs rounded-lg px-1 py-1 border transition-all ${
        isFuture
          ? "border-transparent text-[#E2D9C8] cursor-not-allowed"
          : hasValue
          ? "border-[#7CB87A] text-[#2C2416] bg-[#7CB87A]/5 hover:opacity-80"
          : "border-[#E2D9C8] text-[#B8B0A4] hover:border-[#7CB87A]"
      } ${isToday && !hasValue ? "border-[#E07B4A]/40" : ""}`}
    >
      {hasValue ? value : "—"}
    </button>
  );
}
