import type { FinanceMonth, Overrides, Wallet } from "./types";

export const BASE_CURRENCY = "USD";

export type MonthCalc = {
  month: FinanceMonth;
  /** Monedas con billeteras visibles en este mes, USD primero. */
  currencies: string[];
  /** Total firmado por moneda (activos − deudas), en esa moneda. */
  totals: Record<string, number>;
  /** Total por moneda convertido a USD. null si falta el tipo de cambio. */
  converted: Record<string, number | null>;
  patrimony: number;
  /** Patrimonio − patrimonio del mes anterior. null en el primer mes. */
  diff: number | null;
  /** Ingreso − gasto. */
  expected: number;
  /** Diferencia real − esperada. null en el primer mes. */
  deviation: number | null;
  /** Monedas sin tipo de cambio cargado (excluidas del patrimonio). */
  missingFx: string[];
  /** Valores calculados sin overrides, para mostrar "volver al cálculo". */
  raw: Record<string, number | null>;
};

export function sortCurrencies(currencies: Iterable<string>): string[] {
  return [...new Set(currencies)].sort((a, b) =>
    a === BASE_CURRENCY ? -1 : b === BASE_CURRENCY ? 1 : a.localeCompare(b),
  );
}

/** Billeteras que se muestran en un mes: activas, o archivadas con saldo cargado ese mes. */
export function walletsForMonth(wallets: Wallet[], month: FinanceMonth): Wallet[] {
  return wallets.filter((w) => !w.archivedAt || month.balances[w.id] != null);
}

function pick(overrides: Overrides, key: string, calculated: number): number {
  const v = overrides[key];
  return typeof v === "number" && Number.isFinite(v) ? v : calculated;
}

export function computeMonths(wallets: Wallet[], months: FinanceMonth[]): MonthCalc[] {
  const sorted = [...months].sort((a, b) => a.month.localeCompare(b.month));
  let prev: MonthCalc | null = null;

  return sorted.map((m) => {
    const visible = walletsForMonth(wallets, m);
    const currencies = sortCurrencies(visible.map((w) => w.currency));
    const totals: Record<string, number> = {};
    const converted: Record<string, number | null> = {};
    const raw: Record<string, number | null> = {};
    const missingFx: string[] = [];

    for (const cur of currencies) {
      const rawTotal = visible
        .filter((w) => w.currency === cur)
        .reduce((sum, w) => sum + (w.kind === "debt" ? -1 : 1) * (m.balances[w.id] ?? 0), 0);
      raw[`totals.${cur}`] = rawTotal;
      totals[cur] = pick(m.overrides, `totals.${cur}`, rawTotal);

      if (cur === BASE_CURRENCY) {
        converted[cur] = totals[cur];
        continue;
      }
      const rate = m.fxRates[cur];
      const rawConverted = rate && rate > 0 ? totals[cur] / rate : totals[cur] === 0 ? 0 : null;
      raw[`converted.${cur}`] = rawConverted;
      const override = m.overrides[`converted.${cur}`];
      if (typeof override === "number") converted[cur] = override;
      else if (rawConverted == null) {
        converted[cur] = null;
        missingFx.push(cur);
      } else converted[cur] = rawConverted;
    }

    const rawPatrimony = Object.values(converted).reduce<number>((s, v) => s + (v ?? 0), 0);
    raw.patrimony = rawPatrimony;
    const patrimony = pick(m.overrides, "patrimony", rawPatrimony);

    const rawDiff = prev ? patrimony - prev.patrimony : null;
    raw.diff = rawDiff;
    const diff = rawDiff == null ? null : pick(m.overrides, "diff", rawDiff);

    const expected = m.income - m.expense;
    const result: MonthCalc = {
      month: m,
      currencies,
      totals,
      converted,
      patrimony,
      diff,
      expected,
      deviation: diff == null ? null : diff - expected,
      missingFx,
      raw,
    };
    prev = result;
    return result;
  });
}

/** Zona horaria de referencia para decidir cuándo empieza un mes (el server de Vercel corre en UTC). */
export const APP_TIME_ZONE = "America/Argentina/Buenos_Aires";

export function monthKey(date: Date, timeZone = APP_TIME_ZONE): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit" }).formatToParts(date);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  return `${y}-${m}-01`;
}

export function todayKey(date = new Date(), timeZone = APP_TIME_ZONE): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const idx = y * 12 + (m - 1) + n;
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, "0")}-01`;
}

/** Un mes nuevo arranca con los fijos y saldos del anterior. */
export function nextMonthDraft(
  prev: FinanceMonth | undefined,
  wallets: Wallet[],
  month: string,
): Omit<FinanceMonth, "id"> {
  const active = new Set(wallets.filter((w) => !w.archivedAt).map((w) => w.id));
  const balances: Record<string, number> = {};
  if (prev) for (const [id, v] of Object.entries(prev.balances)) if (active.has(id)) balances[id] = v;
  return {
    month,
    fxRates: { ...(prev?.fxRates ?? {}) },
    income: prev?.income ?? 0,
    expense: prev?.expense ?? 0,
    invoiced: null,
    comment: null,
    overrides: {},
    reviewedAt: null,
    balances,
  };
}

export type Projection = { months: number; target: string; plan: number; real: number | null };

export function project(rows: MonthCalc[], horizons: number[] = [3, 12, 60]): Projection[] {
  const last = rows.at(-1);
  if (!last) return [];
  const save = last.month.income - last.month.expense;
  const diffs = rows.slice(-3).map((r) => r.diff).filter((d): d is number => d != null);
  const realAvg = diffs.length ? diffs.reduce((a, b) => a + b, 0) / diffs.length : null;
  return horizons.map((n) => ({
    months: n,
    target: addMonths(last.month.month, n),
    plan: last.patrimony + save * n,
    real: realAvg == null ? null : last.patrimony + realAvg * n,
  }));
}

export type SimParams = {
  income: number;
  expense: number;
  /** % anual de aumento del ingreso. */
  growth: number;
  /** % del ahorro (y del patrimonio inicial) que se invierte. */
  investPct: number;
  /** % de rendimiento anual. */
  returnPct: number;
  years: number;
};

export type SimPoint = { month: number; total: number; contributed: number };

export function simulate(p: SimParams, start: number): SimPoint[] {
  const n = Math.round(p.years * 12);
  const monthlyReturn = Math.pow(1 + p.returnPct / 100, 1 / 12) - 1;
  const share = p.investPct / 100;
  let invested = start * share;
  let cash = start - invested;
  let contributed = start;
  const out: SimPoint[] = [{ month: 0, total: start, contributed }];
  for (let k = 1; k <= n; k++) {
    const income = p.income * Math.pow(1 + p.growth / 100, Math.floor((k - 1) / 12));
    const save = income - p.expense;
    const toInvest = Math.max(0, save) * share;
    invested = invested * (1 + monthlyReturn) + toInvest;
    cash += save - toInvest;
    contributed += save;
    out.push({ month: k, total: invested + cash, contributed });
  }
  return out;
}
