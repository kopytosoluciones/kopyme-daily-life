"use client";

import { useState } from "react";

type Period = "week" | "month" | "year";

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
  allLogs: Log[];
}

export default function HabitsDashboard({ habits, allLogs }: Props) {
  const [period, setPeriod] = useState<Period>("week");

  if (habits.length === 0) return null;

  const now = new Date();
  const cutoff = new Date(now);
  if (period === "week")  cutoff.setDate(now.getDate() - 7);
  if (period === "month") cutoff.setMonth(now.getMonth() - 1);
  if (period === "year")  cutoff.setFullYear(now.getFullYear() - 1);

  const filteredLogs = allLogs.filter(l => new Date(l.logged_date) >= cutoff);
  const totalDays = period === "week" ? 7 : period === "month" ? 30 : 365;

  return (
    <div className="bg-[#FDFAF4] rounded-2xl border border-[#E2D9C8]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#F0EBE2]">
        <h2 className="font-[family-name:var(--font-lora)] text-lg font-semibold text-[#2C2416]">
          Progreso
        </h2>
        <div className="flex gap-1 bg-[#EDE8DF] p-1 rounded-xl text-xs">
          {(["week", "month", "year"] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded-lg transition-all ${
                period === p ? "bg-[#FDFAF4] text-[#2C2416] font-medium shadow-sm" : "text-[#7A6E5F]"
              }`}
            >
              {p === "week" ? "Semana" : p === "month" ? "Mes" : "Año"}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      <div className="p-5 grid gap-4 sm:grid-cols-2">
        {habits.map(habit => {
          const logs = filteredLogs.filter(l => l.habit_id === habit.id);

          if (habit.goal_type === "boolean") {
            const done = logs.filter(l => l.value === "true").length;
            const pct = Math.round((done / totalDays) * 100);
            return (
              <BooleanCard key={habit.id} name={habit.name} done={done} total={totalDays} pct={pct} />
            );
          }

          if (habit.goal_type === "numeric") {
            const values = logs.map(l => parseFloat(l.value)).filter(v => !isNaN(v));
            const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
            const target = habit.goal_target ? parseFloat(habit.goal_target) : null;
            return (
              <NumericCard key={habit.id} name={habit.name} avg={avg} values={values} unit={habit.goal_unit} target={target} />
            );
          }

          if (habit.goal_type === "dropdown") {
            const counts: Record<string, number> = {};
            for (const opt of habit.goal_options) counts[opt] = 0;
            for (const log of logs) { if (counts[log.value] !== undefined) counts[log.value]++; }
            return (
              <DropdownCard key={habit.id} name={habit.name} counts={counts} options={habit.goal_options} />
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}

function BooleanCard({ name, done, total, pct }: { name: string; done: number; total: number; pct: number }) {
  return (
    <div className="p-4 bg-[#F5F0E8] rounded-xl">
      <div className="flex justify-between items-start mb-3">
        <p className="text-sm font-medium text-[#2C2416]">{name}</p>
        <span className="text-xs text-[#7A6E5F]">{done}/{total} días</span>
      </div>
      <div className="h-2 bg-[#E2D9C8] rounded-full overflow-hidden mb-1.5">
        <div className="h-full bg-[#7CB87A] rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-[#B8B0A4]">{pct}% completado</p>
    </div>
  );
}

function NumericCard({ name, avg, values, unit, target }: { name: string; avg: number; values: number[]; unit: string | null; target: number | null }) {
  const max = Math.max(...values, target ?? 0, 1);
  const last8 = values.slice(-8);

  return (
    <div className="p-4 bg-[#F5F0E8] rounded-xl">
      <div className="flex justify-between items-start mb-3">
        <p className="text-sm font-medium text-[#2C2416]">{name}</p>
        <span className="text-xs text-[#7A6E5F]">
          promedio: {avg.toFixed(1)}{unit ? ` ${unit}` : ""}
        </span>
      </div>
      {/* Mini sparkline */}
      <div className="flex items-end gap-1 h-10">
        {last8.length === 0 && <p className="text-xs text-[#C8BFB0]">Sin datos aún</p>}
        {last8.map((v, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm bg-[#4A8FA8] transition-all"
            style={{ height: `${Math.max((v / max) * 100, 4)}%`, opacity: 0.6 + (i / last8.length) * 0.4 }}
            title={`${v}${unit ? ` ${unit}` : ""}`}
          />
        ))}
      </div>
      {target && (
        <p className="text-xs text-[#B8B0A4] mt-1.5">objetivo: {target}{unit ? ` ${unit}` : ""}</p>
      )}
    </div>
  );
}

function DropdownCard({ name, counts, options }: { name: string; counts: Record<string, number>; options: string[] }) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const colors = ["#7CB87A", "#4A8FA8", "#E8C84A", "#C17A9E", "#E07B4A"];

  return (
    <div className="p-4 bg-[#F5F0E8] rounded-xl">
      <p className="text-sm font-medium text-[#2C2416] mb-3">{name}</p>
      <div className="space-y-2">
        {options.map((opt, i) => {
          const count = counts[opt] ?? 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={opt}>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-[#7A6E5F]">{opt}</span>
                <span className="text-[#B8B0A4]">{count}×</span>
              </div>
              <div className="h-1.5 bg-[#E2D9C8] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: colors[i % colors.length] }}
                />
              </div>
            </div>
          );
        })}
      </div>
      {total === 0 && <p className="text-xs text-[#C8BFB0] mt-2">Sin datos aún</p>}
    </div>
  );
}
