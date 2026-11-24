"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import HabitCell from "./HabitCell";
import NewHabitModal from "./NewHabitModal";
import { updateHabitName, updateHabitGoal, archiveHabit } from "./actions";
import { DAY_LABELS, toDateStr } from "@/lib/utils/dates";

interface Habit {
  id: string;
  name: string;
  goal_type: "boolean" | "numeric" | "dropdown";
  goal_options: string[];
  goal_unit: string | null;
  goal_target: string | null;
}

interface Log {
  habit_id: string;
  logged_date: string;
  value: string;
}

interface Props {
  habits: Habit[];
  logs: Log[];
  weekDays: Date[];
  weekStart: string;
  prevWeek: string;
  nextWeek: string;
  canGoNext: boolean;
}

export default function HabitsGrid({ habits, logs, weekDays, prevWeek, nextWeek, canGoNext }: Props) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [nameVal, setNameVal] = useState("");
  const [, startTransition] = useTransition();

  const today = toDateStr(new Date());

  const logMap: Record<string, Record<string, string>> = {};
  for (const log of logs) {
    if (!logMap[log.habit_id]) logMap[log.habit_id] = {};
    logMap[log.habit_id][log.logged_date] = log.value;
  }

  function handleNameSave(habitId: string) {
    setEditingName(null);
    if (nameVal.trim()) {
      startTransition(() => updateHabitName(habitId, nameVal));
    }
  }

  const weekLabel = (() => {
    const start = weekDays[0];
    const end = weekDays[6];
    const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
    return `${start.toLocaleDateString("es-AR", opts)} – ${end.toLocaleDateString("es-AR", opts)}`;
  })();

  const navBtn =
    "border-2 border-foreground bg-card px-2.5 py-1 font-mono text-[11px] tracking-[0.06em] uppercase shadow-hard transition-transform duration-100 hover:-translate-x-px hover:-translate-y-px active:translate-x-1 active:translate-y-1 active:shadow-none disabled:translate-x-0 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none";

  return (
    <>
      {showModal && <NewHabitModal onClose={() => { setShowModal(false); router.refresh(); }} />}

      <section className="border-2 border-foreground bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-foreground px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => router.push(`/habits?week=${prevWeek}`)}
              aria-label="Semana anterior"
              className={navBtn}
            >
              ←
            </button>
            <span className="min-w-[8.5rem] text-center font-mono text-xs font-bold tabular">{weekLabel}</span>
            <button
              type="button"
              disabled={!canGoNext}
              onClick={() => router.push(`/habits?week=${nextWeek}`)}
              aria-label="Semana siguiente"
              className={navBtn}
            >
              →
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="border-2 border-foreground bg-primary px-3.5 py-2 font-mono text-xs tracking-[0.06em] text-primary-foreground uppercase shadow-hard-primary transition-transform duration-100 hover:-translate-x-px hover:-translate-y-px active:translate-x-1 active:translate-y-1 active:shadow-none"
          >
            + Nuevo hábito
          </button>
        </div>

        {habits.length === 0 ? (
          <div className="px-6 py-14 text-center font-mono text-xs text-muted-foreground">
            <pre aria-hidden className="mb-3 leading-tight select-none">{"┌─────────┐\n│ □ □ □ □ │\n│ □ □ □   │\n└─────────┘"}</pre>
            Todavía no hay hábitos. Creá el primero para empezar a llevar la cuenta.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="bg-foreground text-background">
                  <th className="sticky left-0 z-10 w-44 border-r-2 border-foreground bg-foreground px-4 py-2 text-left font-mono text-[11px] font-normal tracking-[0.08em] uppercase">
                    Hábito
                  </th>
                  <th className="w-20 px-2 py-2 text-center font-mono text-[11px] font-normal tracking-[0.08em] uppercase">
                    Objetivo
                  </th>
                  {weekDays.map((day, i) => {
                    const ds = toDateStr(day);
                    const isToday = ds === today;
                    return (
                      <th
                        key={ds}
                        aria-current={isToday ? "date" : undefined}
                        className={`w-14 px-1 py-1.5 text-center font-mono font-normal ${isToday ? "bg-primary text-primary-foreground" : ""}`}
                      >
                        <div className="text-[10px] tracking-[0.08em] uppercase">{DAY_LABELS[i]}</div>
                        <div className={`text-[11px] tabular ${isToday ? "font-bold" : ""}`}>{day.getDate()}</div>
                      </th>
                    );
                  })}
                  <th className="w-8" aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {habits.map(habit => (
                  <tr key={habit.id} className="group border-b border-muted last:border-b-0 hover:bg-muted/40">
                    <td className="sticky left-0 z-10 border-r-2 border-foreground bg-card px-4 py-2">
                      {editingName === habit.id ? (
                        <input
                          autoFocus
                          value={nameVal}
                          onChange={e => setNameVal(e.target.value)}
                          onBlur={() => handleNameSave(habit.id)}
                          onKeyDown={e => { if (e.key === "Enter") handleNameSave(habit.id); if (e.key === "Escape") setEditingName(null); }}
                          aria-label="Nombre del hábito"
                          className="w-full border-b-2 border-primary bg-transparent text-sm outline-none"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => { setEditingName(habit.id); setNameVal(habit.name); }}
                          title="Renombrar"
                          className="w-full cursor-text truncate text-left font-medium hover:text-primary"
                        >
                          {habit.name}
                        </button>
                      )}
                    </td>

                    <td className="px-2 py-2 text-center">
                      <GoalTarget habit={habit} />
                    </td>

                    {weekDays.map(day => {
                      const ds = toDateStr(day);
                      const isToday = ds === today;
                      const isFuture = ds > today;
                      return (
                        <td key={ds} className={`px-1 py-1.5 ${isToday ? "bg-primary/10" : ""}`}>
                          <HabitCell
                            habitId={habit.id}
                            date={ds}
                            value={logMap[habit.id]?.[ds] ?? null}
                            goalType={habit.goal_type}
                            goalOptions={habit.goal_options}
                            isToday={isToday}
                            isFuture={isFuture}
                          />
                        </td>
                      );
                    })}

                    <td className="pr-3 text-center">
                      <button
                        type="button"
                        onClick={() => startTransition(() => archiveHabit(habit.id))}
                        title="Archivar hábito"
                        aria-label={`Archivar ${habit.name}`}
                        className="font-mono text-[11px] text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive focus-visible:opacity-100"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function GoalTarget({ habit }: { habit: Habit }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(habit.goal_target ?? "");
  const [, startTransition] = useTransition();

  function save() {
    setEditing(false);
    startTransition(() => updateHabitGoal(habit.id, val));
  }

  const display = habit.goal_target
    ? `${habit.goal_target}${habit.goal_unit ? ` ${habit.goal_unit}` : ""}`
    : habit.goal_type === "boolean"
    ? "—"
    : habit.goal_type === "dropdown"
    ? habit.goal_options[habit.goal_options.length - 1] ?? "—"
    : "—";

  if (habit.goal_type !== "numeric") {
    return <span className="font-mono text-[11px] text-muted-foreground tabular">{display}</span>;
  }

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={save}
        onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
        aria-label="Objetivo"
        className="w-16 border-2 border-foreground bg-primary/10 px-1 py-0.5 text-center font-mono text-xs tabular outline-none"
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      type="button"
      className="border-b border-dashed border-muted-foreground font-mono text-xs tabular hover:border-primary hover:text-primary"
      title="Editar objetivo"
    >
      {display}
    </button>
  );
}
