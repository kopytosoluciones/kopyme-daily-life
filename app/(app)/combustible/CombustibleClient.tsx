"use client";

import { useMemo, useState, useTransition } from "react";
import { computeMonths, monthKey } from "@/lib/finance/calc";
import { fmt, monthLabel, monthLong } from "@/lib/finance/format";
import type { FinanceMonth, MonthField, Wallet, WalletKind } from "@/lib/finance/types";
import {
  createNextMonth,
  createWallets,
  setBalance,
  setFxRate,
  setOverride,
  updateMonthField,
  updateWallet,
} from "./actions";
import Bitacora from "./Bitacora";
import Onboarding from "./Onboarding";

type Status = { kind: "idle" } | { kind: "saving" } | { kind: "saved" } | { kind: "error"; message: string };
type NewWallet = { name: string; currency: string; kind: WalletKind };

const TABS = [
  { id: "tablero", label: "Tablero", ready: false },
  { id: "bitacora", label: "Bitácora", ready: true },
  { id: "simulador", label: "Simulador", ready: false },
] as const;

export default function CombustibleClient({
  initialWallets,
  initialMonths,
  loadError,
}: {
  initialWallets: Wallet[];
  initialMonths: FinanceMonth[];
  loadError: string | null;
}) {
  // Estado local autoritativo: las actions no revalidan, así que los props del server no cambian en la sesión.
  const [wallets, setWallets] = useState(initialWallets);
  const [months, setMonths] = useState(initialMonths);
  const [status, setStatus] = useState<Status>(loadError ? { kind: "error", message: loadError } : { kind: "idle" });
  const [, startTransition] = useTransition();

  const rows = useMemo(() => computeMonths(wallets, months), [wallets, months]);
  const last = rows.at(-1);

  function save(action: () => Promise<{ error: string | null }>) {
    setStatus({ kind: "saving" });
    startTransition(async () => {
      const r = await action();
      setStatus(r.error ? { kind: "error", message: r.error } : { kind: "saved" });
    });
  }

  function patchMonth(id: string, fn: (m: FinanceMonth) => FinanceMonth) {
    setMonths((ms) => ms.map((m) => (m.id === id ? fn(m) : m)));
  }

  const handlers = {
    onBalance(monthId: string, walletId: string, amount: number) {
      patchMonth(monthId, (m) => ({ ...m, balances: { ...m.balances, [walletId]: amount } }));
      save(() => setBalance(monthId, walletId, amount));
    },
    onField(monthId: string, field: MonthField, value: number | string | null) {
      patchMonth(monthId, (m) => ({ ...m, [field]: value }));
      save(() => updateMonthField(monthId, field, value));
    },
    onFx(monthId: string, currency: string, rate: number | null) {
      patchMonth(monthId, (m) => {
        const fxRates = { ...m.fxRates };
        if (rate == null) delete fxRates[currency];
        else fxRates[currency] = rate;
        return { ...m, fxRates };
      });
      save(() => setFxRate(monthId, currency, rate));
    },
    onOverride(monthId: string, key: string, value: number | null) {
      patchMonth(monthId, (m) => {
        const overrides = { ...m.overrides };
        if (value == null) delete overrides[key];
        else overrides[key] = value;
        return { ...m, overrides };
      });
      save(() => setOverride(monthId, key, value));
    },
    onNewMonth() {
      save(async () => {
        const r = await createNextMonth();
        if (r.month) setMonths((ms) => [...ms, r.month!]);
        return r;
      });
    },
    onAddWallets(items: NewWallet[], thenStartMonth = false) {
      save(async () => {
        const r = await createWallets(items);
        if (r.error || !r.wallets) return r;
        setWallets((ws) => [...ws, ...r.wallets!]);
        if (!thenStartMonth) return r;
        const m = await createNextMonth();
        if (m.month) setMonths((ms) => [...ms, m.month!]);
        return m;
      });
    },
    onUpdateWallet(id: string, patch: { name?: string; archived?: boolean }) {
      setWallets((ws) =>
        ws.map((w) =>
          w.id === id
            ? {
                ...w,
                ...(patch.name !== undefined ? { name: patch.name } : {}),
                ...(patch.archived !== undefined ? { archivedAt: patch.archived ? new Date().toISOString() : null } : {}),
              }
            : w,
        ),
      );
      save(() => updateWallet(id, patch));
    },
  };

  const fxSummary = last
    ? Object.entries(last.month.fxRates)
        .map(([cur, rate]) => `TC ${fmt(rate, rate % 1 ? 2 : 0)} ${cur}/USD`)
        .join(" · ")
    : "";
  const activeWallets = wallets.filter((w) => !w.archivedAt).length;

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-4 py-7 md:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[40px] leading-none font-bold tracking-[-0.02em]">
            Combustible<span className="k-cursor">_</span>
          </h1>
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            {last
              ? `último registro ${monthLabel(last.month.month)} · ${activeWallets} billeteras${fxSummary ? " · " + fxSummary : ""}`
              : "tu patrimonio, mes a mes"}
          </p>
        </div>
        <SaveStatus status={status} />
      </header>

      {wallets.length === 0 ? (
        <Onboarding
          firstMonthLabel={monthLong(monthKey(new Date()))}
          busy={status.kind === "saving"}
          onStart={(items) => handlers.onAddWallets(items, true)}
        />
      ) : (
        <>
          <div role="tablist" aria-label="Vistas" className="flex w-fit max-w-full overflow-x-auto border-2 border-foreground bg-card">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={t.id === "bitacora"}
                disabled={!t.ready}
                className={`border-r-2 border-foreground px-5 py-2.5 font-mono text-xs tracking-[0.08em] whitespace-nowrap uppercase last:border-r-0 ${
                  t.id === "bitacora" ? "bg-foreground text-background" : "text-muted-foreground"
                } disabled:cursor-not-allowed`}
              >
                {t.label}
                {!t.ready && <span className="ml-2 text-[10px] opacity-70">pronto</span>}
              </button>
            ))}
          </div>

          <Bitacora wallets={wallets} rows={rows} {...handlers} />
        </>
      )}
    </div>
  );
}

function SaveStatus({ status }: { status: Status }) {
  const base = "font-mono text-[11px] uppercase tracking-[0.06em]";
  if (status.kind === "saving") return <span className={`${base} text-muted-foreground`} aria-live="polite">● guardando…</span>;
  if (status.kind === "saved") return <span className={`${base} text-pos`} aria-live="polite">✓ guardado</span>;
  if (status.kind === "error")
    return (
      <span className={`${base} max-w-md border-2 border-destructive px-2 py-1 text-destructive normal-case`} role="alert">
        ✗ No se guardó: {status.message}
      </span>
    );
  return null;
}
