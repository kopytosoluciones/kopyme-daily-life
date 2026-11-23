import type { SupabaseClient } from "@supabase/supabase-js";
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
    balances: Object.fromEntries(r.finance_balances.map((b) => [b.wallet_id, Number(b.amount)])),
  };
}

export const WALLET_COLUMNS = "id, name, currency, kind, sort_order, archived_at";
const MONTH_COLUMNS =
  "id, month, fx_rates, income, expense, invoiced, comment, overrides, finance_balances (wallet_id, amount)";

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
