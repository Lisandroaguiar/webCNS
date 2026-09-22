import Link from "next/link";
import { BrandMark } from "@/components/brand/brand-mark";

export function PublicHeader() {
  return (
    <header className="border-b-2 border-cronopios-ink bg-cronopios-paper">
      <div className="mx-auto flex min-h-20 max-w-6xl items-center justify-between gap-4 px-5 py-4 md:px-8">
        <BrandMark />
        <nav aria-label="Navegación pública" className="flex items-center gap-2 text-sm font-bold">
          <Link href="/agenda" className="min-h-11 rounded-md px-3 py-3 hover:bg-cronopios-green focus-visible:outline focus-visible:outline-2 focus-visible:outline-cronopios-magenta">Agenda</Link>
          <Link href="/catedras" className="min-h-11 rounded-md px-3 py-3 hover:bg-cronopios-green focus-visible:outline focus-visible:outline-2 focus-visible:outline-cronopios-magenta">Cátedras</Link>
          <Link href="/login" className="min-h-11 border-2 border-cronopios-ink bg-cronopios-magenta px-3 py-2.5 shadow-[3px_3px_0_0_#221E21] hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cronopios-magenta">Ingresar</Link>
        </nav>
      </div>
    </header>
  );
}
