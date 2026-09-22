import { createHash } from "node:crypto";
import type { NormalizedSchedule } from "@/lib/fda/types";

const weekdays = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];

function csvRows(csv: string) {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    if (char === '"') {
      if (quoted && csv[index + 1] === '"') { cell += '"'; index += 1; } else quoted = !quoted;
    } else if (char === "," && !quoted) { row.push(cell); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && csv[index + 1] === "\n") index += 1;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += char;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function clean(value: string) { return value.replace(/\s+/g, " ").trim(); }
function semantic(value: string) {
  return clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
}

function subjectName(block: string) {
  return clean(block.split(/\r?\n/)[0]).replace(/^\d+[.)]\s*/, "");
}

function details(block: string) {
  const lines = block.split(/\r?\n/).map(clean).filter(Boolean);
  const commission = lines.find(line => /^comisi[oó]n/i.test(line));
  const classroom = lines.filter(line => /^aula/i.test(line)).join(" / ") || undefined;
  const campusLine = lines.find(line => /^sede/i.test(line));
  const semesterLine = lines.find(line => /cuatrimestre|anual/i.test(line));
  const notes = lines.filter(line => !/^comisi[oó]n|^aula|^sede|cuatrimestre|anual/i.test(line) && line !== lines[0]).join(" · ") || undefined;
  return { commission, classroom, campus: campusLine?.replace(/^sede\s*/i, ""), notes: [semesterLine, notes].filter(Boolean).join(" · ") || undefined };
}

export function parseGoogleSheetGrid(csv: string, options: { sourceUrl: string; sourceLabel: string; curriculum?: "old" | "new"; semester?: 1 | 2; academicYear?: number }) {
  const rows = csvRows(csv);
  const headerIndex = rows.findIndex(row => row.some(cell => weekdays.some(day => semantic(day) === semantic(cell))));
  const header = rows[headerIndex] ?? [];
  const schedules: NormalizedSchedule[] = [];
  for (const row of rows.slice(headerIndex + 1)) {
    const startTime = clean(row[0] ?? "");
    if (!/^\d{1,2}:\d{2}$/.test(startTime)) continue;
    for (let column = 1; column < row.length; column += 1) {
      const block = row[column]?.trim();
      if (!block) continue;
      const weekday = weekdays.find(day => clean(header[column] ?? "").toLowerCase() === day.toLowerCase());
      if (!weekday) continue;
      const info = details(block);
      const rawSubjectName = subjectName(block);
      schedules.push({
        externalKey: createHash("sha256").update(`${semantic(rawSubjectName)}|${semantic(weekday)}|${startTime}|${semantic(info.commission ?? "")}`).digest("hex").slice(0, 32),
        rawSubjectName,
        curriculum: options.curriculum,
        academicYear: options.academicYear ?? new Date().getFullYear(),
        semester: options.semester,
        commission: info.commission,
        weekday,
        startTime,
        classroom: info.classroom,
        campus: info.campus,
        notes: info.notes,
        sourceUrl: options.sourceUrl,
        sourceLabel: options.sourceLabel
      });
    }
  }
  return schedules;
}
