import { PublicHeader } from "@/components/app-shell/public-header";
import { AcademicDeadlineCard } from "@/components/dashboard/academic-deadline-card";
import { createClient } from "@/lib/supabase/server";
import { EventReminderSheet } from "@/components/notifications/event-reminder-sheet";
import { availableReminderTypes, type ReminderType } from "@/lib/notifications/reminders";
import { PaperScrap, Tape } from "@/components/visual/paper";

export default async function AgendaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: events } = await supabase.from("academic_events").select("id,title,event_type,registration_start,registration_end,starts_at,ends_at,source_label,updated_at").eq("status", "published").order("starts_at", { ascending: true }).limit(30);
  const { data: reminders } = user ? await supabase.from("event_reminders").select("academic_event_id,reminder_type").eq("user_id", user.id).eq("enabled", true) : { data: [] };
  const nextEvent = events?.find(event => new Date(event.ends_at ?? event.starts_at ?? "2999-12-31") >= new Date());
  const formatRange = (start?: string | null, end?: string | null) => start ? `${new Date(`${start}T12:00:00`).toLocaleDateString("es-AR", { day: "numeric", month: "long" })}${end && end !== start ? ` — ${new Date(`${end}T12:00:00`).toLocaleDateString("es-AR", { day: "numeric", month: "long" })}` : ""}` : "Fecha a confirmar";
  return <main className="min-h-screen bg-cronopios-paper">
    <PublicHeader />
    <div className="mx-auto max-w-6xl px-5 py-10 md:px-8">
      <PaperScrap className="relative max-w-3xl px-7 py-8 md:px-10"><Tape className="-right-5 -top-4 rotate-6" /><p className="eyebrow">Facultad de Artes UNLP</p>
      <h1 className="editorial-title mt-5 text-5xl md:text-6xl">Agenda académica</h1>
      <p className="mt-4 max-w-2xl text-ink/65">Fechas de finales e inscripciones cuando estén confirmadas por una fuente oficial.</p></PaperScrap>
      <div className="mt-8 max-w-2xl"><AcademicDeadlineCard title={nextEvent?.title} detail={nextEvent ? formatRange(nextEvent.starts_at, nextEvent.ends_at) : undefined} sourceLabel={nextEvent?.source_label} sourceUpdatedAt={nextEvent?.updated_at} /></div>
      <section className="mt-8 grid gap-4 md:grid-cols-2">
        {(events ?? []).map(event => { const options = availableReminderTypes(event); const active = (reminders ?? []).filter(reminder => reminder.academic_event_id === event.id).map(reminder => reminder.reminder_type as ReminderType); return <article id={`evento-${event.id}`} key={event.id} className="card border-t-[10px] border-t-cronopios-magenta"><p className="inline-block bg-ink px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-white">{event.event_type.replaceAll("_", " ")}</p><h2 className="mt-3 font-display text-2xl font-black leading-tight">{event.title}</h2><p className="mt-3 text-sm font-bold text-ink/75">{formatRange(event.starts_at, event.ends_at)}</p>{event.registration_start && <p className="mt-2 text-sm text-ink/65">Inscripción: {formatRange(event.registration_start, event.registration_end)}</p>}<p className="mt-5 border-t border-ink/20 pt-3 text-xs text-ink/50">Fuente: {event.source_label} · actualizado {new Date(event.updated_at).toLocaleDateString("es-AR")}</p>{options.length > 0 && <EventReminderSheet eventId={event.id} title={event.title} options={options} authenticated={Boolean(user)} initialActive={active} />}</article>; })}
        {!events?.length && <p className="text-sm text-ink/60">Todavía no hay fechas publicadas. Estamos actualizando la agenda oficial.</p>}
      </section>
    </div>
  </main>;
}
