"use client";

import Link from "next/link";
import type { Route } from "next";
import { CalendarDays, GraduationCap, Home, Search } from "lucide-react";
import { usePathname } from "next/navigation";

const items: Array<{ href: Route; label: string; icon: typeof Home }> = [
  { href: "/dashboard", label: "Inicio", icon: Home },
  { href: "/dashboard/recorrido", label: "Recorrido", icon: GraduationCap },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/catedras", label: "Cátedras", icon: Search }
];

export function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Navegación principal" className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t-2 border-cronopios-ink bg-white pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 md:hidden">
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
        return <Link key={href} href={href} className={`mx-1 flex min-h-11 flex-col items-center justify-center gap-1 px-1 text-[11px] font-bold ${active ? "active-nav-cutout" : "text-cronopios-ink/60"} focus-visible:outline focus-visible:outline-2 focus-visible:outline-cronopios-magenta`}>
          <Icon size={20} strokeWidth={active ? 2.5 : 2} aria-hidden />
          <span>{label}</span>
        </Link>;
      })}
    </nav>
  );
}
