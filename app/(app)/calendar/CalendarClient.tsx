"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Plus, X, Repeat2, Trash2, Pencil } from "lucide-react";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors,
  useDroppable, useDraggable,
} from "@dnd-kit/core";

// ─── Types ────────────────────────────────────────────────────────────────────

type TimeSlot = "morning" | "midday" | "afternoon" | "night";

interface CalEvent {
  id: string;
  title: string;
  dayIndex: number;     // 0 = Lun … 6 = Dom
  slot: TimeSlot;
  color: string;
  recurring: boolean;   // si true, aparece todas las semanas
  weekKey?: string;     // YYYY-MM-DD del lunes de esa semana (solo no-recurrentes)
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SLOTS: TimeSlot[] = ["morning", "midday", "afternoon", "night"];

const SLOT_META: Record<TimeSlot, { label: string; time: string }> = {
  morning:   { label: "Mañana",   time: "6–12"  },
  midday:    { label: "Mediodía", time: "12–15" },
  afternoon: { label: "Tarde",    time: "15–20" },
  night:     { label: "Noche",    time: "20–0"  },
};

const DAY_NAMES   = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTH_NAMES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const COLORS = [
  "#9D4EDD", "#FF1493", "#39FF14", "#F4A9D6",
  "#D9B3E8", "#B8E8C1", "#6366f1", "#0A0A0A",
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

// ─── Storage ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = "kopyme-cal-v1";

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
    { id: "s1", title: "Gym",       dayIndex: 0, slot: "morning",   color: "#39FF14", recurring: true  },
    { id: "s2", title: "Gym",       dayIndex: 2, slot: "morning",   color: "#39FF14", recurring: true  },
    { id: "s3", title: "Gym",       dayIndex: 4, slot: "morning",   color: "#39FF14", recurring: true  },
    { id: "s4", title: "Standup",   dayIndex: 0, slot: "morning",   color: "#F4A9D6", recurring: true  },
    { id: "s5", title: "Standup",   dayIndex: 1, slot: "morning",   color: "#F4A9D6", recurring: true  },
    { id: "s6", title: "Standup",   dayIndex: 2, slot: "morning",   color: "#F4A9D6", recurring: true  },
    { id: "s7", title: "Standup",   dayIndex: 3, slot: "morning",   color: "#F4A9D6", recurring: true  },
    { id: "s8", title: "Standup",   dayIndex: 4, slot: "morning",   color: "#F4A9D6", recurring: true  },
    { id: "s9", title: "Almuerzo",  dayIndex: 2, slot: "midday",    color: "#9D4EDD", recurring: false, weekKey: wk },
    { id: "sa", title: "Cine",      dayIndex: 5, slot: "night",     color: "#FF1493", recurring: false, weekKey: wk },
  ];
}

// ─── DraggableEvent ───────────────────────────────────────────────────────────

function DraggableEvent({ event, onEdit }: { event: CalEvent; onEdit: () => void }) {
  const { setNodeRef, transform, isDragging, attributes, listeners } = useDraggable({ id: event.id });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={e => e.stopPropagation()}
      style={{
        transform: transform ? `translate(${transform.x}px,${transform.y}px)` : undefined,
        opacity: isDragging ? 0.2 : 1,
        backgroundColor: event.color + "22",
        borderLeft: `3px solid ${event.color}`,
      }}
      className="group/ev relative flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium cursor-grab active:cursor-grabbing select-none touch-none w-full mb-0.5"
    >
      <span className="truncate flex-1" style={{ color: textColor(event.color) }}>
        {event.title}
      </span>
      {event.recurring && (
        <Repeat2 size={8} className="shrink-0 opacity-40" style={{ color: event.color }} />
      )}
      <button
        onPointerDown={e => e.stopPropagation()}
        onClick={e => { e.stopPropagation(); onEdit(); }}
        className="absolute right-0.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded flex items-center justify-center bg-white/90 text-[#9CA3AF] hover:text-[#0A0A0A] opacity-0 group-hover/ev:opacity-100 transition-opacity"
      >
        <Pencil size={8} />
      </button>
    </div>
  );
}

function OverlayEvent({ event }: { event: CalEvent }) {
  return (
    <div
      style={{ backgroundColor: event.color + "22", borderLeft: `3px solid ${event.color}` }}
      className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium shadow-lg rotate-2 w-28"
    >
      <span className="truncate" style={{ color: textColor(event.color) }}>{event.title}</span>
    </div>
  );
}

// ─── DroppableCell ────────────────────────────────────────────────────────────

function DroppableCell({ id, events, onAdd, onEdit }: {
  id: string;
  events: CalEvent[];
  onAdd: () => void;
  onEdit: (e: CalEvent) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <td
      ref={setNodeRef}
      onClick={onAdd}
      style={{
        minHeight: 72,
        backgroundColor: isOver ? "#9D4EDD15" : undefined,
      }}
      className="border-r border-b border-[#F5F5F5] p-1.5 align-top cursor-pointer transition-colors hover:bg-[#F5F5F5]/60"
    >
      {events.map(ev => (
        <DraggableEvent key={ev.id} event={ev} onEdit={() => onEdit(ev)} />
      ))}
      {events.length === 0 && (
        <div className="flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity pt-3">
          <Plus size={12} className="text-[#D1D5DB]" />
        </div>
      )}
    </td>
  );
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
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const [modal, setModal] = useState<{
    mode: "create" | "edit";
    event?: CalEvent;
    dayIndex?: number;
    slot?: TimeSlot;
  } | null>(null);

  const [formTitle,     setFormTitle]     = useState("");
  const [formColor,     setFormColor]     = useState(COLORS[0]);
  const [formRecurring, setFormRecurring] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  useEffect(() => {
    setWeekStart(monday(new Date()));
    setEvents(loadEvents());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) saveEvents(events);
  }, [events, mounted]);

  if (!mounted || !weekStart) return null;

  const today    = new Date();
  const weekKey  = toKey(weekStart);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const isCurrentWeek = sameDay(weekStart, monday(today));

  function cellEvents(dayIndex: number, slot: TimeSlot): CalEvent[] {
    return events.filter(e =>
      e.dayIndex === dayIndex &&
      e.slot     === slot &&
      (e.recurring || e.weekKey === weekKey)
    );
  }

  function handleDragStart(e: DragStartEvent) {
    setDraggingId(e.active.id as string);
  }

  function handleDragEnd(e: DragEndEvent) {
    setDraggingId(null);
    if (!e.over) return;
    const [slot, dayStr] = (e.over.id as string).split("__");
    const dayIndex = parseInt(dayStr);
    setEvents(prev => prev.map(ev =>
      ev.id === e.active.id ? { ...ev, slot: slot as TimeSlot, dayIndex } : ev
    ));
  }

  function openCreate(dayIndex: number, slot: TimeSlot) {
    setModal({ mode: "create", dayIndex, slot });
    setFormTitle(""); setFormColor(COLORS[0]); setFormRecurring(false);
  }

  function openEdit(event: CalEvent) {
    setModal({ mode: "edit", event });
    setFormTitle(event.title); setFormColor(event.color); setFormRecurring(event.recurring);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formTitle.trim() || !modal) return;

    if (modal.mode === "create") {
      setEvents(prev => [...prev, {
        id: crypto.randomUUID(),
        title: formTitle.trim(),
        dayIndex: modal.dayIndex!,
        slot: modal.slot!,
        color: formColor,
        recurring: formRecurring,
        weekKey: formRecurring ? undefined : weekKey,
      }]);
    } else if (modal.mode === "edit" && modal.event) {
      setEvents(prev => prev.map(ev =>
        ev.id === modal.event!.id
          ? { ...ev, title: formTitle.trim(), color: formColor, recurring: formRecurring }
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

  const weekLabel = (() => {
    const s = weekDays[0], en = weekDays[6];
    const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
    return s.getMonth() === en.getMonth()
      ? `${s.getDate()} – ${en.toLocaleDateString("es-AR", opts)}`
      : `${s.toLocaleDateString("es-AR", opts)} – ${en.toLocaleDateString("es-AR", opts)}`;
  })();

  const draggingEvent = draggingId ? events.find(e => e.id === draggingId) : null;

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* ── Year strip ──────────────────────────────────────────────────────── */}
      <YearStrip weekStart={weekStart} today={today} onNavigate={setWeekStart} />

      {/* ── Week nav ────────────────────────────────────────────────────────── */}
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

      {/* ── Calendar grid ───────────────────────────────────────────────────── */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-x-auto">
          <table className="w-full border-collapse" style={{ minWidth: 720 }}>
            <thead>
              <tr>
                {/* Empty corner */}
                <th className="w-24 border-r border-b border-[#F5F5F5]" />
                {weekDays.map((day, i) => {
                  const isToday = sameDay(day, today);
                  return (
                    <th key={i} className="border-r border-b border-[#F5F5F5] px-2 py-3 text-center font-normal">
                      <div className={`font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wide mb-1 ${
                        isToday ? "text-[#9D4EDD]" : i >= 5 ? "text-[#C4B5FD]" : "text-[#9CA3AF]"
                      }`}>
                        {DAY_NAMES[i]}
                      </div>
                      <div className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-semibold transition-colors ${
                        isToday
                          ? "bg-[#9D4EDD] text-white"
                          : i >= 5
                          ? "text-[#9CA3AF]"
                          : "text-[#0A0A0A]"
                      }`}>
                        {day.getDate()}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {SLOTS.map(slot => (
                <tr key={slot}>
                  {/* Slot label */}
                  <td className="border-r border-b border-[#F5F5F5] px-3 py-2.5 align-top w-24 bg-white">
                    <p className="text-xs font-semibold text-[#0A0A0A]">{SLOT_META[slot].label}</p>
                    <p className="font-[family-name:var(--font-mono)] text-[10px] text-[#9CA3AF] mt-0.5">
                      {SLOT_META[slot].time}
                    </p>
                  </td>
                  {weekDays.map((_, dayIndex) => (
                    <DroppableCell
                      key={dayIndex}
                      id={`${slot}__${dayIndex}`}
                      events={cellEvents(dayIndex, slot)}
                      onAdd={() => openCreate(dayIndex, slot)}
                      onEdit={openEdit}
                    />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <DragOverlay dropAnimation={null}>
          {draggingEvent && <OverlayEvent event={draggingEvent} />}
        </DragOverlay>
      </DndContext>

      {/* ── Create / Edit modal ──────────────────────────────────────────────── */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setModal(null); }}
        >
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-xl border-2 border-[#0A0A0A] shadow-[0_8px_24px_rgba(0,0,0,0.15)] w-full max-w-sm mx-4 p-6"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#0A0A0A]">
                {modal.mode === "create" ? "Nuevo evento" : "Editar evento"}
              </h3>
              <button type="button" onClick={() => setModal(null)} className="text-[#D1D5DB] hover:text-[#0A0A0A] transition-colors">
                <X size={16} />
              </button>
            </div>

            {modal.mode === "create" && (
              <p className="font-[family-name:var(--font-mono)] text-[10px] text-[#9CA3AF] mb-4">
                {DAY_NAMES[modal.dayIndex!]} · {SLOT_META[modal.slot!].label} ({SLOT_META[modal.slot!].time})
              </p>
            )}

            <label className="block text-xs text-[#6B7280] mb-1.5">Título</label>
            <input
              autoFocus
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); } }}
              placeholder="ej: Reunión, Gym, Cena..."
              className="w-full px-4 py-2.5 rounded-lg border border-[#0A0A0A] bg-[#F5F5F5] text-[#0A0A0A] placeholder-[#D1D5DB] focus:outline-none focus:ring-2 focus:ring-[#9D4EDD] focus:border-[#9D4EDD] text-sm transition-all mb-4"
            />

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

            {/* Toggle recurring */}
            <label className="flex items-center gap-3 cursor-pointer mb-6">
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
