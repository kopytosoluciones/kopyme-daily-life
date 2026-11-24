"use client";

import { useState, useEffect } from "react";

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

// Posiciones redondeadas: Node y el navegador difieren en los últimos decimales de trig → hydration mismatch.
const r2 = (v: number) => Math.round(v * 100) / 100;

function buildTreeLayout(branches: Branch[], people: Person[]) {
  const branchMap = buildBranchMap(branches, people);
  const branchPos: Record<string, { x: number; y: number; angle: number }> = {};
  const personPos: Record<string, { x: number; y: number }> = {};

  branches.forEach((b, i) => {
    const a = (i / branches.length) * 2 * Math.PI - Math.PI / 2;
    branchPos[b.id] = { x: r2(CX + R_BRANCH * Math.cos(a)), y: r2(CY + R_BRANCH * Math.sin(a)), angle: a };

    const grp  = branchMap[b.id] ?? [];
    const FAN  = (22 * Math.PI) / 180;
    const half = ((grp.length - 1) / 2) * FAN;
    const rOut = 90 + grp.length * 10;

    grp.forEach((p, pi) => {
      const pa = a - half + pi * FAN;
      personPos[p.id] = {
        x: r2(CX + (R_BRANCH + rOut) * Math.cos(pa)),
        y: r2(CY + (R_BRANCH + rOut) * Math.sin(pa)),
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
      x: r2(CX + R_BRANCH * Math.cos(sectorAngle)),
      y: r2(CY + R_BRANCH * Math.sin(sectorAngle)),
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
        x: r2(CX + dist * Math.cos(angle)),
        y: r2(CY + dist * Math.sin(angle)),
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
  // Redondeo: Node y el navegador difieren en los últimos decimales de trig → hydration mismatch.
  const r = (v: number) => v.toFixed(2);
  return `M ${r(sx)} ${r(sy)} Q ${r(cx)} ${r(cy)} ${r(ex)} ${r(ey)}`;
}

// ─── Presentation helpers ─────────────────────────────────────────────────────

const LABEL = "font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase";
const INPUT = "w-full border-2 border-foreground bg-card px-3 py-2 font-mono text-sm outline-none placeholder:text-muted-foreground focus:bg-primary/10";
const BTN_PRIMARY = "border-2 border-foreground bg-primary px-3.5 py-2 font-mono text-xs tracking-[0.06em] text-primary-foreground uppercase shadow-hard-primary transition-transform duration-100 hover:-translate-x-px hover:-translate-y-px active:translate-x-1 active:translate-y-1 active:shadow-none";
const BTN_DEFAULT = "border-2 border-foreground bg-card px-3.5 py-2 font-mono text-xs tracking-[0.06em] text-foreground uppercase shadow-hard transition-transform duration-100 hover:-translate-x-px hover:-translate-y-px active:translate-x-1 active:translate-y-1 active:shadow-none";
const BTN_DESTRUCTIVE = "border-2 border-destructive bg-card px-3 py-2 font-mono text-xs text-destructive uppercase hover:bg-destructive/10";

function asciiBar(value: number, max: number, width = 10) {
  const filled = max > 0 ? Math.round((value / max) * width) : 0;
  return "█".repeat(filled) + "░".repeat(width - filled);
}

function initialsOf(name: string) {
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

// ─── Modal shell ──────────────────────────────────────────────────────────────

function ModalShell({
  title, onClose, children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label={title}
        className="w-full max-w-sm border-2 border-foreground bg-card shadow-hard-lg"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b-2 border-foreground px-4 py-2.5">
          <h3 className={LABEL}>── {title}</h3>
          <button onClick={onClose} aria-label="Cerrar" className="font-mono text-xs text-muted-foreground hover:text-foreground">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Affinity Slider ──────────────────────────────────────────────────────────

function AffinitySlider({
  value, onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className={LABEL}>Afinidad</span>
        <span className="font-mono text-[11px] font-bold tabular">
          {value}/10 · {AFFINITY_LABELS[value]}
        </span>
      </div>
      <div className="flex gap-1" role="group" aria-label="Afinidad">
        {Array.from({ length: 10 }, (_, i) => i + 1).map(v => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            aria-label={`Afinidad ${v}`}
            aria-pressed={v === value}
            className={`h-6 flex-1 border-2 border-foreground ${v <= value ? "bg-foreground" : "bg-card hover:bg-muted"}`}
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
    <ModalShell title={isEdit ? "Editar vínculo" : "Nuevo vínculo"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="person-name" className={LABEL}>Nombre</label>
          <input
            id="person-name"
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Nombre completo"
            className={INPUT}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className={LABEL}>Rama</span>
          <div className="flex flex-wrap gap-1.5">
            {branches.map(b => {
              const on = branchId === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setBranchId(b.id)}
                  className={`flex items-center gap-1.5 border-2 border-foreground px-2 py-1 font-mono text-[11px] uppercase ${on ? "bg-foreground text-background" : "bg-card text-foreground hover:bg-muted"}`}
                >
                  <span aria-hidden className="size-2.5 shrink-0" style={{ backgroundColor: b.color }} />
                  {b.name}
                </button>
              );
            })}
          </div>
        </div>

        <AffinitySlider value={affinity} onChange={setAffinity} />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="person-notes" className={LABEL}>Notas</label>
          <textarea
            id="person-notes"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Cómo se conocieron, qué comparten..."
            rows={2}
            className={`${INPUT} resize-none`}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="person-last" className={LABEL}>Último contacto</label>
          <input
            id="person-last"
            type="date"
            value={lastContact}
            onChange={e => setLastContact(e.target.value)}
            className={`${INPUT} tabular`}
          />
        </div>

        <div className="flex gap-2 pt-1">
          {isEdit && onDelete && (
            <button
              type="button"
              onClick={() => { onDelete(person!.id); onClose(); }}
              className={BTN_DESTRUCTIVE}
            >
              Borrar
            </button>
          )}
          <button type="submit" disabled={!name.trim()} className={`flex-1 ${BTN_PRIMARY} disabled:opacity-40`}>
            {isEdit ? "Guardar" : "Agregar"}
          </button>
        </div>
      </form>
    </ModalShell>
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
    <ModalShell title={isEdit ? "Editar rama" : "Nueva rama"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="branch-name" className={LABEL}>Nombre</label>
          <input
            id="branch-name"
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ej: Deporte, Viajes..."
            className={INPUT}
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className={LABEL}>Marca</span>
          <div className="flex flex-wrap gap-2">
            {BRANCH_COLORS.map(c => (
              <button
                key={c}
                type="button"
                aria-label={`Color ${c}`}
                aria-pressed={color === c}
                onClick={() => setColor(c)}
                className={`size-6 border-2 ${color === c ? "border-foreground outline-2 outline-offset-2 outline-foreground" : "border-transparent"}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          {isEdit && onDelete && (
            <button
              type="button"
              onClick={() => { onDelete(branch!.id); onClose(); }}
              className={BTN_DESTRUCTIVE}
            >
              Borrar
            </button>
          )}
          <button type="submit" disabled={!name.trim()} className={`flex-1 ${BTN_PRIMARY} disabled:opacity-40`}>
            {isEdit ? "Guardar" : "Crear rama"}
          </button>
        </div>
      </form>
    </ModalShell>
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
  const initials = initialsOf(person.name);

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
    <div className="absolute top-3 right-3 z-10 w-60 max-w-[calc(100%-24px)] border-2 border-foreground bg-card shadow-hard-lg">
      <div className="flex items-center justify-between border-b-2 border-foreground px-3 py-2">
        <span className={LABEL}>── Vínculo</span>
        <button onClick={onClose} aria-label="Cerrar" className="font-mono text-xs text-muted-foreground hover:text-foreground">✕</button>
      </div>

      <div className="flex flex-col gap-3 p-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center border-2 border-foreground font-mono text-sm font-bold">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate leading-tight font-bold">{person.name}</p>
            <p className="mt-1 flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground uppercase">
              <span aria-hidden className="size-2.5 shrink-0" style={{ backgroundColor: color }} />
              {branch?.name ?? "—"}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-1 border-t border-muted pt-3">
          <span className={LABEL}>Afinidad</span>
          <span className="font-mono text-xs tabular" aria-label={`Afinidad ${person.affinity} de 10`}>
            <span aria-hidden className="select-none">[{asciiBar(person.affinity, 10)}] </span>
            <span className="font-bold">{person.affinity}/10</span>
          </span>
        </div>

        {person.notes && (
          <p className="border-t border-muted pt-3 text-[13px] leading-snug text-muted-foreground">
            {person.notes}
          </p>
        )}

        {person.lastContact && (
          <div className="flex items-center justify-between border-t border-muted pt-3">
            <span className={LABEL}>Último contacto</span>
            <span className="font-mono text-[11px] tabular">{daysSince(person.lastContact)}</span>
          </div>
        )}

        <button onClick={onEdit} className={`w-full ${BTN_DEFAULT} py-1.5`}>
          Editar
        </button>
      </div>
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
  // localStorage solo existe en el cliente: cargarlo en el render rompería la hidratación.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const maxCount = branches.reduce((m, b) => Math.max(m, branchMap[b.id]?.length ?? 0), 0);
  const fade = { transition: "opacity 0.12s, stroke 0.12s, stroke-width 0.12s" };

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-4 py-7 md:px-6">
      {/* ── Header ──────────────────────────────────────────── */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[40px] leading-none font-bold tracking-[-0.02em]">
            Vínculos<span className="k-cursor">_</span>
          </h1>
          <p className="mt-2 font-mono text-xs text-muted-foreground tabular">
            {people.length} personas · {branches.length} ramas · afinidad media {avgAffinity.replace(".", ",")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div role="tablist" aria-label="Vista" className="flex border-2 border-foreground">
            {(["tree", "constellation"] as const).map((v, i) => (
              <button
                key={v}
                role="tab"
                aria-selected={view === v}
                onClick={() => { setView(v); setSelectedPerson(null); }}
                className={`px-3 py-2 font-mono text-[11px] tracking-[0.06em] uppercase ${i > 0 ? "border-l-2 border-foreground" : ""} ${
                  view === v ? "bg-foreground text-background" : "bg-card text-foreground hover:bg-muted"
                }`}
              >
                {v === "tree" ? "Árbol" : "Constelación"}
              </button>
            ))}
          </div>

          <button onClick={() => setBranchModal({ open: true, branch: null })} className={BTN_DEFAULT}>
            + Rama
          </button>
          <button onClick={() => setPersonModal({ open: true, person: null })} className={BTN_PRIMARY}>
            + Vínculo
          </button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* ── Graph ───────────────────────────────────────────── */}
        <section className="relative min-w-0 border-2 border-foreground bg-card">
          <div className="flex items-center justify-between gap-3 border-b-2 border-foreground px-3 py-2">
            <span className={LABEL}>── Mapa · {view === "tree" ? "árbol" : "constelación"}</span>
            <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">
              {people.length === 0 ? "[ ] sin vínculos todavía" : "click en una rama para fijarla"}
            </span>
          </div>

          <svg
            viewBox="0 0 900 680"
            className="block max-h-[72vh] w-full font-mono tabular"
            role="img"
            aria-label={`Mapa de vínculos: ${people.length} personas en ${branches.length} ramas`}
          >
            <defs>
              <marker id="arr-muted" markerWidth="7" markerHeight="6" refX="6" refY="3" orient="auto">
                <polygon points="0 0,7 3,0 6" fill="var(--muted-foreground)" />
              </marker>
              <marker id="arr-primary" markerWidth="7" markerHeight="6" refX="6" refY="3" orient="auto">
                <polygon points="0 0,7 3,0 6" fill="var(--primary)" />
              </marker>
            </defs>

            {/* Center → branch curves */}
            {branches.map(b => {
              const bp = branchPos[b.id];
              if (!bp || (bp.x === CX && bp.y === CY)) return null;
              const lit = litBranch(b.id);
              const hot = highlight === b.id;
              return (
                <path
                  key={`cb-${b.id}`}
                  d={bezierPath(CX, CY, bp.x, bp.y, 32, 22, 0.12)}
                  fill="none"
                  stroke={hot ? "var(--primary)" : "var(--muted-foreground)"}
                  strokeWidth={hot ? 2 : 1.5}
                  opacity={lit ? 1 : 0.15}
                  markerEnd={hot ? "url(#arr-primary)" : "url(#arr-muted)"}
                  style={fade}
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
              const hot = highlight === p.branchId;
              const r   = nodeRadius(p.affinity);
              return (
                <path
                  key={`bp-${p.id}`}
                  d={bezierPath(bp.x, bp.y, pp.x, pp.y, 22, r + 2, 0.2)}
                  fill="none"
                  stroke={hot ? "var(--primary)" : "var(--muted-foreground)"}
                  strokeWidth={hot ? 2 : 1.5}
                  opacity={lit ? 1 : 0.12}
                  markerEnd={hot ? "url(#arr-primary)" : "url(#arr-muted)"}
                  style={fade}
                />
              );
            })}

            {/* ── Center node ── */}
            <rect x={CX - 36} y={CY - 36} width={72} height={72} fill="none" stroke="var(--foreground)" strokeWidth={1} />
            <rect x={CX - 30} y={CY - 30} width={60} height={60} fill="var(--foreground)" />
            <text
              x={CX} y={CY + 1}
              textAnchor="middle" dominantBaseline="middle"
              fill="var(--background)" fontSize={11}
              fontWeight={700} letterSpacing={1}
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
                  style={{ opacity: lit ? 1 : 0.12, transition: "opacity 0.12s", cursor: "pointer" }}
                  onClick={() => setStickyBranch(s => s === b.id ? null : b.id)}
                  onMouseEnter={() => { if (!stickyBranch) setActiveBranch(b.id); }}
                  onMouseLeave={() => { if (!stickyBranch) setActiveBranch(null); }}
                >
                  <rect
                    x={-20} y={-20} width={40} height={40}
                    fill={stuck ? "var(--foreground)" : "var(--card)"}
                    stroke={highlight === b.id ? "var(--primary)" : "var(--foreground)"}
                    strokeWidth={2}
                  />
                  <rect x={-17} y={-17} width={7} height={7} fill={b.color} />
                  <text
                    y={2}
                    textAnchor="middle" dominantBaseline="middle"
                    fill={stuck ? "var(--background)" : "var(--foreground)"}
                    fontSize={10} fontWeight={700} letterSpacing={0.5}
                  >
                    {abbr}
                  </text>
                  <text
                    y={33} textAnchor="middle"
                    fill="var(--muted-foreground)" fontSize={9}
                  >
                    {b.name.toUpperCase()} [{count}]
                  </text>
                </g>
              );
            })}

            {/* ── Person nodes ── */}
            {people.map(p => {
              const pp  = personPos[p.id];
              const b   = branches.find(x => x.id === p.branchId);
              if (!pp || !b) return null;
              const r        = nodeRadius(p.affinity);
              const lit      = litPerson(p);
              const isSel    = selectedPerson?.id === p.id;
              const initials = initialsOf(p.name);

              return (
                <g
                  key={p.id}
                  transform={`translate(${pp.x}, ${pp.y})`}
                  style={{ opacity: lit ? 1 : 0.1, transition: "opacity 0.12s", cursor: "pointer" }}
                  onClick={() => setSelectedPerson(isSel ? null : p)}
                  onMouseEnter={() => { if (!stickyBranch) setActiveBranch(p.branchId); }}
                  onMouseLeave={() => { if (!stickyBranch) setActiveBranch(null); }}
                >
                  {/* Double border = high affinity (9–10) */}
                  {p.affinity >= 9 && !isSel && (
                    <rect
                      x={-r - 4} y={-r - 4} width={2 * r + 8} height={2 * r + 8}
                      fill="none" stroke="var(--foreground)" strokeWidth={1}
                    />
                  )}

                  {isSel && (
                    <rect
                      x={-r - 5} y={-r - 5} width={2 * r + 10} height={2 * r + 10}
                      fill="none" stroke="var(--primary)" strokeWidth={2}
                    />
                  )}

                  <rect
                    x={-r} y={-r} width={2 * r} height={2 * r}
                    fill={isSel ? "var(--primary)" : "var(--card)"}
                    stroke={isSel ? "var(--primary)" : "var(--foreground)"}
                    strokeWidth={2}
                  />
                  <rect x={-r + 3} y={-r + 3} width={6} height={6} fill={b.color} />

                  <text
                    y={1}
                    textAnchor="middle" dominantBaseline="middle"
                    fill={isSel ? "var(--primary-foreground)" : "var(--foreground)"}
                    fontSize={Math.max(8, r * 0.55)}
                    fontWeight={700}
                  >
                    {initials}
                  </text>

                  <text
                    y={r + 14}
                    textAnchor="middle"
                    fill="var(--muted-foreground)"
                    fontSize={9}
                  >
                    {p.name}
                  </text>
                </g>
              );
            })}
          </svg>

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
        </section>

        <aside className="flex min-w-0 flex-col gap-6">
          {/* ── Stats ── */}
          <div className="grid grid-cols-2 gap-0.5 border-2 border-foreground bg-foreground">
            <div className="flex flex-col gap-1 bg-card p-3">
              <span className={LABEL}>Vínculos</span>
              <span className="font-mono text-[22px] leading-none font-bold tabular">{people.length}</span>
            </div>
            <div className="flex flex-col gap-1 bg-card p-3">
              <span className={LABEL}>Afinidad media</span>
              <span className="font-mono text-[22px] leading-none font-bold tabular">{avgAffinity.replace(".", ",")}</span>
            </div>
            <div className="flex min-w-0 flex-col gap-1 bg-card p-3">
              <span className={LABEL}>Rama mayor</span>
              <span className="flex min-w-0 items-center gap-1.5 font-mono text-[13px] font-bold">
                {topBranch && <span aria-hidden className="size-2.5 shrink-0" style={{ backgroundColor: topBranch.color }} />}
                <span className="truncate">{topBranch?.name ?? "—"}</span>
              </span>
            </div>
            <div className="flex min-w-0 flex-col gap-1 bg-card p-3">
              <span className={LABEL}>Top</span>
              <span className="flex min-w-0 items-baseline gap-1.5 font-mono text-[13px] font-bold">
                <span className="truncate">{topPerson?.name ?? "—"}</span>
                {topPerson && <span className="text-[11px] font-normal text-muted-foreground tabular">{topPerson.affinity}/10</span>}
              </span>
            </div>
          </div>

          {/* ── Branches: filter + distribution ── */}
          <div className="border-2 border-foreground bg-card">
            <div className="flex items-center justify-between border-b-2 border-foreground px-3 py-2">
              <span className={LABEL}>── Ramas</span>
              {stickyBranch && (
                <button
                  onClick={() => setStickyBranch(null)}
                  className="font-mono text-[10px] text-muted-foreground uppercase hover:text-foreground"
                >
                  ver todas
                </button>
              )}
            </div>

            {branches.length === 0 ? (
              <p className="px-3 py-6 text-center font-mono text-[11px] text-muted-foreground">
                [ ] sin ramas · creá una con + Rama
              </p>
            ) : (
              <ul>
                {branches.map(b => {
                  const isStuck = stickyBranch === b.id;
                  const count   = branchMap[b.id]?.length ?? 0;
                  return (
                    <li
                      key={b.id}
                      className={`flex items-center border-b border-muted last:border-b-0 ${isStuck ? "bg-foreground text-background" : "hover:bg-muted"}`}
                    >
                      <button
                        onClick={() => setStickyBranch(s => s === b.id ? null : b.id)}
                        onMouseEnter={() => { if (!stickyBranch) setActiveBranch(b.id); }}
                        onMouseLeave={() => { if (!stickyBranch) setActiveBranch(null); }}
                        aria-pressed={isStuck}
                        aria-label={`Filtrar ${b.name}: ${count} vínculos`}
                        className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left font-mono text-[12px]"
                      >
                        <span aria-hidden className={`w-2 shrink-0 ${isStuck ? "text-primary" : "text-transparent"}`}>▸</span>
                        <span aria-hidden className="size-2.5 shrink-0" style={{ backgroundColor: b.color }} />
                        <span className="min-w-0 flex-1 truncate uppercase">{b.name}</span>
                        <span aria-hidden className={`shrink-0 select-none text-[10px] ${isStuck ? "" : "text-muted-foreground"}`}>
                          {asciiBar(count, maxCount, 8)}
                        </span>
                        <span className="w-5 shrink-0 text-right tabular">{count}</span>
                      </button>
                      <button
                        onClick={() => setBranchModal({ open: true, branch: b })}
                        aria-label={`Editar rama ${b.name}`}
                        className={`shrink-0 px-2.5 py-2 font-mono text-[11px] ${isStuck ? "text-background/70 hover:text-background" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        ✎
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>
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
