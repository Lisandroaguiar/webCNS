"use client";

import { useState } from "react";
import { weekDays } from "@/lib/academic/weekly-schedule";

type Row = { id: number; subject_id: string | null; raw_subject_name: string; curriculum: string | null; academic_year: number; semester: number | null; commission: string | null; weekday: string; start_time: string | null; end_time: string | null; classroom: string | null; campus: string | null };
type Subject = { id: string; name: string; curriculum: string };
type Draft = Omit<Row, "id">;
const blank = (): Draft => ({ subject_id: null, raw_subject_name: "", curriculum: "new", academic_year: new Date().getFullYear(), semester: 2, commission: "", weekday: "Lunes", start_time: "", end_time: "", classroom: "", campus: "" });

export function AdminSchedulesPanel({ initialSchedules, subjects }: { initialSchedules: Row[]; subjects: Subject[] }) {
  const [rows, setRows] = useState(initialSchedules);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(blank);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  function edit(row: Row) { setEditing(row.id); setDraft({ ...row, start_time: row.start_time?.slice(0, 5) ?? "", end_time: row.end_time?.slice(0, 5) ?? "" }); }
  function startNew(row?: Row) { setEditing("new"); setDraft(row ? { ...row, commission: "" } : blank()); }
  async function save() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/horarios", { method: editing === "new" ? "POST" : "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...draft, id: editing }) });
      const result = await response.json() as { id?: number; error?: string };
      if (!response.ok) throw new Error(result.error ?? "No pudimos guardar el horario.");
      const id = editing === "new" ? result.id! : editing as number;
      setRows(current => [...current.filter(item => item.id !== id), { ...draft, id }].sort((a, b) => a.raw_subject_name.localeCompare(b.raw_subject_name)));
      setEditing(null); setMessage("Horario publicado.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "No pudimos guardar el horario."); }
    finally { setBusy(false); }
  }
  const visible = rows.filter(row => !query || `${row.raw_subject_name} ${row.commission ?? ""}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  const available = subjects.filter(item => item.curriculum === draft.curriculum);
  return <div className="mt-6">
    {message && <p role="status" className="mb-4 border-l-4 border-cronopios-magenta bg-white p-3 text-sm font-bold">{message}</p>}
    <div className="flex flex-wrap gap-3"><input aria-label="Buscar horario" className="input max-w-xl" placeholder="Buscar materia o comisión" value={query} onChange={event => setQuery(event.target.value)} /><button type="button" onClick={() => startNew()} className="min-h-11 border-2 border-ink bg-cronopios-green px-4 font-bold">Agregar comisión</button></div>
    {editing !== null && <section className="card mt-5"><h2 className="font-display text-xl font-black">{editing === "new" ? "Nueva comisión" : "Editar horario"}</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <label className="text-sm font-bold">Plan<select className="input mt-1" value={draft.curriculum ?? "new"} onChange={event => setDraft(current => ({ ...current, curriculum: event.target.value, subject_id: null, raw_subject_name: "" }))}><option value="new">Plan nuevo</option><option value="old">Plan viejo</option><option value="profesorado">Profesorado</option></select></label>
      <label className="text-sm font-bold">Materia<select className="input mt-1" value={draft.subject_id ?? ""} onChange={event => { const subject = available.find(item => item.id === event.target.value); setDraft(current => ({ ...current, subject_id: subject?.id ?? null, raw_subject_name: subject?.name ?? current.raw_subject_name })); }}><option value="">Elegir del plan o escribir nombre</option>{available.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="text-sm font-bold">Nombre<input className="input mt-1" value={draft.raw_subject_name} onChange={event => setDraft(current => ({ ...current, raw_subject_name: event.target.value }))} /></label>
      <label className="text-sm font-bold">Comisión<input className="input mt-1" value={draft.commission ?? ""} onChange={event => setDraft(current => ({ ...current, commission: event.target.value }))} /></label>
      <label className="text-sm font-bold">Día<select className="input mt-1" value={draft.weekday} onChange={event => setDraft(current => ({ ...current, weekday: event.target.value }))}>{weekDays.map(day => <option key={day}>{day}</option>)}</select></label>
      <label className="text-sm font-bold">Año<input type="number" className="input mt-1" value={draft.academic_year} onChange={event => setDraft(current => ({ ...current, academic_year: Number(event.target.value) }))} /></label>
      <label className="text-sm font-bold">Cuatrimestre<select className="input mt-1" value={draft.semester ?? ""} onChange={event => setDraft(current => ({ ...current, semester: event.target.value ? Number(event.target.value) : null }))}><option value="">Anual / no informado</option><option value="1">1º</option><option value="2">2º</option></select></label>
      <label className="text-sm font-bold">Desde<input type="time" className="input mt-1" value={draft.start_time ?? ""} onChange={event => setDraft(current => ({ ...current, start_time: event.target.value }))} /></label>
      <label className="text-sm font-bold">Hasta<input type="time" className="input mt-1" value={draft.end_time ?? ""} onChange={event => setDraft(current => ({ ...current, end_time: event.target.value }))} /></label>
      <label className="text-sm font-bold">Aula<input className="input mt-1" value={draft.classroom ?? ""} onChange={event => setDraft(current => ({ ...current, classroom: event.target.value }))} /></label>
      <label className="text-sm font-bold">Sede<input className="input mt-1" value={draft.campus ?? ""} onChange={event => setDraft(current => ({ ...current, campus: event.target.value }))} /></label>
    </div><div className="mt-4 flex gap-2"><button type="button" disabled={busy} onClick={() => void save()} className="min-h-11 border-2 border-ink bg-cronopios-green px-4 font-bold disabled:opacity-50">Publicar horario</button><button type="button" onClick={() => setEditing(null)} className="min-h-11 px-3 font-bold">Cancelar</button></div></section>}
    <p className="mt-5 text-sm text-ink/60">{visible.length} horarios publicados</p><div className="mt-3 grid gap-3 md:grid-cols-2">{visible.map(row => <article key={row.id} className="card"><h2 className="font-display text-lg font-black">{row.raw_subject_name}</h2><p className="text-sm text-ink/60">{row.commission || "Sin comisión"} · {row.weekday} {row.start_time?.slice(0, 5)}{row.end_time ? `–${row.end_time.slice(0, 5)}` : ""} · {row.classroom || "Aula a confirmar"}</p><div className="mt-3 flex gap-2"><button type="button" onClick={() => edit(row)} className="min-h-11 border-2 border-ink px-3 font-bold">Editar</button><button type="button" onClick={() => startNew(row)} className="min-h-11 border-2 border-ink px-3 font-bold">Otra comisión</button></div></article>)}</div>
  </div>;
}
