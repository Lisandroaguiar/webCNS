"use client";

import { useState } from "react";

type Subject = { id: string; official_name: string; curriculum_id: string };
type Alias = { curriculum_subject_id: string; curriculum_id: string; alias: string; source: string | null; verified: boolean; active: boolean };

export function CurriculumAliasesPanel({ subjects, initialAliases }: { subjects: Subject[]; initialAliases: Alias[] }) {
  const [aliases, setAliases] = useState(initialAliases);
  const [curriculumId, setCurriculumId] = useState("plastica-2006");
  const [subjectId, setSubjectId] = useState("");
  const [alias, setAlias] = useState("");
  const [source, setSource] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const plans = Array.from(new Set(subjects.map(row => row.curriculum_id)));

  async function create(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    const response = await fetch("/api/admin/curriculum-aliases", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ subjectId, alias, source }) });
    const result = await response.json() as { error?: string };
    if (response.ok) { setAliases(current => [{ curriculum_subject_id: subjectId, curriculum_id: curriculumId, alias: alias.trim(), source: source.trim(), verified: true, active: true }, ...current]); setAlias(""); setSource(""); setMessage("Alias contextual guardado."); }
    else setMessage(result.error ?? "No pudimos guardar el alias.");
    setBusy(false);
  }

  async function change(item: Alias, method: "PATCH" | "DELETE") {
    if (method === "DELETE" && !window.confirm(`¿Eliminar el alias «${item.alias}»?`)) return;
    setBusy(true); setMessage("");
    const response = await fetch("/api/admin/curriculum-aliases", { method, headers: { "content-type": "application/json" }, body: JSON.stringify({ subjectId: item.curriculum_subject_id, alias: item.alias, active: !item.active }) });
    if (response.ok) setAliases(current => method === "DELETE" ? current.filter(row => row !== item) : current.map(row => row === item ? { ...row, active: !row.active } : row));
    else setMessage("No pudimos modificar el alias.");
    setBusy(false);
  }

  return <section className="mt-8 border-t-2 border-ink pt-6"><h2 className="font-display text-2xl font-black">Aliases por plan de Artes Plásticas</h2><p className="mt-2 text-sm text-ink/65">Solo las equivalencias verificadas y activas se usan al leer un analítico. El plan limita cada alias; una semejanza de nombres no alcanza como prueba.</p><div className="mt-4 grid gap-5 lg:grid-cols-2"><form onSubmit={event => void create(event)} className="card space-y-3"><label className="block text-sm font-bold">Plan<select className="input mt-1" value={curriculumId} onChange={event => { setCurriculumId(event.target.value); setSubjectId(""); }}>{plans.map(plan => <option key={plan} value={plan}>{plan}</option>)}</select></label><label className="block text-sm font-bold">Materia de destino<select required className="input mt-1" value={subjectId} onChange={event => setSubjectId(event.target.value)}><option value="">Elegir materia</option>{subjects.filter(row => row.curriculum_id === curriculumId).map(row => <option key={row.id} value={row.id}>{row.official_name}</option>)}</select></label><label className="block text-sm font-bold">Nombre alternativo<input required className="input mt-1" value={alias} onChange={event => setAlias(event.target.value)} /></label><label className="block text-sm font-bold">Fuente o razón de la equivalencia<input required className="input mt-1" value={source} onChange={event => setSource(event.target.value)} /></label><button className="button-primary" disabled={busy || !subjectId || !alias.trim() || !source.trim()}>Guardar alias verificado</button></form><div className="card"><h3 className="font-bold">Aliases existentes</h3><div className="mt-3 space-y-3">{aliases.filter(item => item.curriculum_id === curriculumId).map(item => <div key={`${item.curriculum_subject_id}-${item.alias}`} className="border-t border-ink/20 pt-2 text-sm"><strong>{item.alias}</strong><p>{subjects.find(subject => subject.id === item.curriculum_subject_id)?.official_name ?? item.curriculum_subject_id}</p><p className="text-ink/65">{item.curriculum_id} · {item.source ?? "Sin fuente"} · {item.active ? "Activo" : "Inactivo"}</p><div className="mt-2 flex gap-2"><button type="button" disabled={busy} className="button-secondary" onClick={() => void change(item, "PATCH")}>{item.active ? "Desactivar" : "Activar"}</button><button type="button" disabled={busy} className="button-secondary" onClick={() => void change(item, "DELETE")}>Eliminar</button></div></div>)}</div></div></div>{message && <p role="status" className="mt-3 text-sm">{message}</p>}</section>;
}
