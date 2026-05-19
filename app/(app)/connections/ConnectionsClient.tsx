"use client";

import { useState } from "react";
import { X } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ConnType = "amigo" | "familia" | "trabajo" | "pareja" | "mentor";

interface Conn {
  id: string;
  name: string;
  initials: string;
  type: ConnType;
  ambito: string;
  closeness: number;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPES: Record<ConnType, { color: string; label: string; dashed: boolean }> = {
  pareja:  { color: "#FF1493", label: "Pareja",   dashed: false },
  familia: { color: "#9D4EDD", label: "Familia",  dashed: false },
  amigo:   { color: "#F472B6", label: "Amigo/a",  dashed: false },
  mentor:  { color: "#F59E0B", label: "Mentor/a", dashed: true  },
  trabajo: { color: "#39FF14", label: "Trabajo",  dashed: true  },
};

// Fewer, representative people
const PEOPLE: Conn[] = [
  { id: "1", name: "Mamá",    initials: "MA", type: "familia", ambito: "Familia",     closeness: 10 },
  { id: "2", name: "Papá",    initials: "PA", type: "familia", ambito: "Familia",     closeness: 10 },
  { id: "3", name: "Hermano", initials: "HE", type: "familia", ambito: "Familia",     closeness: 9  },
  { id: "4", name: "Sofía",   initials: "SO", type: "pareja",  ambito: "Personal",    closeness: 10 },
  { id: "5", name: "Lucas",   initials: "LU", type: "amigo",   ambito: "Macabi",      closeness: 9  },
  { id: "6", name: "Martín",  initials: "MA", type: "amigo",   ambito: "Macabi",      closeness: 8  },
  { id: "7", name: "Flor",    initials: "FL", type: "amigo",   ambito: "Universidad", closeness: 7  },
  { id: "8", name: "Tomás",   initials: "TO", type: "amigo",   ambito: "Universidad", closeness: 6  },
  { id: "9", name: "Carlos",  initials: "CA", type: "mentor",  ambito: "Trabajo",     closeness: 7  },
  { id: "10", name: "Diego",  initials: "DI", type: "trabajo", ambito: "Trabajo",     closeness: 6  },
  { id: "11", name: "Romi",   initials: "RO", type: "amigo",   ambito: "Gym",         closeness: 5  },
];

// ─── Layout ───────────────────────────────────────────────────────────────────

const CX = 450, CY = 345;
const R_AMB = 168; // center → ámbito node
const FAN   = (24 * Math.PI) / 180; // angle between people in same ámbito

function buildLayout(people: Conn[]) {
  const ambitoMap: Record<string, Conn[]> = {};
  people.forEach(c => {
    if (!ambitoMap[c.ambito]) ambitoMap[c.ambito] = [];
    ambitoMap[c.ambito].push(c);
  });

  const ambs = Object.keys(ambitoMap);

  const ambPos: Record<string, { x: number; y: number; angle: number }> = {};
  const pPos:   Record<string, { x: number; y: number }> = {};

  ambs.forEach((amb, i) => {
    const a = (i / ambs.length) * 2 * Math.PI - Math.PI / 2;
    ambPos[amb] = { x: CX + R_AMB * Math.cos(a), y: CY + R_AMB * Math.sin(a), angle: a };

    const grp  = ambitoMap[amb];
    const half = ((grp.length - 1) / 2) * FAN;
    const rOut = 88 + grp.length * 12;

    grp.forEach((c, pi) => {
      const pa = a - half + pi * FAN;
      pPos[c.id] = {
        x: CX + (R_AMB + rOut) * Math.cos(pa),
        y: CY + (R_AMB + rOut) * Math.sin(pa),
      };
    });
  });

  return { ambitoMap, ambs, ambPos, pPos };
}

const LAYOUT = buildLayout(PEOPLE);

// Trim a line: start r1 from (x1,y1), end r2 before (x2,y2)
function seg(x1: number, y1: number, x2: number, y2: number, r1: number, r2: number) {
  const dx = x2 - x1, dy = y2 - y1;
  const d  = Math.sqrt(dx * dx + dy * dy);
  const ux = dx / d,  uy = dy / d;
  return { x1: x1 + ux * r1, y1: y1 + uy * r1, x2: x2 - ux * r2, y2: y2 - uy * r2 };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ConnectionsClient() {
  const [selected,  setSelected]  = useState<Conn | null>(null);
  const [activeAmb, setActiveAmb] = useState<string | null>(null);
  const [stickyAmb, setStickyAmb] = useState<string | null>(null);

  const highlight = stickyAmb ?? activeAmb;
  const litAmb  = (a: string) => !highlight || a === highlight;
  const litConn = (c: Conn)   => !highlight || c.ambito === highlight;

  const { ambitoMap, ambs, ambPos, pPos } = LAYOUT;

  return (
    <div className="min-h-screen bg-white flex flex-col overflow-hidden">
      <style>{`
        @keyframes kp-float {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-5px); }
        }
        @keyframes kp-pulse {
          0%   { transform: scale(1);   opacity: 0.42; }
          100% { transform: scale(2.6); opacity: 0;    }
        }
        .kp-pulse {
          transform-box: fill-box;
          transform-origin: center;
          animation: kp-pulse ease-out infinite;
        }
      `}</style>

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="px-8 pt-10 pb-2 flex items-start justify-between shrink-0">
        <div>
          <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[#0A0A0A]">
            Vínculos
          </h1>
          <p className="font-[family-name:var(--font-mono)] text-xs text-[#9CA3AF] mt-1">
            {PEOPLE.length} personas · {ambs.length} ámbitos
          </p>
        </div>

        {/* Type legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 max-w-xs justify-end pt-1.5">
          {(Object.entries(TYPES) as [ConnType, (typeof TYPES)[ConnType]][]).map(([t, cfg]) => (
            <div key={t} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: cfg.color }} />
              <span className="font-[family-name:var(--font-mono)] text-[9px] text-[#9CA3AF]">
                {cfg.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Graph ───────────────────────────────────────────── */}
      <div className="flex-1 relative">
        <svg viewBox="0 0 900 690" className="w-full" style={{ maxHeight: "calc(100vh - 170px)" }}>
          <defs>
            <marker id="arr-dark" markerWidth="7" markerHeight="6" refX="6" refY="3" orient="auto">
              <polygon points="0 0, 7 3, 0 6" fill="#0A0A0A" opacity="0.45" />
            </marker>
            {(Object.entries(TYPES) as [ConnType, (typeof TYPES)[ConnType]][]).map(([t, cfg]) => (
              <marker key={t} id={`arr-${t}`} markerWidth="7" markerHeight="6" refX="6" refY="3" orient="auto">
                <polygon points="0 0, 7 3, 0 6" fill={cfg.color} opacity="0.75" />
              </marker>
            ))}
          </defs>

          {/* Center → ámbito arrows */}
          {ambs.map(amb => {
            const ap  = ambPos[amb];
            const lit = litAmb(amb);
            const s   = seg(CX, CY, ap.x, ap.y, 32, 22);
            return (
              <line
                key={`ca-${amb}`}
                x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
                stroke="#0A0A0A"
                strokeWidth={lit ? 1.2 : 0.4}
                strokeOpacity={lit ? 0.38 : 0.05}
                markerEnd="url(#arr-dark)"
                style={{ transition: "stroke-opacity 0.25s, stroke-width 0.25s" }}
              />
            );
          })}

          {/* Ámbito → person arrows */}
          {PEOPLE.map(c => {
            const ap  = ambPos[c.ambito];
            const pp  = pPos[c.id];
            const cfg = TYPES[c.type];
            const lit = litConn(c);
            const s   = seg(ap.x, ap.y, pp.x, pp.y, 23, 17);
            return (
              <line
                key={`ap-${c.id}`}
                x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
                stroke={cfg.color}
                strokeWidth={lit ? 0.8 + c.closeness * 0.1 : 0.3}
                strokeOpacity={lit ? 0.22 + (c.closeness / 10) * 0.58 : 0.04}
                strokeDasharray={cfg.dashed ? "5 4" : undefined}
                markerEnd={`url(#arr-${c.type})`}
                style={{ transition: "stroke-opacity 0.25s, stroke-width 0.25s" }}
              />
            );
          })}

          {/* ── User center node ── */}
          <circle cx={CX} cy={CY} r={30} fill="#0A0A0A" />
          <circle cx={CX} cy={CY} r={37} fill="none" stroke="#0A0A0A" strokeWidth={1} opacity={0.09} />
          <text
            x={CX} y={CY + 1}
            textAnchor="middle" dominantBaseline="middle"
            fill="white" fontSize={10}
            fontFamily="var(--font-mono)"
            fontWeight={600} letterSpacing={1}
          >
            TÚ
          </text>

          {/* ── Ámbito nodes (rounded squares) ── */}
          {ambs.map(amb => {
            const ap    = ambPos[amb];
            const lit   = litAmb(amb);
            const stuck = stickyAmb === amb;
            const abbr  = amb.length <= 4 ? amb.toUpperCase() : amb.slice(0, 3).toUpperCase();
            return (
              <g
                key={amb}
                transform={`translate(${ap.x}, ${ap.y})`}
                style={{ opacity: lit ? 1 : 0.12, transition: "opacity 0.25s", cursor: "pointer" }}
                onClick={() => setStickyAmb(s => (s === amb ? null : amb))}
                onMouseEnter={() => { if (!stickyAmb) setActiveAmb(amb); }}
                onMouseLeave={() => { if (!stickyAmb) setActiveAmb(null); }}
              >
                <rect
                  x={-19} y={-19} width={38} height={38} rx={9} ry={9}
                  fill={stuck ? "#0A0A0A" : "white"}
                  stroke="#0A0A0A"
                  strokeWidth={stuck ? 0 : 1.5}
                />
                <text
                  textAnchor="middle" dominantBaseline="middle"
                  fill={stuck ? "white" : "#0A0A0A"}
                  fontSize={9}
                  fontFamily="var(--font-mono)"
                  fontWeight={600}
                  letterSpacing={0.5}
                >
                  {abbr}
                </text>
                <text
                  y={29}
                  textAnchor="middle"
                  fill="#9CA3AF"
                  fontSize={7.5}
                  fontFamily="var(--font-mono)"
                >
                  {amb}
                </text>
              </g>
            );
          })}

          {/* ── Person nodes ── */}
          {PEOPLE.map((c, idx) => {
            const pp    = pPos[c.id];
            const cfg   = TYPES[c.type];
            const r     = 13 + c.closeness * 0.9;
            const lit   = litConn(c);
            const isSel = selected?.id === c.id;
            const dur   = `${2.5 + (idx % 5) * 0.36}s`;
            const del   = `${(idx * 0.43) % 2.8}s`;

            return (
              <g
                key={c.id}
                transform={`translate(${pp.x}, ${pp.y})`}
                style={{ opacity: lit ? 1 : 0.08, transition: "opacity 0.25s", cursor: "pointer" }}
                onClick={() => setSelected(isSel ? null : c)}
                onMouseEnter={() => { if (!stickyAmb) setActiveAmb(c.ambito); }}
                onMouseLeave={() => { if (!stickyAmb) setActiveAmb(null); }}
              >
                <g style={{ animation: `kp-float ${dur} ease-in-out ${del} infinite` }}>

                  {/* Pulse ring for very close nodes */}
                  {c.closeness >= 9 && (
                    <circle
                      className="kp-pulse"
                      r={r}
                      fill={cfg.color}
                      style={{ animationDuration: `${1.9 + idx * 0.17}s`, animationDelay: del }}
                    />
                  )}

                  {/* Soft glow */}
                  {c.closeness >= 7 && (
                    <circle r={r + 5} fill={cfg.color} opacity={0.09} />
                  )}

                  {/* Selection ring */}
                  {isSel && (
                    <circle r={r + 6} fill="none" stroke={cfg.color} strokeWidth={1.5} opacity={0.55} />
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
                    textAnchor="middle" dominantBaseline="middle"
                    fill={cfg.color}
                    fontSize={Math.max(7.5, r * 0.52)}
                    fontFamily="var(--font-playfair)"
                    fontWeight={700}
                  >
                    {c.initials}
                  </text>

                  {/* Name */}
                  <text
                    y={r + 12}
                    textAnchor="middle"
                    fill="#374151"
                    fontSize={8}
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
                  background: TYPES[selected.type].color + "22",
                  color: TYPES[selected.type].color,
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
                  style={{ color: TYPES[selected.type].color }}
                >
                  {TYPES[selected.type].label}
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
                      background: TYPES[selected.type].color,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Ámbito filter chips ── */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 flex-wrap justify-center px-6">
          {ambs.map(amb => (
            <button
              key={amb}
              onClick={() => setStickyAmb(s => (s === amb ? null : amb))}
              onMouseEnter={() => { if (!stickyAmb) setActiveAmb(amb); }}
              onMouseLeave={() => { if (!stickyAmb) setActiveAmb(null); }}
              className={`px-3 py-1 rounded-full font-[family-name:var(--font-mono)] text-[9px] border transition-all ${
                stickyAmb === amb
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
