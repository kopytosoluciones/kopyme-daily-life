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
    <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#F5F5F5]">
        <h2 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#0A0A0A]">
          Progreso
        </h2>
        <div className="flex gap-1 bg-[#F5F5F5] p-1 rounded-lg text-xs">
          {(["week", "month", "year"] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded-md transition-all ${
                period === p
                  ? "bg-white text-[#0A0A0A] font-medium shadow-sm"
                  : "text-[#6B7280] hover:text-[#0A0A0A]"
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
    <div className="p-4 bg-[#F5F5F5] rounded-xl">
      <div className="flex justify-between items-start mb-3">
        <p className="text-sm font-medium text-[#0A0A0A]">{name}</p>
        <span className="font-[family-name:var(--font-mono)] text-xs text-[#6B7280]">{done}/{total} días</span>
      </div>
      <div className="h-1.5 bg-[#E5E7EB] rounded-full overflow-hidden mb-1.5">
        <div className="h-full bg-[#39FF14] rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="font-[family-name:var(--font-mono)] text-xs text-[#9CA3AF]">{pct}% completado</p>
    </div>
  );
}

function NumericCard({ name, avg, values, unit, target }: { name: string; avg: number; values: number[]; unit: string | null; target: number | null }) {
  const max = Math.max(...values, target ?? 0, 1);
  const last8 = values.slice(-8);

  return (
    <div className="p-4 bg-[#F5F5F5] rounded-xl">
      <div className="flex justify-between items-start mb-3">
        <p className="text-sm font-medium text-[#0A0A0A]">{name}</p>
        <span className="font-[family-name:var(--font-mono)] text-xs text-[#6B7280]">
          prom: {avg.toFixed(1)}{unit ? ` ${unit}` : ""}
        </span>
      </div>
      <div className="flex items-end gap-1 h-10">
        {last8.length === 0 && (
          <p className="font-[family-name:var(--font-mono)] text-xs text-[#D1D5DB]">Sin datos aún</p>
        )}
        {last8.map((v, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm bg-[#9D4EDD] transition-all"
            style={{ height: `${Math.max((v / max) * 100, 4)}%`, opacity: 0.4 + (i / last8.length) * 0.6 }}
            title={`${v}${unit ? ` ${unit}` : ""}`}
          />
        ))}
      </div>
      {target && (
        <p className="font-[family-name:var(--font-mono)] text-xs text-[#9CA3AF] mt-1.5">
          objetivo: {target}{unit ? ` ${unit}` : ""}
        </p>
      )}
    </div>
  );
}

function DropdownCard({ name, counts, options }: { name: string; counts: Record<string, number>; options: string[] }) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const colors = ["#39FF14", "#9D4EDD", "#F4A9D6", "#D9B3E8", "#B8E8C1"];

  return (
    <div className="p-4 bg-[#F5F5F5] rounded-xl">
      <p className="text-sm font-medium text-[#0A0A0A] mb-3">{name}</p>
      <div className="space-y-2">
        {options.map((opt, i) => {
          const count = counts[opt] ?? 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={opt}>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-[#6B7280]">{opt}</span>
                <span className="font-[family-name:var(--font-mono)] text-[#9CA3AF]">{count}×</span>
              </div>
              <div className="h-1.5 bg-[#E5E7EB] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: colors[i % colors.length] }}
                />
              </div>
            </div>
          );
        })}
      </div>
      {total === 0 && (
        <p className="font-[family-name:var(--font-mono)] text-xs text-[#D1D5DB] mt-2">Sin datos aún</p>
      )}
    </div>
  );
}
