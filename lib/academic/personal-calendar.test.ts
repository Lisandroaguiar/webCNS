import { describe, expect, it } from "vitest";
import { agendaItemsForDate, datePlusDays, hasAgendaConflict, localDay, occursOn, sortAgendaItems, validatePersonalEvent, type PersonalEvent } from "./personal-calendar";
import type { WeekSchedule } from "./weekly-schedule";
import type { CustomWeekSlot } from "./custom-week";

const event: PersonalEvent = { id: "a", title: "Dentista", event_date: "2026-09-23", start_time: null, end_time: null, location: null, notes: null, category: "personal", recurrence_type: "none" };
const emptySources = { official: [], manual: [], personal: [], fda: [], period: { academicYear: 2026, semester: 2 }, curriculum: "new" };

describe("Mi agenda", () => {
  it("valida eventos con y sin horario y rechaza rangos inválidos", () => {
    expect(validatePersonalEvent({ title: " Dentista ", event_date: "2026-09-23" })?.title).toBe("Dentista");
    expect(validatePersonalEvent({ title: "", event_date: "2026-09-23" })).toBeNull();
    expect(validatePersonalEvent({ title: "Prueba", event_date: "2026-02-30" })).toBeNull();
    expect(validatePersonalEvent({ title: "Prueba", event_date: "2026-09-23", start_time: "14:00", end_time: "13:00" })).toBeNull();
  });

  it("muestra una recurrencia semanal desde su fecha de inicio", () => {
    const weekly = { ...event, recurrence_type: "weekly" as const };
    expect(occursOn(weekly, "2026-09-16")).toBe(false);
    expect(occursOn(weekly, "2026-09-23")).toBe(true);
    expect(occursOn(weekly, "2026-09-30")).toBe(true);
    expect(occursOn(weekly, "2026-10-01")).toBe(false);
  });

  it("funciona sin horarios oficiales y combina eventos en orden", () => {
    const items = agendaItemsForDate("2026-09-23", { ...emptySources, personal: [{ ...event, start_time: "18:00", end_time: "19:00" }, { ...event, id: "b", title: "Médico", start_time: "09:00", end_time: "10:00" }] });
    expect(items.map(item => item.title)).toEqual(["Médico", "Dentista"]);
    expect(agendaItemsForDate("2026-09-23", emptySources)).toEqual([]);
  });

  it("mantiene selecciones de Sprint 7 y cursadas manuales junto a eventos FDA", () => {
    const official: WeekSchedule = { id: 12, subject_id: "subject-1", raw_subject_name: "Taller", weekday: "Miércoles", start_time: "09:00", end_time: "11:00", commission: "1", classroom: "5", campus: "Central", curriculum: "new", academic_year: 2026, semester: 2, status: "stale" };
    const manual: CustomWeekSlot = { id: 4, subject_id: "subject-2", subject_name: "Seminario", weekday: "Miércoles", start_time: "13:00", end_time: "15:00", classroom: null, location: null, commission: null, source_schedule_id: null, academic_year: 2026, semester: 2 };
    const items = agendaItemsForDate("2026-09-23", { ...emptySources, official: [official], manual: [manual], fda: [{ id: 3, title: "Inscripción", registration_start: "2026-09-23", registration_end: null, starts_at: null, ends_at: null }] });
    expect(items.map(item => item.title)).toEqual(["Inscripción", "Taller", "Seminario"]);
    expect(items.map(item => item.source)).toEqual([undefined, "official", "manual"]);
    expect(hasAgendaConflict(items[1], items[2])).toBe(false);
  });

  it("solo detecta conflictos cuando coinciden fecha y horas conocidas", () => {
    const first = { key: "course", kind: "course" as const, title: "Tecnología", date: "2026-09-23", start_time: "14:00", end_time: "18:00" };
    expect(hasAgendaConflict(first, { ...first, key: "event", kind: "personal", start_time: "17:00", end_time: "19:00" })).toBe(true);
    expect(hasAgendaConflict(first, { ...first, key: "other", start_time: "18:00", end_time: "20:00" })).toBe(false);
    expect(hasAgendaConflict(first, { ...first, date: "2026-09-24" })).toBe(false);
    expect(hasAgendaConflict(first, { ...first, start_time: null })).toBe(false);
  });

  it("respeta fechas locales de Buenos Aires", () => {
    expect(localDay(new Date("2026-09-24T01:00:00Z"))).toBe("2026-09-23");
    expect(datePlusDays("2026-09-30", 1)).toBe("2026-10-01");
    expect(sortAgendaItems([])).toEqual([]);
  });
});
