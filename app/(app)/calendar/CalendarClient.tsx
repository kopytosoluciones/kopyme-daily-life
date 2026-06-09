"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, X, Repeat2, Trash2, Pencil, Plus } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CalEvent {
  id: string;
  title: string;
  dayIndex: number;       // 0=Lun … 6=Dom (primary / fallback)
  dayIndices?: number[];  // días de repetición (recurring multi-day)
  startHour: number;      // 7–22 (integer)
  duration: number;       // hours (integer, min 1)
  color: string;
  recurring: boolean;
  weekKey?: string;       // YYYY-MM-DD del lunes (no-recurrentes)
  notes?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const START_HOUR  = 7;
const END_HOUR    = 24;
const TOTAL_HOURS = END_HOUR - START_HOUR;  // 17 rows (7–23 inclusive)
const ROW_H       = 26;                      // px per hour

const HOUR_LABELS = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => START_HOUR + i); // 7..24
const HOUR_ROWS   = Array.from({ length: TOTAL_HOURS },     (_, i) => START_HOUR + i); // 7..23 (slots)

const DURATION_OPTIONS = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8];

const DAY_NAMES   = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTH_NAMES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const COLORS = [
  "#9D4EDD", // violet
  "#FF1493", // pink
  "#39FF14", // neon green
  "#F59E0B", // amber
  "#06B6D4", // cyan
  "#EF4444", // red
  "#3B82F6", // blue
  "#10B981", // emerald
  "#F97316", // orange
  "#8B5CF6", // purple
  "#EC4899", // rose
  "#0A0A0A", // black
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function monday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function toKey(d: Date): string {
  return d.toISOString().split("T")[0];
}

function sameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

function textColor(hex: string): string {
  return hex === "#39FF14" ? "#16a34a" : hex;
}

function hourLabel(h: number): string {
  const whole = Math.floor(h) % 24;
  const mins  = (h % 1) === 0.5 ? "30" : "00";
  return `${whole.toString().padStart(2, "0")}:${mins}`;
}

// ─── Storage ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = "kopyme-cal-v2";

function loadEvents(): CalEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : seed();
  } catch { return seed(); }
}

function saveEvents(events: CalEvent[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

function seed(): CalEvent[] {
  const wk = toKey(monday(new Date()));
  return [
    { id: "s1", title: "Gym",      dayIndex: 0, dayIndices: [0, 2, 4], startHour: 7,  duration: 1, color: "#39FF14", recurring: true  },
    { id: "s4", title: "Standup",  dayIndex: 0, dayIndices: [0,1,2,3,4], startHour: 9,  duration: 1, color: "#F59E0B", recurring: true  },
    { id: "s9", title: "Almuerzo", dayIndex: 2, startHour: 13, duration: 1, color: "#9D4EDD", recurring: false, weekKey: wk },
    { id: "sa", title: "Cine",     dayIndex: 5, startHour: 20, duration: 2, color: "#FF1493", recurring: false, weekKey: wk },
  ];
}

// ─── Year Strip ───────────────────────────────────────────────────────────────

function YearStrip({ weekStart, today, onNavigate }: {
  weekStart: Date;
  today: Date;
  onNavigate: (d: Date) => void;
}) {
  const year = today.getFullYear();

  return (
    <div className="flex items-end gap-4 overflow-x-auto py-3 px-8 border-b border-[#F5F5F5] bg-white/80 backdrop-blur-sm">
      <span className="font-[family-name:var(--font-mono)] text-[10px] text-[#9CA3AF] shrink-0 pb-0.5">
        {year}
      </span>
      {Array.from({ length: 12 }, (_, month) => {
        const firstOfMonth = new Date(year, month, 1);
        const lastOfMonth  = new Date(year, month + 1, 0);
        const isCurrent    = month === today.getMonth();

        const weeks: Date[] = [];
        let cur = monday(firstOfMonth);
        while (cur <= lastOfMonth) {
          weeks.push(new Date(cur));
          cur = addDays(cur, 7);
        }

        return (
          <div
            key={month}
            className={`shrink-0 transition-opacity ${isCurrent ? "opacity-100" : "opacity-35 hover:opacity-65"}`}
          >
            <p className="font-[family-name:var(--font-mono)] text-[9px] text-[#9CA3AF] mb-1.5 text-center">
              {MONTH_NAMES[month]}
            </p>
            <div className="flex gap-0.5">
              {weeks.map((w, i) => {
                const isThisWeek = toKey(w) === toKey(weekStart);
                return (
                  <button
                    key={i}
                    onClick={() => onNavigate(w)}
                    title={`Semana del ${w.toLocaleDateString("es-AR")}`}
                    className={`h-4 w-1.5 rounded-sm transition-all ${
                      isThisWeek ? "bg-[#9D4EDD] scale-y-125" : "bg-[#E5E7EB] hover:bg-[#D1D5DB]"
                    }`}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function CalendarClient() {
  const [weekStart, setWeekStart] = useState<Date | null>(null);
  const [events, setEvents]       = useState<CalEvent[]>([]);
  const [mounted, setMounted]     = useState(false);

  const [tooltip, setTooltip] = useState<{
    event: CalEvent; x: number; y: number;
  } | null>(null);

  const [modal, setModal] = useState<{
    mode: "create" | "edit";
    event?: CalEvent;
    dayIndex?: number;
    startHour?: number;
  } | null>(null);

  const [formTitle,      setFormTitle]      = useState("");
  const [formColor,      setFormColor]      = useState(COLORS[0]);
  const [formRecurring,  setFormRecurring]  = useState(false);
  const [formDayIndices, setFormDayIndices] = useState<number[]>([0]);
  const [formStartHour,  setFormStartHour]  = useState(9);
  const [formDuration,   setFormDuration]   = useState(1);
  const [formNotes,      setFormNotes]      = useState("");

  useEffect(() => {
    setWeekStart(monday(new Date()));
    setEvents(loadEvents());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) saveEvents(events);
  }, [events, mounted]);

  if (!mounted || !weekStart) return null;

  const today   = new Date();
  const weekKey = toKey(weekStart);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const isCurrentWeek = sameDay(weekStart, monday(today));

  function dayEvents(dayIndex: number): CalEvent[] {
    return events.filter(e => {
      const onThisDay = e.recurring && e.dayIndices
        ? e.dayIndices.includes(dayIndex)
        : e.dayIndex === dayIndex;
      return onThisDay && (e.recurring || e.weekKey === weekKey);
    });
  }

  function openCreate(dayIndex: number, startHour: number) {
    setModal({ mode: "create", dayIndex, startHour });
    setFormTitle("");
    setFormColor(COLORS[0]);
    setFormRecurring(false);
    setFormDayIndices([dayIndex]);
    setFormStartHour(startHour);
    setFormDuration(1);
    setFormNotes("");
  }

  function openEdit(event: CalEvent) {
    setTooltip(null);
    setModal({ mode: "edit", event });
    setFormTitle(event.title);
    setFormColor(event.color);
    setFormRecurring(event.recurring);
    setFormDayIndices(event.dayIndices ?? [event.dayIndex]);
    setFormStartHour(event.startHour);
    setFormDuration(event.duration);
    setFormNotes(event.notes ?? "");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formTitle.trim() || !modal) return;
    const safeEnd      = Math.min(formStartHour + formDuration, END_HOUR);
    const safeDuration = safeEnd - formStartHour;

    const safeDayIndices = formRecurring
      ? (formDayIndices.length > 0 ? [...formDayIndices].sort() : [modal.dayIndex ?? 0])
      : undefined;

    if (modal.mode === "create") {
      setEvents(prev => [...prev, {
        id: crypto.randomUUID(),
        title:      formTitle.trim(),
        dayIndex:   safeDayIndices ? safeDayIndices[0] : modal.dayIndex!,
        dayIndices: safeDayIndices,
        startHour:  formStartHour,
        duration:   safeDuration,
        color:      formColor,
        recurring:  formRecurring,
        weekKey:    formRecurring ? undefined : weekKey,
        notes:      formNotes.trim() || undefined,
      }]);
    } else if (modal.mode === "edit" && modal.event) {
      setEvents(prev => prev.map(ev =>
        ev.id === modal.event!.id
          ? { ...ev, title: formTitle.trim(), color: formColor, recurring: formRecurring,
              dayIndex: safeDayIndices ? safeDayIndices[0] : ev.dayIndex,
              dayIndices: safeDayIndices,
              startHour: formStartHour, duration: safeDuration,
              notes: formNotes.trim() || undefined }
          : ev
      ));
    }
    setModal(null);
  }

  function handleDelete() {
    if (!modal?.event) return;
    setEvents(prev => prev.filter(ev => ev.id !== modal.event!.id));
    setModal(null);
  }

  // ── Summary: total hours per activity title in this week ──
  const summaryMap: Record<string, { color: string; hours: number }> = {};
  weekDays.forEach((_, dayIndex) => {
    dayEvents(dayIndex).forEach(ev => {
      if (!summaryMap[ev.title]) summaryMap[ev.title] = { color: ev.color, hours: 0 };
      summaryMap[ev.title].hours += ev.duration;
    });
  });
  const summary       = Object.entries(summaryMap).sort((a, b) => b[1].hours - a[1].hours);
  const maxHours      = summary.length > 0 ? summary[0][1].hours : 1;
  const totalAvailableHours = TOTAL_HOURS * 7; // 16h × 7 días = 112h

  const weekLabel = (() => {
    const s = weekDays[0], en = weekDays[6];
    const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
    return s.getMonth() === en.getMonth()
      ? `${s.getDate()} – ${en.toLocaleDateString("es-AR", opts)}`
      : `${s.toLocaleDateString("es-AR", opts)} – ${en.toLocaleDateString("es-AR", opts)}`;
  })();

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* ── Year strip ─────────────────────────────────────────────────────── */}
      <YearStrip weekStart={weekStart} today={today} onNavigate={setWeekStart} />

      {/* ── Week nav ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-8 py-4 border-b border-[#F5F5F5]">
        <button
          onClick={() => setWeekStart(addDays(weekStart, -7))}
          className="p-1.5 rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:border-[#0A0A0A] hover:text-[#0A0A0A] transition-all"
        >
          <ChevronLeft size={16} />
        </button>

        <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#0A0A0A]">
          {weekLabel}
        </h2>

        {isCurrentWeek && (
          <span className="font-[family-name:var(--font-mono)] text-[10px] bg-[#9D4EDD] text-white px-2 py-0.5 rounded-full">
            esta semana
          </span>
        )}

        <button
          onClick={() => setWeekStart(addDays(weekStart, 7))}
          className="p-1.5 rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:border-[#0A0A0A] hover:text-[#0A0A0A] transition-all"
        >
          <ChevronRight size={16} />
        </button>

        {!isCurrentWeek && (
          <button
            onClick={() => setWeekStart(monday(new Date()))}
            className="font-[family-name:var(--font-mono)] text-xs text-[#9D4EDD] hover:underline"
          >
            hoy
          </button>
        )}
      </div>

      {/* ── Hourly grid ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        <div className="flex" style={{ minWidth: 720 }}>

          {/* Time axis */}
          <div className="shrink-0 w-14 bg-white">
            {/* Spacer for day header row */}
            <div style={{ height: 52 }} />
            {HOUR_LABELS.map(h => (
              <div
                key={h}
                className="flex items-start justify-end pr-2"
                style={{ height: ROW_H }}
              >
                <span className="font-[family-name:var(--font-mono)] text-[10px] text-[#C4C4C4] -translate-y-[7px]">
                  {hourLabel(h)}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map((day, dayIndex) => {
            const isToday = sameDay(day, today);
            const evs     = dayEvents(dayIndex);

            return (
              <div key={dayIndex} className="flex-1 min-w-0 border-l border-[#F0F0F0]">

                {/* Day header */}
                <div
                  className="flex flex-col items-center justify-center border-b border-[#F0F0F0] sticky top-0 bg-white z-20"
                  style={{ height: 52 }}
                >
                  <span className={`font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wide ${
                    isToday ? "text-[#9D4EDD]" : dayIndex >= 5 ? "text-[#C4B5FD]" : "text-[#9CA3AF]"
                  }`}>
                    {DAY_NAMES[dayIndex]}
                  </span>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold mt-0.5 transition-colors ${
                    isToday ? "bg-[#9D4EDD] text-white" : dayIndex >= 5 ? "text-[#9CA3AF]" : "text-[#0A0A0A]"
                  }`}>
                    {day.getDate()}
                  </div>
                </div>

                {/* Hour rows + events */}
                <div className="relative" style={{ height: TOTAL_HOURS * ROW_H }}>

                  {/* Clickable hour rows */}
                  {HOUR_ROWS.map((h, i) => (
                    <div
                      key={h}
                      className="absolute inset-x-0 border-b border-[#F5F5F5] hover:bg-[#F9F5FF]/50 transition-colors cursor-pointer group/row"
                      style={{ top: i * ROW_H, height: ROW_H, zIndex: 1 }}
                      onClick={() => openCreate(dayIndex, h)}
                    >
                      <div className="absolute top-1 right-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                        <Plus size={10} className="text-[#D1D5DB]" />
                      </div>
                    </div>
                  ))}

                  {/* Events (absolutely positioned) */}
                  {evs.map(ev => {
                    const top    = (ev.startHour - START_HOUR) * ROW_H;
                    const height = ev.duration * ROW_H - 2;
                    return (
                      <div
                        key={ev.id}
                        className="group/ev absolute rounded overflow-hidden cursor-pointer"
                        style={{
                          top,
                          left: 2,
                          right: 2,
                          height,
                          backgroundColor: ev.color + "20",
                          borderLeft: `3px solid ${ev.color}`,
                          zIndex: 10,
                        }}
                        onMouseEnter={e => {
                          const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                          setTooltip({ event: ev, x: r.right + 10, y: r.top });
                        }}
                        onMouseLeave={() => setTooltip(null)}
                        onClick={e => { e.stopPropagation(); openEdit(ev); }}
                      >
                        <div className="px-2 pt-1 flex items-start justify-between gap-1 h-full">
                          <div className="min-w-0 flex-1">
                            <span
                              className="text-[11px] font-semibold block truncate leading-tight"
                              style={{ color: textColor(ev.color) }}
                            >
                              {ev.title}
                            </span>
                            {height > 32 && (
                              <span
                                className="font-[family-name:var(--font-mono)] text-[9px] opacity-60 block mt-0.5"
                                style={{ color: textColor(ev.color) }}
                              >
                                {hourLabel(ev.startHour)} – {hourLabel(ev.startHour + ev.duration)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover/ev:opacity-100 transition-opacity pt-0.5">
                            {ev.recurring && (
                              <Repeat2 size={9} style={{ color: ev.color }} className="opacity-60" />
                            )}
                            <button
                              onPointerDown={e => e.stopPropagation()}
                              onClick={e => { e.stopPropagation(); openEdit(ev); }}
                              className="p-0.5 rounded hover:bg-white/60"
                            >
                              <Pencil size={9} style={{ color: textColor(ev.color) }} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Hover tooltip ──────────────────────────────────────────────────── */}
      {tooltip && (
        <div
          className="fixed z-50 bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-2xl pointer-events-none"
          style={{ left: Math.min(tooltip.x, window.innerWidth - 240), top: tooltip.y, maxWidth: 230 }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tooltip.event.color }} />
            <span className="font-[family-name:var(--font-playfair)] font-bold text-sm text-[#0A0A0A]">
              {tooltip.event.title}
            </span>
          </div>
          <span className="font-[family-name:var(--font-mono)] text-[10px] text-[#9CA3AF] block">
            {hourLabel(tooltip.event.startHour)} – {hourLabel(tooltip.event.startHour + tooltip.event.duration)}
            {tooltip.event.duration > 1 && ` · ${tooltip.event.duration}h`}
          </span>
          {tooltip.event.recurring && (
            <span className="font-[family-name:var(--font-mono)] text-[9px] text-[#C4B5FD] flex items-center gap-1 mt-1">
              <Repeat2 size={9} /> cada semana
            </span>
          )}
          {tooltip.event.notes && (
            <p className="font-[family-name:var(--font-mono)] text-[10px] text-[#6B7280] leading-relaxed mt-2 pt-2 border-t border-[#F5F5F5]">
              {tooltip.event.notes}
            </p>
          )}
        </div>
      )}

      {/* ── Weekly summary table ────────────────────────────────────────────── */}
      {summary.length > 0 && (
        <div className="px-8 py-8 border-t border-[#F5F5F5]">
          <p className="font-[family-name:var(--font-mono)] text-[9px] text-[#D1D5DB] uppercase tracking-widest mb-5">
            resumen semanal
          </p>
          <div className="space-y-4">
            {summary.map(([title, { color, hours }]) => (
              <div key={title} className="flex items-center gap-4">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="font-[family-name:var(--font-playfair)] text-sm text-[#0A0A0A] w-28 shrink-0 truncate">
                  {title}
                </span>
                <div className="flex-1 flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(hours / maxHours) * 100}%`,
                        backgroundColor: color,
                        opacity: 0.8,
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-[family-name:var(--font-mono)] text-[11px] text-[#9CA3AF] w-8 text-right">
                      {hours}h
                    </span>
                    <span className="font-[family-name:var(--font-mono)] text-[10px] text-[#D1D5DB] w-9 text-right">
                      {Math.round((hours / totalAvailableHours) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Create / Edit modal ─────────────────────────────────────────────── */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setModal(null); }}
        >
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-xl border-2 border-[#0A0A0A] shadow-[0_8px_24px_rgba(0,0,0,0.15)] w-full max-w-sm mx-4 p-6 max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#0A0A0A]">
                {modal.mode === "create" ? "Nueva actividad" : "Editar actividad"}
              </h3>
              <button
                type="button"
                onClick={() => setModal(null)}
                className="text-[#D1D5DB] hover:text-[#0A0A0A] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Day label (create only) */}
            {modal.mode === "create" && (
              <p className="font-[family-name:var(--font-mono)] text-[10px] text-[#9CA3AF] mb-4">
                {DAY_NAMES[modal.dayIndex!]} · {hourLabel(modal.startHour!)}
              </p>
            )}

            {/* Title */}
            <label className="block text-xs text-[#6B7280] mb-1.5">Título</label>
            <input
              autoFocus
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") e.preventDefault(); }}
              placeholder="ej: Reunión, Gym, Cena..."
              className="w-full px-4 py-2.5 rounded-lg border border-[#0A0A0A] bg-[#F5F5F5] text-[#0A0A0A] placeholder-[#D1D5DB] focus:outline-none focus:ring-2 focus:ring-[#9D4EDD] focus:border-[#9D4EDD] text-sm transition-all mb-4"
            />

            {/* Start time + Duration */}
            <div className="flex gap-3 mb-4">
              <div className="flex-1">
                <label className="block text-xs text-[#6B7280] mb-1.5">Inicio</label>
                <select
                  value={formStartHour}
                  onChange={e => setFormStartHour(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#E5E7EB] bg-[#F5F5F5] text-[#0A0A0A] text-sm focus:outline-none focus:ring-2 focus:ring-[#9D4EDD] focus:border-[#9D4EDD] transition-all"
                >
                  {HOUR_ROWS.map(h => (
                    <option key={h} value={h}>{hourLabel(h)}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs text-[#6B7280] mb-1.5">Duración</label>
                <select
                  value={formDuration}
                  onChange={e => setFormDuration(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#E5E7EB] bg-[#F5F5F5] text-[#0A0A0A] text-sm focus:outline-none focus:ring-2 focus:ring-[#9D4EDD] focus:border-[#9D4EDD] transition-all"
                >
                  {DURATION_OPTIONS.map(d => (
                    <option key={d} value={d}>
                      {d === 1 ? "1 hora" : d % 1 === 0.5 ? `${d}h` : `${d} horas`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Color */}
            <label className="block text-xs text-[#6B7280] mb-2">Color</label>
            <div className="flex gap-2 flex-wrap mb-5">
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setFormColor(c)}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${
                    formColor === c ? "border-[#0A0A0A] scale-110" : "border-transparent hover:scale-105"
                  }`}
                  style={{ background: c }}
                />
              ))}
            </div>

            {/* Notes */}
            <label className="block text-xs text-[#6B7280] mb-1.5">Notas</label>
            <textarea
              value={formNotes}
              onChange={e => setFormNotes(e.target.value)}
              placeholder="Notas opcionales..."
              rows={3}
              className="w-full px-4 py-2.5 rounded-lg border border-[#E5E7EB] bg-[#F5F5F5] text-[#0A0A0A] placeholder-[#D1D5DB] focus:outline-none focus:ring-2 focus:ring-[#9D4EDD] focus:border-[#9D4EDD] text-sm resize-none transition-all mb-5"
            />

            {/* Recurring toggle */}
            <label className="flex items-center gap-3 cursor-pointer mb-4">
              <button
                type="button"
                onClick={() => setFormRecurring(!formRecurring)}
                className={`w-9 h-5 rounded-full transition-colors flex items-center shrink-0 ${
                  formRecurring ? "bg-[#9D4EDD]" : "bg-[#E5E7EB]"
                }`}
              >
                <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-0.5 ${
                  formRecurring ? "translate-x-4" : "translate-x-0"
                }`} />
              </button>
              <span className="text-sm text-[#6B7280]">Repetir cada semana</span>
            </label>

            {/* Day selector (only when recurring) */}
            {formRecurring && (
              <div className="mb-6">
                <p className="text-xs text-[#6B7280] mb-2">¿Qué días?</p>
                <div className="flex gap-1.5">
                  {DAY_NAMES.map((name, i) => {
                    const selected = formDayIndices.includes(i);
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setFormDayIndices(prev =>
                          prev.includes(i)
                            ? prev.length > 1 ? prev.filter(d => d !== i) : prev
                            : [...prev, i].sort()
                        )}
                        className="w-8 h-8 rounded-full text-[11px] font-semibold transition-all border-2 flex items-center justify-center"
                        style={selected
                          ? { backgroundColor: formColor, borderColor: formColor, color: formColor === "#39FF14" ? "#16a34a" : "#fff" }
                          : { backgroundColor: "transparent", borderColor: "#E5E7EB", color: "#9CA3AF" }
                        }
                      >
                        {name.charAt(0)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              {modal.mode === "edit" && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm text-[#9CA3AF] hover:text-[#FF1493] hover:border-[#FF1493] transition-all"
                >
                  <Trash2 size={13} />
                  Eliminar
                </button>
              )}
              <button
                type="submit"
                disabled={!formTitle.trim()}
                className="flex-1 py-2 rounded-lg bg-[#0A0A0A] text-white text-sm font-medium border-2 border-[#0A0A0A] hover:bg-[#1f1f1f] transition-all disabled:opacity-40"
              >
                {modal.mode === "create" ? "Crear" : "Guardar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
