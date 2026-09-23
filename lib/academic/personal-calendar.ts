import { timeMinutes, weekDays } from "./weekly-schedule";
import type { WeekSchedule } from "./weekly-schedule";
import type { CustomWeekSlot } from "./custom-week";
import { localDateKey } from "./dashboard-summary";

export type PersonalEvent = {
  id: string;
  title: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  notes: string | null;
  category: "personal" | "facu" | "trabajo" | "otro";
  recurrence_type: "none" | "weekly";
};

export function validatePersonalEvent(body: Record<string, unknown>) {
  const title = String(body.title ?? "").trim();
  const event_date = String(body.event_date ?? "");
  const start_time = String(body.start_time ?? "") || null;
  const end_time = String(body.end_time ?? "") || null;
  const location = String(body.location ?? "").trim() || null;
  const notes = String(body.notes ?? "").trim() || null;
  const category = String(body.category ?? "personal");
  const recurrence_type = String(body.recurrence_type ?? "none");
  const date = new Date(`${event_date}T12:00:00Z`);
  if (!title || title.length > 160 || !/^\d{4}-\d{2}-\d{2}$/.test(event_date) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== event_date ||
    (start_time && timeMinutes(start_time) == null) || (end_time && (timeMinutes(end_time) == null || !start_time || timeMinutes(end_time)! <= timeMinutes(start_time)!)) ||
    (location?.length ?? 0) > 160 || (notes?.length ?? 0) > 2000 || !["personal", "facu", "trabajo", "otro"].includes(category) || !["none", "weekly"].includes(recurrence_type)) return null;
  return { title, event_date, start_time, end_time, location, notes, category: category as PersonalEvent["category"], recurrence_type: recurrence_type as PersonalEvent["recurrence_type"] };
}

export function occursOn(event: PersonalEvent, date: string) {
  if (event.event_date > date) return false;
  if (event.recurrence_type === "none") return event.event_date === date;
  const start = Date.parse(`${event.event_date}T12:00:00Z`), target = Date.parse(`${date}T12:00:00Z`);
  return Number.isFinite(start) && Number.isFinite(target) && Math.round((target - start) / 86400000) % 7 === 0;
}

export function localDay(date = new Date()) { return localDateKey(date); }
export function datePlusDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
export function weekdayForDate(date: string) { return weekDays[(new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7] ?? null; }

export type AgendaItem = { key: string; kind: "course" | "personal" | "fda"; title: string; date: string; start_time: string | null; end_time: string | null; location?: string | null; category?: string; id?: string | number; source?: "official" | "manual" };
export function sortAgendaItems(items: AgendaItem[]) {
  return [...items].sort((a, b) => a.date.localeCompare(b.date) || (a.start_time === null ? -1 : b.start_time === null ? 1 : (timeMinutes(a.start_time) ?? 0) - (timeMinutes(b.start_time) ?? 0)) || a.title.localeCompare(b.title));
}
export function hasAgendaConflict(a: AgendaItem, b: AgendaItem) {
  if (a.date !== b.date || !a.start_time || !a.end_time || !b.start_time || !b.end_time) return false;
  const aStart = timeMinutes(a.start_time), aEnd = timeMinutes(a.end_time), bStart = timeMinutes(b.start_time), bEnd = timeMinutes(b.end_time);
  return aStart != null && aEnd != null && bStart != null && bEnd != null && aStart < bEnd && bStart < aEnd;
}

export type PublishedCalendarEvent = { id: number; title: string; registration_start: string | null; registration_end: string | null; starts_at: string | null; ends_at: string | null };
export function agendaItemsForDate(date: string, sources: { official: WeekSchedule[]; manual: CustomWeekSlot[]; personal: PersonalEvent[]; fda: PublishedCalendarEvent[]; period: { academicYear: number; semester: number }; curriculum: string }) {
  const weekday = weekdayForDate(date);
  const { official, manual, personal, fda, period, curriculum } = sources;
  const courses: AgendaItem[] = [...official.filter(row => row.weekday === weekday && row.academic_year === period.academicYear && row.curriculum === curriculum && (row.semester == null || row.semester === period.semester)).map(row => ({ key: `official-${row.id}-${date}`, kind: "course" as const, title: row.raw_subject_name, date, start_time: row.start_time, end_time: row.end_time, location: [row.classroom, row.campus].filter(Boolean).join(" · "), id: row.id, source: "official" as const })),
    ...manual.filter(row => row.weekday === weekday && row.academic_year === period.academicYear && row.semester === period.semester).map(row => ({ key: `manual-${row.id}-${date}`, kind: "course" as const, title: row.subject_name, date, start_time: row.start_time, end_time: row.end_time, location: [row.classroom, row.location].filter(Boolean).join(" · "), id: row.id, source: "manual" as const }))];
  const events: AgendaItem[] = personal.filter(row => occursOn(row, date)).map(row => ({ key: `personal-${row.id}-${date}`, kind: "personal", title: row.title, date, start_time: row.start_time, end_time: row.end_time, location: row.location, category: row.category, id: row.id }));
  const institutional: AgendaItem[] = fda.filter(row => [row.registration_start, row.registration_end, row.starts_at, row.ends_at].includes(date)).map(row => ({ key: `fda-${row.id}-${date}`, kind: "fda", title: row.title, date, start_time: null, end_time: null, id: row.id }));
  return sortAgendaItems([...courses, ...events, ...institutional]);
}
