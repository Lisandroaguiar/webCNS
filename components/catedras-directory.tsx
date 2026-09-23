"use client";

import { ExternalLink, Mail, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { catedras, CATEDRAS_SOURCE_URL, ESTUDIOS_HYS_SOURCE_URL, type CatedraContact } from "@/data/catedras";
import { detectScheduleConflicts, isCurrentSchedule, sameSubject, type WeekSchedule } from "@/lib/academic/weekly-schedule";

type Schedule = WeekSchedule & { notes: string | null; source_label: string; source_url: string };

export function CatedrasDirectory({ schedules = [], initialQuery = "", selectedSchedules = [], activeCurriculum = null, period, authenticated = false }: { schedules?: Schedule[]; initialQuery?: string; selectedSchedules?: WeekSchedule[]; activeCurriculum?: string | null; period: { academicYear: number; semester: number }; authenticated?: boolean }) {
  const [query, setQuery] = useState(initialQuery);
  const [selected, setSelected] = useState(selectedSchedules);
  const [pending, setPending] = useState<Schedule | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [weekMessage, setWeekMessage] = useState("");
  const comparable = (schedule: Schedule) => selected.filter(item => activeCurriculum && isCurrentSchedule(item, period, activeCurriculum) && item.id !== schedule.id);
  const alternativesFor = (schedule: Schedule) => comparable(schedule).filter(item => sameSubject(item, schedule));
  const conflictsFor = (schedule: Schedule) => detectScheduleConflicts([...comparable(schedule), schedule]).filter(pair => pair.first.id === schedule.id || pair.second.id === schedule.id).map(pair => pair.first.id === schedule.id ? pair.second : pair.first);
  async function changeSelection(schedule: Schedule, mode: "add" | "replace" | "remove") {
    setBusyId(schedule.id);
    setWeekMessage("");
    try {
      const response = await fetch("/api/mi-semana", { method: mode === "remove" ? "DELETE" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ scheduleId: schedule.id, replaceSameSubject: mode === "replace" }) });
      const result = await response.json() as { error?: string; replacedIds?: number[] };
      if (!response.ok) throw new Error(result.error ?? "No pudimos actualizar Mi semana.");
      setSelected(current => mode === "remove" ? current.filter(item => item.id !== schedule.id) : [...current.filter(item => item.id !== schedule.id && !(result.replacedIds ?? []).includes(item.id)), schedule]);
      setWeekMessage(mode === "remove" ? "Quitada de Mi semana." : "Agregada a Mi semana ✓");
      setPending(null);
    } catch (error) { setWeekMessage(error instanceof Error ? error.message : "No pudimos actualizar Mi semana."); }
    finally { setBusyId(null); }
  }
  function selectionAction(schedule: Schedule) {
    if (!authenticated || !activeCurriculum || !isCurrentSchedule(schedule, period, activeCurriculum)) return null;
    const isSelected = selected.some(item => item.id === schedule.id);
    return <div className="mt-2 flex flex-wrap items-center gap-2"><button type="button" disabled={busyId != null} onClick={() => isSelected ? void changeSelection(schedule, "remove") : alternativesFor(schedule).length || conflictsFor(schedule).length ? setPending(schedule) : void changeSelection(schedule, "add")} className="min-h-11 border-2 border-ink bg-white px-3 text-xs font-bold disabled:opacity-50">{isSelected ? "✓ En Mi semana · Quitar" : "Agregar a Mi semana"}</button>{!schedule.end_time && <span className="text-xs text-ink/60">Duración no informada</span>}</div>;
  }
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
  const visibleCardScheduleIds = new Set(filtered.flatMap(item => cardSchedules(item).map(schedule => schedule.id)));
  const unmatchedSchedules = visibleSchedules.filter(schedule => !visibleCardScheduleIds.has(schedule.id));

  return <div>
    {weekMessage && <p role="status" className="mb-4 border-l-4 border-cronopios-magenta bg-white p-3 text-sm font-bold">{weekMessage}</p>}
    {pending && <div role="dialog" aria-modal="true" aria-label="Confirmar horario" className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center"><div className="w-full max-w-lg border-2 border-ink bg-cronopios-paper p-5 shadow-[6px_6px_0_0_#221E21]"><h2 className="font-display text-xl font-black">Revisá esta comisión</h2><p className="mt-2 font-bold">{pending.raw_subject_name} · {pending.weekday} {pending.start_time?.slice(0,5)}</p>{alternativesFor(pending).length > 0 && <p className="mt-3 text-sm">Ya tenés otra comisión de esta materia en Mi semana.</p>}{conflictsFor(pending).length > 0 && <p className="mt-3 text-sm">Se superpone con: {conflictsFor(pending).map(item => `${item.raw_subject_name} · ${item.start_time?.slice(0,5)}–${item.end_time?.slice(0,5)}`).join(", ")}.</p>}<div className="mt-5 flex flex-wrap gap-2">{alternativesFor(pending).length > 0 && <button disabled={busyId != null} onClick={() => void changeSelection(pending, "replace")} className="min-h-11 border-2 border-ink bg-cronopios-green px-3 font-bold">Reemplazar</button>}<button disabled={busyId != null} onClick={() => void changeSelection(pending, "add")} className="min-h-11 border-2 border-ink bg-white px-3 font-bold">{alternativesFor(pending).length ? "Agregar ambas" : "Agregar igual"}</button><button disabled={busyId != null} onClick={() => setPending(null)} className="min-h-11 px-3 font-bold">Cancelar</button></div></div></div>}
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
        {cardSchedules(item).map(schedule => <div key={schedule.id} className="mt-4 border-l-4 border-cronopios-magenta pl-3 text-sm"><p className="font-bold">{schedule.weekday} · {schedule.start_time}{schedule.end_time ? `–${schedule.end_time}` : ""}</p><p className="text-ink/70">{schedule.commission || "Comisión a confirmar"} · {schedule.classroom || "Aula a confirmar"}{schedule.campus ? ` · ${schedule.campus}` : ""}</p><p className="mt-1 text-xs text-ink/50">Plan {schedule.curriculum === "new" ? "nuevo" : schedule.curriculum === "old" ? "viejo" : "sin especificar"} · {schedule.semester ? `${schedule.semester}º cuatrimestre` : "cuatrimestre no informado"} · Fuente: {schedule.source_label}</p>{selectionAction(schedule)}</div>)}
        {item.contacto ? <p className="mt-4 flex min-w-0 items-start gap-2 whitespace-pre-line text-sm text-ink/70 [overflow-wrap:anywhere]"><Mail className="mt-0.5 shrink-0 text-coral" size={16} />{item.contacto}</p> : <p className="mt-4 text-sm italic text-ink/45">No se publicó un contacto específico.</p>}
        {item.redes && <div className="mt-4 flex flex-wrap gap-3">{item.redes.map(link => <a key={link.href} href={link.href} target="_blank" rel="noreferrer" className="min-h-11 py-2 text-sm font-semibold text-coral hover:underline">{link.label} ↗</a>)}</div>}
      </article>)}
      {!filtered.length && <p className="text-sm text-ink/60">No encontramos cátedras con esa búsqueda.</p>}
    </div>
    {unmatchedSchedules.length > 0 && <section className="mt-10">
      <h2 className="font-display text-2xl font-black">Otros horarios publicados</h2>
      <p className="mt-2 text-sm text-ink/60">Estos horarios fueron publicados oficialmente, pero todavía no tienen una cátedra vinculada en la guía.</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {unmatchedSchedules.map(schedule => <article key={schedule.id} className="card">
          <p className="font-display text-xl font-bold">{schedule.raw_subject_name}</p>
          <p className="mt-3 text-sm font-bold">{schedule.weekday} · {schedule.start_time}{schedule.end_time ? `–${schedule.end_time}` : ""}</p>
          <p className="mt-1 text-sm text-ink/70">{schedule.commission || "Comisión a confirmar"} · {schedule.classroom || "Aula a confirmar"}{schedule.campus ? ` · ${schedule.campus}` : ""}</p>
          <p className="mt-2 text-xs text-ink/50">Plan {schedule.curriculum === "new" ? "nuevo" : schedule.curriculum === "old" ? "viejo" : "sin especificar"} · {schedule.semester ? `${schedule.semester}º cuatrimestre` : "cuatrimestre no informado"} · Fuente: {schedule.source_label}</p>
          {selectionAction(schedule)}
        </article>)}
      </div>
    </section>}
    <div className="mt-8 flex flex-wrap gap-4 text-sm font-semibold">
      <a href={CATEDRAS_SOURCE_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 text-coral hover:underline">Publicación original <ExternalLink size={15} /></a>
      <a href={ESTUDIOS_HYS_SOURCE_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 text-coral hover:underline">Programas y contactos 2026 <ExternalLink size={15} /></a>
    </div>
  </div>;
}
