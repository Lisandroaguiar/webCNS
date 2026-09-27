import { normalizeAcademicSubjectName, parseAnalyticDocument } from "./academic/analytic-parser";

export type ParsedAnalitico = { text: string; grades: Map<string, { grade?: string; date?: string }> };

/** Legacy text import: only a complete parsed row with an exact catalog name is accepted. */
export function parseAnalitico(text: string, subjects: Array<{ id: string | number; nombre: string }>): ParsedAnalitico {
  const grades = new Map<string, { grade?: string; date?: string }>();
  const rows = parseAnalyticDocument(text.replace(/\s*[;|]\s*/g, " ")).subjects;
  for (const row of rows) {
    const matches = subjects.filter(subject => normalizeAcademicSubjectName(subject.nombre) === normalizeAcademicSubjectName(row.rawName));
    if (matches.length === 1) grades.set(String(matches[0].id), { grade: row.grade == null ? undefined : String(row.grade), date: row.passedAt });
  }
  return { text, grades };
}
