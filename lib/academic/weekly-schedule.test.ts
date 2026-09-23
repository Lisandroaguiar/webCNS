import { describe, expect, it } from "vitest";
import { currentAcademicPeriod, detectScheduleConflicts, isCurrentSchedule, sameSubject, sortWeekSchedules, type WeekSchedule } from "./weekly-schedule";

const schedule = (id: number, weekday: string, start_time: string | null, end_time: string | null, overrides: Partial<WeekSchedule> = {}): WeekSchedule => ({
  id, weekday, start_time, end_time, subject_id: String(id), raw_subject_name: `Materia ${id}`, commission: null, classroom: null, campus: null, curriculum: "old", academic_year: 2026, semester: 2, status: "published", ...overrides,
});

describe("Mi semana", () => {
  it("calcula el período con fecha local de Buenos Aires", () => {
    expect(currentAcademicPeriod(new Date("2026-07-01T01:00:00Z"))).toEqual({ academicYear: 2026, semester: 1 });
    expect(currentAcademicPeriod(new Date("2026-07-01T04:00:00Z"))).toEqual({ academicYear: 2026, semester: 2 });
  });
  it("no marca conflicto en días distintos", () => expect(detectScheduleConflicts([schedule(1, "Lunes", "08:00", "12:00"), schedule(2, "Martes", "09:00", "11:00")])).toHaveLength(0));
  it("no marca conflicto si una termina cuando la otra empieza", () => expect(detectScheduleConflicts([schedule(1, "Lunes", "08:00", "12:00"), schedule(2, "Lunes", "12:00", "14:00")])).toHaveLength(0));
  it("detecta intersección real", () => expect(detectScheduleConflicts([schedule(1, "Lunes", "08:00", "12:00"), schedule(2, "Lunes", "11:30", "14:00")])).toHaveLength(1));
  it("no inventa conflicto con duración desconocida", () => expect(detectScheduleConflicts([schedule(1, "Lunes", "08:00", null), schedule(2, "Lunes", "09:00", "11:00")])).toHaveLength(0));
  it("reconoce dos comisiones por subject_id y usa nombre normalizado sólo como fallback", () => {
    expect(sameSubject(schedule(1, "Lunes", "08:00", null, { subject_id: "abc" }), schedule(2, "Martes", "09:00", null, { subject_id: "abc" }))).toBe(true);
    expect(sameSubject(schedule(1, "Lunes", "08:00", null, { subject_id: null, raw_subject_name: "Tecnología Multimedial I" }), schedule(2, "Martes", "09:00", null, { subject_id: null, raw_subject_name: "tecnologia multimedial i" }))).toBe(true);
  });
  it("ordena por día y hora y deja horas inválidas al final", () => expect(sortWeekSchedules([schedule(1, "Martes", "08:00", null), schedule(2, "Lunes", null, null), schedule(3, "Lunes", "10:30", null), schedule(4, "Lunes", "08:15", null)]).map(item => item.id)).toEqual([4, 3, 2, 1]));
  it("conserva stale en el período pero separa otros años y cuatrimestres", () => {
    const period = currentAcademicPeriod(new Date("2026-09-22T12:00:00Z"));
    expect(isCurrentSchedule(schedule(1, "Lunes", "08:00", null, { status: "stale" }), period, "old")).toBe(true);
    expect(isCurrentSchedule(schedule(2, "Lunes", "08:00", null, { semester: 1 }), period, "old")).toBe(false);
    expect(isCurrentSchedule(schedule(3, "Lunes", "08:00", null, { academic_year: 2025 }), period, "old")).toBe(false);
    expect(isCurrentSchedule(schedule(4, "Lunes", "08:00", null, { semester: null }), period, "old")).toBe(true);
  });
});
