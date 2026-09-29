export type AcademicStatus = "pending" | "in_progress" | "regular" | "passed";

export type AcademicHistoryItem = {
  id: string;
  subjectId: string;
  displayName: string;
  yearLevel: number | null;
  status: AcademicStatus;
  grade: number | null;
  date: string | null;
  source: "legacy_multimedia" | "enrollment_subject";
  requirementType: "required" | "orientation" | "choice" | null;
};

export function academicStatusLabel(status: AcademicStatus) {
  return ({ pending: "Sin cursar", in_progress: "Cursando", regular: "Cursada aprobada", passed: "Aprobada" })[status];
}

export function formatAcademicDate(date: string | null) {
  if (!date) return null;
  const [year, month, day] = date.slice(0, 10).split("-").map(Number);
  return year && month && day ? `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}` : null;
}

export function academicHistoryDetail(item: Pick<AcademicHistoryItem, "grade" | "date">) {
  return [item.grade == null ? null : `Nota ${item.grade}`, formatAcademicDate(item.date)].filter(Boolean).join(" · ");
}

export function enrollmentHistoryItems(subjects: Array<{ id: string; officialName: string; yearLevel: number; requirementKind: "required" | "orientation" | "choice" }>, history: Array<{ curriculum_subject_id: string; status: AcademicStatus; grade: number | null; passed_at: string | null }>): AcademicHistoryItem[] {
  const bySubject = new Map(history.map(row => [row.curriculum_subject_id, row]));
  return subjects.map(subject => {
    const saved = bySubject.get(subject.id);
    return { id: subject.id, subjectId: subject.id, displayName: subject.officialName, yearLevel: subject.yearLevel, status: saved?.status ?? "pending", grade: saved?.grade ?? null, date: saved?.passed_at ?? null, source: "enrollment_subject", requirementType: subject.requirementKind };
  });
}

export function legacyHistoryItems(subjects: Array<{ id: string | number; name: string; year: number | null }>, history: Array<{ subject_id: string | number; status: string; grade: number | null; passed_at: string | null }>): AcademicHistoryItem[] {
  const bySubject = new Map(history.map(row => [String(row.subject_id), row]));
  return subjects.map(subject => {
    const saved = bySubject.get(String(subject.id));
    return { id: String(subject.id), subjectId: String(subject.id), displayName: subject.name, yearLevel: subject.year, status: saved?.status === "passed" ? "passed" : saved?.status === "regular" ? "regular" : "pending", grade: saved?.grade ?? null, date: saved?.passed_at ?? null, source: "legacy_multimedia", requirementType: null };
  });
}

export function validateAcademicEdit(input: { status: AcademicStatus; grade: string; date: string }) {
  const grade = input.grade.trim() === "" ? null : Number(input.grade);
  if (grade !== null && (!Number.isFinite(grade) || grade < 1 || grade > 10)) throw new Error("La nota debe estar entre 1 y 10.");
  if (input.date && !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new Error("La fecha no es válida.");
  return { status: input.status, grade, passed_at: input.date || null };
}
