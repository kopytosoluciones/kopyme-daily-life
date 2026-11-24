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
    <section className="border-2 border-foreground bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-foreground px-4 py-2.5">
        <h2 className={label}>── Progreso</h2>
        <div role="group" aria-label="Período" className="flex border-2 border-foreground">
          {(["week", "month", "year"] as Period[]).map(p => (
            <button
              key={p}
              type="button"
              aria-pressed={period === p}
              onClick={() => setPeriod(p)}
              className={`border-r-2 border-foreground px-3 py-1 font-mono text-[11px] tracking-[0.06em] uppercase last:border-r-0 ${
                period === p ? "bg-foreground text-background" : "bg-card text-foreground hover:bg-muted"
              }`}
            >
              {p === "week" ? "Semana" : p === "month" ? "Mes" : "Año"}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      <div className="grid gap-px bg-muted sm:grid-cols-2">
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
    </section>
  );
}

const label = "font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase";
const card = "flex flex-col gap-2.5 bg-card p-4 sm:last:odd:col-span-2";
const fmt1 = (n: number) => n.toLocaleString("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function asciiBar(pct: number, width = 10) {
  const filled = Math.max(0, Math.min(width, Math.round((pct / 100) * width)));
  return "█".repeat(filled) + "░".repeat(width - filled);
}

function BooleanCard({ name, done, total, pct }: { name: string; done: number; total: number; pct: number }) {
  return (
    <div className={card}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="min-w-0 truncate font-bold">{name}</p>
        <span className="shrink-0 font-mono text-[11px] text-muted-foreground tabular">{done}/{total} días</span>
      </div>
      <p className="font-mono text-[13px] tabular" aria-label={`${pct}% completado`}>
        <span aria-hidden className="tracking-[-1px] select-none">[{asciiBar(pct)}]</span>{" "}
        <span className="font-bold">{pct}%</span>
      </p>
    </div>
  );
}

function NumericCard({ name, avg, values, unit, target }: { name: string; avg: number; values: number[]; unit: string | null; target: number | null }) {
  const max = Math.max(...values, target ?? 0, 1);
  const last8 = values.slice(-8);

  return (
    <div className={card}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="min-w-0 truncate font-bold">{name}</p>
        <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
          prom <span className="font-bold text-foreground tabular">{fmt1(avg)}</span>{unit ? ` ${unit}` : ""}
        </span>
      </div>
      <div className="flex h-10 items-end gap-1 border-b-2 border-foreground">
        {last8.length === 0 && (
          <p className="self-center font-mono text-[11px] text-muted-foreground">Sin datos aún</p>
        )}
        {last8.map((v, i) => (
          <div
            key={i}
            className={`flex-1 ${i === last8.length - 1 ? "bg-primary" : "bg-foreground"}`}
            style={{ height: `${Math.max((v / max) * 100, 4)}%` }}
            title={`${v}${unit ? ` ${unit}` : ""}`}
          />
        ))}
      </div>
      {target && (
        <p className="font-mono text-[11px] text-muted-foreground">
          objetivo: <span className="tabular">{target}</span>{unit ? ` ${unit}` : ""}
        </p>
      )}
    </div>
  );
}

function DropdownCard({ name, counts, options }: { name: string; counts: Record<string, number>; options: string[] }) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className={card}>
      <p className="truncate font-bold">{name}</p>
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 font-mono text-[12px]">
        {options.map(opt => {
          const count = counts[opt] ?? 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={opt} className="contents">
              <span className="max-w-[10rem] truncate text-muted-foreground">{opt}</span>
              <span aria-hidden className="overflow-hidden tracking-[-1px] whitespace-nowrap select-none">{asciiBar(pct)}</span>
              <span className="text-right tabular">{count}×</span>
            </div>
          );
        })}
      </div>
      {total === 0 && (
        <p className="font-mono text-[11px] text-muted-foreground">Sin datos aún</p>
      )}
    </div>
  );
}
