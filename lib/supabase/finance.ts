import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addMonths, monthKey, nextMonthDraft } from "@/lib/finance/calc";
import { createClient } from "@/lib/supabase/server";
import type { FinanceMonth, Overrides, Wallet, WalletKind } from "@/lib/finance/types";

type WalletRow = {
  id: string;
  name: string;
  currency: string;
  kind: string;
  sort_order: number;
  archived_at: string | null;
};

type MonthRow = {
  id: string;
  month: string;
  fx_rates: unknown;
  income: number | string;
  expense: number | string;
  invoiced: number | string | null;
  comment: string | null;
  overrides: unknown;
  reviewed_at: string | null;
  finance_balances: { wallet_id: string; amount: number | string }[];
};

function numberRecord(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(value)) {
    const n = Number(v);
    if (Number.isFinite(n)) out[k] = n;
  }
  return out;
}

export function toWallet(r: WalletRow): Wallet {
  return {
    id: r.id,
    name: r.name,
    currency: r.currency,
    kind: (r.kind === "debt" ? "debt" : "asset") as WalletKind,
    sortOrder: r.sort_order,
    archivedAt: r.archived_at,
  };
}

function toMonth(r: MonthRow): FinanceMonth {
  return {
    id: r.id,
    month: r.month,
    fxRates: numberRecord(r.fx_rates),
    income: Number(r.income),
    expense: Number(r.expense),
    invoiced: r.invoiced == null ? null : Number(r.invoiced),
    comment: r.comment,
    overrides: numberRecord(r.overrides) as Overrides,
    reviewedAt: r.reviewed_at,
    balances: Object.fromEntries(r.finance_balances.map((b) => [b.wallet_id, Number(b.amount)])),
  };
}

export const WALLET_COLUMNS = "id, name, currency, kind, sort_order, archived_at";
const MONTH_COLUMNS =
  "id, month, fx_rates, income, expense, invoiced, comment, overrides, reviewed_at, finance_balances (wallet_id, amount)";

export async function getFinanceData(
  supabase: SupabaseClient,
): Promise<{ wallets: Wallet[]; months: FinanceMonth[]; error: string | null }> {
  const [w, m] = await Promise.all([
    supabase.from("finance_wallets").select(WALLET_COLUMNS).order("sort_order").order("created_at"),
    supabase.from("finance_months").select(MONTH_COLUMNS).order("month"),
  ]);
  const error = w.error?.message ?? m.error?.message ?? null;
  return {
    wallets: ((w.data ?? []) as WalletRow[]).map(toWallet),
    months: ((m.data ?? []) as MonthRow[]).map(toMonth),
    error,
  };
}

export async function getMonth(supabase: SupabaseClient, id: string): Promise<FinanceMonth | null> {
  const { data } = await supabase.from("finance_months").select(MONTH_COLUMNS).eq("id", id).single();
  return data ? toMonth(data as MonthRow) : null;
}

/** Inserta un mes con sus saldos. */
export async function insertMonth(
  supabase: SupabaseClient,
  userId: string,
  draft: Omit<FinanceMonth, "id">,
): Promise<{ month: FinanceMonth | null; error: string | null }> {
  const { data: created, error } = await supabase
    .from("finance_months")
    .insert({
      user_id: userId,
      month: draft.month,
      fx_rates: draft.fxRates,
      income: draft.income,
      expense: draft.expense,
    })
    .select("id")
    .single();
  if (error || !created) return { month: null, error: error?.message ?? "No se pudo crear el mes" };

  const balances = Object.entries(draft.balances).map(([wallet_id, amount]) => ({
    user_id: userId,
    month_id: created.id,
    wallet_id,
    amount,
  }));
  if (balances.length) {
    const { error: bErr } = await supabase.from("finance_balances").insert(balances);
    if (bErr) return { month: null, error: bErr.message };
  }
  return { month: { ...draft, id: created.id }, error: null };
}

/**
 * Crea los meses que faltan entre el último registrado y el actual, cada uno precargado con el anterior.
 * Cacheado por request (clave: userId): el layout (avisos) y la página de Combustible esperan la misma ejecución.
 * Sin ningún mes no hace nada (eso lo resuelve el onboarding).
 */
export const ensureCurrentMonths = cache(async (userId: string): Promise<number> => {
  const supabase = await createClient();
  const current = monthKey(new Date());
  const { data: lastRow } = await supabase
    .from("finance_months")
    .select("id, month")
    .order("month", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!lastRow || lastRow.month >= current) return 0;

  const [prevMonth, { data: walletRows }] = await Promise.all([
    getMonth(supabase, lastRow.id),
    supabase.from("finance_wallets").select(WALLET_COLUMNS),
  ]);
  if (!prevMonth) return 0;
  const wallets = ((walletRows ?? []) as WalletRow[]).map(toWallet);

  let prev = prevMonth;
  let created = 0;
  for (let target = addMonths(prev.month, 1); target <= current; target = addMonths(target, 1)) {
    const { month, error } = await insertMonth(supabase, userId, nextMonthDraft(prev, wallets, target));
    if (error || !month) break; // 23505 = otro request ya lo creó
    prev = month;
    created++;
  }
  return created;
});
