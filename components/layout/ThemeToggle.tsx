"use client";

import { useState, startTransition } from "react";
import { setTheme } from "@/app/actions/theme";
import type { Theme } from "@/lib/theme";

const OPTIONS: { value: Theme; label: string }[] = [
  { value: "system", label: "Sist" },
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
];

export default function ThemeToggle({ initial }: { initial: Theme }) {
  const [theme, setLocal] = useState<Theme>(initial);

  function choose(next: Theme) {
    setLocal(next);
    const root = document.documentElement;
    if (next === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", next);
    startTransition(() => {
      setTheme(next);
    });
  }

  return (
    <div role="radiogroup" aria-label="Tema" className="flex border-2 border-foreground">
      {OPTIONS.map(({ value, label }) => {
        const on = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => choose(value)}
            className={`flex-1 border-r border-foreground px-1.5 py-1 font-mono text-[10px] uppercase tracking-[0.06em] last:border-r-0 ${
              on ? "bg-foreground text-background" : "bg-card hover:bg-muted"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
