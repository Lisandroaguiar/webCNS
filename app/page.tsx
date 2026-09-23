import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, CalendarDays, LogIn, Megaphone, Search } from "lucide-react";
import { PublicHeader } from "@/components/app-shell/public-header";
import { EditorialSticker, FdaDisciplineStrip } from "@/components/identity/fda-identity";
import { getPublishedCommunityPosts } from "@/lib/supabase/public-data";

const publicLinks = [
  { href: "/registro", title: "Armar mi recorrido", caption: "Explorá la facu a tu manera", icon: BookOpen, accent: true },
  { href: "/login", title: "Ingresar", caption: "Ya tengo una cuenta", icon: LogIn, dark: true },
  { href: "/catedras", title: "Explorar cátedras", caption: "Buscá por carrera o área", icon: Search },
  { href: "/agenda", title: "Ver Fechas FDA", caption: "Calendario académico y eventos", icon: CalendarDays },
] as const;

export default async function Home() {
  const communityPosts = (await getPublishedCommunityPosts())
    .filter(post => !post.event_date || post.event_date.slice(0, 10) >= new Date().toISOString().slice(0, 10))
    .slice(0, 2);

  return <main className="public-home min-h-screen text-cronopios-ink">
    <PublicHeader />
    <div className="public-home__main mx-auto w-full max-w-6xl px-4 pb-12 sm:px-5 md:px-8">
      <section className="public-home-hero" aria-labelledby="public-home-title">
        <div className="public-home-hero__copy">
          <p className="public-home-hero__brand">MESITA VIRTUAL <span>por Cronopios</span></p>
          <p className="public-home-hero__greeting">BUEN DÍA <span aria-hidden>✳</span></p>
          <h1 id="public-home-title">HOY<br />ANDAMOS<br /><em>POR ARTES.</em></h1>
          <EditorialSticker className="public-home-hero__sticker">la facu también pasa acá</EditorialSticker>
          <p className="public-home-hero__mark">FDA / UNLP · LA PLATA</p>
        </div>
        <div className="public-home-hero__art" aria-hidden="true">
          <Image src="/identity/fda/david-source.jpg" alt="" width={332} height={332} priority className="public-home-hero__david" />
          <span className="public-home-hero__registration">＋</span>
          <span className="public-home-hero__timecode">00:03:26:12</span>
        </div>
      </section>

      <FdaDisciplineStrip className="public-home__disciplines" />

      <nav aria-label="Accesos de Inicio" className="public-home-links">
        {publicLinks.map(({ href, title, caption, icon: Icon, ...tone }) => <Link key={href} href={href} className={`public-home-link ${"accent" in tone ? "public-home-link--accent" : "dark" in tone ? "public-home-link--dark" : ""}`}>
          <Icon aria-hidden size={27} strokeWidth={2.3} />
          <span><strong>{title}</strong><small>{caption}</small></span>
          <ArrowRight aria-hidden size={18} className="public-home-link__arrow" />
        </Link>)}
      </nav>

      <section className="public-home-mesita" aria-labelledby="public-home-mesita-title">
        <div className="public-home-mesita__copy"><p className="public-home-mesita__overline">ESTUDIAR · CREAR · ENCONTRARNOS</p><h2 id="public-home-mesita-title">MESITA VIRTUAL</h2><p>Tu recorrido, tu agenda y la info útil de la facu en un solo lugar.</p></div>
        <div className="public-home-mesita__art" aria-hidden="true"><Image src="/identity/fda/moises-source.jpg" alt="" width={180} height={180} /><span>ARTE<br />TAMBIÉN<br />ENCUENTRO</span></div>
      </section>

      <section className="public-home-cartelera" aria-labelledby="public-home-cartelera-title">
        <div className="public-home-cartelera__heading"><Megaphone aria-hidden size={30} /><div><p>COMUNIDAD / CRONOPIOS</p><h2 id="public-home-cartelera-title">CARTELERA</h2></div><Link href="/cartelera">Ver cartelera <ArrowRight aria-hidden size={17} /></Link></div>
        {communityPosts.length ? <div className="public-home-cartelera__posts">{communityPosts.map(post => <article key={post.id}><p>{post.event_type}</p><h3>{post.title}</h3><small>{post.event_date ? new Date(`${post.event_date.slice(0, 10)}T12:00:00`).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" }) : "Fecha a confirmar"}{post.location ? ` · ${post.location}` : ""}</small></article>)}</div> : <p className="public-home-cartelera__empty">Pronto vamos a publicar nuevas actividades.</p>}
      </section>
    </div>
    <footer className="mx-auto max-w-6xl px-5 pb-8 font-mono text-xs font-bold uppercase tracking-widest text-cronopios-ink/55 md:px-8">Cronopios · Centro de Estudiantes · Facultad de Artes</footer>
  </main>;
}
