import type { SupabaseClient } from "@supabase/supabase-js";
import { GROUP_KINDS, type Group, type GroupKind, type Person } from "@/lib/connections/types";

export const GROUP_COLUMNS = "id, name, kind, pos_x, pos_y, sort_order";
export const PERSON_COLUMNS = "id, name, group_id, affinity, notes, last_contact";

type GroupRow = { id: string; name: string; kind: string; pos_x: number; pos_y: number; sort_order: number };
type PersonRow = { id: string; name: string; group_id: string | null; affinity: number; notes: string | null; last_contact: string | null };

export function toGroup(r: GroupRow): Group {
  return {
    id: r.id,
    name: r.name,
    kind: (GROUP_KINDS as readonly string[]).includes(r.kind) ? (r.kind as GroupKind) : "otro",
    x: r.pos_x,
    y: r.pos_y,
    sortOrder: r.sort_order,
  };
}

export function toPerson(r: PersonRow): Person {
  return { id: r.id, name: r.name, groupId: r.group_id, affinity: r.affinity, notes: r.notes, lastContact: r.last_contact };
}

export async function getConnections(
  supabase: SupabaseClient,
): Promise<{ groups: Group[]; people: Person[]; error: string | null }> {
  const [g, p] = await Promise.all([
    supabase.from("connection_groups").select(GROUP_COLUMNS).order("sort_order").order("created_at"),
    supabase.from("connections").select(PERSON_COLUMNS).order("affinity", { ascending: false }).order("name"),
  ]);
  return {
    groups: ((g.data ?? []) as GroupRow[]).map(toGroup),
    people: ((p.data ?? []) as PersonRow[]).map(toPerson),
    error: g.error?.message ?? p.error?.message ?? null,
  };
}
