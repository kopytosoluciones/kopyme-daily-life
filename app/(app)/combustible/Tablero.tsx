"use client";

import { useState } from "react";
import { addMonths, project, type MonthCalc } from "@/lib/finance/calc";
import { fmt, fmtSigned, fmtUsd, monthLabel } from "@/lib/finance/format";
import type { Wallet } from "@/lib/finance/types";
import { DeviationBars, LineChart, ScrambleNumber, asciiBar, spark } from "./charts";

const HORIZONS = [
  { months: 3, label: "Corto · 3 meses" },
  { months: 12, label: "Mediano · 1 año" },
  { months: 60, label: "Largo · 5 años" },
];
const DEVIATION_ALERT = 0.05;

const label = "font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase";

export default function Tablero({ rows, wallets, onGoBitacora }: { rows: MonthCalc[]; wallets: Wallet[]; onGoBitacora: () => void }) {
  const [horizon, setHorizon] = useState(12);
  const last = rows.at(-1);
  const prev = rows.at(-2);

  if (!last || (last.patrimony === 0 && last.month.income === 0)) {
    return (
      <div className="border-2 border-dashed border-muted-foreground px-6 py-12 text-center font-mono text-xs text-muted-foreground">
        <pre aria-hidden className="mb-3 leading-tight">{"┌────────┐\n│ ▁▂▃▅▇  │\n└────────┘"}</pre>
        El tablero se arma con tus datos. Cargá saldos, ingreso y gasto en la Bitácora.
        <div className="mt-4">
          <button type="button" onClick={onGoBitacora} className="border-2 border-foreground bg-card px-3.5 py-2 text-foreground uppercase shadow-hard active:translate-x-1 active:translate-y-1 active:shadow-none">
            Ir a la Bitácora →
          </button>
        </div>
      </div>
    );
  }

  const m = last.month;
  const save = m.income - m.expense;
  const rate = m.income ? (save / m.income) * 100 : 0;
  const runway = m.expense > 0 ? last.patrimony / m.expense : null;
  const devAlert = last.deviation != null && Math.abs(last.deviation) > Math.abs(m.income) * DEVIATION_ALERT;
  const projections = project(rows, HORIZONS.map((h) => h.months));
  const pct = prev && prev.patrimony ? ((last.diff ?? 0) / Math.abs(prev.patrimony)) * 100 : null;

  // Gráfico principal: histórico + horizonte seleccionado.
  const n = rows.length;
  const hist = rows.map((r, i) => [i, r.patrimony] as [number, number]);
  const diffs = rows.slice(-3).map((r) => r.diff).filter((d): d is number => d != null);
  const realAvg = diffs.length ? diffs.reduce((a, b) => a + b, 0) / diffs.length : null;
  const plan: [number, number][] = [[n - 1, last.patrimony]];
  const real: [number, number][] = [[n - 1, last.patrimony]];
  for (let k = 1; k <= horizon; k++) {
    plan.push([n - 1 + k, last.patrimony + save * k]);
    if (realAvg != null) real.push([n - 1 + k, last.patrimony + realAvg * k]);
  }
  const total = n - 1 + horizon;
  const step = total <= 12 ? 1 : total <= 24 ? 3 : 12;
  const xLabels = Array.from({ length: total + 1 }, (_, i) => i)
    .filter((i) => (i < n ? i % step === 0 || i === n - 1 : (i - (n - 1)) % step === 0))
    .map((i) => ({ x: i, text: monthLabel(addMonths(rows[0].month.month, i)) }));

  // Distribución por billetera, en USD.
  const dist = wallets
    .filter((w) => m.balances[w.id] != null && (m.balances[w.id] ?? 0) !== 0)
    .map((w) => {
      const raw = m.balances[w.id] ?? 0;
      const rateFx = w.currency === "USD" ? 1 : m.fxRates[w.currency];
      return { w, usd: rateFx ? raw / rateFx : null };
    });
  const maxUsd = Math.max(1, ...dist.map((d) => Math.abs(d.usd ?? 0)));
  const assets = dist.filter((d) => d.w.kind === "asset").sort((a, b) => (b.usd ?? 0) - (a.usd ?? 0));
  const debts = dist.filter((d) => d.w.kind === "debt");
  const devData = rows
    .filter((r) => r.deviation != null)
    .map((r) => ({ key: r.month.id, text: monthLabel(r.month.month).slice(0, 3), value: r.deviation! }));

  return (
    <section className="flex flex-col gap-6">
      <div className="grid border-2 border-foreground bg-card lg:grid-cols-[1.3fr_1fr]">
        <div className="flex flex-col gap-2.5 border-b-2 border-foreground p-6 lg:border-r-2 lg:border-b-0">
          <span className={label}>── Patrimonio neto · USD</span>
          <div className="font-mono text-[clamp(40px,6vw,68px)] leading-none font-bold tracking-[-0.03em] tabular">
            <span className="mr-1.5 text-[0.38em] font-normal tracking-normal text-muted-foreground">US$</span>
            <ScrambleNumber text={fmt(Math.round(last.patrimony))} />
          </div>
          <div className="flex flex-wrap gap-4 font-mono text-[13px]">
            {last.diff == null ? (
              <span className="text-muted-foreground">primer mes registrado</span>
            ) : (
              <>
                <span className={last.diff >= 0 ? "text-pos" : "text-destructive"}>
                  {last.diff >= 0 ? "▲" : "▼"} {fmtSigned(last.diff)} vs {monthLabel(prev!.month.month)}
                </span>
                {pct != null && <span className={last.diff >= 0 ? "text-pos" : "text-destructive"}>{pct >= 0 ? "+" : "−"}{fmt(Math.abs(pct), 1)}%</span>}
              </>
            )}
          </div>
          {rows.length > 1 && (
            <>
              <span aria-hidden className="font-mono text-[22px] tracking-[2px]">{spark(rows.map((r) => r.patrimony))}</span>
              <span className="font-mono text-[11px] text-muted-foreground">{monthLabel(rows[0].month.month)} → {monthLabel(m.month)}</span>
            </>
          )}
          {last.missingFx.length > 0 && (
            <span className="font-mono text-[11px] text-destructive">Sin tipo de cambio {last.missingFx.join(", ")}: esos saldos no están sumados.</span>
          )}
        </div>
        <div className="grid grid-cols-2">
          <Kpi title="Ingreso" value={fmtUsd(m.income)} note="del mes" className="border-r-2" />
          <Kpi title="Gasto" value={fmtUsd(m.expense)} note="del mes" />
          <Kpi title="Ahorro" value={fmtUsd(save)} valueClass={save >= 0 ? "text-pos" : "text-destructive"} note={`[${asciiBar(rate, 100, 10)}] ${fmt(rate)}%`} className="border-r-2" />
          <Kpi title="Pista" value={runway == null ? "—" : `${fmt(runway, 1)} m`} note="meses viviendo sin ingresos" />
          <div className={`col-span-2 flex flex-col gap-1 p-4 ${devAlert ? "bg-destructive/10" : ""}`}>
            <span className={label}>Desvío {monthLabel(m.month)}</span>
            <span className={`font-mono text-[22px] font-bold tabular ${last.deviation != null && last.deviation < 0 ? "text-destructive" : "text-pos"}`}>
              {last.deviation == null ? "—" : fmtSigned(last.deviation)}
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              {devAlert && <span className="mr-1.5 border-[1.5px] border-destructive px-1.5 text-[10px] text-destructive uppercase">revisar</span>}
              {last.diff == null
                ? "necesita dos meses para compararse"
                : `esperabas ${fmtSigned(last.expected)}, el patrimonio cambió ${fmtSigned(last.diff)}`}
            </span>
          </div>
        </div>
      </div>

      <div className="border-2 border-foreground bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-foreground px-4 py-2.5">
          <span className={label}>── Proyección · si todo se mantiene</span>
          <div className="flex flex-wrap gap-4 font-mono text-[11px] text-muted-foreground">
            <Legend color="var(--foreground)">histórico</Legend>
            <Legend color="var(--primary)">plan (ingreso − gasto)</Legend>
            <Legend color="var(--muted-foreground)" dashed>ritmo real (prom. 3m)</Legend>
          </div>
        </div>
        <div role="group" aria-label="Horizonte" className="grid sm:grid-cols-3">
          {HORIZONS.map((h, i) => {
            const p = projections[i];
            const on = horizon === h.months;
            return (
              <button
                key={h.months}
                type="button"
                aria-pressed={on}
                onClick={() => setHorizon(h.months)}
                className={`flex flex-col gap-1.5 border-foreground p-4 text-left max-sm:border-b-2 sm:border-r-2 sm:last:border-r-0 ${on ? "bg-muted" : "hover:bg-muted/50"}`}
              >
                <span className={`${label} ${on ? "text-foreground" : ""}`}>{h.label} · {monthLabel(p.target)}</span>
                <span className="font-mono text-[26px] font-bold tabular">{fmtUsd(p.plan)}</span>
                <span className="font-mono text-xs text-muted-foreground">ritmo real: {p.real == null ? "—" : fmtUsd(p.real)}</span>
              </button>
            );
          })}
        </div>
        <div className="border-t-2 border-foreground p-4">
          <LineChart
            label="Patrimonio histórico y proyectado"
            todayX={n - 1}
            xLabels={xLabels}
            series={[
              { points: plan, color: "var(--primary)" },
              ...(real.length > 1 ? [{ points: real, color: "var(--muted-foreground)", dashed: true, width: 2 }] : []),
              { points: hist, color: "var(--foreground)", markers: true },
            ]}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="border-2 border-foreground bg-card">
          <div className="flex items-center justify-between gap-3 border-b-2 border-foreground px-4 py-2.5">
            <span className={label}>── Dónde está la plata</span>
            <span className="font-mono text-[11px] text-muted-foreground">en USD · {monthLabel(m.month)}</span>
          </div>
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3.5 gap-y-1.5 p-4 font-mono text-[12.5px]">
            {[...assets, ...(debts.length && assets.length ? [null] : []), ...debts].map((d, i) =>
              d == null ? (
                <div key={`sep${i}`} className="col-span-3 my-1 border-t border-dashed border-muted" />
              ) : (
                <DistRow key={d.w.id} name={d.w.name} currency={d.w.currency} debt={d.w.kind === "debt"} usd={d.usd} max={maxUsd} />
              ),
            )}
            {!dist.length && <span className="col-span-3 text-muted-foreground">Sin saldos cargados en {monthLabel(m.month)}.</span>}
          </div>
        </div>
        <div className="border-2 border-foreground bg-card">
          <div className="flex items-center justify-between gap-3 border-b-2 border-foreground px-4 py-2.5">
            <span className={label}>── Desvío mes a mes</span>
            <span className="font-mono text-[11px] text-muted-foreground">real − (ingreso − gasto)</span>
          </div>
          <div className="p-4">
            {devData.length ? (
              <DeviationBars data={devData} label="Desvío por mes" />
            ) : (
              <p className="py-8 text-center font-mono text-xs text-muted-foreground">Aparece cuando tengas dos meses cargados.</p>
            )}
            <p className="mt-2 font-mono text-[11px] text-muted-foreground">
              Positivo: entró más de lo que anotaste. Negativo: plata que no sabés a dónde fue (gasto sin anotar, tipo de cambio).
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Kpi({ title, value, note, valueClass = "", className = "" }: { title: string; value: string; note: string; valueClass?: string; className?: string }) {
  return (
    <div className={`flex flex-col gap-1 border-b-2 border-foreground p-4 ${className}`}>
      <span className={label}>{title}</span>
      <span className={`font-mono text-[22px] font-bold tabular ${valueClass}`}>{value}</span>
      <span className="font-mono text-[11px] text-muted-foreground">{note}</span>
    </div>
  );
}

function Legend({ color, dashed, children }: { color: string; dashed?: boolean; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <i aria-hidden className="inline-block w-[18px] border-t-2" style={{ borderColor: color, borderTopStyle: dashed ? "dashed" : "solid" }} />
      {children}
    </span>
  );
}

function DistRow({ name, currency, debt, usd, max }: { name: string; currency: string; debt: boolean; usd: number | null; max: number }) {
  return (
    <>
      <span>
        {name}
        <span className="ml-1 text-[10px] text-muted-foreground">{currency}</span>
      </span>
      <span aria-hidden className={`overflow-hidden tracking-[-1px] whitespace-nowrap ${debt ? "text-destructive" : ""}`}>
        {usd == null ? "falta TC" : asciiBar(usd, max)}
      </span>
      <span className={`text-right tabular ${debt ? "text-destructive" : ""}`}>
        {usd == null ? "—" : `${debt ? "−" : ""}${fmt(Math.round(Math.abs(usd)))}`}
      </span>
    </>
  );
}
