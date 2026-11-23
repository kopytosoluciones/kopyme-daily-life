"use client";

import { useState } from "react";
import type { WalletKind } from "@/lib/finance/types";

type Item = { name: string; currency: string; kind: WalletKind };

const PRESETS: Item[] = [
  { name: "Banco EEUU", currency: "USD", kind: "asset" },
  { name: "Revolut", currency: "USD", kind: "asset" },
  { name: "Wise", currency: "USD", kind: "asset" },
  { name: "Deel", currency: "USD", kind: "asset" },
  { name: "Efectivo", currency: "USD", kind: "asset" },
  { name: "Deuda mamá", currency: "USD", kind: "debt" },
  { name: "BBVA", currency: "ARS", kind: "asset" },
  { name: "Mercado Pago", currency: "ARS", kind: "asset" },
  { name: "Efectivo", currency: "ARS", kind: "asset" },
  { name: "Tarjeta", currency: "ARS", kind: "debt" },
];

const keyOf = (i: Item) => `${i.name}|${i.currency}|${i.kind}`;

export default function Onboarding({
  firstMonthLabel,
  busy,
  onStart,
}: {
  firstMonthLabel: string;
  busy: boolean;
  onStart: (items: Item[]) => void;
}) {
  const [items, setItems] = useState<Item[]>(PRESETS);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(PRESETS.map(keyOf)));
  const [draft, setDraft] = useState<Item>({ name: "", currency: "USD", kind: "asset" });

  function toggle(i: Item) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(keyOf(i))) next.delete(keyOf(i));
      else next.add(keyOf(i));
      return next;
    });
  }

  function add(e: React.FormEvent) {
    e.preventDefault();
    const item = { ...draft, name: draft.name.trim(), currency: draft.currency.trim().toUpperCase() };
    if (!item.name || !/^[A-Z]{3}$/.test(item.currency)) return;
    if (!items.some((i) => keyOf(i) === keyOf(item))) setItems((xs) => [...xs, item]);
    setSelected((s) => new Set(s).add(keyOf(item)));
    setDraft({ name: "", currency: item.currency, kind: "asset" });
  }

  const chosen = items.filter((i) => selected.has(keyOf(i)));
  const currencies = [...new Set(items.map((i) => i.currency))].sort((a, b) => (a === "USD" ? -1 : b === "USD" ? 1 : a.localeCompare(b)));

  return (
    <section className="border-2 border-foreground bg-card">
      <div className="border-b-2 border-foreground px-6 py-5">
        <p className="font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">── Primer uso</p>
        <h2 className="mt-2 text-2xl font-bold">¿Dónde tenés la plata?</h2>
        <p className="mt-1 max-w-[60ch] text-muted-foreground">
          Elegí tus billeteras. Las de abajo salen de tu planilla: sacá las que no uses y agregá las que falten.
          Las deudas restan del patrimonio. Después podés sumar, renombrar o archivar desde la Bitácora.
        </p>
      </div>

      <div className="grid gap-6 px-6 py-5 md:grid-cols-2">
        {currencies.map((cur) => (
          <div key={cur} className="flex flex-col gap-2">
            <p className="font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">Billeteras {cur}</p>
            <div className="flex flex-wrap gap-2">
              {items
                .filter((i) => i.currency === cur)
                .map((i) => {
                  const on = selected.has(keyOf(i));
                  return (
                    <button
                      key={keyOf(i)}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggle(i)}
                      className={`border-2 px-3 py-1.5 font-mono text-xs ${
                        on ? "border-foreground bg-foreground text-background" : "border-dashed border-muted-foreground text-muted-foreground"
                      }`}
                    >
                      {on ? "■" : "□"} {i.name}
                      {i.kind === "debt" && <span className={`ml-1.5 text-[10px] ${on ? "opacity-80" : "text-destructive"}`}>deuda</span>}
                    </button>
                  );
                })}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={add} className="mx-6 mb-5 flex flex-wrap items-center gap-2 border-[1.5px] border-dashed border-muted-foreground p-3">
        <span className="font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">+ Otra</span>
        <input
          id="ob-name"
          aria-label="Nombre"
          placeholder="ej. Binance"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          className="w-40 border-2 border-foreground bg-card px-2 py-1.5 font-mono text-xs"
        />
        <input
          id="ob-cur"
          aria-label="Moneda"
          list="ob-currencies"
          maxLength={3}
          value={draft.currency}
          onChange={(e) => setDraft({ ...draft, currency: e.target.value.toUpperCase() })}
          className="w-16 border-2 border-foreground bg-card px-2 py-1.5 font-mono text-xs uppercase"
        />
        <datalist id="ob-currencies">
          <option value="USD" /><option value="ARS" /><option value="EUR" /><option value="BRL" />
        </datalist>
        <select
          id="ob-kind"
          aria-label="Tipo"
          value={draft.kind}
          onChange={(e) => setDraft({ ...draft, kind: e.target.value as WalletKind })}
          className="border-2 border-foreground bg-card px-2 py-1.5 font-mono text-xs"
        >
          <option value="asset">Activo</option>
          <option value="debt">Deuda</option>
        </select>
        <button type="submit" className="border-2 border-foreground bg-card px-3 py-1.5 font-mono text-xs uppercase shadow-hard active:translate-x-1 active:translate-y-1 active:shadow-none">
          Agregar
        </button>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t-2 border-foreground px-6 py-4">
        <span className="font-mono text-xs text-muted-foreground">
          {chosen.length} billeteras · arrancás con {firstMonthLabel}
        </span>
        <button
          type="button"
          disabled={!chosen.length || busy}
          onClick={() => onStart(chosen)}
          className="border-2 border-foreground bg-primary px-4 py-2.5 font-mono text-xs tracking-[0.06em] text-primary-foreground uppercase shadow-hard-primary transition-transform duration-100 hover:-translate-x-px hover:-translate-y-px active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-50"
        >
          {busy ? "Creando…" : "Crear y empezar →"}
        </button>
      </div>
    </section>
  );
}
