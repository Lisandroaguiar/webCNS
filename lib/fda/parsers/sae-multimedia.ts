import { createHash } from "node:crypto";
import type { NormalizedSchedule } from "@/lib/fda/types";
import { csvRows } from "./google-sheet-schedule";

const days = ["lunes", "martes", "miércoles", "jueves", "viernes"];
const label = (day: string) => day.charAt(0).toUpperCase() + day.slice(1);
const clean = (text: string) => text.replace(/\s+/g, " ").trim();
const fold = (text: string) => clean(text).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const semantic = (text: string) => fold(text).replace(/[^a-z0-9]+/g, " ").trim();

function meetings(text: string) {
  const folded = fold(text);
  const foundDays = days.filter(day => folded.includes(fold(day)));
  const range = folded.match(/\b(\d{1,2})(?::(\d{2}))?\s*a\s*(\d{1,2})(?::(\d{2}))?\s*(?:h|hs|horas)?\b/);
  if (!range || !foundDays.length) return [];
  const start = `${range[1].padStart(2, "0")}:${range[2] ?? "00"}`;
  const end = `${range[3].padStart(2, "0")}:${range[4] ?? "00"}`;
  const campus = /central/i.test(text) ? "Central" : /fonseca/i.test(text) ? "Fonseca" : undefined;
  const classroom = clean(text.match(/(?:aula(?:s)?|sala de computaci[oó]n|auditorio)[^/;,]*/i)?.[0] ?? "") || undefined;
  return foundDays.map(day => ({ weekday: label(day), startTime: start, endTime: end, campus, classroom }));
}

function schedule(rawSubjectName: string, curriculum: "old" | "new", semester: 1 | 2 | undefined, commission: string | undefined, meeting: ReturnType<typeof meetings>[number], options: { academicYear: number; sourceUrl: string; sourceLabel: string }): NormalizedSchedule {
  const key = [curriculum, semester ?? "annual-or-unspecified", semantic(rawSubjectName), semantic(commission ?? ""), semantic(meeting.weekday), meeting.startTime].join("|");
  return { externalKey: createHash("sha256").update(key).digest("hex").slice(0, 32), rawSubjectName, curriculum, semester, academicYear: options.academicYear, commission, ...meeting, sourceUrl: options.sourceUrl, sourceLabel: options.sourceLabel };
}

/** Sólo la solapa Multimedia; se omiten los seminarios de otras carreras y filas sin horario verificable. */
export function parseSaeMultimedia(csv: string, variant: "annual-first" | "second", options: { academicYear: number; sourceUrl: string; sourceLabel: string }) {
  const rows = csvRows(csv);
  const schedules: NormalizedSchedule[] = [];
  const warnings: string[] = [];
  let name = "", curriculum: "old" | "new" = "old", semester: 1 | 2 | undefined;
  for (const row of rows) {
    if (row.some(cell => /^seminarios?\b/i.test(clean(cell)))) break;
    if (variant === "annual-first") {
      if (row[1]?.trim() && !/^materias\b/i.test(row[1])) {
        const raw = clean(row[1]);
        const plan = /plan nuevo/i.test(raw) ? "new" : /plan viejo/i.test(raw) ? "old" : null;
        if (!plan) { name = ""; continue; }
        name = clean(raw.replace(/\s*\([AC]\)/i, "").replace(/\s*-?\s*plan (nuevo|viejo)/i, ""));
        curriculum = plan;
        semester = /\(A\)/i.test(raw) ? undefined : /\(C\)/i.test(raw) ? 1 : undefined;
      }
      if (!name) continue;
      const commission = clean(row[3] ?? "") || undefined;
      const dayTime = `${row[4] ?? ""} ${row[5] ?? ""}`;
      const parsed = meetings(dayTime);
      for (const item of parsed) schedules.push(schedule(name, curriculum, semester, commission, { ...item, classroom: clean(row[6] ?? "") || item.classroom, campus: /central/i.test(row[6] ?? "") ? "Central" : /fonseca/i.test(row[6] ?? "") ? "Fonseca" : item.campus }, options));
      const theory = clean(row[2] ?? "");
      if (theory && /\b(?:lunes|martes|mi[eé]rcoles|jueves|viernes)\b/i.test(theory)) for (const item of meetings(theory)) {
        const record = schedule(name, curriculum, semester, "Teórico", item, options);
        // La materia puede ser anual aunque este encuentro teórico sea sólo del primer cuatrimestre.
        if (/1\s*[°º]\s*cuatrimestre|primer\s+cuatrimestre/i.test(theory)) record.semester = 1;
        if (/\(V\)/i.test(theory)) record.notes = "Encuentro virtual";
        schedules.push(record);
      }
    } else {
      if (row[0]?.trim() && !/^materias\b/i.test(row[0])) name = clean(row[0]);
      if (!name || !row[0] && !row[1] && !row[2]) continue;
      for (const index of [0, 1]) {
        const cell = row[index + 1];
        const text = clean(cell ?? "");
        if (!text) continue;
        const commission = text.match(/comisi[oó]n\s*\d+/i)?.[0] ?? (index === 0 ? "Teórico" : "Práctico");
        const parsed = meetings(text);
        for (const item of parsed) schedules.push(schedule(name, "new", 2, commission, item, options));
      }
    }
  }
  const unique = new Map(schedules.map(item => [item.externalKey, item]));
  if (!unique.size) warnings.push("La hoja Multimedia no produjo horarios con día y franja horaria reconocibles.");
  return { schedules: Array.from(unique.values()), warnings };
}
