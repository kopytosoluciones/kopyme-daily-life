"use client";

import { useEffect, useRef } from "react";
import { fmt } from "@/lib/finance/format";

export function niceTicks(lo: number, hi: number, n = 4): number[] {
  if (lo === hi) {
    const pad = Math.abs(lo) * 0.1 || 1;
    lo -= pad;
    hi += pad;
  }
  const step0 = (hi - lo) / n;
  const mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const step = [1, 2, 2.5, 5, 10].map((s) => s * mag).find((s) => s >= step0) ?? step0;
  const a = Math.floor(lo / step) * step;
  const b = Math.ceil(hi / step) * step;
  const out: number[] = [];
  for (let v = a; v <= b + step / 2; v += step) out.push(Number(v.toFixed(6)));
  return out;
}

export function kfmt(v: number): string {
  const a = Math.abs(v);
  if (a >= 1_000_000) return (v < 0 ? "−" : "") + fmt(a / 1_000_000, a >= 10_000_000 ? 0 : 1) + "M";
  if (a >= 1000) return (v < 0 ? "−" : "") + fmt(a / 1000, a >= 10_000 ? 0 : 1) + "k";
  return fmt(v);
}

const SPARK = "▁▂▃▄▅▆▇█";
export function spark(values: number[]): string {
  if (!values.length) return "";
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  return values.map((v) => SPARK[hi === lo ? 3 : Math.round(((v - lo) / (hi - lo)) * 7)]).join("");
}

export function asciiBar(value: number, max: number, width = 22): string {
  const n = max > 0 ? Math.min(width, Math.round((Math.abs(value) / max) * width)) : 0;
  return "█".repeat(n) + "░".repeat(width - n);
}

/** Cifra que se "descifra" al montarse. Anima el texto por ref, sin estado. */
export function ScrambleNumber({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.textContent = text;
      return;
    }
    const glyphs = "0123456789#%&$▓▒░";
    const total = 18;
    let frame = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      el.textContent = text
        .split("")
        .map((ch, i) => (!/\d/.test(ch) || frame / total > i / text.length ? ch : glyphs[Math.floor(Math.random() * glyphs.length)]))
        .join("");
      if (++frame <= total) timer = setTimeout(tick, 28);
      else el.textContent = text;
    };
    tick();
    return () => clearTimeout(timer);
  }, [text]);
  return (
    <span ref={ref} className={className} aria-label={text}>
      {text}
    </span>
  );
}

type Series = { points: [number, number][]; color: string; dashed?: boolean; width?: number; markers?: boolean };

export function LineChart({
  series,
  xLabels,
  todayX,
  height = 280,
  label,
}: {
  series: Series[];
  xLabels: { x: number; text: string }[];
  todayX?: number;
  height?: number;
  label: string;
}) {
  const W = 900;
  const H = height;
  const L = 56, R = 16, T = 14, B = 30;
  const xs = series.flatMap((s) => s.points.map((p) => p[0]));
  const ys = series.flatMap((s) => s.points.map((p) => p[1]));
  if (!xs.length) return null;
  const x0 = Math.min(...xs), x1 = Math.max(...xs) || 1;
  const ticks = niceTicks(Math.min(...ys), Math.max(...ys));
  const y0 = ticks[0], y1 = ticks[ticks.length - 1];
  const X = (x: number) => L + ((x - x0) / (x1 - x0 || 1)) * (W - L - R);
  const Y = (y: number) => T + (1 - (y - y0) / (y1 - y0 || 1)) * (H - T - B);
  const d = (pts: [number, number][]) => pts.map((p, i) => `${i ? "L" : "M"}${X(p[0]).toFixed(1)} ${Y(p[1]).toFixed(1)}`).join(" ");
  const lastX = Math.max(...xLabels.map((l) => l.x));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="block h-auto w-full font-mono text-[11px]">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={L} x2={W - R} y1={Y(t)} y2={Y(t)} stroke="var(--muted)" strokeWidth={1} />
          <text x={L - 8} y={Y(t) + 4} textAnchor="end" fill="var(--muted-foreground)">{kfmt(t)}</text>
        </g>
      ))}
      {todayX != null && todayX < x1 && (
        <>
          <rect x={X(todayX)} y={T} width={X(x1) - X(todayX)} height={H - T - B} fill="var(--muted)" opacity={0.45} />
          <line x1={X(todayX)} x2={X(todayX)} y1={T} y2={H - B} stroke="var(--foreground)" strokeDasharray="2 3" />
          <text x={X(todayX) + 6} y={T + 12} fill="var(--muted-foreground)">HOY</text>
        </>
      )}
      {xLabels.map((l) => (
        <text key={l.x} x={X(l.x)} y={H - 10} textAnchor={l.x === lastX ? "end" : l.x === x0 ? "start" : "middle"} fill="var(--muted-foreground)">
          {l.text}
        </text>
      ))}
      <line x1={L} x2={W - R} y1={H - B} y2={H - B} stroke="var(--foreground)" strokeWidth={2} />
      {series.map((s, i) => (
        <g key={i}>
          <path d={d(s.points)} fill="none" stroke={s.color} strokeWidth={s.width ?? 2.5} strokeDasharray={s.dashed ? "6 5" : undefined} />
          {s.markers &&
            s.points.map((p) => (
              <rect key={p[0]} x={X(p[0]) - 3} y={Y(p[1]) - 3} width={6} height={6} fill="var(--card)" stroke={s.color} strokeWidth={2} />
            ))}
        </g>
      ))}
      {series[0] && (() => {
        const end = series[0].points.at(-1)!;
        return (
          <>
            <rect x={X(end[0]) - 4} y={Y(end[1]) - 4} width={8} height={8} fill={series[0].color} />
            <text x={X(end[0]) - 8} y={Y(end[1]) - 10} textAnchor="end" fill={series[0].color} fontWeight={700}>{kfmt(end[1])}</text>
          </>
        );
      })()}
    </svg>
  );
}

export function DeviationBars({ data, label }: { data: { key: string; text: string; value: number }[]; label: string }) {
  const W = 440, H = 220, L = 46, R = 10, T = 12, B = 28;
  const ticks = niceTicks(Math.min(0, ...data.map((d) => d.value)), Math.max(0, ...data.map((d) => d.value)), 4);
  const y0 = ticks[0], y1 = ticks[ticks.length - 1];
  const Y = (v: number) => T + (1 - (v - y0) / (y1 - y0 || 1)) * (H - T - B);
  const bw = (W - L - R) / Math.max(1, data.length);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="block h-auto w-full font-mono text-[11px]">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={L} x2={W - R} y1={Y(t)} y2={Y(t)} stroke={t === 0 ? "var(--foreground)" : "var(--muted)"} strokeWidth={t === 0 ? 2 : 1} />
          <text x={L - 6} y={Y(t) + 4} textAnchor="end" fill="var(--muted-foreground)">{kfmt(t)}</text>
        </g>
      ))}
      {data.map((d, i) => {
        const x = L + i * bw + bw * 0.22;
        const w = bw * 0.56;
        return (
          <g key={d.key}>
            <rect x={x} y={Math.min(Y(d.value), Y(0))} width={w} height={Math.max(1, Math.abs(Y(d.value) - Y(0)))} fill={d.value < 0 ? "var(--destructive)" : "var(--success)"} />
            <text x={x + w / 2} y={H - 10} textAnchor="middle" fill="var(--muted-foreground)">{d.text}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function StackedArea({
  points,
  baseline,
  label,
}: {
  points: { x: number; total: number; contributed: number }[];
  baseline: { x: number; total: number }[];
  label: string;
}) {
  const W = 760, H = 300, L = 56, R = 16, T = 14, B = 30;
  const N = points.at(-1)?.x ?? 1;
  const all = [...points.flatMap((p) => [p.total, p.contributed]), ...baseline.map((p) => p.total)];
  const ticks = niceTicks(Math.min(0, ...all), Math.max(...all));
  const y0 = ticks[0], y1 = ticks[ticks.length - 1];
  const X = (x: number) => L + (x / (N || 1)) * (W - L - R);
  const Y = (v: number) => T + (1 - (v - y0) / (y1 - y0 || 1)) * (H - T - B);
  const pt = (x: number, y: number) => `${X(x).toFixed(1)} ${Y(y).toFixed(1)}`;
  const area = (up: [number, number][], down: [number, number][]) =>
    "M" + up.map((p) => pt(p[0], p[1])).join(" L") + " L" + [...down].reverse().map((p) => pt(p[0], p[1])).join(" L") + " Z";
  const top = points.map((p) => [p.x, Math.max(p.total, p.contributed)] as [number, number]);
  const mid = points.map((p) => [p.x, p.contributed] as [number, number]);
  const floor = points.map((p) => [p.x, Math.min(0, p.contributed)] as [number, number]);
  const years = N / 12;
  const stepY = years <= 5 ? 1 : years <= 15 ? 3 : 5;
  const yearMarks: number[] = [];
  for (let y = 0; y <= years; y += stepY) yearMarks.push(y);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="block h-auto w-full font-mono text-[11px]">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={L} x2={W - R} y1={Y(t)} y2={Y(t)} stroke="var(--muted)" strokeWidth={1} />
          <text x={L - 8} y={Y(t) + 4} textAnchor="end" fill="var(--muted-foreground)">{kfmt(t)}</text>
        </g>
      ))}
      {yearMarks.map((y) => (
        <text key={y} x={X(y * 12)} y={H - 10} textAnchor={y === 0 ? "start" : "middle"} fill="var(--muted-foreground)">
          {y === 0 ? "HOY" : `+${y}a`}
        </text>
      ))}
      <path d={area(top, mid)} fill="var(--primary)" opacity={0.9} />
      <path d={area(mid, floor)} fill="var(--foreground)" opacity={0.85} />
      <path d={"M" + baseline.map((p) => pt(p.x, p.total)).join(" L")} fill="none" stroke="var(--muted-foreground)" strokeWidth={2} strokeDasharray="6 5" />
      <line x1={L} x2={W - R} y1={Y(0)} y2={Y(0)} stroke="var(--foreground)" strokeWidth={2} />
    </svg>
  );
}
