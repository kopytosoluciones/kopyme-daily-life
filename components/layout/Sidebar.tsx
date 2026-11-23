"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/(auth)/login/actions";
import NoticesPanel from "./NoticesPanel";
import type { Notice } from "@/lib/notifications";

const modules = [
  { href: "/dashboard",   label: "Inicio"     },
  { href: "/tree",        label: "Árbol"      },
  { href: "/habits",      label: "Hábitos"    },
  { href: "/todos",       label: "Checklists" },
  { href: "/calendar",    label: "Calendario" },
  { href: "/diary",       label: "Diario"     },
  { href: "/goals",       label: "Metas"      },
  { href: "/connections", label: "Vínculos"   },
  { href: "/combustible", label: "Combustible" },
  { href: "/memories",    label: "Recuerdos"  },
  { href: "/letters",     label: "Cartas"     },
];

const itemBase =
  "flex w-full items-center gap-2.5 px-5 py-[7px] font-mono text-xs uppercase tracking-[0.06em] text-left";

function Item({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`${itemBase} ${active ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
    >
      <span aria-hidden className={`w-2.5 ${active ? "text-primary" : ""}`}>{active ? "▸" : "·"}</span>
      {label}
    </Link>
  );
}

export default function Sidebar({ notices }: { notices: Notice[] }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  return (
    <aside className="sticky top-0 z-10 flex h-screen w-[200px] shrink-0 flex-col border-r-2 border-foreground bg-background">
      <div className="px-5 pt-6 pb-5 font-mono text-[13px] font-bold tracking-[0.04em]">
        KOPYME<span className="font-normal text-muted-foreground">/v2</span>
      </div>

      <nav aria-label="Módulos" className="flex-1 overflow-y-auto">
        {modules.map((m) => (
          <Item key={m.href} {...m} active={isActive(m.href)} />
        ))}
      </nav>

      <div className="flex flex-col border-t-2 border-foreground py-4">
        <NoticesPanel notices={notices} />
        <div>
          <Item href="/settings" label="Ajustes" active={isActive("/settings")} />
          <form action={logout}>
            <button type="submit" className={`${itemBase} text-muted-foreground hover:text-foreground`}>
              <span aria-hidden className="w-2.5">·</span>
              Salir
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
