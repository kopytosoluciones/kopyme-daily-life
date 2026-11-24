"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { GROUP_KINDS, LEGACY_STORAGE_KEY, defaultPosition, type Group, type GroupKind, type LegacyData, type Person } from "@/lib/connections/types";
import { createGroup, createPerson, deleteGroup, deletePerson, importLegacy, updateGroup, updatePerson } from "./actions";

const LABEL = "font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase";
const BTN = "border-2 border-foreground bg-card px-3.5 py-2 font-mono text-xs tracking-[0.06em] uppercase shadow-hard transition-transform duration-100 hover:-translate-x-px hover:-translate-y-px active:translate-x-1 active:translate-y-1 active:shadow-none disabled:pointer-events-none disabled:opacity-40";
const BTN_PRIMARY = "border-2 border-foreground bg-primary px-3.5 py-2 font-mono text-xs tracking-[0.06em] text-primary-foreground uppercase shadow-hard-primary transition-transform duration-100 hover:-translate-x-px hover:-translate-y-px active:translate-x-1 active:translate-y-1 active:shadow-none disabled:pointer-events-none disabled:opacity-40";
const FIELD = "border-2 border-foreground bg-card px-2.5 py-1.5 font-mono text-sm outline-none focus:bg-primary/10";
const IMPORTED_FLAG = "kopyme-connections-imported";
const CARD_W = 236;
const CANVAS_H = 760;

type Status = { kind: "idle" } | { kind: "saving" } | { kind: "saved" } | { kind: "error"; message: string };

function bar(n: number, width = 10) {
  const k = Math.max(0, Math.min(width, Math.round((n / 10) * width)));
  return "█".repeat(k) + "░".repeat(width - k);
}

// ─── Legacy (localStorage) detection ──────────────────────────────────────────

function readLegacy(): string {
  try {
    if (localStorage.getItem(IMPORTED_FLAG)) return "";
    return localStorage.getItem(LEGACY_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}
const subscribeStorage = (cb: () => void) => {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
};

// ─── Modal shell ──────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4" onClick={onClose}>
      <div role="dialog" aria-label={title} className="w-full max-w-sm border-2 border-foreground bg-card shadow-hard-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b-2 border-foreground px-4 py-2.5">
          <span className={LABEL}>── {title}</span>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="font-mono text-xs text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <div className="flex flex-col gap-4 p-4">{children}</div>
      </div>
    </div>
  );
}

function KindPicker({ value, onChange }: { value: GroupKind; onChange: (k: GroupKind) => void }) {
  return (
    <div role="radiogroup" aria-label="Tipo de grupo" className="flex flex-wrap gap-1.5">
      {GROUP_KINDS.map((k) => (
        <button
          key={k}
          type="button"
          role="radio"
          aria-checked={value === k}
          onClick={() => onChange(k)}
          className={`border-2 border-foreground px-2.5 py-1 font-mono text-[11px] uppercase ${value === k ? "bg-foreground text-background" : "bg-card hover:bg-muted"}`}
        >
          {k}
        </button>
      ))}
    </div>
  );
}

function GroupModal({
  group,
  onClose,
  onSave,
  onDelete,
}: {
  group: Group | null;
  onClose: () => void;
  onSave: (name: string, kind: GroupKind) => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(group?.name ?? "");
  const [kind, setKind] = useState<GroupKind>(group?.kind ?? "amistad");
  const [confirm, setConfirm] = useState(false);
  return (
    <Modal title={group ? "Editar grupo" : "Nuevo grupo"} onClose={onClose}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) onSave(name.trim(), kind);
        }}
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="group-name" className={LABEL}>Nombre</label>
          <input id="group-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Podcast" className={FIELD} />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className={LABEL}>Tipo</span>
          <KindPicker value={kind} onChange={setKind} />
        </div>
        <div className="flex gap-2">
          {onDelete &&
            (confirm ? (
              <button type="button" onClick={onDelete} className="border-2 border-destructive bg-destructive/10 px-3 py-2 font-mono text-xs text-destructive uppercase">
                ¿Seguro? Borrar
              </button>
            ) : (
              <button type="button" onClick={() => setConfirm(true)} className="border-2 border-destructive bg-card px-3 py-2 font-mono text-xs text-destructive uppercase hover:bg-destructive/10">
                Borrar
              </button>
            ))}
          <button type="submit" disabled={!name.trim()} className={`${BTN_PRIMARY} flex-1`}>
            {group ? "Guardar" : "Crear grupo"}
          </button>
        </div>
        {confirm && <p className="font-mono text-[11px] text-muted-foreground">Las personas del grupo no se borran: quedan en &ldquo;Sin grupo&rdquo;.</p>}
      </form>
    </Modal>
  );
}

function PersonModal({
  person,
  groups,
  onClose,
  onSave,
  onDelete,
}: {
  person: Person;
  groups: Group[];
  onClose: () => void;
  onSave: (patch: { name: string; groupId: string | null; affinity: number; notes: string | null; lastContact: string | null }) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(person.name);
  const [groupId, setGroupId] = useState<string | null>(person.groupId);
  const [affinity, setAffinity] = useState(person.affinity);
  const [notes, setNotes] = useState(person.notes ?? "");
  const [lastContact, setLastContact] = useState(person.lastContact ?? "");
  const [confirm, setConfirm] = useState(false);
  return (
    <Modal title="Persona" onClose={onClose}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) onSave({ name: name.trim(), groupId, affinity, notes: notes || null, lastContact: lastContact || null });
        }}
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="person-name" className={LABEL}>Nombre</label>
          <input id="person-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} className={FIELD} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="person-group" className={LABEL}>Grupo</label>
          <select id="person-group" value={groupId ?? ""} onChange={(e) => setGroupId(e.target.value || null)} className={FIELD}>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
            <option value="">Sin grupo</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className={LABEL}>Afinidad · <span className="text-foreground tabular">{affinity}/10</span></span>
          <div className="flex gap-1" role="radiogroup" aria-label="Afinidad">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={affinity === n}
                aria-label={`Afinidad ${n}`}
                onClick={() => setAffinity(n)}
                className={`h-5 flex-1 border-2 border-foreground ${n <= affinity ? "bg-foreground" : "bg-card hover:bg-muted"}`}
              />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="person-contact" className={LABEL}>Último contacto</label>
          <input id="person-contact" type="date" value={lastContact} onChange={(e) => setLastContact(e.target.value)} className={FIELD} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="person-notes" className={LABEL}>Notas</label>
          <textarea id="person-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className={`${FIELD} resize-none font-sans`} />
        </div>
        <div className="flex gap-2">
          {confirm ? (
            <button type="button" onClick={onDelete} className="border-2 border-destructive bg-destructive/10 px-3 py-2 font-mono text-xs text-destructive uppercase">¿Seguro? Borrar</button>
          ) : (
            <button type="button" onClick={() => setConfirm(true)} className="border-2 border-destructive bg-card px-3 py-2 font-mono text-xs text-destructive uppercase hover:bg-destructive/10">Borrar</button>
          )}
          <button type="submit" disabled={!name.trim()} className={`${BTN_PRIMARY} flex-1`}>Guardar</button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Group card (tabla) ───────────────────────────────────────────────────────

function GroupCard({
  title,
  kind,
  people,
  dragging,
  onHeaderPointerDown,
  onEdit,
  onAdd,
  onOpenPerson,
}: {
  title: string;
  kind: GroupKind | null;
  people: Person[];
  dragging?: boolean;
  onHeaderPointerDown?: (e: React.PointerEvent) => void;
  onEdit?: () => void;
  onAdd?: (name: string) => void;
  onOpenPerson: (p: Person) => void;
}) {
  const [draft, setDraft] = useState("");
  return (
    <section className={`flex w-full flex-col border-2 border-foreground bg-card ${dragging ? "shadow-hard-lg" : "shadow-hard"}`}>
      <header
        onPointerDown={onHeaderPointerDown}
        className={`flex items-center gap-2 border-b-2 border-foreground bg-foreground px-3 py-2 text-background select-none ${onHeaderPointerDown ? "cursor-grab touch-none active:cursor-grabbing" : ""}`}
      >
        {onHeaderPointerDown && <span aria-hidden className="font-mono text-xs opacity-60">⠿</span>}
        <h3 className="min-w-0 flex-1 truncate font-bold">{title}</h3>
        <span className="font-mono text-[10px] tabular opacity-70">[{people.length}]</span>
        {onEdit && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onEdit}
            aria-label={`Editar grupo ${title}`}
            className="font-mono text-[11px] opacity-70 hover:opacity-100"
          >
            ✎
          </button>
        )}
      </header>
      {kind && (
        <div className="border-b border-muted px-3 py-1">
          <span className="font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase">tipo · {kind}</span>
        </div>
      )}
      <ul className="max-h-[260px] overflow-y-auto">
        {people.length === 0 && <li className="px-3 py-3 font-mono text-[11px] text-muted-foreground">[ ] sin personas</li>}
        {people.map((p) => (
          <li key={p.id} className="border-b border-muted last:border-b-0">
            <button type="button" onClick={() => onOpenPerson(p)} className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-muted">
              <span className="min-w-0 flex-1 truncate text-sm">{p.name}</span>
              <span aria-hidden className="font-mono text-[10px] tracking-[-1px] text-muted-foreground">{bar(p.affinity, 6)}</span>
              <span className="w-5 text-right font-mono text-[11px] tabular">{p.affinity}</span>
            </button>
          </li>
        ))}
      </ul>
      {onAdd && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.trim()) return;
            onAdd(draft.trim());
            setDraft("");
          }}
          className="border-t border-dashed border-muted-foreground"
        >
          <label className="flex items-center gap-2 px-3 py-1.5">
            <span aria-hidden className="font-mono text-xs text-muted-foreground">+</span>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onPointerDown={(e) => e.stopPropagation()}
              placeholder="agregar persona…"
              aria-label={`Agregar persona a ${title}`}
              className="min-w-0 flex-1 bg-transparent font-mono text-[12px] outline-none placeholder:text-muted-foreground"
            />
          </label>
        </form>
      )}
    </section>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function VinculosClient({ initialGroups, initialPeople, loadError }: { initialGroups: Group[]; initialPeople: Person[]; loadError: string | null }) {
  const [groups, setGroups] = useState(initialGroups);
  const [people, setPeople] = useState(initialPeople);
  const [status, setStatus] = useState<Status>(loadError ? { kind: "error", message: loadError } : { kind: "idle" });
  const [modal, setModal] = useState<{ type: "group"; group: Group | null } | { type: "person"; person: Person } | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const canvasRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; sx: number; sy: number; ox: number; oy: number; x: number; y: number } | null>(null);
  const legacyRaw = useSyncExternalStore(subscribeStorage, readLegacy, () => "");
  const [importDismissed, setImportDismissed] = useState(false);

  function save(action: () => Promise<{ error: string | null }>) {
    setStatus({ kind: "saving" });
    startTransition(async () => {
      const r = await action();
      setStatus(r.error ? { kind: "error", message: r.error } : { kind: "saved" });
    });
  }

  const ungrouped = people.filter((p) => !p.groupId || !groups.some((g) => g.id === p.groupId));
  const avg = people.length ? people.reduce((s, p) => s + p.affinity, 0) / people.length : 0;

  // ── Drag ──
  const onPointerMove = useCallback((e: PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const el = canvasRef.current;
    const halfW = el ? el.clientWidth / 2 - CARD_W / 2 - 8 : 600;
    const halfH = CANVAS_H / 2 - 40;
    d.x = Math.max(-halfW, Math.min(halfW, d.ox + e.clientX - d.sx));
    d.y = Math.max(-halfH, Math.min(halfH, d.oy + e.clientY - d.sy));
    setGroups((gs) => gs.map((g) => (g.id === d.id ? { ...g, x: d.x, y: d.y } : g)));
  }, []);

  const onPointerUp = useCallback(() => {
    const d = drag.current;
    drag.current = null;
    setDragId(null);
    window.removeEventListener("pointermove", onPointerMove);
    if (d && (d.x !== d.ox || d.y !== d.oy)) save(() => updateGroup(d.id, { x: d.x, y: d.y }));
  }, [onPointerMove]);

  function startDrag(g: Group, e: React.PointerEvent) {
    if (e.button !== 0) return;
    drag.current = { id: g.id, sx: e.clientX, sy: e.clientY, ox: g.x, oy: g.y, x: g.x, y: g.y };
    setDragId(g.id);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp, { once: true });
  }

  // ── CRUD ──
  function addGroup(name: string, kind: GroupKind) {
    const pos = defaultPosition(groups.length, groups.length + 1);
    setModal(null);
    save(async () => {
      const r = await createGroup(name, kind, pos.x, pos.y);
      if (r.group) setGroups((gs) => [...gs, r.group!]);
      return r;
    });
  }

  function editGroup(id: string, name: string, kind: GroupKind) {
    setGroups((gs) => gs.map((g) => (g.id === id ? { ...g, name, kind } : g)));
    setModal(null);
    save(() => updateGroup(id, { name, kind }));
  }

  function removeGroup(id: string) {
    setGroups((gs) => gs.filter((g) => g.id !== id));
    setPeople((ps) => ps.map((p) => (p.groupId === id ? { ...p, groupId: null } : p)));
    setModal(null);
    save(() => deleteGroup(id));
  }

  function addPerson(groupId: string | null, name: string) {
    save(async () => {
      const r = await createPerson(groupId, name);
      if (r.person) setPeople((ps) => [...ps, r.person!]);
      return r;
    });
  }

  function editPerson(id: string, patch: { name: string; groupId: string | null; affinity: number; notes: string | null; lastContact: string | null }) {
    setPeople((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    setModal(null);
    save(() => updatePerson(id, patch));
  }

  function removePerson(id: string) {
    setPeople((ps) => ps.filter((p) => p.id !== id));
    setModal(null);
    save(() => deletePerson(id));
  }

  function runImport() {
    let data: LegacyData;
    try {
      data = JSON.parse(legacyRaw);
    } catch {
      setStatus({ kind: "error", message: "No pude leer los datos guardados en este navegador" });
      return;
    }
    save(async () => {
      const r = await importLegacy(data);
      if (!r.error && r.groups && r.people) {
        setGroups(r.groups);
        setPeople(r.people);
        try {
          localStorage.setItem(IMPORTED_FLAG, new Date().toISOString());
        } catch {}
        setImportDismissed(true);
      }
      return r;
    });
  }

  const peopleOf = (g: Group) => people.filter((p) => p.groupId === g.id);
  const showImport = !!legacyRaw && !importDismissed;

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-4 py-7 md:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[40px] leading-none font-bold tracking-[-0.02em]">
            Vínculos<span className="k-cursor">_</span>
          </h1>
          <p className="mt-2 font-mono text-xs text-muted-foreground tabular">
            {people.length} personas · {groups.length} grupos · afinidad media {avg.toLocaleString("es-AR", { maximumFractionDigits: 1 })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SaveStatus status={status} />
          <button type="button" onClick={() => setModal({ type: "group", group: null })} className={BTN_PRIMARY}>+ Grupo</button>
        </div>
      </header>

      {showImport && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-2 border-dashed border-foreground px-4 py-3">
          <p className="text-sm">
            Este navegador tiene vínculos guardados de la versión anterior. Importalos a tu cuenta: ORT → Podcast, Macabi → Pekele, Universidad → Facultad, Trabajo → Atom y el resto a Amigos sueltos.
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setImportDismissed(true)} className="px-2 font-mono text-[11px] text-muted-foreground uppercase hover:text-foreground">ahora no</button>
            <button type="button" onClick={runImport} className={BTN}>Importar →</button>
          </div>
        </div>
      )}

      {/* Mapa: escritorio */}
      <div
        ref={canvasRef}
        className="relative hidden overflow-hidden border-2 border-foreground md:block"
        style={{
          height: CANVAS_H,
          backgroundColor: "var(--background)",
          backgroundImage: "radial-gradient(var(--muted) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      >
        <svg aria-hidden className="pointer-events-none absolute top-1/2 left-1/2 overflow-visible" width="0" height="0">
          {groups.map((g) => (
            <line
              key={g.id}
              x1={0}
              y1={0}
              x2={g.x}
              y2={g.y}
              stroke={dragId === g.id ? "var(--primary)" : "var(--muted-foreground)"}
              strokeWidth={dragId === g.id ? 2 : 1.5}
              strokeDasharray={g.kind === "familia" ? undefined : "6 5"}
            />
          ))}
        </svg>

        <div className="absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 border-2 border-foreground bg-foreground px-4 py-3 font-mono text-sm font-bold tracking-[0.1em] text-background">
          VOS
        </div>

        {groups.map((g) => (
          <div
            key={g.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `calc(50% + ${g.x}px)`, top: `calc(50% + ${g.y}px)`, width: CARD_W, zIndex: dragId === g.id ? 30 : 20 }}
          >
            <GroupCard
              title={g.name}
              kind={g.kind}
              people={peopleOf(g)}
              dragging={dragId === g.id}
              onHeaderPointerDown={(e) => startDrag(g, e)}
              onEdit={() => setModal({ type: "group", group: g })}
              onAdd={(name) => addPerson(g.id, name)}
              onOpenPerson={(p) => setModal({ type: "person", person: p })}
            />
          </div>
        ))}

        {ungrouped.length > 0 && (
          <div className="absolute bottom-3 left-3 z-20" style={{ width: CARD_W }}>
            <GroupCard title="Sin grupo" kind={null} people={ungrouped} onOpenPerson={(p) => setModal({ type: "person", person: p })} />
          </div>
        )}

        {groups.length === 0 && (
          <p className="absolute top-[calc(50%+48px)] left-1/2 -translate-x-1/2 font-mono text-xs text-muted-foreground">Creá tu primer grupo con &ldquo;+ Grupo&rdquo;.</p>
        )}
        <p className="absolute right-3 bottom-2 font-mono text-[10px] text-muted-foreground">arrastrá los grupos desde su título</p>
      </div>

      {/* Lista: celular */}
      <div className="flex flex-col gap-4 md:hidden">
        <div className="self-center border-2 border-foreground bg-foreground px-4 py-2 font-mono text-sm font-bold tracking-[0.1em] text-background">VOS</div>
        {groups.map((g) => (
          <GroupCard
            key={g.id}
            title={g.name}
            kind={g.kind}
            people={peopleOf(g)}
            onEdit={() => setModal({ type: "group", group: g })}
            onAdd={(name) => addPerson(g.id, name)}
            onOpenPerson={(p) => setModal({ type: "person", person: p })}
          />
        ))}
        {ungrouped.length > 0 && <GroupCard title="Sin grupo" kind={null} people={ungrouped} onOpenPerson={(p) => setModal({ type: "person", person: p })} />}
      </div>

      {modal?.type === "group" && (
        <GroupModal
          group={modal.group}
          onClose={() => setModal(null)}
          onSave={(name, kind) => (modal.group ? editGroup(modal.group.id, name, kind) : addGroup(name, kind))}
          onDelete={modal.group ? () => removeGroup(modal.group!.id) : undefined}
        />
      )}
      {modal?.type === "person" && (
        <PersonModal
          person={modal.person}
          groups={groups}
          onClose={() => setModal(null)}
          onSave={(patch) => editPerson(modal.person.id, patch)}
          onDelete={() => removePerson(modal.person.id)}
        />
      )}
    </div>
  );
}

function SaveStatus({ status }: { status: Status }) {
  const base = "font-mono text-[11px] uppercase tracking-[0.06em]";
  if (status.kind === "saving") return <span className={`${base} text-muted-foreground`} aria-live="polite">● guardando…</span>;
  if (status.kind === "saved") return <span className={`${base} text-pos`} aria-live="polite">✓ guardado</span>;
  if (status.kind === "error")
    return <span role="alert" className={`${base} max-w-md border-2 border-destructive px-2 py-1 text-destructive normal-case`}>✗ No se guardó: {status.message}</span>;
  return null;
}
