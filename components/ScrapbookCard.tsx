"use client";

import { motion } from "framer-motion";

export type ScrapbookCardProps = {
  title: string;
  eventType: string;
  date: string;
  description?: string;
  accent?: "lime" | "fuchsia" | "cyan";
};

const accentClasses = {
  lime: "bg-lime",
  fuchsia: "bg-fuchsia text-white",
  cyan: "bg-cyan"
} as const;

/**
 * Tarjeta de cartelera con aspecto de recorte pegado.
 * La cinta se dibuja con pseudo-elementos para mantener el componente sin assets.
 */
export function ScrapbookCard({
  title,
  eventType,
  date,
  description,
  accent = "lime"
}: ScrapbookCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 14, rotate: -2 }}
      animate={{ opacity: 1, y: 0, rotate: -1 }}
      whileHover={{ y: -5, rotate: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
      className={`relative border-2 border-black p-5 pt-7 shadow-brutal ${accentClasses[accent]}`}
    >
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
      {description && <p className="mt-3 text-sm leading-relaxed text-black/80">{description}</p>}
    </motion.article>
  );
}
