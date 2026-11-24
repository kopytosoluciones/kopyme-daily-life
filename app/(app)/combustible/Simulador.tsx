"use client";

import { useState } from "react";
import { simulate, type MonthCalc, type SimParams } from "@/lib/finance/calc";
import { fmt, fmtUsd } from "@/lib/finance/format";
import { StackedArea, asciiBar } from "./charts";

type Control = {
  id: keyof SimParams;
  label: string;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  showToday?: boolean;
};

const CONTROLS: Control[] = [
  { id: "income", label: "Ingreso mensual", min: 0, max: 20000, step: 100, format: fmtUsd, showToday: true },
  { id: "expense", label: "Gasto mensual", min: 0, max: 15000, step: 50, format: fmtUsd, showToday: true },
  { id: "growth", label: "Aumento anual del ingreso", min: 0, max: 30, step: 1, format: (v) => `${v}%` },
  { id: "investPct", label: "% del ahorro que invertís", min: 0, max: 100, step: 5, format: (v) => `${v}%` },
  { id: "returnPct", label: "Rendimiento anual supuesto", min: 0, max: 15, step: 0.5, format: (v) => `${fmt(v, 1)}%` },
  { id: "years", label: "Horizonte", min: 1, max: 30, step: 1, format: (v) => `${v} ${v === 1 ? "año" : "años"}` },
];

const label = "font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase";

export default function Simulador({ rows }: { rows: MonthCalc[] }) {
  const last = rows.at(-1);
  const start = last?.patrimony ?? 0;
  const today: SimParams = {
    income: last?.month.income ?? 0,
    expense: last?.month.expense ?? 0,
    growth: 0,
    investPct: 50,
    returnPct: 6,
    years: 5,
  };
  const [params, setParams] = useState<SimParams>(today);

  const sim = simulate(params, start);
  const base = simulate({ ...today, years: params.years, investPct: 0, growth: 0 }, start);
  const end = sim.at(-1)!;
  const baseEnd = base.at(-1)!;
  const gain = end.total - end.contributed;
  const runway = params.expense > 0 ? end.total / params.expense : null;
  const diff = end.total - baseEnd.total;
  const max = Math.max(end.total, baseEnd.total, start, 1);
  const w = 28;
  const summary = [
    `── RESUMEN ${"─".repeat(40)}`,
    `hoy          ${asciiBar(start, max, w)}  ${fmtUsd(start)}`,
    `sin cambios  ${asciiBar(baseEnd.total, max, w)}  ${fmtUsd(baseEnd.total)}`,
    `simulado     ${asciiBar(end.total, max, w)}  ${fmtUsd(end.total)}`,
    "─".repeat(51),
    `diferencia vs. no hacer nada   ${diff >= 0 ? "+" : "−"}${fmtUsd(Math.abs(diff))}`,
  ].join("\n");

  return (
    <section className="flex flex-col gap-3">
      <div className="grid border-2 border-foreground bg-card xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="grid border-b-2 border-foreground sm:grid-cols-2 xl:grid-cols-1 xl:border-r-2 xl:border-b-0">
          {CONTROLS.map((c) => (
            <div key={c.id} className="flex flex-col gap-2 border-b border-muted px-[18px] py-3.5">
              <div className="flex items-baseline justify-between gap-2">
                <label htmlFor={`sim-${c.id}`} className={label}>{c.label}</label>
                <output htmlFor={`sim-${c.id}`} className="font-mono text-[15px] font-bold tabular">{c.format(params[c.id])}</output>
              </div>
              <input
                id={`sim-${c.id}`}
                type="range"
                min={c.min}
                max={Math.max(c.max, today[c.id])}
                step={c.step}
                value={params[c.id]}
                onChange={(e) => setParams((p) => ({ ...p, [c.id]: Number(e.target.value) }))}
                className="k-range"
              />
              {c.showToday && <span className="font-mono text-[10.5px] text-muted-foreground">hoy: {c.format(today[c.id])}</span>}
            </div>
          ))}
          <div className="px-[18px] py-3.5 sm:col-span-2 xl:col-span-1">
            <button
              type="button"
              onClick={() => setParams(today)}
              className="border-2 border-foreground bg-card px-3.5 py-2 font-mono text-xs tracking-[0.06em] uppercase shadow-hard transition-transform duration-100 hover:-translate-x-px hover:-translate-y-px active:translate-x-1 active:translate-y-1 active:shadow-none"
            >
              Volver a hoy
            </button>
          </div>
        </div>

        <div className="flex min-w-0 flex-col">
          <div className="grid border-b-2 border-foreground sm:grid-cols-3">
            <Stat title={`Patrimonio en ${params.years} ${params.years === 1 ? "año" : "años"}`} value={fmtUsd(end.total)} note={`vs ${fmtUsd(baseEnd.total)} con valores de hoy`} />
            <Stat title="Generado por rendimiento" value={fmtUsd(gain)} valueClass={gain >= 0 ? "text-pos" : "text-destructive"} note={`${fmt(end.total ? (gain / end.total) * 100 : 0)}% del total`} />
            <Stat title="Pista final" value={runway == null ? "—" : `${fmt(runway)} meses`} note={runway == null ? "sin gasto cargado" : `≈ ${fmt(runway / 12, 1)} años sin ingresos`} />
          </div>
          <div className="flex flex-col gap-2.5 p-4">
            <div className="flex flex-wrap gap-4 font-mono text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5"><i aria-hidden className="inline-block h-2 w-[18px] bg-primary" />rendimiento</span>
              <span className="flex items-center gap-1.5"><i aria-hidden className="inline-block h-2 w-[18px] bg-foreground" />lo que aportás</span>
              <span className="flex items-center gap-1.5"><i aria-hidden className="inline-block w-[18px] border-t-2 border-dashed border-muted-foreground" />valores de hoy, sin invertir</span>
            </div>
            <StackedArea
              label="Simulación de patrimonio"
              points={sim.map((p) => ({ x: p.month, total: p.total, contributed: p.contributed }))}
              baseline={base.map((p) => ({ x: p.month, total: p.total }))}
            />
          </div>
          <pre aria-label="Resumen" className="overflow-x-auto border-t-2 border-foreground px-4 py-3.5 font-mono text-xs leading-relaxed">{summary}</pre>
        </div>
      </div>
      <p className="font-mono text-[11px] text-muted-foreground">Calculadora con supuestos que elegís vos. No es asesoramiento financiero.</p>
    </section>
  );
}

function Stat({ title, value, note, valueClass = "" }: { title: string; value: string; note: string; valueClass?: string }) {
  return (
    <div className="flex flex-col gap-1 border-foreground p-4 max-sm:border-b-2 sm:border-r-2 sm:last:border-r-0">
      <span className={label}>{title}</span>
      <span className={`font-mono text-[clamp(18px,2.2vw,24px)] font-bold tabular ${valueClass}`}>{value}</span>
      <span className="font-mono text-[11px] text-muted-foreground">{note}</span>
    </div>
  );
}
