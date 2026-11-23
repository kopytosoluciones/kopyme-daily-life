"use server";

import { createClient } from "@/lib/supabase/server";
import { WALLET_COLUMNS, getMonth, toWallet } from "@/lib/supabase/finance";
import { addMonths, monthKey, nextMonthDraft } from "@/lib/finance/calc";
import type { FinanceMonth, MonthField, Wallet, WalletKind } from "@/lib/finance/types";

type Result<T = object> = { error: string | null } & Partial<T>;

const OVERRIDE_KEY = /^(totals|converted)\.[A-Z]{3}$|^patrimony$|^diff$/;
const CURRENCY = /^[A-Z]{3}$/;

async function authed() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

function finite(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

export async function createWallets(
  items: { name: string; currency: string; kind: WalletKind }[],
): Promise<Result<{ wallets: Wallet[] }>> {
  try {
    const clean = items
      .map((i) => ({ name: i.name.trim(), currency: i.currency.trim().toUpperCase(), kind: i.kind }))
      .filter((i) => i.name && CURRENCY.test(i.currency) && (i.kind === "asset" || i.kind === "debt"));
    if (!clean.length) return { error: "Nombre o moneda inválidos" };

    const { supabase, user } = await authed();
    if (!user) return { error: "No autenticado" };

    const { data: last } = await supabase
      .from("finance_wallets")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const base = (last?.sort_order ?? -1) + 1;

    const { data, error } = await supabase
      .from("finance_wallets")
      .insert(clean.map((i, idx) => ({ ...i, user_id: user.id, sort_order: base + idx })))
      .select(WALLET_COLUMNS);
    if (error) return { error: error.message };
    return { error: null, wallets: (data ?? []).map(toWallet) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

export async function updateWallet(
  id: string,
  patch: { name?: string; archived?: boolean },
): Promise<Result> {
  try {
    const { supabase, user } = await authed();
    if (!user) return { error: "No autenticado" };
    const update: { name?: string; archived_at?: string | null } = {};
    if (patch.name !== undefined) {
      const name = patch.name.trim();
      if (!name) return { error: "El nombre no puede estar vacío" };
      update.name = name;
    }
    if (patch.archived !== undefined) update.archived_at = patch.archived ? new Date().toISOString() : null;
    const { error } = await supabase.from("finance_wallets").update(update).eq("id", id);
    return { error: error?.message ?? null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

/** Crea el mes siguiente al último (o el mes actual si no hay ninguno), precargado con los fijos y saldos del anterior. */
export async function createNextMonth(): Promise<Result<{ month: FinanceMonth }>> {
  try {
    const { supabase, user } = await authed();
    if (!user) return { error: "No autenticado" };

    const [{ data: lastRow }, { data: walletRows }] = await Promise.all([
      supabase.from("finance_months").select("id").order("month", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("finance_wallets").select(WALLET_COLUMNS),
    ]);
    const prev = lastRow ? await getMonth(supabase, lastRow.id) : null;
    const wallets = (walletRows ?? []).map(toWallet);
    const target = prev ? addMonths(prev.month, 1) : monthKey(new Date());
    const draft = nextMonthDraft(prev ?? undefined, wallets, target);

    const { data: created, error } = await supabase
      .from("finance_months")
      .insert({
        user_id: user.id,
        month: draft.month,
        fx_rates: draft.fxRates,
        income: draft.income,
        expense: draft.expense,
      })
      .select("id")
      .single();
    if (error || !created) return { error: error?.message ?? "No se pudo crear el mes" };

    const balances = Object.entries(draft.balances).map(([wallet_id, amount]) => ({
      user_id: user.id,
      month_id: created.id,
      wallet_id,
      amount,
    }));
    if (balances.length) {
      const { error: bErr } = await supabase.from("finance_balances").insert(balances);
      if (bErr) return { error: bErr.message };
    }

    return { error: null, month: { ...draft, id: created.id } };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

export async function updateMonthField(
  monthId: string,
  field: MonthField,
  value: number | string | null,
): Promise<Result> {
  try {
    if (!["income", "expense", "invoiced", "comment"].includes(field)) return { error: "Campo inválido" };
    if (field === "comment") {
      if (value !== null && typeof value !== "string") return { error: "Comentario inválido" };
    } else if (field === "invoiced") {
      if (value !== null && !finite(value)) return { error: "Número inválido" };
    } else if (!finite(value)) return { error: "Número inválido" };

    const { supabase, user } = await authed();
    if (!user) return { error: "No autenticado" };
    const stored = field === "comment" && typeof value === "string" ? value.trim() || null : value;
    const { error } = await supabase.from("finance_months").update({ [field]: stored }).eq("id", monthId);
    return { error: error?.message ?? null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

async function patchJson(
  monthId: string,
  column: "fx_rates" | "overrides",
  key: string,
  value: number | null,
): Promise<Result> {
  const { supabase, user } = await authed();
  if (!user) return { error: "No autenticado" };
  const { data, error: readErr } = await supabase.from("finance_months").select(column).eq("id", monthId).single();
  if (readErr || !data) return { error: readErr?.message ?? "Mes no encontrado" };
  const current = ((data as Record<string, unknown>)[column] ?? {}) as Record<string, number>;
  const next = { ...current };
  if (value === null) delete next[key];
  else next[key] = value;
  const { error } = await supabase.from("finance_months").update({ [column]: next }).eq("id", monthId);
  return { error: error?.message ?? null };
}

export async function setFxRate(monthId: string, currency: string, rate: number | null): Promise<Result> {
  try {
    if (!CURRENCY.test(currency)) return { error: "Moneda inválida" };
    if (rate !== null && (!finite(rate) || rate <= 0)) return { error: "El tipo de cambio tiene que ser mayor a 0" };
    return await patchJson(monthId, "fx_rates", currency, rate);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

export async function setOverride(monthId: string, key: string, value: number | null): Promise<Result> {
  try {
    if (!OVERRIDE_KEY.test(key)) return { error: "Campo inválido" };
    if (value !== null && !finite(value)) return { error: "Número inválido" };
    return await patchJson(monthId, "overrides", key, value);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

export async function setBalance(monthId: string, walletId: string, amount: number): Promise<Result> {
  try {
    if (!finite(amount)) return { error: "Número inválido" };
    const { supabase, user } = await authed();
    if (!user) return { error: "No autenticado" };
    const { error } = await supabase
      .from("finance_balances")
      .upsert(
        { user_id: user.id, month_id: monthId, wallet_id: walletId, amount },
        { onConflict: "month_id,wallet_id" },
      );
    return { error: error?.message ?? null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error desconocido" };
  }
}
