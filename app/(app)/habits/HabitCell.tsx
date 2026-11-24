"use client";

import { useTransition, useState, useRef } from "react";
import { upsertHabitLog, deleteHabitLog } from "./actions";

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

  const cellBase = "font-mono text-[10px] tabular outline-none transition-colors duration-100 disabled:cursor-not-allowed";
  const cellState = isFuture
    ? "border-muted text-muted-foreground"
    : hasValue
    ? "border-foreground bg-foreground text-background"
    : isToday
    ? "border-primary bg-card text-muted-foreground hover:bg-muted"
    : "border-foreground bg-card text-muted-foreground hover:bg-muted";

  // BOOLEAN
  if (goalType === "boolean") {
    const checked = value === "true";
    return (
      <button
        type="button"
        disabled={isFuture || pending}
        onClick={() => save(checked ? "" : "true")}
        title={isFuture ? "Día futuro" : ""}
        aria-label={checked ? `Desmarcar ${date}` : `Marcar ${date}`}
        aria-pressed={checked}
        className={`mx-auto flex size-7 items-center justify-center border-2 font-mono text-xs leading-none transition-colors duration-100 disabled:cursor-not-allowed ${
          isFuture
            ? "border-muted"
            : checked
            ? "border-foreground bg-foreground text-background"
            : isToday
            ? "border-primary bg-card hover:bg-muted"
            : "border-foreground bg-card hover:bg-muted"
        } ${pending ? "opacity-60" : ""}`}
      >
        {checked && <span aria-hidden>✓</span>}
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
        aria-label={`Valor ${date}`}
        className={`w-full appearance-none border-2 px-1 py-1 text-center [&>option]:bg-card [&>option]:text-foreground ${cellBase} ${cellState}`}
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
        aria-label={`Valor ${date}`}
        className={`w-full border-2 border-foreground bg-primary/10 px-1 py-1 text-center text-foreground ${cellBase}`}
      />
    );
  }

  return (
    <button
      type="button"
      disabled={isFuture || pending}
      onClick={() => { if (!isFuture) { setEditing(true); setTimeout(() => inputRef.current?.focus(), 0); } }}
      aria-label={`Valor ${date}`}
      className={`w-full border-2 px-1 py-1 ${cellBase} ${cellState}`}
    >
      {hasValue ? value : "—"}
    </button>
  );
}
