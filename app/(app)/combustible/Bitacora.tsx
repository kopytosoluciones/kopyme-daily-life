"use client";

import { useEffect, useRef, useState } from "react";
import { BASE_CURRENCY, sortCurrencies, walletsForMonth, type MonthCalc } from "@/lib/finance/calc";
import { fmt, fmtAmount, fmtSigned, monthLabel, parseAmount } from "@/lib/finance/format";
import type { FinanceMonth, MonthField, Wallet, WalletKind } from "@/lib/finance/types";

type Props = {
  wallets: Wallet[];
  rows: MonthCalc[];
  onBalance: (monthId: string, walletId: string, amount: number) => void;
  onField: (monthId: string, field: MonthField, value: number | string | null) => void;
  onFx: (monthId: string, currency: string, rate: number | null) => void;
  onOverride: (monthId: string, key: string, value: number | null) => void;
  onNewMonth: () => void;
  onAddWallets: (items: { name: string; currency: string; kind: WalletKind }[]) => void;
  onUpdateWallet: (id: string, patch: { name?: string; archived?: boolean }) => void;
  onReview: (monthId: string, reviewed: boolean) => void;
};

type ManualRow = {
  type: "manual";
  label: string;
  tag?: { text: string; tone: "muted" | "neg" };
  wallet?: Wallet;
  text?: boolean;
  neg?: boolean;
  get: (m: FinanceMonth) => number | string | null | undefined;
  enabled?: (m: FinanceMonth) => boolean;
  commit: (m: FinanceMonth, raw: string) => void;
};

type CalcRow = {
  type: "calc";
  label: string;
  overrideKey?: string;
  get: (r: MonthCalc) => number | null | undefined;
  missing?: (r: MonthCalc) => boolean;
  signed?: boolean;
  strong?: boolean;
  total?: boolean;
  flag?: (v: number, r: MonthCalc) => boolean;
};

type Row = { type: "group"; label: string } | ManualRow | CalcRow;

const DEVIATION_ALERT = 0.05;

export default function Bitacora(props: Props) {
  const { wallets, rows } = props;
  const tableRef = useRef<HTMLTableElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [addOpen, setAddOpen] = useState(false);
  const prevCount = useRef(rows.length);

  useEffect(() => {
    if (rows.length > prevCount.current && scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
      focusCell(0, rows.length - 1);
    }
    prevCount.current = rows.length;
  }, [rows.length]);

  // Síncrono: si el foco se mueve en un frame posterior, lo que se tipea rápido después de Enter cae en la celda anterior.
  function focusCell(r: number, c: number) {
    tableRef.current?.querySelector<HTMLElement>(`[data-r="${r}"][data-c="${c}"]`)?.focus();
  }

  const shownWallets = wallets.filter((w) => !w.archivedAt || rows.some((r) => r.month.balances[w.id] != null));
  const currencies = sortCurrencies([...shownWallets.map((w) => w.currency), ...rows.flatMap((r) => r.currencies)]);
  const visibleIn = (w: Wallet, m: FinanceMonth) => walletsForMonth([w], m).length > 0;

  const table: Row[] = [];
  for (const cur of currencies) {
    table.push({ type: "group", label: `Billeteras ${cur}` });
    for (const w of shownWallets.filter((x) => x.currency === cur)) {
      table.push({
        type: "manual",
        label: w.name,
        wallet: w,
        neg: w.kind === "debt",
        tag: w.kind === "debt" ? { text: "deuda", tone: "neg" } : w.archivedAt ? { text: "archivada", tone: "muted" } : undefined,
        get: (m) => m.balances[w.id] ?? (visibleIn(w, m) ? 0 : null),
        enabled: (m) => visibleIn(w, m),
        commit: (m, raw) => {
          const n = parseAmount(raw) ?? 0;
          if (n !== (m.balances[w.id] ?? 0)) props.onBalance(m.id, w.id, n);
        },
      });
    }
    table.push({ type: "calc", label: `Total ${cur}`, overrideKey: `totals.${cur}`, total: true, get: (r) => r.totals[cur] ?? null });
  }

  const foreign = currencies.filter((c) => c !== BASE_CURRENCY);
  if (foreign.length) {
    table.push({ type: "group", label: "Conversión" });
    for (const cur of foreign) {
      table.push({
        type: "manual",
        label: "Tipo de cambio",
        tag: { text: `${cur}/USD`, tone: "muted" },
        get: (m) => m.fxRates[cur] ?? null,
        commit: (m, raw) => {
          const n = parseAmount(raw);
          const rate = n && n > 0 ? n : null;
          if (rate !== (m.fxRates[cur] ?? null)) props.onFx(m.id, cur, rate);
        },
      });
      table.push({
        type: "calc",
        label: `${cur} → USD`,
        overrideKey: `converted.${cur}`,
        get: (r) => r.converted[cur] ?? null,
        missing: (r) => r.missingFx.includes(cur),
      });
    }
  }

  table.push({ type: "group", label: "Flujo del mes · USD" });
  for (const [field, label] of [["income", "Ingreso"], ["expense", "Gasto"]] as const) {
    table.push({
      type: "manual",
      label,
      get: (m) => m[field],
      commit: (m, raw) => {
        const n = parseAmount(raw) ?? 0;
        if (n !== m[field]) props.onField(m.id, field, n);
      },
    });
  }

  table.push({ type: "group", label: "Resultado · USD" });
  table.push({ type: "calc", label: "Patrimonio", overrideKey: "patrimony", strong: true, total: true, get: (r) => r.patrimony });
  table.push({ type: "calc", label: "Diferencia", overrideKey: "diff", signed: true, get: (r) => r.diff, flag: (v) => v < 0 });
  table.push({ type: "calc", label: "Esperado (ingreso − gasto)", signed: true, get: (r) => r.expected });
  table.push({
    type: "calc",
    label: "Desvío",
    signed: true,
    strong: true,
    get: (r) => r.deviation,
    flag: (v, r) => Math.abs(v) > Math.abs(r.month.income) * DEVIATION_ALERT,
  });

  table.push({ type: "group", label: "Fiscal · no suma" });
  table.push({
    type: "manual",
    label: "Facturado",
    get: (m) => m.invoiced,
    commit: (m, raw) => {
      const n = parseAmount(raw);
      if (n !== m.invoiced) props.onField(m.id, "invoiced", n);
    },
  });
  table.push({
    type: "manual",
    label: "Comentario",
    text: true,
    get: (m) => m.comment,
    commit: (m, raw) => {
      const v = raw.trim() || null;
      if (v !== m.comment) props.onField(m.id, "comment", v);
    },
  });

  let r = 0;
  const lastIdx = rows.length - 1;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={props.onNewMonth}
          className="border-2 border-foreground bg-primary px-3.5 py-2 font-mono text-xs tracking-[0.06em] text-primary-foreground uppercase shadow-hard-primary transition-transform duration-100 hover:-translate-x-px hover:-translate-y-px active:translate-x-1 active:translate-y-1 active:shadow-none"
        >
          + {rows.length ? `Nuevo mes` : "Empezar este mes"}
        </button>
        <button
          type="button"
          aria-expanded={addOpen}
          onClick={() => setAddOpen((o) => !o)}
          className="border-2 border-foreground bg-card px-3.5 py-2 font-mono text-xs tracking-[0.06em] uppercase shadow-hard transition-transform duration-100 hover:-translate-x-px hover:-translate-y-px active:translate-x-1 active:translate-y-1 active:shadow-none"
        >
          + Billetera
        </button>
        <span className="ml-auto hidden font-mono text-[11px] text-muted-foreground md:inline">
          <Kbd>↑</Kbd><Kbd>↓</Kbd> <Kbd>Enter</Kbd> moverse · <Kbd>Enter</Kbd> en gris = pisar cálculo · <Kbd>Esc</Kbd> volver al cálculo
        </span>
      </div>

      {addOpen && (
        <AddWallet
          onAdd={(item) => {
            props.onAddWallets([item]);
            setAddOpen(false);
          }}
        />
      )}

      {rows.length === 0 ? (
        <div className="border-2 border-dashed border-muted-foreground px-6 py-10 text-center font-mono text-xs text-muted-foreground">
          <pre aria-hidden className="mb-3 leading-tight">{"┌──────┐\n│  $_  │\n└──────┘"}</pre>
          Todavía no hay meses. Empezá con el mes actual.
        </div>
      ) : (
        <div ref={scrollRef} className="overflow-x-auto border-2 border-foreground bg-card">
          <table ref={tableRef} className="min-w-full border-collapse font-mono text-[12.5px] tabular">
            <thead>
              <tr>
                <th className="sticky top-0 left-0 z-20 min-w-[200px] border-r-2 border-foreground bg-foreground px-3.5 text-left text-[11px] font-medium tracking-[0.08em] text-background uppercase">
                  Campo
                </th>
                {rows.map((row, c) => {
                  const pending = !row.month.reviewedAt;
                  return (
                    <th
                      key={row.month.id}
                      className={`sticky top-0 h-8 border-r border-background/20 px-3 text-right text-[11px] font-medium tracking-[0.08em] whitespace-nowrap ${
                        c === lastIdx ? "bg-primary text-primary-foreground" : "bg-foreground text-background"
                      }`}
                    >
                      <span className="flex items-center justify-end gap-2">
                        {pending && (
                          <button
                            type="button"
                            onClick={() => props.onReview(row.month.id, true)}
                            title="Marcá el mes como actualizado para que deje de aparecer en Avisos"
                            className="border border-current px-1.5 py-px text-[10px] tracking-[0.06em] uppercase hover:bg-background hover:text-foreground"
                          >
                            ✓ listo
                          </button>
                        )}
                        {pending && <span aria-hidden title="Por revisar">!</span>}
                        {monthLabel(row.month.month)}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {table.map((row, i) => {
                if (row.type === "group")
                  return (
                    <tr key={`g${i}`}>
                      <th className="sticky left-0 z-10 h-[26px] border-y-2 border-r-2 border-foreground bg-background px-3.5 text-left text-[10px] font-normal tracking-[0.1em] text-muted-foreground uppercase">
                        {row.label}
                      </th>
                      <td colSpan={rows.length} className="border-y-2 border-foreground bg-background" />
                    </tr>
                  );
                const ri = r++;
                const isTotal = row.type === "calc" && row.total;
                return (
                  <tr key={`${row.type}${i}`} className={isTotal ? "border-t-2 border-foreground" : ""}>
                    <RowHeader row={row} onUpdateWallet={props.onUpdateWallet} />
                    {rows.map((calc, c) =>
                      row.type === "manual" ? (
                        <ManualCell key={calc.month.id} row={row} month={calc.month} r={ri} c={c} onMove={focusCell} />
                      ) : (
                        <CalcCell key={calc.month.id} row={row} calc={calc} r={ri} c={c} onMove={focusCell} onOverride={props.onOverride} />
                      ),
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap gap-5 font-mono text-[11px] text-muted-foreground">
        <Legend swatch="bg-card">manual</Legend>
        <Legend swatch="bg-muted">calculado</Legend>
        <Legend swatch="bg-primary/15">calculado pisado a mano *</Legend>
      </div>
    </section>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="mx-0.5 border border-muted-foreground px-1 font-mono">{children}</kbd>;
}

function Legend({ swatch, children }: { swatch: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <span aria-hidden className={`inline-block size-3.5 border border-muted-foreground ${swatch}`} />
      {children}
    </span>
  );
}

function RowHeader({ row, onUpdateWallet }: { row: ManualRow | CalcRow; onUpdateWallet: Props["onUpdateWallet"] }) {
  const [editing, setEditing] = useState(false);
  const wallet = row.type === "manual" ? row.wallet : undefined;
  const strong = row.type === "calc" && (row.strong || row.total);
  const base = `sticky left-0 z-10 h-8 min-w-[200px] border-r-2 border-b border-r-foreground border-b-muted bg-card px-3.5 text-left whitespace-nowrap ${strong ? "font-bold" : "font-normal"}`;

  if (wallet && editing)
    return (
      <th className={base}>
        <input
          autoFocus
          defaultValue={wallet.name}
          aria-label={`Renombrar ${wallet.name}`}
          className="w-[130px] border-b-2 border-primary bg-transparent font-mono text-[12.5px] outline-none"
          onBlur={(e) => {
            const name = e.target.value.trim();
            if (name && name !== wallet.name) onUpdateWallet(wallet.id, { name });
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") setEditing(false);
          }}
        />
      </th>
    );

  return (
    <th className={`${base} group`}>
      <span className={wallet?.archivedAt ? "text-muted-foreground line-through" : ""}>{row.label}</span>
      {row.type === "manual" && row.tag && (
        <span className={`ml-1.5 text-[10px] ${row.tag.tone === "neg" ? "text-destructive" : "text-muted-foreground"}`}>{row.tag.text}</span>
      )}
      {wallet && (
        <span className="ml-2 inline-flex gap-1.5 opacity-0 transition-opacity duration-100 group-focus-within:opacity-100 group-hover:opacity-100">
          <button type="button" onClick={() => setEditing(true)} className="text-[10px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
            renombrar
          </button>
          <button
            type="button"
            onClick={() => onUpdateWallet(wallet.id, { archived: !wallet.archivedAt })}
            className="text-[10px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            {wallet.archivedAt ? "reactivar" : "archivar"}
          </button>
        </span>
      )}
    </th>
  );
}

function display(v: number | string | null | undefined, text?: boolean): string {
  if (v == null) return "";
  if (text) return String(v);
  return typeof v === "number" ? fmtAmount(v) : v;
}

function ManualCell({
  row,
  month,
  r,
  c,
  onMove,
}: {
  row: ManualRow;
  month: FinanceMonth;
  r: number;
  c: number;
  onMove: (r: number, c: number) => void;
}) {
  const value = display(row.get(month), row.text);
  // Borrador solo mientras la celda tiene foco; fuera de foco se muestra el valor del estado.
  const [draft, setDraft] = useState<string | null>(null);
  const cancelled = useRef(false);
  const enabled = row.enabled ? row.enabled(month) : true;

  if (!enabled) return <td className="h-8 border-r border-b border-muted bg-background/50 px-3 text-right text-muted-foreground">—</td>;

  return (
    <td className="h-8 border-r border-b border-muted p-0">
      <input
        data-r={r}
        data-c={c}
        value={draft ?? value}
        inputMode={row.text ? "text" : "decimal"}
        placeholder={row.text ? "—" : undefined}
        aria-label={`${row.label} ${monthLabel(month.month)}`}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => {
          setDraft(value);
          if (!row.text) e.currentTarget.select();
        }}
        onBlur={() => {
          if (!cancelled.current && draft != null && draft !== value) row.commit(month, draft);
          cancelled.current = false;
          setDraft(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            cancelled.current = true;
            e.currentTarget.blur();
          } else if (e.key === "ArrowDown" || e.key === "Enter") {
            e.preventDefault();
            onMove(r + 1, c);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            onMove(r - 1, c);
          }
        }}
        className={`h-[31px] w-full min-w-[110px] bg-transparent px-3 outline-none focus:bg-primary/10 focus:outline-2 focus:-outline-offset-2 focus:outline-primary ${
          row.text ? "min-w-[170px] text-left text-muted-foreground" : "text-right"
        } ${row.neg ? "text-destructive" : ""}`}
      />
    </td>
  );
}

function CalcCell({
  row,
  calc,
  r,
  c,
  onMove,
  onOverride,
}: {
  row: CalcRow;
  calc: MonthCalc;
  r: number;
  c: number;
  onMove: (r: number, c: number) => void;
  onOverride: Props["onOverride"];
}) {
  const [editing, setEditing] = useState(false);
  const v = row.get(calc);
  const key = row.overrideKey;
  const overridden = key ? typeof calc.month.overrides[key] === "number" : false;
  const missing = row.missing?.(calc) ?? false;
  const flagged = v != null && row.flag ? row.flag(v, calc) : false;
  const rawValue = key ? calc.raw[key] : undefined;
  const title = !key
    ? "Calculado"
    : overridden
      ? `Pisado a mano. Esc para volver al cálculo (${rawValue == null ? "—" : fmt(Math.round(rawValue))})`
      : "Calculado. Enter o doble clic para pisar";

  const text = missing ? "falta TC" : v == null ? "—" : row.signed ? fmtSigned(v) : fmt(Math.round(v));

  if (editing && key)
    return (
      <td className="h-8 border-r border-b border-muted bg-primary/15 p-0">
        <input
          autoFocus
          defaultValue={v == null ? "" : fmt(Math.round(v))}
          aria-label={`Pisar ${row.label} ${monthLabel(calc.month.month)}`}
          onFocus={(e) => e.currentTarget.select()}
          onBlur={(e) => {
            const n = parseAmount(e.target.value);
            if (n != null && n !== v) onOverride(calc.month.id, key, n);
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") setEditing(false);
          }}
          className="h-[31px] w-full min-w-[110px] bg-transparent px-3 text-right outline-2 -outline-offset-2 outline-primary"
        />
      </td>
    );

  return (
    <td
      data-r={r}
      data-c={c}
      tabIndex={0}
      title={title}
      onDoubleClick={() => key && setEditing(true)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && key) {
          e.preventDefault();
          setEditing(true);
        } else if ((e.key === "Escape" || e.key === "Backspace" || e.key === "Delete") && key && overridden) {
          onOverride(calc.month.id, key, null);
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          onMove(r + 1, c);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          onMove(r - 1, c);
        }
      }}
      className={`relative h-8 min-w-[110px] border-r border-b border-muted px-3 text-right outline-none focus:outline-2 focus:-outline-offset-2 focus:outline-primary ${
        overridden ? "bg-primary/15" : "bg-muted"
      } ${key ? "cursor-cell" : ""} ${row.strong ? "text-[13.5px] font-bold" : row.total ? "font-bold" : ""} ${
        flagged || missing ? "text-destructive" : ""
      }`}
    >
      {overridden && <span aria-hidden className="absolute top-0.5 left-1.5 font-bold text-primary">*</span>}
      {text}
    </td>
  );
}

function AddWallet({ onAdd }: { onAdd: (item: { name: string; currency: string; kind: WalletKind }) => void }) {
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [kind, setKind] = useState<WalletKind>("asset");
  const field = "border-2 border-foreground bg-card px-2 py-1.5 font-mono text-xs";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const cur = currency.trim().toUpperCase();
        if (!name.trim() || !/^[A-Z]{3}$/.test(cur)) return;
        onAdd({ name: name.trim(), currency: cur, kind });
      }}
      className="flex flex-wrap items-center gap-2 border-[1.5px] border-dashed border-muted-foreground p-3"
    >
      <label htmlFor="aw-name" className="font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">Nombre</label>
      <input id="aw-name" autoFocus required placeholder="ej. Binance" value={name} onChange={(e) => setName(e.target.value)} className={`${field} w-40`} />
      <label htmlFor="aw-cur" className="font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">Moneda</label>
      <input id="aw-cur" list="aw-currencies" maxLength={3} value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} className={`${field} w-16 uppercase`} />
      <datalist id="aw-currencies">
        <option value="USD" /><option value="ARS" /><option value="EUR" /><option value="BRL" />
      </datalist>
      <label htmlFor="aw-kind" className="font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">Tipo</label>
      <select id="aw-kind" value={kind} onChange={(e) => setKind(e.target.value as WalletKind)} className={field}>
        <option value="asset">Activo</option>
        <option value="debt">Deuda</option>
      </select>
      <button type="submit" className="border-2 border-foreground bg-card px-3 py-1.5 font-mono text-xs uppercase shadow-hard active:translate-x-1 active:translate-y-1 active:shadow-none">
        Agregar
      </button>
    </form>
  );
}
