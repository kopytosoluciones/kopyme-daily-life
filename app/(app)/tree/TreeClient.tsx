"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { X, ChevronDown, ChevronUp } from "lucide-react";
import { saveTreeEntry, getTreeEntries, type TreeEntry } from "./actions";

type ShapeData =
  | { type: "ellipse"; cx: number; cy: number; rx: number; ry: number }
  | { type: "rect"; x: number; y: number; width: number; height: number; rx?: number };

type Zone = {
  id: string;
  label: string;
  subtitle: string;
  description: string;
  color: string;
  shape: ShapeData;
  labelXpct: number;
  labelYpct: number;
};

type PanelState = {
  body: string;
  entryDate: string;
  saving: boolean;
  entries: TreeEntry[];
  loading: boolean;
  showHistory: boolean;
  error: string | null;
};

function todayArg(): string {
  return new Date().toLocaleDateString("sv-SE", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

// Coordinates are in 1342×2000 SVG units (matching image natural size)
// Ordered background → foreground so smaller zones receive clicks first
const ZONES: Zone[] = [
  {
    id: "ramas",
    label: "Ramas",
    subtitle: "Proyecciones",
    description: "Trabajo · Académico · Finanzas · Proyectos",
    color: "#22c55e",
    shape: { type: "ellipse", cx: 671, cy: 660, rx: 640, ry: 590 },
    labelXpct: 41, labelYpct: 5,
  },
  {
    id: "viento",
    label: "Viento",
    subtitle: "Lo Inesperado",
    description: "Reacciones · Cambio · Reflexión",
    color: "#94a3b8",
    shape: { type: "ellipse", cx: 130, cy: 1110, rx: 145, ry: 320 },
    labelXpct: 9, labelYpct: 40,
  },
  {
    id: "raices",
    label: "Raíces",
    subtitle: "Autoconocimiento",
    description: "Propósito · Reacciones · Mejora continua",
    color: "#9D4EDD",
    shape: { type: "ellipse", cx: 671, cy: 1830, rx: 650, ry: 170 },
    labelXpct: 50, labelYpct: 89,
  },
  {
    id: "hojas_caidas",
    label: "Hojas Caídas",
    subtitle: "Lo que dejo ir",
    description: "Reflexión sobre lo que suelto",
    color: "#ca8a04",
    shape: { type: "ellipse", cx: 530, cy: 1590, rx: 500, ry: 105 },
    labelXpct: 39, labelYpct: 77,
  },
  {
    id: "animales",
    label: "Animales",
    subtitle: "Entretenimiento",
    description: "Viajes · Eventos · Arte · Fiestas",
    color: "#f97316",
    shape: { type: "ellipse", cx: 671, cy: 1410, rx: 530, ry: 108 },
    labelXpct: 50, labelYpct: 69,
  },
  {
    id: "flores_frutos",
    label: "Flores & Frutos",
    subtitle: "Objetivos",
    description: "Metas · Logros · Aspiraciones",
    color: "#ec4899",
    shape: { type: "ellipse", cx: 440, cy: 785, rx: 235, ry: 208 },
    labelXpct: 33, labelYpct: 32,
  },
  {
    id: "tronco",
    label: "Tronco",
    subtitle: "Hábitos",
    description: "Alimentación · Ejercicio · Sueño · Medidas",
    color: "#92400e",
    shape: { type: "rect", x: 585, y: 1048, width: 190, height: 405, rx: 10 },
    labelXpct: 50, labelYpct: 62,
  },
  {
    id: "regadera",
    label: "Regadera",
    subtitle: "Vínculos",
    description: "Familia · Amigos · Pareja · Comunidad",
    color: "#0ea5e9",
    shape: { type: "ellipse", cx: 1215, cy: 1455, rx: 100, ry: 88 },
    labelXpct: 91, labelYpct: 72,
  },
  {
    id: "sol",
    label: "Sol",
    subtitle: "Salud",
    description: "Médicos · Estudios · Nutrición",
    color: "#fbbf24",
    shape: { type: "ellipse", cx: 1240, cy: 158, rx: 138, ry: 132 },
    labelXpct: 92, labelYpct: 7,
  },
];

function ZoneShape({
  zone,
  isHovered,
  onMouseEnter,
  onMouseLeave,
  onClick,
}: {
  zone: Zone;
  isHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
}) {
  const fill = isHovered ? zone.color + "4d" : "transparent";
  const stroke = isHovered ? zone.color : "transparent";
  const common = {
    fill,
    stroke,
    strokeWidth: 3,
    onMouseEnter,
    onMouseLeave,
    onClick,
    style: { cursor: "pointer", transition: "fill 0.15s ease, stroke 0.15s ease" } as React.CSSProperties,
  };
  const { shape } = zone;
  if (shape.type === "ellipse") {
    return <ellipse cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} {...common} />;
  }
  return (
    <rect
      x={shape.x}
      y={shape.y}
      width={shape.width}
      height={shape.height}
      rx={shape.rx ?? 0}
      {...common}
    />
  );
}

function TreePanel({
  zone,
  state,
  onBodyChange,
  onDateChange,
  onSave,
  onClose,
  onToggleHistory,
}: {
  zone: Zone;
  state: PanelState;
  onBodyChange: (v: string) => void;
  onDateChange: (v: string) => void;
  onSave: () => void;
  onClose: () => void;
  onToggleHistory: () => void;
}) {
  return (
    <div className="w-[380px] shrink-0 h-full flex flex-col border-l border-[#E5E7EB] bg-white overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-[#9CA3AF] mb-0.5">
            {zone.subtitle}
          </p>
          <h2
            className="font-[family-name:var(--font-playfair)] text-xl font-bold"
            style={{ color: zone.color }}
          >
            {zone.label}
          </h2>
          <p className="text-xs text-[#9CA3AF] mt-1">{zone.description}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-[#F5F5F5] text-[#9CA3AF] hover:text-[#0A0A0A] transition-colors shrink-0 mt-0.5"
        >
          <X size={16} />
        </button>
      </div>

      {/* Form */}
      <div className="p-5 flex flex-col gap-3 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-3">
          <label className="font-mono text-[10px] uppercase tracking-widest text-[#6B7280] shrink-0">
            Fecha
          </label>
          <input
            type="date"
            value={state.entryDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="flex-1 text-sm border border-[#E5E7EB] rounded-lg px-3 py-1.5 text-[#0A0A0A] focus:outline-none focus:ring-1 focus:ring-[#9D4EDD] transition-shadow"
          />
        </div>
        <textarea
          value={state.body}
          onChange={(e) => onBodyChange(e.target.value)}
          placeholder="Escribí lo que querés registrar..."
          rows={6}
          className="w-full text-sm border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-[#0A0A0A] placeholder:text-[#D1D5DB] focus:outline-none focus:ring-1 focus:ring-[#9D4EDD] resize-none transition-shadow"
        />
        {state.error && (
          <p className="text-xs text-red-500">{state.error}</p>
        )}
        <button
          onClick={onSave}
          disabled={state.saving || !state.body.trim()}
          className="w-full py-2.5 rounded-lg text-sm font-medium bg-[#0A0A0A] text-white hover:bg-[#222] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {state.saving ? "Guardando..." : "Guardar"}
        </button>
      </div>

      {/* History */}
      <div className="flex-1 overflow-y-auto">
        <button
          onClick={onToggleHistory}
          className="w-full px-5 py-3 flex items-center justify-between text-[11px] font-mono uppercase tracking-widest text-[#6B7280] hover:bg-[#F5F5F5] transition-colors"
        >
          <span>Historial ({state.entries.length})</span>
          {state.showHistory ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        {state.showHistory && (
          <div className="px-5 pb-5 space-y-3">
            {state.loading && (
              <p className="text-xs text-[#9CA3AF]">Cargando...</p>
            )}
            {!state.loading && state.entries.length === 0 && (
              <p className="text-xs text-[#9CA3AF]">No hay entradas todavía.</p>
            )}
            {state.entries.map((entry) => (
              <div key={entry.id} className="border border-[#E5E7EB] rounded-xl p-3.5">
                <p className="font-mono text-[10px] uppercase tracking-widest text-[#9CA3AF] mb-1.5">
                  {new Date(entry.entry_date + "T12:00:00").toLocaleDateString("es-AR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                <p className="text-sm text-[#374151] leading-relaxed whitespace-pre-wrap">
                  {entry.body}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TreeClient() {
  const [hovered, setHovered] = useState<string | null>(null);
  const [active, setActive] = useState<Zone | null>(null);
  const [panel, setPanel] = useState<PanelState>({
    body: "",
    entryDate: todayArg(),
    saving: false,
    entries: [],
    loading: false,
    showHistory: false,
    error: null,
  });

  const openZone = useCallback(async (zone: Zone) => {
    setActive(zone);
    setPanel({
      body: "",
      entryDate: todayArg(),
      saving: false,
      entries: [],
      loading: true,
      showHistory: false,
      error: null,
    });
    const { entries, error } = await getTreeEntries(zone.id);
    setPanel((s) => ({ ...s, loading: false, entries: entries ?? [], error: error ?? null }));
  }, []);

  const handleSave = async () => {
    if (!active || !panel.body.trim()) return;
    setPanel((s) => ({ ...s, saving: true, error: null }));
    const { error } = await saveTreeEntry(active.id, panel.body, panel.entryDate);
    if (!error) {
      const { entries } = await getTreeEntries(active.id);
      setPanel((s) => ({
        ...s,
        saving: false,
        body: "",
        entries: entries ?? [],
        showHistory: true,
        error: null,
      }));
    } else {
      setPanel((s) => ({ ...s, saving: false, error }));
    }
  };

  const hoveredZone = ZONES.find((z) => z.id === hovered);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Tree canvas */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div
          className="relative"
          style={{ height: "min(85vh, 740px)", aspectRatio: "1342 / 2000" }}
        >
          <Image
            src="/tree.jpg"
            alt="Árbol de la vida"
            fill
            className="object-fill rounded-2xl shadow-md"
            priority
          />

          {/* SVG zone overlay */}
          <svg
            viewBox="0 0 1342 2000"
            className="absolute inset-0 w-full h-full rounded-2xl"
          >
            {ZONES.map((zone) => (
              <ZoneShape
                key={zone.id}
                zone={zone}
                isHovered={hovered === zone.id}
                onMouseEnter={() => setHovered(zone.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => openZone(zone)}
              />
            ))}
          </svg>

          {/* HTML label overlay — renders over SVG, no pointer events */}
          {hoveredZone && (
            <div
              className="absolute pointer-events-none z-10 -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${hoveredZone.labelXpct}%`,
                top: `${hoveredZone.labelYpct}%`,
              }}
            >
              <div className="bg-black/85 text-white px-3 py-2 rounded-xl text-center shadow-lg whitespace-nowrap">
                <p className="font-mono text-[11px] font-bold tracking-wider leading-none">
                  {hoveredZone.label}
                </p>
                <p className="font-mono text-[9px] text-white/60 mt-1 leading-none">
                  {hoveredZone.subtitle}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Side panel */}
      {active && (
        <TreePanel
          zone={active}
          state={panel}
          onBodyChange={(v) => setPanel((s) => ({ ...s, body: v }))}
          onDateChange={(v) => setPanel((s) => ({ ...s, entryDate: v }))}
          onSave={handleSave}
          onClose={() => setActive(null)}
          onToggleHistory={() =>
            setPanel((s) => ({ ...s, showHistory: !s.showHistory }))
          }
        />
      )}
    </div>
  );
}
