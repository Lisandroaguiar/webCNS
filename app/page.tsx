import Link from "next/link";
import { CalendarDays, Search } from "lucide-react";
import { PublicHeader } from "@/components/app-shell/public-header";
import { GridPaper, PaperScrap, Tape } from "@/components/visual/paper";
import { getPublishedCommunityPosts } from "@/lib/supabase/public-data";

export default async function Home() {
  const communityPosts = (await getPublishedCommunityPosts()).filter(post => !post.event_date || post.event_date.slice(0, 10) >= new Date().toISOString().slice(0, 10)).slice(0, 2);
  return (
    <main className="min-h-screen bg-cronopios-paper text-cronopios-ink">
      <PublicHeader />
      <section className="overflow-clip border-b-2 border-ink bg-cronopios-magenta">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 sm:px-5 md:grid-cols-[1.15fr_0.85fr] md:items-center md:gap-10 md:px-8 md:py-24">
        <div className="relative min-w-0">
          <Tape className="left-0 top-[-1.75rem] rotate-3" />
          <p className="mb-5 inline-block max-w-full border-2 border-ink bg-cronopios-green px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.12em] sm:text-xs sm:tracking-[0.2em]">Cronopios · Facultad de Artes UNLP</p>
          <h1 className="editorial-title max-w-2xl text-[clamp(2.45rem,12vw,4.5rem)]">Todo lo que necesitás para moverte por la facu.</h1>
          <p className="mt-7 max-w-lg text-lg leading-relaxed text-cronopios-ink/70">Mesita Virtual reúne tu recorrido académico, las fechas importantes y la información de cátedras en un solo lugar.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/registro" className="min-h-11 border-2 border-cronopios-ink bg-cronopios-pink px-5 py-3 font-bold shadow-[4px_4px_0_0_#221E21] hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cronopios-magenta">Armar mi recorrido</Link>
            <Link href="/login" className="min-h-11 border-2 border-cronopios-ink bg-white px-5 py-3 font-bold hover:bg-cronopios-green focus-visible:outline focus-visible:outline-2 focus-visible:outline-cronopios-magenta">Ya tengo cuenta</Link>
          </div>
          <div className="mt-8 grid max-w-lg gap-3 sm:grid-cols-2">
            <Link href="/catedras" className="flex min-h-14 items-center gap-3 border-2 border-cronopios-ink bg-white px-4 py-3 font-bold shadow-[3px_3px_0_0_#221E21] hover:-translate-y-0.5"><Search size={19} /> Buscar una cátedra</Link>
            <Link href="/agenda" className="flex min-h-14 items-center gap-3 border-2 border-cronopios-ink bg-white px-4 py-3 font-bold shadow-[3px_3px_0_0_#221E21] hover:-translate-y-0.5"><CalendarDays size={19} /> Ver próximas fechas</Link>
          </div>
        </div>
        <div className="relative min-w-0 max-w-full border-2 border-cronopios-ink bg-cronopios-ink p-4 text-white shadow-[5px_5px_0_0_#19F094] sm:p-5 md:rotate-2 md:shadow-[8px_8px_0_0_#19F094]">
          <Tape className="-top-5 left-1/2 -translate-x-1/2" />
          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-cronopios-green">ficha de uso</p>
          <PaperScrap className="mt-8 max-w-full p-5 text-cronopios-ink sm:p-7">
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-cronopios-magenta">Mesita Virtual</p>
            <p className="mt-6 font-display text-3xl font-black leading-none">Tu recorrido,<br />en un vistazo.</p>
            <div className="mt-8 h-3 border-2 border-cronopios-ink"><div className="h-full w-2/5 bg-cronopios-green" /></div>
            <p className="mt-2 font-mono text-xs font-bold uppercase">organizar · consultar · avanzar</p>
          </PaperScrap>
        </div>
      </div></section>
      <section className="mx-auto grid w-full max-w-6xl gap-5 overflow-clip px-4 py-10 sm:px-5 md:grid-cols-2 md:px-8"><GridPaper className="max-w-full p-5 sm:p-7"><p className="eyebrow">Fechas FDA</p><h2 className="mt-4 font-display text-3xl font-black">Fechas oficiales, sin vueltas.</h2><p className="mt-3 max-w-md text-ink/65">Consultá inscripciones, llamados y próximos eventos desde una cartelera clara.</p></GridPaper><PaperScrap className="max-w-full p-5 sm:p-7"><p className="eyebrow">Tu recorrido</p><h2 className="mt-4 font-display text-3xl font-black">El plan completo, a mano.</h2><p className="mt-3 max-w-md text-ink/65">Marcá materias, mirá el avance y encontrá la información que necesitás.</p></PaperScrap></section>
      <section className="border-y-2 border-ink bg-white"><div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-5 md:px-8"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Cartelera Cronopios</p><h2 className="mt-3 font-display text-3xl font-black">Actividades y encuentros</h2></div><Link href="/cartelera" className="button-primary">Ver toda la cartelera</Link></div><div className="mt-6 grid gap-4 md:grid-cols-2">{communityPosts.map(post => <article key={post.id} className="border-2 border-ink bg-cronopios-paper p-5 shadow-[4px_4px_0_0_#221E21]"><p className="font-mono text-xs font-bold uppercase tracking-widest text-cronopios-magenta">{post.event_type}</p><h3 className="mt-2 font-display text-xl font-black">{post.title}</h3><p className="mt-3 text-sm font-bold">{post.event_date ? new Date(`${post.event_date.slice(0, 10)}T12:00:00`).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" }) : "Fecha a confirmar"}{post.location ? ` · ${post.location}` : ""}</p></article>)}{!communityPosts.length && <p className="text-sm text-ink/60">Pronto vamos a publicar nuevas actividades.</p>}</div></div></section>
      <footer className="mx-auto max-w-6xl px-5 pb-8 font-mono text-xs font-bold uppercase tracking-widest text-cronopios-ink/55 md:px-8">Cronopios · Centro de Estudiantes · Facultad de Artes</footer>
    </main>
  );
}
