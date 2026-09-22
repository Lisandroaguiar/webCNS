import Link from "next/link";
import type { Route } from "next";
import { CalendarDays, GraduationCap, Home, Search, Settings } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { BrandMark } from "@/components/brand/brand-mark";
import { DashboardHeader } from "@/components/app-shell/dashboard-header";
import { MobileBottomNav } from "@/components/app-shell/mobile-bottom-nav";
import { SignOutButton } from "@/components/auth/sign-out-button";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return <div className="min-h-screen bg-cronopios-paper">
    <aside className="fixed inset-y-0 hidden w-64 flex-col border-r-2 border-cronopios-ink bg-white p-6 md:flex">
      <BrandMark />
      <p className="mt-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-cronopios-ink/55">Herramientas estudiantiles</p>
      <nav className="mt-12 space-y-1 text-sm">
        <NavItem href="/dashboard" icon={<Home size={18} />} label="Inicio" />
        <NavItem href="/dashboard/recorrido" icon={<GraduationCap size={18} />} label="Recorrido" />
        <NavItem href="/agenda" icon={<CalendarDays size={18} />} label="Agenda" />
        <NavItem href="/catedras" icon={<Search size={18} />} label="Cátedras" />
      </nav>
      <div className="mt-auto border-t-2 border-cronopios-ink/15 pt-5">
        <Link href="/dashboard/perfil" className="flex min-h-11 items-center gap-2 text-sm font-bold hover:text-cronopios-magenta"><Settings size={16} /> Perfil y configuración</Link>
        <p className="mt-4 truncate text-sm font-semibold">{user?.user_metadata?.nombre || user?.email}</p>
        <SignOutButton />
      </div>
    </aside>
    <main className="md:ml-64"><div className="mx-auto max-w-6xl p-5 pb-28 md:p-10"><DashboardHeader name={user?.user_metadata?.nombre || user?.email} />{children}</div></main>
    <MobileBottomNav />
  </div>;
}

function NavItem({ href, icon, label }: { href: Route; icon: React.ReactNode; label: string }) {
  return <Link href={href} className="flex min-h-11 items-center gap-3 border-l-4 border-transparent px-3 py-3 font-bold text-cronopios-ink/65 transition hover:border-cronopios-magenta hover:bg-cronopios-pink/10 hover:text-cronopios-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-cronopios-magenta">{icon}<span>{label}</span></Link>;
}
