import Link from "next/link";
import { CalendarRange, Megaphone, Upload, UserRound } from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";

type DashboardHeaderProps = {
  name?: string | null;
  isAdmin?: boolean;
};

export function DashboardHeader({ name, isAdmin = false }: DashboardHeaderProps) {
  const initial = (name || "E").trim().charAt(0).toUpperCase();
  return (
    <header className="mb-8 border-b-2 border-cronopios-ink/15 pb-5">
      <div className="flex items-center justify-between gap-3">
        <BrandMark compact href="/dashboard" />
        <div className="flex items-center gap-3">
          {isAdmin && <Link href="/admin/cartelera" aria-label="Subir contenido" className="flex min-h-11 items-center gap-2 border-2 border-cronopios-ink bg-cronopios-magenta px-3 py-2 text-xs font-black shadow-[3px_3px_0_0_#221E21] hover:-translate-y-0.5"><Upload size={17} /><span className="hidden sm:inline">Subir contenido</span></Link>}
          {isAdmin && <Link href="/admin/horarios" aria-label="Editar horarios" className="flex min-h-11 items-center gap-2 border-2 border-cronopios-ink bg-white px-3 py-2 text-xs font-black shadow-[3px_3px_0_0_#221E21]"><CalendarRange size={17} /><span className="hidden sm:inline">Horarios</span></Link>}
          <span className="hidden text-right text-xs font-bold uppercase tracking-widest text-cronopios-ink/55 sm:block">
            {name || "Estudiante"}
          </span>
          <Link href="/dashboard/perfil" aria-label="Abrir perfil y configuración" className="flex min-h-11 min-w-11 items-center justify-center border-2 border-cronopios-ink bg-cronopios-green font-display text-lg font-black shadow-[3px_3px_0_0_#221E21] hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cronopios-magenta">
            {name ? initial : <UserRound size={19} />}
          </Link>
        </div>
      </div>
      <Link href="/cartelera" className="mt-4 flex min-h-11 items-center justify-center gap-2 border-2 border-cronopios-ink bg-white px-4 py-2 text-sm font-bold shadow-[3px_3px_0_0_#221E21] md:hidden"><Megaphone size={18} aria-hidden /> Ir a Cartelera</Link>
    </header>
  );
}
