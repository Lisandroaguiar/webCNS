"use client";

import { ExternalLink, Mail, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { catedras, CATEDRAS_SOURCE_URL, ESTUDIOS_HYS_SOURCE_URL, type CatedraContact } from "@/data/catedras";

type Schedule = { raw_subject_name: string; weekday: string; start_time: string; end_time: string | null; commission: string | null; classroom: string | null; campus: string | null; notes: string | null; source_label: string; source_url: string };

export function CatedrasDirectory({ schedules = [], initialQuery = "" }: { schedules?: Schedule[]; initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().replace(/\b(i{1,3}|iv|v)\b/g, value => ({ i: "1", ii: "2", iii: "3", iv: "4", v: "5" }[value] ?? value)).replace(/[^a-z0-9]+/g, " ").trim();
  const meaningfulTokens = (value: string) => new Set(normalize(value).split(" ").filter(token => token.length > 2 && !["taller", "lenguaje", "tecnologia", "multimedial", "materia", "plan", "nuevo", "viejo", "comision"].includes(token)));
  const matchScore = (schedule: Schedule, materia: string) => {
    const scheduleName = normalize(schedule.raw_subject_name);
    const subjectName = normalize(materia);
    if (scheduleName.includes(subjectName) || subjectName.includes(scheduleName)) return 100;
    const scheduleTokens = meaningfulTokens(schedule.raw_subject_name);
    const subjectTokens = meaningfulTokens(materia);
    const overlap = Array.from(subjectTokens).filter(token => scheduleTokens.has(token)).length;
    const numberMatch = subjectName.match(/\b[1-5]\b/)?.[0] === scheduleName.match(/\b[1-5]\b/)?.[0];
    return overlap * 10 + (numberMatch ? 8 : 0);
  };
  const matches = (schedule: Schedule, materia: string) => matchScore(schedule, materia) >= 18;
  const schedulesFor = (materia: string) => schedules.filter(schedule => matches(schedule, materia)).sort((a, b) => matchScore(b, materia) - matchScore(a, materia));
  const assignedScheduleKeys = new Set(
    catedras.flatMap(item => schedulesFor(item.materia).map(schedule => `${schedule.raw_subject_name}-${schedule.weekday}-${schedule.start_time}`))
  );
  const bestCardFor = (schedule: Schedule) => catedras
    .map(item => ({ item, score: matchScore(schedule, item.materia) }))
    .sort((a, b) => b.score - a.score)[0];
  const cardSchedules = (item: CatedraContact) => schedulesFor(item.materia).filter(schedule => {
    const best = bestCardFor(schedule);
    return best?.item === item;
  });
  const filtered = useMemo(() => {
    const normalized = query.toLocaleLowerCase().trim();
    if (!normalized) return catedras;
    return catedras.filter(item => [item.area, item.materia, item.nombresAlternativos, item.contacto, item.docentes].filter(Boolean).join(" ").toLocaleLowerCase().includes(normalized));
  }, [query]);
  const visibleSchedules = useMemo(() => {
    const normalized = normalize(query);
    return schedules.filter(schedule => !normalized || normalize(schedule.raw_subject_name).includes(normalized));
  }, [query, schedules]);
  const unmatchedSchedules = visibleSchedules.filter(schedule => !assignedScheduleKeys.has(`${schedule.raw_subject_name}-${schedule.weekday}-${schedule.start_time}`) && (bestCardFor(schedule)?.score ?? 0) < 18);

  return <div>
    <div className="relative">
      <Search className="absolute left-4 top-3.5 text-ink/40" size={20} aria-hidden />
      <label className="sr-only" htmlFor="catedras-search">Buscar cátedra</label>
      <input id="catedras-search" className="input pl-12" placeholder="Buscar materia, área, cátedra o contacto..." value={query} onChange={event => setQuery(event.target.value)} />
    </div>
    <p className="mt-4 text-sm text-ink/50">{filtered.length} resultado(s)</p>
    <div className="mt-3 grid gap-4 md:grid-cols-2">
      {filtered.map(item => <article key={`${item.area}-${item.materia}`} className="card min-w-0 transition hover:-translate-y-1 hover:border-coral/30">
        <p className="text-xs font-semibold uppercase tracking-widest text-coral">{item.area}</p>
        <h2 className="mt-2 font-display text-xl font-bold">{item.materia}</h2>
        {item.nombresAlternativos && <p className="mt-2 text-sm text-ink/55">{item.nombresAlternativos}</p>}
        {item.docentes && <p className="mt-4 text-sm font-medium text-ink/75">{item.docentes}</p>}
        {cardSchedules(item).slice(0, 4).map(schedule => <div key={`${schedule.raw_subject_name}-${schedule.weekday}-${schedule.start_time}`} className="mt-4 border-l-4 border-cronopios-magenta pl-3 text-sm"><p className="font-bold">{schedule.weekday} · {schedule.start_time}{schedule.end_time ? `–${schedule.end_time}` : ""}</p><p className="text-ink/70">{schedule.commission || "Comisión a confirmar"} · {schedule.classroom || "Aula a confirmar"}{schedule.campus ? ` · ${schedule.campus}` : ""}</p><p className="mt-1 text-xs text-ink/50">Fuente: {schedule.source_label}</p></div>)}
        {item.contacto ? <p className="mt-4 flex min-w-0 items-start gap-2 whitespace-pre-line text-sm text-ink/70 [overflow-wrap:anywhere]"><Mail className="mt-0.5 shrink-0 text-coral" size={16} />{item.contacto}</p> : <p className="mt-4 text-sm italic text-ink/45">No se publicó un contacto específico.</p>}
        {item.redes && <div className="mt-4 flex flex-wrap gap-3">{item.redes.map(link => <a key={link.href} href={link.href} target="_blank" rel="noreferrer" className="min-h-11 py-2 text-sm font-semibold text-coral hover:underline">{link.label} ↗</a>)}</div>}
      </article>)}
      {!filtered.length && <p className="text-sm text-ink/60">No encontramos cátedras con esa búsqueda.</p>}
    </div>
    {unmatchedSchedules.length > 0 && <section className="mt-10">
      <h2 className="font-display text-2xl font-black">Otros horarios publicados</h2>
      <p className="mt-2 text-sm text-ink/60">Estos horarios fueron publicados oficialmente, pero todavía no tienen una cátedra vinculada en la guía.</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {unmatchedSchedules.map(schedule => <article key={`${schedule.raw_subject_name}-${schedule.weekday}-${schedule.start_time}`} className="card">
          <p className="font-display text-xl font-bold">{schedule.raw_subject_name}</p>
          <p className="mt-3 text-sm font-bold">{schedule.weekday} · {schedule.start_time}{schedule.end_time ? `–${schedule.end_time}` : ""}</p>
          <p className="mt-1 text-sm text-ink/70">{schedule.commission || "Comisión a confirmar"} · {schedule.classroom || "Aula a confirmar"}{schedule.campus ? ` · ${schedule.campus}` : ""}</p>
          <p className="mt-2 text-xs text-ink/50">Fuente: {schedule.source_label}</p>
        </article>)}
      </div>
    </section>}
    <div className="mt-8 flex flex-wrap gap-4 text-sm font-semibold">
      <a href={CATEDRAS_SOURCE_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 text-coral hover:underline">Publicación original <ExternalLink size={15} /></a>
      <a href={ESTUDIOS_HYS_SOURCE_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 text-coral hover:underline">Programas y contactos 2026 <ExternalLink size={15} /></a>
    </div>
  </div>;
}
