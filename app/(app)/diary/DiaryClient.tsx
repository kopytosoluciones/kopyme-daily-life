"use client";

import { useState, useRef, useTransition, useCallback, useEffect } from "react";
import { createEntry, updateEntry, deleteEntry, restoreLastDeleted } from "./actions";
import { analyzeEmotions, type AnalysisEntry } from "./analyze";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Entry {
  id: string;
  body: string;
  entry_date: string;
  emoji: string | null;
  mood: number | null;
}

// ─── Mood helpers ─────────────────────────────────────────────────────────────

// Escala divergente con tokens v2: 1–3 tensión (destructive), 4–6 neutro, 7–10 bien (success).
function moodColor(n: number): string {
  const v = Math.max(1, Math.min(10, Math.round(n)));
  if (v <= 3) return `color-mix(in srgb, var(--destructive) ${100 - (v - 1) * 20}%, var(--card))`;
  if (v <= 6) return `color-mix(in srgb, var(--muted-foreground) ${40 + (v - 4) * 15}%, var(--card))`;
  return `color-mix(in srgb, var(--success) ${55 + (v - 7) * 15}%, var(--card))`;
}

function moodTextClass(n: number): string {
  if (n <= 3) return "text-destructive";
  if (n <= 6) return "text-muted-foreground";
  return "text-pos";
}

function moodEmoji(n: number | null): string {
  if (!n) return "–";
  if (n <= 2) return "😢";
  if (n <= 4) return "😕";
  if (n <= 6) return "😐";
  if (n <= 8) return "🙂";
  return "😊";
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function daysAgo(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "hoy";
  if (diff === 1) return "ayer";
  if (diff < 7) return `hace ${diff}d`;
  if (diff < 30) return `hace ${Math.round(diff / 7)}s`;
  return `hace ${Math.round(diff / 30)}m`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("es-AR", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function todayStr(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" });
}

const DAYS_SHORT = ["do", "lu", "ma", "mi", "ju", "vi", "sá"];

const LABEL = "font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase";
const BTN = "border-2 border-foreground bg-card px-3.5 py-2 font-mono text-xs tracking-[0.06em] uppercase shadow-hard transition-transform duration-100 hover:-translate-x-px hover:-translate-y-px active:translate-x-1 active:translate-y-1 active:shadow-none disabled:pointer-events-none disabled:opacity-40";
const BTN_PRIMARY = "border-2 border-foreground bg-primary px-4 py-2 font-mono text-xs tracking-[0.06em] text-primary-foreground uppercase shadow-hard-primary transition-transform duration-100 hover:-translate-x-px hover:-translate-y-px active:translate-x-1 active:translate-y-1 active:shadow-none disabled:pointer-events-none disabled:opacity-40";

function useEscape(onEscape: () => void, active = true) {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onEscape();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onEscape, active]);
}

// ─── Emotion map ──────────────────────────────────────────────────────────────

const EMOTION_EMOJIS: [string, number, number][] = [
  ["🎉", 92, 96], ["🥳", 95, 92], ["🤣", 86, 94], ["😂", 80, 90],
  ["🤩", 88, 93], ["😄", 83, 91], ["😁", 79, 88], ["🎊", 91, 88],
  ["🚀", 96, 81], ["💥", 93, 74], ["⚡", 97, 69], ["🔥", 95, 67],
  ["✨", 74, 87], ["🌟", 70, 90], ["🌞", 67, 85], ["⭐", 63, 83],
  ["💃", 84, 87], ["🕺", 87, 83], ["🤑", 75, 79], ["🤪", 84, 76],
  ["😜", 77, 79], ["🥂", 79, 87], ["🏆", 78, 84], ["💯", 82, 80],
  ["🎯", 80, 77], ["🎸", 85, 74], ["🎆", 90, 85],
  ["😍", 62, 93], ["🥰", 44, 93], ["😊", 50, 89], ["😎", 60, 84],
  ["🤗", 54, 87], ["🥹", 46, 86], ["😋", 63, 82], ["🤭", 42, 62],
  ["😚", 38, 87], ["😇", 55, 90],
  ["❤️", 52, 91], ["🧡", 56, 87], ["💛", 51, 85], ["💚", 47, 83],
  ["💙", 44, 81], ["💜", 47, 84], ["🤍", 32, 80], ["🖤", 28, 62],
  ["🫶", 49, 88], ["💝", 55, 91], ["💕", 59, 89], ["💔", 23, 11],
  ["🧘", 5, 93], ["😌", 16, 89], ["😴", 3, 79], ["💤", 4, 75],
  ["🌙", 8, 84], ["🍀", 12, 86], ["🌸", 16, 83], ["🌿", 10, 81],
  ["🌺", 19, 81], ["🫂", 22, 84], ["🕊️", 13, 88], ["🙏", 24, 79],
  ["🌱", 18, 77], ["🌻", 30, 81], ["🦋", 33, 83], ["🌷", 20, 79],
  ["🍃", 12, 78], ["☕", 20, 72], ["📖", 15, 70], ["🌅", 26, 76],
  ["🤔", 51, 53], ["😐", 40, 51], ["🤷", 46, 49], ["💭", 35, 57],
  ["🧐", 57, 53], ["🤫", 30, 57], ["😶", 34, 46], ["😑", 27, 43],
  ["🫥", 20, 47], ["💡", 54, 64], ["📚", 27, 66], ["🎵", 61, 77],
  ["💎", 52, 73], ["☁️", 18, 64], ["🌊", 42, 68], ["😏", 60, 60],
  ["😒", 46, 23], ["🙄", 53, 23], ["🥴", 59, 36], ["😓", 37, 26],
  ["😪", 27, 30], ["🫠", 23, 36], ["🥶", 30, 29], ["🥵", 76, 32],
  ["😵‍💫", 73, 27], ["🤢", 56, 10], ["😵", 68, 22],
  ["😢", 18, 8], ["😭", 26, 5], ["😔", 14, 16], ["😞", 17, 13],
  ["😟", 31, 19], ["🥺", 25, 22], ["🙁", 21, 21], ["🌧️", 14, 13],
  ["😕", 36, 29], ["😶‍🌫️", 19, 41], ["💧", 22, 17], ["🫖", 12, 55],
  ["😡", 91, 6], ["🤬", 97, 3], ["😤", 86, 15], ["😱", 93, 9],
  ["😨", 81, 13], ["😰", 79, 19], ["🤯", 91, 23], ["🫨", 89, 15],
  ["😬", 81, 29], ["💢", 90, 19], ["😖", 66, 16], ["😣", 69, 19],
  ["😫", 74, 19], ["😩", 71, 21], ["🌪️", 88, 28], ["💣", 85, 10],
];

// ─── Mood Meter ───────────────────────────────────────────────────────────────

function MoodMeter({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const computeFromX = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const { left, width } = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - left) / width));
    onChange(Math.max(1, Math.min(10, Math.round(ratio * 9) + 1)));
  }, [onChange]);

  return (
    <div className="flex items-end gap-3">
      <div
        ref={containerRef}
        role="slider"
        tabIndex={0}
        aria-label="Puntaje del día"
        aria-valuemin={1}
        aria-valuemax={10}
        aria-valuenow={value ?? undefined}
        onKeyDown={e => {
          if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); onChange(Math.min(10, (value ?? 0) + 1)); }
          if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); onChange(Math.max(1, (value ?? 2) - 1)); }
        }}
        className="flex cursor-pointer items-end gap-[3px] select-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        onMouseDown={e => { setDragging(true); computeFromX(e.clientX); }}
        onMouseMove={e => { if (dragging) computeFromX(e.clientX); }}
        onMouseUp={() => setDragging(false)}
        onMouseLeave={() => setDragging(false)}
        onTouchStart={e => { setDragging(true); computeFromX(e.touches[0].clientX); }}
        onTouchMove={e => { computeFromX(e.touches[0].clientX); }}
        onTouchEnd={() => setDragging(false)}
      >
        {Array.from({ length: 10 }, (_, i) => {
          const n = i + 1;
          const active = value !== null && n <= value;
          const isSelected = value === n;
          const baseH = 10 + i * 2.6;
          return (
            <div
              key={n}
              className={isSelected ? "outline-2 outline-offset-1 outline-foreground" : ""}
              style={{
                width: 12,
                height: isSelected ? baseH + 6 : baseH,
                backgroundColor: active ? moodColor(n) : "var(--muted)",
                transition: "height 0.1s ease, background-color 0.12s",
              }}
            />
          );
        })}
      </div>

      {value ? (
        <div className="flex items-center gap-1.5">
          <span className="text-base leading-none">{moodEmoji(value)}</span>
          <span className={`font-mono text-xs font-bold tabular ${moodTextClass(value)}`}>{value}/10</span>
          <button
            type="button"
            onClick={() => onChange(0)}
            aria-label="Quitar puntaje"
            className="ml-0.5 font-mono text-[10px] text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>
      ) : null}
    </div>
  );
}

// ─── Emotion Picker ───────────────────────────────────────────────────────────

function EmotionPicker({
  emoji, onSelect, onClear,
}: {
  emoji: string | null;
  onSelect: (e: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  useEscape(close, open);

  return (
    <>
      <div className="relative inline-flex">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={emoji ? `Emoji elegido ${emoji}. Cambiar` : "Elegir emoji"}
          className="flex size-9 items-center justify-center border-2 border-dashed border-muted-foreground hover:border-foreground"
        >
          {emoji
            ? <span className="text-xl leading-none">{emoji}</span>
            : <span aria-hidden className="font-mono text-xs text-muted-foreground">:)</span>
          }
        </button>
        {emoji && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Quitar emoji"
            className="absolute -top-2 -right-2 flex size-4 items-center justify-center border border-foreground bg-card font-mono text-[8px] leading-none hover:bg-foreground hover:text-background"
          >
            ✕
          </button>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4"
          onClick={close}
        >
          <div
            role="dialog"
            aria-label="Elegir emoji"
            className="w-full max-w-2xl border-2 border-foreground bg-card shadow-hard-lg"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b-2 border-foreground px-4 py-2.5">
              <div>
                <p className={LABEL}>── ¿Cómo te sentís?</p>
                <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">tocá el emoji que mejor lo represente</p>
              </div>
              <button type="button" onClick={close} aria-label="Cerrar" className="font-mono text-xs text-muted-foreground hover:text-foreground">✕</button>
            </div>

            <div className="p-4">
              <div className="flex gap-2">
                <div className="flex w-7 shrink-0 flex-col items-center justify-between py-6 font-mono text-[9px] text-muted-foreground">
                  <span>alegre</span>
                  <span aria-hidden className="my-2 w-px flex-1 bg-muted-foreground/40" />
                  <span>triste</span>
                </div>

                <div className="flex flex-1 flex-col gap-1">
                  <div className="relative h-[380px] overflow-hidden border-2 border-foreground bg-muted/40">
                    <div aria-hidden className="pointer-events-none absolute inset-0">
                      <div className="absolute top-1/2 right-0 left-0 border-t border-dashed border-muted-foreground/50" />
                      <div className="absolute top-0 bottom-0 left-1/2 border-l border-dashed border-muted-foreground/50" />
                    </div>
                    <span className="pointer-events-none absolute top-2 left-2.5 font-mono text-[9px] text-muted-foreground uppercase">calma</span>
                    <span className="pointer-events-none absolute top-2 right-2.5 font-mono text-[9px] text-muted-foreground uppercase">euforia</span>
                    <span className="pointer-events-none absolute bottom-2 left-2.5 font-mono text-[9px] text-muted-foreground uppercase">tristeza</span>
                    <span className="pointer-events-none absolute right-2.5 bottom-2 font-mono text-[9px] text-muted-foreground uppercase">tensión</span>
                    {EMOTION_EMOJIS.map(([e, energy, happiness]) => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => { onSelect(e); close(); }}
                        style={{
                          position: "absolute",
                          left: `${energy}%`,
                          top: `${100 - happiness}%`,
                          transform: "translate(-50%, -50%)",
                          fontSize: emoji === e ? 26 : 20,
                          lineHeight: 1,
                          zIndex: emoji === e ? 10 : 1,
                        }}
                        className={`p-0.5 leading-none transition-transform duration-100 hover:scale-150 ${emoji === e ? "outline-2 outline-primary" : ""}`}
                        title={e}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between px-1 font-mono text-[9px] text-muted-foreground">
                    <span>poca energía</span>
                    <span>mucha energía →</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Year Heatmap ─────────────────────────────────────────────────────────────

const MONTHS_ES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
const DAYS_ES   = ["L","M","X","J","V","S","D"];
const GAP = 3;

interface HeatDay {
  date: string;
  inYear: boolean;
  dayEntries: Entry[];
  avgMood: number | null;
}

function buildYearGrid(entries: Entry[], year: number): HeatDay[][] {
  const byDate: Record<string, Entry[]> = {};
  entries.forEach(e => {
    if (!e.entry_date.startsWith(`${year}-`)) return;
    if (!byDate[e.entry_date]) byDate[e.entry_date] = [];
    byDate[e.entry_date].push(e);
  });

  function avgMoodForDate(dateStr: string): number | null {
    const group = byDate[dateStr];
    if (!group) return null;
    const withMood = group.filter(e => e.mood !== null);
    if (!withMood.length) return null;
    const avg = withMood.reduce((s, e) => s + e.mood!, 0) / withMood.length;
    return Math.round(avg * 100) / 100;
  }

  const jan1   = new Date(year, 0, 1);
  const dow    = jan1.getDay();
  const offset = dow === 0 ? -6 : 1 - dow;
  const cursor = new Date(jan1);
  cursor.setDate(jan1.getDate() + offset);

  const weeks: HeatDay[][] = [];
  while (true) {
    const week: HeatDay[] = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = cursor.toISOString().split("T")[0];
      week.push({
        date: dateStr,
        inYear: cursor.getFullYear() === year,
        dayEntries: byDate[dateStr] ?? [],
        avgMood: avgMoodForDate(dateStr),
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
    if (cursor.getFullYear() > year) break;
  }
  return weeks;
}

function YearHeatmap({ entries }: { entries: Entry[] }) {
  const year  = new Date().getFullYear();
  const [tip, setTip] = useState<{
    date: string; dayEntries: Entry[]; avgMood: number | null; x: number; y: number;
  } | null>(null);
  const weeks = buildYearGrid(entries, year);

  const monthLabels: { label: string; col: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, wi) => {
    const first = week.find(d => d.inYear);
    if (!first) return;
    const m = new Date(first.date + "T00:00:00").getMonth();
    if (m !== lastMonth) { monthLabels.push({ label: MONTHS_ES[m], col: wi }); lastMonth = m; }
  });

  return (
    <section className="border-2 border-foreground bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-foreground px-4 py-2.5">
        <span className={LABEL}>── {year} · mapa emocional</span>
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
          <span>tensión</span>
          {Array.from({ length: 10 }, (_, i) => (
            <span key={i} aria-hidden className="inline-block size-3" style={{ backgroundColor: moodColor(i + 1) }} />
          ))}
          <span>bien</span>
        </div>
      </div>

      <div className="overflow-x-auto p-4">
        <div className="min-w-[640px]">
          <div className="mb-1 flex w-full pl-5">
            {weeks.map((_, wi) => {
              const lbl = monthLabels.find(m => m.col === wi);
              return (
                <div key={wi} className="min-w-0 flex-1">
                  {lbl && <span className="font-mono text-[10px] text-muted-foreground uppercase">{lbl.label}</span>}
                </div>
              );
            })}
          </div>

          <div className="flex w-full items-start" style={{ gap: GAP }}>
            <div className="flex w-4 shrink-0 flex-col" style={{ gap: GAP }}>
              {DAYS_ES.map((d, i) => (
                <div
                  key={d}
                  className="flex items-center justify-end pr-1 font-mono text-[8px] text-muted-foreground"
                  style={{ aspectRatio: "1", opacity: i % 2 === 0 ? 1 : 0 }}
                >
                  {d}
                </div>
              ))}
            </div>

            {weeks.map((week, wi) => (
              <div key={wi} className="flex min-w-0 flex-1 flex-col" style={{ gap: GAP }}>
                {week.map((day, di) => {
                  if (!day.inYear) return <div key={di} className="w-full" style={{ aspectRatio: "1" }} />;
                  const hasMood = day.avgMood !== null;
                  const topEmoji = day.dayEntries.find(e => e.emoji)?.emoji ?? null;
                  return (
                    <div
                      key={di}
                      className={`relative w-full cursor-crosshair overflow-hidden ${day.date === todayStr() ? "outline-2 outline-primary" : ""}`}
                      style={{
                        aspectRatio: "1",
                        backgroundColor: hasMood ? moodColor(day.avgMood!) : day.dayEntries.length ? "var(--muted-foreground)" : "var(--muted)",
                        minWidth: 8,
                        minHeight: 8,
                      }}
                      onMouseEnter={e => {
                        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        setTip({ date: day.date, dayEntries: day.dayEntries, avgMood: day.avgMood, x: r.left, y: r.top });
                      }}
                      onMouseLeave={() => setTip(null)}
                    >
                      {topEmoji && (
                        <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[9px] leading-none select-none">
                          {topEmoji}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {tip && (
        <div
          className="pointer-events-none fixed z-50 max-w-[300px] border-2 border-foreground bg-card p-3 shadow-hard"
          style={{ left: tip.x + 16, top: Math.max(8, tip.y - 80) }}
        >
          <p className="mb-2 text-sm font-bold">
            {new Date(tip.date + "T00:00:00").toLocaleDateString("es-AR", {
              weekday: "long", day: "numeric", month: "long",
            })}
          </p>
          {tip.dayEntries.length > 0 ? (
            <>
              <div className="mb-2 flex items-center gap-2">
                {tip.dayEntries[0].emoji && <span className="text-xl leading-none">{tip.dayEntries[0].emoji}</span>}
                {tip.avgMood !== null && (
                  <span className={`font-mono text-sm font-bold tabular ${moodTextClass(Math.round(tip.avgMood))}`}>{tip.avgMood}/10</span>
                )}
                {tip.dayEntries.length > 1 && (
                  <span className="font-mono text-[9px] text-muted-foreground">{tip.dayEntries.length} registros</span>
                )}
              </div>
              {tip.dayEntries[0].body && (
                <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
                  {tip.dayEntries[0].body.length > 200 ? tip.dayEntries[0].body.slice(0, 200) + "…" : tip.dayEntries[0].body}
                </p>
              )}
            </>
          ) : (
            <p className="font-mono text-[10px] text-muted-foreground">sin registro</p>
          )}
        </div>
      )}
    </section>
  );
}

// ─── Last 14 Days histogram ───────────────────────────────────────────────────

const BAR_H = 66;

function Last14Days({ entries }: { entries: Entry[] }) {
  const today = todayStr();
  const days: { date: string; avgMood: number | null; emoji: string | null }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr    = d.toLocaleDateString("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" });
    const dayEntries = entries.filter(e => e.entry_date === dateStr);
    const withMood   = dayEntries.filter(e => e.mood !== null);
    const avgMood    = withMood.length
      ? Math.round((withMood.reduce((s, e) => s + e.mood!, 0) / withMood.length) * 100) / 100
      : null;
    const emoji = dayEntries.find(e => e.emoji)?.emoji ?? null;
    days.push({ date: dateStr, avgMood, emoji });
  }

  return (
    <section className="border-2 border-foreground bg-card">
      <div className="border-b-2 border-foreground px-4 py-2.5">
        <span className={LABEL}>── Últimos 14 días</span>
      </div>
      <div className="flex items-end gap-1.5 px-4 pt-2 pb-3 sm:gap-2" style={{ height: BAR_H + 52 }}>
        {days.map(({ date, avgMood, emoji }) => {
          const barH    = avgMood !== null ? Math.max(6, (avgMood / 10) * BAR_H) : 4;
          const isToday = date === today;
          const d       = new Date(date + "T00:00:00");
          return (
            <div key={date} className="group/bar flex flex-1 flex-col items-center gap-1.5">
              <div className="flex h-5 items-end justify-center">
                {emoji && (
                  <span className="text-[10px] leading-none opacity-0 transition-opacity duration-150 group-hover/bar:opacity-100">{emoji}</span>
                )}
              </div>
              <div
                className={`w-full ${isToday ? "outline-2 outline-offset-2 outline-primary" : ""}`}
                title={avgMood !== null ? `${avgMood}/10` : "sin puntaje"}
                style={{ height: barH, backgroundColor: avgMood !== null ? moodColor(avgMood) : "var(--muted)" }}
              />
              <div className="flex flex-col items-center font-mono leading-none">
                <span className={`text-[8px] uppercase ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                  {isToday ? "hoy" : DAYS_SHORT[d.getDay()]}
                </span>
                {!isToday && <span className="mt-0.5 text-[8px] text-muted-foreground tabular">{d.getDate()}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Entry Form ───────────────────────────────────────────────────────────────

function EntryForm({
  initialBody = "",
  initialDate,
  initialEmoji = null,
  initialMood = null,
  onSave,
  onDelete,
  onClose,
  isPending,
  saveError,
  isEdit = false,
}: {
  initialBody?: string;
  initialDate: string;
  initialEmoji?: string | null;
  initialMood?: number | null;
  onSave: (body: string, date: string, emoji: string | null, mood: number | null) => void;
  onDelete?: () => void;
  onClose?: () => void;
  isPending: boolean;
  saveError: string | null;
  isEdit?: boolean;
}) {
  const [body,  setBody]  = useState(initialBody);
  const [date,  setDate]  = useState(initialDate);
  const [emoji, setEmoji] = useState<string | null>(initialEmoji);
  const [mood,  setMood]  = useState<number | null>(initialMood);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function autoResize() {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
  }

  const canSave = !isPending && (!!body.trim() || mood !== null);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className={LABEL}>── {isEdit ? "Editar registro" : "Nueva entrada"}</span>
        <input
          type="date"
          value={date}
          aria-label="Fecha"
          onChange={e => setDate(e.target.value)}
          className="cursor-pointer border-b border-dashed border-muted-foreground bg-transparent font-mono text-[11px] text-muted-foreground outline-none focus:border-solid focus:border-foreground focus:text-foreground"
        />
      </div>

      <textarea
        ref={textareaRef}
        value={body}
        onChange={e => { setBody(e.target.value); autoResize(); }}
        placeholder="¿Qué siento hoy?"
        aria-label="Qué siento hoy"
        rows={isEdit ? 3 : 4}
        autoFocus={!isEdit}
        className="w-full resize-none bg-transparent text-[17px] leading-loose outline-none placeholder:text-muted-foreground/60"
      />

      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-muted pt-3">
        <span className={`${LABEL} shrink-0`}>Puntaje</span>
        <MoodMeter value={mood} onChange={v => setMood(v === 0 ? null : v)} />
        <EmotionPicker emoji={emoji} onSelect={setEmoji} onClear={() => setEmoji(null)} />

        <div className="flex-1" />

        {isEdit && onDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={isPending}
            className="border-2 border-destructive bg-card px-3 py-1.5 font-mono text-xs text-destructive uppercase hover:bg-destructive/10 disabled:opacity-40"
          >
            Borrar
          </button>
        )}
        {onClose && (
          <button type="button" onClick={onClose} className="px-2 py-1.5 font-mono text-[11px] text-muted-foreground uppercase hover:text-foreground">
            cancelar
          </button>
        )}
        <button
          type="button"
          onClick={() => onSave(body, date, emoji, mood)}
          disabled={!canSave}
          title={!canSave ? "Escribí algo para guardar" : undefined}
          className={BTN_PRIMARY}
        >
          {isPending ? "guardando…" : isEdit ? "guardar cambios" : "guardar"}
        </button>
      </div>

      {saveError && (
        <p role="alert" className="mt-3 border-2 border-destructive px-3 py-2 font-mono text-[11px] text-destructive">
          ✗ {saveError}
        </p>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DiaryClient({
  entries,
  displayName,
  hasAiKey,
}: {
  entries: Entry[];
  displayName: string;
  hasAiKey: boolean;
}) {
  const [saved,          setSaved]          = useState(false);
  const [saveError,      setSaveError]      = useState<string | null>(null);
  const [view,           setView]           = useState<"write" | "records">("write");
  const [editing,        setEditing]        = useState<Entry | null>(null);
  const [editError,      setEditError]      = useState<string | null>(null);
  const [restored,       setRestored]       = useState(false);
  const [restoreError,   setRestoreError]   = useState<string | null>(null);
  const [isPending,      startTransition]   = useTransition();
  const [aiOpen,         setAiOpen]         = useState(false);
  const [aiLoading,      setAiLoading]      = useState(false);
  const [aiAnalysis,     setAiAnalysis]     = useState<string | null>(null);
  const [aiError,        setAiError]        = useState<string | null>(null);

  const closeAi = useCallback(() => setAiOpen(false), []);
  const closeEdit = useCallback(() => setEditing(null), []);
  useEscape(closeAi, aiOpen);
  useEscape(closeEdit, !!editing);

  const analysisEntries: AnalysisEntry[] = entries
    .filter(e => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 14);
      return new Date(e.entry_date + "T00:00:00") >= cutoff;
    })
    .map(e => ({ date: e.entry_date, mood: e.mood, emoji: e.emoji, body: e.body }));

  async function handleAnalyze() {
    setAiOpen(true);
    if (aiAnalysis) return;
    setAiLoading(true);
    setAiError(null);
    const result = await analyzeEmotions(analysisEntries, displayName);
    setAiLoading(false);
    if (result.error) setAiError(result.error);
    else setAiAnalysis(result.analysis);
  }

  function handleSave(body: string, date: string, emoji: string | null, mood: number | null) {
    if (!body.trim() && mood === null) return;
    setSaveError(null);
    startTransition(async () => {
      const result = await createEntry(body, date, emoji, mood);
      if (result.error) {
        setSaveError(result.error);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2200);
      }
    });
  }

  function handleEditSave(body: string, date: string, emoji: string | null, mood: number | null) {
    if (!editing) return;
    setEditError(null);
    startTransition(async () => {
      const result = await updateEntry(editing.id, body, date, emoji, mood);
      if (result.error) setEditError(result.error);
      else setEditing(null);
    });
  }

  function handleDelete(id: string) {
    setEditing(null);
    startTransition(async () => { await deleteEntry(id); });
  }

  function handleRestore() {
    setRestoreError(null);
    startTransition(async () => {
      const result = await restoreLastDeleted();
      if (result.error) {
        setRestoreError(result.error);
        setTimeout(() => setRestoreError(null), 3000);
      } else if (result.restored) {
        setRestored(true);
        setTimeout(() => setRestored(false), 2500);
      } else {
        setRestoreError("No hay entradas borradas para recuperar.");
        setTimeout(() => setRestoreError(null), 3000);
      }
    });
  }

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-4 py-7 md:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          {view === "records" && (
            <button
              type="button"
              onClick={() => setView("write")}
              className="mb-3 font-mono text-[11px] text-muted-foreground uppercase hover:text-foreground"
            >
              ← volver al diario
            </button>
          )}
          <h1 className="text-[40px] leading-none font-bold tracking-[-0.02em]">
            {view === "records" ? "Registros" : "Diario"}<span className="k-cursor">_</span>
          </h1>
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            {entries.length} {entries.length === 1 ? "registro" : "registros"}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          {view === "write" && (
            <div className="flex flex-wrap items-center justify-end gap-2.5">
              {hasAiKey ? (
                <button type="button" onClick={handleAnalyze} disabled={analysisEntries.length === 0} className={BTN}>
                  ✦ Análisis emocional
                </button>
              ) : (
                <span title="próximamente" className="border-2 border-dashed border-muted-foreground px-3.5 py-2 font-mono text-xs text-muted-foreground uppercase select-none">
                  ✦ Análisis emocional
                </span>
              )}
              <button type="button" onClick={() => setView("records")} className={BTN}>
                Ver registros →
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleRestore}
            disabled={isPending}
            title="Recuperar el último registro borrado"
            className={`font-mono text-[10px] uppercase disabled:opacity-40 ${restored ? "text-pos" : "text-muted-foreground hover:text-foreground"}`}
          >
            {restored ? "✓ recuperado" : "↶ recuperar borrado"}
          </button>
          {restoreError && <span role="alert" className="font-mono text-[10px] text-destructive">{restoreError}</span>}
        </div>
      </header>

      {view === "write" ? (
        <>
          <section className={`border-2 bg-card px-5 pt-4 pb-4 md:px-7 ${saved ? "border-pos" : "border-foreground focus-within:shadow-hard"}`}>
            {saved ? (
              <div className="flex flex-col items-center gap-3 py-10 font-mono">
                <span aria-hidden className="text-2xl text-pos">[ ✓ ]</span>
                <span className="text-sm text-pos uppercase">registro guardado</span>
              </div>
            ) : (
              <EntryForm initialDate={todayStr()} onSave={handleSave} isPending={isPending} saveError={saveError} />
            )}
          </section>

          <YearHeatmap entries={entries} />
          <Last14Days entries={entries} />
        </>
      ) : entries.length === 0 ? (
        <div className="border-2 border-dashed border-muted-foreground px-6 py-16 text-center font-mono text-xs text-muted-foreground">
          <pre aria-hidden className="mb-3 leading-tight">{"┌──────┐\n│ ___  │\n│ __   │\n└──────┘"}</pre>
          Todavía no escribiste nada. El primer paso es el más importante.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {entries.map(entry => (
            <article key={entry.id} className="group border-2 border-foreground bg-card px-5 py-4 md:px-7 md:py-5">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  {entry.emoji && <span className="text-2xl leading-none">{entry.emoji}</span>}
                  <div>
                    <p className="font-bold">{formatDate(entry.entry_date)}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{daysAgo(entry.entry_date)}</p>
                  </div>
                  {entry.mood && (
                    <span className={`font-mono text-sm font-bold tabular ${moodTextClass(entry.mood)}`}>{entry.mood}/10</span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-3 font-mono text-[10px] uppercase">
                  <button type="button" onClick={() => setEditing(entry)} className="text-muted-foreground hover:text-foreground">
                    editar
                  </button>
                  <button type="button" onClick={() => handleDelete(entry.id)} className="text-muted-foreground hover:text-destructive">
                    borrar
                  </button>
                </div>
              </div>
              {entry.body ? (
                <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{entry.body}</p>
              ) : (
                <p className="font-mono text-[11px] text-muted-foreground italic">sin anotación</p>
              )}
            </article>
          ))}
        </div>
      )}

      {aiOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-6" onClick={closeAi}>
          <div
            role="dialog"
            aria-label="Análisis emocional"
            className="w-full max-w-xl border-2 border-foreground bg-card shadow-hard-lg"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b-2 border-foreground px-4 py-2.5">
              <span className={LABEL}>── ✦ Análisis emocional</span>
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] text-muted-foreground">últimos 14 días</span>
                <button type="button" onClick={closeAi} aria-label="Cerrar" className="font-mono text-xs text-muted-foreground hover:text-foreground">✕</button>
              </div>
            </div>
            <div className="max-h-[60vh] overflow-y-auto px-5 py-5">
              {aiLoading ? (
                <div className="flex flex-col items-center gap-3 py-10 font-mono text-xs text-muted-foreground">
                  <span aria-hidden className="animate-pulse text-primary">[▓▓▓░░░]</span>
                  analizando los últimos 14 días…
                </div>
              ) : aiError ? (
                <p role="alert" className="font-mono text-sm text-destructive">{aiError}</p>
              ) : aiAnalysis ? (
                <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{aiAnalysis}</p>
              ) : null}
            </div>
            {!aiLoading && aiAnalysis && (
              <div className="flex justify-end border-t border-muted px-5 py-3">
                <button
                  type="button"
                  onClick={() => {
                    setAiAnalysis(null);
                    setAiLoading(true);
                    analyzeEmotions(analysisEntries, displayName).then(r => {
                      setAiLoading(false);
                      if (r.error) setAiError(r.error);
                      else setAiAnalysis(r.analysis);
                    });
                  }}
                  className="font-mono text-[10px] text-muted-foreground uppercase hover:text-foreground"
                >
                  ↻ regenerar análisis
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-6" onClick={closeEdit}>
          <div className="w-full max-w-lg border-2 border-foreground bg-card px-6 py-5 shadow-hard-lg" onClick={e => e.stopPropagation()}>
            <EntryForm
              key={editing.id}
              initialBody={editing.body}
              initialDate={editing.entry_date}
              initialEmoji={editing.emoji}
              initialMood={editing.mood}
              onSave={handleEditSave}
              onDelete={() => handleDelete(editing.id)}
              onClose={closeEdit}
              isPending={isPending}
              saveError={editError}
              isEdit
            />
          </div>
        </div>
      )}
    </div>
  );
}
