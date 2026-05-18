"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/(auth)/login/actions";
import {
  Home,
  Leaf,
  CheckSquare,
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
  { href: "/dashboard",   Icon: Home,        label: "Inicio"           },
  { href: "/habits",      Icon: Leaf,         label: "Hábitos"          },
  { href: "/todos",       Icon: CheckSquare,  label: "To-dos"           },
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
    <aside
      className="w-56 shrink-0 h-screen sticky top-0 flex flex-col border-r border-white/10"
      style={{
        background: "rgba(10, 22, 8, 0.82)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        zIndex: 10,
      }}
    >
      {/* Logo */}
      <div className="px-5 py-6 border-b border-white/10">
        <span className="font-[family-name:var(--font-lora)] text-2xl font-bold text-[#E8DFC8] tracking-tight">
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
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                active
                  ? "bg-[#E07B4A] text-white font-medium shadow-md"
                  : "text-[#A8C898] hover:bg-white/10 hover:text-[#E8DFC8]"
              }`}
            >
              <Icon size={16} strokeWidth={1.8} className="shrink-0" />
              <span className="leading-none">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-white/10 space-y-0.5">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#A8C898] hover:bg-white/10 hover:text-[#E8DFC8] transition-all"
        >
          <Settings size={16} strokeWidth={1.8} className="shrink-0" />
          <span>Ajustes</span>
        </Link>
        <form action={logout}>
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#A8C898] hover:bg-white/10 hover:text-[#E8DFC8] transition-all text-left"
          >
            <LogOut size={16} strokeWidth={1.8} className="shrink-0" />
            <span>Salir</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
