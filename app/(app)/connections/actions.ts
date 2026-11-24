"use server";

import { createClient } from "@/lib/supabase/server";
import { GROUP_COLUMNS, PERSON_COLUMNS, toGroup, toPerson } from "@/lib/supabase/connections";
import { GROUP_KINDS, defaultPosition, type Group, type GroupKind, type LegacyData, type Person } from "@/lib/connections/types";

type Result<T = object> = { error: string | null } & Partial<T>;

async function authed() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

const isKind = (k: unknown): k is GroupKind => (GROUP_KINDS as readonly unknown[]).includes(k);
const clampAffinity = (n: number) => Math.max(1, Math.min(10, Math.round(n)));
const fail = (e: unknown) => ({ error: e instanceof Error ? e.message : "Error desconocido" });

export async function createGroup(name: string, kind: GroupKind, x: number, y: number): Promise<Result<{ group: Group }>> {
  try {
    const clean = name.trim();
    if (!clean) return { error: "El grupo necesita un nombre" };
    if (!isKind(kind)) return { error: "Tipo inválido" };
    const { supabase, user } = await authed();
    if (!user) return { error: "No autenticado" };
    const { count } = await supabase.from("connection_groups").select("id", { count: "exact", head: true });
    const { data, error } = await supabase
      .from("connection_groups")
      .insert({ user_id: user.id, name: clean, kind, pos_x: Math.round(x), pos_y: Math.round(y), sort_order: count ?? 0 })
      .select(GROUP_COLUMNS)
      .single();
    if (error || !data) return { error: error?.message ?? "No se pudo crear el grupo" };
    return { error: null, group: toGroup(data) };
  } catch (e) {
    return fail(e);
  }
}

export async function updateGroup(
  id: string,
  patch: { name?: string; kind?: GroupKind; x?: number; y?: number },
): Promise<Result> {
  try {
    const update: Record<string, string | number> = {};
    if (patch.name !== undefined) {
      if (!patch.name.trim()) return { error: "El grupo necesita un nombre" };
      update.name = patch.name.trim();
    }
    if (patch.kind !== undefined) {
      if (!isKind(patch.kind)) return { error: "Tipo inválido" };
      update.kind = patch.kind;
    }
    if (patch.x !== undefined) update.pos_x = Math.round(patch.x);
    if (patch.y !== undefined) update.pos_y = Math.round(patch.y);
    const { supabase, user } = await authed();
    if (!user) return { error: "No autenticado" };
    const { error } = await supabase.from("connection_groups").update(update).eq("id", id);
    return { error: error?.message ?? null };
  } catch (e) {
    return fail(e);
  }
}

/** Borra el grupo; sus personas quedan "sin grupo" (no se borran). */
export async function deleteGroup(id: string): Promise<Result> {
  try {
    const { supabase, user } = await authed();
    if (!user) return { error: "No autenticado" };
    const { error } = await supabase.from("connection_groups").delete().eq("id", id);
    return { error: error?.message ?? null };
  } catch (e) {
    return fail(e);
  }
}

export async function createPerson(groupId: string | null, name: string, affinity = 5): Promise<Result<{ person: Person }>> {
  try {
    const clean = name.trim();
    if (!clean) return { error: "La persona necesita un nombre" };
    const { supabase, user } = await authed();
    if (!user) return { error: "No autenticado" };
    const { data, error } = await supabase
      .from("connections")
      .insert({ user_id: user.id, name: clean, group_id: groupId, affinity: clampAffinity(affinity) })
      .select(PERSON_COLUMNS)
      .single();
    if (error || !data) return { error: error?.message ?? "No se pudo agregar" };
    return { error: null, person: toPerson(data) };
  } catch (e) {
    return fail(e);
  }
}

export async function updatePerson(
  id: string,
  patch: { name?: string; groupId?: string | null; affinity?: number; notes?: string | null; lastContact?: string | null },
): Promise<Result> {
  try {
    const update: Record<string, string | number | null> = {};
    if (patch.name !== undefined) {
      if (!patch.name.trim()) return { error: "La persona necesita un nombre" };
      update.name = patch.name.trim();
    }
    if (patch.groupId !== undefined) update.group_id = patch.groupId;
    if (patch.affinity !== undefined) update.affinity = clampAffinity(patch.affinity);
    if (patch.notes !== undefined) update.notes = patch.notes?.trim() || null;
    if (patch.lastContact !== undefined) update.last_contact = patch.lastContact || null;
    const { supabase, user } = await authed();
    if (!user) return { error: "No autenticado" };
    const { error } = await supabase.from("connections").update(update).eq("id", id);
    return { error: error?.message ?? null };
  } catch (e) {
    return fail(e);
  }
}

export async function deletePerson(id: string): Promise<Result> {
  try {
    const { supabase, user } = await authed();
    if (!user) return { error: "No autenticado" };
    const { error } = await supabase.from("connections").delete().eq("id", id);
    return { error: error?.message ?? null };
  } catch (e) {
    return fail(e);
  }
}

// Nombres viejos (ramas de localStorage) → grupos nuevos. Lo que no matchea va a "Amigos sueltos".
const LEGACY_MAP: [RegExp, string][] = [
  [/^ort$|podcast/i, "Podcast"],
  [/famil/i, "Familia"],
  [/macabi|pekele/i, "Pekele"],
  [/utn|facu|univ/i, "Facultad"],
  [/atom|trabajo/i, "Atom"],
  [/terap/i, "Los terapeutas"],
];
const FALLBACK_GROUP = "Amigos sueltos";

/**
 * Importa los vínculos guardados en localStorage de un navegador.
 * Reusa grupos por nombre (sin distinguir mayúsculas) y no duplica personas que ya estén en ese grupo.
 */
export async function importLegacy(data: LegacyData): Promise<Result<{ groups: Group[]; people: Person[]; imported: number }>> {
  try {
    if (!data || !Array.isArray(data.branches) || !Array.isArray(data.people)) return { error: "Datos inválidos" };
    const { supabase, user } = await authed();
    if (!user) return { error: "No autenticado" };

    const { data: existing } = await supabase.from("connection_groups").select(GROUP_COLUMNS);
    const groups = (existing ?? []).map(toGroup);
    const byName = new Map(groups.map((g) => [g.name.toLowerCase(), g]));

    async function ensureGroup(name: string): Promise<Group | null> {
      const hit = byName.get(name.toLowerCase());
      if (hit) return hit;
      const pos = defaultPosition(groups.length, groups.length + 1);
      const { data: row } = await supabase
        .from("connection_groups")
        .insert({ user_id: user!.id, name, kind: name === "Familia" ? "familia" : name === "Atom" ? "trabajo" : name === "Pekele" ? "comunidad" : "amistad", pos_x: pos.x, pos_y: pos.y, sort_order: groups.length })
        .select(GROUP_COLUMNS)
        .single();
      if (!row) return null;
      const g = toGroup(row);
      groups.push(g);
      byName.set(name.toLowerCase(), g);
      return g;
    }

    const target = new Map<string, Group | null>();
    for (const b of data.branches) {
      const mapped = LEGACY_MAP.find(([re]) => re.test(b.name.trim()))?.[1] ?? FALLBACK_GROUP;
      target.set(b.id, await ensureGroup(mapped));
    }

    const { data: currentPeople } = await supabase.from("connections").select("name, group_id");
    const seen = new Set((currentPeople ?? []).map((p) => `${p.group_id}|${p.name.toLowerCase()}`));
    const rows = [];
    for (const p of data.people) {
      const name = String(p.name ?? "").trim();
      if (!name) continue;
      const g = target.get(p.branchId) ?? (await ensureGroup(FALLBACK_GROUP));
      const key = `${g?.id ?? null}|${name.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        user_id: user.id,
        name,
        group_id: g?.id ?? null,
        affinity: clampAffinity(Number(p.affinity) || 5),
        notes: p.notes?.trim() || null,
        last_contact: p.lastContact && /^\d{4}-\d{2}-\d{2}$/.test(p.lastContact) ? p.lastContact : null,
      });
    }
    if (rows.length) {
      const { error } = await supabase.from("connections").insert(rows);
      if (error) return { error: error.message };
    }

    const { data: allPeople } = await supabase.from("connections").select(PERSON_COLUMNS);
    return { error: null, groups, people: (allPeople ?? []).map(toPerson), imported: rows.length };
  } catch (e) {
    return fail(e);
  }
}
