export type ScrapbookCardProps = {
  title: string;
  eventType: string;
  date: string;
  description?: string;
  time?: string | null;
  location?: string | null;
  imageUrl?: string | null;
  linkUrl?: string | null;
  accent?: "lime" | "fuchsia" | "cyan";
};

const accentClasses = {
  lime: "bg-lime",
  fuchsia: "bg-fuchsia text-white",
  cyan: "bg-cyan"
} as const;

function instagramEmbedUrl(value?: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (!(["instagram.com", "www.instagram.com"].includes(url.hostname.toLowerCase()))) return null;
    const match = url.pathname.match(/^\/(p|reel|tv)\/([A-Za-z0-9_-]+)\/?$/);
    return match ? `https://www.instagram.com/${match[1]}/${match[2]}/embed/` : null;
  } catch {
    return null;
  }
}

/**
 * Tarjeta de cartelera con aspecto de recorte pegado.
 * La cinta se dibuja con pseudo-elementos para mantener el componente sin assets.
 */
export function ScrapbookCard({
  title,
  eventType,
  date,
  description, time, location, imageUrl, linkUrl,
  accent = "lime"
}: ScrapbookCardProps) {
  const embedUrl = instagramEmbedUrl(imageUrl);
  return (
    <article className={`relative min-w-0 border-2 border-black p-5 pt-7 shadow-brutal transition-transform hover:-translate-y-1 ${accentClasses[accent]}`}>
      <span
        aria-hidden="true"
        className="absolute -top-3 left-1/2 h-7 w-24 -translate-x-1/2 rotate-[-3deg] border border-black/20 bg-cyan/75 shadow-sm"
      />
      <div className="flex items-start justify-between gap-4">
        <span className="font-mono text-xs font-bold uppercase tracking-widest">
          {eventType}
        </span>
        <time className="border-2 border-black bg-white px-2 py-1 font-mono text-xs font-bold text-black">
          {date}
        </time>
      </div>
      <h2 className="mt-5 font-mono text-2xl font-bold leading-tight text-black">{title}</h2>
      {embedUrl ? <iframe src={embedUrl} title={`Publicación de Instagram: ${title}`} loading="lazy" className="mt-4 h-[540px] w-full border-2 border-black bg-white sm:h-[600px]" /> : imageUrl && <img src={imageUrl} alt="" width={640} height={360} loading="lazy" className="mt-4 aspect-video w-full border-2 border-black object-cover" />}
      {(time || location) && <p className="mt-3 font-mono text-sm font-bold text-black">{time}{time && location ? " · " : ""}{location}</p>}
      {description && <p className="mt-3 text-sm leading-relaxed text-black/80">{description}</p>}
      {linkUrl && <a href={linkUrl} target="_blank" rel="noreferrer" className="mt-5 inline-block min-h-11 border-2 border-black bg-white px-3 py-2.5 text-sm font-bold text-black shadow-[3px_3px_0_0_#000]">Más info</a>}
    </article>
  );
}
