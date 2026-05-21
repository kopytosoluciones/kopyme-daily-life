"use client";

import { useState, useRef, useTransition, useEffect, useCallback } from "react";
import { createEntry, updateEntry, deleteEntry } from "./actions";
import { X, Trash2, Smile, Pencil } from "lucide-react";

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

// ─── Emoji palette ────────────────────────────────────────────────────────────

const EMOJIS = [
  // Positivos
  "😊", "😄", "😁", "🥹", "🤩", "🥰", "😍", "😎", "🤗", "😌",
  // Neutrales
  "😶", "🤔", "😐", "🫠", "🥱", "😴", "😑", "🧐", "🫡", "🤭",
  // Tristes
  "😔", "😢", "😭", "😞", "😩", "😫", "🥺", "😟", "😕", "🙁",
  // Tensos / enojados
  "😤", "😡", "🤯", "😰", "😨", "😱", "😮", "😲", "🫨", "😬",
  // Amor / energía
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💔", "🫶",
  // Naturaleza / símbolos
  "✨", "🔥", "💫", "⚡", "🌈", "☀️", "🌙", "⭐", "🌟", "💎",
  // Actividades / contexto
  "💪", "🙏", "🏋️", "📚", "🎵", "🌿", "🌊", "🌸", "🍀", "🦋",
  // Extras
  "🏃", "🧘", "🫂", "🌻", "☁️", "🌧️", "❄️", "🎉", "💡", "🎊",
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

// ─── Emoji Picker Button ──────────────────────────────────────────────────────

function EmojiPickerButton({
  emoji,
  onSelect,
  onClear,
}: {
  emoji: string | null;
  onSelect: (e: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <div className="relative inline-flex">
        <button
          type="button"
          onClick={() => setOpen(p => !p)}
          className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[#EFEFEF] transition-colors"
          title="Agregar emoji"
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

      {open && (
        <div className="absolute bottom-full mb-2 right-0 bg-white border border-[#E5E7EB] rounded-2xl p-3 shadow-2xl z-30 w-72">
          <div className="grid grid-cols-10 gap-0.5">
            {EMOJIS.map(e => (
              <button
                key={e}
                type="button"
                onClick={() => { onSelect(e); setOpen(false); }}
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
              return (
                <div
                  key={di}
                  className="w-full"
                  style={{ aspectRatio: "1", backgroundColor: bg, opacity: op, borderRadius: 2, cursor: "crosshair" }}
                  onMouseEnter={e => {
                    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    setTip({ date: day.date, dayEntries: day.dayEntries, avgMood: day.avgMood, x: r.left, y: r.top });
                  }}
                  onMouseLeave={() => setTip(null)}
                />
              );
            })}
          </div>
        ))}
      </div>

      {tip && (
        <div
          className="fixed z-50 bg-white border border-[#E5E7EB] rounded-xl p-3 shadow-xl pointer-events-none"
          style={{ left: tip.x + 14, top: Math.max(8, tip.y - 60) }}
        >
          <p className="font-[family-name:var(--font-playfair)] font-bold text-[#0A0A0A] text-xs mb-1">
            {formatDate(tip.date)}
          </p>
          {tip.dayEntries.length > 0 ? (
            <>
              {tip.avgMood !== null && (
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="font-[family-name:var(--font-mono)] text-[11px] font-bold" style={{ color: moodColor(Math.round(tip.avgMood)) }}>
                    {tip.avgMood}/10
                  </span>
                  {tip.dayEntries.length > 1 && (
                    <span className="font-[family-name:var(--font-mono)] text-[9px] text-[#D1D5DB]">
                      prom. {tip.dayEntries.length} registros
                    </span>
                  )}
                </div>
              )}
              {tip.dayEntries[0].emoji && (
                <span className="text-sm mr-1">{tip.dayEntries[0].emoji}</span>
              )}
              {tip.dayEntries[0].body && (
                <p className="font-[family-name:var(--font-mono)] text-[9px] text-[#9CA3AF] mt-1 max-w-[180px] truncate">
                  {tip.dayEntries[0].body}
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
        rows={isEdit ? 4 : 3}
        autoFocus={!isEdit}
        className="w-full bg-transparent resize-none text-[#0A0A0A] text-[15px] leading-relaxed placeholder:text-[#D1D5DB] focus:outline-none"
      />

      {/* Mood meter + emoji en la misma fila */}
      <div className="mt-3 pt-3 border-t border-[#EFEFEF] flex items-center justify-between gap-4">
        <MoodMeter value={mood} onChange={v => setMood(v === 0 ? null : v)} />
        <EmojiPickerButton
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
  const [selected,     setSelected]     = useState<Entry | null>(null);
  const [editing,      setEditing]      = useState<Entry | null>(null);
  const [editError,    setEditError]    = useState<string | null>(null);
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
        setTimeout(() => setSaved(false), 1800);
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
    setSelected(null);
    startTransition(async () => { await deleteEntry(id); });
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="px-8 py-10 max-w-screen-xl mx-auto">

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
          className={`mb-8 bg-[#F9FAFB] rounded-2xl px-6 pt-5 pb-5 transition-all ${
            saved ? "shadow-[0_0_0_2px_#39FF1440]" : "focus-within:shadow-[0_0_0_2px_#9D4EDD22]"
          }`}
        >
          <EntryForm
            initialDate={todayStr()}
            onSave={handleSave}
            isPending={isPending}
            saveError={saveError}
          />
        </div>

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
              <span className="font-[family-name:var(--font-mono)] text-[9px] text-[#D1D5DB] uppercase tracking-widest w-10 shrink-0 text-center">puntaje</span>
              <span className="font-[family-name:var(--font-mono)] text-[9px] text-[#D1D5DB] uppercase tracking-widest flex-1">anotación</span>
              <span className="font-[family-name:var(--font-mono)] text-[9px] text-[#D1D5DB] uppercase tracking-widest w-16 text-right shrink-0">cuándo</span>
            </div>

            {entries.map(entry => (
              <div
                key={entry.id}
                onClick={() => setSelected(entry)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[#F9FAFB] transition-colors cursor-pointer group"
              >
                {/* Date */}
                <span className="font-[family-name:var(--font-playfair)] text-sm text-[#0A0A0A] shrink-0 w-24 leading-snug">
                  {shortDate(entry.entry_date)}
                </span>

                {/* Puntaje */}
                <div className="w-10 shrink-0 flex items-center justify-center">
                  {entry.mood ? (
                    <span
                      className="font-[family-name:var(--font-mono)] text-sm font-bold"
                      style={{ color: moodColor(entry.mood) }}
                    >
                      {entry.mood}
                    </span>
                  ) : (
                    <span className="text-[#E5E7EB] text-xs">–</span>
                  )}
                </div>

                {/* Preview */}
                <span className="flex-1 font-[family-name:var(--font-mono)] text-[11px] text-[#9CA3AF] truncate group-hover:text-[#6B7280] transition-colors">
                  {entry.emoji && <span className="mr-1">{entry.emoji}</span>}
                  {entry.body || <span className="italic text-[#D1D5DB]">sin texto</span>}
                </span>

                {/* Right side: days ago + pencil */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-[family-name:var(--font-mono)] text-[10px] text-[#D1D5DB] group-hover:text-[#9CA3AF] transition-colors w-10 text-right">
                    {daysAgo(entry.entry_date)}
                  </span>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setEditing(entry); }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-[#C9C9C9] hover:text-[#9D4EDD] hover:bg-[#F5F0FF] rounded-lg transition-all"
                    title="Editar"
                  >
                    <Pencil size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Year heatmap ── */}
        <YearHeatmap entries={entries} />
      </div>

      {/* ── View modal ── */}
      {selected && !editing && (
        <div
          className="fixed inset-0 bg-black/15 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-2xl p-7 max-w-lg w-full shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                {selected.emoji && <span className="text-3xl leading-none">{selected.emoji}</span>}
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
                  onClick={() => { setEditing(selected); setSelected(null); }}
                  className="p-1.5 text-[#C9C9C9] hover:text-[#9D4EDD] hover:bg-[#F5F0FF] rounded-lg transition-colors"
                  title="Editar"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDelete(selected.id)}
                  className="p-1.5 text-[#E5E7EB] hover:text-[#FF1493] hover:bg-[#FFF0F5] rounded-lg transition-colors"
                  title="Eliminar"
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

            {/* Mood */}
            {selected.mood && (
              <div className="mb-4 p-3 rounded-xl" style={{ background: moodColor(selected.mood) + "12" }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{moodEmoji(selected.mood)}</span>
                  <span
                    className="font-[family-name:var(--font-mono)] text-sm font-bold"
                    style={{ color: moodColor(selected.mood) }}
                  >
                    {selected.mood}/10
                  </span>
                </div>
                <div className="flex items-end gap-[2px] h-5">
                  {Array.from({ length: 10 }, (_, i) => {
                    const n = i + 1;
                    const active = n <= selected.mood!;
                    return (
                      <div
                        key={n}
                        style={{
                          flex: 1, height: `${40 + i * 6}%`,
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

            {selected.body ? (
              <p className="text-[#374151] text-[15px] leading-relaxed whitespace-pre-wrap">
                {selected.body}
              </p>
            ) : (
              <p className="text-[#D1D5DB] text-sm font-[family-name:var(--font-mono)] italic">
                Sin anotación
              </p>
            )}
          </div>
        </div>
      )}

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
