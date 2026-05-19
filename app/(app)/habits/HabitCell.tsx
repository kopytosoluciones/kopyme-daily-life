"use client";

import { useTransition, useState, useRef } from "react";
import { upsertHabitLog, deleteHabitLog } from "./actions";
import { Check } from "lucide-react";

interface Props {
  habitId: string;
  date: string;
  value: string | null;
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
            ? "border-[#F5F5F5] cursor-not-allowed"
            : checked
            ? "bg-[#39FF14] border-[#39FF14] hover:opacity-80"
            : isToday
            ? "border-[#9D4EDD]/50 hover:border-[#39FF14] hover:bg-[#39FF14]/10"
            : "border-[#E5E7EB] hover:border-[#39FF14] hover:bg-[#39FF14]/10"
        }`}
      >
        {checked && <Check size={12} strokeWidth={3} className="text-black" />}
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
        className={`w-full font-[family-name:var(--font-mono)] text-[10px] text-center bg-transparent border rounded-lg px-1 py-1 focus:outline-none transition-all ${
          isFuture
            ? "border-transparent text-[#E5E7EB] cursor-not-allowed"
            : hasValue
            ? "border-[#39FF14] text-[#0A0A0A] bg-[#39FF14]/5"
            : isToday
            ? "border-[#9D4EDD]/40 text-[#9CA3AF] hover:border-[#39FF14]"
            : "border-[#E5E7EB] text-[#9CA3AF] hover:border-[#39FF14]"
        }`}
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
        onKeyDown={e => {
          if (e.key === "Enter") { setEditing(false); save(inputVal); }
          if (e.key === "Escape") { setEditing(false); setInputVal(value ?? ""); }
        }}
        className="w-full font-[family-name:var(--font-mono)] text-[10px] text-center bg-white border border-[#9D4EDD] rounded-lg px-1 py-1 focus:outline-none"
      />
    );
  }

  return (
    <button
      disabled={isFuture || pending}
      onClick={() => { if (!isFuture) { setEditing(true); setTimeout(() => inputRef.current?.focus(), 0); } }}
      className={`w-full font-[family-name:var(--font-mono)] text-[10px] rounded-lg px-1 py-1 border transition-all ${
        isFuture
          ? "border-transparent text-[#E5E7EB] cursor-not-allowed"
          : hasValue
          ? "border-[#39FF14] text-[#0A0A0A] bg-[#39FF14]/5 hover:opacity-80"
          : isToday
          ? "border-[#9D4EDD]/40 text-[#9CA3AF] hover:border-[#39FF14]"
          : "border-[#E5E7EB] text-[#9CA3AF] hover:border-[#39FF14]"
      }`}
    >
      {hasValue ? value : "—"}
    </button>
  );
}
