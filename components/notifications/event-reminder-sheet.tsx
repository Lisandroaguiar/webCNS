"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { reminderLabel, type ReminderType } from "@/lib/notifications/reminders";
import { PaperScrap, Tape } from "@/components/visual/paper";

type Props = { eventId: number; title: string; options: ReminderType[]; authenticated: boolean; initialActive: ReminderType[] };

function applicationServerKey(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const raw = atob((value + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(Array.from(raw).map(character => character.charCodeAt(0)));
}

async function subscribeDevice() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) throw new Error("Este navegador no admite notificaciones web.");
  if (Notification.permission === "denied") throw new Error("Las notificaciones están bloqueadas en este navegador.");
  const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") throw new Error("No se otorgó permiso para mostrar notificaciones.");
  const registration = await navigator.serviceWorker.register("/sw.js");
  const existing = await registration.pushManager.getSubscription();
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) throw new Error("Las notificaciones todavía no están configuradas.");
  const subscription = existing ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationServerKey(publicKey) });
  const response = await fetch("/api/notifications/subscriptions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(subscription.toJSON()) });
  if (!response.ok) throw new Error((await response.json()).error ?? "No se pudo guardar el dispositivo.");
}

export function EventReminderSheet({ eventId, title, options, authenticated, initialActive }: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<ReminderType[]>(initialActive);
  const [active, setActive] = useState(initialActive.length > 0);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLElement>("button, a, input")?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key !== "Tab" || !dialog.current) return;
      const focusable = Array.from(dialog.current.querySelectorAll<HTMLElement>("button, a, input")).filter(element => !element.hasAttribute("disabled"));
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", keydown);
    return () => { document.removeEventListener("keydown", keydown); (previous ?? trigger.current)?.focus(); };
  }, [open]);

  async function activate() {
    setLoading(true); setMessage("");
    try {
      await subscribeDevice();
      const response = await fetch("/api/notifications/reminders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ eventId, reminderTypes: selected }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No se pudo guardar el aviso.");
      setActive(true); setOpen(false);
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo activar el aviso."); }
    finally { setLoading(false); }
  }

  async function disable() {
    setLoading(true);
    const response = await fetch("/api/notifications/reminders", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ eventId }) });
    setLoading(false);
    if (response.ok) { setActive(false); setSelected([]); setOpen(false); }
  }

  return <>
    <button ref={trigger} type="button" className={`mt-5 min-h-11 border-2 border-ink px-4 py-2 font-display text-sm font-black uppercase tracking-wide shadow-[3px_3px_0_0_#221E21] transition hover:-translate-y-0.5 ${active ? "bg-cronopios-green" : "bg-cronopios-magenta"}`} onClick={() => setOpen(true)}>{active ? "Aviso activado ✓" : "Avisame"}</button>
    {open && <div className="fixed inset-0 z-50 flex items-end bg-black/50 md:items-center md:justify-center" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}>
      <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby={`reminder-title-${eventId}`} className="w-full border-2 border-black bg-cronopios-paper p-5 shadow-[7px_7px_0_0_#221E21] md:max-w-lg md:p-6">
        <PaperScrap className="relative px-6 py-7"><Tape className="-top-5 left-1/2 -translate-x-1/2" /><div className="flex items-start justify-between gap-4"><div><p className="eyebrow">Recordatorio</p><h2 id={`reminder-title-${eventId}`} className="mt-4 font-display text-2xl font-black leading-tight">{title}</h2></div><button type="button" className="min-h-11 min-w-11 text-2xl" aria-label="Cerrar" onClick={() => setOpen(false)}>×</button></div></PaperScrap>
        {!authenticated ? <div className="mt-6"><p>Para guardar tus avisos necesitamos asociarlos a tu cuenta.</p><div className="mt-6 flex gap-3"><Link className="button-primary min-h-11" href={`/login?next=${encodeURIComponent(`/agenda#evento-${eventId}`)}`}>Ingresar</Link><button className="min-h-11 px-4 font-bold" onClick={() => setOpen(false)}>Ahora no</button></div></div> : <>
          <fieldset className="mt-6 space-y-3"><legend className="font-bold">¿Cuándo querés que te avisemos?</legend>{options.map(option => <label key={option} className={`flex min-h-11 items-center gap-3 border-2 border-ink p-3 ${selected.includes(option) ? "bg-cronopios-green" : "bg-white"}`}><input className="h-5 w-5 accent-cronopios-magenta" type="checkbox" checked={selected.includes(option)} onChange={event => setSelected(current => event.target.checked ? [...current, option] : current.filter(value => value !== option))} /><span className="font-medium">{reminderLabel(option)}</span></label>)}</fieldset>
          {message && <p className="mt-4 text-sm text-red-700" role="alert">{message}</p>}
          <div className="mt-6 flex flex-wrap gap-3"><button className="button-primary min-h-11" disabled={loading || !selected.length} onClick={() => void activate()}>{loading ? "Guardando..." : "Activar avisos"}</button>{active && <button className="min-h-11 border-2 border-ink px-4 font-bold" disabled={loading} onClick={() => void disable()}>Desactivar avisos</button>}</div>
        </>}
      </div>
    </div>}
  </>;
}
