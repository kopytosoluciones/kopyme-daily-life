"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/(auth)/login/actions";

const modules = [
  { href: "/dashboard",   icon: "🥚", label: "Inicio"           },
  { href: "/habits",      icon: "🌱", label: "Hábitos"          },
  { href: "/todos",       icon: "✅", label: "To-dos"           },
  { href: "/mood",        icon: "🌊", label: "Estado de ánimo"  },
  { href: "/diary",       icon: "📖", label: "Diario"           },
  { href: "/goals",       icon: "🎯", label: "Metas"            },
  { href: "/connections", icon: "🕸️",  label: "Vínculos"       },
  { href: "/memories",    icon: "📸", label: "Recuerdos"        },
  { href: "/letters",     icon: "✉️",  label: "Cartas & Regalos"},
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 h-screen sticky top-0 flex flex-col bg-[#EDE8DF] border-r border-[#D9D0C0]">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-[#D9D0C0]">
        <span className="font-[family-name:var(--font-lora)] text-2xl font-bold text-[#2C2416] tracking-tight">
          kopyme
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        {modules.map(({ href, icon, label }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                active
                  ? "bg-[#E07B4A] text-[#FDFAF4] font-medium shadow-sm"
                  : "text-[#7A6E5F] hover:bg-[#E2D9C8] hover:text-[#2C2416]"
              }`}
            >
              <span className="text-base leading-none">{icon}</span>
              <span className="leading-none">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-[#D9D0C0] space-y-0.5">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#7A6E5F] hover:bg-[#E2D9C8] hover:text-[#2C2416] transition-all"
        >
          <span className="text-base">⚙️</span>
          <span>Ajustes</span>
        </Link>
        <form action={logout}>
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#7A6E5F] hover:bg-[#E2D9C8] hover:text-[#2C2416] transition-all text-left"
          >
            <span className="text-base">🚪</span>
            <span>Salir</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
