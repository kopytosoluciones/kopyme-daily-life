"use client";

import { useState, useRef, useTransition, useEffect, useCallback } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Dot,
} from "recharts";
import { createEntry, deleteEntry } from "./actions";
import { X, Trash2, Smile } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Entry {
  id: string;
  content: string;
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
  return new Date().toISOString().split("T")[0];
}

function last14Days(): string[] {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return d.toISOString().split("T")[0];
  });
}

// ─── Emoji palette ────────────────────────────────────────────────────────────

const EMOJIS = [
  "😊", "😢", "😴", "😤", "😰", "🥰",
  "😌", "😔", "😎", "🥺", "🤔", "😮",
  "💪", "❤️", "✨", "🔥", "💡", "🙏",
  "🎉", "🌟", "⚡", "🌈", "🌙", "☀️",
  "🏋️", "📚", "🎵", "🌿", "🌊", "💭",
];

// ─── Mood Meter ───────────────────────────────────────────────────────────────

function MoodMeter({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number) => void;
}) {
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
      {/* Bars */}
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
          const baseH = 12 + i * 2.2; // 12px → 31.8px rising
          return (
            <div
              key={n}
              style={{
                width: 14,
                height: isSelected ? baseH + 5 : baseH,
                backgroundColor: active ? moodColor(n) : "#E5E7EB",
                borderRadius: 3,
                transition: "height 0.1s, background-color 0.15s",
                boxShadow: isSelected ? `0 0 8px ${moodColor(n)}80` : undefined,
              }}
            />
          );
        })}
      </div>

      {/* Feedback */}
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

// ─── Chart tooltip ────────────────────────────────────────────────────────────

interface TooltipProps {
  active?: boolean;
  payload?: { payload: ChartPoint }[];
}

interface ChartPoint {
  date: string;
  mood: number | null;
  content: string;
  emoji: string | null;
  fullDate: string;
}

function ChartTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length || !payload[0].payload.mood) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl p-3 shadow-xl text-left">
      <div className="flex items-center gap-2 mb-1.5">
        {d.emoji && <span className="text-base leading-none">{d.emoji}</span>}
        <p className="font-[family-name:var(--font-playfair)] font-bold text-[#0A0A0A] text-xs">
          {formatDate(d.fullDate)}
        </p>
      </div>
      <p
        className="font-[family-name:var(--font-mono)] text-xs font-bold mb-1"
        style={{ color: moodColor(d.mood!) }}
      >
        {moodEmoji(d.mood)} {d.mood}/10
      </p>
      {d.content && (
        <p className="font-[family-name:var(--font-mono)] text-[10px] text-[#9CA3AF] max-w-[180px] truncate">
          {d.content}
        </p>
      )}
    </div>
  );
}

// ─── Year Heatmap ─────────────────────────────────────────────────────────────

const MONTHS_ES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
const DAYS_ES   = ["L","M","X","J","V","S","D"];
const CELL = 10;
const GAP  = 2;
const STEP = CELL + GAP;

interface HeatDay {
  date: string;
  inYear: boolean;
  entry?: Entry;
}

function buildYearGrid(entries: Entry[], year: number): HeatDay[][] {
  const byDate: Record<string, Entry> = {};
  entries.forEach(e => { if (e.entry_date.startsWith(`${year}-`)) byDate[e.entry_date] = e; });

  // Start from the Monday of the week containing Jan 1
  const jan1   = new Date(year, 0, 1);
  const dow    = jan1.getDay(); // 0=Sun
  const offset = dow === 0 ? -6 : 1 - dow;
  const cursor = new Date(jan1);
  cursor.setDate(jan1.getDate() + offset);

  const weeks: HeatDay[][] = [];
  while (true) {
    const week: HeatDay[] = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = cursor.toISOString().split("T")[0];
      week.push({ date: dateStr, inYear: cursor.getFullYear() === year, entry: byDate[dateStr] });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
    // Stop once we've passed Dec 31
    if (cursor.getFullYear() > year) break;
  }
  return weeks;
}

function YearHeatmap({ entries }: { entries: Entry[] }) {
  const year = new Date().getFullYear();
  const [tip, setTip] = useState<{ date: string; entry?: Entry; x: number; y: number } | null>(null);

  const weeks = buildYearGrid(entries, year);

  // Month label positions
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

      {/* Mood legend */}
      <div className="flex items-center gap-1.5 mb-3">
        <span className="font-[family-name:var(--font-mono)] text-[8px] text-[#D1D5DB]">menos</span>
        {MOOD_COLORS.map((c, i) => (
          <div key={i} style={{ width: CELL, height: CELL, backgroundColor: c, borderRadius: 2, opacity: 0.5 + (i / 9) * 0.5 }} />
        ))}
        <span className="font-[family-name:var(--font-mono)] text-[8px] text-[#D1D5DB]">más</span>
      </div>

      <div className="overflow-x-auto pb-1">
        <div style={{ minWidth: weeks.length * STEP + 20 }}>
          {/* Month labels */}
          <div className="flex mb-0.5 pl-5">
            {weeks.map((_, wi) => {
              const lbl = monthLabels.find(m => m.col === wi);
              return (
                <div key={wi} style={{ width: STEP, flexShrink: 0 }}>
                  {lbl && (
                    <span className="font-[family-name:var(--font-mono)] text-[8px] text-[#9CA3AF]">
                      {lbl.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Grid rows (Mon–Sun) */}
          <div className="flex gap-0">
            {/* Day labels */}
            <div className="flex flex-col mr-1" style={{ gap: GAP }}>
              {DAYS_ES.map((d, i) => (
                <div
                  key={d}
                  className="font-[family-name:var(--font-mono)] text-[7px] text-[#D1D5DB] flex items-center justify-end pr-1"
                  style={{ height: CELL, width: 14, opacity: i % 2 === 0 ? 1 : 0 }}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Week columns */}
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col" style={{ gap: GAP, marginRight: GAP }}>
                {week.map((day, di) => {
                  if (!day.inYear) {
                    return <div key={di} style={{ width: CELL, height: CELL }} />;
                  }
                  const hasMood = day.entry?.mood != null;
                  const bg = hasMood ? moodColor(day.entry!.mood!) : "#F3F4F6";
                  const op = hasMood ? 0.35 + (day.entry!.mood! / 10) * 0.65 : 1;
                  return (
                    <div
                      key={di}
                      style={{
                        width: CELL, height: CELL,
                        backgroundColor: bg,
                        opacity: op,
                        borderRadius: 2,
                        cursor: "crosshair",
                        flexShrink: 0,
                      }}
                      onMouseEnter={e => {
                        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        setTip({ date: day.date, entry: day.entry, x: r.left, y: r.top });
                      }}
                      onMouseLeave={() => setTip(null)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating tooltip */}
      {tip && (
        <div
          className="fixed z-50 bg-white border border-[#E5E7EB] rounded-xl p-3 shadow-xl pointer-events-none"
          style={{ left: tip.x + 14, top: Math.max(8, tip.y - 60) }}
        >
          <p className="font-[family-name:var(--font-playfair)] font-bold text-[#0A0A0A] text-xs mb-1">
            {formatDate(tip.date)}
          </p>
          {tip.entry ? (
            <>
              <div className="flex items-center gap-1.5">
                {tip.entry.emoji && <span className="text-sm">{tip.entry.emoji}</span>}
                {tip.entry.mood && (
                  <span
                    className="font-[family-name:var(--font-mono)] text-[11px] font-bold"
                    style={{ color: moodColor(tip.entry.mood) }}
                  >
                    {moodEmoji(tip.entry.mood)} {tip.entry.mood}/10
                  </span>
                )}
              </div>
              {tip.entry.content && (
                <p className="font-[family-name:var(--font-mono)] text-[9px] text-[#9CA3AF] mt-1 max-w-[180px] truncate">
                  {tip.entry.content}
                </p>
              )}
            </>
          ) : (
            <p className="font-[family-name:var(--font-mono)] text-[9px] text-[#D1D5DB]">sin registro</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DiaryClient({ entries }: { entries: Entry[] }) {
  const [content,       setContent]     = useState("");
  const [date,          setDate]        = useState(todayStr);
  const [emoji,         setEmoji]       = useState<string | null>(null);
  const [mood,          setMood]        = useState<number | null>(null);
  const [showPicker,    setShowPicker]  = useState(false);
  const [selected,      setSelected]    = useState<Entry | null>(null);
  const [saved,         setSaved]       = useState(false);
  const [saveError,     setSaveError]   = useState<string | null>(null);
  const [isPending,     startTransition] = useTransition();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pickerRef   = useRef<HTMLDivElement>(null);

  // Close emoji picker on outside click
  useEffect(() => {
    if (!showPicker) return;
    function onDown(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [showPicker]);

  function autoResize() {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
  }

  async function handleSave() {
    if (!content.trim() && mood === null) return;
    const snap = { content: content.trim(), date, emoji, mood };
    setContent("");
    setEmoji(null);
    setMood(null);
    setDate(todayStr());
    setSaveError(null);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    startTransition(async () => {
      const result = await createEntry(snap.content, snap.date, snap.emoji, snap.mood);
      if (result.error) {
        setSaveError(result.error);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 1800);
      }
    });
  }

  function handleDelete(id: string) {
    setSelected(null);
    startTransition(async () => { await deleteEntry(id); });
  }

  // Build chart data — last 14 days
  const days = last14Days();
  const chartData: ChartPoint[] = days.map(d => {
    const entry = entries.find(e => e.entry_date === d);
    return {
      date: shortDate(d),
      fullDate: d,
      mood: entry?.mood ?? null,
      content: entry?.content ?? "",
      emoji: entry?.emoji ?? null,
    };
  });
  const hasChart = chartData.some(d => d.mood !== null);

  // Custom dot color
  const renderDot = (props: { cx?: number; cy?: number; payload?: ChartPoint; index?: number }) => {
    const { cx, cy, payload } = props;
    if (!payload?.mood || cx === undefined || cy === undefined) return <g key={props.index} />;
    return (
      <Dot
        key={`dot-${props.index}`}
        cx={cx}
        cy={cy}
        r={4}
        fill={moodColor(payload.mood)}
        stroke="white"
        strokeWidth={1.5}
      />
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-8 py-10">

        {/* ── Header ── */}
        <div className="mb-8">
          <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[#0A0A0A]">
            Diario Emocional
          </h1>
          <p className="font-[family-name:var(--font-mono)] text-xs text-[#9CA3AF] mt-1">
            {entries.length} {entries.length === 1 ? "registro" : "registros"}
          </p>
        </div>

        {/* ── Write area ── */}
        <div
          className={`mb-8 bg-[#F9FAFB] rounded-2xl px-5 pt-5 pb-4 transition-all ${
            saved ? "shadow-[0_0_0_2px_#39FF1440]" : "focus-within:shadow-[0_0_0_2px_#9D4EDD22]"
          }`}
        >
          <textarea
            ref={textareaRef}
            value={content}
            onChange={e => { setContent(e.target.value); autoResize(); }}
            placeholder="¿Qué siento hoy?"
            rows={3}
            autoFocus
            className="w-full bg-transparent resize-none text-[#0A0A0A] text-[15px] leading-relaxed placeholder:text-[#D1D5DB] focus:outline-none"
          />

          {/* Mood meter */}
          <div className="mt-3 pt-3 border-t border-[#EFEFEF]">
            <MoodMeter
              value={mood}
              onChange={v => setMood(v === 0 ? null : v)}
            />
          </div>

          {/* Bottom bar */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#EFEFEF]">
            <div className="flex items-center gap-3">

              {/* Emoji picker */}
              <div className="relative" ref={pickerRef}>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowPicker(p => !p)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#EFEFEF] transition-colors"
                  >
                    {emoji
                      ? <span className="text-base leading-none">{emoji}</span>
                      : <Smile size={14} className="text-[#C9C9C9]" />
                    }
                  </button>
                  {emoji && (
                    <button
                      type="button"
                      onClick={() => setEmoji(null)}
                      className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-[#9CA3AF] hover:bg-[#6B7280] rounded-full flex items-center justify-center transition-colors"
                    >
                      <X size={7} className="text-white" />
                    </button>
                  )}
                </div>
                {showPicker && (
                  <div className="absolute bottom-full mb-2 left-0 bg-white border border-[#E5E7EB] rounded-xl p-2.5 shadow-xl z-20 w-52">
                    <div className="grid grid-cols-6 gap-0.5">
                      {EMOJIS.map(e => (
                        <button
                          key={e}
                          type="button"
                          onClick={() => { setEmoji(e); setShowPicker(false); }}
                          className={`w-7 h-7 text-base flex items-center justify-center rounded-lg transition-colors ${
                            emoji === e ? "bg-[#F0E8FF]" : "hover:bg-[#F5F5F5]"
                          }`}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Date */}
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="font-[family-name:var(--font-mono)] text-[11px] text-[#9CA3AF] bg-transparent focus:outline-none focus:text-[#0A0A0A] cursor-pointer transition-colors"
              />
            </div>

            <button
              onClick={handleSave}
              disabled={(!content.trim() && mood === null) || isPending}
              className={`px-4 py-1.5 text-[11px] font-medium rounded-lg font-[family-name:var(--font-mono)] transition-all ${
                saved
                  ? "bg-[#39FF14] text-[#0A0A0A]"
                  : "bg-[#0A0A0A] text-white hover:bg-[#374151] disabled:opacity-25"
              }`}
            >
              {isPending ? "guardando…" : saved ? "✓ guardado" : "guardar"}
            </button>
          </div>
        </div>

        {/* ── Save error ── */}
        {saveError && (
          <div className="mb-6 -mt-4 px-4 py-2.5 bg-[#FFF0F5] border border-[#FF1493]/20 rounded-xl flex items-center justify-between">
            <span className="font-[family-name:var(--font-mono)] text-[11px] text-[#FF1493]">
              Error al guardar: {saveError}
            </span>
            <button onClick={() => setSaveError(null)} className="text-[#FF1493]/50 hover:text-[#FF1493]">
              <X size={12} />
            </button>
          </div>
        )}

        {/* ── Mood chart ── */}
        {hasChart && (
          <div className="mb-10">
            <p className="font-[family-name:var(--font-mono)] text-[9px] text-[#D1D5DB] uppercase tracking-widest mb-4">
              últimas 2 semanas
            </p>
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={chartData} margin={{ top: 8, right: 4, left: -28, bottom: 0 }}>
                <defs>
                  <linearGradient id="moodFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#39FF14" stopOpacity={0.25} />
                    <stop offset="50%"  stopColor="#9D4EDD" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#FF1493" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 8"
                  stroke="#F3F4F6"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 8, fontFamily: "var(--font-mono)", fill: "#D1D5DB" }}
                  axisLine={false}
                  tickLine={false}
                  interval={1}
                />
                <YAxis
                  domain={[1, 10]}
                  ticks={[1, 5, 10]}
                  tick={{ fontSize: 8, fontFamily: "var(--font-mono)", fill: "#D1D5DB" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ stroke: "#E5E7EB", strokeWidth: 1 }}
                />
                <Area
                  type="monotone"
                  dataKey="mood"
                  stroke="#9D4EDD"
                  strokeWidth={1.8}
                  fill="url(#moodFill)"
                  connectNulls={false}
                  dot={renderDot}
                  activeDot={{ r: 5, fill: "#9D4EDD", stroke: "white", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── Entry list ── */}
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
          <div>
            {/* Headers */}
            <div className="flex items-center gap-3 px-3 pb-2 mb-1">
              <span className="font-[family-name:var(--font-mono)] text-[9px] text-[#D1D5DB] uppercase tracking-widest w-24 shrink-0">fecha</span>
              <span className="font-[family-name:var(--font-mono)] text-[9px] text-[#D1D5DB] uppercase tracking-widest w-10 shrink-0 text-center">mood</span>
              <span className="font-[family-name:var(--font-mono)] text-[9px] text-[#D1D5DB] uppercase tracking-widest flex-1">anotación</span>
              <span className="font-[family-name:var(--font-mono)] text-[9px] text-[#D1D5DB] uppercase tracking-widest w-10 text-right shrink-0">cuándo</span>
            </div>

            {entries.map(entry => (
              <button
                key={entry.id}
                onClick={() => setSelected(entry)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[#F9FAFB] transition-colors text-left group"
              >
                {/* Date */}
                <span className="font-[family-name:var(--font-playfair)] text-sm text-[#0A0A0A] shrink-0 w-24 leading-snug">
                  {shortDate(entry.entry_date)}
                </span>

                {/* Mood */}
                <div className="w-10 shrink-0 flex flex-col items-center gap-0.5">
                  {entry.mood ? (
                    <>
                      <span className="text-base leading-none">{moodEmoji(entry.mood)}</span>
                      <span
                        className="font-[family-name:var(--font-mono)] text-[9px] font-bold"
                        style={{ color: moodColor(entry.mood) }}
                      >
                        {entry.mood}
                      </span>
                    </>
                  ) : (
                    <span className="text-[#E5E7EB] text-xs">–</span>
                  )}
                </div>

                {/* Preview */}
                <span className="flex-1 font-[family-name:var(--font-mono)] text-[11px] text-[#9CA3AF] truncate group-hover:text-[#6B7280] transition-colors">
                  {entry.emoji && <span className="mr-1">{entry.emoji}</span>}
                  {entry.content || <span className="italic text-[#D1D5DB]">sin texto</span>}
                </span>

                {/* Days ago */}
                <span className="font-[family-name:var(--font-mono)] text-[10px] text-[#D1D5DB] group-hover:text-[#9CA3AF] shrink-0 w-10 text-right transition-colors">
                  {daysAgo(entry.entry_date)}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* ── Year heatmap ── */}
        <YearHeatmap entries={entries} />

      </div>

      {/* ── Entry modal ── */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/15 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-2xl p-7 max-w-lg w-full shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                {selected.emoji && (
                  <span className="text-3xl leading-none">{selected.emoji}</span>
                )}
                <div>
                  <p className="font-[family-name:var(--font-playfair)] font-bold text-[#0A0A0A] text-base">
                    {formatDate(selected.entry_date)}
                  </p>
                  <p className="font-[family-name:var(--font-mono)] text-[10px] text-[#9CA3AF] mt-0.5">
                    {daysAgo(selected.entry_date)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleDelete(selected.id)}
                  className="p-1.5 text-[#E5E7EB] hover:text-[#FF1493] hover:bg-[#FFF0F5] rounded-lg transition-colors"
                >
                  <Trash2 size={14} />
                </button>
                <button
                  onClick={() => setSelected(null)}
                  className="p-1.5 text-[#9CA3AF] hover:text-[#0A0A0A] hover:bg-[#F5F5F5] rounded-lg transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Mood visualization */}
            {selected.mood && (
              <div className="mb-4 p-3 rounded-xl" style={{ background: moodColor(selected.mood) + "12" }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{moodEmoji(selected.mood)}</span>
                    <span
                      className="font-[family-name:var(--font-mono)] text-sm font-bold"
                      style={{ color: moodColor(selected.mood) }}
                    >
                      {selected.mood}/10
                    </span>
                  </div>
                </div>
                <div className="flex items-end gap-[2px] h-5">
                  {Array.from({ length: 10 }, (_, i) => {
                    const n = i + 1;
                    const active = n <= selected.mood!;
                    return (
                      <div
                        key={n}
                        style={{
                          flex: 1,
                          height: `${40 + i * 6}%`,
                          backgroundColor: active ? moodColor(n) : "#E5E7EB",
                          borderRadius: 2,
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            <div className="h-px bg-[#F3F4F6] mb-4" />

            {selected.content ? (
              <p className="text-[#374151] text-[15px] leading-relaxed whitespace-pre-wrap">
                {selected.content}
              </p>
            ) : (
              <p className="text-[#D1D5DB] text-sm font-[family-name:var(--font-mono)] italic">
                Sin anotación
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
