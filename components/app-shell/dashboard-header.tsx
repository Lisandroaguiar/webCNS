import Link from "next/link";
import { UserRound } from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";

type DashboardHeaderProps = {
  name?: string | null;
};

export function DashboardHeader({ name }: DashboardHeaderProps) {
  const initial = (name || "E").trim().charAt(0).toUpperCase();
  return (
    <header className="mb-8 flex items-center justify-between gap-4 border-b-2 border-cronopios-ink/15 pb-5">
      <BrandMark compact href="/dashboard" />
      <div className="flex items-center gap-3">
        <span className="hidden text-right text-xs font-bold uppercase tracking-widest text-cronopios-ink/55 sm:block">
          {name || "Estudiante"}
        </span>
        <Link href="/dashboard/perfil" aria-label="Abrir perfil y configuración" className="flex min-h-11 min-w-11 items-center justify-center border-2 border-cronopios-ink bg-cronopios-green font-display text-lg font-black shadow-[3px_3px_0_0_#221E21] hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cronopios-magenta">
          {name ? initial : <UserRound size={19} />}
        </Link>
      </div>
    </header>
  );
}
