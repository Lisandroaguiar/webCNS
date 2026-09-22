import Link from "next/link";
import type { Route } from "next";
import type { User } from "@supabase/supabase-js";
import { CalendarDays, GraduationCap, Home, Megaphone, Search, Settings, Upload } from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";
import { DashboardHeader } from "@/components/app-shell/dashboard-header";
import { MobileBottomNav } from "@/components/app-shell/mobile-bottom-nav";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { FeedbackLink } from "@/components/feedback-link";
import { isAdminEmail } from "@/lib/auth/admin";

export function AuthenticatedShell({ user, children }: { user: User | null; children: React.ReactNode }) {
  const name = user?.user_metadata?.nombre || user?.email;
  const isAdmin = isAdminEmail(user?.email);
  return <div className="min-h-screen bg-cronopios-paper">
    <aside className="fixed inset-y-0 hidden w-64 flex-col border-r-2 border-cronopios-ink bg-white p-6 md:flex">
      <BrandMark /><p className="mt-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-cronopios-ink/55">Herramientas estudiantiles</p>
      <nav className="mt-12 space-y-1 text-sm">
        <NavItem href="/dashboard" icon={<Home size={18} />} label="Inicio" />
        <NavItem href="/dashboard/recorrido" icon={<GraduationCap size={18} />} label="Recorrido" />
        <NavItem href="/agenda" icon={<CalendarDays size={18} />} label="Agenda" />
        <NavItem href="/catedras" icon={<Search size={18} />} label="Cátedras" />
        <NavItem href="/cartelera" icon={<Megaphone size={18} />} label="Cartelera" />
        {isAdmin && <NavItem href="/admin/cartelera" icon={<Upload size={18} />} label="Subir contenido" />}
      </nav>
      <div className="mt-auto border-t-2 border-cronopios-ink/15 pt-5">
        <Link href="/dashboard/perfil" className="flex min-h-11 items-center gap-2 text-sm font-bold hover:text-cronopios-magenta"><Settings size={16} /> Perfil y configuración</Link>
        <FeedbackLink /><p className="mt-4 truncate text-sm font-semibold">{name}</p><SignOutButton />
      </div>
    </aside>
    <main className="md:ml-64"><div className="mx-auto max-w-6xl p-5 pb-28 md:p-10"><DashboardHeader name={name} isAdmin={isAdmin} />{children}</div></main>
    <div className="fixed bottom-20 right-4 z-30 md:hidden"><FeedbackLink className="rounded bg-white/90 px-2 py-1 shadow" /></div><MobileBottomNav />
  </div>;
}

function NavItem({ href, icon, label }: { href: Route; icon: React.ReactNode; label: string }) {
  return <Link href={href} prefetch className="flex min-h-11 items-center gap-3 border-l-4 border-transparent px-3 py-3 font-bold text-cronopios-ink/65 transition hover:border-cronopios-magenta hover:bg-cronopios-pink/10 hover:text-cronopios-ink">{icon}<span>{label}</span></Link>;
}
