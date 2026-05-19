"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/(auth)/login/actions";
import {
  Home,
  Leaf,
  CheckSquare,
  CalendarDays,
  Waves,
  BookOpen,
  Target,
  Network,
  Camera,
  Mail,
  Settings,
  LogOut,
} from "lucide-react";

const modules = [
  { href: "/dashboard",   Icon: Home,         label: "Inicio"           },
  { href: "/habits",      Icon: Leaf,         label: "Hábitos"          },
  { href: "/todos",       Icon: CheckSquare,  label: "To-dos"           },
  { href: "/calendar",    Icon: CalendarDays, label: "Calendario"       },
  { href: "/mood",        Icon: Waves,        label: "Estado de ánimo"  },
  { href: "/diary",       Icon: BookOpen,     label: "Diario"           },
  { href: "/goals",       Icon: Target,       label: "Metas"            },
  { href: "/connections", Icon: Network,      label: "Vínculos"         },
  { href: "/memories",    Icon: Camera,       label: "Recuerdos"        },
  { href: "/letters",     Icon: Mail,         label: "Cartas & Regalos" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 h-screen sticky top-0 flex flex-col border-r border-[#E5E7EB] bg-white z-10">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-[#E5E7EB]">
        <span className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#0A0A0A] tracking-tight">
          kopyme
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        {modules.map(({ href, Icon, label }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                active
                  ? "bg-[#0A0A0A] text-white font-medium"
                  : "text-[#6B7280] hover:bg-[#F5F5F5] hover:text-[#0A0A0A]"
              }`}
            >
              <Icon size={16} strokeWidth={1.8} className="shrink-0" />
              <span className="leading-none">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-[#E5E7EB] space-y-0.5">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#6B7280] hover:bg-[#F5F5F5] hover:text-[#0A0A0A] transition-all"
        >
          <Settings size={16} strokeWidth={1.8} className="shrink-0" />
          <span>Ajustes</span>
        </Link>
        <form action={logout}>
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#6B7280] hover:bg-[#F5F5F5] hover:text-[#0A0A0A] transition-all text-left"
          >
            <LogOut size={16} strokeWidth={1.8} className="shrink-0" />
            <span>Salir</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
