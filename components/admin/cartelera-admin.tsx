"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Post = { id: string; title: string; body: string; event_type: string; event_date: string | null; event_time: string | null; location: string | null; image_url: string | null; link_url: string | null; accent: string; is_published: boolean };
const empty = { title: "", body: "", eventType: "evento", eventDate: "", eventTime: "", location: "", imageUrl: "", linkUrl: "", accent: "fuchsia", isPublished: false };

export function CarteleraAdmin({ posts }: { posts: Post[] }) {
  const router = useRouter();
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(payload: Record<string, unknown>) {
    if (saving) return;
    setSaving(true);
    setMessage("");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch("/api/admin/cartelera", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) {
        setMessage(result.error ?? "No pudimos guardar la actividad. Intentá de nuevo.");
        return;
      }
      setMessage("Cartelera actualizada.");
      setEditing(null);
      setForm(empty);
      router.refresh();
    } catch {
      setMessage("Se interrumpió la conexión. Comprobá si la actividad aparece en Publicaciones antes de volver a guardar.");
    } finally {
      window.clearTimeout(timeout);
      setSaving(false);
    }
  }
  function edit(post: Post) {
    setEditing(post.id); setForm({ title: post.title, body: post.body, eventType: post.event_type, eventDate: post.event_date ?? "", eventTime: post.event_time?.slice(0, 5) ?? "", location: post.location ?? "", imageUrl: post.image_url ?? "", linkUrl: post.link_url ?? "", accent: post.accent, isPublished: post.is_published });
  }
  function remove(post: Post) {
    if (window.confirm(`¿Eliminar “${post.title}”? Esta acción no se puede deshacer.`)) {
      void submit({ action: "delete", id: post.id });
    }
  }
  return <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.2fr]">
    <form className="card space-y-4" onSubmit={event => { event.preventDefault(); void submit({ action: "save", id: editing, ...form }); }}>
      <h2 className="font-display text-2xl font-black">{editing ? "Editar actividad" : "Nueva actividad"}</h2>
      <label className="block text-sm font-bold">Título<input className="input mt-1" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required /></label>
      <label className="block text-sm font-bold">Bajada / resumen<textarea className="input mt-1 min-h-28" value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} required /></label>
      <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-bold">Tipo<select className="input mt-1" value={form.eventType} onChange={e => setForm({ ...form, eventType: e.target.value })}><option value="evento">Evento</option><option value="aviso">Aviso</option><option value="convocatoria">Convocatoria</option><option value="cultural">Cultural</option><option value="fecha_examen">Fecha de examen</option></select></label><label className="text-sm font-bold">Lugar<input className="input mt-1" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></label></div>
      <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-bold">Fecha<input type="date" className="input mt-1" value={form.eventDate} onChange={e => setForm({ ...form, eventDate: e.target.value })} /></label><label className="text-sm font-bold">Hora<input type="time" className="input mt-1" value={form.eventTime} onChange={e => setForm({ ...form, eventTime: e.target.value })} /></label></div>
      <label className="block text-sm font-bold">URL de imagen o publicación de Instagram<input type="url" className="input mt-1" value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })} /><span className="mt-1 block text-xs font-normal text-ink/65">Podés pegar el enlace de una publicación pública de Instagram o la URL directa de una imagen.</span></label>
      <label className="block text-sm font-bold">Link / formulario<input type="url" className="input mt-1" value={form.linkUrl} onChange={e => setForm({ ...form, linkUrl: e.target.value })} /></label>
      <div className="flex flex-wrap items-center gap-4"><select className="input w-auto" value={form.accent} onChange={e => setForm({ ...form, accent: e.target.value })}><option value="fuchsia">Magenta</option><option value="lime">Lima</option><option value="cyan">Cian</option></select><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.isPublished} onChange={e => setForm({ ...form, isPublished: e.target.checked })} /> Publicada</label></div>
      <div className="flex gap-3"><button className="button-primary" disabled={saving}>{saving ? "Guardando…" : "Guardar"}</button>{editing && <button type="button" className="border-2 border-ink px-4 font-bold" onClick={() => { setEditing(null); setForm(empty); }}>Cancelar</button>}</div>{message && <p role="status" className="text-sm font-bold">{message}</p>}
    </form>
    <section><h2 className="font-display text-2xl font-black">Publicaciones</h2><div className="mt-4 space-y-3">{posts.map(post => <article key={post.id} className="border-2 border-ink bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold">{post.title}</p><p className="mt-1 text-xs uppercase tracking-widest text-ink/55">{post.event_type} · {post.is_published ? "Publicada" : "Borrador"}</p></div><div className="flex flex-wrap gap-2"><button className="border-2 border-ink px-3 py-2 text-sm font-bold" onClick={() => edit(post)}>Editar</button><button className="border-2 border-ink px-3 py-2 text-sm font-bold" onClick={() => void submit({ action: "toggle", id: post.id, isPublished: !post.is_published })}>{post.is_published ? "Despublicar" : "Publicar"}</button><button className="border-2 border-cronopios-magenta px-3 py-2 text-sm font-bold text-cronopios-magenta" onClick={() => remove(post)}>Eliminar</button></div></div></article>)}</div></section>
  </div>;
}
