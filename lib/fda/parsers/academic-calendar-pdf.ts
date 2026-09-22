import type { NormalizedEvent } from "@/lib/fda/types";
import { buildAcademicEventExternalKey } from "@/lib/fda/academic-event-key";

const months: Record<string, number> = { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 };
function iso(day: string, month: string, year: number) {
  const monthNumber = months[month.toLowerCase()];
  return monthNumber ? `${year}-${String(monthNumber).padStart(2, "0")}-${String(Number(day)).padStart(2, "0")}` : undefined;
}
function range(value: string, year: number) {
  const sameMonth = value.match(/(\d{1,2})\s*(?:al|-)\s*(\d{1,2})\s+de\s+([a-záéíóú]+)/i);
  const crossMonth = value.match(/(\d{1,2})\s+de\s+([a-záéíóú]+)\s*(?:al|-)\s*(\d{1,2})\s+de\s+([a-záéíóú]+)/i);
  if (!sameMonth && !crossMonth) return undefined;
  const start = iso(sameMonth?.[1] ?? crossMonth?.[1] ?? "", sameMonth?.[3] ?? crossMonth?.[2] ?? "", year);
  const end = iso(sameMonth?.[2] ?? crossMonth?.[3] ?? "", sameMonth?.[3] ?? crossMonth?.[4] ?? "", year);
  return start && end ? { start, end } : undefined;
}

export function parseAcademicCalendarText(text: string, options: { sourceUrl: string; sourceLabel: string; academicYear?: number; semester?: 1 | 2 }) {
  const yearMatch = text.match(/\b(20\d{2})\b/);
  const academicYear = options.academicYear ?? (yearMatch ? Number(yearMatch[1]) : undefined);
  if (!academicYear) return { events: [] as NormalizedEvent[], warnings: ["No pudimos detectar el año académico del calendario."] };
  const events: NormalizedEvent[] = [];
  const warnings: string[] = [];
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  for (const line of lines) {
    const dates = range(line, academicYear);
    if (!dates) continue;
    const lower = line.toLowerCase();
    const registration = /inscripci[oó]n/.test(lower);
    const exam = /mesa|examen|llamado/.test(lower);
    const eventType = registration ? (exam ? "final_registration" : "course_registration") : exam ? "final_exam_period" : "other";
    events.push({
      externalKey: buildAcademicEventExternalKey({ title: line, startsAt: dates.start, endsAt: dates.end }),
      title: line.replace(/\s+/g, " "),
      eventType,
      registrationStart: registration ? dates.start : undefined,
      registrationEnd: registration ? dates.end : undefined,
      startsAt: dates.start,
      endsAt: dates.end,
      academicYear,
      semester: options.semester,
      sourceUrl: options.sourceUrl,
      sourceLabel: options.sourceLabel
    });
  }
  if (!events.length) warnings.push("El calendario no produjo rangos reconocibles; requiere revisión manual.");
  return { events, warnings };
}
