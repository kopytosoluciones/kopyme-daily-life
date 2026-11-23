"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { Notice } from "@/lib/notifications";

export default function NoticesPanel({ notices }: { notices: Notice[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const [openedAt, setOpenedAt] = useState(pathname);

  if (open && openedAt !== pathname) {
    setOpen(false);
    setOpenedAt(pathname);
  }

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const count = notices.length;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="notices-panel"
        onClick={() => {
          setOpenedAt(pathname);
          setOpen((o) => !o);
        }}
        className={`flex w-full items-center gap-2.5 px-5 py-[7px] text-left font-mono text-xs tracking-[0.06em] uppercase ${
          open ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <span aria-hidden className={`w-2.5 ${count ? "text-primary" : ""}`}>{count ? "!" : "·"}</span>
        Avisos
        <span className={`ml-auto ${count ? "bg-primary px-1.5 text-primary-foreground" : "text-muted-foreground"}`}>
          {count ? count : "0"}
        </span>
      </button>

      {open && (
        <div
          id="notices-panel"
          role="dialog"
          aria-label="Avisos"
          className="absolute bottom-0 left-[calc(100%+10px)] z-30 w-[340px] max-w-[calc(100vw-220px)] border-2 border-foreground bg-card shadow-hard-lg"
        >
          <div className="flex items-center justify-between border-b-2 border-foreground px-4 py-2.5">
            <span className="font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">── Avisos</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" className="font-mono text-xs text-muted-foreground hover:text-foreground">
              ✕
            </button>
          </div>
          {count === 0 ? (
            <p className="px-4 py-6 text-center font-mono text-xs text-muted-foreground">
              <span aria-hidden className="block text-base text-pos">[ ✓ ]</span>
              Todo al día.
            </p>
          ) : (
            <ul className="max-h-[60vh] overflow-y-auto">
              {notices.map((n) => (
                <li key={n.id} className="border-b border-muted last:border-b-0">
                  <Link href={n.href} className="group flex gap-3 px-4 py-3 hover:bg-muted">
                    <span className="flex-1">
                      <span className="block font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase">{n.area}</span>
                      <span className="text-sm leading-snug">{n.text}</span>
                    </span>
                    <span aria-hidden className="self-center font-mono text-xs text-muted-foreground group-hover:text-primary">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
