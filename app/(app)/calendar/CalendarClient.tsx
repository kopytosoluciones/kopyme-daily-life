"use client";

import { useState, useEffect } from "react";

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

const HOUR_ROWS  = Array.from({ length: TOTAL_HOURS },     (_, i) => START_HOUR + i); // 7..23 (slots)

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

const LABEL = "font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase";
const FIELD = "w-full border-2 border-foreground bg-card px-3 py-2 font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground focus:bg-primary/10";
const BAR_W = 20;

function asciiBar(ratio: number): string {
  const filled = Math.round(Math.max(0, Math.min(1, ratio)) * BAR_W);
  return "█".repeat(filled) + "░".repeat(BAR_W - filled);
}

function fmtHours(h: number): string {
  return h.toLocaleString("es-AR", { maximumFractionDigits: 1 });
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
    <div className="flex items-end gap-4 overflow-x-auto border-2 border-foreground bg-card px-4 py-3">
      <span className="shrink-0 pb-0.5 font-mono text-[11px] font-bold tabular text-foreground">
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
            className="shrink-0"
          >
            <p className={`mb-1.5 text-center font-mono text-[10px] tracking-[0.08em] uppercase ${
              isCurrent ? "font-bold text-foreground" : "text-muted-foreground"
            }`}>
              {MONTH_NAMES[month]}
            </p>
            <div className="flex gap-0.5">
              {weeks.map((w, i) => {
                const isThisWeek = toKey(w) === toKey(weekStart);
                const label = `Semana del ${w.toLocaleDateString("es-AR")}`;
                return (
                  <button
                    key={i}
                    onClick={() => onNavigate(w)}
                    title={label}
                    aria-label={label}
                    aria-current={isThisWeek ? "date" : undefined}
                    className={`h-4 w-1.5 transition-colors duration-100 ${
                      isThisWeek
                        ? "bg-primary"
                        : isCurrent
                          ? "bg-muted-foreground hover:bg-foreground"
                          : "bg-muted hover:bg-muted-foreground"
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

  // localStorage y la fecha local solo existen en el cliente: cargarlos en el render rompería la hidratación.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const totalWeekHours = summary.reduce((s, [, v]) => s + v.hours, 0);

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-4 py-7 md:px-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[40px] leading-none font-bold tracking-[-0.02em]">
            Calendario<span className="k-cursor">_</span>
          </h1>
          <p className="mt-2 font-mono text-xs text-muted-foreground tabular">
            {summary.length} {summary.length === 1 ? "actividad" : "actividades"} · {fmtHours(totalWeekHours)}h esta semana
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isCurrentWeek ? (
            <span className="border-[1.5px] border-current px-1.5 py-0.5 font-mono text-[10px] tracking-[0.06em] text-primary uppercase">
              esta semana
            </span>
          ) : (
            <button
              onClick={() => setWeekStart(monday(new Date()))}
              className="border-2 border-foreground bg-card px-3 py-1.5 font-mono text-xs tracking-[0.06em] text-foreground uppercase shadow-hard transition-transform duration-100 hover:-translate-x-px hover:-translate-y-px active:translate-x-1 active:translate-y-1 active:shadow-none"
            >
              ▸ Hoy
            </button>
          )}

          <div className="flex items-stretch border-2 border-foreground bg-card shadow-hard">
            <button
              onClick={() => setWeekStart(addDays(weekStart, -7))}
              aria-label="Semana anterior"
              className="px-3 py-1.5 font-mono text-sm text-foreground hover:bg-muted"
            >
              ←
            </button>
            <span className="flex items-center border-x-2 border-foreground px-3 font-mono text-xs font-bold tabular text-foreground">
              {weekLabel}
            </span>
            <button
              onClick={() => setWeekStart(addDays(weekStart, 7))}
              aria-label="Semana siguiente"
              className="px-3 py-1.5 font-mono text-sm text-foreground hover:bg-muted"
            >
              →
            </button>
          </div>
        </div>
      </header>

      {/* ── Year strip ─────────────────────────────────────────────────────── */}
      <YearStrip weekStart={weekStart} today={today} onNavigate={setWeekStart} />

      {/* ── Hourly grid ────────────────────────────────────────────────────── */}
      <div className="border-2 border-foreground bg-card">
        <div className="overflow-x-auto">
          <div className="flex" style={{ minWidth: 720 }}>

            {/* Time axis */}
            <div className="w-14 shrink-0 border-r-2 border-foreground">
              <div className="border-b-2 border-foreground bg-foreground" style={{ height: 44 }} />
              {HOUR_ROWS.map(h => (
                <div
                  key={h}
                  className="flex items-start justify-end border-b border-muted pt-0.5 pr-2"
                  style={{ height: ROW_H }}
                >
                  <span className="font-mono text-[10px] text-muted-foreground tabular">
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
                <div
                  key={dayIndex}
                  className={`min-w-0 flex-1 ${dayIndex > 0 ? "border-l border-muted" : ""}`}
                >

                  {/* Day header */}
                  <div
                    className={`flex items-baseline justify-center gap-1.5 border-b-2 border-foreground ${
                      isToday ? "bg-primary text-primary-foreground" : "bg-foreground text-background"
                    }`}
                    style={{ height: 44, paddingTop: 13 }}
                    aria-current={isToday ? "date" : undefined}
                  >
                    <span className="font-mono text-[10px] tracking-[0.08em] uppercase opacity-80">
                      {DAY_NAMES[dayIndex]}
                    </span>
                    <span className="font-mono text-sm font-bold tabular">
                      {day.getDate()}
                    </span>
                  </div>

                  {/* Hour rows + events */}
                  <div className="relative" style={{ height: TOTAL_HOURS * ROW_H }}>

                    {/* Clickable hour rows */}
                    {HOUR_ROWS.map((h, i) => (
                      <div
                        key={h}
                        className="group/row absolute inset-x-0 cursor-pointer border-b border-muted transition-colors duration-100 hover:bg-muted"
                        style={{ top: i * ROW_H, height: ROW_H, zIndex: 1 }}
                        onClick={() => openCreate(dayIndex, h)}
                      >
                        <span
                          aria-hidden
                          className="absolute top-0.5 right-1 font-mono text-[10px] leading-none text-muted-foreground opacity-0 group-hover/row:opacity-100"
                        >
                          +
                        </span>
                      </div>
                    ))}

                    {/* Events (absolutely positioned) */}
                    {evs.map(ev => {
                      const top    = (ev.startHour - START_HOUR) * ROW_H;
                      const height = ev.duration * ROW_H - 2;
                      return (
                        <div
                          key={ev.id}
                          className="group/ev absolute cursor-pointer overflow-hidden border border-foreground bg-card text-foreground transition-colors duration-100 hover:bg-muted"
                          style={{
                            top,
                            left: 2,
                            right: 2,
                            height,
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
                          <div className="flex h-full items-start justify-between gap-1 px-1.5 pt-0.5">
                            <div className="min-w-0 flex-1">
                              <span className="block truncate text-[11px] leading-tight font-medium">
                                {ev.title}
                              </span>
                              {height > 32 && (
                                <span className="mt-0.5 block font-mono text-[9px] text-muted-foreground tabular">
                                  {hourLabel(ev.startHour)}–{hourLabel(ev.startHour + ev.duration)}
                                </span>
                              )}
                            </div>
                            <div className="flex shrink-0 items-center gap-1 pt-0.5 font-mono text-[10px] leading-none text-muted-foreground">
                              {ev.recurring && (
                                <span aria-label="Se repite cada semana" title="Cada semana">↻</span>
                              )}
                              <button
                                onPointerDown={e => e.stopPropagation()}
                                onClick={e => { e.stopPropagation(); openEdit(ev); }}
                                aria-label={`Editar ${ev.title}`}
                                className="opacity-0 group-hover/ev:opacity-100 hover:text-foreground focus-visible:opacity-100"
                              >
                                ✎
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
      </div>

      {/* ── Hover tooltip ──────────────────────────────────────────────────── */}
      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 border-2 border-foreground bg-card p-3 shadow-hard-lg"
          style={{ left: Math.min(tooltip.x, window.innerWidth - 240), top: tooltip.y, maxWidth: 230 }}
        >
          <div className="mb-1 flex items-center gap-2">
            <span aria-hidden className="size-2.5 shrink-0" style={{ backgroundColor: tooltip.event.color }} />
            <span className="text-sm font-bold text-foreground">
              {tooltip.event.title}
            </span>
          </div>
          <span className="block font-mono text-[11px] text-muted-foreground tabular">
            {hourLabel(tooltip.event.startHour)}–{hourLabel(tooltip.event.startHour + tooltip.event.duration)}
            {tooltip.event.duration > 1 && ` · ${fmtHours(tooltip.event.duration)}h`}
          </span>
          {tooltip.event.recurring && (
            <span className="mt-1 block font-mono text-[10px] tracking-[0.06em] text-muted-foreground uppercase">
              ↻ cada semana
            </span>
          )}
          {tooltip.event.notes && (
            <p className="mt-2 border-t border-muted pt-2 text-xs leading-relaxed text-foreground">
              {tooltip.event.notes}
            </p>
          )}
        </div>
      )}

      {/* ── Weekly summary ─────────────────────────────────────────────────── */}
      <section className="border-2 border-foreground bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-foreground px-4 py-2.5">
          <h2 className={LABEL}>── Resumen semanal</h2>
          <span className="font-mono text-[11px] text-muted-foreground tabular">
            {fmtHours(totalWeekHours)}h / {totalAvailableHours}h
          </span>
        </div>

        {summary.length === 0 ? (
          <div className="px-4 py-10 text-center font-mono text-xs text-muted-foreground">
            <pre aria-hidden className="mb-3 leading-tight select-none">{"┌─┬─┬─┐\n│ │ │ │\n└─┴─┴─┘"}</pre>
            Semana libre. Tocá una hora de la grilla para agregar una actividad.
          </div>
        ) : (
          <ul>
            {summary.map(([title, { color, hours }]) => (
              <li
                key={title}
                className="flex items-center gap-3 border-b border-muted px-4 py-2 last:border-b-0"
              >
                <span aria-hidden className="size-2.5 shrink-0" style={{ backgroundColor: color }} />
                <span className="w-28 shrink-0 truncate text-sm text-foreground sm:w-40">
                  {title}
                </span>
                <span
                  aria-hidden
                  className="min-w-0 flex-1 truncate font-mono text-xs leading-none text-foreground select-none"
                >
                  {asciiBar(hours / maxHours)}
                </span>
                <span className="w-10 shrink-0 text-right font-mono text-xs font-bold text-foreground tabular">
                  {fmtHours(hours)}h
                </span>
                <span className="w-10 shrink-0 text-right font-mono text-[11px] text-muted-foreground tabular">
                  {Math.round((hours / totalAvailableHours) * 100)}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Create / Edit modal ─────────────────────────────────────────────── */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4"
          onClick={e => { if (e.target === e.currentTarget) setModal(null); }}
        >
          <form
            onSubmit={handleSubmit}
            className="max-h-[90vh] w-full max-w-sm overflow-y-auto border-2 border-foreground bg-card shadow-hard-lg"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-foreground px-4 py-2.5">
              <h3 className={LABEL}>
                {modal.mode === "create" ? "── Nueva actividad" : "── Editar actividad"}
              </h3>
              <button
                type="button"
                onClick={() => setModal(null)}
                aria-label="Cerrar"
                className="font-mono text-xs text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-4 p-4">
              {/* Day label (create only) */}
              {modal.mode === "create" && (
                <p className="font-mono text-[11px] text-muted-foreground tabular">
                  ▸ {DAY_NAMES[modal.dayIndex!]} · {hourLabel(modal.startHour!)}
                </p>
              )}

              {/* Title */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="cal-title" className={LABEL}>Título</label>
                <input
                  id="cal-title"
                  autoFocus
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") e.preventDefault(); }}
                  placeholder="ej: Reunión, Gym, Cena..."
                  className={FIELD}
                />
              </div>

              {/* Start time + Duration */}
              <div className="flex gap-3">
                <div className="flex flex-1 flex-col gap-1.5">
                  <label htmlFor="cal-start" className={LABEL}>Inicio</label>
                  <select
                    id="cal-start"
                    value={formStartHour}
                    onChange={e => setFormStartHour(Number(e.target.value))}
                    className={`${FIELD} tabular`}
                  >
                    {HOUR_ROWS.map(h => (
                      <option key={h} value={h}>{hourLabel(h)}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  <label htmlFor="cal-duration" className={LABEL}>Duración</label>
                  <select
                    id="cal-duration"
                    value={formDuration}
                    onChange={e => setFormDuration(Number(e.target.value))}
                    className={`${FIELD} tabular`}
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
              <div className="flex flex-col gap-2">
                <span className={LABEL}>Marca</span>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFormColor(c)}
                      aria-label={`Color ${c}`}
                      aria-pressed={formColor === c}
                      className={`size-6 border-2 ${
                        formColor === c ? "border-foreground outline-2 outline-offset-2 outline-foreground" : "border-transparent"
                      }`}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="cal-notes" className={LABEL}>Notas</label>
                <textarea
                  id="cal-notes"
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder="Notas opcionales..."
                  rows={3}
                  className={`${FIELD} resize-none font-sans`}
                />
              </div>

              {/* Recurring toggle */}
              <label className="flex cursor-pointer items-center gap-2.5">
                <button
                  type="button"
                  role="switch"
                  aria-checked={formRecurring}
                  onClick={() => setFormRecurring(!formRecurring)}
                  className={`flex size-5 shrink-0 items-center justify-center border-2 border-foreground font-mono text-[11px] leading-none ${
                    formRecurring ? "bg-foreground text-background" : "bg-card text-transparent"
                  }`}
                >
                  ✓
                </button>
                <span className="text-sm text-foreground">Repetir cada semana</span>
              </label>

              {/* Day selector (only when recurring) */}
              {formRecurring && (
                <div className="flex flex-col gap-2">
                  <span className={LABEL}>¿Qué días?</span>
                  <div className="flex border-2 border-foreground">
                    {DAY_NAMES.map((name, i) => {
                      const selected = formDayIndices.includes(i);
                      return (
                        <button
                          key={i}
                          type="button"
                          aria-label={name}
                          aria-pressed={selected}
                          onClick={() => setFormDayIndices(prev =>
                            prev.includes(i)
                              ? prev.length > 1 ? prev.filter(d => d !== i) : prev
                              : [...prev, i].sort()
                          )}
                          className={`h-8 flex-1 font-mono text-[11px] font-bold uppercase ${
                            i > 0 ? "border-l-2 border-foreground" : ""
                          } ${selected ? "bg-foreground text-background" : "bg-card text-muted-foreground hover:bg-muted"}`}
                        >
                          {name.charAt(0)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                {modal.mode === "edit" && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="border-2 border-destructive bg-card px-3 py-2 font-mono text-xs text-destructive uppercase hover:bg-destructive/10"
                  >
                    ✕ Eliminar
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!formTitle.trim()}
                  className="flex-1 border-2 border-foreground bg-primary px-3 py-2 font-mono text-xs tracking-[0.06em] text-primary-foreground uppercase shadow-hard-primary transition-transform duration-100 hover:-translate-x-px hover:-translate-y-px active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-40"
                >
                  {modal.mode === "create" ? "+ Crear" : "✓ Guardar"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
