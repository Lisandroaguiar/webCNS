import { describe, expect, it } from "vitest";
import { nextRelevantEvent, progressSummary, upcomingWeekMeetings } from "./dashboard-summary";

const event = (date: string | null, event_type = "semester_start") => ({ title: "Inicio de clases", event_type, registration_start: null, registration_end: null, starts_at: date, ends_at: null });
describe("resumen del dashboard", () => {
  it("muestra progreso vacío y de un estudiante avanzado sin duplicar cálculos", () => {
    expect(progressSummary([], 25)).toEqual({ approved: 0, percent: 0, average: "—" });
    expect(progressSummary([{ status: "passed", grade: 8 }, { status: "passed", grade: 9 }, { status: "regular", grade: null }], 4)).toEqual({ approved: 2, percent: 50, average: "8,50" });
  });
  it("muestra una fecha cercana y omite eventos pasados o lejanos", () => {
    expect(nextRelevantEvent([event("2026-09-20"), event("2026-09-25")], "2026-09-23")?.daysAway).toBe(2);
    expect(nextRelevantEvent([event("2026-12-01")], "2026-09-23")).toBeNull();
    expect(nextRelevantEvent([], "2026-09-23")).toBeNull();
  });
  it("incluye el cierre de inscripción y ordena las próximas cursadas", () => {
    const registration = { ...event(null, "course_registration"), registration_start: "2026-09-01", registration_end: "2026-09-24" };
    expect(nextRelevantEvent([registration], "2026-09-23")?.date).toBe("2026-09-24");
    const rows = [
      { raw_subject_name: "A", weekday: "Viernes", start_time: "10:00:00", academic_year: 2026, semester: 2, curriculum: "old" },
      { raw_subject_name: "B", weekday: "Miércoles", start_time: "14:00:00", academic_year: 2026, semester: 2, curriculum: "old" },
      { raw_subject_name: "C", weekday: "Martes", start_time: "09:00:00", academic_year: 2026, semester: 1, curriculum: "old" },
    ];
    expect(upcomingWeekMeetings(rows, { academicYear: 2026, semester: 2 }, "old", new Date("2026-09-23T12:00:00"), 2).map(item => item.raw_subject_name)).toEqual(["B", "A"]);
    expect(upcomingWeekMeetings([], { academicYear: 2026, semester: 2 }, "old")).toEqual([]);
  });
});
