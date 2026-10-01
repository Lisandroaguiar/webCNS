"use client";

import { ChevronRight } from "lucide-react";

export type SubjectCardStatus = "passed" | "regular" | "in_progress" | "available" | "pending" | "review";

const labels: Record<SubjectCardStatus, string> = {
  passed: "✓ Aprobada",
  regular: "◉ Cursada aprobada",
  in_progress: "● Cursando",
  available: "✦ Disponible",
  pending: "○ Sin cursar",
  review: "? Necesita confirmación",
};

export function AcademicSubjectCard({ name, status, grade, detail, onOpen }: { name: string; status: SubjectCardStatus; grade?: number | string | null; detail?: string; onOpen: () => void }) {
  const visibleGrade = grade == null || String(grade).trim() === "" ? null : String(grade);
  return <button type="button" aria-label={`Abrir ${name}`} onClick={onOpen} className="academic-subject-card group flex min-h-[68px] w-full min-w-0 items-center justify-between gap-3 border-2 border-ink bg-cream px-4 py-2 text-left transition-colors hover:bg-white active:bg-cronopios-pink/20 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-cronopios-magenta">
    <span className="min-w-0 flex-1"><span className="line-clamp-2 font-bold leading-tight [overflow-wrap:anywhere]"><span className={status === "passed" ? "academic-subject-card__name--passed" : ""}>{name}</span></span><span className="mt-1 block truncate text-sm text-ink/70"><span className={status === "passed" ? "font-semibold text-cronopios-magenta" : ""}>{detail ? `${status === "passed" ? "✓ " : "○ "}${detail}` : labels[status]}</span>{visibleGrade && <> · Nota {visibleGrade}</>}</span></span>
    <ChevronRight aria-hidden="true" size={19} className="shrink-0 text-ink/55 transition-transform group-hover:translate-x-0.5" />
  </button>;
}
