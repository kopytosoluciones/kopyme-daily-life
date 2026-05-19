"use client";

import { useState } from "react";
import { X } from "lucide-react";

type ConnectionType = "amigo" | "familia" | "trabajo" | "pareja" | "conocido" | "mentor";

interface Connection {
  id: string;
  name: string;
  initials: string;
  type: ConnectionType;
  ambito: string;
  closeness: number;
}

const TYPE: Record<ConnectionType, { color: string; label: string; dashed: boolean }> = {
  pareja:   { color: "#FF1493", label: "Pareja",      dashed: false },
  familia:  { color: "#9D4EDD", label: "Familia",     dashed: false },
  amigo:    { color: "#F472B6", label: "Amigo/a",     dashed: false },
  mentor:   { color: "#F59E0B", label: "Mentor/a",    dashed: true  },
  trabajo:  { color: "#39FF14", label: "Trabajo",     dashed: true  },
  conocido: { color: "#9CA3AF", label: "Conocido/a",  dashed: true  },
};

const DATA: Connection[] = [
  // Ring 1 — closeness >= 8
  { id: "1",  name: "Mamá",    initials: "MA", type: "familia",  ambito: "Familia",     closeness: 10 },
  { id: "2",  name: "Papá",    initials: "PA", type: "familia",  ambito: "Familia",     closeness: 10 },
  { id: "3",  name: "Sofía",   initials: "SO", type: "pareja",   ambito: "Personal",    closeness: 10 },
  { id: "4",  name: "Lucas",   initials: "LU", type: "amigo",    ambito: "Macabi",      closeness: 9  },
  { id: "5",  name: "Hermano", initials: "HE", type: "familia",  ambito: "Familia",     closeness: 9  },
  { id: "6",  name: "Abuelo",  initials: "AB", type: "familia",  ambito: "Familia",     closeness: 8  },
  { id: "7",  name: "Martín",  initials: "MA", type: "amigo",    ambito: "Macabi",      closeness: 8  },
  // Ring 2 — closeness 5–7
  { id: "8",  name: "Dani",    initials: "DA", type: "amigo",    ambito: "Macabi",      closeness: 7  },
  { id: "9",  name: "Flor",    initials: "FL", type: "amigo",    ambito: "Universidad", closeness: 7  },
  { id: "10", name: "Carlos",  initials: "CA", type: "mentor",   ambito: "Trabajo",     closeness: 7  },
  { id: "11", name: "Tomás",   initials: "TO", type: "amigo",    ambito: "Universidad", closeness: 6  },
  { id: "12", name: "Diego",   initials: "DI", type: "trabajo",  ambito: "Trabajo",     closeness: 6  },
  { id: "13", name: "Ana",     initials: "AN", type: "trabajo",  ambito: "Trabajo",     closeness: 5  },
  { id: "14", name: "Romi",    initials: "RO", type: "amigo",    ambito: "Gym",         closeness: 5  },
  // Ring 3 — closeness < 5
  { id: "15", name: "Iñaki",   initials: "IN", type: "amigo",    ambito: "Gym",         closeness: 4  },
  { id: "16", name: "Nico",    initials: "NI", type: "amigo",    ambito: "Universidad", closeness: 4  },
  { id: "17", name: "Vicky",   initials: "VI", type: "conocido", ambito: "Macabi",      closeness: 3  },
  { id: "18", name: "Bruno",   initials: "BR", type: "conocido", ambito: "Trabajo",     closeness: 2  },
];

const CX = 450;
const CY = 340;
const RADII = [148, 245, 350];
const RING_OFFSETS = [0, Math.PI / 5, Math.PI / 11];

function computePositions(data: Connection[]) {
  const rings = [
    data.filter(c => c.closeness >= 8),
    data.filter(c => c.closeness >= 5 && c.closeness < 8),
    data.filter(c => c.closeness < 5),
  ];
  const positions: Record<string, { x: number; y: number }> = {};
  rings.forEach((ring, ri) => {
    ring.forEach((c, i) => {
      const angle =
        (i / ring.length) * 2 * Math.PI - Math.PI / 2 + RING_OFFSETS[ri];
      positions[c.id] = {
        x: CX + RADII[ri] * Math.cos(angle),
        y: CY + RADII[ri] * Math.sin(angle),
      };
    });
  });
  return positions;
}

const POSITIONS = computePositions(DATA);
const AMBITOS = [...new Set(DATA.map(c => c.ambito))];

export default function ConnectionsClient() {
  const [selected, setSelected]         = useState<Connection | null>(null);
  const [hoverAmbito, setHoverAmbito]   = useState<string | null>(null);
  const [filterAmbito, setFilterAmbito] = useState<string | null>(null);

  const activeAmbito = filterAmbito ?? hoverAmbito;
  const isLit = (c: Connection) => !activeAmbito || c.ambito === activeAmbito;

  return (
    <div className="min-h-screen bg-white flex flex-col overflow-hidden">
      <style>{`
        @keyframes kp-float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-5px); }
        }
        @keyframes kp-pulse {
          0%   { r: 0; opacity: 0.45; }
          100% { r: 22; opacity: 0; }
        }
        .kp-pulse-el { animation-name: kp-pulse; animation-timing-function: ease-out; animation-iteration-count: infinite; }
      `}</style>

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="px-8 pt-10 pb-2 flex items-start justify-between shrink-0">
        <div>
          <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[#0A0A0A]">
            Vínculos
          </h1>
          <p className="font-[family-name:var(--font-mono)] text-xs text-[#9CA3AF] mt-1">
            {DATA.length} personas en tu red
          </p>
        </div>

        {/* Type legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 max-w-xs justify-end pt-1.5">
          {(Object.entries(TYPE) as [ConnectionType, (typeof TYPE)[ConnectionType]][]).map(
            ([t, cfg]) => (
              <div key={t} className="flex items-center gap-1.5">
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: cfg.color }}
                />
                <span className="font-[family-name:var(--font-mono)] text-[9px] text-[#9CA3AF]">
                  {cfg.label}
                </span>
              </div>
            )
          )}
        </div>
      </div>

      {/* ── Graph ────────────────────────────────────────────── */}
      <div className="flex-1 relative">
        <svg
          viewBox="0 0 900 680"
          className="w-full"
          style={{ maxHeight: "calc(100vh - 170px)" }}
        >
          {/* Ring guides */}
          {RADII.map(r => (
            <circle
              key={r}
              cx={CX} cy={CY} r={r}
              fill="none"
              stroke="#E5E7EB"
              strokeWidth={0.8}
              strokeDasharray="3 9"
              opacity={0.55}
            />
          ))}

          {/* Connection lines */}
          {DATA.map(c => {
            const p   = POSITIONS[c.id];
            const cfg = TYPE[c.type];
            const lit = isLit(c);
            return (
              <line
                key={`l-${c.id}`}
                x1={CX} y1={CY}
                x2={p.x} y2={p.y}
                stroke={cfg.color}
                strokeWidth={lit ? 0.7 + c.closeness * 0.13 : 0.4}
                strokeOpacity={lit ? 0.14 + (c.closeness / 10) * 0.66 : 0.04}
                strokeDasharray={cfg.dashed ? "5 5" : undefined}
                style={{ transition: "stroke-opacity 0.25s, stroke-width 0.25s" }}
              />
            );
          })}

          {/* ── Center — user node ── */}
          <circle cx={CX} cy={CY} r={30} fill="#0A0A0A" />
          <circle cx={CX} cy={CY} r={36} fill="none" stroke="#0A0A0A" strokeWidth={1} opacity={0.1} />
          <text
            x={CX} y={CY + 1}
            textAnchor="middle" dominantBaseline="middle"
            fill="white" fontSize={10}
            fontFamily="var(--font-mono)"
            fontWeight={600}
            letterSpacing={1}
          >
            TÚ
          </text>

          {/* ── Person nodes ── */}
          {DATA.map((c, idx) => {
            const p      = POSITIONS[c.id];
            const cfg    = TYPE[c.type];
            const r      = 13 + c.closeness * 1.35;
            const lit    = isLit(c);
            const isSel  = selected?.id === c.id;
            const dur    = `${2.6 + (idx % 5) * 0.38}s`;
            const delay  = `${(idx * 0.43) % 2.9}s`;
            const pDur   = `${1.9 + idx * 0.17}s`;

            return (
              <g
                key={c.id}
                transform={`translate(${p.x}, ${p.y})`}
                style={{
                  opacity: lit ? 1 : 0.1,
                  transition: "opacity 0.28s",
                  cursor: "pointer",
                }}
                onClick={() => setSelected(isSel ? null : c)}
                onMouseEnter={() => { if (!filterAmbito) setHoverAmbito(c.ambito); }}
                onMouseLeave={() => { if (!filterAmbito) setHoverAmbito(null); }}
              >
                {/* Float wrapper */}
                <g style={{
                  animation: `kp-float ${dur} ease-in-out ${delay} infinite`,
                }}>
                  {/* Pulse for very close nodes */}
                  {c.closeness >= 9 && (
                    <circle
                      className="kp-pulse-el"
                      cx={0} cy={0}
                      fill={cfg.color}
                      style={{ animationDuration: pDur, animationDelay: delay }}
                    />
                  )}

                  {/* Outer glow for close nodes */}
                  {c.closeness >= 7 && (
                    <circle r={r + 5} fill={cfg.color} opacity={0.09} />
                  )}

                  {/* Selection ring */}
                  {isSel && (
                    <circle
                      r={r + 6}
                      fill="none"
                      stroke={cfg.color}
                      strokeWidth={1.5}
                      opacity={0.65}
                    />
                  )}

                  {/* Main circle */}
                  <circle
                    r={r}
                    fill={cfg.color}
                    fillOpacity={0.12}
                    stroke={cfg.color}
                    strokeWidth={isSel ? 2 : 1.5}
                  />

                  {/* Initials */}
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={cfg.color}
                    fontSize={Math.max(8, r * 0.52)}
                    fontFamily="var(--font-playfair)"
                    fontWeight={700}
                  >
                    {c.initials}
                  </text>

                  {/* Name label */}
                  <text
                    y={r + 12}
                    textAnchor="middle"
                    fill="#374151"
                    fontSize={8.5}
                    fontFamily="var(--font-mono)"
                    opacity={0.72}
                  >
                    {c.name}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>

        {/* ── Detail card ── */}
        {selected && (
          <div className="absolute top-3 right-3 w-52 bg-white border-2 border-[#0A0A0A] rounded-xl p-4 shadow-xl z-10">
            <button
              onClick={() => setSelected(null)}
              className="absolute top-3 right-3 text-[#9CA3AF] hover:text-[#0A0A0A] transition-colors"
            >
              <X size={13} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                style={{
                  background: TYPE[selected.type].color + "22",
                  color: TYPE[selected.type].color,
                  fontFamily: "var(--font-playfair)",
                }}
              >
                {selected.initials}
              </div>
              <div>
                <p className="font-[family-name:var(--font-playfair)] font-bold text-[#0A0A0A] text-sm leading-tight">
                  {selected.name}
                </p>
                <p className="font-[family-name:var(--font-mono)] text-[9px] text-[#9CA3AF] mt-0.5">
                  {selected.ambito}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-[family-name:var(--font-mono)] text-[9px] text-[#9CA3AF] uppercase tracking-wide">
                  tipo
                </span>
                <span
                  className="font-[family-name:var(--font-mono)] text-[10px] font-medium"
                  style={{ color: TYPE[selected.type].color }}
                >
                  {TYPE[selected.type].label}
                </span>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="font-[family-name:var(--font-mono)] text-[9px] text-[#9CA3AF] uppercase tracking-wide">
                    cercanía
                  </span>
                  <span className="font-[family-name:var(--font-mono)] text-[10px] font-bold text-[#0A0A0A]">
                    {selected.closeness}/10
                  </span>
                </div>
                <div className="h-1 rounded-full bg-[#F3F4F6] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${selected.closeness * 10}%`,
                      background: TYPE[selected.type].color,
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-[family-name:var(--font-mono)] text-[9px] text-[#9CA3AF] uppercase tracking-wide">
                  anillo
                </span>
                <span className="font-[family-name:var(--font-mono)] text-[10px] text-[#0A0A0A]">
                  {selected.closeness >= 8
                    ? "cercano"
                    : selected.closeness >= 5
                    ? "medio"
                    : "lejano"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── Ámbito filter chips ── */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 flex-wrap justify-center px-6">
          {AMBITOS.map(amb => (
            <button
              key={amb}
              onClick={() => setFilterAmbito(f => (f === amb ? null : amb))}
              onMouseEnter={() => { if (!filterAmbito) setHoverAmbito(amb); }}
              onMouseLeave={() => { if (!filterAmbito) setHoverAmbito(null); }}
              className={`px-3 py-1 rounded-full font-[family-name:var(--font-mono)] text-[9px] border transition-all ${
                filterAmbito === amb
                  ? "bg-[#0A0A0A] text-white border-[#0A0A0A]"
                  : "bg-white text-[#6B7280] border-[#E5E7EB] hover:border-[#0A0A0A] hover:text-[#0A0A0A]"
              }`}
            >
              {amb}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
