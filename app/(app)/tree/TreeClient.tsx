"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
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
  // Interacción en v2: acento + trazo punteado. El color de zona queda solo como marcador en el panel.
  const common = {
    fill: isHovered ? "color-mix(in srgb, var(--primary) 22%, transparent)" : "transparent",
    stroke: isHovered ? "var(--primary)" : "transparent",
    strokeWidth: 6,
    strokeDasharray: "18 12",
    onMouseEnter,
    onMouseLeave,
    onClick,
    style: { cursor: "pointer", transition: "fill 0.12s ease, stroke 0.12s ease" } as React.CSSProperties,
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
      {...common}
    />
  );
}

const LABEL = "font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase";

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
    <div className="flex min-h-0 flex-col border-2 border-foreground bg-card">
      <div className="flex items-start justify-between gap-3 border-b-2 border-foreground px-4 py-3">
        <div>
          <p className={LABEL}>── {zone.subtitle}</p>
          <h2 className="mt-1 flex items-center gap-2 text-xl font-bold">
            <span aria-hidden className="size-2.5 shrink-0" style={{ backgroundColor: zone.color }} />
            {zone.label}
          </h2>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">{zone.description}</p>
        </div>
        <button onClick={onClose} aria-label="Cerrar zona" className="shrink-0 font-mono text-xs text-muted-foreground hover:text-foreground">
          ✕
        </button>
      </div>

      <div className="flex flex-col gap-3 border-b-2 border-foreground p-4">
        <div className="flex items-center gap-3">
          <label htmlFor="tree-date" className={`${LABEL} shrink-0`}>Fecha</label>
          <input
            id="tree-date"
            type="date"
            value={state.entryDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="flex-1 border-2 border-foreground bg-card px-2 py-1 font-mono text-xs outline-none focus:bg-primary/10"
          />
        </div>
        <textarea
          value={state.body}
          onChange={(e) => onBodyChange(e.target.value)}
          placeholder="Escribí lo que querés registrar…"
          aria-label={`Entrada en ${zone.label}`}
          rows={6}
          className="w-full resize-none border-2 border-foreground bg-card px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:bg-primary/5"
        />
        {state.error && <p role="alert" className="font-mono text-xs text-destructive">✗ {state.error}</p>}
        <button
          onClick={onSave}
          disabled={state.saving || !state.body.trim()}
          className="border-2 border-foreground bg-primary py-2.5 font-mono text-xs tracking-[0.06em] text-primary-foreground uppercase shadow-hard-primary transition-transform duration-100 hover:-translate-x-px hover:-translate-y-px active:translate-x-1 active:translate-y-1 active:shadow-none disabled:pointer-events-none disabled:opacity-40"
        >
          {state.saving ? "Guardando…" : "Guardar"}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <button
          onClick={onToggleHistory}
          aria-expanded={state.showHistory}
          className="flex w-full items-center justify-between px-4 py-3 font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase hover:bg-muted hover:text-foreground"
        >
          <span>Historial ({state.entries.length})</span>
          <span aria-hidden>{state.showHistory ? "▾" : "▸"}</span>
        </button>

        {state.showHistory && (
          <div className="flex flex-col gap-3 px-4 pb-4">
            {state.loading && <p className="font-mono text-xs text-muted-foreground"><span aria-hidden>[▓▓░░] </span>cargando…</p>}
            {!state.loading && state.entries.length === 0 && (
              <p className="font-mono text-xs text-muted-foreground">No hay entradas todavía.</p>
            )}
            {state.entries.map((entry) => (
              <div key={entry.id} className="border-l-2 border-foreground pl-3">
                <p className="mb-1 font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
                  {new Date(entry.entry_date + "T12:00:00").toLocaleDateString("es-AR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{entry.body}</p>
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

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setActive(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active]);

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
  // Orden de lectura para la lista accesible: de arriba hacia abajo del árbol.
  const zoneList = [...ZONES].sort((a, b) => a.labelYpct - b.labelYpct);

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-4 py-7 md:px-6">
      <header>
        <h1 className="text-[40px] leading-none font-bold tracking-[-0.02em]">
          Árbol de la vida<span className="k-cursor">_</span>
        </h1>
        <p className="mt-2 font-mono text-xs text-muted-foreground">9 zonas · tocá una parte del árbol para escribir en ella</p>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[auto_minmax(0,1fr)]">
        <figure className="mx-auto w-fit border-2 border-foreground bg-card">
          <figcaption className="flex items-center justify-between gap-3 border-b-2 border-foreground px-4 py-2.5">
            <span className={LABEL}>── Ilustración</span>
            <span className="font-mono text-[10px] text-muted-foreground">excepción del sistema</span>
          </figcaption>
          <div className="p-3">
            <div className="relative max-w-full" style={{ height: "min(78vh, 700px)", aspectRatio: "1342 / 2000" }}>
              <Image src="/tree.jpg" alt="Árbol de la vida" fill className="object-fill" priority />

              <svg viewBox="0 0 1342 2000" className="absolute inset-0 h-full w-full" aria-hidden>
                {ZONES.map((zone) => (
                  <ZoneShape
                    key={zone.id}
                    zone={zone}
                    isHovered={hovered === zone.id || active?.id === zone.id}
                    onMouseEnter={() => setHovered(zone.id)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => openZone(zone)}
                  />
                ))}
              </svg>

              {hoveredZone && (
                <div
                  className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${hoveredZone.labelXpct}%`, top: `${hoveredZone.labelYpct}%` }}
                >
                  <div className="border-2 border-foreground bg-card px-2.5 py-1.5 text-center whitespace-nowrap shadow-hard">
                    <p className="font-mono text-[11px] leading-none font-bold tracking-wider uppercase">{hoveredZone.label}</p>
                    <p className="mt-1 font-mono text-[9px] leading-none text-muted-foreground">{hoveredZone.subtitle}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </figure>

        {active ? (
          <TreePanel
            zone={active}
            state={panel}
            onBodyChange={(v) => setPanel((s) => ({ ...s, body: v }))}
            onDateChange={(v) => setPanel((s) => ({ ...s, entryDate: v }))}
            onSave={handleSave}
            onClose={() => setActive(null)}
            onToggleHistory={() => setPanel((s) => ({ ...s, showHistory: !s.showHistory }))}
          />
        ) : (
          <nav aria-label="Zonas del árbol" className="border-2 border-foreground bg-card">
            <div className="border-b-2 border-foreground px-4 py-2.5">
              <span className={LABEL}>── Zonas</span>
            </div>
            <ul>
              {zoneList.map((zone) => (
                <li key={zone.id} className="border-b border-muted last:border-b-0">
                  <button
                    type="button"
                    onClick={() => openZone(zone)}
                    onMouseEnter={() => setHovered(zone.id)}
                    onMouseLeave={() => setHovered(null)}
                    onFocus={() => setHovered(zone.id)}
                    onBlur={() => setHovered(null)}
                    className="group flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-muted"
                  >
                    <span aria-hidden className="size-2.5 shrink-0" style={{ backgroundColor: zone.color }} />
                    <span className="flex-1">
                      <span className="block font-bold">{zone.label}</span>
                      <span className="block font-mono text-[11px] text-muted-foreground">{zone.subtitle} · {zone.description}</span>
                    </span>
                    <span aria-hidden className="font-mono text-xs text-muted-foreground group-hover:text-primary">→</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </div>
  );
}
