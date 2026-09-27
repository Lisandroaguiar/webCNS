"use client";

import { useState } from "react";

type Subject = { id: string; name: string; curriculum: string };
type Alias = { id: number; subject_id: string; alias: string; curriculum: string; source: string | null };

export function SubjectAliasesPanel({ subjects, initialAliases }: { subjects: Subject[]; initialAliases: Alias[] }) {
  const [aliases, setAliases] = useState(initialAliases);
  const [curriculum, setCurriculum] = useState("old");
  const [subjectId, setSubjectId] = useState("");
  const [alias, setAlias] = useState("");
  const [source, setSource] = useState("Revisión humana");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/aliases", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ subjectId, alias, source }) });
      const result = await response.json() as { id?: number; error?: string };
      if (!response.ok || !result.id) throw new Error(result.error ?? "No pudimos guardar el alias.");
      setAliases(current => [{ id: result.id!, subject_id: subjectId, alias: alias.trim(), curriculum, source }, ...current]);
      setAlias(""); setMessage("Alias verificado guardado. Se usará en futuras revisiones del analítico.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "No pudimos guardar el alias."); }
    finally { setBusy(false); }
  }
  return <div className="mt-6 grid gap-6 lg:grid-cols-2">
    <form onSubmit={event => void save(event)} className="card space-y-4"><h2 className="font-display text-xl font-black">Nuevo alias verificado</h2><p className="text-sm text-ink/65">Comprobá la equivalencia con el plan antes de agregarla. Solo los aliases verificados se reconocen automáticamente.</p>
      <label className="block text-sm font-bold">Plan<select className="input mt-1" value={curriculum} onChange={event => { setCurriculum(event.target.value); setSubjectId(""); }}><option value="old">Plan 2006</option><option value="new">Plan 2024</option></select></label>
      <label className="block text-sm font-bold">Materia<select required className="input mt-1" value={subjectId} onChange={event => setSubjectId(event.target.value)}><option value="">Elegí una materia</option>{subjects.filter(item => item.curriculum === curriculum).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="block text-sm font-bold">Nombre alternativo<input required maxLength={160} className="input mt-1" value={alias} onChange={event => setAlias(event.target.value)} /></label>
      <label className="block text-sm font-bold">Fuente de verificación<input maxLength={160} className="input mt-1" value={source} onChange={event => setSource(event.target.value)} /></label>
      <button className="button-primary" disabled={busy || !subjectId || !alias.trim()}>{busy ? "Guardando..." : "Guardar alias"}</button>{message && <p role="status" className="text-sm font-bold">{message}</p>}
    </form>
    <section className="card"><h2 className="font-display text-xl font-black">Aliases verificados</h2><ul className="mt-4 space-y-3 text-sm">{aliases.map(item => <li key={item.id} className="border-b border-ink/15 pb-2"><strong>{item.alias}</strong><span className="block text-ink/65">{subjects.find(subject => subject.id === item.subject_id)?.name ?? item.subject_id} · {item.curriculum === "old" ? "Plan 2006" : "Plan 2024"}</span></li>)}</ul>{!aliases.length && <p className="mt-3 text-sm text-ink/60">Todavía no hay aliases verificados.</p>}</section>
  </div>;
}
