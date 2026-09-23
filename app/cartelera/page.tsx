import Link from "next/link";
import { ScrapbookCard, type ScrapbookCardProps } from "@/components/ScrapbookCard";
import { SessionAwareShell } from "@/components/app-shell/session-aware-shell";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { getPublishedCommunityPosts } from "@/lib/supabase/public-data";
import { FdaDisciplineStrip } from "@/components/identity/fda-identity";

function card(post: Awaited<ReturnType<typeof getPublishedCommunityPosts>>[number]) {
  const accent = (["lime", "fuchsia", "cyan"].includes(post.accent) ? post.accent : "fuchsia") as ScrapbookCardProps["accent"];
  const date = post.event_date ? new Date(`${post.event_date.slice(0, 10)}T12:00:00`).toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" }) : "Próximamente";
  return <ScrapbookCard key={post.id} title={post.title} eventType={post.event_type} date={date} description={post.body} time={post.event_time?.slice(0, 5)} location={post.location} imageUrl={post.image_url} linkUrl={post.link_url} accent={accent} />;
}

export default async function CarteleraPage() {
  const [user, posts] = await Promise.all([getCurrentUser(), getPublishedCommunityPosts()]);
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = posts.filter(post => !post.event_date || post.event_date.slice(0, 10) >= today);
  const past = posts.filter(post => post.event_date && post.event_date.slice(0, 10) < today).reverse();
  return <SessionAwareShell user={user}><div className={user ? "" : "mx-auto max-w-6xl px-5 py-10 md:px-8"}>
    <p className="eyebrow">Cartelera Cronopios</p>
    <h1 className="editorial-title mt-4 text-[clamp(2.5rem,10vw,4.5rem)]">Lo que pasa, pasa por acá.</h1>
    <p className="mt-4 max-w-2xl text-ink/65">Actividades, talleres, charlas y encuentros para mover la Facultad.</p>
    <div className="mt-5 max-w-2xl border-2 border-ink"><FdaDisciplineStrip /></div>
    {upcoming[0] && <section className="mt-10"><h2 className="font-display text-2xl font-black">Destacado</h2><div className="mt-5 max-w-2xl">{card(upcoming[0])}</div></section>}
    <section className="mt-10"><h2 className="font-display text-2xl font-black">Próximas</h2><div className="mt-5 grid gap-6 md:grid-cols-2">{upcoming.slice(1).map(card)}{!upcoming.length && <p className="text-sm text-ink/60">Pronto vamos a publicar nuevas actividades.</p>}</div></section>
    {past.length > 0 && <section className="mt-12 opacity-75"><h2 className="font-display text-2xl font-black">Pasadas</h2><div className="mt-5 grid gap-6 md:grid-cols-2">{past.slice(0, 4).map(card)}</div></section>}
    {!user && <p className="mt-12 text-sm text-ink/60">¿Ya usás Mesita? <Link href="/login" className="font-bold underline">Ingresá</Link>.</p>}
  </div></SessionAwareShell>;
}
