import Link from "next/link";
import type { Route } from "next";

type BrandMarkProps = {
  href?: Route;
  compact?: boolean;
  light?: boolean;
};

export function BrandMark({ href = "/", compact = false, light = false }: BrandMarkProps) {
  const content = (
    <span className={`inline-flex flex-col leading-none ${light ? "text-white" : "text-cronopios-ink"}`}>
      <span className={`font-display font-black uppercase tracking-[-0.06em] ${compact ? "text-lg" : "text-2xl"}`}>
        {compact ? "MESITA" : "MESITA VIRTUAL"}
      </span>
      <span className={`mt-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] ${light ? "text-cronopios-green" : "text-cronopios-magenta"}`}>
        por Cronopios
      </span>
    </span>
  );

  return href ? <Link href={href} aria-label="Mesita Virtual, inicio">{content}</Link> : content;
}
