"use client";

import { useState } from "react";

type Source = { id: string | number; key: string; name: string; last_checked_at: string | null; last_success_at: string | null };
type Run = { id: string | number; source_id: string | number; started_at: string; status: string; records_found: number; records_changed: number; warning_count: number; error_summary: string | null };
type Draft = { id: number; table: "academic_events" | "course_schedules"; label: string; source_label: string; status: string };

export function AdminImportsPanel({ sources, runs, drafts }: { sources: Source[]; runs: Run[]; drafts: Draft[] }) {
  const [items, setItems] = useState(runs);
  const [loading, setLoading] = useState("");
  const [feedback, setFeedback] = useState("");
  async function runImport(sourceKey: string) {
    setLoading(sourceKey); setFeedback("");
    try {
      const response = await fetch("/api/admin/import/fda", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sourceKey }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No se pudo ejecutar el import.");
      setFeedback(`${sourceKey}: ${result.recordsFound} registros encontrados, ${result.recordsChanged} guardados como draft.`);
      window.location.reload();
    } catch (error) { setFeedback(error instanceof Error ? error.message : "No se pudo ejecutar el import."); } finally { setLoading(""); }
  }
  async function review(draft: Draft, action: "publish" | "discard") {
    const response = await fetch("/api/admin/import/fda/review", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ table: draft.table, id: draft.id, action }) });
    if (response.ok) window.location.reload();
  }
  return <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_1fr]"><section className="space-y-4">{sources.map(source => <article key={source.key} className="card"><h2 className="font-display text-xl font-black">{source.name}</h2><p className="mt-2 text-xs text-ink/55">Último chequeo: {source.last_checked_at ? new Date(source.last_checked_at).toLocaleString("es-AR") : "Nunca"}</p><button className="button-primary mt-4" disabled={loading === source.key} onClick={() => void runImport(source.key)}>{loading === source.key ? "Importando..." : "Ejecutar import"}</button></article>)}{feedback && <p className="border-2 border-cronopios-ink bg-cronopios-green p-3 text-sm font-bold">{feedback}</p>}<h2 className="pt-4 font-display text-2xl font-black">Drafts para revisar</h2>{drafts.map(draft => <article key={`${draft.table}-${draft.id}`} className="border-2 border-cronopios-ink bg-white p-4"><p className="font-bold">{draft.label}</p><p className="mt-1 text-xs text-ink/55">Fuente: {draft.source_label}</p><div className="mt-3 flex gap-2"><button className="button-primary" onClick={() => void review(draft, "publish")}>Publicar</button><button className="border-2 border-cronopios-ink px-3 py-2 text-sm font-bold" onClick={() => void review(draft, "discard")}>Descartar</button></div></article>)}</section><section><h2 className="font-display text-2xl font-black">Últimas ejecuciones</h2><div className="mt-4 space-y-3">{items.map(run => <article key={run.id} className="border-2 border-cronopios-ink bg-white p-4 text-sm"><p className="font-bold uppercase tracking-wider">{run.status}</p><p className="mt-1">{run.records_found} encontrados · {run.records_changed} cambiados · {run.warning_count} warnings</p>{run.error_summary && <p className="mt-2 text-amber-700">{run.error_summary}</p>}<p className="mt-2 text-xs text-ink/50">{new Date(run.started_at).toLocaleString("es-AR")}</p></article>)}{!items.length && <p className="mt-4 text-sm text-ink/60">Todavía no hay ejecuciones.</p>}</div></section></div>;
}
