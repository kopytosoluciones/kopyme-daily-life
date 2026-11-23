export type WalletKind = "asset" | "debt";

export type Wallet = {
  id: string;
  name: string;
  currency: string;
  kind: WalletKind;
  sortOrder: number;
  archivedAt: string | null;
};

/** Claves: `totals.<CUR>`, `converted.<CUR>`, `patrimony`, `diff`. */
export type Overrides = Record<string, number>;

export type FinanceMonth = {
  id: string;
  /** Primer día del mes, `YYYY-MM-01`. */
  month: string;
  /** Unidades de cada moneda por 1 USD. */
  fxRates: Record<string, number>;
  income: number;
  expense: number;
  invoiced: number | null;
  comment: string | null;
  overrides: Overrides;
  /** walletId → saldo en la moneda de la billetera (deudas en positivo). */
  balances: Record<string, number>;
};

export type MonthField = "income" | "expense" | "invoiced" | "comment";
