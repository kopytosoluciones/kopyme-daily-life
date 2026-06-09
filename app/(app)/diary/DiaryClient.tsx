"use client";

import { useState, useRef, useTransition, useEffect, useCallback } from "react";
import { createEntry, updateEntry, deleteEntry, restoreLastDeleted } from "./actions";
import { X, Trash2, Smile, Pencil, Undo2 } from "lucide-react";

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
  "#FF1493", "#FF3DA6", "#FF6BB5", // 1–3 pink
  "#C084FC", "#A855F7", "#9D4EDD", // 4–6 violet
  "#86EFAC", "#4ADE80", "#22C55E", "#39FF14", // 7–10 green
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

function shortDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("es-AR", {
    day: "numeric", month: "short",
  });
}

function todayStr(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" });
}

// ─── Emotion map: [emoji, energy 0-100, happiness 0-100] ─────────────────────
// X = energía (0 = poca, 100 = mucha)
// Y = alegría  (0 = triste, 100 = muy alegre) → arriba en el canvas = más alegre

const EMOTION_EMOJIS: [string, number, number][] = [
  // ── Alto energía + Alta alegría: Eufórico / Emocionado ──
  ["🎉", 92, 96], ["🥳", 95, 92], ["🤣", 86, 94], ["😂", 80, 90],
  ["🤩", 88, 93], ["😄", 83, 91], ["😁", 79, 88], ["🎊", 91, 88],
  ["🚀", 96, 81], ["💥", 93, 74], ["⚡", 97, 69], ["🔥", 95, 67],
  ["✨", 74, 87], ["🌟", 70, 90], ["🌞", 67, 85], ["⭐", 63, 83],
  ["💃", 84, 87], ["🕺", 87, 83], ["🤑", 75, 79], ["🤪", 84, 76],
  ["😜", 77, 79], ["🥂", 79, 87], ["🏆", 78, 84], ["💯", 82, 80],
  ["🎯", 80, 77], ["🎸", 85, 74], ["🎆", 90, 85],

  // ── Energía media-alta + Alta alegría: Feliz / Contento ──
  ["😍", 62, 93], ["🥰", 44, 93], ["😊", 50, 89], ["😎", 60, 84],
  ["🤗", 54, 87], ["🥹", 46, 86], ["😋", 63, 82], ["🤭", 42, 62],
  ["😚", 38, 87], ["😇", 55, 90],

  // ── Corazones ──
  ["❤️", 52, 91], ["🧡", 56, 87], ["💛", 51, 85], ["💚", 47, 83],
  ["💙", 44, 81], ["💜", 47, 84], ["🤍", 32, 80], ["🖤", 28, 62],
  ["🫶", 49, 88], ["💝", 55, 91], ["💕", 59, 89], ["💔", 23, 11],

  // ── Baja energía + Alta alegría: Calma / Paz / Tranquilidad ──
  ["🧘", 5, 93], ["😌", 16, 89], ["😴", 3, 79], ["💤", 4, 75],
  ["🌙", 8, 84], ["🍀", 12, 86], ["🌸", 16, 83], ["🌿", 10, 81],
  ["🌺", 19, 81], ["🫂", 22, 84], ["🕊️", 13, 88], ["🙏", 24, 79],
  ["🌱", 18, 77], ["🌻", 30, 81], ["🦋", 33, 83], ["🌷", 20, 79],
  ["🍃", 12, 78], ["☕", 20, 72], ["📖", 15, 70], ["🌅", 26, 76],

  // ── Centro: Neutral / Mixto ──
  ["🤔", 51, 53], ["😐", 40, 51], ["🤷", 46, 49], ["💭", 35, 57],
  ["🧐", 57, 53], ["🤫", 30, 57], ["😶", 34, 46], ["😑", 27, 43],
  ["🫥", 20, 47], ["💡", 54, 64], ["📚", 27, 66], ["🎵", 61, 77],
  ["💎", 52, 73], ["☁️", 18, 64], ["🌊", 42, 68], ["😏", 60, 60],

  // ── Baja-media energía + Poca alegría: Incómodo / Cansado ──
  ["😒", 46, 23], ["🙄", 53, 23], ["🥴", 59, 36], ["😓", 37, 26],
  ["😪", 27, 30], ["🫠", 23, 36], ["🥶", 30, 29], ["🥵", 76, 32],
  ["😵‍💫", 73, 27], ["🤢", 56, 10], ["😵", 68, 22],

  // ── Baja energía + Baja alegría: Tristeza / Depresión ──
  ["😢", 18, 8], ["😭", 26, 5], ["😔", 14, 16], ["😞", 17, 13],
  ["😟", 31, 19], ["🥺", 25, 22], ["🙁", 21, 21], ["🌧️", 14, 13],
  ["😕", 36, 29], ["😶‍🌫️", 19, 41], ["💧", 22, 17], ["🫖", 12, 55],

  // ── Alta energía + Baja alegría: Enojo / Ansiedad / Estrés ──
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
        className="flex items-end gap-[3px] cursor-pointer select-none"
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
          const baseH = 12 + i * 2.2;
          return (
            <div
              key={n}
              style={{
                width: 14, height: isSelected ? baseH + 5 : baseH,
                backgroundColor: active ? moodColor(n) : "#E5E7EB",
                borderRadius: 3,
                transition: "height 0.1s, background-color 0.15s",
                boxShadow: isSelected ? `0 0 8px ${moodColor(n)}80` : undefined,
              }}
            />
          );
        })}
      </div>

      <div className="flex items-center gap-2 min-w-[64px]">
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
          <span className="font-[family-name:var(--font-mono)] text-xs text-[#D1D5DB]">
            ¿cómo estás?
          </span>
        )}
      </div>

      {value && (
        <button
          type="button"
          onClick={() => onChange(0)}
          className="text-[#D1D5DB] hover:text-[#9CA3AF] transition-colors"
          title="Quitar"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}

// ─── Emotion Picker (2D canvas) ───────────────────────────────────────────────

function EmotionPicker({
  emoji,
  onSelect,
  onClear,
}: {
  emoji: string | null;
  onSelect: (e: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Trigger */}
      <div className="relative inline-flex">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[#EFEFEF] transition-colors"
          title="Elegir emoji"
        >
          {emoji
            ? <span className="text-lg leading-none">{emoji}</span>
            : <Smile size={15} className="text-[#C9C9C9]" />
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

      {/* Full overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
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

            {/* 2D canvas */}
            <div className="px-4 pb-4">
              <div className="flex gap-2">
                {/* Y-axis label */}
                <div className="flex flex-col items-center justify-between py-6 shrink-0" style={{ width: 28 }}>
                  <span className="font-[family-name:var(--font-mono)] text-[9px] text-[#9D4EDD] font-medium">alegre</span>
                  <div className="flex-1 flex items-center">
                    <div className="w-px flex-1 bg-gradient-to-b from-[#9D4EDD]/30 to-[#9CA3AF]/20 mx-auto" style={{ height: 200 }} />
                  </div>
                  <span className="font-[family-name:var(--font-mono)] text-[9px] text-[#9CA3AF]">triste</span>
                </div>

                <div className="flex-1 flex flex-col gap-1">
                  {/* Plot area */}
                  <div
                    className="relative rounded-2xl overflow-hidden"
                    style={{ height: 380, background: "linear-gradient(135deg, #F9F5FF 0%, #FFFBF0 35%, #F0FFF4 65%, #FFF0F5 100%)" }}
                  >
                    {/* Subtle center lines */}
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute top-1/2 left-0 right-0 h-px bg-[#E5E7EB]/80" />
                      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-[#E5E7EB]/80" />
                    </div>

                    {/* Corner labels */}
                    <span className="absolute top-2.5 left-3 font-[family-name:var(--font-mono)] text-[9px] text-[#9D4EDD]/50 pointer-events-none">calma</span>
                    <span className="absolute top-2.5 right-3 font-[family-name:var(--font-mono)] text-[9px] text-[#F59E0B]/60 pointer-events-none">euforia</span>
                    <span className="absolute bottom-2.5 left-3 font-[family-name:var(--font-mono)] text-[9px] text-[#6B7280]/50 pointer-events-none">tristeza</span>
                    <span className="absolute bottom-2.5 right-3 font-[family-name:var(--font-mono)] text-[9px] text-[#FF1493]/50 pointer-events-none">tensión</span>

                    {/* Emojis */}
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

                  {/* X-axis label */}
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
const GAP  = 2;

interface HeatDay {
  date: string;
  inYear: boolean;
  dayEntries: Entry[];
  avgMood: number | null;
}

function buildYearGrid(entries: Entry[], year: number): HeatDay[][] {
  // Group entries by date and compute average mood
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
  const year = new Date().getFullYear();
  const [tip, setTip] = useState<{ date: string; dayEntries: Entry[]; avgMood: number | null; x: number; y: number } | null>(null);
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
    <div className="mt-10">
      <p className="font-[family-name:var(--font-mono)] text-[9px] text-[#D1D5DB] uppercase tracking-widest mb-3">
        {year} — mapa emocional
      </p>

      <div className="flex items-center gap-1.5 mb-3">
        <span className="font-[family-name:var(--font-mono)] text-[8px] text-[#D1D5DB]">menos</span>
        {MOOD_COLORS.map((c, i) => (
          <div key={i} style={{ width: 10, height: 10, backgroundColor: c, borderRadius: 2, opacity: 0.5 + (i / 9) * 0.5 }} />
        ))}
        <span className="font-[family-name:var(--font-mono)] text-[8px] text-[#D1D5DB]">más</span>
      </div>

      {/* Month labels row */}
      <div className="flex w-full mb-0.5 pl-4">
        {weeks.map((_, wi) => {
          const lbl = monthLabels.find(m => m.col === wi);
          return (
            <div key={wi} className="flex-1 min-w-0">
              {lbl && (
                <span className="font-[family-name:var(--font-mono)] text-[8px] text-[#9CA3AF]">
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
        <div className="flex flex-col shrink-0" style={{ gap: GAP, width: 14 }}>
          {DAYS_ES.map((d, i) => (
            <div
              key={d}
              className="font-[family-name:var(--font-mono)] text-[7px] text-[#D1D5DB] flex items-center justify-end pr-1"
              style={{ aspectRatio: "1", opacity: i % 2 === 0 ? 1 : 0 }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Week columns — flex-1 so they fill the full width */}
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
                  style={{ aspectRatio: "1", backgroundColor: bg, opacity: op, borderRadius: 2, cursor: "crosshair" }}
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

      {tip && (
        <div
          className="fixed z-50 bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-2xl pointer-events-none"
          style={{ left: tip.x + 16, top: Math.max(8, tip.y - 80), maxWidth: 300 }}
        >
          <p className="font-[family-name:var(--font-playfair)] font-bold text-[#0A0A0A] text-sm mb-2">
            {formatDate(tip.date)}
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

// ─── Entry Form (shared between new + edit) ────────────────────────────────────

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
  const [body, setBody]   = useState(initialBody);
  const [date, setDate]   = useState(initialDate);
  const [emoji, setEmoji] = useState<string | null>(initialEmoji);
  const [mood, setMood]   = useState<number | null>(initialMood);
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
      <div className="flex items-center justify-between mb-3">
        {isEdit ? (
          <span className="font-[family-name:var(--font-playfair)] text-sm font-bold text-[#0A0A0A]">
            Editar registro
          </span>
        ) : (
          <span className="font-[family-name:var(--font-mono)] text-[10px] text-[#C9C9C9] uppercase tracking-widest">
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
        rows={isEdit ? 5 : 7}
        autoFocus={!isEdit}
        className="w-full bg-transparent resize-none text-[#0A0A0A] text-[16px] leading-loose placeholder:text-[#D1D5DB] focus:outline-none"
      />

      {/* Mood meter + emoji en la misma fila */}
      <div className="mt-3 pt-3 border-t border-[#EFEFEF] flex items-center justify-between gap-4">
        <MoodMeter value={mood} onChange={v => setMood(v === 0 ? null : v)} />
        <EmotionPicker
          emoji={emoji}
          onSelect={setEmoji}
          onClear={() => setEmoji(null)}
        />
      </div>

      {/* Bottom: delete (edit) a la izq, cancel+save a la der */}
      <div className="mt-3 pt-3 border-t border-[#EFEFEF] flex items-center justify-between">
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
            className="px-4 py-1.5 text-[11px] font-medium rounded-lg font-[family-name:var(--font-mono)] bg-[#0A0A0A] text-white hover:bg-[#374151] disabled:opacity-25 transition-all"
          >
            {isPending ? "guardando…" : isEdit ? "guardar cambios" : "guardar"}
          </button>
        </div>
      </div>

      {/* Error */}
      {saveError && (
        <div className="mt-2 px-3 py-2 bg-[#FFF0F5] border border-[#FF1493]/20 rounded-xl">
          <span className="font-[family-name:var(--font-mono)] text-[11px] text-[#FF1493]">
            {saveError}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DiaryClient({ entries }: { entries: Entry[] }) {
  const [saved,        setSaved]        = useState(false);
  const [saveError,    setSaveError]    = useState<string | null>(null);
  const [view,         setView]         = useState<"write" | "records">("write");
  const [editing,      setEditing]      = useState<Entry | null>(null);
  const [editError,    setEditError]    = useState<string | null>(null);
  const [restored,     setRestored]     = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [isPending,    startTransition] = useTransition();

  // ── New entry save ──
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

  // ── Edit save ──
  function handleEditSave(body: string, date: string, emoji: string | null, mood: number | null) {
    if (!editing) return;
    setEditError(null);
    startTransition(async () => {
      const result = await updateEntry(editing.id, body, date, emoji, mood);
      if (result.error) {
        setEditError(result.error);
      } else {
        setEditing(null);
      }
    });
  }

  // ── Delete ──
  function handleDelete(id: string) {
    setEditing(null);
    startTransition(async () => { await deleteEntry(id); });
  }

  // ── Restore last deleted ──
  function handleRestore() {
    setRestoreError(null);
    startTransition(async () => {
      const result = await restoreLastDeleted();
      if (result.error) {
        setRestoreError(result.error);
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
      <div className="px-8 py-10 max-w-screen-xl mx-auto">

        {/* ── Header ── */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            {view === "records" && (
              <button
                type="button"
                onClick={() => setView("write")}
                className="flex items-center gap-1.5 font-[family-name:var(--font-mono)] text-xs text-[#9CA3AF] hover:text-[#0A0A0A] transition-colors mb-3"
              >
                ← volver al diario
              </button>
            )}
            <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[#0A0A0A]">
              {view === "records" ? "Registros" : "Diario Emocional"}
            </h1>
            <p className="font-[family-name:var(--font-mono)] text-xs text-[#9CA3AF] mt-1">
              {entries.length} {entries.length === 1 ? "registro" : "registros"}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            {view === "write" && (
              <button
                type="button"
                onClick={() => setView("records")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-[family-name:var(--font-mono)] border border-[#E5E7EB] text-[#374151] hover:border-[#9D4EDD] hover:text-[#9D4EDD] transition-all"
              >
                ver registros →
              </button>
            )}
            <button
              type="button"
              onClick={handleRestore}
              disabled={isPending}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-[family-name:var(--font-mono)] transition-all ${
                restored
                  ? "bg-[#39FF14]/10 text-[#22C55E] border border-[#39FF14]/30"
                  : "text-[#9CA3AF] hover:text-[#0A0A0A] hover:bg-[#F5F5F5] border border-transparent"
              } disabled:opacity-40`}
              title="Recuperar el último registro borrado"
            >
              <Undo2 size={12} />
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
            {/* ── Write area ── */}
            <div
              className={`mb-10 bg-[#F9FAFB] rounded-2xl px-6 pt-5 pb-5 transition-all ${
                saved ? "shadow-[0_0_0_2px_#39FF1440]" : "focus-within:shadow-[0_0_0_2px_#9D4EDD22]"
              }`}
            >
              {saved ? (
                <div className="py-12 flex flex-col items-center gap-2">
                  <span className="text-3xl leading-none">✓</span>
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
          </>
        ) : (
          /* ── Records view ── */
          <div>
            {entries.length === 0 ? (
              <div className="py-20 text-center">
                <p className="font-[family-name:var(--font-mono)] text-sm text-[#D1D5DB]">
                  Todavía no escribiste nada.
                </p>
                <p className="font-[family-name:var(--font-mono)] text-xs text-[#E5E7EB] mt-1">
                  El primer paso es el más importante.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {entries.map(entry => (
                  <div
                    key={entry.id}
                    className="border border-[#EFEFEF] rounded-2xl p-6 hover:border-[#E0E0E0] transition-colors"
                  >
                    {/* Entry header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3 flex-wrap">
                        {entry.emoji && (
                          <span className="text-2xl leading-none">{entry.emoji}</span>
                        )}
                        <div>
                          <p className="font-[family-name:var(--font-playfair)] font-bold text-[#0A0A0A] text-base">
                            {formatDate(entry.entry_date)}
                          </p>
                          <p className="font-[family-name:var(--font-mono)] text-[10px] text-[#9CA3AF]">
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

                    {/* Full body text */}
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
            className="bg-white rounded-2xl p-7 max-w-lg w-full shadow-2xl"
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
