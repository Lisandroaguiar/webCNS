import { CalendarClock } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { PaperScrap, Tape } from "@/components/visual/paper";

type AcademicDeadlineCardProps = {
  title?: string;
  detail?: string;
  sourceLabel?: string;
  sourceUpdatedAt?: string;
  href?: string;
};

export function AcademicDeadlineCard({ title, detail, sourceLabel, sourceUpdatedAt, href = "/agenda" }: AcademicDeadlineCardProps) {
  return (
    <article className="relative border-2 border-cronopios-ink bg-cronopios-magenta p-4 shadow-[6px_6px_0_0_#221E21]">
      <Tape className="-right-5 -top-4 rotate-6" />
      <PaperScrap className="p-5">
      <div className="relative flex items-start gap-4 text-ink">
        <CalendarClock className="mt-0.5 shrink-0" size={25} aria-hidden />
        <div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em]">Próxima fecha</p>
          <h2 className="mt-2 font-display text-xl font-black">{title || "Estamos actualizando las próximas fechas"}</h2>
          <p className="mt-2 text-sm text-cronopios-ink/70">{detail || "Volvé pronto para consultar la agenda académica oficial."}</p>
          {sourceLabel && <p className="mt-3 text-xs text-cronopios-ink/60">Fuente: {sourceLabel}{sourceUpdatedAt ? ` · actualizado ${new Date(sourceUpdatedAt).toLocaleDateString("es-AR")}` : ""}</p>}
          <Link href={href as Route} prefetch className="mt-4 inline-block min-h-11 border-2 border-cronopios-ink bg-white px-3 py-2.5 text-sm font-bold shadow-[3px_3px_0_0_#221E21] hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cronopios-magenta">Ver agenda</Link>
        </div>
      </div>
      </PaperScrap>
    </article>
  );
}
