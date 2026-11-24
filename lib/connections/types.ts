export const GROUP_KINDS = ["amistad", "familia", "trabajo", "comunidad", "otro"] as const;
export type GroupKind = (typeof GROUP_KINDS)[number];

export type Group = {
  id: string;
  name: string;
  kind: GroupKind;
  /** Posición en el mapa relativa al centro (vos = 0,0). */
  x: number;
  y: number;
  sortOrder: number;
};

export type Person = {
  id: string;
  name: string;
  groupId: string | null;
  affinity: number;
  notes: string | null;
  lastContact: string | null;
};

/** Formato viejo de localStorage (`kopyme-connections-v1`), solo para importar. */
export type LegacyData = {
  branches: { id: string; name: string }[];
  people: { name: string; branchId: string; affinity?: number; notes?: string; lastContact?: string }[];
};

export const LEGACY_STORAGE_KEY = "kopyme-connections-v1";

/** Posición por defecto del grupo n-ésimo: anillo alrededor del centro. */
export function defaultPosition(index: number, total: number): { x: number; y: number } {
  const n = Math.max(total, 6);
  const angle = (index / n) * 2 * Math.PI - Math.PI / 2;
  return { x: Math.round(Math.cos(angle) * 330), y: Math.round(Math.sin(angle) * 220) };
}
