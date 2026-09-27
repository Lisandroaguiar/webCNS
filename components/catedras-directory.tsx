"use client";

import Link from "next/link";
import type { Route } from "next";
import { ExternalLink, Mail, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { catedras, CATEDRAS_SOURCE_URL, ESTUDIOS_HYS_SOURCE_URL } from "@/data/catedras";

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function CatedrasDirectory({ planSubjects = [], initialQuery = "", authenticated = false }: {
  planSubjects?: Array<{ id: string; name: string }>;
  initialQuery?: string;
  authenticated?: boolean;
}) {
  const [query, setQuery] = useState(initialQuery);
  const filtered = useMemo(() => catedras.filter(item => !query || normalize([item.area, item.materia, item.nombresAlternativos, item.contacto, item.docentes].filter(Boolean).join(" ")).includes(normalize(query))), [query]);
  function agendaHref(item: (typeof catedras)[number]) {
    const names = [item.materia, ...(item.nombresAlternativos?.split(" · ") ?? [])].map(normalize);
    const matches = planSubjects.filter(subject => names.includes(normalize(subject.name)));
    const destination = matches.length === 1
      ? `/dashboard/agenda?subject=${encodeURIComponent(matches[0].id)}`
      : "/dashboard/agenda?add=course";
    return (authenticated ? destination : `/login?next=${encodeURIComponent(destination)}`) as Route;
  }
  const otherSubjects = planSubjects.filter(subject => !catedras.some(item => normalize(item.materia) === normalize(subject.name) || item.nombresAlternativos?.split(" · ").some(name => normalize(name) === normalize(subject.name))))
    .filter(subject => !query || normalize(subject.name).includes(normalize(query)));

  return <div>
    <div className="relative"><Search className="absolute left-4 top-3.5 text-ink/40" size={20} aria-hidden /><label className="sr-only" htmlFor="catedras-search">Buscar cátedra</label><input id="catedras-search" className="input pl-12" placeholder="Buscar materia, área, cátedra o contacto..." value={query} onChange={event => setQuery(event.target.value)} /></div>
    <p className="mt-4 text-sm text-ink/50">{filtered.length + otherSubjects.length} resultado(s)</p>
    <div className="mt-3 grid gap-4 md:grid-cols-2">{filtered.map(item => <article key={`${item.area}-${item.materia}`} className="card min-w-0 transition hover:-translate-y-1 hover:border-coral/30">
      <p className="text-xs font-semibold uppercase tracking-widest text-coral">{item.area}</p>
      <h2 className="mt-2 font-display text-xl font-bold">{item.materia}</h2>
      {item.nombresAlternativos && <p className="mt-2 text-sm text-ink/55">{item.nombresAlternativos}</p>}
      {item.docentes && <p className="mt-4 text-sm font-medium text-ink/75">{item.docentes}</p>}
      {item.contacto && <p className="mt-4 flex min-w-0 items-start gap-2 whitespace-pre-line text-sm text-ink/70 [overflow-wrap:anywhere]"><Mail className="mt-0.5 shrink-0 text-coral" size={16} />{item.contacto}</p>}
      {item.redes && <div className="mt-4 flex flex-wrap gap-3">{item.redes.map(link => <a key={link.href} href={link.href} target="_blank" rel="noreferrer" className="min-h-11 py-2 text-sm font-semibold text-coral hover:underline">{link.label} ↗</a>)}</div>}
      <Link href={agendaHref(item)} className="button-secondary mt-4 text-xs">Agregar a Mi agenda</Link>
    </article>)}
    {authenticated && otherSubjects.map(subject => <article key={subject.id} className="card min-w-0"><p className="text-xs font-semibold uppercase tracking-widest text-coral">Materia del plan</p><h2 className="mt-2 font-display text-xl font-bold">{subject.name}</h2><Link href={`/dashboard/agenda?subject=${encodeURIComponent(subject.id)}`} className="button-secondary mt-4 text-xs">Agregar a Mi agenda</Link></article>)}
    {!filtered.length && !otherSubjects.length && <p className="text-sm text-ink/60">No encontramos cátedras con esa búsqueda.</p>}</div>
    <div className="mt-8 flex flex-wrap gap-4 text-sm font-semibold"><a href={CATEDRAS_SOURCE_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 text-coral hover:underline">Publicación original <ExternalLink size={15} /></a><a href={ESTUDIOS_HYS_SOURCE_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 text-coral hover:underline">Programas y contactos 2026 <ExternalLink size={15} /></a></div>
  </div>;
}
