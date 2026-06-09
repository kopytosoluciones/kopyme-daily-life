"use client";

import { useState, useEffect } from "react";
import { X, Plus, Pencil, Trash2, Users, Star, Clock } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Branch {
  id: string;
  name: string;
  color: string;
}

interface Person {
  id: string;
  name: string;
  branchId: string;
  affinity: number; // 1–10
  notes?: string;
  lastContact?: string; // YYYY-MM-DD
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "kopyme-connections-v1";

const BRANCH_COLORS = [
  "#9D4EDD", "#FF1493", "#F472B6", "#F59E0B", "#39FF14",
  "#06B6D4", "#EF4444", "#8B5CF6", "#F97316", "#0A0A0A",
];

const AFFINITY_LABELS = [
  "", "conocido", "conocido", "conocido",
  "vínculo", "vínculo", "vínculo",
  "cercano", "cercano", "muy cercano", "íntimo",
];

const SEED_BRANCHES: Branch[] = [
  { id: "b1", name: "Familia",     color: "#9D4EDD" },
  { id: "b2", name: "Personal",    color: "#FF1493" },
  { id: "b3", name: "Universidad", color: "#F472B6" },
  { id: "b4", name: "Trabajo",     color: "#39FF14" },
  { id: "b5", name: "Gym",         color: "#F59E0B" },
  { id: "b6", name: "Macabi",      color: "#06B6D4" },
];

const SEED_PEOPLE: Person[] = [
  { id: "p1",  name: "Mamá",    branchId: "b1", affinity: 10 },
  { id: "p2",  name: "Papá",    branchId: "b1", affinity: 10 },
  { id: "p3",  name: "Hermano", branchId: "b1", affinity: 9  },
  { id: "p4",  name: "Sofía",   branchId: "b2", affinity: 10 },
  { id: "p5",  name: "Lucas",   branchId: "b6", affinity: 9  },
  { id: "p6",  name: "Martín",  branchId: "b6", affinity: 8  },
  { id: "p7",  name: "Flor",    branchId: "b3", affinity: 7  },
  { id: "p8",  name: "Tomás",   branchId: "b3", affinity: 6  },
  { id: "p9",  name: "Carlos",  branchId: "b4", affinity: 7  },
  { id: "p10", name: "Diego",   branchId: "b4", affinity: 6  },
  { id: "p11", name: "Romi",    branchId: "b5", affinity: 5  },
];

// ─── Layout helpers ───────────────────────────────────────────────────────────

const CX = 450, CY = 340;
const R_BRANCH = 155;

function nodeRadius(affinity: number) {
  return 12 + affinity * 1.3;
}

function buildBranchMap(branches: Branch[], people: Person[]): Record<string, Person[]> {
  const map: Record<string, Person[]> = {};
  branches.forEach(b => { map[b.id] = []; });
  people.forEach(p => {
    if (map[p.branchId]) map[p.branchId].push(p);
  });
  return map;
}

function buildTreeLayout(branches: Branch[], people: Person[]) {
  const branchMap = buildBranchMap(branches, people);
  const branchPos: Record<string, { x: number; y: number; angle: number }> = {};
  const personPos: Record<string, { x: number; y: number }> = {};

  branches.forEach((b, i) => {
    const a = (i / branches.length) * 2 * Math.PI - Math.PI / 2;
    branchPos[b.id] = { x: CX + R_BRANCH * Math.cos(a), y: CY + R_BRANCH * Math.sin(a), angle: a };

    const grp  = branchMap[b.id] ?? [];
    const FAN  = (22 * Math.PI) / 180;
    const half = ((grp.length - 1) / 2) * FAN;
    const rOut = 90 + grp.length * 10;

    grp.forEach((p, pi) => {
      const pa = a - half + pi * FAN;
      personPos[p.id] = {
        x: CX + (R_BRANCH + rOut) * Math.cos(pa),
        y: CY + (R_BRANCH + rOut) * Math.sin(pa),
      };
    });
  });

  return { branchMap, branchPos, personPos };
}

function buildConstellationLayout(branches: Branch[], people: Person[]) {
  const branchMap = buildBranchMap(branches, people);
  const activeBranches = branches.filter(b => (branchMap[b.id]?.length ?? 0) > 0);
  const branchPos: Record<string, { x: number; y: number; angle: number }> = {};
  const personPos: Record<string, { x: number; y: number }> = {};

  activeBranches.forEach((b, i) => {
    const sectorAngle = (i / activeBranches.length) * 2 * Math.PI - Math.PI / 2;
    const sectorWidth = ((2 * Math.PI) / activeBranches.length) * 0.78;

    branchPos[b.id] = {
      x: CX + R_BRANCH * Math.cos(sectorAngle),
      y: CY + R_BRANCH * Math.sin(sectorAngle),
      angle: sectorAngle,
    };

    const grp = branchMap[b.id] ?? [];
    grp.forEach((p, pi) => {
      // affinity 10 → dist 65, affinity 1 → dist 245
      const dist = 245 - (p.affinity - 1) * (180 / 9);
      const angleOffset = grp.length > 1
        ? ((pi / (grp.length - 1)) - 0.5) * sectorWidth
        : 0;
      const angle = sectorAngle + angleOffset;
      personPos[p.id] = {
        x: CX + dist * Math.cos(angle),
        y: CY + dist * Math.sin(angle),
      };
    });
  });

  // Branches not in activeBranches still need an entry to avoid undefined
  branches.forEach(b => {
    if (!branchPos[b.id]) {
      branchPos[b.id] = { x: CX, y: CY, angle: 0 };
    }
  });

  return { branchMap, branchPos, personPos };
}

// Smooth Bézier path with slight bend, trimmed to node edges
function bezierPath(
  x1: number, y1: number, x2: number, y2: number,
  r1: number, r2: number, bend = 0.18,
): string {
  const dx = x2 - x1, dy = y2 - y1;
  const d  = Math.sqrt(dx * dx + dy * dy);
  if (d < 1) return "";
  const ux = dx / d, uy = dy / d;
  const sx = x1 + ux * r1, sy = y1 + uy * r1;
  const ex = x2 - ux * r2, ey = y2 - uy * r2;
  const mx = (sx + ex) / 2, my = (sy + ey) / 2;
  const cx = mx - dy * bend,  cy = my + dx * bend;
  return `M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`;
}

// ─── Affinity Slider ──────────────────────────────────────────────────────────

function AffinitySlider({
  value, onChange, color,
}: {
  value: number;
  onChange: (v: number) => void;
  color: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="font-[family-name:var(--font-mono)] text-[10px] text-[#9CA3AF] uppercase tracking-wide">
          afinidad
        </span>
        <span className="font-[family-name:var(--font-mono)] text-[11px] font-bold" style={{ color }}>
          {value}/10 · {AFFINITY_LABELS[value]}
        </span>
      </div>
      <div className="flex gap-1 items-end">
        {Array.from({ length: 10 }, (_, i) => i + 1).map(v => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className="flex-1 rounded-sm transition-all hover:opacity-90"
            style={{
              height: 6 + v * 2.2,
              backgroundColor: v <= value ? color : "#E5E7EB",
              opacity: v <= value ? 0.45 + (v / 10) * 0.55 : 1,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Person Modal ─────────────────────────────────────────────────────────────

function PersonModal({
  person, branches, onSave, onDelete, onClose,
}: {
  person: Person | null;
  branches: Branch[];
  onSave: (p: Person) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}) {
  const isEdit = !!person;
  const [name,        setName]        = useState(person?.name ?? "");
  const [branchId,    setBranchId]    = useState(person?.branchId ?? branches[0]?.id ?? "");
  const [affinity,    setAffinity]    = useState(person?.affinity ?? 5);
  const [notes,       setNotes]       = useState(person?.notes ?? "");
  const [lastContact, setLastContact] = useState(person?.lastContact ?? "");

  const branch = branches.find(b => b.id === branchId);
  const color  = branch?.color ?? "#9D4EDD";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      id: person?.id ?? `p${Date.now()}`,
      name: name.trim(),
      branchId,
      affinity,
      notes: notes.trim() || undefined,
      lastContact: lastContact || undefined,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-[family-name:var(--font-playfair)] font-bold text-[#0A0A0A] text-lg">
            {isEdit ? "Editar vínculo" : "Nuevo vínculo"}
          </h3>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#0A0A0A] transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="font-[family-name:var(--font-mono)] text-[10px] text-[#9CA3AF] uppercase tracking-wide block mb-1.5">
              nombre
            </label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nombre completo"
              className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm font-[family-name:var(--font-mono)] text-[#0A0A0A] focus:outline-none focus:border-[#9D4EDD] placeholder:text-[#D1D5DB]"
            />
          </div>

          {/* Branch */}
          <div>
            <label className="font-[family-name:var(--font-mono)] text-[10px] text-[#9CA3AF] uppercase tracking-wide block mb-1.5">
              rama
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {branches.map(b => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBranchId(b.id)}
                  className="px-2.5 py-1 rounded-full text-[10px] font-[family-name:var(--font-mono)] border transition-all"
                  style={branchId === b.id
                    ? { backgroundColor: b.color, borderColor: b.color, color: b.color === "#39FF14" ? "#15803d" : "#fff" }
                    : { backgroundColor: "transparent", borderColor: "#E5E7EB", color: "#6B7280" }
                  }
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>

          {/* Affinity */}
          <AffinitySlider value={affinity} onChange={setAffinity} color={color} />

          {/* Notes */}
          <div>
            <label className="font-[family-name:var(--font-mono)] text-[10px] text-[#9CA3AF] uppercase tracking-wide block mb-1.5">
              notas
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Cómo se conocieron, qué comparten..."
              rows={2}
              className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm font-[family-name:var(--font-mono)] text-[#0A0A0A] focus:outline-none focus:border-[#9D4EDD] placeholder:text-[#D1D5DB] resize-none"
            />
          </div>

          {/* Last contact */}
          <div>
            <label className="font-[family-name:var(--font-mono)] text-[10px] text-[#9CA3AF] uppercase tracking-wide block mb-1.5">
              último contacto
            </label>
            <input
              type="date"
              value={lastContact}
              onChange={e => setLastContact(e.target.value)}
              className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm font-[family-name:var(--font-mono)] text-[#0A0A0A] focus:outline-none focus:border-[#9D4EDD]"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            {isEdit && onDelete && (
              <button
                type="button"
                onClick={() => { onDelete(person!.id); onClose(); }}
                className="p-2 rounded-lg border border-[#FFE4E4] text-[#EF4444] hover:bg-[#FFF5F5] transition-colors"
              >
                <Trash2 size={14} />
              </button>
            )}
            <button
              type="submit"
              className="flex-1 py-2 rounded-xl text-sm font-[family-name:var(--font-mono)] font-medium text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: color === "#39FF14" ? "#16a34a" : color }}
            >
              {isEdit ? "Guardar" : "Agregar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Branch Modal ─────────────────────────────────────────────────────────────

function BranchModal({
  branch, onSave, onDelete, onClose,
}: {
  branch: Branch | null;
  onSave: (b: Branch) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}) {
  const isEdit = !!branch;
  const [name,  setName]  = useState(branch?.name ?? "");
  const [color, setColor] = useState(branch?.color ?? BRANCH_COLORS[0]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ id: branch?.id ?? `b${Date.now()}`, name: name.trim(), color });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-[family-name:var(--font-playfair)] font-bold text-[#0A0A0A] text-lg">
            {isEdit ? "Editar rama" : "Nueva rama"}
          </h3>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#0A0A0A] transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="font-[family-name:var(--font-mono)] text-[10px] text-[#9CA3AF] uppercase tracking-wide block mb-1.5">
              nombre
            </label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej: Deporte, Viajes..."
              className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm font-[family-name:var(--font-mono)] text-[#0A0A0A] focus:outline-none focus:border-[#9D4EDD] placeholder:text-[#D1D5DB]"
            />
          </div>

          <div>
            <label className="font-[family-name:var(--font-mono)] text-[10px] text-[#9CA3AF] uppercase tracking-wide block mb-2">
              color
            </label>
            <div className="flex gap-2 flex-wrap">
              {BRANCH_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-full border-2 transition-all"
                  style={{
                    backgroundColor: c,
                    borderColor: color === c ? "#0A0A0A" : "transparent",
                    transform: color === c ? "scale(1.25)" : "scale(1)",
                  }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            {isEdit && onDelete && (
              <button
                type="button"
                onClick={() => { onDelete(branch!.id); onClose(); }}
                className="p-2 rounded-lg border border-[#FFE4E4] text-[#EF4444] hover:bg-[#FFF5F5] transition-colors"
              >
                <Trash2 size={14} />
              </button>
            )}
            <button
              type="submit"
              className="flex-1 py-2 rounded-xl text-sm font-[family-name:var(--font-mono)] font-medium text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: color === "#39FF14" ? "#16a34a" : color }}
            >
              {isEdit ? "Guardar" : "Crear rama"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Person Detail Panel ──────────────────────────────────────────────────────

function PersonDetailPanel({
  person, branch, onEdit, onClose,
}: {
  person: Person;
  branch: Branch | undefined;
  onEdit: () => void;
  onClose: () => void;
}) {
  const color    = branch?.color ?? "#9D4EDD";
  const initials = person.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

  function daysSince(dateStr: string): string {
    const diff = Math.floor((Date.parse(new Date().toLocaleDateString("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" })) - Date.parse(dateStr)) / 86400000);
    if (diff === 0) return "hoy";
    if (diff === 1) return "ayer";
    if (diff < 7)   return `hace ${diff} días`;
    if (diff < 30)  return `hace ${Math.floor(diff / 7)} sem.`;
    if (diff < 365) return `hace ${Math.floor(diff / 30)} meses`;
    return `hace ${Math.floor(diff / 365)} año${Math.floor(diff / 365) > 1 ? "s" : ""}`;
  }

  return (
    <div
      className="absolute top-3 right-3 w-60 bg-white rounded-2xl p-5 shadow-2xl z-10"
      style={{ border: `1px solid ${color}33`, boxShadow: `0 0 0 1px ${color}18, 0 8px 32px rgba(0,0,0,0.11)` }}
    >
      <button
        onClick={onClose}
        className="absolute top-3 right-3 text-[#9CA3AF] hover:text-[#0A0A0A] transition-colors"
      >
        <X size={13} />
      </button>

      {/* Avatar */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
          style={{ background: color + "20", color }}
        >
          <span className="font-[family-name:var(--font-playfair)] font-bold text-sm">{initials}</span>
        </div>
        <div>
          <p className="font-[family-name:var(--font-playfair)] font-bold text-[#0A0A0A] text-sm leading-tight">
            {person.name}
          </p>
          <p className="font-[family-name:var(--font-mono)] text-[9px] mt-0.5" style={{ color: color + "BB" }}>
            {branch?.name ?? "—"}
          </p>
        </div>
      </div>

      {/* Affinity bar */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1.5">
          <span className="font-[family-name:var(--font-mono)] text-[9px] text-[#9CA3AF] uppercase tracking-wide">
            afinidad
          </span>
          <span className="font-[family-name:var(--font-mono)] text-[10px] font-bold" style={{ color }}>
            {person.affinity}/10
          </span>
        </div>
        <div className="flex gap-0.5 items-end">
          {Array.from({ length: 10 }, (_, i) => i + 1).map(v => (
            <div
              key={v}
              className="flex-1 rounded-sm"
              style={{
                height: 4 + v * 1.1,
                backgroundColor: v <= person.affinity ? color : "#E5E7EB",
                opacity: v <= person.affinity ? 0.4 + (v / 10) * 0.6 : 1,
              }}
            />
          ))}
        </div>
      </div>

      {/* Notes */}
      {person.notes && (
        <p className="font-[family-name:var(--font-mono)] text-[10px] text-[#6B7280] leading-relaxed mb-3 border-t border-[#F3F4F6] pt-3">
          {person.notes}
        </p>
      )}

      {/* Last contact */}
      {person.lastContact && (
        <div className="flex items-center gap-1.5 mb-3 border-t border-[#F3F4F6] pt-3">
          <Clock size={10} className="text-[#9CA3AF]" />
          <span className="font-[family-name:var(--font-mono)] text-[9px] text-[#9CA3AF]">
            {daysSince(person.lastContact)}
          </span>
        </div>
      )}

      <button
        onClick={onEdit}
        className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-[#E5E7EB] hover:border-[#0A0A0A] text-[#6B7280] hover:text-[#0A0A0A] transition-colors"
      >
        <Pencil size={10} />
        <span className="font-[family-name:var(--font-mono)] text-[10px]">editar</span>
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ConnectionsClient() {
  const [mounted,     setMounted]     = useState(false);
  const [branches,    setBranches]    = useState<Branch[]>(SEED_BRANCHES);
  const [people,      setPeople]      = useState<Person[]>(SEED_PEOPLE);
  const [view,        setView]        = useState<"tree" | "constellation">("tree");

  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [activeBranch,   setActiveBranch]   = useState<string | null>(null);
  const [stickyBranch,   setStickyBranch]   = useState<string | null>(null);

  const [personModal, setPersonModal] = useState<{ open: boolean; person: Person | null }>({ open: false, person: null });
  const [branchModal, setBranchModal] = useState<{ open: boolean; branch: Branch | null }>({ open: false, branch: null });

  // ── Persistence ──
  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const { branches: b, people: p } = JSON.parse(raw);
        if (Array.isArray(b)) setBranches(b);
        if (Array.isArray(p)) setPeople(p);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ branches, people }));
  }, [branches, people, mounted]);

  // ── CRUD ──
  function savePerson(p: Person) {
    setPeople(prev => {
      const idx = prev.findIndex(x => x.id === p.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = p; return next; }
      return [...prev, p];
    });
    setPersonModal({ open: false, person: null });
  }

  function deletePerson(id: string) {
    setPeople(prev => prev.filter(p => p.id !== id));
    if (selectedPerson?.id === id) setSelectedPerson(null);
  }

  function saveBranch(b: Branch) {
    setBranches(prev => {
      const idx = prev.findIndex(x => x.id === b.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = b; return next; }
      return [...prev, b];
    });
    setBranchModal({ open: false, branch: null });
  }

  function deleteBranch(id: string) {
    setBranches(prev => {
      const remaining = prev.filter(b => b.id !== id);
      setPeople(pp => remaining.length > 0
        ? pp.map(p => p.branchId === id ? { ...p, branchId: remaining[0].id } : p)
        : pp.filter(p => p.branchId !== id)
      );
      return remaining;
    });
    setBranchModal({ open: false, branch: null });
  }

  // ── Layout ──
  const { branchMap, branchPos, personPos } = view === "tree"
    ? buildTreeLayout(branches, people)
    : buildConstellationLayout(branches, people);

  const highlight  = stickyBranch ?? activeBranch;
  const litBranch  = (id: string) => !highlight || id === highlight;
  const litPerson  = (p: Person)  => !highlight || p.branchId === highlight;

  // ── Stats ──
  const avgAffinity = people.length > 0
    ? (people.reduce((s, p) => s + p.affinity, 0) / people.length).toFixed(1)
    : "—";

  const topBranch = branches.reduce<Branch | null>((best, b) => {
    const c = branchMap[b.id]?.length ?? 0;
    const bc = best ? (branchMap[best.id]?.length ?? 0) : -1;
    return c > bc ? b : best;
  }, null);

  const topPerson = people.length > 0
    ? people.reduce((a, b) => a.affinity >= b.affinity ? a : b)
    : null;

  return (
    <div className="min-h-screen bg-white flex flex-col overflow-hidden">
      <style>{`
        @keyframes kp-float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-4px); }
        }
        @keyframes kp-pulse {
          0%   { transform: scale(1);   opacity: 0.38; }
          100% { transform: scale(2.8); opacity: 0; }
        }
        .kp-pulse {
          transform-box: fill-box;
          transform-origin: center;
          animation: kp-pulse ease-out infinite;
        }
      `}</style>

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="px-8 pt-10 pb-3 flex items-start justify-between shrink-0">
        <div>
          <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[#0A0A0A]">
            Vínculos
          </h1>
          <p className="font-[family-name:var(--font-mono)] text-xs text-[#9CA3AF] mt-1">
            {people.length} personas · {branches.length} ramas · afinidad media {avgAffinity}
          </p>
        </div>

        <div className="flex items-center gap-2.5 pt-1">
          {/* View toggle */}
          <div className="flex border border-[#E5E7EB] rounded-xl overflow-hidden">
            {(["tree", "constellation"] as const).map(v => (
              <button
                key={v}
                onClick={() => { setView(v); setSelectedPerson(null); }}
                className={`px-3 py-1.5 font-[family-name:var(--font-mono)] text-[10px] transition-colors ${
                  view === v
                    ? "bg-[#0A0A0A] text-white"
                    : "text-[#6B7280] hover:text-[#0A0A0A] bg-white"
                }`}
              >
                {v === "tree" ? "árbol" : "constelación"}
              </button>
            ))}
          </div>

          {/* New branch */}
          <button
            onClick={() => setBranchModal({ open: true, branch: null })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E5E7EB] hover:border-[#9D4EDD] text-[#6B7280] hover:text-[#9D4EDD] transition-colors font-[family-name:var(--font-mono)] text-[10px]"
          >
            <Plus size={11} />
            rama
          </button>

          {/* New person */}
          <button
            onClick={() => setPersonModal({ open: true, person: null })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0A0A0A] text-white hover:bg-[#2D2D2D] transition-colors font-[family-name:var(--font-mono)] text-[10px]"
          >
            <Plus size={11} />
            vínculo
          </button>
        </div>
      </div>

      {/* ── Graph ───────────────────────────────────────────── */}
      <div className="flex-1 relative">
        <svg viewBox="0 0 900 680" className="w-full" style={{ maxHeight: "calc(100vh - 210px)" }}>
          <defs>
            <marker id="arr-dark" markerWidth="7" markerHeight="6" refX="6" refY="3" orient="auto">
              <polygon points="0 0,7 3,0 6" fill="#0A0A0A" opacity="0.35" />
            </marker>
            {branches.map(b => (
              <marker key={b.id} id={`arr-${b.id}`} markerWidth="7" markerHeight="6" refX="6" refY="3" orient="auto">
                <polygon points="0 0,7 3,0 6" fill={b.color} opacity="0.65" />
              </marker>
            ))}
          </defs>

          {/* Center → branch curves */}
          {branches.map(b => {
            const bp = branchPos[b.id];
            if (!bp || (bp.x === CX && bp.y === CY)) return null;
            const lit = litBranch(b.id);
            return (
              <path
                key={`cb-${b.id}`}
                d={bezierPath(CX, CY, bp.x, bp.y, 32, 22, 0.12)}
                fill="none"
                stroke="#0A0A0A"
                strokeWidth={lit ? 1.2 : 0.3}
                strokeOpacity={lit ? 0.28 : 0.04}
                markerEnd="url(#arr-dark)"
                style={{ transition: "stroke-opacity 0.25s, stroke-width 0.25s" }}
              />
            );
          })}

          {/* Branch → person curves */}
          {people.map(p => {
            const bp = branchPos[p.branchId];
            const pp = personPos[p.id];
            const b  = branches.find(x => x.id === p.branchId);
            if (!bp || !pp || !b || (bp.x === CX && bp.y === CY)) return null;
            const lit = litPerson(p);
            const r   = nodeRadius(p.affinity);
            return (
              <path
                key={`bp-${p.id}`}
                d={bezierPath(bp.x, bp.y, pp.x, pp.y, 22, r + 2, 0.2)}
                fill="none"
                stroke={b.color}
                strokeWidth={lit ? 0.6 + p.affinity * 0.1 : 0.2}
                strokeOpacity={lit ? 0.12 + (p.affinity / 10) * 0.55 : 0.03}
                markerEnd={`url(#arr-${b.id})`}
                style={{ transition: "stroke-opacity 0.25s, stroke-width 0.25s" }}
              />
            );
          })}

          {/* ── Center node ── */}
          <circle cx={CX} cy={CY} r={30} fill="#0A0A0A" />
          <circle cx={CX} cy={CY} r={37} fill="none" stroke="#0A0A0A" strokeWidth={1} opacity={0.07} />
          <text
            x={CX} y={CY + 1}
            textAnchor="middle" dominantBaseline="middle"
            fill="white" fontSize={10}
            fontFamily="var(--font-mono)"
            fontWeight={600} letterSpacing={1}
          >
            TÚ
          </text>

          {/* ── Branch nodes ── */}
          {branches.map(b => {
            const bp  = branchPos[b.id];
            if (!bp || (bp.x === CX && bp.y === CY)) return null;
            const lit    = litBranch(b.id);
            const stuck  = stickyBranch === b.id;
            const abbr   = b.name.length <= 4 ? b.name.toUpperCase() : b.name.slice(0, 3).toUpperCase();
            const count  = branchMap[b.id]?.length ?? 0;
            return (
              <g
                key={b.id}
                transform={`translate(${bp.x}, ${bp.y})`}
                style={{ opacity: lit ? 1 : 0.09, transition: "opacity 0.25s", cursor: "pointer" }}
                onClick={() => setStickyBranch(s => s === b.id ? null : b.id)}
                onMouseEnter={() => { if (!stickyBranch) setActiveBranch(b.id); }}
                onMouseLeave={() => { if (!stickyBranch) setActiveBranch(null); }}
              >
                <rect
                  x={-20} y={-20} width={40} height={40} rx={9}
                  fill={stuck ? b.color : "white"}
                  stroke={b.color}
                  strokeWidth={stuck ? 0 : 1.5}
                />
                <text
                  textAnchor="middle" dominantBaseline="middle"
                  fill={stuck ? (b.color === "#39FF14" ? "#15803d" : "white") : b.color}
                  fontSize={9} fontFamily="var(--font-mono)" fontWeight={700} letterSpacing={0.5}
                >
                  {abbr}
                </text>
                <text
                  y={30} textAnchor="middle"
                  fill="#9CA3AF" fontSize={7} fontFamily="var(--font-mono)"
                >
                  {b.name} ({count})
                </text>
              </g>
            );
          })}

          {/* ── Person nodes ── */}
          {people.map((p, idx) => {
            const pp  = personPos[p.id];
            const b   = branches.find(x => x.id === p.branchId);
            if (!pp || !b) return null;
            const r        = nodeRadius(p.affinity);
            const lit      = litPerson(p);
            const isSel    = selectedPerson?.id === p.id;
            const dur      = `${2.4 + (idx % 5) * 0.38}s`;
            const del      = `${(idx * 0.45) % 2.8}s`;
            const fillOp   = 0.08 + (p.affinity / 10) * 0.22;
            const strokeOp = 0.45 + (p.affinity / 10) * 0.55;
            const initials = p.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

            return (
              <g
                key={p.id}
                transform={`translate(${pp.x}, ${pp.y})`}
                style={{ opacity: lit ? 1 : 0.07, transition: "opacity 0.25s", cursor: "pointer" }}
                onClick={() => setSelectedPerson(isSel ? null : p)}
                onMouseEnter={() => { if (!stickyBranch) setActiveBranch(p.branchId); }}
                onMouseLeave={() => { if (!stickyBranch) setActiveBranch(null); }}
              >
                <g style={{ animation: `kp-float ${dur} ease-in-out ${del} infinite` }}>
                  {/* Pulse ring for high affinity */}
                  {p.affinity >= 9 && (
                    <circle
                      className="kp-pulse"
                      r={r}
                      fill={b.color}
                      style={{ animationDuration: `${1.8 + idx * 0.18}s`, animationDelay: del }}
                    />
                  )}

                  {/* Soft glow */}
                  {p.affinity >= 7 && (
                    <circle r={r + 5} fill={b.color} opacity={0.07} />
                  )}

                  {/* Selection ring */}
                  {isSel && (
                    <circle r={r + 6} fill="none" stroke={b.color} strokeWidth={1.5} opacity={0.45} />
                  )}

                  {/* Main node */}
                  <circle
                    r={r}
                    fill={b.color}
                    fillOpacity={fillOp}
                    stroke={b.color}
                    strokeWidth={isSel ? 2 : 1.5}
                    strokeOpacity={strokeOp}
                  />

                  {/* Initials */}
                  <text
                    textAnchor="middle" dominantBaseline="middle"
                    fill={b.color}
                    fontSize={Math.max(7, r * 0.5)}
                    fontFamily="var(--font-playfair)"
                    fontWeight={700}
                  >
                    {initials}
                  </text>

                  {/* Name */}
                  <text
                    y={r + 12}
                    textAnchor="middle"
                    fill="#374151"
                    fontSize={8}
                    fontFamily="var(--font-mono)"
                    opacity={0.68}
                  >
                    {p.name}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>

        {/* ── Person detail panel ── */}
        {selectedPerson && (
          <PersonDetailPanel
            person={selectedPerson}
            branch={branches.find(b => b.id === selectedPerson.branchId)}
            onEdit={() => {
              setPersonModal({ open: true, person: selectedPerson });
              setSelectedPerson(null);
            }}
            onClose={() => setSelectedPerson(null)}
          />
        )}

        {/* ── Branch filter chips ── */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 flex-wrap justify-center px-6">
          {branches.map(b => {
            const isStuck = stickyBranch === b.id;
            return (
              <div key={b.id} className="flex items-center rounded-full overflow-hidden border transition-all"
                style={isStuck
                  ? { backgroundColor: b.color, borderColor: b.color }
                  : { backgroundColor: "white", borderColor: "#E5E7EB" }
                }
              >
                <button
                  onClick={() => setStickyBranch(s => s === b.id ? null : b.id)}
                  onMouseEnter={() => { if (!stickyBranch) setActiveBranch(b.id); }}
                  onMouseLeave={() => { if (!stickyBranch) setActiveBranch(null); }}
                  className="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 font-[family-name:var(--font-mono)] text-[9px] transition-colors"
                  style={isStuck
                    ? { color: b.color === "#39FF14" ? "#15803d" : "#fff" }
                    : { color: "#6B7280" }
                  }
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: isStuck ? "currentColor" : b.color }} />
                  {b.name}
                </button>
                <button
                  onClick={() => setBranchModal({ open: true, branch: b })}
                  className="px-1.5 py-1 transition-colors"
                  style={isStuck
                    ? { color: b.color === "#39FF14" ? "#15803d" : "rgba(255,255,255,0.7)" }
                    : { color: "#D1D5DB" }
                  }
                >
                  <Pencil size={8} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div className="px-8 py-3.5 border-t border-[#F3F4F6] flex items-center gap-6 shrink-0 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Users size={11} className="text-[#9CA3AF]" />
          <span className="font-[family-name:var(--font-mono)] text-[10px] text-[#9CA3AF]">
            {people.length} vínculos
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Star size={11} className="text-[#9CA3AF]" />
          <span className="font-[family-name:var(--font-mono)] text-[10px] text-[#9CA3AF]">
            media <span className="text-[#0A0A0A] font-bold">{avgAffinity}</span>
          </span>
        </div>

        {topBranch && (
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: topBranch.color }} />
            <span className="font-[family-name:var(--font-mono)] text-[10px] text-[#9CA3AF]">
              mayor: <span className="text-[#0A0A0A]">{topBranch.name}</span>
            </span>
          </div>
        )}

        {topPerson && (
          <div className="flex items-center gap-1.5">
            <span className="font-[family-name:var(--font-mono)] text-[10px] text-[#9CA3AF]">
              top: <span className="text-[#0A0A0A]">{topPerson.name}</span>
              <span className="text-[#D1D5DB]"> {topPerson.affinity}/10</span>
            </span>
          </div>
        )}

        <div className="ml-auto flex gap-4 flex-wrap justify-end">
          {branches.map(b => (
            <div key={b.id} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: b.color }} />
              <span className="font-[family-name:var(--font-mono)] text-[9px] text-[#9CA3AF]">
                {b.name} <span className="text-[#0A0A0A] font-medium">{branchMap[b.id]?.length ?? 0}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Modals ── */}
      {personModal.open && (
        <PersonModal
          person={personModal.person}
          branches={branches}
          onSave={savePerson}
          onDelete={deletePerson}
          onClose={() => setPersonModal({ open: false, person: null })}
        />
      )}
      {branchModal.open && (
        <BranchModal
          branch={branchModal.branch}
          onSave={saveBranch}
          onDelete={deleteBranch}
          onClose={() => setBranchModal({ open: false, branch: null })}
        />
      )}
    </div>
  );
}
