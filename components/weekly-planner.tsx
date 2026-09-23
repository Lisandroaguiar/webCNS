"use client";

import Link from "next/link";
import { useState } from "react";
import { detectScheduleConflicts, sortWeekSchedules, timeMinutes, weekDays, type WeekSchedule } from "@/lib/academic/weekly-schedule";

const shortDays = ["Lun", "Mar", "Mié", "Jue", "Vie"];

function timeLabel(schedule: WeekSchedule) {
  const start = schedule.start_time?.slice(0, 5);
  const end = schedule.end_time?.slice(0, 5);
  return !start || timeMinutes(schedule.start_time) == null ? "Horario a confirmar" : end && timeMinutes(schedule.end_time) != null ? `${start}–${end}` : `Desde ${start} · duración no informada`;
}

export function WeeklyPlanner({ initialSchedules }: { initialSchedules: WeekSchedule[] }) {
  const [schedules, setSchedules] = useState(initialSchedules);
  const [day, setDay] = useState<string>("Todos");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const ordered = sortWeekSchedules(schedules);
  const conflicts = detectScheduleConflicts(ordered);
  const visible = day === "Todos" ? ordered : ordered.filter(item => item.weekday === day);
  async function remove(schedule: WeekSchedule) {
    setBusyId(schedule.id); setMessage("");
    try {
      const response = await fetch("/api/mi-semana", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ scheduleId: schedule.id }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "No pudimos quitar el horario.");
      setSchedules(current => current.filter(item => item.id !== schedule.id));
      setMessage("Horario quitado de Mi semana.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "No pudimos actualizar tu semana."); }
    finally { setBusyId(null); }
  }
  function card(schedule: WeekSchedule) {
    const hasConflict = conflicts.some(pair => pair.first.id === schedule.id || pair.second.id === schedule.id);
    return <article key={schedule.id} className="min-w-0 border-2 border-ink bg-white p-3 shadow-[3px_3px_0_0_#221E21]">
      <p className="font-mono font-black text-cronopios-magenta">{timeLabel(schedule)}</p>
      <h3 className="mt-2 font-display text-base font-black leading-tight [overflow-wrap:anywhere]">{schedule.raw_subject_name}</h3>
      <p className="mt-2 text-ink/70">{schedule.commission || "Comisión no informada"}</p>
      <p className="text-ink/70">{schedule.classroom || "Aula no informada"}{schedule.campus ? ` · ${schedule.campus}` : ""}</p>
      {schedule.semester == null && <p className="mt-2 text-xs font-bold">Cuatrimestre no informado</p>}
      {schedule.status !== "published" && <p className="mt-2 text-xs font-bold">Este horario ya no aparece como vigente en la fuente.</p>}
      {hasConflict && <p className="mt-2 text-xs font-bold">⚠ Se superpone con otra cursada</p>}
      {timeMinutes(schedule.start_time) == null && <p className="mt-2 text-xs font-bold">Hora de inicio no válida: revisá la fuente.</p>}
      <div className="mt-3 flex flex-wrap gap-2"><Link href={`/catedras?q=${encodeURIComponent(schedule.raw_subject_name)}`} className="inline-flex min-h-10 items-center font-bold underline">{schedule.status === "published" ? "Ver cátedra" : "Buscar horario actualizado"}</Link><button type="button" disabled={busyId != null} onClick={() => void remove(schedule)} className="min-h-10 border-2 border-ink px-2 font-bold disabled:opacity-50">Quitar</button></div>
    </article>;
  }
  const validStarts = ordered.map(item => timeMinutes(item.start_time)).filter((value): value is number => value != null);
  const validEnds = ordered.map(item => timeMinutes(item.end_time)).filter((value): value is number => value != null);
  const origin = Math.min(7, ...validStarts.map(value => Math.floor(value / 60)));
  const endHour = Math.max(23, ...validEnds.map(value => Math.ceil(value / 60)), ...validStarts.map(value => Math.ceil(value / 60) + 1));
  const gridHeight = (endHour - origin) * 48;
  return <div className="mt-8">
    {message && <p role="status" className="mb-4 border-l-4 border-cronopios-magenta bg-white p-3 text-sm font-bold">{message}</p>}
    {conflicts.length > 0 && <details className="mb-6 border-2 border-ink bg-yellow-100 p-4"><summary className="cursor-pointer font-display text-lg font-black">Revisar horarios · {conflicts.length} superposición{conflicts.length === 1 ? "" : "es"}</summary><ul className="mt-3 space-y-2 text-sm">{conflicts.map(pair => <li key={`${pair.first.id}-${pair.second.id}`}>⚠ {pair.first.raw_subject_name} ({timeLabel(pair.first)}) y {pair.second.raw_subject_name} ({timeLabel(pair.second)})</li>)}</ul></details>}
    {!ordered.length ? <div className="card"><h2 className="font-display text-xl font-black">Tu semana todavía está vacía.</h2><p className="mt-2 text-sm">Buscá una cátedra y elegí una comisión para empezar.</p><Link href="/catedras" className="button-primary mt-4 inline-flex min-h-11 items-center">Buscar cátedras</Link></div> : <>
      <div className="md:hidden"><button type="button" onClick={() => setDay("Todos")} aria-pressed={day === "Todos"} className={`mb-2 min-h-11 w-full border-2 border-ink font-bold ${day === "Todos" ? "bg-cronopios-magenta text-white" : "bg-white"}`}>Ver todos</button><div className="grid grid-cols-5 gap-1">{weekDays.map((item, index) => <button type="button" key={item} onClick={() => setDay(item)} aria-pressed={day === item} className={`min-h-11 min-w-0 border-2 border-ink text-xs font-bold ${day === item ? "bg-cronopios-magenta text-white" : "bg-white"}`}>{shortDays[index]}</button>)}</div><div className="mt-6 space-y-6">{weekDays.filter(item => day === "Todos" || day === item).map(item => <section key={item}><h2 className="mb-3 font-display text-xl font-black">{item}</h2><div className="space-y-3">{visible.filter(schedule => schedule.weekday === item).map(schedule => card(schedule))}{!visible.some(schedule => schedule.weekday === item) && <p className="text-sm text-ink/55">Sin cursadas seleccionadas.</p>}</div></section>)}</div></div>
      <div className="hidden md:block"><h2 className="font-display text-2xl font-black">Vista semanal</h2><p className="mt-1 text-sm text-ink/60">Cada tarjeta se ubica según su hora de inicio. Una altura breve indica que no se informó la duración.</p><div className="mt-5 grid grid-cols-[52px_repeat(5,minmax(0,1fr))] gap-1"><div /><>{weekDays.map(item => <h3 key={item} className="bg-cronopios-magenta p-2 text-center text-sm font-black text-white">{item}</h3>)}</><div className="relative" style={{ height: gridHeight }}>{Array.from({ length: endHour - origin + 1 }, (_, index) => <span key={index} className="absolute right-1 font-mono text-xs text-ink/55" style={{ top: index * 48 - 7 }}>{String(origin + index).padStart(2, "0")}:00</span>)}</div>{weekDays.map(item => <div key={item} className="relative border-x border-ink/10 bg-white" style={{ height: gridHeight, backgroundImage: "repeating-linear-gradient(to bottom, transparent 0, transparent 47px, #221E2120 47px, #221E2120 48px)" }}>{ordered.filter(schedule => schedule.weekday === item).map(schedule => { const start = timeMinutes(schedule.start_time); const end = timeMinutes(schedule.end_time); if (start == null) return null; return <div key={schedule.id} className="absolute inset-x-1 overflow-hidden border-2 border-ink bg-cronopios-green p-1 text-[11px] leading-tight" style={{ top: (start - origin * 60) * 0.8, height: end != null && end > start ? Math.max(56, (end - start) * 0.8) : 70 }} title={`${schedule.raw_subject_name} · ${timeLabel(schedule)}`}><p className="font-bold">{timeLabel(schedule)}</p><p className="font-black [overflow-wrap:anywhere]">{schedule.raw_subject_name}</p></div>; })}</div>)}</div><h3 className="mt-8 font-display text-xl font-black">Detalle de cursadas</h3><div className="mt-4 grid gap-4 lg:grid-cols-2">{ordered.map(schedule => card(schedule))}</div></div>
    </>}
  </div>;
}
