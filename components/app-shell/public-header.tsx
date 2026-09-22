import Link from "next/link";
import { BrandMark } from "@/components/brand/brand-mark";
import { FeedbackLink } from "@/components/feedback-link";

export function PublicHeader() {
  return (
    <header className="border-b-2 border-cronopios-ink bg-cronopios-paper">
      <div className="mx-auto grid min-h-20 w-full max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-3 sm:px-5 md:flex md:justify-between md:gap-4 md:px-8 md:py-4">
        <div className="min-w-0"><BrandMark compact /></div>
        <Link href="/login" className="min-h-11 border-2 border-cronopios-ink bg-cronopios-magenta px-3 py-2.5 text-sm font-bold shadow-[3px_3px_0_0_#221E21] hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cronopios-magenta md:hidden">Ingresar</Link>
        <nav aria-label="Navegación pública" className="col-span-2 flex min-w-0 items-center gap-1 text-sm font-bold md:col-auto md:gap-2">
          <Link href="/agenda" className="min-h-11 rounded-md px-3 py-3 hover:bg-cronopios-green focus-visible:outline focus-visible:outline-2 focus-visible:outline-cronopios-magenta">Agenda</Link>
          <Link href="/catedras" className="min-h-11 rounded-md px-3 py-3 hover:bg-cronopios-green focus-visible:outline focus-visible:outline-2 focus-visible:outline-cronopios-magenta">Cátedras</Link>
          <Link href="/cartelera" className="min-h-11 rounded-md px-3 py-3 hover:bg-cronopios-green focus-visible:outline focus-visible:outline-2 focus-visible:outline-cronopios-magenta">Cartelera</Link>
          <FeedbackLink className="hidden lg:inline" />
          <Link href="/login" className="hidden min-h-11 border-2 border-cronopios-ink bg-cronopios-magenta px-3 py-2.5 shadow-[3px_3px_0_0_#221E21] hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cronopios-magenta md:block">Ingresar</Link>
        </nav>
      </div>
    </header>
  );
}
