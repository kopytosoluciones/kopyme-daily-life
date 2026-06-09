"use client";

import { useState, useRef, useTransition, useCallback } from "react";
import { createEntry, updateEntry, deleteEntry, restoreLastDeleted } from "./actions";
import { analyzeEmotions, type AnalysisEntry } from "./analyze";
import { X, Trash2, Smile, Pencil, Undo2, Sparkles, Loader2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Entry {
  id: string;
  body: string;
  entry_date: string;
  emoji: string | null;
  mood: number | null;
}

// ─── Mood helpers ─────────────────────────────────────────────────────────────

const MOOD_COLORS = [
  "#FF1493", "#FF3DA6", "#FF6BB5",
  "#C084FC", "#A855F7", "#9D4EDD",
  "#86EFAC", "#4ADE80", "#22C55E", "#39FF14",
];

function moodColor(n: number): string {
  return MOOD_COLORS[Math.max(0, Math.min(9, n - 1))];
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
    <div className="flex items-end gap-4">
      <div
        ref={containerRef}
        className="flex items-end gap-[4px] cursor-pointer select-none"
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
              style={{
                width: 13,
                height: isSelected ? baseH + 6 : baseH,
                backgroundColor: active ? moodColor(n) : "#EBEBEB",
                borderRadius: 4,
                transition: "height 0.1s ease, background-color 0.15s",
                boxShadow: isSelected ? `0 0 10px ${moodColor(n)}60` : undefined,
              }}
            />
          );
        })}
      </div>

      <div className="flex items-center gap-2 min-w-[72px]">
        {value ? (
          <>
            <span className="text-xl leading-none">{moodEmoji(value)}</span>
            <span
              className="font-[family-name:var(--font-mono)] text-sm font-bold transition-colors"
              style={{ color: moodColor(value) }}
            >
              {value}/10
            </span>
          </>
        ) : (
          <span className="font-[family-name:var(--font-mono)] text-xs text-[#C9C9C9]">
            ¿cómo estás?
          </span>
        )}
      </div>

      {value ? (
        <button
          type="button"
          onClick={() => onChange(0)}
          className="text-[#D1D5DB] hover:text-[#9CA3AF] transition-colors"
          title="Quitar"
        >
          <X size={12} />
        </button>
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

  return (
    <>
      <div className="relative inline-flex">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[#F5F5F7] transition-colors"
          title="Elegir emoji"
        >
          {emoji
            ? <span className="text-xl leading-none">{emoji}</span>
            : <Smile size={16} className="text-[#C9C9C9]" />
          }
        </button>
        {emoji && (
          <button
            type="button"
            onClick={onClear}
            className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-[#9CA3AF] hover:bg-[#6B7280] rounded-full flex items-center justify-center transition-colors"
          >
            <X size={7} className="text-white" />
          </button>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <div>
                <p className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#0A0A0A]">
                  ¿cómo te sentís?
                </p>
                <p className="font-[family-name:var(--font-mono)] text-[10px] text-[#C9C9C9] mt-0.5">
                  tocá el emoji que mejor lo represente
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-2 text-[#C9C9C9] hover:text-[#0A0A0A] hover:bg-[#F5F5F5] rounded-xl transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-4 pb-4">
              <div className="flex gap-2">
                <div className="flex flex-col items-center justify-between py-6 shrink-0" style={{ width: 28 }}>
                  <span className="font-[family-name:var(--font-mono)] text-[9px] text-[#9D4EDD] font-medium">alegre</span>
                  <div className="flex-1 flex items-center">
                    <div className="w-px flex-1 bg-gradient-to-b from-[#9D4EDD]/30 to-[#9CA3AF]/20 mx-auto" style={{ height: 200 }} />
                  </div>
                  <span className="font-[family-name:var(--font-mono)] text-[9px] text-[#9CA3AF]">triste</span>
                </div>

                <div className="flex-1 flex flex-col gap-1">
                  <div
                    className="relative rounded-2xl overflow-hidden"
                    style={{ height: 380, background: "linear-gradient(135deg, #F9F5FF 0%, #FFFBF0 35%, #F0FFF4 65%, #FFF0F5 100%)" }}
                  >
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute top-1/2 left-0 right-0 h-px bg-[#E5E7EB]/80" />
                      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-[#E5E7EB]/80" />
                    </div>
                    <span className="absolute top-2.5 left-3 font-[family-name:var(--font-mono)] text-[9px] text-[#9D4EDD]/50 pointer-events-none">calma</span>
                    <span className="absolute top-2.5 right-3 font-[family-name:var(--font-mono)] text-[9px] text-[#F59E0B]/60 pointer-events-none">euforia</span>
                    <span className="absolute bottom-2.5 left-3 font-[family-name:var(--font-mono)] text-[9px] text-[#6B7280]/50 pointer-events-none">tristeza</span>
                    <span className="absolute bottom-2.5 right-3 font-[family-name:var(--font-mono)] text-[9px] text-[#FF1493]/50 pointer-events-none">tensión</span>
                    {EMOTION_EMOJIS.map(([e, energy, happiness]) => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => { onSelect(e); setOpen(false); }}
                        style={{
                          position: "absolute",
                          left: `${energy}%`,
                          top: `${100 - happiness}%`,
                          transform: "translate(-50%, -50%)",
                          fontSize: emoji === e ? 26 : 20,
                          lineHeight: 1,
                          transition: "font-size 0.1s, filter 0.1s",
                          filter: emoji === e ? "drop-shadow(0 0 6px #9D4EDD)" : undefined,
                          zIndex: emoji === e ? 10 : 1,
                        }}
                        className="hover:scale-150 transition-transform duration-100 leading-none p-0.5"
                        title={e}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between px-1">
                    <span className="font-[family-name:var(--font-mono)] text-[9px] text-[#9CA3AF]">poca energía</span>
                    <span className="font-[family-name:var(--font-mono)] text-[9px] text-[#F59E0B]/80">mucha energía</span>
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
    <div className="mt-14">
      {/* Section label */}
      <p className="font-[family-name:var(--font-mono)] text-[11px] text-[#B0B7C3] uppercase tracking-[0.1em] font-medium mb-5">
        {year} — mapa emocional
      </p>

      {/* Legend */}
      <div className="flex items-center gap-2 mb-4">
        <span className="font-[family-name:var(--font-mono)] text-[10px] text-[#C9C9C9]">menos</span>
        {MOOD_COLORS.map((c, i) => (
          <div
            key={i}
            style={{
              width: 12, height: 12,
              backgroundColor: c,
              borderRadius: 3,
              opacity: 0.35 + (i / 9) * 0.65,
            }}
          />
        ))}
        <span className="font-[family-name:var(--font-mono)] text-[10px] text-[#C9C9C9]">más</span>
      </div>

      {/* Month labels */}
      <div className="flex w-full mb-1 pl-5">
        {weeks.map((_, wi) => {
          const lbl = monthLabels.find(m => m.col === wi);
          return (
            <div key={wi} className="flex-1 min-w-0">
              {lbl && (
                <span className="font-[family-name:var(--font-mono)] text-[10px] text-[#9CA3AF] tracking-wide">
                  {lbl.label}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Grid */}
      <div className="flex w-full items-start" style={{ gap: GAP }}>
        {/* Day labels */}
        <div className="flex flex-col shrink-0" style={{ gap: GAP, width: 16 }}>
          {DAYS_ES.map((d, i) => (
            <div
              key={d}
              className="font-[family-name:var(--font-mono)] text-[8px] text-[#C9C9C9] flex items-center justify-end pr-1"
              style={{ aspectRatio: "1", opacity: i % 2 === 0 ? 1 : 0 }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Week columns */}
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col flex-1 min-w-0" style={{ gap: GAP }}>
            {week.map((day, di) => {
              if (!day.inYear) return <div key={di} className="w-full" style={{ aspectRatio: "1" }} />;
              const hasMood = day.avgMood !== null;
              const bg = hasMood ? moodColor(Math.round(day.avgMood!)) : "#F3F4F6";
              const op = hasMood ? 0.35 + (day.avgMood! / 10) * 0.65 : 1;
              const topEmoji = day.dayEntries.find(e => e.emoji)?.emoji ?? null;
              return (
                <div
                  key={di}
                  className="w-full relative overflow-hidden"
                  style={{
                    aspectRatio: "1",
                    backgroundColor: bg,
                    opacity: op,
                    borderRadius: 3,
                    cursor: "crosshair",
                    minWidth: 10,
                    minHeight: 10,
                  }}
                  onMouseEnter={e => {
                    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    setTip({ date: day.date, dayEntries: day.dayEntries, avgMood: day.avgMood, x: r.left, y: r.top });
                  }}
                  onMouseLeave={() => setTip(null)}
                >
                  {topEmoji && (
                    <span
                      className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
                      style={{ fontSize: "9px", lineHeight: 1 }}
                    >
                      {topEmoji}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {tip && (
        <div
          className="fixed z-50 bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-2xl pointer-events-none"
          style={{ left: tip.x + 16, top: Math.max(8, tip.y - 80), maxWidth: 300 }}
        >
          <p className="font-[family-name:var(--font-playfair)] font-bold text-[#0A0A0A] text-sm mb-2">
            {new Date(tip.date + "T00:00:00").toLocaleDateString("es-AR", {
              weekday: "long", day: "numeric", month: "long",
            })}
          </p>
          {tip.dayEntries.length > 0 ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                {tip.dayEntries[0].emoji && (
                  <span className="text-xl leading-none">{tip.dayEntries[0].emoji}</span>
                )}
                {tip.avgMood !== null && (
                  <span
                    className="font-[family-name:var(--font-mono)] text-sm font-bold"
                    style={{ color: moodColor(Math.round(tip.avgMood)) }}
                  >
                    {tip.avgMood}/10
                  </span>
                )}
                {tip.dayEntries.length > 1 && (
                  <span className="font-[family-name:var(--font-mono)] text-[9px] text-[#D1D5DB]">
                    {tip.dayEntries.length} registros
                  </span>
                )}
              </div>
              {tip.dayEntries[0].body && (
                <p className="font-[family-name:var(--font-mono)] text-[11px] text-[#6B7280] leading-relaxed">
                  {tip.dayEntries[0].body.length > 200
                    ? tip.dayEntries[0].body.slice(0, 200) + "…"
                    : tip.dayEntries[0].body}
                </p>
              )}
            </>
          ) : (
            <p className="font-[family-name:var(--font-mono)] text-[10px] text-[#D1D5DB]">sin registro</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Last 14 Days histogram ───────────────────────────────────────────────────

const BAR_H = 60;

function Last14Days({
  entries,
  displayName,
  hasAiKey,
}: {
  entries: Entry[];
  displayName: string;
  hasAiKey: boolean;
}) {
  const [open,     setOpen]     = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [aiError,  setAiError]  = useState<string | null>(null);

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

  const analysisEntries: AnalysisEntry[] = entries
    .filter(e => {
      const d = new Date();
      d.setDate(d.getDate() - 14);
      return new Date(e.entry_date + "T00:00:00") >= d;
    })
    .map(e => ({ date: e.entry_date, mood: e.mood, emoji: e.emoji, body: e.body }));

  async function handleAnalyze() {
    setOpen(true);
    if (analysis) return;
    setLoading(true);
    setAiError(null);
    const result = await analyzeEmotions(analysisEntries, displayName);
    setLoading(false);
    if (result.error) setAiError(result.error);
    else setAnalysis(result.analysis);
  }

  return (
    <>
      <div className="mt-12">
        {/* Section label */}
        <p className="font-[family-name:var(--font-mono)] text-[11px] text-[#B0B7C3] uppercase tracking-[0.1em] font-medium mb-5">
          últimos 14 días
        </p>

        <div className="flex items-end gap-8">
          {/* Histogram */}
          <div className="flex-1 min-w-0">
            <div className="flex items-end gap-[4px]" style={{ height: BAR_H + 32 }}>
              {days.map(({ date, avgMood, emoji }) => {
                const barH    = avgMood !== null ? Math.max(6, (avgMood / 10) * BAR_H) : 5;
                const color   = avgMood !== null ? moodColor(Math.round(avgMood)) : "#EBEBEB";
                const isToday = date === todayStr();
                const d       = new Date(date + "T00:00:00");
                const dayName = DAYS_SHORT[d.getDay()];
                const dayNum  = d.getDate();
                return (
                  <div key={date} className="flex-1 flex flex-col items-center gap-1.5 group/bar">
                    {/* emoji on hover */}
                    <div className="h-5 flex items-end justify-center">
                      {emoji && (
                        <span className="text-[10px] leading-none opacity-0 group-hover/bar:opacity-100 transition-opacity duration-150">
                          {emoji}
                        </span>
                      )}
                    </div>
                    {/* bar */}
                    <div
                      className="w-full transition-all duration-300"
                      style={{
                        height: barH,
                        backgroundColor: color,
                        borderRadius: 6,
                        opacity: avgMood !== null ? 0.45 + (avgMood / 10) * 0.55 : 1,
                        outline: isToday ? `2px solid #9D4EDD` : undefined,
                        outlineOffset: 2,
                      }}
                    />
                    {/* date label */}
                    <div className="flex flex-col items-center" style={{ lineHeight: 1 }}>
                      <span
                        className="font-[family-name:var(--font-mono)] text-[7px] leading-none"
                        style={{ color: isToday ? "#9D4EDD" : "#C9C9C9" }}
                      >
                        {isToday ? "hoy" : dayName}
                      </span>
                      {!isToday && (
                        <span className="font-[family-name:var(--font-mono)] text-[8px] leading-none mt-0.5" style={{ color: "#B0B7C3" }}>
                          {dayNum}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Análisis button */}
          {hasAiKey ? (
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={analysisEntries.length === 0}
              className="shrink-0 flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#0A0A0A] text-white text-[12px] font-medium font-[family-name:var(--font-mono)] shadow-lg shadow-black/10 hover:bg-[#9D4EDD] hover:shadow-xl hover:shadow-[#9D4EDD]/25 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-[#0A0A0A] disabled:hover:shadow-lg mb-6"
            >
              <Sparkles size={13} />
              Análisis Emocional
            </button>
          ) : (
            <div className="shrink-0 flex flex-col items-center gap-1.5 mb-6">
              <div className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB] text-[#C9C9C9] text-[12px] font-medium font-[family-name:var(--font-mono)] cursor-not-allowed select-none">
                <Sparkles size={13} />
                Análisis Emocional
              </div>
              <span className="font-[family-name:var(--font-mono)] text-[9px] text-[#D1D5DB] tracking-wide">
                próximamente
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Analysis modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-sm p-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-7 pt-6 pb-4 border-b border-[#F5F5F5]">
              <div className="flex items-center gap-2.5">
                <Sparkles size={15} className="text-[#9D4EDD]" />
                <p className="font-[family-name:var(--font-playfair)] font-bold text-[#0A0A0A]">
                  Análisis Emocional
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-[family-name:var(--font-mono)] text-[9px] text-[#D1D5DB]">
                  últimos 14 días
                </span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="p-1.5 text-[#C9C9C9] hover:text-[#0A0A0A] hover:bg-[#F5F5F5] rounded-lg transition-colors"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            <div className="px-7 py-6 max-h-[60vh] overflow-y-auto">
              {loading ? (
                <div className="flex flex-col items-center gap-3 py-10">
                  <Loader2 size={22} className="text-[#9D4EDD] animate-spin" />
                  <span className="font-[family-name:var(--font-mono)] text-xs text-[#9CA3AF]">
                    analizando los últimos 14 días…
                  </span>
                </div>
              ) : aiError ? (
                <p className="font-[family-name:var(--font-mono)] text-sm text-[#FF1493]">{aiError}</p>
              ) : analysis ? (
                <p className="text-[#374151] text-[15px] leading-relaxed whitespace-pre-wrap">
                  {analysis}
                </p>
              ) : null}
            </div>

            {!loading && analysis && (
              <div className="px-7 pb-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setAnalysis(null);
                    setLoading(true);
                    analyzeEmotions(analysisEntries, displayName).then(r => {
                      setLoading(false);
                      if (r.error) setAiError(r.error);
                      else setAnalysis(r.analysis);
                    });
                  }}
                  className="font-[family-name:var(--font-mono)] text-[10px] text-[#9CA3AF] hover:text-[#9D4EDD] transition-colors"
                >
                  regenerar análisis
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
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
    <div className="space-y-0">
      {/* Top row: label + date */}
      <div className="flex items-center justify-between mb-4">
        {isEdit ? (
          <span className="font-[family-name:var(--font-playfair)] text-sm font-bold text-[#0A0A0A]">
            Editar registro
          </span>
        ) : (
          <span className="font-[family-name:var(--font-mono)] text-[11px] text-[#B0B7C3] uppercase tracking-[0.1em] font-medium">
            nueva entrada
          </span>
        )}
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="font-[family-name:var(--font-mono)] text-[11px] text-[#9CA3AF] bg-transparent focus:outline-none focus:text-[#0A0A0A] cursor-pointer transition-colors"
        />
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={body}
        onChange={e => { setBody(e.target.value); autoResize(); }}
        placeholder="¿Qué siento hoy?"
        rows={isEdit ? 4 : 5}
        autoFocus={!isEdit}
        className="w-full bg-transparent resize-none text-[#0A0A0A] text-[17px] leading-loose placeholder:text-[#D8DCE4] focus:outline-none"
      />

      {/* Mood + emoji */}
      <div className="mt-4 pt-4 border-t border-[#F0F0F2] flex items-center justify-between gap-4">
        <MoodMeter value={mood} onChange={v => setMood(v === 0 ? null : v)} />
        <EmotionPicker
          emoji={emoji}
          onSelect={setEmoji}
          onClear={() => setEmoji(null)}
        />
      </div>

      {/* Actions row */}
      <div className="mt-4 pt-4 border-t border-[#F0F0F2] flex items-center justify-between">
        {isEdit && onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            disabled={isPending}
            className="p-2 text-[#E5E7EB] hover:text-[#FF1493] hover:bg-[#FFF0F5] rounded-xl transition-colors"
            title="Eliminar entrada"
          >
            <Trash2 size={15} />
          </button>
        ) : <div />}

        <div className="flex items-center gap-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-[11px] font-medium rounded-lg font-[family-name:var(--font-mono)] text-[#9CA3AF] hover:text-[#0A0A0A] hover:bg-[#F5F5F5] transition-all"
            >
              cancelar
            </button>
          )}
          <button
            type="button"
            onClick={() => onSave(body, date, emoji, mood)}
            disabled={!canSave}
            title={!canSave ? "Escribí algo para guardar" : undefined}
            className="px-5 py-2 text-[12px] font-medium rounded-xl font-[family-name:var(--font-mono)] bg-[#0A0A0A] text-white hover:bg-[#374151] disabled:opacity-20 disabled:cursor-not-allowed transition-all"
          >
            {isPending ? "guardando…" : isEdit ? "guardar cambios" : "guardar"}
          </button>
        </div>
      </div>

      {saveError && (
        <div className="mt-3 px-4 py-2.5 bg-[#FFF0F5] border border-[#FF1493]/20 rounded-xl">
          <span className="font-[family-name:var(--font-mono)] text-[11px] text-[#FF1493]">
            {saveError}
          </span>
        </div>
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
  const [saved,        setSaved]        = useState(false);
  const [saveError,    setSaveError]    = useState<string | null>(null);
  const [view,         setView]         = useState<"write" | "records">("write");
  const [editing,      setEditing]      = useState<Entry | null>(null);
  const [editError,    setEditError]    = useState<string | null>(null);
  const [restored,     setRestored]     = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [isPending,    startTransition] = useTransition();

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
    <div className="min-h-screen bg-white">
      <div className="px-8 py-12 max-w-screen-xl mx-auto">

        {/* ── Header ── */}
        <div className="mb-10 flex items-start justify-between">
          <div>
            {view === "records" && (
              <button
                type="button"
                onClick={() => setView("write")}
                className="flex items-center gap-1.5 font-[family-name:var(--font-mono)] text-[11px] text-[#9CA3AF] hover:text-[#0A0A0A] transition-colors mb-3"
              >
                ← volver al diario
              </button>
            )}
            <h1 className="font-[family-name:var(--font-playfair)] text-[32px] font-bold text-[#0A0A0A] leading-tight">
              {view === "records" ? "Registros" : "Diario Emocional"}
            </h1>
            <p className="font-[family-name:var(--font-mono)] text-[12px] text-[#B0B7C3] mt-1.5">
              {entries.length} {entries.length === 1 ? "registro" : "registros"}
            </p>
          </div>

          {/* Right side: view toggle + restore */}
          <div className="flex flex-col items-end gap-2 pt-1">
            {view === "write" && (
              <button
                type="button"
                onClick={() => setView("records")}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-[family-name:var(--font-mono)] border border-[#E5E7EB] text-[#374151] hover:border-[#9D4EDD] hover:text-[#9D4EDD] transition-all"
              >
                ver registros →
              </button>
            )}

            {/* Restore — link style, no competition */}
            <button
              type="button"
              onClick={handleRestore}
              disabled={isPending}
              className={`flex items-center gap-1 font-[family-name:var(--font-mono)] text-[10px] transition-colors disabled:opacity-40 ${
                restored
                  ? "text-[#22C55E]"
                  : "text-[#C9C9C9] hover:text-[#9CA3AF]"
              }`}
              title="Recuperar el último registro borrado"
            >
              <Undo2 size={10} />
              {restored ? "recuperado ✓" : "recuperar borrado"}
            </button>

            {restoreError && (
              <span className="font-[family-name:var(--font-mono)] text-[10px] text-[#FF1493]">
                {restoreError}
              </span>
            )}
          </div>
        </div>

        {view === "write" ? (
          <>
            {/* ── Write card ── */}
            <div
              className={`mb-12 bg-white rounded-2xl px-8 pt-7 pb-6 transition-all duration-300 ${
                saved
                  ? "shadow-[0_4px_24px_rgba(57,255,20,0.12)] ring-1 ring-[#39FF14]/30"
                  : "shadow-[0_2px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] focus-within:shadow-[0_4px_24px_rgba(157,78,221,0.10)] focus-within:ring-1 focus-within:ring-[#9D4EDD]/20"
              }`}
            >
              {saved ? (
                <div className="py-14 flex flex-col items-center gap-3">
                  <span className="text-4xl leading-none">✓</span>
                  <span className="font-[family-name:var(--font-mono)] text-sm font-medium text-[#22C55E]">
                    registro guardado
                  </span>
                </div>
              ) : (
                <EntryForm
                  initialDate={todayStr()}
                  onSave={handleSave}
                  isPending={isPending}
                  saveError={saveError}
                />
              )}
            </div>

            {/* ── Year heatmap ── */}
            <YearHeatmap entries={entries} />

            {/* ── Last 14 days + Análisis ── */}
            <Last14Days entries={entries} displayName={displayName} hasAiKey={hasAiKey} />
          </>
        ) : (
          /* ── Records view ── */
          <div>
            {entries.length === 0 ? (
              <div className="py-24 text-center">
                <p className="font-[family-name:var(--font-mono)] text-sm text-[#D1D5DB]">
                  Todavía no escribiste nada.
                </p>
                <p className="font-[family-name:var(--font-mono)] text-xs text-[#E5E7EB] mt-1.5">
                  El primer paso es el más importante.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {entries.map(entry => (
                  <div
                    key={entry.id}
                    className="bg-white rounded-2xl px-7 py-6 shadow-[0_1px_8px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-shadow duration-200"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3 flex-wrap">
                        {entry.emoji && (
                          <span className="text-2xl leading-none">{entry.emoji}</span>
                        )}
                        <div>
                          <p className="font-[family-name:var(--font-playfair)] font-bold text-[#0A0A0A] text-base">
                            {formatDate(entry.entry_date)}
                          </p>
                          <p className="font-[family-name:var(--font-mono)] text-[10px] text-[#B0B7C3] mt-0.5">
                            {daysAgo(entry.entry_date)}
                          </p>
                        </div>
                        {entry.mood && (
                          <span
                            className="font-[family-name:var(--font-mono)] text-sm font-bold"
                            style={{ color: moodColor(entry.mood) }}
                          >
                            {entry.mood}/10
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditing(entry)}
                          className="p-2 text-[#C9C9C9] hover:text-[#9D4EDD] hover:bg-[#F5F0FF] rounded-xl transition-all"
                          title="Editar"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(entry.id)}
                          className="p-2 text-[#E5E7EB] hover:text-[#FF1493] hover:bg-[#FFF0F5] rounded-xl transition-all"
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {entry.body ? (
                      <p className="text-[#374151] text-[15px] leading-relaxed whitespace-pre-wrap">
                        {entry.body}
                      </p>
                    ) : (
                      <p className="font-[family-name:var(--font-mono)] text-[11px] text-[#D1D5DB] italic">
                        sin anotación
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Edit modal ── */}
      {editing && (
        <div
          className="fixed inset-0 bg-black/15 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          onClick={() => setEditing(null)}
        >
          <div
            className="bg-white rounded-2xl px-8 py-7 max-w-lg w-full shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <EntryForm
              key={editing.id}
              initialBody={editing.body}
              initialDate={editing.entry_date}
              initialEmoji={editing.emoji}
              initialMood={editing.mood}
              onSave={handleEditSave}
              onDelete={() => handleDelete(editing.id)}
              onClose={() => setEditing(null)}
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
