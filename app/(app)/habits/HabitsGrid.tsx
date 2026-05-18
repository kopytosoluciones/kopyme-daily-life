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

export default function HabitsGrid({ habits, logs, weekDays, weekStart, prevWeek, nextWeek, canGoNext }: Props) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [nameVal, setNameVal] = useState("");
  const [, startTransition] = useTransition();

  const today = toDateStr(new Date());

  // Index logs by habitId + date
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

  return (
    <>
      {showModal && <NewHabitModal onClose={() => { setShowModal(false); router.refresh(); }} />}

      <div className="bg-[#FDFAF4] rounded-2xl border border-[#E2D9C8] overflow-hidden">
        {/* Week navigation */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#F0EBE2]">
          <button
            onClick={() => router.push(`/habits?week=${prevWeek}`)}
            className="text-[#B8B0A4] hover:text-[#2C2416] transition-colors px-2 py-1 rounded-lg hover:bg-[#F5F0E8] text-sm"
          >
            ← anterior
          </button>
          <span className="text-sm text-[#7A6E5F] font-medium">{weekLabel}</span>
          <button
            disabled={!canGoNext}
            onClick={() => router.push(`/habits?week=${nextWeek}`)}
            className="text-[#B8B0A4] hover:text-[#2C2416] transition-colors px-2 py-1 rounded-lg hover:bg-[#F5F0E8] text-sm disabled:opacity-30 disabled:cursor-not-allowed"
          >
            siguiente →
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#F0EBE2]">
                <th className="text-left px-5 py-2.5 text-xs font-medium text-[#B8B0A4] w-44">Hábito</th>
                <th className="text-center px-2 py-2.5 text-xs font-medium text-[#B8B0A4] w-20">Objetivo</th>
                {weekDays.map((day, i) => {
                  const ds = toDateStr(day);
                  const isToday = ds === today;
                  return (
                    <th key={ds} className={`text-center px-1 py-2.5 w-14 ${isToday ? "text-[#E07B4A]" : "text-[#B8B0A4]"}`}>
                      <div className="text-xs font-medium">{DAY_LABELS[i]}</div>
                      <div className={`text-[10px] mt-0.5 ${isToday ? "font-bold" : "font-normal"}`}>
                        {day.getDate()}
                      </div>
                    </th>
                  );
                })}
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {habits.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-[#C8BFB0] text-sm">
                    Todavía no hay hábitos. ¡Creá el primero!
                  </td>
                </tr>
              )}
              {habits.map(habit => (
                <tr key={habit.id} className="border-b border-[#F5F0E8] last:border-0 hover:bg-[#FDFAF4] group">
                  {/* Name */}
                  <td className="px-5 py-2.5">
                    {editingName === habit.id ? (
                      <input
                        autoFocus
                        value={nameVal}
                        onChange={e => setNameVal(e.target.value)}
                        onBlur={() => handleNameSave(habit.id)}
                        onKeyDown={e => { if (e.key === "Enter") handleNameSave(habit.id); if (e.key === "Escape") setEditingName(null); }}
                        className="w-full bg-transparent text-[#2C2416] text-sm focus:outline-none border-b border-[#E07B4A]"
                      />
                    ) : (
                      <span
                        onClick={() => { setEditingName(habit.id); setNameVal(habit.name); }}
                        className="text-[#2C2416] cursor-text hover:text-[#E07B4A] transition-colors"
                      >
                        {habit.name}
                      </span>
                    )}
                  </td>

                  {/* Goal target */}
                  <td className="px-2 py-2.5 text-center">
                    <GoalTarget habit={habit} />
                  </td>

                  {/* Day cells */}
                  {weekDays.map(day => {
                    const ds = toDateStr(day);
                    const isToday = ds === today;
                    const isFuture = ds > today;
                    return (
                      <td key={ds} className="px-1 py-2">
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

                  {/* Archive */}
                  <td className="pr-3">
                    <button
                      onClick={() => startTransition(() => archiveHabit(habit.id))}
                      title="Archivar hábito"
                      className="opacity-0 group-hover:opacity-100 text-[#D9D0C0] hover:text-[#B8B0A4] transition-all"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add habit */}
        <div className="px-5 py-3 border-t border-[#F0EBE2]">
          <button
            onClick={() => setShowModal(true)}
            className="text-sm text-[#E07B4A] hover:underline font-medium"
          >
            + Nuevo hábito
          </button>
        </div>
      </div>
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
    return <span className="text-xs text-[#C8BFB0]">{display}</span>;
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
        className="w-16 text-xs text-center bg-[#F5F0E8] border border-[#E07B4A] rounded-lg px-1 py-0.5 focus:outline-none"
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="text-xs text-[#B8B0A4] hover:text-[#E07B4A] transition-colors"
      title="Editar objetivo"
    >
      {display}
    </button>
  );
}
